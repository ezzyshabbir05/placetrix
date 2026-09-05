"use client"

// ─────────────────────────────────────────────────────────────────────────────
// app/(dashboard)/(licensed)/tests/InstituteTestsClient.tsx
// Clean, minimal test management interface powered by standard shadcn components.
// ─────────────────────────────────────────────────────────────────────────────

import * as React from "react"
import { useState, useMemo, useCallback, useEffect, useTransition, useRef } from "react"
import Link from "next/link"
import { useRouter, usePathname } from "next/navigation"
import { toast } from "sonner"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
} from "@/components/ui/sheet"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { HoverCard, HoverCardTrigger, HoverCardContent } from "@/components/ui/hover-card"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupButton,
} from "@/components/ui/input-group"
import { Kbd } from "@/components/ui/kbd"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
} from "@/components/ui/select"
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion"
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription, EmptyContent, EmptyMedia } from "@/components/ui/empty"
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu"
import {
  Plus,
  Eye,
  EyeOff,
  Clock,
  Users,
  ListCheck,
  CalendarClock,
  FlaskConical,
  CheckCircle2,
  PenLine,
  Search,
  X,
  Loader2,
  SlidersHorizontal,
  Copy,
  ExternalLink,
  Award,
  BarChart3,
  RotateCcw,
  ChevronDown,
  Command,
  Mail,
  ShieldCheck,
  User,
} from "lucide-react"
import { cn, formatDateTime } from "@/lib/utils"
import type { InstituteTest, DerivedInstituteStatus } from "./_types"
import { deriveStatus } from "./_types"
import { getInstituteTestsAction } from "./actions"

export { formatDateTime }


// ─── Types ────────────────────────────────────────────────────────────────────

type Tab = "all" | "live" | "upcoming" | "past" | "drafts"

interface TabConfig {
  value: Tab
  label: string
  count: number
}


// ─── Utilities ────────────────────────────────────────────────────────────────

export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (h > 0 && m > 0) return `${h}h ${m}m`
  if (h > 0) return `${h}h`
  return `${m}m`
}


// ─── Status Badge ─────────────────────────────────────────────────────────────

const StatusBadge = React.memo(function StatusBadge({ status }: { status: DerivedInstituteStatus }) {
  switch (status) {
    case "live":
      return <Badge variant="success">Live</Badge>
    case "upcoming":
      return (
        <Badge variant="info" className="gap-1">
          <CalendarClock className="size-3" />
          Upcoming
        </Badge>
      )
    case "past":
      return (
        <Badge variant="secondary" className="gap-1">
          <CheckCircle2 className="size-3" />
          Ended
        </Badge>
      )
    case "draft":
      return (
        <Badge variant="warning" className="gap-1">
          <PenLine className="size-3" />
          Draft
        </Badge>
      )
  }
})


// ─── Test Card ────────────────────────────────────────────────────────────────

