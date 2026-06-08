"use client"

import { useState, useMemo, useTransition } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
  BookOpen, Plus, Search, X, PenLine, Trash2, Clock, Users, CheckCircle, AlertCircle,
  ArrowUpDown, TrendingUp, Layers, BarChart2, ChevronsUpDown, Eye
} from "lucide-react"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { buildStorageUrl } from "@/lib/storage"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { deleteCourseAction } from "./actions"

interface CourseListItem {
  id: string
  title: string
  description: string
  level: string
  duration: string
  type: string
  badge?: string | null
  cover_image_path?: string | null
  instructor_name: string
  is_published: boolean
  created_at: string
  modules_count: number
  enrollments_count: number
}

interface Props {
  courses: CourseListItem[]
}

type SortOption = "newest" | "oldest" | "most-enrolled" | "a-z" | "most-modules"

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "newest", label: "Newest First" },
  { value: "oldest", label: "Oldest First" },
  { value: "most-enrolled", label: "Most Enrolled" },
  { value: "most-modules", label: "Most Modules" },
  { value: "a-z", label: "A → Z" },
]// ─── Course Cover (by ID / Level fallback) ─────────────────────────────────
function CourseCover({ courseId }: { courseId: string }) {
  switch (courseId) {
    case "algo-ds-masterclass":
    case "python-for-everybody":
      return (
        <svg className="w-full h-full object-cover" viewBox="0 0 320 180" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="100%" height="100%" fill="url(#adm-bg-cs)" />
          <defs>
            <linearGradient id="adm-bg-cs" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#0b0f19" />
              <stop offset="100%" stopColor="#1e1b4b" />
            </linearGradient>
          </defs>
          <g opacity="0.1">
            <path d="M0 20 H320 M0 60 H320 M0 100 H320 M0 140 H320 M40 0 V180 M120 0 V180 M200 0 V180 M280 0 V180" stroke="#818cf8" strokeWidth="0.5" />
          </g>
          <circle cx="160" cy="50" r="10" fill="#6366f1" opacity="0.8" />
          <circle cx="100" cy="100" r="8" fill="#818cf8" opacity="0.8" />
          <circle cx="220" cy="100" r="8" fill="#818cf8" opacity="0.8" />
          <circle cx="60" cy="150" r="6" fill="#a5b4fc" opacity="0.8" />
          <circle cx="260" cy="150" r="6" fill="#a5b4fc" opacity="0.8" />
          <path d="M160 60 L100 92 M160 60 L220 92 M100 108 L60 144 M220 108 L260 144" stroke="#818cf8" strokeWidth="1.5" opacity="0.5" />
          <text x="160" y="105" fill="#ffffff" opacity="0.08" fontSize="24" fontWeight="bold" textAnchor="middle" letterSpacing="2">CORE CS</text>
        </svg>
      )
    case "nextjs-supabase-dev":
    case "programming-for-everybody":
      return (
        <svg className="w-full h-full object-cover" viewBox="0 0 320 180" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="100%" height="100%" fill="url(#adm-bg-web)" />
          <defs>
            <linearGradient id="adm-bg-web" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#0b0f19" />
              <stop offset="100%" stopColor="#064e3b" />
            </linearGradient>
          </defs>
          <g opacity="0.15">
            <path d="M0 40 L320 140 M0 140 L320 40" stroke="#059669" strokeWidth="0.5" />
          </g>
          <circle cx="160" cy="90" r="25" stroke="#34d399" strokeWidth="1.8" fill="#047857" fillOpacity="0.2" />
          <rect x="75" y="60" width="30" height="15" rx="2" fill="#047857" stroke="#10b981" strokeWidth="1" />
          <rect x="215" y="60" width="30" height="15" rx="2" fill="#047857" stroke="#10b981" strokeWidth="1" />
          <rect x="75" y="105" width="30" height="15" rx="2" fill="#047857" stroke="#10b981" strokeWidth="1" />
          <rect x="215" y="105" width="30" height="15" rx="2" fill="#047857" stroke="#10b981" strokeWidth="1" />
          <text x="160" y="95" fill="#ffffff" opacity="0.08" fontSize="22" fontWeight="bold" textAnchor="middle" letterSpacing="1">WEB DEV</text>
        </svg>
      )
    case "behavioral-interviews-soft-skills":
    case "foundations-data-everywhere":
      return (
        <svg className="w-full h-full object-cover" viewBox="0 0 320 180" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="100%" height="100%" fill="url(#adm-bg-int)" />
          <defs>
            <linearGradient id="adm-bg-int" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#0b0f19" />
              <stop offset="100%" stopColor="#7c2d12" />
            </linearGradient>
          </defs>
          <g opacity="0.1">
            <circle cx="160" cy="90" r="50" stroke="#d97706" strokeWidth="0.5" />
            <circle cx="160" cy="90" r="70" stroke="#d97706" strokeWidth="0.5" />
          </g>
          <circle cx="120" cy="90" r="22" stroke="#d97706" strokeWidth="1.5" fill="#b45309" opacity="0.2" />
          <circle cx="200" cy="90" r="26" stroke="#f59e0b" strokeWidth="1.5" fill="#d97706" opacity="0.2" />
          <path d="M140 82 Q160 72 180 82" stroke="#f59e0b" strokeWidth="1.5" fill="none" />
          <path d="M140 98 Q160 108 180 98" stroke="#f59e0b" strokeWidth="1.5" fill="none" />
          <text x="160" y="95" fill="#ffffff" opacity="0.08" fontSize="20" fontWeight="bold" textAnchor="middle" letterSpacing="2">INTERVIEW</text>
        </svg>
      )
    case "system-design-scale":
    case "google-data-analytics":
    default:
      return (
        <svg className="w-full h-full object-cover" viewBox="0 0 320 180" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="100%" height="100%" fill="url(#adm-bg-sys)" />
          <defs>
            <linearGradient id="adm-bg-sys" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#0b0f19" />
              <stop offset="100%" stopColor="#581c87" />
            </linearGradient>
          </defs>
          <g opacity="0.15">
            <path d="M0 0 L320 180 M0 180 L320 0" stroke="#a855f7" strokeWidth="0.5" />
          </g>
          <rect x="35" y="70" width="45" height="35" rx="3" fill="#6b21a8" stroke="#a855f7" strokeWidth="1" opacity="0.8" />
          <rect x="135" y="40" width="45" height="35" rx="3" fill="#6b21a8" stroke="#a855f7" strokeWidth="1" opacity="0.8" />
          <rect x="135" y="100" width="45" height="35" rx="3" fill="#6b21a8" stroke="#a855f7" strokeWidth="1" opacity="0.8" />
          <rect x="240" y="70" width="45" height="35" rx="3" fill="#6b21a8" stroke="#a855f7" strokeWidth="1" opacity="0.8" />
          <path d="M80 88 L135 58 M80 88 L135 118 M180 58 L240 88 M180 118 L240 88" stroke="#d8b4fe" strokeWidth="1.5" opacity="0.4" />
          <text x="160" y="95" fill="#ffffff" opacity="0.08" fontSize="20" fontWeight="bold" textAnchor="middle" letterSpacing="1">SYSTEM DESIGN</text>
        </svg>
      )
  }
}

