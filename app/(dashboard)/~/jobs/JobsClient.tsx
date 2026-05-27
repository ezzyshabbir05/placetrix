"use client"

import { useState, useMemo, useTransition } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {
  MapPin, Clock, Briefcase, IndianRupee, Search, CalendarClock, Building2, Send, CheckCircle2, Sparkles
} from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import type { CandidateJobPosting } from "./_types"
import { JOB_TYPE_LABELS, WORK_MODE_LABELS } from "./_types"
import { applyForJobAction } from "./actions"
import Link from "next/link"

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(dt?: string): string {
  if (!dt) return "—"
  return new Date(dt).toLocaleDateString("en-IN", { dateStyle: "medium" })
}

function formatSalary(min?: number, max?: number): string | null {
  if (!min && !max) return null
  const fmt = (n: number) => {
    if (n >= 100000) return `₹${(n / 100000).toFixed(n % 100000 === 0 ? 0 : 1)}L`
    if (n >= 1000) return `₹${(n / 1000).toFixed(0)}K`
    return `₹${n}`
  }
  if (min && max) return `${fmt(min)} – ${fmt(max)}`
  if (min) return `From ${fmt(min)}`
  return `Up to ${fmt(max!)}`
}

function StatPill({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <span className="flex items-center gap-1.5 text-xs text-muted-foreground whitespace-nowrap">
      {icon}{label}
    </span>
  )
}

// ─── Job Status Badge ─────────────────────────────────────────────────────────

function JobStatusBadge({ isExpired, hasApplied }: { isExpired: boolean; hasApplied: boolean }) {
  if (hasApplied) {
    return (
      <Badge className="gap-1 bg-emerald-500 hover:bg-emerald-500 text-white border-0 text-[11px] px-2 py-0.5">
        <CheckCircle2 className="h-3 w-3" />
        Applied
      </Badge>
    )
  }
  if (isExpired) {
    return (
      <Badge variant="outline" className="gap-1 text-[11px] px-2 py-0.5 text-muted-foreground">
        Closed
      </Badge>
    )
  }
  return (
    <Badge variant="secondary" className="gap-1 text-[11px] px-2 py-0.5">
      <CalendarClock className="h-3 w-3" />
      Open
    </Badge>
  )
}


// ─── Job Card ─────────────────────────────────────────────────────────────────

