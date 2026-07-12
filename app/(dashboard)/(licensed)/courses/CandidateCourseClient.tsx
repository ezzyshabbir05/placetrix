"use client"

import * as React from "react"
import { useState, useMemo, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
  BookOpen, Clock, Search, X, ChevronRight, CheckCircle2,
  LayoutGrid, LayoutList, TrendingUp, Award, Layers, SlidersHorizontal
} from "lucide-react"
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription, EmptyContent, EmptyMedia } from "@/components/ui/empty"
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet"
import { cn, formatDuration } from "@/lib/utils"
import { Course } from "./types"
import { CourseCover } from "./components/CourseCover"



// ─── CourseCard Component (Grid) ────────────────────────────────────────────
interface CourseCardProps {
  course: Course
  stats: { total: number; completed: number; percentage: number }
  onSelect: () => void
}

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
    neutral:
      "border-border/60 bg-muted/50 text-muted-foreground",
    sky:
      "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-500/20 dark:bg-sky-500/10 dark:text-sky-300",
    emerald:
      "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300",
    amber:
      "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300",
    violet:
      "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-500/20 dark:bg-violet-500/10 dark:text-violet-300",
    rose:
      "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-300",
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

function LevelBadge({ level }: { level: string }) {
  if (level === "Beginner") {
    return (
      <Badge className="gap-1 border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300 text-[11px] px-2 py-0.5 font-medium shadow-none">
        Beginner
      </Badge>
    )
  }
  if (level === "Intermediate") {
    return (
      <Badge className="gap-1 border border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-50 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300 text-[11px] px-2 py-0.5 font-medium shadow-none">
        Intermediate
      </Badge>
    )
  }
  return (
    <Badge className="gap-1 border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-50 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-300 text-[11px] px-2 py-0.5 font-medium shadow-none">
      Advanced
    </Badge>
  )
}

function EnrollmentStatusBadge({ isCompleted, percentage }: { isCompleted: boolean; percentage: number }) {
  if (isCompleted) {
    return (
      <Badge className="gap-1 border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300 text-[11px] px-2 py-0.5 font-medium shadow-none">
        <CheckCircle2 className="h-3 w-3" />
        Completed
      </Badge>
    )
  }
  return (
    <Badge className="gap-1 border border-violet-200 bg-violet-50 text-violet-700 hover:bg-violet-50 dark:border-violet-500/20 dark:bg-violet-500/10 dark:text-violet-300 text-[11px] px-2 py-0.5 font-medium shadow-none">
      Enrolled ({percentage}%)
    </Badge>
  )
}

