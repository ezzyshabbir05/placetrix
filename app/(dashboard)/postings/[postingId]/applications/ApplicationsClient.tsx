"use client"

import React, { useState, useTransition, useMemo, useCallback, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { 
  ArrowLeft, Mail, FileText, CheckCircle2, XCircle, Clock, 
  Users, Search, Filter, X, ExternalLink, ArrowUpDown, ArrowUp, ArrowDown
} from "lucide-react"
import { toast } from "sonner"
import { Input } from "@/components/ui/input"
import type { ApplicationDetails, JobApplicationStatus } from "./_types"
import { APPLICATION_STATUS_LABELS } from "./_types"
import { updateApplicationStatusAction } from "./actions"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { cn } from "@/lib/utils"

function formatDateTime(dt: string) {
  return new Date(dt).toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  })
}

function formatDate(dt: string) {
  return new Date(dt).toLocaleDateString("en-IN", { dateStyle: "medium" })
}

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState<T>(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return debounced
}

function StatusBadge({ status }: { status: JobApplicationStatus }) {
  switch (status) {
    case "applied": return <Badge variant="secondary" className="gap-1 rounded-md text-[10px] font-bold uppercase tracking-wider"><Clock className="h-2.5 w-2.5" />Applied</Badge>
    case "reviewing": return <Badge variant="outline" className="gap-1 rounded-md text-[10px] font-bold uppercase tracking-wider border-blue-200 text-blue-600 bg-blue-50 dark:border-blue-900/50 dark:text-blue-400 dark:bg-blue-950/20"><Users className="h-2.5 w-2.5" />Reviewing</Badge>
    case "shortlisted": return <Badge variant="outline" className="gap-1 rounded-md text-[10px] font-bold uppercase tracking-wider border-emerald-200 text-emerald-600 bg-emerald-50 dark:border-emerald-900/50 dark:text-emerald-400 dark:bg-emerald-950/20"><CheckCircle2 className="h-2.5 w-2.5" />Shortlisted</Badge>
    case "rejected": return <Badge variant="outline" className="gap-1 rounded-md text-[10px] font-bold uppercase tracking-wider border-red-200 text-red-600 bg-red-50 dark:border-red-900/50 dark:text-red-400 dark:bg-red-950/20"><XCircle className="h-2.5 w-2.5" />Rejected</Badge>
    case "hired": return <Badge className="gap-1 rounded-md text-[10px] font-bold uppercase tracking-wider bg-emerald-600 text-white dark:bg-emerald-500"><CheckCircle2 className="h-2.5 w-2.5" />Hired</Badge>
  }
}

type SortColumn = "candidate" | "date" | "status"

function SortableHead({
  label,
  col,
  align = "left",
  sortCol,
  sortDir,
  onSort,
}: {
  label: string
  col: SortColumn
  align?: "left" | "center" | "right"
  sortCol: SortColumn
  sortDir: "asc" | "desc"
  onSort: (col: SortColumn) => void
}) {
  return (
    <TableHead
      className={cn(
        "text-xs font-semibold select-none cursor-pointer hover:bg-muted/60 transition-colors",
        align === "right" && "text-right",
        align === "center" && "text-center"
      )}
      onClick={() => onSort(col)}
    >
      <div className={cn("flex items-center gap-1.5", align === "right" && "justify-end", align === "center" && "justify-center")}>
        {label}
        {sortCol === col ? (
          sortDir === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
        ) : (
          <ArrowUpDown className="h-3 w-3 opacity-20" />
        )}
      </div>
    </TableHead>
  )
}

