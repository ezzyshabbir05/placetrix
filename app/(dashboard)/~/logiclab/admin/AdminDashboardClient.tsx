"use client"

import React, { useState, useCallback } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  IconCode,
  IconPlus,
  IconEdit,
  IconTrash,
  IconSearch,
  IconUsers,
  IconActivity,
  IconCircleCheck,
  IconCircleDot,
  IconX,
  IconAlertTriangle,
  IconBook,
  IconTrendingUp,
  IconLayoutDashboard,
  IconTag,
  IconUpload,
  IconSparkles,
  IconChevronRight,
} from "@tabler/icons-react"
import { toast } from "sonner"
import { createClient } from "@/lib/supabase/client"
import { AdminProblemCreatorClient } from "./AdminProblemCreatorClient"

interface Problem {
  id: string
  title: string
  difficulty: "Easy" | "Medium" | "Hard"
  tags: string[]
  created_at: string
  acceptance_rate: number | null
  total_submissions: number
}

interface SubmissionLog {
  id: string
  status: string
  runtime: number | null
  memory: number | null
  passed_count: number | null
  total_count: number | null
  language_id: number
  created_at: string
  problem_title: string
  student_name: string
  student_email: string
}

interface StudentStat {
  user_id: string
  student_name: string
  student_email: string
  solvedCount: number
  attemptCount: number
}

interface TagStat {
  name: string
  problemCount: number
  submissions: number
  accepted: number
  rate: number
}

interface AnalyticsData {
  totalProblems: number
  totalSubmissions: number
  totalAccepted: number
  uniqueStudents: number
  difficultyCounts: {
    Easy: number
    Medium: number
    Hard: number
  }
  languageCounts: Record<string, number>
  successTimeline: { date: string; total: number; accepted: number }[]
  problemStats: {
    id: string
    title: string
    difficulty: string
    submissions: number
    accepted: number
    rate: number
  }[]
  studentStats?: StudentStat[]
  tagStats?: TagStat[]
}

const DIFFICULTY_COLORS: Record<string, string> = {
  Easy: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  Medium: "text-amber-400 bg-amber-500/10 border-amber-500/20",
  Hard: "text-rose-400 bg-rose-500/10 border-rose-500/20",
}

const LANG_NAMES: Record<number, string> = {
  71: "Python",
  63: "JavaScript",
  54: "C++",
  62: "Java",
}

// ── Onboarding Banner shown when DB is empty ──
function OnboardingBanner({
  onImport,
  onSeed,
  isSeeding,
}: {
  onImport: () => void
  onSeed: () => void
  isSeeding: boolean
}) {
  return (
    <div className="bg-zinc-900/60 border border-emerald-500/10 rounded-2xl p-5 md:p-6 flex flex-col md:flex-row items-start md:items-center gap-5">
      <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-emerald-500/20 to-cyan-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
        <IconSparkles className="h-6 w-6 text-emerald-400" />
      </div>
      <div className="flex-1 min-w-0">
        <h2 className="text-sm font-bold text-white mb-1">Your curriculum library is empty</h2>
        <p className="text-xs text-zinc-400 leading-relaxed">
          10 pre-built challenges are bundled with your project in{" "}
          <code className="text-emerald-400 font-mono text-[11px] bg-zinc-950 px-1 py-0.5 rounded border border-zinc-800">
            problems_import.json
          </code>
          . Click <strong className="text-white">Quick Seed</strong> to load them instantly, or use the manual import flow below.
        </p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={onSeed}
          disabled={isSeeding}
          className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-black px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer disabled:cursor-not-allowed"
        >
          {isSeeding ? (
            <>
              <span className="h-3 w-3 border-2 border-black border-t-transparent rounded-full animate-spin" />
              Seeding...
            </>
          ) : (
            <>
              <IconSparkles className="h-3.5 w-3.5" />
              Quick Seed
            </>
          )}
        </button>
        <button
          onClick={onImport}
          className="flex items-center gap-2 text-zinc-400 hover:text-white bg-zinc-900 border border-zinc-800 hover:border-zinc-700 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer"
        >
          <IconUpload className="h-3.5 w-3.5" />
          Manual Import
        </button>
      </div>
    </div>
  )
}