function CourseCard({ course, stats, onSelect }: CourseCardProps) {
  const isCompleted = stats.percentage === 100

  const dotColor = course.level === "Beginner"
    ? "bg-emerald-500"
    : course.level === "Intermediate"
      ? "bg-amber-500"
      : "bg-rose-500"

  return (
    <Card
      onClick={onSelect}
      className={cn(
        "flex flex-col justify-between overflow-hidden border border-border/70 bg-card p-0 gap-0",
        "cursor-pointer h-full select-none"
      )}
    >
      {/* Cover */}
      <div className="aspect-video w-full overflow-hidden bg-muted relative rounded-t-xl">
        <div className="w-full h-full transform transition-transform duration-500 ease-out">
          <CourseCover coverImagePath={course.cover_image_path} title={course.title} />
        </div>

        {/* Status pill (top-right) if enrolled */}
        {course.isEnrolled && (
          <span className={cn(
            "absolute top-2.5 right-2.5 border text-[10px] px-2 py-0.5 rounded-full font-semibold bg-black/70 text-white border-white/10 backdrop-blur-md shadow-xs flex items-center gap-1"
          )}>
            {isCompleted ? (
              <>
                <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                <span>Completed</span>
              </>
            ) : (
              <span>Enrolled ({stats.percentage}%)</span>
            )}
          </span>
        )}

        {/* Level Badge overlay (top-left) */}
        <span className="absolute top-2.5 left-2.5 backdrop-blur-md bg-black/70 text-white border border-white/10 text-[10px] px-2 py-0.5 rounded-full font-semibold flex items-center gap-1.5 shadow-xs">
          <span className={cn("size-1.5 rounded-full", dotColor)} />
          {course.level}
        </span>
      </div>

      {/* Info Header */}
      <CardHeader className="px-4 pt-4 pb-2 gap-1.5 flex flex-col">
        {/* Instructor row */}
        <div className="flex items-center gap-1.5 min-w-0">
          {course.instructor.avatar ? (
            <img
              src={course.instructor.avatar}
              alt=""
              className="h-4.5 w-4.5 rounded-full object-cover shrink-0 border border-primary/20"
            />
          ) : (
            <div className="h-4.5 w-4.5 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center font-bold text-[9px] text-primary shrink-0">
              {course.instructor.name.charAt(0)}
            </div>
          )}
          <span className="text-[10px] text-muted-foreground font-medium truncate">
            {course.instructor.name}
          </span>
        </div>

        {/* Title */}
        <CardTitle className="font-semibold text-sm text-foreground leading-snug line-clamp-2 min-h-[40px] transition-colors duration-200">
          {course.title}
        </CardTitle>
      </CardHeader>

      {/* Description & Metadata Content */}
      <CardContent className="px-4 py-0 flex-1 flex flex-col justify-between gap-3">
        <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2 min-h-[32px]">
          {course.description}
        </p>

        {/* Dynamic course info (Duration & Modules count) */}
        <div className="flex flex-wrap items-center gap-2 pt-1.5">
          <StatChip icon={<Clock className="h-3.5 w-3.5" />} tone="neutral">
            {formatDuration(course.duration)}
          </StatChip>
          <StatChip icon={<BookOpen className="h-3.5 w-3.5" />} tone="neutral">
            {course.modules.length} {course.modules.length === 1 ? "module" : "modules"}
          </StatChip>
        </div>
      </CardContent>

      {/* Action Footer */}
      <CardFooter className="px-4 pt-2 pb-4 flex items-center justify-start">
        {course.isEnrolled ? (
          isCompleted ? (
            <Badge className="gap-1 border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300 text-[11px] px-2.5 py-1 font-medium shadow-none">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Completed
            </Badge>
          ) : (
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs font-medium"
              onClick={(e) => {
                e.stopPropagation()
                onSelect()
              }}
            >
              Continue ({stats.percentage}%)
            </Button>
          )
        ) : (
          <Button
            variant="default"
            size="sm"
            className="h-8 text-xs font-medium"
            onClick={(e) => {
              e.stopPropagation()
              onSelect()
            }}
          >
            Enroll Now
          </Button>
        )}
      </CardFooter>
    </Card>
  )
}

// ─── CourseRow Component (List View) ────────────────────────────────────────
function CourseRow({ course, stats, onSelect }: CourseCardProps) {
  const isCompleted = stats.percentage === 100

  return (
    <div
      onClick={onSelect}
      className={cn(
        "group flex items-center gap-4 p-4 rounded-xl border border-border/70 bg-card shadow-sm cursor-pointer select-none",
        "hover:bg-muted/40 transition-colors duration-200"
      )}
    >
      <div className="h-16 w-24 shrink-0 rounded-lg overflow-hidden bg-muted relative">
        <CourseCover coverImagePath={course.cover_image_path} title={course.title} />
      </div>

      <div className="flex-1 min-w-0 space-y-1.5">
        <div className="flex items-center gap-2 flex-wrap">
          <LevelBadge level={course.level} />
          {course.isEnrolled && (
            <EnrollmentStatusBadge isCompleted={isCompleted} percentage={stats.percentage} />
          )}
        </div>
        <p className="font-semibold text-sm md:text-base text-foreground leading-tight line-clamp-1">
          {course.title}
        </p>
        <p className="text-xs text-muted-foreground line-clamp-1 leading-normal">{course.description}</p>
        <div className="flex flex-wrap items-center gap-2 pt-0.5">
          <StatChip icon={<Clock className="h-3.5 w-3.5" />} tone="neutral">
            {formatDuration(course.duration)}
          </StatChip>
          <StatChip icon={<BookOpen className="h-3.5 w-3.5" />} tone="neutral">
            {course.modules.length} {course.modules.length === 1 ? "module" : "modules"}
          </StatChip>
          {course.instructor && (
            <span className="text-[11px] text-muted-foreground/80 font-medium truncate ml-1">
              by {course.instructor.name}
            </span>
          )}
        </div>
      </div>

      <div className="hidden sm:flex flex-col items-end gap-1.5 shrink-0 w-28">
        {course.isEnrolled ? (
          <>
            <div className="flex justify-between items-center w-full text-[10px] font-medium">
              <span className={cn(isCompleted ? "text-emerald-600 dark:text-emerald-400 font-semibold" : "text-muted-foreground")}>
                {isCompleted ? "Completed" : "In Progress"}
              </span>
              <span className={cn("font-semibold tabular-nums", isCompleted ? "text-emerald-600 dark:text-emerald-400" : "text-foreground")}>
                {stats.percentage}%
              </span>
            </div>
            <Progress
              value={stats.percentage}
              className={cn(
                "h-1 w-full bg-muted",
                isCompleted 
                  ? "[&>[data-slot=progress-indicator]]:bg-emerald-500" 
                  : "[&>[data-slot=progress-indicator]]:bg-primary"
              )}
            />
          </>
        ) : (
          <span className="text-[11px] text-muted-foreground italic">Not enrolled</span>
        )}
      </div>

      <ChevronRight className="h-4 w-4 text-muted-foreground/40 shrink-0" />
    </div>
  )
}

