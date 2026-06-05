import { createClient } from "@/lib/supabase/server"
import { getUserProfile } from "@/lib/supabase/profile"
import { redirect } from "next/navigation"
import { ProblemsDirectoryClient } from "./ProblemsDirectoryClient"

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

// Helper to format Date to local YYYY-MM-DD
function toLocalYYYYMMDD(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export default async function LogicLabPage(props: {
  searchParams: Promise<SearchParams>
}) {
  const profile = await getUserProfile()
  if (!profile) redirect("/auth/login")

  const isAdmin = profile.account_type === "admin" || profile.account_type === "institute"
  if (isAdmin) redirect("/~/logiclab/admin")

  const params = await props.searchParams
  const page = Math.max(1, parseInt(params.page || "1", 10))
  const size = Math.max(1, parseInt(params.size || "10", 10))
  const search = params.search || ""
  const tab = params.tab || "all"
  const difficulty = params.difficulty || "All"
  const tag = params.tag || "All"

  const supabase = (await createClient()) as any

  // Fetch all problems
  const { data: problems } = await (supabase as any)
    .from("coding_problems")
    .select("id, title, difficulty, tags, created_at")
    .order("created_at", { ascending: true })

  // Fetch user's submission stats (best status per problem)
  const { data: submissions } = await (supabase as any)
    .from("coding_submissions")
    .select("problem_id, status")
    .eq("user_id", profile.id)

  // Build a map: problem_id -> best status
  const solvedMap: Record<string, string> = {}
  for (const sub of submissions ?? []) {
    if (!solvedMap[sub.problem_id] || sub.status === "Accepted") {
      solvedMap[sub.problem_id] = sub.status
    }
  }

  // Count total submissions per problem for acceptance rate
  const { data: allSubmissions } = await (supabase as any)
    .from("coding_submissions")
    .select("problem_id, status")

  const statsMap: Record<string, { total: number; accepted: number }> = {}
  for (const sub of allSubmissions ?? []) {
    if (!statsMap[sub.problem_id]) statsMap[sub.problem_id] = { total: 0, accepted: 0 }
    statsMap[sub.problem_id].total++
    if (sub.status === "Accepted") statsMap[sub.problem_id].accepted++
  }

  const enrichedProblems = (problems ?? []).map((p: any) => ({
    id: p.id,
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

  // Fetch all submissions for the logged in user to calculate streak & calendar
  const { data: userSubmissions } = await (supabase as any)
    .from("coding_submissions")
    .select("status, created_at")
    .eq("user_id", profile.id)
    .order("created_at", { ascending: true })

  // Calculate unique dates of submissions and their statuses
  const uniqueDatesWithStatus = new Map<string, { solved: boolean; attempted: boolean; count: number }>()
  
  for (const sub of userSubmissions ?? []) {
    if (!sub.created_at) continue
    const localDate = new Date(sub.created_at)
    const dateStr = toLocalYYYYMMDD(localDate)
    const isAccepted = sub.status === "Accepted"
    
    const existing = uniqueDatesWithStatus.get(dateStr) || { solved: false, attempted: false, count: 0 }
    existing.count++
    if (isAccepted) {
      existing.solved = true
    } else {
      existing.attempted = true
    }
    uniqueDatesWithStatus.set(dateStr, existing)
  }

  // Calculate streak
  const sortedDates = Array.from(uniqueDatesWithStatus.keys()).sort((a, b) => b.localeCompare(a))
  
  let currentStreak = 0
  let maxStreak = 0
  
  const today = new Date()
  const todayStr = toLocalYYYYMMDD(today)
  
  const yesterday = new Date()
  yesterday.setDate(today.getDate() - 1)
  const yesterdayStr = toLocalYYYYMMDD(yesterday)

  const hasActiveStreak = uniqueDatesWithStatus.has(todayStr) || uniqueDatesWithStatus.has(yesterdayStr)

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
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
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
      const checkDate = uniqueDatesWithStatus.has(todayStr) ? new Date(today) : new Date(yesterday)
      let checkStr = toLocalYYYYMMDD(checkDate)
      
      while (uniqueDatesWithStatus.has(checkStr)) {
        currentStreak++
        checkDate.setDate(checkDate.getDate() - 1)
        checkStr = toLocalYYYYMMDD(checkDate)
      }
    }
  }

  if (currentStreak > maxStreak) maxStreak = currentStreak
  const streakStats = { currentStreak, maxStreak }

  const activityCalendar: any[] = []
  const daysToGenerate = 182 // 26 weeks * 7 days
  for (let i = daysToGenerate - 1; i >= 0; i--) {
    const d = new Date()
    d.setDate(today.getDate() - i)
    const dateStr = toLocalYYYYMMDD(d)
    const activity = uniqueDatesWithStatus.get(dateStr)
    activityCalendar.push({
      date: dateStr,
      count: activity?.count || 0,
      status: activity?.solved ? "solved" : activity?.attempted ? "attempted" : "none",
      dayOfWeek: d.getDay()
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

  return (
    <ProblemsDirectoryClient
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
    />
  )
}
