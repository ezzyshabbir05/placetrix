/* eslint-disable @typescript-eslint/no-unused-vars */
"use client"

// ─────────────────────────────────────────────────────────────────────────────
// app/~/tests/CandidateTestsClient.tsx
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useMemo, useCallback, useEffect, useTransition } from "react"
import Link from "next/link"
import { useRouter, usePathname, useSearchParams } from "next/navigation"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  CalendarClock,
  PlayCircle,
  Clock,
  FileText,
  AlertCircle,
  BookOpen,
  Search,
  X,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Loader2,
} from "lucide-react"
import { cn } from "@/lib/utils"
import type { CandidateTest, DerivedCandidateStatus } from "./_types"
import { deriveStatus } from "./_types"


// ─── Types ────────────────────────────────────────────────────────────────────

type Tab = "live" | "upcoming" | "past"

interface TabConfig {
  value: Tab
  label: string
  icon: React.ReactNode
  count: number
}


// ─── Utils ────────────────────────────────────────────────────────────────────

export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (h > 0 && m > 0) return `${h}h` // Matching image standard ("1h")
  if (h > 0) return `${h}h`
  return `${m}m`
}

export function formatDateTime(dt?: string): string {
  if (!dt) return "—"
  // Format matching: "24 Apr 2026, 1:32 pm"
  return new Date(dt).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).replace(/ am/i, " am").replace(/ pm/i, " pm")
}


// ─── Status Badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: DerivedCandidateStatus }) {
  if (status === "live") {
    return (
      <Badge className="gap-1.5 bg-emerald-500 hover:bg-emerald-500 text-white border-0 text-[11px] px-2 py-0.5 rounded-full">
        <span className="relative flex h-1.5 w-1.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-white" />
        </span>
        Live
      </Badge>
    )
  }
  if (status === "upcoming") {
    return (
      <Badge variant="secondary" className="gap-1 text-[11px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 border-0">
        Upcoming
      </Badge>
    )
  }
  return (
    <Badge variant="outline" className="gap-1 text-[11px] px-2 py-0.5 text-muted-foreground bg-secondary/40 font-medium rounded-full border border-muted-foreground/20">
      <Clock className="h-3 w-3 text-muted-foreground/70" />
      Ended
    </Badge>
  )
}


// ─── Test Card ────────────────────────────────────────────────────────────────

function TestCard({ test }: { test: CandidateTest }) {
  const isSubmitted = test.attempt?.status === "submitted"
  const isInProgress = test.attempt?.status === "in_progress"

  return (
    <Card className="border shadow-none hover:border-muted-foreground/20 transition-colors overflow-hidden p-0 rounded-2xl">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between p-6 gap-6">

        {/* Left: Title, Description, Status */}
        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h3 className="text-base font-bold tracking-tight text-foreground">{test.title}</h3>
            <StatusBadge status={test.derived_status} />
          </div>
          <p className={cn(
            "text-sm text-muted-foreground max-w-2xl leading-relaxed",
            !test.description && "italic text-muted-foreground/50"
          )}>
            {test.description ?? "No description provided"}
          </p>
        </div>

        {/* Middle/Right Container: Fixed standard columns to perfectly match desktop view */}
        <div className="flex flex-wrap lg:flex-nowrap items-center gap-x-8 gap-y-4 text-sm text-muted-foreground  lg:border-t-0 pt-4 lg:pt-0">
          
          {/* Duration Column */}
          <div className="flex flex-col gap-1 min-w-[90px]">
            <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground/70">Duration</span>
            <span className="flex items-center gap-1.5 font-medium text-foreground">
              <Clock className="h-4 w-4 text-muted-foreground/60" />
              {test.time_limit_seconds ? formatDuration(test.time_limit_seconds) : "No time limit"}
            </span>
          </div>

          {/* Availability Column */}
          <div className="flex flex-col gap-1 min-w-[160px]">
            <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground/70">Availability</span>
            <span className="flex items-center gap-1.5 font-medium text-foreground">
              <CalendarClock className="h-4 w-4 text-muted-foreground/60" />
              {test.available_from ? formatDateTime(test.available_from) : "No schedule set"}
            </span>
          </div>

          {/* Status Column */}
          <div className="flex flex-col gap-1 min-w-[200px]">
            <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground/70">Status</span>

            {/* Past – not attempted */}
            {test.derived_status === "past" && !test.attempt && (
              <span className="flex items-center gap-1.5 font-medium text-muted-foreground/80">
                <AlertCircle className="h-4 w-4 text-muted-foreground/60" />
                Not attempted
              </span>
            )}

            {/* In-progress indicator */}
            {isInProgress && (
              <span className="flex items-center gap-1.5 font-medium text-amber-600 dark:text-amber-400">
                <Clock className="h-4 w-4 animate-spin-slow" />
                In progress
              </span>
            )}

            {/* Submitted state */}
            {isSubmitted && (
              <div className="flex flex-col gap-0.5">
                <span className="font-medium text-foreground">
                  {test.attempt?.submitted_at
                    ? `Submitted ${formatDateTime(test.attempt.submitted_at)}`
                    : "Submitted"
                  }
                </span>
                {test.results_available && test.attempt?.percentage != null && (
                  <span className="font-bold text-foreground text-sm">
                    {test.attempt.score}/{test.attempt.total_marks}{" "}
                    <span className="text-xs font-normal text-muted-foreground">
                      ({test.attempt.percentage.toFixed(1)}%)
                    </span>
                  </span>
                )}
              </div>
            )}

            {/* Upcoming note */}
            {test.derived_status === "upcoming" && (
              <span className="font-medium text-foreground">
                {test.available_from
                  ? `Opens ${formatDateTime(test.available_from)}`
                  : "Not scheduled"
                }
              </span>
            )}
          </div>

          {/* Action Action Button */}
          <div className="shrink-0 w-full sm:w-auto pt-2 lg:pt-0 pl-0 lg:pl-4">
            <Button asChild variant="outline" size="sm" className="w-full sm:w-auto rounded-xl font-medium px-4 border-muted-foreground/20 text-foreground hover:bg-secondary/50">
              <Link href={`tests/${test.id}`}>View Details</Link>
            </Button>
          </div>

        </div>

      </div>
    </Card>
  )
}


