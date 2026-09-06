import { createClient } from "@/lib/supabase/client"
import type { CalendarCell } from "@/app/(dashboard)/(licensed)/logiclab/_components/LogicLabStatsCards"

export interface Problem {
  id: string
  number?: number | null
  title: string
  difficulty: "Easy" | "Medium" | "Hard"
  tags: string[]
  created_at: string
  solved_status: string | null
  acceptance_rate: number | null
  total_submissions: number
  total_count?: number
}

export interface LogicLabDashboardData {
  problems: Problem[]
  hasMore: boolean
  totalCount: number
  globalStats: {
    total: number
    solved: number
    easy: { total: number; solved: number }
    medium: { total: number; solved: number }
    hard: { total: number; solved: number }
  }
  allTags: string[]
  tagCounts: Record<string, number>
  streakStats: {
    currentStreak: number
    maxStreak: number
  }
  activityCalendar: CalendarCell[]
  initialPotd: any | null
  fullPotdProblem: any | null
}

/**
 * Direct Client Fetcher: Paginated and Filtered Problems List
 * Calls RPC `get_paginated_problems` directly from the browser SDK.
 * 0 Cloud Run vCPU time.
 */
export async function fetchProblemsDirectClient({
  userId,
  offset = 0,
  limit = 20,
  search = "",
  tab = "all",
  difficulty = "All",
  tag = "All",
  company = "All",
  trackNumbers,
  sortBy = "number-asc",
}: {
  userId: string
  offset?: number
  limit?: number
  search?: string
  tab?: string
  difficulty?: string
  tag?: string
  company?: string
  trackNumbers?: number[]
  sortBy?: string
}): Promise<{ problems: Problem[]; hasMore: boolean; totalCount: number }> {
  const supabase = createClient() as any
  const effectiveTag = tag !== "All" ? tag : (company !== "All" ? company : "All")

  // Fast RPC path
  if ((!trackNumbers || trackNumbers.length === 0) && (tag === "All" || company === "All")) {
    const { data, error } = await supabase.rpc("get_paginated_problems", {
      p_user_id: userId || null,
      p_limit: limit,
      p_offset: offset,
      p_search: search,
      p_tab: tab,
      p_difficulty: difficulty,
      p_tag: effectiveTag,
      p_sort_by: sortBy,
    })

    if (!error && data) {
      const totalCount = data.length > 0 ? Number(data[0].total_count) : 0
      const hasMore = offset + limit < totalCount
      return { problems: data as Problem[], hasMore, totalCount }
    }
  }

  // Fallback direct query (e.g. for track problem numbers or combinations)
  let query = supabase
    .from("logiclab_problems")
    .select("id, number, title, difficulty, tags, created_at")

  if (trackNumbers && trackNumbers.length > 0) {
    query = query.in("number", trackNumbers)
  }
  if (search) {
    query = query.ilike("title", `%${search}%`)
  }
  if (difficulty && difficulty !== "All") {
    query = query.eq("difficulty", difficulty)
  }
  if (tag && tag !== "All") {
    query = query.contains("tags", [tag])
  }
  if (company && company !== "All") {
    query = query.contains("tags", [company])
  }

  query = query.order("number", { ascending: sortBy !== "number-desc" })

  const { data: rawProblems, error: fallErr } = await query

  if (fallErr || !rawProblems) {
    console.error("[fetchProblemsDirectClient] Fallback error:", fallErr)
    return { problems: [], hasMore: false, totalCount: 0 }
  }

  let filteredProblems = rawProblems

  if (tab !== "all" && userId) {
    if (tab === "solved" || tab === "unsolved") {
      const { data: solved } = await supabase
        .from("logiclab_user_solved_problems")
        .select("problem_id")
        .eq("user_id", userId)
      const solvedIds = new Set(solved?.map((s: any) => s.problem_id) || [])

      if (tab === "solved") {
        filteredProblems = filteredProblems.filter((p: any) => solvedIds.has(p.id))
      } else {
        filteredProblems = filteredProblems.filter((p: any) => !solvedIds.has(p.id))
      }
    } else if (tab === "attempted") {
      const [{ data: solved }, { data: attempted }] = await Promise.all([
        supabase.from("logiclab_user_solved_problems").select("problem_id").eq("user_id", userId),
        supabase.from("logiclab_problem_submissions").select("problem_id").eq("user_id", userId),
      ])
      const solvedIds = new Set(solved?.map((s: any) => s.problem_id) || [])
      const attemptedIds = new Set(attempted?.map((a: any) => a.problem_id) || [])
      filteredProblems = filteredProblems.filter(
        (p: any) => attemptedIds.has(p.id) && !solvedIds.has(p.id)
      )
    }
  }

  const totalCount = filteredProblems.length
  const paginated = filteredProblems.slice(offset, offset + limit)
  const hasMore = offset + limit < totalCount

  return {
    problems: paginated as Problem[],
    hasMore,
    totalCount,
  }
}

