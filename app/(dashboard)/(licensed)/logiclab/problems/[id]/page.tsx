import { createClient } from "@/lib/supabase/server"
import { getUserProfile } from "@/lib/supabase/profile"
import { redirect, notFound } from "next/navigation"
import { ProblemWorkspaceWrapper } from "./ProblemWorkspaceWrapper"
import { getCachedGlobalProblemsList } from "../../actions"

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = (await createClient()) as any
  const { data } = await (supabase as any)
    .from("logiclab_problems")
    .select("title")
    .eq("id", id)
    .maybeSingle()

  return {
    title: data?.title ? `${data.title} — LogicLab` : "Problem — LogicLab",
    description: "Solve coding challenges on LogicLab",
  }
}

export default async function ProblemPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const profile = await getUserProfile()
  if (!profile) redirect("/auth/login")

  if (profile.account_type !== "institute_candidate" && profile.account_type !== "admin") {
    redirect("/home")
  }

  const supabase = (await createClient()) as any

  // Fetch problem
  const { data: problem, error } = await (supabase as any)
    .from("logiclab_problems")
    .select("*")
    .eq("id", id)
    .maybeSingle()

  if (error || !problem) {
    console.error("404 Triggered! Error:", error, "Problem:", problem);
    notFound()
  }

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

  // Fetch user's past submissions for this problem
  const { data: submissions } = await (supabase as any)
    .from("logiclab_problem_submissions")
    .select("id, status, language_id, runtime, memory, passed_count, total_count, created_at")
    .eq("problem_id", id)
    .eq("user_id", profile.id)
    .order("created_at", { ascending: false })
    .limit(20)

  // Use cached global problem list to find exact previous and next problems
  const allProblems = await getCachedGlobalProblemsList()
  const currentIndex = allProblems.findIndex((p: any) => p.id === id)
  
  let prevProblemId = null
  let nextProblemId = null
  
  if (currentIndex > 0) {
    prevProblemId = (allProblems[currentIndex - 1] as any).id
  }
  if (currentIndex >= 0 && currentIndex < allProblems.length - 1) {
    nextProblemId = (allProblems[currentIndex + 1] as any).id
  }

  return (
    <ProblemWorkspaceWrapper
      problem={problem}
      sampleTestCases={sampleTestCases ?? []}
      totalTestCases={totalTestCases ?? 0}
      submissions={submissions ?? []}
      userId={profile.id}
      userProfile={profile}
      prevProblemId={prevProblemId}
      nextProblemId={nextProblemId}
    />
  )
}