// ─── Filter chip (used inside the sheet) ─────────────────────────────────────
function FilterChip({
  label,
  active,
  onClick,
}: {
  label: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "text-sm px-4 py-2 rounded-full border font-medium transition-all duration-150 w-full text-left",
        active
          ? "bg-primary text-primary-foreground border-primary"
          : "bg-muted/50 border-border/60 text-muted-foreground hover:text-foreground hover:border-border"
      )}
    >
      {label}
    </button>
  )
}

// ─── Constants ───────────────────────────────────────────────────────────────
type StatusFilter = "all" | "in-progress" | "completed"
type LevelFilter = "all" | "Beginner" | "Intermediate" | "Advanced"

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "All Courses" },
  { value: "in-progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
]

const LEVEL_OPTIONS: { value: LevelFilter; label: string; hex: string }[] = [
  { value: "all", label: "All Levels", hex: "" },
  { value: "Beginner", label: "Beginner", hex: "#16a34a" },
  { value: "Intermediate", label: "Intermediate", hex: "#f59e0b" },
  { value: "Advanced", label: "Advanced", hex: "#e11d48" },
]

// ─── Main Component ──────────────────────────────────────────────────────────
export function CandidateCourseClient({ initialCourses }: { initialCourses: Course[] }) {
  const router = useRouter()
  const [courses, setCourses] = useState<Course[]>(initialCourses)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all")
  const [levelFilter, setLevelFilter] = useState<LevelFilter>("all")
  const [filterSheetOpen, setFilterSheetOpen] = useState(false)

  useEffect(() => {
    setCourses(initialCourses)
  }, [initialCourses])

  // Per-course stats
  const courseStats = useMemo(() => {
    const map: Record<string, { total: number; completed: number; percentage: number }> = {}
    courses.forEach(course => {
      let total = 0, completed = 0
      course.modules.forEach(mod => { total++; if (mod.completed) completed++ })
      map[course.id] = { total, completed, percentage: total > 0 ? Math.round((completed / total) * 100) : 0 }
    })
    return map
  }, [courses])

  // Active filter count (for badge on filter button)
  const activeFilterCount = useMemo(() => {
    let count = 0
    if (statusFilter !== "all") count++
    if (levelFilter !== "all") count++
    return count
  }, [statusFilter, levelFilter])

  // Filtered courses
  const filteredCourses = useMemo(() => {
    return courses.filter(course => {
      if (statusFilter !== "all") {
        const stats = courseStats[course.id]
        if (statusFilter === "in-progress" && !(stats && stats.percentage > 0 && stats.percentage < 100)) return false
        if (statusFilter === "completed" && !(stats && stats.percentage === 100)) return false
      }
      if (levelFilter !== "all" && course.level !== levelFilter) return false
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        return course.title.toLowerCase().includes(q) || course.description.toLowerCase().includes(q)
      }
      return true
    })
  }, [courses, statusFilter, levelFilter, searchQuery, courseStats])

  const clearAllFilters = () => {
    setStatusFilter("all")
    setLevelFilter("all")
    setSearchQuery("")
  }

  const hasActiveFilters = activeFilterCount > 0 || searchQuery.trim() !== ""

  return (
    <div className="flex flex-col gap-6 px-4 py-6 md:px-8 md:py-8">

      {/* Page Header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold font-cirka tracking-tight text-foreground">Courses</h1>
        <p className="text-sm text-muted-foreground">
          {courses.length} course{courses.length !== 1 ? "s" : ""} curated for your placement journey
        </p>
      </div>

      {/* Toolbar: Search + Filter + View Toggle */}
      <div className="flex items-center gap-2">

        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
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

        {/* Filter Button */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => setFilterSheetOpen(true)}
          className={cn(
            "h-9 gap-1.5 rounded-lg shrink-0 border-border/70",
            activeFilterCount > 0 && "border-primary/40 text-primary bg-primary/5"
          )}
        >
          <SlidersHorizontal className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Filters</span>
          {activeFilterCount > 0 && (
            <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-primary text-primary-foreground text-[9px] font-bold px-1 leading-none">
              {activeFilterCount}
            </span>
          )}
        </Button>


      </div>

      {/* Active filter summary strip */}
      {hasActiveFilters && (
        <div className="flex items-center gap-2 -mt-3">
          <span className="text-[11px] text-muted-foreground">
            {filteredCourses.length} of {courses.length} courses
          </span>
          <button
            onClick={clearAllFilters}
            className="text-[11px] text-primary hover:underline font-medium flex items-center gap-0.5"
          >
            <X className="h-3 w-3" />
            Clear all
          </button>
        </div>
      )}

      {/* Courses Grid / List */}
      {filteredCourses.length === 0 ? (
        <Empty className="border border-dashed border-border/60 rounded-xl bg-card/50 p-12">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <BookOpen className="h-5 w-5 text-muted-foreground/60" />
            </EmptyMedia>
            <EmptyTitle>No courses found</EmptyTitle>
            <EmptyDescription>Try adjusting your search or filters</EmptyDescription>
          </EmptyHeader>
          {hasActiveFilters && (
            <EmptyContent>
              <Button variant="ghost" onClick={clearAllFilters} className="text-xs text-primary hover:underline font-medium p-0 h-auto">
                Clear all filters
              </Button>
            </EmptyContent>
          )}
        </Empty>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 animate-in fade-in duration-300">
          {filteredCourses.map((course) => (
            <CourseCard
              key={course.id}
              course={course}
              stats={courseStats[course.id]}
              onSelect={() => router.push(`/courses/${course.id}`)}
            />
          ))}
        </div>
      )}

      {/* ─── Filter Sheet ─────────────────────────────────────────────────── */}
      <Sheet open={filterSheetOpen} onOpenChange={setFilterSheetOpen}>
        <SheetContent side="right" className="w-[300px] sm:w-[360px] flex flex-col gap-0 p-0">
          {/* Sheet Header — pr-10 clears the built-in absolute close button */}
          <SheetHeader className="px-6 pt-5 pb-4 pr-10 border-b border-border/50">
            <SheetTitle className="text-base font-semibold">Filters</SheetTitle>
            <SheetDescription className="text-xs text-muted-foreground">
              Narrow down by status and level.
            </SheetDescription>
            {activeFilterCount > 0 && (
              <button
                onClick={() => { setStatusFilter("all"); setLevelFilter("all") }}
                className="text-xs text-primary hover:underline font-medium text-left"
              >
                Clear all
              </button>
            )}
          </SheetHeader>

          {/* Filter body */}
          <div className="flex-1 overflow-y-auto px-6 py-6 space-y-8">

            {/* Status */}
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Status</p>
              <div className="flex flex-col gap-2">
                {STATUS_OPTIONS.map(opt => (
                  <FilterChip
                    key={opt.value}
                    label={opt.label}
                    active={statusFilter === opt.value}
                    onClick={() => setStatusFilter(opt.value)}
                  />
                ))}
              </div>
            </div>

            {/* Level */}
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Difficulty Level</p>
              <div className="flex flex-col gap-2">
                {LEVEL_OPTIONS.map(opt => {
                  const isActive = levelFilter === opt.value
                  const activeStyle = isActive && opt.hex
                    ? { backgroundColor: opt.hex, borderColor: opt.hex, color: "#fff" }
                    : {}
                  return (
                    <button
                      key={opt.value}
                      onClick={() => setLevelFilter(opt.value)}
                      style={activeStyle}
                      className={cn(
                        "text-sm px-4 py-2 rounded-full border font-medium transition-all duration-150 w-full text-left",
                        isActive
                          ? opt.hex
                            ? "border-transparent"
                            : "bg-primary text-primary-foreground border-primary"
                          : "bg-muted/50 border-border/60 text-muted-foreground hover:text-foreground hover:border-border"
                      )}
                    >
                      {opt.label}
                    </button>
                  )
                })}
              </div>
            </div>

          </div>

          {/* Sheet Footer */}
          <div className="px-6 py-5 border-t border-border/50">
            <Button
              className="w-full rounded-full font-semibold"
              onClick={() => setFilterSheetOpen(false)}
            >
              Show {filteredCourses.length} course{filteredCourses.length !== 1 ? "s" : ""}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

    </div>
  )
}