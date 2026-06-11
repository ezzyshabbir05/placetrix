"use client"

import React, { useState, useEffect, useCallback, useTransition, useRef, useMemo } from "react"
import Link from "next/link"
import { useRouter, usePathname } from "next/navigation"
import {
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
  ChevronLeft,
  ChevronUp,
  ChevronDown,
  ChevronsLeft,
  ChevronsRight,
  Loader2,
  Filter,
  Dices,
  Clock,
  CalendarDays,
  Trophy,
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Progress } from "@/components/ui/progress"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
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
  streakStats: {
    currentStreak: number
    maxStreak: number
  }
  activityCalendar: CalendarCell[]
  initialPage: number
  initialPageSize: number
  initialSearch: string
  initialTab: string
  initialDifficulty: string
  initialTag: string
  totalCount: number
  tabCounts: { all: number; solved: number; attempted: number; unsolved: number }
  allTags: string[]
  tagCounts: Record<string, number>
  globalStats: {
    total: number
    solved: number
    easy: { total: number; solved: number }
    medium: { total: number; solved: number }
    hard: { total: number; solved: number }
  }
  initialPotd?: any
  fullPotdProblem?: any
}

const DIFFICULTY_COLORS: Record<string, string> = {
  Easy: "bg-emerald-100/80 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-500/15 dark:text-emerald-400 border-transparent",
  Medium: "bg-amber-100/80 text-amber-700 hover:bg-amber-100 dark:bg-amber-500/15 dark:text-amber-400 border-transparent",
  Hard: "bg-rose-100/80 text-rose-700 hover:bg-rose-100 dark:bg-rose-500/15 dark:text-rose-400 border-transparent",
}

function ConcentricRing({ radius, value, max, color, trackColor }: { radius: number, value: number, max: number, color: string, trackColor: string }) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  const circumference = 2 * Math.PI * radius
  const percent = max > 0 ? value / max : 0
  const strokeDashoffset = circumference - percent * circumference

  return (
    <g transform="rotate(-90 50 50)">
      <circle cx="50" cy="50" r={radius} fill="none" stroke={trackColor} strokeWidth="8" />
      <circle
        cx="50" cy="50" r={radius} fill="none" stroke={color} strokeWidth="8"
        strokeDasharray={circumference} strokeDashoffset={mounted ? strokeDashoffset : circumference}
        strokeLinecap="round"
        className="transition-all duration-1000 ease-out"
      />
    </g>
  )
}

