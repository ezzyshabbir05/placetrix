// app/(dashboard)/(licensed)/opportunities/OpportunitiesStaffClient.tsx
"use client"

import { useState, useTransition, useMemo, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription, EmptyContent, EmptyMedia } from "@/components/ui/empty"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetTrigger } from "@/components/ui/sheet"
import { 
  Briefcase, Plus, Search, MapPin, Calendar, 
  X, Clock, Loader2, SlidersHorizontal, CheckCircle2
} from "lucide-react"
import type { 
  OpportunityListItem, 
  OpportunityStatus
} from "./types"

// ─── Status Badge ─────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: OpportunityStatus }) {
  switch (status) {
    case "Published":
      return (
        <Badge className="border-sky-200 bg-sky-50 text-sky-700 hover:bg-sky-50 dark:border-sky-500/20 dark:bg-sky-500/10 dark:text-sky-300 text-[11px] px-2 py-0.5 shrink-0">
          Published
        </Badge>
      )
    case "Draft":
      return (
        <Badge className="border-border bg-muted text-muted-foreground hover:bg-muted text-[11px] px-2 py-0.5 shrink-0">
          Draft
        </Badge>
      )
    case "Concluded":
      return (
        <Badge className="border-border bg-muted text-muted-foreground hover:bg-muted text-[11px] px-2 py-0.5 shrink-0">
          Concluded
        </Badge>
      )
  }
}

// ─── Stat Chip ───────────────────────────────────────────────────────────────
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
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300",
    amber: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300",
    violet: "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-500/20 dark:bg-violet-500/10 dark:text-violet-300",
    rose: "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-300",
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

// Helper to format compensation string
function formatCompensation(opp: OpportunityListItem) {
  if (opp.compensation_type === "full_time" && opp.ctc_lpa) return `${opp.ctc_lpa} LPA`
  if (opp.compensation_type === "internship" && opp.stipend_monthly) return `₹${opp.stipend_monthly.toLocaleString()}/mo`
  if (opp.compensation_type === "stipend_with_ppo" && opp.stipend_monthly) return `₹${opp.stipend_monthly.toLocaleString()}/mo + PPO`
  if (opp.compensation_type === "freelance" && opp.ctc_lpa) return `${opp.ctc_lpa} LPA`
  return "Unpaid"
}

// ─── Opportunity Card ─────────────────────────────────────────────────────────
function OpportunityCard({
  opp
}: {
  opp: OpportunityListItem
}) {
  const deadlineDate = new Date(opp.deadline)
  const isExpired = deadlineDate < new Date()
  const companyName = opp.company?.name || "Unknown Company"
  const compString = formatCompensation(opp)

  return (
    <Card className="overflow-hidden border-border/70 bg-card p-0 shadow-xs">
      <Link 
        href={`/opportunities/${opp.id}`}
        prefetch={false}
        className="block hover:bg-muted/30 transition-colors"
      >
        {/* Mobile Compact View */}
        <div className="block md:hidden p-3.5">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex items-center gap-2 w-full min-w-0">
                <h4 className="font-semibold text-sm text-foreground truncate leading-snug min-w-0 flex-1">
                  {opp.title}
                </h4>
                <div className="shrink-0">
                  <StatusBadge status={opp.status} />
                </div>
              </div>
              
              <p className={cn(
                "text-xs line-clamp-1",
                opp.job_role ? "text-muted-foreground" : "italic text-muted-foreground/60"
              )}>
                {companyName} • {opp.job_role || "No job role provided"}
              </p>

              <div className="flex items-center gap-2 text-[10px] text-muted-foreground flex-wrap">
                <span>{opp.location || "Remote"}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Desktop Card View */}
        <div className="hidden md:flex flex-row items-start justify-between gap-4 p-5">
          <Avatar className="h-10 w-10 shrink-0 rounded-lg border bg-muted/20 p-0.5 shadow-2xs">
            {opp.company?.logo_url && (
              <AvatarImage
                src={opp.company.logo_url}
                alt={`${companyName} logo`}
                className="object-cover rounded-lg"
              />
            )}
            <AvatarFallback className="rounded-lg text-muted-foreground font-semibold text-xs flex items-center justify-center bg-muted">
              {companyName.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 w-full min-w-0">
              <h3 className="min-w-0 flex-1 text-base font-semibold leading-tight text-foreground truncate">
                {opp.title}
              </h3>
              <div className="shrink-0">
                <StatusBadge status={opp.status} />
              </div>
            </div>

            <p className={cn(
              "mt-1 text-xs leading-5",
              opp.job_role ? "text-muted-foreground" : "italic text-muted-foreground/60"
            )}>
              {companyName} • {opp.job_role || "No job role provided"}
            </p>

            <div className="mt-3 flex flex-wrap gap-2">
              <StatChip icon={<MapPin className="h-3.5 w-3.5" />} tone="neutral">
                {opp.location || "Remote"}
              </StatChip>

              <StatChip icon={<Clock className="h-3.5 w-3.5" />} tone={isExpired ? "rose" : "neutral"}>
                {isExpired ? "Expired" : `Deadline: ${new Intl.DateTimeFormat(undefined, { dateStyle: "short" }).format(deadlineDate)}`}
              </StatChip>
            </div>
          </div>
        </div>
      </Link>
    </Card>
  )
}

