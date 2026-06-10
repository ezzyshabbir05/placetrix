"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Briefcase,
  Building2,
  CalendarClock,
  CheckCircle2,
  Clock,
  ExternalLink,
  MapPin,
  Users,
  XCircle,
} from "lucide-react"
import Link from "next/link"

// ─── Types ────────────────────────────────────────────────────────────────────

export type MyJobApplication = {
  id: string
  status: "applied" | "reviewing" | "shortlisted" | "rejected" | "hired"
  created_at: string
  job: {
    id: string
    title: string
    job_type: string
    location: string | null
    work_mode: string
    company_name: string
  }
}

// ─── Utils ────────────────────────────────────────────────────────────────────

function formatDate(dt: string) {
  return new Date(dt).toLocaleDateString("en-IN", { dateStyle: "medium" })
}

// ─── Status Badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: MyJobApplication["status"] }) {
  switch (status) {
    case "applied":
      return (
        <Badge variant="secondary" className="gap-1 text-[11px] px-2 py-0.5">
          <Clock className="h-3 w-3" />
          Applied
        </Badge>
      )
    case "reviewing":
      return (
        <Badge variant="outline" className="gap-1 text-[11px] px-2 py-0.5 border-blue-200 text-blue-600 bg-blue-50 dark:bg-blue-950/30 dark:border-blue-800 dark:text-blue-400">
          <Users className="h-3 w-3" />
          Reviewing
        </Badge>
      )
    case "shortlisted":
      return (
        <Badge variant="outline" className="gap-1 text-[11px] px-2 py-0.5 border-emerald-200 text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 dark:border-emerald-800 dark:text-emerald-400">
          <CheckCircle2 className="h-3 w-3" />
          Shortlisted
        </Badge>
      )
    case "rejected":
      return (
        <Badge variant="outline" className="gap-1 text-[11px] px-2 py-0.5 border-red-200 text-red-600 bg-red-50 dark:bg-red-950/30 dark:border-red-800 dark:text-red-400">
          <XCircle className="h-3 w-3" />
          Rejected
        </Badge>
      )
    case "hired":
      return (
        <Badge className="gap-1 text-[11px] px-2 py-0.5 bg-emerald-600 hover:bg-emerald-600 border-0">
          <CheckCircle2 className="h-3 w-3" />
          Hired
        </Badge>
      )
  }
}

// ─── Application Card ─────────────────────────────────────────────────────────

function ApplicationCard({ app }: { app: MyJobApplication }) {
  return (
    <Card className="border flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1 min-w-0">
            <CardTitle className="text-base leading-snug line-clamp-1">{app.job.title}</CardTitle>
            <CardDescription className="flex items-center gap-1.5 text-xs">
              <Building2 className="h-3.5 w-3.5 shrink-0" />
              {app.job.company_name}
            </CardDescription>
          </div>
          <StatusBadge status={app.status} />
        </div>
      </CardHeader>

      <CardContent className="flex flex-col flex-1 gap-4">
        {/* Meta */}
        <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-sm text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5" />
            {app.job.location || app.job.work_mode.replace("_", " ")}
          </span>
          <span className="flex items-center gap-1.5">
            <CalendarClock className="h-3.5 w-3.5" />
            Applied {formatDate(app.created_at)}
          </span>
        </div>

        {/* Job type chip */}
        <Badge variant="outline" className="self-start text-[11px] px-2 py-0.5 capitalize">
          {app.job.job_type.replace("_", " ")}
        </Badge>

        {/* Actions */}
        <div className="mt-auto">
          <Button asChild variant="outline" size="sm">
            <Link href="/jobs">
              View Job <ExternalLink className="h-3.5 w-3.5 ml-1" />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

// ─── Empty State ──────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center gap-3">
      <div className="h-12 w-12 rounded-xl bg-muted flex items-center justify-center">
        <Briefcase className="h-5 w-5 text-muted-foreground/60" />
      </div>
      <div className="space-y-0.5">
        <p className="text-sm font-medium">No applications yet</p>
        <p className="text-xs text-muted-foreground">Go to the Job Board to find your next opportunity.</p>
      </div>
    </div>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

export function MyApplicationsClient({ applications }: { applications: MyJobApplication[] }) {
  return (
    <div className="flex flex-col gap-6 px-4 py-8 md:px-8">

      {/* Page Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <h1 className="text-3xl font-bold font-cirka tracking-tight text-foreground">My Applications</h1>
          <p className="text-sm text-muted-foreground">
            {applications.length} application{applications.length !== 1 ? "s" : ""} tracked
          </p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href="/jobs">Find jobs</Link>
        </Button>
      </div>

      {/* Content */}
      <div>
        {applications.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {applications.map((app) => (
              <ApplicationCard key={app.id} app={app} />
            ))}
          </div>
        )}
      </div>

    </div>
  )
}
