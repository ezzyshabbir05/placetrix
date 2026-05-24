"use client"

import React, { useState, useCallback, useMemo } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  Code,
  Plus,
  Edit,
  Trash2,
  Search,
  Users,
  Activity,
  CheckCircle2,
  Clock,
  Cpu,
  AlertCircle,
  X,
  AlertTriangle,
  BookOpen,
  TrendingUp,
  LayoutDashboard,
  Tag,
  Upload,
  Sparkles,
  ChevronRight,
  ChevronLeft,
  ChevronsLeft,
  ChevronsRight,
  Loader2,
} from "lucide-react"
import { toast } from "sonner"
import { createClient } from "@/lib/supabase/client"
import { AdminProblemCreatorClient } from "./AdminProblemCreatorClient"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"

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
  solvedDifficultyCounts: {
    Easy: number
    Medium: number
    Hard: number
  }
  solvedTags: Record<string, number>
  recentSubmissions: {
    id: string
    created_at: string
    status: string
    problem_title: string
    difficulty: string
    language_id: number
    passed_count?: number | null
    total_count?: number | null
    failed_test_case_info?: {
      index: number
      input: string
      expected: string
      actual: string
    } | null
  }[]
}

interface TagStat {
  name: string
  problemCount: number
  submissions: number
  accepted: number
  rate: number
  studentsSolved: number
  totalStudents: number
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
  Easy: "text-emerald-600 dark:text-emerald-400 bg-emerald-500/5 dark:bg-emerald-500/10 border-emerald-500/15 dark:border-emerald-500/20",
  Medium: "text-amber-600 dark:text-amber-400 bg-amber-500/5 dark:bg-amber-500/10 border-amber-500/15 dark:border-amber-500/20",
  Hard: "text-rose-600 dark:text-rose-400 bg-rose-500/5 dark:bg-rose-500/10 border-rose-500/15 dark:border-rose-500/20",
}

const LANG_NAMES: Record<number, string> = {
  71: "Python",
  63: "JavaScript",
  54: "C++",
  62: "Java",
}

