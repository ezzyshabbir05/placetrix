"use client"

import * as React from "react"
import { useState, useMemo, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
  BookOpen,
  Clock,
  ArrowLeft,
  CheckCircle2,
  Lock,
  Award,
  ChevronRight,
  PlayCircle,
  FileText,
  HelpCircle,
  Code,
  Layers,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"
import { Course, INITIAL_COURSES } from "../types"

export function CandidateCoursesInnerClient({ course: serverCourse }: { course: Course }) {
  const router = useRouter()
  
  // State for all courses loaded from localStorage
  const [courses, setCourses] = useState<Course[]>([])

  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("placetrix_courses_progress")
      if (saved) {
        try {
          const parsed = JSON.parse(saved) as Course[]
          // Merge parsed progress into INITIAL_COURSES template to migrate format/fields
          const merged = INITIAL_COURSES.map(templateCourse => {
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
      } else {
        setCourses(INITIAL_COURSES)
        localStorage.setItem("placetrix_courses_progress", JSON.stringify(INITIAL_COURSES))
      }
    }
  }, [])

  // Find this specific course in our state
  const course = useMemo(() => {
    return courses.find(c => c.id === serverCourse.id) || serverCourse
  }, [courses, serverCourse])

  // Helper to save state
  const saveCourses = (newCourses: Course[]) => {
    setCourses(newCourses)
    if (typeof window !== "undefined") {
      localStorage.setItem("placetrix_courses_progress", JSON.stringify(newCourses))
    }
  }

  // Calculate statistics for this course
  const stats = useMemo(() => {
    let total = 0
    let completed = 0
    
    course.modules.forEach(mod => {
      total++
      if (mod.completed) completed++
    })
    
    return {
      total,
      completed,
      percentage: total > 0 ? Math.round((completed / total) * 100) : 0
    }
  }, [course])

  return (
    <div className="flex flex-col gap-6 px-4 py-8 md:px-8 animate-in fade-in-50 duration-300">
      
      {/* Navigation Breadcrumb / Back button */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.push("/~/courses")}
          className="group rounded-full gap-2 border-border/80 text-muted-foreground hover:text-foreground transition-all duration-200"
        >
          <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
          Back to Courses
        </Button>
      </div>

      {/* Selected Course Minimal Header */}
      <div className="flex flex-col gap-2 border-b pb-4 border-border/60">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
            {course.category}
          </Badge>
          <Badge variant="outline" className="text-[10px] text-muted-foreground">
            {course.level}
          </Badge>
        </div>
        
        <h1 className="text-2xl md:text-3xl font-bold font-cirka tracking-tight text-foreground">
          {course.title}
        </h1>
        
        <p className="text-sm text-muted-foreground leading-relaxed">
          {course.description}
        </p>
      </div>

      {/* Course Details Split Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Modules List (Left & Middle) */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Course Syllabus
          </h2>

          <div className="space-y-4">
            {course.modules.map((mod, index) => {
              const isModCompleted = mod.completed

              return (
                <div
                  key={mod.id}
                  onClick={() => router.push(`/~/courses/${course.id}/module/${mod.id}`)}
                  className="group flex items-center justify-between gap-4 p-5 rounded-xl border border-border/50 bg-card hover:border-primary/30 dark:hover:border-primary/20 hover:shadow-md hover:bg-muted/10 cursor-pointer select-none transition-all duration-300"
                >
                  <div className="flex items-start gap-4 min-w-0 flex-1">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-xs font-bold text-muted-foreground shrink-0 mt-0.5 group-hover:bg-primary group-hover:text-primary-foreground transition-colors duration-300">
                      {index + 1}
                    </div>
                    <div className="space-y-1.5 min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-sm text-foreground leading-tight group-hover:text-primary transition-colors">
                          {mod.title}
                        </span>
                        {isModCompleted ? (
                          <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-[9px] px-2 py-0.5 font-medium rounded-full">
                            Completed
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-[9px] px-2 py-0.5 font-medium text-muted-foreground rounded-full bg-muted/60">
                            Not Started
                          </Badge>
                        )}
                      </div>
                      {mod.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                          {mod.description}
                        </p>
                      )}

                      {/* Module Details Accent Row */}
                      <div className="pt-1 flex flex-wrap gap-x-3 gap-y-1">
                        <span className="inline-flex items-center gap-1.5 text-[10px] text-muted-foreground bg-muted/40 px-2.5 py-0.5 rounded-full border border-border/20">
                          <FileText className="h-3 w-3 text-emerald-500 shrink-0" />
                          <span className="capitalize">{mod.type} Module</span>
                        </span>
                        {mod.duration && (
                          <span className="inline-flex items-center gap-1.5 text-[10px] text-muted-foreground bg-muted/40 px-2.5 py-0.5 rounded-full border border-border/20">
                            <Clock className="h-3 w-3 text-muted-foreground shrink-0" />
                            <span>{mod.duration}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="h-8 w-8 flex items-center justify-center rounded-full bg-muted/40 border border-border/40 group-hover:bg-primary group-hover:text-primary-foreground group-hover:border-primary group-hover:translate-x-1 transition-all duration-300 text-muted-foreground shrink-0">
                    <ChevronRight className="h-4 w-4" />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Stats, Certificate & Instructor Sidebar */}
        <div className="space-y-6">
          
          {/* Minimal Progress Card */}
          <Card className="border-border/50 bg-card rounded-xl shadow-xs">
            <CardHeader className="pb-3">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Course Completion</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center text-xs">
                <span className="text-muted-foreground">Completed</span>
                <span className={cn(
                  "font-semibold",
                  stats.percentage === 100 ? "text-emerald-600 dark:text-emerald-400" : "text-foreground"
                )}>{stats.percentage}%</span>
              </div>
              <Progress 
                value={stats.percentage} 
                className={cn(
                  "h-1.5 bg-muted",
                  stats.percentage === 100 && "[&>[data-slot=progress-indicator]]:bg-emerald-500"
                )} 
              />
              <div className="pt-3.5 flex flex-col gap-2.5 border-t border-border/40 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Category</span>
                  <span className="font-medium text-foreground">{course.category}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Level</span>
                  <span className="font-medium text-foreground">{course.level}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Duration</span>
                  <span className="font-medium text-foreground">{course.duration}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Modules</span>
                  <span className="font-medium text-foreground">{stats.total}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Certificate Unlock Card */}
          <Card className="border-border/50 bg-card rounded-xl shadow-xs overflow-hidden">
            <CardHeader className="pb-3">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Award className="h-3.5 w-3.5 text-muted-foreground" />
                Certificate
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {stats.percentage === 100 ? (
                <div className="space-y-3">
                  <div className="p-3 border border-emerald-500/20 bg-emerald-500/5 dark:bg-emerald-950/20 rounded-xl flex items-center gap-2.5">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-450 shrink-0" />
                    <span className="text-[11px] leading-relaxed text-emerald-800 dark:text-emerald-300 font-medium">
                      Course completed successfully! Your certificate has been unlocked.
                    </span>
                  </div>
                  
                  <Button size="sm" className="w-full text-xs h-9 rounded-full bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600 text-white shadow-xs font-semibold">
                    Download Certificate
                  </Button>
                </div>
              ) : (
                <div className="p-3.5 bg-muted/40 border border-border/40 rounded-xl flex items-start gap-2.5">
                  <Lock className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
                  <span className="text-[11px] text-muted-foreground leading-relaxed">
                    Complete all curriculum modules to unlock the course certificate.
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Instructor Details Card */}
          <Card className="border-border/50 bg-card rounded-xl shadow-xs">
            <CardHeader className="pb-3">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Instructor</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center font-bold text-muted-foreground text-xs shrink-0 border border-border/60 shadow-xs">
                  {course.instructor.avatar}
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-foreground">
                    {course.instructor.name}
                  </h4>
                  <p className="text-[10px] text-muted-foreground">
                    {course.instructor.role}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

        </div>

      </div>

    </div>
  )
}
