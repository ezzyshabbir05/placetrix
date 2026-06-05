"use client"

import { useState, useMemo, useTransition } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
  BookOpen, Plus, Search, X, PenLine, Trash2, Clock, Users, CheckCircle, AlertCircle
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
  category: string
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

export function AdminCoursesListClient({ courses: initialCourses }: Props) {
  const router = useRouter()
  const [courses, setCourses] = useState<CourseListItem[]>(initialCourses)
  const [searchQuery, setSearchQuery] = useState("")
  const [activeTab, setActiveTab] = useState<"all" | "published" | "drafts">("all")
  const [isPending, startTransition] = useTransition()

  // Delete Confirmation State
  const [courseToDelete, setCourseToDelete] = useState<CourseListItem | null>(null)

  const handleCreate = () => {
    router.push("/~/courses/new")
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
  const filteredCourses = useMemo(() => {
    return courses.filter((course) => {
      // Tab filter
      if (activeTab === "published" && !course.is_published) return false
      if (activeTab === "drafts" && course.is_published) return false

      // Search filter
      if (searchQuery.trim() !== "") {
        const query = searchQuery.toLowerCase()
        const matchTitle = course.title.toLowerCase().includes(query)
        const matchDesc = course.description.toLowerCase().includes(query)
        const matchInstructor = course.instructor_name.toLowerCase().includes(query)
        return matchTitle || matchDesc || matchInstructor
      }

      return true
    })
  }, [courses, activeTab, searchQuery])

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

            {/* Tabs Trigger List */}
            <div className="overflow-x-auto shrink-0 w-full sm:w-auto">
              <TabsList className="inline-flex h-9 gap-0.5 rounded-lg bg-muted p-1 w-full sm:w-auto">
                <TabsTrigger
                  value="all"
                  className="gap-1.5 rounded-md px-3 text-xs font-medium data-[state=active]:bg-background data-[state=active]:shadow-sm w-full sm:w-auto"
                >
                  All
                  <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-muted-foreground/10 px-1 text-[9px] font-semibold text-muted-foreground">
                    {counts.all}
                  </span>
                </TabsTrigger>
                <TabsTrigger
                  value="published"
                  className="gap-1.5 rounded-md px-3 text-xs font-medium data-[state=active]:bg-background data-[state=active]:shadow-sm w-full sm:w-auto"
                >
                  Published
                  <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-emerald-500/10 px-1 text-[9px] font-semibold text-emerald-600 dark:text-emerald-450">
                    {counts.published}
                  </span>
                </TabsTrigger>
                <TabsTrigger
                  value="drafts"
                  className="gap-1.5 rounded-md px-3 text-xs font-medium data-[state=active]:bg-background data-[state=active]:shadow-sm w-full sm:w-auto"
                >
                  Drafts
                  <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500/10 px-1 text-[9px] font-semibold text-amber-600 dark:text-amber-450">
                    {counts.drafts}
                  </span>
                </TabsTrigger>
              </TabsList>
            </div>
          </div>

          {/* Grid list */}
          {filteredCourses.length === 0 ? (
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in duration-300">
              {filteredCourses.map((course) => {
                const coverUrl = course.cover_image_path ? buildStorageUrl("course-covers", course.cover_image_path) : null

                return (
                  <Card key={course.id} className="overflow-hidden border border-border/50 bg-card hover:shadow-md transition-all duration-300 flex flex-col justify-between group h-full">
                    <div className="flex flex-col">
                      {/* Course Image Area */}
                      <div className="aspect-video w-full overflow-hidden bg-muted relative border-b border-border/10">
                        {coverUrl ? (
                          <img
                            src={coverUrl}
                            alt={course.title}
                            className="w-full h-full object-cover transform group-hover:scale-103 transition-transform duration-500"
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-indigo-950 via-zinc-900 to-zinc-950 flex flex-col items-center justify-center p-4">
                            <BookOpen className="h-8 w-8 text-primary/40 mb-1" />
                            <span className="text-[10px] uppercase font-bold text-muted-foreground/50 tracking-wider">No cover photo</span>
                          </div>
                        )}

                        {/* Badges Overlays */}
                        {course.badge && (
                          <span className="absolute top-2.5 left-2.5 bg-black/75 backdrop-blur-xs text-white border border-white/10 text-[9px] px-2 py-0.5 rounded-full font-semibold uppercase tracking-wider">
                            {course.badge}
                          </span>
                        )}

                        <span className={cn(
                          "absolute top-2.5 right-2.5 border text-[9px] px-2 py-0.5 rounded-full font-semibold uppercase tracking-wider bg-black/75 backdrop-blur-xs",
                          course.is_published
                            ? "text-emerald-400 border-emerald-500/25"
                            : "text-amber-400 border-amber-500/25"
                        )}>
                          {course.is_published ? "Published" : "Draft"}
                        </span>
                      </div>

                      {/* Info */}
                      <CardHeader className="p-4 pb-0 space-y-1">
                        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-semibold uppercase tracking-wide">
                          <span>{course.category}</span>
                          <span>•</span>
                          <span>{course.level}</span>
                        </div>
                        <CardTitle className="font-semibold text-sm leading-snug text-foreground line-clamp-2 min-h-[40px] group-hover:text-primary transition-colors">
                          {course.title}
                        </CardTitle>
                        <CardDescription className="text-xs text-muted-foreground line-clamp-2 min-h-[32px] pt-1">
                          {course.description}
                        </CardDescription>
                      </CardHeader>
                    </div>

                    <CardContent className="p-4 pt-4 border-t border-border/40 mt-4">
                      {/* Stats Row */}
                      <div className="flex items-center justify-between text-xs text-muted-foreground pb-4">
                        <span className="inline-flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5 text-muted-foreground/60" />
                          {course.duration}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <BookOpen className="h-3.5 w-3.5 text-muted-foreground/60" />
                          {course.modules_count} {course.modules_count === 1 ? "module" : "modules"}
                        </span>
                        <span className="inline-flex items-center gap-1 font-medium text-foreground/80">
                          <Users className="h-3.5 w-3.5 text-primary/60" />
                          {course.enrollments_count} enrolled
                        </span>
                      </div>

                      {/* Action buttons */}
                      <div className="flex gap-2">
                        <Button
                          asChild
                          variant="outline"
                          size="sm"
                          className="flex-1 text-xs rounded-full h-8"
                        >
                          <Link href={`/~/courses/${course.id}/edit`}>
                            <PenLine className="h-3.5 w-3.5 mr-1" />
                            Edit Course
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
                    </CardContent>
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
