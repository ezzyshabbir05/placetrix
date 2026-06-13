-- 1. Create the institutes table
CREATE TABLE IF NOT EXISTS public.institutes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institute_name TEXT NOT NULL,
    institute_code TEXT,
    established_year INTEGER,
    address TEXT,
    city TEXT,
    state TEXT,
    country TEXT,
    pincode TEXT,
    website_url TEXT,
    logo_path TEXT,
    email TEXT,
    phone_number TEXT,
    principal_name TEXT,
    principal_email TEXT,
    principal_phone TEXT,
    affiliation TEXT,
    courses TEXT[],
    social_links TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    old_profile_id UUID -- Temporary column for migration mapping
);

DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='institutes' AND column_name='old_profile_id') THEN
        ALTER TABLE public.institutes ADD COLUMN old_profile_id UUID;
    END IF;
END $$;

-- 2. Migrate existing data from institute_profiles to institutes
TRUNCATE TABLE public.institutes CASCADE;

INSERT INTO public.institutes (
    old_profile_id,
    institute_name,
    institute_code,
    established_year,
    address,
    city,
    state,
    country,
    pincode,
    website_url,
    logo_path,
    email,
    phone_number,
    principal_name,
    principal_email,
    principal_phone,
    affiliation,
    courses,
    social_links,
    created_at,
    updated_at
)
SELECT 
    profile_id,
    institute_name,
    institute_code,
    established_year,
    address,
    city,
    state,
    country,
    pincode,
    website_url,
    logo_path,
    email,
    phone_number,
    principal_name,
    principal_email,
    principal_phone,
    affiliation,
    courses,
    social_links,
    created_at,
    updated_at
FROM public.institute_profiles;

-- 3. Drop dependencies that would block dropping columns
DROP VIEW IF EXISTS public.view_test_summary CASCADE;
DROP TRIGGER IF EXISTS trg_institute_profiles_sync ON public.institute_profiles;
DROP FUNCTION IF EXISTS public.sync_institute_profile CASCADE;
DROP FUNCTION IF EXISTS public.get_institute_home_stats CASCADE;

-- 4. Drop old foreign key constraints BEFORE updating data
ALTER TABLE public.tests DROP CONSTRAINT IF EXISTS tests_institute_id_fkey;
ALTER TABLE public.candidate_profiles DROP CONSTRAINT IF EXISTS candidate_profiles_institute_id_fkey;
ALTER TABLE public.staff_profiles DROP CONSTRAINT IF EXISTS staff_profiles_institute_id_fkey;
ALTER TABLE public.tpo_profiles DROP CONSTRAINT IF EXISTS tpo_profiles_institute_id_fkey;

-- 5. Update existing tables to point to the new institutes.id
UPDATE public.tests t
SET institute_id = i.id
FROM public.institutes i
WHERE t.institute_id = i.old_profile_id;

UPDATE public.candidate_profiles c
SET institute_id = i.id
FROM public.institutes i
WHERE c.institute_id = i.old_profile_id;

UPDATE public.staff_profiles s
SET institute_id = i.id
FROM public.institutes i
WHERE s.institute_id = i.old_profile_id;

UPDATE public.tpo_profiles tp
SET institute_id = i.id
FROM public.institutes i
WHERE tp.institute_id = i.old_profile_id;

-- 6. Create new foreign keys
ALTER TABLE public.tests ADD CONSTRAINT tests_institute_id_fkey FOREIGN KEY (institute_id) REFERENCES public.institutes(id) ON DELETE CASCADE;
ALTER TABLE public.candidate_profiles ADD CONSTRAINT candidate_profiles_institute_id_fkey FOREIGN KEY (institute_id) REFERENCES public.institutes(id) ON DELETE SET NULL;
ALTER TABLE public.staff_profiles ADD CONSTRAINT staff_profiles_institute_id_fkey FOREIGN KEY (institute_id) REFERENCES public.institutes(id) ON DELETE SET NULL;
ALTER TABLE public.tpo_profiles ADD CONSTRAINT tpo_profiles_institute_id_fkey FOREIGN KEY (institute_id) REFERENCES public.institutes(id) ON DELETE SET NULL;

-- 7. Add institute_id to institute_profiles and link it
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='institute_profiles' AND column_name='institute_id') THEN
        ALTER TABLE public.institute_profiles ADD COLUMN institute_id UUID;
    END IF;
END $$;

UPDATE public.institute_profiles ip
SET institute_id = i.id
FROM public.institutes i
WHERE ip.profile_id = i.old_profile_id;

ALTER TABLE public.institute_profiles DROP CONSTRAINT IF EXISTS institute_profiles_institute_id_fkey;
ALTER TABLE public.institute_profiles ADD CONSTRAINT institute_profiles_institute_id_fkey FOREIGN KEY (institute_id) REFERENCES public.institutes(id) ON DELETE CASCADE;

