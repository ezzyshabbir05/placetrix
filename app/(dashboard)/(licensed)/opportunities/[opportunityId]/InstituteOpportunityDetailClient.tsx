// app/(dashboard)/(licensed)/opportunities/[opportunityId]/InstituteOpportunityDetailClient.tsx
"use client"

import { useState, useTransition, useMemo, type ReactNode } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Briefcase, MapPin, IndianRupee, Calendar, Users,
  Trash2, Edit3, Download, Building2, Search, X,
  Clock, ArrowLeft, CheckCircle2, Info, MoreHorizontal, Loader2, ChevronRight, XCircle,
  Sparkles, ListTodo, Award, FileText
} from "lucide-react"
import { toast } from "sonner"
import { deleteOpportunityAction, updateApplicationStatusAction } from "../actions"
import type { OpportunityListItem, OpportunityApplication, ApplicationStatus } from "../types"

interface InstituteOpportunityDetailClientProps {
  opportunity: OpportunityListItem
  applications: OpportunityApplication[]
}

const APPLICATION_STAGES: { value: ApplicationStatus; label: string; color: string }[] = [
  { value: "Applied", label: "Applied", color: "bg-blue-500/10 text-blue-500 hover:bg-blue-500/20" },
  { value: "Shortlisted", label: "Shortlisted", color: "bg-yellow-500/10 text-yellow-600 hover:bg-yellow-500/20" },
  { value: "Interviewing", label: "Interviewing", color: "bg-purple-500/10 text-purple-600 hover:bg-purple-500/20" },
  { value: "Offered", label: "Offered (Placed)", color: "bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20" },
  { value: "Rejected", label: "Rejected", color: "bg-red-500/10 text-red-500 hover:bg-red-500/20" }
]

function getInitials(name: string) {
  if (!name) return "?"
  return name
    .split(" ")
    .filter(Boolean)
    .map(n => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)
}

function PageHeader({
  opp,
  companyName,
  onEdit,
  onDelete,
  isPending
}: {
  opp: OpportunityListItem;
  companyName: string;
  onEdit: () => void;
  onDelete: () => void;
  isPending: boolean
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex gap-4 items-start min-w-0">
        <Avatar className="h-16 w-16 shrink-0 rounded-xl border shadow-xs bg-background">
          {opp.company?.logo_url && (
            <AvatarImage
              src={opp.company.logo_url}
              alt={`${companyName} logo`}
              className="object-cover"
            />
          )}
          <AvatarFallback className="rounded-xl text-muted-foreground font-bold text-xl flex items-center justify-center">
            {companyName.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="flex flex-col gap-1.5 min-w-0">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <h1 className="text-3xl font-bold font-cirka tracking-tight text-foreground">
              {opp.title}
            </h1>
            <Badge variant={opp.status === "Published" ? "default" : "secondary"} className="text-xs">
              {opp.status}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">{companyName}</span> · {opp.job_role}
          </p>
        </div>
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="w-full gap-1.5 sm:w-auto"
            disabled={isPending}
          >
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <MoreHorizontal className="h-4 w-4" />
            )}
            Actions
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem onClick={onEdit} disabled={isPending}>
            <Edit3 className="mr-2 h-3.5 w-3.5" />
            Edit Opportunity
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={onDelete} disabled={isPending} className="text-destructive focus:text-destructive">
            <Trash2 className="mr-2 h-3.5 w-3.5" />
            Delete Posting
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

function MetaItem({
  icon,
  label,
  value,
}: {
  icon: ReactNode
  label: string
  value: string
}) {
  return (
    <div className="flex items-start gap-2.5">
      <span className="mt-0.5 shrink-0 text-muted-foreground">{icon}</span>
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
        <p className="mt-0.5 text-sm font-semibold text-foreground">{value}</p>
      </div>
    </div>
  )
}

function renderBullets(text: string | null) {
  if (!text) return null
  const lines = text.split("\n").map(l => l.trim()).filter(Boolean)
  if (lines.length === 0) return null

  return (
    <ul className="list-disc pl-5 space-y-2 text-sm text-muted-foreground">
      {lines.map((line, idx) => {
        const cleanLine = line.replace(/^[\s*\-•\d+\.]+\s*/, "")
        return <li key={idx}>{cleanLine}</li>
      })}
    </ul>
  )
}

function StatsBar({ stats }: { stats: { total: number; offered: number; shortlisted: number; interviewing: number; rejected: number } }) {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <Card className="rounded-xl py-0">
        <CardContent className="p-4 space-y-1">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Users className="h-3.5 w-3.5" />
            <p className="text-xs font-medium">Total Applicants</p>
          </div>
          <p className="text-2xl font-bold tabular-nums">{stats.total}</p>
          <p className="text-xs text-muted-foreground">Applied to posting</p>
        </CardContent>
      </Card>

      <Card className="rounded-xl py-0">
        <CardContent className="p-4 space-y-1">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <CheckCircle2 className="h-3.5 w-3.5" />
            <p className="text-xs font-medium">Offered / Placed</p>
          </div>
          <p className="text-2xl font-bold tabular-nums text-emerald-600 dark:text-emerald-500">{stats.offered}</p>
          <p className="text-xs text-muted-foreground">Received job offers</p>
        </CardContent>
      </Card>

      <Card className="rounded-xl py-0">
        <CardContent className="p-4 space-y-1">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            <p className="text-xs font-medium">In Process</p>
          </div>
          <p className="text-2xl font-bold tabular-nums text-amber-600 dark:text-amber-500">
            {stats.shortlisted + stats.interviewing}
          </p>
          <p className="text-xs text-muted-foreground">Shortlisted / Interviewing</p>
        </CardContent>
      </Card>

      <Card className="rounded-xl border py-0">
        <CardContent className="p-4 space-y-1">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <XCircle className="h-3.5 w-3.5" />
            <p className="text-xs font-medium">Rejected</p>
          </div>
          <p className="text-2xl font-bold tabular-nums text-destructive">{stats.rejected}</p>
          <p className="text-xs text-muted-foreground">Not selected</p>
        </CardContent>
      </Card>
    </div>
  )
}

