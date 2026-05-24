"use client"

// ─────────────────────────────────────────────────────────────────────────────
// app/~/tests/InstituteTestsClient.tsx
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useMemo, useCallback, useEffect, useTransition } from "react"
import Link from "next/link"
import { useRouter, usePathname, useSearchParams } from "next/navigation"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
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
  PlayCircle,
  PenLine,
  Search,
  X,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Loader2,
  FileText,
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
  if (h > 0 && m > 0) return `${h}h`
  if (h > 0) return `${h}h`
  return `${m}m`
}

export function formatDateTime(dt?: string): string {
  if (!dt) return "—"
  return new Date(dt).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  })
}


// ─── Status Badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: DerivedInstituteStatus }) {
  switch (status) {
    case "live":
      return (
        <Badge className="gap-1.5 bg-emerald-500 hover:bg-emerald-500 text-white border-0 text-[11px] font-semibold px-2.5 py-0.5 rounded-full shrink-0">
          <span className="relative flex h-1.5 w-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-white" />
          </span>
          Live
        </Badge>
      )
    case "upcoming":
      return (
        <Badge variant="secondary" className="gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 border-0 shrink-0">
          Upcoming
        </Badge>
      )
    case "past":
      return (
        <Badge variant="outline" className="gap-1 text-[11px] font-medium px-2.5 py-0.5 text-muted-foreground bg-secondary/30 rounded-full border-muted-foreground/20 shrink-0">
          Ended
        </Badge>
      )
    case "draft":
      return (
        <Badge variant="outline" className="gap-1 text-[11px] font-medium px-2.5 py-0.5 text-muted-foreground bg-muted/30 rounded-full border-dashed border-muted-foreground/30 shrink-0">
          Draft
        </Badge>
      )
  }
}


// ─── Test Card ────────────────────────────────────────────────────────────────

