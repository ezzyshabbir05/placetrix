"use client"

import React, { useState, useEffect, useCallback, useRef, useMemo } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  Search,
  CircleCheck,
  CircleDot,
  ChevronRight,
  X,
  BookOpen,
  Loader2,
  Clock,
  CalendarDays,
  SlidersHorizontal,
  CircleDashed,
  ListTodo,
  Flame,
  ArrowLeft,
  ArrowRight,
  ArrowUpDown,
} from "lucide-react"
import { Card, CardContent, CardDescription, CardAction } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from "@/components/ui/input-group"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet"
import { fetchDailyChallengesInfinite } from "../actions"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"

// ── Types ──

interface ChallengeItem {
  id: string
  date: string
  problem_id: string
  number?: number
  title: string
  difficulty: "Easy" | "Medium" | "Hard"
  tags: string[]
  solved_status: string | null
  total_submissions: number
  acceptance_rate: number
}

interface CalendarCell {
  date: string
  count: number
  status: "none" | "attempted" | "solved"
  dayOfWeek: number
}

interface DailyChallengesHistoryClientProps {
  initialChallenges: ChallengeItem[]
  initialHasMore: boolean
  currentPotd: ChallengeItem | null
  initialPotd: any
  streakStats: {
    currentStreak: number
    maxStreak: number
  }
  activityCalendar: CalendarCell[]
  allTags: string[]
  tagCounts: Record<string, number>
  userId: string
  todayStr: string
  pageLimit: number
}