export function ProblemsDirectoryClient({
  problems,
  isAdmin,
  streakStats,
  activityCalendar,
  initialPage,
  initialPageSize,
  initialSearch,
  initialTab,
  initialDifficulty,
  initialTag,
  totalCount,
  allTags,
  tagCounts,
  globalStats,
  initialPotd,
  fullPotdProblem,
}: ProblemsDirectoryProps) {
  const router = useRouter()
  const pathname = usePathname()

  const [isPending, startTransition] = useTransition()
  const [searchInput, setSearchInput] = useState(initialSearch)
  const [showAllTags, setShowAllTags] = useState(false)
  const [showMetrics, setShowMetrics] = useState(true)
  const isOwnUpdateRef = useRef(false)
  const cellRadiusClass = "rounded-[18%]"

  const potd = initialPotd
  const [timeLeft, setTimeLeft] = useState<string>("")

  // UTC Midnight Countdown Timer
  useEffect(() => {
    if (!potd) return;
    const updateTimer = () => {
      const now = new Date();
      const nextMidnight = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
      const diff = nextMidnight.getTime() - now.getTime();

      if (diff <= 0) {
        setTimeLeft("00h 00m 00s");
        return;
      }

      const h = Math.floor(diff / (1000 * 60 * 60)).toString().padStart(2, '0');
      const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)).toString().padStart(2, '0');
      const s = Math.floor((diff % (1000 * 60)) / 1000).toString().padStart(2, '0');

      setTimeLeft(`${h}h ${m}m ${s}s`);
    };
    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [potd]);

  const activeChallenge = useMemo(() => {
    if (fullPotdProblem) return fullPotdProblem;
    if (!potd) return null;
    const pId = potd.problem_id || potd.coding_problems?.id;
    const found = problems.find((p) => p.id === pId);
    if (found) return found;
    return {
      title: potd.coding_problems?.title,
      difficulty: potd.coding_problems?.difficulty,
      tags: [],
      solved_status: null,
      acceptance_rate: null,
      total_submissions: 0
    };
  }, [fullPotdProblem, potd, problems]);

  const handleRandomProblem = async () => {
    const toastId = toast.loading("Picking a random problem...")
    try {
      const res = await fetch("/api/logiclab/random")
      const data = await res.json()
      if (data.success && data.id) {
        toast.dismiss(toastId)
        router.push(`/logiclab/problems/${data.id}`)
      } else {
        throw new Error(data.error || "No problems available")
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to fetch random problem", { id: toastId })
    }
  }

  // Align cells into weeks starting on Sunday
  const alignedWeeks = useMemo(() => {
    const result: CalendarCell[][] = []
    let currentWeek: CalendarCell[] = []

    if (!activityCalendar || activityCalendar.length === 0) return result

    const firstDay = activityCalendar[0].dayOfWeek
    for (let i = 0; i < firstDay; i++) {
      currentWeek.push({ date: "", count: 0, status: "none", dayOfWeek: i })
    }

    activityCalendar.forEach((cell) => {
      currentWeek.push(cell)
      if (cell.dayOfWeek === 6) {
        result.push(currentWeek)
        currentWeek = []
      }
    })

    if (currentWeek.length > 0) {
      const lastDay = currentWeek[currentWeek.length - 1].dayOfWeek
      for (let i = lastDay + 1; i <= 6; i++) {
        currentWeek.push({ date: "", count: 0, status: "none", dayOfWeek: i })
      }
      result.push(currentWeek)
    }

    return result.slice(-20)
  }, [activityCalendar])

  const { displayColumns, visibleMonthLabels } = useMemo(() => {
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const cols: any[] = [];
    const labels: string[] = [];

    let currentMonthStr = "";

    alignedWeeks.forEach((week) => {
      const monthsInWeek: string[] = [];
      week.forEach((cell) => {
        if (cell && cell.date) {
          const m = cell.date.substring(0, 7);
          if (!monthsInWeek.includes(m)) monthsInWeek.push(m);
        }
      });

      if (monthsInWeek.length === 2) {
        const m1 = monthsInWeek[0];
        const m2 = monthsInWeek[1];

        const part1 = week.map((c) =>
          c && c.date && c.date.substring(0, 7) === m1 ? c : { date: "", count: 0, status: "none", dayOfWeek: c?.dayOfWeek || 0 }
        );
        const part2 = week.map((c) =>
          c && c.date && c.date.substring(0, 7) === m2 ? c : { date: "", count: 0, status: "none", dayOfWeek: c?.dayOfWeek || 0 }
        );

        if (currentMonthStr === "") {
          currentMonthStr = m1;
          labels.push(monthNames[parseInt(m1.split("-")[1], 10) - 1]);
        } else {
          labels.push("");
        }
        cols.push(part1);

        cols.push("GAP");
        labels.push("");

        cols.push(part2);
        labels.push(monthNames[parseInt(m2.split("-")[1], 10) - 1]);
        currentMonthStr = m2;
      } else if (monthsInWeek.length === 1) {
        const m = monthsInWeek[0];
        if (currentMonthStr !== "" && m !== currentMonthStr) {
          cols.push("GAP");
          labels.push("");
          cols.push(week);
          labels.push(monthNames[parseInt(m.split("-")[1], 10) - 1]);
        } else {
          cols.push(week);
          if (currentMonthStr === "") {
            labels.push(monthNames[parseInt(m.split("-")[1], 10) - 1]);
          } else {
            labels.push("");
          }
        }
        currentMonthStr = m;
      } else {
        cols.push(week);
        labels.push("");
      }
    });

    return { displayColumns: cols, visibleMonthLabels: labels };
  }, [alignedWeeks])

  // Modal deletion state
  const [deletingProblemId, setDeletingProblemId] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Sync search input only on external navigation
  useEffect(() => {
    if (isOwnUpdateRef.current) {
      isOwnUpdateRef.current = false
      return
    }
    setSearchInput(initialSearch)
  }, [initialSearch])

  // Helper to push updated params to url
  const updateParams = useCallback(
    (newParams: Partial<Record<string, string | number>>) => {
      const params = new URLSearchParams(window.location.search)
      Object.entries(newParams).forEach(([key, val]) => {
        if (val === undefined || val === "" || val === null || val === "All") {
          params.delete(key)
        } else {
          params.set(key, String(val))
        }
      })
      startTransition(() => {
        router.push(`${pathname}?${params.toString()}`)
      })
    },
    [pathname, router]
  )

  // Debounce search input
  useEffect(() => {
    if (searchInput === initialSearch) return

    const timer = setTimeout(() => {
      isOwnUpdateRef.current = true
      updateParams({ search: searchInput, page: 1 })
    }, 400)
    return () => clearTimeout(timer)
  }, [searchInput, initialSearch, updateParams])

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
      setDeletingProblemId(null)
      router.refresh()
    } catch (err: any) {
      toast.error(err?.message || "Failed to delete problem.", { id: tId })
    } finally {
      setIsDeleting(false)
    }
  }

  const totalPages = Math.ceil(totalCount / initialPageSize)
  const activePage = Math.min(initialPage, Math.max(1, totalPages))

  return (
    <div className="flex flex-col gap-8 px-4 py-8 md:px-8">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-1.5">
          <h1 className="text-4xl font-bold font-cirka tracking-tight text-foreground">Logic Lab</h1>
          <p className="text-base text-muted-foreground">
            Master your coding skills with our curated problem set.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 sm:gap-3">
          <Button variant="outline" size="icon" className="shrink-0" onClick={() => setShowMetrics(!showMetrics)} title="Toggle Dashboard">
            {showMetrics ? <ChevronUp /> : <ChevronDown />}
          </Button>

          <Button asChild variant="outline" size="icon" className="shrink-0" title="Playground">
            <Link href="/logiclab/playground" className="flex items-center justify-center">
              <Terminal />
            </Link>
          </Button>
          {isAdmin && (
            <Button asChild size="icon" className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm shrink-0" title="Create Problem">
              <Link href="/logiclab/admin" className="flex items-center justify-center">
                <Plus />
              </Link>
            </Button>
          )}
        </div>
      </div>



      {/* Metrics Row */}
      {showMetrics && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-top-2 duration-300 min-w-0">
          {/* Card 1: Progress & Difficulty */}
          <div className="lg:col-span-1 shadow-sm border border-border/60 rounded-xl bg-card text-card-foreground min-w-0 flex flex-col p-6">
            {/* Header */}
            <div className="flex flex-row items-center justify-between pb-4 relative shrink-0 flex-wrap gap-2 min-w-0">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                Overall Progress
              </h3>
              <div className="text-xs text-muted-foreground/80 flex items-center gap-1 font-medium select-none shrink-0">
                {globalStats.total > 0 ? Math.round((globalStats.solved / globalStats.total) * 100) : 0}% Solved
              </div>
            </div>

            {/* Content & Footer */}
            <div className="flex flex-col flex-1 justify-between gap-5">
              {/* Main Content: Stats and Chart */}
              <div className="flex items-center justify-between gap-6 min-w-0 w-full my-auto">
                {/* Stat rows */}
                <div className="flex flex-col gap-3.5 flex-1 min-w-0">
                  {/* Easy */}
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                      <span className="text-muted-foreground font-medium truncate">Easy</span>
                    </div>
                    <div className="flex items-baseline gap-1 shrink-0 font-semibold">
                      <span className="text-emerald-600 dark:text-emerald-400">{globalStats.easy.solved}</span>
                      <span className="text-xs text-muted-foreground/50">/ {globalStats.easy.total}</span>
                    </div>
                  </div>

                  {/* Medium */}
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                      <span className="text-muted-foreground font-medium truncate">Medium</span>
                    </div>
                    <div className="flex items-baseline gap-1 shrink-0 font-semibold">
                      <span className="text-amber-600 dark:text-amber-400">{globalStats.medium.solved}</span>
                      <span className="text-xs text-muted-foreground/50">/ {globalStats.medium.total}</span>
                    </div>
                  </div>

                  {/* Hard */}
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
                      <span className="text-muted-foreground font-medium truncate">Hard</span>
                    </div>
                    <div className="flex items-baseline gap-1 shrink-0 font-semibold">
                      <span className="text-rose-600 dark:text-rose-400">{globalStats.hard.solved}</span>
                      <span className="text-xs text-muted-foreground/50">/ {globalStats.hard.total}</span>
                    </div>
                  </div>
                </div>

                {/* Concentric ring chart */}
                <div className="relative w-24 h-24 sm:w-28 sm:h-28 shrink-0">
                  <svg className="w-full h-full drop-shadow-md" viewBox="0 0 100 100" preserveAspectRatio="xMaxYMid meet">
                    <defs>
                      <linearGradient id="easyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#34d399" />
                        <stop offset="100%" stopColor="#059669" />
                      </linearGradient>
                      <linearGradient id="medGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#fbbf24" />
                        <stop offset="100%" stopColor="#d97706" />
                      </linearGradient>
                      <linearGradient id="hardGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#fb7185" />
                        <stop offset="100%" stopColor="#be123c" />
                      </linearGradient>
                    </defs>
                    <ConcentricRing radius={44} value={globalStats.easy.solved} max={globalStats.easy.total} color="url(#easyGrad)" trackColor="rgba(16, 185, 129, 0.15)" />
                    <ConcentricRing radius={31} value={globalStats.medium.solved} max={globalStats.medium.total} color="url(#medGrad)" trackColor="rgba(245, 158, 11, 0.15)" />
                    <ConcentricRing radius={18} value={globalStats.hard.solved} max={globalStats.hard.total} color="url(#hardGrad)" trackColor="rgba(244, 63, 94, 0.15)" />
                  </svg>
                </div>
              </div>

              {/* Clean Horizontal Progress Bar for Total Progress */}
              <div className="mt-auto pt-4 border-border/60 select-none space-y-2">
                <div className="flex items-center justify-between text-xs sm:text-sm text-muted-foreground">
                  <span className="font-semibold text-foreground">Total Solved</span>
                  <span className="font-bold text-foreground">
                    {globalStats.solved} <span className="text-xs font-normal text-muted-foreground/60">/ {globalStats.total}</span>
                  </span>
                </div>
                <Progress
                  value={globalStats.total > 0 ? (globalStats.solved / globalStats.total) * 100 : 0}
                  className="h-1.5 bg-muted/60 [&>div]:bg-blue-500 dark:[&>div]:bg-blue-400"
                />
              </div>
            </div>
          </div>

          {/* Card 2: Activity Heat Map */}
          <div className="shadow-sm border border-border/60 rounded-xl bg-card text-card-foreground min-w-0 flex flex-col p-6">
            <div className="flex flex-row items-center justify-between pb-6 shrink-0 flex-wrap gap-2 min-w-0">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Activity Graph</h3>
            </div>

            {/* Heatmap Grid Container */}
            <div className="w-full pb-2">
              <div
                className="grid gap-x-[2px] gap-y-[2px] sm:gap-x-[3px] sm:gap-y-[3px] w-full"
                style={{
                  gridTemplateColumns: `auto ${displayColumns.map(c => c === "GAP" ? "minmax(4px, 8px)" : "minmax(0, 1fr)").join(" ")}`
                }}
              >
                {/* Month Labels Row */}
                <div className=""></div>
                {(() => {
                  const blocks: { label: string; span: number }[] = [];
                  let currentLabel: string | null = null;
                  let currentSpan = 0;

                  displayColumns.forEach((col, wIdx) => {
                    const m = visibleMonthLabels[wIdx];
                    if (m) {
                      if (currentSpan > 0) {
                        blocks.push({ label: currentLabel || "", span: currentSpan });
                      }
                      currentLabel = m;
                      currentSpan = 1;
                    } else {
                      if (currentLabel === null) {
                        currentLabel = "";
                      }
                      currentSpan += 1;
                    }
                  });
                  if (currentSpan > 0) {
                    blocks.push({ label: currentLabel || "", span: currentSpan });
                  }

                  return blocks.map((block, i) => (
                    <div key={`month-block-${i}`} className="relative h-5 flex items-end justify-center pb-1" style={{ gridColumn: `span ${block.span}` }}>
                      {block.label && (
                        <span className="text-[10px] font-semibold text-muted-foreground/70 whitespace-nowrap">
                          {block.label}
                        </span>
                      )}
                    </div>
                  ));
                })()}

                {/* Day Rows */}
                {[0, 1, 2, 3, 4, 5, 6].map((dayIndex) => (
                  <React.Fragment key={dayIndex}>
                    {/* Y-Axis Label */}
                    <div className="relative w-6 sm:w-7">
                      <span className="absolute inset-y-0 right-2 flex items-center text-[10px] font-medium text-muted-foreground/50 leading-none">
                        {dayIndex === 1 ? "Mon" : dayIndex === 3 ? "Wed" : dayIndex === 5 ? "Fri" : ""}
                      </span>
                    </div>
                    {/* Week Cells for this Day */}
                    {displayColumns.map((col, wIdx) => {
                      if (col === "GAP") return <div key={`gap-cell-${dayIndex}-${wIdx}`} className="" />;

                      const cell = col[dayIndex];

                      if (!cell || !cell.date) {
                        return (
                          <div
                            key={`cell-${dayIndex}-${wIdx}`}
                            className={cn("w-full aspect-square bg-transparent pointer-events-none", cellRadiusClass)}
                          />
                        );
                      }

                      let cellColor = "bg-muted";
                      if (cell.status === "attempted") {
                        cellColor = "bg-amber-400/80 dark:bg-amber-500/60";
                      } else if (cell.status === "solved") {
                        if (cell.count === 1) cellColor = "bg-emerald-300 dark:bg-emerald-800";
                        else if (cell.count <= 3) cellColor = "bg-emerald-400 dark:bg-emerald-600";
                        else if (cell.count <= 6) cellColor = "bg-emerald-500 dark:bg-emerald-500";
                        else cellColor = "bg-emerald-600 dark:bg-emerald-400";
                      }

                      return (
                        <div
                          key={`cell-${dayIndex}-${wIdx}`}
                          className={cn(
                            "w-full aspect-square cursor-pointer transition-all hover:ring-2 hover:ring-offset-1 hover:ring-foreground/20 dark:hover:ring-offset-background",
                            cellRadiusClass,
                            cellColor
                          )}
                          title={`${cell.date}: ${cell.count} submissions`}
                        />
                      );
                    })}
                  </React.Fragment>
                ))}
              </div>
            </div>

            {/* Footer: Streak and Legend */}
            <div className="mt-auto pt-5 flex items-end justify-between gap-4 flex-wrap min-w-0 w-full">
              {/* Legend */}
              <div className="flex items-center gap-2 text-[10px] font-medium text-muted-foreground/70 pb-0.5">
                <span>Less</span>
                <div className="flex gap-[3px] items-center">
                  <div className={cn("w-[10px] h-[10px] bg-muted", cellRadiusClass)} title="0 submissions" />
                  <div className={cn("w-[10px] h-[10px] bg-amber-400/80 dark:bg-amber-500/60", cellRadiusClass)} title="Attempted" />
                  <div className={cn("w-[10px] h-[10px] bg-emerald-300 dark:bg-emerald-800", cellRadiusClass)} title="1 submission" />
                  <div className={cn("w-[10px] h-[10px] bg-emerald-400 dark:bg-emerald-600", cellRadiusClass)} title="2-3 submissions" />
                  <div className={cn("w-[10px] h-[10px] bg-emerald-500 dark:bg-emerald-500", cellRadiusClass)} title="4-6 submissions" />
                  <div className={cn("w-[10px] h-[10px] bg-emerald-600 dark:bg-emerald-400", cellRadiusClass)} title="7+ submissions" />
                </div>
                <span>More</span>
              </div>

              {/* Streak */}
              <div className="flex items-center gap-2.5 shrink-0 text-sm font-semibold">
                <div className="flex items-center gap-1.5 text-foreground">
                  <Flame className="w-4 h-4 text-orange-500 fill-orange-500/10 shrink-0" />
                  <span>{streakStats.currentStreak} day streak</span>
                </div>
                <span className="text-muted-foreground/30">|</span>
                <span className="text-xs text-muted-foreground font-medium">
                  Max: <span className="text-foreground font-semibold">{streakStats.maxStreak}</span>
                </span>
              </div>
            </div>
          </div>

          {/* Card 3: POTD Card */}
          <div className="shadow-sm border border-border/60 rounded-xl bg-card text-card-foreground min-w-0 flex flex-col group relative p-6 transition-all hover:border-border/80">
            <div className="flex flex-row items-center justify-between pb-4 relative shrink-0 flex-wrap gap-2 min-w-0">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                Daily Challenge
              </h3>
              {timeLeft && (
                <div className="text-xs text-muted-foreground/80 flex items-center gap-1 font-medium select-none shrink-0">
                  <Clock className="h-3.5 w-3.5" />
                  {timeLeft}
                </div>
              )}
            </div>
            <div className="flex flex-col flex-1 justify-between gap-5 relative">
              <div className="space-y-4 min-w-0">
                <div className="space-y-1.5">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="font-bold text-lg sm:text-xl text-foreground leading-snug group-hover:text-primary transition-colors">
                      {activeChallenge?.title || "Loading..."}
                    </h3>
                    {activeChallenge?.solved_status === "Accepted" && (
                      <CircleCheck className="w-6 h-6 text-emerald-500 shrink-0 mt-0.5" />
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs sm:text-sm text-muted-foreground">
                    {/* Difficulty (clean inline text) */}
                    {activeChallenge?.difficulty && (
                      <span className={cn(
                        "font-semibold",
                        activeChallenge.difficulty === "Easy" ? "text-emerald-600 dark:text-emerald-400" :
                          activeChallenge.difficulty === "Medium" ? "text-amber-600 dark:text-amber-400" :
                            "text-rose-600 dark:text-rose-400"
                      )}>
                        {activeChallenge.difficulty}
                      </span>
                    )}

                    <span>•</span>

                    {/* Acceptance rate */}
                    {activeChallenge?.acceptance_rate !== undefined && activeChallenge?.acceptance_rate !== null && (
                      <>
                        <span>{activeChallenge.acceptance_rate}% accept</span>
                        <span>•</span>
                      </>
                    )}

                    {/* Submissions count */}
                    <span>{activeChallenge?.total_submissions?.toLocaleString() || 0} submissions</span>
                  </div>
                </div>

                {/* Clean Tags Row */}
                {activeChallenge?.tags && activeChallenge.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-0.5">
                    {activeChallenge.tags.slice(0, 2).map((t: string) => (
                      <span key={t} className="text-[11px] bg-muted px-2.5 py-1 rounded-md text-muted-foreground font-medium">
                        {t}
                      </span>
                    ))}
                  </div>
                )}

                {/* Clean Horizontal Progress Bar for Acceptance Rate */}
                {activeChallenge?.acceptance_rate !== undefined && activeChallenge?.acceptance_rate !== null && (
                  <div className="space-y-2 pt-2 select-none">
                    <div className="flex items-center justify-between text-xs sm:text-sm text-muted-foreground">
                      <span>Acceptance Rate</span>
                      <span className="font-semibold text-foreground">{activeChallenge.acceptance_rate}%</span>
                    </div>
                    <Progress
                      value={activeChallenge.acceptance_rate}
                      className={cn(
                        "h-1.5 bg-muted/60",
                        activeChallenge?.solved_status === "Accepted"
                          ? "[&>div]:bg-emerald-500"
                          : "[&>div]:bg-orange-500"
                      )}
                    />
                  </div>
                )}
              </div>

              {/* Action Button: Minimal Outline Button */}
              <Button
                variant="outline"
                className={cn(
                  "w-full mt-2 gap-2 py-5 font-semibold text-sm sm:text-base border transition-colors",
                  activeChallenge?.solved_status === "Accepted"
                    ? "border-emerald-500/20 text-emerald-600 dark:border-emerald-500/10 dark:text-emerald-400 hover:bg-transparent hover:text-emerald-600 dark:hover:text-emerald-400"
                    : "border-orange-500/20 text-orange-600 dark:border-orange-500/10 dark:text-orange-400 hover:bg-transparent hover:text-orange-600 dark:hover:text-orange-400"
                )}
                onClick={() => potd && router.push(`/logiclab/problems/${potd.problem_id}`)}
                disabled={!potd}
              >
                {activeChallenge?.solved_status === "Accepted" ? (
                  <>
                    Review Challenge
                    <CircleCheck className="w-4.5 h-4.5" />
                  </>
                ) : (
                  <>
                    Solve Challenge
                    <ChevronRight className="w-4.5 h-4.5" />
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">

        {/* Search & Difficulty (Moved to Left) */}
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full xl:w-auto">
          <div className="relative w-full sm:w-80">
            {isPending ? (
              <Loader2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground animate-spin" />
            ) : (
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            )}
            <Input
              placeholder="Search problems..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="pl-9 pr-9 h-10 w-full bg-background text-sm rounded-lg"
            />
            {searchInput && (
              <button
                onClick={() => {
                  isOwnUpdateRef.current = true
                  setSearchInput("")
                  updateParams({ search: "", page: 1 })
                }}
                className="absolute right-3 top-2.5 h-5 w-5 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <Select value={initialDifficulty} onValueChange={(val) => updateParams({ difficulty: val, page: 1 })}>
            <SelectTrigger className="h-10 w-full sm:w-[160px] bg-background text-sm rounded-lg">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-muted-foreground" />
                <SelectValue placeholder="Difficulty" />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All Difficulties</SelectItem>
              <SelectItem value="Easy">Easy</SelectItem>
              <SelectItem value="Medium">Medium</SelectItem>
              <SelectItem value="Hard">Hard</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={handleRandomProblem} variant="outline" size="icon" className="shrink-0 text-indigo-500 hover:text-indigo-600 dark:text-indigo-400 dark:hover:text-indigo-300 border-indigo-200 dark:border-indigo-900/50 hover:bg-indigo-50 dark:hover:bg-indigo-900/20" title="Pick Random Problem">
            <Dices />
          </Button>
        </div>

        {/* Tabs (Moved to Right) */}
        <Tabs value={initialTab} onValueChange={(v) => updateParams({ tab: v, page: 1 })} className="w-full xl:w-auto">
          <TabsList className="h-10 w-full xl:w-auto p-1 bg-muted/50 overflow-x-auto flex justify-start rounded-xl">
            <TabsTrigger value="all" className="px-5 text-sm rounded-lg data-[state=active]:shadow-sm">All</TabsTrigger>
            <TabsTrigger value="solved" className="px-5 text-sm rounded-lg data-[state=active]:shadow-sm">Solved</TabsTrigger>
            <TabsTrigger value="attempted" className="px-5 text-sm rounded-lg data-[state=active]:shadow-sm">Attempted</TabsTrigger>
            <TabsTrigger value="unsolved" className="px-5 text-sm rounded-lg data-[state=active]:shadow-sm">Unsolved</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border/60 overflow-hidden">
        <div className="relative">
          {isPending && (
            <div className="absolute inset-0 z-50 bg-background/50 backdrop-blur-[1px] flex items-center justify-center min-h-[200px]">
              <div className="flex flex-col items-center gap-3 rounded-xl border bg-card px-6 py-5 shadow-lg">
                <Loader2 className="h-8 w-8 text-primary animate-spin" />
                <span className="text-sm font-medium text-muted-foreground">Loading problems...</span>
              </div>
            </div>
          )}

          <div className={cn("transition-opacity duration-200", isPending && "opacity-40 pointer-events-none")}>
            {totalCount === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 text-center gap-4">
                <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center">
                  <BookOpen className="h-8 w-8 text-muted-foreground/60" />
                </div>
                <div className="space-y-1">
                  <p className="text-lg font-semibold text-foreground">No problems found</p>
                  <p className="text-sm text-muted-foreground max-w-sm">
                    We couldn't find any problems matching your current filters. Try adjusting your search or removing some tags.
                  </p>
                </div>
                <Button variant="outline" onClick={() => updateParams({ search: "All", tag: "All", difficulty: "All", tab: "all", page: 1 })} className="mt-2">
                  Clear all filters
                </Button>
              </div>
            ) : (
              <div className="w-full overflow-x-auto">
                <Table className="min-w-[800px]">
                  <TableHeader className="bg-muted/10 h-10">
                    <TableRow className="hover:bg-transparent border-b-border/60">
                      <TableHead className="w-[80px] pl-6 text-sm font-medium">Status</TableHead>
                      <TableHead className="text-sm font-medium">Title</TableHead>
                      <TableHead className="w-[140px] text-sm font-medium">Difficulty</TableHead>
                      <TableHead className="w-[180px] text-sm font-medium">Acceptance</TableHead>
                      <TableHead className="w-[200px] text-sm font-medium">Tags</TableHead>
                      {isAdmin && <TableHead className="text-right pr-6 w-[120px] text-sm font-medium">Actions</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {problems.map((problem, idx) => (
                      <TableRow
                        key={problem.id}
                        onClick={() => router.push(`/logiclab/problems/${problem.id}`)}
                        className="group cursor-pointer hover:bg-muted/40 transition-colors h-12 border-b-border/60"
                      >
                        {/* Status */}
                        <TableCell className="pl-6">
                          {problem.solved_status === "Accepted" ? (
                            <CircleCheck className="h-5 w-5 text-emerald-500 fill-emerald-50 dark:fill-emerald-950/20" />
                          ) : problem.solved_status ? (
                            <CircleDot className="h-5 w-5 text-amber-500 fill-amber-50 dark:fill-amber-950/20" />
                          ) : (
                            <div className="h-4 w-4 ml-0.5 rounded-full border-2 border-muted-foreground/30" />
                          )}
                        </TableCell>

                        {/* Title */}
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <span className="text-sm text-muted-foreground/60 font-mono w-6 shrink-0">
                              {idx + 1 + (activePage - 1) * initialPageSize}.
                            </span>
                            <span className="text-base font-medium text-foreground/90 group-hover:text-foreground transition-colors">
                              {problem.title}
                            </span>
                          </div>
                        </TableCell>

                        {/* Difficulty */}
                        <TableCell>
                          <Badge
                            variant="secondary"
                            className={cn("text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-md", DIFFICULTY_COLORS[problem.difficulty])}
                          >
                            {problem.difficulty}
                          </Badge>
                        </TableCell>

                        {/* Acceptance Rate */}
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-foreground/80">
                              {problem.acceptance_rate !== null ? `${problem.acceptance_rate}%` : "—"}
                            </span>
                            {problem.total_submissions > 0 && (
                              <span className="text-xs text-muted-foreground/60">
                                ({problem.total_submissions})
                              </span>
                            )}
                          </div>
                        </TableCell>

                        {/* Tags */}
                        <TableCell>
                          <div className="flex flex-wrap gap-1.5">
                            {(problem.tags || []).slice(0, 2).map((tag) => (
                              <Badge
                                key={tag}
                                variant="secondary"
                                className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-muted/80 text-muted-foreground/80 hover:bg-muted border-transparent"
                              >
                                {tag}
                              </Badge>
                            ))}
                            {(problem.tags || []).length > 2 && (
                              <Badge
                                variant="secondary"
                                className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-muted/40 text-muted-foreground/60 hover:bg-muted/50 border-transparent"
                              >
                                +{(problem.tags || []).length - 2}
                              </Badge>
                            )}
                          </div>
                        </TableCell>

                        {/* Admin actions */}
                        {isAdmin && (
                          <TableCell className="text-right pr-6" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Link
                                href={`/logiclab/admin/edit/${problem.id}`}
                                className="p-2 hover:bg-background rounded-md text-muted-foreground hover:text-emerald-500 transition-all cursor-pointer shadow-sm border border-transparent hover:border-border/60"
                                title="Edit Problem"
                              >
                                <Pencil className="h-4 w-4" />
                              </Link>
                              <button
                                onClick={() => setDeletingProblemId(problem.id)}
                                className="p-2 hover:bg-background rounded-md text-muted-foreground/70 hover:text-rose-500 transition-all cursor-pointer shadow-sm border border-transparent hover:border-border/60"
                                title="Delete Problem"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {/* Pagination Footer */}
            {totalCount > 0 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 border-t border-border/60 bg-muted/5">
                <div className="text-sm text-muted-foreground">
                  Showing{" "}
                  <span className="font-medium text-foreground">
                    {totalCount === 0 ? 0 : Math.min(totalCount, (activePage - 1) * initialPageSize + 1)}
                  </span>
                  {" "}to{" "}
                  <span className="font-medium text-foreground">{Math.min(totalCount, activePage * initialPageSize)}</span>
                  {" "}of{" "}
                  <span className="font-medium text-foreground">{totalCount}</span> problems
                </div>

                <div className="flex flex-wrap items-center gap-4 sm:gap-6">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground whitespace-nowrap">Rows per page</span>
                    <Select
                      value={initialPageSize.toString()}
                      onValueChange={(val) => updateParams({ size: val, page: 1 })}
                    >
                      <SelectTrigger className="h-9 w-[80px] bg-background text-sm">
                        <SelectValue placeholder={initialPageSize.toString()} />
                      </SelectTrigger>
                      <SelectContent>
                        {[20, 50, 100].map((s) => (
                          <SelectItem key={s} value={s.toString()} className="text-sm">{s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center gap-1">
                    <Button variant="outline" size="icon" className="bg-background"
                      onClick={() => updateParams({ page: 1 })} disabled={activePage === 1}>
                      <ChevronsLeft />
                      <span className="sr-only">First page</span>
                    </Button>
                    <Button variant="outline" size="icon" className="bg-background"
                      onClick={() => updateParams({ page: Math.max(1, activePage - 1) })} disabled={activePage === 1}>
                      <ChevronLeft />
                      <span className="sr-only">Previous page</span>
                    </Button>
                    <div className="flex items-center justify-center text-sm font-medium min-w-[100px] text-muted-foreground">
                      Page <span className="text-foreground mx-1">{activePage}</span> of {totalPages}
                    </div>
                    <Button variant="outline" size="icon" className="bg-background"
                      onClick={() => updateParams({ page: Math.min(totalPages, activePage + 1) })}
                      disabled={activePage === totalPages || totalPages === 0}>
                      <ChevronRight />
                      <span className="sr-only">Next page</span>
                    </Button>
                    <Button variant="outline" size="icon" className="bg-background"
                      onClick={() => updateParams({ page: totalPages })}
                      disabled={activePage === totalPages || totalPages === 0}>
                      <ChevronsRight />
                      <span className="sr-only">Last page</span>
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Delete Confirmation Modal ── */}
      <AlertDialog open={!!deletingProblemId} onOpenChange={(open) => { if (!open) setDeletingProblemId(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-rose-500">
              <AlertTriangle className="size-5" /> Permanent Deletion
            </AlertDialogTitle>
            <AlertDialogDescription className="flex flex-col gap-3">
              <span>Are you absolutely sure you want to permanently delete this coding problem?</span>
              <span className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg text-rose-600 dark:text-rose-400 font-medium block">
                This action cannot be undone. All associated user submissions and attempts will also be deleted.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={isDeleting}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground gap-2"
            >
              {isDeleting ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
              {isDeleting ? "Deleting..." : "Delete Problem"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  )
}
