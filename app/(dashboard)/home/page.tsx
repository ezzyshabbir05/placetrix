import { createClient } from "@/lib/supabase/server";
import { getUserProfile } from "@/lib/supabase/profile";
import { CandidateDashboardClient } from "./_components/CandidateDashboardClient";
import { TeacherDashboardClient } from "./_components/TeacherDashboardClient";
import { getCachedFullPotd } from "@/lib/supabase/cached-queries";

// ─── Types ───────────────────────────────────────────────────────────────────

interface CandidateStatsResponse {
  profile: any;
  stats: {
    total_tests: number;
    live_tests: number;
    upcoming_tests: number;
    completed_tests: number;
  };
}

interface InstituteStatsResponse {
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

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function HomePage() {
  const profile = await getUserProfile();
  if (!profile) return null;

  const supabase = await createClient();

  // ── Candidate ──────────────────────────────────────────────────────────────
  if (profile.account_type === "institute_candidate") {
    const today = new Date();
    const todayStr = today.toISOString().split("T")[0];

    const yesterdayDate = new Date(today.getTime() - (24 * 60 * 60 * 1000));
    const yesterdayStr = yesterdayDate.toISOString().split("T")[0];

    const cutOffDate20Weeks = new Date(today.getTime() - (140 * 24 * 60 * 60 * 1000));
    const cutOffStr20Weeks = cutOffDate20Weeks.toISOString().split("T")[0];

    // ── Phase 1: Fire all independent queries concurrently in ONE round-trip ──
    const [
      homeStatsRes,
      testAttemptsRes,
      statsRes,
      allActivityRes,
      cohortMembersRes,
      eventsRes,
      cachedPotd,
      userStatsRes,
    ] = await Promise.all([
      (supabase as any).rpc("get_candidate_home_stats" as any, {
        p_profile_id: profile.id,
      }),
      (supabase as any)
        .from("test_attempts")
        .select("percentage, score, total_marks, status, test_id, tests(marks_available, results_available)")
        .eq("candidate_id", profile.id)
        .eq("status", "submitted"),
      (supabase as any).rpc('get_user_global_stats', { p_user_id: profile.id }),
      (supabase as any)
        .from("logiclab_daily_challenge_user_activity")
        .select("activity_date, submission_count, solved, easy_solved, medium_solved, hard_solved, easy_attempted, medium_attempted, hard_attempted")
        .eq("user_id", profile.id)
        .gte("activity_date", cutOffStr20Weeks)
        .order("activity_date", { ascending: true }),
      (supabase as any)
        .from("cohort_students")
        .select("cohort_id")
        .eq("student_id", profile.id),
      profile.institute_id
        ? (supabase as any)
            .from("events")
            .select(`
              id, title, description, date, venue, capacity, status, duration_minutes, speaker_name,
              event_cohorts(cohort_id)
            `)
            .eq("status", "Published")
            .eq("institute_id", profile.institute_id)
            .order("date", { ascending: true })
        : Promise.resolve({ data: [] }),
      getCachedFullPotd(todayStr),
      (supabase as any)
        .from("logiclab_user_stats")
        .select("current_streak, longest_streak, last_solve_date")
        .eq("user_id", profile.id)
        .maybeSingle(),
    ]);

    const candidateData = homeStatsRes.data as unknown as CandidateStatsResponse;
    const cp = candidateData?.profile || {};
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
      total: 0, solved: 0,
      easy: { total: 0, solved: 0 },
      medium: { total: 0, solved: 0 },
      hard: { total: 0, solved: 0 }
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

    // 4. 20-week (140-day) Activity Calendar
    const activityRows = (allActivityRows ?? []).filter(
      (r: any) => r.activity_date && r.activity_date >= cutOffStr20Weeks
    );

    const uniqueDatesWithStatus = new Map<string, {
      solved: boolean
      attempted: boolean
      count: number
      easy_solved: number
      medium_solved: number
      hard_solved: number
      easy_attempted: number
      medium_attempted: number
      hard_attempted: number
    }>();

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

    const activityCalendar: any[] = [];
    const daysToGenerate = 140; // 20 weeks * 7 days
    for (let i = daysToGenerate - 1; i >= 0; i--) {
      const d = new Date(today.getTime() - (i * 24 * 60 * 60 * 1000));
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

    // 6. Process candidate events in memory (fetched concurrently in Phase 1)
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

    const nowIso = new Date().toISOString();
    const nowMs = Date.now();

    // ── Phase 2: Parallel cohort-dependent queries & user POTD status in ONE round-trip ──
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
      cachedPotd?.problem_id
        ? (supabase as any)
            .from("logiclab_daily_challenge_submissions")
            .select("status")
            .eq("user_id", profile.id)
            .eq("problem_id", cachedPotd.problem_id)
            .eq("status", "Accepted")
            .limit(1)
            .maybeSingle()
        : Promise.resolve({ data: null }),
    ]);

    // 7. Process Live & Upcoming Tests in memory
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

      // Live tests: available_from <= now && (available_until > now || available_until is null)
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

      // Upcoming tests: available_from > now
      upcomingTests = allEligibleTests
        .filter((t) => {
          if (!t.available_from) return false;
          return new Date(t.available_from).getTime() > nowMs;
        })
        .sort((a, b) => new Date(a.available_from).getTime() - new Date(b.available_from).getTime())
        .slice(0, 2);
    }