function JobCard({
  job,
  hasApplied,
  onClick,
}: {
  job: CandidateJobPosting
  hasApplied: boolean
  onClick: (job: CandidateJobPosting) => void
}) {
  const salary = formatSalary(job.salary_min, job.salary_max)
  const isExpired = !!(job.application_deadline && new Date(job.application_deadline) < new Date())

  return (
    <Card className="border flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1 min-w-0">
            <CardTitle className="text-base leading-snug truncate">{job.title}</CardTitle>
            <CardDescription className="flex items-center text-xs font-medium text-foreground min-w-0">
              <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0 mr-1.5" />
              <span className="truncate">{job.company_name}</span>
            </CardDescription>
          </div>
          <JobStatusBadge isExpired={isExpired} hasApplied={hasApplied} />
        </div>
      </CardHeader>

      <CardContent className="flex flex-col flex-1 gap-4">
        {/* Meta */}
        <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-sm text-muted-foreground">
          <StatPill icon={<Briefcase className="h-3.5 w-3.5" />} label={JOB_TYPE_LABELS[job.job_type]} />
          <StatPill icon={<MapPin className="h-3.5 w-3.5" />} label={job.location || WORK_MODE_LABELS[job.work_mode]} />
          {salary && <StatPill icon={<IndianRupee className="h-3.5 w-3.5" />} label={salary} />}
        </div>

        {/* Deadline */}
        <p className={cn(
          "text-xs flex items-center gap-1.5",
          isExpired ? "text-red-500" : "text-muted-foreground"
        )}>
          <CalendarClock className="h-3.5 w-3.5 shrink-0" />
          {isExpired
            ? "Application closed"
            : job.application_deadline
              ? `Apply by ${formatDate(job.application_deadline)}`
              : "No deadline set"}
        </p>

        {/* Skills */}
        {job.skills.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {job.skills.slice(0, 4).map((s) => (
              <Badge key={s} variant="secondary" className="text-[10px] px-1.5 py-0 font-normal">{s}</Badge>
            ))}
            {job.skills.length > 4 && (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 font-normal">+{job.skills.length - 4}</Badge>
            )}
          </div>
        )}

        {/* Action */}
        <div className="mt-auto">
          <Button variant="outline" size="sm" onClick={() => onClick(job)}>
            View Details
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

// ─── Details Dialog ───────────────────────────────────────────────────────────

function JobDetailDialog({ 
  job, open, onOpenChange, hasApplied 
}: { 
  job: CandidateJobPosting | null
  open: boolean
  onOpenChange: (open: boolean) => void
  hasApplied: boolean
}) {
  const [isPending, startTransition] = useTransition()

  const handleApply = () => {
    if (!job) return
    startTransition(async () => {
      try {
        await applyForJobAction(job.id)
        toast.success("Application submitted successfully!")
        onOpenChange(false)
      } catch (err: any) {
        toast.error(err.message)
      }
    })
  }

  if (!job) return null
  const salary = formatSalary(job.salary_min, job.salary_max)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl w-[90vw] max-h-[85vh] h-full flex flex-col p-0 overflow-hidden sm:max-w-5xl">
        <div className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          <div className="p-6">
            <div className="space-y-1 mb-6">
              <DialogTitle className="text-2xl">{job.title}</DialogTitle>
              <DialogDescription className="text-base font-medium flex items-center flex-wrap gap-1.5 text-foreground">
                <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                <span>{job.company_name}</span>
              </DialogDescription>
            </div>

            <div className="flex flex-wrap gap-x-6 gap-y-3 mb-6 p-4 bg-muted/50 rounded-lg">
              <StatPill icon={<Briefcase className="h-4 w-4" />} label={JOB_TYPE_LABELS[job.job_type]} />
              <StatPill icon={<MapPin className="h-4 w-4" />} label={job.location || WORK_MODE_LABELS[job.work_mode]} />
              {salary && <StatPill icon={<IndianRupee className="h-4 w-4" />} label={salary} />}
              <StatPill icon={<Clock className="h-4 w-4" />} label={`Posted ${formatDate(job.created_at)}`} />
            </div>

            {job.skills.length > 0 && (
              <div className="mb-6">
                <h4 className="text-sm font-semibold mb-2">Required Skills</h4>
                <div className="flex flex-wrap gap-1.5">
                  {job.skills.map(s => <Badge key={s} variant="secondary">{s}</Badge>)}
                </div>
              </div>
            )}

            {job.description && (
              <div className="mb-6 space-y-2">
                <h4 className="text-sm font-semibold">About the Role</h4>
                <div className="text-sm text-muted-foreground whitespace-pre-wrap">{job.description}</div>
              </div>
            )}

            {job.requirements && (
              <div className="mb-6 space-y-2">
                <h4 className="text-sm font-semibold">Requirements</h4>
                <div className="text-sm text-muted-foreground whitespace-pre-wrap">{job.requirements}</div>
              </div>
            )}
          </div>
        </div>
        <div className="p-4 border-t bg-background flex justify-end gap-2">
          {job.description && (
            <Button variant="secondary" asChild>
              <Link href={`/~/resume-analyzer?job_id=${job.id}`}>
                <Sparkles className="h-4 w-4 mr-1.5" /> Analyze Resume
              </Link>
            </Button>
          )}
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
          <Button 
            className="gap-1.5" 
            onClick={handleApply} 
            disabled={hasApplied || isPending}
          >
            {isPending ? (
              <CalendarClock className="h-4 w-4 animate-spin" /> // Assuming we don't have Loader2 imported, but wait I can import it
            ) : hasApplied ? (
              <CheckCircle2 className="h-4 w-4" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            {hasApplied ? "Applied" : "Apply Now"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface Props {
  jobs: CandidateJobPosting[]
  appliedJobIds: string[]
}

export function JobsClient({ jobs, appliedJobIds }: Props) {
  const [search, setSearch] = useState("")
  const [selectedJob, setSelectedJob] = useState<CandidateJobPosting | null>(null)

  const filteredJobs = useMemo(() => {
    if (!search.trim()) return jobs
    const q = search.toLowerCase()
    return jobs.filter(j => 
      j.title.toLowerCase().includes(q) || 
      j.company_name.toLowerCase().includes(q) ||
      j.skills.some(s => s.toLowerCase().includes(q))
    )
  }, [jobs, search])

  return (
    <div className="flex flex-col gap-6 px-4 py-8 md:px-8 pb-12">
      {/* Page Header */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <h1 className="text-3xl font-bold font-cirka tracking-tight text-foreground">Job Board</h1>
          <p className="text-sm text-muted-foreground">
            Explore {jobs.length} open positions from top companies.
          </p>
        </div>

        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search by role, company, or skill..." 
            className="pl-9 h-10"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div>
        {filteredJobs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-muted flex items-center justify-center">
              <Briefcase className="h-5 w-5 text-muted-foreground/60" />
            </div>
            <div className="space-y-0.5">
              <p className="text-sm font-medium">No jobs found</p>
              <p className="text-xs text-muted-foreground">Try adjusting your search terms</p>
            </div>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredJobs.map(j => (
              <JobCard
                key={j.id}
                job={j}
                hasApplied={appliedJobIds.includes(j.id)}
                onClick={setSelectedJob}
              />
            ))}
          </div>
        )}
      </div>

      <JobDetailDialog 
        job={selectedJob} 
        open={!!selectedJob} 
        onOpenChange={(o) => { if (!o) setSelectedJob(null) }} 
        hasApplied={selectedJob ? appliedJobIds.includes(selectedJob.id) : false}
      />
    </div>
  )
}
