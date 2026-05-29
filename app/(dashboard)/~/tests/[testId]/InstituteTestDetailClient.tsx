"use client"

// ─────────────────────────────────────────────────────────────────────────────
// app/~/tests/[id]/InstituteTestDetailClient.tsx
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState, useCallback, useEffect, useMemo, useRef, type ReactNode } from "react"
import type { AttemptPageStats } from "./_types"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import Link from "next/link"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
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
import {
  Eye,
  EyeOff,
  MoreHorizontal,
  CheckCircle2,
  XCircle,
  Clock,
  Users,
  CalendarClock,
  BarChart2,
  Tag,
  BookOpen,
  Info,
  CalendarX,
  Loader2,
  Trash2,
  ListChecks,
  Pencil,
  Download,
  FileSpreadsheet,
  FileText,
  AlertCircle,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  Search,
  Filter,
  X,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { MathText } from "@/components/ui/math-text"
import type { InstituteTestDetail, InstituteQuestion, InstituteAttemptRow } from "./_types"
import { formatDuration, formatDateTime, formatSeconds, resolvePct } from "./_types"


// ─── useDebounce ──────────────────────────────────────────────────────────────

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState<T>(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return debounced
}


// ─── Action State Hook ────────────────────────────────────────────────────────

type ActionKey = "toggleResults" | "togglePublish" | "deleteTest" | "deleteAttempt" | null

function useActionState() {
  const [activeAction, setActiveAction] = useState<ActionKey>(null)

  const run = useCallback(
    async (key: ActionKey, fn?: () => Promise<void>) => {
      if (!fn || activeAction !== null) return
      setActiveAction(key)
      try {
        await fn()
      } catch (err: any) {
        if (err?.message === "NEXT_REDIRECT") throw err
        toast.error(err?.message || "Operation failed")
      } finally {
        setActiveAction(null)
      }
    },
    [activeAction]
  )

  const isLoading = (key: ActionKey) => activeAction === key
  const anyLoading = activeAction !== null

  return { run, isLoading, anyLoading }
}


// ─── Stats Bar ────────────────────────────────────────────────────────────────

function StatsBar({ test, stats, totalMarks }: { test: InstituteTestDetail; stats: AttemptPageStats; totalMarks: number }) {
  const completionPct =
    stats.total > 0 ? ((stats.submitted / stats.total) * 100).toFixed(2) : 0

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <Card className="rounded-xl py-0">
        <CardContent className="p-4 space-y-1">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <ListChecks className="h-3.5 w-3.5" />
            <p className="text-xs font-medium">Questions</p>
          </div>
          <p className="text-2xl font-bold tabular-nums">{test.questions.length}</p>
          <p className="text-xs text-muted-foreground">{totalMarks} total pts</p>
        </CardContent>
      </Card>

      <Card className="rounded-xl py-0">
        <CardContent className="p-4 space-y-1">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Users className="h-3.5 w-3.5" />
            <p className="text-xs font-medium">Attempts</p>
          </div>
          <p className="text-2xl font-bold tabular-nums">{stats.total}</p>
          <p className="text-xs text-muted-foreground">{stats.in_progress} in progress</p>
        </CardContent>
      </Card>

      <Card className="rounded-xl py-0">
        <CardContent className="p-4 space-y-1">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <CheckCircle2 className="h-3.5 w-3.5" />
            <p className="text-xs font-medium">Submitted</p>
          </div>
          <p className="text-2xl font-bold tabular-nums">{stats.submitted}</p>
          <p className="text-xs text-muted-foreground">
            {stats.total > 0 ? `${completionPct}% completion` : "No attempts yet"}
          </p>
        </CardContent>
      </Card>

      <Card className="rounded-xl border py-0">
        <CardContent className="p-4 space-y-1">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <BarChart2 className="h-3.5 w-3.5" />
            <p className="text-xs font-medium">Avg Score</p>
          </div>
          <p className="text-2xl font-bold tabular-nums">
            {stats.avg_pct != null ? `${stats.avg_pct.toFixed(2)}%` : "—"}
          </p>
          <p className="text-xs text-muted-foreground">
            {stats.avg_pct != null ? "Submitted average" : "No submissions yet"}
          </p>
        </CardContent>
      </Card>
    </div>
  )
}


// ─── Meta Item ────────────────────────────────────────────────────────────────

function MetaItem({
  icon,
  label,
  value,
}: {
  icon: ReactNode
  label: string
  value: string
}) {
  return (
    <div className="flex items-start gap-2.5 rounded-xl border bg-muted/20 p-3.5">
      <span className="mt-0.5 shrink-0 text-muted-foreground">{icon}</span>
      <div>
        <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        <p className="mt-0.5 text-sm font-medium text-foreground">{value}</p>
      </div>
    </div>
  )
}


// ─── Question Card (Answer Key) ───────────────────────────────────────────────

function QuestionCard({
  question,
  index,
}: {
  question: InstituteQuestion
  index: number
}) {
  const sortedOptions = [...question.options].sort((a, b) => a.order_index - b.order_index)
  const correctCount = sortedOptions.filter((o) => o.is_correct).length

  return (
    <AccordionItem
      value={question.id}
      className="overflow-hidden rounded-xl border bg-card transition-colors data-[state=open]:bg-muted/10"
    >
      <AccordionTrigger className="px-4 py-3 text-left hover:no-underline">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <span className="mt-px shrink-0 flex h-5 w-6 items-center justify-center rounded-md bg-muted text-[11px] font-bold tabular-nums text-muted-foreground">
            {index + 1}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium leading-relaxed text-foreground line-clamp-2">
              <MathText>{question.question_text}</MathText>
            </p>
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
              <Badge variant="outline" className="h-4 px-1.5 text-[10px]">
                {question.question_type === "single_correct" ? "Single" : "Multi"}
              </Badge>
              <Badge variant="secondary" className="h-4 px-1.5 text-[10px]">
                {question.marks} pt{question.marks !== 1 ? "s" : ""}
              </Badge>
              <span className="text-[10px] text-muted-foreground">
                {correctCount} correct answer{correctCount !== 1 ? "s" : ""}
              </span>
            </div>
          </div>
        </div>
      </AccordionTrigger>

      <AccordionContent className="px-4 pb-4 pt-0">
        <Separator className="mb-3" />
        <div className="space-y-1.5">
          {sortedOptions.map((opt) => (
            <div
              key={opt.id}
              className={cn(
                "flex items-center gap-2.5 rounded-lg border px-3 py-2",
                opt.is_correct
                  ? "border-emerald-200 bg-emerald-50/60 dark:border-emerald-900/50 dark:bg-emerald-950/20"
                  : "border-border bg-muted/20"
              )}
            >
              {opt.is_correct ? (
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-500" />
              ) : (
                <XCircle className="h-3.5 w-3.5 shrink-0 text-muted-foreground/40" />
              )}
              <span
                className={cn(
                  "flex-1 text-sm leading-snug",
                  opt.is_correct ? "font-medium text-foreground" : "text-muted-foreground"
                )}
              >
                <MathText>{opt.option_text}</MathText>
              </span>
              {opt.is_correct && (
                <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wide text-emerald-600 dark:text-emerald-500">
                  Correct
                </span>
              )}
            </div>
          ))}
        </div>

        {question.tags.length > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            <Tag className="h-3 w-3 text-muted-foreground/60" />
            {question.tags.map((t) => (
              <Badge key={t.id} variant="secondary" className="h-4 px-1.5 text-[10px] font-normal">
                {t.name}
              </Badge>
            ))}
          </div>
        )}

        {question.explanation && (
          <div className="mt-3 flex items-start gap-2.5 rounded-xl border bg-muted/40 p-3">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <p className="text-xs leading-relaxed text-muted-foreground">
              <MathText>{question.explanation}</MathText>
            </p>
          </div>
        )}
      </AccordionContent>
    </AccordionItem>
  )
}


