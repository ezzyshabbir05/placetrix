"use client"

// ─────────────────────────────────────────────────────────────────────────────
// app/~/tests/InstituteTestsClient.tsx
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useMemo, useCallback, useEffect, useTransition, useRef } from "react"
import Link from "next/link"
import { useRouter, usePathname } from "next/navigation"
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
  LayoutList,
  Plus,
  Eye,
  EyeOff,
  Clock,
  Users,
  ListCheck,
  CalendarClock,
  FlaskConical,
  CheckCircle2,
  FileText,
  PlayCircle,
  PenLine,
  Search,
  X,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Loader2,
} from "lucide-react"
import { cn } from "@/lib/utils"
import type { InstituteTest, DerivedInstituteStatus } from "./_types"
import { deriveStatus } from "./_types"


// ─── Types ────────────────────────────────────────────────────────────────────

type Tab = "all" | "live" | "upcoming" | "past" | "drafts"

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
  if (h > 0 && m > 0) return `${h}h ${m}m`
  if (h > 0) return `${h}h`
  return `${m}m`
}

export function formatDateTime(dt?: string): string {
  if (!dt) return "—"
  return new Date(dt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })
}


// ─── Status Badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: DerivedInstituteStatus }) {
  switch (status) {
    case "live":
      return (
        <Badge className="gap-1 border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300 text-[11px] px-2 py-0.5">
          Live
        </Badge>
      )

    case "upcoming":
      return (
        <Badge className="gap-1 border border-sky-200 bg-sky-50 text-sky-700 hover:bg-sky-50 dark:border-sky-500/20 dark:bg-sky-500/10 dark:text-sky-300 text-[11px] px-2 py-0.5">
          <CalendarClock className="h-3 w-3" />
          Upcoming
        </Badge>
      )
    case "past":
      return (
        <Badge className="gap-1 border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-50 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-300 text-[11px] px-2 py-0.5">
          <CheckCircle2 className="h-3 w-3" />
          Ended
        </Badge>
      )
    case "draft":
      return (
        <Badge className="gap-1 border border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-50 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300 text-[11px] px-2 py-0.5 border-dashed">
          <PenLine className="h-3 w-3" />
          Draft
        </Badge>
      )
  }
}

// Reusable meta item — always renders label + icon + value, even when empty
function MetaItem({
  label,
  icon,
  value,
}: {
  label: string
  icon: React.ReactNode
  value: string
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] uppercase font-semibold tracking-wider text-muted-foreground/80">
        {label}
      </span>
      <span className="flex items-center gap-1.5 font-medium text-foreground text-xs">
        {icon}
        {value}
      </span>
    </div>
  )
}

// Institute access/status — isolated so the parent card layout never shifts
function AccessStatus({
  status,
  test,
}: {
  status: DerivedInstituteStatus
  test: InstituteTest
}) {
  if (status === "past") {
    return (
      <span className={cn(
        "flex items-center gap-1.5 font-medium text-xs",
        test.results_available
          ? "text-emerald-600 dark:text-emerald-400"
          : "text-muted-foreground"
      )}>
        {test.results_available
          ? <><Eye className="h-3.5 w-3.5" /> Results visible</>
          : <><EyeOff className="h-3.5 w-3.5" /> Results hidden</>
        }
      </span>
    )
  }
  if (status === "upcoming") {
    return (
      <span className="font-medium text-foreground text-xs">
        {test.available_from
          ? <>Opens {formatDateTime(test.available_from)}</>
          : <span className="italic text-muted-foreground/60">Opening time not set</span>
        }
      </span>
    )
  }
  if (status === "draft") {
    return (
      <span className="font-medium text-muted-foreground text-xs italic">
        Draft — not published
      </span>
    )
  }
  // live
  return (
    <span className="flex items-center gap-1.5 font-medium text-emerald-600 dark:text-emerald-400 text-xs">
      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
      Available now
    </span>
  )
}