const TestCard = React.memo(function TestCard({
  test,
}: {
  test: InstituteTest
}) {
  const [isOpen, setIsOpen] = useState(false)

  const handleCopyLink = async (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault()
      e.stopPropagation()
    }
    try {
      if (typeof window !== "undefined") {
        await navigator.clipboard.writeText(`${window.location.origin}/tests/${test.id}`)
        toast.success("Test link copied to clipboard")
      }
    } catch (err) {
      console.error("Failed to copy test link:", err)
      toast.error("Failed to copy link")
    }
  }

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <Card className="overflow-hidden transition-all hover:border-foreground/20 hover:shadow-xs group w-full min-w-0">
          <Accordion
            type="single"
            collapsible
            value={isOpen ? "details" : ""}
            onValueChange={(val) => setIsOpen(val === "details")}
            className="w-full min-w-0"
          >
            <AccordionItem value="details" className="border-none w-full min-w-0">
              {/* Entire Card Header is Clickable */}
              <div
                role="button"
                tabIndex={0}
                aria-expanded={isOpen}
                onClick={() => setIsOpen((prev) => !prev)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    if (e.target === e.currentTarget) {
                      e.preventDefault()
                      setIsOpen((prev) => !prev)
                    }
                  }
                }}
                className="p-3.5 sm:p-5 flex items-start justify-between gap-2.5 sm:gap-3 text-left w-full min-w-0 cursor-pointer select-none focus-visible:outline-none focus-visible:bg-muted/30 hover:bg-muted/15 transition-colors"
              >
                <div className="flex-1 min-w-0 w-full space-y-2.5 sm:space-y-3">
                  {/* Top: Title + Description + Status Badge */}
                  <div className="flex items-start justify-between gap-2 w-full min-w-0">
                    <div className="space-y-1 min-w-0 flex-1 overflow-hidden">
                      <div className="flex">
                        <Link
                          href={`/tests/${test.id}`}
                          prefetch={false}
                          onClick={(e) => e.stopPropagation()}
                          className="font-semibold text-sm sm:text-base leading-tight truncate hover:text-primary hover:underline transition-colors inline-block max-w-full text-foreground"
                        >
                          {test.title}
                        </Link>
                      </div>
                      <p className="line-clamp-2 text-xs text-muted-foreground font-normal">
                        {test.description ?? "No description provided."}
                      </p>
                    </div>

                    <div
                      className="flex items-center shrink-0 self-start"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <StatusBadge status={test.derived_status} />
                    </div>
                  </div>

                  {/* Quick Summary Row */}
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground font-normal">
                    {/* Duration */}
                    <span className="flex items-center gap-1.5">
                      <Clock className="size-3.5 shrink-0 text-muted-foreground/70" />
                      {test.time_limit_seconds ? formatDuration(test.time_limit_seconds) : "Untimed"}
                    </span>

                    {/* Questions */}
                    <span className="flex items-center gap-1.5">
                      <ListCheck className="size-3.5 shrink-0 text-muted-foreground/70" />
                      {test.question_count} Qs
                    </span>

                    {/* Total Marks */}
                    {test.total_marks != null && test.total_marks > 0 && (
                      <span className="flex items-center gap-1.5">
                        <Award className="size-3.5 shrink-0 text-muted-foreground/70" />
                        {test.total_marks} marks
                      </span>
                    )}

                    {/* Submissions */}
                    <span className="flex items-center gap-1.5">
                      <Users className="size-3.5 shrink-0 text-muted-foreground/70" />
                      {test.attempt_count} {test.attempt_count === 1 ? "attempt" : "attempts"}
                    </span>
                  </div>
                </div>

                {/* Animated Chevron Indicator */}
                <div className="pt-0.5 shrink-0 text-muted-foreground/70 transition-transform duration-200">
                  <ChevronDown
                    className={cn(
                      "size-4 shrink-0 transition-transform duration-200",
                      isOpen && "rotate-180 text-foreground"
                    )}
                  />
                </div>
              </div>

              <AccordionContent className="px-4 pb-4 sm:px-5 sm:pb-5 pt-0">
                <div className="space-y-3 pt-3 border-t">
                  {/* Secondary Info Grid */}
                  <div className="rounded-lg bg-muted/40 p-3 text-xs border space-y-2">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-muted-foreground">
                      {/* Performance / Average Score */}
                      <div className="flex items-center gap-2">
                        <BarChart3 className="size-3.5 shrink-0 text-muted-foreground/70" />
                        <span>Average Score:</span>
                        <span className="font-medium text-foreground">
                          {test.attempt_count > 0 && test.avg_score_pct != null
                            ? `${Math.round(test.avg_score_pct)}%`
                            : "No attempts yet"}
                        </span>
                      </div>

                      {/* Creator / Publisher */}
                      {test.creator && (test.creator.full_name || test.creator.email) && (
                        <div className="flex items-center gap-2 truncate">
                          <User className="size-3.5 shrink-0 text-muted-foreground/70" />
                          <span>Publisher:</span>
                          <HoverCard openDelay={200} closeDelay={150}>
                            <HoverCardTrigger asChild>
                              <span
                                className="font-medium text-foreground truncate hover:text-primary underline decoration-dotted underline-offset-2 transition-colors cursor-pointer"
                                onClick={(e) => e.stopPropagation()}
                              >
                                {test.creator.full_name || test.creator.email}
                              </span>
                            </HoverCardTrigger>
                            <HoverCardContent
                              className="w-72 p-3.5 shadow-xl border border-border/60 bg-popover text-popover-foreground rounded-xl"
                              side="top"
                              align="start"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <div className="flex items-start gap-3">
                                <Avatar className="size-10 shrink-0 border border-border/50 shadow-xs">
                                  <AvatarImage src={test.creator.avatar_url || undefined} alt={test.creator.full_name || ""} />
                                  <AvatarFallback className="text-xs font-semibold bg-primary/10 text-primary">
                                    {(test.creator.full_name || test.creator.email || "P").slice(0, 1).toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="flex flex-col min-w-0 flex-1 gap-0.5">
                                  <p className="text-sm font-semibold text-foreground truncate leading-tight">
                                    {test.creator.full_name || "Staff Member"}
                                  </p>
                                  {test.creator.email && (
                                    <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
                                      {test.creator.email}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </HoverCardContent>
                          </HoverCard>
                        </div>
                      )}

                      {/* Available From */}
                      <div className="flex items-center gap-2">
                        <CalendarClock className="size-3.5 shrink-0 text-muted-foreground/70" />
                        <span>Starts:</span>
                        <span className="font-medium text-foreground">
                          {test.available_from ? formatDateTime(test.available_from) : "Immediate"}
                        </span>
                      </div>

                      {/* Available Until */}
                      <div className="flex items-center gap-2">
                        <CalendarClock className="size-3.5 shrink-0 text-muted-foreground/70" />
                        <span>Deadline:</span>
                        <span className="font-medium text-foreground">
                          {test.available_until ? formatDateTime(test.available_until) : "No deadline"}
                        </span>
                      </div>

                      {/* Results Visibility */}
                      <div className="flex items-center gap-2">
                        {test.results_available ? (
                          <Eye className="size-3.5 shrink-0 text-muted-foreground/70" />
                        ) : (
                          <EyeOff className="size-3.5 shrink-0 text-muted-foreground/70" />
                        )}
                        <span>Results:</span>
                        <span className="font-medium text-foreground">
                          {test.results_available ? "Visible to candidates" : "Hidden"}
                        </span>
                      </div>

                      {/* Marks Visibility */}
                      <div className="flex items-center gap-2">
                        {test.marks_available ? (
                          <Eye className="size-3.5 shrink-0 text-muted-foreground/70" />
                        ) : (
                          <EyeOff className="size-3.5 shrink-0 text-muted-foreground/70" />
                        )}
                        <span>Marks:</span>
                        <span className="font-medium text-foreground">
                          {test.marks_available ? "Visible to candidates" : "Hidden"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Bottom CTA Action Bar */}
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pt-1">
                    <div className="grid grid-cols-2 gap-1.5 w-full sm:w-auto">
                      <Button
                        type="button"
                        variant="outline"
                        size="xs"
                        onClick={handleCopyLink}
                        className="h-8 gap-1.5 text-xs font-normal justify-center"
                      >
                        <Copy className="size-3.5" />
                        <span>Copy Link</span>
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="xs"
                        asChild
                        className="h-8 gap-1.5 text-xs font-normal justify-center"
                      >
                        <Link href={`/tests/${test.id}/edit`} prefetch={false}>
                          <PenLine className="size-3.5" />
                          <span>Edit Test</span>
                        </Link>
                      </Button>
                    </div>

                    <Button
                      type="button"
                      size="xs"
                      asChild
                      className="w-full sm:w-auto h-8 gap-1.5 text-xs font-medium justify-center px-3"
                    >
                      <Link href={`/tests/${test.id}`} prefetch={false}>
                        <span>View Test</span>
                        <ExternalLink className="size-3.5" />
                      </Link>
                    </Button>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </Card>
      </ContextMenuTrigger>
      <ContextMenuContent className="w-48">
        <ContextMenuItem onClick={() => window.open(`/tests/${test.id}`, "_blank")}>
          <ExternalLink className="size-4 mr-2" />
          Open in New Tab
        </ContextMenuItem>
        <ContextMenuItem onClick={handleCopyLink}>
          <Copy className="size-4 mr-2" />
          Copy Link
        </ContextMenuItem>
        <ContextMenuItem asChild>
          <Link href={`/tests/${test.id}/edit`} prefetch={false}>
            <PenLine className="size-4 mr-2" />
            Edit Settings
          </Link>
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  )
})


// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  tests: InstituteTest[]
  serverNow: string
  initialPageSize: number
  initialSearch: string
  initialTab: string
  initialSort?: string
  initialDuration?: string
  initialQuestions?: string
  initialResults?: string
  initialMarks?: string
  initialAttempts?: string
  initialAuthor?: string
  currentUserId?: string
  totalCount: number
  tabCounts: { all: number; live: number; upcoming: number; past: number; drafts: number }
}

export function InstituteTestsClient({
  tests,
  serverNow,
  initialPageSize,
  initialSearch,
  initialTab,
  initialSort = "",
  initialDuration = "all",
  initialQuestions = "all",
  initialResults = "all",
  initialMarks = "all",
  initialAttempts = "all",
  initialAuthor = "all",
  currentUserId,
  totalCount,
  tabCounts,
}: Props) {
  const router = useRouter()
  const pathname = usePathname()

  const [isPending, startTransition] = useTransition()
  const [filterSheetOpen, setFilterSheetOpen] = useState(false)

  // Local state for search input text
  const [searchInput, setSearchInput] = useState(initialSearch)
  const searchInputRef = useRef<HTMLInputElement>(null)

  // Tracks whether the last URL change was triggered by our own debounce
  const isOwnUpdateRef = useRef(false)

  // Sync search input ONLY on external navigation (back/forward)
  useEffect(() => {
    if (isOwnUpdateRef.current) {
      isOwnUpdateRef.current = false
      return
    }
    setSearchInput(initialSearch)
  }, [initialSearch])

  // Keyboard shortcut listener: '/' or 'Cmd+K' / 'Ctrl+K' to focus search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      const isInput =
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.isContentEditable

      if (
        (e.key === "/" && !isInput) ||
        ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k")
      ) {
        e.preventDefault()
        searchInputRef.current?.focus()
        searchInputRef.current?.select()
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [])

  // Helper to push updated search parameters to the URL
  const updateParams = useCallback(
    (newParams: Partial<Record<string, string | number>>) => {
      const params = new URLSearchParams(window.location.search)
      Object.entries(newParams).forEach(([key, val]) => {
        if (
          val === undefined ||
          val === "" ||
          val === null ||
          val === "all" ||
          val === "default"
        ) {
          params.delete(key)
        } else {
          params.set(key, String(val))
        }
      })
      startTransition(() => {
        const queryStr = params.toString()
        router.push(queryStr ? `${pathname}?${queryStr}` : pathname, { scroll: false })
      })
    },
    [pathname, router]
  )

  // Debounce search input
  useEffect(() => {
    if (searchInput === initialSearch) return

    const timer = setTimeout(() => {
      isOwnUpdateRef.current = true
      updateParams({ search: searchInput })
    }, 400)
    return () => clearTimeout(timer)
  }, [searchInput, initialSearch, updateParams])

  const activeTab = (initialTab || "all") as Tab
  const activeSort = initialSort || "default"
  const activeDuration = initialDuration || "all"
  const activeQuestions = initialQuestions || "all"
  const activeResults = initialResults || "all"
  const activeMarks = initialMarks || "all"
  const activeAttempts = initialAttempts || "all"
  const activeAuthor = initialAuthor || "all"

  // Local draft filter states for the Filter Sheet (applied only on "Apply" click)
  const [draftTab, setDraftTab] = useState<Tab>(activeTab)
  const [draftSort, setDraftSort] = useState(activeSort)
  const [draftDuration, setDraftDuration] = useState(activeDuration)
  const [draftQuestions, setDraftQuestions] = useState(activeQuestions)
  const [draftResults, setDraftResults] = useState(activeResults)
  const [draftMarks, setDraftMarks] = useState(activeMarks)
  const [draftAttempts, setDraftAttempts] = useState(activeAttempts)
  const [draftAuthor, setDraftAuthor] = useState(activeAuthor)

  // Sync draft state whenever sheet is opened
  const handleSheetOpenChange = (open: boolean) => {
    if (open) {
      setDraftTab(activeTab)
      setDraftSort(activeSort)
      setDraftDuration(activeDuration)
      setDraftQuestions(activeQuestions)
      setDraftResults(activeResults)
      setDraftMarks(activeMarks)
      setDraftAttempts(activeAttempts)
      setDraftAuthor(activeAuthor)
    }
    setFilterSheetOpen(open)
  }

  // Count active filters in draft state (for the reset button & apply badge inside sheet)
  const draftFilterCount = useMemo(() => {
    let count = 0
    if (draftTab !== "all") count++
    if (draftSort && draftSort !== "default") count++
    if (draftDuration !== "all") count++
    if (draftQuestions !== "all") count++
    if (draftResults !== "all") count++
    if (draftMarks !== "all") count++
    if (draftAttempts !== "all") count++
    if (draftAuthor !== "all") count++
    return count
  }, [
    draftTab,
    draftSort,
    draftDuration,
    draftQuestions,
    draftResults,
    draftMarks,
    draftAttempts,
    draftAuthor,
  ])

  // Reset draft filters inside sheet to defaults
  const handleResetDraft = () => {
    setDraftTab("all")
    setDraftSort("default")
    setDraftDuration("all")
    setDraftQuestions("all")
    setDraftResults("all")
    setDraftMarks("all")
    setDraftAttempts("all")
    setDraftAuthor("all")
  }

  // Apply draft filters to URL
  const handleApplyFilters = () => {
    updateParams({
      tab: draftTab,
      sort: draftSort,
      duration: draftDuration,
      questions: draftQuestions,
      results: draftResults,
      marks: draftMarks,
      attempts: draftAttempts,
      author: draftAuthor,
    })
    setFilterSheetOpen(false)
  }

  // Count active filters
  const activeFilterCount = useMemo(() => {
    let count = 0
    if (activeTab !== "all") count++
    if (activeSort && activeSort !== "default") count++
    if (activeDuration !== "all") count++
    if (activeQuestions !== "all") count++
    if (activeResults !== "all") count++
    if (activeMarks !== "all") count++
    if (activeAttempts !== "all") count++
    if (activeAuthor !== "all") count++
    return count
  }, [
    activeTab,
    activeSort,
    activeDuration,
    activeQuestions,
    activeResults,
    activeMarks,
    activeAttempts,
    activeAuthor,
  ])

  // Reset all filters, sorting, and search back to clean defaults
  const handleResetAll = useCallback(() => {
    isOwnUpdateRef.current = true
    setSearchInput("")
    startTransition(() => {
      router.push(pathname, { scroll: false })
    })
  }, [pathname, router])

  // ── Server Time Sync ───────────────────────────────────────────────────────
  const serverTimeOffset = useMemo(() => {
    return new Date(serverNow).getTime() - Date.now()
  }, [serverNow])

  const getNowOnServer = useCallback(() => {
    return new Date(Date.now() + serverTimeOffset)
  }, [serverTimeOffset])

  const [now, setNow] = useState(getNowOnServer)

  useEffect(() => {
    const id = setInterval(() => setNow(getNowOnServer()), 10000)
    return () => clearInterval(id)
  }, [getNowOnServer])

  // Infinite scroll states
  const [items, setItems] = useState<InstituteTest[]>(tests)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(tests.length < totalCount)
  const [loadingMore, setLoadingMore] = useState(false)

  useEffect(() => {
    setItems(tests)
    setPage(1)
    setHasMore(tests.length < totalCount)
  }, [tests, totalCount])

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore || isPending) return
    setLoadingMore(true)
    try {
      const nextPage = page + 1
      const res = await getInstituteTestsAction({
        page: nextPage,
        size: initialPageSize,
        search: initialSearch,
        tab: activeTab,
        sort: activeSort === "default" ? "" : activeSort,
        duration: activeDuration,
        questions: activeQuestions,
        results: activeResults,
        marks: activeMarks,
        attempts: activeAttempts,
        author: activeAuthor,
        now: serverNow,
      })

      setItems((prev) => {
        const existingIds = new Set(prev.map((i) => i.id))
        const newItems = res.tests.filter((t) => !existingIds.has(t.id))
        const updated = [...prev, ...newItems]
        setHasMore(updated.length < res.count)
        return updated
      })
      setPage(nextPage)
    } catch (e) {
      console.error("Error loading more tests:", e)
      toast.error("Failed to load more tests")
    } finally {
      setLoadingMore(false)
    }
  }, [
    loadingMore,
    hasMore,
    isPending,
    page,
    initialPageSize,
    initialSearch,
    activeTab,
    activeSort,
    activeDuration,
    activeQuestions,
    activeResults,
    activeMarks,
    activeAttempts,
    activeAuthor,
    serverNow,
  ])

  const observerTarget = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore && !isPending) {
          loadMore()
        }
      },
      { threshold: 0.1 }
    )

    const target = observerTarget.current
    if (target) {
      observer.observe(target)
    }

    return () => {
      if (target) {
        observer.unobserve(target)
      }
    }
  }, [loadMore, hasMore, loadingMore, isPending])

  // Dynamically re-derive status on the client with synced server time
  // Re-uses object references if status hasn't changed to maximize React.memo effectiveness
  const enrichedTests = useMemo(() => {
    return items.map((t) => {
      const newStatus = deriveStatus(
        t.status,
        t.available_from,
        t.available_until,
        now
      ) as DerivedInstituteStatus
      if (t.derived_status === newStatus) return t
      return { ...t, derived_status: newStatus }
    })
  }, [items, now])

  const tabConfig: TabConfig[] = [
    {
      value: "all",
      label: "All",
      count: tabCounts.all,
    },
    {
      value: "live",
      label: "Live",
      count: tabCounts.live,
    },
    {
      value: "upcoming",
      label: "Upcoming",
      count: tabCounts.upcoming,
    },
    {
      value: "past",
      label: "Ended",
      count: tabCounts.past,
    },
    {
      value: "drafts",
      label: "Drafts",
      count: tabCounts.drafts,
    },
  ]

  const sortOptions = [
    { value: "default", label: "Default (Status Recommended)" },
    { value: "created_desc", label: "Newest Created" },
    { value: "created_asc", label: "Oldest Created" },
    { value: "title_asc", label: "Title (A → Z)" },
    { value: "title_desc", label: "Title (Z → A)" },
    { value: "questions_desc", label: "Most Questions" },
    { value: "questions_asc", label: "Fewest Questions" },
    { value: "attempts_desc", label: "Most Submissions" },
    { value: "attempts_asc", label: "Fewest Submissions" },
    { value: "duration_desc", label: "Longest Duration" },
    { value: "duration_asc", label: "Shortest Duration" },
    { value: "deadline_asc", label: "Ending Soonest" },
    { value: "deadline_desc", label: "Ending Latest" },
  ]

  const authorOptions = [
    { value: "all", label: "All Creators" },
    { value: "me", label: "Created by Me" },
    { value: "others", label: "Other Staff" },
  ]

  const durationOptions = [
    { value: "all", label: "All" },
    { value: "untimed", label: "Untimed" },
    { value: "under_30", label: "< 30m" },
    { value: "30_60", label: "30–60m" },
    { value: "over_60", label: "> 60m" },
  ]

  const questionsOptions = [
    { value: "all", label: "All" },
    { value: "has_questions", label: "Has Questions (≥ 1)" },
    { value: "no_questions", label: "Empty (0 Qs)" },
  ]

  const visibilityOptions = [
    { value: "all", label: "All" },
    { value: "visible", label: "Visible" },
    { value: "hidden", label: "Hidden" },
  ]

  const attemptsOptions = [
    { value: "all", label: "All" },
    { value: "has_attempts", label: "With Attempts" },
    { value: "no_attempts", label: "No Attempts" },
  ]

  const activeSortLabel = useMemo(() => {
    const match = sortOptions.find((o) => o.value === activeSort)
    return match && match.value !== "default" ? match.label : null
  }, [activeSort, sortOptions])

  const handleCreate = () => router.push("/tests/new/edit")

  return (
    <div className="flex flex-col gap-6 px-4 py-6 sm:py-8 md:px-8 pb-24 sm:pb-8 max-w-full overflow-x-hidden">

      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold font-cirka tracking-tight text-foreground">Tests</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage, schedule, and review assessment tests for your institute.
          </p>
        </div>
        <Button onClick={handleCreate} className="hidden sm:inline-flex gap-2 shrink-0">
          <Plus className="size-4" />
          <span>Create Test</span>
        </Button>
      </div>

      {/* ── Controls Toolbar ── */}
      <div className="space-y-4">

        {/* Search Bar + Filter Trigger */}
        <div className="flex items-center gap-2 w-full min-w-0">
          <InputGroup className="flex-1 min-w-0">
            <InputGroupAddon align="inline-start">
              {isPending ? (
                <Loader2 className="size-4 text-primary animate-spin" />
              ) : (
                <Search className="size-4 text-muted-foreground" />
              )}
            </InputGroupAddon>
            <InputGroupInput
              ref={searchInputRef}
              placeholder="Search tests by title or description..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="min-w-0"
            />
            <InputGroupAddon align="inline-end">
              {searchInput ? (
                <InputGroupButton
                  size="icon-xs"
                  variant="ghost"
                  onClick={() => {
                    isOwnUpdateRef.current = true
                    setSearchInput("")
                    updateParams({ search: "" })
                  }}
                  aria-label="Clear search"
                >
                  <X className="size-3.5" />
                </InputGroupButton>
              ) : (
                <Kbd className="hidden sm:inline-flex items-center gap-0.5 text-[11px] px-1.5 h-5 border border-border/80 bg-muted/80 font-medium">
                  <Command className="size-3" />
                  <span>K</span>
                </Kbd>
              )}
            </InputGroupAddon>
          </InputGroup>

          {/* Filter Sheet Trigger */}
          <Sheet open={filterSheetOpen} onOpenChange={handleSheetOpenChange}>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm" className="h-9 gap-1.5 shrink-0 px-2.5 sm:px-3">
                <SlidersHorizontal className="size-4" />
                <span>Filters</span>
                {activeFilterCount > 0 && (
                  <Badge variant="secondary" className="h-4 px-1 text-[10px] font-semibold">
                    {activeFilterCount}
                  </Badge>
                )}
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="flex flex-col gap-0 p-0 sm:max-w-md">
              <SheetHeader className="p-5 sm:p-6 border-b">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <SheetTitle className="text-base font-semibold">Filters & Sorting</SheetTitle>
                    {draftFilterCount > 0 && (
                      <Badge variant="secondary" className="h-4.5 px-1.5 text-[10px] font-semibold">
                        {draftFilterCount} active
                      </Badge>
                    )}
                  </div>
                  {draftFilterCount > 0 && (
                    <Button
                      variant="ghost"
                      size="xs"
                      onClick={handleResetDraft}
                      className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
                    >
                      <RotateCcw className="size-3 mr-1" />
                      Reset
                    </Button>
                  )}
                </div>
                <SheetDescription className="text-xs">
                  Refine test catalog and customize list ordering.
                </SheetDescription>
              </SheetHeader>

              <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">

                {/* 1. Sort Order Dropdown */}
                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Sort By
                  </Label>
                  <Select value={draftSort} onValueChange={setDraftSort}>
                    <SelectTrigger className="w-full h-9 text-xs">
                      <SelectValue placeholder="Select sort order" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectLabel className="text-xs font-semibold">Recommended</SelectLabel>
                        <SelectItem value="default">Default (Status Recommended)</SelectItem>
                        <SelectItem value="created_desc">Newest Created</SelectItem>
                        <SelectItem value="created_asc">Oldest Created</SelectItem>
                      </SelectGroup>
                      <SelectSeparator />
                      <SelectGroup>
                        <SelectLabel className="text-xs font-semibold">Alphabetical</SelectLabel>
                        <SelectItem value="title_asc">Title (A → Z)</SelectItem>
                        <SelectItem value="title_desc">Title (Z → A)</SelectItem>
                      </SelectGroup>
                      <SelectSeparator />
                      <SelectGroup>
                        <SelectLabel className="text-xs font-semibold">Questions & Duration</SelectLabel>
                        <SelectItem value="questions_desc">Most Questions</SelectItem>
                        <SelectItem value="questions_asc">Fewest Questions</SelectItem>
                        <SelectItem value="duration_desc">Longest Duration</SelectItem>
                        <SelectItem value="duration_asc">Shortest Duration</SelectItem>
                      </SelectGroup>
                      <SelectSeparator />
                      <SelectGroup>
                        <SelectLabel className="text-xs font-semibold">Submissions & Deadlines</SelectLabel>
                        <SelectItem value="attempts_desc">Most Submissions</SelectItem>
                        <SelectItem value="attempts_asc">Fewest Submissions</SelectItem>
                        <SelectItem value="deadline_asc">Ending Soonest</SelectItem>
                        <SelectItem value="deadline_desc">Ending Latest</SelectItem>
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>

                <Separator />

                {/* 2. Test Status Filter */}
                <div className="space-y-2.5">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Test Status
                  </Label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                    {tabConfig.map(({ value, label, count }) => (
                      <Button
                        key={value}
                        type="button"
                        variant={draftTab === value ? "default" : "outline"}
                        size="sm"
                        onClick={() => setDraftTab(value)}
                        className="h-8 justify-between px-2.5 text-xs font-normal"
                      >
                        <span className="truncate">{label}</span>
                        <Badge
                          variant={draftTab === value ? "secondary" : "outline"}
                          className="ml-1 h-4 px-1 text-[10px] font-medium shrink-0"
                        >
                          {count}
                        </Badge>
                      </Button>
                    ))}
                  </div>
                </div>

                <Separator />

                {/* 3. Author Filter */}
                <div className="space-y-2.5">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Author / Created By
                  </Label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {authorOptions.map(({ value, label }) => (
                      <Button
                        key={value}
                        type="button"
                        variant={draftAuthor === value ? "default" : "outline"}
                        size="sm"
                        onClick={() => setDraftAuthor(value)}
                        className="h-8 justify-center px-2 text-xs font-normal"
                      >
                        <span className="truncate">{label}</span>
                      </Button>
                    ))}
                  </div>
                </div>

                <Separator />

                {/* 4. Duration Filter */}
                <div className="space-y-2.5">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Duration / Time Limit
                  </Label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                    {durationOptions.map(({ value, label }) => (
                      <Button
                        key={value}
                        type="button"
                        variant={draftDuration === value ? "default" : "outline"}
                        size="sm"
                        onClick={() => setDraftDuration(value)}
                        className="h-8 justify-center px-2 text-xs font-normal"
                      >
                        <span className="truncate">{label}</span>
                      </Button>
                    ))}
                  </div>
                </div>

                <Separator />

                {/* 5. Questions Filter */}
                <div className="space-y-2.5">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Questions Content
                  </Label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5">
                    {questionsOptions.map(({ value, label }) => (
                      <Button
                        key={value}
                        type="button"
                        variant={draftQuestions === value ? "default" : "outline"}
                        size="sm"
                        onClick={() => setDraftQuestions(value)}
                        className="h-8 justify-center px-2 text-xs font-normal"
                      >
                        <span className="truncate">{label}</span>
                      </Button>
                    ))}
                  </div>
                </div>

                <Separator />

                {/* 6. Submissions Filter */}
                <div className="space-y-2.5">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Candidate Submissions
                  </Label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5">
                    {attemptsOptions.map(({ value, label }) => (
                      <Button
                        key={value}
                        type="button"
                        variant={draftAttempts === value ? "default" : "outline"}
                        size="sm"
                        onClick={() => setDraftAttempts(value)}
                        className="h-8 justify-center px-2 text-xs font-normal"
                      >
                        <span className="truncate">{label}</span>
                      </Button>
                    ))}
                  </div>
                </div>

                <Separator />

                {/* 7. Visibility Settings */}
                <div className="space-y-3">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Visibility Settings
                  </Label>

                  <div className="space-y-1.5">
                    <span className="text-[11px] font-medium text-muted-foreground">Results Visibility</span>
                    <div className="grid grid-cols-3 gap-1.5">
                      {visibilityOptions.map(({ value, label }) => (
                        <Button
                          key={value}
                          type="button"
                          variant={draftResults === value ? "default" : "outline"}
                          size="sm"
                          onClick={() => setDraftResults(value)}
                          className="h-7 justify-center px-2 text-xs font-normal"
                        >
                          {label}
                        </Button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <span className="text-[11px] font-medium text-muted-foreground">Marks Visibility</span>
                    <div className="grid grid-cols-3 gap-1.5">
                      {visibilityOptions.map(({ value, label }) => (
                        <Button
                          key={value}
                          type="button"
                          variant={draftMarks === value ? "default" : "outline"}
                          size="sm"
                          onClick={() => setDraftMarks(value)}
                          className="h-7 justify-center px-2 text-xs font-normal"
                        >
                          {label}
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>

              </div>

              <SheetFooter className="p-4 border-t flex flex-row items-center justify-between gap-2 bg-muted/20 shrink-0">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={draftFilterCount === 0}
                  onClick={handleResetDraft}
                  className="h-8 text-xs font-normal"
                >
                  Reset All
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={handleApplyFilters}
                  className="h-8 text-xs font-medium gap-1.5 px-4"
                >
                  <span>Apply Filters</span>
                  {draftFilterCount > 0 && (
                    <Badge
                      variant="secondary"
                      className="h-4 px-1 text-[10px] font-semibold bg-primary-foreground/20 text-primary-foreground"
                    >
                      {draftFilterCount}
                    </Badge>
                  )}
                </Button>
              </SheetFooter>
            </SheetContent>
          </Sheet>
        </div>

        {/* Active Filter Badges Bar */}
        {activeFilterCount > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <span className="text-xs text-muted-foreground">Active filters:</span>

            {/* Status */}
            {activeTab !== "all" && (
              <Badge variant="secondary" className="gap-1 font-normal">
                Status: <span className="font-medium capitalize">{activeTab}</span>
                <button
                  type="button"
                  onClick={() => updateParams({ tab: "all" })}
                  className="hover:opacity-70 ml-0.5 rounded-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  aria-label="Remove status filter"
                >
                  <X className="size-3" />
                </button>
              </Badge>
            )}

            {/* Author */}
            {activeAuthor !== "all" && (
              <Badge variant="secondary" className="gap-1 font-normal">
                Author:{" "}
                <span className="font-medium">
                  {authorOptions.find((a) => a.value === activeAuthor)?.label}
                </span>
                <button
                  type="button"
                  onClick={() => updateParams({ author: "all" })}
                  className="hover:opacity-70 ml-0.5 rounded-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  aria-label="Remove author filter"
                >
                  <X className="size-3" />
                </button>
              </Badge>
            )}

            {/* Sort */}
            {activeSort !== "default" && activeSortLabel && (
              <Badge variant="secondary" className="gap-1 font-normal">
                Sort: <span className="font-medium">{activeSortLabel}</span>
                <button
                  type="button"
                  onClick={() => updateParams({ sort: "default" })}
                  className="hover:opacity-70 ml-0.5 rounded-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  aria-label="Remove sort filter"
                >
                  <X className="size-3" />
                </button>
              </Badge>
            )}

            {/* Duration */}
            {activeDuration !== "all" && (
              <Badge variant="secondary" className="gap-1 font-normal">
                Duration:{" "}
                <span className="font-medium">
                  {durationOptions.find((d) => d.value === activeDuration)?.label}
                </span>
                <button
                  type="button"
                  onClick={() => updateParams({ duration: "all" })}
                  className="hover:opacity-70 ml-0.5 rounded-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  aria-label="Remove duration filter"
                >
                  <X className="size-3" />
                </button>
              </Badge>
            )}

            {/* Questions */}
            {activeQuestions !== "all" && (
              <Badge variant="secondary" className="gap-1 font-normal">
                Questions:{" "}
                <span className="font-medium">
                  {questionsOptions.find((q) => q.value === activeQuestions)?.label}
                </span>
                <button
                  type="button"
                  onClick={() => updateParams({ questions: "all" })}
                  className="hover:opacity-70 ml-0.5 rounded-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  aria-label="Remove questions filter"
                >
                  <X className="size-3" />
                </button>
              </Badge>
            )}

            {/* Results */}
            {activeResults !== "all" && (
              <Badge variant="secondary" className="gap-1 font-normal">
                Results: <span className="font-medium capitalize">{activeResults}</span>
                <button
                  type="button"
                  onClick={() => updateParams({ results: "all" })}
                  className="hover:opacity-70 ml-0.5 rounded-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  aria-label="Remove results filter"
                >
                  <X className="size-3" />
                </button>
              </Badge>
            )}

            {/* Marks */}
            {activeMarks !== "all" && (
              <Badge variant="secondary" className="gap-1 font-normal">
                Marks: <span className="font-medium capitalize">{activeMarks}</span>
                <button
                  type="button"
                  onClick={() => updateParams({ marks: "all" })}
                  className="hover:opacity-70 ml-0.5 rounded-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  aria-label="Remove marks filter"
                >
                  <X className="size-3" />
                </button>
              </Badge>
            )}

            {/* Attempts */}
            {activeAttempts !== "all" && (
              <Badge variant="secondary" className="gap-1 font-normal">
                Attempts:{" "}
                <span className="font-medium">
                  {attemptsOptions.find((a) => a.value === activeAttempts)?.label}
                </span>
                <button
                  type="button"
                  onClick={() => updateParams({ attempts: "all" })}
                  className="hover:opacity-70 ml-0.5 rounded-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  aria-label="Remove attempts filter"
                >
                  <X className="size-3" />
                </button>
              </Badge>
            )}

            <Button
              variant="ghost"
              size="xs"
              onClick={handleResetAll}
              className="h-5 text-muted-foreground hover:text-foreground text-xs"
            >
              Clear all
            </Button>
          </div>
        )}
      </div>

      {/* ── Test Cards List Area ── */}
      <div className="relative">
        {isPending && (
          <div className="absolute inset-0 z-50 bg-background/50 backdrop-blur-[1px] rounded-lg flex items-center justify-center min-h-48">
            <div className="flex items-center gap-2 rounded-md border bg-popover px-4 py-2 shadow-sm">
              <Loader2 className="size-4 animate-spin text-primary" />
              <span className="text-xs text-muted-foreground">Updating tests...</span>
            </div>
          </div>
        )}

        <div className={cn("space-y-3 transition-opacity duration-150", isPending && "opacity-40 pointer-events-none")}>
          {totalCount === 0 ? (
            <Empty className="border border-dashed rounded-xl p-12">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <FlaskConical className="size-5" />
                </EmptyMedia>
                <EmptyTitle>
                  {activeFilterCount > 0 || searchInput.trim() !== ""
                    ? "No matching tests found"
                    : "No tests created yet"}
                </EmptyTitle>
                <EmptyDescription>
                  {activeFilterCount > 0 || searchInput.trim() !== ""
                    ? "Try adjusting your search terms or resetting active filters."
                    : "Get started by creating your first assessment test for students."}
                </EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                {activeFilterCount > 0 || searchInput.trim() !== "" ? (
                  <Button variant="outline" size="sm" onClick={handleResetAll}>
                    Clear Filters
                  </Button>
                ) : (
                  <Button size="sm" onClick={handleCreate} className="gap-1.5">
                    <Plus className="size-4" />
                    Create Test
                  </Button>
                )}
              </EmptyContent>
            </Empty>
          ) : (
            <>
              <div className="grid gap-3">
                {enrichedTests.map((t) => (
                  <TestCard
                    key={t.id}
                    test={t}
                  />
                ))}
              </div>

              {/* Infinite Scroll Loader Target */}
              <div ref={observerTarget} className="flex justify-center items-center py-6 w-full min-h-12">
                {loadingMore && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Loader2 className="size-4 animate-spin text-primary" />
                    Loading more tests...
                  </div>
                )}
                {!hasMore && items.length > 0 && (
                  <span className="text-xs text-muted-foreground">
                    Showing all {totalCount} tests
                  </span>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Mobile Floating Action Button (FAB) ── */}
      <div className="fixed bottom-6 right-6 z-40 sm:hidden">
        <Button
          onClick={handleCreate}
          size="icon"
          className="size-12 rounded-full shadow-lg hover:shadow-xl transition-all active:scale-95 bg-primary text-primary-foreground flex items-center justify-center"
          aria-label="Create Test"
        >
          <Plus className="size-6" />
        </Button>
      </div>

    </div>
  )
}