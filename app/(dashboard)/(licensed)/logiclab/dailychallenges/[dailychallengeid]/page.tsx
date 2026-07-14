import { createClient } from "@/lib/supabase/server"
import { getUserProfile } from "@/lib/supabase/profile"
import { redirect, notFound } from "next/navigation"
import { ProblemWorkspaceClient } from "@/app/(dashboard)/(licensed)/logiclab/_components/ProblemWorkspaceClient/ProblemWorkspaceClient"

export async function generateMetadata({ params }: { params: Promise<{ dailychallengeid: string }> }) {
  const { dailychallengeid } = await params
  const supabase = (await createClient()) as any
  const { data } = await (supabase as any)
    .from("logiclab_daily_challenges")
    .select("logiclab_problems ( title )")
    .eq("id", dailychallengeid)
    .maybeSingle()

  const title = (data as any)?.logiclab_problems?.title
  return {
    title: title ? `${title} — Daily Challenge` : "Daily Challenge — LogicLab",
    description: "Solve the daily coding challenge on LogicLab",
  }
}

export default async function DailyChallengePage({ params }: { params: Promise<{ dailychallengeid: string }> }) {
  const { dailychallengeid } = await params
  const profile = await getUserProfile()
  if (!profile) redirect("/auth/login")

  if (profile.account_type !== "institute_candidate" && profile.account_type !== "admin") {
    redirect("/home")
  }

  const supabase = (await createClient()) as any

  // Fetch the daily challenge along with the problem relation
  const { data: dailyChallenge, error } = await (supabase as any)
    .from("logiclab_daily_challenges")
    .select("id, problem_id, logiclab_problems (*)")
    .eq("id", dailychallengeid)
    .maybeSingle()

  if (error || !dailyChallenge || !dailyChallenge.logiclab_problems) {
    notFound()
  }

  const problem = dailyChallenge.logiclab_problems

  // Extract test cases from the embedded problem.test_cases column
  let parsedTestCases: any[] = problem.test_cases || []
  if (typeof parsedTestCases === "string") {
    try {
      parsedTestCases = JSON.parse(parsedTestCases)
    } catch {
      parsedTestCases = []
    }
  }

  const sampleTestCases = parsedTestCases
    .filter((tc: any) => tc.is_sample || tc.isSample)
    .map((tc: any, idx: number) => ({
      id: tc.id || String(idx),
      input: tc.input || "",
      expected_output: tc.expected_output || "",
    }))

  const totalTestCases = parsedTestCases.length

  // Fetch user's past submissions for this daily challenge
  const { data: submissions } = await (supabase as any)
    .from("logiclab_daily_challenge_submissions")
    .select("id, status, language_id, runtime, memory, passed_count, total_count, created_at")
    .eq("daily_challenge_id", dailychallengeid)
    .eq("user_id", profile.id)
    .order("created_at", { ascending: false })
    .limit(20)

  return (
    <ProblemWorkspaceClient
      problem={problem}
      sampleTestCases={sampleTestCases ?? []}
      totalTestCases={totalTestCases ?? 0}
      submissions={submissions ?? []}
      userId={profile.id}
      userProfile={profile}
      prevProblemId={null}
      nextProblemId={null}
      isDailyChallenge={true}
      dailyChallengeId={dailyChallenge.id}
    />
  )
}
