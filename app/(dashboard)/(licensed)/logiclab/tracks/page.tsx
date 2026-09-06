import { createClient as createServerClient } from "@/lib/supabase/server";
import { getUserProfile } from "@/lib/supabase/profile";
import { redirect } from "next/navigation";
import Link from "next/link";
import { PREP_TRACKS } from "../_constants/tracks";
import { ArrowLeft, ArrowRight, CheckCircle2 } from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "Placement Tracks — LogicLab",
  description: "Curated problem sequences for campus recruitment and technical interviews.",
};

export default async function LogicLabTracksPage() {
  const profile = await getUserProfile();
  if (!profile) redirect("/auth/login");

  if (profile.account_type !== "institute_candidate" && profile.account_type !== "admin") {
    redirect("/home");
  }

  const supabase = (await createServerClient()) as any;

  // Fetch candidate's solved problem numbers to compute real progress
  const { data: userSolvedData } = await supabase
    .from("logiclab_user_solved_problems")
    .select("logiclab_problems!inner(number)")
    .eq("user_id", profile.id);

  const solvedSet = new Set<number>(
    (userSolvedData || [])
      .map((row: any) => row.logiclab_problems?.number)
      .filter((n: any): n is number => typeof n === "number")
  );

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
            Placement Preparation Tracks
          </h1>
          <p className="text-sm text-muted-foreground max-w-2xl leading-relaxed">
            Step-by-step roadmaps engineered for mass recruitment online tests, IT services exams, and product-based SDE-1 interviews.
          </p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <span className="text-xs font-mono text-muted-foreground bg-muted/60 border border-border/60 rounded-full px-3 py-1 font-medium">
            {PREP_TRACKS.length} Structured Tracks
          </span>
        </div>
      </div>

      {/* Clean Modern Structured Cards Grid using Shadcn Card */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {PREP_TRACKS.map((track) => {
          const total = track.problemNumbers.length;
          const solved = track.problemNumbers.filter((n) => solvedSet.has(n)).length;
          const pct = Math.round((solved / total) * 100);
          const isComplete = solved === total && total > 0;

          return (
            <Card
              key={track.id}
              className="group flex flex-col justify-between hover:border-foreground/30 hover:shadow-md transition-all duration-200 select-none py-6 gap-5"
            >
              {/* Header & Meta */}
              <CardHeader className="gap-2.5 pb-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-mono text-muted-foreground font-medium">
                    {total} Problems
                  </span>
                  {isComplete ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full">
                      <CheckCircle2 className="size-3" /> Completed
                    </span>
                  ) : solved > 0 ? (
                    <span className="text-[11px] font-medium text-foreground/90 bg-muted px-2.5 py-0.5 rounded-full font-mono">
                      {solved}/{total} Solved
                    </span>
                  ) : (
                    <span className="text-[11px] text-muted-foreground/60 font-mono">
                      Not Started
                    </span>
                  )}
                </div>

                <div className="space-y-1">
                  <CardTitle className="text-base sm:text-lg leading-snug group-hover:text-primary transition-colors">
                    {track.title}
                  </CardTitle>
                  <CardDescription className="text-xs sm:text-sm leading-relaxed">
                    {track.subtitle}
                  </CardDescription>
                </div>

                {/* Target Companies */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="text-[11px] text-muted-foreground font-medium mr-0.5">Target:</span>
                  {track.targetCompanies.map((c) => (
                    <span
                      key={c}
                      className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-muted/60 border border-border/50 text-foreground/80"
                    >
                      {c}
                    </span>
                  ))}
                </div>
              </CardHeader>

              {/* Progress */}
              <CardContent className="space-y-2.5 pt-2">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-[11px] text-muted-foreground">Curriculum Progress</span>
                  <span className="text-[11px] font-medium text-foreground">
                    {solved}/{total} ({pct}%)
                  </span>
                </div>

                <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all duration-300"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </CardContent>

              {/* Action Button */}
              <CardFooter className="pt-0">
                <Button
                  asChild
                  variant="outline"
                  className="w-full justify-center gap-2 rounded-xl text-xs font-semibold hover:border-foreground/40 transition-all duration-200"
                >
                  <Link href={`/logiclab/tracks/${track.id}`}>
                    <span>{solved > 0 ? "Continue Track" : "Explore Track"}</span>
                    <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
                  </Link>
                </Button>
              </CardFooter>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
