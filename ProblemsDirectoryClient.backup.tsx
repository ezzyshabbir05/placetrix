"use client"

import React, { useState, useEffect, useMemo } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  Code2,
  Terminal,
  Plus,
  Search,
  CircleCheck,
  CircleDot,
  ChevronRight,
  Pencil,
  Trash2,
  AlertTriangle,
  X,
  Flame,
  BookOpen,
  Activity,
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

interface Problem {
  id: string
  title: string
  difficulty: "Easy" | "Medium" | "Hard"
  tags: string[]
  created_at: string
  solved_status: string | null
  acceptance_rate: number | null
  total_submissions: number
}

interface CalendarCell {
  date: string
  count: number
  status: "none" | "attempted" | "solved"
  dayOfWeek: number
}

interface ProblemsDirectoryProps {
  problems: Problem[]
  isAdmin: boolean
  streakStats?: {
    currentStreak: number
    maxStreak: number
  }
  activityCalendar?: CalendarCell[]
}

const DIFFICULTY_COLORS: Record<string, string> = {
  Easy: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300",
  Medium: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300",
  Hard: "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-300",
}

export function ProblemsDirectoryClient({
  problems,
  isAdmin,
  streakStats = { currentStreak: 0, maxStreak: 0 },
  activityCalendar = [],
}: ProblemsDirectoryProps) {
  const router = useRouter()
  const [localProblems, setLocalProblems] = useState<Problem[]>(problems)
  const [search, setSearch] = useState("")
  const [difficultyFilter, setDifficultyFilter] = useState<string>("All")
  const [statusFilter, setStatusFilter] = useState<string>("All")
  const [tagFilter, setTagFilter] = useState<string>("All")
  const [tagsExpanded, setTagsExpanded] = useState(false)

  // Modal deletion state
  const [deletingProblemId, setDeletingProblemId] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Group cells into weeks (each week is an array of 7 cells)
  const weeks = useMemo(() => {
    const result: CalendarCell[][] = []
    for (let i = 0; i < activityCalendar.length; i += 7) {
      result.push(activityCalendar.slice(i, i + 7))
    }
    return result
  }, [activityCalendar])

  // Month labels row for the grid header (constant 12 columns based on full 84 days)
  const visibleMonths = useMemo(() => {
    const list: string[] = []
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

    weeks.forEach((week) => {
      const monthCounts: Record<string, number> = {}
      week.forEach((cell) => {
        if (!cell.date) return
        const parts = cell.date.split("-")
        if (parts.length >= 2) {
          const m = parts[1]
          monthCounts[m] = (monthCounts[m] || 0) + 1
        }
      })

      let maxMonth = ""
      let maxCount = 0
      Object.entries(monthCounts).forEach(([m, count]) => {
        if (count > maxCount) {
          maxCount = count
          maxMonth = m
        }
      })

      if (!maxMonth) {
        list.push("")
        return
      }

      const label = monthNames[parseInt(maxMonth) - 1] || ""
      if (list.length === 0 || list[list.length - 1] !== label) {
        list.push(label)
      } else {
        list.push("") // placeholder
      }
    })
    return list
  }, [weeks])

  useEffect(() => {
    setLocalProblems(problems)
  }, [problems])

  // Derive unique tags from problems that actually have problems assigned (dynamic)
  const allTags = useMemo(() => {
    const tagSet = new Set<string>()
    localProblems.forEach((p) => (p.tags || []).forEach((t) => tagSet.add(t.trim())))
    return Array.from(tagSet).sort((a, b) => a.localeCompare(b))
  }, [localProblems])

  // Count problems per tag (for badges on pills)
  const tagCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    localProblems.forEach((p) => (p.tags || []).forEach((t) => {
      const trimmed = t.trim()
      counts[trimmed] = (counts[trimmed] || 0) + 1
    }))
    return counts
  }, [localProblems])

  const handleConfirmDelete = async () => {
    if (!deletingProblemId) return
    setIsDeleting(true)
    const tId = toast.loading("Permanently deleting problem...")
    try {
      const supabase = createClient()

      // 1. Cascade delete associated submissions to prevent foreign key errors
      const { error: subError } = await (supabase as any)
        .from("coding_submissions" as any)
        .delete()
        .eq("problem_id", deletingProblemId)

      if (subError) throw new Error(subError.message)

      // 2. Delete the problem itself
      const { error: probError } = await (supabase as any)
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

  const filtered = localProblems.filter((p) => {
    const matchesSearch = p.title.toLowerCase().includes(search.toLowerCase()) ||
      p.tags?.some((t) => t.toLowerCase().includes(search.toLowerCase()))
    const matchesDifficulty = difficultyFilter === "All" || p.difficulty === difficultyFilter
    const matchesStatus =
      statusFilter === "All" ||
      (statusFilter === "Solved" && p.solved_status === "Accepted") ||
      (statusFilter === "Attempted" && p.solved_status && p.solved_status !== "Accepted") ||
      (statusFilter === "Unsolved" && !p.solved_status)
    const matchesTag = tagFilter === "All" || (p.tags || []).includes(tagFilter)
    return matchesSearch && matchesDifficulty && matchesStatus && matchesTag
  })

  const counts = {
    total: localProblems.length,
    easy: localProblems.filter((p) => p.difficulty === "Easy").length,
    medium: localProblems.filter((p) => p.difficulty === "Medium").length,
    hard: localProblems.filter((p) => p.difficulty === "Hard").length,
    solved: localProblems.filter((p) => p.solved_status === "Accepted").length,
  }

  const solvedEasy = localProblems.filter((p) => p.difficulty === "Easy" && p.solved_status === "Accepted").length
  const solvedMedium = localProblems.filter((p) => p.difficulty === "Medium" && p.solved_status === "Accepted").length
  const solvedHard = localProblems.filter((p) => p.difficulty === "Hard" && p.solved_status === "Accepted").length

  const easyPct = counts.total > 0 ? (solvedEasy / counts.total) * 100 : 0
  const mediumPct = counts.total > 0 ? (solvedMedium / counts.total) * 100 : 0
  const hardPct = counts.total > 0 ? (solvedHard / counts.total) * 100 : 0

  const easyRingPct = counts.easy > 0 ? (solvedEasy / counts.easy) * 100 : 0
  const mediumRingPct = counts.medium > 0 ? (solvedMedium / counts.medium) * 100 : 0
  const hardRingPct = counts.hard > 0 ? (solvedHard / counts.hard) * 100 : 0

  const r1 = 34, r2 = 24, r3 = 14;
  const c1 = 2 * Math.PI * r1;
  const c2 = 2 * Math.PI * r2;
  const c3 = 2 * Math.PI * r3;

  const formatDate = (dateStr: string) => {
    try {
      const [y, m, d] = dateStr.split("-")
      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
      return `${months[parseInt(m) - 1]} ${parseInt(d)}, ${y}`
    } catch {
      return dateStr
    }
  }

  return (
    <div className="flex flex-col gap-6 px-4 py-8 md:px-8">

      {/* Page Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between mb-4">
        <div className="flex flex-col gap-1.5">
          <h1 className="text-3xl font-bold font-cirka tracking-tight text-foreground">LogicLab</h1>
          <p className="text-sm text-muted-foreground">
            {counts.solved} of {counts.total} problem{counts.total !== 1 ? "s" : ""} solved
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Admin CTA */}
          {isAdmin && (
            <Button asChild size="sm" className="w-fit gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-500/20">
              <Link href="/logiclab/admin">
                <Plus className="h-4 w-4" />
                Create Problem
              </Link>
            </Button>
          )}
        </div>
      </div>

      {/* ── Dashboard Grid: Tags & Stats ── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 mb-4">
        {/* ── Tag Filter Pills — LeetCode style: wrapped, collapsible ── */}
        {allTags.length > 0 ? (
          <Card className="border-border/70 bg-card p-3 h-full flex flex-col justify-between">
            <div
              className={cn(
                "flex flex-wrap gap-1.5 transition-all duration-300",
                tagsExpanded ? "max-h-[250px] overflow-y-auto pr-2" : "overflow-hidden"
              )}
            >
              {/* All Topics pill */}
              <button
                onClick={() => setTagFilter("All")}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1 rounded-md text-[11px] font-bold border transition-all cursor-pointer whitespace-nowrap hover:scale-[1.02] active:scale-[0.98] duration-150",
                  tagFilter === "All"
                    ? "bg-emerald-500 border-emerald-500 text-black shadow-lg shadow-emerald-500/10"
                    : "bg-muted/50 dark:bg-muted/30 border-border hover:bg-muted hover:text-foreground text-muted-foreground"
                )}
              >
                All Topics
                <span className={cn(
                  "px-1.5 py-0.5 rounded text-[9px] font-extrabold leading-none transition-colors",
                  tagFilter === "All"
                    ? "bg-black/10 text-black"
                    : "bg-muted-foreground/20 text-muted-foreground"
                )}>
                  {localProblems.length}
                </span>
              </button>

              {/* Per-tag pills */}
              {(tagsExpanded ? allTags : allTags.slice(0, 10)).map((tag) => {
                const isActive = tagFilter === tag
                const count = tagCounts[tag] || 0
                return (
                  <button
                    key={tag}
                    onClick={() => setTagFilter(isActive ? "All" : tag)}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1 rounded-md text-[11px] font-semibold border transition-all cursor-pointer whitespace-nowrap hover:scale-[1.02] active:scale-[0.98] duration-150",
                      isActive
                        ? "bg-emerald-500/10 dark:bg-emerald-500/20 border-emerald-500/30 dark:border-emerald-500/50 text-emerald-600 dark:text-emerald-400 font-bold shadow-md shadow-emerald-500/5"
                        : "bg-muted/50 dark:bg-muted/30 border-border hover:bg-muted hover:text-foreground text-muted-foreground"
                    )}
                  >
                    {tag}
                    <span className={cn(
                      "px-1.5 py-0.5 rounded text-[9px] font-bold leading-none transition-colors",
                      isActive
                        ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-300"
                        : "bg-muted-foreground/20 text-muted-foreground"
                    )}>
                      {count}
                    </span>
                  </button>
                )
              })}

              {/* ... Indicator */}
              {!tagsExpanded && allTags.length > 10 && (
                <button
                  onClick={() => setTagsExpanded(true)}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-md text-[11px] font-bold border border-dashed transition-all cursor-pointer whitespace-nowrap hover:scale-[1.02] active:scale-[0.98] duration-150 bg-transparent border-border hover:bg-muted/50 text-muted-foreground"
                  title="Show all topics"
                >
                  •••
                </button>
              )}
            </div>

            {/* Collapse / Show All toggle */}
            {allTags.length > 10 && (
              <div className="flex justify-end mt-2 pt-2 border-t border-border/60">
                <button
                  onClick={() => setTagsExpanded((prev) => !prev)}
                  className="flex items-center gap-1 text-[11px] font-semibold text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                >
                  {tagsExpanded ? (
                    <>
                      Collapse
                      <svg className="h-3.5 w-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={2}>
                        <path d="M12 10L8 6l-4 4" />
                      </svg>
                    </>
                  ) : (
                    <>
                      Show All ({allTags.length} topics)
                      <svg className="h-3.5 w-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={2}>
                        <path d="M4 6l4 4 4-4" />
                      </svg>
                    </>
                  )}
                </button>
              </div>
            )}
          </Card>
        ) : <div />}

        {/* ── Apple Fitness Unified Widget (Single Row) ── */}
        <Card className="p-3 md:p-4 border-border/40 shadow-sm bg-card/40 backdrop-blur-sm relative overflow-hidden w-full h-full flex flex-col justify-center">
          <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl -z-10" />

          <div className="flex flex-wrap lg:flex-nowrap items-center justify-center gap-8 sm:gap-12 md:gap-16 w-full">
            {/* 1. The Rings */}
            <div className="flex items-center gap-4 shrink-0">
              <div className="relative w-[80px] h-[80px] flex items-center justify-center">
                <svg width="80" height="80" viewBox="0 0 90 90" className="rotate-[-90deg] drop-shadow-md">
                    <circle cx="45" cy="45" r={r1} stroke="currentColor" className="text-emerald-500/20" strokeWidth="7" fill="none" />
                    <circle cx="45" cy="45" r={r2} stroke="currentColor" className="text-amber-500/20" strokeWidth="7" fill="none" />
                    <circle cx="45" cy="45" r={r3} stroke="currentColor" className="text-rose-500/20" strokeWidth="7" fill="none" />

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <circle cx="45" cy="45" r={r1} stroke="currentColor" className="text-emerald-500 drop-shadow-[0_0_4px_rgba(16,185,129,0.5)] transition-all duration-1000 ease-out cursor-help focus:outline-none" strokeWidth="7" fill="none" strokeDasharray={c1} strokeDashoffset={c1 - (easyRingPct / 100) * c1} strokeLinecap="round" />
                      </TooltipTrigger>
                      <TooltipContent side="right" className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-emerald-500" />
                        <span className="text-xs font-semibold">Easy: {Math.round(easyRingPct)}% ({solvedEasy}/{counts.easy})</span>
                      </TooltipContent>
                    </Tooltip>

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <circle cx="45" cy="45" r={r2} stroke="currentColor" className="text-amber-500 drop-shadow-[0_0_4px_rgba(245,158,11,0.5)] transition-all duration-1000 ease-out cursor-help focus:outline-none" strokeWidth="7" fill="none" strokeDasharray={c2} strokeDashoffset={c2 - (mediumRingPct / 100) * c2} strokeLinecap="round" />
                      </TooltipTrigger>
                      <TooltipContent side="right" className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-amber-500" />
                        <span className="text-xs font-semibold">Medium: {Math.round(mediumRingPct)}% ({solvedMedium}/{counts.medium})</span>
                      </TooltipContent>
                    </Tooltip>

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <circle cx="45" cy="45" r={r3} stroke="currentColor" className="text-rose-500 drop-shadow-[0_0_4px_rgba(243,33,101,0.5)] transition-all duration-1000 ease-out cursor-help focus:outline-none" strokeWidth="7" fill="none" strokeDasharray={c3} strokeDashoffset={c3 - (hardRingPct / 100) * c3} strokeLinecap="round" />
                      </TooltipTrigger>
                      <TooltipContent side="right" className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-rose-500" />
                        <span className="text-xs font-semibold">Hard: {Math.round(hardRingPct)}% ({solvedHard}/{counts.hard})</span>
                      </TooltipContent>
                    </Tooltip>
                  </svg>
              </div>

              <div className="flex flex-col gap-1 text-[11px] font-semibold">
                <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-emerald-500" /> <span className="text-foreground/90">{solvedEasy}/{counts.easy} <span className="hidden sm:inline text-muted-foreground font-normal">Easy</span></span></div>
                <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-amber-500" /> <span className="text-foreground/90">{solvedMedium}/{counts.medium} <span className="hidden sm:inline text-muted-foreground font-normal">Med</span></span></div>
                <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-rose-500" /> <span className="text-foreground/90">{solvedHard}/{counts.hard} <span className="hidden sm:inline text-muted-foreground font-normal">Hard</span></span></div>
              </div>
            </div>

            <div className="w-px h-16 bg-border/50 hidden lg:block shrink-0" />

            {/* 2. The Streak & Actions */}
            <div className="flex flex-col gap-2.5 shrink-0 min-w-[90px]">
              <div className="flex flex-col gap-0 text-center sm:text-left">
                <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Current Streak</span>
                <div className="flex items-baseline gap-1 justify-center sm:justify-start">
                  <span className="text-3xl font-extrabold text-orange-500 tracking-tighter">{streakStats.currentStreak}</span>
                  <span className="text-[11px] font-bold text-orange-500/50">Days</span>
                </div>
              </div>
              <Button asChild size="sm" variant="outline" className="h-7 w-full text-[10px] gap-1.5">
                <Link href="/logiclab/playground">
                  <Terminal className="h-3 w-3" />
                  Playground
                </Link>
              </Button>
            </div>

            <div className="w-px h-16 bg-border/50 hidden xl:block shrink-0" />

            {/* 3. The Activity Graph */}
            <div className="flex flex-col gap-2 shrink-0">
              <div className="flex items-center justify-between w-full">
                <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Recent Activity</span>
              </div>

              <div className="flex gap-[3px] overflow-x-auto scrollbar-none justify-center sm:justify-end">
                {weeks.slice(-20).map((week, wIdx) => (
                  <div key={wIdx} className="flex flex-col gap-[3px] shrink-0">
                    {week.map((cell, cIdx) => {
                      const cellColor = cell.status === "solved" ? "bg-emerald-500/70 border border-emerald-500/30" : cell.status === "attempted" ? "bg-amber-500/50" : "bg-muted/40"
                      return <div key={cIdx} className={cn("w-[11px] h-[11px] shrink-0 rounded-[2px] cursor-pointer hover:scale-125 transition-transform", cellColor)} title={`${formatDate(cell.date)}: ${cell.count} submissions`} />
                    })}
                  </div>
                ))}
              </div>
            </div>

          </div>
        </Card>
      </div>


      {/* ── Problems Table ── */}
      <Card className="border-border/70 overflow-hidden p-0">
        {/* ── Search + Filter Toolbar ── */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 px-3 py-2.5 bg-muted/40 border-b border-border/60">
          {/* Search */}
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              id="problem-search"
              placeholder="Search questions..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-9"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-2.5 top-2.5 h-4 w-4 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Difficulty filter */}
          <Select value={difficultyFilter} onValueChange={setDifficultyFilter}>
            <SelectTrigger id="difficulty-filter" className="h-9 w-full sm:w-[130px] text-xs">
              <SelectValue placeholder="Difficulty" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All" className="text-xs">All Difficulties</SelectItem>
              <SelectItem value="Easy" className="text-xs">Easy</SelectItem>
              <SelectItem value="Medium" className="text-xs">Medium</SelectItem>
              <SelectItem value="Hard" className="text-xs">Hard</SelectItem>
            </SelectContent>
          </Select>

          {/* Status filter */}
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger id="status-filter" className="h-9 w-full sm:w-[130px] text-xs">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All" className="text-xs">All Statuses</SelectItem>
              <SelectItem value="Solved" className="text-xs">Solved</SelectItem>
              <SelectItem value="Attempted" className="text-xs">Attempted</SelectItem>
              <SelectItem value="Unsolved" className="text-xs">Unsolved</SelectItem>
            </SelectContent>
          </Select>

          {/* Solved count badge */}
          <div className="hidden sm:flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground shrink-0 pl-2 border-l border-border/60">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            <span>
              <span className="text-foreground font-bold">{counts.solved}</span>
              <span className="text-muted-foreground/60">/{counts.total}</span>
              <span className="text-muted-foreground/60 ml-1">Solved</span>
            </span>
          </div>
        </div>

        {/* Column Header */}
        <div className="grid grid-cols-12 gap-2 px-4 py-2.5 bg-muted/30 border-b border-border/60 text-[10px] font-bold text-muted-foreground/70 uppercase tracking-widest">
          <div className="col-span-1">Status</div>
          <div className={cn(isAdmin ? "col-span-4" : "col-span-5")}>Title</div>
          <div className="col-span-2">Difficulty</div>
          <div className={cn(isAdmin ? "col-span-1" : "col-span-2")}>Acceptance</div>
          <div className="col-span-2 text-right">Tags</div>
          {isAdmin && <div className="col-span-2 text-right">Actions</div>}
        </div>

        {/* Rows */}
        {filtered.length > 0 && (
          <div className="divide-y divide-border/50">
            {filtered.map((problem, idx) => (
              <div
                key={problem.id}
                onClick={() => router.push(`/logiclab/problems/${problem.id}`)}
                className="grid grid-cols-12 gap-2 items-center px-4 py-3 hover:bg-muted/30 transition-colors group cursor-pointer"
              >
                {/* Status */}
                <div className="col-span-1">
                  {problem.solved_status === "Accepted" ? (
                    <CircleCheck className="h-4 w-4 text-emerald-400" />
                  ) : problem.solved_status ? (
                    <CircleDot className="h-4 w-4 text-amber-400" />
                  ) : (
                    <div className="h-4 w-4 rounded-full border border-border" />
                  )}
                </div>

                {/* Title */}
                <div className={cn(isAdmin ? "col-span-4" : "col-span-5", "flex items-center gap-2")}>
                  <span className="text-xs text-muted-foreground/70 font-mono w-6 shrink-0">{idx + 1}.</span>
                  <span className="text-sm font-medium text-foreground/90 group-hover:text-foreground transition-colors truncate">
                    {problem.title}
                  </span>
                  <ChevronRight className="h-3 w-3 text-muted-foreground/30 group-hover:text-muted-foreground transition-colors ml-auto shrink-0 opacity-0 group-hover:opacity-100" />
                </div>

                {/* Difficulty */}
                <div className="col-span-2">
                  <Badge
                    variant="outline"
                    className={cn("text-[10px] font-bold uppercase tracking-wider px-2 py-0.5", DIFFICULTY_COLORS[problem.difficulty])}
                  >
                    {problem.difficulty}
                  </Badge>
                </div>

                {/* Acceptance Rate */}
                <div className={cn(isAdmin ? "col-span-1" : "col-span-2")}>
                  <span className="text-xs text-muted-foreground">
                    {problem.acceptance_rate !== null ? `${problem.acceptance_rate}%` : "—"}
                  </span>
                  {problem.total_submissions > 0 && (
                    <span className="text-[10px] text-muted-foreground/50 ml-1">
                      ({problem.total_submissions})
                    </span>
                  )}
                </div>

                {/* Tags — clickable to filter */}
                <div className="col-span-2 flex flex-wrap gap-1 justify-end">
                  {(problem.tags || []).slice(0, 2).map((tag) => (
                    <button
                      key={tag}
                      onClick={(e) => {
                        e.stopPropagation()
                        setTagFilter(tagFilter === tag ? "All" : tag)
                      }}
                      title={`Filter by ${tag}`}
                      className={cn(
                        "px-1.5 py-0.5 rounded text-[9px] font-semibold border transition-all cursor-pointer",
                        tagFilter === tag
                          ? "bg-emerald-500/10 dark:bg-emerald-500/15 border-emerald-500/30 dark:border-emerald-500/40 text-emerald-600 dark:text-emerald-400"
                          : "bg-muted border-border/70 text-muted-foreground/75 hover:border-border hover:text-foreground"
                      )}
                    >
                      {tag}
                    </button>
                  ))}
                  {(problem.tags || []).length > 2 && (
                    <span className="px-1.5 py-0.5 bg-muted/50 border border-border/60 rounded text-[9px] text-muted-foreground/50 font-medium">
                      +{(problem.tags || []).length - 2}
                    </span>
                  )}
                </div>

                {/* Actions */}
                {isAdmin && (
                  <div className="col-span-2 flex items-center justify-end gap-1">
                    <Link
                      href={`/logiclab/admin/edit/${problem.id}`}
                      onClick={(e) => e.stopPropagation()}
                      className="p-1.5 hover:bg-muted rounded text-muted-foreground hover:text-emerald-400 transition-all inline-flex items-center justify-center cursor-pointer"
                      title="Edit Problem"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Link>
                    <button
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        setDeletingProblemId(problem.id)
                      }}
                      className="p-1.5 hover:bg-muted hover:text-rose-400 rounded text-muted-foreground/70 transition-all inline-flex items-center justify-center cursor-pointer"
                      title="Delete Problem"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 text-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-muted flex items-center justify-center">
              <BookOpen className="h-5 w-5 text-muted-foreground/60" />
            </div>
            <div className="space-y-0.5">
              <p className="text-sm font-medium">
                {problems.length === 0 ? "No problems yet" : "No matching problems"}
              </p>
              {isAdmin && problems.length === 0 ? (
                <Link
                  href="/logiclab/admin"
                  className="text-xs text-emerald-500 hover:text-emerald-400 font-semibold"
                >
                  Create your first problem →
                </Link>
              ) : (
                <p className="text-xs text-muted-foreground">Try adjusting your search or filters</p>
              )}
            </div>
          </div>
        )}
      </Card>

      {/* ── Delete Confirmation Modal ── */}
      {deletingProblemId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-background border border-border rounded-xl shadow-2xl overflow-hidden w-full max-w-md flex flex-col animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3.5 bg-muted/80 border-b border-border">
              <h3 className="text-sm font-bold flex items-center gap-2 text-rose-400 uppercase tracking-wider">
                <AlertTriangle className="h-4 w-4" /> Permanent Deletion
              </h3>
              <button
                onClick={() => setDeletingProblemId(null)}
                disabled={isDeleting}
                className="p-1 hover:bg-muted rounded text-muted-foreground/70 hover:text-foreground transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 text-sm text-foreground/75 space-y-3">
              <p>
                Are you absolutely sure you want to permanently delete this coding problem?
              </p>
              <div className="p-3 bg-rose-500/5 border border-rose-500/10 rounded-lg text-xs text-rose-400/90 leading-relaxed">
                <strong>WARNING:</strong> This action is irreversible. All student submissions and graded performance records for this challenge will be permanently purged.
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-2 px-4 py-3 bg-muted/50 border-t border-border">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDeletingProblemId(null)}
                disabled={isDeleting}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="gap-1.5 bg-rose-500 hover:bg-rose-400 text-white"
              >
                {isDeleting ? (
                  <>
                    <span className="h-3 w-3 border border-current border-t-transparent rounded-full animate-spin inline-block" />
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
          </div>
        </div>
      )}
    </div>
  )
}