// ─── Questions Tab (Answer Key) ───────────────────────────────────────────────

function QuestionsTab({ questions }: { questions: InstituteQuestion[] }) {
  const totalMarks = questions.reduce((s, q) => s + q.marks, 0)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {questions.length > 0 ? (
            <>
              <span className="font-medium text-foreground">{questions.length}</span>{" "}
              question{questions.length !== 1 ? "s" : ""} ·{" "}
              <span className="font-medium text-foreground">{totalMarks}</span> total marks
            </>
          ) : (
            "No questions available"
          )}
        </p>
        <Badge variant="outline" className="gap-1 text-xs">
          <BookOpen className="h-3 w-3" />
          Answer Key
        </Badge>
      </div>

      {questions.length === 0 ? (
        <Card className="rounded-xl border-dashed">
          <CardContent className="flex flex-col items-center justify-center gap-3 py-12 text-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
              <ListChecks className="h-5 w-5 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">No questions available</p>
          </CardContent>
        </Card>
      ) : (
        <Accordion type="multiple" className="space-y-2">
          {[...questions]
            .sort((a, b) => a.order_index - b.order_index)
            .map((q, i) => (
              <QuestionCard key={q.id} question={q} index={i} />
            ))}
        </Accordion>
      )}
    </div>
  )
}


// ─── Attempt Score ────────────────────────────────────────────────────────────

// React.memo: only re-renders when attempt data or scoresVisible changes.
// Without this, toggling scoresVisible re-renders every single row.
const AttemptScore = React.memo(function AttemptScore({
  attempt,
  scoresVisible,
}: {
  attempt: InstituteAttemptRow
  scoresVisible: boolean
}) {
  if (attempt.status !== "submitted" && attempt.status !== "auto_submitted") {
    return <span className="text-sm text-muted-foreground">—</span>
  }
  if (!scoresVisible) {
    return <span className="text-sm italic text-muted-foreground">Hidden</span>
  }

  const pct = resolvePct(attempt.percentage, attempt.score, attempt.total_marks)

  return (
    <div className="flex flex-col">
      <span className="text-sm font-semibold tabular-nums">{pct.toFixed(2)}%</span>
      {attempt.score != null && attempt.total_marks != null && (
        <span className="text-xs tabular-nums text-muted-foreground">
          {attempt.score}/{attempt.total_marks}
        </span>
      )}
    </div>
  )
})


// ─── Sortable Table Head ─────────────────────────────────────────────────────

type SortColumn = "student_name" | "education" | "status" | "score" | "time" | "violations" | "started" | "submitted"

function SortableHead({
  label,
  col,
  align = "left",
  sortCol,
  sortDir,
  onSort,
}: {
  label: ReactNode
  col: SortColumn
  align?: "left" | "center" | "right"
  sortCol: SortColumn
  sortDir: "asc" | "desc"
  onSort: (col: SortColumn) => void
}) {
  return (
    <TableHead
      className={cn(
        "text-xs font-semibold select-none cursor-pointer hover:bg-muted/60 transition-colors",
        align === "right" && "text-right",
        align === "center" && "text-center"
      )}
      onClick={() => onSort(col)}
    >
      <div className={cn("flex items-center gap-1.5", align === "right" && "justify-end", align === "center" && "justify-center")}>
        {label}
        {sortCol === col ? (
          sortDir === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
        ) : (
          <ArrowUpDown className="h-3 w-3 opacity-20" />
        )}
      </div>
    </TableHead>
  )
}


// ─── Memoized Row Components ──────────────────────────────────────────────────

// Isolated behind React.memo so a sort/filter change that produces the same
// row data won't re-render that individual row at all.

