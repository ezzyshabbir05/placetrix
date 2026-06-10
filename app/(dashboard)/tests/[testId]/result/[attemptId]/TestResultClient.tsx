"use client"

// ─────────────────────────────────────────────────────────────────────────────
// app/tests/[testId]/result/[attemptId]/TestResultClient.tsx
// ─────────────────────────────────────────────────────────────────────────────

import { type ReactNode, useMemo, useCallback, useEffect } from "react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
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
  EyeOff,
  Clock,
  Check,
  X,
  CalendarClock,
  AlertCircle,
  RotateCcw,
  Lock,
  BookOpen,
  Timer,
  CalendarX,
  Lightbulb,
  ListChecks,
  Trophy,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { MathText } from "@/components/ui/math-text"
import type {
  CandidateTestDetail,
  CandidateAttemptDetail,
  CandidateAnswerDetail,
  CandidateOption,
} from "../../_types"
import { formatDuration, formatDateTime, formatSeconds, resolvePct } from "../../_types"



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

function OptionItem({ opt, isSelected }: { opt: CandidateOption; isSelected: boolean }) {
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
    const isPartial = (opt as any).marks_awarded > 0 // This logic is simplified for OptionItem
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
      <div className="flex flex-col gap-0.5">
        <span className={cn("text-sm leading-snug", textClass)}><MathText>{opt.option_text}</MathText></span>
        {label}
      </div>
    </div>
  )
}


// ─── Question Review Item ─────────────────────────────────────────────────────

function QuestionReviewItem({
  answer,
  index,
}: {
  answer: CandidateAnswerDetail
  index: number
}) {
  const isSkipped = (answer.selected_option_ids ?? []).length === 0
  const isCorrect = answer.is_correct === true

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
              <MathText>{answer.question_text}</MathText>
            </p>
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
              {isSkipped ? (
                <Badge variant="outline" className="h-4 px-1.5 text-[10px] font-normal text-muted-foreground">
                  Skipped
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
            />
          ))}
        </div>

        {((answer.tags ?? []).length > 0 || answer.explanation) && (
          <div className="mt-4 space-y-3 rounded-xl border bg-muted/40 p-3">
            {answer.explanation && (
              <div className="flex items-start gap-2.5">
                <Lightbulb className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <p className="text-xs leading-relaxed text-muted-foreground">
                  <MathText>{answer.explanation}</MathText>
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
  accountType: "candidate" | "institute" | "recruiter"
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

  const pct = resolvePct(attempt.percentage, attempt.score, attempt.total_marks)
  const displayAnswers = attempt.answers ?? []

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

  return (
    <div className="flex flex-col gap-6 px-4 py-8 md:px-8 pb-12 animate-in fade-in duration-500">

      {/* ── Page Header ────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-1.5">
        {test.institute_name && (
          <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
            {test.institute_name}
          </p>
        )}
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-3xl font-bold font-cirka tracking-tight text-foreground">
            {test.title}
          </h1>
          {isExpired && (
            <Badge variant="secondary" className="h-5 gap-1 border bg-muted/30 px-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              <CalendarX className="h-3 w-3" />
              Closed
            </Badge>
          )}
          {isLive && (
            <Badge variant="secondary" className="h-5 gap-1 border border-emerald-200/50 bg-emerald-50 px-2 text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400">
              <Clock className="h-3 w-3" />
              Live
            </Badge>
          )}
            {isNotYetOpen && (
              <Badge variant="secondary" className="h-5 gap-1 border border-amber-200/50 bg-amber-50 px-2 text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:border-amber-900/50 dark:bg-amber-950/20 dark:text-amber-300">
                <CalendarClock className="h-3 w-3" />
                Upcoming
              </Badge>
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
        {!test.results_available && accountType === "candidate" ? (
          <Card className="rounded-xl p-0">
            <CardContent className="space-y-2.5 p-5">
              <div className="flex items-start gap-2">
                <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <p className="text-sm font-medium text-foreground">Submitted Successfully</p>
              </div>
              <div className="flex items-start gap-2">
                <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">
                  Recorded on{" "}
                  {attempt.submitted_at ? formatDateTime(attempt.submitted_at) : "just now"}.
                  Results are currently hidden by the instructor.
                </p>
              </div>
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
            <div className="rounded-xl border bg-card p-5 space-y-4">

              {/* Top row: percentage + time badge */}
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                    Score
                  </p>
                  <p className={cn("mt-1 text-4xl font-bold tabular-nums tracking-tight", pctColorClass)}>
                    {pct.toFixed(2)}%
                  </p>
                  {attempt.score != null && attempt.total_marks != null && (
                    <p className="mt-0.5 text-sm tabular-nums text-muted-foreground">
                      {attempt.score} / {attempt.total_marks} pts
                    </p>
                  )}
                </div>

                {(attempt.time_spent_seconds != null || attempt.tab_switch_count != null) && (
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    {attempt.time_spent_seconds != null && (
                      <div className="flex items-center gap-1.5 rounded-lg bg-muted/50 px-2.5 py-1.5 text-xs font-medium text-muted-foreground">
                        <Timer className="h-3.5 w-3.5 shrink-0" />
                        <span className="tabular-nums">{formatSeconds(attempt.time_spent_seconds)}</span>
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

              {/* Bottom row: correct · incorrect · skipped */}
              <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-sm">
                <span>
                  <span className="font-semibold tabular-nums text-emerald-600 dark:text-emerald-500">
                    {correctCount}
                  </span>
                  <span className="ml-1 text-muted-foreground">correct</span>
                </span>
                <Separator orientation="vertical" className="h-3.5" />
                <span>
                  <span className="font-semibold tabular-nums text-amber-600 dark:text-amber-500">
                    {partialCount}
                  </span>
                  <span className="ml-1 text-muted-foreground">partial</span>
                </span>
                <Separator orientation="vertical" className="h-3.5" />
                <span>
                  <span className="font-semibold tabular-nums text-destructive">
                    {incorrectCount}
                  </span>
                  <span className="ml-1 text-muted-foreground">incorrect</span>
                </span>
                <Separator orientation="vertical" className="h-3.5" />
                <span>
                  <span className="font-semibold tabular-nums text-muted-foreground">
                    {skippedCount}
                  </span>
                  <span className="ml-1 text-muted-foreground">skipped</span>
                </span>
              </div>

            </div>

            {/* ── Question Review ──────────────────────────────────────────── */}
            {displayAnswers.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    <span className="font-medium text-foreground">{displayAnswers.length}</span>{" "}
                    question{displayAnswers.length !== 1 ? "s" : ""}
                  </p>
                  <Badge variant="outline" className="gap-1 text-xs">
                    <BookOpen className="h-3 w-3" />
                    Review
                  </Badge>
                </div>
                <Accordion type="multiple" className="space-y-2">
                  {displayAnswers.map((a, i) => (
                    <QuestionReviewItem key={a.question_id} answer={a} index={i} />
                  ))}
                </Accordion>
              </div>
            )}
          </>
        )}

      </div>
  )
}
