-- 1. Rename student_id to candidate_id in test_attempts
ALTER TABLE public.test_attempts RENAME COLUMN student_id TO candidate_id;

-- Rename foreign key constraint
ALTER TABLE public.test_attempts DROP CONSTRAINT IF EXISTS test_attempts_student_id_fkey;
ALTER TABLE public.test_attempts ADD CONSTRAINT test_attempts_candidate_id_fkey FOREIGN KEY (candidate_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Rename unique constraint
ALTER TABLE public.test_attempts DROP CONSTRAINT IF EXISTS test_attempts_test_id_student_id_attempt_number_key;
ALTER TABLE public.test_attempts ADD CONSTRAINT test_attempts_test_id_candidate_id_attempt_number_key UNIQUE (test_id, candidate_id, attempt_number);

-- Rename indexes for test_attempts
DROP INDEX IF EXISTS public.idx_attempts_student_id;
CREATE INDEX IF NOT EXISTS idx_attempts_candidate_id ON public.test_attempts (candidate_id);

DROP INDEX IF EXISTS public.idx_test_attempts_student_test_status;
CREATE INDEX IF NOT EXISTS idx_test_attempts_candidate_test_status ON public.test_attempts (candidate_id, test_id, status);

-- 2. Rename student_id to candidate_id in test_attempt_feedback
ALTER TABLE public.test_attempt_feedback RENAME COLUMN student_id TO candidate_id;

-- Rename foreign key constraint
ALTER TABLE public.test_attempt_feedback DROP CONSTRAINT IF EXISTS test_attempt_feedback_student_id_fkey;
ALTER TABLE public.test_attempt_feedback ADD CONSTRAINT test_attempt_feedback_candidate_id_fkey FOREIGN KEY (candidate_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Rename indexes for test_attempt_feedback
DROP INDEX IF EXISTS public.idx_feedback_student_id;
CREATE INDEX IF NOT EXISTS idx_feedback_candidate_id ON public.test_attempt_feedback (candidate_id);

-- 3. Update Stored Procedures to use candidate_id

CREATE OR REPLACE FUNCTION public.init_test_attempt(p_test_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_user_id UUID := auth.uid();
    v_profile RECORD;
    v_test RECORD;
    v_existing_attempt RECORD;
    v_completed_count INT;
    v_saved_answers JSONB;
BEGIN
    -- 1. Authorization & Profile
    SELECT institute_id, profile_complete, profile_updated 
    INTO v_profile FROM public.candidate_profiles WHERE profile_id = v_user_id;
    
    IF NOT FOUND OR NOT COALESCE(v_profile.profile_complete, FALSE) OR NOT COALESCE(v_profile.profile_updated, FALSE) THEN
        RETURN jsonb_build_object('error', 'Profile incomplete');
    END IF;

    -- 2. Test Availability Window & Status
    SELECT id, status, institute_id, max_attempts, available_from, available_until
    INTO v_test FROM public.tests WHERE id = p_test_id;

    IF NOT FOUND OR v_test.status != 'published' OR v_test.institute_id != v_profile.institute_id THEN
        RETURN jsonb_build_object('error', 'Test not available');
    END IF;

    -- 3. Check for Resume logic (students can always resume if test is active)
    SELECT id, started_at, expires_at, tab_switch_count, attempt_number
    INTO v_existing_attempt
    FROM public.test_attempts 
    WHERE test_id = p_test_id AND candidate_id = v_user_id AND status = 'in_progress'
    ORDER BY created_at DESC LIMIT 1;

    IF FOUND THEN
        SELECT jsonb_agg(jsonb_build_object('question_id', question_id, 'selected_option_ids', selected_option_ids)) 
        INTO v_saved_answers FROM public.attempt_answers WHERE attempt_id = v_existing_attempt.id;

        RETURN jsonb_build_object(
            'status', 'resumed',
            'attempt', jsonb_build_object(
                'id', v_existing_attempt.id,
                'started_at', v_existing_attempt.started_at,
                'expires_at', v_existing_attempt.expires_at,
                'tab_switch_count', COALESCE(v_existing_attempt.tab_switch_count, 0),
                'attempt_number', v_existing_attempt.attempt_number
            ),
            'saved_answers', COALESCE(v_saved_answers, '[]'::jsonb)
        );
    END IF;

    -- 4. STRICT Check availability window for NEW attempts
    IF v_test.available_from IS NOT NULL AND v_test.available_from > NOW() THEN
        RETURN jsonb_build_object('error', 'Test is not yet open');
    END IF;
    IF v_test.available_until IS NOT NULL AND v_test.available_until < NOW() THEN
        RETURN jsonb_build_object('error', 'Test has closed');
    END IF;

    -- 5. Check Remaining Attempts
    SELECT count(*) INTO v_completed_count FROM public.test_attempts 
    WHERE test_id = p_test_id AND candidate_id = v_user_id AND status IN ('submitted', 'auto_submitted');

    IF v_completed_count >= v_test.max_attempts THEN
        RETURN jsonb_build_object('error', 'Max attempts reached');
    END IF;

    RETURN jsonb_build_object('status', 'ready', 'completed_count', v_completed_count, 'max_attempts', v_test.max_attempts);
END;
$function$;


CREATE OR REPLACE FUNCTION public.bulk_save_answers(p_attempt_id uuid, p_batch jsonb)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
DECLARE
    ans_item JSONB;
BEGIN
    -- Verify ownership and status
    IF NOT EXISTS (
        SELECT 1 FROM public.test_attempts
        WHERE id = p_attempt_id
          AND candidate_id = auth.uid()
          AND status = 'in_progress'
    ) THEN
        RAISE EXCEPTION 'Invalid, already-submitted, or inaccessible attempt'
            USING ERRCODE = 'insufficient_privilege';
    END IF;

    FOR ans_item IN SELECT * FROM jsonb_array_elements(p_batch)
    LOOP
        INSERT INTO public.attempt_answers (
            attempt_id, 
            question_id, 
            selected_option_ids, 
            time_spent_seconds
        )
        VALUES (
            p_attempt_id, 
            (ans_item->>'questionId')::UUID, 
            ARRAY(SELECT jsonb_array_elements_text(ans_item->'selectedOptionIds')::UUID), 
            COALESCE((ans_item->>'timeSpentSeconds')::INT, 0)
        )
        ON CONFLICT (attempt_id, question_id)
        DO UPDATE SET
            selected_option_ids = EXCLUDED.selected_option_ids,
            time_spent_seconds  = attempt_answers.time_spent_seconds + EXCLUDED.time_spent_seconds,
            answered_at         = NOW(),
            updated_at          = NOW();
    END LOOP;
END;
$function$;


CREATE OR REPLACE FUNCTION public.get_candidate_home_stats(p_profile_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_profile RECORD;
    v_now TIMESTAMPTZ := NOW();
    v_total_tests BIGINT := 0;
    v_live_tests BIGINT := 0;
    v_upcoming_tests BIGINT := 0;
    v_completed_tests BIGINT := 0;
BEGIN
    -- Fetch the candidate profile
    SELECT * INTO v_profile 
    FROM public.candidate_profiles 
    WHERE profile_id = p_profile_id;

    -- If profile exists, fetch counts
    IF v_profile.profile_id IS NOT NULL AND v_profile.institute_id IS NOT NULL THEN
        -- Total published tests for this institute
        SELECT count(*) INTO v_total_tests
        FROM public.tests
        WHERE status = 'published' AND institute_id = v_profile.institute_id;

        -- Live tests
        SELECT count(*) INTO v_live_tests
        FROM public.tests
        WHERE status = 'published' 
          AND institute_id = v_profile.institute_id
          AND (available_from IS NULL OR available_from <= v_now)
          AND (available_until IS NULL OR available_until >= v_now);

        -- Upcoming tests
        SELECT count(*) INTO v_upcoming_tests
        FROM public.tests
        WHERE status = 'published' 
          AND institute_id = v_profile.institute_id
          AND available_from > v_now;

        -- Completed attempts by this student
        SELECT count(*) INTO v_completed_tests
        FROM public.test_attempts
        WHERE candidate_id = p_profile_id AND status = 'submitted';
    END IF;

    RETURN jsonb_build_object(
        'profile', (CASE WHEN v_profile.profile_id IS NOT NULL THEN row_to_json(v_profile) ELSE NULL END),
        'stats', jsonb_build_object(
            'total_tests', v_total_tests,
            'live_tests', v_live_tests,
            'upcoming_tests', v_upcoming_tests,
            'completed_tests', v_completed_tests
        )
    );
END;
$function$;


CREATE OR REPLACE FUNCTION public.grade_attempt_v2(p_attempt_id uuid, p_final_time_spent integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_test_pass_pct numeric(5,2);
    v_test_id       uuid;
    v_answer        record;
    v_correct_ids   uuid[];
    v_selected_ids  uuid[];
    v_is_correct    boolean;
    v_marks         numeric(5,2);
    v_total         numeric(7,2) := 0;
    v_scored        numeric(7,2) := 0;
    v_passed        boolean := null;
BEGIN
    -- 1. Update final time spent and check status
    UPDATE public.test_attempts
    SET time_spent_seconds = p_final_time_spent
    WHERE id = p_attempt_id
       AND candidate_id = auth.uid()
       AND status IN ('in_progress', 'auto_submitted')
    RETURNING test_id INTO v_test_id;

    IF v_test_id IS NULL THEN
        RETURN jsonb_build_object('error', 'Attempt not found or already submitted');
    END IF;

    -- 2. Get test pass criteria and sum of all question marks
    SELECT 
        t.pass_percentage,
        COALESCE((SELECT sum(marks) FROM public.questions WHERE test_id = t.id), 0)
    INTO v_test_pass_pct, v_total
    FROM public.tests t
    WHERE t.id = v_test_id;

    -- 3. Cycle through answers and update scores
    FOR v_answer IN
        SELECT aa.id, aa.question_id, aa.selected_option_ids, q.marks, q.negative_marks, q.question_type
        FROM public.attempt_answers aa
        JOIN public.questions q ON q.id = aa.question_id
        WHERE aa.attempt_id = p_attempt_id
    LOOP
        -- Get IDs of correct options
        SELECT array_agg(id ORDER BY id) INTO v_correct_ids
        FROM public.options
        WHERE question_id = v_answer.question_id AND is_correct = TRUE;

        -- Clean up selected IDs
        SELECT array_agg(x ORDER BY x) INTO v_selected_ids
        FROM UNNEST(v_answer.selected_option_ids) x;

        -- Treat empty selected_option_ids as skipped
        IF v_selected_ids IS NULL OR ARRAY_LENGTH(v_selected_ids, 1) IS NULL THEN
            v_is_correct := NULL;
            v_marks := 0;
        ELSIF (COALESCE(v_selected_ids, '{}') = COALESCE(v_correct_ids, '{}')) THEN
            -- Exact match -> Full marks
            v_is_correct := TRUE;
            v_marks := v_answer.marks;
        ELSE
            -- No exact match -> Check for partial marking or standard incorrect
            v_is_correct := FALSE;

            IF v_answer.question_type = 'multiple_correct' THEN
                DECLARE
                    v_total_options    int;
                    v_num_correct      int;
                    v_num_wrong        int;
                    v_correct_selected int;
                    v_wrong_selected   int;
                    v_credit_per_opt   numeric(7,4);
                    v_penalty_per_opt  numeric(7,4);
                BEGIN
                    -- 1. Total Options and DB Wrong Options
                    SELECT COUNT(*) INTO v_total_options FROM public.options WHERE question_id = v_answer.question_id;
                    v_num_correct := COALESCE(ARRAY_LENGTH(v_correct_ids, 1), 0);
                    v_num_wrong := v_total_options - v_num_correct;

                    -- 2. Correct vs Wrong selected count
                    SELECT COUNT(*) INTO v_correct_selected
                    FROM UNNEST(v_selected_ids) sel
                    WHERE sel = ANY(v_correct_ids);
                    
                    v_wrong_selected := ARRAY_LENGTH(v_selected_ids, 1) - v_correct_selected;

                    -- Credit: Marks / Total Correct (So all correct = full marks)
                    v_credit_per_opt := CASE WHEN v_num_correct > 0 THEN v_answer.marks::numeric / v_num_correct ELSE 0 END;
                    
                    -- Penalty: Marks / Total Wrong (So selecting all options cancels out to 0 marks)
                    v_penalty_per_opt := CASE WHEN v_num_wrong > 0 THEN v_answer.marks::numeric / v_num_wrong ELSE 0 END;

                    -- Final Score: (Correct Credit) - (Wrong Penalty), floored at 0
                    v_marks := GREATEST(0, (v_correct_selected * v_credit_per_opt) - (v_wrong_selected * v_penalty_per_opt));
                END;
            ELSE
                -- single_correct / true_false: Standard negative marking, but floored at 0 per question score
                v_marks := GREATEST(0, -ABS(v_answer.negative_marks));
            END IF;
        END IF;

        UPDATE public.attempt_answers
        SET is_correct    = v_is_correct,
            marks_awarded = v_marks,
            updated_at    = NOW()
        WHERE id = v_answer.id;

        v_scored := v_scored + v_marks;
    END LOOP;

    -- 4. Pass/Fail Decision
    IF v_test_pass_pct IS NOT NULL AND v_total > 0 THEN
        v_passed := (v_scored / v_total) * 100 >= v_test_pass_pct;
    END IF;

    -- 5. Finalize attempt
    UPDATE public.test_attempts
    SET status       = CASE WHEN status = 'in_progress' THEN 'submitted'::attempt_status ELSE status END,
        submitted_at = COALESCE(submitted_at, NOW()),
        score        = v_scored,
        total_marks  = v_total,
        passed       = v_passed,
        updated_at   = NOW()
    WHERE id = p_attempt_id;

    RETURN jsonb_build_object(
        'status', 'submitted',
        'test_id', v_test_id,
        'score', v_scored,
        'total_marks', v_total
    );
END;
$function$;


CREATE OR REPLACE FUNCTION public.save_answer(p_attempt_id uuid, p_question_id uuid, p_selected_option_ids uuid[], p_time_spent_seconds integer DEFAULT 0)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
begin
  -- Verify ownership and that it is still in_progress
  if not exists (
    select 1 from public.test_attempts
    where id = p_attempt_id
      and candidate_id = auth.uid()
      and status = 'in_progress'
  ) then
    raise exception 'Invalid, already-submitted, or inaccessible attempt'
      using errcode = 'insufficient_privilege';
  end if;

  insert into public.attempt_answers (attempt_id, question_id, selected_option_ids, time_spent_seconds)
  values (p_attempt_id, p_question_id, p_selected_option_ids, p_time_spent_seconds)
  on conflict (attempt_id, question_id)
  do update set
    selected_option_ids = excluded.selected_option_ids,
    time_spent_seconds  = attempt_answers.time_spent_seconds + excluded.time_spent_seconds,
    answered_at         = now(),
    updated_at          = now();
end;
$function$;