const MobileAttemptRow = React.memo(function MobileAttemptRow({
  attempt,
  scoresVisible,
  testId,
  onDelete,
}: {
  attempt: InstituteAttemptRow
  scoresVisible: boolean
  testId: string
  onDelete: (a: InstituteAttemptRow) => void
}) {
  const isCompleted = attempt.status === "submitted" || attempt.status === "auto_submitted"

  return (
    <AccordionItem value={attempt.id} className="border-none">
      <AccordionTrigger className="px-4 py-4 hover:bg-muted/5 hover:no-underline data-[state=open]:bg-muted/10 transition-all">
        <div className="flex items-center justify-between w-full pr-6 text-left">
          <div className="min-w-0 flex-1 gap-1.5 flex flex-col">
            <p className="truncate text-sm font-semibold text-foreground leading-none">
              {attempt.student_name ?? "Unknown"}
            </p>
            <div className="flex flex-wrap items-center gap-1.5">
              <span
                className={cn(
                  "text-[9px] px-1.5 py-0.5 rounded-md font-bold uppercase tracking-wider border",
                  isCompleted
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200/50 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20"
                    : "bg-amber-50 text-amber-700 border-amber-200/50 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20"
                )}
              >
                {isCompleted ? "Submitted" : "In Progress"}
              </span>
              {attempt.tab_switch_count != null && attempt.tab_switch_count > 0 && (
                <span className="text-[9px] px-1.5 py-0.5 rounded-md font-bold uppercase tracking-wider bg-red-50 text-red-600 border border-red-200/50 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20 flex items-center gap-0.5">
                  <AlertCircle className="h-2.5 w-2.5" />
                  {attempt.tab_switch_count}
                </span>
              )}
            </div>
          </div>
          <div className="shrink-0 text-right pr-1">
            <AttemptScore attempt={attempt} scoresVisible={scoresVisible} />
          </div>
        </div>
      </AccordionTrigger>
      <AccordionContent className="px-4 pb-5 pt-0">
        <div className="space-y-4">
          <div className="rounded-xl border bg-muted/20 divide-y divide-border/60 overflow-hidden">
            <div className="px-3.5 py-2.5 flex items-baseline justify-between gap-4">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest shrink-0">Email</span>
              <span className="text-xs font-medium text-foreground truncate text-right">{attempt.student_email || "—"}</span>
            </div>

            <div className="px-3.5 py-2.5 flex items-baseline justify-between gap-4">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest shrink-0">Education</span>
              <span className="text-xs font-medium text-foreground text-right">
                {attempt.branch || "—"} {attempt.passout_year ? `('${attempt.passout_year.toString().slice(-2)})` : ""}
              </span>
            </div>

            <div className="px-3.5 py-2.5 flex items-baseline justify-between gap-4">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest shrink-0">Time Spent</span>
              <span className="text-xs font-mono font-medium text-foreground text-right">{formatSeconds(attempt.time_spent_seconds)}</span>
            </div>

            <div className="px-3.5 py-2.5 flex items-baseline justify-between gap-4">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest shrink-0">Violations</span>
              <span className={cn("text-xs font-bold text-right", (attempt.tab_switch_count ?? 0) > 0 ? "text-red-600" : "text-foreground")}>
                {attempt.tab_switch_count ?? 0} Tab Switch{(attempt.tab_switch_count ?? 0) !== 1 ? "es" : ""}
              </span>
            </div>

            <div className="px-3.5 py-2.5 flex items-baseline justify-between gap-4">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest shrink-0">Started At</span>
              <span className="text-xs font-medium text-foreground text-right">{formatDateTime(attempt.started_at)}</span>
            </div>

            {attempt.submitted_at && (
              <div className="px-3.5 py-2.5 flex items-baseline justify-between gap-4">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest shrink-0">Submitted At</span>
                <span className="text-xs font-medium text-foreground text-right">{formatDateTime(attempt.submitted_at)}</span>
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <Button asChild size="lg" className="flex-1 font-bold gap-2 text-sm shadow-md">
              <Link href={`/~/tests/${testId}/result/${attempt.id}`} target="_blank" rel="noopener noreferrer">
                <Eye className="h-4.5 w-4.5" />
                View Full Result
                <ExternalLink className="ml-auto h-3.5 w-3.5 opacity-50" />
              </Link>
            </Button>
            <Button 
              variant="outline" 
              size="lg" 
              className="px-3 text-destructive hover:bg-destructive/10 hover:text-destructive border-destructive/20 shadow-sm"
              onClick={() => onDelete(attempt)}
            >
              <Trash2 className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </AccordionContent>
    </AccordionItem>
  )
})



const DesktopAttemptRow = React.memo(function DesktopAttemptRow({
  attempt,
  scoresVisible,
  testId,
  onDelete,
}: {
  attempt: InstituteAttemptRow
  scoresVisible: boolean
  testId: string
  onDelete: (a: InstituteAttemptRow) => void
}) {
  return (
    <TableRow className="hover:bg-muted/20">
      <TableCell>
        <p className="truncate text-sm font-medium">{attempt.student_name ?? "Unknown"}</p>
        {attempt.student_email && (
          <p className="truncate text-xs text-muted-foreground">{attempt.student_email}</p>
        )}
      </TableCell>
      <TableCell>
        <div className="flex flex-col gap-0.5">
          <span className="text-sm">{attempt.branch || "—"}</span>
          <span className="text-xs text-muted-foreground">{attempt.passout_year || "—"}</span>
        </div>
      </TableCell>
      <TableCell>
        <span
          className={cn(
            "text-sm whitespace-nowrap",
            (attempt.status === "submitted" || attempt.status === "auto_submitted") ? "text-foreground" : "text-muted-foreground"
          )}
        >
          {(attempt.status === "submitted" || attempt.status === "auto_submitted") ? "Submitted" : "In Progress"}
        </span>
      </TableCell>
      <TableCell className="text-right">
        <div className="flex justify-end">
          <AttemptScore attempt={attempt} scoresVisible={scoresVisible} />
        </div>
      </TableCell>
      <TableCell className="text-right text-sm tabular-nums text-muted-foreground">
        {formatSeconds(attempt.time_spent_seconds)}
      </TableCell>
      <TableCell className="text-center text-sm tabular-nums text-muted-foreground">
        {attempt.tab_switch_count != null && attempt.tab_switch_count > 0
          ? attempt.tab_switch_count
          : "—"}
      </TableCell>
      <TableCell className="text-xs text-muted-foreground tabular-nums">
        {formatDateTime(attempt.started_at)}
      </TableCell>
      <TableCell className="text-xs text-muted-foreground tabular-nums">
        {attempt.submitted_at ? formatDateTime(attempt.submitted_at) : "—"}
      </TableCell>
      <TableCell className="text-right">
        <div className="flex items-center justify-end gap-1">
          <Button asChild size="sm" variant="ghost" className="h-8 gap-1.5">
            <Link href={`/~/tests/${testId}/result/${attempt.id}`} target="_blank" rel="noopener noreferrer">
              <Eye className="h-3.5 w-3.5" />
              <span className="sr-only sm:not-sr-only">View</span>
            </Link>
          </Button>
          <Button 
            size="sm" 
            variant="ghost" 
            className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
            onClick={() => onDelete(attempt)}
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span className="sr-only">Delete</span>
          </Button>
        </div>
      </TableCell>
    </TableRow>
  )
})


// ─── Page size constant shared by AttemptsTab and refreshAttempts ─────────────

const ATTEMPTS_PAGE_SIZE = 20

// Map of sort column → view_test_results_detailed column name
const SORT_COL_MAP: Record<SortColumn, string> = {
  student_name: "student_name",
  education: "branch",
  status: "status",
  score: "percentage",
  time: "time_spent_seconds",
  violations: "tab_switch_count",
  started: "started_at",
  submitted: "submitted_at",
}


// ─── Attempts Tab ─────────────────────────────────────────────────────────────

function AttemptsTab({ 
  test, 
  pageRows,
  totalCount,
  stats,
  totalMarks, 
  getNowOnServer,
  onDeleteAttempt,
  onDeleteSuccess,
  onFetchPage,
  onFetchStats,
  onFetchAllForExport,
}: { 
  test: InstituteTestDetail
  pageRows: InstituteAttemptRow[]
  totalCount: number
  stats: AttemptPageStats
  totalMarks: number
  getNowOnServer: () => Date
  onDeleteAttempt?: (attemptId: string) => Promise<void>
  onDeleteSuccess?: (attemptId: string) => void
  onFetchPage: (params: AttemptQueryParams) => Promise<void>
  onFetchStats: () => Promise<void>
  onFetchAllForExport: (params: Omit<AttemptQueryParams, "page">) => Promise<InstituteAttemptRow[]>
}) {
  const [scoresVisible, setScoresVisible] = useState(false)
  const [attemptToDelete, setAttemptToDelete] = useState<InstituteAttemptRow | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isLoadingPage, setIsLoadingPage] = useState(false)
  const [isExporting, setIsExporting] = useState(false)

  // ── Filters & sort ──────────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<"all" | "submitted" | "in_progress">("all")
  const [scoreFilter, setScoreFilter] = useState<"all" | "high" | "mid" | "low">("all")
  const [sortCol, setSortCol] = useState<SortColumn>("submitted")
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc")
  const [page, setPage] = useState(0)

  const debouncedSearch = useDebounce(searchQuery, 300)

  const activeFilterCount = useMemo(
    () =>
      [
        debouncedSearch.trim() !== "",
        statusFilter !== "all",
        scoreFilter !== "all",
      ].filter(Boolean).length,
    [debouncedSearch, statusFilter, scoreFilter]
  )

  const clearFilters = useCallback(() => {
    setSearchQuery("")
    setStatusFilter("all")
    setScoreFilter("all")
  }, [])

  // Re-fetch whenever filters / sort / page change
  const fetchCurrentPage = useCallback(async (
    overrides: Partial<AttemptQueryParams> = {}
  ) => {
    setIsLoadingPage(true)
    try {
      await onFetchPage({
        search: debouncedSearch.trim(),
        statusFilter,
        scoreFilter,
        sortCol,
        sortDir,
        page,
        ...overrides,
      })
    } finally {
      setIsLoadingPage(false)
    }
  }, [debouncedSearch, statusFilter, scoreFilter, sortCol, sortDir, page, onFetchPage])

  const handleSort = useCallback((col: SortColumn) => {
    const newDir = sortCol === col ? (sortDir === "asc" ? "desc" : "asc") : 
      ["student_name", "education", "status", "started", "submitted"].includes(col) ? "asc" : "desc"
    const newPage = 0
    setSortCol(col)
    setSortDir(newDir)
    setPage(newPage)
    setIsLoadingPage(true)
    onFetchPage({ search: debouncedSearch.trim(), statusFilter, scoreFilter, sortCol: col, sortDir: newDir, page: newPage })
      .finally(() => setIsLoadingPage(false))
  }, [sortCol, sortDir, debouncedSearch, statusFilter, scoreFilter, onFetchPage])

  const handleFilterChange = useCallback((
    patch: Partial<{ statusFilter: typeof statusFilter; scoreFilter: typeof scoreFilter }>
  ) => {
    const newStatus = patch.statusFilter ?? statusFilter
    const newScore = patch.scoreFilter ?? scoreFilter
    if (patch.statusFilter !== undefined) setStatusFilter(newStatus)
    if (patch.scoreFilter !== undefined) setScoreFilter(newScore)
    setPage(0)
    setIsLoadingPage(true)
    onFetchPage({ search: debouncedSearch.trim(), statusFilter: newStatus, scoreFilter: newScore, sortCol, sortDir, page: 0 })
      .finally(() => setIsLoadingPage(false))
  }, [statusFilter, scoreFilter, debouncedSearch, sortCol, sortDir, onFetchPage])

  // Handle search debounce — reset to page 0
  const prevSearch = useRef(debouncedSearch)
  useEffect(() => {
    if (debouncedSearch === prevSearch.current) return
    prevSearch.current = debouncedSearch
    setPage(0)
    setIsLoadingPage(true)
    onFetchPage({ search: debouncedSearch.trim(), statusFilter, scoreFilter, sortCol, sortDir, page: 0 })
      .finally(() => setIsLoadingPage(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch])

  // Navigate pages
  const totalPages = Math.max(1, Math.ceil(totalCount / ATTEMPTS_PAGE_SIZE))
  const goToPage = useCallback((newPage: number) => {
    setPage(newPage)
    setIsLoadingPage(true)
    onFetchPage({ search: debouncedSearch.trim(), statusFilter, scoreFilter, sortCol, sortDir, page: newPage })
      .finally(() => setIsLoadingPage(false))
  }, [debouncedSearch, statusFilter, scoreFilter, sortCol, sortDir, onFetchPage])

  // ── Export helpers ───────────────────────────────────────────────────────
  const buildExportRows = (rows: InstituteAttemptRow[]) => rows.map((a) => [
    a.student_name || "Unknown",
    a.student_email || "—",
    a.branch || "—",
    a.passout_year?.toString() || "—",
    (a.status === "submitted" || a.status === "auto_submitted") ? "Submitted" : "In Progress",
    a.score ?? "—",
    a.total_marks ?? "—",
    (a.status === "submitted" || a.status === "auto_submitted") ? resolvePct(a.percentage, a.score, a.total_marks).toFixed(2) : "—",
    formatSeconds(a.time_spent_seconds),
    a.tab_switch_count?.toString() ?? "0",
    formatDateTime(a.started_at),
    a.submitted_at ? formatDateTime(a.submitted_at) : "—",
  ])

  const handleExportCSV = useCallback(async () => {
    setIsExporting(true)
    try {
      const allRows = await onFetchAllForExport({ search: debouncedSearch.trim(), statusFilter, scoreFilter, sortCol, sortDir })
      const headers = ["Student Name","Email","Branch","Passout Year","Status","Score","Total Marks","Percentage (%)","Time Spent","Violations","Started At","Submitted At"]
      const escapeCsv = (str: any) => `"${String(str).replace(/"/g, '""')}"`
      const csvContent = [headers, ...buildExportRows(allRows)].map((row) => row.map(escapeCsv).join(",")).join("\n")
      const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" })
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.setAttribute("download", `${test.title.replace(/[^a-z0-9]/gi, "_").toLowerCase()}_results.csv`)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } finally {
      setIsExporting(false)
    }
  }, [debouncedSearch, statusFilter, scoreFilter, sortCol, sortDir, onFetchAllForExport, test.title])

  const handleExportPDF = useCallback(async () => {
    setIsExporting(true)
    try {
      const allRows = await onFetchAllForExport({ search: debouncedSearch.trim(), statusFilter, scoreFilter, sortCol, sortDir })
      const { default: jsPDF } = await import("jspdf")
      const { default: autoTable } = await import("jspdf-autotable")

      const doc = new jsPDF("landscape", "mm", "a4")
      const pageWidth = doc.internal.pageSize.width
      let currentY = 14

      if (test.institute_name) {
        doc.setFont("helvetica", "bold")
        doc.setFontSize(8)
        doc.setTextColor(120, 120, 120)
        doc.text(test.institute_name.toUpperCase(), 14, currentY)
        currentY += 6
      }

      doc.setFont("helvetica", "bold")
      doc.setFontSize(14)
      doc.setTextColor(20, 20, 20)
      doc.text(test.title, 14, currentY)
      currentY += 5

      doc.setFont("helvetica", "normal")
      doc.setFontSize(8)
      doc.setTextColor(100, 100, 100)
      doc.text(`Test ID: ${test.id}   |   Duration: ${formatDuration(test.time_limit_seconds)}   |   Questions: ${test.questions.length}   |   Total Marks: ${totalMarks}`, 14, currentY)
      currentY += 4.5
      doc.text(`Total Attempts: ${stats.total}   |   ${stats.avg_pct != null ? `Average Score: ${stats.avg_pct.toFixed(2)}%   |   ` : ""}Exported On: ${getNowOnServer().toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}`, 14, currentY)
      currentY += 8

      const tableColumn = ["#", "Student", "Email", "Branch", "Grad", "Status", "Score", "Pct", "Time", "Viol", "Submitted"]
      const tableRows = allRows.map((a, i) => [
        String(i + 1),
        a.student_name || "Unknown",
        a.student_email || "—",
        a.branch || "—",
        a.passout_year?.toString() || "—",
        (a.status === "submitted" || a.status === "auto_submitted") ? "Submitted" : "In Progress",
        (a.status === "submitted" || a.status === "auto_submitted") ? `${a.score ?? "—"}/${a.total_marks ?? "—"}` : "—",
        (a.status === "submitted" || a.status === "auto_submitted") ? `${resolvePct(a.percentage, a.score, a.total_marks).toFixed(2)}%` : "—",
        formatSeconds(a.time_spent_seconds),
        a.tab_switch_count?.toString() ?? "0",
        a.submitted_at ? formatDateTime(a.submitted_at) : "—",
      ])

      autoTable(doc, {
        startY: currentY,
        head: [tableColumn],
        body: tableRows,
        theme: "grid",
        styles: { font: "helvetica", fontSize: 7, cellPadding: 2.5, textColor: [33, 33, 33], lineWidth: 0.2, lineColor: [189, 189, 189], overflow: "linebreak" },
        headStyles: { fontSize: 7.5, textColor: [255, 255, 255], fontStyle: "bold", fillColor: [55, 86, 35], lineWidth: 0.2, lineColor: [45, 70, 28], halign: "center", valign: "middle" },
        bodyStyles: { lineWidth: 0.2, lineColor: [189, 189, 189], valign: "middle" },
        alternateRowStyles: { fillColor: [234, 241, 228] },
        columnStyles: {
          0: { cellWidth: 12, halign: "center" }, 1: { cellWidth: 42 }, 2: { cellWidth: 48 },
          3: { cellWidth: 35 }, 4: { halign: "center", cellWidth: 14 }, 5: { cellWidth: 20 },
          6: { halign: "right", cellWidth: 18 }, 7: { halign: "right", cellWidth: 16 },
          8: { halign: "right", cellWidth: 18 }, 9: { halign: "center", cellWidth: 12 }, 10: { halign: "right" },
        },
        didDrawPage: (data) => {
          const pg = data.pageNumber
          const pageHeight = doc.internal.pageSize.height
          doc.setFontSize(6); doc.setFont("helvetica", "normal"); doc.setTextColor(180, 180, 180)
          doc.text("Generated using Placetrix", 14, pageHeight - 8)
          doc.setFontSize(7)
          doc.text(`Page ${pg}`, pageWidth - 14, pageHeight - 8, { align: "right" })
        },
      })

      const ts = getNowOnServer().toISOString().replace(/[:.]/g, "-").slice(0, 19)
      doc.save(`${test.id}_${ts}.pdf`)
    } finally {
      setIsExporting(false)
    }
  }, [debouncedSearch, statusFilter, scoreFilter, sortCol, sortDir, onFetchAllForExport, test, totalMarks, stats, getNowOnServer])

  if (stats.total === 0) {
    return (
      <Card className="rounded-xl border-dashed">
        <CardContent className="flex flex-col items-center justify-center gap-3 py-12 text-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
            <Users className="h-5 w-5 text-muted-foreground" />
          </div>
          <div className="space-y-0.5">
            <p className="text-sm font-medium">No attempts yet</p>
            <p className="text-xs text-muted-foreground">
              Students will appear here once they start the test.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-5">
      {/* Summary strip & export */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-1 text-sm">
          <span>
            <span className="font-semibold tabular-nums">{stats.submitted}</span>
            <span className="ml-1 text-muted-foreground">Submitted</span>
          </span>
          <Separator orientation="vertical" className="h-3.5" />
          <span>
            <span className="font-semibold tabular-nums">{stats.in_progress}</span>
            <span className="ml-1 text-muted-foreground">In Progress</span>
          </span>
          {scoresVisible && stats.avg_pct != null && (
            <>
              <Separator orientation="vertical" className="h-3.5" />
              <span>
                <span className="font-semibold tabular-nums">{stats.avg_pct.toFixed(2)}%</span>
                <span className="ml-1 text-muted-foreground">Avg Score</span>
              </span>
            </>
          )}
          {activeFilterCount > 0 && (
            <>
              <Separator orientation="vertical" className="h-3.5" />
              <span className="flex items-center gap-1">
                <span className="font-semibold tabular-nums">{totalCount}</span>
                <span className="text-muted-foreground">matching</span>
              </span>
            </>
          )}
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2" disabled={isExporting}>
              {isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              Export Data
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={handleExportCSV} disabled={isExporting}>
              <FileSpreadsheet className="mr-2 h-4 w-4" />
              Export as CSV (Excel)
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleExportPDF} disabled={isExporting}>
              <FileText className="mr-2 h-4 w-4" />
              Export as PDF
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* ── Filter bar ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-2 rounded-xl border bg-muted/10 p-3">
        <div className="flex flex-col sm:flex-row gap-2">
          {/* Search — input updates instantly; query is debounced 300ms */}
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search students by name or email…"
              className="pl-9 pr-9 h-9 text-xs"
            />
            {searchQuery && (
              <button
                onClick={() => { setSearchQuery(""); setPage(0); onFetchPage({ search: "", statusFilter, scoreFilter, sortCol, sortDir, page: 0 }) }}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1 transition-colors"
                title="Clear search"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("gap-2 w-full", activeFilterCount > 0 && "border-primary bg-primary/5 text-primary")}>
                  <Filter className="h-3.5 w-3.5" />
                  <span className="inline">Filters</span>
                  {activeFilterCount > 0 && (
                    <Badge variant="default" className="ml-0.5 h-4 min-w-4 px-1 text-[10px] bg-primary text-primary-foreground">
                      {activeFilterCount}
                    </Badge>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-[280px] p-4">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground px-1">General</p>
                    <Select value={statusFilter} onValueChange={(v) => handleFilterChange({ statusFilter: v as any })}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="All Statuses" />
                      </SelectTrigger>
                      <SelectContent position="popper" className="w-(--radix-select-trigger-width)">
                        <SelectItem value="all">All Statuses</SelectItem>
                        <SelectItem value="submitted">Submitted & Auto</SelectItem>
                        <SelectItem value="in_progress">In Progress</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground px-1">Performance</p>
                    <Select value={scoreFilter} onValueChange={(v) => handleFilterChange({ scoreFilter: v as any })}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="All Scores" />
                      </SelectTrigger>
                      <SelectContent position="popper" className="w-(--radix-select-trigger-width)">
                        <SelectItem value="all">All Scores</SelectItem>
                        <SelectItem value="high">High (≥75%)</SelectItem>
                        <SelectItem value="mid">Mid (50–74%)</SelectItem>
                        <SelectItem value="low">Low (&lt;50%)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <Button variant="outline" className="w-full" onClick={clearFilters}>
                    Reset all filters
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {/* Active filter chips */}
        {activeFilterCount > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-border/40 mt-1">
            <span className="text-[10px] text-muted-foreground mr-1 flex items-center gap-1 font-medium">
              Active:
            </span>
            {searchQuery.trim() && (
              <Badge variant="secondary" className="gap-1 h-5 px-1.5 text-[10px] font-normal rounded-full">
                "{searchQuery.trim()}"
                <X className="h-2.5 w-2.5 cursor-pointer hover:text-foreground" onClick={() => { setSearchQuery(""); setPage(0); onFetchPage({ search: "", statusFilter, scoreFilter, sortCol, sortDir, page: 0 }) }} />
              </Badge>
            )}
            {statusFilter !== "all" && (
              <Badge variant="secondary" className="gap-1 h-5 px-1.5 text-[10px] font-normal rounded-full">
                {statusFilter === "submitted" ? "Submitted" : "In Progress"}
                <X className="h-2.5 w-2.5 cursor-pointer hover:text-foreground" onClick={() => handleFilterChange({ statusFilter: "all" })} />
              </Badge>
            )}
            {scoreFilter !== "all" && (
              <Badge variant="secondary" className="gap-1 h-5 px-1.5 text-[10px] font-normal rounded-full">
                {scoreFilter === "high" ? "≥75%" : scoreFilter === "mid" ? "50–74%" : "<50%"}
                <X className="h-2.5 w-2.5 cursor-pointer hover:text-foreground" onClick={() => handleFilterChange({ scoreFilter: "all" })} />
              </Badge>
            )}
            <button
              onClick={clearFilters}
              className="ml-auto text-[10px] text-muted-foreground hover:text-primary underline-offset-2 hover:underline transition-colors px-1"
            >
              Clear all
            </button>
          </div>
        )}
      </div>

      {/* Score visibility banner */}
      <div
        className={cn(
          "flex items-center justify-between rounded-lg border px-3 py-2 text-xs transition-colors",
          scoresVisible
            ? "border-emerald-200 bg-emerald-50/60 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/20 dark:text-emerald-400"
            : "border-border bg-muted/30 text-muted-foreground"
        )}
      >
        <div className="flex items-center gap-2">
          {scoresVisible ? (
            <Eye className="h-3.5 w-3.5 shrink-0" />
          ) : (
            <EyeOff className="h-3.5 w-3.5 shrink-0" />
          )}
          <span>{scoresVisible ? "Scores visible" : "Scores hidden"}</span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-xs"
            onClick={() => setScoresVisible((v) => !v)}
          >
            {scoresVisible ? "Hide" : "Show Scores"}
          </Button>

          <Separator orientation="vertical" className="h-4 md:hidden" />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-6 px-2 text-xs md:hidden flex items-center gap-1.5">
                Sort <ArrowUpDown className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuItem onClick={() => handleSort("student_name")}>Name {sortCol === "student_name" && (sortDir === "asc" ? "↑" : "↓")}</DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleSort("score")}>Score {sortCol === "score" && (sortDir === "asc" ? "↑" : "↓")}</DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleSort("time")}>Time spent {sortCol === "time" && (sortDir === "asc" ? "↑" : "↓")}</DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleSort("started")}>Started at {sortCol === "started" && (sortDir === "asc" ? "↑" : "↓")}</DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleSort("submitted")}>Submitted at {sortCol === "submitted" && (sortDir === "asc" ? "↑" : "↓")}</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Mobile compact list */}
      <div className={cn("rounded-xl border overflow-hidden md:hidden", isLoadingPage && "opacity-60 pointer-events-none")}>
        {pageRows.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-12 text-center bg-muted/5">
            <Filter className="h-6 w-6 text-muted-foreground/50" />
            <div className="space-y-1">
              <p className="text-sm font-medium">No results match filters</p>
              <button onClick={clearFilters} className="text-xs text-primary hover:underline font-medium">
                Clear all filters
              </button>
            </div>
          </div>
        ) : (
          <Accordion type="single" collapsible className="divide-y divide-border/60">
            {pageRows.map((a) => (
              <MobileAttemptRow key={a.id} attempt={a} scoresVisible={scoresVisible} testId={test.id} onDelete={setAttemptToDelete} />
            ))}
          </Accordion>
        )}
      </div>


      {/* Desktop table */}
      <div className={cn("hidden overflow-hidden rounded-xl border md:block", isLoadingPage && "opacity-60 pointer-events-none")}>
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              <SortableHead label="Student" col="student_name" sortCol={sortCol} sortDir={sortDir} onSort={handleSort} />
              <SortableHead label="Education" col="education" sortCol={sortCol} sortDir={sortDir} onSort={handleSort} />
              <SortableHead label="Status" col="status" sortCol={sortCol} sortDir={sortDir} onSort={handleSort} />
              <SortableHead label="Score" col="score" align="right" sortCol={sortCol} sortDir={sortDir} onSort={handleSort} />
              <SortableHead label="Time" col="time" align="right" sortCol={sortCol} sortDir={sortDir} onSort={handleSort} />
              <SortableHead label="Violations" col="violations" align="center" sortCol={sortCol} sortDir={sortDir} onSort={handleSort} />
              <SortableHead label="Started" col="started" sortCol={sortCol} sortDir={sortDir} onSort={handleSort} />
              <SortableHead label="Submitted" col="submitted" sortCol={sortCol} sortDir={sortDir} onSort={handleSort} />
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {pageRows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="py-12 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <Filter className="h-5 w-5 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">No results match your filters.</p>
                    <button onClick={clearFilters} className="text-xs underline text-muted-foreground hover:text-foreground">
                      Clear filters
                    </button>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              pageRows.map((a) => (
                <DesktopAttemptRow key={a.id} attempt={a} scoresVisible={scoresVisible} testId={test.id} onDelete={setAttemptToDelete} />
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* ── Pagination controls ────────────────────────────────────────────── */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-1 text-xs text-muted-foreground">
          <span className="tabular-nums">
            Page {page + 1} of {totalPages}
            <span className="ml-1 text-muted-foreground/60">({totalCount} total)</span>
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              className="h-7 px-2 gap-1"
              disabled={page === 0 || isLoadingPage}
              onClick={() => goToPage(page - 1)}
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              Prev
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-7 px-2 gap-1"
              disabled={page >= totalPages - 1 || isLoadingPage}
              onClick={() => goToPage(page + 1)}
            >
              Next
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}

      <AlertDialog open={!!attemptToDelete} onOpenChange={(open) => !open && setAttemptToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete student attempt?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <span className="font-semibold text-foreground">{attemptToDelete?.student_name}</span>'s attempt? 
              This will permanently remove their score and all answers.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
              disabled={isDeleting}
              onClick={async (e) => {
                e.preventDefault()
                if (!attemptToDelete || !onDeleteAttempt) return
                setIsDeleting(true)
                try {
                  await onDeleteAttempt(attemptToDelete.id)
                  onDeleteSuccess?.(attemptToDelete.id)
                  toast.success("Attempt deleted successfully")
                  setAttemptToDelete(null)
                } catch (err: any) {
                  toast.error(err.message || "Failed to delete attempt")
                } finally {
                  setIsDeleting(false)
                }
              }}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting…
                </>
              ) : (
                "Delete Attempt"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}


// ─── Overview Tab ─────────────────────────────────────────────────────────────

function OverviewTab({
  test,
  onToggleResults,
  onTogglePublish,
  isToggleResultsLoading,
  isTogglePublishLoading,
  anyLoading,
}: {
  test: InstituteTestDetail
  onToggleResults: () => void
  onTogglePublish: () => void
  isToggleResultsLoading: boolean
  isTogglePublishLoading: boolean
  anyLoading: boolean
}) {
  const controls = [
    {
      title: "Visibility",
      description:
        test.status === "published"
          ? "Visible to students within the availability window."
          : "Draft mode — students cannot see this test.",
      active: test.status === "published",
      onAction: onTogglePublish,
      activeLabel: "Unpublish",
      inactiveLabel: "Publish",
      isLoading: isTogglePublishLoading,
    },
    {
      title: "Results",
      description: test.results_available
        ? "Students can see scores and question review."
        : "Scores remain hidden until you release results.",
      active: test.results_available,
      onAction: onToggleResults,
      activeLabel: "Hide Results",
      inactiveLabel: "Release Results",
      isLoading: isToggleResultsLoading,
    },
  ]

  return (
    <div className="space-y-4">
      <Card className="rounded-xl">
        <CardHeader>
          <CardTitle className="text-sm">Test Details</CardTitle>
          <CardDescription className="text-xs">Setup, content, and availability.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {test.description && (
            <p className="text-sm leading-relaxed text-muted-foreground">{test.description}</p>
          )}
          {test.instructions && (
            <div className="rounded-xl border bg-muted/30 p-4">
              <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <BookOpen className="h-3.5 w-3.5" />
                Instructions
              </p>
              <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
                {test.instructions}
              </p>
            </div>
          )}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <MetaItem
              icon={<Clock className="h-3.5 w-3.5" />}
              label="Duration"
              value={formatDuration(test.time_limit_seconds)}
            />
            <MetaItem
              icon={<ListChecks className="h-3.5 w-3.5" />}
              label="Questions"
              value={`${test.questions.length} questions · ${test.questions.reduce((s, q) => s + q.marks, 0)} pts`}
            />
            {test.available_from && (
              <MetaItem
                icon={<CalendarClock className="h-3.5 w-3.5" />}
                label="Opens"
                value={formatDateTime(test.available_from)}
              />
            )}
            {test.available_until && (
              <MetaItem
                icon={<CalendarX className="h-3.5 w-3.5" />}
                label="Closes"
                value={formatDateTime(test.available_until)}
              />
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-xl">
        <CardHeader>
          <CardTitle className="text-sm">Controls</CardTitle>
          <CardDescription className="text-xs">Manage visibility and result release.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {controls.map(
            ({ title, description, active, onAction, activeLabel, inactiveLabel, isLoading }, i) => (
              <div key={title}>
                {i > 0 && <Separator className="mb-4" />}
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground">{title}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onAction}
                    disabled={anyLoading}
                    className="w-full shrink-0 sm:w-auto"
                  >
                    {isLoading ? (
                      <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                    ) : active ? (
                      <EyeOff className="mr-1.5 h-3.5 w-3.5" />
                    ) : (
                      <Eye className="mr-1.5 h-3.5 w-3.5" />
                    )}
                    {isLoading ? "Saving…" : active ? activeLabel : inactiveLabel}
                  </Button>
                </div>
              </div>
            )
          )}
        </CardContent>
      </Card>
    </div>
  )
}


// ─── Page ─────────────────────────────────────────────────────────────────────

// ─── Query params type for paged fetches ──────────────────────────────────────

interface AttemptQueryParams {
  search: string
  statusFilter: "all" | "submitted" | "in_progress"
  scoreFilter: "all" | "high" | "mid" | "low"
  sortCol: SortColumn
  sortDir: "asc" | "desc"
  page: number
}


// ─── Supabase query builder ───────────────────────────────────────────────────

function buildAttemptsQuery(
  supabase: ReturnType<typeof createClient>,
  testId: string,
  params: Omit<AttemptQueryParams, "page"> & { range?: [number, number] }
) {
  const dbCol = SORT_COL_MAP[params.sortCol]
  // For "submitted" sort column we need to handle nulls for in-progress rows.
  // Use submitted_at primarily and fall back to started_at via coalesce — but
  // the view doesn't support coalesce in .order(), so we sort by submitted_at
  // and let nulls float (Postgres puts NULLs last with NULLS LAST by default).
  let q = (supabase as any)
    .from("view_test_results_detailed")
    .select(
      "attempt_id, student_name, student_email, branch, passout_year, tab_switch_count, status, score, total_marks, percentage, time_spent_seconds, started_at, submitted_at",
      params.range ? undefined : { count: "exact" }
    )
    .eq("test_id", testId)
    .not("attempt_id", "is", null)
    .not("started_at", "is", null)

  // Status filter
  if (params.statusFilter === "submitted") {
    q = q.in("status", ["submitted", "auto_submitted"])
  } else if (params.statusFilter === "in_progress") {
    q = q.eq("status", "in_progress")
  }

  // Score filter (only meaningful for submitted rows)
  if (params.scoreFilter === "high") q = q.gte("percentage", 75)
  else if (params.scoreFilter === "mid") q = q.gte("percentage", 50).lt("percentage", 75)
  else if (params.scoreFilter === "low") q = q.lt("percentage", 50)

  // Search (name or email ILIKE)
  if (params.search) {
    q = q.or(`student_name.ilike.%${params.search}%,student_email.ilike.%${params.search}%`)
  }

  // Sort
  const nullsFirst = params.sortDir === "asc"
  q = q.order(dbCol, { ascending: params.sortDir === "asc", nullsFirst })
  // Always secondary-sort by started_at for stable ordering
  if (dbCol !== "started_at") {
    q = q.order("started_at", { ascending: false })
  }

  // Pagination range
  if (params.range) {
    q = q.range(params.range[0], params.range[1])
  }

  return q
}

function mapRawAttempt(a: any): InstituteAttemptRow {
  return {
    id: a.attempt_id,
    student_name: a.student_name ?? null,
    student_email: a.student_email ?? null,
    status: a.status as InstituteAttemptRow["status"],
    score: a.score ?? null,
    total_marks: a.total_marks ?? null,
    percentage: a.percentage ?? null,
    time_spent_seconds: a.time_spent_seconds ?? null,
    started_at: a.started_at,
    submitted_at: a.submitted_at ?? null,
    tab_switch_count: a.tab_switch_count ?? null,
    branch: a.branch ?? null,
    passout_year: a.passout_year ?? null,
  }
}


// ─── Page component ───────────────────────────────────────────────────────────

interface Props {
  testId: string
  test: InstituteTestDetail
  serverNow: string
  onToggleResults?: () => Promise<void>
  onTogglePublish?: () => Promise<void>
  onDeleteTest?: () => Promise<void>
  onDeleteAttempt?: (attemptId: string) => Promise<void>
}

export function InstituteTestDetailClient({
  testId,
  test,
  serverNow,
  onToggleResults,
  onTogglePublish,
  onDeleteTest,
  onDeleteAttempt,
}: Props) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState("overview")
  const { run, isLoading, anyLoading } = useActionState()

  const totalMarks = useMemo(() => test.questions.reduce((s, q) => s + q.marks, 0), [test.questions])

  // Calculate server time offset
  const serverTimeOffset = useMemo(() => {
    return new Date(serverNow).getTime() - Date.now()
  }, [serverNow])

  const getNowOnServer = useCallback(() => {
    return new Date(Date.now() + serverTimeOffset)
  }, [serverTimeOffset])

  // ── Paginated attempts state ────────────────────────────────────────────
  const [pageRows, setPageRows] = useState<InstituteAttemptRow[]>(test.attempts)
  const [totalCount, setTotalCount] = useState(test.attemptStats.total)
  const [liveStats, setLiveStats] = useState<AttemptPageStats>(test.attemptStats)
  const channelRef = useRef<ReturnType<ReturnType<typeof createClient>["channel"]> | null>(null)

  // Tracks the most recent query params so Realtime refresh re-fetches the same view
  const lastParamsRef = useRef<AttemptQueryParams>({
    search: "",
    statusFilter: "all",
    scoreFilter: "all",
    sortCol: "submitted",
    sortDir: "desc",
    page: 0,
  })

  // Fetch one page of attempts and update count
  const handleFetchPage = useCallback(async (params: AttemptQueryParams) => {
    lastParamsRef.current = params
    const supabase = createClient()
    const from = params.page * ATTEMPTS_PAGE_SIZE
    const to = from + ATTEMPTS_PAGE_SIZE - 1

    const { data, count, error } = await buildAttemptsQuery(supabase, testId, {
      ...params,
      range: [from, to],
    })

    if (error || !data) return
    setPageRows(data.map(mapRawAttempt))
    if (count != null) setTotalCount(count)
  }, [testId])

  // Fetch aggregate stats independently (runs after Realtime events)
  const refreshStats = useCallback(async () => {
    const supabase = createClient()
    const { data: statsData, count } = await (supabase as any)
      .from("view_test_results_detailed")
      .select("status, percentage, score, total_marks", { count: "exact" })
      .eq("test_id", testId)
      .not("attempt_id", "is", null)

    if (!statsData) return
    const allRows: any[] = statsData
    const total = count ?? allRows.length
    const submittedRows = allRows.filter((a: any) => a.status === "submitted" || a.status === "auto_submitted")
    const inProgressCount = allRows.filter((a: any) => a.status === "in_progress").length
    const avgPct = submittedRows.length > 0
      ? submittedRows.reduce((sum: number, a: any) => {
          if (a.percentage != null) return sum + a.percentage
          if (a.score != null && a.total_marks != null && a.total_marks > 0) return sum + (a.score / a.total_marks) * 100
          return sum
        }, 0) / submittedRows.length
      : null
    setLiveStats({ total, submitted: submittedRows.length, in_progress: inProgressCount, avg_pct: avgPct })
  }, [testId])

  // Fetch all rows for export (no pagination, respects current filters/sort)
  const handleFetchAllForExport = useCallback(async (
    params: Omit<AttemptQueryParams, "page">
  ): Promise<InstituteAttemptRow[]> => {
    const supabase = createClient()
    const { data, error } = await buildAttemptsQuery(supabase, testId, params)
    if (error || !data) return []
    return data.map(mapRawAttempt)
  }, [testId])

  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel(`test-attempts:${testId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "test_attempts",
          filter: `test_id=eq.${testId}`,
        },
        () => {
          if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current)
          refreshTimerRef.current = setTimeout(() => {
            // Refresh current page view + aggregate stats
            handleFetchPage(lastParamsRef.current)
            refreshStats()
            refreshTimerRef.current = null
          }, 2000)
        }
      )
      .subscribe()

    channelRef.current = channel

    return () => {
      supabase.removeChannel(channel)
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current)
    }
  }, [testId, handleFetchPage, refreshStats])

  return (
    <div className="flex flex-col gap-6 px-4 py-8 md:px-8">

        {/* ── Page Header ─────────────────────────────────────────────────── */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex flex-col gap-1.5 min-w-0">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <h1 className="text-3xl font-bold font-cirka tracking-tight text-foreground">
                {test.title}
              </h1>
              <Badge
                variant={test.status === "published" ? "default" : "secondary"}
                className="text-xs"
              >
                {test.status === "published" ? "Published" : "Draft"}
              </Badge>
              {test.results_available && (
                <Badge variant="secondary" className="text-xs">
                  Results Live
                </Badge>
              )}
            </div>
            {test.institute_name && (
              <p className="text-sm text-muted-foreground">
                Published by {test.institute_name}
              </p>
            )}
            {test.description && (
              <p className="max-w-2xl text-sm text-muted-foreground line-clamp-2">
                {test.description}
              </p>
            )}
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="w-full gap-1.5 sm:w-auto"
                disabled={anyLoading}
              >
                {anyLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <MoreHorizontal className="h-4 w-4" />
                )}
                Actions
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem
                onClick={() => router.push(`/~/tests/${test.id}/edit`)}
                disabled={anyLoading}
              >
                <Pencil className="mr-2 h-3.5 w-3.5" />
                Edit Test
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              <DropdownMenuItem
                onClick={() => run("togglePublish", onTogglePublish)}
                disabled={anyLoading}
              >
                {isLoading("togglePublish") ? (
                  <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                ) : test.status === "published" ? (
                  <EyeOff className="mr-2 h-3.5 w-3.5" />
                ) : (
                  <Eye className="mr-2 h-3.5 w-3.5" />
                )}
                {isLoading("togglePublish")
                  ? "Saving…"
                  : test.status === "published"
                    ? "Unpublish"
                    : "Publish"}
              </DropdownMenuItem>

              <DropdownMenuItem
                onClick={() => run("toggleResults", onToggleResults)}
                disabled={anyLoading}
              >
                {isLoading("toggleResults") ? (
                  <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                ) : test.results_available ? (
                  <EyeOff className="mr-2 h-3.5 w-3.5" />
                ) : (
                  <Eye className="mr-2 h-3.5 w-3.5" />
                )}
                {isLoading("toggleResults")
                  ? "Saving…"
                  : test.results_available
                    ? "Hide Results"
                    : "Release Results"}
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <DropdownMenuItem
                    variant="destructive"
                    onSelect={(e) => e.preventDefault()}
                    disabled={anyLoading}
                  >
                    <Trash2 className="mr-2 h-3.5 w-3.5" />
                    Delete Test
                  </DropdownMenuItem>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete "{test.title}"?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This permanently deletes the test, all questions, and all student
                      attempts. This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel disabled={isLoading("deleteTest")}>
                      Cancel
                    </AlertDialogCancel>
                    <AlertDialogAction
                      variant="destructive"
                      disabled={isLoading("deleteTest")}
                      onClick={(e) => {
                        e.preventDefault()
                        run("deleteTest", async () => {
                          await onDeleteTest?.()
                          toast.success("Test deleted successfully")
                        })
                      }}
                    >
                      {isLoading("deleteTest") ? (
                        <>
                          <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                          Deleting…
                        </>
                      ) : (
                        "Delete permanently"
                      )}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* ── Stats ───────────────────────────────────────────────────────── */}
        <StatsBar test={test} stats={liveStats} totalMarks={totalMarks} />

        {/* ── Tabs ────────────────────────────────────────────────────────── */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <div className="overflow-x-auto">
            <TabsList className="inline-flex h-9 gap-0.5 rounded-lg bg-muted p-1">
              {[
                { value: "overview", label: "Overview", icon: <Info className="h-3.5 w-3.5" />, count: null },
                { value: "questions", label: "Questions", icon: <ListChecks className="h-3.5 w-3.5" />, count: test.questions.length },
                { value: "attempts", label: "Attempts", icon: <Users className="h-3.5 w-3.5" />, count: liveStats.total },
              ].map(({ value, label, icon, count }) => (
                <TabsTrigger
                  key={value}
                  value={value}
                  className="gap-1.5 rounded-md px-3 text-xs font-medium data-[state=active]:bg-background data-[state=active]:shadow-sm"
                >
                  {icon}
                  <span>{label}</span>
                  {count != null && count > 0 && (
                    <span
                      className={cn(
                        "inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-semibold tabular-nums",
                        activeTab === value
                          ? "bg-foreground text-background"
                          : "bg-muted-foreground/20 text-muted-foreground"
                      )}
                    >
                      {count}
                    </span>
                  )}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          <TabsContent value="overview" className="m-0">
            <OverviewTab
              test={test}
              onToggleResults={() => run("toggleResults", async () => {
                await onToggleResults?.()
                toast.success(`Results are now ${!test.results_available ? "visible" : "hidden"} to candidates`)
              })}
              onTogglePublish={() => run("togglePublish", async () => {
                await onTogglePublish?.()
                toast.success(`Test is now ${test.status === "draft" ? "published" : "drafted"}`)
              })}
              isToggleResultsLoading={isLoading("toggleResults")}
              isTogglePublishLoading={isLoading("togglePublish")}
              anyLoading={anyLoading}
            />
          </TabsContent>

          <TabsContent value="questions" className="m-0">
            <QuestionsTab questions={test.questions} />
          </TabsContent>

          <TabsContent value="attempts" className="m-0">
            <AttemptsTab 
              test={test}
              pageRows={pageRows}
              totalCount={totalCount}
              stats={liveStats}
              totalMarks={totalMarks}
              getNowOnServer={getNowOnServer}
              onDeleteAttempt={onDeleteAttempt}
              onDeleteSuccess={(id) => {
                setPageRows((prev) => prev.filter((a) => a.id !== id))
                setLiveStats((prev) => ({
                  ...prev,
                  total: Math.max(0, prev.total - 1),
                  submitted: prev.submitted > 0 ? prev.submitted - 1 : 0,
                }))
                setTotalCount((c) => Math.max(0, c - 1))
              }}
              onFetchPage={handleFetchPage}
              onFetchStats={refreshStats}
              onFetchAllForExport={handleFetchAllForExport}
            />
          </TabsContent>
        </Tabs>
      </div>
  )
}