    // 8. Process Opportunities in memory
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

    // 9. Process POTD with cached metadata and user solve status
    const initialPotd = cachedPotd?.initialPotd ?? null;
    const fullPotdProblem = cachedPotd?.fullPotdProblem
      ? {
          ...cachedPotd.fullPotdProblem,
          solved_status: potdSubRes?.data?.status === "Accepted" ? "Accepted" : null,
        }
      : null;

    const candidateProfile = {
      id: profile.id,
      username: profile.username || null,
      full_name: profile.full_name || null,
      first_name: profile.first_name || null,
      last_name: profile.last_name || null,
      profile_updated: profile.profile_updated || false,
      institute_id: profile.institute_id || null,
    };

    return (
      <CandidateDashboardClient
        profile={candidateProfile}
        stats={testStats}
        globalStats={globalStats}
        streakStats={streakStats}
        activityCalendar={activityCalendar}
        liveTests={liveTests}
        upcomingTests={upcomingTests}
        opportunities={opportunities}
        candidateEvent={candidateEvent}
        todayStr={todayStr}
        initialPotd={initialPotd}
        fullPotdProblem={fullPotdProblem}
      />
    );
  }

  // ── Institute / Staff / TPO ────────────────────────────────────────────────
  if (
    profile.account_type === "institute_primary" ||
    profile.account_type === "institute_staff" ||
    profile.account_type === "institute_placement_officer"
  ) {
    const instituteId = profile.institute_id;

    let primaryProfileId = profile.id;
    if (profile.account_type !== "institute_primary" && instituteId) {
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
    const cutOffDate20Weeks = new Date(today.getTime() - (140 * 24 * 60 * 60 * 1000));
    const cutOffStr20Weeks = cutOffDate20Weeks.toISOString().split("T")[0];

    const targetInstituteIds = Array.from(
      new Set([instituteId, profile.id, primaryProfileId].filter((x): x is string => Boolean(x)))
    );
    const nowIso = new Date().toISOString();
    const twoHoursAgoIso = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();

    // Parallel data fetching for institute dashboard: stats, featured items, and calendar
    const [
      recentTestsRes,
      recentOppsRes,
      recentEventsRes,
      homeStatsRes,
      candidatesCountRes,
      cohortsCountRes,
      instituteProfileRes,
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
      (supabase as any).rpc("get_institute_home_stats" as any, {
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
            .from("institutes")
            .select("institute_name")
            .eq("id", instituteId)
            .maybeSingle()
        : Promise.resolve({ data: null }),
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

    // 1. Process Featured Test in memory
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

    // 2. Process Featured Opportunity in memory
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

    // 3. Process Featured Event in memory
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

    // Calculate 20-week candidate activity calendar for institute
    const dateCounts = new Map<string, number>();
    (activityAttemptsRes.data ?? []).forEach((row: any) => {
      if (row.submitted_at) {
        const dStr = String(row.submitted_at).split("T")[0];
        dateCounts.set(dStr, (dateCounts.get(dStr) || 0) + 1);
      }
    });

    const activityCalendar: any[] = [];
    const daysToGenerate = 140; // 20 weeks * 7 days
    for (let i = daysToGenerate - 1; i >= 0; i--) {
      const d = new Date(today.getTime() - (i * 24 * 60 * 60 * 1000));
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

    const teacherProfile = {
      id: profile.id,
      username: profile.username || null,
      full_name: profile.full_name || null,
      account_type: profile.account_type,
      profile_updated: profile.profile_updated === true,
      institute_id: profile.institute_id || null,
      institute_name: instituteProfileRes.data?.institute_name || null,
    };

    const teacherStats = {
      ...stats,
      total_students: candidatesCountRes.count ?? 0,
      total_cohorts: cohortsCountRes.count ?? 0,
    };

    return (
      <TeacherDashboardClient
        profile={teacherProfile}
        stats={teacherStats}
        activityCalendar={activityCalendar}
        streakStats={streakStats}
        featuredTest={featuredTest}
        featuredOpportunity={featuredOpportunity}
        featuredEvent={featuredEvent}
      />
    );
  }

  // ── Admin ──────────────────────────────────────────────────────────────────
  if (profile.account_type === "admin") {
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

    const adminProfile = {
      id: profile.id,
      username: profile.username || null,
      full_name: profile.full_name || null,
      account_type: profile.account_type,
      profile_updated: profile.profile_updated || true,
      institute_id: null,
      institute_name: "PlaceTrix Admin Platform",
    };

    return (
      <TeacherDashboardClient
        profile={adminProfile}
        stats={teacherStats}
        featuredTest={adminFeaturedTest}
        featuredOpportunity={adminFeaturedOpp}
        featuredEvent={adminFeaturedEvent}
        adminStats={adminStats}
        recentSupportTickets={recentTicketsRes.data || []}
      />
    );
  }

  return (
    <div className="p-8 text-center text-muted-foreground">
      <p>Invalid or missing account type.</p>
    </div>
  );
}