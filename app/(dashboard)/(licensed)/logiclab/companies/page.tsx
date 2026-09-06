import { createClient as createServerClient } from "@/lib/supabase/server";
import { getUserProfile } from "@/lib/supabase/profile";
import { redirect } from "next/navigation";
import Link from "next/link";
import { COMPANY_CATALOG, isProblemAskedAtCompany } from "../_constants/companies";
import { ArrowLeft, ArrowRight, CheckCircle2 } from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";

export const metadata = {
  title: "Company Interview Sets — LogicLab",
  description: "Practice coding interview questions asked by top tech and IT recruitment companies.",
};

export default async function LogicLabCompaniesPage() {
  const profile = await getUserProfile();
  if (!profile) redirect("/auth/login");

  if (profile.account_type !== "institute_candidate" && profile.account_type !== "admin") {
    redirect("/home");
  }

  const supabase = (await createServerClient()) as any;

  // 1. Fetch all problems and user solved problems
  const [{ data: allProblems }, { data: userSolvedData }] = await Promise.all([
    supabase
      .from("logiclab_problems")
      .select("id, number, title, difficulty, tags"),
    supabase
      .from("logiclab_user_solved_problems")
      .select("problem_id")
      .eq("user_id", profile.id),
  ]);

  const solvedIdSet = new Set<string>((userSolvedData || []).map((r: any) => r.problem_id));
  const problems = allProblems || [];

  // Group companies by category
  const categories = [
    "FAANG / Tier-1",
    "Product",
    "FinTech",
    "Mass Recruiter / IT Services",
  ] as const;

  return (
    <div className="flex flex-col gap-6 px-4 py-6 md:px-8 md:py-8 w-full">
      {/* Back link */}
      <div>
        <Link
          href="/logiclab"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors font-medium select-none"
        >
          <ArrowLeft className="size-3.5" />
          <span>Back to Problem Catalog</span>
        </Link>
      </div>

      {/* Main Page Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2">
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-bold font-cirka tracking-tight text-foreground">
            Company Interview Sets
          </h1>
          <p className="text-sm text-muted-foreground max-w-2xl leading-relaxed">
            Solve problems filtered by real interview occurrence frequency at FAANG, high-growth product companies, and mass recruiters.
          </p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <span className="text-xs font-mono text-muted-foreground bg-muted/60 border border-border/60 rounded-full px-3 py-1 font-medium">
            {COMPANY_CATALOG.length} Companies Tracked
          </span>
        </div>
      </div>

      {/* Companies Grouped by Tier using Shadcn Card */}
      <div className="space-y-8">
        {categories.map((cat) => {
          const catCompanies = COMPANY_CATALOG.filter((c) => c.category === cat);
          if (catCompanies.length === 0) return null;

          return (
            <div key={cat} className="space-y-3.5">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground font-mono">
                  {cat}
                </h3>
                <span className="text-[11px] font-mono text-muted-foreground/60">
                  {catCompanies.length} Organizations
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
                {catCompanies.map((company) => {
                  const companyProblems = problems.filter((p: any) =>
                    isProblemAskedAtCompany(p, company.id)
                  );
                  const total = companyProblems.length;
                  const solved = companyProblems.filter((p: any) => solvedIdSet.has(p.id)).length;
                  const pct = total > 0 ? Math.round((solved / total) * 100) : 0;
                  const isComplete = total > 0 && solved === total;

                  return (
                    <Card
                      key={company.id}
                      className="group flex flex-col justify-between hover:border-foreground/30 hover:shadow-md transition-all duration-200 py-5 gap-4 select-none"
                    >
                      <CardHeader className="gap-2 pb-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-mono text-muted-foreground font-medium">
                            {total} Question{total !== 1 ? "s" : ""}
                          </span>
                          {isComplete ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                              <CheckCircle2 className="size-3" /> Done
                            </span>
                          ) : solved > 0 ? (
                            <span className="text-[10px] font-mono font-medium text-foreground bg-muted px-2 py-0.5 rounded-full">
                              {solved}/{total}
                            </span>
                          ) : (
                            <span className="text-[10px] font-mono text-muted-foreground/65">
                              ~{company.defaultFrequency}x asked
                            </span>
                          )}
                        </div>

                        <div>
                          <CardTitle className="text-base leading-snug group-hover:text-primary transition-colors">
                            <Link href={`/logiclab/companies/${company.id}`} className="hover:underline">
                              {company.name}
                            </Link>
                          </CardTitle>
                          <CardDescription className="text-[11px] font-mono mt-0.5">
                            {company.category}
                          </CardDescription>
                        </div>
                      </CardHeader>

                      {/* Progress Bar & View Arrow */}
                      <CardContent className="space-y-2 pt-0 pb-0">
                        <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary rounded-full transition-all duration-300"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </CardContent>

                      <CardFooter className="pt-0 flex items-center justify-between text-xs text-muted-foreground">
                        <span className="font-mono text-[10px]">{pct}% Solved</span>
                        <Link
                          href={`/logiclab/companies/${company.id}`}
                          className="text-xs font-medium text-foreground hover:underline flex items-center gap-1"
                        >
                          Practice <ArrowRight className="size-3 transition-transform group-hover:translate-x-0.5" />
                        </Link>
                      </CardFooter>
                    </Card>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