// ─── Empty State ──────────────────────────────────────────────────────────────

function EmptyState({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center gap-3 border border-dashed rounded-2xl bg-muted/20">
      <div className="h-12 w-12 rounded-xl bg-muted flex items-center justify-center">
        <BookOpen className="h-5 w-5 text-muted-foreground/60" />
      </div>
      <div className="space-y-0.5">
        <p className="text-sm font-medium">No {label} tests found</p>
        <p className="text-xs text-muted-foreground">Check back later or adjust your search filter.</p>
      </div>
    </div>
  )
}


// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  tests: CandidateTest[]
  serverNow: string
  initialPage: number
  initialPageSize: number
  initialSearch: string
  initialTab: string
  totalCount: number
  tabCounts: { live: number; upcoming: number; past: number }
}

export function CandidateTestsClient({
  tests,
  serverNow,
  initialPage,
  initialPageSize,
  initialSearch,
  initialTab,
  totalCount,
  tabCounts,
}: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [isPending, startTransition] = useTransition()
  const [searchInput, setSearchInput] = useState(initialSearch)

  // Sync state cleanly when URL shifts (e.g. forward/back actions)
  useEffect(() => {
    setSearchInput(initialSearch)
  }, [initialSearch])

  // Helper handling functional state parameters mutations smoothly
  const updateParams = useCallback(
    (newParams: Partial<Record<string, string | number>>) => {
      const params = new URLSearchParams(searchParams.toString())
      Object.entries(newParams).forEach(([key, val]) => {
        if (val === undefined || val === "" || val === null) {
          params.delete(key)
        } else {
          params.set(key, String(val))
        }
      })
      startTransition(() => {
        router.push(`${pathname}?${params.toString()}`)
      })
    },
    [pathname, router, searchParams]
  )

  // Robust debounced text input search 
  useEffect(() => {
    if (searchInput === initialSearch) return

    const timer = setTimeout(() => {
      updateParams({ search: searchInput, page: 1 })
    }, 350)

    return () => clearTimeout(timer)
  }, [searchInput, initialSearch, updateParams])

  const activeTab = (initialTab || "live") as Tab

  // ── Server Time Synchronization System ─────────────────────────────────────
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

  // Dynamically enrich/refresh server timeline state evaluations
  const enrichedTests = useMemo(() => {
    return tests.map((t) => ({
      ...t,
      current_derived_status: deriveStatus(
        "published",
        t.available_from,
        t.available_until,
        now
      ) as DerivedCandidateStatus,
    }))
  }, [tests, now])

  const tabConfig: TabConfig[] = [
    { value: "live",     label: "Live",     icon: <PlayCircle    className="h-3.5 w-3.5" />, count: tabCounts.live },
    { value: "upcoming", label: "Upcoming", icon: <CalendarClock className="h-3.5 w-3.5" />, count: tabCounts.upcoming },
    { value: "past",     label: "Past",     icon: <FileText      className="h-3.5 w-3.5" />, count: tabCounts.past },
  ]

  const totalPages = Math.ceil(totalCount / initialPageSize)
  const activePage = Math.min(initialPage, Math.max(1, totalPages))

  return (
    <div className="flex flex-col gap-6 px-4 py-8 md:px-12 max-w-7xl mx-auto w-full">

      {/* Page Header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">My Tests</h1>
        <p className="text-sm text-muted-foreground font-medium">
          {totalCount} test{totalCount !== 1 ? "s" : ""} assigned to you
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => updateParams({ tab: v, page: 1 })} className="w-full">
        <div className="space-y-6">

          {/* Search bar & Tab triggers layout section wrapper */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="relative w-full sm:max-w-xs">
              {isPending ? (
                <Loader2 className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground/70 animate-spin" />
              ) : (
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground/60" />
              )}
              <Input
                placeholder="Search tests..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="pl-9 pr-9 h-9 rounded-xl border-muted-foreground/20 bg-background focus-visible:ring-1"
              />
              {searchInput && (
                <button
                  onClick={() => {
                    setSearchInput("")
                    updateParams({ search: "", page: 1 })
                  }}
                  className="absolute right-3 top-2.5 h-4 w-4 flex items-center justify-center text-muted-foreground/60 hover:text-foreground transition-colors"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            <div className="overflow-x-auto shrink-0 bg-muted/50 p-1 rounded-xl">
              <TabsList className="inline-flex h-8 gap-1 bg-transparent p-0">
                {tabConfig.map(({ value, label, count }) => (
                  <TabsTrigger
                    key={value}
                    value={value}
                    className="gap-2 rounded-lg px-4 h-7 text-xs font-semibold tracking-tight data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm transition-all"
                  >
                    {label}
                    <span className={cn(
                      "inline-flex h-4 min-w-[18px] items-center justify-center rounded-full px-1 text-[10px] font-bold tabular-nums transition-colors",
                      activeTab === value
                        ? "bg-foreground text-background"
                        : "bg-muted-foreground/15 text-muted-foreground"
                    )}>
                      {count}
                    </span>
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>
          </div>

          {/* Cards listing layout presentation */}
          <div className={cn("space-y-4 transition-opacity duration-200", isPending && "opacity-60 pointer-events-none")}>
            {totalCount === 0 ? (
              <EmptyState label={activeTab} />
            ) : (
              <>
                <div className="flex flex-col gap-4 w-full">
                  {enrichedTests.map((t) => (
                    <TestCard
                      key={t.id}
                      test={{ ...t, derived_status: t.current_derived_status as DerivedCandidateStatus }}
                    />
                  ))}
                </div>

                {/* Pagination Footer */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2 px-1">
                  <div className="text-xs text-muted-foreground font-medium">
                    Showing{" "}
                    <span className="font-semibold text-foreground">
                      {totalCount === 0 ? 0 : (activePage - 1) * initialPageSize + 1}
                    </span>
                    {" "}to{" "}
                    <span className="font-semibold text-foreground">{Math.min(totalCount, activePage * initialPageSize)}</span>
                    {" "}of{" "}
                    <span className="font-semibold text-foreground">{totalCount}</span> tests
                  </div>

                  <div className="flex flex-wrap items-center gap-4 sm:gap-6">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground font-medium whitespace-nowrap">Rows per page</span>
                      <Select
                        value={initialPageSize.toString()}
                        onValueChange={(val) => updateParams({ size: val, page: 1 })}
                      >
                        <SelectTrigger className="h-8 w-[70px] text-xs rounded-lg border-muted-foreground/20">
                          <SelectValue placeholder={initialPageSize.toString()} />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                          {[5, 10, 20, 50].map((s) => (
                            <SelectItem key={s} value={s.toString()} className="text-xs rounded-lg">{s}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex items-center gap-1">
                      <Button variant="outline" size="icon" className="h-8 w-8 rounded-lg border-muted-foreground/20"
                        onClick={() => updateParams({ page: 1 })} disabled={activePage === 1}>
                        <ChevronsLeft className="h-4 w-4" />
                        <span className="sr-only">First page</span>
                      </Button>
                      <Button variant="outline" size="icon" className="h-8 w-8 rounded-lg border-muted-foreground/20"
                        onClick={() => updateParams({ page: Math.max(1, activePage - 1) })} disabled={activePage === 1}>
                        <ChevronLeft className="h-4 w-4" />
                        <span className="sr-only">Previous page</span>
                      </Button>
                      <div className="flex items-center justify-center text-xs font-semibold text-foreground min-w-[90px]">
                        Page {activePage} of {totalPages}
                      </div>
                      <Button variant="outline" size="icon" className="h-8 w-8 rounded-lg border-muted-foreground/20"
                        onClick={() => updateParams({ page: Math.min(totalPages, activePage + 1) })}
                        disabled={activePage === totalPages || totalPages === 0}>
                        <ChevronRight className="h-4 w-4" />
                        <span className="sr-only">Next page</span>
                      </Button>
                      <Button variant="outline" size="icon" className="h-8 w-8 rounded-lg border-muted-foreground/20"
                        onClick={() => updateParams({ page: totalPages })}
                        disabled={activePage === totalPages || totalPages === 0}>
                        <ChevronsRight className="h-4 w-4" />
                        <span className="sr-only">Last page</span>
                      </Button>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

        </div>
      </Tabs>
    </div>
  )
}