"use client"

import { useState, useEffect, useRef, useMemo } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription, EmptyContent, EmptyMedia } from "@/components/ui/empty"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetTrigger } from "@/components/ui/sheet"
import {
  Calendar,
  Search,
  X,
  Users,
  MapPin,
  Clock,
  CheckCircle2,
  Hourglass,
  Loader2,
  SlidersHorizontal,
  CalendarClock,
  FileText,
} from "lucide-react"
import { cn, formatDateTime } from "@/lib/utils"
import type { CandidateEventListItem, TicketStatus } from "./types"

type Tab = "all" | "upcoming" | "my" | "past"

interface TabConfig {
  value: Tab
  label: string
  icon: React.ReactNode
  count: number
}

function isEventPast(eventDate: string, durationMinutes?: number, endDate?: string | null): boolean {
  if (endDate) {
    const end = new Date(endDate)
    if (!isNaN(end.getTime())) return end < new Date()
  }
  const duration = typeof durationMinutes === "number" && durationMinutes > 0 ? durationMinutes : 120
  const end = new Date(new Date(eventDate).getTime() + duration * 60000)
  return end < new Date()
}

// ─── Status Badge ─────────────────────────────────────────────────────────────
function StatusBadge({
  isPast,
  myTicketStatus,
}: {
  isPast: boolean
  myTicketStatus: TicketStatus | null
}) {
  if (myTicketStatus === "Confirmed") {
    return (
      <Badge className="gap-1 border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300 text-[11px] px-2 py-0.5 shrink-0">
        <CheckCircle2 className="h-3 w-3" /> Confirmed
      </Badge>
    )
  }
  if (myTicketStatus === "Waitlisted") {
    return (
      <Badge className="gap-1 border border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-50 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300 text-[11px] px-2 py-0.5 shrink-0">
        <Hourglass className="h-3 w-3" /> Waitlisted
      </Badge>
    )
  }
  if (isPast) {
    return (
      <Badge className="gap-1 border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-50 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-300 text-[11px] px-2 py-0.5 shrink-0">
        Ended
      </Badge>
    )
  }
  return (
    <Badge className="gap-1 border border-sky-200 bg-sky-50 text-sky-700 hover:bg-sky-50 dark:border-sky-500/20 dark:bg-sky-500/10 dark:text-sky-300 text-[11px] px-2 py-0.5 shrink-0">
      Upcoming
    </Badge>
  )
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

// ─── Event Card ───────────────────────────────────────────────────────────────
function CandidateEventCard({
  event,
}: {
  event: CandidateEventListItem
}) {
  const isPast = isEventPast(event.date, event.duration_minutes, event.end_date)
  const spotsLeft = Math.max(0, event.capacity - event.tickets_confirmed)

  return (
    <Card className="overflow-hidden p-0 shadow-xs">
      <Link 
        href={`/events/${event.id}`}
        prefetch={false}
        className="block hover:bg-muted/30 transition-colors"
      >
        {/* Mobile Compact View */}
        <div className="block md:hidden p-3.5">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex items-center gap-2 w-full min-w-0">
                <h4 className="font-semibold text-sm text-foreground truncate leading-snug min-w-0 flex-1">
                  {event.title}
                </h4>
                <div className="shrink-0">
                  <StatusBadge isPast={isPast} myTicketStatus={event.my_ticket_status} />
                </div>
              </div>

              <p className={cn(
                "text-xs line-clamp-1",
                event.description ? "text-muted-foreground" : "italic text-muted-foreground/60"
              )}>
                {event.description ?? "No description provided"}
              </p>

              <div className="flex items-center gap-2 text-[10px] text-muted-foreground flex-wrap">
                <span>{event.venue}</span>
                <span>•</span>
                <span>{formatDateTime(event.date)}</span>
                {event.my_ticket_status && (
                  <>
                    <span>•</span>
                    <span className={cn(
                      event.my_ticket_status === "Confirmed" ? "text-emerald-600 dark:text-emerald-400 font-medium" : "text-amber-600 dark:text-amber-400 font-medium"
                    )}>
                      {event.my_ticket_status}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Desktop Card View */}
        <div className="hidden md:flex flex-row items-center justify-between gap-4 p-5">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 w-full min-w-0">
              <h3 className="min-w-0 flex-1 text-base font-semibold leading-tight text-foreground truncate">
                {event.title}
              </h3>
              <div className="shrink-0">
                <StatusBadge isPast={isPast} myTicketStatus={event.my_ticket_status} />
              </div>
            </div>

            <p className={cn(
              "mt-1 text-xs leading-5 line-clamp-1",
              event.description ? "text-muted-foreground" : "italic text-muted-foreground/60"
            )}>
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
                {spotsLeft > 0 ? `${spotsLeft} spots left` : "Full"}
              </StatChip>

              {event.my_attendance_status === "Present" && (
                <StatChip icon={<CheckCircle2 className="h-3.5 w-3.5" />} tone="emerald">
                  Checked In
                </StatChip>
              )}
            </div>
          </div>
        </div>
      </Link>
    </Card>
  )
}

interface Props {
  events: CandidateEventListItem[]
  candidateName: string
}

export function EventsCandidateClient({
  events,
}: Props) {
  // Search & tab filters state
  const [searchInput, setSearchInput] = useState("")
  const [activeTab, setActiveTab] = useState<Tab>("all")

  // Calculate counts based on all listings
  const stats = useMemo(() => {
    const all = events.length
    const upcoming = events.filter(e => !isEventPast(e.date, e.duration_minutes, e.end_date)).length
    const my = events.filter(e => e.my_ticket_status !== null && e.my_ticket_status !== "Cancelled").length
    const past = events.filter(e => isEventPast(e.date, e.duration_minutes, e.end_date)).length
    return { all, upcoming, my, past }
  }, [events])

  const tabConfig: TabConfig[] = [
    { value: "all", label: "All Events", icon: <Calendar className="h-3.5 w-3.5" />, count: stats.all },
    { value: "upcoming", label: "Upcoming", icon: <CalendarClock className="h-3.5 w-3.5" />, count: stats.upcoming },
    { value: "my", label: "My Tickets", icon: <CheckCircle2 className="h-3.5 w-3.5" />, count: stats.my },
    { value: "past", label: "Past Events", icon: <FileText className="h-3.5 w-3.5" />, count: stats.past },
  ]

  // Client-side filtering & search
  const filteredEvents = useMemo(() => {
    return events.filter(event => {
      const matchSearch =
        event.title.toLowerCase().includes(searchInput.toLowerCase()) ||
        event.venue.toLowerCase().includes(searchInput.toLowerCase()) ||
        (event.description?.toLowerCase().includes(searchInput.toLowerCase()) ?? false)

      if (!matchSearch) return false

      if (activeTab === "upcoming") {
        return !isEventPast(event.date, event.duration_minutes, event.end_date)
      }
      if (activeTab === "my") {
        return event.my_ticket_status !== null && event.my_ticket_status !== "Cancelled"
      }
      if (activeTab === "past") {
        return isEventPast(event.date, event.duration_minutes, event.end_date)
      }
      return true
    })
  }, [events, searchInput, activeTab])

  // Client-side infinite scroll pagination
  const pageSize = 10
  const [visibleCount, setVisibleCount] = useState(pageSize)

  useEffect(() => {
    setVisibleCount(pageSize)
  }, [searchInput, activeTab])

  const paginatedEvents = useMemo(() => {
    return filteredEvents.slice(0, visibleCount)
  }, [filteredEvents, visibleCount])

  const hasMore = visibleCount < filteredEvents.length
  const observerTarget = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore) {
          setVisibleCount((prev) => prev + pageSize)
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
  }, [hasMore])

  return (
    <div className="flex flex-col gap-6 px-4 py-8 md:px-8">
      {/* Page Header */}
      <div className="flex flex-col gap-1.5">
        <h1 className="text-3xl font-bold font-cirka tracking-tight text-foreground">Events</h1>
        <p className="text-sm text-muted-foreground">
          Browse and register for campus events and guest lectures
        </p>
      </div>

      <div className="space-y-4">
        {/* Search (left) + Filters (right) */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          <div className="flex flex-1 items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search events..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="pl-9 pr-9"
              />
              {searchInput && (
                <button
                  onClick={() => setSearchInput("")}
                  className="absolute right-2.5 top-2.5 h-4 w-4 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Filter Sheet */}
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" className="gap-2 shrink-0 h-9">
                  <SlidersHorizontal className="h-4 w-4" />
                  <span>Filters</span>
                  {activeTab !== "all" && (
                    <Badge className="ml-1 px-1.5 py-0.5 text-[10px] bg-primary text-primary-foreground font-semibold">
                      1
                    </Badge>
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-75 sm:w-100">
                <SheetHeader className="px-6 pt-6 pb-2">
                  <SheetTitle>Filter Events</SheetTitle>
                  <SheetDescription>
                    Filter events by status or ticket.
                  </SheetDescription>
                </SheetHeader>
                <div className="px-6 py-4 space-y-6">
                  <div className="space-y-3">
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</h3>
                    <div className="flex flex-col gap-2">
                      {tabConfig.map(({ value, label, icon, count }) => (
                        <button
                          key={value}
                          onClick={() => setActiveTab(value)}
                          className={cn(
                            "flex items-center justify-between w-full px-3 py-2 text-sm rounded-lg border text-left transition-colors",
                            activeTab === value
                              ? "border-primary bg-primary/5 text-primary font-medium"
                              : "border-border/60 hover:bg-muted/50 text-muted-foreground hover:text-foreground"
                          )}
                        >
                          <span className="flex items-center gap-2">
                            {icon}
                            {label}
                          </span>
                          <span className="text-xs font-semibold tabular-nums px-2 py-0.5 rounded-full bg-muted">
                            {count}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>

        {/* Active Filter Chips */}
        {activeTab !== "all" && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted-foreground">Active filters:</span>
            <Badge
              variant="secondary"
              className="gap-1.5 pl-2 pr-1.5 py-1 text-xs hover:bg-secondary/80 font-medium"
            >
              Status: <span className="capitalize font-semibold">{activeTab === "my" ? "My Tickets" : activeTab === "past" ? "Past Events" : activeTab}</span>
              <button
                onClick={() => setActiveTab("all")}
                className="rounded-full p-0.5 hover:bg-muted-foreground/20 text-muted-foreground transition-colors"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setActiveTab("all")}
              className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
            >
              Clear all
            </Button>
          </div>
        )}

        <div className="relative">
          <div className="space-y-4">
            {paginatedEvents.length === 0 ? (
              <Empty className="border border-dashed border-border/60 rounded-xl bg-card/50 p-12">
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <Calendar className="h-5 w-5 text-muted-foreground/60" />
                  </EmptyMedia>
                  <EmptyTitle>No events found</EmptyTitle>
                  <EmptyDescription>
                    There are no events matching your selection at the moment. Try adjusting your filters.
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            ) : (
              <>
                <div className="flex flex-col gap-3 w-full">
                  {paginatedEvents.map((event) => (
                    <CandidateEventCard
                      key={event.id}
                      event={event}
                    />
                  ))}
                </div>

                {/* Scroll Loader Target */}
                <div ref={observerTarget} className="flex justify-center items-center py-6 w-full h-10">
                  {hasMore && (
                    <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground animate-pulse">
                      <Loader2 className="h-4 w-4 animate-spin text-primary" />
                      Loading more...
                    </div>
                  )}
                  {!hasMore && filteredEvents.length > 0 && (
                    <span className="text-xs text-muted-foreground/70">
                      Showing all {filteredEvents.length} events
                    </span>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
