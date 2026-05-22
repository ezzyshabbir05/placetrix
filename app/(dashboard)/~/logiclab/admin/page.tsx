import { createClient } from "@/lib/supabase/server"
import { getUserProfile } from "@/lib/supabase/profile"
import { redirect } from "next/navigation"
import { AdminDashboardClient } from "./AdminDashboardClient"

export const metadata = {
  title: "Admin Center — LogicLab",
  description: "LogicLab curriculum management, student progress logs, and execution diagnostics dashboard.",
}

export default async function AdminPage() {
  const profile = await getUserProfile()
  if (!profile) redirect("/auth/login")

  const isAdmin = profile.account_type === "admin" || profile.account_type === "institute"
  if (!isAdmin) redirect("/~/logiclab")

  const supabase = (await createClient()) as any

  // ── 1. Fetch all coding problems ──
  const { data: rawProblems } = await supabase
    .from("coding_problems" as any)
    .select("id, title, difficulty, tags, created_at")
    .order("created_at", { ascending: false })

  const rawProblemsList: any[] = rawProblems || []

  // ── 2. Fetch all submissions (stitch profiles in-memory to avoid PGRST200) ──
  const { data: rawSubmissions } = await supabase
    .from("coding_submissions" as any)
    .select("id, status, language_id, problem_id, user_id, created_at")

  const submissions: any[] = rawSubmissions || []

  // Fetch profiles separately for display names
  const userIds = [...new Set(submissions.map((s: any) => s.user_id).filter(Boolean))]
  let profileMap: Record<string, { display_name: string; email: string }> = {}
  if (userIds.length > 0) {
    const { data: rawProfiles } = await supabase
      .from("profiles" as any)
      .select("id, display_name, email")
      .in("id", userIds)
    ;(rawProfiles || []).forEach((p: any) => {
      profileMap[p.id] = { display_name: p.display_name || "", email: p.email || "" }
    })
  }

  // ── 3. Enrich problems with in-memory submission metrics ──
  const problems = rawProblemsList.map((p: any) => {
    const pSubs = submissions.filter((s: any) => s.problem_id === p.id)
    const pAcc = pSubs.filter((s: any) => s.status === "Accepted").length
    const rate = pSubs.length ? Math.round((pAcc / pSubs.length) * 100) : null
    return {
      ...p,
      acceptance_rate: rate,
      total_submissions: pSubs.length,
    }
  })

  // ── 4. Student leaderboard ──
  const studentMap: Record<string, {
    user_id: string
    student_name: string
    student_email: string
    solvedProblems: Set<string>
    attemptCount: number
  }> = {}

  submissions.forEach((s: any) => {
    if (!s.user_id) return
    const prof = profileMap[s.user_id]
    const email = prof?.email || "student@placetrix.com"
    const name = prof?.display_name || email.split("@")[0] || "Active Student"

    if (!studentMap[s.user_id]) {
      studentMap[s.user_id] = {
        user_id: s.user_id,
        student_name: name,
        student_email: email,
        solvedProblems: new Set<string>(),
        attemptCount: 0,
      }
    }
    studentMap[s.user_id].attemptCount++
    if (s.status === "Accepted" && s.problem_id) {
      studentMap[s.user_id].solvedProblems.add(s.problem_id)
    }
  })

  const studentStats = Object.values(studentMap).map((st) => ({
    user_id: st.user_id,
    student_name: st.student_name,
    student_email: st.student_email,
    solvedCount: st.solvedProblems.size,
    attemptCount: st.attemptCount,
  })).sort((a, b) => b.solvedCount - a.solvedCount)

  // ── 5. Recent submissions for Live Feed (joined in-memory) ──
  const sortedSubmissions = [...submissions]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 15)

  // Build a problem title map
  const problemTitleMap: Record<string, string> = {}
  rawProblemsList.forEach((p: any) => { problemTitleMap[p.id] = p.title })

  const recentSubmissions = sortedSubmissions.map((s: any) => {
    const prof = profileMap[s.user_id] || null
    return {
      id: s.id,
      status: s.status,
      runtime: s.runtime ?? null,
      memory: s.memory ?? null,
      passed_count: s.passed_count ?? null,
      total_count: s.total_count ?? null,
      language_id: s.language_id,
      created_at: s.created_at,
      problem_title: problemTitleMap[s.problem_id] || "Deleted Challenge",
      student_name: prof?.display_name || "Active Student",
      student_email: prof?.email || "student@placetrix.com",
    }
  })

  // ── 6. Aggregate analytics ──
  const totalProblems = problems.length
  const totalSubmissions = submissions.length
  const totalAccepted = submissions.filter((s: any) => s.status === "Accepted").length
  const uniqueStudents = new Set(submissions.map((s: any) => s.user_id).filter(Boolean)).size

  const difficultyCounts = {
    Easy: rawProblemsList.filter((p: any) => p.difficulty === "Easy").length,
    Medium: rawProblemsList.filter((p: any) => p.difficulty === "Medium").length,
    Hard: rawProblemsList.filter((p: any) => p.difficulty === "Hard").length,
  }

  const languageCounts: Record<string, number> = { "71": 0, "63": 0, "54": 0, "62": 0 }
  submissions.forEach((s: any) => {
    if (s.language_id) {
      const lid = String(s.language_id)
      languageCounts[lid] = (languageCounts[lid] || 0) + 1
    }
  })

  const problemStats = problems.map((p: any) => {
    const pSubs = submissions.filter((s: any) => s.problem_id === p.id)
    const pAcc = pSubs.filter((s: any) => s.status === "Accepted").length
    return {
      id: p.id,
      title: p.title,
      difficulty: p.difficulty,
      submissions: pSubs.length,
      accepted: pAcc,
      rate: pSubs.length ? Math.round((pAcc / pSubs.length) * 100) : 0,
    }
  }).sort((a: any, b: any) => b.submissions - a.submissions)

  // ── 7. Tag Analytics — built from PROBLEMS (not just submissions) ──
  // This ensures tags show even when submissions are 0
  const tagMap: Record<string, { problemCount: number; total: number; accepted: number }> = {}
  rawProblemsList.forEach((p: any) => {
    const pTags: string[] = Array.isArray(p.tags) ? p.tags : []
    const pSubs = submissions.filter((s: any) => s.problem_id === p.id)
    const pAcc = pSubs.filter((s: any) => s.status === "Accepted").length

    pTags.forEach((tag: string) => {
      const trimmed = tag.trim()
      if (!trimmed) return
      if (!tagMap[trimmed]) tagMap[trimmed] = { problemCount: 0, total: 0, accepted: 0 }
      tagMap[trimmed].problemCount++
      tagMap[trimmed].total += pSubs.length
      tagMap[trimmed].accepted += pAcc
    })
  })

  const tagStats = Object.entries(tagMap).map(([name, stats]) => ({
    name,
    problemCount: stats.problemCount,
    submissions: stats.total,
    accepted: stats.accepted,
    rate: stats.total ? Math.round((stats.accepted / stats.total) * 100) : 0,
  }))
    // Sort: first by submissions desc (active), then by problemCount desc
    .sort((a, b) => b.submissions - a.submissions || b.problemCount - a.problemCount)
    .slice(0, 8)

  const analytics = {
    totalProblems,
    totalSubmissions,
    totalAccepted,
    uniqueStudents,
    difficultyCounts,
    languageCounts,
    successTimeline: [],
    problemStats,
    studentStats,
    tagStats,
  }

  return (
    <AdminDashboardClient
      problems={problems}
      analytics={analytics}
      recentSubmissions={recentSubmissions}
    />
  )
}
