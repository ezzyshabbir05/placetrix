import { createClient as createServerClient } from "@/lib/supabase/server"
import { getUserProfile } from "@/lib/supabase/profile"
import { redirect } from "next/navigation"
import { LogicLabDashboardClient } from "./_components/LogicLabDashboardClient"
import { getCachedPotd } from "./actions"

export const metadata = {
  title: "LogicLab",
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


export default async function LogicLabPage() {
  const profile = await getUserProfile()
  if (!profile) redirect("/auth/login")

  if (profile.account_type !== "institute_candidate" && profile.account_type !== "admin") {
    redirect("/home")
  }

  const isAdmin = profile.account_type === "admin"
  if (isAdmin) redirect("/logiclab/admin")

  // 1. Fetch live user data (Lightning fast, paginated via Postgres RPC)
  const supabase = (await createServerClient()) as any
  const { data: initialProblemsData } = await supabase.rpc('get_paginated_problems', {
    p_user_id: profile.id,
    p_limit: 20,
    p_offset: 0,
    p_search: "",
    p_tab: "all",
    p_difficulty: "All",
    p_tag: "All",
    p_sort_by: "number-asc"
  })

  const enrichedProblems = initialProblemsData || []
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
  // Fetch global tags count via RPC
  const { data: tagsData } = await supabase.rpc('get_global_tags_count')
  const tagCounts: Record<string, number> = tagsData || {}
  const allTags = Object.keys(tagCounts).sort((a, b) => a.localeCompare(b))

  // Fetch global user stats via RPC
  const { data: statsData } = await supabase.rpc('get_user_global_stats', { p_user_id: profile.id })
  const globalStats = statsData || {
    total: 0, solved: 0,
    easy: { total: 0, solved: 0 },
    medium: { total: 0, solved: 0 },
    hard: { total: 0, solved: 0 }
  }

  const initialProblems = enrichedProblems
  const initialTotalCount = enrichedProblems.length > 0 ? Number(enrichedProblems[0].total_count) : 0
  const initialHasMore = initialTotalCount > 20

  // Fetch initial POTD directly from aggressively cached function
  let initialPotd = await getCachedPotd(todayStr);
  let fullPotdProblem = null;

  if (initialPotd) {
    const foundInEnriched = enrichedProblems.find((p: any) => p.id === (initialPotd as any).problem_id);
    if (foundInEnriched) {
      fullPotdProblem = { ...foundInEnriched };
    } else {
      // Fetch the problem details directly from the DB as it is not in the first 20 problems
      const { data: dbProblem } = await supabase
        .from("logiclab_problems")
        .select("id, number, title, difficulty, tags")
        .eq("id", initialPotd.problem_id)
        .maybeSingle();

      if (dbProblem) {
        const { data: statsRow } = await supabase
          .from("logiclab_problem_stats")
          .select("accepted_submissions, total_submissions")
          .eq("problem_id", initialPotd.problem_id)
          .maybeSingle();

        const totalSubmissions = statsRow?.total_submissions || 0;
        const acceptedSubmissions = statsRow?.accepted_submissions || 0;
        const acceptanceRate = totalSubmissions > 0 ? Math.round((acceptedSubmissions / totalSubmissions) * 100) : null;

        fullPotdProblem = {
          ...dbProblem,
          acceptance_rate: acceptanceRate,
          total_submissions: totalSubmissions,
        };
      }
    }
  }

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
      initialProblems={initialProblems}
      initialHasMore={initialHasMore}
      isAdmin={isAdmin}
      streakStats={streakStats}
      activityCalendar={activityCalendar}
      allTags={allTags}
      tagCounts={tagCounts}
      globalStats={globalStats}
      initialPotd={initialPotd}
      fullPotdProblem={fullPotdProblem}
      userId={profile.id}
    />
  )
}
