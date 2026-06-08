"use client"

import * as React from "react"
import { useState, useMemo, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
  BookOpen, Clock, ArrowLeft, CheckCircle2, Lock, Award, ChevronRight, FileText, PlayCircle, Zap
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { enrollInCourseAction } from "../actions"

interface Module {
  id: string
  title: string
  description?: string
  type: "video" | "text" | "test"
  completed: boolean
  duration?: string
}

interface Course {
  id: string
  title: string
  description: string
  level: string
  duration: string
  type: string
  badge?: string
  cover_image_path?: string
  partner: {
    name: string
    logo: string
    logoBg: string
  }
  instructor: {
    name: string
    role: string
    avatar: string
  }
  modules: Module[]
}

interface Props {
  course: Course
  isEnrolled: boolean
  certificateId: string | null
  userProfile: any
}



export function CandidateCourseDetailClient({ course, isEnrolled, certificateId, userProfile }: Props) {
  const router = useRouter()
  const [isEnrolling, setIsEnrolling] = useState(false)

  const modules = course.modules

  // Calculate statistics for this course
  const stats = useMemo(() => {
    let total = 0
    let completed = 0
    modules.forEach(mod => {
      total++
      if (mod.completed) completed++
    })
    return {
      total,
      completed,
      percentage: total > 0 ? Math.round((completed / total) * 100) : 0
    }
  }, [modules])

  // The next incomplete module for "continue" banner
  const nextModule = useMemo(() => {
    return modules.find(m => !m.completed) ?? null
  }, [modules])

  const handleEnroll = async () => {
    setIsEnrolling(true)
    try {
      const result = await enrollInCourseAction(course.id)
      if (result.success) {
        toast.success("You have successfully enrolled in this course!")
        router.refresh()
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to enroll in the course.")
    } finally {
      setIsEnrolling(false)
    }
  }

  const handleModuleClick = (moduleId: string) => {
    if (!isEnrolled) {
      toast.error("Please enroll in the course first to access its contents.")
      return
    }
    router.push(`/~/courses/${course.id}/module/${moduleId}`)
  }



  return (
    <div className="flex flex-col gap-6 px-4 py-8 md:px-8 animate-in fade-in duration-300">

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

      {/* "Continue Where You Left Off" Banner */}
      {isEnrolled && nextModule && stats.percentage > 0 && stats.percentage < 100 && (
        <div
          className="relative overflow-hidden flex items-center justify-between gap-4 rounded-2xl border border-primary/20 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-4 animate-in fade-in slide-in-from-top-2 duration-500 cursor-pointer group"
          onClick={() => handleModuleClick(nextModule.id)}
        >
          <div className="pointer-events-none absolute -left-6 -bottom-6 h-24 w-24 rounded-full bg-primary/10 blur-2xl" />
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-9 w-9 rounded-xl bg-primary/15 flex items-center justify-center shrink-0 border border-primary/25 group-hover:bg-primary/25 transition-colors">
              <Zap className="h-4.5 w-4.5 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-primary/80">Continue Learning</p>
              <p className="text-sm font-semibold text-foreground line-clamp-1 group-hover:text-primary transition-colors">
                {nextModule.title}
              </p>
              {nextModule.duration && (
                <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                  <Clock className="h-3 w-3" />
                  {nextModule.duration} · Module {course.modules.findIndex(m => m.id === nextModule.id) + 1} of {course.modules.length}
                </p>
              )}
            </div>
          </div>
          <Button
            size="sm"
            className="shrink-0 rounded-full text-xs font-semibold shadow-md shadow-primary/15 gap-1.5"
            onClick={(e) => {
              e.stopPropagation()
              handleModuleClick(nextModule.id)
            }}
          >
            <PlayCircle className="h-3.5 w-3.5" />
            Resume
          </Button>
        </div>
      )}

      {/* Start learning banner for enrolled but 0 progress */}
      {isEnrolled && nextModule && stats.percentage === 0 && (
        <div
          className="relative overflow-hidden flex items-center justify-between gap-4 rounded-2xl border border-emerald-500/20 bg-gradient-to-r from-emerald-500/8 via-emerald-500/4 to-transparent p-4 animate-in fade-in duration-500 cursor-pointer group"
          onClick={() => handleModuleClick(nextModule.id)}
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-9 w-9 rounded-xl bg-emerald-500/15 flex items-center justify-center shrink-0 border border-emerald-500/25">
              <PlayCircle className="h-4.5 w-4.5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-emerald-600/80 dark:text-emerald-400/80">Ready to Start?</p>
              <p className="text-sm font-semibold text-foreground">Begin with: {nextModule.title}</p>
            </div>
          </div>
          <Button
            size="sm"
            className="shrink-0 rounded-full text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/15 gap-1.5"
            onClick={(e) => {
              e.stopPropagation()
              handleModuleClick(nextModule.id)
            }}
          >
            <PlayCircle className="h-3.5 w-3.5" />
            Start Course
          </Button>
        </div>
      )}

      {/* Selected Course Minimal Header */}
      <div className="flex flex-col gap-2 border-b pb-4 border-border/60">
        <div className="flex flex-wrap items-center gap-2">
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
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Course Syllabus
            </h2>
            {isEnrolled && (
              <span className="text-[11px] text-muted-foreground">
                <span className="font-semibold text-foreground">{stats.completed}</span>/{stats.total} complete
              </span>
            )}
          </div>

          <div className="space-y-3">
            {modules.map((mod, index) => {
              const isModCompleted = mod.completed

              return (
                <div
                  key={mod.id}
                  onClick={() => handleModuleClick(mod.id)}
                  className={cn(
                    "group flex items-center justify-between gap-4 p-5 rounded-xl border border-border/50 bg-card select-none transition-all duration-300",
                    isEnrolled
                      ? "hover:border-primary/30 dark:hover:border-primary/20 hover:shadow-md hover:bg-muted/10 cursor-pointer"
                      : "cursor-not-allowed opacity-80"
                  )}
                >
                  <div className="flex items-start gap-4 min-w-0 flex-1">
                    <div className={cn(
                      "flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold shrink-0 mt-0.5 transition-colors duration-300",
                      isEnrolled
                        ? "bg-muted text-muted-foreground group-hover:bg-primary group-hover:text-primary-foreground"
                        : "bg-muted/40 text-muted-foreground/40"
                    )}>
                      {index + 1}
                    </div>
                    <div className="space-y-1.5 min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={cn(
                          "font-semibold text-sm leading-tight transition-colors",
                          isEnrolled ? "text-foreground group-hover:text-primary" : "text-muted-foreground"
                        )}>
                          {mod.title}
                        </span>
                        {isEnrolled && (
                          isModCompleted ? (
                            <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-[9px] px-2 py-0.5 font-medium rounded-full">
                              Completed
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="text-[9px] px-2 py-0.5 font-medium text-muted-foreground rounded-full bg-muted/60">
                              Not Started
                            </Badge>
                          )
                        )}
                        {!isEnrolled && (
                          <Badge variant="outline" className="text-[9px] px-2 py-0.5 text-muted-foreground/60 rounded-full border-dashed flex items-center gap-0.5 bg-muted/10">
                            <Lock className="h-2.5 w-2.5" /> Locked
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

                  <div className="flex items-center gap-2 shrink-0">


                    <div className={cn(
                      "h-8 w-8 flex items-center justify-center rounded-full border shrink-0 transition-all duration-300",
                      isEnrolled
                        ? "bg-muted/40 border-border/40 text-muted-foreground group-hover:bg-primary group-hover:text-primary-foreground group-hover:border-primary group-hover:translate-x-1"
                        : "bg-muted/10 border-border/10 text-muted-foreground/30"
                    )}>
                      {isEnrolled ? (
                        <ChevronRight className="h-4 w-4" />
                      ) : (
                        <Lock className="h-3.5 w-3.5" />
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Stats, Certificate & Instructor Sidebar */}
        <div className="space-y-6">

          {/* Enrollment / Completion Card */}
          {!isEnrolled ? (
            <Card className="border border-primary/20 bg-primary/5 dark:bg-primary/5 rounded-xl shadow-xs overflow-hidden">
              <CardHeader className="pb-3 bg-primary/10">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-primary flex items-center gap-1.5">
                  <BookOpen className="h-3.5 w-3.5" />
                  Start Learning
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-3">
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Enroll in this course to gain full access to the learning curriculum, track your progress, and earn a verified completion certificate.
                </p>
                <Button
                  onClick={handleEnroll}
                  disabled={isEnrolling}
                  size="sm"
                  className="w-full text-xs h-9 rounded-full bg-primary hover:bg-primary/95 text-primary-foreground font-semibold shadow-md shadow-primary/10"
                >
                  {isEnrolling ? "Enrolling..." : "Enroll in Course"}
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card className="border border-border/50 bg-card rounded-xl shadow-xs">
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
          )}

          {/* Certificate Card */}
          {isEnrolled && (
            <Card className="border border-border/50 bg-card rounded-xl shadow-xs overflow-hidden">
              <CardHeader className="pb-3">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Award className="h-3.5 w-3.5 text-muted-foreground" />
                  Certificate
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {certificateId ? (
                  <div className="space-y-3">
                    <div className="p-3 border border-emerald-500/20 bg-emerald-500/5 dark:bg-emerald-950/20 rounded-xl flex items-center gap-2.5">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-450 shrink-0" />
                      <span className="text-[11px] leading-relaxed text-emerald-800 dark:text-emerald-300 font-medium">
                        Course completed successfully! Your certificate has been unlocked.
                      </span>
                    </div>

                    <Button
                      asChild
                      size="sm"
                      className="w-full text-xs h-9 rounded-full bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600 text-white shadow-xs font-semibold"
                    >
                      <a href={`/api/courses/certificate/${certificateId}`} target="_blank" rel="noopener noreferrer">
                        Download Certificate
                      </a>
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
          )}

          {/* Instructor Details Card */}
          <Card className="border border-border/50 bg-card rounded-xl shadow-xs">
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
