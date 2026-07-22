// app/(dashboard)/(licensed)/opportunities/OpportunitiesCandidateClient.tsx
"use client"

import { useState, useMemo, useEffect, useRef } from "react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription, EmptyContent, EmptyMedia } from "@/components/ui/empty"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetTrigger } from "@/components/ui/sheet"
import { HoverCard, HoverCardTrigger, HoverCardContent } from "@/components/ui/hover-card"
import { 
  Briefcase, Search, MapPin, Calendar, CheckCircle2, 
  Clock, X, SlidersHorizontal, Loader2
} from "lucide-react"
import type { CandidateOpportunityListItem } from "./types"

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

function OpportunityStatusBadge({
  opp,
  isEligible
}: {
  opp: CandidateOpportunityListItem
  isEligible: boolean
}) {
  if (opp.my_application_id) {
    return (
      <Badge className="border-border bg-muted text-muted-foreground hover:bg-muted text-[11px] px-2 py-0.5 shrink-0">
        Applied
      </Badge>
    )
  }
  if (isEligible) {
    return (
      <Badge className="border-sky-200 bg-sky-50 text-sky-700 hover:bg-sky-50 dark:border-sky-500/20 dark:bg-sky-500/10 dark:text-sky-300 text-[11px] px-2 py-0.5 shrink-0">
        Eligible
      </Badge>
    )
  }
  return (
    <Badge className="border-border bg-muted text-muted-foreground hover:bg-muted text-[11px] px-2 py-0.5 shrink-0">
      Not Eligible
    </Badge>
  )
}

// Helper to format compensation string
function formatCompensation(opp: CandidateOpportunityListItem) {
  if (opp.compensation_type === "full_time" && opp.ctc_lpa) return `${opp.ctc_lpa} LPA`
  if (opp.compensation_type === "internship" && opp.stipend_monthly) return `₹${opp.stipend_monthly.toLocaleString()}/mo`
  if (opp.compensation_type === "stipend_with_ppo" && opp.stipend_monthly) return `₹${opp.stipend_monthly.toLocaleString()}/mo + PPO`
  if (opp.compensation_type === "freelance" && opp.ctc_lpa) return `${opp.ctc_lpa} LPA`
  return "Unpaid"
}

