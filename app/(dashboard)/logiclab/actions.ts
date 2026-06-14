"use server"

import { createClient as createServerClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { unstable_cache } from "next/cache"
import { Problem } from "./_types"

// Cache LogicLab global problems list for 1 hour
export const getCachedGlobalProblemsList = unstable_cache(
  async () => {
    const adminSupabase = createAdminClient()
    
    const { data: problems } = await adminSupabase
      .from("logiclab_problems")
      .select("id, title, difficulty, created_at")
      .order("created_at", { ascending: true })

    return (problems as any[]) || []
  },
  ["global-problems-list-cache-v1"],
  { revalidate: 3600 }
)

// Fetch light problem array for side list inside IDE
export async function getIdeProblemList(userId: string) {
  const problems = await getCachedGlobalProblemsList()
  
  const supabase = (await createServerClient()) as any
  const { data: solvedData } = await supabase
    .from("logiclab_problem_submissions")
    .select("problem_id")
    .eq("user_id", userId)
    .eq("status", "Accepted")
    
  const solvedSet = new Set(solvedData?.map((s: any) => s.problem_id) || [])
  
  return problems.map((p: any, idx: number) => ({
    id: p.id,
    title: p.title,
    difficulty: p.difficulty,
    number: idx + 1,
    isSolved: solvedSet.has(p.id)
  }))
}

// Fetch single problem details, testcases and past submissions for SPA transition
export async function getProblemDataSPA(problemId: string, userId: string) {
  const supabase = (await createServerClient()) as any

  const { data: problem, error } = await supabase
    .from("logiclab_problems")
    .select("*")
    .eq("id", problemId)
    .single()

  if (error || !problem) return null

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
      explanation: tc.explanation || "",
    }))

  const totalTestCases = parsedTestCases.length

  const { data: submissions } = await supabase
    .from("logiclab_problem_submissions")
    .select("id, status, language_id, runtime, memory, passed_count, total_count, created_at")
    .eq("problem_id", problemId)
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(20)

  const allProblems = await getCachedGlobalProblemsList()
  const currentIndex = allProblems.findIndex((p: any) => p.id === problemId)
  
  let prevProblemId = null
  let nextProblemId = null
  
  if (currentIndex > 0) {
    prevProblemId = (allProblems[currentIndex - 1] as any).id
  }
  if (currentIndex >= 0 && currentIndex < allProblems.length - 1) {
    nextProblemId = (allProblems[currentIndex + 1] as any).id
  }

  return {
    problem,
    sampleTestCases,
    totalTestCases,
    submissions: submissions || [],
    prevProblemId,
    nextProblemId
  }
}

// Cache daily challenge POTD metadata for 1 min
export const getCachedPotd = unstable_cache(
  async (todayStr: string) => {
    const adminSupabase = createAdminClient()
    const { data } = await (adminSupabase as any)
      .from("logiclab_daily_challenges")
      .select("id, problem_id, logiclab_problems ( id, title, difficulty )")
      .eq("date", todayStr)
      .single()
    return data
  },
  ["daily-potd-cache"],
  { revalidate: 60, tags: ["potd"] }
)

// Cache global problems and submission stats for 1 hour
export const getCachedGlobalProblems = unstable_cache(
  async () => {
    const adminSupabase = createAdminClient()
    
    const { data: problems } = await adminSupabase
      .from("logiclab_problems")
      .select("id, number, title, difficulty, tags, created_at")
      .order("number", { ascending: true })

    const { data: stats } = await adminSupabase
      .from("logiclab_problem_stats")
      .select("problem_id, total_submissions, accepted_submissions")

    return { problems: problems || [], stats: stats || [] }
  },
  ["global-problems-stats-cache-v2"],
  { revalidate: 3600 }
)

