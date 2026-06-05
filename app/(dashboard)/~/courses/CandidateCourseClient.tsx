"use client"

import * as React from "react"
import { useState, useMemo, useEffect } from "react"
import { useRouter } from "next/navigation"
import { BookOpen, Clock, Search, Layers, X, ChevronRight, CheckCircle2 } from "lucide-react"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"
import { Course } from "./types"

// ─── SVG Covers ──────────────────────────────────────────────────────────────
function CourseCover({ courseId }: { courseId: string }) {
  switch (courseId) {
    case "algo-ds-masterclass":
    case "python-for-everybody":
      return (
        <svg className="w-full h-full object-cover" viewBox="0 0 320 180" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="100%" height="100%" fill="url(#bg-algo)" />
          <defs>
            <linearGradient id="bg-algo" x1="0%" y1="0%" x2="100%" y2="100%">
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
          <circle cx="140" cy="150" r="6" fill="#a5b4fc" opacity="0.8" />
          <circle cx="180" cy="150" r="6" fill="#a5b4fc" opacity="0.8" />
          <circle cx="260" cy="150" r="6" fill="#a5b4fc" opacity="0.8" />
          <path d="M160 60 L100 92 M160 60 L220 92 M100 108 L60 144 M100 108 L140 144 M220 108 L180 144 M220 108 L260 144" stroke="#818cf8" strokeWidth="1.5" opacity="0.5" />
          <text x="160" y="105" fill="#ffffff" opacity="0.08" fontSize="24" fontWeight="bold" textAnchor="middle" letterSpacing="2">BINARY TREE</text>
        </svg>
      )
    case "nextjs-supabase-dev":
    case "programming-for-everybody":
      return (
        <svg className="w-full h-full object-cover" viewBox="0 0 320 180" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="100%" height="100%" fill="url(#bg-next)" />
          <defs>
            <linearGradient id="bg-next" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#0b0f19" />
              <stop offset="100%" stopColor="#064e3b" />
            </linearGradient>
          </defs>
          <g opacity="0.15">
            <path d="M0 40 L320 140 M0 140 L320 40" stroke="#059669" strokeWidth="0.5" />
            <circle cx="80" cy="40" r="20" stroke="#059669" strokeWidth="0.5" />
            <circle cx="240" cy="140" r="20" stroke="#059669" strokeWidth="0.5" />
          </g>
          <path d="M40 90 L280 90 M160 30 L160 150" stroke="#059669" strokeWidth="1.5" opacity="0.3" />
          <circle cx="160" cy="90" r="25" stroke="#34d399" strokeWidth="1.8" fill="#047857" fillOpacity="0.2" />
          <rect x="75" y="60" width="30" height="15" rx="2" fill="#047857" stroke="#10b981" strokeWidth="1" />
          <rect x="215" y="60" width="30" height="15" rx="2" fill="#047857" stroke="#10b981" strokeWidth="1" />
          <rect x="75" y="105" width="30" height="15" rx="2" fill="#047857" stroke="#10b981" strokeWidth="1" />
          <rect x="215" y="105" width="30" height="15" rx="2" fill="#047857" stroke="#10b981" strokeWidth="1" />
          <text x="160" y="95" fill="#ffffff" opacity="0.08" fontSize="22" fontWeight="bold" textAnchor="middle" letterSpacing="1">FULL-STACK</text>
        </svg>
      )
    case "behavioral-interviews-soft-skills":
    case "foundations-data-everywhere":
      return (
        <svg className="w-full h-full object-cover" viewBox="0 0 320 180" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="100%" height="100%" fill="url(#bg-inter)" />
          <defs>
            <linearGradient id="bg-inter" x1="0%" y1="0%" x2="100%" y2="100%">
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
          <text x="160" y="95" fill="#ffffff" opacity="0.08" fontSize="24" fontWeight="bold" textAnchor="middle" letterSpacing="2">STAR METHOD</text>
        </svg>
      )
    case "system-design-scale":
    case "google-data-analytics":
    default:
      return (
        <svg className="w-full h-full object-cover" viewBox="0 0 320 180" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="100%" height="100%" fill="url(#bg-sys)" />
          <defs>
            <linearGradient id="bg-sys" x1="0%" y1="0%" x2="100%" y2="100%">
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
          <text x="160" y="95" fill="#ffffff" opacity="0.08" fontSize="22" fontWeight="bold" textAnchor="middle" letterSpacing="1">DISTRIBUTED</text>
        </svg>
      )
  }
}

// ─── CourseCard Component ───────────────────────────────────────────────────
interface CourseCardProps {
  course: Course
  stats: { total: number; completed: number; percentage: number }
  onSelect: () => void
}