// ─── Opportunity Card ─────────────────────────────────────────────────────────
function OpportunityCard({
  opp,
  isEligible
}: {
  opp: CandidateOpportunityListItem
  isEligible: boolean
}) {
  const deadlineDate = new Date(opp.deadline)
  const isExpired = deadlineDate < new Date()
  const companyName = opp.company?.name || "Unknown Company"
  const compString = formatCompensation(opp)

  return (
    <Card className="overflow-hidden border-border/70 bg-card p-0 shadow-xs">
      <Link 
        href={`/opportunities/${opp.id}`}
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
                  <OpportunityStatusBadge opp={opp} isEligible={isEligible} />
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
                <span>•</span>
                <span className={cn(isExpired && "text-rose-600 dark:text-rose-400 font-medium")}>
                  {isExpired ? "Expired" : `Ends: ${deadlineDate.toLocaleDateString("en-IN", { dateStyle: "short" })}`}
                </span>
                {opp.my_application_id && (
                  <>
                    <span>•</span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                      {opp.my_application_status === "Offered" ? "Offered" : opp.my_application_status}
                    </span>
                  </>
                )}
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
                <OpportunityStatusBadge opp={opp} isEligible={isEligible} />
              </div>
            </div>

            <p className={cn(
              "mt-1 text-xs leading-5 flex items-center gap-1",
              opp.job_role ? "text-muted-foreground" : "italic text-muted-foreground/60"
            )}>
              <HoverCard>
                <HoverCardTrigger asChild>
                  <span className="font-medium text-foreground hover:underline cursor-pointer">
                    {companyName}
                  </span>
                </HoverCardTrigger>
                <HoverCardContent className="w-64">
                  <div className="flex gap-3">
                    <Avatar className="size-10">
                      <AvatarImage src={opp.company?.logo_url || undefined} />
                      <AvatarFallback className="text-xs">{companyName.slice(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="space-y-1">
                      <h4 className="text-xs font-semibold">{companyName}</h4>
                      <p className="text-[11px] text-muted-foreground">
                        {(opp.company as { industry?: string })?.industry || "Hiring Partner"}
                      </p>
                      {opp.location && (
                        <p className="text-[10px] text-muted-foreground pt-1">
                          📍 {opp.location}
                        </p>
                      )}
                    </div>
                  </div>
                </HoverCardContent>
              </HoverCard>
              <span>•</span>
              <span>{opp.job_role || "No job role provided"}</span>
            </p>

            <div className="mt-3 flex flex-wrap gap-2">
              <StatChip icon={<MapPin className="h-3.5 w-3.5" />} tone="neutral">
                {opp.location || "Remote"}
              </StatChip>

              <StatChip icon={<Clock className="h-3.5 w-3.5" />} tone={isExpired ? "rose" : "neutral"}>
                {isExpired ? "Expired" : `Deadline: ${deadlineDate.toLocaleDateString("en-IN", { dateStyle: "short" })}`}
              </StatChip>
            </div>
          </div>
        </div>
      </Link>
    </Card>
  )
}

interface OpportunitiesCandidateClientProps {
  opportunities: CandidateOpportunityListItem[]
  candidateAcademic: {
    cgpa: number | null
  }
  profileId: string
}

type Tab = "all" | "eligible" | "applied"

interface TabConfig {
  value: Tab
  label: string
  icon: React.ReactNode
  count: number
}

export function OpportunitiesCandidateClient({
  opportunities,
  candidateAcademic
}: OpportunitiesCandidateClientProps) {
  // Search & tab filters state
  const [searchInput, setSearchInput] = useState("")
  const [activeTab, setActiveTab] = useState<Tab>("all")

  // Calculate counts based on all listings
  const stats = useMemo(() => {
    const totalCount = opportunities.length
    
    const eligibleCount = opportunities.filter(opp => {
      return !opp.min_cgpa || (candidateAcademic.cgpa != null && candidateAcademic.cgpa >= opp.min_cgpa)
    }).length

    const appliedCount = opportunities.filter(opp => opp.my_application_id !== null).length

    return { totalCount, eligibleCount, appliedCount }
  }, [opportunities, candidateAcademic])

  const tabConfig: TabConfig[] = [
    { value: "all", label: "All", icon: <Briefcase className="h-3.5 w-3.5" />, count: stats.totalCount },
    { value: "eligible", label: "Eligible", icon: <CheckCircle2 className="h-3.5 w-3.5" />, count: stats.eligibleCount },
    { value: "applied", label: "Applied", icon: <Calendar className="h-3.5 w-3.5" />, count: stats.appliedCount },
  ]

  // Get specific eligibility detailed check for an opportunity
  const checkEligibility = (opp: CandidateOpportunityListItem) => {
    const cgpaOk = !opp.min_cgpa || (candidateAcademic.cgpa != null && candidateAcademic.cgpa >= opp.min_cgpa)
    return {
      isEligible: !!cgpaOk
    }
  }

  // Client-side filtering & search
  const filteredOpps = useMemo(() => {
    return opportunities.filter(opp => {
      const companyName = opp.company?.name || ""
      const matchSearch = 
        opp.title.toLowerCase().includes(searchInput.toLowerCase()) ||
        companyName.toLowerCase().includes(searchInput.toLowerCase()) ||
        opp.job_role.toLowerCase().includes(searchInput.toLowerCase())

      if (!matchSearch) return false

      if (activeTab === "eligible") {
        return !opp.min_cgpa || (candidateAcademic.cgpa != null && candidateAcademic.cgpa >= opp.min_cgpa)
      }
      if (activeTab === "applied") {
        return opp.my_application_id !== null
      }
      return true
    })
  }, [opportunities, searchInput, activeTab, candidateAcademic])

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

  return (
    <div className="flex flex-col gap-6 px-4 py-8 md:px-8">
      {/* Page Header */}
      <div className="flex flex-col gap-1.5">
        <h1 className="text-3xl font-bold font-cirka tracking-tight text-foreground">Opportunities</h1>
        <p className="text-sm text-muted-foreground">
          Browse and apply to job openings and placement drives
        </p>
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
                  <SheetTitle>Filter Postings</SheetTitle>
                  <SheetDescription>
                    Filter opportunities by eligibility or application status.
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
                    There are no job postings matching your selection at the moment. Try adjusting your filters.
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            ) : (
              <>
                <div className="flex flex-col gap-3 w-full">
                  {paginatedOpps.map((opp) => {
                    const elg = checkEligibility(opp)
                    return (
                      <OpportunityCard
                        key={opp.id}
                        opp={opp}
                        isEligible={elg.isEligible}
                      />
                    )
                  })}
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
