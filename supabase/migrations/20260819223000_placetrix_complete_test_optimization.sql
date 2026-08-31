-- ============================================================================
-- PLACETRIX COMPLETE TEST & EXAM SUBSYSTEM OPTIMIZATION (MASTER MIGRATION)
-- File: supabase/migrations/20260819223000_placetrix_complete_test_optimization.sql
-- ============================================================================

-- ============================================================================
-- PART 1: HIGH-PERFORMANCE INDEXES & DATA CONSTRAINTS
-- ============================================================================

-- 1. TEST ATTEMPTS INDEXES
-- Fast lookup for in-progress attempt checks (executed on every test page load)
CREATE INDEX IF NOT EXISTS idx_test_attempts_candidate_in_progress
  ON public.test_attempts (test_id, candidate_id)
  WHERE status = 'in_progress';

-- Fast lookup for completed attempts count (max attempts check)
CREATE INDEX IF NOT EXISTS idx_test_attempts_candidate_completed
  ON public.test_attempts (test_id, candidate_id)
  WHERE status IN ('submitted', 'auto_submitted');

-- High-performance pagination index for Institute Test Detail attempts list
CREATE INDEX IF NOT EXISTS idx_test_attempts_test_id_started_at
  ON public.test_attempts (test_id, started_at DESC NULLS LAST);

-- Index for candidate profile attempt history
CREATE INDEX IF NOT EXISTS idx_test_attempts_candidate_created
  ON public.test_attempts (candidate_id, created_at DESC);


-- 2. TEST ATTEMPT ANSWERS INDEXES & CONSTRAINTS
-- Unique constraint required for atomic ON CONFLICT upsert in test_attempt_sync
CREATE UNIQUE INDEX IF NOT EXISTS idx_test_attempt_answers_attempt_question
  ON public.test_attempt_answers (attempt_id, question_id);

-- Covering index for test grading and result review queries
CREATE INDEX IF NOT EXISTS idx_test_attempt_answers_grading
  ON public.test_attempt_answers (attempt_id)
  INCLUDE (question_id, selected_option_ids, is_correct, marks_awarded, time_spent_seconds);

-- Index for question analysis aggregation view
CREATE INDEX IF NOT EXISTS idx_test_attempt_answers_question_stats
  ON public.test_attempt_answers (question_id)
  INCLUDE (is_correct, time_spent_seconds);


-- 3. TEST QUESTIONS & OPTIONS INDEXES
-- Ordered question retrieval for exam assembly
CREATE INDEX IF NOT EXISTS idx_test_questions_test_order
  ON public.test_questions (test_id, order_index ASC);

-- Option retrieval and fast grading lookup
CREATE INDEX IF NOT EXISTS idx_test_question_options_question_correct
  ON public.test_question_options (question_id, is_correct)
  INCLUDE (id, order_index);


-- 4. COHORT TARGETING & ENROLLMENT INDEXES
CREATE INDEX IF NOT EXISTS idx_test_cohorts_test_id
  ON public.test_cohorts (test_id, cohort_id);

CREATE INDEX IF NOT EXISTS idx_cohort_students_student_cohort
  ON public.cohort_students (student_id, cohort_id);


-- 5. TEST ATTEMPT FEEDBACKS INDEXES
-- Enforce 1 feedback entry per attempt
CREATE UNIQUE INDEX IF NOT EXISTS idx_test_attempt_feedbacks_attempt_unique
  ON public.test_attempt_feedbacks (attempt_id);

CREATE INDEX IF NOT EXISTS idx_test_attempt_feedbacks_test_list
  ON public.test_attempt_feedbacks (test_id, created_at DESC);


-- 6. DATA INTEGRITY CHECK CONSTRAINTS
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_test_attempts_non_negative_tabs'
  ) THEN
    ALTER TABLE public.test_attempts
      ADD CONSTRAINT chk_test_attempts_non_negative_tabs
      CHECK (tab_switch_count >= 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_test_questions_marks_positive'
  ) THEN
    ALTER TABLE public.test_questions
      ADD CONSTRAINT chk_test_questions_marks_positive
      CHECK (marks >= 0 AND negative_marks >= 0);
  END IF;
END $$;


-- ============================================================================
-- PART 2: ATOMIC DATABASE FUNCTIONS (PL/PGSQL RPCS)
-- ============================================================================

