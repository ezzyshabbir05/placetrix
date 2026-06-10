"use client"

import * as React from "react"
import { useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import {
  BookOpen, Clock, ArrowLeft, CheckCircle2, Lock, Award, ChevronRight,
  FileText, PlayCircle, Zap
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { cn, formatDuration } from "@/lib/utils"
import { toast } from "sonner"
import { enrollInCourseAction, generateCertificateAction } from "../actions"
import { CourseCover } from "../components/CourseCover"

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
  cover_image_path?: string
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

// ─── CTA Banner (unified Start/Continue component) ───────────────────────────
interface CTABannerProps {
  mode: "start" | "continue"
  nextModule: Module
  courseId: string
  totalModules: number
  nextIndex: number
  onNavigate: (moduleId: string) => void
}

function CTABanner({ mode, nextModule, courseId, totalModules, nextIndex, onNavigate }: CTABannerProps) {
  const isStart = mode === "start"

  return (
    <div
      className={cn(
        "flex items-center justify-between gap-4 rounded-xl border p-4 cursor-pointer group transition-colors",
        isStart
          ? "border-emerald-500/20 bg-emerald-500/5 hover:bg-emerald-500/10"
          : "border-primary/20 bg-primary/5 hover:bg-primary/10"
      )}
      onClick={() => onNavigate(nextModule.id)}
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className={cn(
          "h-9 w-9 rounded-xl flex items-center justify-center shrink-0 border transition-colors",
          isStart
            ? "bg-emerald-500/10 border-emerald-500/20 group-hover:bg-emerald-500/20"
            : "bg-primary/10 border-primary/20 group-hover:bg-primary/20"
        )}>
          {isStart
            ? <PlayCircle className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            : <Zap className="h-4 w-4 text-primary" />
          }
        </div>

        <div className="min-w-0">
          <p className={cn(
            "text-[10px] font-semibold uppercase tracking-widest",
            isStart ? "text-emerald-600 dark:text-emerald-400" : "text-primary"
          )}>
            {isStart ? "Ready to Start?" : "Continue Learning"}
          </p>
          <p className="text-sm font-semibold text-foreground line-clamp-1 group-hover:text-primary transition-colors mt-0.5">
            {nextModule.title}
          </p>
          {nextModule.duration && (
            <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
              <Clock className="h-3 w-3 shrink-0" />
              {formatDuration(nextModule.duration)} · Module {nextIndex + 1} of {totalModules}
            </p>
          )}
        </div>
      </div>

      <Button
        size="sm"
        className={cn(
          "shrink-0 rounded-full text-xs font-semibold gap-1.5",
          isStart
            ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
            : "shadow-xs"
        )}
        onClick={(e) => {
          e.stopPropagation()
          onNavigate(nextModule.id)
        }}
      >
        <PlayCircle className="h-3.5 w-3.5" />
        {isStart ? "Start Course" : "Resume"}
      </Button>
    </div>
  )
}

export function CandidateCourseDetailClient({ course, isEnrolled, certificateId, userProfile }: Props) {
  const router = useRouter()
  const [isEnrolling, setIsEnrolling] = useState(false)
  const [currentCertId, setCurrentCertId] = useState<string | null>(certificateId)
  const [isGeneratingCert, setIsGeneratingCert] = useState(false)

  const handleGenerateCertificate = async () => {
    setIsGeneratingCert(true)
    try {
      const result = await generateCertificateAction(course.id)
      if (result.success && result.certificateId) {
        setCurrentCertId(result.certificateId)
        toast.success("Certificate generated successfully!")
        router.refresh()
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to generate certificate.")
    } finally {
      setIsGeneratingCert(false)
    }
  }

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

  const nextModuleIndex = nextModule ? modules.findIndex(m => m.id === nextModule.id) : 0

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
    router.push(`/courses/${course.id}/module/${moduleId}`)
  }

  return (
    <div className="flex flex-col gap-6 px-4 py-6 md:px-8 md:py-8 animate-in fade-in duration-300">

      {/* Back button */}
      <div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.push("/courses")}
          className="group rounded-full gap-2 border-border/80 text-muted-foreground hover:text-foreground transition-all duration-200"
        >
          <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
          Back to Courses
        </Button>
      </div>

      {/* CTA Banner */}
      {isEnrolled && nextModule && stats.percentage === 0 && (
        <CTABanner
          mode="start"
          nextModule={nextModule}
          courseId={course.id}
          totalModules={modules.length}
          nextIndex={nextModuleIndex}
          onNavigate={handleModuleClick}
        />
      )}
      {isEnrolled && nextModule && stats.percentage > 0 && stats.percentage < 100 && (
        <CTABanner
          mode="continue"
          nextModule={nextModule}
          courseId={course.id}
          totalModules={modules.length}
          nextIndex={nextModuleIndex}
          onNavigate={handleModuleClick}
        />
      )}

      {/* Course Header */}
      <div className="flex flex-col-reverse md:flex-row items-start justify-between gap-6 border-b pb-5 border-border/60">
        <div className="flex-1 flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="text-[10px] text-muted-foreground">
              {course.level}
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
              <Clock className="h-3.5 w-3.5" />
              {formatDuration(course.duration)}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <BookOpen className="h-3.5 w-3.5" />
              {modules.length} {modules.length === 1 ? "module" : "modules"}
            </span>
            <span className="inline-flex items-center gap-1.5 font-medium text-foreground/80">
              {course.type}
            </span>
          </div>
        </div>

        <div className="w-32 md:w-40 shrink-0 mx-auto md:mr-0">
          <div className="aspect-video w-full overflow-hidden rounded-xl border border-border/50 dark:border-zinc-800/80 relative shadow-xs">
            <CourseCover coverImagePath={course.cover_image_path} title={course.title} />
          </div>
        </div>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Syllabus (Left / Main) */}
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

          <div className="space-y-2.5">
            {modules.map((mod, index) => {
              const isModCompleted = mod.completed

              return (
                <div
                  key={mod.id}
                  onClick={() => handleModuleClick(mod.id)}
                  className={cn(
                    "group flex items-center justify-between gap-4 p-4 rounded-xl border border-border/50 bg-card select-none transition-all duration-200",
                    isEnrolled
                      ? "hover:border-primary/30 hover:shadow-md hover:bg-muted/10 cursor-pointer"
                      : "cursor-not-allowed opacity-75"
                  )}
                >
                  {/* Module number */}
                  <div className={cn(
                    "flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold shrink-0 transition-colors duration-200",
                    isEnrolled
                      ? isModCompleted
                        ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                        : "bg-muted text-muted-foreground group-hover:bg-primary group-hover:text-primary-foreground"
                      : "bg-muted/40 text-muted-foreground/40"
                  )}>
                    {isModCompleted && isEnrolled
                      ? <CheckCircle2 className="h-3.5 w-3.5" />
                      : index + 1
                    }
                  </div>

                  {/* Module info */}
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={cn(
                        "font-medium text-sm leading-tight transition-colors",
                        isEnrolled
                          ? isModCompleted
                            ? "text-muted-foreground line-through decoration-muted-foreground/40"
                            : "text-foreground group-hover:text-primary"
                          : "text-muted-foreground"
                      )}>
                        {mod.title}
                      </span>
                      {!isEnrolled && (
                        <Badge variant="outline" className="text-[9px] px-1.5 py-0 text-muted-foreground/60 rounded-full border-dashed flex items-center gap-0.5">
                          <Lock className="h-2.5 w-2.5" /> Locked
                        </Badge>
                      )}
                    </div>

                    {mod.description && (
                      <p className="text-xs text-muted-foreground line-clamp-1 leading-relaxed">
                        {mod.description}
                      </p>
                    )}

                    {/* Tags */}
                    <div className="flex flex-wrap gap-x-2 gap-y-1 pt-0.5">
                      <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground bg-muted/40 px-2 py-0.5 rounded-full border border-border/20">
                        <FileText className="h-3 w-3 text-primary shrink-0" />
                        <span className="capitalize">{mod.type}</span>
                      </span>
                      {mod.duration && (
                        <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground bg-muted/40 px-2 py-0.5 rounded-full border border-border/20">
                          <Clock className="h-3 w-3 shrink-0" />
                          {formatDuration(mod.duration)}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Arrow */}
                  <div className={cn(
                    "h-8 w-8 flex items-center justify-center rounded-full border shrink-0 transition-all duration-200",
                    isEnrolled
                      ? "bg-muted/40 border-border/40 text-muted-foreground group-hover:bg-primary group-hover:text-primary-foreground group-hover:border-primary group-hover:translate-x-0.5"
                      : "bg-muted/10 border-border/10 text-muted-foreground/30"
                  )}>
                    {isEnrolled ? (
                      <ChevronRight className="h-4 w-4" />
                    ) : (
                      <Lock className="h-3.5 w-3.5" />
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Sidebar (Right) */}
        <div className="space-y-4">

          {/* Enrollment / Progress Card */}
          {!isEnrolled ? (
            <Card className="border border-border/50 bg-card rounded-xl shadow-xs">
              <CardHeader className="">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <BookOpen className="h-3.5 w-3.5" />
                  Start Learning
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Enroll to gain full access to the curriculum, track your progress, and earn a verified completion certificate.
                </p>
                <Button
                  onClick={handleEnroll}
                  disabled={isEnrolling}
                  size="sm"
                  className="w-full text-xs h-9 rounded-full font-semibold shadow-xs"
                >
                  {isEnrolling ? "Enrolling..." : "Enroll in Course"}
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card className="border border-border/50 bg-card rounded-xl shadow-xs">
              <CardHeader className="">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Course Progress
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-muted-foreground">Completed</span>
                  <span className={cn(
                    "font-semibold tabular-nums",
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
                <div className="pt-3 flex flex-col gap-2 border-t border-border/40 text-xs divide-y divide-border/30">
                  {[
                    { label: "Level", value: course.level },
                    { label: "Duration", value: formatDuration(course.duration) },
                    { label: "Modules", value: `${stats.completed} / ${stats.total}` },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex justify-between pt-2 first:pt-0">
                      <span className="text-muted-foreground">{label}</span>
                      <span className="font-medium text-foreground">{value}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Certificate Card */}
          {isEnrolled && (
            <Card className="border border-border/50 bg-card rounded-xl shadow-xs">
              <CardHeader className="">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Award className="h-3.5 w-3.5" />
                  Certificate
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {currentCertId ? (
                  <div className="space-y-3">
                    <div className="p-3 border border-emerald-500/20 bg-emerald-500/5 dark:bg-emerald-950/20 rounded-xl flex items-start gap-2.5">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                      <span className="text-[11px] leading-relaxed text-emerald-800 dark:text-emerald-300 font-medium">
                        Course completed! Your certificate has been unlocked.
                      </span>
                    </div>
                    <Button
                      asChild
                      size="sm"
                      className="w-full text-xs h-9 rounded-full bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600 text-white font-semibold"
                    >
                      <a href={`/api/courses/certificate/${currentCertId}`} target="_blank" rel="noopener noreferrer">
                        Download Certificate
                      </a>
                    </Button>
                  </div>
                ) : stats.percentage === 100 ? (
                  <div className="space-y-3">
                    <div className="p-3 border border-indigo-500/20 bg-indigo-500/5 dark:bg-indigo-950/20 rounded-xl flex items-start gap-2.5">
                      <CheckCircle2 className="h-4 w-4 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
                      <span className="text-[11px] leading-relaxed text-indigo-800 dark:text-indigo-300 font-medium">
                        Congratulations! You have completed all modules. Generate your certificate below.
                      </span>
                    </div>
                    <Button
                      onClick={handleGenerateCertificate}
                      disabled={isGeneratingCert}
                      size="sm"
                      className="w-full text-xs h-9 rounded-full bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 text-white font-semibold"
                    >
                      {isGeneratingCert ? "Generating..." : "Generate Certificate"}
                    </Button>
                  </div>
                ) : (
                  <div className="p-3.5 bg-muted/40 border border-border/40 rounded-xl flex items-start gap-2.5">
                    <Lock className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
                    <span className="text-[11px] text-muted-foreground leading-relaxed">
                      Complete all curriculum modules to unlock your certificate.
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Instructor Card */}
          <Card className="border border-border/50 bg-card rounded-xl shadow-xs">
            <CardHeader className="">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Instructor
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                {course.instructor.avatar ? (
                  <img
                    src={course.instructor.avatar}
                    alt=""
                    className="h-9 w-9 rounded-full object-cover shrink-0 border border-primary/20 shadow-xs"
                  />
                ) : (
                  <div className="h-9 w-9 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center font-bold text-primary text-xs shrink-0 shadow-xs">
                    {course.instructor.name.slice(0, 2).toUpperCase()}
                  </div>
                )}
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
