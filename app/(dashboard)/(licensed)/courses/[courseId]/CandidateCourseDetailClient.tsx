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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

import { cn, formatDuration, parseDurationToMinutes } from "@/lib/utils"
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
      id="course-cta-banner"
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
          "size-9 rounded-xl flex items-center justify-center shrink-0 border transition-colors",
          isStart
            ? "bg-emerald-500/10 border-emerald-500/20 group-hover:bg-emerald-500/20"
            : "bg-primary/10 border-primary/20 group-hover:bg-primary/20"
        )}>
          {isStart
            ? <PlayCircle className="size-4 text-emerald-600 dark:text-emerald-400" />
            : <Zap className="size-4 text-primary" />
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
              <Clock className="size-3 shrink-0" />
              {formatDuration(nextModule.duration)} · Module {nextIndex + 1} of {totalModules}
            </p>
          )}
        </div>
      </div>

      <Button
        id="course-cta-action"
        size="sm"
        className={cn(
          "shrink-0 rounded-full text-xs font-semibold",
          isStart
            ? "bg-emerald-600 hover:bg-emerald-700 text-white dark:bg-emerald-500 dark:hover:bg-emerald-600 dark:text-zinc-950 shadow-xs"
            : "shadow-xs"
        )}
        onClick={(e) => {
          e.stopPropagation()
          onNavigate(nextModule.id)
        }}
      >
        <PlayCircle data-icon="inline-start" />
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

  // Calculate time remaining for incomplete modules
  const timeRemaining = useMemo(() => {
    let totalMins = 0
    modules.forEach(mod => {
      if (!mod.completed) {
        totalMins += parseDurationToMinutes(mod.duration)
      }
    })
    return totalMins
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

  const handleModuleClick = (moduleId: string, isUnlocked: boolean = true) => {
    if (!isEnrolled) {
      toast.error("Please enroll in the course first to access its contents.")
      return
    }
    if (!isUnlocked) {
      toast.error("This module is locked. Please complete the preceding modules first.")
      return
    }
    router.push(`/courses/${course.id}/module/${moduleId}`)
  }

  return (
    <div className="flex flex-col gap-6 mx-auto w-full px-4 py-6 md:px-8 md:py-8 animate-in fade-in duration-300">

      {/* Back button */}
      <div>
        <Button
          id="course-back-button"
          variant="outline"
          size="sm"
          onClick={() => router.push("/courses")}
          className="group rounded-full gap-1.5 border-border/80 text-muted-foreground hover:text-foreground transition-all duration-200"
        >
          <ArrowLeft className="transition-transform group-hover:-translate-x-1" data-icon="inline-start" />
          Back to Courses
        </Button>
      </div>

      {/* CTA Banner */}
      {!isEnrolled && (
        <div
          id="course-enroll-cta-banner"
          className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-xl border border-primary/20 bg-primary/5 p-4 md:p-5 shadow-xs"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="size-10 rounded-xl flex items-center justify-center shrink-0 border border-primary/20 bg-primary/10 text-primary">
              <Zap className="size-5 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-primary">
                Unlock Course Content
              </p>
              <p className="text-sm font-semibold text-foreground mt-0.5">
                Enroll in this course to get access to all {modules.length} modules, track your learning progress, and earn a completion certificate.
              </p>
            </div>
          </div>
          <Button
            id="course-enroll-cta-button"
            size="sm"
            onClick={handleEnroll}
            disabled={isEnrolling}
            className="w-full sm:w-auto shrink-0 rounded-full text-xs font-semibold shadow-xs"
          >
            {isEnrolling ? "Enrolling..." : "Enroll in Course"}
          </Button>
        </div>
      )}
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

      {/* Certificate Download Banner */}
      {isEnrolled && stats.percentage === 100 && currentCertId && (
        <div
          id="course-certificate-download-banner"
          className="flex items-center justify-between gap-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="size-9 rounded-xl flex items-center justify-center shrink-0 border border-emerald-500/20 bg-emerald-500/10">
              <Award className="size-4 text-emerald-600 dark:text-emerald-400" />
            </div>

            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
                Course Completed!
              </p>
              <p className="text-sm font-semibold text-foreground line-clamp-1 mt-0.5">
                Congratulations! Your certificate is unlocked and ready for download.
              </p>
            </div>
          </div>

          <Button
            id="course-download-certificate-cta"
            size="sm"
            className="shrink-0 rounded-full text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white dark:bg-emerald-500 dark:hover:bg-emerald-600 dark:text-zinc-950 shadow-xs"
            asChild
          >
            <a href={`/api/courses/certificate/${currentCertId}`}>
              Download Certificate
            </a>
          </Button>
        </div>
      )}

      {/* Certificate Generate Banner */}
      {isEnrolled && stats.percentage === 100 && !currentCertId && (
        <div
          id="course-certificate-generate-banner"
          className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 md:p-5 shadow-xs"
        >
          <div className="flex items-start gap-3 min-w-0">
            <div className="size-10 rounded-xl flex items-center justify-center shrink-0 border border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 mt-0.5">
              <Award className="size-5 text-emerald-600 dark:text-emerald-400" />
            </div>

            <div className="min-w-0 space-y-1">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
                Course Completed!
              </p>
              <p className="text-sm font-semibold text-foreground">
                You have completed all modules! Generate your certificate below.
              </p>
            </div>
          </div>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                id="course-generate-certificate-cta"
                size="sm"
                disabled={isGeneratingCert}
                className="w-full sm:w-auto shrink-0 rounded-full text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white dark:bg-emerald-500 dark:hover:bg-emerald-600 dark:text-zinc-950 shadow-xs"
              >
                {isGeneratingCert ? "Generating..." : "Generate Certificate"}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Generate Certificate</AlertDialogTitle>
                <AlertDialogDescription className="space-y-3 text-left">
                  <span className="block text-foreground">
                    Your certificate will be printed with the name:
                  </span>
                  <span className="block text-lg font-bold text-foreground bg-muted p-2.5 rounded-lg text-center my-2 border border-border/40 select-all">
                    {userProfile?.full_name || "Shabbir Ezzy"}
                  </span>
                  <span className="block text-xs text-muted-foreground leading-relaxed">
                    Please verify that this name is correct and has no typos before generating your certificate.
                  </span>
                  <span className="block text-xs font-semibold text-destructive dark:text-red-400">
                    Note: This name cannot be changed once the certificate has been generated.
                  </span>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleGenerateCertificate}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white dark:bg-emerald-500 dark:hover:bg-emerald-600 dark:text-zinc-950"
                >
                  Confirm & Generate
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      )}

      {/* Course Header Hero Banner */}
      <div className="flex flex-col-reverse lg:flex-row items-stretch justify-between gap-8 border-b pb-8 border-border/60">
        <div className="flex-1 flex flex-col justify-center gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className="uppercase tracking-wider text-[10px] font-semibold">
              {course.level}
            </Badge>
          </div>

          <div className="space-y-2">
            <h1 className="text-3xl md:text-4xl font-extrabold font-cirka tracking-tight text-foreground">
              {course.title}
            </h1>
            <p className="text-sm md:text-base text-muted-foreground leading-relaxed">
              {course.description}
            </p>
          </div>

          {/* Instructor Info */}
          <div className="flex items-center gap-2 pt-1">
            {course.instructor.avatar ? (
              <img
                src={course.instructor.avatar}
                alt=""
                className="size-6 rounded-full object-cover border border-border shadow-xs"
              />
            ) : (
              <div className="size-6 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center font-bold text-primary text-[10px] shrink-0">
                {course.instructor.name.slice(0, 2).toUpperCase()}
              </div>
            )}
            <span className="text-xs text-foreground font-semibold">
              {course.instructor.name}
            </span>
          </div>

          {/* Metadata & Progress */}
          <div className="flex flex-wrap items-center gap-x-4 sm:gap-x-6 gap-y-3 pt-2 text-sm text-muted-foreground">
            <div className="inline-flex items-center gap-2">
              <Clock className="size-4 text-muted-foreground/60" />
              <span>{formatDuration(course.duration)}</span>
            </div>
            <div className="inline-flex items-center gap-2">
              <BookOpen className="size-4 text-muted-foreground/60" />
              <span>{modules.length} {modules.length === 1 ? "module" : "modules"}</span>
            </div>

            {isEnrolled && (
              <>
                <div className="inline-flex items-center gap-2">
                  <CheckCircle2 className="size-4 text-muted-foreground/60" />
                  <span>{stats.percentage}% Complete</span>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="hidden lg:block w-full lg:w-80 shrink-0 self-center lg:self-start">
          <div className="aspect-video w-full overflow-hidden rounded-2xl border border-border/40 dark:border-zinc-800/80 relative shadow-sm hover:shadow transition-shadow duration-300">
            <CourseCover coverImagePath={course.cover_image_path} title={course.title} />
          </div>
        </div>
      </div>

      {/* Syllabus Layout (Centered & focused) */}
      <div className="w-full space-y-6 pt-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-border/40">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Course Syllabus
          </h2>
          {isEnrolled && (
            <span className="text-[11px] text-muted-foreground">
              <span className="font-semibold text-foreground">{stats.completed}</span>/{stats.total} complete
            </span>
          )}
        </div>

        {/* Syllabus Modules List */}
        <div className="flex flex-col gap-3">
          {modules.map((mod, index) => {
            const isModCompleted = mod.completed
            const isUnlocked = isEnrolled && (index === 0 || modules.slice(0, index).every(m => m.completed))

            return (
              <div
                key={mod.id}
                id={`course-module-item-${mod.id}`}
                onClick={() => handleModuleClick(mod.id, isUnlocked)}
                className={cn(
                  "group flex items-center justify-between gap-4 p-4 rounded-xl border select-none transition-all duration-200",
                  isEnrolled
                    ? isModCompleted
                      ? "border-emerald-500/15 dark:border-emerald-500/10 bg-emerald-500/2 dark:bg-emerald-500/1 hover:bg-emerald-500/4 cursor-pointer border-l-4 border-l-emerald-500"
                      : isUnlocked
                        ? "border-primary/25 bg-primary/2 dark:bg-primary/1 hover:bg-primary/4 cursor-pointer border-l-4 border-l-primary"
                        : "border-border/40 bg-muted/10 opacity-60 cursor-not-allowed border-l-4 border-l-transparent"
                    : "border-border/40 bg-muted/10 opacity-70 cursor-not-allowed border-l-4 border-l-transparent"
                )}
              >
                {/* Module number / status */}
                <div className={cn(
                  "flex size-8 items-center justify-center rounded-full text-xs font-bold shrink-0 transition-all duration-200 border",
                  isUnlocked
                    ? isModCompleted
                      ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                      : "bg-primary border-primary text-primary-foreground scale-105"
                    : "bg-muted/40 border-border/20 text-muted-foreground/40"
                )}>
                  {isModCompleted && isEnrolled ? (
                    <CheckCircle2 className="size-4" />
                  ) : (
                    <span className="tabular-nums">{index + 1}</span>
                  )}
                </div>

                {/* Module info */}
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={cn(
                      "font-semibold text-sm leading-tight transition-colors",
                      isEnrolled
                        ? isModCompleted
                          ? "text-muted-foreground line-through decoration-muted-foreground/30"
                          : isUnlocked
                            ? "text-foreground font-bold"
                            : "text-foreground group-hover:text-primary"
                        : "text-muted-foreground"
                    )}>
                      {mod.title}
                    </span>
                    {!isUnlocked && (
                      <Badge variant="outline" className="text-[9px] px-1.5 py-0 text-muted-foreground/60 rounded-full border-dashed flex items-center gap-0.5">
                        <Lock className="size-2.5" /> Locked
                      </Badge>
                    )}
                  </div>

                  {mod.description && (
                    <p className={cn(
                      "text-xs leading-relaxed line-clamp-1",
                      isModCompleted ? "text-muted-foreground/60" : "text-muted-foreground"
                    )}>
                      {mod.description}
                    </p>
                  )}

                  {/* Tags */}
                  <div className="flex flex-wrap gap-2 pt-0.5">
                    <Badge
                      variant="secondary"
                      className={cn(
                        "text-[9px] font-normal px-2 py-0 rounded-full",
                        mod.type === "video" && "bg-blue-500/5 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400 border border-blue-500/10",
                        mod.type === "text" && "bg-purple-500/5 text-purple-600 dark:bg-purple-500/10 dark:text-purple-400 border border-purple-500/10",
                        mod.type === "test" && "bg-amber-500/5 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400 border border-amber-500/10"
                      )}
                    >
                      <FileText className="size-2.5 mr-1 inline-block" />
                      <span className="capitalize">{mod.type}</span>
                    </Badge>
                    {mod.duration && (
                      <Badge variant="secondary" className="text-[9px] font-normal px-2 py-0 rounded-full bg-muted/40 text-muted-foreground border border-border/20">
                        <Clock className="size-2.5 mr-1 inline-block" />
                        {formatDuration(mod.duration)}
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Arrow/Access Indicator */}
                <div className={cn(
                  "size-8 flex items-center justify-center rounded-full border shrink-0 transition-all duration-200",
                  isUnlocked
                    ? "bg-muted/40 border-border/40 text-muted-foreground group-hover:bg-primary group-hover:text-primary-foreground group-hover:border-primary group-hover:translate-x-0.5"
                    : "bg-muted/10 border-border/10 text-muted-foreground/30"
                )}>
                  {isUnlocked ? (
                    <ChevronRight className="size-4" />
                  ) : (
                    <Lock className="size-3.5" />
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
