"use client"

// ─────────────────────────────────────────────────────────────────────────────
// app/tests/[testId]/result/[attemptId]/TestResultClient.tsx
// ─────────────────────────────────────────────────────────────────────────────

import { type ReactNode, useMemo, useCallback, useEffect, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardAction } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import {
  Alert,
  AlertTitle,
  AlertDescription,
} from "@/components/ui/alert"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  EyeOff,
  Clock,
  Check,
  X,
  CalendarClock,
  AlertCircle,
  Lock,
  Timer,
  CalendarX,
  Sparkles,
  Loader2,
  Lightbulb,
  BookOpen,
  Target,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { InlineRichText } from "@/components/others/rich-text"
import type {
  CandidateTestDetail,
  CandidateAttemptDetail,
  CandidateAnswerDetail,
  CandidateOption,
} from "../../_types"
import { formatDuration, formatDateTime, formatSeconds, resolvePct } from "../../_types"
import {
  generateConceptualFeedbackAction,
  type DiagnosticResultPayload,
  type QuestionDiagnosis,
} from "./actions"



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


// ─── Option Item ──────────────────────────────────────────────────────────────

// ─── Option Item ──────────────────────────────────────────────────────────────

function OptionItem({
  opt,
  isSelected,
  isInProgress = false,
}: {
  opt: CandidateOption
  isSelected: boolean
  isInProgress?: boolean
}) {
  if (isInProgress) {
    if (isSelected) {
      return (
        <div className="flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50/50 dark:border-blue-900/50 dark:bg-blue-950/20 px-3 py-3">
          <Check className="mt-0.5 h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400" />
          <div className="flex flex-col gap-1.5 flex-1 min-w-0">
            <span className="text-sm leading-snug break-words text-foreground font-medium">
              <InlineRichText>{opt.option_text}</InlineRichText>
            </span>
            <span className="text-[10px] font-medium uppercase tracking-wide text-blue-600 dark:text-blue-400">
              Selected Answer
            </span>
          </div>
        </div>
      )
    }
    return (
      <div className="flex items-start gap-3 rounded-xl border border-border bg-card px-3 py-3">
        <div className="mt-0.5 h-3.5 w-3.5 shrink-0 rounded-full border border-muted-foreground/30" />
        <div className="flex flex-col gap-1.5 flex-1 min-w-0">
          <span className="text-sm leading-snug break-words text-muted-foreground">
            <InlineRichText>{opt.option_text}</InlineRichText>
          </span>
        </div>
      </div>
    )
  }

  const isCorrect = opt.is_correct === true

  let containerClass = "border-border"
  let textClass = "text-muted-foreground"
  let Icon: ReactNode = (
    <div className="mt-0.5 h-3.5 w-3.5 shrink-0 rounded-full border border-muted-foreground/30" />
  )
  let label: ReactNode = null

  if (isCorrect && isSelected) {
    containerClass = "border-emerald-200 bg-emerald-50/50 dark:border-emerald-900/50 dark:bg-emerald-950/20"
    textClass = "text-foreground font-medium"
    Icon = <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-500" />
    label = (
      <span className="text-[10px] font-medium uppercase tracking-wide text-emerald-600 dark:text-emerald-500">
        Your Answer · Correct
      </span>
    )
  } else if (isCorrect && !isSelected) {
    containerClass = "border-border bg-muted/30"
    textClass = "text-foreground"
    Icon = <Check className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
    label = (
      <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        Correct Answer
      </span>
    )
  } else if (!isCorrect && isSelected) {
    containerClass = "border-destructive/20 bg-destructive/5"
    textClass = "text-foreground"
    Icon = <X className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
    label = (
      <span className="text-[10px] font-medium uppercase tracking-wide text-destructive">
        Your Answer · Incorrect
      </span>
    )
  }

  return (
    <div className={cn("flex items-start gap-3 rounded-xl border px-3 py-3", containerClass)}>
      {Icon}
      <div className="flex flex-col gap-1.5 flex-1 min-w-0">
        <span className={cn("text-sm leading-snug break-words", textClass)}><InlineRichText>{opt.option_text}</InlineRichText></span>
        {label}
      </div>
    </div>
  )
}


