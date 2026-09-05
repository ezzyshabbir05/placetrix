import { createAdminClient } from "@/lib/supabase/admin";
import { unstable_cache } from "next/cache";

/**
 * Caches the global skills dictionary for 24 hours.
 * Skills change very rarely; caching this avoids a DB query + JSON parsing
 * on every candidate profile view and resume tool render.
 */
export const getCachedGlobalSkills = unstable_cache(
  async () => {
    const adminSupabase = createAdminClient();
    const { data } = await (adminSupabase as any)
      .from("skills")
      .select("*")
      .order("category")
      .order("name");
    return (data || []) as any[];
  },
  ["global-skills-cache-v1"],
  { revalidate: 86400, tags: ["global-skills"] }
);

/**
 * Caches the global LogicLab badges dictionary for 24 hours.
 */
export const getCachedGlobalBadges = unstable_cache(
  async () => {
    const adminSupabase = createAdminClient();
    const { data } = await (adminSupabase as any)
      .from("logiclab_badges")
      .select("id, name, description, icon_name")
      .order("name");
    return (data || []) as Array<{ id: string; name: string; description: string; icon_name: string }>;
  },
  ["global-badges-cache-v1"],
  { revalidate: 86400, tags: ["global-badges"] }
);

/**
 * Caches global tag counts across all published LogicLab problems for 1 hour.
 */
export const getCachedGlobalTagCounts = unstable_cache(
  async () => {
    const adminSupabase = createAdminClient();
    const { data: problems } = await (adminSupabase as any)
      .from("logiclab_problems")
      .select("tags");

    const counts: Record<string, number> = {};
    for (const prob of problems || []) {
      if (Array.isArray(prob.tags)) {
        for (const tag of prob.tags) {
          if (tag) {
            counts[tag] = (counts[tag] || 0) + 1;
          }
        }
      }
    }
    return counts;
  },
  ["global-tag-counts-cache-v1"],
  { revalidate: 3600, tags: ["global-tags"] }
);

/**
 * Caches global institutes list for 24 hours.
 */
export const getCachedGlobalInstitutes = unstable_cache(
  async () => {
    const adminSupabase = createAdminClient();
    const { data } = await (adminSupabase as any)
      .from("institutes")
      .select("id, institute_name, affiliation")
      .order("institute_name");
    return (data || []) as Array<{ id: string; institute_name: string; affiliation?: string }>;
  },
  ["global-institutes-cache-v1"],
  { revalidate: 86400, tags: ["global-institutes"] }
);

/**
 * Caches the LogicLab global problems list for 1 hour.
 */
export const getCachedGlobalProblemsList = unstable_cache(
  async () => {
    const adminSupabase = createAdminClient();
    const { data: problems } = await (adminSupabase as any)
      .from("logiclab_problems")
      .select("id, number, title, difficulty, created_at")
      .order("number", { ascending: true });

    return (problems as any[]) || [];
  },
  ["global-problems-list-cache-v1"],
  { revalidate: 3600, tags: ["global-problems"] }
);

/**
 * Caches daily challenge POTD metadata for 1 min.
 */
export const getCachedPotd = unstable_cache(
  async (todayStr: string) => {
    const adminSupabase = createAdminClient();
    const { data } = await (adminSupabase as any)
      .from("logiclab_daily_challenges")
      .select("id, problem_id, logiclab_problems ( id, title, difficulty )")
      .eq("date", todayStr)
      .maybeSingle();
    return data;
  },
  ["daily-potd-cache"],
  { revalidate: 60, tags: ["potd"] }
);

/**
 * Caches daily challenge POTD metadata along with problem details and submission stats
 * in server memory for 20 minutes (1200 seconds).
 */
