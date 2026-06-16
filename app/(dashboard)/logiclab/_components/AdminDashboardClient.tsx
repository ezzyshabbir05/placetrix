"use client"

import React, { useState, useCallback } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  Code,
  Plus,
  Trash2,
  Search,
  Activity,
  Cpu,
  AlertTriangle,
  BookOpen,
  Tag,
  Upload,
  Sparkles,
  ChevronRight,
  Loader2,
  Pencil,
  X,
  LayoutDashboard,
} from "lucide-react"
import { toast } from "sonner"
import { createClient } from "@/lib/supabase/client"
import { AdminProblemEditorClient } from "./AdminProblemEditorClient"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from "@/components/ui/input-group"


interface Problem {
  id: string
  number?: number | null
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
  Easy: "bg-emerald-100/80 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-500/15 dark:text-emerald-400 border-transparent",
  Medium: "bg-amber-100/80 text-amber-700 hover:bg-amber-100 dark:bg-amber-500/15 dark:text-amber-400 border-transparent",
  Hard: "bg-rose-100/80 text-rose-700 hover:bg-rose-100 dark:bg-rose-500/15 dark:text-rose-400 border-transparent",
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
          variant="default"
          className="flex-1 md:flex-none flex items-center gap-2"
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
          className="flex-1 md:flex-none flex items-center gap-2"
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
  const [activeTab, setActiveTab] = useState<"overview" | "problems" | "create">("overview")
  const [localProblems, setLocalProblems] = useState<Problem[]>(initialProblems)
  const [recentSubmissions] = useState<SubmissionLog[]>(initialRecentSubmissions)

  const [problemSearch, setProblemSearch] = useState("")
  const [difficultyFilter, setDifficultyFilter] = useState("All")

