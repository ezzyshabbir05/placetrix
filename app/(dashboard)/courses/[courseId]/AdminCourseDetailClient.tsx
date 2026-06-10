"use client"

import * as React from "react"
import { useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
  ArrowLeft, BookOpen, Clock, Users, CheckCircle2, Award, PenLine,
  Search, X, FileText, BarChart2, GraduationCap,
  ArrowUp, ArrowDown, ArrowUpDown, ChevronRight, ChevronLeft,
  Calendar,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Input } from "@/components/ui/input"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { cn, formatDuration } from "@/lib/utils"
import { CourseCover } from "../components/CourseCover"

// ─── Types ─────────────────────────────────────────────────────────────────────
interface Module {
  id: string
  title: string
  description?: string
  type: "video" | "text" | "test"
  duration?: string
  order_index: number
}

interface EnrolledStudent {
  enrollment_id: string
  user_id: string
  display_name: string | null
  email: string
  enrolled_at: string
  modules_completed: number
  total_modules: number
  completion_pct: number
  has_certificate: boolean
}

interface AdminCourseDetail {
  id: string
  title: string
  description: string
  level: string
  duration: string
  type: string
  cover_image_path?: string
  instructor_name: string
  is_published: boolean
  created_at: string
  modules: Module[]
}

interface Props {
  course: AdminCourseDetail
  students: EnrolledStudent[]
}

// ─── Stat Card ─────────────────────────────────────────────────────────────────
function StatCard({
  icon,
  label,
  value,
  sub,
  accent,
}: {
  icon: React.ReactNode
  label: string
  value: string | number
  sub?: string
  accent?: string
}) {
  return (
    <div className={cn("flex items-start gap-3 px-4 py-3.5 rounded-xl border bg-card", accent)}>
      <div className="shrink-0 mt-0.5">{icon}</div>
      <div className="min-w-0">
        <p className="text-xl font-bold tabular-nums text-foreground leading-none">{value}</p>
        <p className="text-xs font-medium text-muted-foreground mt-0.5">{label}</p>
        {sub && <p className="text-[10px] text-muted-foreground/70 mt-0.5 truncate">{sub}</p>}
      </div>
    </div>
  )
}

// ─── Sort helpers ──────────────────────────────────────────────────────────────
type SortCol = "name" | "email" | "enrolled_at" | "completion" | "certificate"

function SortableHead({
  col, label, align = "left", sortCol, sortDir, onSort,
}: {
  col: SortCol
  label: string
  align?: "left" | "right" | "center"
  sortCol: SortCol
  sortDir: "asc" | "desc"
  onSort: (c: SortCol) => void
}) {
  return (
    <TableHead
      onClick={() => onSort(col)}
      className={cn(
        "text-xs font-semibold select-none cursor-pointer hover:bg-muted/60 transition-colors whitespace-nowrap",
        align === "right" && "text-right",
        align === "center" && "text-center",
      )}
    >
      <div className={cn("flex items-center gap-1", align === "right" && "justify-end", align === "center" && "justify-center")}>
        {label}
        {sortCol === col
          ? sortDir === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
          : <ArrowUpDown className="h-3 w-3 opacity-20" />
        }
      </div>
    </TableHead>
  )
}

// ─── Main Component ────────────────────────────────────────────────────────────
const PAGE_SIZE = 20