export const getCachedFullPotd = unstable_cache(
  async (todayStr: string) => {
    const adminSupabase = createAdminClient();
    const { data: potd, error } = await (adminSupabase as any)
      .from("logiclab_daily_challenges")
      .select("id, problem_id, logiclab_problems(id, number, title, difficulty, tags)")
      .eq("date", todayStr)
      .maybeSingle();

    if (error || !potd || !potd.problem_id) {
      return null;
    }

    const prob = potd.logiclab_problems as any;

    const { data: statsRow } = await (adminSupabase as any)
      .from("logiclab_problem_stats")
      .select("accepted_submissions, total_submissions")
      .eq("problem_id", potd.problem_id)
      .maybeSingle();

    const totalSubmissions = statsRow?.total_submissions || 0;
    const acceptedSubmissions = statsRow?.accepted_submissions || 0;
    const acceptanceRate = totalSubmissions > 0 ? Math.round((acceptedSubmissions / totalSubmissions) * 100) : null;

    return {
      id: potd.id,
      problem_id: potd.problem_id,
      initialPotd: {
        id: potd.id,
        problem_id: potd.problem_id,
        logiclab_problems: {
          id: prob?.id || potd.problem_id,
          title: prob?.title,
          difficulty: prob?.difficulty,
        },
      },
      fullPotdProblem: {
        id: prob?.id || potd.problem_id,
        number: prob?.number,
        title: prob?.title,
        difficulty: prob?.difficulty,
        tags: prob?.tags,
        acceptance_rate: acceptanceRate,
        total_submissions: totalSubmissions,
      },
    };
  },
  ["full-potd-cache-20m-v1"],
  { revalidate: 1200, tags: ["potd"] }
);

/**
 * Cache execution-critical static data to eliminate DB reads on /run and /submit.
 * Revalidate after 1 hour or when a problem is updated (tag: problem-exec-{id}).
 */
export async function getCachedProblemExecutionData(problemId: string) {
  return unstable_cache(
    async () => {
      const adminSupabase = createAdminClient() as any;
      const { data: problems, error } = await adminSupabase
        .from("logiclab_problems")
        .select("driver_codes, time_limit, memory_limit, test_cases")
        .eq("id", problemId);

      if (error || !problems || !problems.length) {
        return null;
      }
      return problems[0];
    },
    [`problem-exec-${problemId}`],
    { revalidate: 3600, tags: [`problem-exec-${problemId}`] }
  )();
}

/**
 * Cache candidate resume prefill raw data for 10 minutes to eliminate 8-9 DB reads on every resume generator load.
 */
export async function getCachedCandidateResumePrefill(profileId: string, instituteId?: string | null) {
  return unstable_cache(
    async () => {
      const adminSupabase = createAdminClient() as any;
      const [
        { data: academicDetails },
        { data: candidateEducation },
        { data: candidateExperiences },
        { data: candidateProjects },
        { data: candidateCertifications },
        { data: candidateSkillRows },
        { data: semesterGrades },
        instRes,
      ] = await Promise.all([
        adminSupabase
          .from("candidate_academic_details")
          .select("course_id, passout_year, university_prn, course:institute_courses(course_name)")
          .eq("profile_id", profileId)
          .maybeSingle(),
        adminSupabase
          .from("candidate_education")
          .select("*")
          .eq("profile_id", profileId)
          .order("passout_year", { ascending: false }),
        adminSupabase
          .from("candidate_experiences")
          .select("*")
          .eq("profile_id", profileId)
          .order("start_date", { ascending: false }),
        adminSupabase
          .from("candidate_projects")
          .select("*")
          .eq("profile_id", profileId)
          .order("start_date", { ascending: false }),
        adminSupabase
          .from("candidate_certifications")
          .select("*")
          .eq("profile_id", profileId)
          .order("issue_date", { ascending: false }),
        adminSupabase
          .from("candidate_skills")
          .select("skill_id")
          .eq("profile_id", profileId),
        adminSupabase
          .from("candidate_semester_grades")
          .select("semester_number, sgpa")
          .eq("profile_id", profileId)
          .order("semester_number"),
        instituteId
          ? adminSupabase
              .from("institutes")
              .select("institute_name")
              .eq("id", instituteId)
              .maybeSingle()
          : Promise.resolve({ data: null }),
      ]);

      return {
        academicDetails,
        candidateEducation,
        candidateExperiences,
        candidateProjects,
        candidateCertifications,
        candidateSkillRows,
        semesterGrades,
        instituteName: instRes?.data?.institute_name ?? null,
      };
    },
    [`candidate-resume-prefill-${profileId}`],
    { revalidate: 600, tags: [`candidate-resume-${profileId}`] }
  )();
}


