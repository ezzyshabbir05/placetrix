import { createClient } from "@/lib/supabase/server";
import { getUserProfile } from "@/lib/supabase/profile";
import { notFound } from "next/navigation";
import { CandidatePublicProfileView } from "./CandidatePublicProfileView";

interface PageProps {
  params: Promise<{ username: string }>;
}

export default async function PublicProfilePage({ params }: PageProps) {
  const { username } = await params;

  // 1. Get the viewer's profile (auth check — redirects if unauthenticated)
  const viewer = await getUserProfile();
  if (!viewer) return notFound();

  const supabase = await createClient();

  // 2. Look up the target candidate by username
  const { data: targetProfile } = await (supabase as any)
    .from("profiles")
    .select("*")
    .eq("username", username)
    .eq("account_type", "institute_candidate")
    .maybeSingle();

  if (!targetProfile) return notFound();

  // 3. Access-control check
  const isAdmin = viewer.account_type === "admin";
  const isSameInstitute =
    viewer.institute_id &&
    targetProfile.institute_id &&
    viewer.institute_id === targetProfile.institute_id;

  if (!isAdmin && !isSameInstitute) return notFound();

  // 4. Fetch all public data for the target candidate
  const [
    { data: academicDetails },
    { data: candidateEducation },
    { data: candidateExperiences },
    { data: candidateProjects },
    { data: candidateCertifications },
    { data: eventTickets },
    { data: allSkills },
    { data: candidateSkillRows },
    { data: semesterGrades },
  ] = await Promise.all([
    (supabase as any)
      .from("candidate_academic_details")
      .select("course_id, passout_year, university_prn, course:institute_courses(course_name)")
      .eq("profile_id", targetProfile.id)
      .maybeSingle(),
    (supabase as any)
      .from("candidate_education")
      .select("*")
      .eq("profile_id", targetProfile.id)
      .order("passout_year", { ascending: false }),
    (supabase as any)
      .from("candidate_experiences")
      .select("*")
      .eq("profile_id", targetProfile.id)
      .order("start_date", { ascending: false }),
    (supabase as any)
      .from("candidate_projects")
      .select("*")
      .eq("profile_id", targetProfile.id)
      .order("start_date", { ascending: false }),
    (supabase as any)
      .from("candidate_certifications")
      .select("*")
      .eq("profile_id", targetProfile.id)
      .order("issue_date", { ascending: false }),
    (supabase as any)
      .from("event_tickets")
      .select(`
        id,
        event:events!inner(
          id,
          title,
          date,
          status
        )
      `)
      .eq("candidate_id", targetProfile.id)
      .eq("attendance_status", "Present")
      .eq("events.status", "Concluded"),
    (supabase as any).from("skills").select("*").order("category").order("name"),
    (supabase as any)
      .from("candidate_skills")
      .select("skill_id")
      .eq("profile_id", targetProfile.id),
    (supabase as any)
      .from("candidate_semester_grades")
      .select("semester_number, sgpa")
      .eq("profile_id", targetProfile.id)
      .order("semester_number"),
  ]);

  // 5. Derive semester count from the course config
  let semestersCount = 8;
  if (targetProfile.institute_id && academicDetails?.course_id) {
    const { data: courseData } = await (supabase as any)
      .from("institute_courses")
      .select("semesters_count")
      .eq("id", academicDetails.course_id)
      .maybeSingle();
    if (courseData) semestersCount = courseData.semesters_count;
  }

  // 6. Get institute name
  let instituteName: string | null = null;
  if (targetProfile.institute_id) {
    const { data: inst } = await (supabase as any)
      .from("institutes")
      .select("institute_name")
      .eq("id", targetProfile.institute_id)
      .maybeSingle();
    instituteName = inst?.institute_name ?? null;
  }

  const sgpaArray = Array.from({ length: semestersCount }, (_, i) => {
    const row = (semesterGrades || []).find(
      (g: any) => g.semester_number === i + 1
    );
    return row && row.sgpa != null ? Number(row.sgpa).toFixed(2) : null;
  });

  const eventCertificates = (eventTickets ?? [])
    .filter((t: any) => t.event)
    .map((t: any) => ({
      ticketId: t.id,
      eventId: t.event.id,
      eventTitle: t.event.title,
      eventDate: t.event.date,
    }));

  const courseName = Array.isArray(academicDetails?.course)
    ? (academicDetails?.course as any)[0]?.course_name
    : (academicDetails?.course as any)?.course_name;

  const selectedSkillIds: string[] = (candidateSkillRows ?? []).map(
    (r: any) => r.skill_id
  );

  // 7. Fetch LogicLab performance data for the target candidate
  const cutOffDate20Weeks = new Date(Date.now() + 5.5 * 60 * 60 * 1000 - 140 * 24 * 60 * 60 * 1000);
  const cutOffStr20Weeks = cutOffDate20Weeks.toISOString().split("T")[0];

  const [
    { data: activityRows },
    { data: streakRows },
    { data: statsData },
    { data: standardSolvedSubs },
    { data: dailySolvedSubs },
  ] = await Promise.all([
    (supabase as any)
      .from("logiclab_daily_challenge_user_activity")
      .select("activity_date, submission_count, solved, easy_solved, medium_solved, hard_solved, easy_attempted, medium_attempted, hard_attempted")
      .eq("user_id", targetProfile.id)
      .gte("activity_date", cutOffStr20Weeks)
      .order("activity_date", { ascending: true }),
    (supabase as any)
      .from("logiclab_daily_challenge_user_activity")
      .select("activity_date, solved, submission_count")
      .eq("user_id", targetProfile.id)
      .order("activity_date", { ascending: true }),
    (supabase as any).rpc("get_user_global_stats", { p_user_id: targetProfile.id }),
    (supabase as any)
      .from("logiclab_problem_submissions")
      .select("problem_id, status")
      .eq("user_id", targetProfile.id)
      .eq("status", "Accepted"),
    (supabase as any)
      .from("logiclab_daily_challenge_submissions")
      .select("problem_id, status")
      .eq("user_id", targetProfile.id)
      .eq("status", "Accepted"),
  ]);

  // Compute streaks accurately across all activity
  const istOffset = 5.5 * 60 * 60 * 1000;
  const todayIst = new Date(Date.now() + istOffset);
  const todayStr = todayIst.toISOString().split("T")[0];
  const yesterdayIst = new Date(todayIst.getTime() - 24 * 60 * 60 * 1000);
  const yesterdayStr = yesterdayIst.toISOString().split("T")[0];

  const allActiveDates = new Map<string, boolean>();
  for (const row of streakRows ?? []) {
    if (row.activity_date && (row.solved || Number(row.submission_count) > 0)) {
      allActiveDates.set(row.activity_date, true);
    }
  }

  const sortedDates = Array.from(allActiveDates.keys()).sort((a, b) => b.localeCompare(a));
  let currentStreak = 0;
  let maxStreak = 0;

  if (sortedDates.length > 0) {
    const ascDates = [...sortedDates].reverse();
    let prevDate: Date | null = null;
    let tempStreak = 0;

    for (const dStr of ascDates) {
      const currentDate = new Date(dStr);
      if (!prevDate) {
        tempStreak = 1;
      } else {
        const diffTime = Math.abs(currentDate.getTime() - prevDate.getTime());
        const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
        if (diffDays <= 1) {
          tempStreak++;
        } else {
          if (tempStreak > maxStreak) maxStreak = tempStreak;
          tempStreak = 1;
        }
      }
      prevDate = currentDate;
    }
    if (tempStreak > maxStreak) maxStreak = tempStreak;

    const hasActiveStreak = allActiveDates.has(todayStr) || allActiveDates.has(yesterdayStr);
    if (hasActiveStreak) {
      const checkDate = allActiveDates.has(todayStr) ? new Date(todayIst) : new Date(yesterdayIst);
      let checkStr = checkDate.toISOString().split("T")[0];
      while (allActiveDates.has(checkStr)) {
        currentStreak++;
        checkDate.setUTCDate(checkDate.getUTCDate() - 1);
        checkStr = checkDate.toISOString().split("T")[0];
      }
    }
  }
  if (currentStreak > maxStreak) maxStreak = currentStreak;

  // Build 140-day (20 weeks) activity calendar
  const uniqueDatesWithStatus = new Map<string, any>();
  for (const row of activityRows ?? []) {
    if (row.activity_date) {
      uniqueDatesWithStatus.set(row.activity_date, row);
    }
  }

  const activityCalendar: any[] = [];
  for (let i = 139; i >= 0; i--) {
    const d = new Date(todayIst.getTime() - i * 24 * 60 * 60 * 1000);
    const dateStr = d.toISOString().split("T")[0];
    const activity = uniqueDatesWithStatus.get(dateStr);
    activityCalendar.push({
      date: dateStr,
      count: Number(activity?.submission_count || 0),
      status: activity?.solved ? "solved" : (activity?.submission_count > 0 ? "attempted" : "none"),
      dayOfWeek: d.getUTCDay(),
      easySolved: Number(activity?.easy_solved || 0),
      mediumSolved: Number(activity?.medium_solved || 0),
      hardSolved: Number(activity?.hard_solved || 0),
    });
  }

  // Fetch problem details for unique solved problem IDs to compute topic proficiency
  const solvedProblemIds = Array.from(
    new Set([
      ...(standardSolvedSubs || []).map((s: any) => s.problem_id),
      ...(dailySolvedSubs || []).map((s: any) => s.problem_id),
    ].filter(Boolean))
  );

  let topicCounts: Record<string, number> = {};
  if (solvedProblemIds.length > 0) {
    const { data: solvedProblems } = await (supabase as any)
      .from("logiclab_problems")
      .select("id, tags")
      .in("id", solvedProblemIds);

    for (const prob of solvedProblems || []) {
      if (Array.isArray(prob.tags)) {
        for (const tag of prob.tags) {
          if (tag) {
            topicCounts[tag] = (topicCounts[tag] || 0) + 1;
          }
        }
      }
    }
  }

  const sortedTopics = Object.entries(topicCounts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  const globalStats = statsData || {
    total: 0,
    solved: 0,
    easy: { total: 0, solved: 0 },
    medium: { total: 0, solved: 0 },
    hard: { total: 0, solved: 0 },
  };

  const logicLabData = {
    streakStats: { currentStreak, maxStreak, totalActiveDays: allActiveDates.size },
    activityCalendar,
    globalStats,
    topics: sortedTopics,
    uniqueSolvedCount: solvedProblemIds.length,
  };

  // 8. Build safe public data object — private fields explicitly excluded
  const publicData = {
    profile_id: targetProfile.id,
    full_name: targetProfile.full_name,
    first_name: targetProfile.first_name,
    last_name: targetProfile.last_name,
    email: targetProfile.email,
    username: targetProfile.username,
    avatar_path: targetProfile.avatar_path,
    bio: targetProfile.bio,
    gender: targetProfile.gender,
    linkedin_url: targetProfile.linkedin_url,
    github_url: targetProfile.github_url,
    portfolio_links: targetProfile.portfolio_links,
    course_name: courseName ?? null,
    passout_year: academicDetails?.passout_year ?? null,
    university_prn: academicDetails?.university_prn ?? null,
    institute_name: instituteName,
    sgpa_semesters: sgpaArray,
  };

  return (
    <CandidatePublicProfileView
      publicData={publicData}
      educationData={candidateEducation ?? []}
      experienceData={candidateExperiences ?? []}
      projectsData={candidateProjects ?? []}
      certificationsData={candidateCertifications ?? []}
      eventCertificates={eventCertificates}
      allSkills={allSkills ?? []}
      selectedSkillIds={selectedSkillIds}
      semestersCount={semestersCount}
      logicLabData={logicLabData}
    />
  );
}
