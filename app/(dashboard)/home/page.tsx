import { createClient } from "@/lib/supabase/server";
import { getUserProfile } from "@/lib/supabase/profile";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { RecentSupportTickets } from "./RecentSupportTickets";
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
    const { data } = await (supabase as any).rpc("get_candidate_home_stats" as any, {
      p_profile_id: profile.id,
    });

    const candidateData = data as unknown as CandidateStatsResponse;
    const cp = candidateData?.profile;
    const stats = candidateData?.stats;

    const isComplete = cp?.profile_complete === true;
    const hasBeenSaved = cp?.profile_updated === true;
    const profileReady = isComplete && hasBeenSaved;

    const profileSubtitle = !cp
      ? "You haven't set up your profile yet. Fill in your details to access all features."
      : !hasBeenSaved
        ? "Your profile has been started but not saved yet."
        : "A few required fields are still missing.";

    return (
      <div className="flex flex-col gap-6 px-4 py-8 md:px-8">
        <div className="flex flex-col gap-1.5">
          <h1 className="text-3xl font-bold font-cirka tracking-tight text-foreground">Home</h1>
          <p className="text-sm text-muted-foreground">
            Welcome back{profile.username ? `, @${profile.username}` : ""}
          </p>
        </div>

        <div className="space-y-6">
          {/* ── Profile banner ───────────────────────────────────────────── */}
          {!profileReady && (
            <div className="rounded-lg border bg-card p-4 flex items-start justify-between gap-4">
              <div className="space-y-0.5">
                <p className="text-sm font-medium">Your profile isn't complete yet</p>
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

          {/* ── Test Stats ───────────────────────────────────────────────── */}
          {cp?.institute_id && stats && (
            <div className="space-y-3">
              <SectionHeader title="Tests Overview" href="/tests" />
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <StatCard
                  icon={<BookOpen className="h-4 w-4" />}
                  label="Assigned"
                  value={stats.total_tests}
                />
                <StatCard
                  icon={<PlayCircle className="h-4 w-4" />}
                  label="Live Now"
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
                  label="Completed"
                  value={stats.completed_tests}
                  accent={stats.completed_tests > 0 ? "blue" : "muted"}
                />
              </div>
            </div>
          )}

          {/* ── View Tests CTA (when profile ready but no institute) ─────── */}
          {profileReady && !cp?.institute_id && (
            <div className="rounded-lg border bg-card p-4 flex items-center justify-between gap-4">
              <div className="space-y-0.5">
                <p className="text-sm font-medium">Looking for tests?</p>
                <p className="text-xs text-muted-foreground">
                  Browse available assessments assigned to you.
                </p>
              </div>
              <Link href="/tests" className="shrink-0">
                <Button size="sm" variant="outline" className="h-8 gap-1.5 text-xs">
                  View Tests
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Institute ──────────────────────────────────────────────────────────────
  if (profile.account_type === "institute") {
    const { data } = await (supabase as any).rpc("get_institute_home_stats" as any, {
      p_profile_id: profile.id,
    });

    const instituteData = data as unknown as InstituteStatsResponse;
    const ip = instituteData?.profile;
    const stats = instituteData?.stats;

    const isComplete = ip?.profile_complete === true;
    const hasBeenSaved = ip?.profile_updated === true;
    const profileReady = isComplete && hasBeenSaved;

    const profileSubtitle = !ip
      ? "You haven't set up your institution profile yet. Add your details to get started."
      : !hasBeenSaved
        ? "Your profile has been started but not saved yet."
        : "A few required fields are still missing.";

    return (
      <div className="flex flex-col gap-6 px-4 py-8 md:px-8">
        <div className="flex flex-col gap-1.5">
          <h1 className="text-3xl font-bold font-cirka tracking-tight text-foreground">Home</h1>
          <p className="text-sm text-muted-foreground">
            Welcome back{profile.username ? `, @${profile.username}` : ""}
          </p>
        </div>

        <div className="space-y-6">
          {/* ── Profile banner ───────────────────────────────────────────── */}
          {!profileReady && (
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

          {/* ── Test Stats ───────────────────────────────────────────────── */}
          {stats && (
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
    );
  }

  // ── Admin ──────────────────────────────────────────────────────────────────
  if (profile.account_type === "admin") {
    const [
      candidatesCount,
      institutesCount,
      recruitersCount,
      pendingTicketsCount,
      recentTicketsRes
    ] = await Promise.all([
      (supabase as any).from("profiles").select("*", { count: "exact", head: true }).eq("account_type", "candidate"),
      (supabase as any).from("profiles").select("*", { count: "exact", head: true }).eq("account_type", "institute"),
      (supabase as any).from("profiles").select("*", { count: "exact", head: true }).eq("account_type", "recruiter"),
      (supabase as any).from("tickets").select("*", { count: "exact", head: true }).in("status", ["open", "in_progress"]),
      (supabase as any).from("tickets").select("*").order("created_at", { ascending: false }).limit(5),
    ]);

    const stats = {
      candidates: candidatesCount.count ?? 0,
      institutes: institutesCount.count ?? 0,
      recruiters: recruitersCount.count ?? 0,
      pendingTickets: pendingTicketsCount.count ?? 0,
    };

    const recentTickets = recentTicketsRes.data || [];

    return (
      <div className="flex flex-col gap-6 px-4 py-8 md:px-8">
        <div className="flex flex-col gap-1.5">
          <h1 className="text-3xl font-bold font-cirka tracking-tight text-foreground">Home</h1>
          <p className="text-sm text-muted-foreground">
            Platform overview and recent support ticket queue
          </p>
        </div>

        <div className="space-y-6">
          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
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
              icon={<Users className="h-4 w-4" />}
              label="Recruiters"
              value={stats.recruiters}
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

  // ── Recruiter ───────────────────────────────────────────────────────────────
  if (profile.account_type === "recruiter") {
    const { data: rp } = await (supabase as any)
      .from("recruiter_profiles")
      .select("profile_complete, profile_updated")
      .eq("profile_id", profile.id)
      .maybeSingle();

    const profileReady = rp?.profile_complete === true && rp?.profile_updated === true;

    return (
      <div className="flex flex-col gap-6 px-4 py-8 md:px-8">
        <div className="flex flex-col gap-1.5">
          <h1 className="text-3xl font-bold font-cirka tracking-tight text-foreground">Home</h1>
          <p className="text-sm text-muted-foreground">
            Welcome back{profile.username ? `, @${profile.username}` : ""}
          </p>
        </div>

        <div className="space-y-6">
          {!profileReady && (
            <div className="rounded-lg border bg-card p-4 flex items-start justify-between gap-4">
              <div className="space-y-0.5">
                <p className="text-sm font-medium">Your company profile isn&apos;t complete yet</p>
                <p className="text-xs text-muted-foreground">
                  Fill in your company details to unlock all recruiter features.
                </p>
              </div>
              <Link href="/myprofile" className="shrink-0">
                <Button size="sm" variant="outline" className="h-8 gap-1.5 text-xs">
                  Complete Profile
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    );
  }

  redirect("/home");
}