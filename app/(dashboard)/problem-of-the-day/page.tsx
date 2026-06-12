import { createClient as createServerClient } from "@/lib/supabase/server"
import { getUserProfile } from "@/lib/supabase/profile"
import { redirect } from "next/navigation"
import { PotdPageClient } from "./PotdPageClient"

export const metadata = {
  title: "Problem of the Day History",
  description: "Track your daily challenge progress.",
}

export default async function PotdHistoryPage() {
  const profile = await getUserProfile()
  if (!profile) redirect("/auth/login")

  const supabase = (await createServerClient()) as any

  // Fetch all POTDs
  const { data: historyData, error } = await supabase
    .from("daily_challenges")
    .select("date, problem_id, coding_problems ( id, title, difficulty )")
    .order("date", { ascending: false })

  if (error || !historyData) {
    return <div className="p-8 text-center text-rose-500">Failed to load history.</div>
  }

  // Fetch all submissions for these problems by the user
  const problemIds = historyData.map((h: any) => h.problem_id)
  const { data: submissions } = await supabase
    .from("coding_submissions")
    .select("problem_id, status")
    .eq("user_id", profile.id)
    .in("problem_id", problemIds)

  // Fetch acceptance rates for these problems
  const { data: allSubmissions } = await supabase
    .from("coding_submissions")
    .select("problem_id, status")
    .in("problem_id", problemIds)

  // Build solved map for the user
  const solvedMap: Record<string, string> = {}
  for (const sub of submissions ?? []) {
    if (!solvedMap[sub.problem_id] || sub.status === "Accepted") {
      solvedMap[sub.problem_id] = sub.status
    }
  }

  // Build acceptance stats map
  const statsMap: Record<string, { total: number; accepted: number }> = {}
  for (const sub of allSubmissions ?? []) {
    if (!statsMap[sub.problem_id]) statsMap[sub.problem_id] = { total: 0, accepted: 0 }
    statsMap[sub.problem_id].total++
    if (sub.status === "Accepted") statsMap[sub.problem_id].accepted++
  }

  // Enrich history data
  const enrichedHistory = historyData.map((h: any) => {
    const pId = h.problem_id
    const stats = statsMap[pId]
    const accRate = stats && stats.total > 0 ? (stats.accepted / stats.total) * 100 : 0
    return {
      date: h.date,
      problem_id: pId,
      title: h.coding_problems?.title || "Unknown Problem",
      difficulty: h.coding_problems?.difficulty || "Medium",
      solved_status: solvedMap[pId] || null,
      total_submissions: stats?.total || 0,
      acceptance_rate: accRate,
    }
  })

  // Calculate overall POTD stats
  const totalPotds = enrichedHistory.length
  const solvedPotds = enrichedHistory.filter((h: any) => h.solved_status === "Accepted").length

  const today = new Date()
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`
  const currentPotd = enrichedHistory.find((h: any) => h.date === todayStr) || null
  const pastHistory = enrichedHistory.filter((h: any) => h.date !== todayStr)

  return (
    <PotdPageClient
      history={pastHistory}
      currentPotd={currentPotd}
      totalPotds={totalPotds}
      solvedPotds={solvedPotds}
    />
  )
}