export function ApplicationsClient({ applications, postingId, jobTitle }: { applications: ApplicationDetails[], postingId: string, jobTitle: string }) {
  const router = useRouter()

  const [isPending, startTransition] = useTransition()
  const [selectedApp, setSelectedApp] = useState<ApplicationDetails | null>(null)
  
  // Filtering
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<JobApplicationStatus | "all">("all")
  
  const debouncedSearch = useDebounce(searchQuery, 100)

  const handleStatusChange = (appId: string, newStatus: JobApplicationStatus) => {
    startTransition(async () => {
      try {
        await updateApplicationStatusAction(appId, postingId, newStatus)
        toast.success(`Applicant marked as ${APPLICATION_STATUS_LABELS[newStatus]}`)
      } catch (err: any) {
        toast.error(err.message)
      }
    })
  }

  const filteredApps = useMemo(() => {
    return applications.filter(app => {
      if (debouncedSearch.trim()) {
        const q = debouncedSearch.toLowerCase()
        if (
          !(app.candidate_name || "").toLowerCase().includes(q) &&
          !(app.candidate_email || "").toLowerCase().includes(q)
        ) return false
      }
      if (statusFilter !== "all" && app.status !== statusFilter) return false
      return true
    })
  }, [applications, debouncedSearch, statusFilter])

  const [sortCol, setSortCol] = useState<SortColumn>("date")
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc")

  const handleSort = useCallback((col: SortColumn) => {
    if (sortCol === col) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"))
    } else {
      setSortCol(col)
      setSortDir(col === "candidate" ? "asc" : "desc")
    }
  }, [sortCol])

  const sortedApps = useMemo(() => {
    return [...filteredApps].sort((a, b) => {
      let diff = 0
      switch (sortCol) {
        case "candidate":
          diff = (a.candidate_name || "").localeCompare(b.candidate_name || "")
          break
        case "date":
          diff = a.created_at.localeCompare(b.created_at)
          break
        case "status":
          diff = a.status.localeCompare(b.status)
          break
      }
      return sortDir === "asc" ? diff : -diff
    })
  }, [filteredApps, sortCol, sortDir])

  const activeFilterCount = (debouncedSearch.trim() ? 1 : 0) + (statusFilter !== "all" ? 1 : 0)

  const clearFilters = () => {
    setSearchQuery("")
    setStatusFilter("all")
  }

  const stats = {
    total: applications.length,
    shortlisted: applications.filter(a => a.status === 'shortlisted' || a.status === 'hired').length,
    rejected: applications.filter(a => a.status === 'rejected').length,
    pending: applications.filter(a => a.status === 'applied' || a.status === 'reviewing').length,
  }

  return (
    <>
      <div className="flex flex-col gap-6 px-4 py-8 md:px-8">
        
        {/* Page Header */}
        <div className="flex flex-col gap-1.5">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
            <button onClick={() => router.push(`/postings`)} className="hover:text-foreground flex items-center gap-1 transition-colors">
              <ArrowLeft className="h-3 w-3" />
              BACK TO POSTINGS
            </button>
            <span className="text-muted-foreground/30">•</span>
            APPLICANTS
          </p>
          <h1 className="text-3xl font-bold font-cirka tracking-tight text-foreground">
            {jobTitle}
          </h1>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Card className="rounded-xl py-0">
            <CardContent className="p-4 space-y-1">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Users className="h-3.5 w-3.5" />
                <p className="text-xs font-medium">Total Applicants</p>
              </div>
              <p className="text-2xl font-bold tabular-nums">{stats.total}</p>
            </CardContent>
          </Card>
          <Card className="rounded-xl py-0">
            <CardContent className="p-4 space-y-1">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Clock className="h-3.5 w-3.5" />
                <p className="text-xs font-medium">Pending Review</p>
              </div>
              <p className="text-2xl font-bold tabular-nums text-blue-600">{stats.pending}</p>
            </CardContent>
          </Card>
          <Card className="rounded-xl py-0">
            <CardContent className="p-4 space-y-1">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <CheckCircle2 className="h-3.5 w-3.5" />
                <p className="text-xs font-medium">Shortlisted/Hired</p>
              </div>
              <p className="text-2xl font-bold tabular-nums text-emerald-600">{stats.shortlisted}</p>
            </CardContent>
          </Card>
          <Card className="rounded-xl py-0">
            <CardContent className="p-4 space-y-1">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <XCircle className="h-3.5 w-3.5" />
                <p className="text-xs font-medium">Rejected</p>
              </div>
              <p className="text-2xl font-bold tabular-nums text-red-600">{stats.rejected}</p>
            </CardContent>
          </Card>
        </div>

        {/* Applications List Section */}
        <div className="space-y-5">
          {/* Filters Bar */}
          <div className="flex flex-col gap-2 rounded-xl border bg-muted/10 p-3">
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1 min-w-0">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search applicants by name or email…"
                  className="pl-9 pr-9 h-9 text-xs bg-background"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1 transition-colors"
                    title="Clear search"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("gap-2 w-full h-9", activeFilterCount > 0 && "border-primary bg-primary/5 text-primary")}>
                      <Filter className="h-3.5 w-3.5" />
                      <span className="inline text-xs">Filters</span>
                      {activeFilterCount > 0 && (
                        <Badge variant="default" className="ml-0.5 h-4 min-w-4 px-1 text-[10px] bg-primary text-primary-foreground">
                          {activeFilterCount}
                        </Badge>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent align="end" className="w-[280px] p-4">
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground px-1">Status</p>
                        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="All Statuses" />
                          </SelectTrigger>
                          <SelectContent position="popper">
                            <SelectItem value="all">All Statuses</SelectItem>
                            {(Object.entries(APPLICATION_STATUS_LABELS) as [JobApplicationStatus, string][]).map(([k, v]) => (
                              <SelectItem key={k} value={k}>{v}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <Button variant="outline" className="w-full" onClick={clearFilters}>
                        Reset all filters
                      </Button>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {/* Active filter chips */}
            {activeFilterCount > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-border/40 mt-1">
                <span className="text-[10px] text-muted-foreground mr-1 flex items-center gap-1 font-medium">
                  Active:
                </span>
                {searchQuery.trim() && (
                  <Badge variant="secondary" className="gap-1 h-5 px-1.5 text-[10px] font-normal rounded-full">
                    "{searchQuery.trim()}"
                    <X className="h-2.5 w-2.5 cursor-pointer hover:text-foreground" onClick={() => setSearchQuery("")} />
                  </Badge>
                )}
                {statusFilter !== "all" && (
                  <Badge variant="secondary" className="gap-1 h-5 px-1.5 text-[10px] font-normal rounded-full">
                    {APPLICATION_STATUS_LABELS[statusFilter as JobApplicationStatus]}
                    <X className="h-2.5 w-2.5 cursor-pointer hover:text-foreground" onClick={() => setStatusFilter("all")} />
                  </Badge>
                )}
                <button
                  onClick={clearFilters}
                  className="ml-auto text-[10px] text-muted-foreground hover:text-primary underline-offset-2 hover:underline transition-colors px-1"
                >
                  Clear all
                </button>
              </div>
            )}
          </div>

          {/* Desktop Table */}
          <div className="hidden overflow-hidden rounded-xl border md:block bg-card">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <SortableHead label="Candidate" col="candidate" sortCol={sortCol} sortDir={sortDir} onSort={handleSort} />
                  <SortableHead label="Applied Date" col="date" sortCol={sortCol} sortDir={sortDir} onSort={handleSort} />
                  <SortableHead label="Status" col="status" sortCol={sortCol} sortDir={sortDir} onSort={handleSort} />
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedApps.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="py-12 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <Filter className="h-5 w-5 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">No applicants match your filters.</p>
                        <button onClick={clearFilters} className="text-xs underline text-muted-foreground hover:text-foreground">
                          Clear filters
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  sortedApps.map(app => (
                    <TableRow key={app.id} className="hover:bg-muted/20">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold shrink-0 text-sm">
                            {app.candidate_name.charAt(0).toUpperCase()}
                          </div>
                          <div className="space-y-0.5 min-w-0">
                            <p className="font-medium text-sm leading-none truncate">{app.candidate_name}</p>
                            <p className="text-xs text-muted-foreground truncate">{app.candidate_email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDateTime(app.created_at)}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={app.status} />
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button variant="outline" size="sm" className="h-8 text-xs font-medium" onClick={() => setSelectedApp(app)}>
                            Profile
                          </Button>
                          <Select 
                            value={app.status} 
                            onValueChange={(val) => handleStatusChange(app.id, val as JobApplicationStatus)}
                            disabled={isPending}
                          >
                            <SelectTrigger className="w-[120px] h-8 text-xs font-medium">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {(Object.entries(APPLICATION_STATUS_LABELS) as [JobApplicationStatus, string][]).map(([k, v]) => (
                                <SelectItem key={k} value={k} className="text-xs">{v}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Mobile Accordion */}
          <div className="rounded-xl border overflow-hidden md:hidden bg-card">
            {sortedApps.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 py-12 text-center bg-muted/5">
                <Filter className="h-6 w-6 text-muted-foreground/50" />
                <div className="space-y-1">
                  <p className="text-sm font-medium">No results match filters</p>
                  <button onClick={clearFilters} className="text-xs text-primary hover:underline font-medium">
                    Clear all filters
                  </button>
                </div>
              </div>
            ) : (
              <Accordion type="single" collapsible className="divide-y divide-border/60">
                {sortedApps.map((app) => (
                  <AccordionItem key={app.id} value={app.id} className="border-none">
                    <AccordionTrigger className="px-4 py-4 hover:bg-muted/5 hover:no-underline data-[state=open]:bg-muted/10 transition-all">
                      <div className="flex items-center justify-between w-full pr-6 text-left">
                        <div className="min-w-0 flex-1 gap-1.5 flex flex-col">
                          <p className="truncate text-sm font-semibold text-foreground leading-none">
                            {app.candidate_name}
                          </p>
                          <div className="flex flex-wrap items-center gap-1.5">
                            <StatusBadge status={app.status} />
                          </div>
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-4 pb-5 pt-0">
                      <div className="space-y-4">
                        <div className="rounded-xl border bg-muted/20 divide-y divide-border/60 overflow-hidden">
                          <div className="px-3.5 py-2.5 flex items-baseline justify-between gap-4">
                            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest shrink-0">Email</span>
                            <span className="text-xs font-medium text-foreground truncate text-right">{app.candidate_email || "—"}</span>
                          </div>
                          <div className="px-3.5 py-2.5 flex items-baseline justify-between gap-4">
                            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest shrink-0">Applied</span>
                            <span className="text-xs font-medium text-foreground text-right">{formatDateTime(app.created_at)}</span>
                          </div>
                        </div>
                        
                        <div className="flex flex-col gap-2">
                          <Select 
                            value={app.status} 
                            onValueChange={(val) => handleStatusChange(app.id, val as JobApplicationStatus)}
                            disabled={isPending}
                          >
                            <SelectTrigger className="w-full h-10">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {(Object.entries(APPLICATION_STATUS_LABELS) as [JobApplicationStatus, string][]).map(([k, v]) => (
                                <SelectItem key={k} value={k}>{v}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Button 
                            variant="outline" 
                            className="w-full h-10"
                            onClick={() => setSelectedApp(app)}
                          >
                            View Full Profile
                          </Button>
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            )}
          </div>

        </div>

      </div>

      {/* Candidate Profile Dialog */}
      <Dialog open={!!selectedApp} onOpenChange={(o) => { if (!o) setSelectedApp(null) }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Candidate Profile</DialogTitle>
            <DialogDescription>Review details about {selectedApp?.candidate_name}</DialogDescription>
          </DialogHeader>
          {selectedApp && (
            <div className="space-y-6 py-4">
              <div className="flex items-center gap-4">
                 <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xl font-bold">
                    {selectedApp.candidate_name.charAt(0).toUpperCase()}
                 </div>
                 <div>
                   <h3 className="text-lg font-semibold">{selectedApp.candidate_name}</h3>
                   <div className="flex items-center gap-1.5 text-sm text-muted-foreground mt-0.5">
                     <Mail className="h-4 w-4" /> {selectedApp.candidate_email}
                   </div>
                 </div>
              </div>

              {selectedApp.cover_letter && (
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold flex items-center gap-1.5">
                    <FileText className="h-4 w-4" /> Cover Letter
                  </h4>
                  <div className="bg-muted p-4 rounded-lg text-sm whitespace-pre-wrap leading-relaxed">
                    {selectedApp.cover_letter}
                  </div>
                </div>
              )}

              {selectedApp.resume_url && (
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold flex items-center gap-1.5">
                    <ExternalLink className="h-4 w-4" /> Resume
                  </h4>
                  <Button asChild variant="outline" className="w-full justify-start text-sm h-12">
                    <a href={selectedApp.resume_url} target="_blank" rel="noopener noreferrer">
                      <FileText className="mr-2 h-4 w-4" />
                      View Resume Document
                    </a>
                  </Button>
                </div>
              )}

              <div className="flex justify-between items-center border-t pt-4">
                <StatusBadge status={selectedApp.status} />
                <Button variant="outline" onClick={() => setSelectedApp(null)}>Close</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
