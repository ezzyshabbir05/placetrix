"use client"

import * as React from "react"
import { useState, useMemo, useTransition, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
  ArrowLeft, Check, Clock, ArrowRight, Lock
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn, formatDuration, parseDurationToMinutes } from "@/lib/utils"
import { toast } from "sonner"
import { toggleModuleCompletionAction } from "../../../actions"
import { LatexRenderer } from "@/components/others/latex-renderer"

interface Module {
  id: string;
  title: string;
  description?: string;
  type: "video" | "text" | "test";
  completed: boolean;
  duration?: string;
  min_duration?: number | null;
  content?: string;
}

interface Course {
  id: string;
  title: string;
  description: string;
  level: string;
  duration: string;
  type: string;
  cover_image_path?: string;
  modules: Module[];
}

interface Props {
  course: Course;
  module: Module;
  isAdmin?: boolean;
}

export function CandidateModuleClient({ course, module, isAdmin = false }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [currentCourse, setCurrentCourse] = useState<Course>(course)

  // Sync state if props change (e.g., page navigation)
  useEffect(() => {
    setCurrentCourse(course)
  }, [course])

  const currentModule = useMemo(() => {
    return currentCourse.modules.find(m => m.id === module.id) || module
  }, [currentCourse, module])

  const isCompleted = currentModule.completed

  // ─── Timer & Mounted State ──────────────────────────────────────────────────
  const [mounted, setMounted] = useState(false)
  const [timeLeft, setTimeLeft] = useState<number>(0)

  const durationSeconds = useMemo(() => {
    return (currentModule.min_duration ?? 0) * 60
  }, [currentModule.min_duration])

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    // If already completed, admin, or no duration, don't run timer
    if (isCompleted || isAdmin || durationSeconds <= 0) {
      setTimeLeft(0)
      return
    }

    const storageKey = `module-timer-${course.id}-${currentModule.id}`
    const storedExpiration = localStorage.getItem(storageKey)
    let expirationTime = 0

    if (storedExpiration) {
      expirationTime = parseInt(storedExpiration, 10)
    }

    const now = Date.now()
    // If no stored expiration or it's invalid (in the past or too far in the future), reset it
    if (!expirationTime || expirationTime <= now || (expirationTime - now) > durationSeconds * 1000) {
      expirationTime = now + durationSeconds * 1000
      localStorage.setItem(storageKey, String(expirationTime))
    }

    const calculateTimeLeft = () => {
      const remaining = Math.max(0, Math.ceil((expirationTime - Date.now()) / 1000))
      setTimeLeft(remaining)
      if (remaining <= 0) {
        localStorage.removeItem(storageKey)
      }
      return remaining
    }

    // Set initial remaining time
    const initialRemaining = calculateTimeLeft()

    if (initialRemaining <= 0) {
      return
    }

    const timer = setInterval(() => {
      const remaining = calculateTimeLeft()
      if (remaining <= 0) {
        clearInterval(timer)
      }
    }, 1000)

    return () => {
      clearInterval(timer)
    }
  }, [currentModule.id, isCompleted, isAdmin, durationSeconds, course.id])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`
  }

  const isLocked = mounted && !isAdmin && !isCompleted && durationSeconds > 0 && timeLeft > 0

  // Current module index for display
  const currentIndex = currentCourse.modules.findIndex(m => m.id === currentModule.id)

  const nextModule = useMemo(() => {
    return currentCourse.modules[currentIndex + 1] ?? null
  }, [currentCourse, currentIndex])

  const handleNextClick = async () => {
    if (!currentModule.completed) {
      startTransition(async () => {
        try {
          const result = await toggleModuleCompletionAction(currentCourse.id, currentModule.id, true)
          if (result.success) {
            // Update client-side state
            const updatedModules = currentCourse.modules.map(m => {
              if (m.id !== currentModule.id) return m
              return { ...m, completed: true }
            })
            setCurrentCourse({ ...currentCourse, modules: updatedModules })

            const isNowFinished = updatedModules.length > 0 && updatedModules.every(m => m.completed)

            if (isNowFinished) {
              toast.success("Congratulations! You have completed all modules. Go to the course page to generate your certificate!", {
                duration: 6000,
              })
            } else {
              toast.success("Module marked as completed.")
            }

            // Navigate to next page or course page
            if (nextModule) {
              router.push(`/courses/${currentCourse.id}/module/${nextModule.id}`)
            } else {
              router.push(`/courses/${currentCourse.id}`)
            }
            router.refresh()
          }
        } catch (err: any) {
          toast.error(err.message || "Failed to update module completion.")
        }
      })
    } else {
      // Just navigate if already completed
      if (nextModule) {
        router.push(`/courses/${currentCourse.id}/module/${nextModule.id}`)
      } else {
        router.push(`/courses/${currentCourse.id}`)
      }
    }
  }

  return (
    <div className="flex flex-col gap-6 mx-auto w-full px-4 py-6 md:py-8 animate-in fade-in duration-300">

      {/* Navigation row */}
      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.push(`/courses/${course.id}`)}
          className="group rounded-full gap-2 border-border/80 text-muted-foreground hover:text-foreground transition-all duration-200 shrink-0"
          disabled={isPending}
        >
          <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
          Back to Course
        </Button>
      </div>

      {/* Module Title Section */}
      <div className="flex flex-col gap-2 border-b pb-5 border-border/60">
        <div className="flex items-center gap-2 flex-wrap text-xs text-muted-foreground">
          <span
            onClick={() => router.push(`/courses/${currentCourse.id}`)}
            className="hover:text-foreground cursor-pointer font-medium transition-colors"
          >
            {currentCourse.title}
          </span>
        </div>
        <h1 className="text-2xl font-bold font-cirka tracking-tight text-foreground">
          {currentModule.title}
        </h1>
        {currentModule.description && (
          <p className="text-sm text-muted-foreground leading-relaxed">
            {currentModule.description}
          </p>
        )}
        {currentModule.duration && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            {formatDuration(currentModule.duration)}
          </div>
        )}
      </div>

      {/* Reading Material Container */}
      <div className="space-y-4 ">
        <LatexRenderer content={currentModule.content} />


        {/* Next Module / Finish Course Button */}
        <div className="flex items-center">
          <Button
            onClick={handleNextClick}
            className="group w-full md:w-auto gap-2 h-10 px-6 rounded-full font-semibold text-xs shadow-md shadow-primary/15 hover:shadow-lg hover:shadow-primary/25 transition-all duration-200"
            disabled={isPending || isLocked}
          >
            {isPending ? (
              <div className="h-3.5 w-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
            ) : isLocked ? (
              <>
                <Lock className="h-3.5 w-3.5" />
                <span>{nextModule ? "Next Module" : "Finish Course"} ({formatTime(timeLeft)})</span>
              </>
            ) : nextModule ? (
              <>
                <span>Next Module</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </>
            ) : (
              <>
                <Check className="h-3.5 w-3.5" />
                <span>Finish Course</span>
              </>
            )}
          </Button>
        </div>
      </div>

    </div>
  )
}