// ─── Question Review Item ─────────────────────────────────────────────────────

function QuestionReviewItem({
  answer,
  sections,
  index,
  isInProgress = false,
  qDiagnosis,
}: {
  answer: CandidateAnswerDetail
  sections?: Array<{ id: string; name: string }>
  index: number
  isInProgress?: boolean
  qDiagnosis?: QuestionDiagnosis
}) {
  const isSkipped = (answer.selected_option_ids ?? []).length === 0
  const isOptionMatchCorrect = (() => {
    if (answer.is_correct != null) return answer.is_correct === true
    const correctOptionIds = (answer.options ?? []).filter((o) => o.is_correct === true).map((o) => o.id).sort()
    const selectedOptionIds = [...(answer.selected_option_ids ?? [])].sort()
    return correctOptionIds.length > 0 && JSON.stringify(correctOptionIds) === JSON.stringify(selectedOptionIds)
  })()
  const isCorrect = answer.is_correct === true || isOptionMatchCorrect
  const sectionName = sections && answer.section_id
    ? sections.find((s) => s.id === answer.section_id)?.name
    : null

  return (
    <AccordionItem
      value={answer.question_id}
      className="overflow-hidden rounded-xl border bg-card transition-colors data-[state=open]:bg-muted/10"
    >
      <AccordionTrigger className="px-4 py-3 text-left hover:no-underline">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <span className="mt-px flex h-5 w-6 shrink-0 items-center justify-center rounded-md bg-muted text-[11px] font-bold tabular-nums text-muted-foreground">
            {index + 1}
          </span>
          <div className="min-w-0 flex-1">
            <p className="line-clamp-2 text-sm font-medium leading-relaxed text-foreground">
              <InlineRichText>{answer.question_text}</InlineRichText>
            </p>
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
              {isSkipped ? (
                <Badge variant="outline" className="h-4 px-1.5 text-[10px] font-normal text-muted-foreground">
                  Skipped
                </Badge>
              ) : isInProgress ? (
                <Badge
                  variant="secondary"
                  className="h-4 border border-blue-200 bg-blue-50/50 text-blue-700 dark:border-blue-900 dark:bg-blue-950/20 dark:text-blue-300 px-1.5 text-[10px] font-normal"
                >
                  Answer Recorded
                </Badge>
              ) : (
                <Badge
                  variant="secondary"
                  className={cn(
                    "h-4 border bg-transparent px-1.5 text-[10px] font-normal",
                    isCorrect
                      ? "border-emerald-200 text-emerald-600 dark:border-emerald-900 dark:text-emerald-400"
                      : (answer.marks_awarded ?? 0) > 0
                        ? "border-amber-200 text-amber-600 dark:border-amber-900 dark:text-amber-400"
                        : "border-destructive/20 text-destructive"
                  )}
                >
                  {isCorrect
                    ? "Correct"
                    : (answer.marks_awarded ?? 0) > 0
                      ? "Partially Correct"
                      : "Incorrect"} · {answer.marks_awarded ?? 0}/
                  {answer.marks} pts
                </Badge>
              )}
              {answer.time_spent_seconds != null && answer.time_spent_seconds > 0 && (
                <Badge variant="outline" className="h-4 gap-1 border bg-transparent px-1.5 text-[10px] font-normal text-muted-foreground">
                  <Timer className="h-3 w-3 shrink-0" />
                  {formatSeconds(answer.time_spent_seconds)}
                </Badge>
              )}
              {qDiagnosis && !isInProgress && (
                <Badge variant="outline" className="h-4 gap-1 border-purple-500/30 bg-purple-500/10 text-purple-600 dark:text-purple-400 px-1.5 text-[10px] font-normal">
                  <Sparkles className="h-2.5 w-2.5 shrink-0 text-purple-500" />
                  Trixy AI Analysis
                </Badge>
              )}
            </div>
          </div>
        </div>
      </AccordionTrigger>

      <AccordionContent className="px-4 pb-4 pt-0">
        <Separator className="mb-3" />
        <div className="space-y-2.5">
          {(answer.options ?? []).map((opt) => (
            <OptionItem
              key={opt.id}
              opt={opt}
              isSelected={(answer.selected_option_ids ?? []).includes(opt.id)}
              isInProgress={isInProgress}
            />
          ))}
        </div>

        {/* ── AI Conceptual Breakdown (Single Unified Response) ─────────────────────────────── */}
        {qDiagnosis && !isInProgress && (
          <div className="mt-3.5 rounded-xl border border-purple-500/20 bg-purple-500/5 p-3.5 space-y-2">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-purple-600 dark:text-purple-400 uppercase tracking-wider">
              <Sparkles className="h-3.5 w-3.5 text-purple-500 shrink-0" />
              <span>Trixy AI Analysis</span>
            </div>

            <div className="text-xs text-foreground leading-relaxed">
              <p>
                <InlineRichText>
                  {qDiagnosis.analysis ||
                    [qDiagnosis.conceptual_flaw_summary, qDiagnosis.why_choice_was_wrong, qDiagnosis.correct_concept_explanation]
                      .filter(Boolean)
                      .join(" ")}
                </InlineRichText>
              </p>
            </div>
          </div>
        )}

        {((answer.tags ?? []).length > 0 || (answer.explanation && !isInProgress)) && (
          <div className="mt-4 space-y-3 rounded-xl border bg-muted/40 p-3">
            {answer.explanation && !isInProgress && (
              <div className="flex items-start gap-2.5">
                <Lightbulb className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <p className="text-xs leading-relaxed text-muted-foreground">
                  <InlineRichText>{answer.explanation}</InlineRichText>
                </p>
              </div>
            )}
            {(answer.tags ?? []).length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {answer.tags.map((t) => (
                  <Badge key={t.id} variant="secondary" className="h-4 px-1.5 text-[10px] font-normal">
                    {t.name}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        )}
      </AccordionContent>
    </AccordionItem>
  )
}


// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  test: CandidateTestDetail
  attempt: CandidateAttemptDetail
  accountType: "institute_candidate" | "institute" | "recruiter"
  serverNow: string
}

export function TestResultClient({ test, attempt, accountType, serverNow }: Props) {
  // ── Server Time Sync ───────────────────────────────────────────────────────
  const serverTimeOffset = useMemo(() => {
    return new Date(serverNow).getTime() - Date.now()
  }, [serverNow])

  const getNowOnServer = useCallback(() => {
    return new Date(Date.now() + serverTimeOffset)
  }, [serverTimeOffset])

  const nowMs = getNowOnServer().getTime()
  const isLive =
    (!test.available_from || new Date(test.available_from).getTime() <= nowMs) &&
    (!test.available_until || new Date(test.available_until).getTime() >= nowMs)
  const isExpired =
    !!test.available_until && new Date(test.available_until).getTime() < nowMs
  const isNotYetOpen =
    !!test.available_from && new Date(test.available_from).getTime() > nowMs

  const isInProgress = attempt.status === "in_progress"
  const pct = resolvePct(attempt.percentage, attempt.score, attempt.total_marks)
  const displayAnswers = attempt.answers ?? []

  const recordedCount = displayAnswers.filter((a) => (a.selected_option_ids ?? []).length > 0).length
  const correctCount = displayAnswers.filter((a) => a.is_correct === true).length
  const partialCount = displayAnswers.filter((a) => a.is_correct === false && (a.marks_awarded ?? 0) > 0).length
  const incorrectCount = displayAnswers.filter(
    (a) => a.is_correct === false && (a.marks_awarded ?? 0) <= 0 && (a.selected_option_ids ?? []).length > 0
  ).length
  const skippedCount = displayAnswers.filter((a) => (a.selected_option_ids ?? []).length === 0).length

  const pctColorClass =
    pct >= 75
      ? "text-emerald-600 dark:text-emerald-500"
      : pct >= 50
        ? "text-amber-600 dark:text-amber-500"
        : "text-destructive"

  // ── Trixy AI Conceptual Diagnostic State ─────────────────────────────────
  const [diagnostic, setDiagnostic] = useState<DiagnosticResultPayload | null>(attempt.ai_diagnosis ?? null)
  const [isGeneratingDiagnostic, setIsGeneratingDiagnostic] = useState(false)
  const [diagnosticError, setDiagnosticError] = useState<string | null>(null)
  const [isDepthModalOpen, setIsDepthModalOpen] = useState(false)

  const handleGenerateDiagnostic = useCallback(async (analysisType: "deep" | "general" = "deep") => {
    setIsGeneratingDiagnostic(true)
    setDiagnosticError(null)
    setIsDepthModalOpen(false)

    try {
      const res = await generateConceptualFeedbackAction({
        attemptId: attempt.id,
        testTitle: test.title,
        score: attempt.score,
        totalMarks: attempt.total_marks,
        percentage: pct,
        analysisType,
        answers: displayAnswers.map((a) => ({
          question_id: a.question_id,
          question_text: a.question_text,
          marks: a.marks,
          is_correct: a.is_correct,
          selected_option_ids: a.selected_option_ids ?? [],
          explanation: a.explanation,
          tags: a.tags,
          options: (a.options ?? []).map((o) => ({
            id: o.id,
            option_text: o.option_text,
            is_correct: o.is_correct,
          })),
        })),
      })

      if (res.error) {
        setDiagnosticError(res.error)
      } else {
        setDiagnostic(res)
      }
    } catch (err) {
      setDiagnosticError(err instanceof Error ? err.message : "Failed to generate Trixy AI diagnostic analysis.")
    } finally {
      setIsGeneratingDiagnostic(false)
    }
  }, [test.title, attempt.score, attempt.total_marks, pct, displayAnswers])

  const questionDiagnosisMap = useMemo(() => {
    const map = new Map<string, QuestionDiagnosis>()
    if (diagnostic?.question_diagnoses) {
      for (const qd of diagnostic.question_diagnoses) {
        map.set(qd.question_id, qd)
      }
    }
    return map
  }, [diagnostic])

  // ── Tag Performance Breakdown Calculation ───────────────────────────────
  type TagPerformanceItem = {
    tagName: string
    totalQuestions: number
    correctQuestions: number
    earnedMarks: number
    totalMarks: number
    percentage: number
    status: "Strong" | "Moderate" | "Needs Improvement"
  }

  const tagPerformanceList = useMemo(() => {
    if (isInProgress) return []
    const map = new Map<string, { totalQ: number; correctQ: number; earned: number; total: number }>()

    for (const answer of displayAnswers) {
      const tags = answer.tags ?? []
      if (tags.length === 0) continue

      const marks = answer.marks || 1
      const earned = answer.marks_awarded ?? (answer.is_correct ? marks : 0)
      const isCorr = answer.is_correct === true

      for (const tag of tags) {
        const existing = map.get(tag.name) || { totalQ: 0, correctQ: 0, earned: 0, total: 0 }
        existing.totalQ += 1
        if (isCorr) existing.correctQ += 1
        existing.earned += Math.max(0, earned)
        existing.total += marks
        map.set(tag.name, existing)
      }
    }

    const result: TagPerformanceItem[] = []
    for (const [tagName, data] of map.entries()) {
      const percentage = data.total > 0 ? (data.earned / data.total) * 100 : 0
      let status: TagPerformanceItem["status"] = "Needs Improvement"
      if (percentage >= 75) status = "Strong"
      else if (percentage >= 50) status = "Moderate"

      result.push({
        tagName,
        totalQuestions: data.totalQ,
        correctQuestions: data.correctQ,
        earnedMarks: data.earned,
        totalMarks: data.total,
        percentage,
        status,
      })
    }

    return result.sort((a, b) => a.percentage - b.percentage)
  }, [displayAnswers, isInProgress])

  const weakTags = useMemo(() => {
    return tagPerformanceList.filter((t) => t.percentage < 60)
  }, [tagPerformanceList])

  const sectionGroupMap = useMemo(() => {
    if (!displayAnswers || displayAnswers.length === 0) return []

    const secs = test.sections && test.sections.length > 0
      ? test.sections
      : [{ id: "default-section", name: "Section A", description: null, order_index: 0 }]

    const groups: Array<{
      section: { id: string; name: string; description: string | null; order_index: number }
      answers: Array<{ answer: CandidateAnswerDetail; index: number }>
      totalMarks: number
      earnedMarks: number
      correctCount: number
    }> = secs.map((sec) => ({
      section: sec,
      answers: [],
      totalMarks: 0,
      earnedMarks: 0,
      correctCount: 0,
    }))

    const defaultGroup = groups[0]

    displayAnswers.forEach((ans, globalIdx) => {
      let group = groups.find((g) => g.section.id === ans.section_id)
      if (!group) group = defaultGroup

      group.answers.push({ answer: ans, index: globalIdx })
      group.totalMarks += ans.marks ?? 0
      group.earnedMarks += ans.marks_awarded ?? 0
      if (ans.is_correct === true) {
        group.correctCount += 1
      }
    })

    return groups.filter((g) => g.answers.length > 0)
  }, [displayAnswers, test.sections])

  return (
    <div className="flex flex-col gap-6 px-4 py-8 md:px-8 pb-12 animate-in fade-in duration-500">

      {/* ── Page Header ────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-1.5 min-w-0">
        {test.institute_name && (
          <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground break-words leading-snug">
            {test.institute_name}
          </p>
        )}
        <div className="flex flex-wrap items-center gap-2 min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold font-cirka tracking-tight text-foreground break-words leading-tight">
            {test.title}
          </h1>
          {isInProgress ? (
            <Badge variant="secondary" className="h-5 gap-1 border border-blue-200/60 bg-blue-50 px-2 text-[10px] font-bold uppercase tracking-wider text-blue-700 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-400 shrink-0">
              <Clock className="h-3 w-3 animate-spin" />
              In Progress
            </Badge>
          ) : (
            <>
              {isExpired && (
                <Badge variant="secondary" className="h-5 gap-1 border bg-muted/30 px-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground shrink-0">
                  <CalendarX className="h-3 w-3" />
                  Closed
                </Badge>
              )}
              {isNotYetOpen && (
                <Badge variant="secondary" className="h-5 gap-1 border border-amber-200/50 bg-amber-50 px-2 text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:border-amber-900/50 dark:bg-amber-950/20 dark:text-amber-300 shrink-0">
                  <CalendarClock className="h-3 w-3" />
                  Upcoming
                </Badge>
              )}
            </>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
          {attempt.student_name && (
            <span className="font-medium text-foreground">
              {attempt.student_name}
            </span>
          )}
          {attempt.student_name && <Separator orientation="vertical" className="h-3 hidden sm:block" />}
          {test.description && (
            <p className="max-w-2xl line-clamp-1">
              {test.description}
            </p>
          )}
        </div>
      </div>

      {/* ── Results hidden ──────────────────────────────────────────────── */}
      {!test.results_available && accountType === "institute_candidate" ? (
        <Card className="rounded-xl p-0">
          <CardContent className="space-y-3 p-5">
            <div className="flex items-start gap-2">
              <Lock className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              <div>
                <p className="text-sm font-semibold text-foreground">Detailed Analysis Locked</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Recorded on {attempt.submitted_at ? formatDateTime(attempt.submitted_at) : "just now"}.
                </p>
              </div>
            </div>

            {test.marks_available ? (
              <div className="rounded-lg border bg-muted/20 p-4 space-y-2">
                <p className="text-xs font-semibold text-foreground">Your Released Score:</p>
                <div className="flex items-center gap-4 text-sm">
                  <span>Marks: <strong className="tabular-nums">{attempt.score ?? 0} / {attempt.total_marks ?? 0}</strong></span>
                  <span>Percentage: <strong className="tabular-nums">{attempt.percentage != null ? `${attempt.percentage.toFixed(2)}%` : "—"}</strong></span>
                </div>
                <p className="text-xs text-muted-foreground pt-1">
                  Detailed question analysis and answer keys are currently locked by the instructor. They will be visible once full results are released.
                </p>
              </div>
            ) : (
              <div className="flex items-start gap-2 pt-1">
                <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">
                  Scores and detailed answer analysis are currently hidden by the instructor. They will be visible once released.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <>
          {!test.results_available && (accountType === "institute" || accountType === "recruiter") && (
            <Alert className="mb-6">
              <EyeOff className="h-4 w-4" />
              <AlertTitle>Results Hidden from Candidates</AlertTitle>
              <AlertDescription>
                Instructors can see these results, but students cannot view their scores or answers yet.
              </AlertDescription>
            </Alert>
          )}

          {/* ── Score card ──────────────────────────────────────────────── */}
          <div className="rounded-xl border bg-card p-4 sm:p-5 space-y-4 min-w-0 overflow-hidden">

            {/* Top row: percentage / in progress + time badge */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 min-w-0">
              <div className="min-w-0">
                <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                  Score
                </p>
                {isInProgress ? (
                  <>
                    <p className="mt-1 text-2xl sm:text-3xl font-bold tracking-tight text-blue-600 dark:text-blue-400 break-words">
                      In Progress
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Test attempt is active. Final score will be calculated upon submission.
                    </p>
                  </>
                ) : (
                  <>
                    <p className={cn("mt-1 text-3xl sm:text-4xl font-bold tabular-nums tracking-tight break-words", pctColorClass)}>
                      {pct.toFixed(2)}%
                    </p>
                    {attempt.score != null && attempt.total_marks != null && (
                      <p className="mt-0.5 text-xs sm:text-sm tabular-nums text-muted-foreground">
                        {attempt.score} / {attempt.total_marks} pts
                      </p>
                    )}
                  </>
                )}
              </div>

              {(attempt.time_spent_seconds != null || attempt.actual_time_spent_seconds != null || attempt.tab_switch_count != null) && (
                <div className="flex flex-wrap items-center sm:items-end gap-2 shrink-0">
                  {attempt.time_spent_seconds != null && (
                    <div className="flex items-center gap-1.5 rounded-lg bg-muted/50 px-2.5 py-1.5 text-xs font-medium text-muted-foreground" title="Total active time spent on questions">
                      <Timer className="h-3.5 w-3.5 shrink-0 text-primary" />
                      <span>Active: <span className="tabular-nums font-semibold text-foreground">{formatSeconds(attempt.time_spent_seconds)}</span></span>
                    </div>
                  )}
                  {(attempt.actual_time_spent_seconds != null || (attempt.submitted_at && attempt.started_at)) && (
                    <div className="flex items-center gap-1.5 rounded-lg bg-muted/50 px-2.5 py-1.5 text-xs font-medium text-muted-foreground" title="Total duration from start to submission">
                      <Clock className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      <span>Total: <span className="tabular-nums font-semibold text-foreground">{formatSeconds(attempt.actual_time_spent_seconds ?? (attempt.submitted_at && attempt.started_at ? Math.max(0, Math.round((new Date(attempt.submitted_at).getTime() - new Date(attempt.started_at).getTime()) / 1000)) : null))}</span></span>
                    </div>
                  )}
                  {attempt.tab_switch_count != null && attempt.tab_switch_count > 0 && (
                    <div className="flex items-center gap-1.5 rounded-lg border-destructive/20 bg-destructive/10 px-2.5 py-1.5 text-[10px] font-semibold text-destructive max-w-full">
                      <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">{attempt.tab_switch_count} System Violation{attempt.tab_switch_count !== 1 && "s"}</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            <Separator />

            {/* Bottom row: recorded / skipped OR correct · partial · incorrect · skipped */}
            {isInProgress ? (
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs sm:text-sm">
                <span>
                  <span className="font-semibold tabular-nums text-blue-600 dark:text-blue-400">
                    {recordedCount}
                  </span>
                  <span className="ml-1 text-muted-foreground">recorded</span>
                </span>
                <Separator orientation="vertical" className="h-3.5 hidden sm:inline-block" />
                <span>
                  <span className="font-semibold tabular-nums text-muted-foreground">
                    {skippedCount}
                  </span>
                  <span className="ml-1 text-muted-foreground">skipped</span>
                </span>
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-x-3.5 gap-y-2 text-xs sm:text-sm">
                <span className="whitespace-nowrap">
                  <span className="font-semibold tabular-nums text-emerald-600 dark:text-emerald-500">
                    {correctCount}
                  </span>
                  <span className="ml-1 text-muted-foreground">correct</span>
                </span>
                <Separator orientation="vertical" className="h-3.5 hidden sm:inline-block" />
                <span className="whitespace-nowrap">
                  <span className="font-semibold tabular-nums text-amber-600 dark:text-amber-500">
                    {partialCount}
                  </span>
                  <span className="ml-1 text-muted-foreground">partial</span>
                </span>
                <Separator orientation="vertical" className="h-3.5 hidden sm:inline-block" />
                <span className="whitespace-nowrap">
                  <span className="font-semibold tabular-nums text-destructive">
                    {incorrectCount}
                  </span>
                  <span className="ml-1 text-muted-foreground">incorrect</span>
                </span>
                <Separator orientation="vertical" className="h-3.5 hidden sm:inline-block" />
                <span className="whitespace-nowrap">
                  <span className="font-semibold tabular-nums text-muted-foreground">
                    {skippedCount}
                  </span>
                  <span className="ml-1 text-muted-foreground">skipped</span>
                </span>
              </div>
            )}

          </div>

          {/* ── Trixy AI Conceptual Diagnostic Assistant ─────────────────── */}
          {!isInProgress && (
            <Card className="overflow-hidden">
              <CardHeader className="pb-4">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Sparkles className="size-4 text-purple-500 shrink-0" />
                  <span className="break-words">Trixy AI Conceptual Diagnostic Assistant</span>
                  <Badge variant="secondary" className="text-[10px] bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20">Maintenance</Badge>
                </CardTitle>
                <CardDescription className="text-xs">
                  AI diagnostic evaluation is temporarily undergoing maintenance for performance optimization.
                </CardDescription>
                <CardAction>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={true}
                    className="w-full sm:w-auto shrink-0 border-purple-500/30 opacity-70 cursor-not-allowed"
                  >
                    <Sparkles className="mr-1.5 size-4 text-purple-500" />
                    Temporarily Paused
                  </Button>
                </CardAction>
              </CardHeader>

              {isGeneratingDiagnostic && (
                <CardContent className="pt-0 pb-4">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground animate-pulse rounded-lg border border-purple-500/20 bg-purple-500/5 p-3">
                    <Loader2 className="h-4 w-4 animate-spin text-purple-500 shrink-0" />
                    <span>Trixy AI diagnostic evaluation is in progress. This process may take a few moments...</span>
                  </div>
                </CardContent>
              )}

              {diagnosticError && (
                <CardContent className="pt-0">
                  <Alert variant="destructive" className="py-2 text-xs">
                    <AlertCircle className="h-3.5 w-3.5" />
                    <AlertTitle className="text-xs">Diagnostic Failed</AlertTitle>
                    <AlertDescription className="text-xs">{diagnosticError}</AlertDescription>
                  </Alert>
                </CardContent>
              )}

              {diagnostic && (
                <CardContent className="space-y-4 pt-0">

                  {/* Overall Diagnosis */}
                  {diagnostic.overall_diagnosis && (
                    <div className="space-y-1">
                      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Overall Summary
                      </span>
                      <p className="text-xs text-foreground leading-relaxed">
                        <InlineRichText>{diagnostic.overall_diagnosis}</InlineRichText>
                      </p>
                    </div>
                  )}

                  {/* Strengths & Misconceptions grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {diagnostic.strengths && diagnostic.strengths.length > 0 && (
                      <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3 space-y-1.5">
                        <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
                          Strengths
                        </span>
                        <ul className="space-y-1 text-xs text-muted-foreground">
                          {diagnostic.strengths.map((s, idx) => (
                            <li key={idx} className="list-disc list-inside">
                              <InlineRichText>{s}</InlineRichText>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {diagnostic.key_misconceptions && diagnostic.key_misconceptions.length > 0 && (
                      <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-3 space-y-1.5">
                        <span className="text-xs font-semibold text-destructive uppercase tracking-wider">
                          Misconceptions
                        </span>
                        <ul className="space-y-1 text-xs text-muted-foreground">
                          {diagnostic.key_misconceptions.map((m, idx) => (
                            <li key={idx} className="list-disc list-inside">
                              <InlineRichText>{m}</InlineRichText>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  {/* Recommended Review Topics */}
                  {diagnostic.recommended_review_topics && diagnostic.recommended_review_topics.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      <span className="text-xs font-semibold text-muted-foreground mr-1">
                        Targeted Review Topics:
                      </span>
                      {diagnostic.recommended_review_topics.map((topic, idx) => (
                        <Badge key={idx} variant="secondary" className="text-[11px] font-normal">
                          {topic}
                        </Badge>
                      ))}
                    </div>
                  )}
                </CardContent>
              )}
            </Card>
          )}



          {/* ── Question Review Grouped Section-Wise ─────────────────────── */}
          {sectionGroupMap.length > 0 && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <h3 className="text-base font-semibold text-foreground">
                    Question & Section Review
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Review your answers, correct options, and detailed AI explanations section by section.
                  </p>
                </div>
                <Badge variant="outline" className="gap-1 text-xs">
                  <BookOpen className="h-3.5 w-3.5" />
                  {displayAnswers.length} Questions
                </Badge>
              </div>

              {sectionGroupMap.map(({ section, answers: secAnswers, totalMarks, earnedMarks, correctCount }) => (
                <div key={section.id} className="space-y-3 pt-2">
                  {/* Section Header Text */}
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-2">
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        {section.name}
                      </h4>
                      {section.description && (
                        <span className="text-xs text-muted-foreground/70 hidden sm:inline">
                          — {section.description}
                        </span>
                      )}
                    </div>

                    <span className="text-xs text-muted-foreground font-medium tabular-nums">
                      {correctCount}/{secAnswers.length} Correct
                      {!isInProgress && (earnedMarks !== correctCount || totalMarks !== secAnswers.length) && (
                        <span> ({earnedMarks}/{totalMarks} pts)</span>
                      )}
                    </span>
                  </div>

                  {/* Section Questions Accordion */}
                  <Accordion type="multiple" className="space-y-2">
                    {secAnswers.map(({ answer, index }) => (
                      <QuestionReviewItem
                        key={answer.question_id}
                        answer={answer}
                        sections={test.sections}
                        index={index}
                        isInProgress={isInProgress}
                        qDiagnosis={questionDiagnosisMap.get(answer.question_id)}
                      />
                    ))}
                  </Accordion>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ── Trixy AI Analysis Depth Modal ────────────────────────────── */}
      <Dialog open={isDepthModalOpen} onOpenChange={setIsDepthModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <Sparkles className="size-5 text-purple-500" />
              Trixy AI Diagnostic Analysis
            </DialogTitle>
            <DialogDescription className="text-xs">
              Choose the depth of diagnostic analysis for your test attempt.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-3 py-3">
            {/* Option 1: General Performance Overview */}
            <div
              onClick={() => handleGenerateDiagnostic("general")}
              className="group flex flex-col gap-1.5 rounded-xl border border-border p-4 transition-all hover:border-purple-500/50 hover:bg-purple-500/5 cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-semibold text-sm text-foreground group-hover:text-purple-600 dark:group-hover:text-purple-400">
                  <Target className="size-4 text-purple-500" />
                  General Performance Overview
                </div>
                <Badge variant="secondary" className="text-[10px] bg-purple-500/10 text-purple-600 dark:text-purple-400 border-none">
                  Fast
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Provides a high-level score synthesis, top 2-3 mastered concepts, key focus areas, and quick study takeaways. Suitable for quick reviews.
              </p>
            </div>

            {/* Option 2: Deep Per-Question Analysis */}
            <div
              onClick={() => handleGenerateDiagnostic("deep")}
              className="group flex flex-col gap-1.5 rounded-xl border border-border p-4 transition-all hover:border-purple-500/50 hover:bg-purple-500/5 cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-semibold text-sm text-foreground group-hover:text-purple-600 dark:group-hover:text-purple-400">
                  <Lightbulb className="size-4 text-purple-500" />
                  Deep Per-Question Analysis
                </div>
                <Badge variant="secondary" className="text-[10px] bg-purple-500/10 text-purple-600 dark:text-purple-400 border-none">
                  Comprehensive Evaluation
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                In-depth breakdown of every incorrect question, identifying cognitive distractor traps, conceptual flaws, and personalized step-by-step remediation.
              </p>
            </div>
          </div>

          <DialogFooter className="sm:justify-between">
            <Button variant="ghost" size="sm" onClick={() => setIsDepthModalOpen(false)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