export function AdminDashboardClient({
  problems: initialProblems,
  analytics,
  recentSubmissions: initialRecentSubmissions,
}: {
  problems: Problem[]
  analytics: AnalyticsData
  recentSubmissions: SubmissionLog[]
}) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<"overview" | "problems" | "create">("overview")
  const [localProblems, setLocalProblems] = useState<Problem[]>(initialProblems)
  const [recentSubmissions] = useState<SubmissionLog[]>(initialRecentSubmissions)

  const [problemSearch, setProblemSearch] = useState("")
  const [difficultyFilter, setDifficultyFilter] = useState("All")
  const [studentSearch, setStudentSearch] = useState("")

  const [deletingProblemId, setDeletingProblemId] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isSeeding, setIsSeeding] = useState(false)

  const isEmpty = analytics.totalProblems === 0

  const handleQuickSeed = useCallback(async () => {
    setIsSeeding(true)
    const tId = toast.loading("Loading problems_import.json...")
    try {
      // Fetch the bundled JSON file from the server
      const fileRes = await fetch("/problems_import.json")
      if (!fileRes.ok) throw new Error("Could not fetch problems_import.json from server")
      const problems = await fileRes.json()

      toast.loading(`Seeding ${problems.length} problems into database...`, { id: tId })

      const seedRes = await fetch("/api/logiclab/seed-problems", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(problems),
      })
      const result = await seedRes.json()

      if (!seedRes.ok) throw new Error(result.error || "Seed failed")

      toast.success(
        `Seeded ${result.inserted} problems! ${result.skipped > 0 ? `(${result.skipped} already existed)` : ""}`,
        { id: tId }
      )
      router.refresh()
    } catch (err: any) {
      toast.error(err.message || "Failed to seed problems", { id: tId })
    } finally {
      setIsSeeding(false)
    }
  }, [router])

  const handleConfirmDelete = async () => {
    if (!deletingProblemId) return
    setIsDeleting(true)
    const tId = toast.loading("Permanently deleting problem and submissions...")
    try {
      const supabase = createClient()
      const { error: subError } = await supabase
        .from("coding_submissions" as any)
        .delete()
        .eq("problem_id", deletingProblemId)
      if (subError) throw new Error(subError.message)

      const { error: probError } = await supabase
        .from("coding_problems" as any)
        .delete()
        .eq("id", deletingProblemId)
      if (probError) throw new Error(probError.message)

      toast.success("Problem deleted successfully!", { id: tId })
      setLocalProblems((prev) => prev.filter((p) => p.id !== deletingProblemId))
      setDeletingProblemId(null)
      router.refresh()
    } catch (err: any) {
      toast.error(err?.message || "Failed to delete problem.", { id: tId })
    } finally {
      setIsDeleting(false)
    }
  }

  const filteredProblems = localProblems.filter((p) => {
    const matchesSearch =
      p.title.toLowerCase().includes(problemSearch.toLowerCase()) ||
      p.tags?.some((t) => t.toLowerCase().includes(problemSearch.toLowerCase()))
    const matchesDifficulty = difficultyFilter === "All" || p.difficulty === difficultyFilter
    return matchesSearch && matchesDifficulty
  })

  const filteredStudents = (analytics.studentStats || []).filter((s) => {
    const term = studentSearch.toLowerCase()
    return s.student_name.toLowerCase().includes(term) || s.student_email.toLowerCase().includes(term)
  })

  const totalSubmissions = analytics.totalSubmissions || 1
  const acceptanceRate = ((analytics.totalAccepted / totalSubmissions) * 100).toFixed(1)

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6 min-h-[calc(100svh-56px)] bg-zinc-950 text-zinc-100">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-zinc-900 pb-5">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 border border-emerald-500/30 flex items-center justify-center">
            <IconLayoutDashboard className="h-5 w-5 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white">LogicLab Admin Center</h1>
            <p className="text-xs text-zinc-500">
              Manage challenges, track performance, and import curriculum.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-zinc-900/60 p-0.5 border border-zinc-800 rounded-lg shrink-0 select-none">
          {(["overview", "problems", "create"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer capitalize ${
                activeTab === tab
                  ? "bg-emerald-500 text-black shadow-lg shadow-emerald-500/10"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              {tab === "create" ? "Create / Import" : tab === "problems" ? "Manage Problems" : "Overview"}
            </button>
          ))}
        </div>
      </div>

      {/* ── OVERVIEW TAB ── */}
      {activeTab === "overview" && (
        <div className="space-y-5 animate-in fade-in-50 duration-200">

          {/* Onboarding banner — shown only when library is empty */}
          {isEmpty && (
            <OnboardingBanner
              onImport={() => setActiveTab("create")}
              onSeed={handleQuickSeed}
              isSeeding={isSeeding}
            />
          )}

          {/* ── Stats Grid ── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              {
                title: "Total Submissions",
                value: analytics.totalSubmissions.toLocaleString(),
                desc: `${analytics.totalAccepted} accepted`,
                icon: <IconActivity className="h-4 w-4 text-emerald-400" />,
                accent: "hover:border-emerald-500/30",
                empty: analytics.totalSubmissions === 0,
              },
              {
                title: "Acceptance Rate",
                value: analytics.totalSubmissions === 0 ? "—" : `${acceptanceRate}%`,
                desc: "Average success per attempt",
                icon: <IconTrendingUp className="h-4 w-4 text-indigo-400" />,
                accent: "hover:border-indigo-500/30",
                empty: analytics.totalSubmissions === 0,
              },
              {
                title: "Active Students",
                value: analytics.uniqueStudents.toLocaleString(),
                desc: "Unique workspace participants",
                icon: <IconUsers className="h-4 w-4 text-cyan-400" />,
                accent: "hover:border-cyan-500/30",
                empty: analytics.uniqueStudents === 0,
              },
              {
                title: "Total Challenges",
                value: analytics.totalProblems.toLocaleString(),
                desc: `${analytics.difficultyCounts.Easy}E · ${analytics.difficultyCounts.Medium}M · ${analytics.difficultyCounts.Hard}H`,
                icon: <IconBook className="h-4 w-4 text-amber-400" />,
                accent: "hover:border-amber-500/30",
                empty: analytics.totalProblems === 0,
              },
            ].map((stat, i) => (
              <div
                key={i}
                className={`bg-zinc-900/40 border border-zinc-800/80 rounded-xl p-4 flex flex-col justify-between transition-all group duration-300 hover:-translate-y-0.5 select-none ${stat.accent}`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">
                    {stat.title}
                  </span>
                  <div className="h-7 w-7 rounded-lg bg-zinc-950 border border-zinc-800 flex items-center justify-center">
                    {stat.icon}
                  </div>
                </div>
                <div className="mt-4">
                  <h3 className={`text-2xl font-bold tracking-tight ${stat.empty ? "text-zinc-600" : "text-white"}`}>
                    {stat.value}
                  </h3>
                  <p className="text-[10px] text-zinc-500 mt-1 font-medium">{stat.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* ── Row 1: Student Leaderboard + Language Distribution ── */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Student Leaderboard */}
            <div className="lg:col-span-8 bg-zinc-900/30 border border-zinc-800/60 rounded-xl p-5 flex flex-col min-h-[320px]">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-4 select-none">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-0.5">
                    Student Performance Leaderboard
                  </h3>
                  <p className="text-[10px] text-zinc-600">Solved challenges and total attempts per student.</p>
                </div>
                <div className="relative w-full sm:w-44">
                  <IconSearch className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-600" />
                  <input
                    type="text"
                    placeholder="Search student..."
                    value={studentSearch}
                    onChange={(e) => setStudentSearch(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-8 pr-3 py-1 text-xs text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-700"
                  />
                </div>
              </div>

              <div className="flex-1 border border-zinc-800/50 rounded-lg overflow-auto">
                <table className="w-full text-left border-collapse text-xs select-none">
                  <thead>
                    <tr className="bg-zinc-900/80 border-b border-zinc-800 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                      <th className="px-3 py-2 text-center w-10">#</th>
                      <th className="px-3 py-2">Student</th>
                      <th className="px-3 py-2 text-center">Solved</th>
                      <th className="px-3 py-2 text-center">Attempts</th>
                      <th className="px-3 py-2 text-right">Success Rate</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/50">
                    {filteredStudents.length > 0 ? (
                      filteredStudents.map((st, idx) => {
                        const successRate = st.attemptCount
                          ? Math.round((st.solvedCount / st.attemptCount) * 100)
                          : 0
                        return (
                          <tr key={st.user_id} className="hover:bg-zinc-900/30">
                            <td className="px-3 py-2.5 text-center font-mono text-zinc-600 text-[10px]">
                              {idx + 1}
                            </td>
                            <td className="px-3 py-2.5">
                              <div className="font-semibold text-zinc-200 truncate">{st.student_name}</div>
                              <div className="text-[10px] text-zinc-500 truncate">{st.student_email}</div>
                            </td>
                            <td className="px-3 py-2.5 text-center">
                              <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                                {st.solvedCount}
                              </span>
                            </td>
                            <td className="px-3 py-2.5 text-center font-mono text-zinc-400 text-[11px]">
                              {st.attemptCount}
                            </td>
                            <td className="px-3 py-2.5 text-right font-mono font-bold text-indigo-400 text-[11px]">
                              {successRate}%
                            </td>
                          </tr>
                        )
                      })
                    ) : (
                      <tr>
                        <td colSpan={5} className="px-3 py-14 text-center">
                          <div className="flex flex-col items-center gap-2 text-zinc-700">
                            <IconUsers className="h-6 w-6 stroke-[1.5]" />
                            <span className="text-[10px] font-bold uppercase tracking-widest">
                              {analytics.totalSubmissions === 0
                                ? "No student submissions yet"
                                : "No students matched your search"}
                            </span>
                            {analytics.totalProblems === 0 && (
                              <button
                                onClick={() => setActiveTab("create")}
                                className="mt-1 text-[10px] text-emerald-500 hover:text-emerald-400 flex items-center gap-1 font-semibold"
                              >
                                Import problems to get started <IconChevronRight className="h-3 w-3" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Language Distribution */}
            <div className="lg:col-span-4 bg-zinc-900/30 border border-zinc-800/60 rounded-xl p-5 flex flex-col min-h-[320px]">
              <div className="mb-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-0.5">
                  Language Distribution
                </h3>
                <p className="text-[10px] text-zinc-600">Submissions grouped by programming language.</p>
              </div>
              <div className="space-y-4 my-auto">
                {[
                  { id: 71, label: "Python", color: "bg-emerald-500", text: "text-emerald-400" },
                  { id: 63, label: "JavaScript", color: "bg-amber-500", text: "text-amber-400" },
                  { id: 54, label: "C++", color: "bg-rose-500", text: "text-rose-400" },
                  { id: 62, label: "Java", color: "bg-cyan-500", text: "text-cyan-400" },
                ].map((lang) => {
                  const count = analytics.languageCounts[lang.id] || 0
                  const pct = analytics.totalSubmissions ? (count / analytics.totalSubmissions) * 100 : 0
                  return (
                    <div key={lang.id} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="flex items-center gap-2 text-zinc-400 font-medium">
                          <span className={`h-2 w-2 rounded-full ${lang.color}`} />
                          {lang.label}
                        </span>
                        <span className={`text-[10px] font-mono font-bold ${count ? lang.text : "text-zinc-700"}`}>
                          {count} ({pct.toFixed(0)}%)
                        </span>
                      </div>
                      <div className="h-1 bg-zinc-900 border border-zinc-800/50 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${lang.color} rounded-full transition-all duration-500`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  )
                })}

                {analytics.totalSubmissions === 0 && (
                  <p className="text-[10px] text-zinc-700 text-center pt-2 font-medium uppercase tracking-widest">
                    No submissions yet
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* ── Row 2: Tag Analytics + Live Activity ── */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Curriculum Tag Analytics */}
            <div className="lg:col-span-6 bg-zinc-900/30 border border-zinc-800/60 rounded-xl p-5 flex flex-col min-h-[360px]">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-0.5">
                    Curriculum Concept Tags
                  </h3>
                  <p className="text-[10px] text-zinc-600">
                    Topics covered, problems per concept, and student proficiency.
                  </p>
                </div>
                <div className="flex items-center gap-1.5 text-[10px] text-zinc-600 font-semibold shrink-0">
                  <IconTag className="h-3 w-3" />
                  {(analytics.tagStats || []).length} topics
                </div>
              </div>

              {analytics.tagStats && analytics.tagStats.length > 0 ? (
                <div className="flex-1 overflow-auto border border-zinc-800/50 rounded-lg">
                  <table className="w-full text-left border-collapse text-xs select-none">
                    <thead>
                      <tr className="bg-zinc-900/80 border-b border-zinc-800 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                        <th className="px-3 py-2">Concept / Tag</th>
                        <th className="px-3 py-2 text-center w-20">Problems</th>
                        <th className="px-3 py-2 text-center w-20">Attempts</th>
                        <th className="px-3 py-2 text-right w-32">Proficiency</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/50">
                      {analytics.tagStats.map((tag) => {
                        let rateBg = "bg-zinc-800"
                        let rateText = "text-zinc-500"
                        if (tag.submissions > 0) {
                          if (tag.rate >= 70) { rateBg = "bg-emerald-500"; rateText = "text-emerald-400" }
                          else if (tag.rate >= 40) { rateBg = "bg-amber-500"; rateText = "text-amber-400" }
                          else { rateBg = "bg-rose-500"; rateText = "text-rose-400" }
                        }
                        return (
                          <tr key={tag.name} className="hover:bg-zinc-900/30">
                            <td className="px-3 py-2.5">
                              <span className="inline-block px-2 py-0.5 rounded text-[10px] bg-zinc-950 border border-zinc-800 text-zinc-300 font-medium">
                                {tag.name}
                              </span>
                            </td>
                            <td className="px-3 py-2.5 text-center">
                              <span className="font-mono font-bold text-zinc-300 text-[11px]">
                                {tag.problemCount}
                              </span>
                            </td>
                            <td className="px-3 py-2.5 text-center font-mono text-zinc-500 text-[11px]">
                              {tag.submissions}
                            </td>
                            <td className="px-3 py-2.5 text-right">
                              {tag.submissions > 0 ? (
                                <div className="flex items-center justify-end gap-2">
                                  <span className={`font-mono font-bold text-[11px] ${rateText}`}>
                                    {tag.rate}%
                                  </span>
                                  <div className="w-12 h-1 bg-zinc-900 border border-zinc-800/50 rounded-full overflow-hidden">
                                    <div
                                      className={`h-full ${rateBg} rounded-full`}
                                      style={{ width: `${tag.rate}%` }}
                                    />
                                  </div>
                                </div>
                              ) : (
                                <span className="text-[10px] text-zinc-700 font-medium">No data</span>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center gap-3 text-zinc-700 border border-zinc-800/50 rounded-lg">
                  <IconTag className="h-7 w-7 stroke-[1.5]" />
                  <div className="text-center">
                    <p className="text-[10px] font-bold uppercase tracking-widest mb-1">No curriculum topics yet</p>
                    <p className="text-[10px] text-zinc-800">Import problems with tags to see concept analytics</p>
                  </div>
                  <button
                    onClick={() => setActiveTab("create")}
                    className="flex items-center gap-1.5 text-[10px] text-emerald-500 hover:text-emerald-400 font-semibold"
                  >
                    <IconUpload className="h-3 w-3" /> Import Problems
                  </button>
                </div>
              )}
            </div>

            {/* Live Activity Feed */}
            <div className="lg:col-span-6 bg-zinc-900/30 border border-zinc-800/60 rounded-xl p-5 flex flex-col min-h-[360px]">
              <div className="mb-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-0.5">
                  Live Activity Feed
                </h3>
                <p className="text-[10px] text-zinc-600">Latest student submissions across all challenges.</p>
              </div>

              <div className="flex-1 overflow-auto border border-zinc-800/50 rounded-lg p-2.5 bg-zinc-950/20 space-y-2">
                {recentSubmissions.length > 0 ? (
                  recentSubmissions.map((log) => (
                    <div
                      key={log.id}
                      className="bg-zinc-900/50 border border-zinc-800/50 rounded-lg p-2.5 flex items-start justify-between text-xs hover:border-zinc-700/50 transition-colors gap-2"
                    >
                      <div className="space-y-0.5 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-zinc-200 truncate">{log.student_name}</span>
                          <span className="text-[9px] text-zinc-600 shrink-0">
                            {new Date(log.created_at).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                        <p className="text-[10px] text-zinc-500">
                          <span className="font-bold text-zinc-300">"{log.problem_title}"</span>
                          {" · "}
                          <span className="font-mono text-zinc-600">{LANG_NAMES[log.language_id] || "Unknown"}</span>
                        </p>
                      </div>
                      <span
                        className={`shrink-0 inline-block px-1.5 py-0.5 rounded text-[9px] font-bold uppercase border ${
                          log.status === "Accepted"
                            ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
                            : "text-rose-400 bg-rose-500/10 border-rose-500/20"
                        }`}
                      >
                        {log.status === "Accepted" ? "AC" : log.status === "Wrong Answer" ? "WA" : log.status?.slice(0, 4) || "?"}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="h-full flex flex-col items-center justify-center py-10 gap-2 text-zinc-700">
                    <IconActivity className="h-7 w-7 stroke-[1.5]" />
                    <span className="text-[10px] font-bold uppercase tracking-widest">
                      No submissions yet
                    </span>
                    {analytics.totalProblems > 0 && (
                      <p className="text-[9px] text-zinc-800 text-center max-w-[180px]">
                        Activity will appear here once students start submitting solutions
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── MANAGE PROBLEMS TAB ── */}
      {activeTab === "problems" && (
        <div className="space-y-4 animate-in fade-in-50 duration-200">
          {/* Toolbar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-sm">
              <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-600" />
              <input
                type="text"
                placeholder="Search challenges or tags..."
                value={problemSearch}
                onChange={(e) => setProblemSearch(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg pl-9 pr-3 py-2 text-xs text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-700"
              />
            </div>
            <div className="flex items-center gap-2">
              <select
                value={difficultyFilter}
                onChange={(e) => setDifficultyFilter(e.target.value)}
                className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs font-semibold text-zinc-300 focus:outline-none cursor-pointer"
              >
                <option value="All">All Difficulty</option>
                <option value="Easy">Easy</option>
                <option value="Medium">Medium</option>
                <option value="Hard">Hard</option>
              </select>
              <button
                onClick={() => setActiveTab("create")}
                className="flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-400 text-black px-3 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer"
              >
                <IconPlus className="h-3.5 w-3.5" /> Add Problem
              </button>
            </div>
          </div>

          <div className="bg-zinc-900/30 border border-zinc-800/60 rounded-xl overflow-hidden">
            <div className="grid grid-cols-12 gap-2 px-4 py-2.5 bg-zinc-900/80 border-b border-zinc-800 text-[10px] font-bold text-zinc-500 uppercase tracking-widest select-none">
              <div className="col-span-1">#</div>
              <div className="col-span-5">Challenge Title</div>
              <div className="col-span-2">Difficulty</div>
              <div className="col-span-2">Acceptance</div>
              <div className="col-span-2 text-right">Actions</div>
            </div>

            {filteredProblems.length > 0 ? (
              <div className="divide-y divide-zinc-800/50">
                {filteredProblems.map((problem, idx) => (
                  <div
                    key={problem.id}
                    className="grid grid-cols-12 gap-2 items-center px-4 py-3 hover:bg-zinc-900/30 transition-colors text-xs"
                  >
                    <div className="col-span-1 text-zinc-600 font-mono text-[10px]">{idx + 1}.</div>
                    <div className="col-span-5 flex items-center gap-2 min-w-0">
                      <span className="font-semibold text-zinc-200 truncate">{problem.title}</span>
                    </div>
                    <div className="col-span-2">
                      <span className={`inline-block px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border ${DIFFICULTY_COLORS[problem.difficulty]}`}>
                        {problem.difficulty}
                      </span>
                    </div>
                    <div className="col-span-2">
                      <span className="font-medium text-zinc-300">
                        {problem.acceptance_rate !== null ? `${problem.acceptance_rate}%` : "—"}
                      </span>
                      <span className="text-[10px] text-zinc-600 ml-1">({problem.total_submissions})</span>
                    </div>
                    <div className="col-span-2 flex items-center justify-end gap-1">
                      <Link
                        href={`/~/logiclab/admin/edit/${problem.id}`}
                        className="p-1.5 hover:bg-zinc-800 rounded text-zinc-500 hover:text-emerald-400 transition-all inline-flex items-center justify-center border border-zinc-800/50"
                        title="Edit Problem"
                      >
                        <IconEdit className="h-3.5 w-3.5" />
                      </Link>
                      <button
                        onClick={() => setDeletingProblemId(problem.id)}
                        className="p-1.5 hover:bg-zinc-800 rounded text-zinc-500 hover:text-rose-400 transition-all inline-flex items-center justify-center border border-zinc-800/50 cursor-pointer"
                        title="Delete Problem"
                      >
                        <IconTrash className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 gap-3 select-none">
                <IconCode className="h-8 w-8 text-zinc-800 stroke-[1.5]" />
                <p className="text-[10px] text-zinc-600 font-bold uppercase tracking-wider">
                  {localProblems.length === 0
                    ? "No challenges in your library yet"
                    : "No challenges matched your search"}
                </p>
                {localProblems.length === 0 && (
                  <button
                    onClick={() => setActiveTab("create")}
                    className="flex items-center gap-1.5 text-[10px] text-emerald-500 hover:text-emerald-400 font-semibold"
                  >
                    <IconUpload className="h-3 w-3" /> Import or create problems
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── CREATE / IMPORT TAB ── */}
      {activeTab === "create" && (
        <div className="animate-in fade-in-50 duration-200">
          <AdminProblemCreatorClient />
        </div>
      )}

      {/* ── Delete Confirmation Modal ── */}
      {deletingProblemId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-zinc-950 border border-zinc-800 rounded-xl shadow-2xl overflow-hidden w-full max-w-md flex flex-col animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between px-4 py-3.5 bg-zinc-900 border-b border-zinc-800">
              <h3 className="text-sm font-bold text-rose-400 uppercase tracking-wider flex items-center gap-2">
                <IconAlertTriangle className="h-4 w-4" /> Permanent Deletion
              </h3>
              <button
                onClick={() => setDeletingProblemId(null)}
                disabled={isDeleting}
                className="p-1 hover:bg-zinc-800 rounded text-zinc-500 hover:text-white transition-colors cursor-pointer"
              >
                <IconX className="h-4 w-4" />
              </button>
            </div>
            <div className="p-5 text-sm text-zinc-300 space-y-3">
              <p>Are you absolutely sure you want to permanently delete this coding problem?</p>
              <div className="p-3 bg-rose-500/5 border border-rose-500/10 rounded-lg text-xs text-rose-400/90 leading-relaxed">
                <strong>WARNING:</strong> This action is irreversible. All student submissions and performance
                records for this challenge will be permanently purged.
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 px-4 py-3 bg-zinc-900/50 border-t border-zinc-800">
              <button
                onClick={() => setDeletingProblemId(null)}
                disabled={isDeleting}
                className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-zinc-400 hover:text-white bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 transition-colors cursor-pointer disabled:opacity-40"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="flex items-center gap-1.5 bg-rose-500 hover:bg-rose-400 text-white px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer disabled:opacity-40"
              >
                {isDeleting ? (
                  <>
                    <span className="h-3 w-3 border border-current border-t-transparent rounded-full animate-spin inline-block" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <IconTrash className="h-3.5 w-3.5" />
                    Delete Problem
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
