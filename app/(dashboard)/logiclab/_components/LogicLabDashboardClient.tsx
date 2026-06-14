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
  ChevronsLeft,
  ChevronsRight,
  Loader2,
  Filter,
  Dices,
  Clock,
  CalendarDays,
  Trophy,
  SlidersHorizontal,
  ChevronsUp,
  ChevronsDown,
  CircleDashed,
  ListTodo,
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle, CardAction, CardDescription, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectGroup,
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
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from "@/components/ui/input-group"
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription, EmptyContent, EmptyMedia } from "@/components/ui/empty"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet"

interface Problem {
  id: string
  number?: number | null
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
  easySolved?: number
  mediumSolved?: number
  hardSolved?: number
  easyAttempted?: number
  mediumAttempted?: number
  hardAttempted?: number
}

interface LogicLabDashboardProps {
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

function ConcentricRing({
  radius,
  value,
  max,
  color,
  trackColor,
  isActive,
  isDimmed,
  onMouseEnter,
  onMouseLeave
}: {
  radius: number
  value: number
  max: number
  color: string
  trackColor: string
  isActive?: boolean
  isDimmed?: boolean
  onMouseEnter?: () => void
  onMouseLeave?: () => void
}) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  const circumference = 2 * Math.PI * radius
  const percent = max > 0 ? value / max : 0
  const strokeDashoffset = circumference - percent * circumference

  return (
    <g
      transform="rotate(-90 50 50)"
      className={cn(
        "cursor-pointer group/ring transition-opacity duration-300",
        isDimmed ? "opacity-30" : "opacity-100"
      )}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <circle
        cx="50"
        cy="50"
        r={radius}
        fill="none"
        stroke={trackColor}
        strokeWidth="8"
        className={cn(
          "transition-all duration-300 group-hover/ring:stroke-[10]",
          isActive && "stroke-[10]"
        )}
      />
      <circle
        cx="50"
        cy="50"
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth="8"
        strokeDasharray={circumference}
        strokeDashoffset={mounted ? strokeDashoffset : circumference}
        strokeLinecap="round"
        className={cn(
          "transition-all duration-1000 ease-out group-hover/ring:stroke-[10] group-hover/ring:duration-300",
          isActive && "stroke-[10] duration-300"
        )}
      />
    </g>
  )
}

