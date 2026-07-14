import { createClient as createServerClient } from "@/lib/supabase/server"
import { getUserProfile } from "@/lib/supabase/profile"
import { redirect } from "next/navigation"
import { DailyChallengesHistoryClient } from "../_components/DailyChallengesHistoryClient"
import { getCachedPotd, fetchDailyChallengesInfinite } from "../actions"

export const metadata = {
  title: "Daily Challenges — LogicLab",
  description: "Track your daily challenge progress and revisit past coding challenges.",
}

export default async function DailyChallengesPage() {
  const profile = await getUserProfile()
  if (!profile) redirect("/auth/login")

  if (profile.account_type !== "institute_candidate" && profile.account_type !== "admin") {
    redirect("/home")
  }

  const supabase = (await createServerClient()) as any

  // IST date computation
  const istOffset = 5.5 * 60 * 60 * 1000
  const today = new Date()
  const istDate = new Date(today.getTime() + istOffset)
  const todayStr = istDate.toISOString().split("T")[0]
  const yesterdayDate = new Date(istDate.getTime() - 24 * 60 * 60 * 1000)
  const yesterdayStr = yesterdayDate.toISOString().split("T")[0]

  // Heatmap cut-off date (last 20 weeks = 140 days)
  const cutOffDate20Weeks = new Date(istDate.getTime() - 140 * 24 * 60 * 60 * 1000)
  const cutOffStr20Weeks = cutOffDate20Weeks.toISOString().split("T")[0]

  // ── Fetch today's POTD ──
  const { data: potdRow } = await supabase
    .from("logiclab_daily_challenges")
    .select("id, date, problem_id, logiclab_problems ( id, number, title, difficulty, tags )")
    .eq("date", todayStr)
    .single()

  let currentPotd = null
  if (potdRow) {
    const pId = potdRow.problem_id
    const { data: potdSub } = await supabase
      .from("logiclab_daily_challenge_submissions")
      .select("problem_id, status")
      .eq("user_id", profile.id)
      .eq("problem_id", pId)

    const potdStatus = potdSub?.find((s: any) => s.status === "Accepted")?.status
      || potdSub?.[0]?.status
      || null

    let statsRow = null
    const { data: statsData } = await supabase
      .from("logiclab_problem_stats")
      .select("total_submissions, accepted_submissions")
      .eq("problem_id", pId)
      .maybeSingle()
    if (statsData) statsRow = statsData

    const totalSubmissions = statsRow?.total_submissions || 0
    const acceptedSubmissions = statsRow?.accepted_submissions || 0
    const acceptanceRate = totalSubmissions > 0 ? Math.round((acceptedSubmissions / totalSubmissions) * 100) : null

    currentPotd = {
      id: potdRow.id,
      date: potdRow.date,
      problem_id: pId,
      number: potdRow.logiclab_problems?.number,
      title: potdRow.logiclab_problems?.title || "Unknown Problem",
      difficulty: (potdRow.logiclab_problems?.difficulty || "Medium") as "Easy" | "Medium" | "Hard",
      tags: (potdRow.logiclab_problems?.tags || []) as string[],
      solved_status: potdStatus,
      total_submissions: totalSubmissions,
      acceptance_rate: acceptanceRate || 0,
    }
  }

  // ── Fetch first page of past challenges ──
  const LIMIT = 20
  const { challenges: initialChallenges, hasMore: initialHasMore } = await fetchDailyChallengesInfinite({
    userId: profile.id,
    offset: 0,
    limit: LIMIT,
    search: "",
    tab: "all",
    difficulty: "All",
    tag: "All",
    sortBy: "date-desc",
    todayStr,
  })

  // ── Activity heatmap data (20 weeks) ──
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
    uniqueDatesWithStatus.set(row.activity_date, {
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

  // ── Streak calculation ──
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

  // ── Build 140-day activity calendar ──
  const activityCalendar: any[] = []
  const daysToGenerate = 140
  for (let i = daysToGenerate - 1; i >= 0; i--) {
    const d = new Date(istDate.getTime() - i * 24 * 60 * 60 * 1000)
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

  // ── Derive unique tags from ALL history (not just current page) ──
  const { data: allHistoryData } = await supabase
    .from("logiclab_daily_challenges")
    .select("problem_id, logiclab_problems ( tags )")
    .neq("date", todayStr)

  const tagCounts: Record<string, number> = {}
  const allTagsSet = new Set<string>()
  for (const h of allHistoryData ?? []) {
    for (const t of h.logiclab_problems?.tags || []) {
      const trimmed = t.trim()
      allTagsSet.add(trimmed)
      tagCounts[trimmed] = (tagCounts[trimmed] || 0) + 1
    }
  }
  const allTags = Array.from(allTagsSet).sort((a, b) => a.localeCompare(b))

  // Fetch today's POTD via cached function
  const initialPotd = await getCachedPotd(todayStr)

  return (
    <DailyChallengesHistoryClient
      initialChallenges={initialChallenges}
      initialHasMore={initialHasMore}
      currentPotd={currentPotd}
      initialPotd={initialPotd}
      streakStats={streakStats}
      activityCalendar={activityCalendar}
      allTags={allTags}
      tagCounts={tagCounts}
      userId={profile.id}
      todayStr={todayStr}
      pageLimit={LIMIT}
    />
  )
}