// Helper to render verbose diagnostics for failed test cases
function SubmissionDiagnostics({ sub }: { sub: any }) {
  if (sub.status === "Accepted") return null
  
  let failedInfo = sub.failed_test_case_info
  if (typeof failedInfo === "string") {
    try {
      failedInfo = JSON.parse(failedInfo)
    } catch {
      failedInfo = null
    }
  }
  
  if (!failedInfo) return null

  const isWA = sub.status === "Wrong Answer"
  
  return (
    <div className="mt-1.5 p-3 bg-rose-500/5 dark:bg-rose-500/10 border border-rose-500/10 dark:border-rose-500/20 rounded-lg text-xs space-y-2 select-text">
      <div className="flex items-center justify-between select-none">
        <span className="font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider text-[9px] flex items-center gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-rose-500 animate-pulse" />
          Diagnostics: {sub.status}
        </span>
        {sub.passed_count !== null && sub.total_count !== null && (
          <span className="text-[9px] text-muted-foreground/80 font-mono">
            Passed {sub.passed_count}/{sub.total_count} cases
          </span>
        )}
      </div>
      
      <div className="space-y-1.5 text-[10px] font-mono leading-relaxed bg-black/40 p-2.5 border border-border/50 rounded-md text-foreground">
        {failedInfo.index && (
          <div>
            <span className="text-muted-foreground/60 font-semibold font-mono">Failing Test Case:</span>{" "}
            <span className="text-foreground font-bold font-mono">#{failedInfo.index}</span>
          </div>
        )}
        
        {failedInfo.input && failedInfo.input !== "(hidden)" && (
          <div>
            <span className="text-muted-foreground/60 font-semibold block mb-0.5">Input Parameters:</span>{" "}
            <code className="text-foreground/90 bg-muted px-1 rounded block max-h-16 overflow-y-auto whitespace-pre-wrap py-0.5">{failedInfo.input}</code>
          </div>
        )}

        {isWA && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1.5 pt-1.5 border-t border-border/20">
            <div>
              <span className="text-emerald-500/80 font-semibold block mb-0.5">Expected Output:</span>
              <code className="text-emerald-400 bg-emerald-950/20 border border-emerald-500/10 px-1 rounded block whitespace-pre-wrap max-h-20 overflow-y-auto py-0.5">{failedInfo.expected}</code>
            </div>
            <div>
              <span className="text-rose-500/80 font-semibold block mb-0.5">Actual Received:</span>
              <code className="text-rose-400 bg-rose-950/20 border border-rose-500/10 px-1 rounded block whitespace-pre-wrap max-h-20 overflow-y-auto py-0.5">{failedInfo.actual}</code>
            </div>
          </div>
        )}

        {!isWA && failedInfo.actual && (
          <div className="mt-1.5 pt-1.5 border-t border-border/20">
            <span className="text-rose-500/80 font-semibold block mb-0.5">Error/Output diagnostics:</span>
            <pre className="mt-0.5 p-2 rounded bg-background/50 border border-border/30 text-rose-400 font-mono text-[9px] whitespace-pre-wrap max-h-32 overflow-y-auto leading-relaxed">
              {failedInfo.actual}
            </pre>
          </div>
        )}
      </div>
    </div>
  )
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
    <Card className="border border-emerald-500/20 bg-emerald-500/5 hover:border-emerald-500/30 shadow-none rounded-2xl p-5 md:p-6 flex flex-col md:flex-row items-start md:items-center gap-5">
      <div className="h-12 w-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
        <Sparkles className="h-6 w-6 text-emerald-500 dark:text-emerald-400" />
      </div>
      <div className="flex-1 min-w-0">
        <h2 className="text-sm font-bold text-foreground mb-1">Your curriculum library is empty</h2>
        <p className="text-xs text-muted-foreground leading-relaxed">
          10 pre-built challenges are bundled with your project in{" "}
          <code className="text-emerald-500 dark:text-emerald-400 font-mono text-[11px] bg-background px-1.5 py-0.5 rounded border border-border">
            problems_import.json
          </code>
          . Click <strong className="text-foreground">Quick Seed</strong> to load them instantly, or use the manual import flow below.
        </p>
      </div>
      <div className="flex items-center gap-2 shrink-0 w-full md:w-auto">
        <Button
          onClick={onSeed}
          disabled={isSeeding}
          size="sm"
          className="flex-1 md:flex-none flex items-center gap-2 bg-emerald-500 hover:bg-emerald-500/90 text-white font-semibold rounded-xl"
        >
          {isSeeding ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Seeding...
            </>
          ) : (
            <>
              <Sparkles className="h-3.5 w-3.5" />
              Quick Seed
            </>
          )}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={onImport}
          className="flex-1 md:flex-none flex items-center gap-2 rounded-xl border-muted-foreground/20 text-foreground hover:bg-secondary/50"
        >
          <Upload className="h-3.5 w-3.5" />
          Manual Import
        </Button>
      </div>
    </Card>
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
  const [activeTab, setActiveTab] = useState<"overview" | "analytics" | "problems" | "create">("overview")
  const [localProblems, setLocalProblems] = useState<Problem[]>(initialProblems)
  const [recentSubmissions] = useState<SubmissionLog[]>(initialRecentSubmissions)

  const [problemSearch, setProblemSearch] = useState("")
  const [difficultyFilter, setDifficultyFilter] = useState("All")
  const [studentSearch, setStudentSearch] = useState("")

  const [studentCategoryFilter, setStudentCategoryFilter] = useState<"All" | "Struggling" | "Inactive">("All")
  const [selectedStudent, setSelectedStudent] = useState<StudentStat | null>(null)

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)

  const [deletingProblemId, setDeletingProblemId] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isSeeding, setIsSeeding] = useState(false)

  const isEmpty = analytics.totalProblems === 0

  const handleExportRoster = () => {
    const listToExport = filteredStudents
    if (listToExport.length === 0) {
      toast.error("No student records available to export.")
      return
    }

    const headers = [
      "Rank",
      "Student Name",
      "Email",
      "Solved Count",
      "Attempt Count",
      "Accuracy Rate",
      "Status",
    ]

    const csvRows = [headers.join(",")]

    listToExport.forEach((st, idx) => {
      const successRate = st.attemptCount
        ? Math.round((st.solvedCount / st.attemptCount) * 100)
        : 0

      let status = "Inactive"
      if (st.attemptCount > 0) {
        if (st.attemptCount >= 3 && st.solvedCount < st.attemptCount * 0.35) status = "Struggling"
        else status = "Practicing"
      }

      const nameEscaped = `"${st.student_name.replace(/"/g, '""')}"`
      const emailEscaped = `"${st.student_email.replace(/"/g, '""')}"`

      csvRows.push([
        idx + 1,
        nameEscaped,
        emailEscaped,
        st.solvedCount,
        st.attemptCount,
        `${successRate}%`,
        status,
      ].join(","))
    })

    const csvContent = "data:text/csv;charset=utf-8," + csvRows.join("\n")
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement("a")
    link.setAttribute("href", encodedUri)
    const filename = `logiclab_student_roster_${studentCategoryFilter.toLowerCase()}_${new Date().toISOString().slice(0, 10)}.csv`
    link.setAttribute("download", filename)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast.success(`Successfully exported ${listToExport.length} students to CSV!`)
  }

  const handleQuickSeed = useCallback(async () => {
    setIsSeeding(true)
    const tId = toast.loading("Loading problems_import.json...")
    try {
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
    const matchesSearch = s.student_name.toLowerCase().includes(term) || s.student_email.toLowerCase().includes(term)
    if (!matchesSearch) return false

    if (studentCategoryFilter === "Struggling") {
      return s.attemptCount >= 3 && s.solvedCount < s.attemptCount * 0.35
    }
    if (studentCategoryFilter === "Inactive") {
      return s.attemptCount === 0
    }
    return true
  })

  // Sliced version for pagination
  const paginatedStudents = filteredStudents.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )
  const totalPages = Math.ceil(filteredStudents.length / itemsPerPage) || 1

  const totalSubmissions = analytics.totalSubmissions || 1
  const acceptanceRate = ((analytics.totalAccepted / totalSubmissions) * 100).toFixed(1)

  const tabConfig = [
    { value: "overview", label: "Overview", icon: <LayoutDashboard className="h-3.5 w-3.5" /> },
    { value: "analytics", label: "Concept Analytics", icon: <Tag className="h-3.5 w-3.5" /> },
    { value: "problems", label: "Manage Problems", icon: <Code className="h-3.5 w-3.5" /> },
    { value: "create", label: "Create / Import", icon: <Plus className="h-3.5 w-3.5" /> },
  ] as const

  return (
    <div className="flex flex-col gap-6 px-4 py-8 md:px-12 max-w-7xl mx-auto w-full text-foreground bg-background">
      
      {/* ── Tabs and Headers ── */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
        <div className="space-y-6">
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/40 pb-4 select-none">
            <div className="flex flex-col gap-1">
              <h1 className="text-2xl font-bold tracking-tight text-foreground">LogicLab Admin Center</h1>
              <p className="text-sm text-muted-foreground font-medium">
                Manage challenges, track performance metrics, and oversee student diagnostics.
              </p>
            </div>
            <div className="overflow-x-auto shrink-0 bg-muted/50 p-1 rounded-xl">
              <TabsList className="inline-flex h-8 gap-1 bg-transparent p-0">
                {tabConfig.map(({ value, label, icon }) => (
                  <TabsTrigger
                    key={value}
                    value={value}
                    className="gap-2 rounded-lg px-4 h-7 text-xs font-semibold tracking-tight data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm transition-all"
                  >
                    {icon}
                    {label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>
          </div>

          {/* ── OVERVIEW TAB ── */}
          <TabsContent value="overview" className="mt-0">
            <div className="space-y-5 animate-in fade-in-50 duration-200">
              
              {/* Onboarding banner */}
              {isEmpty && (
                <OnboardingBanner
                  onImport={() => setActiveTab("create")}
                  onSeed={handleQuickSeed}
                  isSeeding={isSeeding}
                />
              )}

              {/* 2-Column Overview Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                
                {/* Left Column (2/3 width): Leaderboard Table */}
                <div className="lg:col-span-8">
                  <Card className="border shadow-none overflow-hidden p-0 rounded-2xl">
                    <CardHeader className="p-6 pb-4 flex flex-row items-center justify-between border-b select-none">
                      <div className="space-y-1">
                        <CardTitle className="text-base font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                          <Users className="h-4.5 w-4.5 text-emerald-500" />
                          Student Insights & Leaderboard
                        </CardTitle>
                        <CardDescription className="text-xs text-muted-foreground">
                          View active student statuses, solve counts, and performance metrics.
                        </CardDescription>
                      </div>
                      <Badge className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 font-bold hover:bg-emerald-500/20 text-xs px-2.5 py-0.5 rounded-full">
                        {filteredStudents.length} Candidates
                      </Badge>
                    </CardHeader>
                    
                    <CardContent className="p-6 space-y-4">
                      
                      {/* Search and export row */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 select-none">
                        <div className="relative w-full sm:max-w-md">
                          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground/60" />
                          <Input
                            placeholder="Search by student name or email..."
                            value={studentSearch}
                            onChange={(e) => {
                              setStudentSearch(e.target.value)
                              setCurrentPage(1)
                            }}
                            className="pl-9 pr-9 h-9 rounded-xl border-muted-foreground/20 bg-background focus-visible:ring-1 text-xs"
                          />
                          {studentSearch && (
                            <button
                              onClick={() => {
                                setStudentSearch("")
                                setCurrentPage(1)
                              }}
                              className="absolute right-3 top-2.5 h-4 w-4 flex items-center justify-center text-muted-foreground/60 hover:text-foreground transition-colors"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                        
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleExportRoster}
                          className="rounded-xl border-muted-foreground/20 text-foreground hover:bg-secondary/50 font-medium h-9"
                        >
                          <Upload className="h-3.5 w-3.5 rotate-180 mr-1.5 text-emerald-500" />
                          Export CSV
                        </Button>
                      </div>
                      
                      {/* Category filters */}
                      <div className="flex flex-wrap items-center gap-1.5 pt-1.5 select-none border-b border-border/40 pb-3 font-sans">
                        {(["All", "Struggling", "Inactive"] as const).map((cat) => {
                          let badgeClass = "px-3 py-1 rounded-full text-[11px] font-semibold border transition-all cursor-pointer whitespace-nowrap "
                          if (studentCategoryFilter === cat) {
                            if (cat === "Struggling") badgeClass += "bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-400 font-bold border-rose-500/50"
                            else if (cat === "Inactive") badgeClass += "bg-zinc-500/10 border-zinc-500/30 text-zinc-600 dark:text-zinc-400 font-bold"
                            else badgeClass += "bg-emerald-500 hover:bg-emerald-500 text-white border-0 shadow-sm shadow-emerald-500/10"
                          } else {
                            badgeClass += "border-muted-foreground/20 text-muted-foreground hover:text-foreground hover:bg-secondary/50 bg-transparent"
                          }
                          
                          return (
                            <button
                              key={cat}
                              onClick={() => {
                                setStudentCategoryFilter(cat)
                                setCurrentPage(1)
                              }}
                              className={badgeClass}
                            >
                              {cat === "Struggling" ? "Struggling candidates" : cat === "Inactive" ? "Inactive candidates" : "All candidates"}
                            </button>
                          )
                        })}
                      </div>

                      {/* Leaderboard grid table */}
                      <div className="border border-border/50 rounded-xl overflow-hidden bg-background/25">
                        <Table className="min-w-[600px] text-xs">
                          <TableHeader>
                            <TableRow className="bg-muted hover:bg-muted font-bold text-muted-foreground uppercase text-[10px] tracking-wider border-b">
                              <TableHead className="px-4 py-2.5 text-center w-12 font-bold text-muted-foreground">Rank</TableHead>
                              <TableHead className="px-4 py-2.5 font-bold text-muted-foreground">Student details</TableHead>
                              <TableHead className="px-4 py-2.5 text-center w-24 font-bold text-muted-foreground">Solved</TableHead>
                              <TableHead className="px-4 py-2.5 text-center w-24 font-bold text-muted-foreground">Attempts</TableHead>
                              <TableHead className="px-4 py-2.5 text-center w-24 font-bold text-muted-foreground">Accuracy</TableHead>
                              <TableHead className="px-4 py-2.5 text-center w-36 font-bold text-muted-foreground">Status</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody className="divide-y divide-border/50">
                            {paginatedStudents.length > 0 ? (
                              paginatedStudents.map((st, idx) => {
                                const rank = (currentPage - 1) * itemsPerPage + idx + 1
                                const successRate = st.attemptCount
                                  ? Math.round((st.solvedCount / st.attemptCount) * 100)
                                  : 0
                                
                                let statusLabel = "Practicing"
                                let statusStyle = "bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400 font-bold"
                                if (st.attemptCount === 0) {
                                  statusLabel = "Inactive"
                                  statusStyle = "bg-zinc-500/10 border-zinc-500/30 text-zinc-600 dark:text-zinc-400 font-bold"
                                } else if (st.attemptCount >= 3 && st.solvedCount < st.attemptCount * 0.35) {
                                  statusLabel = "Struggling"
                                  statusStyle = "bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-400 font-bold animate-pulse"
                                }

                                return (
                                  <TableRow
                                    key={st.user_id}
                                    onClick={() => setSelectedStudent(st)}
                                    className="hover:bg-muted/30 transition-colors cursor-pointer group border-b"
                                    title="Click to view candidate deep-dive profile"
                                  >
                                    <TableCell className="px-4 py-3 text-center font-mono text-muted-foreground/50 text-[10px]">
                                      {rank}
                                    </TableCell>
                                    <TableCell className="px-4 py-3">
                                      <div className="font-semibold text-foreground/90 group-hover:text-emerald-500 transition-colors">{st.student_name}</div>
                                      <div className="text-[10px] text-muted-foreground/75 mt-0.5">{st.student_email}</div>
                                    </TableCell>
                                    <TableCell className="px-4 py-3 text-center">
                                      <Badge className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-[10px] font-bold px-2 py-0.5 rounded-full select-none">
                                        {st.solvedCount}
                                      </Badge>
                                    </TableCell>
                                    <TableCell className="px-4 py-3 text-center font-mono text-muted-foreground text-[11px]">
                                      {st.attemptCount}
                                    </TableCell>
                                    <TableCell className="px-4 py-3 text-center font-mono font-bold text-indigo-600 dark:text-indigo-400 text-[11px]">
                                      {successRate}%
                                    </TableCell>
                                    <TableCell className="px-4 py-3 text-center">
                                      <Badge variant="outline" className={cn("text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border-0 select-none", statusStyle)}>
                                        {statusLabel}
                                      </Badge>
                                    </TableCell>
                                  </TableRow>
                                )
                              })
                            ) : (
                              <TableRow>
                                <TableCell colSpan={6} className="px-4 py-16 text-center">
                                  <div className="flex flex-col items-center gap-2 text-muted-foreground/30">
                                    <Users className="h-6 w-6 stroke-[1.5]" />
                                    <span className="text-[10px] font-bold uppercase tracking-widest">
                                      {analytics.totalSubmissions === 0
                                        ? "No student submissions recorded"
                                        : "No matches found for search query"}
                                    </span>
                                  </div>
                                </TableCell>
                              </TableRow>
                            )}
                          </TableBody>
                        </Table>
                      </div>

                      {/* Pagination Controls */}
                      {filteredStudents.length > 0 && (
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t select-none">
                          <div className="text-xs text-muted-foreground font-medium">
                            Showing{" "}
                            <span className="font-semibold text-foreground">
                              {filteredStudents.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1}
                            </span>
                            {" "}to{" "}
                            <span className="font-semibold text-foreground">
                              {Math.min(filteredStudents.length, currentPage * itemsPerPage)}
                            </span>
                            {" "}of{" "}
                            <span className="font-semibold text-foreground">{filteredStudents.length}</span> students
                          </div>

                          <div className="flex flex-wrap items-center gap-4 sm:gap-6">
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-muted-foreground font-medium whitespace-nowrap">Rows per page</span>
                              <Select
                                value={itemsPerPage.toString()}
                                onValueChange={(val) => {
                                  setItemsPerPage(Number(val))
                                  setCurrentPage(1)
                                }}
                              >
                                <SelectTrigger className="h-8 w-[70px] text-xs rounded-lg border-muted-foreground/20">
                                  <SelectValue placeholder={itemsPerPage.toString()} />
                                </SelectTrigger>
                                <SelectContent className="rounded-xl">
                                  {[5, 10, 20, 50].map((s) => (
                                    <SelectItem key={s} value={s.toString()} className="text-xs rounded-lg">{s}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>

                            <div className="flex items-center gap-1">
                              <Button variant="outline" size="icon" className="h-8 w-8 rounded-lg border-muted-foreground/20"
                                onClick={() => setCurrentPage(1)} disabled={currentPage === 1}>
                                <ChevronsLeft className="h-4 w-4" />
                                <span className="sr-only">First page</span>
                              </Button>
                              <Button variant="outline" size="icon" className="h-8 w-8 rounded-lg border-muted-foreground/20"
                                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1}>
                                <ChevronLeft className="h-4 w-4" />
                                <span className="sr-only">Previous page</span>
                              </Button>
                              <div className="flex items-center justify-center text-xs font-semibold text-foreground min-w-[90px]">
                                Page {currentPage} of {totalPages}
                              </div>
                              <Button variant="outline" size="icon" className="h-8 w-8 rounded-lg border-muted-foreground/20"
                                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages || totalPages === 0}>
                                <ChevronRight className="h-4 w-4" />
                                <span className="sr-only">Next page</span>
                              </Button>
                              <Button variant="outline" size="icon" className="h-8 w-8 rounded-lg border-muted-foreground/20"
                                onClick={() => setCurrentPage(totalPages)}
                                disabled={currentPage === totalPages || totalPages === 0}>
                                <ChevronsRight className="h-4 w-4" />
                                <span className="sr-only">Last page</span>
                              </Button>
                            </div>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* Right Column (1/3 width): Feed & Language distributing charts */}
                <div className="lg:col-span-4 space-y-6">
                  
                  {/* Live Activity Feed */}
                  <Card className="border shadow-none overflow-hidden p-0 rounded-2xl">
                    <CardHeader className="p-6 pb-4 flex flex-row items-center justify-between border-b select-none">
                      <div className="space-y-1">
                        <CardTitle className="text-base font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                          <Activity className="h-4.5 w-4.5 text-indigo-500" />
                          Live Submission Feed
                        </CardTitle>
                        <CardDescription className="text-[10px] text-muted-foreground">
                          Real-time submissions log of all active students.
                        </CardDescription>
                      </div>
                      <Badge className="bg-indigo-500/10 border border-indigo-500/30 text-indigo-600 dark:text-indigo-400 font-bold hover:bg-indigo-500/20 text-[10px] px-2.5 py-0.5 rounded-full select-none">
                        {acceptanceRate}% success
                      </Badge>
                    </CardHeader>
                    
                    <CardContent className="p-6">
                      <div className="overflow-y-auto border border-border/50 rounded-lg p-2 bg-background/25 space-y-2 max-h-[350px] scrollbar-thin">
                        {recentSubmissions.length > 0 ? (
                          recentSubmissions.map((log) => (
                            <div
                              key={log.id}
                              className="bg-muted/40 border border-border/50 rounded-xl p-3 flex items-start justify-between text-xs hover:border-muted-foreground/20 hover:bg-muted/60 transition-all gap-2"
                            >
                              <div className="space-y-1 min-w-0">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="font-semibold text-foreground/90 truncate max-w-[120px]">{log.student_name}</span>
                                  <span className="text-[9px] text-muted-foreground/50 shrink-0">
                                    {new Date(log.created_at).toLocaleTimeString([], {
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    })}
                                  </span>
                                </div>
                                <p className="text-[10px] text-muted-foreground/75 truncate max-w-[200px]">
                                  <span className="font-bold text-foreground/85">"{log.problem_title}"</span>
                                  {" · "}
                                  <span className="font-mono text-muted-foreground/50">{LANG_NAMES[log.language_id] || "Unknown"}</span>
                                </p>
                              </div>
                              <Badge
                                variant="outline"
                                className={`shrink-0 text-[8px] font-extrabold uppercase border px-2 py-0.5 rounded-full border-0 select-none ${
                                  log.status === "Accepted"
                                    ? "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20 hover:bg-emerald-500/10"
                                    : "text-rose-600 dark:text-rose-400 bg-rose-500/10 border-rose-500/20 hover:bg-rose-500/10"
                                }`}
                              >
                                {log.status === "Accepted" ? "AC" : log.status === "Wrong Answer" ? "WA" : log.status?.slice(0, 4) || "?"}
                              </Badge>
                            </div>
                          ))
                        ) : (
                          <div className="h-full flex flex-col items-center justify-center py-10 gap-2 text-muted-foreground/30">
                            <Activity className="h-7 w-7 stroke-[1.2]" />
                            <span className="text-[10px] font-bold uppercase tracking-widest">
                              No submissions captured
                            </span>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Language Distribution */}
                  <Card className="border shadow-none overflow-hidden p-0 rounded-2xl">
                    <CardHeader className="p-6 pb-4 select-none border-b">
                      <CardTitle className="text-base font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                        <Cpu className="h-4.5 w-4.5 text-cyan-500" />
                        Language Popularity
                      </CardTitle>
                      <CardDescription className="text-xs text-muted-foreground">
                        Total compile executions grouped by language.
                      </CardDescription>
                    </CardHeader>
                    
                    <CardContent className="p-6 space-y-4">
                      {[
                        { id: 71, label: "Python", color: "bg-emerald-500", text: "text-emerald-600 dark:text-emerald-400" },
                        { id: 63, label: "JavaScript", color: "bg-amber-500", text: "text-amber-600 dark:text-amber-400" },
                        { id: 54, label: "C++", color: "bg-rose-500", text: "text-rose-600 dark:text-rose-400" },
                        { id: 62, label: "Java", color: "bg-cyan-500", text: "text-cyan-600 dark:text-cyan-400" },
                      ].map((lang) => {
                        const count = analytics.languageCounts[lang.id] || 0
                        const pct = analytics.totalSubmissions ? (count / analytics.totalSubmissions) * 100 : 0
                        return (
                          <div key={lang.id} className="space-y-1.5">
                            <div className="flex items-center justify-between text-xs">
                              <span className="flex items-center gap-1.5 text-muted-foreground font-semibold">
                                <span className={`h-2.5 w-2.5 rounded-full ${lang.color}`} />
                                {lang.label}
                              </span>
                              <span className={`text-[10px] font-mono font-bold ${count ? lang.text : "text-muted-foreground/30"}`}>
                                {count} ({pct.toFixed(0)}%)
                              </span>
                            </div>
                            <Progress value={pct} className="h-1.5 bg-secondary" />
                          </div>
                        )
                      })}

                      {analytics.totalSubmissions === 0 && (
                        <p className="text-[10px] text-muted-foreground/30 text-center pt-2 font-medium uppercase tracking-widest">
                          No languages logged
                        </p>
                      )}
                    </CardContent>
                  </Card>
                </div>

              </div>
            </div>
          </TabsContent>

          {/* ── CONCEPT ANALYTICS TAB ── */}
          <TabsContent value="analytics" className="mt-0">
            <Card className="border shadow-none overflow-hidden p-0 rounded-2xl animate-in fade-in-50 duration-300">
              <CardHeader className="p-6 pb-4 flex flex-row items-center justify-between border-b select-none">
                <div className="space-y-1">
                  <CardTitle className="text-base font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                    <Tag className="h-4.5 w-4.5 text-amber-500" />
                    Concept Tag Analytics
                  </CardTitle>
                  <CardDescription className="text-xs text-muted-foreground">
                    Detailed tags aggregated from challenge library, student progress profiles, and tag solve efficiency rates.
                  </CardDescription>
                </div>
                <Badge className="bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 font-bold hover:bg-amber-500/20 text-xs px-2.5 py-0.5 rounded-full">
                  {analytics.totalProblems} Challenges · {(analytics.tagStats || []).length} Concept Topics
                </Badge>
              </CardHeader>

              <CardContent className="p-6">
                {analytics.tagStats && analytics.tagStats.length > 0 ? (
                  <div className="border border-border/50 rounded-xl overflow-hidden bg-background/25">
                    <Table className="min-w-[600px] text-xs">
                      <TableHeader>
                        <TableRow className="bg-muted hover:bg-muted font-bold text-muted-foreground uppercase text-[10px] tracking-wider border-b">
                          <TableHead className="px-5 py-3 font-bold text-muted-foreground">Concept Tag Name</TableHead>
                          <TableHead className="px-5 py-3 text-center w-36 font-bold text-muted-foreground">Total Challenges</TableHead>
                          <TableHead className="px-5 py-3 w-72 font-bold text-muted-foreground">Student Completion Rate</TableHead>
                          <TableHead className="px-5 py-3 text-right w-36 font-bold text-muted-foreground">Average Accuracy</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody className="divide-y divide-border/50 text-xs">
                        {analytics.tagStats.map((tag) => {
                          let rateText = "text-muted-foreground/75"
                          if (tag.submissions > 0) {
                            if (tag.rate >= 70) { rateText = "text-emerald-600 dark:text-emerald-400 font-bold" }
                            else if (tag.rate >= 40) { rateText = "text-amber-600 dark:text-amber-400 font-bold" }
                            else { rateText = "text-rose-600 dark:text-rose-400 font-bold" }
                          }

                          const totalStu = tag.totalStudents || 0
                          const solvedStu = tag.studentsSolved || 0
                          const stuPct = totalStu > 0 ? Math.round((solvedStu / totalStu) * 100) : 0
                          let stuBarColor = "bg-zinc-600"
                          if (stuPct >= 70) stuBarColor = "bg-emerald-500"
                          else if (stuPct >= 40) stuBarColor = "bg-amber-500"
                          else if (stuPct > 0) stuBarColor = "bg-rose-500"

                          return (
                            <TableRow key={tag.name} className="hover:bg-muted/30 border-b">
                              <TableCell className="px-5 py-4">
                                <span className="inline-flex items-center gap-2 px-3 py-1 rounded-xl text-xs bg-background border border-border text-foreground/75 font-semibold">
                                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.3)]" />
                                  {tag.name}
                                </span>
                              </TableCell>
                              <TableCell className="px-5 py-4 text-center font-mono font-bold text-foreground/90 text-sm">
                                {tag.problemCount}
                              </TableCell>
                              <TableCell className="px-5 py-4">
                                {totalStu > 0 ? (
                                  <div className="flex items-center gap-3">
                                    <div className="flex-1 h-2 bg-card border border-border/50 rounded-full overflow-hidden min-w-[120px]">
                                      <div
                                        className={`h-full ${stuBarColor} rounded-full transition-all duration-500`}
                                        style={{ width: `${stuPct}%` }}
                                      />
                                    </div>
                                    <span className="text-xs font-mono text-muted-foreground shrink-0 font-bold">
                                      {solvedStu}
                                      <span className="text-muted-foreground/50">/{totalStu}</span>
                                    </span>
                                  </div>
                                ) : (
                                  <span className="text-xs text-muted-foreground/30 font-medium">0</span>
                                )}
                              </TableCell>
                              <TableCell className="px-5 py-4 text-right">
                                {tag.submissions > 0 ? (
                                  <span className={`font-mono font-bold text-sm ${rateText}`}>
                                    {tag.rate}%
                                  </span>
                                ) : (
                                  <span className="text-xs text-muted-foreground/30 font-medium">—</span>
                                )}
                              </TableCell>
                            </TableRow>
                          )
                        })}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center gap-4 text-muted-foreground/30 border border-border/50 border-dashed rounded-2xl py-20 bg-background/10">
                    <Tag className="h-10 w-10 stroke-[1.2]" />
                    <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground/40">No Concept Tags Configured</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── MANAGE PROBLEMS TAB ── */}
          <TabsContent value="problems" className="mt-0">
            <div className="space-y-4 animate-in fade-in-50 duration-200">
              
              {/* Toolbar */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 select-none">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground/60" />
                  <Input
                    placeholder="Search challenges or tags..."
                    value={problemSearch}
                    onChange={(e) => setProblemSearch(e.target.value)}
                    className="pl-9 pr-9 h-9 rounded-xl border-muted-foreground/20 bg-background focus-visible:ring-1 text-xs"
                  />
                  {problemSearch && (
                    <button
                      onClick={() => setProblemSearch("")}
                      className="absolute right-3 top-2.5 h-4 w-4 flex items-center justify-center text-muted-foreground/60 hover:text-foreground transition-colors"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
                
                <div className="flex items-center gap-2">
                  <Select value={difficultyFilter} onValueChange={(val) => setDifficultyFilter(val)}>
                    <SelectTrigger className="h-9 w-[130px] text-xs font-semibold rounded-xl border-muted-foreground/20 bg-background">
                      <SelectValue placeholder="All Difficulty" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="All" className="text-xs rounded-lg">All Difficulty</SelectItem>
                      <SelectItem value="Easy" className="text-xs rounded-lg">Easy</SelectItem>
                      <SelectItem value="Medium" className="text-xs rounded-lg">Medium</SelectItem>
                      <SelectItem value="Hard" className="text-xs rounded-lg">Hard</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  <Button
                    onClick={() => setActiveTab("create")}
                    size="sm"
                    className="flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-500/90 text-white font-semibold rounded-xl h-9 px-4 text-xs select-none"
                  >
                    <Plus className="h-4 w-4" /> Add Problem
                  </Button>
                </div>
              </div>

              {/* Table Card */}
              <Card className="border shadow-none overflow-hidden p-0 rounded-2xl">
                <div className="overflow-x-auto">
                  <Table className="min-w-[600px] text-xs">
                    <TableHeader>
                      <TableRow className="bg-muted hover:bg-muted font-bold text-muted-foreground uppercase text-[10px] tracking-wider border-b">
                        <TableHead className="px-4 py-2.5 text-center w-12 font-bold text-muted-foreground">#</TableHead>
                        <TableHead className="px-4 py-2.5 font-bold text-muted-foreground">Challenge Title</TableHead>
                        <TableHead className="px-4 py-2.5 text-center w-36 font-bold text-muted-foreground">Difficulty</TableHead>
                        <TableHead className="px-4 py-2.5 text-center w-36 font-bold text-muted-foreground">Acceptance</TableHead>
                        <TableHead className="px-4 py-2.5 text-right w-24 font-bold text-muted-foreground">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody className="divide-y divide-border/50">
                      {filteredProblems.length > 0 ? (
                        filteredProblems.map((problem, idx) => (
                          <TableRow key={problem.id} className="hover:bg-muted/30 border-b">
                            <TableCell className="px-4 py-3 text-center font-mono text-muted-foreground/50 text-[10px]">
                              {idx + 1}.
                            </TableCell>
                            <TableCell className="px-4 py-3 font-semibold text-foreground/90">
                              {problem.title}
                            </TableCell>
                            <TableCell className="px-4 py-3 text-center">
                              <Badge variant="outline" className={cn("text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border-0 select-none", DIFFICULTY_COLORS[problem.difficulty])}>
                                {problem.difficulty}
                              </Badge>
                            </TableCell>
                            <TableCell className="px-4 py-3 text-center">
                              <span className="font-semibold text-foreground/75">
                                {problem.acceptance_rate !== null ? `${problem.acceptance_rate}%` : "—"}
                              </span>
                              <span className="text-[10px] text-muted-foreground/50 ml-1">({problem.total_submissions})</span>
                            </TableCell>
                            <TableCell className="px-4 py-3 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <Button asChild variant="outline" size="icon" className="h-8 w-8 rounded-lg border-muted-foreground/20 text-muted-foreground/75 hover:text-emerald-500 hover:bg-secondary/50">
                                  <Link href={`/~/logiclab/admin/edit/${problem.id}`} title="Edit Problem">
                                    <Edit className="h-3.5 w-3.5" />
                                  </Link>
                                </Button>
                                <Button variant="outline" size="icon" onClick={() => setDeletingProblemId(problem.id)} className="h-8 w-8 rounded-lg border-muted-foreground/20 text-muted-foreground/75 hover:text-rose-500 hover:bg-secondary/50">
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={5} className="px-4 py-16 text-center">
                            <div className="flex flex-col items-center gap-3 select-none">
                              <Code className="h-8 w-8 text-muted-foreground/25 stroke-[1.2]" />
                              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground/40">
                                {localProblems.length === 0
                                  ? "No challenges in your library yet"
                                  : "No challenges matched your search"}
                              </p>
                              {localProblems.length === 0 && (
                                <Button variant="link" onClick={() => setActiveTab("create")} className="text-xs text-emerald-500 hover:text-emerald-400 font-semibold gap-1.5">
                                  <Upload className="h-3.5 w-3.5" /> Import or create problems
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </Card>
            </div>
          </TabsContent>

          {/* ── CREATE / IMPORT TAB ── */}
          <TabsContent value="create" className="mt-0">
            <div className="animate-in fade-in-50 duration-200">
              <AdminProblemCreatorClient />
            </div>
          </TabsContent>
        </div>
      </Tabs>

      {/* ── Delete Confirmation Dialog ── */}
      <Dialog open={!!deletingProblemId} onOpenChange={(open) => { if (!open) setDeletingProblemId(null) }}>
        <DialogContent className="max-w-md rounded-2xl border bg-background text-foreground shadow-2xl p-0 overflow-hidden">
          <DialogHeader className="flex flex-row items-center justify-between px-6 py-4 bg-muted/50 border-b select-none">
            <DialogTitle className="text-sm font-bold text-rose-500 uppercase tracking-wider flex items-center gap-2">
              <AlertTriangle className="h-4.5 w-4.5" /> Permanent Deletion
            </DialogTitle>
          </DialogHeader>
          <div className="p-6 text-sm text-foreground/75 space-y-4">
            <p>Are you absolutely sure you want to permanently delete this coding problem?</p>
            <div className="p-3 bg-rose-500/5 border border-rose-500/10 rounded-xl text-xs text-rose-500/80 dark:text-rose-400/90 leading-relaxed">
              <strong>WARNING:</strong> This action is irreversible. All student submissions and performance
              records for this challenge will be permanently purged.
            </div>
          </div>
          <div className="flex items-center justify-end gap-2 px-6 py-4 bg-muted/20 border-t select-none">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDeletingProblemId(null)}
              disabled={isDeleting}
              className="rounded-xl border-muted-foreground/20 text-foreground hover:bg-secondary/50 font-medium h-9"
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmDelete}
              disabled={isDeleting}
              className="flex items-center gap-1.5 bg-rose-500 hover:bg-rose-500/90 text-white font-semibold rounded-xl h-9 px-4"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete Problem
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Student Profile Detail Dialog ── */}
      <Dialog open={!!selectedStudent} onOpenChange={(open) => { if (!open) setSelectedStudent(null) }}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto rounded-2xl border bg-background text-foreground shadow-2xl p-0 scrollbar-thin">
          <DialogHeader className="flex flex-row items-center justify-between px-6 py-4 bg-muted/50 border-b select-none">
            <div className="space-y-0.5">
              <DialogTitle className="text-sm font-bold text-foreground uppercase tracking-wider flex items-center gap-2.5">
                Student Detailed Analytics
                {selectedStudent && (
                  <Badge variant="outline" className={cn(
                    "text-[8px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full border-0 select-none",
                    selectedStudent.attemptCount === 0 ? "bg-zinc-500/10 border-zinc-500/30 text-zinc-600 dark:text-zinc-400 font-bold" :
                    (selectedStudent.attemptCount >= 3 && selectedStudent.solvedCount < selectedStudent.attemptCount * 0.35) ? "bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-400 font-bold animate-pulse" :
                    "bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400 font-bold"
                  )}>
                    {selectedStudent.attemptCount === 0 ? "Inactive" :
                     (selectedStudent.attemptCount >= 3 && selectedStudent.solvedCount < selectedStudent.attemptCount * 0.35) ? "Struggling" :
                     "Practicing"}
                  </Badge>
                )}
              </DialogTitle>
              {selectedStudent && (
                <DialogDescription className="text-[10px] text-muted-foreground font-mono">
                  Candidate ID: {selectedStudent.user_id.slice(0, 8)}...
                </DialogDescription>
              )}
            </div>
          </DialogHeader>

          {selectedStudent && (
            <div className="p-6 space-y-6">
              
              {/* Profile Card Summary */}
              <div className="bg-card border border-border/80 rounded-2xl p-4 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <h4 className="text-base font-extrabold text-foreground truncate">{selectedStudent.student_name}</h4>
                  <p className="text-xs text-muted-foreground truncate mt-0.5">{selectedStudent.student_email}</p>
                </div>
                <div className="text-right shrink-0 select-none">
                  <span className="text-[9px] text-muted-foreground/60 uppercase tracking-widest font-bold block">Overall Accuracy</span>
                  <span className="text-xl font-black text-indigo-600 dark:text-indigo-400 tracking-tight block">
                    {selectedStudent.attemptCount ? Math.round((selectedStudent.solvedCount / selectedStudent.attemptCount) * 100) : 0}%
                  </span>
                </div>
              </div>

              {/* Core Metrics Grid */}
              <div className="grid grid-cols-2 gap-3 select-none">
                <div className="bg-card border border-border/60 rounded-2xl p-4 flex flex-col justify-center">
                  <span className="text-[9px] text-muted-foreground/60 uppercase tracking-widest font-bold">Solved Challenges</span>
                  <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">{selectedStudent.solvedCount}</span>
                </div>
                <div className="bg-card border border-border/60 rounded-2xl p-4 flex flex-col justify-center">
                  <span className="text-[9px] text-muted-foreground/60 uppercase tracking-widest font-bold">Total Attempts</span>
                  <span className="text-2xl font-black text-foreground mt-1">{selectedStudent.attemptCount}</span>
                </div>
              </div>

              {/* Struggling Alert/Recommendation */}
              {selectedStudent.attemptCount >= 3 && selectedStudent.solvedCount < selectedStudent.attemptCount * 0.35 && (
                <div className="bg-rose-500/5 border border-rose-500/15 rounded-2xl p-4 flex items-start gap-3 animate-in fade-in duration-300 select-none">
                  <AlertTriangle className="h-5 w-5 text-rose-500 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <h6 className="text-xs font-bold text-rose-500 uppercase tracking-wider">Candidate Needs Attention</h6>
                    <p className="text-[11px] text-rose-400/80 leading-relaxed">
                      This student has made a high volume of attempts (<strong className="text-foreground">{selectedStudent.attemptCount}</strong>) but has a solve rate of only <strong className="text-foreground">{Math.round((selectedStudent.solvedCount / selectedStudent.attemptCount) * 100)}%</strong>. This mathematically indicates they are stuck on problem sets and need target guidance or conceptual help.
                    </p>
                  </div>
                </div>
              )}

              {/* Difficulty breakdown */}
              <div className="space-y-3 bg-card border border-border/60 rounded-2xl p-4 select-none">
                <h5 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Difficulty Breakdown</h5>
                
                {/* Segmented Progress Bar */}
                <div className="w-full h-2 rounded-full bg-muted overflow-hidden flex border border-border/50">
                  {selectedStudent.solvedDifficultyCounts.Easy > 0 && (
                    <div
                      className="h-full bg-emerald-500"
                      style={{ width: `${(selectedStudent.solvedDifficultyCounts.Easy / (selectedStudent.solvedCount || 1)) * 100}%` }}
                      title={`Easy: ${selectedStudent.solvedDifficultyCounts.Easy}`}
                    />
                  )}
                  {selectedStudent.solvedDifficultyCounts.Medium > 0 && (
                    <div
                      className="h-full bg-amber-500"
                      style={{ width: `${(selectedStudent.solvedDifficultyCounts.Medium / (selectedStudent.solvedCount || 1)) * 100}%` }}
                      title={`Medium: ${selectedStudent.solvedDifficultyCounts.Medium}`}
                    />
                  )}
                  {selectedStudent.solvedDifficultyCounts.Hard > 0 && (
                    <div
                      className="h-full bg-rose-500"
                      style={{ width: `${(selectedStudent.solvedDifficultyCounts.Hard / (selectedStudent.solvedCount || 1)) * 100}%` }}
                      title={`Hard: ${selectedStudent.solvedDifficultyCounts.Hard}`}
                    />
                  )}
                </div>

                <div className="grid grid-cols-3 gap-2 mt-2 text-[9px] font-bold">
                  <div className="space-y-0.5">
                    <span className="text-emerald-600 dark:text-emerald-400">Easy Solved</span>
                    <span className="block text-foreground text-sm font-extrabold">{selectedStudent.solvedDifficultyCounts.Easy}</span>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-amber-600 dark:text-amber-400">Medium Solved</span>
                    <span className="block text-foreground text-sm font-extrabold">{selectedStudent.solvedDifficultyCounts.Medium}</span>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-rose-600 dark:text-rose-400">Hard Solved</span>
                    <span className="block text-foreground text-sm font-extrabold">{selectedStudent.solvedDifficultyCounts.Hard}</span>
                  </div>
                </div>
              </div>

              {/* Solved Concepts Mastery */}
              <div className="space-y-2 select-none">
                <h5 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Skill Mastery Tags</h5>
                <div className="flex flex-wrap gap-1.5">
                  {Object.entries(selectedStudent.solvedTags).length > 0 ? (
                    Object.entries(selectedStudent.solvedTags).map(([tag, count]) => (
                      <Badge key={tag} variant="secondary" className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[10px] font-bold bg-muted text-foreground/80 hover:bg-muted border border-border/80">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        {tag}
                        <Badge className="px-1.5 py-0.2 rounded bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-extrabold border border-emerald-500/20 text-[9px] ml-1">
                          {count}
                        </Badge>
                      </Badge>
                    ))
                  ) : (
                    <p className="text-[10px] text-muted-foreground/50 italic">No curriculum tags mastered yet.</p>
                  )}
                </div>
              </div>

              {/* Student's recent submissions log */}
              <div className="space-y-3">
                <h5 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Recent Activity Feed & Error Diagnostics</h5>
                <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1 scrollbar-thin">
                  {selectedStudent.recentSubmissions.length > 0 ? (
                    selectedStudent.recentSubmissions.map((sub) => (
                      <div key={sub.id} className="flex flex-col gap-1 border-b border-border/40 pb-3 last:border-0 last:pb-0">
                        <div className="bg-muted/30 border border-border/50 rounded-xl p-3 flex items-center justify-between text-xs hover:border-muted-foreground/20 transition-all gap-2">
                          <div className="space-y-0.5 min-w-0">
                            <h6 className="font-semibold text-foreground truncate">"{sub.problem_title}"</h6>
                            <div className="flex items-center gap-2 text-[9px] text-muted-foreground/60 select-none">
                              <Badge variant="outline" className={cn(
                                "text-[8px] font-extrabold uppercase px-1.5 py-0 rounded border-0",
                                sub.difficulty === "Easy" ? "text-emerald-600 bg-emerald-500/10 border-emerald-500/25 animate-pulse" :
                                sub.difficulty === "Medium" ? "text-amber-600 bg-amber-500/10 border-amber-500/25" :
                                "text-rose-600 bg-rose-500/10 border-rose-500/25"
                              )}>
                                {sub.difficulty}
                              </Badge>
                              <span>·</span>
                              <span>{new Date(sub.created_at).toLocaleDateString([], { month: "short", day: "numeric" })}</span>
                            </div>
                          </div>
                          <Badge
                            variant="outline"
                            className={`shrink-0 text-[8px] font-extrabold uppercase border px-2 py-0.5 rounded-full border-0 select-none ${
                              sub.status === "Accepted"
                                ? "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20 hover:bg-emerald-500/10"
                                : "text-rose-600 dark:text-rose-400 bg-rose-500/10 border-rose-500/20 hover:bg-rose-500/10"
                            }`}
                          >
                            {sub.status === "Accepted" ? "AC" : sub.status?.slice(0, 4) || "?"}
                          </Badge>
                        </div>
                        {/* Render diagnostic panel if failed */}
                        <SubmissionDiagnostics sub={sub} />
                      </div>
                    ))
                  ) : (
                    <p className="text-[10px] text-muted-foreground/50 italic">No submissions logged yet.</p>
                  )}
                </div>
              </div>

            </div>
          )}
          
          <div className="flex items-center justify-end px-6 py-4 bg-muted/20 border-t border-b border-border/10 select-none">
            <Button
              onClick={() => setSelectedStudent(null)}
              variant="outline"
              className="rounded-xl border-muted-foreground/20 text-foreground hover:bg-secondary/50 font-medium h-9"
            >
              Close Profile
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
