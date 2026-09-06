import { createClient } from "@/lib/supabase/client";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface CandidateStatsResponse {
  profile: any;
  stats: {
    total_tests: number;
    live_tests: number;
    upcoming_tests: number;
    completed_tests: number;
  };
}

export interface InstituteStatsResponse {
  profile: any;
  stats: {
    total_tests: number;
    live_tests: number;
    upcoming_tests: number;
    past_tests: number;
    draft_tests: number;
    total_attempts: number;
  };
}

export interface CalendarCell {
  date: string;
  count: number;
  status: "none" | "attempted" | "solved";
  dayOfWeek: number;
  easySolved?: number;
  mediumSolved?: number;
  hardSolved?: number;
  easyAttempted?: number;
  mediumAttempted?: number;
  hardAttempted?: number;
}

export interface CandidateHomeData {
  stats: {
    total_tests: number;
    live_tests: number;
    upcoming_tests: number;
    completed_tests: number;
    average_score: number;
  };
  globalStats: {
    total: number;
    solved: number;
    easy: { total: number; solved: number };
    medium: { total: number; solved: number };
    hard: { total: number; solved: number };
  };
  streakStats: {
    currentStreak: number;
    maxStreak: number;
  };
  activityCalendar: CalendarCell[];
  liveTests: any[];
  upcomingTests: any[];
  opportunities: any[];
  candidateEvent: any | null;
  todayStr: string;
  initialPotd: any | null;
  fullPotdProblem: any | null;
}

export interface TeacherHomeData {
  stats: {
    total_tests: number;
    live_tests: number;
    upcoming_tests: number;
    past_tests: number;
    draft_tests: number;
    total_attempts: number;
    total_students?: number;
    total_cohorts?: number;
  };
  featuredTest: any | null;
  featuredOpportunity: any | null;
  featuredEvent: any | null;
  activityCalendar?: CalendarCell[];
  streakStats?: { currentStreak: number; maxStreak: number };
  adminStats?: {
    candidates: number;
    institutes: number;
    pendingTickets: number;
  };
  recentSupportTickets?: any[];
}

// ─── Fast In-Memory Cache with 60s TTL ────────────────────────────────────────
const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL_MS = 60_000; // 60 seconds

export function clearHomeCache(key?: string) {
  if (key) {
    cache.delete(key);
  } else {
    cache.clear();
  }
}