-- 8. Clean up institute_profiles columns
ALTER TABLE public.institute_profiles
    DROP COLUMN IF EXISTS institute_name CASCADE,
    DROP COLUMN IF EXISTS institute_code CASCADE,
    DROP COLUMN IF EXISTS established_year CASCADE,
    DROP COLUMN IF EXISTS address CASCADE,
    DROP COLUMN IF EXISTS city CASCADE,
    DROP COLUMN IF EXISTS state CASCADE,
    DROP COLUMN IF EXISTS country CASCADE,
    DROP COLUMN IF EXISTS pincode CASCADE,
    DROP COLUMN IF EXISTS website_url CASCADE,
    DROP COLUMN IF EXISTS logo_path CASCADE,
    DROP COLUMN IF EXISTS email CASCADE,
    DROP COLUMN IF EXISTS phone_number CASCADE,
    DROP COLUMN IF EXISTS principal_name CASCADE,
    DROP COLUMN IF EXISTS principal_email CASCADE,
    DROP COLUMN IF EXISTS principal_phone CASCADE,
    DROP COLUMN IF EXISTS affiliation CASCADE,
    DROP COLUMN IF EXISTS courses CASCADE,
    DROP COLUMN IF EXISTS social_links CASCADE;

-- 9. Update trigger function to use new table structure
CREATE OR REPLACE FUNCTION public.sync_institute_profile()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  update public.profiles
  set
    display_name = nullif(trim(new.institute_name), ''),
    avatar_path   = new.logo_path
  where id IN (SELECT profile_id FROM public.institute_profiles WHERE institute_id = new.id);

  return null;
end;
$function$;

-- Create trigger on new table
CREATE TRIGGER trg_institutes_sync 
AFTER INSERT OR UPDATE OF institute_name, logo_path ON public.institutes 
FOR EACH ROW EXECUTE FUNCTION sync_institute_profile();

-- 10. Recreate the view_test_summary joining institutes instead of institute_profiles
CREATE OR REPLACE VIEW public.view_test_summary AS
 SELECT t.id,
    t.title,
    t.description,
    t.institute_id,
    i.institute_name,
    t.status,
    t.available_from,
    t.available_until,
    t.time_limit_seconds,
    t.results_available,
    t.created_at,
    ( SELECT count(*) AS count
           FROM questions q
          WHERE (q.test_id = t.id)) AS question_count,
    ( SELECT COALESCE(sum(q.marks), (0)::numeric) AS "coalesce"
           FROM questions q
          WHERE (q.test_id = t.id)) AS total_marks,
    ( SELECT count(*) AS count
           FROM test_attempts ta
          WHERE (ta.test_id = t.id)) AS total_attempts,
    ( SELECT count(*) AS count
           FROM test_attempts ta
          WHERE ((ta.test_id = t.id) AND (ta.status = 'submitted'::attempt_status))) AS submitted_attempts,
    ( SELECT round(avg(ta.percentage), 1) AS round
           FROM test_attempts ta
          WHERE ((ta.test_id = t.id) AND (ta.status = 'submitted'::attempt_status))) AS avg_score_pct
   FROM (tests t
     LEFT JOIN institutes i ON ((t.institute_id = i.id)));

-- 11. Recreate get_institute_home_stats function to use institutes
CREATE OR REPLACE FUNCTION public.get_institute_home_stats(p_profile_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_institute RECORD;
    v_institute_id UUID;
    v_now TIMESTAMPTZ := NOW();
    v_total_tests BIGINT := 0;
    v_live_tests BIGINT := 0;
    v_upcoming_tests BIGINT := 0;
    v_past_tests BIGINT := 0;
    v_draft_tests BIGINT := 0;
    v_total_attempts BIGINT := 0;
BEGIN
    -- Fetch the institute id from the profile
    SELECT institute_id INTO v_institute_id
    FROM public.institute_profiles
    WHERE profile_id = p_profile_id;
    
    -- Fetch the institute details
    SELECT * INTO v_institute 
    FROM public.institutes 
    WHERE id = v_institute_id;

    -- Fetch counts based on institute_id
    SELECT count(*) INTO v_total_tests FROM public.tests WHERE institute_id = v_institute_id;
    SELECT count(*) INTO v_live_tests FROM public.tests WHERE institute_id = v_institute_id AND status = 'published' AND (available_from IS NULL OR available_from <= v_now) AND (available_until IS NULL OR available_until >= v_now);
    SELECT count(*) INTO v_upcoming_tests FROM public.tests WHERE institute_id = v_institute_id AND status = 'published' AND available_from > v_now;
    SELECT count(*) INTO v_past_tests FROM public.tests WHERE institute_id = v_institute_id AND status = 'published' AND available_until < v_now;
    SELECT count(*) INTO v_draft_tests FROM public.tests WHERE institute_id = v_institute_id AND status = 'draft';

    SELECT count(*) INTO v_total_attempts
    FROM public.test_attempts ta
    JOIN public.tests t ON ta.test_id = t.id
    WHERE t.institute_id = v_institute_id;

    RETURN jsonb_build_object(
        'profile', (CASE WHEN v_institute.id IS NOT NULL THEN row_to_json(v_institute) ELSE NULL END),
        'stats', jsonb_build_object(
            'total_tests', v_total_tests,
            'live_tests', v_live_tests,
            'upcoming_tests', v_upcoming_tests,
            'past_tests', v_past_tests,
            'draft_tests', v_draft_tests,
            'total_attempts', v_total_attempts
        )
    );
END;
$function$;

-- 12. Drop temporary column from institutes
ALTER TABLE public.institutes DROP COLUMN old_profile_id;

-- Enable RLS
-- ALTER TABLE public.institutes ENABLE ROW LEVEL SECURITY;