const DIFFICULTY_COLORS: Record<string, { text: string; bg: string }> = {
  Easy: { text: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-100/80 dark:bg-emerald-500/15" },
  Medium: { text: "text-amber-600 dark:text-amber-400", bg: "bg-amber-100/80 dark:bg-amber-500/15" },
  Hard: { text: "text-rose-600 dark:text-rose-400", bg: "bg-rose-100/80 dark:bg-rose-500/15" },
}

// ── Main Component ──

export function DailyChallengesHistoryClient({
  initialChallenges,
  initialHasMore,
  currentPotd,
  initialPotd,
  streakStats,
  activityCalendar,
  allTags,
  tagCounts,
  userId,
  todayStr,
  pageLimit,
}: DailyChallengesHistoryClientProps) {
  const router = useRouter()

  // ── Filter state ──
  const [searchInput, setSearchInput] = useState("")
  const [activeTab, setActiveTab] = useState("all")
  const [activeDifficulty, setActiveDifficulty] = useState("All")
  const [activeTag, setActiveTag] = useState("All")
  const [activeSort, setActiveSort] = useState("date-desc")
  const [showAllTags, setShowAllTags] = useState(false)
  const [filterSheetOpen, setFilterSheetOpen] = useState(false)
  const [tagSearchInput, setTagSearchInput] = useState("")

  // ── Infinite scroll state ──
  const [challenges, setChallenges] = useState<ChallengeItem[]>(initialChallenges)
  const [hasMore, setHasMore] = useState(initialHasMore)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [offset, setOffset] = useState(initialChallenges.length)
  const sentinelRef = useRef<HTMLDivElement>(null)
  const isFiltering = useRef(false)

  // ── Reset list on filter change ──
  const resetAndFetch = useCallback(
    async (search: string, tab: string, difficulty: string, tag: string, sortBy: string) => {
      isFiltering.current = true
      setIsLoadingMore(true)
      setChallenges([])
      setHasMore(false)
      setOffset(0)

      try {
        const { challenges: fresh, hasMore: more } = await fetchDailyChallengesInfinite({
          userId,
          offset: 0,
          limit: pageLimit,
          search,
          tab,
          difficulty,
          tag,
          sortBy,
          todayStr,
        })
        setChallenges(fresh)
        setHasMore(more)
        setOffset(fresh.length)
      } finally {
        setIsLoadingMore(false)
        isFiltering.current = false
      }
    },
    [userId, todayStr, pageLimit]
  )

  // ── Load next page ──
  const loadMore = useCallback(async () => {
    if (isLoadingMore || !hasMore || isFiltering.current) return
    setIsLoadingMore(true)
    try {
      const { challenges: next, hasMore: more } = await fetchDailyChallengesInfinite({
        userId,
        offset,
        limit: pageLimit,
        search: searchInput,
        tab: activeTab,
        difficulty: activeDifficulty,
        tag: activeTag,
        sortBy: activeSort,
        todayStr,
      })
      setChallenges((prev) => [...prev, ...next])
      setHasMore(more)
      setOffset((prev) => prev + next.length)
    } finally {
      setIsLoadingMore(false)
    }
  }, [isLoadingMore, hasMore, userId, offset, pageLimit, searchInput, activeTab, activeDifficulty, activeTag, activeSort, todayStr])

  // ── IntersectionObserver for sentinel ──
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

  // ── Debounce search ──
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
    setActiveSort("date-desc")
    setTagSearchInput("")
    resetAndFetch("", "all", "All", "All", "date-desc")
  }

  // ── Countdown Timer ──
  const calculateTimeLeft = () => {
    const now = new Date()
    const istOffset = 5.5 * 60 * 60 * 1000
    const istTime = new Date(now.getTime() + istOffset)
    const nextMidnightIST = new Date(istTime)
    nextMidnightIST.setUTCHours(24, 0, 0, 0)
    const diff = nextMidnightIST.getTime() - istTime.getTime()
    if (diff <= 0) return "00h 00m 00s"
    const h = Math.floor(diff / (1000 * 60 * 60)).toString().padStart(2, "0")
    const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)).toString().padStart(2, "0")
    const s = Math.floor((diff % (1000 * 60)) / 1000).toString().padStart(2, "0")
    return `${h}h ${m}m ${s}s`
  }

  const [timeLeft, setTimeLeft] = useState<string>(calculateTimeLeft)
  useEffect(() => {
    const interval = setInterval(() => setTimeLeft(calculateTimeLeft()), 1000)
    return () => clearInterval(interval)
  }, [])

  // ── Misc ──
  const activeFilterCount = useMemo(() => {
    let count = 0
    if (activeTab && activeTab !== "all") count++
    if (activeDifficulty && activeDifficulty !== "All") count++
    if (activeTag && activeTag !== "All") count++
    if (activeSort && activeSort !== "date-desc") count++
    return count
  }, [activeTab, activeDifficulty, activeTag, activeSort])

  const hasActiveFilters = activeFilterCount > 0 || searchInput.trim() !== ""

  const visibleTags = useMemo(() => {
    let list = allTags
    if (tagSearchInput.trim() !== "") {
      const q = tagSearchInput.toLowerCase()
      list = allTags.filter((t) => t.toLowerCase().includes(q))
    }
    if (showAllTags || tagSearchInput.trim() !== "") return list
    return [...list].sort((a, b) => (tagCounts[b] || 0) - (tagCounts[a] || 0)).slice(0, 8)
  }, [allTags, tagCounts, showAllTags, tagSearchInput])

  const formatDateShort = (dateString: string) => {
    const d = new Date(dateString + "T00:00:00")
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" })
  }

  // Group by month-year
  const groupedChallenges = useMemo(() => {
    const groups: { label: string; items: ChallengeItem[] }[] = []
    const isDateSort = activeSort === "date-desc" || activeSort === "date-asc"

    if (!isDateSort) {
      groups.push({
        label: "Challenges",
        items: challenges,
      })
      return groups
    }

    let currentGroup: { label: string; items: ChallengeItem[] } | null = null
    for (const ch of challenges) {
      const d = new Date(ch.date + "T00:00:00")
      const label = d.toLocaleDateString("en-US", { month: "long", year: "numeric" })
      if (!currentGroup || currentGroup.label !== label) {
        currentGroup = { label, items: [] }
        groups.push(currentGroup)
      }
      currentGroup.items.push(ch)
    }
    return groups
  }, [challenges, activeSort])

  const activeChallenge = currentPotd

  return (
    <div className="flex flex-col gap-6 px-4 py-6 md:px-8 md:py-8">
      {/* Page Header */}
      <div className="flex flex-col gap-1">
        <Button asChild variant="outline" size="sm" className="w-fit gap-1.5 mb-2">
          <Link href="/logiclab">
            <ArrowLeft className="size-3.5" />
            Back to Logic Lab
          </Link>
        </Button>
        <h1 className="text-3xl font-bold font-cirka tracking-tight text-foreground">Daily Challenges</h1>
        <p className="text-sm text-muted-foreground">
          Track your consistency and revisit past daily challenges.
        </p>
      </div>

      {/* ── Today's Challenge (Hero) ── */}
      {activeChallenge ? (
        <Card
          className="group/potd relative overflow-hidden transition-all duration-200 cursor-pointer py-0"
          onClick={() => router.push(`/logiclab/dailychallenges/${activeChallenge.id}`)}
        >
          <div className="relative flex flex-col sm:flex-row">
            {/* ── Left: main content ── */}
            <div className="flex-1 min-w-0 px-5 py-4 sm:px-6 sm:py-4 flex flex-col gap-3">
              {/* Top row: label + mobile timer */}
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.12em] text-orange-600 dark:text-orange-400">
                    <CalendarDays className="size-3" />
                    Today&apos;s Challenge
                  </span>
                  <span className="text-muted-foreground/30">·</span>
                  <span className={cn(
                    "text-[10px] font-bold uppercase tracking-wider",
                    activeChallenge.difficulty === "Easy" ? "text-emerald-600 dark:text-emerald-400" :
                      activeChallenge.difficulty === "Medium" ? "text-amber-600 dark:text-amber-400" :
                        "text-rose-600 dark:text-rose-400"
                  )}>
                    {activeChallenge.difficulty}
                  </span>
                  {activeChallenge.solved_status === "Accepted" && (
                    <>
                      <span className="text-muted-foreground/30">·</span>
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                        <CircleCheck className="size-3" /> Solved
                      </span>
                    </>
                  )}
                </div>
                {/* Timer — mobile only */}
                <div className="flex sm:hidden items-center gap-1.5 text-[11px] font-mono font-semibold text-muted-foreground shrink-0">
                  <Clock className="size-3 text-orange-500" />
                  {timeLeft}
                </div>
              </div>

              {/* Title */}
              <div className="flex flex-col gap-2">
                <h3 className="text-xl sm:text-[1.6rem] font-bold tracking-tight text-foreground leading-tight duration-200">
                  {activeChallenge.number ? (
                    <span className="text-muted-foreground/40 font-normal text-lg mr-1.5">#{activeChallenge.number}</span>
                  ) : null}
                  {activeChallenge.title}
                </h3>

                {/* Tags */}
                {activeChallenge.tags && activeChallenge.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {activeChallenge.tags.slice(0, 4).map((t: string) => (
                      <span key={t} className="text-[11px] bg-muted/80 border border-border/40 px-2 py-0.5 rounded-md text-muted-foreground font-medium">
                        {t}
                      </span>
                    ))}
                    {activeChallenge.tags.length > 4 && (
                      <span className="text-[11px] bg-muted/40 px-2 py-0.5 rounded-md text-muted-foreground/50 font-medium">
                        +{activeChallenge.tags.length - 4}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* ── Right panel: timer + CTA (desktop) ── */}
            <div className="hidden sm:flex flex-col items-center justify-center gap-3 px-6 py-4 border-l border-border/50 shrink-0 min-w-[148px]">
              <div className="flex flex-col items-center gap-1 text-center">
                <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/50">Resets in</span>
                <span className="font-mono text-lg font-bold text-foreground tabular-nums leading-none">{timeLeft}</span>
              </div>

              <Button
                className="w-full h-9 px-4 font-semibold gap-2 group/btn shadow-sm text-sm rounded-lg"
                onClick={(e) => {
                  e.stopPropagation()
                  router.push(`/logiclab/dailychallenges/${activeChallenge.id}`)
                }}
              >
                {activeChallenge.solved_status === "Accepted" ? "Review" : "Solve"}
              </Button>
            </div>
          </div>

          {/* ── Mobile CTA ── */}
          <div className="sm:hidden px-5 pb-4">
            <Button
              className="w-full h-9 font-semibold gap-2 group/btn shadow-sm text-sm"
              onClick={(e) => {
                e.stopPropagation()
                router.push(`/logiclab/dailychallenges/${activeChallenge.id}`)
              }}
            >
              {activeChallenge.solved_status === "Accepted" ? "Review Challenge" : "Solve Now"}
            </Button>
          </div>
        </Card>
      ) : (
        <Card className="py-10 border-dashed flex flex-col items-center justify-center text-center gap-3">
          <BookOpen className="w-9 h-9 text-muted-foreground/30" />
          <CardDescription className="text-sm">
            Today&apos;s challenge hasn&apos;t been posted yet. Check back later!
          </CardDescription>
        </Card>
      )}

      {/* ── Past Challenges ── */}
      <div className="flex flex-col gap-4 min-w-0">
        {/* Section header + Toolbar */}
        <div className="flex flex-col gap-3">
          <h2 className="text-lg font-bold font-cirka text-foreground">Past Challenges</h2>

          <div className="flex items-center gap-3 w-full">
            <InputGroup className="flex-1 h-10 bg-background rounded-lg">
              <InputGroupAddon align="inline-start">
                {isLoadingMore && challenges.length === 0 ? (
                  <Loader2 className="animate-spin text-muted-foreground" />
                ) : (
                  <Search className="text-muted-foreground" />
                )}
              </InputGroupAddon>
              <InputGroupInput
                placeholder="Search challenges..."
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

            <Button
              variant="outline"
              onClick={() => setFilterSheetOpen(true)}
              className={cn(
                "h-10 gap-1.5 rounded-lg border-border/70 shrink-0",
                activeFilterCount > 0 && "border-primary/40 text-primary bg-primary/5"
              )}
            >
              <SlidersHorizontal className="size-4" />
              <span className="hidden sm:inline">Sort & Filter</span>
              {activeFilterCount > 0 && (
                <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-primary text-primary-foreground text-[9px] font-bold px-1 leading-none">
                  {activeFilterCount}
                </span>
              )}
            </Button>
          </div>

          {/* Active filter strip */}
          {hasActiveFilters && (
            <div className="flex items-center gap-2 -mt-1">
              <span className="text-[11px] text-muted-foreground">
                {challenges.length} loaded{hasMore ? "+" : ""}
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
        </div>

        {/* Challenge List */}
        <div className="relative">
          {/* Initial loading state */}
          {isLoadingMore && challenges.length === 0 && (
            <div className="flex flex-col items-center justify-center py-24 gap-3">
              <Loader2 className="h-8 w-8 text-primary animate-spin" />
              <span className="text-sm font-medium text-muted-foreground">Loading challenges...</span>
            </div>
          )}

          {/* Empty state */}
          {!isLoadingMore && challenges.length === 0 && (
            <div className="flex flex-col items-center justify-center py-24 text-center gap-4 rounded-xl border border-dashed border-border/60">
              <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center">
                <BookOpen className="h-8 w-8 text-muted-foreground/60" />
              </div>
              <div className="space-y-1">
                <p className="text-lg font-semibold text-foreground">No challenges found</p>
                <p className="text-sm text-muted-foreground max-w-sm">
                  Try adjusting your search or filters.
                </p>
              </div>
              {hasActiveFilters && (
                <Button variant="outline" onClick={clearAllFilters} className="mt-2">
                  Clear all filters
                </Button>
              )}
            </div>
          )}

          {/* Grouped list */}
          {challenges.length > 0 && (
            <div className="flex flex-col gap-6">
              {groupedChallenges.map((group) => (
                <div key={group.label} className="flex flex-col gap-2">
                  {/* Month-Year divider */}
                  {(activeSort === "date-desc" || activeSort === "date-asc") && (
                    <div className="flex items-center gap-3 px-1">
                      <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground/60">
                        {group.label}
                      </span>
                      <div className="flex-1 h-px bg-border/40" />
                    </div>
                  )}

                  <div className="flex flex-col gap-1">
                    {group.items.map((challenge) => {
                      const isSolved = challenge.solved_status === "Accepted"
                      const isAttempted = !!(challenge.solved_status && challenge.solved_status !== "Accepted")

                      return (
                        <Card
                          key={challenge.id}
                          onClick={() => router.push(`/logiclab/dailychallenges/${challenge.id}`)}
                          className="group cursor-pointer hover:bg-muted/30 transition-colors duration-150 border-border/50 hover:border-border/80 py-0"
                        >
                          <CardContent className="flex items-center gap-3 px-4 py-2.5">
                            {/* Status icon */}
                            <div className="shrink-0 flex items-center justify-center w-5">
                              {isSolved ? (
                                <CircleCheck className="size-4 text-emerald-500" />
                              ) : isAttempted ? (
                                <CircleDot className="size-4 text-amber-500" />
                              ) : (
                                <div className="size-3.5 rounded-full border-2 border-muted-foreground/25" />
                              )}
                            </div>

                            {/* Date */}
                            <div className="shrink-0 w-[72px]">
                              <span className="text-xs font-semibold text-muted-foreground leading-tight">
                                {formatDateShort(challenge.date)}
                              </span>
                            </div>

                            {/* Title */}
                            <div className="flex-1 min-w-0">
                              <span className="text-sm font-medium text-foreground/85 group-hover:text-foreground transition-colors truncate block leading-snug">
                                {challenge.number ? `${challenge.number}. ` : ""}{challenge.title}
                              </span>
                            </div>

                            {/* Difficulty + Tags */}
                            <div className="hidden sm:flex items-center gap-2 shrink-0">
                              <span className={cn(
                                "text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded",
                                DIFFICULTY_COLORS[challenge.difficulty]?.bg,
                                DIFFICULTY_COLORS[challenge.difficulty]?.text,
                              )}>
                                {challenge.difficulty}
                              </span>
                              {challenge.tags?.slice(0, 1).map((tag) => (
                                <span key={tag} className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-muted/60 text-muted-foreground/60">
                                  {tag}
                                </span>
                              ))}
                            </div>

                            {/* Chevron / Solved */}
                            <div className="shrink-0 ml-1">
                              {isSolved ? (
                                <CircleCheck className="size-4 text-emerald-500/70" />
                              ) : (
                                <ChevronRight className="size-4 text-muted-foreground/30 group-hover:text-muted-foreground/60 group-hover:translate-x-0.5 transition-all" />
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      )
                    })}
                  </div>
                </div>
              ))}

              {/* Sentinel for IntersectionObserver */}
              <div ref={sentinelRef} className="h-4" />

              {/* Loading more spinner */}
              {isLoadingMore && (
                <div className="flex items-center justify-center py-4 gap-2 text-sm text-muted-foreground">
                  <Loader2 className="size-4 animate-spin" />
                  Loading more...
                </div>
              )}

              {/* End of list */}
              {!hasMore && !isLoadingMore && challenges.length > 0 && (
                <p className="text-center text-xs text-muted-foreground/50 py-4">
                  All {challenges.length} challenges loaded
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Filter Sheet ── */}
      <Sheet open={filterSheetOpen} onOpenChange={setFilterSheetOpen}>
        <SheetContent side="right" className="w-[320px] sm:w-[420px] flex flex-col gap-0 p-0">
          <SheetHeader className="px-6 pt-5 pb-4 pr-10 border-b border-border/50 shrink-0">
            <div className="flex items-center justify-between">
              <SheetTitle className="text-base font-bold">Sort & Filter</SheetTitle>
              {activeFilterCount > 0 && (
                <button
                  onClick={() => {
                    setActiveTab("all")
                    setActiveDifficulty("All")
                    setActiveTag("All")
                    setActiveSort("date-desc")
                    setTagSearchInput("")
                    resetAndFetch(searchInput, "all", "All", "All", "date-desc")
                  }}
                  className="text-xs text-rose-500 hover:text-rose-600 dark:hover:text-rose-400 font-semibold transition-colors"
                >
                  Clear all
                </button>
              )}
            </div>
            <SheetDescription className="text-xs text-muted-foreground -mt-0.5">
              Refine results or change sorting to find challenges easily.
            </SheetDescription>
          </SheetHeader>

          <Tabs defaultValue="filter" className="flex-1 flex flex-col gap-0 min-h-0">
            <div className="px-6 py-2 border-b border-border/30 bg-muted/20 shrink-0">
              <TabsList className="grid grid-cols-2 w-full h-9 p-1 bg-muted/60 rounded-lg">
                <TabsTrigger value="filter" className="text-xs font-semibold">
                  Filters
                  {activeFilterCount - (activeSort !== "date-desc" ? 1 : 0) > 0 && (
                    <Badge variant="secondary" className="ml-1.5 px-1 py-0 h-4 min-w-4 text-[9px] font-bold leading-none bg-primary/10 text-primary border-none">
                      {activeFilterCount - (activeSort !== "date-desc" ? 1 : 0)}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="sort" className="text-xs font-semibold">
                  Sorting
                  {activeSort !== "date-desc" && (
                    <span className="ml-1.5 size-1.5 rounded-full bg-primary" />
                  )}
                </TabsTrigger>
              </TabsList>
            </div>

            {/* TAB CONTENT: FILTERS */}
            <TabsContent value="filter" className="flex-1 overflow-y-auto min-h-0 focus-visible:outline-none">
              <Accordion type="multiple" defaultValue={["status", "difficulty", "tags"]} className="w-full">

                {/* Accordion 1: Status */}
                <AccordionItem value="status" className="px-6 border-b border-border/30">
                  <AccordionTrigger className="py-3.5 hover:no-underline text-xs font-bold uppercase tracking-wider text-muted-foreground/85">
                    <span className="flex items-center gap-2">
                      <ListTodo className="size-3.5" />
                      Status
                    </span>
                  </AccordionTrigger>
                  <AccordionContent className="pb-4 pt-1 flex flex-col gap-2">
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { value: "all", label: "All Status", icon: <ListTodo className="size-3.5 text-muted-foreground/70" /> },
                        { value: "solved", label: "Solved Only", icon: <CircleCheck className="size-3.5 text-emerald-500" /> },
                        { value: "attempted", label: "Attempting", icon: <CircleDot className="size-3.5 text-amber-500" /> },
                        { value: "unsolved", label: "Unsolved", icon: <CircleDashed className="size-3.5 text-muted-foreground/60" /> },
                      ].map((opt) => (
                        <button
                          key={opt.value}
                          onClick={() => applyFilter("tab", opt.value)}
                          className={cn(
                            "flex items-center gap-2.5 p-2 rounded-lg border text-left transition-all select-none cursor-pointer text-xs font-medium",
                            activeTab === opt.value
                              ? "bg-primary/5 border-primary text-primary font-semibold shadow-xs"
                              : "bg-muted/20 border-border/40 text-muted-foreground hover:bg-muted/50 hover:text-foreground hover:border-border/80"
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
                <AccordionItem value="difficulty" className="px-6 border-b border-border/30">
                  <AccordionTrigger className="py-3.5 hover:no-underline text-xs font-bold uppercase tracking-wider text-muted-foreground/85">
                    <span className="flex items-center gap-2">
                      <Flame className="size-3.5" />
                      Difficulty
                    </span>
                  </AccordionTrigger>
                  <AccordionContent className="pb-4 pt-1 flex flex-col gap-2">
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { value: "All", label: "All Levels", color: "bg-muted-foreground", text: "text-muted-foreground", border: "border-muted-foreground/20", bg: "bg-muted-foreground/5", desc: "No restriction" },
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
                              : "bg-muted/20 border-border/40 text-muted-foreground hover:bg-muted/50 hover:text-foreground hover:border-border/80"
                          )}
                        >
                          <div className="flex items-center gap-1.5 text-xs font-semibold">
                            <span className={cn("size-2 rounded-full", opt.color)} />
                            <span>{opt.label}</span>
                          </div>
                          <span className="text-[10px] text-muted-foreground/70 font-normal">{opt.desc}</span>
                        </button>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>

                {/* Accordion 3: Topic Tags */}
                <AccordionItem value="tags" className="px-6 border-none">
                  <AccordionTrigger className="py-3.5 hover:no-underline text-xs font-bold uppercase tracking-wider text-muted-foreground/85">
                    <span className="flex items-center gap-2">
                      <BookOpen className="size-3.5" />
                      Topic Tags
                    </span>
                  </AccordionTrigger>
                  <AccordionContent className="pb-4 pt-1 flex flex-col gap-3">
                    {/* Tag Search Input */}
                    <InputGroup className="bg-muted/25 border-border/40 h-8 rounded-md">
                      <InputGroupAddon align="inline-start">
                        <Search className="size-3.5 text-muted-foreground/50" />
                      </InputGroupAddon>
                      <InputGroupInput
                        placeholder="Search tags..."
                        value={tagSearchInput}
                        onChange={(e) => setTagSearchInput(e.target.value)}
                        className="text-xs h-full placeholder:text-muted-foreground/40"
                      />
                      {tagSearchInput && (
                        <InputGroupAddon align="inline-end">
                          <InputGroupButton
                            onClick={() => setTagSearchInput("")}
                            variant="ghost"
                            size="icon-xs"
                            className="text-muted-foreground/60 hover:text-foreground"
                          >
                            <X className="size-3" />
                          </InputGroupButton>
                        </InputGroupAddon>
                      )}
                    </InputGroup>

                    {visibleTags.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5 pt-1">
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
                                  : "bg-muted/30 hover:bg-muted/80 text-muted-foreground hover:text-foreground border-border/50"
                              )}
                            >
                              <span>{t}</span>
                              <span className={cn(
                                "text-[9px] px-1 rounded-sm font-semibold",
                                isSelected ? "bg-primary-foreground/20 text-primary-foreground" : "bg-muted text-muted-foreground/75"
                              )}>
                                {count}
                              </span>
                            </button>
                          )
                        })}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground/50 italic py-2 text-center">No tags match search query</p>
                    )}

                    {allTags.length > 8 && !tagSearchInput && (
                      <Button
                        variant="ghost"
                        size="xs"
                        onClick={() => setShowAllTags(!showAllTags)}
                        className="w-full text-xs text-muted-foreground/70 hover:text-foreground border border-dashed border-border/30 rounded-md py-1 mt-1"
                      >
                        {showAllTags ? "Show Less" : `Show All Topic Tags (${allTags.length})`}
                      </Button>
                    )}
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </TabsContent>

            {/* TAB CONTENT: SORT SETTINGS */}
            <TabsContent value="sort" className="flex-1 overflow-y-auto px-6 py-5 min-h-0 focus-visible:outline-none">
              <RadioGroup
                value={activeSort}
                onValueChange={(val) => applyFilter("sortBy", val)}
                className="flex flex-col gap-3"
              >
                {[
                  { value: "date-desc", title: "Date: Newest First", desc: "Show latest daily challenges first" },
                  { value: "date-asc", title: "Date: Oldest First", desc: "Start from the earliest available challenges" },
                  { value: "difficulty-asc", title: "Difficulty: Easy to Hard", desc: "Sort by ascending difficulty levels" },
                  { value: "difficulty-desc", title: "Difficulty: Hard to Easy", desc: "Sort by descending difficulty levels" },
                  { value: "title-asc", title: "Title: Alphabetical A-Z", desc: "Order alphabetically by challenge title" },
                  { value: "title-desc", title: "Title: Alphabetical Z-A", desc: "Order descending by challenge title" },
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
                          : "bg-muted/15 border-border/50 text-muted-foreground hover:bg-muted/40 hover:text-foreground hover:border-border/80"
                      )}
                    >
                      <div className="flex flex-col gap-0.5 flex-1 min-w-0 pr-3">
                        <Label className={cn("text-xs font-semibold cursor-pointer block truncate", isSelected ? "text-primary" : "text-foreground/90")}>
                          {opt.title}
                        </Label>
                        <span className="text-[10px] text-muted-foreground/75 leading-tight">{opt.desc}</span>
                      </div>
                      <RadioGroupItem value={opt.value} className="size-4 shrink-0 pointer-events-none" />
                    </div>
                  )
                })}
              </RadioGroup>
            </TabsContent>
          </Tabs>

          <Separator />

          <div className="px-6 py-4 bg-muted/10 shrink-0">
            <Button
              className="w-full rounded-xl font-bold h-10 shadow-md bg-primary hover:bg-primary/95 transition-all text-sm gap-2 cursor-pointer"
              onClick={() => setFilterSheetOpen(false)}
            >
              <CircleCheck className="size-4 opacity-80" />
              <span>
                {isLoadingMore
                  ? "Applying..."
                  : `Apply & View List (${challenges.length}${hasMore ? "+" : ""})`}
              </span>
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}