// ─── Candidate Fetcher ───────────────────────────────────────────────────────
export async function fetchCandidateDashboardData(
  userId: string,
  instituteId: string | null
): Promise<CandidateHomeData> {
  const cacheKey = `candidate_${userId}`;
  const now = Date.now();
  const cached = cache.get(cacheKey);

  if (cached && now - cached.timestamp < CACHE_TTL_MS) {
    return cached.data as CandidateHomeData;
  }

  const supabase = createClient();

  // ── Primary Path: Single-Round-Trip Composite RPC (~16ms) ──
  try {
    const { data: rpcData, error: rpcError } = await (supabase as any).rpc(
      "get_candidate_home_dashboard"
    );

    if (!rpcError && rpcData && rpcData.stats) {
      cache.set(cacheKey, { data: rpcData as CandidateHomeData, timestamp: now });
      return rpcData as CandidateHomeData;
    }
    if (rpcError) {
      console.warn("[home-data] Candidate composite RPC returned error, using fallback queries:", rpcError);
    }
  } catch (err) {
    console.warn("[home-data] Candidate composite RPC exception, using fallback queries:", err);
  }

  // ── Fallback Path: Client-Side Multi-Query Waterfall ──
  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];

  const yesterdayDate = new Date(today.getTime() - 24 * 60 * 60 * 1000);
  const yesterdayStr = yesterdayDate.toISOString().split("T")[0];

  const cutOffDate20Weeks = new Date(today.getTime() - 140 * 24 * 60 * 60 * 1000);
  const cutOffStr20Weeks = cutOffDate20Weeks.toISOString().split("T")[0];

  // ── Phase 1: Fire all independent queries concurrently in parallel ──
  const [
    homeStatsRes,
    testAttemptsRes,
    statsRes,
    allActivityRes,
    cohortMembersRes,
    eventsRes,
    potdRes,
    userStatsRes,
  ] = await Promise.all([
    (supabase as any).rpc("get_candidate_home_stats", {
      p_profile_id: userId,
    }),
    (supabase as any)
      .from("test_attempts")
      .select("percentage, score, total_marks, status, test_id, tests(marks_available, results_available)")
      .eq("candidate_id", userId)
      .eq("status", "submitted"),
    (supabase as any).rpc("get_user_global_stats", { p_user_id: userId }),
    (supabase as any)
      .from("logiclab_daily_challenge_user_activity")
      .select("activity_date, submission_count, solved, easy_solved, medium_solved, hard_solved, easy_attempted, medium_attempted, hard_attempted")
      .eq("user_id", userId)
      .gte("activity_date", cutOffStr20Weeks)
      .order("activity_date", { ascending: true }),
    (supabase as any)
      .from("cohort_students")
      .select("cohort_id")
      .eq("student_id", userId),
    instituteId
      ? (supabase as any)
          .from("events")
          .select(`
            id, title, description, date, venue, capacity, status, duration_minutes, speaker_name,
            event_cohorts(cohort_id)
          `)
          .eq("status", "Published")
          .eq("institute_id", instituteId)
          .order("date", { ascending: true })
      : Promise.resolve({ data: [] }),
    (supabase as any)
      .from("logiclab_daily_challenges")
      .select("id, problem_id, logiclab_problems(id, number, title, difficulty, tags)")
      .eq("date", todayStr)
      .maybeSingle(),
    (supabase as any)
      .from("logiclab_user_stats")
      .select("current_streak, longest_streak, last_solve_date")
      .eq("user_id", userId)
      .maybeSingle(),
  ]);

  const candidateData = homeStatsRes.data as unknown as CandidateStatsResponse;
  const stats = candidateData?.stats || {
    total_tests: 0,
    live_tests: 0,
    upcoming_tests: 0,
    completed_tests: 0,
  };

  const testAttempts = testAttemptsRes.data;

  let totalPercentage = 0;
  let validScoresCount = 0;
  if (testAttempts && testAttempts.length > 0) {
    testAttempts.forEach((attempt: any) => {
      const isPublished = attempt.tests?.marks_available || attempt.tests?.results_available;
      if (isPublished) {
        if (attempt.percentage !== null && attempt.percentage !== undefined) {
          totalPercentage += Number(attempt.percentage);
          validScoresCount++;
        } else if (attempt.score !== null && attempt.total_marks) {
          totalPercentage += (Number(attempt.score) / Number(attempt.total_marks)) * 100;
          validScoresCount++;
        }
      }
    });
  }
  const averageScore = validScoresCount > 0 ? totalPercentage / validScoresCount : 0;

  const testStats = {
    total_tests: stats.total_tests,
    live_tests: stats.live_tests,
    upcoming_tests: stats.upcoming_tests,
    completed_tests: testAttempts?.length || 0,
    average_score: averageScore,
  };

  const globalStats = (statsRes.data as any) || {
    total: 0,
    solved: 0,
    easy: { total: 0, solved: 0 },
    medium: { total: 0, solved: 0 },
    hard: { total: 0, solved: 0 },
  };

  const allActivityRows = allActivityRes.data;

  const allActiveDates = new Map<string, { solved: boolean }>();
  for (const row of allActivityRows ?? []) {
    if (!row.activity_date) continue;
    allActiveDates.set(row.activity_date, { solved: !!row.solved });
  }

  const sortedDates = Array.from(allActiveDates.keys()).sort((a, b) => b.localeCompare(a));

  let currentStreak = 0;
  let maxStreak = 0;

  const hasActiveStreak = allActiveDates.has(todayStr) || allActiveDates.has(yesterdayStr);

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

    if (hasActiveStreak) {
      const checkDate = allActiveDates.has(todayStr) ? new Date(today) : new Date(yesterdayDate);
      let checkStr = checkDate.toISOString().split("T")[0];

      while (allActiveDates.has(checkStr)) {
        currentStreak++;
        checkDate.setUTCDate(checkDate.getUTCDate() - 1);
        checkStr = checkDate.toISOString().split("T")[0];
      }
    }
  }

  if (currentStreak > maxStreak) maxStreak = currentStreak;

  // Harmonize with canonical database streak stats if available
  const dbStats = userStatsRes?.data;
  if (dbStats) {
    if (typeof dbStats.current_streak === "number" && dbStats.current_streak > currentStreak) {
      currentStreak = dbStats.current_streak;
    }
    if (typeof dbStats.longest_streak === "number" && dbStats.longest_streak > maxStreak) {
      maxStreak = dbStats.longest_streak;
    }
  }
  const streakStats = { currentStreak, maxStreak };

  // 20-week (140-day) Activity Calendar
  const activityRows = (allActivityRows ?? []).filter(
    (r: any) => r.activity_date && r.activity_date >= cutOffStr20Weeks
  );

  const uniqueDatesWithStatus = new Map<string, any>();

  for (const row of activityRows) {
    const dateStr = row.activity_date;
    uniqueDatesWithStatus.set(dateStr, {
      solved: !!row.solved,
      attempted: !row.solved && Number(row.submission_count) > 0,
      count: Number(row.submission_count),
      easy_solved: Number(row.easy_solved || 0),
      medium_solved: Number(row.medium_solved || 0),
      hard_solved: Number(row.hard_solved || 0),
      easy_attempted: Number(row.easy_attempted || 0),
      medium_attempted: Number(row.medium_attempted || 0),
      hard_attempted: Number(row.hard_attempted || 0),
    });
  }

  const activityCalendar: CalendarCell[] = [];
  const daysToGenerate = 140; // 20 weeks * 7 days
  for (let i = daysToGenerate - 1; i >= 0; i--) {
    const d = new Date(today.getTime() - i * 24 * 60 * 60 * 1000);
    const dateStr = d.toISOString().split("T")[0];
    const activity = uniqueDatesWithStatus.get(dateStr);
    activityCalendar.push({
      date: dateStr,
      count: activity?.count || 0,
      status: activity?.solved ? "solved" : activity?.attempted ? "attempted" : "none",
      dayOfWeek: d.getUTCDay(),
      easySolved: activity?.easy_solved || 0,
      mediumSolved: activity?.medium_solved || 0,
      hardSolved: activity?.hard_solved || 0,
      easyAttempted: activity?.easy_attempted || 0,
      mediumAttempted: activity?.medium_attempted || 0,
      hardAttempted: activity?.hard_attempted || 0,
    });
  }

  const cohortIds: string[] = (cohortMembersRes.data ?? []).map((r: any) => r.cohort_id);
  const submittedTestIds = new Set(
    (testAttempts ?? []).map((a: any) => String(a.test_id))
  );

  // Process candidate events
  let candidateEvent: any = null;
  const rawEvents = eventsRes.data ?? [];
  if (rawEvents.length > 0) {
    const eligibleEvents = rawEvents.filter((event: any) => {
      const targetedCohorts = (event.event_cohorts ?? []).map((ec: any) => ec.cohort_id);
      if (targetedCohorts.length === 0) return true;
      return targetedCohorts.some((cId: string) => cohortIds.includes(cId));
    });

    const nowTime = Date.now();
    const activeEvents = eligibleEvents.filter((e: any) => {
      const startTime = new Date(e.date).getTime();
      const endTime = startTime + (e.duration_minutes || 120) * 60 * 1000;
      return nowTime >= startTime && nowTime <= endTime;
    });

    if (activeEvents.length > 0) {
      candidateEvent = { ...activeEvents[0], derived_status: "live" };
    } else {
      const upcomingEvents = eligibleEvents.filter((e: any) => new Date(e.date).getTime() > nowTime);
      if (upcomingEvents.length > 0) {
        candidateEvent = { ...upcomingEvents[0], derived_status: "upcoming" };
      }
    }
  }

  const nowMs = Date.now();

  // ── Phase 2: Parallel cohort-dependent queries & user POTD status in ONE round-trip ──
  const potdData = potdRes.data;
  const potdProb = potdData?.logiclab_problems as any;

  const [testCohortsRes, oppCohortsRes, potdSubRes] = await Promise.all([
    cohortIds.length > 0
      ? (supabase as any)
          .from("test_cohorts")
          .select("test_id, tests(id, title, description, time_limit_seconds, available_from, available_until, status)")
          .in("cohort_id", cohortIds)
      : Promise.resolve({ data: [] }),
    cohortIds.length > 0
      ? (supabase as any)
          .from("opportunity_cohorts")
          .select("opportunity_id, opportunities(id, title, job_role, location, ctc_lpa, stipend_monthly, deadline, status, company:companies(name, logo_url))")
          .in("cohort_id", cohortIds)
      : Promise.resolve({ data: [] }),
    potdData?.problem_id
      ? (supabase as any)
          .from("logiclab_daily_challenge_submissions")
          .select("status")
          .eq("user_id", userId)
          .eq("problem_id", potdData.problem_id)
          .eq("status", "Accepted")
          .limit(1)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  // Process Live & Upcoming Tests
  let liveTests: any[] = [];
  let upcomingTests: any[] = [];

  if (testCohortsRes.data && testCohortsRes.data.length > 0) {
    const uniqueTestsMap = new Map<string, any>();
    for (const row of testCohortsRes.data) {
      const t = row.tests;
      if (
        t &&
        t.status === "published" &&
        !submittedTestIds.has(String(t.id)) &&
        !uniqueTestsMap.has(String(t.id))
      ) {
        uniqueTestsMap.set(String(t.id), t);
      }
    }

    const allEligibleTests = Array.from(uniqueTestsMap.values());

    liveTests = allEligibleTests
      .filter((t) => {
        if (!t.available_from) return false;
        const fromMs = new Date(t.available_from).getTime();
        const untilMs = t.available_until ? new Date(t.available_until).getTime() : Infinity;
        return nowMs >= fromMs && nowMs <= untilMs;
      })
      .sort((a, b) => {
        const untilA = a.available_until ? new Date(a.available_until).getTime() : Infinity;
        const untilB = b.available_until ? new Date(b.available_until).getTime() : Infinity;
        return untilA - untilB;
      })
      .slice(0, 2);

    upcomingTests = allEligibleTests
      .filter((t) => {
        if (!t.available_from) return false;
        return new Date(t.available_from).getTime() > nowMs;
      })
      .sort((a, b) => new Date(a.available_from).getTime() - new Date(b.available_from).getTime())
      .slice(0, 2);
  }

  // Process Opportunities
  let opportunities: any[] = [];

  if (oppCohortsRes.data && oppCohortsRes.data.length > 0) {
    const uniqueOppsMap = new Map<string, any>();
    for (const row of oppCohortsRes.data) {
      const opp = row.opportunities;
      if (
        opp &&
        opp.status === "Published" &&
        opp.deadline &&
        new Date(opp.deadline).getTime() >= nowMs &&
        !uniqueOppsMap.has(String(opp.id))
      ) {
        uniqueOppsMap.set(String(opp.id), opp);
      }
    }

    opportunities = Array.from(uniqueOppsMap.values())
      .sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime())
      .slice(0, 3);
  }

  // Process POTD
  let initialPotd: any = null;
  let fullPotdProblem: any = null;

  if (potdData && potdData.problem_id && potdProb) {
    initialPotd = {
      id: potdData.id,
      problem_id: potdData.problem_id,
      logiclab_problems: {
        id: potdProb.id || potdData.problem_id,
        title: potdProb.title,
        difficulty: potdProb.difficulty,
      },
    };

    fullPotdProblem = {
      id: potdProb.id || potdData.problem_id,
      number: potdProb.number,
      title: potdProb.title,
      difficulty: potdProb.difficulty,
      tags: potdProb.tags,
      solved_status: potdSubRes?.data?.status === "Accepted" ? "Accepted" : null,
    };
  }

  const result: CandidateHomeData = {
    stats: testStats,
    globalStats,
    streakStats,
    activityCalendar,
    liveTests,
    upcomingTests,
    opportunities,
    candidateEvent,
    todayStr,
    initialPotd,
    fullPotdProblem,
  };

  cache.set(cacheKey, { data: result, timestamp: now });
  return result;
}