function StatChip({
  icon,
  children,
  tone = "neutral",
}: {
  icon: React.ReactNode
  children: React.ReactNode
  tone?: "neutral" | "sky" | "emerald" | "amber" | "violet" | "rose"
}) {
  const tones = {
    neutral: "border-border/60 bg-muted/50 text-muted-foreground",
    sky: "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-500/20 dark:bg-sky-500/10 dark:text-sky-300",
    emerald:
      "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300",
    amber:
      "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300",
    violet:
      "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-500/20 dark:bg-violet-500/10 dark:text-violet-300",
    rose:
      "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-300",
  } as const

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium",
        tones[tone]
      )}
    >
      {icon}
      <span className="truncate">{children}</span>
    </span>
  )
}
function TestCard({ test }: { test: InstituteTest }) {
  return (
    <Card className="overflow-hidden border-border/70 bg-card p-0">
      <div className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:gap-4 md:p-5">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="min-w-0 text-sm md:text-base font-semibold leading-tight text-foreground">
              {test.title}
            </h3>
            <StatusBadge status={test.derived_status} />
          </div>

          <p
            className={cn(
              "mt-1 line-clamp-1 text-xs leading-5 text-muted-foreground",
              test.description ? "" : "italic text-muted-foreground/60"
            )}
          >
            {test.description ?? "No description provided"}
          </p>

          <div className="mt-3 flex flex-wrap gap-2">
            <StatChip
              icon={<Clock className="h-3.5 w-3.5" />}
              tone="neutral"
            >
              {test.time_limit_seconds ? formatDuration(test.time_limit_seconds) : "Untimed"}
            </StatChip>

            <StatChip icon={<ListCheck className="h-3.5 w-3.5" />} tone="neutral">
              {test.question_count > 0 ? `${test.question_count} Qs` : "0 Qs"}
            </StatChip>

            <StatChip icon={<Users className="h-3.5 w-3.5" />} tone="neutral">
              {test.attempt_count} {test.attempt_count === 1 ? "attempt" : "attempts"}
            </StatChip>

            {test.derived_status === "upcoming" && test.available_from && (
              <StatChip icon={<CalendarClock className="h-3.5 w-3.5" />} tone="neutral">
                Starts: {formatDateTime(test.available_from)}
              </StatChip>
            )}

            {test.derived_status === "live" && (
              test.available_until ? (
                <StatChip icon={<CalendarClock className="h-3.5 w-3.5" />} tone="neutral">
                  Ends: {formatDateTime(test.available_until)}
                </StatChip>
              ) : (
                <StatChip icon={<CalendarClock className="h-3.5 w-3.5" />} tone="neutral">
                  No deadline
                </StatChip>
              )
            )}

            {test.derived_status === "past" && test.available_until && (
              <StatChip icon={<CalendarClock className="h-3.5 w-3.5" />} tone="neutral">
                Ended: {formatDateTime(test.available_until)}
              </StatChip>
            )}

            {test.derived_status === "draft" && (
              <StatChip icon={<CalendarClock className="h-3.5 w-3.5" />} tone="neutral">
                No schedule set
              </StatChip>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-3 border-t border-border/60 pt-3 md:min-w-[220px] md:items-end md:pt-0 md:border-t-0 md:text-right">
          <div className="md:items-end">
            <AccessStatus status={test.derived_status} test={test} />
          </div>

          <Button asChild variant="outline" size="sm" className="w-full md:w-auto md:self-end">
            <Link href={`tests/${test.id}`}>View Details</Link>
          </Button>
        </div>
      </div>
    </Card>
  )
}


// ─── Empty State ──────────────────────────────────────────────────────────────

function EmptyState({ isFiltered, onCreate }: { isFiltered: boolean; onCreate: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center gap-3">
      <div className="h-12 w-12 rounded-xl bg-muted flex items-center justify-center">
        <FlaskConical className="h-5 w-5 text-muted-foreground/60" />
      </div>
      <div className="space-y-0.5">
        <p className="text-sm font-medium">
          {isFiltered ? "No tests in this category" : "No tests yet"}
        </p>
        <p className="text-xs text-muted-foreground">
          {isFiltered ? "Try switching tabs to view others" : "Create your first test to get started"}
        </p>
      </div>
      {!isFiltered && (
        <Button size="sm" onClick={onCreate} className="gap-1.5 mt-1">
          <Plus className="h-3.5 w-3.5" />
          Create Test
        </Button>
      )}
    </div>
  )
}


// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  tests: InstituteTest[]
  serverNow: string
  initialPage: number
  initialPageSize: number
  initialSearch: string
  initialTab: string
  totalCount: number
  tabCounts: { all: number; live: number; upcoming: number; past: number; drafts: number }
}

export function InstituteTestsClient({
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

  const [isPending, startTransition] = useTransition()

  // Local state for search input text
  const [searchInput, setSearchInput] = useState(initialSearch)

  // Tracks whether the last URL change was triggered by our own debounce (not external navigation)
  const isOwnUpdateRef = useRef(false)

  // Sync search input ONLY on external navigation (back/forward), skip our own debounce-triggered updates
  useEffect(() => {
    if (isOwnUpdateRef.current) {
      isOwnUpdateRef.current = false
      return
    }
    setSearchInput(initialSearch)
  }, [initialSearch])

  // Helper to push updated search parameters to the URL
  const updateParams = useCallback(
    (newParams: Partial<Record<string, string | number>>) => {
      const params = new URLSearchParams(window.location.search)
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

  const activeTab = (initialTab || "all") as Tab

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

  // Dynamically re-derive status on the client with synced server time
  const enrichedTests = useMemo(() => {
    return tests.map((t) => ({
      ...t,
      current_derived_status: deriveStatus(
        t.status,
        t.available_from,
        t.available_until,
        now
      ) as DerivedInstituteStatus,
    }))
  }, [tests, now])

  const tabConfig: TabConfig[] = [
    { value: "all", label: "All", icon: <LayoutList className="h-3.5 w-3.5" />, count: tabCounts.all },
    { value: "live", label: "Live", icon: <PlayCircle className="h-3.5 w-3.5" />, count: tabCounts.live },
    { value: "upcoming", label: "Upcoming", icon: <CalendarClock className="h-3.5 w-3.5" />, count: tabCounts.upcoming },
    { value: "past", label: "Past", icon: <FileText className="h-3.5 w-3.5" />, count: tabCounts.past },
    { value: "drafts", label: "Drafts", icon: <PenLine className="h-3.5 w-3.5" />, count: tabCounts.drafts },
  ]

  const totalPages = Math.ceil(totalCount / initialPageSize)
  const activePage = Math.min(initialPage, Math.max(1, totalPages))

  const handleCreate = () => router.push("tests/new/edit")

  return (
    <div className="flex flex-col gap-6 px-4 py-8 md:px-8">

      {/* Page Header */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-2xl font-semibold tracking-tight">Tests</h1>
          <Button size="sm" onClick={handleCreate} className="gap-1.5 shrink-0">
            <Plus className="h-3.5 w-3.5" />
            Create Test
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">
          {tabCounts.all} test{tabCounts.all !== 1 ? "s" : ""} total
          {tabCounts.live > 0 && (
            <span className="ml-2 inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              {tabCounts.live} live
            </span>
          )}
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => updateParams({ tab: v, page: 1 })}>
        <div className="space-y-4">

          {/* Search (left) + Tabs (right) */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="relative w-full sm:max-w-xs">
              {isPending ? (
                <Loader2 className="absolute left-2.5 top-2.5 h-4 w-4 text-primary animate-spin" />
              ) : (
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              )}
              <Input
                placeholder="Search tests..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="pl-9 pr-9"
              />
              {searchInput && (
                <button
                  onClick={() => {
                    isOwnUpdateRef.current = true
                    setSearchInput("")
                    updateParams({ search: "", page: 1 })
                  }}
                  className="absolute right-2.5 top-2.5 h-4 w-4 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            <div className="overflow-x-auto shrink-0">
              <TabsList className="inline-flex h-9 gap-0.5 rounded-lg bg-muted p-1">
                {tabConfig.map(({ value, label, count }) => (
                  <TabsTrigger
                    key={value}
                    value={value}
                    className="gap-1.5 rounded-md px-3 text-xs font-medium data-[state=active]:bg-background data-[state=active]:shadow-sm"
                  >
                    {label}
                    {count > 0 && (
                      <span className={cn(
                        "inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-semibold tabular-nums",
                        activeTab === value
                          ? "bg-foreground text-background"
                          : "bg-muted-foreground/20 text-muted-foreground"
                      )}>
                        {count}
                      </span>
                    )}
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>
          </div>

          <div className="relative">
            {isPending && (
              <div className="absolute inset-0 z-50 bg-background/40 backdrop-blur-[1px] rounded-lg">
                <div className="sticky top-[40vh] mx-auto flex w-fit flex-col items-center gap-2 rounded-lg border bg-popover px-4 py-3 shadow-md">
                  <Loader2 className="h-6 w-6 text-primary animate-spin" />
                  <span className="text-xs font-medium text-muted-foreground animate-pulse">Loading...</span>
                </div>
              </div>
            )}
            <div className={cn("space-y-4 transition-opacity duration-200", isPending && "opacity-50 pointer-events-none")}>
              {tabConfig.map(({ value }) => {
                if (value !== activeTab) {
                  return <TabsContent key={value} value={value} className="mt-0 outline-none" />
                }
                return (
                  <TabsContent key={value} value={value} className="mt-0 outline-none space-y-4">
                    {totalCount === 0 ? (
                      <EmptyState isFiltered={value !== "all" || searchInput.trim() !== ""} onCreate={handleCreate} />
                    ) : (
                      <>
                        <div className="flex flex-col gap-3 w-full">
                          {enrichedTests.map((t) => (
                            <TestCard
                              key={t.id}
                              test={{ ...t, derived_status: t.current_derived_status as DerivedInstituteStatus }}
                            />
                          ))}
                        </div>

                        {/* Pagination Footer */}
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-1 px-1">
                          <div className="text-xs text-muted-foreground">
                            Showing{" "}
                            <span className="font-medium">
                              {totalCount === 0 ? 0 : Math.min(totalCount, (activePage - 1) * initialPageSize + 1)}
                            </span>
                            {" "}to{" "}
                            <span className="font-medium">{Math.min(totalCount, activePage * initialPageSize)}</span>
                            {" "}of{" "}
                            <span className="font-medium">{totalCount}</span> tests
                          </div>

                          <div className="flex flex-wrap items-center gap-4 sm:gap-6">
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-muted-foreground whitespace-nowrap">Rows per page</span>
                              <Select
                                value={initialPageSize.toString()}
                                onValueChange={(val) => updateParams({ size: val, page: 1 })}
                              >
                                <SelectTrigger className="h-8 w-[70px] text-xs">
                                  <SelectValue placeholder={initialPageSize.toString()} />
                                </SelectTrigger>
                                <SelectContent>
                                  {[5, 10, 20, 50].map((s) => (
                                    <SelectItem key={s} value={s.toString()} className="text-xs">{s}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>

                            <div className="flex items-center gap-1">
                              <Button variant="outline" size="icon" className="h-8 w-8"
                                onClick={() => updateParams({ page: 1 })} disabled={activePage === 1}>
                                <ChevronsLeft className="h-4 w-4" />
                                <span className="sr-only">First page</span>
                              </Button>
                              <Button variant="outline" size="icon" className="h-8 w-8"
                                onClick={() => updateParams({ page: Math.max(1, activePage - 1) })} disabled={activePage === 1}>
                                <ChevronLeft className="h-4 w-4" />
                                <span className="sr-only">Previous page</span>
                              </Button>
                              <div className="flex items-center justify-center text-xs font-medium min-w-[80px]">
                                Page {activePage} of {totalPages}
                              </div>
                              <Button variant="outline" size="icon" className="h-8 w-8"
                                onClick={() => updateParams({ page: Math.min(totalPages, activePage + 1) })}
                                disabled={activePage === totalPages || totalPages === 0}>
                                <ChevronRight className="h-4 w-4" />
                                <span className="sr-only">Next page</span>
                              </Button>
                              <Button variant="outline" size="icon" className="h-8 w-8"
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
                  </TabsContent>
                )
              })}
            </div>
          </div>

        </div>
      </Tabs>
    </div>
  )
}