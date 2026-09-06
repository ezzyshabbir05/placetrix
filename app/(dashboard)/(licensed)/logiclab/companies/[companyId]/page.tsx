import { createClient as createServerClient } from "@/lib/supabase/server";
import { getUserProfile } from "@/lib/supabase/profile";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { COMPANY_CATALOG, isProblemAskedAtCompany, getCompanyFrequency } from "../../_constants/companies";
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
  params: Promise<{ companyId: string }>;
}) {
  const { companyId } = await params;
  const company = COMPANY_CATALOG.find((c) => c.id === companyId || c.slug === companyId);
  return {
    title: company ? `${company.name} Interview Questions — LogicLab` : "Company Practice — LogicLab",
    description: company ? `Practice coding interview questions asked at ${company.name}` : "Company questions",
  };
}

export default async function CompanyDetailPage({
  params,
}: {
  params: Promise<{ companyId: string }>;
}) {
  const { companyId } = await params;
  const company = COMPANY_CATALOG.find((c) => c.id === companyId || c.slug === companyId);
  if (!company) notFound();

  const profile = await getUserProfile();
  if (!profile) redirect("/auth/login");

  if (profile.account_type !== "institute_candidate" && profile.account_type !== "admin") {
    redirect("/home");
  }

  const supabase = (await createServerClient()) as any;

  // 1. Fetch all problems and user's solved records
  const [{ data: allProblems }, { data: userSolvedData }, { data: subData }] = await Promise.all([
    supabase
      .from("logiclab_problems")
      .select("id, number, title, difficulty, tags")
      .order("number", { ascending: true }),
    supabase
      .from("logiclab_user_solved_problems")
      .select("problem_id")
      .eq("user_id", profile.id),
    supabase
      .from("logiclab_problem_submissions")
      .select("problem_id, status")
      .eq("user_id", profile.id),
  ]);

  const solvedIdSet = new Set<string>((userSolvedData || []).map((r: any) => r.problem_id));
  const attemptedIdSet = new Set<string>();
  (subData || []).forEach((r: any) => {
    if (!solvedIdSet.has(r.problem_id)) {
      attemptedIdSet.add(r.problem_id);
    }
  });

  // Filter problems for this company
  const companyProblems = (allProblems || [])
    .filter((p: any) => isProblemAskedAtCompany(p, company.id))
    .map((p: any) => ({
      ...p,
      frequency: getCompanyFrequency(company.id, p.title),
    }))
    .sort((a: any, b: any) => b.frequency - a.frequency || (a.number || 0) - (b.number || 0));

  const total = companyProblems.length;
  const solvedCount = companyProblems.filter((p: any) => solvedIdSet.has(p.id)).length;
  const progressPct = total > 0 ? Math.round((solvedCount / total) * 100) : 0;

  // Find next unsolved problem
  const nextUnsolvedProblem = companyProblems.find((p: any) => !solvedIdSet.has(p.id));

  return (
    <div className="flex flex-col gap-6 px-4 py-6 md:px-8 md:py-8 w-full">
      {/* Back link & breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Link
          href="/logiclab/companies"
          className="inline-flex items-center gap-1 hover:text-foreground transition-colors font-medium"
        >
          <ArrowLeft className="size-3.5" />
          <span>Company Sets</span>
        </Link>
        <span>/</span>
        <span className="text-foreground font-semibold truncate">{company.name}</span>
      </div>

      {/* Company Hero Card */}
      <Card className="p-6 shadow-2xs">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
          <div className="space-y-2.5 max-w-2xl">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono font-medium px-2 py-0.5 rounded bg-muted text-muted-foreground">
                {company.category}
              </span>
              <span className="text-[11px] text-muted-foreground font-mono">
                ~{company.defaultFrequency}x Avg Recurrence
              </span>
            </div>

            <CardTitle className="text-2xl sm:text-3xl font-bold font-cirka tracking-tight text-foreground">
              {company.name} Interview Questions
            </CardTitle>

            <CardDescription className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              Curated coding problems frequently asked in technical phone screens and on-site loops at {company.name}.
            </CardDescription>
          </div>

          {/* Progress Card & Action */}
          <Card className="flex flex-col justify-between gap-4 p-4 bg-muted/30 border-border/60 min-w-[240px] shrink-0 shadow-none">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-muted-foreground">Solved</span>
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
                href={`/logiclab/problems/${nextUnsolvedProblem.id}?company=${company.id}`}
                className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-foreground text-background text-xs font-semibold hover:bg-foreground/90 transition-colors shadow-2xs select-none"
              >
                <Play className="size-3.5 fill-current" />
                <span>{solvedCount > 0 ? "Resume Next Question" : "Start First Question"}</span>
              </Link>
            ) : total > 0 ? (
              <div className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-semibold select-none">
                <CheckCircle2 className="size-4" />
                <span>All {company.name} Questions Solved!</span>
              </div>
            ) : null}
          </Card>
        </div>
      </Card>

      {/* Problem List Header */}
      <div className="flex items-center justify-between pt-2">
        <h2 className="text-sm font-semibold tracking-tight text-foreground">
          Questions Ranked by Interview Frequency
        </h2>
        <span className="text-xs text-muted-foreground font-mono">
          {companyProblems.length} Problems
        </span>
      </div>

      {/* Structured Problem List */}
      <div className="flex flex-col gap-1.5">
        {companyProblems.map((problem: any) => {
          const isSolved = solvedIdSet.has(problem.id);
          const isAttempted = attemptedIdSet.has(problem.id);

          return (
            <Link
              key={problem.id}
              href={`/logiclab/problems/${problem.id}?company=${company.id}`}
              className="group flex items-center justify-between gap-3 px-4 py-3 rounded-lg border border-border/60 bg-card hover:border-foreground/30 hover:bg-muted/30 transition-all select-none"
            >
              {/* Left: Status & Problem Info */}
              <div className="flex items-center gap-3.5 min-w-0">
                {/* Solved Status */}
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

              {/* Right: Frequency, Difficulty & Action */}
              <div className="flex items-center gap-3 shrink-0">
                {/* Interview Frequency Badge */}
                {problem.frequency > 0 && (
                  <span className="hidden sm:inline-block text-[10px] font-mono text-muted-foreground bg-muted/40 border border-border/50 px-2 py-0.5 rounded">
                    ~{problem.frequency}x asked
                  </span>
                )}

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

                {/* Clean Arrow */}
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
