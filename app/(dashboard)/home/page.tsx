import { createClient } from "@/lib/supabase/server";
import { getUserProfile } from "@/lib/supabase/profile";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Suspense } from "react";
import { RecentSupportTickets } from "./RecentSupportTickets";
import { CandidateDashboardClient } from "./_components/CandidateDashboardClient";
import { TeacherDashboardClient } from "./_components/TeacherDashboardClient";
import { LicenseBanner } from "@/components/license/LicenseBanner";
import { getCachedPotd } from "../(licensed)/logiclab/actions";
import {
  ArrowRight,
  BookOpen,
  PlayCircle,
  CalendarClock,
  CheckCircle2,
  Users,
  ListCheck,
  PenLine,
} from "lucide-react";


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


// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({
  icon,
  label,
  value,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  accent?: "green" | "amber" | "blue" | "muted";
}) {
  const accentClass =
    accent === "green"
      ? "text-emerald-600 dark:text-emerald-400"
      : accent === "amber"
        ? "text-amber-600 dark:text-amber-400"
        : accent === "blue"
          ? "text-blue-600 dark:text-blue-400"
          : "text-foreground";

  const accentBg =
    accent === "green"
      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
      : accent === "amber"
        ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
        : accent === "blue"
          ? "bg-blue-500/10 text-blue-600 dark:text-blue-400"
          : "bg-muted/40 text-muted-foreground";

  return (
    <div className="rounded-2xl border border-border/40 bg-card p-5 flex flex-col gap-4 shadow-md">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{label}</span>
        <span className={`p-2 rounded-xl ${accentBg}`}>
          {icon}
        </span>
      </div>
      <p className={`text-3xl font-extrabold tabular-nums tracking-tight leading-none mt-1 ${accentClass}`}>
        {value}
      </p>
    </div>
  );
}


// ─── Section Header ───────────────────────────────────────────────────────────