function CourseCard({ course, stats, onSelect }: CourseCardProps) {
  const isCompleted = stats.percentage === 100

  return (
    <Card
      onClick={onSelect}
      className="group flex flex-col justify-between overflow-hidden border border-border/50 dark:border-zinc-800/80 bg-card hover:border-border hover:shadow-lg hover:-translate-y-1 transition-all duration-300 cursor-pointer h-full select-none p-0 gap-0"
    >
      <div className="flex flex-col h-full">
        {/* Cover Image Area */}
        <div className="aspect-video w-full overflow-hidden bg-muted relative rounded-t-lg">
          <div className="w-full h-full transform group-hover:scale-105 transition-transform duration-500 ease-out">
            <CourseCover courseId={course.id} />
          </div>

          {/* Top-Right Badge Overlay */}
          {course.badge && (
            <span className="absolute top-2.5 right-2.5 bg-black/75 backdrop-blur-xs text-white border border-white/10 text-[9px] px-2 py-0.5 rounded-full font-semibold uppercase tracking-wider">
              {course.badge}
            </span>
          )}
        </div>

        {/* Info Area */}
        <div className="flex flex-col flex-1">
          <CardHeader className="px-4 pt-4 pb-0 gap-2">
            {/* Partner & Logo */}
            <div className="flex items-center gap-2">
              <div className={cn("h-4 w-4 rounded-full flex items-center justify-center font-bold text-[9px] text-white shrink-0 shadow-xs", course.partner?.logoBg || "bg-indigo-600")}>
                {course.partner?.logo || "C"}
              </div>
              <span className="text-[11px] text-muted-foreground font-medium truncate">
                {course.partner?.name || "CS Foundation"}
              </span>
            </div>

            {/* Title */}
            <CardTitle className="font-semibold text-sm md:text-[14px] text-foreground leading-snug line-clamp-2 min-h-[40px] group-hover:text-primary transition-colors duration-200">
              {course.title}
            </CardTitle>

            {/* Course Type / Level Description */}
            <CardDescription className="text-[11px] text-muted-foreground flex items-center gap-1.5 mt-0.5">
              <span className="font-medium text-foreground/80">{course.type || "Specialization"}</span>
              <span className="text-muted-foreground/30">•</span>
              <span className="capitalize">{course.level}</span>
            </CardDescription>
          </CardHeader>

          {/* Bottom Progress Area */}
          <CardContent className="mt-auto pt-4 pb-4 px-4">
            <div className="border-t border-border/40 pt-3.5 w-full">
              {stats.percentage > 0 ? (
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-[10px] font-medium">
                    <span className={cn(
                      "flex items-center gap-1",
                      isCompleted ? "text-emerald-600 dark:text-emerald-400 font-semibold" : "text-muted-foreground"
                    )}>
                      {isCompleted ? (
                        <>
                          <CheckCircle2 className="h-3 w-3 shrink-0" />
                          Completed
                        </>
                      ) : (
                        "In Progress"
                      )}
                    </span>
                    <span className={cn(
                      "font-semibold",
                      isCompleted ? "text-emerald-600 dark:text-emerald-400" : "text-foreground"
                    )}>{stats.percentage}%</span>
                  </div>
                  <Progress 
                    value={stats.percentage} 
                    className={cn(
                      "h-1.5 bg-muted",
                      isCompleted && "[&>[data-slot=progress-indicator]]:bg-emerald-500"
                    )} 
                  />
                </div>
              ) : (
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-muted-foreground/75 italic">Not started</span>
                  <span className="text-primary font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center gap-0.5">
                    Start Course
                    <ChevronRight className="h-3.5 w-3.5 transform group-hover:translate-x-0.5 transition-transform" />
                  </span>
                </div>
              )}
            </div>
          </CardContent>
        </div>
      </div>
    </Card>
  )
}

