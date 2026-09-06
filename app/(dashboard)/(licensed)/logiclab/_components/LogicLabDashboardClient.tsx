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
  Briefcase,
  ArrowRight,
} from "lucide-react"
import { COMPANY_CATALOG, getProblemCompanyBadges, isCompanyTag } from "../_constants/companies"
import { CompanyBadge, CompanyFilterChips } from "./CompanyBadge"
import { getTrackById } from "../_constants/tracks"
import { PrepTracksSection } from "./PrepTracksSection"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle, CardAction, CardDescription, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { SolveChallengeButton } from "@/components/ui/solve-challenge-button"
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
import { LogicLabStatsCards, CalendarCell } from "./LogicLabStatsCards"
import { startNavigationProgress } from "@/components/ui/navigation-progress"

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

const DIFFICULTY_COLORS: Record<string, { text: string; bg: string }> = {
  Easy: { text: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-100/80 dark:bg-emerald-500/15" },
  Medium: { text: "text-amber-600 dark:text-amber-400", bg: "bg-amber-100/80 dark:bg-amber-500/15" },
  Hard: { text: "text-rose-600 dark:text-rose-400", bg: "bg-rose-100/80 dark:bg-rose-500/15" },
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
  userSolvedNumbers?: number[]
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
  userSolvedNumbers = [],
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
  const [activeCompany, setActiveCompany] = useState("All")
  const [activeTrackId, setActiveTrackId] = useState<string | null>(null)
  const [activeView, setActiveView] = useState<"problems" | "tracks">("problems")
  const [activeSort, setActiveSort] = useState("number-asc")
  const [tagSearchInput, setTagSearchInput] = useState("")

  const sentinelRef = useRef<HTMLDivElement>(null)
  const isFiltering = useRef(false)
  const loadMoreAbortRef = useRef<AbortController | null>(null)

  const visibleTags = useMemo(() => {
    // Separate topic tags from company tags for clean UI display
    const topicOnly = allTags.filter((t) => !isCompanyTag(t))
    let list = topicOnly
    if (tagSearchInput.trim() !== "") {
      const q = tagSearchInput.toLowerCase()
      list = topicOnly.filter((t) => t.toLowerCase().includes(q))
    }
    if (showAllTags || tagSearchInput.trim() !== "") return list
    const sortedTags = [...list].sort((a, b) => (tagCounts[b] || 0) - (tagCounts[a] || 0))
    return sortedTags.slice(0, 8)
  }, [allTags, tagCounts, showAllTags, tagSearchInput])

  const potd = initialPotd

  const calculateTimeLeft = () => {
    const now = new Date();
    const nextMidnightUTC = new Date(now);
    nextMidnightUTC.setUTCHours(24, 0, 0, 0);

    const diff = nextMidnightUTC.getTime() - now.getTime();

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

  const handleRandomProblem = () => {
    if (!problems || problems.length === 0) {
      toast.error("No problems available right now")
      return
    }
    const randomIndex = Math.floor(Math.random() * problems.length)
    const randomProb = problems[randomIndex]
    if (randomProb?.id) {
      startNavigationProgress()
      router.push(`/logiclab/problems/${randomProb.id}`)
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



  // Modal deletion state
  const [deletingProblemId, setDeletingProblemId] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Fetch problems using the robust Server Action which includes fallback logic
  const fetchProblemsClient = useCallback(
    async (params: {
      offset: number
      limit: number
      search: string
      tab: string
      difficulty: string
      tag: string
      company?: string
      trackNumbers?: number[]
      sortBy: string
    }) => {
      try {
        const result = await fetchProblemsInfinite({
          userId: userId || "",
          offset: params.offset,
          limit: params.limit,
          search: params.search,
          tab: params.tab,
          difficulty: params.difficulty,
          tag: params.tag,
          company: params.company || "All",
          trackNumbers: params.trackNumbers,
          sortBy: params.sortBy,
        })
        return result
      } catch (err) {
        console.error("[LogicLabDashboardClient] Exception fetching problems on client via server action:", err)
      }
      return { problems: [], hasMore: false, totalCount: 0 }
    },
    [userId]
  )

  const resetAndFetch = useCallback(
    async (
      search: string,
      tab: string,
      difficulty: string,
      tag: string,
      sortBy: string,
      company: string = "All",
      trackNumbers?: number[]
    ) => {
      isFiltering.current = true
      setIsPending(true)
      setProblems([])
      setHasMore(false)
      setOffset(0)

      try {
        const { problems: fresh, hasMore: more, totalCount: count } = await fetchProblemsClient({
          offset: 0,
          limit: 20,
          search,
          tab,
          difficulty,
          tag,
          company,
          trackNumbers,
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
    [fetchProblemsClient]
  )

  const loadMore = useCallback(async () => {
    if (isLoadingMore || !hasMore || isFiltering.current) return
    // Cancel any in-flight request and start fresh
    if (loadMoreAbortRef.current) {
      loadMoreAbortRef.current.abort()
    }
    const controller = new AbortController()
    loadMoreAbortRef.current = controller

    setIsLoadingMore(true)
    try {
      const currentTrackNumbers = activeTrackId ? getTrackById(activeTrackId)?.problemNumbers : undefined
      const { problems: next, hasMore: more } = await fetchProblemsClient({
        offset,
        limit: 20,
        search: searchInput,
        tab: activeTab,
        difficulty: activeDifficulty,
        tag: activeTag,
        company: activeCompany,
        trackNumbers: currentTrackNumbers,
        sortBy: activeSort,
      })
      // Only apply result if this request wasn't cancelled
      if (!controller.signal.aborted) {
        setProblems((prev) => [...prev, ...next])
        setHasMore(more)
        setOffset((prev) => prev + next.length)
      }
    } finally {
      if (!controller.signal.aborted) {
        setIsLoadingMore(false)
      }
    }
  }, [isLoadingMore, hasMore, offset, searchInput, activeTab, activeDifficulty, activeTag, activeCompany, activeTrackId, activeSort, fetchProblemsClient])

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
      const currentTrackNumbers = activeTrackId ? getTrackById(activeTrackId)?.problemNumbers : undefined
      resetAndFetch(val, activeTab, activeDifficulty, activeTag, activeSort, activeCompany, currentTrackNumbers)
    }, 400)
  }

  const handleCompanySelect = (companyName: string) => {
    setActiveCompany(companyName)
    const currentTrackNumbers = activeTrackId ? getTrackById(activeTrackId)?.problemNumbers : undefined
    resetAndFetch(searchInput, activeTab, activeDifficulty, activeTag, activeSort, companyName, currentTrackNumbers)
  }

  const handleSelectTrack = (trackId: string | null) => {
    setActiveTrackId(trackId)
    const trackNumbers = trackId ? getTrackById(trackId)?.problemNumbers : undefined
    resetAndFetch(searchInput, activeTab, activeDifficulty, activeTag, activeSort, activeCompany, trackNumbers)
    if (trackId) {
      setActiveView("problems")
    }
  }

  const applyFilter = (key: "tab" | "difficulty" | "tag" | "sortBy" | "company", val: string) => {
    const next = {
      tab: key === "tab" ? val : activeTab,
      difficulty: key === "difficulty" ? val : activeDifficulty,
      tag: key === "tag" ? val : activeTag,
      company: key === "company" ? val : activeCompany,
      sortBy: key === "sortBy" ? val : activeSort,
    }
    if (key === "tab") setActiveTab(val)
    if (key === "difficulty") setActiveDifficulty(val)
    if (key === "tag") setActiveTag(val)
    if (key === "company") setActiveCompany(val)
    if (key === "sortBy") setActiveSort(val)
    const currentTrackNumbers = activeTrackId ? getTrackById(activeTrackId)?.problemNumbers : undefined
    resetAndFetch(searchInput, next.tab, next.difficulty, next.tag, next.sortBy, next.company, currentTrackNumbers)
  }

  const clearAllFilters = () => {
    setSearchInput("")
    setActiveTab("all")
    setActiveDifficulty("All")
    setActiveTag("All")
    setActiveCompany("All")
    setActiveTrackId(null)
    setActiveView("problems")
    setActiveSort("number-asc")
    setTagSearchInput("")
    resetAndFetch("", "all", "All", "All", "number-asc", "All", undefined)
  }

  const activeFilterCount = useMemo(() => {
    let count = 0
    if (activeTab && activeTab !== "all") count++
    if (activeDifficulty && activeDifficulty !== "All") count++
    if (activeTag && activeTag !== "All") count++
    if (activeCompany && activeCompany !== "All") count++
    if (activeTrackId) count++
    if (activeSort && activeSort !== "number-asc") count++
    return count
  }, [activeTab, activeDifficulty, activeTag, activeCompany, activeTrackId, activeSort])

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
          <LogicLabStatsCards globalStats={globalStats} activityCalendar={activityCalendar} streakStats={streakStats} />

          {/* Card 3: POTD Card */}
          <Card className={cn('group/potd', 'min-w-0', 'flex', 'flex-col', 'relative', 'py-0')}>
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

              {/* Action Button: Cool Animated Solve Challenge Button */}
              <div className="mt-auto pt-2">
                <SolveChallengeButton
                  isSolved={activeChallenge?.solved_status === "Accepted"}
                  disabled={!potd || !activeChallenge}
                  onClick={() => {
                    if (potd) {
                      startNavigationProgress()
                      router.push(`/logiclab/dailychallenges/${potd.id}`)
                    }
                  }}
                />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Placement Tracks & Company Interview Sets CTA Cards (Mesh Gradient card-07 Style) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {/* Card 1: Placement Preparation Tracks (Purple Iridescent Mesh) */}
        <Link
          href="/logiclab/tracks"
          onClick={() => startNavigationProgress()}
          className="group relative flex flex-col justify-between overflow-hidden rounded-2xl p-4.5 sm:p-5 border border-white/60 dark:border-white/15 shadow-[inset_0_1px_1px_rgba(255,255,255,0.7),0_6px_16px_-4px_rgba(168,85,247,0.12)] hover:shadow-[inset_0_1px_1px_rgba(255,255,255,0.9),0_10px_22px_-4px_rgba(168,85,247,0.2)] transition-all duration-300 hover:scale-[1.008] active:scale-[0.99] cursor-pointer select-none space-y-2.5 bg-[#f3e8ff]"
          style={{
            backgroundImage: `
              radial-gradient(at 0% 0%, #c4b5fd 0px, transparent 65%),
              radial-gradient(at 100% 0%, #a5b4fc 0px, transparent 65%),
              radial-gradient(at 65% 45%, #fed7aa 0px, transparent 55%),
              radial-gradient(at 100% 100%, #fbcfe8 0px, transparent 70%),
              radial-gradient(at 0% 100%, #e9d5ff 0px, transparent 65%),
              radial-gradient(at 35% 85%, #f472b6 0px, transparent 60%)
            `,
          }}
        >
          {/* Middle: Title & Description */}
          <div className="space-y-1 relative z-10">
            <h3 className="text-base sm:text-lg font-semibold tracking-tight text-neutral-900 leading-snug">
              Placement Preparation Tracks
            </h3>
            <p className="text-xs sm:text-[13px] text-neutral-700/90 leading-relaxed font-normal">
              Targeted roadmaps engineered for campus recruitment exams, IT services tests, and Tier-1 product SDE interviews.
            </p>
          </div>

          {/* Bottom Row / CTA Footer */}
          <div className="pt-1 flex items-center justify-between text-xs relative z-10">
            <span className="font-semibold text-neutral-900 flex items-center gap-1.5 group-hover:gap-2 transition-all">
              Explore Tracks
              <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
            </span>
          </div>
        </Link>

        {/* Card 2: Company Interview Sets (Green/Mint Iridescent Mesh) */}
        <Link
          href="/logiclab/companies"
          onClick={() => startNavigationProgress()}
          className="group relative flex flex-col justify-between overflow-hidden rounded-2xl p-4.5 sm:p-5 border border-white/60 dark:border-white/15 shadow-[inset_0_1px_1px_rgba(255,255,255,0.7),0_6px_16px_-4px_rgba(16,185,129,0.12)] hover:shadow-[inset_0_1px_1px_rgba(255,255,255,0.9),0_10px_22px_-4px_rgba(16,185,129,0.2)] transition-all duration-300 hover:scale-[1.008] active:scale-[0.99] cursor-pointer select-none space-y-2.5 bg-[#ecfdf5]"
          style={{
            backgroundImage: `
              radial-gradient(at 0% 0%, #6ee7b7 0px, transparent 65%),
              radial-gradient(at 100% 0%, #67e8f9 0px, transparent 65%),
              radial-gradient(at 65% 45%, #fef08a 0px, transparent 55%),
              radial-gradient(at 100% 100%, #a7f3d0 0px, transparent 70%),
              radial-gradient(at 0% 100%, #99f6e4 0px, transparent 65%),
              radial-gradient(at 35% 85%, #bef264 0px, transparent 60%)
            `,
          }}
        >
          {/* Middle: Title & Description */}
          <div className="space-y-1 relative z-10">
            <h3 className="text-base sm:text-lg font-semibold tracking-tight text-neutral-900 leading-snug">
              Company Interview Sets
            </h3>
            <p className="text-xs sm:text-[13px] text-neutral-700/90 leading-relaxed font-normal">
              Real coding assessment and on-site interview questions curated from Amazon, Google, Microsoft, Meta, and IT recruiters.
            </p>
          </div>

          {/* Bottom Row / CTA Footer */}
          <div className="pt-1 flex items-center justify-between text-xs relative z-10">
            <span className="font-semibold text-neutral-900 flex items-center gap-1.5 group-hover:gap-2 transition-all">
              Practice by Company
              <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
            </span>
          </div>
        </Link>
      </div>

      {/* Main Directory Layout */}
      <div className={cn('flex', 'flex-col', 'gap-6', 'min-w-0')}>
        {/* Toolbar */}
        <div className={cn('flex', 'items-center', 'gap-3', 'w-full')}>
          <InputGroup className="flex-1 h-10 bg-background rounded-lg">
            <InputGroupAddon align="inline-start">
              {isPending ? (
                <Loader2 className="animate-spin text-primary" />
              ) : (
                <Search className="text-muted-foreground" />
              )}
            </InputGroupAddon>
            <InputGroupInput
              placeholder="Search problems..."
              value={searchInput}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="h-full"
            />
            {searchInput && (
              <InputGroupAddon align="inline-end">
                <InputGroupButton
                  onClick={() => handleSearchChange("")}
                  variant="ghost"
                  size="icon-xs"
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X />
                </InputGroupButton>
              </InputGroupAddon>
            )}
          </InputGroup>

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
              <span className={cn('hidden', 'sm:inline')}>Sort & Filter</span>
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
            
            <Link href="/logiclab/leaderboard">
              <Button variant="outline" className={cn('rounded-full', 'h-10', 'gap-1.5', 'shrink-0')} title="View Leaderboard">
                <Trophy className="size-4 text-amber-500" />
                <span className={cn('hidden', 'sm:inline')}>Leaderboard</span>
              </Button>
            </Link>
          </div>
        </div>

        {/* Active filter summary strip */}
        {hasActiveFilters && (
          <div className={cn('flex', 'items-center', 'gap-2', '-mt-3')}>
            <span className={cn('text-[11px]', 'text-muted-foreground')}>
              {totalCount} of {globalStats.total} problems
              {activeCompany !== "All" && (
                <span className="ml-1 font-semibold text-foreground">
                  • Asked at {activeCompany}
                </span>
              )}
              {activeTrackId && (
                <span className="ml-1 font-semibold text-primary">
                  • Track: {getTrackById(activeTrackId)?.title}
                </span>
              )}
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
              <div className="flex flex-col gap-1">
                {problems.map((problem, idx) => {
                  const isSolved = problem.solved_status === "Accepted"
                  const isAttempted = !!(problem.solved_status && problem.solved_status !== "Accepted")

                  return (
                    <Card
                      key={problem.id}
                      data-nav-href={`/logiclab/problems/${problem.id}`}
                      onClick={() => {
                        startNavigationProgress()
                        router.push(`/logiclab/problems/${problem.id}`)
                      }}
                      className="rounded-sm group cursor-pointer hover:bg-muted/30 transition-colors duration-150 py-0"
                    >
                      <CardContent className="flex items-center gap-3 px-4 py-2.5">
                        {/* Status icon */}
                        <div className="shrink-0 flex items-center justify-center w-5">
                          {isSolved ? (
                            <CircleCheck className="size-4 text-emerald-500" />
                          ) : isAttempted ? (
                            <CircleDot className="size-4 text-amber-500" />
                          ) : (
                            <div className="size-3.5 rounded-full border-2 border-muted-foreground/45" />
                          )}
                        </div>

                        {/* Number & Title */}
                        <div className="flex-1 min-w-0 flex items-center gap-4 sm:gap-6">
                          <span className="text-sm font-bold text-muted-foreground leading-tight shrink-0 font-mono">
                            #{problem.number || idx + 1}
                          </span>
                          <span className="text-sm font-medium text-foreground group-hover:text-foreground transition-colors truncate block leading-snug">
                            {problem.title}
                          </span>
                        </div>

                        {/* Acceptance Rate (visible on desktop) */}
                        {problem.acceptance_rate !== null && (
                          <div className="hidden md:flex items-center gap-1 shrink-0 text-xs text-muted-foreground/70">
                            <span>{problem.acceptance_rate}%</span>
                            {problem.total_submissions > 0 && (
                              <span className="text-[10px] text-muted-foreground/40">
                                ({problem.total_submissions})
                              </span>
                            )}
                          </div>
                        )}

                        {/* Difficulty & Single Clean Tag */}
                        <div className="hidden sm:flex items-center gap-2.5 shrink-0">
                          <span className={cn(
                            "text-xs font-semibold w-14 text-right",
                            problem.difficulty === "Easy" ? "text-emerald-500" :
                            problem.difficulty === "Medium" ? "text-amber-500" :
                            "text-rose-500"
                          )}>
                            {problem.difficulty}
                          </span>

                          {/* At most 1 clean neutral tag */}
                          {(() => {
                            const companyBadges = getProblemCompanyBadges(problem)
                            if (companyBadges.length > 0) {
                              return (
                                <span className="text-[10px] text-muted-foreground bg-muted/40 px-2 py-0.5 rounded border border-border/50 font-mono">
                                  {companyBadges[0].company.name}
                                </span>
                              )
                            }
                            const topic = (problem.tags || []).find((t) => !isCompanyTag(t))
                            if (topic) {
                              return (
                                <span className="text-[10px] text-muted-foreground/75 px-1.5 py-0.5 font-mono">
                                  {topic}
                                </span>
                              )
                            }
                            return null
                          })()}
                        </div>

                        {/* Admin actions (Edit / Delete) */}
                        {isAdmin && (
                          <div
                            className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                            onClick={(e: React.MouseEvent) => e.stopPropagation()}
                          >
                            <Link
                              href={`/logiclab/admin/edit/${problem.id}`}
                              className="p-1.5 hover:bg-background rounded-md text-muted-foreground hover:text-emerald-500 transition-all cursor-pointer shadow-sm border border-transparent hover:border-border/60"
                              title="Edit Problem"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Link>
                            <button
                              onClick={() => setDeletingProblemId(problem.id)}
                              className="p-1.5 hover:bg-background rounded-md text-muted-foreground/70 hover:text-rose-500 transition-all cursor-pointer shadow-sm border border-transparent hover:border-border/60"
                              title="Delete Problem"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        )}

                        {/* Navigation chevron */}
                        <div className="shrink-0 ml-1">
                          <ChevronRight className="size-4 text-muted-foreground/50 group-hover:text-muted-foreground/80 group-hover:translate-x-0.5 transition-all" />
                        </div>
                      </CardContent>
                    </Card>
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

                {/* Accordion 2.5: Target Company */}
                <AccordionItem value="companies" className={cn('px-6', 'border-b', 'border-border/30')}>
                  <AccordionTrigger className={cn('py-3.5', 'hover:no-underline', 'text-xs', 'font-bold', 'uppercase', 'tracking-wider', 'text-foreground')}>
                    <span className={cn('flex', 'items-center', 'gap-2')}>
                      <Briefcase className="size-3.5" />
                      Target Company
                    </span>
                  </AccordionTrigger>
                  <AccordionContent className={cn('pb-4', 'pt-1', 'flex', 'flex-col', 'gap-2.5')}>
                    <div className="flex flex-wrap gap-1.5">
                      <button
                        onClick={() => applyFilter("company", "All")}
                        className={cn(
                          "px-2.5 py-1 rounded-full text-xs font-semibold border transition-all cursor-pointer",
                          activeCompany === "All"
                            ? "bg-foreground text-background border-foreground shadow-sm"
                            : "bg-muted/30 border-border/40 text-muted-foreground hover:text-foreground"
                        )}
                      >
                        All Companies
                      </button>
                      {COMPANY_CATALOG.map((comp) => {
                        const isSelected = activeCompany.toLowerCase() === comp.name.toLowerCase()
                        const count = tagCounts[comp.name] || 0
                        return (
                          <button
                            key={comp.id}
                            onClick={() => applyFilter("company", isSelected ? "All" : comp.name)}
                            className={cn(
                              "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-all cursor-pointer",
                              isSelected
                                ? "bg-primary text-primary-foreground border-primary shadow-sm"
                                : cn(comp.badgeStyles.bg, comp.badgeStyles.text, comp.badgeStyles.border, "hover:opacity-85")
                            )}
                          >
                            <span className={cn("size-1.5 rounded-full", isSelected ? "bg-primary-foreground" : comp.badgeStyles.dot)} />
                            <span>{comp.name}</span>
                            {count > 0 && (
                              <span className="text-[10px] opacity-70">({count})</span>
                            )}
                          </button>
                        )
                      })}
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
