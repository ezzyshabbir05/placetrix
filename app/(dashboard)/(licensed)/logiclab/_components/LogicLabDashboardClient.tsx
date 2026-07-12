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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { fetchProblemsInfinite } from "../actions"
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
  initialProblems: Problem[]
  initialHasMore: boolean
  isAdmin: boolean
  streakStats: {
    currentStreak: number
    maxStreak: number
  }
  activityCalendar: CalendarCell[]
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
  userId: string
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
  initialProblems,
  initialHasMore,
  isAdmin,
  streakStats,
  activityCalendar,
  allTags,
  tagCounts,
  globalStats,
  initialPotd,
  fullPotdProblem,
  userId,
}: LogicLabDashboardProps) {
  const router = useRouter()
  const pathname = usePathname()

  // ── Hover states & layout config ──
  const [hoverDifficulty, setHoverDifficulty] = useState<"Easy" | "Medium" | "Hard" | null>(null)
  const [showAllTags, setShowAllTags] = useState(false)
  const [filterSheetOpen, setFilterSheetOpen] = useState(false)
  const [showDashboardCards, setShowDashboardCards] = useState(true)
  const cellRadiusClass = "rounded-[18%]"

  // ── Infinite scroll & Filter state ──
  const [problems, setProblems] = useState<Problem[]>(initialProblems)
  const [hasMore, setHasMore] = useState(initialHasMore)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [isPending, setIsPending] = useState(false)
  const [offset, setOffset] = useState(initialProblems.length)
  const [totalCount, setTotalCount] = useState(globalStats.total)

  const [searchInput, setSearchInput] = useState("")
  const [activeTab, setActiveTab] = useState("all")
  const [activeDifficulty, setActiveDifficulty] = useState("All")
  const [activeTag, setActiveTag] = useState("All")
  const [activeSort, setActiveSort] = useState("number-asc")
  const [tagSearchInput, setTagSearchInput] = useState("")

  const sentinelRef = useRef<HTMLDivElement>(null)
  const isFiltering = useRef(false)

  const visibleTags = useMemo(() => {
    let list = allTags
    if (tagSearchInput.trim() !== "") {
      const q = tagSearchInput.toLowerCase()
      list = allTags.filter((t) => t.toLowerCase().includes(q))
    }
    if (showAllTags || tagSearchInput.trim() !== "") return list
    const sortedTags = [...list].sort((a, b) => (tagCounts[b] || 0) - (tagCounts[a] || 0))
    return sortedTags.slice(0, 8)
  }, [allTags, tagCounts, showAllTags, tagSearchInput])

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

  const [timeLeft, setTimeLeft] = useState<string>("")

  // UTC Midnight Countdown Timer
  useEffect(() => {
    if (!potd) return;
    setTimeLeft(calculateTimeLeft());
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

  const resetAndFetch = useCallback(
    async (search: string, tab: string, difficulty: string, tag: string, sortBy: string) => {
      isFiltering.current = true
      setIsPending(true)
      setProblems([])
      setHasMore(false)
      setOffset(0)

      try {
        const { problems: fresh, hasMore: more, totalCount: count } = await fetchProblemsInfinite({
          userId,
          offset: 0,
          limit: 20,
          search,
          tab,
          difficulty,
          tag,
          sortBy,
        })
        setProblems(fresh)
        setHasMore(more)
        setOffset(fresh.length)
        setTotalCount(count)
      } finally {
        setIsPending(false)
        isFiltering.current = false
      }
    },
    [userId]
  )

  const loadMore = useCallback(async () => {
    if (isLoadingMore || !hasMore || isFiltering.current) return
    setIsLoadingMore(true)
    try {
      const { problems: next, hasMore: more } = await fetchProblemsInfinite({
        userId,
        offset,
        limit: 20,
        search: searchInput,
        tab: activeTab,
        difficulty: activeDifficulty,
        tag: activeTag,
        sortBy: activeSort,
      })
      setProblems((prev) => [...prev, ...next])
      setHasMore(more)
      setOffset((prev) => prev + next.length)
    } finally {
      setIsLoadingMore(false)
    }
  }, [isLoadingMore, hasMore, userId, offset, searchInput, activeTab, activeDifficulty, activeTag, activeSort])

  useEffect(() => {
    const el = sentinelRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) loadMore()
      },
      { rootMargin: "200px" }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [loadMore])

  const searchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null)
  const handleSearchChange = (val: string) => {
    setSearchInput(val)
    if (searchDebounce.current) clearTimeout(searchDebounce.current)
    searchDebounce.current = setTimeout(() => {
      resetAndFetch(val, activeTab, activeDifficulty, activeTag, activeSort)
    }, 400)
  }

  const applyFilter = (key: "tab" | "difficulty" | "tag" | "sortBy", val: string) => {
    const next = {
      tab: key === "tab" ? val : activeTab,
      difficulty: key === "difficulty" ? val : activeDifficulty,
      tag: key === "tag" ? val : activeTag,
      sortBy: key === "sortBy" ? val : activeSort,
    }
    if (key === "tab") setActiveTab(val)
    if (key === "difficulty") setActiveDifficulty(val)
    if (key === "tag") setActiveTag(val)
    if (key === "sortBy") setActiveSort(val)
    resetAndFetch(searchInput, next.tab, next.difficulty, next.tag, next.sortBy)
  }

  const clearAllFilters = () => {
    setSearchInput("")
    setActiveTab("all")
    setActiveDifficulty("All")
    setActiveTag("All")
    setActiveSort("number-asc")
    setTagSearchInput("")
    resetAndFetch("", "all", "All", "All", "number-asc")
  }

  const activeFilterCount = useMemo(() => {
    let count = 0
    if (activeTab && activeTab !== "all") count++
    if (activeDifficulty && activeDifficulty !== "All") count++
    if (activeTag && activeTag !== "All") count++
    if (activeSort && activeSort !== "number-asc") count++
    return count
  }, [activeTab, activeDifficulty, activeTag, activeSort])

  const hasActiveFilters = activeFilterCount > 0 || searchInput.trim() !== ""

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

  return (
    <div className={cn('flex', 'flex-col', 'gap-6', 'px-4', 'py-6', 'md:px-8', 'md:py-8')}>
      {/* Page Header */}
      <div className={cn('flex', 'flex-col', 'gap-4', 'sm:flex-row', 'sm:items-center', 'sm:justify-between')}>
        <div className={cn('flex', 'flex-col', 'gap-1')}>
          <h1 className={cn('text-3xl', 'font-bold', 'font-cirka', 'tracking-tight', 'text-foreground')}>Logic Lab</h1>
          <p className={cn('text-sm', 'text-muted-foreground')}>
            Master your coding skills with our curated problem set.
          </p>
        </div>

        {/* Action Buttons */}
        <div className={cn('flex', 'items-center', 'gap-2', 'sm:gap-3')}>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowDashboardCards(!showDashboardCards)}
            className={cn('gap-1.5', 'shrink-0', 'px-2.5')}
            title={showDashboardCards ? "Collapse Dashboard" : "Expand Dashboard"}
          >
            {showDashboardCards ? <ChevronsUp className="size-4" /> : <ChevronsDown className="size-4" />}
            <span className={cn('text-xs', 'font-semibold', 'hidden', 'sm:inline')}>
              {showDashboardCards ? "Collapse" : "Expand"}
            </span>
          </Button>
          <Button asChild variant="outline" size="sm" className={cn('gap-2', 'shrink-0')} title="Playground">
            <Link href="/logiclab/playground" className={cn('flex', 'items-center', 'justify-center', 'gap-2')}>
              <Terminal className="size-4" />
              <span>Playground</span>
            </Link>
          </Button>
          {isAdmin && (
            <Button asChild size="icon" className={cn('bg-emerald-600', 'hover:bg-emerald-700', 'text-white', 'shadow-sm', 'shrink-0')} title="Create Problem">
              <Link href="/logiclab/admin" className={cn('flex', 'items-center', 'justify-center')}>
                <Plus />
              </Link>
            </Button>
          )}
        </div>
      </div>

      {/* Metrics Row */}
      {showDashboardCards && (
        <div className={cn('grid', 'grid-cols-1', 'lg:grid-cols-3', 'gap-6', 'animate-in', 'fade-in', 'slide-in-from-top-2', 'duration-300', 'min-w-0')}>
          {/* Card 1: Progress & Difficulty */}
          <Card className={cn('min-w-0', 'flex', 'flex-col', 'relative', 'transition-all', 'hover:border-border/80', 'py-0')}>
            <CardHeader className={cn('flex', 'flex-row', 'items-center', 'justify-between', 'pt-4', 'pb-1')}>
              <CardTitle className={cn('text-xs', 'font-semibold', 'text-muted-foreground', 'uppercase', 'tracking-wider')}>
                Overall Progress
              </CardTitle>
              <CardAction className={cn('text-xs', 'text-muted-foreground/80', 'font-medium', 'select-none')}>
                {globalStats.total > 0 ? Math.round((globalStats.solved / globalStats.total) * 100) : 0}% Solved
              </CardAction>
            </CardHeader>

            <CardContent className={cn('flex', 'flex-col', 'flex-1', 'justify-between', 'gap-5', 'pb-4')}>
              {/* Main Content: Stats and Chart */}
              <div className={cn('flex', 'items-center', 'justify-between', 'gap-6', 'min-w-0', 'w-full')}>
                {/* Stat rows */}
                <div className={cn('flex', 'flex-col', 'gap-1', 'flex-1', 'min-w-0')}>
                  {/* Easy */}
                  <div
                    className={cn(
                      "flex items-center justify-between text-sm cursor-pointer transition-all duration-200 px-2 py-1 rounded-md",
                      hoverDifficulty === "Easy" ? "bg-emerald-500/10 dark:bg-emerald-500/20" : "hover:bg-muted/40"
                    )}
                    onMouseEnter={() => setHoverDifficulty("Easy")}
                    onMouseLeave={() => setHoverDifficulty(null)}
                  >
                    <div className={cn('flex', 'items-center', 'gap-2', 'min-w-0')}>
                      <span className={cn('size-2', 'rounded-full', 'bg-emerald-500', 'shrink-0')} />
                      <span className={cn('text-muted-foreground', 'font-medium', 'truncate')}>Easy</span>
                    </div>
                    <div className={cn('flex', 'items-baseline', 'gap-1', 'shrink-0', 'font-semibold')}>
                      <span className={cn('text-emerald-600', 'dark:text-emerald-400')}>{globalStats.easy.solved}</span>
                      <span className={cn('text-xs', 'text-muted-foreground/50')}>/ {globalStats.easy.total}</span>
                    </div>
                  </div>

                  {/* Medium */}
                  <div
                    className={cn(
                      "flex items-center justify-between text-sm cursor-pointer transition-all duration-200 px-2 py-1 rounded-md",
                      hoverDifficulty === "Medium" ? "bg-amber-500/10 dark:bg-amber-500/20" : "hover:bg-muted/40"
                    )}
                    onMouseEnter={() => setHoverDifficulty("Medium")}
                    onMouseLeave={() => setHoverDifficulty(null)}
                  >
                    <div className={cn('flex', 'items-center', 'gap-2', 'min-w-0')}>
                      <span className={cn('size-2', 'rounded-full', 'bg-amber-500', 'shrink-0')} />
                      <span className={cn('text-muted-foreground', 'font-medium', 'truncate')}>Medium</span>
                    </div>
                    <div className={cn('flex', 'items-baseline', 'gap-1', 'shrink-0', 'font-semibold')}>
                      <span className={cn('text-amber-600', 'dark:text-amber-400')}>{globalStats.medium.solved}</span>
                      <span className={cn('text-xs', 'text-muted-foreground/50')}>/ {globalStats.medium.total}</span>
                    </div>
                  </div>

                  {/* Hard */}
                  <div
                    className={cn(
                      "flex items-center justify-between text-sm cursor-pointer transition-all duration-200 px-2 py-1 rounded-md",
                      hoverDifficulty === "Hard" ? "bg-rose-500/10 dark:bg-rose-500/20" : "hover:bg-muted/40"
                    )}
                    onMouseEnter={() => setHoverDifficulty("Hard")}
                    onMouseLeave={() => setHoverDifficulty(null)}
                  >
                    <div className={cn('flex', 'items-center', 'gap-2', 'min-w-0')}>
                      <span className={cn('size-2', 'rounded-full', 'bg-rose-500', 'shrink-0')} />
                      <span className={cn('text-muted-foreground', 'font-medium', 'truncate')}>Hard</span>
                    </div>
                    <div className={cn('flex', 'items-baseline', 'gap-1', 'shrink-0', 'font-semibold')}>
                      <span className={cn('text-rose-600', 'dark:text-rose-400')}>{globalStats.hard.solved}</span>
                      <span className={cn('text-xs', 'text-muted-foreground/50')}>/ {globalStats.hard.total}</span>
                    </div>
                  </div>
                </div>

                {/* Concentric ring chart */}
                <div className={cn('relative', 'size-24', 'sm:size-28', 'shrink-0')}>
                  <svg className={cn('w-full', 'h-full', 'drop-shadow-md')} viewBox="0 0 100 100" preserveAspectRatio="xMaxYMid meet">
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
                      isActive={hoverDifficulty === "Easy"}
                      isDimmed={hoverDifficulty !== null && hoverDifficulty !== "Easy"}
                      onMouseEnter={() => setHoverDifficulty("Easy")}
                      onMouseLeave={() => setHoverDifficulty(null)}
                    />
                    <ConcentricRing
                      radius={31}
                      value={globalStats.medium.solved}
                      max={globalStats.medium.total}
                      color="url(#medGrad)"
                      trackColor="rgba(245, 158, 11, 0.15)"
                      isActive={hoverDifficulty === "Medium"}
                      isDimmed={hoverDifficulty !== null && hoverDifficulty !== "Medium"}
                      onMouseEnter={() => setHoverDifficulty("Medium")}
                      onMouseLeave={() => setHoverDifficulty(null)}
                    />
                    <ConcentricRing
                      radius={18}
                      value={globalStats.hard.solved}
                      max={globalStats.hard.total}
                      color="url(#hardGrad)"
                      trackColor="rgba(244, 63, 94, 0.15)"
                      isActive={hoverDifficulty === "Hard"}
                      isDimmed={hoverDifficulty !== null && hoverDifficulty !== "Hard"}
                      onMouseEnter={() => setHoverDifficulty("Hard")}
                      onMouseLeave={() => setHoverDifficulty(null)}
                    />
                  </svg>
                </div>
              </div>

              {/* Clean Horizontal Progress Bar for Total Progress */}
              <div className={cn('mt-auto', 'select-none', 'flex', 'flex-col', 'gap-2')}>
                <div className={cn('flex', 'items-center', 'justify-between', 'text-xs', 'sm:text-sm', 'text-muted-foreground')}>
                  <span className={cn('font-semibold', 'text-foreground')}>Total Solved</span>
                  <span className={cn('font-bold', 'text-foreground')}>
                    {globalStats.solved} <span className={cn('text-xs', 'font-normal', 'text-muted-foreground/60')}>/ {globalStats.total}</span>
                  </span>
                </div>
                <Progress
                  value={globalStats.total > 0 ? (globalStats.solved / globalStats.total) * 100 : 0}
                  className={cn('h-1.5', 'bg-muted/60', '[&>div]:bg-blue-500', 'dark:[&>div]:bg-blue-400')}
                />
              </div>
            </CardContent>
          </Card>

          {/* Card 2: Activity Heat Map */}
          <Card className={cn('min-w-0', 'flex', 'flex-col', 'relative', 'transition-all', 'hover:border-border/80', 'py-0')}>
            <CardHeader className={cn('pt-4', 'pb-1')}>
              <CardTitle className={cn('text-xs', 'font-semibold', 'text-muted-foreground', 'uppercase', 'tracking-wider')}>
                Activity Graph
              </CardTitle>
            </CardHeader>

            <CardContent className={cn('flex', 'flex-col', 'flex-1', 'justify-between', 'gap-5', 'pb-4')}>
              {/* Heatmap Grid Container */}
              <div className="w-full">
                <div
                  className={cn('grid', 'gap-x-[2px]', 'gap-y-[2px]', 'sm:gap-x-[3px]', 'sm:gap-y-[3px]', 'w-full')}
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
                      <div key={`month-block-${i}`} className={cn('relative', 'h-5', 'flex', 'items-end', 'justify-center', 'pb-1')} style={{ gridColumn: `span ${block.span}` }}>
                        {block.label && (
                          <span className={cn('text-[10px]', 'font-semibold', 'text-muted-foreground/70', 'whitespace-nowrap')}>
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
                      <div className={cn('relative', 'w-6', 'sm:w-7')}>
                        <span className={cn('absolute', 'inset-y-0', 'right-2', 'flex', 'items-center', 'text-[10px]', 'font-medium', 'text-muted-foreground/50', 'leading-none')}>
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
              <div className={cn('mt-auto', 'flex', 'items-end', 'justify-between', 'gap-4', 'flex-wrap', 'min-w-0', 'w-full')}>
                {/* Legend */}
                <div className={cn('flex', 'items-center', 'gap-2', 'text-[10px]', 'font-medium', 'text-muted-foreground/70', 'pb-0.5')}>
                  <span>Less</span>
                  <div className={cn('flex', 'gap-[3px]', 'items-center')}>
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
                <div className={cn('flex', 'items-center', 'gap-2.5', 'shrink-0', 'text-sm', 'font-semibold', 'cursor-pointer', 'group/streak')}>
                  <div className={cn('flex', 'items-center', 'gap-1.5', 'text-foreground')}>
                    <Flame className={cn('size-4', 'text-orange-500', 'fill-orange-500/10', 'shrink-0', 'transition-all', 'duration-300', 'group-hover/streak:scale-125', 'group-hover/streak:text-orange-600', 'dark:group-hover/streak:text-orange-400', 'group-hover/streak:rotate-12', 'group-hover/streak:filter', 'group-hover/streak:drop-shadow-[0_0_8px_rgba(249,115,22,0.6)]')} />
                    <span className={cn('transition-colors', 'group-hover/streak:text-orange-500')}>{streakStats.currentStreak} day streak</span>
                  </div>
                  <span className="text-muted-foreground/30">|</span>
                  <span className={cn('text-xs', 'text-muted-foreground', 'font-medium')}>
                    Max: <span className={cn('text-foreground', 'font-semibold', 'transition-colors', 'group-hover/streak:text-foreground/80')}>{streakStats.maxStreak}</span>
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Card 3: POTD Card */}
          <Card className={cn('group/potd', 'transition-all', 'hover:border-border/80', 'min-w-0', 'flex', 'flex-col', 'relative', 'py-0')}>
            <CardHeader className={cn('flex', 'flex-row', 'items-center', 'justify-between', 'pt-4', 'pb-1')}>
              <Link href="/logiclab/dailychallenges" className={cn('hover:opacity-80', 'transition-opacity', 'cursor-pointer')}>
                <CardTitle className={cn('text-xs', 'font-semibold', 'text-muted-foreground', 'uppercase', 'tracking-wider', 'flex', 'items-center', 'gap-1', 'hover:text-orange-500', 'transition-colors')}>
                  Daily Challenge<ChevronRight className="size-3" />
                </CardTitle>
              </Link>
              {timeLeft && (
                <CardAction className={cn('text-xs', 'text-muted-foreground/80', 'flex', 'items-center', 'gap-1', 'font-medium', 'select-none')}>
                  <Clock className="size-3.5" />
                  {timeLeft}
                </CardAction>
              )}
            </CardHeader>

            <CardContent className={cn('flex', 'flex-col', 'flex-1', 'justify-between', 'gap-5', 'pb-4')}>
              <div className={cn('flex', 'flex-col', 'gap-4', 'min-w-0')}>
                {activeChallenge ? (
                  <div className={cn('flex', 'flex-col', 'gap-1.5')}>
                    <div className={cn('flex', 'items-start', 'justify-between', 'gap-3')}>
                      <h3 className={cn('font-bold', 'text-lg', 'sm:text-xl', 'text-foreground', 'leading-snug', 'group-hover/potd:text-primary', 'transition-colors')}>
                        {activeChallenge.title}
                      </h3>
                      {activeChallenge.solved_status === "Accepted" && (
                        <CircleCheck className={cn('size-6', 'text-emerald-500', 'shrink-0', 'mt-0.5')} />
                      )}
                    </div>

                    <div className={cn('flex', 'flex-wrap', 'items-center', 'gap-x-2', 'gap-y-1', 'text-xs', 'sm:text-sm', 'text-muted-foreground')}>
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
                      <div className={cn('flex', 'flex-wrap', 'gap-1.5', 'pt-0.5')}>
                        {activeChallenge.tags.slice(0, 2).map((t: string) => (
                          <span key={t} className={cn('text-[11px]', 'bg-muted', 'px-2.5', 'py-1', 'rounded-md', 'text-muted-foreground', 'font-medium')}>
                            {t}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className={cn('flex', 'flex-col', 'items-center', 'justify-center', 'text-center', 'gap-2', 'py-4', 'text-muted-foreground')}>
                    <span className={cn('text-sm', 'font-semibold')}>No Challenge Available</span>
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
                    <CircleCheck className={cn('size-[18px]', 'transition-transform', 'duration-300', 'group-hover/potd:scale-110')} />
                  </>
                ) : (
                  <>
                    Solve Challenge
                    <ChevronRight className={cn('size-[18px]', 'transition-transform', 'duration-300', 'group-hover/potd:translate-x-1')} />
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Directory Layout */}
      <div className={cn('flex', 'flex-col', 'gap-6', 'min-w-0')}>
        {/* Toolbar */}
        <div className={cn('flex', 'items-center', 'gap-3', 'w-full')}>
          <div className="relative flex-1">
            {isPending ? (
              <Loader2 className="absolute left-2.5 top-2.5 h-4 w-4 text-primary animate-spin" />
            ) : (
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            )}
            <Input
              placeholder="Search problems..."
              value={searchInput}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-9 pr-9"
            />
            {searchInput && (
              <button
                onClick={() => handleSearchChange("")}
                className="absolute right-2.5 top-2.5 h-4 w-4 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <div className={cn('flex', 'items-center', 'gap-2', 'shrink-0')}>
            <Button
              variant="outline"
              onClick={() => setFilterSheetOpen(true)}
              className={cn(
                "h-10 gap-1.5 rounded-lg border-border/70",
                activeFilterCount > 0 && "border-primary/40 text-primary bg-primary/5"
              )}
            >
              <SlidersHorizontal className="size-4" />
              <span className={cn('hidden', 'sm:inline')}>Filters</span>
              {activeFilterCount > 0 && (
                <span className={cn('inline-flex', 'h-4', 'min-w-4', 'items-center', 'justify-center', 'rounded-full', 'bg-primary', 'text-primary-foreground', 'text-[9px]', 'font-bold', 'px-1', 'leading-none')}>
                  {activeFilterCount}
                </span>
              )}
            </Button>

            <Button onClick={handleRandomProblem} variant="outline" className={cn('rounded-full', 'h-10', 'gap-1.5', 'shrink-0')} title="Pick Random Problem">
              <Dices className="size-4" />
              <span className={cn('hidden', 'sm:inline')}>Pick Random</span>
            </Button>
          </div>
        </div>

        {/* Active filter summary strip */}
        {hasActiveFilters && (
          <div className={cn('flex', 'items-center', 'gap-2', '-mt-2')}>
            <span className={cn('text-[11px]', 'text-muted-foreground')}>
              {totalCount} of {globalStats.total} problems
            </span>
            <button
              onClick={clearAllFilters}
              className={cn('text-[11px]', 'text-primary', 'hover:underline', 'font-medium', 'flex', 'items-center', 'gap-0.5')}
            >
              <X className="size-3" />
              Clear all
            </button>
          </div>
        )}

        {/* Card List & Infinite Scroll */}
        <div className={cn('relative', 'min-h-[300px]')}>
          {isPending && problems.length === 0 && (
            <div className={cn('absolute', 'inset-0', 'z-50', 'bg-background/50', 'backdrop-blur-[1px]', 'flex', 'items-center', 'justify-center', 'min-h-[200px]')}>
              <div className={cn('flex', 'flex-col', 'items-center', 'gap-3', 'rounded-xl', 'border', 'bg-card', 'px-6', 'py-5', 'shadow-lg')}>
                <Loader2 className={cn('h-8', 'w-8', 'text-primary', 'animate-spin')} />
                <span className={cn('text-sm', 'font-medium', 'text-muted-foreground')}>Loading problems...</span>
              </div>
            </div>
          )}

          <div className={cn("transition-opacity duration-200 flex flex-col gap-2.5", isPending && problems.length === 0 && "opacity-40 pointer-events-none")}>
            {problems.length === 0 && !isPending ? (
              <Empty className="border border-dashed border-border/60 rounded-xl bg-card/50 p-12">
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <BookOpen className="h-5 w-5 text-muted-foreground/60" />
                  </EmptyMedia>
                  <EmptyTitle>No problems found</EmptyTitle>
                  <EmptyDescription>
                    We couldn't find any problems matching your current filters. Try adjusting your search or removing some tags.
                  </EmptyDescription>
                </EmptyHeader>
                {hasActiveFilters && (
                  <EmptyContent>
                    <Button variant="outline" onClick={clearAllFilters} className="mt-1">
                      Clear all filters
                    </Button>
                  </EmptyContent>
                )}
              </Empty>
            ) : (
              <div className={cn('flex', 'flex-col', 'border', 'border-border', 'rounded-xl', 'overflow-hidden', 'shadow-sm', 'bg-background/40')}>
                {/* Table Header */}
                <div className={cn('hidden', 'md:flex', 'items-center', 'gap-3', 'px-4', 'py-3.5', 'bg-muted/40', 'border-b', 'border-border', 'text-xs', 'font-bold', 'text-muted-foreground', 'uppercase', 'tracking-wider', 'select-none')}>
                  <div className={cn('w-14', 'shrink-0', 'text-center')}>Status</div>
                  
                  <div className={cn('flex-1', 'min-w-0', 'pl-4')}>Title</div>
                  <div className={cn('w-[130px]', 'shrink-0', 'pl-4')}>Acceptance</div>
                  <div className={cn('w-[120px]', 'shrink-0', 'pl-4')}>Difficulty</div>
                  <div className={cn('w-[240px]', 'shrink-0', 'pl-4')}>Topic Tags</div>
                  {isAdmin && <div className={cn('w-[70px]', 'shrink-0')}></div>}
                  <div className={cn('w-8', 'shrink-0')}></div>
                </div>

                {problems.map((problem, idx) => {
                  const isSolved = problem.solved_status === "Accepted"
                  const isAttempted = !!(problem.solved_status && problem.solved_status !== "Accepted")
                  const isEven = idx % 2 === 0;

                  return (
                    <div
                      key={problem.id}
                      onClick={() => router.push(`/logiclab/problems/${problem.id}`)}
                      className={cn(
                        "group flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors duration-150",
                        isEven ? "bg-transparent" : "bg-zinc-100 dark:bg-white/[0.04]",
                        idx !== problems.length - 1 && "border-b border-border"
                      )}
                    >
                      {/* Status icon */}
                      <div className={cn('shrink-0', 'flex', 'items-center', 'justify-center', 'w-14')}>
                        {isSolved ? (
                          <CircleCheck className={cn('size-4', 'text-emerald-500')} />
                        ) : isAttempted ? (
                          <CircleDot className={cn('size-4', 'text-amber-500')} />
                        ) : (
                          <div className={cn('size-3.5', 'rounded-full', 'border-2', 'border-muted-foreground/45')} />
                        )}
                      </div>

                      {/* Number & Title */}
                      <div className={cn('flex-1', 'min-w-0', 'flex', 'items-center', 'gap-3', 'pl-2')}>
                        <span className={cn('text-xs', 'font-mono', 'font-semibold', 'text-muted-foreground/80', 'shrink-0')}>
                          #{problem.number || idx + 1}
                        </span>
                        <span className={cn('text-sm', 'font-medium', 'text-foreground', 'group-hover:text-foreground', 'transition-colors', 'truncate', 'block', 'leading-snug')}>
                          {problem.title}
                        </span>
                      </div>

                      {/* Acceptance Rate (visible on desktop) */}
                      <div className={cn('hidden', 'md:flex', 'flex-col', 'justify-center', 'w-[130px]', 'shrink-0', 'pl-4')}>
                        <span className={cn('text-xs', 'font-medium', 'text-muted-foreground/90')}>{problem.acceptance_rate !== null ? `${problem.acceptance_rate}%` : "—"}</span>
                        {problem.total_submissions > 0 && (
                          <span className={cn('text-[10px]', 'text-muted-foreground/50')}>
                            {problem.total_submissions} submissions
                          </span>
                        )}
                      </div>

                      {/* Difficulty */}
                      <div className={cn('hidden', 'md:flex', 'items-center', 'w-[120px]', 'shrink-0', 'pl-4')}>
                        <span className={cn(
                          "text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded",
                          problem.difficulty === "Easy" ? "text-emerald-600 bg-emerald-100/80 dark:text-emerald-400 dark:bg-emerald-500/15" :
                            problem.difficulty === "Medium" ? "text-amber-600 bg-amber-100/80 dark:text-amber-400 dark:bg-amber-500/15" :
                              "text-rose-600 bg-rose-100/80 dark:text-rose-400 dark:bg-rose-500/15",
                        )}>
                          {problem.difficulty}
                        </span>
                      </div>

                      {/* Tags */}
                      <div className={cn('hidden', 'sm:flex', 'flex-wrap', 'items-center', 'gap-1.5', 'w-[240px]', 'shrink-0', 'pl-4')}>
                        {problem.tags?.slice(0, 2).map((tag) => (
                          <span key={tag} className={cn('text-[10px]', 'font-medium', 'px-1.5', 'py-0.5', 'rounded', 'bg-muted', 'text-muted-foreground/85', 'truncate', 'max-w-[80px]')}>
                            {tag}
                          </span>
                        ))}
                        {problem.tags?.length > 2 && (
                          <span className={cn('text-[10px]', 'font-medium', 'px-1.5', 'py-0.5', 'rounded', 'bg-muted/60', 'text-muted-foreground/60', 'shrink-0')}>
                            +{problem.tags.length - 2}
                          </span>
                        )}
                      </div>

                      {/* Admin actions (Edit / Delete) */}
                      {isAdmin && (
                        <div className={cn('flex', 'items-center', 'justify-end', 'gap-1', 'opacity-0', 'group-hover:opacity-100', 'transition-opacity', 'w-[70px]', 'shrink-0')} onClick={(e: React.MouseEvent) => e.stopPropagation()}>
                          <Link
                            href={`/logiclab/admin/edit/${problem.id}`}
                            className={cn('p-1.5', 'hover:bg-background', 'rounded-md', 'text-muted-foreground', 'hover:text-emerald-500', 'transition-all', 'cursor-pointer', 'shadow-sm', 'border', 'border-transparent', 'hover:border-border/60')}
                            title="Edit Problem"
                          >
                            <Pencil className={cn('h-3.5', 'w-3.5')} />
                          </Link>
                          <button
                            onClick={() => setDeletingProblemId(problem.id)}
                            className={cn('p-1.5', 'hover:bg-background', 'rounded-md', 'text-muted-foreground/70', 'hover:text-rose-500', 'transition-all', 'cursor-pointer', 'shadow-sm', 'border', 'border-transparent', 'hover:border-border/60')}
                            title="Delete Problem"
                          >
                            <Trash2 className={cn('h-3.5', 'w-3.5')} />
                          </button>
                        </div>
                      )}

                      {/* Chevron indicator */}
                      <div className={cn('shrink-0', 'flex', 'justify-end', 'w-8')}>
                        <ChevronRight className={cn('size-4', 'text-muted-foreground/50', 'group-hover:text-muted-foreground/80', 'group-hover:translate-x-0.5', 'transition-all')} />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Sentinel for IntersectionObserver */}
            <div ref={sentinelRef} className="h-4" />

            {/* Loading more spinner */}
            {isLoadingMore && (
              <div className={cn('flex', 'items-center', 'justify-center', 'py-4', 'gap-2', 'text-sm', 'text-muted-foreground')}>
                <Loader2 className={cn('size-4', 'animate-spin')} />
                Loading more...
              </div>
            )}

            {/* End of list */}
            {!hasMore && !isLoadingMore && problems.length > 0 && (
              <p className={cn('text-center', 'text-xs', 'text-muted-foreground/50', 'py-4')}>
                All {problems.length} problems loaded
              </p>
            )}
          </div>
        </div>

      </div>

      {/* ── Filter Sheet ── */}
      <Sheet open={filterSheetOpen} onOpenChange={setFilterSheetOpen}>
        <SheetContent side="right" className={cn('w-[320px]', 'sm:w-[420px]', 'flex', 'flex-col', 'gap-0', 'p-0')}>
          <SheetHeader className={cn('px-6', 'pt-5', 'pb-4', 'pr-10', 'border-b', 'border-border/50', 'shrink-0')}>
            <div className={cn('flex', 'items-center', 'justify-between')}>
              <SheetTitle className={cn('text-base', 'font-bold')}>Sort & Filter</SheetTitle>
              {activeFilterCount > 0 && (
                <button
                  onClick={clearAllFilters}
                  className={cn('text-xs', 'text-rose-500', 'hover:text-rose-600', 'dark:hover:text-rose-400', 'font-semibold', 'transition-colors')}
                >
                  Clear all
                </button>
              )}
            </div>
            <SheetDescription className={cn('text-xs', 'text-muted-foreground', '-mt-0.5')}>
              Refine results or change sorting to find problems easily.
            </SheetDescription>
          </SheetHeader>

          <Tabs defaultValue="filter" className={cn('flex-1', 'flex', 'flex-col', 'gap-0', 'min-h-0')}>
            <div className={cn('px-6', 'py-2', 'border-b', 'border-border/30', 'bg-muted/20', 'shrink-0')}>
              <TabsList className={cn('grid', 'grid-cols-2', 'w-full', 'h-9', 'p-1', 'bg-muted/60', 'rounded-lg')}>
                <TabsTrigger value="filter" className={cn('text-xs', 'font-semibold')}>
                  Filters
                  {activeFilterCount - (activeSort !== "number-asc" ? 1 : 0) > 0 && (
                    <Badge variant="secondary" className={cn('ml-1.5', 'px-1', 'py-0', 'h-4', 'min-w-4', 'text-[9px]', 'font-bold', 'leading-none', 'bg-primary/10', 'text-primary', 'border-none')}>
                      {activeFilterCount - (activeSort !== "number-asc" ? 1 : 0)}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="sort" className={cn('text-xs', 'font-semibold')}>
                  Sorting
                  {activeSort !== "number-asc" && (
                    <span className={cn('ml-1.5', 'size-1.5', 'rounded-full', 'bg-primary')} />
                  )}
                </TabsTrigger>
              </TabsList>
            </div>

            {/* TAB CONTENT: FILTERS */}
            <TabsContent value="filter" className={cn('flex-1', 'overflow-y-auto', 'min-h-0', 'focus-visible:outline-none')}>
              <Accordion type="multiple" defaultValue={["status", "difficulty", "tags"]} className="w-full">

                {/* Accordion 1: Status */}
                <AccordionItem value="status" className={cn('px-6', 'border-b', 'border-border/30')}>
                  <AccordionTrigger className={cn('py-3.5', 'hover:no-underline', 'text-xs', 'font-bold', 'uppercase', 'tracking-wider', 'text-foreground')}>
                    <span className={cn('flex', 'items-center', 'gap-2')}>
                      <ListTodo className="size-3.5" />
                      Status
                    </span>
                  </AccordionTrigger>
                  <AccordionContent className={cn('pb-4', 'pt-1', 'flex', 'flex-col', 'gap-2')}>
                    <div className={cn('grid', 'grid-cols-2', 'gap-2')}>
                      {[
                        { value: "all", label: "All Status", icon: <ListTodo className={cn('size-3.5', 'text-foreground/70')} /> },
                        { value: "solved", label: "Solved Only", icon: <CircleCheck className={cn('size-3.5', 'text-emerald-500')} /> },
                        { value: "attempted", label: "Attempting", icon: <CircleDot className={cn('size-3.5', 'text-amber-500')} /> },
                        { value: "unsolved", label: "Unsolved", icon: <CircleDashed className={cn('size-3.5', 'text-foreground/60')} /> },
                      ].map((opt) => (
                        <button
                          key={opt.value}
                          onClick={() => applyFilter("tab", opt.value)}
                          className={cn(
                            "flex items-center gap-2.5 p-2 rounded-lg border text-left transition-all select-none cursor-pointer text-xs font-medium",
                            activeTab === opt.value
                              ? "bg-primary/5 border-primary text-primary font-semibold shadow-xs"
                              : "bg-muted/20 border-border/40 text-foreground/80 hover:bg-muted/50 hover:text-foreground hover:border-border/80"
                          )}
                        >
                          {opt.icon}
                          <span>{opt.label}</span>
                        </button>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>

                {/* Accordion 2: Difficulty */}
                <AccordionItem value="difficulty" className={cn('px-6', 'border-b', 'border-border/30')}>
                  <AccordionTrigger className={cn('py-3.5', 'hover:no-underline', 'text-xs', 'font-bold', 'uppercase', 'tracking-wider', 'text-foreground')}>
                    <span className={cn('flex', 'items-center', 'gap-2')}>
                      <Flame className="size-3.5" />
                      Difficulty
                    </span>
                  </AccordionTrigger>
                  <AccordionContent className={cn('pb-4', 'pt-1', 'flex', 'flex-col', 'gap-2')}>
                    <div className={cn('grid', 'grid-cols-2', 'gap-2')}>
                      {[
                        { value: "All", label: "All Levels", color: "bg-foreground/50", text: "text-foreground/80", border: "border-border/40", bg: "bg-muted/20", desc: "No restriction" },
                        { value: "Easy", label: "Easy Level", color: "bg-emerald-500", text: "text-emerald-600 dark:text-emerald-400", border: "border-emerald-500/25", bg: "bg-emerald-500/10", desc: "Beginner level" },
                        { value: "Medium", label: "Medium Level", color: "bg-amber-500", text: "text-amber-600 dark:text-amber-400", border: "border-amber-500/25", bg: "bg-amber-500/10", desc: "Standard practice" },
                        { value: "Hard", label: "Hard Level", color: "bg-rose-500", text: "text-rose-600 dark:text-rose-400", border: "border-rose-500/25", bg: "bg-rose-500/10", desc: "Complex problems" },
                      ].map((opt) => (
                        <button
                          key={opt.value}
                          onClick={() => applyFilter("difficulty", opt.value)}
                          className={cn(
                            "flex flex-col items-start gap-0.5 p-2 rounded-lg border text-left transition-all select-none cursor-pointer",
                            activeDifficulty === opt.value
                              ? `${opt.bg} ${opt.border} ${opt.text} font-semibold shadow-xs`
                              : "bg-muted/20 border-border/40 text-foreground/80 hover:bg-muted/50 hover:text-foreground hover:border-border/80"
                          )}
                        >
                          <div className={cn('flex', 'items-center', 'gap-1.5', 'text-xs', 'font-semibold')}>
                            <span className={cn("size-2 rounded-full", opt.color)} />
                            <span>{opt.label}</span>
                          </div>
                          <span className={cn('text-[10px]', 'text-foreground/65', 'font-normal')}>{opt.desc}</span>
                        </button>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>

                {/* Accordion 3: Topic Tags */}
                {allTags.length > 0 && (
                  <AccordionItem value="tags" className={cn('px-6', 'border-none')}>
                    <AccordionTrigger className={cn('py-3.5', 'hover:no-underline', 'text-xs', 'font-bold', 'uppercase', 'tracking-wider', 'text-foreground')}>
                      <span className={cn('flex', 'items-center', 'gap-2')}>
                        <BookOpen className="size-3.5" />
                        Topic Tags
                      </span>
                    </AccordionTrigger>
                    <AccordionContent className={cn('pb-4', 'pt-1', 'flex', 'flex-col', 'gap-3')}>
                      {/* Tag Search Input */}
                      <InputGroup className={cn('bg-muted/25', 'border-border/40', 'h-8', 'rounded-md')}>
                        <InputGroupAddon align="inline-start">
                          <Search className={cn('size-3.5', 'text-foreground/50')} />
                        </InputGroupAddon>
                        <InputGroupInput
                          placeholder="Search tags..."
                          value={tagSearchInput}
                          onChange={(e) => setTagSearchInput(e.target.value)}
                          className={cn('text-xs', 'h-full', 'placeholder:text-foreground/45')}
                        />
                        {tagSearchInput && (
                          <InputGroupAddon align="inline-end">
                            <InputGroupButton
                              onClick={() => setTagSearchInput("")}
                              variant="ghost"
                              size="icon-xs"
                              className={cn('text-foreground/70', 'hover:text-foreground')}
                            >
                              <X className="size-3" />
                            </InputGroupButton>
                          </InputGroupAddon>
                        )}
                      </InputGroup>

                      {visibleTags.length > 0 ? (
                        <div className={cn('flex', 'flex-wrap', 'gap-1.5', 'pt-1')}>
                          {visibleTags.map((t) => {
                            const isSelected = activeTag === t
                            const count = tagCounts[t] || 0
                            return (
                              <button
                                key={t}
                                onClick={() => applyFilter("tag", isSelected ? "All" : t)}
                                className={cn(
                                  "flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium border transition-all cursor-pointer select-none",
                                  isSelected
                                    ? "bg-primary text-primary-foreground border-primary shadow-xs"
                                    : "bg-muted/30 hover:bg-muted/80 text-foreground/80 hover:text-foreground border-border/50"
                                )}
                              >
                                <span>{t}</span>
                                <span className={cn(
                                  "text-[9px] px-1 rounded-sm font-semibold",
                                  isSelected ? "bg-primary-foreground/20 text-primary-foreground" : "bg-muted text-foreground/70"
                                )}>
                                  {count}
                                </span>
                              </button>
                            )
                          })}
                        </div>
                      ) : (
                        <p className={cn('text-xs', 'text-foreground/50', 'italic', 'py-2', 'text-center')}>No tags match search query</p>
                      )}

                      {allTags.length > 8 && !tagSearchInput && (
                        <Button
                          variant="ghost"
                          size="xs"
                          onClick={() => setShowAllTags(!showAllTags)}
                          className={cn('w-full', 'text-xs', 'text-foreground/80', 'hover:text-foreground', 'border', 'border-dashed', 'border-border/30', 'rounded-md', 'py-1', 'mt-1')}
                        >
                          {showAllTags ? "Show Less" : `Show All Topic Tags (${allTags.length})`}
                        </Button>
                      )}
                    </AccordionContent>
                  </AccordionItem>
                )}
              </Accordion>
            </TabsContent>

            {/* TAB CONTENT: SORT SETTINGS */}
            <TabsContent value="sort" className={cn('flex-1', 'overflow-y-auto', 'px-6', 'py-5', 'min-h-0', 'focus-visible:outline-none')}>
              <RadioGroup
                value={activeSort}
                onValueChange={(val) => applyFilter("sortBy", val)}
                className={cn('flex', 'flex-col', 'gap-3')}
              >
                {[
                  { value: "number-asc", title: "Number: Low to High", desc: "Start from the first problem" },
                  { value: "number-desc", title: "Number: High to Low", desc: "Show latest problems first" },
                  { value: "difficulty-asc", title: "Difficulty: Easy to Hard", desc: "Sort by ascending difficulty levels" },
                  { value: "difficulty-desc", title: "Difficulty: Hard to Easy", desc: "Sort by descending difficulty levels" },
                  { value: "title-asc", title: "Title: Alphabetical A-Z", desc: "Order alphabetically by problem title" },
                  { value: "title-desc", title: "Title: Alphabetical Z-A", desc: "Order descending by problem title" },
                  { value: "acceptance-desc", title: "Acceptance: Highest First", desc: "Order by descending success rates" },
                  { value: "acceptance-asc", title: "Acceptance: Lowest First", desc: "Order by ascending success rates" },
                  { value: "submissions-desc", title: "Submissions: Most First", desc: "Show most attempted problems first" },
                  { value: "submissions-asc", title: "Submissions: Fewest First", desc: "Show least attempted problems first" },
                ].map((opt) => {
                  const isSelected = activeSort === opt.value
                  return (
                    <div
                      key={opt.value}
                      onClick={() => applyFilter("sortBy", opt.value)}
                      className={cn(
                        "flex items-center justify-between p-3.5 rounded-xl border transition-all cursor-pointer select-none",
                        isSelected
                          ? "bg-primary/5 border-primary text-primary shadow-xs ring-1 ring-primary/20"
                          : "bg-muted/15 border-border/50 text-foreground/80 hover:bg-muted/40 hover:text-foreground hover:border-border/80"
                      )}
                    >
                      <div className={cn('flex', 'flex-col', 'gap-0.5', 'flex-1', 'min-w-0', 'pr-3')}>
                        <Label className={cn("text-xs font-semibold cursor-pointer block truncate", isSelected ? "text-primary" : "text-foreground")}>
                          {opt.title}
                        </Label>
                        <span className={cn('text-[10px]', 'text-foreground/65', 'leading-tight')}>{opt.desc}</span>
                      </div>
                      <RadioGroupItem value={opt.value} className={cn('size-4', 'shrink-0', 'pointer-events-none')} />
                    </div>
                  )
                })}
              </RadioGroup>
            </TabsContent>
          </Tabs>

          <Separator />

          <div className={cn('px-6', 'py-4', 'bg-muted/10', 'shrink-0')}>
            <Button
              className={cn('w-full', 'rounded-xl', 'font-bold', 'h-10', 'shadow-md', 'bg-primary', 'hover:bg-primary/95', 'transition-all', 'text-sm', 'gap-2', 'cursor-pointer')}
              onClick={() => setFilterSheetOpen(false)}
            >
              <CircleCheck className={cn('size-4', 'opacity-80')} />
              <span>
                {isPending
                  ? "Applying..."
                  : `Apply & View List (${problems.length}${hasMore ? "+" : ""})`}
              </span>
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* ── Delete Confirmation Modal ── */}
      <AlertDialog open={!!deletingProblemId} onOpenChange={(open) => { if (!open) setDeletingProblemId(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className={cn('flex', 'items-center', 'gap-2', 'text-rose-500')}>
              <AlertTriangle className="size-5" /> Permanent Deletion
            </AlertDialogTitle>
            <AlertDialogDescription className={cn('flex', 'flex-col', 'gap-3')}>
              <span>Are you absolutely sure you want to permanently delete this coding problem?</span>
              <span className={cn('p-3', 'bg-rose-500/10', 'border', 'border-rose-500/20', 'rounded-lg', 'text-rose-600', 'dark:text-rose-400', 'font-medium', 'block')}>
                This action cannot be undone. All associated user submissions and attempts will also be deleted.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={isDeleting}
              className={cn('bg-destructive', 'hover:bg-destructive/90', 'text-destructive-foreground', 'gap-2')}
            >
              {isDeleting ? <Loader2 className={cn('size-4', 'animate-spin')} /> : <Trash2 className="size-4" />}
              {isDeleting ? "Deleting..." : "Delete Problem"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  )
}
