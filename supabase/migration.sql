-- SQL Migration: Support media_url and test-questions storage policies

-- 1. Create storage policies for the 'test-questions' bucket
DROP POLICY IF EXISTS "Allow public select from test-questions" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated insert to test-questions" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated update to test-questions" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated delete to test-questions" ON storage.objects;

CREATE POLICY "Allow public select from test-questions"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'test-questions');

CREATE POLICY "Allow authenticated insert to test-questions"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'test-questions');

CREATE POLICY "Allow authenticated update to test-questions"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'test-questions')
WITH CHECK (bucket_id = 'test-questions');

CREATE POLICY "Allow authenticated delete to test-questions"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'test-questions');

-- 2. Create or Replace test_save database function
CREATE OR REPLACE FUNCTION public.test_save(p_test_id uuid, p_settings jsonb, p_questions jsonb[], p_status text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_institute_id uuid;
  v_q_json jsonb;
  v_q_ids uuid[];
  v_tag_id uuid;
  v_tag_name text;
  v_opt jsonb;
  v_opt_idx int;
  v_opt_ids uuid[];
BEGIN
  -- Resolve the user's institute_id
  SELECT institute_id INTO v_institute_id FROM public.profiles WHERE id = v_user_id;
  
  IF v_institute_id IS NULL THEN
    RAISE EXCEPTION 'User does not belong to any institute';
  END IF;

  -- 1. Verify ownership or new test
  IF EXISTS (SELECT 1 FROM public.tests WHERE id = p_test_id AND institute_id <> v_institute_id) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  -- 2. Upsert Test (now includes shuffle_questions, shuffle_options, strict_mode)
  INSERT INTO public.tests (
    id, institute_id, title, description, instructions, 
    time_limit_seconds, available_from, available_until, status,
    shuffle_questions, shuffle_options, strict_mode
  ) VALUES (
    p_test_id,
    v_institute_id,
    p_settings->>'title',
    p_settings->>'description',
    p_settings->>'instructions',
    (p_settings->>'time_limit_seconds')::int,
    (p_settings->>'available_from')::timestamptz,
    (p_settings->>'available_until')::timestamptz,
    p_status::test_status,
    COALESCE((p_settings->>'shuffle_questions')::boolean, false),
    COALESCE((p_settings->>'shuffle_options')::boolean, false),
    COALESCE((p_settings->>'strict_mode')::boolean, false)
  )
  ON CONFLICT (id) DO UPDATE SET
    title = EXCLUDED.title,
    description = EXCLUDED.description,
    instructions = EXCLUDED.instructions,
    time_limit_seconds = EXCLUDED.time_limit_seconds,
    available_from = EXCLUDED.available_from,
    available_until = EXCLUDED.available_until,
    status = EXCLUDED.status,
    shuffle_questions = EXCLUDED.shuffle_questions,
    shuffle_options = EXCLUDED.shuffle_options,
    strict_mode = EXCLUDED.strict_mode;

  -- 3. Handle Questions (including media_url)
  v_q_ids := ARRAY(SELECT (q->>'id')::uuid FROM unnest(p_questions) AS q);
  
  DELETE FROM public.test_questions 
  WHERE test_id = p_test_id 
    AND id <> ALL(COALESCE(v_q_ids, ARRAY[]::uuid[]));

  FOR i IN 1..cardinality(p_questions) LOOP
    v_q_json := p_questions[i];
    
    INSERT INTO public.test_questions (
      id, test_id, question_text, question_type, marks, order_index, explanation, media_url
    ) VALUES (
      (v_q_json->>'id')::uuid,
      p_test_id,
      v_q_json->>'question_text',
      (v_q_json->>'question_type')::question_type,
      (v_q_json->>'marks')::numeric,
      i,
      v_q_json->>'explanation',
      v_q_json->>'media_url'
    )
    ON CONFLICT (id) DO UPDATE SET
      question_text = EXCLUDED.question_text,
      question_type = EXCLUDED.question_type,
      marks = EXCLUDED.marks,
      order_index = EXCLUDED.order_index,
      explanation = EXCLUDED.explanation,
      media_url = EXCLUDED.media_url;

    v_opt_ids := ARRAY(SELECT (o->>'id')::uuid FROM jsonb_array_elements(v_q_json->'options') AS o WHERE o ? 'id');
    
    DELETE FROM public.test_question_options 
    WHERE question_id = (v_q_json->>'id')::uuid 
      AND id <> ALL(COALESCE(v_opt_ids, ARRAY[]::uuid[]));
    
    v_opt_idx := 1;
    FOR v_opt IN SELECT jsonb_array_elements(v_q_json->'options') LOOP
      INSERT INTO public.test_question_options (id, question_id, option_text, is_correct, order_index)
      VALUES (
        COALESCE((v_opt->>'id')::uuid, gen_random_uuid()),
        (v_q_json->>'id')::uuid,
        v_opt->>'option_text',
        (v_opt->>'is_correct')::boolean,
        v_opt_idx
      )
      ON CONFLICT (id) DO UPDATE SET
        option_text = EXCLUDED.option_text,
        is_correct = EXCLUDED.is_correct,
        order_index = EXCLUDED.order_index;
      v_opt_idx := v_opt_idx + 1;
    END LOOP;

    DELETE FROM public.question_tags WHERE question_id = (v_q_json->>'id')::uuid;
    
    IF v_q_json ? 'tag_names' AND jsonb_array_length(v_q_json->'tag_names') > 0 THEN
      FOR v_tag_name IN SELECT jsonb_array_elements_text(v_q_json->'tag_names') LOOP
        INSERT INTO public.test_question_tags (name) VALUES (v_tag_name)
        ON CONFLICT (name) DO NOTHING;
        
        SELECT id INTO v_tag_id FROM public.test_question_tags WHERE name = v_tag_name;
        
        INSERT INTO public.question_tags (question_id, tag_id)
        VALUES ((v_q_json->>'id')::uuid, v_tag_id)
        ON CONFLICT DO NOTHING;
      END LOOP;
    END IF;
  END LOOP;
END;
$function$;
