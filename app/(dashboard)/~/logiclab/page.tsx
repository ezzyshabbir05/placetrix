import { createClient } from "@/lib/supabase/server"
import { getUserProfile } from "@/lib/supabase/profile"
import { redirect } from "next/navigation"
import { ProblemsDirectoryClient } from "./ProblemsDirectoryClient"

export const metadata = {
  title: "LogicLab — Coding Problems",
  description: "Solve coding challenges, practice algorithms, and sharpen your programming skills.",
}

export default async function LogicLabPage() {
  const profile = await getUserProfile()
  if (!profile) redirect("/auth/login")

  const isAdmin = profile.account_type === "admin" || profile.account_type === "institute"
  if (isAdmin) redirect("/~/logiclab/admin")

  const supabase = (await createClient()) as any

  // Fetch all problems
  const { data: problems, error } = await supabase
    .from("coding_problems")
    .select("id, title, difficulty, tags, created_at")
    .order("created_at", { ascending: false })

  // Fetch user's submission stats (best status per problem)
  const { data: submissions } = await supabase
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
  const { data: allSubmissions } = await supabase
    .from("coding_submissions")
    .select("problem_id, status")

  const statsMap: Record<string, { total: number; accepted: number }> = {}
  for (const sub of allSubmissions ?? []) {
    if (!statsMap[sub.problem_id]) statsMap[sub.problem_id] = { total: 0, accepted: 0 }
    statsMap[sub.problem_id].total++
    if (sub.status === "Accepted") statsMap[sub.problem_id].accepted++
  }

  const enrichedProblems = (problems ?? []).map((p: any) => ({
    ...p,
    solved_status: solvedMap[p.id] || null,
    acceptance_rate: statsMap[p.id]
      ? Math.round((statsMap[p.id].accepted / statsMap[p.id].total) * 100)
      : null,
    total_submissions: statsMap[p.id]?.total || 0,
  }))

  // Fetch all submissions for the logged in user to calculate streak & calendar
  const { data: userSubmissions } = await supabase
    .from("coding_submissions")
    .select("status, created_at")
    .eq("user_id", profile.id)
    .order("created_at", { ascending: true })

  // Calculate unique dates of submissions and their statuses
  const uniqueDatesWithStatus = new Map<string, { solved: boolean; attempted: boolean }>()
  
  for (const sub of userSubmissions ?? []) {
    if (!sub.created_at) continue
    const dateStr = sub.created_at.split("T")[0] // YYYY-MM-DD
    const isAccepted = sub.status === "Accepted"
    
    const existing = uniqueDatesWithStatus.get(dateStr) || { solved: false, attempted: false }
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
  const todayStr = today.toISOString().split("T")[0]
  
  const yesterday = new Date()
  yesterday.setDate(today.getDate() - 1)
  const yesterdayStr = yesterday.toISOString().split("T")[0]

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
      let checkStr = checkDate.toISOString().split("T")[0]
      
      while (uniqueDatesWithStatus.has(checkStr)) {
        currentStreak++
        checkDate.setDate(checkDate.getDate() - 1)
        checkStr = checkDate.toISOString().split("T")[0]
      }
    }
  }

  if (currentStreak > maxStreak) maxStreak = currentStreak
  const streakStats = { currentStreak, maxStreak }

  // Generate exactly 84 days ending on current week's Saturday (or ending today) aligned to start on a Sunday
  const activityCalendar = []
  const startCal = new Date(today)
  startCal.setDate(today.getDate() - ((11 * 7) + today.getDay()))
  
  for (let i = 0; i < 84; i++) {
    const current = new Date(startCal)
    current.setDate(startCal.getDate() + i)
    
    const year = current.getFullYear()
    const month = String(current.getMonth() + 1).padStart(2, '0')
    const day = String(current.getDate()).padStart(2, '0')
    const dateStr = `${year}-${month}-${day}`
    
    const daySubmissions = (userSubmissions ?? []).filter((sub: any) => {
      if (!sub.created_at) return false
      return sub.created_at.split("T")[0] === dateStr
    })
    
    const count = daySubmissions.length
    let status: "none" | "attempted" | "solved" = "none" as const
    if (count > 0) {
      const hasSolved = daySubmissions.some((sub: any) => sub.status === "Accepted")
      status = hasSolved ? ("solved" as const) : ("attempted" as const)
    }
    
    activityCalendar.push({
      date: dateStr,
      count,
      status,
      dayOfWeek: current.getDay()
    })
  }

  return (
    <ProblemsDirectoryClient
      problems={enrichedProblems}
      isAdmin={isAdmin}
      streakStats={streakStats}
      activityCalendar={activityCalendar}
    />
  )
}