/**
 * Direct Client Fetcher: Complete LogicLab Dashboard Data
 * Executes in parallel directly from the browser to Supabase Postgres.
 * 0 Cloud Run vCPU time.
 */
export async function fetchLogicLabDashboardData(userId: string): Promise<LogicLabDashboardData> {
  const supabase = createClient() as any
  const today = new Date()
  const todayStr = today.toISOString().split("T")[0]
  const yesterdayDate = new Date(today.getTime() - 24 * 60 * 60 * 1000)
  const yesterdayStr = yesterdayDate.toISOString().split("T")[0]
  const cutOffDate20Weeks = new Date(today.getTime() - 140 * 24 * 60 * 60 * 1000)
  const cutOffStr20Weeks = cutOffDate20Weeks.toISOString().split("T")[0]

  const [
    problemsRes,
    tagsRes,
    statsRes,
    potdRes,
    userStatsRes,
    activityRes,
    overridesRes,
  ] = await Promise.all([
    fetchProblemsDirectClient({
      userId,
      limit: 20,
      offset: 0,
      search: "",
      tab: "all",
      difficulty: "All",
      tag: "All",
      sortBy: "number-asc",
    }),
    supabase.rpc("get_global_tags_count"),
    supabase.rpc("get_user_global_stats", { p_user_id: userId }),
    supabase
      .from("logiclab_daily_challenges")
      .select("id, date, problem_id, logiclab_problems(id, number, title, difficulty, tags)")
      .eq("date", todayStr)
      .maybeSingle(),
    supabase
      .from("logiclab_user_stats")
      .select("current_streak, longest_streak")
      .eq("user_id", userId)
      .maybeSingle(),
    supabase
      .from("logiclab_daily_challenge_user_activity")
      .select("activity_date, submission_count, solved, easy_solved, medium_solved, hard_solved, easy_attempted, medium_attempted, hard_attempted")
      .eq("user_id", userId)
      .gte("activity_date", cutOffStr20Weeks)
      .order("activity_date", { ascending: true }),
    supabase
      .from("user_streak_overrides")
      .select("activity_date")
      .eq("user_id", userId)
      .gte("activity_date", cutOffStr20Weeks),
  ])

  // Process Tags
  const tagCounts: Record<string, number> = tagsRes.data || {}
  const allTags = Object.keys(tagCounts).sort((a, b) => a.localeCompare(b))

  // Process Global Stats
  const globalStats = statsRes.data || {
    total: 0,
    solved: 0,
    easy: { total: 0, solved: 0 },
    medium: { total: 0, solved: 0 },
    hard: { total: 0, solved: 0 },
  }

  // Process POTD
  const initialPotd = potdRes.data || null
  let fullPotdProblem = null
  if (initialPotd?.problem_id) {
    const found = (problemsRes.problems || []).find((p) => p.id === initialPotd.problem_id)
    if (found) {
      fullPotdProblem = found
    } else if (initialPotd.logiclab_problems) {
      fullPotdProblem = initialPotd.logiclab_problems
    }
  }

  // Process Activity and Streaks
  const uniqueDatesWithStatus = new Map<string, any>()
  const allActiveDates = new Map<string, boolean>()

  for (const row of activityRes.data || []) {
    const dateStr = row.activity_date
    const isSolved = !!row.solved
    const count = Number(row.submission_count || 0)

    uniqueDatesWithStatus.set(dateStr, {
      solved: isSolved,
      attempted: !isSolved && count > 0,
      count,
      easy_solved: Number(row.easy_solved || 0),
      medium_solved: Number(row.medium_solved || 0),
      hard_solved: Number(row.hard_solved || 0),
      easy_attempted: Number(row.easy_attempted || 0),
      medium_attempted: Number(row.medium_attempted || 0),
      hard_attempted: Number(row.hard_attempted || 0),
    })

    if (isSolved || count > 0) {
      allActiveDates.set(dateStr, true)
    }
  }

  // Incorporate streak overrides
  for (const ov of overridesRes.data || []) {
    if (!ov.activity_date) continue
    const dateStr = String(ov.activity_date).split("T")[0]
    allActiveDates.set(dateStr, true)
    if (!uniqueDatesWithStatus.has(dateStr)) {
      uniqueDatesWithStatus.set(dateStr, {
        solved: true,
        attempted: true,
        count: 1,
        easy_solved: 0,
        medium_solved: 1,
        hard_solved: 0,
        easy_attempted: 0,
        medium_attempted: 1,
        hard_attempted: 0,
      })
    } else {
      const state = uniqueDatesWithStatus.get(dateStr)
      state.solved = true
      if (state.count === 0) state.count = 1
    }
  }

  // Calculate Streaks
  const sortedDates = Array.from(allActiveDates.keys()).sort((a, b) => b.localeCompare(a))
  let currentStreak = 0
  let maxStreak = 0

  if (sortedDates.length > 0) {
    const ascDates = [...sortedDates].reverse()
    let prevDate: Date | null = null
    let tempStreak = 0

    for (const dStr of ascDates) {
      const currentDate = new Date(dStr)
      if (!prevDate) {
        tempStreak = 1
      } else {
        const diffTime = Math.abs(currentDate.getTime() - prevDate.getTime())
        const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24))
        if (diffDays <= 1) {
          tempStreak++
        } else {
          if (tempStreak > maxStreak) maxStreak = tempStreak
          tempStreak = 1
        }
      }
      prevDate = currentDate
    }
    if (tempStreak > maxStreak) maxStreak = tempStreak

    const hasActiveStreak = allActiveDates.has(todayStr) || allActiveDates.has(yesterdayStr)
    if (hasActiveStreak) {
      const checkDate = allActiveDates.has(todayStr) ? new Date(today) : new Date(yesterdayDate)
      let checkStr = checkDate.toISOString().split("T")[0]
      while (allActiveDates.has(checkStr)) {
        currentStreak++
        checkDate.setDate(checkDate.getDate() - 1)
        checkStr = checkDate.toISOString().split("T")[0]
      }
    }
  }

  const dbStats = userStatsRes.data
  if (dbStats) {
    if (typeof dbStats.current_streak === "number" && dbStats.current_streak > currentStreak) {
      currentStreak = dbStats.current_streak
    }
    if (typeof dbStats.longest_streak === "number" && dbStats.longest_streak > maxStreak) {
      maxStreak = dbStats.longest_streak
    }
  }

  // Generate 140-day Activity Calendar
  const activityCalendar: CalendarCell[] = []
  const daysToGenerate = 140
  for (let i = daysToGenerate - 1; i >= 0; i--) {
    const d = new Date(today.getTime() - i * 24 * 60 * 60 * 1000)
    const dateStr = d.toISOString().split("T")[0]
    const activity = uniqueDatesWithStatus.get(dateStr)
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
    })
  }

  return {
    problems: problemsRes.problems,
    hasMore: problemsRes.hasMore,
    totalCount: problemsRes.totalCount,
    globalStats,
    allTags,
    tagCounts,
    streakStats: { currentStreak, maxStreak },
    activityCalendar,
    initialPotd,
    fullPotdProblem,
  }
}
