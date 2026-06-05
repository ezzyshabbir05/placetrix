"use client"

import * as React from "react"
import { useState, useMemo, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
  BookOpen,
  ArrowLeft,
  Check,
  RotateCcw,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"
import { Course, Module, INITIAL_COURSES } from "../../../types"

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getModuleReadingContent(moduleId: string, moduleTitle: string) {
  const headingClass = "text-xs font-bold text-foreground mt-7 mb-3 uppercase tracking-wider border-l-2 border-primary pl-2.5"
  const codeClass = "px-1.5 py-0.5 rounded bg-muted font-mono text-[11px] text-foreground"
  
  switch (moduleId) {
    case "m1":
      return (
        <div className="space-y-4 text-sm text-muted-foreground leading-relaxed">
          <p>
            Welcome to the <strong>Complexity Analysis & Arrays</strong> module! In computer science, complexity analysis is a way to describe the efficiency of an algorithm in terms of the size of the input. We use <strong>Big-O notation</strong> to establish upper bounds on resource consumption.
          </p>
          <h3 className={headingClass}>1. Big-O Notation</h3>
          <p>
            Big-O defines the worst-case scenario. For example, accessing an array element by index is an <code className={codeClass}>O(1)</code> operation, while searching for an element in an unsorted array of size <code className={codeClass}>N</code> takes <code className={codeClass}>O(N)</code> time in the worst case.
          </p>
          <h3 className={headingClass}>2. Space vs Time Complexity</h3>
          <p>
            Often, we can speed up execution time by utilizing extra memory (e.g., using a Hash Map to store previously computed values in <code className={codeClass}>O(1)</code> lookup time instead of re-searching, bringing a nested loop from <code className={codeClass}>O(N²)</code> to <code className={codeClass}>O(N)</code>).
          </p>
          <h3 className={headingClass}>3. Two-Pointer Technique</h3>
          <p>
            The two-pointer technique is highly efficient for searching pairs in sorted arrays. By having pointers at both ends of the array and moving them inward based on condition comparisons, we can solve problems in linear time <code className={codeClass}>O(N)</code> instead of quadratic <code className={codeClass}>O(N²)</code>.
          </p>
        </div>
      )
    case "m2":
      return (
        <div className="space-y-4 text-sm text-muted-foreground leading-relaxed">
          <p>
            Welcome to <strong>Linked Lists, Stacks & Queues</strong>! Linear data structures store elements sequentially, but their physical memory allocations and access patterns differ.
          </p>
          <h3 className={headingClass}>1. Linked Lists</h3>
          <p>
            Unlike arrays, linked lists do not store elements in contiguous memory. Instead, each node contains a value and a pointer to the next node. While accessing a node is <code className={codeClass}>O(N)</code>, insertions and deletions are <code className={codeClass}>O(1)</code> if the node reference is known.
          </p>
          <h3 className={headingClass}>2. Stacks (LIFO)</h3>
          <p>
            A stack follows the Last-In-First-Out principle. Key operations are <code className={codeClass}>push()</code> and <code className={codeClass}>pop()</code>, both running in <code className={codeClass}>O(1)</code> time. Useful in function call stacks, back-tracking, and undo operations.
          </p>
          <h3 className={headingClass}>3. Queues (FIFO)</h3>
          <p>
            A queue follows First-In-First-Out. Elements are added at the rear (enqueue) and removed from the front (dequeue). Key for task scheduling, messaging queues, and breadth-first searches.
          </p>
        </div>
      )
    case "n-m1":
      return (
        <div className="space-y-4 text-sm text-muted-foreground leading-relaxed">
          <p>
            Welcome to <strong>Next.js App Router Foundations</strong>! Next.js introduced the App Router architecture built on React Server Components (RSC) to optimize web app performance out of the box.
          </p>
          <h3 className={headingClass}>1. React Server Components</h3>
          <p>
            RSCs render on the server by default. They allow direct access to databases, reduce client-side bundle sizes by keeping dependencies server-only, and provide faster initial page loads.
          </p>
          <h3 className={headingClass}>2. File-Based Routing</h3>
          <p>
            Routes are created by placing a <code className={codeClass}>page.tsx</code> file inside folders under the <code className={codeClass}>app/</code> directory. Nested folders create nested routes, and bracket folders like <code className={codeClass}>[courseId]/</code> create dynamic slug parameters.
          </p>
          <h3 className={headingClass}>3. Layouts & Data Fetching</h3>
          <p>
            Layouts preserve state across route changes and avoid re-renders. Next.js supports async components, allowing you to fetch data using standard <code className={codeClass}>await fetch()</code> inside server pages.
          </p>
        </div>
      )
    default:
      return (
        <div className="space-y-4 text-sm text-muted-foreground leading-relaxed">
          <p>
            Welcome to the <strong>{moduleTitle}</strong> learning curriculum. This module contains essential core reading materials designed to establish your technical fundamentals in this topic.
          </p>
          <h3 className={headingClass}>Core Syllabus Material</h3>
          <p>
            Read through the course guidelines, explore the listed lessons in the sidebar, and make sure to review related documentation or lecture slides to reinforce your learning.
          </p>
          <p>
            Once you have finished reading the core material, mark this module as completed using the button below or toggle its status in the checklist.
          </p>
        </div>
      )
  }
}

export function CandidateModuleClient({
  course,
  module,
}: {
  course: Course
  module: Module
}) {
  const router = useRouter()
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

  // Resolve current active course and module from state
  const currentCourse = useMemo(() => {
    return courses.find(c => c.id === course.id) || course
  }, [courses, course])

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
    const updated = courses.map(c => {
      if (c.id !== course.id) return c
      return {
        ...c,
        modules: c.modules.map(m => {
          if (m.id !== moduleId) return m
          const nextCompleted = forceComplete !== undefined ? forceComplete : !m.completed
          return { ...m, completed: nextCompleted }
        })
      }
    })
    setCourses(updated)
    if (typeof window !== "undefined") {
      localStorage.setItem("placetrix_courses_progress", JSON.stringify(updated))
    }
  }

  const isCompleted = currentModule.completed

  return (
    <div className="flex flex-col gap-6 px-4 py-8 md:px-8 animate-in fade-in-50 duration-300">
      
      {/* Navigation Breadcrumb / Back button */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.push(`/~/courses/${course.id}`)}
          className="group rounded-full gap-2 border-border/80 text-muted-foreground hover:text-foreground transition-all duration-200"
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
          <Card className="border-border/50 bg-card rounded-xl overflow-hidden shadow-xs">
            <CardHeader className="border-b border-border/40 pb-4 bg-muted/10">
              <CardTitle className="text-sm font-semibold text-foreground uppercase tracking-wider flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-muted-foreground" />
                Reading Material
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 pb-6">
              {getModuleReadingContent(currentModule.id, currentModule.title)}
            </CardContent>
          </Card>

          {/* Single Action Completion Button */}
          <div className="flex items-center pt-2">
            {isCompleted ? (
              <Button
                onClick={() => toggleModuleCompletion(currentModule.id, false)}
                variant="outline"
                className="w-full md:w-auto border-rose-200 bg-rose-50/50 hover:bg-rose-150 text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-350 gap-2 h-10 px-6 rounded-full font-semibold text-xs transition-all duration-200"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Completed - Mark as Incomplete
              </Button>
            ) : (
              <Button
                onClick={() => toggleModuleCompletion(currentModule.id, true)}
                className="w-full md:w-auto bg-primary hover:bg-primary/90 text-primary-foreground gap-2 h-10 px-6 rounded-full font-semibold text-xs shadow-md shadow-primary/15 hover:shadow-lg hover:shadow-primary/25 transition-all duration-200"
              >
                <Check className="h-3.5 w-3.5" />
                Mark Module as Completed
              </Button>
            )}
          </div>
        </div>

        {/* Module Sidebar Info (Right) */}
        <div className="space-y-6">
          {/* Progress Card */}
          <Card className="border-border/50 bg-card rounded-xl shadow-xs">
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
          <Card className="border-border/50 bg-card rounded-xl shadow-xs overflow-hidden">
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
                      <div
                        onClick={(e) => {
                          e.stopPropagation()
                          toggleModuleCompletion(otherMod.id)
                        }}
                        className={cn(
                          "h-4 w-4 rounded-full border flex items-center justify-center shrink-0 transition-all duration-200 cursor-pointer",
                          otherMod.completed
                            ? "bg-emerald-500 border-emerald-500 text-white dark:bg-emerald-600 dark:border-emerald-600"
                            : "border-muted-foreground/35 bg-background text-transparent hover:border-primary"
                        )}
                      >
                        <Check className="h-2.5 w-2.5 stroke-[3.5]" />
                      </div>
                      
                      <div 
                        onClick={() => router.push(`/~/courses/${course.id}/module/${otherMod.id}`)}
                        className="flex items-center gap-2 min-w-0 flex-1 cursor-pointer"
                      >
                        <span className="text-[11px] text-muted-foreground shrink-0">{idx + 1}.</span>
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