function SectionHeader({ title, href }: { title: string; href: string }) {
  return (
    <div className="flex items-center justify-between">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </p>
      <Link
        href={href}
        className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
      >
        View all
        <ArrowRight className="h-3 w-3" />
      </Link>
    </div>
  );
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

    // Fetch stats, attempts, global stats, and daily challenge activity in parallel
    const [homeStatsRes, testAttemptsRes, statsRes, allActivityRes] = await Promise.all([
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
        .order("activity_date", { ascending: true })
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

    // 6. Fetch live/upcoming tests for candidate
    const submittedTestIds = (testAttempts ?? [])
      .map((a: any) => a.test_id);

    const nowIso = new Date().toISOString();

    let liveTests: any[] = [];
    let upcomingTests: any[] = [];

    // Find candidate's cohorts and eligible test IDs
    const { data: memberRows } = await (supabase as any)
      .from("cohort_students")
      .select("cohort_id")
      .eq("student_id", profile.id);

    const cohortIds = (memberRows ?? []).map((r: any) => r.cohort_id);

    let eligibleTestIds: string[] = [];
    if (cohortIds.length > 0) {
      const { data: testCohortRows } = await (supabase as any)
        .from("test_cohorts")
        .select("test_id")
        .in("cohort_id", cohortIds);

      eligibleTestIds = Array.from(new Set((testCohortRows ?? []).map((r: any) => String(r.test_id)))) as string[];
    }

    if (eligibleTestIds.length > 0) {
      let liveQuery = (supabase as any)
        .from("tests")
        .select("id, title, description, time_limit_seconds, available_from, available_until")
        .eq("status", "published")
        .in("id", eligibleTestIds)
        .lte("available_from", nowIso)
        .or(`available_until.gt.${nowIso},available_until.is.null`);

      if (submittedTestIds.length > 0) {
        liveQuery = liveQuery.not("id", "in", `(${submittedTestIds.join(",")})`);
      }

      const { data: liveData } = await liveQuery
        .order("available_until", { ascending: true, nullsFirst: false })
        .limit(2);

      if (liveData) liveTests = liveData;

      let upcomingQuery = (supabase as any)
        .from("tests")
        .select("id, title, description, time_limit_seconds, available_from, available_until")
        .eq("status", "published")
        .in("id", eligibleTestIds)
        .gt("available_from", nowIso);

      if (submittedTestIds.length > 0) {
        upcomingQuery = upcomingQuery.not("id", "in", `(${submittedTestIds.join(",")})`);
      }

      const { data: upcomingData } = await upcomingQuery
        .order("available_from", { ascending: true })
        .limit(2);

      if (upcomingData) upcomingTests = upcomingData;
    }

    // 7. Fetch Problem of the Day
    let initialPotd = await getCachedPotd(todayStr);
    let fullPotdProblem = null;

    if (initialPotd) {
      const { data: dbProblem } = await (supabase as any)
        .from("logiclab_problems")
        .select("id, number, title, difficulty, tags")
        .eq("id", initialPotd.problem_id)
        .maybeSingle();

      if (dbProblem) {
        const { data: statsRow } = await (supabase as any)
          .from("logiclab_problem_stats")
          .select("accepted_submissions, total_submissions")
          .eq("problem_id", initialPotd.problem_id)
          .maybeSingle();

        const totalSubmissions = statsRow?.total_submissions || 0;
        const acceptedSubmissions = statsRow?.accepted_submissions || 0;
        const acceptanceRate = totalSubmissions > 0 ? Math.round((acceptedSubmissions / totalSubmissions) * 100) : null;

        fullPotdProblem = {
          ...dbProblem,
          acceptance_rate: acceptanceRate,
          total_submissions: totalSubmissions,
        };

        const { data: potdSub } = await (supabase as any)
          .from("logiclab_daily_challenge_submissions")
          .select("status")
          .eq("user_id", profile.id)
          .eq("problem_id", initialPotd.problem_id)
          .eq("status", "Accepted")
          .limit(1);

        fullPotdProblem.solved_status = (potdSub && potdSub.length > 0) ? "Accepted" : null;
      }
    }

    // 8. Fetch active & upcoming opportunities for candidate
    let opportunities: any[] = [];
    if (cohortIds.length > 0) {
      const { data: oppCohortRows } = await (supabase as any)
        .from("opportunity_cohorts")
        .select("opportunity_id")
        .in("cohort_id", cohortIds);

      const eligibleOppIds = Array.from(new Set((oppCohortRows ?? []).map((r: any) => String(r.opportunity_id)))) as string[];

      if (eligibleOppIds.length > 0) {
        const { data: oppsData } = await (supabase as any)
          .from("opportunities")
          .select("id, title, job_role, location, ctc_lpa, stipend_monthly, deadline, company:companies(name, logo_url)")
          .eq("status", "Published")
          .in("id", eligibleOppIds)
          .gte("deadline", nowIso)
          .order("deadline", { ascending: true })
          .limit(3);

        if (oppsData) opportunities = oppsData;
      }
    }

    // 9. Fetch active & upcoming events for candidate
    let candidateEvent: any = null;
    if (profile.institute_id) {
      const { data: rawEvents } = await (supabase as any)
        .from("events")
        .select(`
          id, title, description, date, venue, capacity, status, duration_minutes, speaker_name,
          event_cohorts(cohort_id)
        `)
        .eq("status", "Published")
        .eq("institute_id", profile.institute_id)
        .order("date", { ascending: true });

      if (rawEvents && rawEvents.length > 0) {
        const eligibleEvents = rawEvents.filter((event: any) => {
          const targetedCohorts = (event.event_cohorts ?? []).map((ec: any) => ec.cohort_id);
          if (targetedCohorts.length === 0) return true;
          return targetedCohorts.some((cId: string) => cohortIds.includes(cId));
        });

        const activeEvents = eligibleEvents.filter((e: any) => {
          const startTime = new Date(e.date).getTime();
          const endTime = startTime + (e.duration_minutes || 120) * 60 * 1000;
          const nowTime = Date.now();
          return nowTime >= startTime && nowTime <= endTime;
        });

        if (activeEvents.length > 0) {
          candidateEvent = { ...activeEvents[0], derived_status: "live" };
        } else {
          const upcomingEvents = eligibleEvents.filter((e: any) => new Date(e.date).getTime() > Date.now());
          if (upcomingEvents.length > 0) {
            candidateEvent = { ...upcomingEvents[0], derived_status: "upcoming" };
          }
        }
      }
    }

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

    // 1. Featured Test Query (Live -> Upcoming -> Latest fallback)
    let featuredTest: any = null;
    if (instituteId) {
      // 1a. Live test query
      const { data: liveTestData } = await (supabase as any)
        .from("tests")
        .select("id, title, description, time_limit_seconds, available_from, available_until, status")
        .eq("institute_id", instituteId)
        .eq("status", "published")
        .lte("available_from", nowIso)
        .or(`available_until.gt.${nowIso},available_until.is.null`)
        .order("available_until", { ascending: true, nullsFirst: false })
        .limit(1)
        .maybeSingle();

      if (liveTestData) {
        featuredTest = { ...liveTestData, derived_status: "live", isLive: true };
      } else {
        // 1b. Upcoming test query
        const { data: upcomingTestData } = await (supabase as any)
          .from("tests")
          .select("id, title, description, time_limit_seconds, available_from, available_until, status")
          .eq("institute_id", instituteId)
          .eq("status", "published")
          .gt("available_from", nowIso)
          .order("available_from", { ascending: true })
          .limit(1)
          .maybeSingle();

        if (upcomingTestData) {
          featuredTest = { ...upcomingTestData, derived_status: "upcoming", isLive: false };
        } else {
          // 1c. Latest created test fallback (could be ended or draft)
          const { data: latestTestData } = await (supabase as any)
            .from("tests")
            .select("id, title, description, time_limit_seconds, available_from, available_until, status")
            .eq("institute_id", instituteId)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

          if (latestTestData) {
            let derived_status: "live" | "upcoming" | "past" | "draft" = "draft";
            if (latestTestData.status === "published") {
              const fromTime = latestTestData.available_from ? new Date(latestTestData.available_from).getTime() : null;
              const untilTime = latestTestData.available_until ? new Date(latestTestData.available_until).getTime() : null;
              const nowTime = Date.now();
              if (fromTime && fromTime > nowTime) {
                derived_status = "upcoming";
              } else if (untilTime && untilTime < nowTime) {
                derived_status = "past";
              } else {
                derived_status = "live";
              }
            }
            featuredTest = { ...latestTestData, derived_status, isLive: derived_status === "live" };
          }
        }
      }
    }

    // 2. Featured Opportunity Query (Active deadline -> Latest fallback)
    let featuredOpportunity: any = null;
    if (instituteId) {
      const { data: activeOppData } = await (supabase as any)
        .from("opportunities")
        .select("id, title, job_role, location, ctc_lpa, stipend_monthly, deadline, company:companies(name, logo_url)")
        .eq("institute_id", instituteId)
        .gte("deadline", nowIso)
        .order("deadline", { ascending: true })
        .limit(1)
        .maybeSingle();

      if (activeOppData) {
        featuredOpportunity = { ...activeOppData, derived_status: "active" };
      } else {
        const { data: latestOppData } = await (supabase as any)
          .from("opportunities")
          .select("id, title, job_role, location, ctc_lpa, stipend_monthly, deadline, company:companies(name, logo_url)")
          .eq("institute_id", instituteId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (latestOppData) {
          const isPast = latestOppData.deadline && new Date(latestOppData.deadline).getTime() < Date.now();
          featuredOpportunity = { ...latestOppData, derived_status: isPast ? "past" : "active" };
        }
      }
    }

    // 3. Featured Event Query (Live/Upcoming date -> Latest fallback)
    let featuredEvent: any = null;
    if (instituteId) {
      const { data: upcomingEventData } = await (supabase as any)
        .from("events")
        .select("id, title, description, date, venue, speaker_name, duration_minutes, status")
        .eq("institute_id", instituteId)
        .gte("date", twoHoursAgoIso)
        .order("date", { ascending: true })
        .limit(1)
        .maybeSingle();

      if (upcomingEventData) {
        featuredEvent = upcomingEventData;
      } else {
        const { data: latestEventData } = await (supabase as any)
          .from("events")
          .select("id, title, description, date, venue, speaker_name, duration_minutes, status")
          .eq("institute_id", instituteId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (latestEventData) {
          featuredEvent = latestEventData;
        }
      }

      if (featuredEvent && featuredEvent.date) {
        const startTime = new Date(featuredEvent.date).getTime();
        const endTime = startTime + (featuredEvent.duration_minutes || 120) * 60 * 1000;
        const nowTime = Date.now();
        const derived_status =
          nowTime >= startTime && nowTime <= endTime
            ? "live"
            : nowTime < startTime
              ? "upcoming"
              : "past";
        featuredEvent = { ...featuredEvent, derived_status };
      }
    }

    // Parallel data fetching for institute dashboard stats & metadata
    const [
      homeStatsRes,
      candidatesCountRes,
      cohortsCountRes,
      instituteProfileRes,
      activityAttemptsRes,
    ] = await Promise.all([
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
      (supabase as any)
        .from("test_attempts")
        .select("submitted_at")
        .eq("status", "submitted")
        .gte("submitted_at", cutOffStr20Weeks),
    ]);

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