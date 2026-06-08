"use client"

import * as React from "react"
import { useState, useMemo, useTransition, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
  BookOpen, ArrowLeft, Check, RotateCcw
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { toggleModuleCompletionAction } from "../../../actions"
import { LatexRenderer } from "@/components/ui/latex-renderer"

interface Module {
  id: string
  title: string
  description?: string
  type: "video" | "text" | "test"
  completed: boolean
  duration?: string
  content?: string
}

interface Course {
  id: string
  title: string
  description: string
  category: string
  level: string
  duration: string
  type: string
  badge?: string
  cover_image_path?: string
  modules: Module[]
}

interface Props {
  course: Course
  module: Module
}

// LaTeX Renderer used directly inside CandidateModuleClient

export function CandidateModuleClient({ course, module }: Props) {
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

  const stats = useMemo(() => {
    const total = currentCourse.modules.length
    const completed = currentCourse.modules.filter(m => m.completed).length
    return {
      total,
      completed,
      percentage: total > 0 ? Math.round((completed / total) * 100) : 0,
    }
  }, [currentCourse])

  const toggleModuleCompletion = (moduleId: string, forceComplete?: boolean) => {
    const nextCompleted = forceComplete !== undefined ? forceComplete : !currentModule.completed

    startTransition(async () => {
      try {
        const result = await toggleModuleCompletionAction(currentCourse.id, moduleId, nextCompleted)
        if (result.success) {
          // Update client-side state
          const updatedModules = currentCourse.modules.map(m => {
            if (m.id !== moduleId) return m
            return { ...m, completed: nextCompleted }
          })
          setCurrentCourse({ ...currentCourse, modules: updatedModules })

          if (result.certificateId) {
            toast.success("Congratulations! You have completed the course and unlocked your certificate!", {
              duration: 5000,
            })
          } else {
            toast.success(nextCompleted ? "Module marked as completed." : "Module marked as incomplete.")
          }
          router.refresh()
        }
      } catch (err: any) {
        toast.error(err.message || "Failed to update module completion.")
      }
    })
  }

  const isCompleted = currentModule.completed

  return (
    <div className="flex flex-col gap-6 px-4 py-8 md:px-8 animate-in fade-in duration-300">

      {/* Navigation Breadcrumb / Back button */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.push(`/~/courses/${course.id}`)}
          className="group rounded-full gap-2 border-border/80 text-muted-foreground hover:text-foreground transition-all duration-200"
          disabled={isPending}
        >
          <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
          Back to Course
        </Button>

        <span className="text-xs text-muted-foreground font-medium bg-muted/65 px-3 py-1 rounded-full border border-border/20 truncate max-w-[140px] xs:max-w-[180px] sm:max-w-[280px] md:max-w-[400px]" title={currentCourse.title}>
          {currentCourse.title}
        </span>
      </div>

      {/* Module Title Section */}
      <div className="flex flex-col gap-2 border-b pb-4 border-border/60">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-[10px] uppercase font-semibold text-muted-foreground">
            Module
          </Badge>
          {isCompleted && (
            <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-[9px] px-2 py-0.5 font-medium rounded-full">
              Completed
            </Badge>
          )}
        </div>
        <h1 className="text-2xl font-bold font-cirka tracking-tight text-foreground">
          {currentModule.title}
        </h1>
        {currentModule.description && (
          <p className="text-sm text-muted-foreground leading-relaxed">
            {currentModule.description}
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

        {/* Main Content Reading Panel (Left) */}
        <div className="md:col-span-2 space-y-6">
          <Card className="border border-border/50 bg-card rounded-xl overflow-hidden shadow-xs">
            <CardHeader className="border-b border-border/40 pb-4 bg-muted/10">
              <CardTitle className="text-xs font-semibold text-foreground uppercase tracking-wider flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-muted-foreground" />
                Reading Material
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 pb-6">
              <LatexRenderer content={currentModule.content} />
            </CardContent>
          </Card>

          {/* Single Action Completion Button */}
          <div className="flex items-center pt-2">
            {isCompleted ? (
              <Button
                onClick={() => toggleModuleCompletion(currentModule.id, false)}
                variant="outline"
                className="w-full md:w-auto border-rose-200 bg-rose-50/50 hover:bg-rose-100 text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-350 gap-2 h-10 px-6 rounded-full font-semibold text-xs transition-all duration-200"
                disabled={isPending}
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Completed - Mark as Incomplete
              </Button>
            ) : (
              <Button
                onClick={() => toggleModuleCompletion(currentModule.id, true)}
                className="w-full md:w-auto bg-primary hover:bg-primary/90 text-primary-foreground gap-2 h-10 px-6 rounded-full font-semibold text-xs shadow-md shadow-primary/15 hover:shadow-lg hover:shadow-primary/25 transition-all duration-200"
                disabled={isPending}
              >
                {isPending ? (
                  <div className="h-3.5 w-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Check className="h-3.5 w-3.5" />
                )}
                Mark Module as Completed
              </Button>
            )}
          </div>
        </div>

        {/* Module Sidebar Info (Right) */}
        <div className="space-y-6">
          {/* Progress Card */}
          <Card className="border border-border/50 bg-card rounded-xl shadow-xs">
            <CardHeader className="pb-3">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Course Progress</CardTitle>
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

              <div className="pt-3 border-t border-border/40 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Modules Completed</span>
                  <span className="font-semibold text-foreground">
                    {stats.completed} / {stats.total}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Interactive Modules Checklist Card */}
          <Card className="border border-border/50 bg-card rounded-xl shadow-xs overflow-hidden">
            <CardHeader className="pb-3">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Course Modules
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 border-t border-border/40">
              <div className="divide-y divide-border/30">
                {currentCourse.modules.map((otherMod, idx) => (
                  <div
                    key={otherMod.id}
                    className={cn(
                      "flex items-center justify-between p-3.5 text-xs select-none transition-all duration-200 border-b border-border/30 last:border-b-0",
                      otherMod.id === currentModule.id
                        ? "bg-muted/50 font-semibold border-l-2 border-l-primary pl-3"
                        : "bg-card hover:bg-muted/20"
                    )}
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          toggleModuleCompletion(otherMod.id, !otherMod.completed)
                        }}
                        disabled={isPending}
                        className={cn(
                          "h-4 w-4 rounded-full border flex items-center justify-center shrink-0 transition-all duration-200 cursor-pointer",
                          otherMod.completed
                            ? "bg-emerald-500 border-emerald-500 text-white dark:bg-emerald-600 dark:border-emerald-600"
                            : "border-muted-foreground/35 bg-background text-transparent hover:border-primary"
                        )}
                      >
                        <Check className="h-2.5 w-2.5 stroke-[3.5]" />
                      </button>

                      <div
                        onClick={() => {
                          if (otherMod.id !== currentModule.id) {
                            router.push(`/~/courses/${course.id}/module/${otherMod.id}`)
                          }
                        }}
                        className="flex items-center gap-2 min-w-0 flex-1 cursor-pointer"
                      >
                        <span className="text-[10px] text-muted-foreground shrink-0">{idx + 1}.</span>
                        <span className={cn(
                          "text-foreground truncate transition-all duration-200",
                          otherMod.completed && "text-muted-foreground/70 line-through decoration-muted-foreground/40",
                          otherMod.id === currentModule.id && "text-primary font-semibold"
                        )}>
                          {otherMod.title}
                        </span>
                      </div>
                    </div>

                    <span className="text-muted-foreground text-[9px] font-medium capitalize px-2 py-0.5 rounded-full border border-border/20 bg-muted/50 shrink-0">
                      {otherMod.duration || "Text"}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

      </div>

    </div>
  )
}