type Tab = "all" | "Draft" | "Published" | "Concluded"

interface TabConfig {
  value: Tab
  label: string
  icon: React.ReactNode
  count: number
}

interface OpportunitiesStaffClientProps {
  opportunities: OpportunityListItem[]
}

export function OpportunitiesStaffClient({
  opportunities
}: OpportunitiesStaffClientProps) {
  const router = useRouter()

  // Search & tab filters state
  const [searchInput, setSearchInput] = useState("")
  const [activeTab, setActiveTab] = useState<Tab>("all")

  // Client-side filtering & search
  const filteredOpps = useMemo(() => {
    return opportunities.filter(opp => {
      const companyName = opp.company?.name || ""
      const matchSearch = 
        opp.title.toLowerCase().includes(searchInput.toLowerCase()) ||
        companyName.toLowerCase().includes(searchInput.toLowerCase()) ||
        opp.job_role.toLowerCase().includes(searchInput.toLowerCase())

      if (!matchSearch) return false

      if (activeTab !== "all") {
        return opp.status === activeTab
      }
      return true
    })
  }, [opportunities, searchInput, activeTab])

  // Count helper based on raw lists
  const stats = useMemo(() => {
    const all = opportunities.length
    const drafts = opportunities.filter((o: OpportunityListItem) => o.status === "Draft").length
    const published = opportunities.filter((o: OpportunityListItem) => o.status === "Published").length
    const concluded = opportunities.filter((o: OpportunityListItem) => o.status === "Concluded").length
    return { all, drafts, published, concluded }
  }, [opportunities])

  const tabConfig: TabConfig[] = [
    { value: "all", label: "All", icon: <Briefcase className="h-3.5 w-3.5" />, count: stats.all },
    { value: "Draft", label: "Drafts", icon: <X className="h-3.5 w-3.5" />, count: stats.drafts },
    { value: "Published", label: "Published", icon: <CheckCircle2 className="h-3.5 w-3.5" />, count: stats.published },
    { value: "Concluded", label: "Concluded", icon: <Calendar className="h-3.5 w-3.5" />, count: stats.concluded }
  ]

  // Client-side infinite scroll pagination
  const pageSize = 10
  const [visibleCount, setVisibleCount] = useState(pageSize)
  
  useEffect(() => {
    setVisibleCount(pageSize)
  }, [searchInput, activeTab])

  const paginatedOpps = useMemo(() => {
    return filteredOpps.slice(0, visibleCount)
  }, [filteredOpps, visibleCount])

  const hasMore = visibleCount < filteredOpps.length
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

  const handleCreate = () => {
    router.push("/opportunities/new/edit")
  }

  return (
    <div className="flex flex-col gap-6 px-4 py-8 md:px-8">
      {/* Page Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <h1 className="text-3xl font-bold font-cirka tracking-tight text-foreground">Opportunities</h1>
          <p className="text-sm text-muted-foreground">
            Post and manage campus placement drives and job openings
          </p>
        </div>
        <Button onClick={handleCreate} className="gap-1.5 shrink-0">
          <Plus className="h-3.5 w-3.5" /> Post Opportunity
        </Button>
      </div>

      <div className="space-y-4">
        {/* Search (left) + Filters (right) */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          <div className="flex flex-1 items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search opportunities..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="pl-9 pr-9"
              />
              {searchInput && (
                <button
                  onClick={() => setSearchInput("")}
                  className="absolute right-2.5 top-2.5 h-4 w-4 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
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
              <SheetContent side="right" className="w-[300px] sm:w-[400px]">
                <SheetHeader className="px-6 pt-6 pb-2">
                  <SheetTitle>Filter Opportunities</SheetTitle>
                  <SheetDescription>
                    Filter postings by status.
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
              Status: <span className="capitalize font-semibold">{activeTab}</span>
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
            {paginatedOpps.length === 0 ? (
              <Empty className="border border-dashed border-border/60 rounded-xl bg-card/50 p-12">
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <Briefcase className="h-5 w-5 text-muted-foreground/60" />
                  </EmptyMedia>
                  <EmptyTitle>No opportunities found</EmptyTitle>
                  <EmptyDescription>
                    No matching opportunities were found. Try adjusting your search query or status filter.
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            ) : (
              <>
                <div className="flex flex-col gap-3 w-full">
                  {paginatedOpps.map((opp) => (
                    <OpportunityCard
                      key={opp.id}
                      opp={opp}
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
                  {!hasMore && filteredOpps.length > 0 && (
                    <span className="text-xs text-muted-foreground/70">
                      Showing all {filteredOpps.length} opportunities
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
