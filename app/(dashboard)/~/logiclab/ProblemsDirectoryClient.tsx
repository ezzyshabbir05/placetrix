"use client"

import React, { useState, useEffect, useCallback, useTransition, useRef } from "react"
import Link from "next/link"
import { useRouter, usePathname } from "next/navigation"
import {
  Terminal,
  Plus,
  Search,
  CircleCheck,
  CircleDot,
  ChevronRight,
  Pencil,
  Trash2,
  AlertTriangle,
  X,
  Flame,
  BookOpen,
  ChevronLeft,
  ChevronsLeft,
  ChevronsRight,
  Loader2,
  Filter,
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"

interface Problem {
  id: string
  title: string
  difficulty: "Easy" | "Medium" | "Hard"
  tags: string[]
  created_at: string
  solved_status: string | null
  acceptance_rate: number | null
  total_submissions: number
}

interface CalendarCell {
  date: string
  count: number
  status: "none" | "attempted" | "solved"
  dayOfWeek: number
}

interface ProblemsDirectoryProps {
  problems: Problem[]
  isAdmin: boolean
  streakStats: {
    currentStreak: number
    maxStreak: number
  }
  activityCalendar: CalendarCell[]
  initialPage: number
  initialPageSize: number
  initialSearch: string
  initialTab: string
  initialDifficulty: string
  initialTag: string
  totalCount: number
  tabCounts: { all: number; solved: number; attempted: number; unsolved: number }
  allTags: string[]
  tagCounts: Record<string, number>
  globalStats: {
    total: number
    solved: number
    easy: { total: number; solved: number }
    medium: { total: number; solved: number }
    hard: { total: number; solved: number }
  }
}

const DIFFICULTY_COLORS: Record<string, string> = {
  Easy: "bg-emerald-100/80 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-500/15 dark:text-emerald-400 border-transparent",
  Medium: "bg-amber-100/80 text-amber-700 hover:bg-amber-100 dark:bg-amber-500/15 dark:text-amber-400 border-transparent",
  Hard: "bg-rose-100/80 text-rose-700 hover:bg-rose-100 dark:bg-rose-500/15 dark:text-rose-400 border-transparent",
}

export function ProblemsDirectoryClient({
  problems,
  isAdmin,
  streakStats,
  initialPage,
  initialPageSize,
  initialSearch,
  initialTab,
  initialDifficulty,
  initialTag,
  totalCount,
  allTags,
  globalStats,
}: ProblemsDirectoryProps) {
  const router = useRouter()
  const pathname = usePathname()

  const [isPending, startTransition] = useTransition()
  const [searchInput, setSearchInput] = useState(initialSearch)
  const isOwnUpdateRef = useRef(false)

  // Modal deletion state
  const [deletingProblemId, setDeletingProblemId] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Sync search input only on external navigation
  useEffect(() => {
    if (isOwnUpdateRef.current) {
      isOwnUpdateRef.current = false
      return
    }
    setSearchInput(initialSearch)
  }, [initialSearch])

  // Helper to push updated params to url
  const updateParams = useCallback(
    (newParams: Partial<Record<string, string | number>>) => {
      const params = new URLSearchParams(window.location.search)
      Object.entries(newParams).forEach(([key, val]) => {
        if (val === undefined || val === "" || val === null || val === "All") {
          params.delete(key)
        } else {
          params.set(key, String(val))
        }
      })
      startTransition(() => {
        router.push(`${pathname}?${params.toString()}`)
      })
    },
    [pathname, router]
  )

  // Debounce search input
  useEffect(() => {
    if (searchInput === initialSearch) return

    const timer = setTimeout(() => {
      isOwnUpdateRef.current = true
      updateParams({ search: searchInput, page: 1 })
    }, 400)
    return () => clearTimeout(timer)
  }, [searchInput, initialSearch, updateParams])

  const handleConfirmDelete = async () => {
    if (!deletingProblemId) return
    setIsDeleting(true)
    const tId = toast.loading("Permanently deleting problem...")
    try {
      const supabase = createClient()

      // 1. Cascade delete associated submissions to prevent foreign key errors
      const { error: subError } = await (supabase as any)
        .from("coding_submissions" as any)
        .delete()
        .eq("problem_id", deletingProblemId)

      if (subError) throw new Error(subError.message)

      // 2. Delete the problem itself
      const { error: probError } = await (supabase as any)
        .from("coding_problems" as any)
        .delete()
        .eq("id", deletingProblemId)

      if (probError) throw new Error(probError.message)

      toast.success("Problem deleted successfully!", { id: tId })
      setDeletingProblemId(null)
      router.refresh()
    } catch (err: any) {
      toast.error(err?.message || "Failed to delete problem.", { id: tId })
    } finally {
      setIsDeleting(false)
    }
  }

  const totalPages = Math.ceil(totalCount / initialPageSize)
  const activePage = Math.min(initialPage, Math.max(1, totalPages))

  return (
    <div className="flex flex-col gap-8 px-4 py-8 md:px-8">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-1.5">
          <h1 className="text-4xl font-bold font-cirka tracking-tight text-foreground">LogicLab</h1>
          <p className="text-base text-muted-foreground">
            Master your coding skills with our curated problem set.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          <Button asChild variant="outline" className="gap-2 h-10 px-5">
            <Link href="/~/logiclab/playground">
              <Terminal className="h-4 w-4" />
              Playground
            </Link>
          </Button>
          {isAdmin && (
            <Button asChild className="gap-2 h-10 px-5 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm">
              <Link href="/~/logiclab/admin">
                <Plus className="h-4 w-4" />
                Create Problem
              </Link>
            </Button>
          )}
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card 1: Progress */}
        <Card className="shadow-sm border-border/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2 mb-4">
              <span className="text-4xl font-bold">{globalStats.solved}</span>
              <span className="text-sm text-muted-foreground font-medium">/ {globalStats.total} solved</span>
            </div>
            <Progress 
              value={globalStats.total > 0 ? (globalStats.solved / globalStats.total) * 100 : 0} 
              className="h-2 bg-muted [&>div]:bg-emerald-500"
            />
          </CardContent>
        </Card>

        {/* Card 2: Difficulty */}
        <Card className="shadow-sm border-border/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Difficulty Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between mt-2 px-2">
              <div className="flex flex-col items-center">
                <span className="text-emerald-500 font-bold text-3xl">{globalStats.easy.solved}</span>
                <span className="text-xs text-muted-foreground font-medium uppercase mt-1">Easy</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-amber-500 font-bold text-3xl">{globalStats.medium.solved}</span>
                <span className="text-xs text-muted-foreground font-medium uppercase mt-1">Medium</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-rose-500 font-bold text-3xl">{globalStats.hard.solved}</span>
                <span className="text-xs text-muted-foreground font-medium uppercase mt-1">Hard</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Card 3: Streak */}
        <Card className="shadow-sm border-border/60 relative overflow-hidden">
          <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-[0.35] text-orange-500 pointer-events-none">
            <Flame className="w-20 h-20" />
          </div>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Current Streak</CardTitle>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-bold text-orange-500">{streakStats.currentStreak}</span>
              <span className="text-sm text-orange-500/70 font-medium">Days</span>
            </div>
            <p className="text-sm text-muted-foreground mt-2 font-medium">
              Max Streak: <span className="text-foreground">{streakStats.maxStreak}</span>
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Area */}
      <div className="flex flex-col gap-4 min-w-0 w-full">

        {/* Table Section */}
        <Card className="shadow-sm border-border/60 overflow-hidden">
          {/* Toolbar */}
          <div className="p-4 border-b border-border/60 bg-muted/10 flex flex-col xl:flex-row xl:items-center justify-between gap-4">
            <div className="flex flex-col sm:flex-row items-center gap-3 w-full xl:w-auto">
              <div className="relative w-full sm:w-80">
                {isPending ? (
                  <Loader2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground animate-spin" />
                ) : (
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                )}
                <Input
                  placeholder="Search problems..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="pl-9 pr-9 h-10 w-full bg-background text-sm"
                />
                {searchInput && (
                  <button
                    onClick={() => {
                      isOwnUpdateRef.current = true
                      setSearchInput("")
                      updateParams({ search: "", page: 1 })
                    }}
                    className="absolute right-3 top-2.5 h-5 w-5 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
              <Select value={initialDifficulty} onValueChange={(val) => updateParams({ difficulty: val, page: 1 })}>
                <SelectTrigger className="h-10 w-full sm:w-[160px] bg-background text-sm">
                  <div className="flex items-center gap-2">
                    <Filter className="w-4 h-4 text-muted-foreground" />
                    <SelectValue placeholder="Difficulty" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All Difficulties</SelectItem>
                  <SelectItem value="Easy">Easy</SelectItem>
                  <SelectItem value="Medium">Medium</SelectItem>
                  <SelectItem value="Hard">Hard</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Tabs value={initialTab} onValueChange={(v) => updateParams({ tab: v, page: 1 })} className="w-full xl:w-auto">
              <TabsList className="h-10 w-full xl:w-auto p-1 bg-muted/50 overflow-x-auto flex justify-start">
                <TabsTrigger value="all" className="px-5 text-sm">All</TabsTrigger>
                <TabsTrigger value="solved" className="px-5 text-sm">Solved</TabsTrigger>
                <TabsTrigger value="attempted" className="px-5 text-sm">Attempted</TabsTrigger>
                <TabsTrigger value="unsolved" className="px-5 text-sm">Unsolved</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* Table Body */}
          <div className="relative">
            {isPending && (
              <div className="absolute inset-0 z-50 bg-background/50 backdrop-blur-[1px] flex items-center justify-center min-h-[200px]">
                <div className="flex flex-col items-center gap-3 rounded-xl border bg-card px-6 py-5 shadow-lg">
                  <Loader2 className="h-8 w-8 text-primary animate-spin" />
                  <span className="text-sm font-medium text-muted-foreground">Loading problems...</span>
                </div>
              </div>
            )}

            <div className={cn("transition-opacity duration-200", isPending && "opacity-40 pointer-events-none")}>
              {totalCount === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 text-center gap-4">
                  <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center">
                    <BookOpen className="h-8 w-8 text-muted-foreground/60" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-lg font-semibold text-foreground">No problems found</p>
                    <p className="text-sm text-muted-foreground max-w-sm">
                      We couldn't find any problems matching your current filters. Try adjusting your search or removing some tags.
                    </p>
                  </div>
                  <Button variant="outline" onClick={() => updateParams({ search: "All", tag: "All", difficulty: "All", tab: "all", page: 1 })} className="mt-2">
                    Clear all filters
                  </Button>
                </div>
              ) : (
                <div className="w-full overflow-x-auto">
                  <Table className="min-w-[800px]">
                    <TableHeader className="bg-muted/10 h-12">
                      <TableRow className="hover:bg-transparent border-b-border/60">
                        <TableHead className="w-[80px] pl-6 text-sm font-medium">Status</TableHead>
                        <TableHead className="text-sm font-medium">Title</TableHead>
                        <TableHead className="w-[140px] text-sm font-medium">Difficulty</TableHead>
                        <TableHead className="w-[180px] text-sm font-medium">Acceptance</TableHead>
                        <TableHead className="w-[200px] text-sm font-medium">Tags</TableHead>
                        {isAdmin && <TableHead className="text-right pr-6 w-[120px] text-sm font-medium">Actions</TableHead>}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {problems.map((problem, idx) => (
                        <TableRow
                          key={problem.id}
                          onClick={() => router.push(`/~/logiclab/problems/${problem.id}`)}
                          className="group cursor-pointer hover:bg-muted/40 transition-colors h-16 border-b-border/60"
                        >
                          {/* Status */}
                          <TableCell className="pl-6">
                            {problem.solved_status === "Accepted" ? (
                              <CircleCheck className="h-5 w-5 text-emerald-500 fill-emerald-50 dark:fill-emerald-950/20" />
                            ) : problem.solved_status ? (
                              <CircleDot className="h-5 w-5 text-amber-500 fill-amber-50 dark:fill-amber-950/20" />
                            ) : (
                              <div className="h-4 w-4 ml-0.5 rounded-full border-2 border-muted-foreground/30" />
                            )}
                          </TableCell>

                          {/* Title */}
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <span className="text-sm text-muted-foreground/60 font-mono w-6 shrink-0">
                                {idx + 1 + (activePage - 1) * initialPageSize}.
                              </span>
                              <span className="text-base font-medium text-foreground/90 group-hover:text-foreground transition-colors">
                                {problem.title}
                              </span>
                            </div>
                          </TableCell>

                          {/* Difficulty */}
                          <TableCell>
                            <Badge
                              variant="secondary"
                              className={cn("text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-md", DIFFICULTY_COLORS[problem.difficulty])}
                            >
                              {problem.difficulty}
                            </Badge>
                          </TableCell>

                          {/* Acceptance Rate */}
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-foreground/80">
                                {problem.acceptance_rate !== null ? `${problem.acceptance_rate}%` : "—"}
                              </span>
                              {problem.total_submissions > 0 && (
                                <span className="text-xs text-muted-foreground/60">
                                  ({problem.total_submissions})
                                </span>
                              )}
                            </div>
                          </TableCell>

                          {/* Tags */}
                          <TableCell>
                            <div className="flex flex-wrap gap-1.5">
                              {(problem.tags || []).slice(0, 2).map((tag) => (
                                <Badge
                                  key={tag}
                                  variant="secondary"
                                  className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-muted/80 text-muted-foreground/80 hover:bg-muted border-transparent"
                                >
                                  {tag}
                                </Badge>
                              ))}
                              {(problem.tags || []).length > 2 && (
                                <Badge 
                                  variant="secondary"
                                  className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-muted/40 text-muted-foreground/60 hover:bg-muted/50 border-transparent"
                                >
                                  +{(problem.tags || []).length - 2}
                                </Badge>
                              )}
                            </div>
                          </TableCell>

                          {/* Admin actions */}
                          {isAdmin && (
                            <TableCell className="text-right pr-6" onClick={(e) => e.stopPropagation()}>
                              <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Link
                                  href={`/~/logiclab/admin/edit/${problem.id}`}
                                  className="p-2 hover:bg-background rounded-md text-muted-foreground hover:text-emerald-500 transition-all cursor-pointer shadow-sm border border-transparent hover:border-border/60"
                                  title="Edit Problem"
                                >
                                  <Pencil className="h-4 w-4" />
                                </Link>
                                <button
                                  onClick={() => setDeletingProblemId(problem.id)}
                                  className="p-2 hover:bg-background rounded-md text-muted-foreground/70 hover:text-rose-500 transition-all cursor-pointer shadow-sm border border-transparent hover:border-border/60"
                                  title="Delete Problem"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            </TableCell>
                          )}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              {/* Pagination Footer */}
              {totalCount > 0 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 border-t border-border/60 bg-muted/5">
                  <div className="text-sm text-muted-foreground">
                    Showing{" "}
                    <span className="font-medium text-foreground">
                      {totalCount === 0 ? 0 : Math.min(totalCount, (activePage - 1) * initialPageSize + 1)}
                    </span>
                    {" "}to{" "}
                    <span className="font-medium text-foreground">{Math.min(totalCount, activePage * initialPageSize)}</span>
                    {" "}of{" "}
                    <span className="font-medium text-foreground">{totalCount}</span> problems
                  </div>

                  <div className="flex flex-wrap items-center gap-4 sm:gap-6">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground whitespace-nowrap">Rows per page</span>
                      <Select
                        value={initialPageSize.toString()}
                        onValueChange={(val) => updateParams({ size: val, page: 1 })}
                      >
                        <SelectTrigger className="h-9 w-[80px] bg-background text-sm">
                          <SelectValue placeholder={initialPageSize.toString()} />
                        </SelectTrigger>
                        <SelectContent>
                          {[5, 10, 20, 50].map((s) => (
                            <SelectItem key={s} value={s.toString()} className="text-sm">{s}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex items-center gap-1">
                      <Button variant="outline" size="icon" className="h-9 w-9 bg-background"
                        onClick={() => updateParams({ page: 1 })} disabled={activePage === 1}>
                        <ChevronsLeft className="h-4 w-4" />
                        <span className="sr-only">First page</span>
                      </Button>
                      <Button variant="outline" size="icon" className="h-9 w-9 bg-background"
                        onClick={() => updateParams({ page: Math.max(1, activePage - 1) })} disabled={activePage === 1}>
                        <ChevronLeft className="h-4 w-4" />
                        <span className="sr-only">Previous page</span>
                      </Button>
                      <div className="flex items-center justify-center text-sm font-medium min-w-[100px] text-muted-foreground">
                        Page <span className="text-foreground mx-1">{activePage}</span> of {totalPages}
                      </div>
                      <Button variant="outline" size="icon" className="h-9 w-9 bg-background"
                        onClick={() => updateParams({ page: Math.min(totalPages, activePage + 1) })}
                        disabled={activePage === totalPages || totalPages === 0}>
                        <ChevronRight className="h-4 w-4" />
                        <span className="sr-only">Next page</span>
                      </Button>
                      <Button variant="outline" size="icon" className="h-9 w-9 bg-background"
                        onClick={() => updateParams({ page: totalPages })}
                        disabled={activePage === totalPages || totalPages === 0}>
                        <ChevronsRight className="h-4 w-4" />
                        <span className="sr-only">Last page</span>
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </Card>
      </div>

      {/* ── Delete Confirmation Modal ── */}
      {deletingProblemId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-background border border-border rounded-xl shadow-2xl overflow-hidden w-full max-w-md flex flex-col animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 bg-muted/80 border-b border-border">
              <h3 className="text-base font-bold flex items-center gap-2 text-rose-500 uppercase tracking-wider">
                <AlertTriangle className="h-5 w-5" /> Permanent Deletion
              </h3>
              <button
                onClick={() => setDeletingProblemId(null)}
                disabled={isDeleting}
                className="p-1.5 hover:bg-muted rounded-md text-muted-foreground/70 hover:text-foreground transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 text-sm text-foreground/80 space-y-4">
              <p className="text-base">
                Are you absolutely sure you want to permanently delete this coding problem?
              </p>
              <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg text-rose-600 dark:text-rose-400 font-medium">
                This action cannot be undone. All associated user submissions and attempts will also be deleted.
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 px-5 py-4 bg-muted/30 border-t border-border">
              <Button
                variant="outline"
                onClick={() => setDeletingProblemId(null)}
                disabled={isDeleting}
                className="h-10"
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="h-10 px-5 gap-2"
              >
                {isDeleting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
                {isDeleting ? "Deleting..." : "Delete Problem"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
