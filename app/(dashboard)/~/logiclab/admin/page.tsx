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

  // ── 2. Fetch lightweight submissions for analytics (Limit to 2000 to prevent memory exhaustion) ──
  const { data: rawSubmissions } = await supabase
    .from("coding_submissions" as any)
    .select("id, status, language_id, problem_id, user_id, passed_count, total_count, created_at")
    .order("created_at", { ascending: false })
    .limit(2000)

  const submissions: any[] = rawSubmissions || []

  // Fetch student profiles (limit to 500 to prevent huge payloads)
  const { data: rawAllProfiles } = await supabase
    .from("profiles" as any)
    .select("id, display_name, email, account_type")
    .in("account_type", ["candidate", "user", null])
    .limit(1000)

  let profileMap: Record<string, { display_name: string; email: string; account_type: string }> = {}
  ;(rawAllProfiles || []).forEach((p: any) => {
    profileMap[p.id] = { display_name: p.display_name || "", email: p.email || "", account_type: p.account_type || "candidate" }
  })

  // Fetch any missing profiles for users who have submitted (e.g. admins testing)
  const submissionUserIds = Array.from(new Set(submissions.map((s: any) => s.user_id).filter(Boolean)))
  const missingUserIds = submissionUserIds.filter(uid => !profileMap[uid as string])
  
  if (missingUserIds.length > 0) {
    const { data: missingProfiles } = await supabase
      .from("profiles" as any)
      .select("id, display_name, email, account_type")
      .in("id", missingUserIds)

    ;(missingProfiles || []).forEach((p: any) => {
      profileMap[p.id] = { display_name: p.display_name || "", email: p.email || "", account_type: p.account_type || "candidate" }
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

  // ── 4. Student leaderboard — include ALL students, even with 0 submissions ──
  // Precompute a problem dictionary for fast lookups
  const problemMap: Record<string, { title: string; difficulty: string; tags: string[] }> = {}
  rawProblemsList.forEach((p: any) => {
    problemMap[p.id] = {
      title: p.title,
      difficulty: p.difficulty,
      tags: Array.isArray(p.tags) ? p.tags : [],
    }
  })

  const studentMap: Record<string, {
    user_id: string
    student_name: string
    student_email: string
    solvedProblems: Set<string>
    attemptCount: number
    submissionsList: any[]
  }> = {}

  // Seed ALL student profiles so students with 0 submissions still appear
  Object.entries(profileMap).forEach(([uid, prof]) => {
    if (prof.account_type !== "admin" && prof.account_type !== "institute") {
      const email = prof.email || "student@placetrix.com"
      const name = prof.display_name || email.split("@")[0] || "Active Student"
      studentMap[uid] = {
        user_id: uid,
        student_name: name,
        student_email: email,
        solvedProblems: new Set<string>(),
        attemptCount: 0,
        submissionsList: [],
      }
    }
  })

  // Then layer in submission data
  submissions.forEach((s: any) => {
    if (!s.user_id) return
    if (!studentMap[s.user_id]) {
      // Submission from a user not in initial seed (e.g. an admin testing the code)
      const prof = profileMap[s.user_id]
      const email = prof?.email || "student@placetrix.com"
      const name = prof?.display_name || email.split("@")[0] || "Active Student"
      
      studentMap[s.user_id] = {
        user_id: s.user_id,
        student_name: name,
        student_email: email,
        solvedProblems: new Set<string>(),
        attemptCount: 0,
        submissionsList: [],
      }
    }
    
    studentMap[s.user_id].attemptCount++
    if (s.status === "Accepted" && s.problem_id) {
      studentMap[s.user_id].solvedProblems.add(s.problem_id)
    }

    const prob = problemMap[s.problem_id]
    if (prob) {
      studentMap[s.user_id].submissionsList.push({
        id: s.id,
        created_at: s.created_at,
        status: s.status,
        problem_title: prob.title,
        difficulty: prob.difficulty,
        language_id: s.language_id,
        passed_count: s.passed_count ?? null,
        total_count: s.total_count ?? null,
        failed_test_case_info: s.failed_test_case_info ?? null,
      })
    }
  })

  const studentStats = Object.values(studentMap).map((st) => {
    const solvedDifficultyCounts = { Easy: 0, Medium: 0, Hard: 0 }
    const solvedTags: Record<string, number> = {}

    st.solvedProblems.forEach((pid) => {
      const prob = problemMap[pid]
      if (prob) {
        const diff = prob.difficulty as "Easy" | "Medium" | "Hard"
        if (solvedDifficultyCounts[diff] !== undefined) {
          solvedDifficultyCounts[diff]++
        }
        prob.tags.forEach((tag) => {
          const trimmed = tag.trim()
          if (trimmed) {
            solvedTags[trimmed] = (solvedTags[trimmed] || 0) + 1
          }
        })
      }
    })

    const studentRecentSubmissions = [...st.submissionsList]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 5)

    return {
      user_id: st.user_id,
      student_name: st.student_name,
      student_email: st.student_email,
      solvedCount: st.solvedProblems.size,
      attemptCount: st.attemptCount,
      solvedDifficultyCounts,
      solvedTags,
      recentSubmissions: studentRecentSubmissions,
    }
  }).sort((a, b) => b.solvedCount - a.solvedCount || b.attemptCount - a.attemptCount)

  // ── 5. Recent submissions for Live Feed (Fetch detailed logs securely) ──
  const { data: recentDetailedSubmissions } = await supabase
    .from("coding_submissions" as any)
    .select("id, status, language_id, problem_id, user_id, passed_count, total_count, failed_test_case_info, runtime, memory, created_at")
    .order("created_at", { ascending: false })
    .limit(15)

  const sortedSubmissions = recentDetailedSubmissions || []

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
  const uniqueStudents = Object.keys(studentMap).length

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
  const tagMap: Record<string, { problemCount: number; total: number; accepted: number; studentsSolved: Set<string> }> = {}
  rawProblemsList.forEach((p: any) => {
    const pTags: string[] = Array.isArray(p.tags) ? p.tags : []
    const pSubs = submissions.filter((s: any) => s.problem_id === p.id)
    const pAcc = pSubs.filter((s: any) => s.status === "Accepted")
    // Unique students who got Accepted on this problem
    const studentsSolvedThisProblem = new Set(pAcc.map((s: any) => s.user_id).filter(Boolean))

    pTags.forEach((tag: string) => {
      const trimmed = tag.trim()
      if (!trimmed) return
      if (!tagMap[trimmed]) tagMap[trimmed] = { problemCount: 0, total: 0, accepted: 0, studentsSolved: new Set() }
      tagMap[trimmed].problemCount++
      tagMap[trimmed].total += pSubs.length
      tagMap[trimmed].accepted += pAcc.length
      // Union of students who solved any problem with this tag
      studentsSolvedThisProblem.forEach((uid) => tagMap[trimmed].studentsSolved.add(uid))
    })
  })

  const tagStats = Object.entries(tagMap).map(([name, stats]) => ({
    name,
    problemCount: stats.problemCount,
    submissions: stats.total,
    accepted: stats.accepted,
    rate: stats.total ? Math.round((stats.accepted / stats.total) * 100) : 0,
    studentsSolved: stats.studentsSolved.size,
    totalStudents: uniqueStudents,
  }))
    // Sort: first by submissions desc (active), then by problemCount desc
    .sort((a, b) => b.submissions - a.submissions || b.problemCount - a.problemCount)

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
