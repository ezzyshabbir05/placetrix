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
      const { error: subError } = await supabase
        .from("coding_submissions" as any)
        .delete()
        .eq("problem_id", deletingProblemId)

      if (subError) throw new Error(subError.message)

      // 2. Delete the problem itself
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
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight">LogicLab</h1>
          <p className="text-sm text-muted-foreground">
            {counts.solved} of {counts.total} problem{counts.total !== 1 ? "s" : ""} solved
          </p>
        </div>

        {/* Admin CTA */}
        {isAdmin && (
          <Button asChild size="sm" className="w-fit gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white">
            <Link href="/~/logiclab/admin">
              <Plus className="h-3.5 w-3.5" />
              Create Problem
            </Link>
          </Button>
        )}
      </div>

      {/* ── Tag Filter Pills — LeetCode style: wrapped, collapsible ── */}
      {allTags.length > 0 && (
        <Card className="border-border/70 bg-card p-3">
          <div
            className={cn(
              "flex flex-wrap gap-1.5 transition-all duration-300 overflow-hidden",
              !tagsExpanded && "max-h-[72px]"
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
            {allTags.map((tag) => {
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
          </div>

          {/* Collapse / Show All toggle */}
          {allTags.length > 8 && (
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
                    Show All ({allTags.length + 1} topics)
                    <svg className="h-3.5 w-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={2}>
                      <path d="M4 6l4 4 4-4" />
                    </svg>
                  </>
                )}
              </button>
            </div>
          )}
        </Card>
      )}

      {/* ── Stats & Activity Grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
        {/* Streak Card */}
        <Card className="lg:col-span-3 border-border/70 bg-card p-3 flex flex-col justify-between">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-background border border-input flex items-center justify-center shrink-0">
                <Flame className="h-4 w-4 text-orange-500" />
              </div>
              <div>
                <span className="text-[9px] text-muted-foreground/70 uppercase tracking-widest font-bold block leading-none">Coding Streak</span>
                <span className="text-base font-extrabold text-orange-400 tracking-tight block mt-0.5">
                  {streakStats.currentStreak} {streakStats.currentStreak === 1 ? "Day" : "Days"}
                </span>
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground leading-relaxed font-medium mt-1">
              {streakStats.currentStreak > 0
                ? "Maintain your momentum by solving problems daily."
                : "No active streak right now. Solve a challenge today!"}
            </p>
          </div>
          <div className="pt-2 border-t border-border/40 flex items-center justify-between text-[9px] select-none">
            <span className="text-muted-foreground/70 font-bold uppercase tracking-wider">Longest Streak</span>
            <span className="text-orange-400 font-extrabold">{streakStats.maxStreak} {streakStats.maxStreak === 1 ? "day" : "days"}</span>
          </div>
        </Card>

        {/* Consistency Grid */}
        <Card className="lg:col-span-5 border-border/70 bg-card p-3 flex flex-col justify-start gap-2.5">
          <div className="flex items-center justify-between pb-2 border-b border-border/40">
            <div className="flex flex-col gap-0.5">
              <div className="flex items-center gap-1.5">
                <Code2 className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-xs font-bold text-foreground/90 tracking-tight uppercase">Coding Consistency</span>
              </div>
              <span className="text-[8px] text-muted-foreground/70 font-bold uppercase tracking-wider block ml-5 leading-none">Daily Contribution Grid</span>
            </div>
          </div>

          <div className="flex gap-2.5 items-start mt-0.5 overflow-x-auto scrollbar-none">
            {/* Days of week labels */}
            <div className="flex flex-col justify-between text-[8px] text-muted-foreground/50 font-extrabold h-[95px] py-[2.5px] pr-0.5 shrink-0 select-none">
              <span>S</span>
              <span>M</span>
              <span>T</span>
              <span>W</span>
              <span>T</span>
              <span>F</span>
              <span>S</span>
            </div>

            {/* Grid container with months on top */}
            <div className="flex-1 flex flex-col gap-1.5 py-0.5">
              {/* Month labels row */}
              <div className="flex gap-[3px] text-[8px] h-3.5 text-muted-foreground/70 font-semibold select-none mb-0.5">
                {visibleMonths.map((m, idx) => (
                  <div key={idx} className="relative w-[11px] shrink-0">
                    {m && (
                      <span className="absolute left-0 top-0 whitespace-nowrap text-[8px] text-muted-foreground/70 font-extrabold tracking-tight">
                        {m}
                      </span>
                    )}
                  </div>
                ))}
              </div>

              {/* Tighter flex calendar layout */}
              <div className="flex gap-[3px]">
                {weeks.map((week, wIdx) => (
                  <div key={wIdx} className="flex flex-col gap-[3px] shrink-0">
                    {week.map((cell, cIdx) => {
                      const formattedDate = formatDate(cell.date)

                      const cellColor = cell.status === "solved"
                        ? "bg-emerald-500/30 border border-emerald-500/50"
                        : cell.status === "attempted"
                          ? "bg-amber-500/20 border border-amber-500/35"
                          : "bg-muted/40 border border-border/20"

                      return (
                        <div key={cIdx} className="relative group">
                          <div
                            className={cn(
                              "w-[11px] h-[11px] rounded-[2px] transition-all duration-200 hover:scale-125 hover:z-10 cursor-pointer",
                              cellColor
                            )}
                          />
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover:block z-50 bg-background border border-border text-[9px] text-foreground/75 px-2 py-0.5 rounded shadow-xl whitespace-nowrap pointer-events-none">
                            <span className="font-bold text-foreground">{formattedDate}</span>
                            <span className="block text-muted-foreground text-[8px] mt-0.5">
                              {cell.count} {cell.count === 1 ? "submission" : "submissions"}
                              {cell.status === "solved" ? " (Solved)" : cell.status === "attempted" ? " (Attempted)" : ""}
                            </span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Legend and stats */}
          <div className="flex items-center justify-between text-[8px] text-muted-foreground/70 font-semibold select-none pt-0.5 border-t border-border/40">
            <span>Grid spans 84 days</span>
            <div className="flex items-center gap-1">
              <span>Less</span>
              <div className="w-1.5 h-1.5 rounded-[1px] bg-muted/40 border border-border/20" />
              <div className="w-1.5 h-1.5 rounded-[1px] bg-amber-500/20 border border-amber-500/35" />
              <div className="w-1.5 h-1.5 rounded-[1px] bg-emerald-500/30 border border-emerald-500/50" />
              <span>More</span>
            </div>
          </div>
        </Card>

        {/* Difficulty Progress Card */}
        <Card className="lg:col-span-4 border-border/70 bg-card p-3 flex flex-col justify-between">
          <div className="flex flex-col gap-2.5">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[9px] text-muted-foreground/70 uppercase tracking-widest font-bold block leading-none">Difficulty Progress</span>
                <span className="text-base font-extrabold text-foreground/90 tracking-tight block mt-1">
                  {counts.solved} <span className="text-xs font-normal text-muted-foreground/70">/ {counts.total} Solved</span>
                </span>
              </div>
            </div>

            {/* Segmented Progress Bar */}
            <div className="w-full h-1.5 rounded-full bg-muted/60 overflow-hidden flex border border-input mt-1">
              {solvedEasy > 0 && (
                <div
                  className="h-full bg-emerald-500 transition-all duration-500 hover:opacity-90"
                  style={{ width: `${easyPct}%` }}
                  title={`Easy Solved: ${solvedEasy}`}
                />
              )}
              {solvedMedium > 0 && (
                <div
                  className="h-full bg-amber-500 transition-all duration-500 hover:opacity-90"
                  style={{ width: `${mediumPct}%` }}
                  title={`Medium Solved: ${solvedMedium}`}
                />
              )}
              {solvedHard > 0 && (
                <div
                  className="h-full bg-rose-500 transition-all duration-500 hover:opacity-90"
                  style={{ width: `${hardPct}%` }}
                  title={`Hard Solved: ${solvedHard}`}
                />
              )}
            </div>

            <div className="grid grid-cols-3 gap-1 mt-1 text-[9px] font-bold">
              <div className="space-y-0.5">
                <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                  <span className="h-1 w-1 rounded-full bg-emerald-500" />
                  <span>Easy</span>
                </div>
                <span className="block text-[10px] text-foreground/75 font-extrabold ml-2">{solvedEasy} / {counts.easy}</span>
              </div>

              <div className="space-y-0.5">
                <div className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
                  <span className="h-1 w-1 rounded-full bg-amber-500" />
                  <span>Medium</span>
                </div>
                <span className="block text-[10px] text-foreground/75 font-extrabold ml-2">{solvedMedium} / {counts.medium}</span>
              </div>

              <div className="space-y-0.5">
                <div className="flex items-center gap-1 text-rose-600 dark:text-rose-400">
                  <span className="h-1 w-1 rounded-full bg-rose-500" />
                  <span>Hard</span>
                </div>
                <span className="block text-[10px] text-foreground/75 font-extrabold ml-2">{solvedHard} / {counts.hard}</span>
              </div>
            </div>
          </div>

          <Button asChild variant="outline" size="sm" className="mt-3 w-full gap-2">
            <Link href="/~/logiclab/playground">
              <Terminal className="h-4 w-4 text-emerald-500" />
              Launch Code Playground
            </Link>
          </Button>
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
                onClick={() => router.push(`/~/logiclab/problems/${problem.id}`)}
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
                      href={`/~/logiclab/admin/edit/${problem.id}`}
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
                  href="/~/logiclab/admin"
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
