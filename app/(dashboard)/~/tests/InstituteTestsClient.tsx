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
        <Badge className="gap-1.5 bg-emerald-500 hover:bg-emerald-500 text-white border-0 text-[11px] px-2 py-0.5">
          <span className="relative flex h-1.5 w-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-white" />
          </span>
          Live
        </Badge>
      )
    case "upcoming":
      return (
        <Badge variant="secondary" className="gap-1 text-[11px] px-2 py-0.5">
          <CalendarClock className="h-3 w-3" />
          Upcoming
        </Badge>
      )
    case "past":
      return (
        <Badge variant="outline" className="gap-1 text-[11px] px-2 py-0.5 text-muted-foreground">
          <CheckCircle2 className="h-3 w-3" />
          Ended
        </Badge>
      )
    case "draft":
      return (
        <Badge variant="outline" className="gap-1 text-[11px] px-2 py-0.5 text-muted-foreground border-dashed">
          <PenLine className="h-3 w-3" />
          Draft
        </Badge>
      )
  }
}


// ─── Test Card ────────────────────────────────────────────────────────────────

function TestCard({ test }: { test: InstituteTest }) {
  return (
    <Card className="border overflow-hidden p-0">
      <div className="flex flex-col md:flex-row md:items-center justify-between p-4 gap-4">

        {/* Left: Title, Description, Status */}
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h3 className="text-base font-semibold leading-tight text-foreground">{test.title}</h3>
            <StatusBadge status={test.derived_status} />
          </div>
          <p className={cn(
            "text-xs text-muted-foreground max-w-2xl",
            test.description ? "line-clamp-2" : "italic text-muted-foreground/60"
          )}>
            {test.description ?? "No description provided"}
          </p>
        </div>

        {/* Middle: Details & Meta */}
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs md:text-sm text-muted-foreground border-t md:border-t-0 pt-3 md:pt-0">
          <div className="flex flex-col gap-0.5 min-w-[90px]">
            <span className="text-[10px] uppercase font-semibold tracking-wider text-muted-foreground/80">Duration</span>
            <span className="flex items-center gap-1.5 font-medium text-foreground">
              <Clock className="h-3.5 w-3.5 text-muted-foreground" />
              {test.time_limit_seconds ? formatDuration(test.time_limit_seconds) : "Untimed"}
            </span>
          </div>

          <div className="flex flex-col gap-0.5 min-w-[100px]">
            <span className="text-[10px] uppercase font-semibold tracking-wider text-muted-foreground/80">Questions</span>
            <span className="flex items-center gap-1.5 font-medium text-foreground">
              <ListCheck className="h-3.5 w-3.5 text-muted-foreground" />
              {test.question_count > 0 ? `${test.question_count} Qs` : "0 Qs"}
            </span>
          </div>

          <div className="flex flex-col gap-0.5 min-w-[100px]">
            <span className="text-[10px] uppercase font-semibold tracking-wider text-muted-foreground/80">Attempts</span>
            <span className="flex items-center gap-1.5 font-medium text-foreground">
              <Users className="h-3.5 w-3.5 text-muted-foreground" />
              {test.attempt_count} {test.attempt_count === 1 ? "attempt" : "attempts"}
            </span>
          </div>

          <div className="flex flex-col gap-0.5 min-w-[140px]">
            <span className="text-[10px] uppercase font-semibold tracking-wider text-muted-foreground/80">Availability</span>
            <span className="flex items-center gap-1.5 font-medium text-foreground">
              <CalendarClock className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs">
                {test.available_from ? (
                  <>
                    {formatDateTime(test.available_from)}
                    {test.available_until && (
                      <span className="text-muted-foreground block text-[10px] font-normal mt-0.5">
                        to {formatDateTime(test.available_until)}
                      </span>
                    )}
                  </>
                ) : (
                  "No schedule set"
                )}
              </span>
            </span>
          </div>

          <div className="flex flex-col gap-0.5 min-w-[150px] justify-center">
            <span className="text-[10px] uppercase font-semibold tracking-wider text-muted-foreground/80">Access & Status</span>

            {test.derived_status === "past" && (
              <span className={cn(
                "flex items-center gap-1.5 font-medium text-xs",
                test.results_available ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"
              )}>
                {test.results_available
                  ? <><Eye className="h-3.5 w-3.5" />Results visible</>
                  : <><EyeOff className="h-3.5 w-3.5" />Results hidden</>
                }
              </span>
            )}

            {test.derived_status === "upcoming" && (
              <span className="font-medium text-foreground text-xs">
                {test.available_from
                  ? <>Opens {formatDateTime(test.available_from)}</>
                  : <span className="italic text-muted-foreground/60">Opening time not set</span>
                }
              </span>
            )}

            {test.derived_status === "draft" && (
              <span className="font-medium text-muted-foreground text-xs italic">
                Draft (Not published)
              </span>
            )}

            {test.derived_status === "live" && (
              <span className="flex items-center gap-1.5 font-medium text-emerald-600 dark:text-emerald-400 text-xs">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live
              </span>
            )}
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center justify-end md:pl-4 border-t md:border-t-0 pt-3 md:pt-0 shrink-0 w-full md:w-auto">
          <Button asChild variant="outline" size="sm" className="w-full md:w-auto">
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

  // Debounce search input — no early-return guard, no initialSearch dependency
  useEffect(() => {
    const timer = setTimeout(() => {
      isOwnUpdateRef.current = true
      updateParams({ search: searchInput, page: 1 })
    }, 400)
    return () => clearTimeout(timer)
  }, [searchInput]) // eslint-disable-line react-hooks/exhaustive-deps

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
                <Loader2 className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground animate-spin" />
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
      </Tabs>
    </div>
  )
}