// Infinite scroll pagination for daily challenges history
export async function fetchDailyChallengesInfinite({
  userId,
  offset = 0,
  limit = 20,
  search = "",
  tab = "all",
  difficulty = "All",
  tag = "All",
  sortBy = "date-desc",
  todayStr,
}: {
  userId: string
  offset?: number
  limit?: number
  search?: string
  tab?: string
  difficulty?: string
  tag?: string
  sortBy?: string
  todayStr: string
}): Promise<{ challenges: any[]; hasMore: boolean }> {
  const supabase = (await createServerClient()) as any

  // Fetch all POTDs (excluding today)
  const { data: historyData, error } = await supabase
    .from("logiclab_daily_challenges")
    .select("id, date, problem_id, logiclab_problems ( id, number, title, difficulty, tags )")
    .neq("date", todayStr)
    .order("date", { ascending: false })

  if (error || !historyData) return { challenges: [], hasMore: false }

  // Fetch user submissions
  const problemIds = historyData.map((h: any) => h.problem_id)
  const { data: submissions } = await supabase
    .from("logiclab_daily_challenge_submissions")
    .select("problem_id, status")
    .eq("user_id", userId)
    .in("problem_id", problemIds)

  const solvedMap: Record<string, string> = {}
  for (const sub of submissions ?? []) {
    if (!solvedMap[sub.problem_id] || sub.status === "Accepted") {
      solvedMap[sub.problem_id] = sub.status
    }
  }

  // Enrich
  let enriched = historyData.map((h: any) => ({
    id: h.id,
    date: h.date,
    problem_id: h.problem_id,
    number: h.logiclab_problems?.number,
    title: h.logiclab_problems?.title || "Unknown Problem",
    difficulty: (h.logiclab_problems?.difficulty || "Medium") as "Easy" | "Medium" | "Hard",
    tags: (h.logiclab_problems?.tags || []) as string[],
    solved_status: solvedMap[h.problem_id] || null,
    total_submissions: 0,
    acceptance_rate: 0,
  }))

  // Apply filters
  if (search) {
    const q = search.toLowerCase()
    enriched = enriched.filter(
      (p: any) =>
        p.title.toLowerCase().includes(q) ||
        p.tags?.some((t: string) => t.toLowerCase().includes(q))
    )
  }
  if (difficulty !== "All") {
    enriched = enriched.filter((p: any) => p.difficulty === difficulty)
  }
  if (tag !== "All") {
    enriched = enriched.filter((p: any) => (p.tags || []).includes(tag))
  }
  if (tab === "solved") enriched = enriched.filter((p: any) => p.solved_status === "Accepted")
  else if (tab === "attempted") enriched = enriched.filter((p: any) => p.solved_status && p.solved_status !== "Accepted")
  else if (tab === "unsolved") enriched = enriched.filter((p: any) => !p.solved_status)

  // Apply sorting
  if (sortBy === "date-desc") {
    enriched.sort((a: any, b: any) => b.date.localeCompare(a.date))
  } else if (sortBy === "date-asc") {
    enriched.sort((a: any, b: any) => a.date.localeCompare(b.date))
  } else if (sortBy === "difficulty-asc") {
    const rank: Record<string, number> = { Easy: 1, Medium: 2, Hard: 3 }
    enriched.sort((a: any, b: any) => (rank[a.difficulty] || 0) - (rank[b.difficulty] || 0) || b.date.localeCompare(a.date))
  } else if (sortBy === "difficulty-desc") {
    const rank: Record<string, number> = { Easy: 1, Medium: 2, Hard: 3 }
    enriched.sort((a: any, b: any) => (rank[b.difficulty] || 0) - (rank[a.difficulty] || 0) || b.date.localeCompare(a.date))
  } else if (sortBy === "title-asc") {
    enriched.sort((a: any, b: any) => a.title.localeCompare(b.title) || b.date.localeCompare(a.date))
  } else if (sortBy === "title-desc") {
    enriched.sort((a: any, b: any) => b.title.localeCompare(a.title) || b.date.localeCompare(a.date))
  }

  const page = enriched.slice(offset, offset + limit)
  const hasMore = offset + limit < enriched.length

  return { challenges: page, hasMore }
}

