"use client"

import React, { useState, useEffect, useMemo } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  IconCode,
  IconTerminal2,
  IconPlus,
  IconSearch,
  IconCircleCheck,
  IconCircleDot,
  IconFilter,
  IconChevronRight,
  IconEdit,
  IconTrash,
  IconAlertTriangle,
  IconX,
  IconFlame,
} from "@tabler/icons-react"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"

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
  Easy: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  Medium: "text-amber-400 bg-amber-500/10 border-amber-500/20",
  Hard: "text-rose-400 bg-rose-500/10 border-rose-500/20",
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
    return matchesSearch && matchesDifficulty && matchesStatus
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
    <div className="flex flex-col gap-3.5 p-4 md:p-6 min-h-[calc(100svh-56px)] bg-zinc-950 text-zinc-100">
      {/* ── Action Toolbar (Primary Header) ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-zinc-900/40 border border-zinc-800/80 rounded-xl p-4 shadow-sm">
        {/* Left: Branding */}
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-zinc-950 border border-zinc-800/60 flex items-center justify-center shrink-0">
            <IconTerminal2 className="h-5 w-5 text-emerald-500" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="text-sm font-bold tracking-tight text-zinc-100 flex items-center gap-1.5">
                <span>Logic<span className="text-emerald-500">Lab</span></span>
                <span className="px-1.5 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-[8px] text-zinc-400 font-bold uppercase tracking-wider ml-1">
                  Beta
                </span>
              </h1>
            </div>
            <p className="text-[10px] text-zinc-500 font-semibold tracking-wide">Solve challenges & track skills.</p>
          </div>
        </div>

        {/* Right: Controls & Admin Action */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 flex-1 md:flex-initial md:justify-end">
          {/* Search */}
          <div className="relative w-full sm:w-64">
            <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500 transition-colors" />
            <input
              type="text"
              placeholder="Search challenges..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-850 hover:border-zinc-750 focus:border-zinc-700 rounded-lg pl-9 pr-3 py-1.5 text-xs text-zinc-200 placeholder:text-zinc-650 focus:outline-none transition-all font-medium"
            />
          </div>

          {/* Filters */}
          <div className="flex items-center gap-2">
            <select
              value={difficultyFilter}
              onChange={(e) => setDifficultyFilter(e.target.value)}
              className="flex-1 sm:flex-initial bg-zinc-950 border border-zinc-850 hover:border-zinc-750 hover:text-zinc-200 focus:outline-none transition-all cursor-pointer rounded-lg px-2.5 py-1.5 text-xs font-bold text-zinc-400"
            >
              <option value="All">All Difficulty</option>
              <option value="Easy">Easy</option>
              <option value="Medium">Medium</option>
              <option value="Hard">Hard</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="flex-1 sm:flex-initial bg-zinc-950 border border-zinc-850 hover:border-zinc-750 hover:text-zinc-200 focus:outline-none transition-all cursor-pointer rounded-lg px-2.5 py-1.5 text-xs font-bold text-zinc-400"
            >
              <option value="All">All Status</option>
              <option value="Solved">Solved</option>
              <option value="Attempted">Attempted</option>
              <option value="Unsolved">Unsolved</option>
            </select>
          </div>

          {/* Admin Create Button */}
          {isAdmin && (
            <Link
              href="/~/logiclab/admin"
              className="flex items-center justify-center gap-1.5 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 px-4 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer"
            >
              <IconPlus className="h-3.5 w-3.5 stroke-[2.5]" />
              <span>Create Problem</span>
            </Link>
          )}
        </div>
      </div>

      {/* ── Stats & Activity Grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
        {/* Streak Card */}
        <div className="lg:col-span-3 bg-zinc-900/40 border border-zinc-800 rounded-xl p-3 flex flex-col justify-between">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <div className="h-8.5 w-8.5 rounded-lg bg-zinc-950 border border-zinc-850 flex items-center justify-center shrink-0">
                <IconFlame className="h-4.5 w-4.5 text-orange-500" />
              </div>
              <div>
                <span className="text-[9px] text-zinc-500 uppercase tracking-widest font-bold block leading-none">Coding Streak</span>
                <span className="text-base font-extrabold text-orange-400 tracking-tight block mt-0.5">
                  {streakStats.currentStreak} {streakStats.currentStreak === 1 ? "Day" : "Days"}
                </span>
              </div>
            </div>
            <p className="text-[10px] text-zinc-400 leading-relaxed font-medium mt-1">
              {streakStats.currentStreak > 0
                ? "Maintain your momentum by solving problems daily."
                : "No active streak right now. Solve a challenge today!"}
            </p>
          </div>
          <div className="pt-2 border-t border-zinc-800/40 flex items-center justify-between text-[9px] select-none">
            <span className="text-zinc-500 font-bold uppercase tracking-wider">Longest Streak</span>
            <span className="text-orange-400 font-extrabold">{streakStats.maxStreak} {streakStats.maxStreak === 1 ? "day" : "days"}</span>
          </div>
        </div>

        {/* Consistency Grid */}
        <div className="lg:col-span-5 bg-zinc-900/40 border border-zinc-800 rounded-xl p-3 flex flex-col justify-start gap-2.5">
          <div className="flex items-center justify-between pb-2 border-b border-zinc-800/40">
            <div className="flex flex-col gap-0.5">
              <div className="flex items-center gap-1.5">
                <IconCode className="h-3.5 w-3.5 text-zinc-400" />
                <span className="text-xs font-bold text-zinc-200 tracking-tight uppercase">Coding Consistency</span>
              </div>
              <span className="text-[8px] text-zinc-500 font-bold uppercase tracking-wider block ml-5 leading-none">Daily Contribution Grid</span>
            </div>
          </div>

          <div className="flex gap-2.5 items-start mt-0.5 overflow-x-auto scrollbar-none">
            {/* Days of week labels */}
            <div className="flex flex-col justify-between text-[8px] text-zinc-600 font-extrabold h-[95px] py-[2.5px] pr-0.5 shrink-0 select-none">
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
              <div className="flex gap-[3px] text-[8px] h-3.5 text-zinc-500 font-semibold select-none mb-0.5">
                {visibleMonths.map((m, idx) => (
                  <div key={idx} className="relative w-[11px] shrink-0">
                    {m && (
                      <span className="absolute left-0 top-0 whitespace-nowrap text-[8px] text-zinc-500 font-extrabold tracking-tight">
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
                      
                      let cellColor = ""
                      if (cell.status === "solved") {
                        cellColor = "bg-emerald-500/30 border border-emerald-500/50"
                      } else if (cell.status === "attempted") {
                        cellColor = "bg-amber-500/20 border border-amber-500/35"
                      } else {
                        cellColor = "bg-zinc-800/40 border border-zinc-700/20 hover:border-zinc-500/40"
                      }

                      return (
                        <div key={cIdx} className="relative group">
                          <div
                            className={`w-[11px] h-[11px] rounded-[2px] transition-all duration-200 hover:scale-125 hover:z-10 cursor-pointer ${cellColor}`}
                          />
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover:block z-50 bg-zinc-950 border border-zinc-800 text-[9px] text-zinc-300 px-2 py-0.5 rounded shadow-xl whitespace-nowrap pointer-events-none">
                            <span className="font-bold text-white">{formattedDate}</span>
                            <span className="block text-zinc-400 text-[8px] mt-0.5">
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
          <div className="flex items-center justify-between text-[8px] text-zinc-500 font-semibold select-none pt-0.5 border-t border-zinc-800/40">
            <span>Grid spans 84 days</span>
            <div className="flex items-center gap-1">
              <span>Less</span>
              <div className="w-1.5 h-1.5 rounded-[1px] bg-zinc-800/40 border border-zinc-700/20" />
              <div className="w-1.5 h-1.5 rounded-[1px] bg-amber-500/20 border border-amber-500/35" />
              <div className="w-1.5 h-1.5 rounded-[1px] bg-emerald-500/30 border border-emerald-500/50" />
              <span>More</span>
            </div>
          </div>
        </div>

        {/* Difficulty Progress Card */}
        <div className="lg:col-span-4 bg-zinc-900/40 border border-zinc-800 rounded-xl p-3 flex flex-col justify-between">
          <div className="flex flex-col gap-2.5">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[9px] text-zinc-500 uppercase tracking-widest font-bold block leading-none">Difficulty Progress</span>
                <span className="text-base font-extrabold text-zinc-200 tracking-tight block mt-1">
                  {counts.solved} <span className="text-xs font-normal text-zinc-500">/ {counts.total} Solved</span>
                </span>
              </div>
            </div>

            {/* Segmented Progress Bar */}
            <div className="w-full h-1.5 rounded-full bg-zinc-800/60 overflow-hidden flex border border-zinc-850 mt-1">
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
                <div className="flex items-center gap-1 text-emerald-400">
                  <span className="h-1 w-1 rounded-full bg-emerald-500" />
                  <span>Easy</span>
                </div>
                <span className="block text-[10px] text-zinc-300 font-extrabold ml-2">{solvedEasy} / {counts.easy}</span>
              </div>

              <div className="space-y-0.5">
                <div className="flex items-center gap-1 text-amber-400">
                  <span className="h-1 w-1 rounded-full bg-amber-500" />
                  <span>Medium</span>
                </div>
                <span className="block text-[10px] text-zinc-300 font-extrabold ml-2">{solvedMedium} / {counts.medium}</span>
              </div>

              <div className="space-y-0.5">
                <div className="flex items-center gap-1 text-rose-400">
                  <span className="h-1 w-1 rounded-full bg-rose-500" />
                  <span>Hard</span>
                </div>
                <span className="block text-[10px] text-zinc-300 font-extrabold ml-2">{solvedHard} / {counts.hard}</span>
              </div>
            </div>
          </div>

          <Link
            href="/~/logiclab/playground"
            className="mt-3 flex items-center justify-center gap-2 bg-zinc-950 hover:bg-zinc-800 text-zinc-300 hover:text-white px-3.5 py-2.5 rounded-lg text-xs font-bold border border-zinc-800 transition-all w-full text-center shrink-0 cursor-pointer"
          >
            <IconTerminal2 className="h-4 w-4 text-emerald-500" />
            <span>Launch Code Playground</span>
          </Link>
        </div>
      </div>

      {/* ── Problems Table ── */}
      <div className="flex-1 bg-zinc-900/40 border border-zinc-800/50 rounded-xl overflow-hidden">
        {/* Header */}
        <div className="grid grid-cols-12 gap-2 px-4 py-2.5 bg-zinc-900 border-b border-zinc-800 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
          <div className="col-span-1">Status</div>
          <div className={isAdmin ? "col-span-4" : "col-span-5"}>Title</div>
          <div className="col-span-2">Difficulty</div>
          <div className={isAdmin ? "col-span-1" : "col-span-2"}>Acceptance</div>
          <div className="col-span-2 text-right">Tags</div>
          {isAdmin && <div className="col-span-2 text-right">Actions</div>}
        </div>

        {/* Rows */}
        {filtered.length > 0 && (
          <div className="divide-y divide-zinc-800/50">
            {filtered.map((problem, idx) => (
              <div
                key={problem.id}
                onClick={() => router.push(`/~/logiclab/problems/${problem.id}`)}
                className="grid grid-cols-12 gap-2 items-center px-4 py-3 hover:bg-zinc-800/30 transition-colors group cursor-pointer"
              >
                {/* Status */}
                <div className="col-span-1">
                  {problem.solved_status === "Accepted" ? (
                    <IconCircleCheck className="h-4 w-4 text-emerald-400" />
                  ) : problem.solved_status ? (
                    <IconCircleDot className="h-4 w-4 text-amber-400" />
                  ) : (
                    <div className="h-4 w-4 rounded-full border border-zinc-700" />
                  )}
                </div>

                {/* Title */}
                <div className={isAdmin ? "col-span-4 flex items-center gap-2" : "col-span-5 flex items-center gap-2"}>
                  <span className="text-xs text-zinc-500 font-mono w-6 shrink-0">{idx + 1}.</span>
                  <span className="text-sm font-medium text-zinc-200 group-hover:text-white transition-colors truncate">
                    {problem.title}
                  </span>
                  <IconChevronRight className="h-3 w-3 text-zinc-700 group-hover:text-zinc-400 transition-colors ml-auto shrink-0 opacity-0 group-hover:opacity-100" />
                </div>

                {/* Difficulty */}
                <div className="col-span-2">
                  <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${DIFFICULTY_COLORS[problem.difficulty]}`}>
                    {problem.difficulty}
                  </span>
                </div>

                {/* Acceptance Rate */}
                <div className={isAdmin ? "col-span-1" : "col-span-2"}>
                  <span className="text-xs text-zinc-400">
                    {problem.acceptance_rate !== null
                      ? `${problem.acceptance_rate}%`
                      : "—"}
                  </span>
                  {problem.total_submissions > 0 && (
                    <span className="text-[10px] text-zinc-600 ml-1">
                      ({problem.total_submissions})
                    </span>
                  )}
                </div>

                {/* Tags */}
                <div className="col-span-2 flex flex-wrap gap-1 justify-end">
                  {(problem.tags || []).slice(0, 2).map((tag) => (
                    <span
                      key={tag}
                      className="px-1.5 py-0.5 bg-zinc-800 border border-zinc-700 rounded text-[9px] text-zinc-500 font-medium"
                    >
                      {tag}
                    </span>
                  ))}
                </div>

                {/* Actions */}
                {isAdmin && (
                  <div className="col-span-2 flex items-center justify-end gap-1">
                    <Link
                      href={`/~/logiclab/admin/edit/${problem.id}`}
                      onClick={(e) => {
                        e.stopPropagation()
                      }}
                      className="p-1.5 hover:bg-zinc-800 rounded text-zinc-400 hover:text-emerald-400 transition-all inline-flex items-center justify-center cursor-pointer"
                      title="Edit Problem"
                    >
                      <IconEdit className="h-3.5 w-3.5" />
                    </Link>
                    <button
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        setDeletingProblemId(problem.id)
                      }}
                      className="p-1.5 hover:bg-zinc-800 hover:text-rose-400 rounded text-zinc-500 transition-all inline-flex items-center justify-center cursor-pointer"
                      title="Delete Problem"
                    >
                      <IconTrash className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 gap-3 select-none">
            <IconCode className="h-10 w-10 text-zinc-800 stroke-[1.5]" />
            <p className="text-xs text-zinc-600 font-semibold uppercase tracking-widest">
              {problems.length === 0 ? "No problems yet" : "No matching problems"}
            </p>
            {isAdmin && problems.length === 0 && (
              <Link
                href="/~/logiclab/admin"
                className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold mt-1"
              >
                Create your first problem →
              </Link>
            )}
          </div>
        )}
      </div>

      {/* ── Delete Confirmation Modal ── */}
      {deletingProblemId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-zinc-950 border border-zinc-800 rounded-xl shadow-2xl overflow-hidden w-full max-w-md flex flex-col animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3.5 bg-zinc-900 border-b border-zinc-800">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 text-rose-400">
                <IconAlertTriangle className="h-4.5 w-4.5" /> Permanent Deletion
              </h3>
              <button
                onClick={() => setDeletingProblemId(null)}
                disabled={isDeleting}
                className="p-1 hover:bg-zinc-800 rounded text-zinc-500 hover:text-white transition-colors cursor-pointer animate-none"
              >
                <IconX className="h-4 w-4" />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 text-sm text-zinc-300 space-y-3">
              <p>
                Are you absolutely sure you want to permanently delete this coding problem?
              </p>
              <div className="p-3 bg-rose-500/5 border border-rose-500/10 rounded-lg text-xs text-rose-400/90 leading-relaxed">
                <strong>WARNING:</strong> This action is irreversible. All student submissions and graded performance records for this challenge will be permanently purged.
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-2 px-4 py-3 bg-zinc-900/50 border-t border-zinc-800">
              <button
                onClick={() => setDeletingProblemId(null)}
                disabled={isDeleting}
                className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-zinc-400 hover:text-white bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 hover:border-zinc-700 transition-colors cursor-pointer disabled:opacity-40"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="flex items-center gap-1.5 bg-rose-500 hover:bg-rose-400 text-white px-4 py-1.5 rounded-lg text-xs font-bold shadow-[0_0_12px_rgba(239,68,68,0.2)] transition-all cursor-pointer disabled:opacity-40"
              >
                {isDeleting ? (
                  <span className="flex items-center gap-1.5">
                    <span className="h-3 w-3 border border-current border-t-transparent rounded-full animate-spin inline-block" />
                    <span>Deleting...</span>
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5">
                    <IconTrash className="h-3.5 w-3.5" />
                    <span>Delete Problem</span>
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