function TestCard({ test }: { test: InstituteTest }) {
  return (
    <Card className="border border-border/80 shadow-sm hover:border-muted-foreground/20 transition-all duration-200 overflow-hidden p-0 rounded-2xl bg-card">
      {/* Container switches from stacked on mobile to side-by-side on large displays */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between p-5 md:p-6 gap-6">

        {/* 1. Left Section: Title & Description (Completely isolated box) */}
        <div className="flex-1 min-w-0 space-y-1.5">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h3 className="text-base font-bold tracking-tight text-foreground line-clamp-1">{test.title}</h3>
            <StatusBadge status={test.derived_status} />
          </div>
          <p className={cn(
            "text-xs md:text-sm text-muted-foreground max-w-xl leading-relaxed line-clamp-2",
            !test.description && "italic text-muted-foreground/40"
          )}>
            {test.description ?? "No description provided"}
          </p>
        </div>

        {/* 2. Right Grid Section: Meta Metrics and View Button */}
        <div className="flex flex-wrap sm:flex-nowrap items-center justify-between xl:justify-end gap-x-8 gap-y-4 border-t xl:border-t-0 pt-4 xl:pt-0">
          
          {/* Metadata Grid blocks */}
          <div className="grid grid-cols-2 sm:flex sm:items-center gap-x-8 gap-y-4 text-xs md:text-sm text-muted-foreground w-full sm:w-auto">
            
            {/* Duration Column */}
            <div className="flex flex-col gap-0.5 min-w-[75px]">
              <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground/60">Duration</span>
              <span className="flex items-center gap-1.5 font-semibold text-foreground">
                <Clock className="h-3.5 w-3.5 text-muted-foreground/60 shrink-0" />
                {test.time_limit_seconds ? formatDuration(test.time_limit_seconds) : "Untimed"}
              </span>
            </div>

            {/* Questions Column */}
            <div className="flex flex-col gap-0.5 min-w-[75px]">
              <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground/60">Questions</span>
              <span className="flex items-center gap-1.5 font-semibold text-foreground">
                <ListCheck className="h-3.5 w-3.5 text-muted-foreground/60 shrink-0" />
                {test.question_count > 0 ? `${test.question_count} Qs` : "0 Qs"}
              </span>
            </div>

            {/* Attempts Column */}
            <div className="flex flex-col gap-0.5 min-w-[95px]">
              <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground/60">Attempts</span>
              <span className="flex items-center gap-1.5 font-semibold text-foreground">
                <Users className="h-3.5 w-3.5 text-muted-foreground/60 shrink-0" />
                {test.attempt_count} {test.attempt_count === 1 ? "attempt" : "attempts"}
              </span>
            </div>

            {/* Availability Column */}
            <div className="flex flex-col gap-0.5 min-w-[150px]">
              <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground/60">Availability</span>
              <span className="flex items-start gap-1.5 font-semibold text-foreground">
                <CalendarClock className="h-3.5 w-3.5 text-muted-foreground/60 shrink-0 mt-0.5" />
                <span className="text-xs font-semibold leading-tight">
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

            {/* Access & Status Column */}
            <div className="flex flex-col gap-0.5 min-w-[130px]">
              <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground/60">Access & Status</span>
              <div>
                {test.derived_status === "past" && (
                  <span className={cn(
                    "flex items-center gap-1.5 font-semibold text-xs",
                    test.results_available ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground/80"
                  )}>
                    {test.results_available
                      ? <><Eye className="h-3.5 w-3.5 text-emerald-500" />Results visible</>
                      : <><EyeOff className="h-3.5 w-3.5 text-muted-foreground/40" />Results hidden</>
                    }
                  </span>
                )}

                {test.derived_status === "upcoming" && (
                  <span className="font-semibold text-foreground text-xs block truncate max-w-[140px]">
                    {test.available_from ? `Opens ${new Date(test.available_from).toLocaleDateString("en-IN")}` : "Not set"}
                  </span>
                )}

                {test.derived_status === "draft" && (
                  <span className="font-medium text-muted-foreground/60 text-xs italic">
                    Unpublished
                  </span>
                )}

                {test.derived_status === "live" && (
                  <span className="flex items-center gap-1.5 font-semibold text-emerald-600 dark:text-emerald-400 text-xs">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Active Live
                  </span>
                )}
              </div>
            </div>

          </div>

          {/* Action Button Container */}
          <div className="shrink-0 pt-2 sm:pt-0 pl-0 xl:pl-4 w-full sm:w-auto">
            <Button asChild variant="outline" size="sm" className="w-full sm:w-auto rounded-xl font-semibold px-4 border-border text-foreground hover:bg-muted/80 hover:text-foreground shadow-none">
              <Link href={`tests/${test.id}`}>View Details</Link>
            </Button>
          </div>

        </div>

      </div>
    </Card>
  )
}


// ─── Empty State ──────────────────────────────────────────────────────────────

function EmptyState({ isFiltered, onCreate }: { isFiltered: boolean; onCreate: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center gap-3 border border-dashed rounded-2xl bg-muted/10">
      <div className="h-12 w-12 rounded-xl bg-muted flex items-center justify-center">
        <FlaskConical className="h-5 w-5 text-muted-foreground/60" />
      </div>
      <div className="space-y-0.5">
        <p className="text-sm font-semibold">
          {isFiltered ? "No tests in this category" : "No tests yet"}
        </p>
        <p className="text-xs text-muted-foreground">
          {isFiltered ? "Try adjusting your filters or search query." : "Create your first test to get started"}
        </p>
      </div>
      {!isFiltered && (
        <Button size="sm" onClick={onCreate} className="gap-1.5 mt-1 rounded-xl font-medium shadow-none">
          <Plus className="h-4 w-4" />
          Create Test
        </Button>
      )}
    </div>
  )
}


// ─── Main Component ───────────────────────────────────────────────────────────

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
  const searchParams = useSearchParams()

  const [isPending, startTransition] = useTransition()
  const [searchInput, setSearchInput] = useState(initialSearch)

  // Pure sync handler for historical native popstate updates
  useEffect(() => {
    setSearchInput(initialSearch)
  }, [initialSearch])

  // Contextually bound push parameters configuration update routing
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

  // Self-guarding safe debounce
  useEffect(() => {
    if (searchInput === initialSearch) return

    const timer = setTimeout(() => {
      updateParams({ search: searchInput, page: 1 })
    }, 350)

    return () => clearTimeout(timer)
  }, [searchInput, initialSearch, updateParams])

  const activeTab = (initialTab || "all") as Tab

  // Server Clock Sync Management system 
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
    { value: "all",      label: "All",      icon: <LayoutList    className="h-3.5 w-3.5" />, count: tabCounts.all },
    { value: "live",     label: "Live",     icon: <PlayCircle    className="h-3.5 w-3.5" />, count: tabCounts.live },
    { value: "upcoming", label: "Upcoming", icon: <CalendarClock className="h-3.5 w-3.5" />, count: tabCounts.upcoming },
    { value: "past",     label: "Past",     icon: <FileText      className="h-3.5 w-3.5" />, count: tabCounts.past },
    { value: "drafts",   label: "Drafts",   icon: <PenLine       className="h-3.5 w-3.5" />, count: tabCounts.drafts },
  ]

  const totalPages = Math.ceil(totalCount / initialPageSize)
  const activePage = Math.min(initialPage, Math.max(1, totalPages))

  const handleCreate = () => router.push("tests/new/edit")

  return (
    <div className="flex flex-col gap-6 px-4 py-8 md:px-10 max-w-7xl mx-auto w-full">

      {/* Header Container */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Tests</h1>
          <Button size="sm" onClick={handleCreate} className="gap-1.5 shrink-0 rounded-xl font-semibold shadow-none">
            <Plus className="h-4 w-4" />
            Create Test
          </Button>
        </div>
        <div className="text-xs md:text-sm text-muted-foreground font-medium flex items-center gap-1.5">
          {tabCounts.all} test{tabCounts.all !== 1 ? "s" : ""} total
          {tabCounts.live > 0 && (
            <>
              <span className="text-muted-foreground/30">•</span>
              <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                {tabCounts.live} live
              </span>
            </>
          )}
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => updateParams({ tab: v, page: 1 })} className="w-full">
        <div className="space-y-5">

          {/* Controls Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="relative w-full sm:max-w-xs">
              {isPending ? (
                <Loader2 className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground animate-spin" />
              ) : (
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground/50" />
              )}
              <Input
                placeholder="Search tests..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="pl-9 pr-9 h-9 rounded-xl border-border bg-background"
              />
              {searchInput && (
                <button
                  onClick={() => {
                    setSearchInput("")
                    updateParams({ search: "", page: 1 })
                  }}
                  className="absolute right-3 top-2.5 h-4 w-4 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            
            <div className="overflow-x-auto shrink-0 bg-muted/60 p-1 rounded-xl w-full sm:w-auto">
              <TabsList className="inline-flex h-8 gap-1 bg-transparent p-0 w-full justify-start sm:justify-start">
                {tabConfig.map(({ value, label, count }) => (
                  <TabsTrigger
                    key={value}
                    value={value}
                    className="gap-1.5 rounded-lg px-3.5 h-7 text-xs font-bold tracking-tight data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm transition-all"
                  >
                    {label}
                    {count > 0 && (
                      <span className={cn(
                        "inline-flex h-4 min-w-[16px] items-center justify-center rounded-full px-1 text-[9px] font-extrabold tabular-nums",
                        activeTab === value
                          ? "bg-foreground text-background"
                          : "bg-muted-foreground/15 text-muted-foreground"
                      )}>
                        {count}
                      </span>
                    )}
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>
          </div>

          {/* Cards Display Panel */}
          <div className={cn("space-y-4 transition-opacity duration-200", isPending && "opacity-60 pointer-events-none")}>
            {totalCount === 0 ? (
              <EmptyState isFiltered={activeTab !== "all" || searchInput.trim() !== ""} onCreate={handleCreate} />
            ) : (
              <>
                <div className="flex flex-col gap-4 w-full">
                  {enrichedTests.map((t) => (
                    <TestCard
                      key={t.id}
                      test={{ ...t, derived_status: t.current_derived_status as DerivedInstituteStatus }}
                    />
                  ))}
                </div>

                {/* Pagination Controls */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-3 px-1">
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
                      <span className="text-xs text-muted-foreground font-medium">Rows per page</span>
                      <Select
                        value={initialPageSize.toString()}
                        onValueChange={(val) => updateParams({ size: val, page: 1 })}
                      >
                        <SelectTrigger className="h-8 w-[68px] text-xs rounded-lg border-border">
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
                      <Button variant="outline" size="icon" className="h-8 w-8 rounded-lg border-border"
                        onClick={() => updateParams({ page: 1 })} disabled={activePage === 1}>
                        <ChevronsLeft className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="icon" className="h-8 w-8 rounded-lg border-border"
                        onClick={() => updateParams({ page: Math.max(1, activePage - 1) })} disabled={activePage === 1}>
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <div className="flex items-center justify-center text-xs font-semibold text-foreground min-w-[85px]">
                        Page {activePage} of {totalPages}
                      </div>
                      <Button variant="outline" size="icon" className="h-8 w-8 rounded-lg border-border"
                        onClick={() => updateParams({ page: Math.min(totalPages, activePage + 1) })}
                        disabled={activePage === totalPages || totalPages === 0}>
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="icon" className="h-8 w-8 rounded-lg border-border"
                        onClick={() => updateParams({ page: totalPages })}
                        disabled={activePage === totalPages || totalPages === 0}>
                        <ChevronsRight className="h-4 w-4" />
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