// ─── Teacher / Institute / TPO Fetcher ───────────────────────────────────────
export async function fetchTeacherDashboardData(
  userId: string,
  instituteId: string | null,
  accountType: string
): Promise<TeacherHomeData> {
  const cacheKey = `teacher_${userId}`;
  const now = Date.now();
  const cached = cache.get(cacheKey);

  if (cached && now - cached.timestamp < CACHE_TTL_MS) {
    return cached.data as TeacherHomeData;
  }

  const supabase = createClient();

  // ── Primary Path: Single-Round-Trip Composite RPC (~8ms) ──
  try {
    const { data: rpcData, error: rpcError } = await (supabase as any).rpc(
      "get_teacher_home_dashboard"
    );

    if (!rpcError && rpcData && rpcData.stats) {
      cache.set(cacheKey, { data: rpcData as TeacherHomeData, timestamp: now });
      return rpcData as TeacherHomeData;
    }
    if (rpcError) {
      console.warn("[home-data] Teacher composite RPC returned error, using fallback queries:", rpcError);
    }
  } catch (err) {
    console.warn("[home-data] Teacher composite RPC exception, using fallback queries:", err);
  }

  // ── Fallback Path: Client-Side Multi-Query Waterfall ──
  let primaryProfileId = userId;
  if (accountType !== "institute_primary" && instituteId) {
    const { data: primaryLink } = await (supabase as any)
      .from("profiles")
      .select("id")
      .eq("institute_id", instituteId)
      .eq("account_type", "institute_primary")
      .limit(1)
      .maybeSingle();
    if (primaryLink?.id) {
      primaryProfileId = primaryLink.id;
    }
  }

  const today = new Date();
  const cutOffDate20Weeks = new Date(today.getTime() - 140 * 24 * 60 * 60 * 1000);
  const cutOffStr20Weeks = cutOffDate20Weeks.toISOString().split("T")[0];

  const [
    recentTestsRes,
    recentOppsRes,
    recentEventsRes,
    homeStatsRes,
    candidatesCountRes,
    cohortsCountRes,
    activityAttemptsRes,
  ] = await Promise.all([
    instituteId
      ? (supabase as any)
          .from("tests")
          .select("id, title, description, time_limit_seconds, available_from, available_until, status, created_at")
          .eq("institute_id", instituteId)
          .in("status", ["published", "draft"])
          .order("created_at", { ascending: false })
          .limit(20)
      : Promise.resolve({ data: [] }),
    instituteId
      ? (supabase as any)
          .from("opportunities")
          .select("id, title, job_role, location, ctc_lpa, stipend_monthly, deadline, company:companies(name, logo_url), created_at")
          .eq("institute_id", instituteId)
          .order("created_at", { ascending: false })
          .limit(10)
      : Promise.resolve({ data: [] }),
    instituteId
      ? (supabase as any)
          .from("events")
          .select("id, title, description, date, venue, speaker_name, duration_minutes, status, created_at")
          .eq("institute_id", instituteId)
          .order("date", { ascending: false })
          .limit(10)
      : Promise.resolve({ data: [] }),
    (supabase as any).rpc("get_institute_home_stats", {
      p_profile_id: primaryProfileId,
    }),
    instituteId
      ? (supabase as any)
          .from("profiles")
          .select("*", { count: "exact", head: true })
          .eq("institute_id", instituteId)
          .eq("account_type", "institute_candidate")
      : Promise.resolve({ count: 0 }),
    instituteId
      ? (supabase as any)
          .from("cohorts")
          .select("*", { count: "exact", head: true })
          .eq("institute_id", instituteId)
      : Promise.resolve({ count: 0 }),
    instituteId
      ? (supabase as any)
          .from("test_attempts")
          .select("submitted_at, tests!inner(institute_id)")
          .eq("status", "submitted")
          .eq("tests.institute_id", instituteId)
          .gte("submitted_at", cutOffStr20Weeks)
      : Promise.resolve({ data: [] }),
  ]);

  const nowMs = Date.now();

  // Featured Test
  let featuredTest: any = null;
  const testsList = recentTestsRes.data || [];
  const liveTest = testsList.find((t: any) => {
    if (t.status !== "published" || !t.available_from) return false;
    const fromMs = new Date(t.available_from).getTime();
    const untilMs = t.available_until ? new Date(t.available_until).getTime() : Infinity;
    return nowMs >= fromMs && nowMs <= untilMs;
  });

  if (liveTest) {
    featuredTest = { ...liveTest, derived_status: "live", isLive: true };
  } else {
    const upcomingTest = testsList
      .filter((t: any) => t.status === "published" && t.available_from && new Date(t.available_from).getTime() > nowMs)
      .sort((a: any, b: any) => new Date(a.available_from).getTime() - new Date(b.available_from).getTime())[0];

    if (upcomingTest) {
      featuredTest = { ...upcomingTest, derived_status: "upcoming", isLive: false };
    } else if (testsList.length > 0) {
      const latest = testsList[0];
      let derived_status: "live" | "upcoming" | "past" | "draft" = "draft";
      if (latest.status === "published") {
        const fromTime = latest.available_from ? new Date(latest.available_from).getTime() : null;
        const untilTime = latest.available_until ? new Date(latest.available_until).getTime() : null;
        if (fromTime && fromTime > nowMs) {
          derived_status = "upcoming";
        } else if (untilTime && untilTime < nowMs) {
          derived_status = "past";
        } else {
          derived_status = "live";
        }
      }
      featuredTest = { ...latest, derived_status, isLive: derived_status === "live" };
    }
  }

  // Featured Opportunity
  let featuredOpportunity: any = null;
  const oppsList = recentOppsRes.data || [];
  const activeOpp = oppsList
    .filter((o: any) => o.deadline && new Date(o.deadline).getTime() >= nowMs)
    .sort((a: any, b: any) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime())[0];

  if (activeOpp) {
    featuredOpportunity = { ...activeOpp, derived_status: "active" };
  } else if (oppsList.length > 0) {
    const latest = oppsList[0];
    const isPast = latest.deadline && new Date(latest.deadline).getTime() < nowMs;
    featuredOpportunity = { ...latest, derived_status: isPast ? "past" : "active" };
  }

  // Featured Event
  let featuredEvent: any = null;
  const eventsList = recentEventsRes.data || [];
  const liveEvent = eventsList.find((e: any) => {
    if (!e.date) return false;
    const start = new Date(e.date).getTime();
    const end = start + (e.duration_minutes || 120) * 60 * 1000;
    return nowMs >= start && nowMs <= end;
  });

  const upcomingEvent = eventsList
    .filter((e: any) => e.date && new Date(e.date).getTime() > nowMs)
    .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime())[0];

  const selectedEvent = liveEvent || upcomingEvent || eventsList[0] || null;
  if (selectedEvent && selectedEvent.date) {
    const start = new Date(selectedEvent.date).getTime();
    const end = start + (selectedEvent.duration_minutes || 120) * 60 * 1000;
    const derived_status =
      nowMs >= start && nowMs <= end
        ? "live"
        : nowMs < start
          ? "upcoming"
          : "past";
    featuredEvent = { ...selectedEvent, derived_status };
  }

  const instituteData = homeStatsRes.data as unknown as InstituteStatsResponse;
  const stats = instituteData?.stats || {
    total_tests: 0,
    live_tests: 0,
    upcoming_tests: 0,
    past_tests: 0,
    draft_tests: 0,
    total_attempts: 0,
  };

  const dateCounts = new Map<string, number>();
  (activityAttemptsRes.data ?? []).forEach((row: any) => {
    if (row.submitted_at) {
      const dStr = String(row.submitted_at).split("T")[0];
      dateCounts.set(dStr, (dateCounts.get(dStr) || 0) + 1);
    }
  });

  const activityCalendar: CalendarCell[] = [];
  const daysToGenerate = 140;
  for (let i = daysToGenerate - 1; i >= 0; i--) {
    const d = new Date(today.getTime() - i * 24 * 60 * 60 * 1000);
    const dateStr = d.toISOString().split("T")[0];
    const count = dateCounts.get(dateStr) || 0;
    activityCalendar.push({
      date: dateStr,
      count,
      status: count > 0 ? "solved" : "none",
      dayOfWeek: d.getUTCDay(),
    });
  }

  const streakStats = {
    currentStreak: dateCounts.size,
    maxStreak: dateCounts.size,
  };

  const teacherStats = {
    ...stats,
    total_students: candidatesCountRes.count ?? 0,
    total_cohorts: cohortsCountRes.count ?? 0,
  };

  const result: TeacherHomeData = {
    stats: teacherStats,
    featuredTest,
    featuredOpportunity,
    featuredEvent,
    activityCalendar,
    streakStats,
  };

  cache.set(cacheKey, { data: result, timestamp: now });
  return result;
}

