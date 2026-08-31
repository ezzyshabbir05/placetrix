import { createClient } from "@/lib/supabase/server";
import { getUserProfile } from "@/lib/supabase/profile";
import { getCurrentUserRankAction } from "@/app/(dashboard)/(licensed)/logiclab/leaderboard/actions";
import { notFound } from "next/navigation";
import { CandidateProfileReportView } from "./CandidateProfileReportView";
import { getCachedGlobalSkills, getCachedGlobalBadges, getCachedGlobalTagCounts } from "@/lib/supabase/cached-queries";

function categorizeTopic(topic: string): "Advanced" | "Intermediate" | "Fundamental" {
  const t = topic.toLowerCase();
  if (["dp", "dynamic programming", "backtracking", "divide and conquer", "union find", "trie", "segment tree", "graph", "topological sort", "shortest path", "bit manipulation", "euler circuit", "matrix exponentiation"].some(x => t.includes(x))) {
    return "Advanced";
  }
  if (["hash table", "hashmap", "math", "two pointers", "binary search", "tree", "binary tree", "linked list", "stack", "queue", "sliding window", "greedy", "sorting", "dfs", "bfs", "heap", "priority queue", "prefix sum", "recursion"].some(x => t.includes(x))) {
    return "Intermediate";
  }
  return "Fundamental";
}

interface PageProps {
  params: Promise<{ username: string }>;
}

const AUTHORIZED_ACCOUNT_TYPES = [
  "admin",
  "institute_primary",
  "institute_staff",
  "institute_placement_officer",
  "institute_candidate",
];