// ─── Main Component ─────────────────────────────────────────────────────────
export function CandidateCourseClient({ initialCourses }: { initialCourses: Course[] }) {
  const router = useRouter()
  const [courses, setCourses] = useState<Course[]>(initialCourses)
  const [searchQuery, setSearchQuery] = useState("")
  const [activeTab, setActiveTab] = useState<"all" | "in-progress" | "completed">("all")


  // Load progress from localStorage on client-side mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("placetrix_courses_progress")
      if (saved) {
        try {
          const parsed = JSON.parse(saved) as Course[]
          // Merge parsed progress into INITIAL_COURSES template to migrate format/fields
          const merged = initialCourses.map(templateCourse => {
            const savedCourse = parsed.find(c => c.id === templateCourse.id)
            if (!savedCourse) return templateCourse
            return {
              ...templateCourse,
              modules: templateCourse.modules.map(templateMod => {
                const savedMod = savedCourse.modules?.find(m => m.id === templateMod.id)
                return {
                  ...templateMod,
                  completed: savedMod ? savedMod.completed : templateMod.completed
                }
              })
            }
          })
          setCourses(merged)
          localStorage.setItem("placetrix_courses_progress", JSON.stringify(merged))
        } catch (e) {
          console.error("Failed to parse courses progress:", e)
        }
      }
    }
  }, [initialCourses])

  // Calculate statistics for each course
  const courseStats = useMemo(() => {
    const statsMap: Record<string, { total: number; completed: number; percentage: number }> = {}

    courses.forEach(course => {
      let total = 0
      let completed = 0

      course.modules.forEach(mod => {
        total++
        if (mod.completed) completed++
      })

      statsMap[course.id] = {
        total,
        completed,
        percentage: total > 0 ? Math.round((completed / total) * 100) : 0
      }
    })

    return statsMap
  }, [courses])

  // Calculate counts for tabs/status dynamically
  const tabCounts = useMemo(() => {
    const counts = { all: 0, "in-progress": 0, completed: 0 }
    courses.forEach(course => {
      counts.all++
      const stats = courseStats[course.id]
      if (stats) {
        if (stats.percentage === 100) {
          counts.completed++
        } else if (stats.percentage > 0) {
          counts["in-progress"]++
        }
      }
    })
    return counts
  }, [courses, courseStats])

  // Filter courses based on search and selected tab (status)
  const filteredCourses = useMemo(() => {
    return courses.filter(course => {
      // Status filter based on activeTab
      if (activeTab !== "all") {
        const stats = courseStats[course.id]
        if (activeTab === "in-progress") {
          const isInProgress = stats && stats.percentage > 0 && stats.percentage < 100
          if (!isInProgress) return false
        } else if (activeTab === "completed") {
          const isCompleted = stats && stats.percentage === 100
          if (!isCompleted) return false
        }
      }

      // Search filter
      if (searchQuery.trim() !== "") {
        const query = searchQuery.toLowerCase()
        const matchTitle = course.title.toLowerCase().includes(query)
        const matchDesc = course.description.toLowerCase().includes(query)
        return matchTitle || matchDesc
      }

      return true
    })
  }, [courses, activeTab, searchQuery, courseStats])

  const displayedCourses = filteredCourses

  const tabConfig = [
    { value: "all" as const, label: "All", count: tabCounts.all },
    { value: "in-progress" as const, label: "In Progress", count: tabCounts["in-progress"] },
    { value: "completed" as const, label: "Completed", count: tabCounts.completed },
  ]

  return (
    <div className="flex flex-col gap-6 px-4 py-8 md:px-8">
      {/* Minimal Page Header */}
      <div className="flex flex-col gap-1.5">
        <h1 className="text-3xl font-bold font-cirka tracking-tight text-foreground">Course Board</h1>
        <p className="text-sm text-muted-foreground">
          Explore {courses.length} courses curated just for You!
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v as any) }}>
        <div className="space-y-4">
          {/* Search (left) + Tabs (right) */}
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

            {/* Right side controls: Tabs list */}
            <div className="overflow-x-auto shrink-0 w-full sm:w-auto">
              <TabsList className="inline-flex h-9 gap-0.5 rounded-lg bg-muted p-1 w-full sm:w-auto">
                {tabConfig.map(({ value, label, count }) => (
                  <TabsTrigger
                    key={value}
                    value={value}
                    className="gap-1.5 rounded-md px-3 text-xs font-medium data-[state=active]:bg-background data-[state=active]:shadow-sm w-full sm:w-auto"
                  >
                    {label}
                    {count > 0 && (
                      <span className={cn(
                        "inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-semibold tabular-nums",
                        activeTab === value
                          ? "bg-foreground text-background"
                          : "bg-muted-foreground/20 text-muted-foreground"
                      )}>
                        {count}
                      </span>
                    )}
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>
          </div>

          {/* Courses Grid */}
          <div className="space-y-6">
            {displayedCourses.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 text-center gap-3 border border-dashed border-border/60 rounded-xl bg-card/50">
                <div className="h-12 w-12 rounded-xl bg-muted flex items-center justify-center">
                  <BookOpen className="h-5 w-5 text-muted-foreground/60" />
                </div>
                <div className="space-y-0.5">
                  <p className="text-sm font-medium">No courses found</p>
                  <p className="text-xs text-muted-foreground">Adjust your filters or search query to find courses</p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-in fade-in duration-300">
                {displayedCourses.map((course) => (
                  <CourseCard
                    key={course.id}
                    course={course}
                    stats={courseStats[course.id]}
                    onSelect={() => router.push(`/~/courses/${course.id}`)}
                  />
                ))}
              </div>
            )}


          </div>
        </div>
      </Tabs>
    </div>
  )
}