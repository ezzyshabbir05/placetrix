import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getUserProfile } from "@/lib/supabase/profile"

export async function GET() {
  try {
    const profile = await getUserProfile()
    if (!profile) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })

    const supabase = (await createClient()) as any

    // Fetch the last 30 POTDs (excluding today since today is on the main dashboard)
    const now = new Date()
    const istOffset = 5.5 * 60 * 60 * 1000
    const todayIst = new Date(now.getTime() + istOffset)
    const todayStr = todayIst.toISOString().split("T")[0]
    
    const { data: historyData, error } = await supabase
      .from("daily_challenges")
      .select("date, problem_id, coding_problems ( id, title, difficulty )")
      .lt("date", todayStr)
      .order("date", { ascending: false })
      .limit(30)

    if (error || !historyData) {
      return NextResponse.json({ success: false, error: "Failed to fetch history." }, { status: 500 })
    }

    if (historyData.length === 0) {
      return NextResponse.json({ success: true, history: [] })
    }

    // Extract problem IDs to fetch user's solved status
    const problemIds = historyData.map((h: any) => h.problem_id)

    const { data: submissions } = await supabase
      .from("coding_submissions")
      .select("problem_id, status")
      .eq("user_id", profile.id)
      .in("problem_id", problemIds)

    // Build solved map
    const solvedMap: Record<string, string> = {}
    for (const sub of submissions ?? []) {
      if (!solvedMap[sub.problem_id] || sub.status === "Accepted") {
        solvedMap[sub.problem_id] = sub.status
      }
    }

    // Enrich history with solved status
    const enrichedHistory = historyData.map((h: any) => ({
      ...h,
      solved_status: solvedMap[h.problem_id] || null
    }))

    return NextResponse.json({ success: true, history: enrichedHistory })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