export default async function UserReportPage({ params }: PageProps) {
  const { username } = await params;

  // 1. Get viewer's profile & enforce staff / tpo / primary / admin permission
  const viewer = await getUserProfile();
  if (!viewer || !AUTHORIZED_ACCOUNT_TYPES.includes(viewer.account_type)) {
    return notFound();
  }

  const supabase = await createClient();

  // 2. Look up target candidate profile
  const { data: targetProfile } = await (supabase as any)
    .from("profiles")
    .select("id, full_name, first_name, last_name, email, username, avatar_path, bio, gender, linkedin_url, github_url, portfolio_links, institute_id, logiclab_points, account_type, privacy_settings")
    .eq("username", username)
    .eq("account_type", "institute_candidate")
    .maybeSingle();

  if (!targetProfile) return notFound();

  // 3. Enforce institute security boundary & privacy settings
  const isAdmin = viewer.account_type === "admin";
  const isStaff = viewer.account_type === "institute_staff" || viewer.account_type === "institute_primary" || viewer.account_type === "institute_placement_officer";
  const isOwner = viewer.id === targetProfile.id;
  const isSameInstitute =
    viewer.institute_id &&
    targetProfile.institute_id &&
    viewer.institute_id === targetProfile.institute_id;

  if (!isAdmin && !isSameInstitute) return notFound();

  const privacySettings = targetProfile.privacy_settings || {};

  // Privacy block: If profile is fully private, only the owner, admins, or staff can view it.
  if (privacySettings.is_private === true && !isOwner && !isAdmin && !isStaff) {
    return (
      <div className="flex h-[80vh] items-center justify-center flex-col gap-4">
        <h1 className="text-4xl font-bold tracking-tight">Private Profile</h1>
        <p className="text-muted-foreground">This user has chosen to keep their profile private.</p>
      </div>
    );
  }

  // 4. Batch query target candidate data in parallel
  const cutOffDate20Weeks = new Date(Date.now() - 140 * 24 * 60 * 60 * 1000);
  const cutOffStr20Weeks = cutOffDate20Weeks.toISOString().split("T")[0];

  const [
    { data: academicDetails },
    { data: candidateEducation },
    { data: candidateExperiences },
    { data: candidateProjects },
    { data: candidateCertifications },
    { data: eventTickets },
    allSkills,
    { data: candidateSkillRows },
    { data: semesterGrades },
    { data: userBadges },
    allBadges,
    { data: instData },
    { data: regActivitySubs },
    { data: dailyActivitySubs },
    { data: statsData },
    { data: standardSolvedSubs },
    { data: dailySolvedSubs },
    { data: recentStandardRaw },
    { data: recentDailyRaw },
    { data: memberRows },
    { data: attemptsRaw },
    cachedGlobalTags,
  ] = await Promise.all([
    (supabase as any)
      .from("candidate_academic_details")
      .select("course_id, passout_year, university_prn, course:institute_courses(course_name, semesters_count)")
      .eq("profile_id", targetProfile.id)
      .maybeSingle(),
    (supabase as any)
      .from("candidate_education")
      .select("id, type, institution_name, passout_year, grade_or_percentage")
      .eq("profile_id", targetProfile.id)
      .order("passout_year", { ascending: false }),
    (supabase as any)
      .from("candidate_experiences")
      .select("id, title, company_name, location, start_date, end_date, is_current, description")
      .eq("profile_id", targetProfile.id)
      .order("start_date", { ascending: false }),
    (supabase as any)
      .from("candidate_projects")
      .select("id, title, description, project_url, associated_with, start_date, end_date, is_ongoing, skills")
      .eq("profile_id", targetProfile.id)
      .order("start_date", { ascending: false }),
    (supabase as any)
      .from("candidate_certifications")
      .select("id, name, issuing_org, credential_id, credential_url, issue_date, expiration_date, does_not_expire")
      .eq("profile_id", targetProfile.id)
      .order("issue_date", { ascending: false }),
    (supabase as any)
      .from("event_tickets")
      .select("id, event:events!inner(id, title, date, status)")
      .eq("candidate_id", targetProfile.id)
      .eq("attendance_status", "Present")
      .eq("events.status", "Concluded"),
    getCachedGlobalSkills(),
    (supabase as any)
      .from("candidate_skills")
      .select("skill_id")
      .eq("profile_id", targetProfile.id),
    (supabase as any)
      .from("candidate_semester_grades")
      .select("semester_number, sgpa")
      .eq("profile_id", targetProfile.id)
      .order("semester_number", { ascending: true }),
    (supabase as any)
      .from("user_badges")
      .select("earned_at, logiclab_badges(id, name, description, icon_name)")
      .eq("user_id", targetProfile.id)
      .order("earned_at", { ascending: false }),
    getCachedGlobalBadges(),
    targetProfile.institute_id
      ? (supabase as any).from("institutes").select("institute_name").eq("id", targetProfile.institute_id).maybeSingle()
      : Promise.resolve({ data: null }),
    (supabase as any)
      .from("logiclab_problem_submissions")
      .select("created_at, status, logiclab_problems(difficulty)")
      .eq("user_id", targetProfile.id),
    (supabase as any)
      .from("logiclab_daily_challenge_submissions")
      .select("created_at, status, logiclab_problems(difficulty)")
      .eq("user_id", targetProfile.id),
    (supabase as any).rpc("get_user_global_stats", { p_user_id: targetProfile.id }),
    (supabase as any)
      .from("logiclab_problem_submissions")
      .select("problem_id")
      .eq("user_id", targetProfile.id)
      .eq("status", "Accepted"),
    (supabase as any)
      .from("logiclab_daily_challenge_submissions")
      .select("problem_id")
      .eq("user_id", targetProfile.id)
      .eq("status", "Accepted"),
    (supabase as any)
      .from("logiclab_problem_submissions")
      .select("created_at, problem_id, logiclab_problems(id, title, difficulty)")
      .eq("user_id", targetProfile.id)
      .eq("status", "Accepted")
      .order("created_at", { ascending: false })
      .limit(50),
    (supabase as any)
      .from("logiclab_daily_challenge_submissions")
      .select("created_at, problem_id, logiclab_problems(id, title, difficulty)")
      .eq("user_id", targetProfile.id)
      .eq("status", "Accepted")
      .order("created_at", { ascending: false })
      .limit(50),
    (supabase as any)
      .from("cohort_students")
      .select("cohort_id")
      .eq("student_id", targetProfile.id),
    (supabase as any)
      .from("test_attempts")
      .select("id, test_id, attempt_number, status, score, total_marks, percentage, passed, started_at, submitted_at, time_spent_seconds, tab_switch_count")
      .eq("candidate_id", targetProfile.id)
      .order("created_at", { ascending: false }),
    getCachedGlobalTagCounts(),
  ]);

  const semestersCount = academicDetails?.course?.semesters_count ?? 8;
  const courseName = academicDetails?.course?.course_name ?? null;
  const instituteName = instData?.institute_name ?? null;

  const sgpaArray = Array.from({ length: semestersCount }, (_, i) => {
    const row = (semesterGrades || []).find((g: any) => g.semester_number === i + 1);
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

  const selectedSkillIds: string[] = (candidateSkillRows ?? []).map((r: any) => r.skill_id);

  // UTC-based activity calendar and streak computation directly from actual submission timestamps
  const todayUtc = new Date();
  const todayStr = todayUtc.toISOString().split("T")[0];
  const yesterdayUtc = new Date(todayUtc.getTime() - 24 * 60 * 60 * 1000);
  const yesterdayStr = yesterdayUtc.toISOString().split("T")[0];

  const allSubs = [...(regActivitySubs || []), ...(dailyActivitySubs || [])];

  const uniqueDatesWithStatus = new Map<string, any>();
  const allActiveDates = new Map<string, boolean>();

  for (const sub of allSubs) {
    if (!sub.created_at) continue;
    const dateStr = sub.created_at.split("T")[0];
    const diff = sub.logiclab_problems?.difficulty;
    const isSolved = sub.status === "Accepted";

    allActiveDates.set(dateStr, true);

    if (!uniqueDatesWithStatus.has(dateStr)) {
      uniqueDatesWithStatus.set(dateStr, {
        activity_date: dateStr,
        solved: false,
        submission_count: 0,
        easy_solved: 0,
        medium_solved: 0,
        hard_solved: 0,
        easy_attempted: 0,
        medium_attempted: 0,
        hard_attempted: 0,
      });
    }

    const state = uniqueDatesWithStatus.get(dateStr);
    state.submission_count += 1;
    if (isSolved) state.solved = true;

    if (diff === "Easy") {
      state.easy_attempted += 1;
      if (isSolved) state.easy_solved += 1;
    } else if (diff === "Medium") {
      state.medium_attempted += 1;
      if (isSolved) state.medium_solved += 1;
    } else if (diff === "Hard") {
      state.hard_attempted += 1;
      if (isSolved) state.hard_solved += 1;
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
      const checkDate = allActiveDates.has(todayStr) ? new Date(todayUtc) : new Date(yesterdayUtc);
      let checkStr = checkDate.toISOString().split("T")[0];
      while (allActiveDates.has(checkStr)) {
        currentStreak++;
        checkDate.setUTCDate(checkDate.getUTCDate() - 1);
        checkStr = checkDate.toISOString().split("T")[0];
      }
    }
  }
  if (currentStreak > maxStreak) maxStreak = currentStreak;

  const activityCalendar: any[] = [];
  for (let i = 139; i >= 0; i--) {
    const d = new Date(todayUtc.getTime() - i * 24 * 60 * 60 * 1000);
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

  const totalTopicCounts: Record<string, number> = (cachedGlobalTags && typeof cachedGlobalTags === "object" && !Array.isArray(cachedGlobalTags))
    ? (cachedGlobalTags as Record<string, number>)
    : topicCounts;

  const sortedTopics = Object.entries(totalTopicCounts)
    .map(([name, total]) => ({
      name,
      solvedCount: topicCounts[name] || 0,
      totalCount: total,
      category: categorizeTopic(name)
    }))
    .sort((a, b) => {
      if (b.solvedCount !== a.solvedCount) return b.solvedCount - a.solvedCount;
      if (b.totalCount !== a.totalCount) return b.totalCount - a.totalCount;
      return a.name.localeCompare(b.name);
    });

  const globalStats = statsData || {
    total: 0,
    solved: 0,
    easy: { total: 0, solved: 0 },
    medium: { total: 0, solved: 0 },
    hard: { total: 0, solved: 0 },
  };

  let userRank: number | null = null;
  if (targetProfile.logiclab_points && targetProfile.logiclab_points > 0 && targetProfile.institute_id) {
    userRank = await getCurrentUserRankAction(targetProfile.institute_id, targetProfile.id, targetProfile.logiclab_points);
  }

  const seenProblems = new Set();
  const recentSolved = [];
  const allRecentRaw = [...(recentStandardRaw || []), ...(recentDailyRaw || [])].sort((a, b) =>
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
  for (const sub of allRecentRaw) {
    if (!seenProblems.has(sub.problem_id) && sub.logiclab_problems) {
      seenProblems.add(sub.problem_id);
      recentSolved.push({
        id: sub.logiclab_problems.id || sub.problem_id,
        title: sub.logiclab_problems.title || "Unknown Problem",
        difficulty: sub.logiclab_problems.difficulty || "Medium",
        created_at: sub.created_at
      });
      if (recentSolved.length >= 50) break;
    }
  }

  const logicLabData = {
    streakStats: { currentStreak, maxStreak, totalActiveDays: allActiveDates.size },
    activityCalendar,
    globalStats,
    topics: sortedTopics,
    uniqueSolvedCount: solvedProblemIds.length,
    points: targetProfile.logiclab_points || 0,
    rank: userRank,
    recentSolved,
    badges: userBadges?.map((ub: any) => ({
      ...ub.logiclab_badges,
      earned_at: ub.earned_at
    })) || [],
    allBadges: allBadges || [],
  };

  // 5. Assigned Tests Querying via Cohorts
  const cohortIds = (memberRows ?? []).map((r: any) => r.cohort_id);

  let eligibleTestIds: string[] = [];
  let assignedTestsRaw: any[] = [];

  if (cohortIds.length > 0 && targetProfile.institute_id) {
    const { data: testCohortRows } = await (supabase as any)
      .from("test_cohorts")
      .select("test_id")
      .in("cohort_id", cohortIds);

    eligibleTestIds = Array.from(new Set((testCohortRows ?? []).map((r: any) => String(r.test_id))));

    if (eligibleTestIds.length > 0) {
      const { data: testsData } = await (supabase as any)
        .from("tests")
        .select("id, title, description, pass_percentage, time_limit_seconds, available_from, available_until, marks_available, results_available, status, created_at")
        .in("id", eligibleTestIds)
        .eq("institute_id", targetProfile.institute_id)
        .eq("status", "published")
        .order("created_at", { ascending: false });

      assignedTestsRaw = testsData ?? [];
    }
  }

  const attemptsByTestId = new Map<string, any>();
  (attemptsRaw ?? []).forEach((att: any) => {
    if (!attemptsByTestId.has(att.test_id)) {
      attemptsByTestId.set(att.test_id, att);
    }
  });

  const submittedAttemptIds = (attemptsRaw ?? [])
    .filter((a: any) => a.status === "submitted" || a.status === "auto_submitted")
    .map((a: any) => a.id);

  let questionStats = { totalAnswered: 0, totalCorrect: 0, accuracyPercentage: 0 };
  if (submittedAttemptIds.length > 0) {
    const { data: answers } = await (supabase as any)
      .from("test_attempt_answers")
      .select("is_correct")
      .in("attempt_id", submittedAttemptIds);

    if (answers && answers.length > 0) {
      const totalAnswered = answers.length;
      const totalCorrect = answers.filter((ans: any) => ans.is_correct === true).length;
      const accuracyPercentage = (totalCorrect / totalAnswered) * 100;
      questionStats = { totalAnswered, totalCorrect, accuracyPercentage };
    }
  }

  const now = new Date();
  let completedCount = 0;
  let inProgressCount = 0;
  let liveCount = 0;
  let upcomingCount = 0;
  let missedCount = 0;

  let totalPercentageSum = 0;
  let validScoreCount = 0;
  let highestPercentage = 0;
  let lowestPercentage = 100;
  let passCount = 0;
  let failCount = 0;
  let totalTimeSpentSeconds = 0;
  let totalTabSwitches = 0;

  const testsList = assignedTestsRaw.map((test: any) => {
    const attempt = attemptsByTestId.get(test.id);
    const isSubmitted = attempt?.status === "submitted" || attempt?.status === "auto_submitted";
    const isInProgress = attempt?.status === "in_progress";

    const from = test.available_from ? new Date(test.available_from) : null;
    const until = test.available_until ? new Date(test.available_until) : null;

    let derivedStatus: "completed" | "in_progress" | "live" | "upcoming" | "missed" = "live";

    if (isSubmitted) {
      derivedStatus = "completed";
      completedCount++;
    } else if (isInProgress) {
      derivedStatus = "in_progress";
      inProgressCount++;
    } else if (from && from > now) {
      derivedStatus = "upcoming";
      upcomingCount++;
    } else if (until && until < now) {
      derivedStatus = "missed";
      missedCount++;
    } else {
      derivedStatus = "live";
      liveCount++;
    }

    if (attempt) {
      if (attempt.time_spent_seconds) {
        totalTimeSpentSeconds += Number(attempt.time_spent_seconds);
      }
      if (attempt.tab_switch_count) {
        totalTabSwitches += Number(attempt.tab_switch_count);
      }

      if (isSubmitted) {
        let pct: number | null = null;
        if (attempt.percentage !== null && attempt.percentage !== undefined) {
          pct = Number(attempt.percentage);
        } else if (attempt.score !== null && attempt.total_marks) {
          pct = (Number(attempt.score) / Number(attempt.total_marks)) * 100;
        }

        if (pct !== null) {
          totalPercentageSum += pct;
          validScoreCount++;
          if (pct > highestPercentage) highestPercentage = pct;
          if (pct < lowestPercentage) lowestPercentage = pct;

          const passThreshold = test.pass_percentage ?? 50;
          const isPassed = pct >= passThreshold;
          if (isPassed) {
            passCount++;
          } else {
            failCount++;
          }
        }
      }
    }

    return {
      id: test.id,
      title: test.title,
      description: test.description,
      passPercentage: test.pass_percentage,
      timeLimitSeconds: test.time_limit_seconds,
      availableFrom: test.available_from,
      availableUntil: test.available_until,
      marksAvailable: test.marks_available,
      resultsAvailable: test.results_available,
      status: test.status,
      derivedStatus,
      attempt: attempt ? {
        id: attempt.id,
        attemptNumber: attempt.attempt_number,
        status: attempt.status,
        score: attempt.score,
        totalMarks: attempt.total_marks,
        percentage: attempt.percentage,
        passed: attempt.passed,
        startedAt: attempt.started_at,
        submittedAt: attempt.submitted_at,
        timeSpentSeconds: attempt.time_spent_seconds,
        tabSwitchCount: attempt.tab_switch_count || 0,
      } : undefined,
    };
  });

  const averagePercentage = validScoreCount > 0 ? totalPercentageSum / validScoreCount : 0;
  if (validScoreCount === 0) lowestPercentage = 0;
  const totalGradedOrFailed = passCount + failCount;
  const passRate = totalGradedOrFailed > 0 ? (passCount / totalGradedOrFailed) * 100 : 0;
  const avgTimeSpentSeconds = completedCount > 0 ? Math.round(totalTimeSpentSeconds / completedCount) : 0;

  const assignedTestsData = {
    totalAssigned: assignedTestsRaw.length,
    completedCount,
    inProgressCount,
    liveCount,
    upcomingCount,
    missedCount,
    averagePercentage,
    highestPercentage,
    lowestPercentage,
    passCount,
    failCount,
    passRate,
    totalTimeSpentSeconds,
    avgTimeSpentSeconds,
    totalTabSwitches,
    questionStats,
    testsList,
  };

  // Enforce granular privacy settings for external viewers
  const hideFromViewer = !isOwner && !isAdmin && !isStaff;
  const hideEdu = hideFromViewer && privacySettings.hide_education;

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
    course_name: hideEdu ? null : courseName,
    passout_year: hideEdu ? null : (academicDetails?.passout_year ?? null),
    university_prn: hideEdu ? null : (academicDetails?.university_prn ?? null),
    institute_name: hideEdu ? null : instituteName,
    sgpa_semesters: hideEdu ? [] : sgpaArray,
  };
  
  return (
    <CandidateProfileReportView
      publicData={publicData}
      educationData={hideFromViewer && privacySettings.hide_education ? [] : (candidateEducation ?? [])}
      experienceData={hideFromViewer && privacySettings.hide_experience ? [] : (candidateExperiences ?? [])}
      projectsData={candidateProjects ?? []}
      certificationsData={candidateCertifications ?? []}
      eventCertificates={eventCertificates}
      allSkills={allSkills ?? []}
      selectedSkillIds={selectedSkillIds}
      semestersCount={semestersCount}
      logicLabData={hideFromViewer && privacySettings.hide_logiclab ? null : logicLabData}
      assignedTestsData={assignedTestsData}
    />
  );
}