  const [deletingProblemId, setDeletingProblemId] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isSeeding, setIsSeeding] = useState(false)

  const isEmpty = analytics.totalProblems === 0

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
      const { error: subError } = await (supabase as any)
        .from("logiclab_problem_submissions" as any)
        .delete()
        .eq("problem_id", deletingProblemId)
      if (subError) throw new Error(subError.message)

      const { error: probError } = await (supabase as any)
        .from("logiclab_problems" as any)
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

  const totalSubmissions = analytics.totalSubmissions || 1
  const acceptanceRate = ((analytics.totalAccepted / totalSubmissions) * 100).toFixed(1)

  const tabConfig = [
    { value: "overview", label: "Overview", icon: <LayoutDashboard className="h-3.5 w-3.5" /> },
    { value: "problems", label: "Manage Problems", icon: <Code className="h-3.5 w-3.5" /> },
    { value: "create", label: "Create / Import", icon: <Plus className="h-3.5 w-3.5" /> },
  ] as const


  return (
    <div className={cn('flex', 'flex-col', 'gap-6', 'px-4', 'py-6', 'md:px-8', 'md:py-8', 'mx-auto', 'w-full')}>

      {/* ── Tabs and Headers ── */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
        <div className="space-y-6">

          <div className={cn('flex', 'flex-col', 'sm:flex-row', 'sm:items-center', 'sm:justify-between', 'gap-4', 'border-b', 'border-border/40', 'pb-4', 'select-none')}>
            <div className={cn('flex', 'flex-col', 'gap-1')}>
              <h1 className={cn('text-3xl', 'font-bold', 'font-cirka', 'tracking-tight', 'text-foreground')}>Admin Center</h1>
              <p className={cn('text-sm', 'text-muted-foreground')}>
                Manage challenges, track performance metrics, and oversee student diagnostics.
              </p>
            </div>
            <div className={cn('overflow-x-auto', 'shrink-0', 'bg-muted/50', 'p-1', 'rounded-xl')}>
              <TabsList className={cn('inline-flex', 'h-8', 'gap-1', 'bg-transparent', 'p-0')}>
                {tabConfig.map(({ value, label, icon }) => (
                  <TabsTrigger
                    key={value}
                    value={value}
                    className={cn('gap-2', 'rounded-lg', 'px-4', 'h-7', 'text-xs', 'font-semibold', 'tracking-tight', 'data-[state=active]:bg-background', 'data-[state=active]:text-foreground', 'data-[state=active]:shadow-sm', 'transition-all')}
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

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

                {/* Left Column (2/3 width): Concept Tag Analytics */}
                <div className="lg:col-span-8">
                  <Card className={cn('min-w-0', 'flex', 'flex-col', 'relative', 'transition-all', 'hover:border-border/80', 'py-0', 'bg-background/40', 'backdrop-blur-sm', 'rounded-lg')}>
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
                      <Badge className="bg-amber-100/80 text-amber-700 hover:bg-amber-100 dark:bg-amber-500/15 dark:text-amber-400 border-transparent font-bold text-xs px-2.5 py-0.5 rounded-full">
                        {analytics.totalProblems} Challenges · {(analytics.tagStats || []).length} Concept Topics
                      </Badge>
                    </CardHeader>

                    <CardContent className="p-6">
                      {analytics.tagStats && analytics.tagStats.length > 0 ? (
                        <div className={cn('flex', 'flex-col', 'border', 'border-border/40', 'rounded-lg', 'overflow-hidden', 'shadow-sm', 'bg-background/40')}>
                          <Table className="min-w-[600px] text-xs">
                            <TableHeader>
                              <TableRow className={cn('bg-muted/40', 'border-b', 'border-border/50', 'text-xs', 'font-bold', 'text-muted-foreground', 'uppercase', 'tracking-wider', 'select-none')}>
                                <TableHead className="px-5 py-3.5 font-bold text-muted-foreground">Concept Tag Name</TableHead>
                                <TableHead className="px-5 py-3.5 text-center w-36 font-bold text-muted-foreground">Total Challenges</TableHead>
                                <TableHead className="px-5 py-3.5 w-72 font-bold text-muted-foreground">Student Completion Rate</TableHead>
                                <TableHead className="px-5 py-3.5 text-right w-36 font-bold text-muted-foreground">Average Accuracy</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody className="divide-y divide-border/50 text-xs">
                              {analytics.tagStats.map((tag, idx) => {
                                let rateText = "text-muted-foreground/75"
                                if (tag.submissions > 0) {
                                  if (tag.rate >= 70) { rateText = "text-emerald-600 dark:text-emerald-400 font-bold" }
                                  else if (tag.rate >= 40) { rateText = "text-amber-600 dark:text-amber-400 font-bold" }
                                  else { rateText = "text-rose-600 dark:text-rose-400 font-bold" }
                                }

                                const totalStu = tag.totalStudents || 0
                                const solvedStu = tag.studentsSolved || 0
                                const stuPct = totalStu > 0 ? Math.round((solvedStu / totalStu) * 100) : 0

                                const isEven = idx % 2 === 0;

                                return (
                                  <TableRow
                                    key={tag.name}
                                    className={cn(
                                      "transition-colors duration-150",
                                      isEven ? "bg-transparent" : "bg-zinc-100 dark:bg-white/[0.04]",
                                      idx !== analytics.tagStats!.length - 1 && "border-b border-border/30"
                                    )}
                                  >
                                    <TableCell className="px-5 py-3.5">
                                      <span className="inline-flex items-center gap-2 px-3 py-1 rounded-md text-xs bg-background border border-border/80 text-foreground/75 font-semibold">
                                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.3)]" />
                                        {tag.name}
                                      </span>
                                    </TableCell>
                                    <TableCell className="px-5 py-3.5 text-center font-mono font-bold text-foreground/90 text-sm">
                                      {tag.problemCount}
                                    </TableCell>
                                    <TableCell className="px-5 py-3.5">
                                      {totalStu > 0 ? (
                                        <div className="flex items-center gap-3">
                                          <Progress
                                            value={stuPct}
                                            className={cn(
                                              "h-2 bg-muted/60 flex-1 min-w-[120px]",
                                              stuPct >= 70 ? "[&>div]:bg-emerald-500 dark:[&>div]:bg-emerald-400" :
                                              stuPct >= 40 ? "[&>div]:bg-amber-500 dark:[&>div]:bg-amber-400" :
                                              "[&>div]:bg-rose-500 dark:[&>div]:bg-rose-400"
                                            )}
                                          />
                                          <span className="text-xs font-mono text-muted-foreground shrink-0 font-bold">
                                            {solvedStu}
                                            <span className="text-muted-foreground/50">/{totalStu}</span>
                                          </span>
                                        </div>
                                      ) : (
                                        <span className="text-xs text-muted-foreground/30 font-medium">0</span>
                                      )}
                                    </TableCell>
                                    <TableCell className="px-5 py-3.5 text-right">
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
                        <div className="flex flex-col items-center justify-center gap-4 text-muted-foreground/30 border border-border/50 border-dashed rounded-lg py-20 bg-background/10">
                          <Tag className="h-10 w-10 stroke-[1.2]" />
                          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground/40">No Concept Tags Configured</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* Right Column (1/3 width): Feed & Language distributing charts */}
                <div className="lg:col-span-4 space-y-6">

                  {/* Live Activity Feed */}
                  <Card className={cn('min-w-0', 'flex', 'flex-col', 'relative', 'transition-all', 'hover:border-border/80', 'py-0', 'bg-background/40', 'backdrop-blur-sm', 'rounded-lg')}>
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
                      <Badge className="bg-indigo-100/80 text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-500/15 dark:text-indigo-400 border-transparent font-bold text-[10px] px-2.5 py-0.5 rounded-full select-none">
                        {acceptanceRate}% success
                      </Badge>
                    </CardHeader>

                    <CardContent className="p-6">
                      <div className="overflow-y-auto border border-border/40 rounded-lg p-2 bg-background/20 space-y-2 max-h-[350px] scrollbar-thin">
                        {recentSubmissions.length > 0 ? (
                          recentSubmissions.map((log) => (
                            <div
                              key={log.id}
                              className="bg-muted/20 border border-border/30 rounded-md p-3 flex flex-col items-stretch text-xs hover:border-muted-foreground/20 hover:bg-muted/40 transition-all gap-2"
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="space-y-0.5 min-w-0">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="font-semibold text-foreground/90 truncate max-w-[120px]">{log.student_name}</span>
                                    <span suppressHydrationWarning className="text-[9px] text-muted-foreground/50 shrink-0">
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
                                  className={`shrink-0 text-[8px] font-extrabold uppercase border px-2 py-0.5 rounded-full border-0 select-none ${log.status === "Accepted"
                                    ? "bg-emerald-100/80 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-500/15 dark:text-emerald-400 border-transparent"
                                    : "bg-rose-100/80 text-rose-700 hover:bg-rose-100 dark:bg-rose-500/15 dark:text-rose-400 border-transparent"
                                    }`}
                                >
                                  {log.status === "Accepted" ? "AC" : log.status === "Wrong Answer" ? "WA" : log.status?.slice(0, 4) || "?"}
                                </Badge>
                              </div>

                              <div className="flex items-center gap-1.5 pt-1 flex-wrap text-[9px] text-muted-foreground/70 select-none border-t border-border/10">
                                {log.passed_count !== null && log.total_count !== null && (
                                  <span className="bg-muted px-1.5 py-0.5 rounded font-mono">
                                    Passed {log.passed_count}/{log.total_count}
                                  </span>
                                )}
                                {log.runtime !== null && (
                                  <span className="bg-muted px-1.5 py-0.5 rounded font-mono">
                                    {log.runtime}ms
                                  </span>
                                )}
                                {log.memory !== null && (
                                  <span className="bg-muted px-1.5 py-0.5 rounded font-mono">
                                    {(log.memory / 1000).toFixed(1)}MB
                                  </span>
                                )}
                              </div>
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
                  <Card className={cn('min-w-0', 'flex', 'flex-col', 'relative', 'transition-all', 'hover:border-border/80', 'py-0', 'bg-background/40', 'backdrop-blur-sm', 'rounded-lg')}>
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
                        { id: 71, label: "Python", color: "bg-emerald-500", text: "text-emerald-600 dark:text-emerald-400", progressClass: "[&>div]:bg-emerald-500 dark:[&>div]:bg-emerald-400" },
                        { id: 63, label: "JavaScript", color: "bg-amber-500", text: "text-amber-600 dark:text-amber-400", progressClass: "[&>div]:bg-amber-500 dark:[&>div]:bg-amber-400" },
                        { id: 54, label: "C++", color: "bg-rose-500", text: "text-rose-600 dark:text-rose-400", progressClass: "[&>div]:bg-rose-500 dark:[&>div]:bg-rose-400" },
                        { id: 62, label: "Java", color: "bg-cyan-500", text: "text-cyan-600 dark:text-cyan-400", progressClass: "[&>div]:bg-cyan-500 dark:[&>div]:bg-cyan-400" },
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
                            <Progress value={pct} className={cn("h-1.5 bg-muted/60", lang.progressClass)} />
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

          {/* ── MANAGE PROBLEMS TAB ── */}
          <TabsContent value="problems" className="mt-0">
            <div className="space-y-4 animate-in fade-in-50 duration-200">

              {/* Toolbar */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 select-none">
                <InputGroup className={cn('flex-1', 'max-w-sm', 'h-9', 'bg-background', 'rounded-lg')}>
                  <InputGroupAddon align="inline-start">
                    <Search className="size-4 text-muted-foreground/60" />
                  </InputGroupAddon>
                  <InputGroupInput
                    placeholder="Search challenges or tags..."
                    value={problemSearch}
                    onChange={(e) => setProblemSearch(e.target.value)}
                    className="h-full text-xs"
                  />
                  {problemSearch && (
                    <InputGroupAddon align="inline-end">
                      <InputGroupButton
                        onClick={() => setProblemSearch("")}
                        variant="ghost"
                        size="icon-xs"
                        className={cn('text-muted-foreground', 'hover:text-foreground')}
                      >
                        <X />
                      </InputGroupButton>
                    </InputGroupAddon>
                  )}
                </InputGroup>

                <div className="flex items-center gap-2">
                  <Select value={difficultyFilter} onValueChange={(val) => setDifficultyFilter(val)}>
                    <SelectTrigger className="h-9 w-[130px] text-xs font-semibold rounded-md border-muted-foreground/20 bg-background">
                      <SelectValue placeholder="All Difficulty" />
                    </SelectTrigger>
                    <SelectContent className="rounded-md">
                      <SelectItem value="All" className="text-xs rounded-sm">All Difficulty</SelectItem>
                      <SelectItem value="Easy" className="text-xs rounded-sm">Easy</SelectItem>
                      <SelectItem value="Medium" className="text-xs rounded-sm">Medium</SelectItem>
                      <SelectItem value="Hard" className="text-xs rounded-sm">Hard</SelectItem>
                    </SelectContent>
                  </Select>

                  <Button
                    onClick={() => setActiveTab("create")}
                    size="sm"
                    variant="default"
                    className="flex items-center gap-1.5 h-9 px-4 text-xs select-none"
                  >
                    <Plus className="h-4 w-4" /> Add Problem
                  </Button>
                </div>
              </div>

              {/* Table Card wrapper */}
              <div className={cn('flex', 'flex-col', 'border', 'border-border/40', 'rounded-xl', 'overflow-hidden', 'shadow-sm', 'bg-background/40')}>
                {/* Table Header */}
                <div className={cn('hidden', 'md:flex', 'items-center', 'gap-3', 'px-4', 'py-3.5', 'bg-muted/40', 'border-b', 'border-border/50', 'text-xs', 'font-bold', 'text-muted-foreground', 'uppercase', 'tracking-wider', 'select-none')}>
                  <div className={cn('w-14', 'shrink-0', 'text-center')}>#</div>
                  <div className={cn('flex-1', 'min-w-0', 'pl-4')}>Title</div>
                  <div className={cn('w-[130px]', 'shrink-0', 'pl-4')}>Acceptance</div>
                  <div className={cn('w-[120px]', 'shrink-0', 'pl-4')}>Difficulty</div>
                  <div className={cn('w-[240px]', 'shrink-0', 'pl-4')}>Topic Tags</div>
                  <div className={cn('w-[70px]', 'shrink-0')}></div>
                  <div className={cn('w-8', 'shrink-0')}></div>
                </div>

                <div className="flex flex-col">
                  {filteredProblems.length > 0 ? (
                    filteredProblems.map((problem, idx) => {
                      const isEven = idx % 2 === 0
                      return (
                        <div
                          key={problem.id}
                          onClick={() => router.push(`/logiclab/admin/edit/${problem.id}`)}
                          className={cn(
                            "group flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors duration-150",
                            isEven ? "bg-transparent" : "bg-zinc-100 dark:bg-white/[0.04]",
                            idx !== filteredProblems.length - 1 && "border-b border-border/30"
                          )}
                        >
                          {/* ID Number */}
                          <div className={cn('shrink-0', 'flex', 'items-center', 'justify-center', 'w-14', 'font-mono', 'text-xs', 'font-semibold', 'text-muted-foreground/85')}>
                            #{problem.number || idx + 1}
                          </div>

                          {/* Title */}
                          <div className={cn('flex-1', 'min-w-0', 'flex', 'items-center', 'gap-3', 'pl-2')}>
                            <span className={cn('text-sm', 'font-medium', 'text-foreground', 'group-hover:text-foreground', 'transition-colors', 'truncate', 'block', 'leading-snug')}>
                              {problem.title}
                            </span>
                          </div>

                          {/* Acceptance Rate */}
                          <div className={cn('hidden', 'md:flex', 'flex-col', 'justify-center', 'w-[130px]', 'shrink-0', 'pl-4')}>
                            <span className={cn('text-xs', 'font-medium', 'text-muted-foreground/90')}>
                              {problem.acceptance_rate !== null ? `${problem.acceptance_rate}%` : "—"}
                            </span>
                            {problem.total_submissions > 0 && (
                              <span className={cn('text-[10px]', 'text-muted-foreground/50')}>
                                {problem.total_submissions} submissions
                              </span>
                            )}
                          </div>

                          {/* Difficulty */}
                          <div className={cn('hidden', 'md:flex', 'items-center', 'w-[120px]', 'shrink-0', 'pl-4')}>
                            <span className={cn(
                              "text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border-transparent",
                              DIFFICULTY_COLORS[problem.difficulty]
                            )}>
                              {problem.difficulty}
                            </span>
                          </div>

                          {/* Topic Tags */}
                          {problem.tags && problem.tags.length > 0 ? (
                            <div className={cn('hidden', 'sm:flex', 'flex-wrap', 'items-center', 'gap-1.5', 'w-[240px]', 'shrink-0', 'pl-4')}>
                              {problem.tags.slice(0, 2).map((tag) => (
                                <span key={tag} className={cn('text-[10px]', 'font-medium', 'px-1.5', 'py-0.5', 'rounded', 'bg-muted', 'text-muted-foreground/85', 'truncate', 'max-w-[80px]')}>
                                  {tag}
                                </span>
                              ))}
                              {problem.tags.length > 2 && (
                                <span className={cn('text-[10px]', 'font-medium', 'px-1.5', 'py-0.5', 'rounded', 'bg-muted/60', 'text-muted-foreground/60', 'shrink-0')}>
                                  +{problem.tags.length - 2}
                                </span>
                              )}
                            </div>
                          ) : (
                            <div className={cn('hidden', 'sm:flex', 'w-[240px]', 'shrink-0', 'pl-4')} />
                          )}

                          {/* Actions (Pencil & Trash icons) */}
                          <div
                            className={cn('flex', 'items-center', 'justify-end', 'gap-1', 'opacity-40', 'group-hover:opacity-100', 'transition-opacity', 'w-[70px]', 'shrink-0')}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Link
                              href={`/logiclab/admin/edit/${problem.id}`}
                              className={cn('p-1.5', 'hover:bg-background', 'rounded-md', 'text-muted-foreground', 'hover:text-emerald-500', 'transition-all', 'cursor-pointer', 'shadow-sm', 'border', 'border-transparent', 'hover:border-border/60')}
                              title="Edit Problem"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Link>
                            <button
                              onClick={() => setDeletingProblemId(problem.id)}
                              className={cn('p-1.5', 'hover:bg-background', 'rounded-md', 'text-muted-foreground/70', 'hover:text-rose-500', 'transition-all', 'cursor-pointer', 'shadow-sm', 'border', 'border-transparent', 'hover:border-border/60')}
                              title="Delete Problem"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>

                          {/* Chevron Icon */}
                          <div className={cn('shrink-0', 'flex', 'justify-end', 'w-8')}>
                            <ChevronRight className={cn('size-4', 'text-muted-foreground/50', 'group-hover:text-muted-foreground/80', 'group-hover:translate-x-0.5', 'transition-all')} />
                          </div>
                        </div>
                      )
                    })
                  ) : (
                    <div className={cn('flex', 'flex-col', 'items-center', 'justify-center', 'py-24', 'text-center', 'gap-4')}>
                      <div className={cn('h-16', 'w-16', 'rounded-2xl', 'bg-muted', 'flex', 'items-center', 'justify-center')}>
                        <BookOpen className={cn('h-8', 'w-8', 'text-muted-foreground/60')} />
                      </div>
                      <div className="space-y-1">
                        <p className={cn('text-lg', 'font-semibold', 'text-foreground')}>No problems found</p>
                        <p className={cn('text-sm', 'text-muted-foreground', 'max-w-sm')}>
                          We couldn't find any challenges matching your current search filters.
                        </p>
                      </div>
                      {problemSearch && (
                        <Button variant="outline" onClick={() => setProblemSearch("")} className="mt-2">
                          Clear search
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </TabsContent>

          {/* ── CREATE / IMPORT TAB ── */}
          <TabsContent value="create" className="mt-0">
            <div className="animate-in fade-in-50 duration-200">
              <AdminProblemEditorClient />
            </div>
          </TabsContent>
        </div>
      </Tabs>

      {/* ── Delete Confirmation Dialog ── */}
      <Dialog open={!!deletingProblemId} onOpenChange={(open) => { if (!open) setDeletingProblemId(null) }}>
        <DialogContent className="max-w-md rounded-lg border bg-background text-foreground shadow-2xl p-0 overflow-hidden">
          <DialogHeader className="flex flex-row items-center justify-between px-6 py-4 bg-muted/50 border-b select-none">
            <DialogTitle className="text-sm font-bold text-destructive uppercase tracking-wider flex items-center gap-2">
              <AlertTriangle className="h-4.5 w-4.5" /> Permanent Deletion
            </DialogTitle>
          </DialogHeader>
          <div className="p-6 text-sm text-foreground/75 space-y-4">
            <p>Are you absolutely sure you want to permanently delete this coding problem?</p>
            <div className="p-3 bg-destructive/5 border border-destructive/10 rounded-md text-xs text-destructive/80 leading-relaxed">
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
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleConfirmDelete}
              disabled={isDeleting}
              className="flex items-center gap-1.5"
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
    </div>
  )
}
