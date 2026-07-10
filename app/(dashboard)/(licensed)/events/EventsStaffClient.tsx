"use client"

import { useState, useMemo, useTransition, useEffect, useRef, useCallback } from "react"
import { useRouter, usePathname } from "next/navigation"
import Link from "next/link"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent } from "@/components/ui/card"
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
  Calendar,
  Plus,
  Search,
  X,
  Users,
  MapPin,
  Clock,
  Eye,
  CheckCircle2,
  FileText,
  Loader2,
  QrCode,
  UserCheck,
  CalendarCheck,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  BookOpen,
  CalendarClock,
  PlayCircle,
  Settings,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import type { EventListItem, EventStatus } from "./types"

type Tab = "all" | "published" | "draft" | "concluded"

interface TabConfig {
  value: Tab
  label: string
  icon: React.ReactNode
  count: number
}

function formatDateTime(dt: string): string {
  return new Date(dt).toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  })
}

// ─── Stats Bar ────────────────────────────────────────────────────────────────
function StatsBar({
  tabCounts,
  totalAttendeesCount,
  totalCheckedInCount,
}: {
  tabCounts: { all: number; published: number; draft: number; concluded: number }
  totalAttendeesCount: number
  totalCheckedInCount: number
}) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 animate-in fade-in duration-300">
      {[
        {
          icon: <Calendar className="h-3.5 w-3.5 text-primary" />,
          value: tabCounts.all,
          label: "Total Events",
          accent: "border-primary/15",
        },
        {
          icon: <Eye className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />,
          value: tabCounts.published,
          label: "Published",
          accent: "border-emerald-500/15",
        },
        {
          icon: <Users className="h-3.5 w-3.5 text-indigo-500" />,
          value: totalAttendeesCount,
          label: "Total RSVPs",
          accent: "border-indigo-500/15",
        },
        {
          icon: <UserCheck className="h-3.5 w-3.5 text-amber-500" />,
          value: totalCheckedInCount,
          label: "Checked In",
          accent: "border-amber-500/15",
        },
      ].map((stat) => (
        <Card key={stat.label} className={cn("border shadow-xs", stat.accent)}>
          <CardContent className="p-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
              {stat.icon}
              {stat.label}
            </div>
            <p className="text-lg font-semibold tabular-nums text-foreground">{stat.value}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

// ─── Status Badge ─────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: EventStatus }) {
  switch (status) {
    case "Published":
      return (
        <Badge className="gap-1 border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300 text-[11px] px-2 py-0.5">
          <Eye className="h-3 w-3" /> Published
        </Badge>
      )
    case "Draft":
      return (
        <Badge className="gap-1 border border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-50 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300 text-[11px] px-2 py-0.5 border-dashed">
          <FileText className="h-3 w-3" /> Draft
        </Badge>
      )
    case "Concluded":
      return (
        <Badge className="gap-1 border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-50 dark:border-slate-500/20 dark:bg-slate-500/10 dark:text-slate-300 text-[11px] px-2 py-0.5">
          <CheckCircle2 className="h-3 w-3" /> Concluded
        </Badge>
      )
  }
}

// ─── Stat Chip ────────────────────────────────────────────────────────────────
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

// ─── Staff Access Status Display ──────────────────────────────────────────────
function StaffAccessStatus({
  status,
  isPast,
}: {
  status: EventStatus
  isPast: boolean
}) {
  if (status === "Concluded" || (status === "Published" && isPast)) {
    return (
      <span className="font-medium text-muted-foreground text-xs italic">
        Event Concluded
      </span>
    )
  }
  if (status === "Draft") {
    return (
      <span className="font-medium text-amber-600 dark:text-amber-400 text-xs italic">
        Draft — not published
      </span>
    )
  }
  return (
    <span className="flex items-center gap-1.5 font-medium text-emerald-600 dark:text-emerald-400 text-xs">
      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
      Registration Open
    </span>
  )
}

// ─── Event Card ───────────────────────────────────────────────────────────────
function EventCard({
  event,
}: {
  event: EventListItem
}) {
  const router = useRouter()
  const isPast = new Date(event.date) < new Date()

  return (
    <Card className="overflow-hidden border-border/70 bg-card p-0">
      <div className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:gap-4 md:p-5">
        {/* Left Info Panel */}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="min-w-0 text-sm md:text-base font-semibold leading-tight text-foreground">
              {event.title}
            </h3>
            <StatusBadge status={event.status} />
            {event.tickets_waitlisted > 0 && (
              <Badge variant="outline" className="border-orange-500/30 bg-orange-500/10 text-orange-700 dark:text-orange-400 text-[10px] px-1.5 py-0">
                {event.tickets_waitlisted} waitlisted
              </Badge>
            )}
          </div>

          <p
            className={cn(
              "mt-1 line-clamp-1 text-xs leading-5 text-muted-foreground",
              event.description ? "" : "italic text-muted-foreground/60"
            )}
          >
            {event.description ?? "No description provided"}
          </p>

          <div className="mt-3 flex flex-wrap gap-2">
            <StatChip icon={<Clock className="h-3.5 w-3.5" />} tone="neutral">
              {formatDateTime(event.date)}
              {event.duration_minutes && (
                <span className="text-[10px] text-muted-foreground/60 ml-1">
                  ({event.duration_minutes}m)
                </span>
              )}
            </StatChip>

            <StatChip icon={<MapPin className="h-3.5 w-3.5" />} tone="neutral">
              {event.venue}
            </StatChip>

            <StatChip icon={<Users className="h-3.5 w-3.5" />} tone="neutral">
              {event.tickets_confirmed}/{event.capacity} Confirmed
            </StatChip>

            <StatChip icon={<UserCheck className="h-3.5 w-3.5" />} tone="neutral">
              {event.tickets_present} Checked In
            </StatChip>
          </div>
        </div>

        {/* Right Action Column */}
        <div className="flex flex-col gap-3 border-t border-border/60 pt-3 md:min-w-[120px] md:items-end md:pt-0 md:border-t-0 md:text-right">
          <div className="md:items-end">
            <StaffAccessStatus status={event.status} isPast={isPast} />
          </div>

          <div className="flex flex-col md:flex-row items-stretch md:items-center gap-1.5 w-full md:w-auto md:justify-end">
            <Button
              size="sm"
              variant="outline"
              onClick={() => router.push(`/events/${event.id}`)}
              className="w-full md:w-auto gap-1 text-xs cursor-pointer"
            >
              <Settings className="h-3.5 w-3.5" />
              Manage
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => toast.info("Scan feature is coming soon!")}
              className="w-full md:w-auto gap-1 text-xs cursor-pointer"
            >
              <QrCode className="h-3.5 w-3.5" />
              Scan
            </Button>
          </div>
        </div>
      </div>
    </Card>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────
interface Props {
  events: EventListItem[]
  initialPage: number
  initialPageSize: number
  initialSearch: string
  initialTab: string
  totalCount: number
  tabCounts: { all: number; published: number; draft: number; concluded: number }
  totalAttendeesCount: number
  totalCheckedInCount: number
}

export function EventsStaffClient({
  events,
  initialPage,
  initialPageSize,
  initialSearch,
  initialTab,
  totalCount,
  tabCounts,
  totalAttendeesCount,
  totalCheckedInCount,
}: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const [isPending, startTransition] = useTransition()

  // Local search text input
  const [searchInput, setSearchInput] = useState(initialSearch)
  const isOwnUpdateRef = useRef(false)

  // Sync search input with URL params on back/forward
  useEffect(() => {
    if (isOwnUpdateRef.current) {
      isOwnUpdateRef.current = false
      return
    }
    setSearchInput(initialSearch)
  }, [initialSearch])

  // Helper to push updated params to URL
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

  // Debounced search logic
  useEffect(() => {
    if (searchInput === initialSearch) return

    const timer = setTimeout(() => {
      isOwnUpdateRef.current = true
      updateParams({ search: searchInput, page: 1 })
    }, 450)
    return () => clearTimeout(timer)
  }, [searchInput, initialSearch, updateParams])

  const activeTab = (initialTab || "all") as Tab

  const tabConfig: TabConfig[] = [
    { value: "all", label: "All", icon: <BookOpen className="h-3.5 w-3.5" />, count: tabCounts.all },
    { value: "published", label: "Published", icon: <PlayCircle className="h-3.5 w-3.5" />, count: tabCounts.published },
    { value: "draft", label: "Drafts", icon: <FileText className="h-3.5 w-3.5" />, count: tabCounts.draft },
    { value: "concluded", label: "Concluded", icon: <CheckCircle2 className="h-3.5 w-3.5" />, count: tabCounts.concluded },
  ]

  const totalPages = Math.ceil(totalCount / initialPageSize)
  const activePage = Math.min(initialPage, Math.max(1, totalPages))

  const onRefresh = () => router.refresh()

  return (
    <div className="flex flex-col gap-6 px-4 py-8 md:px-8">
      {/* Page Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <h1 className="text-3xl font-bold font-cirka tracking-tight text-foreground">Events</h1>
          <p className="text-sm text-muted-foreground">
            {totalCount} event{totalCount !== 1 ? "s" : ""} created
          </p>
        </div>
        <Link href="/events/new/edit">
          <Button className="gap-1.5 cursor-pointer">
            <Plus className="h-4 w-4" />
            Create Event
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <StatsBar
        tabCounts={tabCounts}
        totalAttendeesCount={totalAttendeesCount}
        totalCheckedInCount={totalCheckedInCount}
      />

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
                placeholder="Search events..."
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
                  className="absolute right-2.5 top-2.5 h-4 w-4 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
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
                    className="gap-1.5 rounded-md px-3 text-xs font-medium cursor-pointer data-[state=active]:bg-background data-[state=active]:shadow-sm"
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
              {tabConfig.map(({ value, label }) => {
                if (value !== activeTab) {
                  return <TabsContent key={value} value={value} className="mt-0 outline-none" />
                }
                return (
                  <TabsContent key={value} value={value} className="mt-0 outline-none space-y-4">
                    {totalCount === 0 ? (
                      <div className="flex flex-col items-center justify-center py-24 text-center gap-3">
                        <div className="h-12 w-12 rounded-xl bg-muted flex items-center justify-center">
                          <BookOpen className="h-5 w-5 text-muted-foreground/60" />
                        </div>
                        <div className="space-y-0.5">
                          <p className="text-sm font-medium">No {label.toLowerCase()}</p>
                          <p className="text-xs text-muted-foreground">Create your first event to get started</p>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex flex-col gap-3 w-full">
                          {events.map((event) => (
                            <EventCard key={event.id} event={event} />
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
                            <span className="font-medium">{totalCount}</span> events
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
                              <Button variant="outline" size="icon" className="h-8 w-8 cursor-pointer"
                                onClick={() => updateParams({ page: 1 })} disabled={activePage === 1}>
                                <ChevronsLeft className="h-4 w-4" />
                                <span className="sr-only">First page</span>
                              </Button>
                              <Button variant="outline" size="icon" className="h-8 w-8 cursor-pointer"
                                onClick={() => updateParams({ page: Math.max(1, activePage - 1) })} disabled={activePage === 1}>
                                <ChevronLeft className="h-4 w-4" />
                                <span className="sr-only">Previous page</span>
                              </Button>
                              <div className="flex items-center justify-center text-xs font-medium min-w-[80px] tabular-nums">
                                Page {activePage} of {totalPages || 1}
                              </div>
                              <Button variant="outline" size="icon" className="h-8 w-8 cursor-pointer"
                                onClick={() => updateParams({ page: Math.min(totalPages, activePage + 1) })}
                                disabled={activePage === totalPages || totalPages === 0}>
                                <ChevronRight className="h-4 w-4" />
                                <span className="sr-only">Next page</span>
                              </Button>
                              <Button variant="outline" size="icon" className="h-8 w-8 cursor-pointer"
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
