import { createClient } from "@/lib/supabase/server"
import { getUserProfile } from "@/lib/supabase/profile"
import { redirect } from "next/navigation"
import { AdminDashboardClient } from "../_components/AdminDashboardClient"

export const metadata = {
  title: "Admin Center — LogicLab",
  description: "LogicLab curriculum management, student progress logs, and execution diagnostics dashboard.",
}

export default async function AdminPage() {
  const profile = await getUserProfile()
  if (!profile) redirect("/auth/login")

  const isAdmin = profile.account_type === "admin"
  if (!isAdmin) redirect("/logiclab")

  const supabase = (await createClient()) as any

  // ── 1. Fetch live aggregate data using optimized PostgreSQL RPCs ──
  const [
    { data: adminProblemStats },
    { data: adminStudentRankings },
    { data: rawSubmissions },
    { data: rawProfiles },
  ] = await Promise.all([
    supabase.rpc("get_admin_problem_stats", { p_limit: 1000, p_offset: 0 }),
    supabase.rpc("get_admin_student_rankings", { p_limit: 500, p_offset: 0 }),
    supabase
      .from("logiclab_problem_submissions")
      .select("id, status, language_id, problem_id, user_id, passed_count, total_count, failed_test_case_info, runtime, memory, created_at")
      .order("created_at", { ascending: false })
      .limit(100),
    supabase
      .from("profiles")
      .select("id, full_name, email, account_type")
      .in("account_type", ["institute_candidate", "admin", null])
      .limit(500),
  ])

  const problemsList = (adminProblemStats || []).map((p: any) => ({
    id: p.id,
    number: p.number,
    title: p.title,
    difficulty: p.difficulty,
    tags: Array.isArray(p.tags) ? p.tags : [],
    created_at: p.created_at,
    total_submissions: Number(p.total_submissions) || 0,
    accepted_submissions: Number(p.accepted_submissions) || 0,
    acceptance_rate: p.acceptance_rate !== null ? Math.round(Number(p.acceptance_rate)) : null,
  }))

  const profileMap: Record<string, { full_name: string; email: string }> = {}
  ;(rawProfiles || []).forEach((p: any) => {
    profileMap[p.id] = { full_name: p.full_name || "", email: p.email || "" }
  })

  // Problem title lookup
  const problemTitleMap: Record<string, string> = {}
  problemsList.forEach((p: any) => {
    problemTitleMap[p.id] = p.title
  })

  // ── 2. Live feed of recent detailed submissions ──
  const recentSubmissions = (rawSubmissions || []).slice(0, 15).map((s: any) => {
    const prof = profileMap[s.user_id]
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
      student_name: prof?.full_name || "Active Student",
      student_email: prof?.email || "student@placetrix.app",
    }
  })

  // ── 3. Student Rankings from SQL RPC ──
  const studentStats = (adminStudentRankings || []).map((st: any) => ({
    user_id: st.user_id,
    student_name: st.student_name || "Active Student",
    student_email: st.student_email || "student@placetrix.app",
    solvedCount: Number(st.solved_count) || 0,
    attemptCount: Number(st.attempt_count) || 0,
    solvedDifficultyCounts: { Easy: 0, Medium: 0, Hard: 0 },
    solvedTags: {},
    recentSubmissions: [],
  }))

  // ── 4. Aggregate metrics ──
  const totalProblems = problemsList.length
  let totalSubmissions = 0
  let totalAccepted = 0

  problemsList.forEach((p: any) => {
    totalSubmissions += p.total_submissions
    totalAccepted += p.accepted_submissions
  })

  const difficultyCounts = {
    Easy: problemsList.filter((p: any) => p.difficulty === "Easy").length,
    Medium: problemsList.filter((p: any) => p.difficulty === "Medium").length,
    Hard: problemsList.filter((p: any) => p.difficulty === "Hard").length,
  }

  const languageCounts: Record<string, number> = { "71": 0, "63": 0, "54": 0, "62": 0 }
  ;(rawSubmissions || []).forEach((s: any) => {
    if (s.language_id) {
      const lid = String(s.language_id)
      languageCounts[lid] = (languageCounts[lid] || 0) + 1
    }
  })

  const problemStats = problemsList.map((p: any) => ({
    id: p.id,
    title: p.title,
    difficulty: p.difficulty,
    submissions: p.total_submissions,
    accepted: p.accepted_submissions,
    rate: p.acceptance_rate || 0,
  })).sort((a: any, b: any) => b.submissions - a.submissions)

  // ── 5. Tag Statistics from problems ──
  const tagMap: Record<string, { problemCount: number; total: number; accepted: number }> = {}
  problemsList.forEach((p: any) => {
    const pTags: string[] = p.tags || []
    pTags.forEach((tag: string) => {
      const trimmed = tag.trim()
      if (!trimmed) return
      if (!tagMap[trimmed]) {
        tagMap[trimmed] = { problemCount: 0, total: 0, accepted: 0 }
      }
      tagMap[trimmed].problemCount++
      tagMap[trimmed].total += p.total_submissions
      tagMap[trimmed].accepted += p.accepted_submissions
    })
  })

  const tagStats = Object.entries(tagMap).map(([name, stats]) => ({
    name,
    problemCount: stats.problemCount,
    submissions: stats.total,
    accepted: stats.accepted,
    rate: stats.total ? Math.round((stats.accepted / stats.total) * 100) : 0,
    studentsSolved: 0,
    totalStudents: studentStats.length,
  })).sort((a, b) => b.submissions - a.submissions || b.problemCount - a.problemCount)

  const analytics = {
    totalProblems,
    totalSubmissions,
    totalAccepted,
    uniqueStudents: studentStats.length,
    difficultyCounts,
    languageCounts,
    successTimeline: [],
    problemStats,
    studentStats,
    tagStats,
  }

  return (
    <AdminDashboardClient
      problems={problemsList}
      analytics={analytics}
      recentSubmissions={recentSubmissions}
    />
  )
}