-- Cleanly drop existing function signatures to avoid 42P13 parameter default errors
DROP FUNCTION IF EXISTS public.test_attempt_start(UUID);
DROP FUNCTION IF EXISTS public.test_attempt_sync(UUID, TEXT, JSONB);
DROP FUNCTION IF EXISTS public.test_attempt_sync(UUID, TEXT);
DROP FUNCTION IF EXISTS public.record_attempt_violation(UUID, TEXT, INT, TIMESTAMPTZ);
DROP FUNCTION IF EXISTS public.record_attempt_violation(UUID, TEXT, INT);
DROP FUNCTION IF EXISTS public.test_attempt_grade(UUID);
DROP FUNCTION IF EXISTS public.submit_attempt_feedback(UUID, UUID, INT, TEXT, TEXT, TEXT, TEXT);

-- 1. ATOMIC TEST START RPC
-- Handles eligibility, cohort check, attempt limit check, and creates/resumes attempt.
CREATE OR REPLACE FUNCTION public.test_attempt_start(
  p_test_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_user_institute_id UUID;
  v_test RECORD;
  v_existing_in_progress RECORD;
  v_completed_count INT;
  v_target_cohort_count INT;
  v_new_attempt_id UUID;
  v_attempt_number INT;
  v_expires_at TIMESTAMPTZ;
  v_total_marks NUMERIC := 0;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('error', 'Unauthorized or session expired');
  END IF;

  -- 1. Fetch user institute
  SELECT institute_id INTO v_user_institute_id
  FROM public.profiles
  WHERE id = v_user_id;

  -- 2. Fetch test details
  SELECT id, institute_id, status, time_limit_seconds, max_attempts, available_from, available_until
  INTO v_test
  FROM public.tests
  WHERE id = p_test_id;

  IF v_test.id IS NULL OR v_test.status != 'published' OR (v_test.institute_id IS NOT NULL AND v_user_institute_id IS NOT NULL AND v_test.institute_id != v_user_institute_id) THEN
    RETURN jsonb_build_object('error', 'Test not available or unauthorized');
  END IF;

  -- 3. Check for existing in-progress attempt (Idempotent resume)
  SELECT id, started_at, expires_at, tab_switch_count, attempt_number
  INTO v_existing_in_progress
  FROM public.test_attempts
  WHERE test_id = p_test_id
    AND candidate_id = v_user_id
    AND status = 'in_progress'
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_existing_in_progress.id IS NOT NULL THEN
    RETURN jsonb_build_object(
      'id', v_existing_in_progress.id,
      'started_at', v_existing_in_progress.started_at,
      'server_time', now(),
      'expires_at', v_existing_in_progress.expires_at,
      'tab_switch_count', COALESCE(v_existing_in_progress.tab_switch_count, 0),
      'attempt_number', v_existing_in_progress.attempt_number
    );
  END IF;

  -- 4. Check Cohort Targeting Restrictions
  SELECT count(*) INTO v_target_cohort_count
  FROM public.test_cohorts
  WHERE test_id = p_test_id;

  IF v_target_cohort_count > 0 THEN
    IF NOT EXISTS (
      SELECT 1
      FROM public.test_cohorts tc
      JOIN public.cohort_students cs ON cs.cohort_id = tc.cohort_id
      WHERE tc.test_id = p_test_id AND cs.student_id = v_user_id
    ) THEN
      RETURN jsonb_build_object('error', 'You are not enrolled in an eligible cohort for this test');
    END IF;
  END IF;

  -- 5. Check Test Availability Window
  IF v_test.available_from IS NOT NULL AND v_test.available_from > now() THEN
    RETURN jsonb_build_object('error', 'Test is not yet open');
  END IF;

  IF v_test.available_until IS NOT NULL AND v_test.available_until < now() THEN
    RETURN jsonb_build_object('error', 'Test has closed');
  END IF;

  -- 6. Check Completed Attempts Limit
  SELECT count(*) INTO v_completed_count
  FROM public.test_attempts
  WHERE test_id = p_test_id
    AND candidate_id = v_user_id
    AND status IN ('submitted', 'auto_submitted');

  IF v_completed_count >= COALESCE(v_test.max_attempts, 1) THEN
    RETURN jsonb_build_object('error', 'Maximum attempts reached for this test');
  END IF;

  v_attempt_number := v_completed_count + 1;
  IF v_test.time_limit_seconds IS NOT NULL AND v_test.time_limit_seconds > 0 THEN
    v_expires_at := now() + (v_test.time_limit_seconds || ' seconds')::INTERVAL;
  ELSE
    v_expires_at := NULL;
  END IF;

  -- Calculate total marks of the test
  SELECT COALESCE(SUM(marks), 0) INTO v_total_marks
  FROM public.test_questions
  WHERE test_id = p_test_id;

  -- 7. Insert new attempt atomically
  INSERT INTO public.test_attempts (
    test_id,
    candidate_id,
    attempt_number,
    status,
    started_at,
    expires_at,
    total_marks,
    tab_switch_count,
    last_heartbeat_at
  )
  VALUES (
    p_test_id,
    v_user_id,
    v_attempt_number,
    'in_progress',
    now(),
    v_expires_at,
    v_total_marks,
    0,
    now()
  )
  RETURNING id INTO v_new_attempt_id;

  RETURN jsonb_build_object(
    'id', v_new_attempt_id,
    'started_at', now(),
    'server_time', now(),
    'expires_at', v_expires_at,
    'tab_switch_count', 0,
    'attempt_number', v_attempt_number
  );
EXCEPTION
  WHEN unique_violation THEN
    -- Another concurrent session started simultaneously; fetch that winning attempt
    SELECT id, started_at, expires_at, tab_switch_count, attempt_number
    INTO v_existing_in_progress
    FROM public.test_attempts
    WHERE test_id = p_test_id
      AND candidate_id = v_user_id
      AND status = 'in_progress'
    ORDER BY created_at DESC
    LIMIT 1;

    RETURN jsonb_build_object(
      'id', v_existing_in_progress.id,
      'started_at', v_existing_in_progress.started_at,
      'server_time', now(),
      'expires_at', v_existing_in_progress.expires_at,
      'tab_switch_count', COALESCE(v_existing_in_progress.tab_switch_count, 0),
      'attempt_number', v_existing_in_progress.attempt_number
    );
END;
$$;


-- 2. HIGH-FREQUENCY ANSWER SYNC & HEARTBEAT RPC
-- Handles answer delta batches and last_heartbeat update with array validation.
CREATE OR REPLACE FUNCTION public.test_attempt_sync(
  p_attempt_id UUID,
  p_session_token TEXT,
  p_batch JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_attempt RECORD;
  v_item JSONB;
  v_q_id UUID;
  v_opts JSONB;
  v_time_spent INT;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('error', 'Unauthorized');
  END IF;

  -- Validate attempt ownership and status
  SELECT id, status, active_session_token, expires_at
  INTO v_attempt
  FROM public.test_attempts
  WHERE id = p_attempt_id
    AND candidate_id = v_user_id;

  IF v_attempt.id IS NULL THEN
    RETURN jsonb_build_object('error', 'Attempt not found or unauthorized');
  END IF;

  IF v_attempt.status != 'in_progress' THEN
    RETURN jsonb_build_object('error', 'Attempt is no longer in progress');
  END IF;

  -- Check session token takeover protection (if active_session_token is tracked)
  IF v_attempt.active_session_token IS NOT NULL AND v_attempt.active_session_token != p_session_token THEN
    RETURN jsonb_build_object('error', 'Session active in another tab or device', 'error_code', 'session_superseded');
  END IF;

  -- 1. Update heartbeat timestamp
  UPDATE public.test_attempts
  SET last_heartbeat_at = now(),
      updated_at = now()
  WHERE id = p_attempt_id;

  -- 2. Process batch answers if present
  IF p_batch IS NOT NULL AND jsonb_typeof(p_batch) = 'array' AND jsonb_array_length(p_batch) > 0 THEN
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_batch)
    LOOP
      v_q_id := (v_item->>'questionId')::UUID;
      v_opts := v_item->'selectedOptionIds';
      v_time_spent := COALESCE((v_item->>'timeSpentSeconds')::INT, 0);

      IF v_q_id IS NOT NULL THEN
        -- Upsert attempt answer
        INSERT INTO public.test_attempt_answers (
          attempt_id,
          question_id,
          selected_option_ids,
          time_spent_seconds,
          answered_at,
          updated_at
        )
        VALUES (
          p_attempt_id,
          v_q_id,
          COALESCE(ARRAY(SELECT jsonb_array_elements_text(v_opts)::UUID), '{}'),
          v_time_spent,
          now(),
          now()
        )
        ON CONFLICT (attempt_id, question_id)
        DO UPDATE SET
          selected_option_ids = EXCLUDED.selected_option_ids,
          time_spent_seconds = EXCLUDED.time_spent_seconds,
          updated_at = now();
      END IF;
    END LOOP;
  END IF;

  RETURN jsonb_build_object('ok', true);
END;
$$;


-- 3. PROCTORING VIOLATION RECORDING RPC
CREATE OR REPLACE FUNCTION public.record_attempt_violation(
  p_attempt_id UUID,
  p_type TEXT,
  p_total_count INT,
  p_timestamp TIMESTAMPTZ DEFAULT now()
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id UUID := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('error', 'Unauthorized');
  END IF;

  UPDATE public.test_attempts
  SET tab_switch_count = p_total_count,
      updated_at = now()
  WHERE id = p_attempt_id
    AND candidate_id = v_user_id
    AND status = 'in_progress';

  RETURN jsonb_build_object('ok', true);
END;
$$;


-- 4. ATOMIC TEST GRADING RPC
-- Evaluates correct options (order-independent set equality), marks, negative marks, and completion status.
CREATE OR REPLACE FUNCTION public.test_attempt_grade(
  p_attempt_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_attempt RECORD;
  v_test RECORD;
  v_total_score NUMERIC := 0;
  v_total_possible_marks NUMERIC := 0;
  v_percentage NUMERIC := 0;
  v_passed BOOLEAN := false;
  v_total_time_spent INT := 0;
  v_actual_time_spent INT := 0;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('error', 'Unauthorized');
  END IF;

  SELECT id, test_id, candidate_id, status, started_at
  INTO v_attempt
  FROM public.test_attempts
  WHERE id = p_attempt_id
    AND candidate_id = v_user_id;

  IF v_attempt.id IS NULL THEN
    RETURN jsonb_build_object('error', 'Attempt not found or unauthorized');
  END IF;

  IF v_attempt.status IN ('submitted', 'auto_submitted') THEN
    RETURN jsonb_build_object('test_id', v_attempt.test_id, 'status', 'already_submitted');
  END IF;

  SELECT id, pass_percentage
  INTO v_test
  FROM public.tests
  WHERE id = v_attempt.test_id;

  -- 1. Calculate total possible test marks
  SELECT COALESCE(SUM(marks), 0)
  INTO v_total_possible_marks
  FROM public.test_questions
  WHERE test_id = v_attempt.test_id;

  -- 2. Grade each answer: Order-independent set equality between selected and correct options
  WITH question_evaluations AS (
    SELECT
      tq.id AS question_id,
      tq.marks,
      COALESCE(tq.negative_marks, 0) AS negative_marks,
      tq.question_type,
      ARRAY(
        SELECT tqo.id
        FROM public.test_question_options tqo
        WHERE tqo.question_id = tq.id AND tqo.is_correct = true
        ORDER BY tqo.id
      ) AS correct_option_ids,
      COALESCE(taa.selected_option_ids, '{}') AS student_selected_ids
    FROM public.test_questions tq
    LEFT JOIN public.test_attempt_answers taa
      ON taa.question_id = tq.id AND taa.attempt_id = p_attempt_id
    WHERE tq.test_id = v_attempt.test_id
  ),
  graded_results AS (
    SELECT
      question_id,
      marks,
      negative_marks,
      CASE
        WHEN cardinality(student_selected_ids) = 0 THEN false
        -- Order-independent array comparison: all elements must match in both directions with equal cardinality
        WHEN correct_option_ids <@ student_selected_ids 
             AND student_selected_ids <@ correct_option_ids 
             AND cardinality(correct_option_ids) = cardinality(student_selected_ids) THEN true
        ELSE false
      END AS is_correct,
      CASE
        WHEN cardinality(student_selected_ids) = 0 THEN 0
        WHEN correct_option_ids <@ student_selected_ids 
             AND student_selected_ids <@ correct_option_ids 
             AND cardinality(correct_option_ids) = cardinality(student_selected_ids) THEN marks
        ELSE -negative_marks
      END AS marks_awarded
    FROM question_evaluations
  )
  -- 3. Update is_correct and marks_awarded flag on individual attempt answer rows
  , updated_answers AS (
    UPDATE public.test_attempt_answers taa
    SET
      is_correct = gr.is_correct,
      marks_awarded = gr.marks_awarded
    FROM graded_results gr
    WHERE taa.attempt_id = p_attempt_id
      AND taa.question_id = gr.question_id
    RETURNING taa.question_id, gr.marks_awarded, gr.is_correct
  )
  SELECT COALESCE(SUM(marks_awarded), 0)
  INTO v_total_score
  FROM updated_answers;

  -- 4. Clamp final score floor to 0
  IF v_total_score < 0 THEN
    v_total_score := 0;
  END IF;

  SELECT COALESCE(SUM(time_spent_seconds), 0)
  INTO v_total_time_spent
  FROM public.test_attempt_answers
  WHERE attempt_id = p_attempt_id;

  v_actual_time_spent := EXTRACT(EPOCH FROM (now() - v_attempt.started_at))::INT;

  -- Ensure active question time never exceeds total wall-clock duration
  IF v_actual_time_spent > 0 AND v_total_time_spent > v_actual_time_spent THEN
    v_total_time_spent := v_actual_time_spent;
  END IF;

  -- 6. Calculate Percentage & Pass status
  IF v_total_possible_marks > 0 THEN
    v_percentage := ROUND((v_total_score / v_total_possible_marks) * 100, 2);
  ELSE
    v_percentage := 0;
  END IF;

  IF v_test.pass_percentage IS NOT NULL THEN
    v_passed := (v_percentage >= v_test.pass_percentage);
  ELSE
    v_passed := true;
  END IF;

  -- 7. Mark attempt as submitted with final score (percentage is auto-computed as a GENERATED column)
  UPDATE public.test_attempts
  SET
    status = 'submitted',
    submitted_at = now(),
    score = v_total_score,
    total_marks = v_total_possible_marks,
    passed = v_passed,
    time_spent_seconds = v_total_time_spent,
    actual_time_spent_seconds = v_actual_time_spent,
    updated_at = now()
  WHERE id = p_attempt_id
  RETURNING percentage INTO v_percentage;

  RETURN jsonb_build_object(
    'test_id', v_attempt.test_id,
    'score', v_total_score,
    'total_marks', v_total_possible_marks,
    'percentage', COALESCE(v_percentage, 0),
    'passed', v_passed
  );
END;
$$;


-- 5. SUBMIT FEEDBACK RPC
CREATE OR REPLACE FUNCTION public.submit_attempt_feedback(
  p_attempt_id UUID,
  p_test_id UUID,
  p_rating INT,
  p_overall_comment TEXT DEFAULT NULL,
  p_bugs_issues TEXT DEFAULT NULL,
  p_suggestions TEXT DEFAULT NULL,
  p_difficulty_felt TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id UUID := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('error', 'Unauthorized');
  END IF;

  -- Verify ownership
  IF NOT EXISTS (
    SELECT 1 FROM public.test_attempts
    WHERE id = p_attempt_id AND candidate_id = v_user_id
  ) THEN
    RETURN jsonb_build_object('error', 'Attempt not found or unauthorized');
  END IF;

  INSERT INTO public.test_attempt_feedbacks (
    attempt_id,
    candidate_id,
    test_id,
    rating,
    overall_comment,
    bugs_issues,
    suggestions,
    difficulty_felt
  )
  VALUES (
    p_attempt_id,
    v_user_id,
    p_test_id,
    p_rating,
    p_overall_comment,
    p_bugs_issues,
    p_suggestions,
    p_difficulty_felt
  )
  ON CONFLICT (attempt_id)
  DO UPDATE SET
    rating = EXCLUDED.rating,
    overall_comment = EXCLUDED.overall_comment,
    bugs_issues = EXCLUDED.bugs_issues,
    suggestions = EXCLUDED.suggestions,
    difficulty_felt = EXCLUDED.difficulty_felt;

  RETURN jsonb_build_object('ok', true);
END;
$$;

-- Grant execution permissions to authenticated users
GRANT EXECUTE ON FUNCTION public.test_attempt_start(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.test_attempt_sync(UUID, TEXT, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_attempt_violation(UUID, TEXT, INT, TIMESTAMPTZ) TO authenticated;
GRANT EXECUTE ON FUNCTION public.test_attempt_grade(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.submit_attempt_feedback(UUID, UUID, INT, TEXT, TEXT, TEXT, TEXT) TO authenticated;