// ─── Admin Stats Bar ─────────────────────────────────────────────────────────
function AdminStatsBar({ courses }: { courses: CourseListItem[] }) {
  const stats = useMemo(() => {
    const total = courses.length
    const published = courses.filter(c => c.is_published).length
    const drafts = total - published
    const totalEnrollments = courses.reduce((sum, c) => sum + c.enrollments_count, 0)
    const avgModules = total > 0 ? (courses.reduce((sum, c) => sum + c.modules_count, 0) / total).toFixed(1) : "0"
    return { total, published, drafts, totalEnrollments, avgModules }
  }, [courses])

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 animate-in fade-in duration-300">
      {[
        {
          icon: <Layers className="h-4 w-4 text-primary" />,
          value: stats.total,
          label: "Total Courses",
          accent: "bg-primary/8 border-primary/15",
        },
        {
          icon: <CheckCircle className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />,
          value: stats.published,
          label: "Published",
          accent: "bg-emerald-500/8 border-emerald-500/15",
        },
        {
          icon: <Users className="h-4 w-4 text-indigo-500" />,
          value: stats.totalEnrollments,
          label: "Total Enrollments",
          accent: "bg-indigo-500/8 border-indigo-500/15",
        },
        {
          icon: <BarChart2 className="h-4 w-4 text-amber-500" />,
          value: stats.avgModules,
          label: "Avg Modules / Course",
          accent: "bg-amber-500/8 border-amber-500/15",
        },
      ].map((stat, i) => (
        <div
          key={i}
          className={cn(
            "flex items-center gap-3 p-4 rounded-xl border",
            stat.accent
          )}
        >
          <div className="shrink-0">{stat.icon}</div>
          <div>
            <p className="text-xl font-bold text-foreground tabular-nums">{stat.value}</p>
            <p className="text-[10px] text-muted-foreground font-medium leading-tight">{stat.label}</p>
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Sort Dropdown ────────────────────────────────────────────────────────────
function SortDropdown({ value, onChange }: { value: SortOption; onChange: (v: SortOption) => void }) {
  const [open, setOpen] = useState(false)
  const current = SORT_OPTIONS.find(o => o.value === value)

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(prev => !prev)}
        className="inline-flex items-center gap-1.5 h-9 px-3 text-xs font-medium rounded-lg border border-border/70 bg-background hover:bg-muted transition-colors"
      >
        <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" />
        {current?.label}
        <ChevronsUpDown className="h-3 w-3 text-muted-foreground ml-0.5" />
      </button>

      {open && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          {/* Dropdown */}
          <div className="absolute right-0 top-full mt-1.5 z-50 min-w-[160px] rounded-xl border border-border/60 bg-popover shadow-lg p-1 animate-in fade-in zoom-in-95 duration-150">
            {SORT_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => { onChange(opt.value); setOpen(false) }}
                className={cn(
                  "w-full text-left flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors",
                  opt.value === value
                    ? "bg-primary text-primary-foreground"
                    : "text-foreground hover:bg-muted"
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────
export function AdminCoursesListClient({ courses: initialCourses }: Props) {
  const router = useRouter()
  const [courses, setCourses] = useState<CourseListItem[]>(initialCourses)
  const [searchQuery, setSearchQuery] = useState("")
  const [activeTab, setActiveTab] = useState<"all" | "published" | "drafts">("all")
  const [sortBy, setSortBy] = useState<SortOption>("newest")
  const [isPending, startTransition] = useTransition()

  // Delete Confirmation State
  const [courseToDelete, setCourseToDelete] = useState<CourseListItem | null>(null)

  const handleCreate = () => {
    router.push("/~/courses/new/edit")
  }

  const handleDelete = (course: CourseListItem) => {
    setCourseToDelete(course)
  }

  const confirmDelete = () => {
    if (!courseToDelete) return

    startTransition(async () => {
      try {
        const result = await deleteCourseAction(courseToDelete.id)
        if (result.success) {
          setCourses(courses.filter((c) => c.id !== courseToDelete.id))
          toast.success(`Course "${courseToDelete.title}" deleted successfully.`)
        }
      } catch (err: any) {
        toast.error(err.message || "Failed to delete course.")
      } finally {
        setCourseToDelete(null)
      }
    })
  }

  // Filter courses
  const filteredAndSortedCourses = useMemo(() => {
    let result = courses.filter((course) => {
      if (activeTab === "published" && !course.is_published) return false
      if (activeTab === "drafts" && course.is_published) return false

      if (searchQuery.trim() !== "") {
        const query = searchQuery.toLowerCase()
        const matchTitle = course.title.toLowerCase().includes(query)
        const matchDesc = course.description.toLowerCase().includes(query)
        const matchInstructor = course.instructor_name.toLowerCase().includes(query)
        return matchTitle || matchDesc || matchInstructor
      }

      return true
    })

    // Sort
    result = [...result].sort((a, b) => {
      switch (sortBy) {
        case "newest":
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        case "oldest":
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        case "most-enrolled":
          return b.enrollments_count - a.enrollments_count
        case "most-modules":
          return b.modules_count - a.modules_count
        case "a-z":
          return a.title.localeCompare(b.title)
        default:
          return 0
      }
    })

    return result
  }, [courses, activeTab, searchQuery, sortBy])

  // Count tab aggregates
  const counts = useMemo(() => {
    const acc = { all: 0, published: 0, drafts: 0 }
    courses.forEach((c) => {
      acc.all++
      if (c.is_published) acc.published++
      else acc.drafts++
    })
    return acc
  }, [courses])

  return (
    <div className="flex flex-col gap-6 px-4 py-8 md:px-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-bold font-cirka tracking-tight text-foreground">Course Catalog (Admin)</h1>
          <p className="text-sm text-muted-foreground">
            Manage your placement training courses, content modules, and enrollment counts.
          </p>
        </div>
        <Button size="sm" onClick={handleCreate} className="gap-1.5 shrink-0 rounded-full shadow-md shadow-primary/10">
          <Plus className="h-4 w-4" />
          Create Course
        </Button>
      </div>

      {/* Admin Stats Bar */}
      <AdminStatsBar courses={courses} />

      {/* Tabs and Search */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            {/* Search Input */}
            <div className="relative w-full sm:max-w-xs">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search courses..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-9"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-2.5 h-4 w-4 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Right: Sort + Tabs */}
            <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end shrink-0">
              {/* Sort Dropdown */}
              <SortDropdown value={sortBy} onChange={setSortBy} />

              {/* Tabs Trigger List */}
              <div className="overflow-x-auto">
                <TabsList className="inline-flex h-9 gap-0.5 rounded-lg bg-muted p-1">
                  <TabsTrigger
                    value="all"
                    className="gap-1.5 rounded-md px-3 text-xs font-medium data-[state=active]:bg-background data-[state=active]:shadow-sm"
                  >
                    All
                    <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-muted-foreground/10 px-1 text-[9px] font-semibold text-muted-foreground">
                      {counts.all}
                    </span>
                  </TabsTrigger>
                  <TabsTrigger
                    value="published"
                    className="gap-1.5 rounded-md px-3 text-xs font-medium data-[state=active]:bg-background data-[state=active]:shadow-sm"
                  >
                    Published
                    <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-emerald-500/10 px-1 text-[9px] font-semibold text-emerald-600 dark:text-emerald-450">
                      {counts.published}
                    </span>
                  </TabsTrigger>
                  <TabsTrigger
                    value="drafts"
                    className="gap-1.5 rounded-md px-3 text-xs font-medium data-[state=active]:bg-background data-[state=active]:shadow-sm"
                  >
                    Drafts
                    <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500/10 px-1 text-[9px] font-semibold text-amber-600 dark:text-amber-450">
                      {counts.drafts}
                    </span>
                  </TabsTrigger>
                </TabsList>
              </div>
            </div>
          </div>

          {/* Results count */}
          {(searchQuery || activeTab !== "all") && (
            <p className="text-[11px] text-muted-foreground">
              Showing <span className="font-semibold text-foreground">{filteredAndSortedCourses.length}</span> of {courses.length} courses
            </p>
          )}

          {/* Grid list */}
          {filteredAndSortedCourses.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center gap-3 border border-dashed border-border/60 rounded-xl bg-card/50">
              <div className="h-12 w-12 rounded-xl bg-muted flex items-center justify-center border">
                <BookOpen className="h-5 w-5 text-muted-foreground/60" />
              </div>
              <div className="space-y-0.5">
                <p className="text-sm font-medium">No courses found</p>
                <p className="text-xs text-muted-foreground">Modify search parameters or create a new course to get started.</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-in fade-in duration-300">
              {filteredAndSortedCourses.map((course) => {
                const coverUrl = course.cover_image_path ? buildStorageUrl("course-covers", course.cover_image_path) : null

                return (
                  <Card key={course.id} className="group flex flex-col justify-between overflow-hidden border border-border/50 dark:border-zinc-800/80 bg-card hover:border-border hover:shadow-lg hover:-translate-y-1 transition-all duration-300 h-full p-0 gap-0">
                    <div className="flex flex-col h-full">
                      {/* Cover Image Area */}
                      <div className="aspect-video w-full overflow-hidden bg-muted relative rounded-t-lg">
                        <div className="w-full h-full transform group-hover:scale-105 transition-transform duration-500 ease-out">
                          {coverUrl ? (
                            <img
                              src={coverUrl}
                              alt={course.title}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <CourseCover courseId={course.id} />
                          )}
                        </div>

                        {/* Badge overlay */}
                        {course.badge && (
                          <span className="absolute top-2.5 left-2.5 bg-black/75 backdrop-blur-xs text-white border border-white/10 text-[9px] px-2 py-0.5 rounded-full font-semibold uppercase tracking-wider">
                            {course.badge}
                          </span>
                        )}

                        {/* Published / Draft pill */}
                        <span className={cn(
                          "absolute top-2.5 right-2.5 border text-[9px] px-2 py-0.5 rounded-full font-semibold uppercase tracking-wider bg-black/75 backdrop-blur-xs",
                          course.is_published
                            ? "text-emerald-400 border-emerald-500/25"
                            : "text-amber-400 border-amber-500/25"
                        )}>
                          {course.is_published ? "Published" : "Draft"}
                        </span>
                      </div>

                      {/* Info Area */}
                      <div className="flex flex-col flex-1">
                        <CardHeader className="px-4 pt-4 pb-0 gap-2">
                          {/* Instructor as "partner" row */}
                          <div className="flex items-center gap-2">
                            <div className="h-4 w-4 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center font-bold text-[9px] text-primary shrink-0 shadow-xs">
                              {course.instructor_name?.charAt(0) ?? "I"}
                            </div>
                            <span className="text-[11px] text-muted-foreground font-medium truncate">
                              {course.instructor_name}
                            </span>
                          </div>

                          {/* Title */}
                          <CardTitle className="font-semibold text-sm md:text-[14px] text-foreground leading-snug line-clamp-2 min-h-[40px] group-hover:text-primary transition-colors duration-200">
                            {course.title}
                          </CardTitle>

                          {/* Type · Level */}
                          <CardDescription className="text-[11px] text-muted-foreground flex items-center gap-1.5 mt-0.5">
                            <span className="font-medium text-foreground/80">{course.type || "Course"}</span>
                            <span className="text-muted-foreground/30">•</span>
                            <span className="capitalize">{course.level}</span>
                          </CardDescription>
                        </CardHeader>

                        {/* Bottom Stats + Actions */}
                        <CardContent className="mt-auto pt-4 pb-4 px-4">
                          <div className="border-t border-border/40 pt-3.5 w-full">

                            {/* Action buttons */}
                            <div className="flex gap-2">
                              <Button
                                asChild
                                variant="outline"
                                size="sm"
                                className="flex-1 text-xs rounded-full h-8"
                              >
                                <Link href={`/~/courses/${course.id}`}>
                                  <Eye className="h-3.5 w-3.5 mr-1" />
                                  View Course
                                </Link>
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDelete(course)}
                                className="text-xs text-destructive hover:bg-destructive/10 hover:text-destructive border-destructive/10 hover:border-destructive/30 rounded-full h-8 px-3"
                                disabled={isPending}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </div>
                    </div>
                  </Card>
                )
              })}
            </div>
          )}
        </div>
      </Tabs>

      {/* Delete Confirmation Modal */}
      {courseToDelete && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-xs flex items-center justify-center z-[9999] p-4 animate-in fade-in duration-200">
          <Card className="max-w-md w-full border border-border shadow-lg">
            <CardHeader className="pb-3 border-b bg-muted/10">
              <CardTitle className="text-sm font-bold flex items-center gap-2 text-destructive">
                <AlertCircle className="h-4.5 w-4.5" />
                Delete Course?
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                This action is permanent and cannot be undone.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              <p className="text-xs text-foreground/80 leading-relaxed">
                Are you sure you want to delete <strong className="text-foreground">"{courseToDelete.title}"</strong>?
                This will delete the course meta-data and all <strong className="text-foreground">{courseToDelete.modules_count}</strong> modules associated with it. Any active candidate progress or enrollments will also be removed.
              </p>
              <div className="flex justify-end gap-2 border-t pt-3 border-border/40">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCourseToDelete(null)}
                  className="rounded-full text-xs"
                  disabled={isPending}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={confirmDelete}
                  className="rounded-full text-xs"
                  disabled={isPending}
                >
                  {isPending ? (
                    <div className="h-3.5 w-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  ) : (
                    "Delete Course"
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