export function LogicLabDashboardClient({
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
}: LogicLabDashboardProps) {
  const router = useRouter()
  const pathname = usePathname()

  const [activeDifficulty, setActiveDifficulty] = useState<"Easy" | "Medium" | "Hard" | null>(null)
  const [isPending, startTransition] = useTransition()
  const [searchInput, setSearchInput] = useState(initialSearch)
  const [showAllTags, setShowAllTags] = useState(false)
  const visibleTags = useMemo(() => {
    if (showAllTags) return allTags
    const sortedTags = [...allTags].sort((a, b) => (tagCounts[b] || 0) - (tagCounts[a] || 0))
    return sortedTags.slice(0, 8)
  }, [allTags, tagCounts, showAllTags])
  const isOwnUpdateRef = useRef(false)
  const cellRadiusClass = "rounded-[18%]"

  const potd = initialPotd

  const calculateTimeLeft = () => {
    const now = new Date();
    const istOffset = 5.5 * 60 * 60 * 1000;
    const istTime = new Date(now.getTime() + istOffset);

    const nextMidnightIST = new Date(istTime);
    nextMidnightIST.setUTCHours(24, 0, 0, 0);

    const diff = nextMidnightIST.getTime() - istTime.getTime();

    if (diff <= 0) return "00h 00m 00s";

    const h = Math.floor(diff / (1000 * 60 * 60)).toString().padStart(2, '0');
    const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)).toString().padStart(2, '0');
    const s = Math.floor((diff % (1000 * 60)) / 1000).toString().padStart(2, '0');

    return `${h}h ${m}m ${s}s`;
  }

  const [timeLeft, setTimeLeft] = useState<string>(calculateTimeLeft)

  // UTC Midnight Countdown Timer
  useEffect(() => {
    if (!potd) return;
    const interval = setInterval(() => setTimeLeft(calculateTimeLeft()), 1000);
    return () => clearInterval(interval);
  }, [potd]);

  const activeChallenge = useMemo(() => {
    if (fullPotdProblem) return fullPotdProblem;
    if (!potd) return null;
    const pId = potd.problem_id || potd.coding_problems?.id;
    const found = problems.find((p) => p.id === pId);
    if (found) return found;
    return null; // Return null explicitly if no problem is matched, avoiding broken stub object
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

  const getTooltipText = useCallback((cell: CalendarCell) => {
    if (!cell.count || cell.count === 0) {
      return `No activity on ${cell.date}`
    }

    const solvedParts: string[] = []
    if (cell.easySolved && cell.easySolved > 0) solvedParts.push(`${cell.easySolved} Easy`)
    if (cell.mediumSolved && cell.mediumSolved > 0) solvedParts.push(`${cell.mediumSolved} Medium`)
    if (cell.hardSolved && cell.hardSolved > 0) solvedParts.push(`${cell.hardSolved} Hard`)

    const attemptedParts: string[] = []
    if (cell.easyAttempted && cell.easyAttempted > 0) attemptedParts.push(`${cell.easyAttempted} Easy`)
    if (cell.mediumAttempted && cell.mediumAttempted > 0) attemptedParts.push(`${cell.mediumAttempted} Medium`)
    if (cell.hardAttempted && cell.hardAttempted > 0) attemptedParts.push(`${cell.hardAttempted} Hard`)

    const solvedStr = solvedParts.length > 0 ? `${solvedParts.join(", ")} solved` : ""
    const attemptedStr = attemptedParts.length > 0 ? `${attemptedParts.join(", ")} attempted` : ""

    let detail = ""
    if (solvedStr && attemptedStr) {
      detail = ` (${solvedStr}, ${attemptedStr})`
    } else if (solvedStr) {
      detail = ` (${solvedStr})`
    } else if (attemptedStr) {
      detail = ` (${attemptedStr})`
    }

    return `${cell.date}: ${cell.count} submission${cell.count > 1 ? "s" : ""}${detail}`
  }, [])

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

  const [filterSheetOpen, setFilterSheetOpen] = useState(false)
  const [showDashboardCards, setShowDashboardCards] = useState(true)

  const activeFilterCount = useMemo(() => {
    let count = 0
    if (initialTab && initialTab !== "all") count++
    if (initialDifficulty && initialDifficulty !== "All") count++
    if (initialTag && initialTag !== "All") count++
    return count
  }, [initialTab, initialDifficulty, initialTag])

  const hasActiveFilters = activeFilterCount > 0 || (initialSearch && initialSearch.trim() !== "")

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
        if (val === undefined || val === "" || val === null || val === "All" || val === "all") {
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

  const clearAllFilters = useCallback(() => {
    isOwnUpdateRef.current = true
    setSearchInput("")
    updateParams({ search: "", tag: "All", difficulty: "All", tab: "all", page: 1 })
  }, [updateParams])

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
        .from("logiclab_problem_submissions" as any)
        .delete()
        .eq("problem_id", deletingProblemId)

      if (subError) throw new Error(subError.message)

      // 2. Delete the problem itself
      const { error: probError } = await (supabase as any)
        .from("logiclab_problems" as any)
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
    <div className="flex flex-col gap-6 px-4 py-6 md:px-8 md:py-8">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-bold font-cirka tracking-tight text-foreground">Logic Lab</h1>
          <p className="text-sm text-muted-foreground">
            Master your coding skills with our curated problem set.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 sm:gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowDashboardCards(!showDashboardCards)}
            className="gap-1.5 shrink-0 px-2.5"
            title={showDashboardCards ? "Collapse Dashboard" : "Expand Dashboard"}
          >
            {showDashboardCards ? <ChevronsUp className="size-4" /> : <ChevronsDown className="size-4" />}
            <span className="text-xs font-semibold hidden sm:inline">
              {showDashboardCards ? "Collapse" : "Expand"}
            </span>
          </Button>
          <Button asChild variant="outline" size="sm" className="gap-2 shrink-0" title="Playground">
            <Link href="/logiclab/playground" className="flex items-center justify-center gap-2">
              <Terminal className="size-4" />
              <span>Playground</span>
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
      {showDashboardCards && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-top-2 duration-300 min-w-0">
          {/* Card 1: Progress & Difficulty */}
          <Card className="min-w-0 flex flex-col relative transition-all hover:border-border/80 py-0">
            <CardHeader className="flex flex-row items-center justify-between pt-4 pb-1">
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Overall Progress
              </CardTitle>
              <CardAction className="text-xs text-muted-foreground/80 font-medium select-none">
                {globalStats.total > 0 ? Math.round((globalStats.solved / globalStats.total) * 100) : 0}% Solved
              </CardAction>
            </CardHeader>

            <CardContent className="flex flex-col flex-1 justify-between gap-5 pb-4">
              {/* Main Content: Stats and Chart */}
              <div className="flex items-center justify-between gap-6 min-w-0 w-full">
                {/* Stat rows */}
                <div className="flex flex-col gap-1 flex-1 min-w-0">
                  {/* Easy */}
                  <div
                    className={cn(
                      "flex items-center justify-between text-sm cursor-pointer transition-all duration-200 px-2 py-1 rounded-md",
                      activeDifficulty === "Easy" ? "bg-emerald-500/10 dark:bg-emerald-500/20" : "hover:bg-muted/40"
                    )}
                    onMouseEnter={() => setActiveDifficulty("Easy")}
                    onMouseLeave={() => setActiveDifficulty(null)}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="size-2 rounded-full bg-emerald-500 shrink-0" />
                      <span className="text-muted-foreground font-medium truncate">Easy</span>
                    </div>
                    <div className="flex items-baseline gap-1 shrink-0 font-semibold">
                      <span className="text-emerald-600 dark:text-emerald-400">{globalStats.easy.solved}</span>
                      <span className="text-xs text-muted-foreground/50">/ {globalStats.easy.total}</span>
                    </div>
                  </div>

                  {/* Medium */}
                  <div
                    className={cn(
                      "flex items-center justify-between text-sm cursor-pointer transition-all duration-200 px-2 py-1 rounded-md",
                      activeDifficulty === "Medium" ? "bg-amber-500/10 dark:bg-amber-500/20" : "hover:bg-muted/40"
                    )}
                    onMouseEnter={() => setActiveDifficulty("Medium")}
                    onMouseLeave={() => setActiveDifficulty(null)}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="size-2 rounded-full bg-amber-500 shrink-0" />
                      <span className="text-muted-foreground font-medium truncate">Medium</span>
                    </div>
                    <div className="flex items-baseline gap-1 shrink-0 font-semibold">
                      <span className="text-amber-600 dark:text-amber-400">{globalStats.medium.solved}</span>
                      <span className="text-xs text-muted-foreground/50">/ {globalStats.medium.total}</span>
                    </div>
                  </div>

                  {/* Hard */}
                  <div
                    className={cn(
                      "flex items-center justify-between text-sm cursor-pointer transition-all duration-200 px-2 py-1 rounded-md",
                      activeDifficulty === "Hard" ? "bg-rose-500/10 dark:bg-rose-500/20" : "hover:bg-muted/40"
                    )}
                    onMouseEnter={() => setActiveDifficulty("Hard")}
                    onMouseLeave={() => setActiveDifficulty(null)}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="size-2 rounded-full bg-rose-500 shrink-0" />
                      <span className="text-muted-foreground font-medium truncate">Hard</span>
                    </div>
                    <div className="flex items-baseline gap-1 shrink-0 font-semibold">
                      <span className="text-rose-600 dark:text-rose-400">{globalStats.hard.solved}</span>
                      <span className="text-xs text-muted-foreground/50">/ {globalStats.hard.total}</span>
                    </div>
                  </div>
                </div>

                {/* Concentric ring chart */}
                <div className="relative size-24 sm:size-28 shrink-0">
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
                    <ConcentricRing
                      radius={44}
                      value={globalStats.easy.solved}
                      max={globalStats.easy.total}
                      color="url(#easyGrad)"
                      trackColor="rgba(16, 185, 129, 0.15)"
                      isActive={activeDifficulty === "Easy"}
                      isDimmed={activeDifficulty !== null && activeDifficulty !== "Easy"}
                      onMouseEnter={() => setActiveDifficulty("Easy")}
                      onMouseLeave={() => setActiveDifficulty(null)}
                    />
                    <ConcentricRing
                      radius={31}
                      value={globalStats.medium.solved}
                      max={globalStats.medium.total}
                      color="url(#medGrad)"
                      trackColor="rgba(245, 158, 11, 0.15)"
                      isActive={activeDifficulty === "Medium"}
                      isDimmed={activeDifficulty !== null && activeDifficulty !== "Medium"}
                      onMouseEnter={() => setActiveDifficulty("Medium")}
                      onMouseLeave={() => setActiveDifficulty(null)}
                    />
                    <ConcentricRing
                      radius={18}
                      value={globalStats.hard.solved}
                      max={globalStats.hard.total}
                      color="url(#hardGrad)"
                      trackColor="rgba(244, 63, 94, 0.15)"
                      isActive={activeDifficulty === "Hard"}
                      isDimmed={activeDifficulty !== null && activeDifficulty !== "Hard"}
                      onMouseEnter={() => setActiveDifficulty("Hard")}
                      onMouseLeave={() => setActiveDifficulty(null)}
                    />
                  </svg>
                </div>
              </div>

              {/* Clean Horizontal Progress Bar for Total Progress */}
              <div className="mt-auto select-none flex flex-col gap-2">
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
            </CardContent>
          </Card>

          {/* Card 2: Activity Heat Map */}
          <Card className="min-w-0 flex flex-col relative transition-all hover:border-border/80 py-0">
            <CardHeader className="pt-4 pb-1">
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Activity Graph
              </CardTitle>
            </CardHeader>

            <CardContent className="flex flex-col flex-1 justify-between gap-5 pb-4">
              {/* Heatmap Grid Container */}
              <div className="w-full">
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
                          cellColor = "bg-rose-400/80 dark:bg-rose-500/60";
                        } else if (cell.status === "solved") {
                          if (cell.count === 1) cellColor = "bg-sky-300 dark:bg-sky-800";
                          else if (cell.count <= 3) cellColor = "bg-sky-400 dark:bg-sky-600";
                          else if (cell.count <= 6) cellColor = "bg-sky-500 dark:bg-sky-500";
                          else cellColor = "bg-sky-600 dark:bg-sky-400";
                        }

                        return (
                          <div
                            key={`cell-${dayIndex}-${wIdx}`}
                            className={cn(
                              "w-full aspect-square cursor-pointer transition-all hover:ring-2 hover:ring-offset-1 hover:ring-foreground/20 dark:hover:ring-offset-background",
                              cellRadiusClass,
                              cellColor
                            )}
                            title={getTooltipText(cell)}
                          />
                        );
                      })}
                    </React.Fragment>
                  ))}
                </div>
              </div>

              {/* Footer: Streak and Legend */}
              <div className="mt-auto flex items-end justify-between gap-4 flex-wrap min-w-0 w-full">
                {/* Legend */}
                <div className="flex items-center gap-2 text-[10px] font-medium text-muted-foreground/70 pb-0.5">
                  <span>Less</span>
                  <div className="flex gap-[3px] items-center">
                    <div className={cn("size-[10px] bg-muted", cellRadiusClass)} title="0 submissions" />
                    <div className={cn("size-[10px] bg-rose-400/80 dark:bg-rose-500/60", cellRadiusClass)} title="Attempted" />
                    <div className={cn("size-[10px] bg-sky-300 dark:bg-sky-800", cellRadiusClass)} title="1 submission" />
                    <div className={cn("size-[10px] bg-sky-400 dark:bg-sky-600", cellRadiusClass)} title="2-3 submissions" />
                    <div className={cn("size-[10px] bg-sky-500 dark:bg-sky-500", cellRadiusClass)} title="4-6 submissions" />
                    <div className={cn("size-[10px] bg-sky-600 dark:bg-sky-400", cellRadiusClass)} title="7+ submissions" />
                  </div>
                  <span>More</span>
                </div>

                {/* Streak */}
                <div className="flex items-center gap-2.5 shrink-0 text-sm font-semibold cursor-pointer group/streak">
                  <div className="flex items-center gap-1.5 text-foreground">
                    <Flame className="size-4 text-orange-500 fill-orange-500/10 shrink-0 transition-all duration-300 group-hover/streak:scale-125 group-hover/streak:text-orange-600 dark:group-hover/streak:text-orange-400 group-hover/streak:rotate-12 group-hover/streak:filter group-hover/streak:drop-shadow-[0_0_8px_rgba(249,115,22,0.6)]" />
                    <span className="transition-colors group-hover/streak:text-orange-500">{streakStats.currentStreak} day streak</span>
                  </div>
                  <span className="text-muted-foreground/30">|</span>
                  <span className="text-xs text-muted-foreground font-medium">
                    Max: <span className="text-foreground font-semibold transition-colors group-hover/streak:text-foreground/80">{streakStats.maxStreak}</span>
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Card 3: POTD Card */}
          <Card className="group/potd transition-all hover:border-border/80 min-w-0 flex flex-col relative py-0">
            <CardHeader className="flex flex-row items-center justify-between pt-4 pb-1">
              <Link href="/logiclab/dailychallenges" className="hover:opacity-80 transition-opacity cursor-pointer">
                <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1 hover:text-orange-500 transition-colors">
                  Problem of the Day <ChevronRight className="size-3" />
                </CardTitle>
              </Link>
              {timeLeft && (
                <CardAction className="text-xs text-muted-foreground/80 flex items-center gap-1 font-medium select-none">
                  <Clock className="size-3.5" />
                  {timeLeft}
                </CardAction>
              )}
            </CardHeader>

            <CardContent className="flex flex-col flex-1 justify-between gap-5 pb-4">
              <div className="flex flex-col gap-4 min-w-0">
                {activeChallenge ? (
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="font-bold text-lg sm:text-xl text-foreground leading-snug group-hover/potd:text-primary transition-colors">
                        {activeChallenge.title}
                      </h3>
                      {activeChallenge.solved_status === "Accepted" && (
                        <CircleCheck className="size-6 text-emerald-500 shrink-0 mt-0.5" />
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs sm:text-sm text-muted-foreground">
                      {/* Difficulty (clean inline text) */}
                      {activeChallenge.difficulty && (
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
                      {activeChallenge.acceptance_rate !== undefined && activeChallenge.acceptance_rate !== null && (
                        <>
                          <span>{activeChallenge.acceptance_rate}% acceptance</span>
                          <span>•</span>
                        </>
                      )}

                      {/* Submissions count */}
                      <span>{activeChallenge.total_submissions?.toLocaleString() || 0} submissions</span>
                    </div>

                    {/* Clean Tags Row */}
                    {activeChallenge.tags && activeChallenge.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-0.5">
                        {activeChallenge.tags.slice(0, 2).map((t: string) => (
                          <span key={t} className="text-[11px] bg-muted px-2.5 py-1 rounded-md text-muted-foreground font-medium">
                            {t}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center text-center gap-2 py-4 text-muted-foreground">
                    <span className="text-sm font-semibold">No Challenge Available</span>
                    <span className="text-xs">Check back later for today's puzzle.</span>
                  </div>
                )}
              </div>

              {/* Action Button: Minimal Outline Button */}
              <Button
                variant="outline"
                className={cn(
                  "w-full gap-2 py-5 font-semibold text-sm sm:text-base border transition-colors mt-auto",
                  !activeChallenge && "opacity-50 pointer-events-none",
                  activeChallenge?.solved_status === "Accepted"
                    ? "border-emerald-500/20 text-emerald-600 dark:border-emerald-500/10 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 hover:text-emerald-700 dark:hover:text-emerald-300"
                    : "border-orange-500/20 text-orange-600 dark:border-orange-500/10 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-500/10 hover:text-orange-700 dark:hover:text-orange-300"
                )}
                onClick={() => potd && router.push(`/logiclab/dailychallenges/${potd.id}`)}
                disabled={!potd}
              >
                {activeChallenge?.solved_status === "Accepted" ? (
                  <>
                    Review Challenge
                    <CircleCheck className="size-[18px] transition-transform duration-300 group-hover/potd:scale-110" />
                  </>
                ) : (
                  <>
                    Solve Challenge
                    <ChevronRight className="size-[18px] transition-transform duration-300 group-hover/potd:translate-x-1" />
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Directory Layout */}
      <div className="flex flex-col gap-6 min-w-0">
        {/* Toolbar */}
        <div className="flex items-center gap-3 w-full">
          <InputGroup className="flex-1 h-10 bg-background rounded-lg">
            <InputGroupAddon align="inline-start">
              {isPending ? (
                <Loader2 className="animate-spin text-muted-foreground" />
              ) : (
                <Search className="text-muted-foreground" />
              )}
            </InputGroupAddon>
            <InputGroupInput
              placeholder="Search problems..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="h-full"
            />
            {searchInput && (
              <InputGroupAddon align="inline-end">
                <InputGroupButton
                  onClick={() => {
                    isOwnUpdateRef.current = true
                    setSearchInput("")
                    updateParams({ search: "", page: 1 })
                  }}
                  variant="ghost"
                  size="icon-xs"
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X />
                </InputGroupButton>
              </InputGroupAddon>
            )}
          </InputGroup>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="outline"
              onClick={() => setFilterSheetOpen(true)}
              className={cn(
                "h-10 gap-1.5 rounded-lg border-border/70",
                activeFilterCount > 0 && "border-primary/40 text-primary bg-primary/5"
              )}
            >
              <SlidersHorizontal className="size-4" />
              <span className="hidden sm:inline">Filters</span>
              {activeFilterCount > 0 && (
                <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-primary text-primary-foreground text-[9px] font-bold px-1 leading-none">
                  {activeFilterCount}
                </span>
              )}
            </Button>

            <Button onClick={handleRandomProblem} variant="outline" className="rounded-full h-10 gap-1.5 shrink-0" title="Pick Random Problem">
              <Dices className="size-4" />
              <span className="hidden sm:inline">Pick Random</span>
            </Button>
          </div>
        </div>

        {/* Active filter summary strip */}
        {hasActiveFilters && (
          <div className="flex items-center gap-2 -mt-2">
            <span className="text-[11px] text-muted-foreground">
              {totalCount} of {globalStats.total} problems
            </span>
            <button
              onClick={clearAllFilters}
              className="text-[11px] text-primary hover:underline font-medium flex items-center gap-0.5"
            >
              <X className="size-3" />
              Clear all
            </button>
          </div>
        )}

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
                            <TableCell className="text-right pr-6" onClick={(e: React.MouseEvent) => e.stopPropagation()}>
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

      </div>

      {/* ── Filter Sheet ── */}
      <Sheet open={filterSheetOpen} onOpenChange={setFilterSheetOpen}>
        <SheetContent side="right" className="w-[300px] sm:w-[360px] flex flex-col gap-0 p-0">
          <SheetHeader className="px-6 pt-5 pb-4 pr-10 border-b border-border/50">
            <SheetTitle className="text-base font-semibold">Filters</SheetTitle>
            <SheetDescription className="text-xs text-muted-foreground">
              Narrow down by status, difficulty, and topic tags.
            </SheetDescription>
            {activeFilterCount > 0 && (
              <button
                onClick={() => updateParams({ tag: "All", difficulty: "All", tab: "all", page: 1 })}
                className="text-xs text-primary hover:underline font-medium text-left"
              >
                Clear all
              </button>
            )}
          </SheetHeader>

          <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-6">
            {/* Status */}
            <div className="flex flex-col gap-3">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                <ListTodo className="size-3.5" /> Status
              </p>
              <div className="grid grid-cols-2 gap-2.5">
                {[
                  { value: "all", label: "All", icon: <ListTodo className="size-3.5" /> },
                  { value: "solved", label: "Solved", icon: <CircleCheck className="size-3.5 text-emerald-500" /> },
                  { value: "attempted", label: "Attempted", icon: <CircleDot className="size-3.5 text-amber-500" /> },
                  { value: "unsolved", label: "Unsolved", icon: <CircleDashed className="size-3.5 text-muted-foreground" /> }
                ].map(opt => {
                  const isActive = initialTab === opt.value
                  return (
                    <button
                      key={opt.value}
                      onClick={() => updateParams({ tab: opt.value, page: 1 })}
                      className={cn(
                        "flex items-center justify-center gap-2 p-1.5 rounded-lg border transition-all duration-200 select-none",
                        isActive
                          ? "bg-primary/5 border-primary text-primary shadow-sm ring-1 ring-primary/20"
                          : "bg-muted/30 border-border/60 text-muted-foreground hover:bg-muted/80 hover:text-foreground hover:border-border"
                      )}
                    >
                      {opt.icon}
                      <span className="text-[11px] font-semibold">{opt.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Difficulty */}
            <div className="flex flex-col gap-3">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                <Flame className="size-3.5" /> Difficulty
              </p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { value: "All", label: "All Levels", color: "bg-muted-foreground", text: "text-muted-foreground", border: "border-muted-foreground/30", bg: "bg-muted-foreground/10" },
                  { value: "Easy", label: "Easy", color: "bg-emerald-500", text: "text-emerald-600 dark:text-emerald-400", border: "border-emerald-500/30", bg: "bg-emerald-500/10" },
                  { value: "Medium", label: "Medium", color: "bg-amber-500", text: "text-amber-600 dark:text-amber-400", border: "border-amber-500/30", bg: "bg-amber-500/10" },
                  { value: "Hard", label: "Hard", color: "bg-rose-500", text: "text-rose-600 dark:text-rose-400", border: "border-rose-500/30", bg: "bg-rose-500/10" }
                ].map(opt => {
                  const isActive = initialDifficulty === opt.value
                  return (
                    <button
                      key={opt.value}
                      onClick={() => updateParams({ difficulty: opt.value, page: 1 })}
                      className={cn(
                        "text-[11px] px-2 py-1.5 rounded-lg border font-semibold transition-all duration-200 flex items-center justify-center gap-1.5 select-none",
                        isActive
                          ? `${opt.bg} ${opt.border} ${opt.text} shadow-sm ring-1 ring-${opt.border.split('-')[1]}`
                          : "bg-muted/30 border-border/60 text-muted-foreground hover:bg-muted/80 hover:text-foreground hover:border-border"
                      )}
                    >
                      <span className={cn("size-1.5 rounded-full shadow-sm", opt.color)} />
                      {opt.label}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Topics / Tags */}
            {allTags.length > 0 && (
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Topic Tags</p>
                  {initialTag !== "All" && (
                    <button
                      onClick={() => updateParams({ tag: "All", page: 1 })}
                      className="text-xs text-rose-500 hover:text-rose-600 dark:hover:text-rose-400 font-medium"
                    >
                      Clear Tag
                    </button>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {visibleTags.map((t) => {
                    const isSelected = initialTag === t
                    const count = tagCounts[t] || 0
                    return (
                      <button
                        key={t}
                        onClick={() => updateParams({ tag: isSelected ? "All" : t, page: 1 })}
                        className={cn(
                          "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all cursor-pointer",
                          isSelected
                            ? "bg-primary text-primary-foreground border-primary shadow-xs"
                            : "bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground border-transparent"
                        )}
                      >
                        {t}
                        <span className={cn(
                          "text-[10px] px-1 rounded-sm",
                          isSelected ? "bg-primary-foreground/25 text-primary-foreground" : "bg-muted text-muted-foreground"
                        )}>
                          {count}
                        </span>
                      </button>
                    )
                  })}
                </div>
                {allTags.length > 8 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowAllTags(!showAllTags)}
                    className="w-full text-xs text-muted-foreground hover:text-foreground mt-2"
                  >
                    {showAllTags ? "Show Less" : `Show All Tags (${allTags.length})`}
                  </Button>
                )}
              </div>
            )}
          </div>

          <div className="px-6 py-5 border-t border-border/50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <Button
              className="w-full rounded-xl font-semibold h-11 shadow-md bg-primary hover:bg-primary/90 transition-all text-sm gap-2"
              onClick={() => setFilterSheetOpen(false)}
            >
              <CircleCheck className="size-4 opacity-70" />
              Show {totalCount} problem{totalCount !== 1 ? "s" : ""}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

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