export function AdminCourseDetailClient({ course, students }: Props) {
  const router = useRouter()

  // ── Search / filter / sort state ──
  const [search, setSearch] = useState("")
  const [completionFilter, setCompletionFilter] = useState<"all" | "completed" | "in-progress" | "not-started">("all")
  const [sortCol, setSortCol] = useState<SortCol>("enrolled_at")
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc")
  const [page, setPage] = useState(0)

  // ── Aggregate stats ──
  const stats = useMemo(() => {
    const total = students.length
    const completed = students.filter(s => s.completion_pct === 100).length
    const inProgress = students.filter(s => s.completion_pct > 0 && s.completion_pct < 100).length
    const certified = students.filter(s => s.has_certificate).length
    const avgCompletion = total > 0
      ? Math.round(students.reduce((s, x) => s + x.completion_pct, 0) / total)
      : 0
    return { total, completed, inProgress, certified, avgCompletion }
  }, [students])

  // ── Filtered + sorted students ──
  const filtered = useMemo(() => {
    let rows = students

    if (search.trim()) {
      const q = search.toLowerCase()
      rows = rows.filter(s =>
        (s.display_name ?? "").toLowerCase().includes(q) ||
        s.email.toLowerCase().includes(q)
      )
    }

    if (completionFilter !== "all") {
      rows = rows.filter(s => {
        if (completionFilter === "completed") return s.completion_pct === 100
        if (completionFilter === "in-progress") return s.completion_pct > 0 && s.completion_pct < 100
        if (completionFilter === "not-started") return s.completion_pct === 0
        return true
      })
    }

    rows = [...rows].sort((a, b) => {
      let diff = 0
      switch (sortCol) {
        case "name":
          diff = (a.display_name ?? a.email).localeCompare(b.display_name ?? b.email)
          break
        case "email":
          diff = a.email.localeCompare(b.email)
          break
        case "enrolled_at":
          diff = new Date(a.enrolled_at).getTime() - new Date(b.enrolled_at).getTime()
          break
        case "completion":
          diff = a.completion_pct - b.completion_pct
          break
        case "certificate":
          diff = Number(a.has_certificate) - Number(b.has_certificate)
          break
      }
      return sortDir === "asc" ? diff : -diff
    })

    return rows
  }, [students, search, completionFilter, sortCol, sortDir])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const pageRows = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  const handleSort = (col: SortCol) => {
    if (sortCol === col) {
      setSortDir(d => d === "asc" ? "desc" : "asc")
    } else {
      setSortCol(col)
      setSortDir("asc")
    }
    setPage(0)
  }

  const formatDate = (iso: string) => {
    try {
      return new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(iso))
    } catch {
      return "—"
    }
  }

  return (
    <div className="flex flex-col gap-6 px-4 py-6 md:px-8 md:py-8 animate-in fade-in duration-300">

      {/* Back + Edit header */}
      <div className="flex items-center justify-between gap-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.push("/courses")}
          className="group rounded-full gap-2 border-border/80 text-muted-foreground hover:text-foreground transition-all duration-200"
        >
          <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
          Back to Courses
        </Button>

        <Button asChild size="sm" className="gap-1.5 rounded-full shadow-md shadow-primary/10">
          <Link href={`/courses/${course.id}/edit`}>
            <PenLine className="h-3.5 w-3.5" />
            Edit Course
          </Link>
        </Button>
      </div>

      {/* Course identity header */}
      <div className="flex flex-col-reverse md:flex-row items-start justify-between gap-6 border-b pb-5 border-border/60">
        <div className="flex-1 flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="text-[10px] text-muted-foreground">
              {course.level}
            </Badge>
            <Badge
              className={cn(
                "text-[9px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full border",
                course.is_published
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                  : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
              )}
            >
              {course.is_published ? "Published" : "Draft"}
            </Badge>
          </div>

          <h1 className="text-2xl md:text-3xl font-bold font-cirka tracking-tight text-foreground">
            {course.title}
          </h1>

          <p className="text-sm text-muted-foreground leading-relaxed max-w-2xl">
            {course.description}
          </p>

          <div className="flex flex-wrap items-center gap-4 pt-1 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <GraduationCap className="h-3.5 w-3.5" />
              {course.instructor_name}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" />
              {formatDuration(course.duration)}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <BookOpen className="h-3.5 w-3.5" />
              {course.modules.length} {course.modules.length === 1 ? "module" : "modules"}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" />
              Created {formatDate(course.created_at)}
            </span>
          </div>
        </div>

        <div className="w-32 md:w-40 shrink-0 mx-auto md:mr-0">
          <div className="aspect-video w-full overflow-hidden rounded-xl border border-border/50 dark:border-zinc-800/80 relative shadow-xs">
            <CourseCover coverImagePath={course.cover_image_path} title={course.title} />
          </div>
        </div>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          icon={<Users className="h-3.5 w-3.5 text-primary" />}
          label="Total Enrolled"
          value={stats.total}
          sub={stats.inProgress > 0 ? `${stats.inProgress} in progress` : "No active learners"}
          accent="border-primary/15"
        />
        <StatCard
          icon={<CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />}
          label="Completed"
          value={stats.completed}
          sub={stats.total > 0 ? `${Math.round((stats.completed / stats.total) * 100)}% completion rate` : "—"}
          accent="border-emerald-500/15"
        />
        <StatCard
          icon={<BarChart2 className="h-3.5 w-3.5 text-indigo-500" />}
          label="Avg Completion"
          value={`${stats.avgCompletion}%`}
          sub="Across all enrolled students"
          accent="border-indigo-500/15"
        />
        <StatCard
          icon={<Award className="h-3.5 w-3.5 text-amber-500" />}
          label="Certificates Issued"
          value={stats.certified}
          sub={stats.total > 0 ? `of ${stats.total} students` : "None yet"}
          accent="border-amber-500/15"
        />
      </div>

      {/* Main content: 2-col layout */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

        {/* Left: Enrolled Students Table */}
        <div className="xl:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <Users className="h-4 w-4" />
              Enrolled Students
            </h2>
            <span className="text-[11px] text-muted-foreground">
              <span className="font-semibold text-foreground">{filtered.length}</span> of {students.length}
            </span>
          </div>

          {/* Search + filter bar */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or email..."
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(0) }}
                className="pl-9 pr-9"
              />
              {search && (
                <button
                  onClick={() => { setSearch(""); setPage(0) }}
                  className="absolute right-2.5 top-2.5 h-4 w-4 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Completion filter */}
            <div className="flex items-center gap-1 bg-muted rounded-lg p-1 h-9 shrink-0 overflow-x-auto scrollbar-none">
              {(["all", "completed", "in-progress", "not-started"] as const).map(f => (
                <button
                  key={f}
                  onClick={() => { setCompletionFilter(f); setPage(0) }}
                  className={cn(
                    "text-[11px] px-2.5 py-1 rounded-md font-medium transition-all duration-150 capitalize whitespace-nowrap",
                    completionFilter === f
                      ? "bg-background shadow-sm text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {f === "all" ? "All" : f === "in-progress" ? "In Progress" : f === "not-started" ? "Not Started" : "Completed"}
                </button>
              ))}
            </div>
          </div>

          {/* Table */}
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center gap-3 border border-dashed border-border/60 rounded-xl bg-card/50">
              <div className="h-12 w-12 rounded-xl bg-muted flex items-center justify-center">
                <Users className="h-5 w-5 text-muted-foreground/60" />
              </div>
              <div className="space-y-0.5">
                <p className="text-sm font-medium">No students found</p>
                <p className="text-xs text-muted-foreground">
                  {students.length === 0 ? "No one has enrolled in this course yet." : "Adjust your search or filter."}
                </p>
              </div>
              {(search || completionFilter !== "all") && (
                <button
                  onClick={() => { setSearch(""); setCompletionFilter("all"); setPage(0) }}
                  className="text-xs text-primary hover:underline font-medium"
                >
                  Clear filters
                </button>
              )}
            </div>
          ) : (
            <div className="rounded-xl border border-border/50 overflow-hidden">
              {/* Horizontal scroll for small screens */}
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30 hover:bg-muted/30">
                      <SortableHead col="name" label="Student" sortCol={sortCol} sortDir={sortDir} onSort={handleSort} />
                      <SortableHead col="enrolled_at" label="Enrolled" sortCol={sortCol} sortDir={sortDir} onSort={handleSort} />
                      <SortableHead col="completion" label="Progress" align="center" sortCol={sortCol} sortDir={sortDir} onSort={handleSort} />
                      <SortableHead col="certificate" label="Certificate" align="center" sortCol={sortCol} sortDir={sortDir} onSort={handleSort} />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pageRows.map(student => {
                      const isCompleted = student.completion_pct === 100
                      const isStarted = student.completion_pct > 0
                      return (
                        <TableRow key={student.enrollment_id} className="hover:bg-muted/20">
                          <TableCell className="min-w-[180px]">
                            <div className="flex items-center gap-3">
                              <div className="h-7 w-7 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-[10px] font-bold text-primary shrink-0">
                                {(student.display_name ?? student.email).charAt(0).toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-foreground truncate">
                                  {student.display_name ?? "—"}
                                </p>
                                <p className="text-xs text-muted-foreground truncate">
                                  {student.email}
                                </p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground whitespace-nowrap min-w-[100px]">
                            {formatDate(student.enrolled_at)}
                          </TableCell>
                          <TableCell className="text-center min-w-[130px]">
                            <div className="flex flex-col items-center gap-1.5 w-28 mx-auto">
                              <div className="flex items-center justify-between w-full text-[10px]">
                                <span className={cn(
                                  "font-semibold",
                                  isCompleted ? "text-emerald-600 dark:text-emerald-400" : "text-foreground"
                                )}>
                                  {student.completion_pct}%
                                </span>
                                <span className="text-muted-foreground">
                                  {student.modules_completed}/{student.total_modules}
                                </span>
                              </div>
                              <Progress
                                value={student.completion_pct}
                                className={cn(
                                  "h-1.5 w-full bg-muted",
                                  isCompleted && "[&>[data-slot=progress-indicator]]:bg-emerald-500"
                                )}
                              />
                              <span className={cn(
                                "text-[9px] font-semibold uppercase tracking-wider",
                                isCompleted ? "text-emerald-500" : isStarted ? "text-primary" : "text-muted-foreground/60"
                              )}>
                                {isCompleted ? "Completed" : isStarted ? "In Progress" : "Not Started"}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-center min-w-[100px]">
                            {student.has_certificate ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                                <Award className="h-3 w-3" />
                                Issued
                              </span>
                            ) : (
                              <span className="text-xs text-muted-foreground/50">—</span>
                            )}
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-border/40 bg-muted/10">
                  <p className="text-xs text-muted-foreground">
                    Page <span className="font-semibold text-foreground">{page + 1}</span> of {totalPages}
                  </p>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 w-7 p-0 rounded-lg"
                      onClick={() => setPage(p => Math.max(0, p - 1))}
                      disabled={page === 0}
                    >
                      <ChevronLeft className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 w-7 p-0 rounded-lg"
                      onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                      disabled={page >= totalPages - 1}
                    >
                      <ChevronRight className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right: Sidebar — Course Info + Syllabus */}
        <div className="space-y-4">

          {/* Course info card */}
          <Card className="border border-border/50 bg-card rounded-xl shadow-xs">
            <CardHeader className="pb-3">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Course Info
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-border/40 text-xs px-4">
                {[
                  { label: "Type", value: course.type },
                  { label: "Level", value: course.level },
                  { label: "Duration", value: formatDuration(course.duration) },
                  { label: "Instructor", value: course.instructor_name },
                  { label: "Modules", value: `${course.modules.length}` },
                  { label: "Status", value: course.is_published ? "Published" : "Draft" },
                ].map(({ label, value }) => (
                  <div key={label} className="flex justify-between py-2.5">
                    <span className="text-muted-foreground">{label}</span>
                    <span className="font-medium text-foreground text-right">{value}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Syllabus card */}
          <Card className="border border-border/50 bg-card rounded-xl shadow-xs">
            <CardHeader className="pb-3">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5" />
                Syllabus ({course.modules.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-border/40">
                {course.modules.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-6 px-4">No modules added yet.</p>
                ) : (
                  course.modules.map((mod, i) => (
                    <div key={mod.id} className="flex items-start gap-3 px-4 py-3 hover:bg-muted/20 transition-colors">
                      <div className="h-5 w-5 rounded-full bg-muted flex items-center justify-center text-[10px] font-bold text-muted-foreground shrink-0 mt-0.5">
                        {i + 1}
                      </div>
                      <div className="flex-1 min-w-0 space-y-0.5">
                        <p className="text-xs font-medium text-foreground line-clamp-1">{mod.title}</p>
                        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                          <span className="capitalize">{mod.type}</span>
                          {mod.duration && (
                            <>
                              <span className="text-muted-foreground/30">·</span>
                              <span>{formatDuration(mod.duration)}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  )
}
