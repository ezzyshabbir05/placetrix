import { createClient as createServerClient } from "@/lib/supabase/server"
import { getUserProfile } from "@/lib/supabase/profile"
import { redirect } from "next/navigation"
import { LogicLabDashboardClient } from "./_components/LogicLabDashboardClient"
import { getCachedPotd, getCachedGlobalProblems } from "./actions"

export const metadata = {
  title: "LogicLab — Coding Problems",
  description: "Solve coding challenges, practice algorithms, and sharpen your programming skills.",
}

interface SearchParams {
  page?: string
  size?: string
  search?: string
  tab?: string
  difficulty?: string
  tag?: string
}

// Helper to format Date/String to IST YYYY-MM-DD
function toIstYYYYMMDD(dateInput: Date | string) {
  const date = typeof dateInput === "string" ? new Date(dateInput) : dateInput
  const istOffset = 5.5 * 60 * 60 * 1000
  const istDate = new Date(date.getTime() + istOffset)
  return istDate.toISOString().split("T")[0]
}


export default async function LogicLabPage(props: {
  searchParams: Promise<SearchParams>
}) {
  const profile = await getUserProfile()
  if (!profile) redirect("/auth/login")

  const isAdmin = profile.account_type === "admin"
  if (isAdmin) redirect("/logiclab/admin")

  const params = await props.searchParams
  const page = Math.max(1, parseInt(params.page || "1", 10))
  const size = Math.max(20, parseInt(params.size || "20", 10))
  const search = params.search || ""
  const tab = params.tab || "all"
  const difficulty = params.difficulty || "All"
  const tag = params.tag || "All"

  // 1. Fetch cached global data (0ms, no database load)
  const { problems, stats: globalStatsRaw } = await getCachedGlobalProblems()

  // 2. Fetch live user data (Lightning fast, filtered by user_id)
  const supabase = (await createServerClient()) as any
  const { data: submissions } = await supabase
    .from("logiclab_problem_submissions")
    .select("problem_id, status")
    .eq("user_id", profile.id)

  // Build a map: problem_id -> best status
  const solvedMap: Record<string, string> = {}
  for (const sub of submissions ?? []) {
    if (!solvedMap[sub.problem_id] || sub.status === "Accepted") {
      solvedMap[sub.problem_id] = sub.status
    }
  }

  // Build a map for acceptance rates using the new View
  const statsMap: Record<string, { total: number; accepted: number }> = {}
  for (const row of globalStatsRaw as any[]) {
    statsMap[row.problem_id] = { 
      total: Number(row.total_submissions), 
      accepted: Number(row.accepted_submissions) 
    }
  }

  const enrichedProblems = (problems ?? []).map((p: any) => ({
    id: p.id,
    number: p.number,
    title: p.title,
    difficulty: p.difficulty as "Easy" | "Medium" | "Hard",
    tags: (p.tags || []) as string[],
    created_at: p.created_at,
    solved_status: solvedMap[p.id] || null,
    acceptance_rate: statsMap[p.id]
      ? Math.round((statsMap[p.id].accepted / statsMap[p.id].total) * 100)
      : null,
    total_submissions: statsMap[p.id]?.total || 0,
  }))
  // Force POTD & Streaks to use IST (+5.5 hours)
  const istOffset = 5.5 * 60 * 60 * 1000
  const today = new Date()
  const istDate = new Date(today.getTime() + istOffset)
  const todayStr = istDate.toISOString().split("T")[0]
  
  const yesterdayDate = new Date(istDate.getTime() - (24 * 60 * 60 * 1000))
  const yesterdayStr = yesterdayDate.toISOString().split("T")[0]

  // Heatmap cut-off date (last 20 weeks = 140 days)
  const cutOffDate20Weeks = new Date(istDate.getTime() - (140 * 24 * 60 * 60 * 1000))
  const cutOffStr20Weeks = cutOffDate20Weeks.toISOString().split("T")[0]

  // 1. Fetch aggregated daily activity for the 20-week heatmap
  const { data: activityRows } = await (supabase as any)
    .from("logiclab_daily_challenge_user_activity")
    .select("activity_date, submission_count, solved, easy_solved, medium_solved, hard_solved, easy_attempted, medium_attempted, hard_attempted")
    .eq("user_id", profile.id)
    .gte("activity_date", cutOffStr20Weeks)
    .order("activity_date", { ascending: true })

  const uniqueDatesWithStatus = new Map<string, {
    solved: boolean
    attempted: boolean
    count: number
    easy_solved: number
    medium_solved: number
    hard_solved: number
    easy_attempted: number
    medium_attempted: number
    hard_attempted: number
  }>()

  for (const row of activityRows ?? []) {
    if (!row.activity_date) continue
    const dateStr = row.activity_date
    uniqueDatesWithStatus.set(dateStr, {
      solved: !!row.solved,
      attempted: !row.solved && row.submission_count > 0,
      count: Number(row.submission_count),
      easy_solved: Number(row.easy_solved || 0),
      medium_solved: Number(row.medium_solved || 0),
      hard_solved: Number(row.hard_solved || 0),
      easy_attempted: Number(row.easy_attempted || 0),
      medium_attempted: Number(row.medium_attempted || 0),
      hard_attempted: Number(row.hard_attempted || 0),
    })
  }

  // 2. Fetch all activity dates (without date limits) to calculate streaks accurately across any length of time
  const { data: streakRows } = await (supabase as any)
    .from("logiclab_daily_challenge_user_activity")
    .select("activity_date, solved")
    .eq("user_id", profile.id)
    .order("activity_date", { ascending: true })

  const allActiveDates = new Map<string, { solved: boolean }>()
  for (const row of streakRows ?? []) {
    if (!row.activity_date) continue
    allActiveDates.set(row.activity_date, { solved: !!row.solved })
  }

  const sortedDates = Array.from(allActiveDates.keys()).sort((a, b) => b.localeCompare(a))
  
  let currentStreak = 0
  let maxStreak = 0

  const hasActiveStreak = allActiveDates.has(todayStr) || allActiveDates.has(yesterdayStr)

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

    if (hasActiveStreak) {
      const checkDate = allActiveDates.has(todayStr) ? new Date(istDate) : new Date(yesterdayDate)
      let checkStr = checkDate.toISOString().split("T")[0]
      
      while (allActiveDates.has(checkStr)) {
        currentStreak++
        checkDate.setUTCDate(checkDate.getUTCDate() - 1)
        checkStr = checkDate.toISOString().split("T")[0]
      }
    }
  }

  if (currentStreak > maxStreak) maxStreak = currentStreak
  const streakStats = { currentStreak, maxStreak }

  const activityCalendar: any[] = []
  const daysToGenerate = 140 // 20 weeks * 7 days
  for (let i = daysToGenerate - 1; i >= 0; i--) {
    const d = new Date(istDate.getTime() - (i * 24 * 60 * 60 * 1000))
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
  // Derive unique tags and counts from all enriched problems
  const tagCounts: Record<string, number> = {}
  const allTagsSet = new Set<string>()
  for (const p of enrichedProblems) {
    for (const t of p.tags || []) {
      const trimmed = t.trim()
      allTagsSet.add(trimmed)
      tagCounts[trimmed] = (tagCounts[trimmed] || 0) + 1
    }
  }
  const allTags = Array.from(allTagsSet).sort((a, b) => a.localeCompare(b))

  // Filter problems based on query params
  const filteredProblems = enrichedProblems.filter((p: any) => {
    const matchesSearch = !search || p.title.toLowerCase().includes(search.toLowerCase()) ||
      p.tags?.some((t: string) => t.toLowerCase().includes(search.toLowerCase()))
    const matchesDifficulty = difficulty === "All" || p.difficulty === difficulty
    const matchesTag = tag === "All" || (p.tags || []).includes(tag)
    return matchesSearch && matchesDifficulty && matchesTag
  })

  // Compute tab counts based on filtered subset (excluding tab filter itself)
  const tabCounts = {
    all: filteredProblems.length,
    solved: filteredProblems.filter((p: any) => p.solved_status === "Accepted").length,
    attempted: filteredProblems.filter((p: any) => p.solved_status && p.solved_status !== "Accepted").length,
    unsolved: filteredProblems.filter((p: any) => !p.solved_status).length,
  }

  // Apply active tab filtering
  const activeTab = ["all", "solved", "attempted", "unsolved"].includes(tab) ? tab : "all"
  const finalFiltered = filteredProblems.filter((p: any) => {
    if (activeTab === "solved") return p.solved_status === "Accepted"
    if (activeTab === "attempted") return p.solved_status && p.solved_status !== "Accepted"
    if (activeTab === "unsolved") return !p.solved_status
    return true
  })

  // Paginate list
  const totalCount = finalFiltered.length
  const from = (page - 1) * size
  const to = page * size
  const paginatedProblems = finalFiltered.slice(from, to)

  const globalStats = {
    total: enrichedProblems.length,
    solved: enrichedProblems.filter((p: any) => p.solved_status === "Accepted").length,
    easy: {
      total: enrichedProblems.filter((p: any) => p.difficulty === "Easy").length,
      solved: enrichedProblems.filter((p: any) => p.difficulty === "Easy" && p.solved_status === "Accepted").length,
    },
    medium: {
      total: enrichedProblems.filter((p: any) => p.difficulty === "Medium").length,
      solved: enrichedProblems.filter((p: any) => p.difficulty === "Medium" && p.solved_status === "Accepted").length,
    },
    hard: {
      total: enrichedProblems.filter((p: any) => p.difficulty === "Hard").length,
      solved: enrichedProblems.filter((p: any) => p.difficulty === "Hard" && p.solved_status === "Accepted").length,
    },
  }



  // Fetch initial POTD directly from aggressively cached function
  let initialPotd = await getCachedPotd(todayStr);
  let fullPotdProblem = initialPotd ? enrichedProblems.find((p: any) => p.id === (initialPotd as any).problem_id) : null;

  if (fullPotdProblem && initialPotd) {
    const { data: potdSub } = await supabase
      .from("logiclab_daily_challenge_submissions")
      .select("status")
      .eq("user_id", profile.id)
      .eq("problem_id", initialPotd.problem_id)
      .eq("status", "Accepted")
      .limit(1)
    
    fullPotdProblem = {
      ...fullPotdProblem,
      solved_status: (potdSub && potdSub.length > 0) ? "Accepted" : null
    }
  }

  return (
    <LogicLabDashboardClient
      problems={paginatedProblems}
      isAdmin={isAdmin}
      streakStats={streakStats}
      activityCalendar={activityCalendar}
      initialPage={page}
      initialPageSize={size}
      initialSearch={search}
      initialTab={activeTab}
      initialDifficulty={difficulty}
      initialTag={tag}
      totalCount={totalCount}
      tabCounts={tabCounts}
      allTags={allTags}
      tagCounts={tagCounts}
      globalStats={globalStats}
      initialPotd={initialPotd}
      fullPotdProblem={fullPotdProblem}
    />
  )
}
