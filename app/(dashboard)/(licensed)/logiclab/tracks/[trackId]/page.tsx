import { createClient as createServerClient } from "@/lib/supabase/server";
import { getUserProfile } from "@/lib/supabase/profile";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getTrackById } from "../../_constants/tracks";
import { getProblemCompanyBadges, isCompanyTag } from "../../_constants/companies";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  CircleCheck,
  CircleDot,
  Play,
} from "lucide-react";
import { Card, CardTitle, CardDescription } from "@/components/ui/card";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ trackId: string }>;
}) {
  const { trackId } = await params;
  const track = getTrackById(trackId);
  return {
    title: track ? `${track.title} — LogicLab Track` : "Placement Track — LogicLab",
    description: track?.description || "Structured coding track on LogicLab",
  };
}

export default async function TrackDetailPage({
  params,
}: {
  params: Promise<{ trackId: string }>;
}) {
  const { trackId } = await params;
  const track = getTrackById(trackId);
  if (!track) notFound();

  const profile = await getUserProfile();
  if (!profile) redirect("/auth/login");

  if (profile.account_type !== "institute_candidate" && profile.account_type !== "admin") {
    redirect("/home");
  }

  const supabase = (await createServerClient()) as any;

  // 1. Fetch the track's problems
  const { data: rawProblems } = await supabase
    .from("logiclab_problems")
    .select("id, number, title, difficulty, tags")
    .in("number", track.problemNumbers);

  const problemMap = new Map<number, any>();
  (rawProblems || []).forEach((p: any) => {
    if (typeof p.number === "number") {
      problemMap.set(p.number, p);
    }
  });

  // Preserve the track's defined sequential order
  const orderedProblems: any[] = [];
  for (const num of track.problemNumbers) {
    const found = problemMap.get(num);
    if (found) {
      orderedProblems.push(found);
    }
  }

  const problemIds = orderedProblems.map((p) => p.id);

  // 2. Fetch candidate's solved & attempted status for these problems
  const [solvedRes, subRes] = await Promise.all([
    supabase
      .from("logiclab_user_solved_problems")
      .select("problem_id")
      .eq("user_id", profile.id)
      .in("problem_id", problemIds),
    supabase
      .from("logiclab_problem_submissions")
      .select("problem_id, status")
      .eq("user_id", profile.id)
      .in("problem_id", problemIds),
  ]);

  const solvedIdSet = new Set<string>((solvedRes.data || []).map((r: any) => r.problem_id));
  const attemptedIdSet = new Set<string>();
  (subRes.data || []).forEach((r: any) => {
    if (!solvedIdSet.has(r.problem_id)) {
      attemptedIdSet.add(r.problem_id);
    }
  });

  const total = orderedProblems.length;
  const solvedCount = orderedProblems.filter((p) => solvedIdSet.has(p.id)).length;
  const progressPct = total > 0 ? Math.round((solvedCount / total) * 100) : 0;

  // Find the first unsolved problem to offer quick "Resume"
  const nextUnsolvedProblem = orderedProblems.find((p) => !solvedIdSet.has(p.id));

  return (
    <div className="flex flex-col gap-6 px-4 py-6 md:px-8 md:py-8 w-full">
      {/* Back link & breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Link
          href="/logiclab/tracks"
          className="inline-flex items-center gap-1 hover:text-foreground transition-colors font-medium"
        >
          <ArrowLeft className="size-3.5" />
          <span>Placement Tracks</span>
        </Link>
        <span>/</span>
        <span className="text-foreground font-semibold truncate">{track.title}</span>
      </div>

      {/* Track Overview Card */}
      <Card className="p-6 shadow-2xs">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
          <div className="space-y-2.5 max-w-2xl">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono font-medium px-2 py-0.5 rounded bg-muted text-muted-foreground">
                {total} Problems
              </span>
              <span className="text-[11px] text-muted-foreground font-mono">
                {track.targetRole}
              </span>
            </div>

            <CardTitle className="text-2xl sm:text-3xl font-bold font-cirka tracking-tight text-foreground">
              {track.title}
            </CardTitle>

            <CardDescription className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              {track.description}
            </CardDescription>

            {/* Target Companies */}
            <div className="flex flex-wrap items-center gap-1.5 pt-2">
              <span className="text-xs text-muted-foreground/70 mr-1">Target Companies:</span>
              {track.targetCompanies.map((c) => (
                <span
                  key={c}
                  className="text-[11px] font-mono px-2.5 py-0.5 rounded bg-muted/40 border border-border/50 text-foreground/85"
                >
                  {c}
                </span>
              ))}
            </div>
          </div>

          {/* Progress Card & Quick Action */}
          <Card className="flex flex-col justify-between gap-4 p-4 bg-muted/30 border-border/60 min-w-[240px] shrink-0 shadow-none">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-muted-foreground">Completion</span>
                <span className="font-semibold text-foreground">
                  {solvedCount}/{total} ({progressPct}%)
                </span>
              </div>
              <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-foreground/85 rounded-full transition-all duration-300"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>

            {nextUnsolvedProblem ? (
              <Link
                href={`/logiclab/problems/${nextUnsolvedProblem.id}?track=${track.id}`}
                className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-foreground text-background text-xs font-semibold hover:bg-foreground/90 transition-colors shadow-2xs select-none"
              >
                <Play className="size-3.5 fill-current" />
                <span>{solvedCount > 0 ? "Resume Next Problem" : "Start First Problem"}</span>
              </Link>
            ) : (
              <div className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-semibold select-none">
                <CheckCircle2 className="size-4" />
                <span>Track Completed!</span>
              </div>
            )}
          </Card>
        </div>
      </Card>

      {/* Curriculum Problem List Header */}
      <div className="flex items-center justify-between pt-2">
        <h2 className="text-sm font-semibold tracking-tight text-foreground">
          Curriculum Sequence
        </h2>
        <span className="text-xs text-muted-foreground font-mono">
          {orderedProblems.length} Problems in sequence
        </span>
      </div>

      {/* Clean Structured Problem List */}
      <div className="flex flex-col gap-1.5">
        {orderedProblems.map((problem, index) => {
          const isSolved = solvedIdSet.has(problem.id);
          const isAttempted = attemptedIdSet.has(problem.id);
          const companyBadges = getProblemCompanyBadges(problem);
          const topCompany = companyBadges[0];
          const topic = (problem.tags || []).find((t: string) => !isCompanyTag(t));

          return (
            <Link
              key={problem.id}
              href={`/logiclab/problems/${problem.id}?track=${track.id}`}
              className="group flex items-center justify-between gap-3 px-4 py-3 rounded-lg border border-border/60 bg-card hover:border-foreground/30 hover:bg-muted/30 transition-all select-none"
            >
              {/* Left: Step Index & Status & Title */}
              <div className="flex items-center gap-3.5 min-w-0">
                {/* Track Step Number */}
                <span className="text-xs font-mono text-muted-foreground/60 w-5 text-center shrink-0">
                  {index + 1}
                </span>

                {/* Solved / Attempted Status Icon */}
                <div className="shrink-0 flex items-center justify-center w-5">
                  {isSolved ? (
                    <CircleCheck className="size-4 text-emerald-500" />
                  ) : isAttempted ? (
                    <CircleDot className="size-4 text-amber-500" />
                  ) : (
                    <div className="size-3.5 rounded-full border-2 border-muted-foreground/40" />
                  )}
                </div>

                {/* Problem # and Title */}
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="text-xs font-mono text-muted-foreground shrink-0">
                    #{problem.number}
                  </span>
                  <span className="text-xs sm:text-sm font-medium text-foreground group-hover:text-foreground truncate">
                    {problem.title}
                  </span>
                </div>
              </div>

              {/* Right: Difficulty, Tag & Action */}
              <div className="flex items-center gap-3 shrink-0">
                {/* Difficulty Text */}
                <span
                  className={
                    problem.difficulty === "Easy"
                      ? "text-xs font-semibold text-emerald-500"
                      : problem.difficulty === "Medium"
                      ? "text-xs font-semibold text-amber-500"
                      : "text-xs font-semibold text-rose-500"
                  }
                >
                  {problem.difficulty}
                </span>

                {/* Single Clean Tag */}
                {topCompany ? (
                  <span className="hidden sm:inline-block text-[10px] font-mono text-muted-foreground bg-muted/40 border border-border/50 px-2 py-0.5 rounded">
                    {topCompany.company.name}
                  </span>
                ) : topic ? (
                  <span className="hidden sm:inline-block text-[10px] font-mono text-muted-foreground/75 px-1.5 py-0.5">
                    {topic}
                  </span>
                ) : null}

                {/* Clean Solve Arrow */}
                <div className="flex items-center gap-1 text-xs text-muted-foreground group-hover:text-foreground pl-1">
                  <span className="hidden md:inline text-[11px] font-medium">
                    {isSolved ? "Review" : "Solve"}
                  </span>
                  <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
