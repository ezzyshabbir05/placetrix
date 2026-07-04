import { createClient } from "@/lib/supabase/server";
import { getUserProfile } from "@/lib/supabase/profile";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Suspense } from "react";
import { RecentSupportTickets } from "./RecentSupportTickets";
import { CandidateDashboardClient } from "./_components/CandidateDashboardClient";
import { LicenseBanner } from "@/components/license/LicenseBanner";
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

  return (
    <div className="rounded-lg border bg-card p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        <span className="text-muted-foreground/50">{icon}</span>
      </div>
      <p className={`text-2xl font-bold tabular-nums tracking-tight ${accentClass}`}>
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
  if (profile.account_type === "candidate") {
    const { data: homeStatsData } = await (supabase as any).rpc("get_candidate_home_stats" as any, {
      p_profile_id: profile.id,
    });

    const candidateData = homeStatsData as unknown as CandidateStatsResponse;
    const cp = candidateData?.profile || {};
    const stats = candidateData?.stats || {
      total_tests: 0,
      live_tests: 0,
      upcoming_tests: 0,
      completed_tests: 0,
    };

    // 1. Fetch test attempts to get submitted count and average score
    const { data: testAttempts } = await (supabase as any)
      .from("test_attempts")
      .select("percentage, score, total_marks, status, test_id")
      .eq("candidate_id", profile.id)
      .eq("status", "submitted");

    let totalPercentage = 0;
    let validScoresCount = 0;
    if (testAttempts && testAttempts.length > 0) {
      testAttempts.forEach((attempt: any) => {
        if (attempt.percentage !== null && attempt.percentage !== undefined) {
          totalPercentage += Number(attempt.percentage);
          validScoresCount++;
        } else if (attempt.score !== null && attempt.total_marks) {
          totalPercentage += (Number(attempt.score) / Number(attempt.total_marks)) * 100;
          validScoresCount++;
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

    // 2. Fetch LogicLab global statistics
    const { data: statsData } = await (supabase as any).rpc('get_user_global_stats', { p_user_id: profile.id });
    const globalStats = (statsData as any) || { 
      total: 0, solved: 0, 
      easy: { total: 0, solved: 0 }, 
      medium: { total: 0, solved: 0 }, 
      hard: { total: 0, solved: 0 } 
    };

    // 3. Streaks calculation
    const today = new Date();
    const istOffset = 5.5 * 60 * 60 * 1000;
    const istDate = new Date(today.getTime() + istOffset);
    const todayStr = istDate.toISOString().split("T")[0];

    const yesterdayDate = new Date(istDate.getTime() - (24 * 60 * 60 * 1000));
    const yesterdayStr = yesterdayDate.toISOString().split("T")[0];

    // Fetch all activity dates
    const { data: streakRows } = await (supabase as any)
      .from("logiclab_daily_challenge_user_activity")
      .select("activity_date, solved")
      .eq("user_id", profile.id)
      .order("activity_date", { ascending: true });

    const allActiveDates = new Map<string, { solved: boolean }>();
    for (const row of streakRows ?? []) {
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
        const checkDate = allActiveDates.has(todayStr) ? new Date(istDate) : new Date(yesterdayDate);
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

    // 4. 14-day Activity Calendar
    const cutOffDate14Days = new Date(istDate.getTime() - (14 * 24 * 60 * 60 * 1000));
    const cutOffStr14Days = cutOffDate14Days.toISOString().split("T")[0];

    const { data: activityRows } = await (supabase as any)
      .from("logiclab_daily_challenge_user_activity")
      .select("activity_date, submission_count, solved")
      .eq("user_id", profile.id)
      .gte("activity_date", cutOffStr14Days)
      .order("activity_date", { ascending: true });

    const uniqueDatesWithStatus = new Map<string, { solved: boolean; attempted: boolean; count: number }>();
    for (const row of activityRows ?? []) {
      if (!row.activity_date) continue;
      const dateStr = row.activity_date;
      uniqueDatesWithStatus.set(dateStr, {
        solved: !!row.solved,
        attempted: !row.solved && row.submission_count > 0,
        count: Number(row.submission_count),
      });
    }

    const activityCalendar: any[] = [];
    for (let i = 14 - 1; i >= 0; i--) {
      const d = new Date(istDate.getTime() - (i * 24 * 60 * 60 * 1000));
      const dateStr = d.toISOString().split("T")[0];
      const activity = uniqueDatesWithStatus.get(dateStr);
      activityCalendar.push({
        date: dateStr,
        count: activity?.count || 0,
        status: activity?.solved ? "solved" : activity?.attempted ? "attempted" : "none",
      });
    }

    // 5. Job Applications
    const { data: apps } = await (supabase as any)
      .from("job_applications")
      .select(`
        id,
        status,
        created_at,
        job_postings!inner (
          id,
          title,
          job_type,
          location,
          work_mode
        )
      `)
      .eq("candidate_id", profile.id)
      .order("created_at", { ascending: false })
      .limit(3);

    const jobApplications = (apps ?? []).map((row: any) => {
      const jobData = Array.isArray(row.job_postings) ? row.job_postings[0] : row.job_postings;

      return {
        id: row.id,
        status: row.status,
        created_at: row.created_at,
        title: jobData?.title,
        company_name: "Unknown Company",
        location: jobData?.location,
        work_mode: jobData?.work_mode,
      };
    });

    // 6. Fetch live/upcoming tests for candidate
    const submittedTestIds = (testAttempts ?? [])
      .map((a: any) => a.test_id);

    const nowIso = new Date().toISOString();

    let liveTests: any[] = [];
    let upcomingTests: any[] = [];

    if (cp.institute_id) {
      let liveQuery = (supabase as any)
        .from("tests")
        .select("id, title, description, time_limit_seconds, available_from, available_until")
        .eq("status", "published")
        .eq("institute_id", cp.institute_id)
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
        .eq("institute_id", cp.institute_id)
        .gt("available_from", nowIso);

      if (submittedTestIds.length > 0) {
        upcomingQuery = upcomingQuery.not("id", "in", `(${submittedTestIds.join(",")})`);
      }

      const { data: upcomingData } = await upcomingQuery
        .order("available_from", { ascending: true })
        .limit(2);

      if (upcomingData) upcomingTests = upcomingData;
    }

    const candidateProfile = {
      id: profile.id,
      username: profile.username || null,
      full_name: cp.full_name || null,
      first_name: cp.first_name || null,
      last_name: cp.last_name || null,
      profile_complete: cp.profile_complete || null,
      profile_updated: cp.profile_updated || false,
      institute_id: cp.institute_id || null,
    };

    return (
      <CandidateDashboardClient
        profile={candidateProfile}
        stats={testStats}
        globalStats={globalStats}
        streakStats={streakStats}
        activityCalendar={activityCalendar}
        jobApplications={jobApplications}
        liveTests={liveTests}
        upcomingTests={upcomingTests}
        todayStr={todayStr}
      />
    );
  }

  // ── Institute ──────────────────────────────────────────────────────────────
  if (profile.account_type === "institute") {
    // Staff and TPO users resolve their parent institute's ID
    const instituteId = profile.institute_id

    // Resolve the primary profile ID for this institute to get stats
    let primaryProfileId = profile.id
    if (profile.account_subtype !== "primary" && instituteId) {
      const { data: primaryLink } = await (supabase as any)
        .from("institute_profiles")
        .select("profile_id")
        .eq("institute_id", instituteId)
        .limit(1)
        .maybeSingle()
      if (primaryLink?.profile_id) {
        primaryProfileId = primaryLink.profile_id
      }
    }

    const { data } = await (supabase as any).rpc("get_institute_home_stats" as any, {
      p_profile_id: primaryProfileId,
    })

    const instituteData = data as unknown as InstituteStatsResponse
    const ip = instituteData?.profile
    const stats = instituteData?.stats

    // Fetch the actual profile update state from profiles
    const { data: instProfile } = await (supabase as any)
      .from("profiles")
      .select("profile_updated")
      .eq("id", primaryProfileId)
      .maybeSingle()

    const hasBeenSaved = instProfile?.profile_updated === true
    const profileReady = hasBeenSaved

    const profileSubtitle = !hasBeenSaved
      ? "You haven't set up your institution profile yet. Add your details to get started."
      : ""

    const subtypeLabel = profile.account_subtype === "staff"
      ? "Staff"
      : profile.account_subtype === "tpo"
        ? "TPO"
        : "Institute"

    return (
      <div className="flex flex-col gap-6 px-4 py-8 md:px-8">
        <Suspense><LicenseBanner /></Suspense>
        <div className="flex flex-col gap-1.5">
          <h1 className="text-3xl font-bold font-cirka tracking-tight text-foreground">Home</h1>
          <p className="text-sm text-muted-foreground">
            Welcome back{profile.username ? `, @${profile.username}` : ""} · {subtypeLabel}
          </p>
        </div>

        <div className="space-y-6">
          {/* ── Profile banner (only for primary) ─────────────────────────── */}
          {profile.account_subtype === "primary" && !profileReady && (
            <div className="rounded-lg border bg-card p-4 flex items-start justify-between gap-4">
              <div className="space-y-0.5">
                <p className="text-sm font-medium">Your institution profile isn't complete yet</p>
                <p className="text-xs text-muted-foreground">{profileSubtitle}</p>
              </div>
              <Link href="/myprofile" className="shrink-0">
                <Button size="sm" variant="outline" className="h-8 gap-1.5 text-xs">
                  Complete Profile
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </Link>
            </div>
          )}

          {/* ── Test Stats (visible to staff and primary) ─────────────────── */}
          {stats && (profile.account_subtype === "staff" || profile.account_subtype === "primary") && (
            <div className="space-y-3">
              <SectionHeader title="Tests Overview" href="/tests" />
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                <StatCard
                  icon={<ListCheck className="h-4 w-4" />}
                  label="Total Tests"
                  value={stats.total_tests}
                />
                <StatCard
                  icon={<PlayCircle className="h-4 w-4" />}
                  label="Live"
                  value={stats.live_tests}
                  accent={stats.live_tests > 0 ? "green" : "muted"}
                />
                <StatCard
                  icon={<CalendarClock className="h-4 w-4" />}
                  label="Upcoming"
                  value={stats.upcoming_tests}
                  accent={stats.upcoming_tests > 0 ? "amber" : "muted"}
                />
                <StatCard
                  icon={<CheckCircle2 className="h-4 w-4" />}
                  label="Past"
                  value={stats.past_tests}
                />
                <StatCard
                  icon={<PenLine className="h-4 w-4" />}
                  label="Drafts"
                  value={stats.draft_tests}
                />
                <StatCard
                  icon={<Users className="h-4 w-4" />}
                  label="Attempts"
                  value={stats.total_attempts}
                  accent={stats.total_attempts > 0 ? "blue" : "muted"}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  // ── Admin ──────────────────────────────────────────────────────────────────
  if (profile.account_type === "admin") {
    const [
      candidatesCount,
      institutesCount,
      pendingTicketsCount,
      recentTicketsRes
    ] = await Promise.all([
      (supabase as any).from("profiles").select("*", { count: "exact", head: true }).eq("account_type", "candidate"),
      (supabase as any).from("profiles").select("*", { count: "exact", head: true }).eq("account_type", "institute"),
      (supabase as any).from("tickets").select("*", { count: "exact", head: true }).in("status", ["open", "in_progress"]),
      (supabase as any).from("tickets").select("*").order("created_at", { ascending: false }).limit(5),
    ]);

    const stats = {
      candidates: candidatesCount.count ?? 0,
      institutes: institutesCount.count ?? 0,
      pendingTickets: pendingTicketsCount.count ?? 0,
    };

    const recentTickets = recentTicketsRes.data || [];

    return (
      <div className="flex flex-col gap-6 px-4 py-8 md:px-8">
        <Suspense><LicenseBanner /></Suspense>
        <div className="flex flex-col gap-1.5">
          <h1 className="text-3xl font-bold font-cirka tracking-tight text-foreground">Home</h1>
          <p className="text-sm text-muted-foreground">
            Platform overview and recent support ticket queue
          </p>
        </div>

        <div className="space-y-6">
          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <StatCard
              icon={<Users className="h-4 w-4" />}
              label="Candidates"
              value={stats.candidates}
            />
            <StatCard
              icon={<Users className="h-4 w-4" />}
              label="Institutes"
              value={stats.institutes}
            />
            <StatCard
              icon={<PlayCircle className="h-4 w-4" />}
              label="Pending Tickets"
              value={stats.pendingTickets}
              accent={stats.pendingTickets > 0 ? "amber" : "muted"}
            />
          </div>

          {/* Support Queue Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold tracking-tight text-foreground">Recent Support Tickets</h2>
              <Link href="/support" className="text-xs font-semibold text-primary hover:underline flex items-center gap-1">
                Go to Support Queue
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>

            <RecentSupportTickets initialTickets={recentTickets} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 text-center text-muted-foreground">
      <p>Invalid or missing account type.</p>
    </div>
  );
}