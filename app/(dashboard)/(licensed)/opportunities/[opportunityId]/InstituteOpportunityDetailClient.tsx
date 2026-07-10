// app/(dashboard)/(licensed)/opportunities/[opportunityId]/InstituteOpportunityDetailClient.tsx
"use client"

import { useState, useTransition, useMemo, type ReactNode } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
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
  Clock, ArrowLeft, CheckCircle2, Info, MoreHorizontal, Loader2, ChevronRight
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

function PageHeader({ opp, companyName }: { opp: OpportunityListItem; companyName: string }) {
  return (
    <div className="relative overflow-hidden rounded-2xl border bg-card p-6 md:p-8 shadow-xs">
      <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-transparent pointer-events-none" />
      <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex flex-col md:flex-row items-start gap-5">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border bg-muted/40 text-muted-foreground shadow-2xs">
            <Building2 className="h-8 w-8 text-foreground/75" />
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline" className="uppercase text-[10px] font-semibold tracking-wider px-2 py-0.5 rounded-md border-border/80 bg-muted/10">
                {opp.compensation_type.replace("_", " ")}
              </Badge>
              <Badge className={cn(
                opp.status === "Published" 
                  ? "border-sky-500/20 bg-sky-500/10 text-sky-600 dark:text-sky-400 font-semibold"
                  : "border-border bg-muted text-muted-foreground font-medium",
                "text-[10px] uppercase px-2 py-0.5 rounded-md border"
              )}>
                {opp.status}
              </Badge>
            </div>
            <h1 className="text-3xl md:text-4xl font-extrabold font-cirka tracking-tight text-foreground leading-tight">
              {opp.title}
            </h1>
            <p className="text-sm text-muted-foreground font-medium flex flex-wrap items-center gap-x-2 gap-y-1">
              <span>Published by</span>
              <span className="text-foreground font-bold">{companyName}</span>
              <span className="text-muted-foreground/50">•</span>
              <span className="text-muted-foreground/80">{opp.job_role}</span>
            </p>
          </div>
        </div>
      </div>
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
    <div className="group flex items-start gap-4 rounded-2xl border bg-card p-4 transition-all duration-300 hover:shadow-xs hover:border-border/80">
      <span className="mt-0.5 shrink-0 flex h-10 w-10 items-center justify-center rounded-xl bg-muted/40 text-muted-foreground group-hover:bg-primary/5 group-hover:text-primary transition-colors duration-300">
        {icon}
      </span>
      <div className="space-y-0.5">
        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">
          {label}
        </p>
        <p className="text-sm font-semibold text-foreground leading-snug">{value}</p>
      </div>
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
  const isExpired = deadlineDate < new Date()
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
    <div className="flex flex-col gap-6 px-4 py-8 md:px-8 w-full max-w-7xl mx-auto animate-in fade-in duration-500">
      {/* Back Button & Actions Row */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <Button variant="ghost" asChild className="gap-1.5 -ml-3 self-start hover:bg-muted/50 rounded-xl transition-all">
          <Link href="/opportunities">
            <ArrowLeft className="h-4 w-4" /> Back to Opportunities
          </Link>
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 h-10 px-4 rounded-xl border-border/80 shadow-2xs hover:bg-muted/50"
              disabled={isPending}
            >
              {isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <MoreHorizontal className="h-4 w-4" />
              )}
              <span>Actions</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48 rounded-xl">
            <DropdownMenuItem
              onClick={() => router.push(`/opportunities/${opportunity.id}/edit`)}
              disabled={isPending}
              className="rounded-lg"
            >
              <Edit3 className="mr-2 h-3.5 w-3.5" />
              Edit Opportunity
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            <DropdownMenuItem
              variant="destructive"
              onClick={handleDelete}
              disabled={isPending}
              className="rounded-lg"
            >
              <Trash2 className="mr-2 h-3.5 w-3.5" />
              Delete Posting
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Page Header */}
      <PageHeader opp={opportunity} companyName={companyName} />

      {/* Tabs Layout */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <div className="overflow-x-auto pb-1">
          <TabsList className="inline-flex h-11 gap-1 rounded-xl bg-muted/50 p-1 border">
            {[
              { value: "overview", label: "Overview", icon: <Info className="h-4 w-4" />, count: null },
              { value: "applicants", label: "Applicants", icon: <Users className="h-4 w-4" />, count: applications.length }
            ].map(({ value, label, icon, count }) => (
              <TabsTrigger
                key={value}
                value={value}
                className="gap-2 rounded-lg px-4 py-1.5 text-xs font-bold transition-all data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-xs text-muted-foreground hover:text-foreground"
              >
                {icon}
                <span>{label}</span>
                {count != null && count > 0 && (
                  <span
                    className={cn(
                      "inline-flex h-5 min-w-5 items-center justify-center rounded-md px-1.5 text-[10px] font-extrabold tabular-nums transition-colors",
                      activeTab === value
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted-foreground/15 text-muted-foreground"
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
          {/* Meta Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <MetaItem 
              icon={<MapPin className="h-5 w-5" />} 
              label="Location" 
              value={opportunity.location || "Remote"} 
            />
            <MetaItem 
              icon={<IndianRupee className="h-5 w-5" />} 
              label="Package Details" 
              value={formatCompensation()} 
            />
            <MetaItem 
              icon={<Building2 className="h-5 w-5" />} 
              label="CGPA Cutoff" 
              value={opportunity.min_cgpa > 0 ? `${opportunity.min_cgpa.toFixed(2)} or above` : "None"} 
            />
            <MetaItem 
              icon={<Calendar className="h-5 w-5" />} 
              label="Apply Before" 
              value={new Date(opportunity.deadline).toLocaleString("en-IN", {
                dateStyle: "medium",
                timeStyle: "short"
              })} 
            />
          </div>

          {/* Job Description details */}
          <Card className="rounded-2xl overflow-hidden border bg-card shadow-2xs">
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b">
                <Briefcase className="h-4.5 w-4.5 text-foreground/75" />
                <h3 className="text-base font-bold text-foreground">Job Description & Details</h3>
              </div>
              <p className="text-sm text-muted-foreground/90 whitespace-pre-wrap leading-relaxed min-h-[120px] pt-1">
                {opportunity.job_description || "No description provided."}
              </p>
            </CardContent>
          </Card>

          {/* Company details (if present) */}
          {opportunity.company && (
            <Card className="rounded-2xl overflow-hidden border bg-card shadow-2xs">
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-3 pb-3 border-b">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4.5 w-4.5 text-foreground/75" />
                    <h3 className="text-base font-bold text-foreground">About {opportunity.company.name}</h3>
                  </div>
                  {opportunity.company.website && (
                    <a 
                      href={opportunity.company.website} 
                      target="_blank" 
                      rel="noreferrer" 
                      className="text-xs text-primary hover:text-primary/80 transition-colors font-semibold flex items-center gap-1"
                    >
                      Visit Website <ChevronRight className="h-3 w-3" />
                    </a>
                  )}
                </div>
                <p className="text-sm text-muted-foreground/90 leading-relaxed pt-1">
                  {opportunity.company.description || "No company description provided."}
                </p>
              </CardContent>
            </Card>
          )}
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
              <div className="hidden md:block border rounded-2xl bg-card shadow-2xs overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y text-left text-xs">
                    <thead className="bg-muted/30 font-bold text-muted-foreground uppercase text-[10px] tracking-wider border-b">
                      <tr>
                        <th className="p-4 pl-6">Candidate</th>
                        <th className="p-4">Course / Year</th>
                        <th className="p-4 text-center">CGPA</th>
                        <th className="p-4 text-center">Resume</th>
                        <th className="p-4 text-center">Status</th>
                        <th className="p-4 pr-6 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y bg-card">
                      {filteredApplications.map((app) => (
                        <tr key={app.id} className="hover:bg-muted/10 transition-colors duration-250">
                          <td className="p-4 pl-6">
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
                          </td>
                          <td className="p-4">
                            <div className="font-semibold text-foreground">{app.candidate_course || "N/A"}</div>
                            <div className="text-[10px] text-muted-foreground/80 mt-0.5 font-medium">Year: {app.candidate_passout_year || "N/A"}</div>
                          </td>
                          <td className="p-4 text-center font-extrabold text-sm text-foreground">
                            {app.candidate_cgpa != null ? app.candidate_cgpa.toFixed(2) : "—"}
                          </td>
                          <td className="p-4 text-center">
                            <Button variant="outline" size="sm" className="h-8 gap-1.5 rounded-lg border-border/80 text-[11px] font-semibold hover:bg-muted/50" asChild>
                              <a 
                                href={app.resume_url} 
                                target="_blank" 
                                rel="noreferrer"
                              >
                                <Download className="h-3 w-3 text-muted-foreground" /> PDF
                              </a>
                            </Button>
                          </td>
                          <td className="p-4 text-center">
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
                          </td>
                          <td className="p-4 pr-6 text-right">
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
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
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