export function InstituteOpportunityDetailClient({
  opportunity,
  applications
}: InstituteOpportunityDetailClientProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [activeTab, setActiveTab] = useState("overview")

  // Search & Filter state for Applicants
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")

  const deadlineDate = new Date(opportunity.deadline)
  const companyName = opportunity.company?.name || "Unknown Company"

  // Helper to format compensation string
  function formatCompensation() {
    if (opportunity.compensation_type === "full_time" && opportunity.ctc_lpa) return `${opportunity.ctc_lpa} LPA`
    if (opportunity.compensation_type === "internship" && opportunity.stipend_monthly) return `₹${opportunity.stipend_monthly.toLocaleString()}/mo`
    if (opportunity.compensation_type === "stipend_with_ppo" && opportunity.stipend_monthly) return `₹${opportunity.stipend_monthly.toLocaleString()}/mo + PPO`
    if (opportunity.compensation_type === "freelance" && opportunity.ctc_lpa) return `${opportunity.ctc_lpa} LPA`
    return "Unpaid"
  }

  // Delete Action
  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this opportunity? This will delete all applications too.")) return

    startTransition(async () => {
      try {
        const res = await deleteOpportunityAction(opportunity.id)
        if (res.success) {
          toast.success("Opportunity deleted successfully.")
          router.push("/opportunities")
          router.refresh()
        }
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to delete opportunity")
      }
    })
  }

  // Stage Change Action
  const handleStageChange = async (appId: string, newStatus: ApplicationStatus) => {
    startTransition(async () => {
      try {
        const res = await updateApplicationStatusAction(appId, newStatus)
        if (res.success) {
          toast.success(`Candidate status updated to ${newStatus}`)
          router.refresh()
        }
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to update candidate status")
      }
    })
  }

  // Aggregate stats
  const stats = useMemo(() => {
    const total = applications.length
    const offered = applications.filter(a => a.status === "Offered").length
    const shortlisted = applications.filter(a => a.status === "Shortlisted").length
    const interviewing = applications.filter(a => a.status === "Interviewing").length
    const rejected = applications.filter(a => a.status === "Rejected").length
    return { total, offered, shortlisted, interviewing, rejected }
  }, [applications])

  // Filter applicants list dynamically
  const filteredApplications = useMemo(() => {
    return applications.filter(app => {
      const matchSearch =
        (app.candidate_name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (app.candidate_email || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (app.candidate_course && app.candidate_course.toLowerCase().includes(searchQuery.toLowerCase()))

      const matchStatus = statusFilter === "all" || app.status === statusFilter

      return matchSearch && matchStatus
    })
  }, [applications, searchQuery, statusFilter])

  return (
    <div className="flex flex-col gap-6 px-4 py-8 md:px-8 w-full animate-in fade-in duration-500">
      {/* Back Button */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <Button variant="ghost" asChild className="gap-1.5 -ml-3 self-start hover:bg-muted/50 rounded-xl transition-all">
          <Link href="/opportunities">
            <ArrowLeft className="h-4 w-4" /> Back to Opportunities
          </Link>
        </Button>
      </div>

      {/* Page Header */}
      <PageHeader
        opp={opportunity}
        companyName={companyName}
        onEdit={() => router.push(`/opportunities/${opportunity.id}/edit`)}
        onDelete={handleDelete}
        isPending={isPending}
      />

      {/* Stats Bar */}
      <StatsBar stats={stats} />

      {/* Tabs Layout */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <div className="overflow-x-auto pb-1">
          <TabsList className="inline-flex h-9 gap-0.5 rounded-lg bg-muted p-1 border">
            {[
              { value: "overview", label: "Overview", icon: <Info className="h-3.5 w-3.5" />, count: null },
              { value: "applicants", label: "Applicants", icon: <Users className="h-3.5 w-3.5" />, count: applications.length }
            ].map(({ value, label, icon, count }) => (
              <TabsTrigger
                key={value}
                value={value}
                className="gap-1.5 rounded-md px-3 text-xs font-medium data-[state=active]:bg-background data-[state=active]:shadow-sm text-muted-foreground data-[state=active]:text-foreground"
              >
                {icon}
                <span>{label}</span>
                {count != null && count > 0 && (
                  <span
                    className={cn(
                      "inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-semibold tabular-nums",
                      activeTab === value
                        ? "bg-foreground text-background"
                        : "bg-muted-foreground/20 text-muted-foreground"
                    )}
                  >
                    {count}
                  </span>
                )}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        {/* Tab 1: Overview */}
        <TabsContent value="overview" className="m-0 space-y-6">
          {/* Opportunity Overview Card */}
          <Card className="rounded-xl border bg-muted/30 w-full overflow-hidden">
            <CardContent className="p-4">
              <p className="pb-2.5 border-b mb-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Opportunity Overview
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <MetaItem
                  icon={<MapPin className="h-4 w-4" />}
                  label="Location"
                  value={opportunity.location || "Remote"}
                />
                <MetaItem
                  icon={<IndianRupee className="h-4 w-4" />}
                  label="Package Details"
                  value={formatCompensation()}
                />
                {opportunity.job_type && (
                  <MetaItem
                    icon={<Building2 className="h-4 w-4" />}
                    label="Job Type"
                    value={opportunity.job_type}
                  />
                )}
                {opportunity.job_timing && (
                  <MetaItem
                    icon={<Clock className="h-4 w-4" />}
                    label="Job Timing"
                    value={opportunity.job_timing}
                  />
                )}
                <MetaItem
                  icon={<FileText className="h-4 w-4" />}
                  label="Service Agreement"
                  value={opportunity.bond_details || "None"}
                />
                <MetaItem
                  icon={<Calendar className="h-4 w-4" />}
                  label="Apply Before"
                  value={new Date(opportunity.deadline).toLocaleString("en-IN", {
                    dateStyle: "medium",
                    timeStyle: "short"
                  })}
                />
              </div>
            </CardContent>
          </Card>

          {/* Eligibility Criteria Card */}
          <Card className="rounded-xl border bg-muted/30 w-full overflow-hidden">
            <CardContent className="p-4">
              <p className="pb-2.5 border-b mb-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Eligibility Criteria
              </p>
              <div className="space-y-4">
                <MetaItem
                  icon={<Building2 className="h-4 w-4" />}
                  label="CGPA Cutoff"
                  value={opportunity.min_cgpa > 0 ? `${opportunity.min_cgpa.toFixed(2)} or above` : "None"}
                />
              </div>
            </CardContent>
          </Card>

          {/* Details & Job Description */}
          <div className="space-y-4">
            {opportunity.job_description && (
              <Card className="rounded-xl border bg-muted/30 w-full overflow-hidden">
                <CardContent className="p-4">
                  <p className="pb-2.5 border-b mb-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Job Description & Details
                  </p>
                  <p className="overflow-hidden break-words whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
                    {opportunity.job_description}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Roles & Responsibilities */}
            {opportunity.roles_responsibilities && (
              <Card className="rounded-xl border bg-muted/30 w-full overflow-hidden">
                <CardContent className="p-4">
                  <p className="pb-2.5 border-b mb-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Roles & Responsibilities
                  </p>
                  {renderBullets(opportunity.roles_responsibilities)}
                </CardContent>
              </Card>
            )}

            {/* Requirements */}
            {opportunity.requirements && (
              <Card className="rounded-xl border bg-muted/30 w-full overflow-hidden">
                <CardContent className="p-4">
                  <p className="pb-2.5 border-b mb-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Requirements
                  </p>
                  {renderBullets(opportunity.requirements)}
                </CardContent>
              </Card>
            )}

            {/* Perks & Benefits */}
            {opportunity.perks && (
              <Card className="rounded-xl border bg-muted/30 w-full overflow-hidden">
                <CardContent className="p-4">
                  <p className="pb-2.5 border-b mb-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Perks & Benefits
                  </p>
                  {renderBullets(opportunity.perks)}
                </CardContent>
              </Card>
            )}

            {/* Company details (if present) */}
            {opportunity.company && (
              <Card className="rounded-xl border bg-muted/30 w-full overflow-hidden">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between pb-2.5 border-b mb-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      About {opportunity.company.name}
                    </p>
                    {opportunity.company.website && (
                      <a
                        href={opportunity.company.website.startsWith("http://") || opportunity.company.website.startsWith("https://")
                          ? opportunity.company.website
                          : `https://${opportunity.company.website}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-primary hover:text-primary/80 transition-colors font-semibold flex items-center gap-1"
                      >
                        Visit Website <ChevronRight className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                  <p className="overflow-hidden break-words whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
                    {opportunity.company.description || "No company description provided."}
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* Tab 2: Applicants */}
        <TabsContent value="applicants" className="m-0 space-y-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
            <div className="flex flex-1 flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground/70" />
                <Input
                  placeholder="Search applicants by name, email, course..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 pr-9 h-10 rounded-xl border-border/80 shadow-2xs focus-visible:ring-primary/20"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 top-3 h-4 w-4 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-[180px] h-10 rounded-xl border-border/80 shadow-2xs focus:ring-primary/20">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="all">All Stages</SelectItem>
                  {APPLICATION_STAGES.map(stage => (
                    <SelectItem key={stage.value} value={stage.value} className="rounded-lg">{stage.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {filteredApplications.length === 0 ? (
            <Card className="p-12 text-center border-2 border-dashed bg-card/50 rounded-2xl">
              <Users className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
              <h4 className="font-bold text-lg text-foreground">No applicants found</h4>
              <p className="text-sm text-muted-foreground/80 mt-1.5 max-w-sm mx-auto">
                {applications.length === 0
                  ? "Once candidates apply, their details will appear here."
                  : "No applicants match the current search filters."}
              </p>
            </Card>
          ) : (
            <div className="space-y-4">
              {/* Desktop Table View */}
              <div className="hidden md:block border rounded-xl bg-card overflow-hidden">
                <Table>
                  <TableHeader className="bg-muted/30">
                    <TableRow>
                      <TableHead className="font-semibold text-xs text-muted-foreground pl-6">Candidate</TableHead>
                      <TableHead className="font-semibold text-xs text-muted-foreground">Course / Year</TableHead>
                      <TableHead className="font-semibold text-xs text-muted-foreground text-center">CGPA</TableHead>
                      <TableHead className="font-semibold text-xs text-muted-foreground text-center">Resume</TableHead>
                      <TableHead className="font-semibold text-xs text-muted-foreground text-center">Status</TableHead>
                      <TableHead className="font-semibold text-xs text-muted-foreground text-right pr-6">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredApplications.map((app) => (
                      <TableRow key={app.id} className="hover:bg-muted/10">
                        <TableCell className="pl-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/5 text-primary border font-bold text-xs shadow-2xs">
                              {getInitials(app.candidate_name || "Unknown")}
                            </div>
                            <div>
                              <div className="font-bold text-sm text-foreground">{app.candidate_name || "Unknown"}</div>
                              <div className="text-muted-foreground text-[10px] mt-0.5 font-medium flex items-center gap-1.5">
                                <span>{app.candidate_email || "N/A"}</span>
                                {app.candidate_phone && (
                                  <>
                                    <span className="text-muted-foreground/40">•</span>
                                    <span>{app.candidate_phone}</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="font-semibold text-foreground">{app.candidate_course || "N/A"}</div>
                          <div className="text-[10px] text-muted-foreground/80 mt-0.5 font-medium">Year: {app.candidate_passout_year || "N/A"}</div>
                        </TableCell>
                        <TableCell className="text-center font-extrabold text-sm text-foreground">
                          {app.candidate_cgpa != null ? app.candidate_cgpa.toFixed(2) : "—"}
                        </TableCell>
                        <TableCell className="text-center">
                          <Button variant="outline" size="sm" className="h-8 gap-1.5 rounded-lg border-border/80 text-[11px] font-semibold hover:bg-muted/50" asChild>
                            <a
                              href={app.resume_url}
                              target="_blank"
                              rel="noreferrer"
                            >
                              <Download className="h-3 w-3 text-muted-foreground" /> PDF
                            </a>
                          </Button>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className={cn(
                            "inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-extrabold uppercase border tracking-wider",
                            app.status === "Applied" && "bg-blue-500/10 text-blue-600 border-blue-500/20 dark:text-blue-400",
                            app.status === "Shortlisted" && "bg-yellow-500/10 text-yellow-600 border-yellow-500/20 dark:text-yellow-400",
                            app.status === "Interviewing" && "bg-purple-500/10 text-purple-600 border-purple-500/20 dark:text-purple-400",
                            app.status === "Offered" && "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:text-emerald-400",
                            app.status === "Rejected" && "bg-red-500/10 text-red-600 border-red-500/20 dark:text-red-400"
                          )}>
                            {app.status === "Offered" ? "Offered (Placed)" : app.status}
                          </span>
                        </TableCell>
                        <TableCell className="text-right pr-6">
                          <Select
                            value={app.status}
                            onValueChange={(val) => handleStageChange(app.id, val as any)}
                            disabled={isPending}
                          >
                            <SelectTrigger className="w-[125px] h-8 text-[11px] rounded-lg ml-auto border-border/80 shadow-2xs hover:bg-muted/50 focus:ring-primary/20">
                              <SelectValue placeholder="Status" />
                            </SelectTrigger>
                            <SelectContent className="rounded-lg">
                              {APPLICATION_STAGES.map(stage => (
                                <SelectItem key={stage.value} value={stage.value} className="text-xs rounded-md">
                                  {stage.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile Card List View */}
              <div className="grid grid-cols-1 gap-4 md:hidden">
                {filteredApplications.map((app) => (
                  <Card key={app.id} className="rounded-2xl border bg-card p-5 space-y-4 shadow-2xs">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/5 text-primary border font-bold text-xs shadow-2xs">
                          {getInitials(app.candidate_name || "Unknown")}
                        </div>
                        <div>
                          <h4 className="font-bold text-sm text-foreground">{app.candidate_name || "Unknown"}</h4>
                          <p className="text-muted-foreground text-[10px] mt-0.5 font-medium">{app.candidate_email || "N/A"}</p>
                          {app.candidate_phone && (
                            <p className="text-muted-foreground text-[10px] mt-0.5 font-medium">{app.candidate_phone}</p>
                          )}
                        </div>
                      </div>

                      <span className={cn(
                        "inline-flex items-center rounded-full px-2.5 py-0.5 text-[9px] font-extrabold uppercase border tracking-wider shrink-0",
                        app.status === "Applied" && "bg-blue-500/10 text-blue-600 border-blue-500/20 dark:text-blue-400",
                        app.status === "Shortlisted" && "bg-yellow-500/10 text-yellow-600 border-yellow-500/20 dark:text-yellow-400",
                        app.status === "Interviewing" && "bg-purple-500/10 text-purple-600 border-purple-500/20 dark:text-purple-400",
                        app.status === "Offered" && "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:text-emerald-400",
                        app.status === "Rejected" && "bg-red-500/10 text-red-600 border-red-500/20 dark:text-red-400"
                      )}>
                        {app.status === "Offered" ? "Offered (Placed)" : app.status}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-4 border-y py-3 text-xs">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">Course / Year</p>
                        <p className="font-semibold text-foreground mt-0.5">{app.candidate_course || "N/A"}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">Year: {app.candidate_passout_year || "N/A"}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">CGPA</p>
                        <p className="text-base font-black text-foreground mt-0.5">
                          {app.candidate_cgpa != null ? app.candidate_cgpa.toFixed(2) : "—"}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-4 pt-1">
                      <Button variant="outline" size="sm" className="h-9 gap-1.5 rounded-xl border-border/80 text-xs font-semibold hover:bg-muted/50" asChild>
                        <a href={app.resume_url} target="_blank" rel="noreferrer">
                          <Download className="h-3.5 w-3.5 text-muted-foreground" /> Resume
                        </a>
                      </Button>

                      <Select
                        value={app.status}
                        onValueChange={(val) => handleStageChange(app.id, val as any)}
                        disabled={isPending}
                      >
                        <SelectTrigger className="w-[125px] h-9 text-[11px] rounded-xl border-border/80 shadow-2xs hover:bg-muted/50 focus:ring-primary/20">
                          <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                          {APPLICATION_STAGES.map(stage => (
                            <SelectItem key={stage.value} value={stage.value} className="text-xs rounded-md">
                              {stage.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