// ─── Admin Fetcher ───────────────────────────────────────────────────────────
export async function fetchAdminDashboardData(): Promise<TeacherHomeData> {
  const cacheKey = "admin_home_data";
  const now = Date.now();
  const cached = cache.get(cacheKey);

  if (cached && now - cached.timestamp < CACHE_TTL_MS) {
    return cached.data as TeacherHomeData;
  }

  const supabase = createClient();

  // ── Primary Path: Single-Round-Trip Composite RPC (~8ms) ──
  try {
    const { data: rpcData, error: rpcError } = await (supabase as any).rpc(
      "get_teacher_home_dashboard"
    );

    if (!rpcError && rpcData && rpcData.stats) {
      cache.set(cacheKey, { data: rpcData as TeacherHomeData, timestamp: now });
      return rpcData as TeacherHomeData;
    }
    if (rpcError) {
      console.warn("[home-data] Admin composite RPC returned error, using fallback queries:", rpcError);
    }
  } catch (err) {
    console.warn("[home-data] Admin composite RPC exception, using fallback queries:", err);
  }

  // ── Fallback Path: Client-Side Multi-Query Waterfall ──
  const [
    candidatesCount,
    institutesCount,
    pendingTicketsCount,
    recentTicketsRes,
    allTestsCountRes,
    allAttemptsCountRes,
    cohortsCountRes,
    featuredTestRes,
    featuredOppRes,
    featuredEventRes,
  ] = await Promise.all([
    (supabase as any).from("profiles").select("*", { count: "exact", head: true }).eq("account_type", "institute_candidate"),
    (supabase as any).from("profiles").select("*", { count: "exact", head: true }).eq("account_type", "institute_primary"),
    (supabase as any).from("tickets").select("*", { count: "exact", head: true }).in("status", ["open", "in_progress"]),
    (supabase as any).from("tickets").select("*").order("created_at", { ascending: false }).limit(5),
    (supabase as any).from("tests").select("*", { count: "exact", head: true }),
    (supabase as any).from("test_attempts").select("*", { count: "exact", head: true }),
    (supabase as any).from("cohorts").select("*", { count: "exact", head: true }),
    (supabase as any).from("tests").select("id, title, description, time_limit_seconds, available_from, available_until, status").order("created_at", { ascending: false }).limit(1).maybeSingle(),
    (supabase as any).from("opportunities").select("id, title, job_role, location, ctc_lpa, stipend_monthly, deadline, company:companies(name, logo_url)").order("created_at", { ascending: false }).limit(1).maybeSingle(),
    (supabase as any).from("events").select("id, title, description, date, venue, speaker_name, duration_minutes, status").order("created_at", { ascending: false }).limit(1).maybeSingle(),
  ]);

  const adminStats = {
    candidates: candidatesCount.count ?? 0,
    institutes: institutesCount.count ?? 0,
    pendingTickets: pendingTicketsCount.count ?? 0,
  };

  const teacherStats = {
    total_tests: allTestsCountRes.count ?? 0,
    live_tests: 0,
    upcoming_tests: 0,
    past_tests: 0,
    draft_tests: 0,
    total_attempts: allAttemptsCountRes.count ?? 0,
    total_students: candidatesCount.count ?? 0,
    total_cohorts: cohortsCountRes.count ?? 0,
  };

  const nowTime = Date.now();
  let adminFeaturedTest = featuredTestRes.data;
  if (adminFeaturedTest) {
    let derived_status: "live" | "upcoming" | "past" | "draft" = "draft";
    if (adminFeaturedTest.status === "published") {
      const fromTime = adminFeaturedTest.available_from ? new Date(adminFeaturedTest.available_from).getTime() : null;
      const untilTime = adminFeaturedTest.available_until ? new Date(adminFeaturedTest.available_until).getTime() : null;
      if (fromTime && fromTime > nowTime) {
        derived_status = "upcoming";
      } else if (untilTime && untilTime < nowTime) {
        derived_status = "past";
      } else {
        derived_status = "live";
      }
    }
    adminFeaturedTest = { ...adminFeaturedTest, derived_status, isLive: derived_status === "live" };
  }

  let adminFeaturedOpp = featuredOppRes.data;
  if (adminFeaturedOpp) {
    const isPast = adminFeaturedOpp.deadline && new Date(adminFeaturedOpp.deadline).getTime() < nowTime;
    adminFeaturedOpp = { ...adminFeaturedOpp, derived_status: isPast ? "past" : "active" };
  }

  let adminFeaturedEvent = featuredEventRes.data;
  if (adminFeaturedEvent && adminFeaturedEvent.date) {
    const startTime = new Date(adminFeaturedEvent.date).getTime();
    const endTime = startTime + (adminFeaturedEvent.duration_minutes || 120) * 60 * 1000;
    const derived_status =
      nowTime >= startTime && nowTime <= endTime
        ? "live"
        : nowTime < startTime
          ? "upcoming"
          : "past";
    adminFeaturedEvent = { ...adminFeaturedEvent, derived_status };
  }

  const result: TeacherHomeData = {
    stats: teacherStats,
    featuredTest: adminFeaturedTest,
    featuredOpportunity: adminFeaturedOpp,
    featuredEvent: adminFeaturedEvent,
    adminStats,
    recentSupportTickets: recentTicketsRes.data || [],
  };

  cache.set(cacheKey, { data: result, timestamp: now });
  return result;
}
