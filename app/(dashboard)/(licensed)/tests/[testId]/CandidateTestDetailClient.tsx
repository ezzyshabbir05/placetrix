"use client"

// ─────────────────────────────────────────────────────────────────────────────
// app/tests/[id]/CandidateTestDetailClient.tsx
// ─────────────────────────────────────────────────────────────────────────────

import { type ReactNode, useMemo, useCallback } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
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
} from "lucide-react"
import { cn } from "@/lib/utils"
import { MathText } from "@/components/ui/math-text"
import type {
  CandidateTestDetail,
  CandidateAttemptDetail,
  CandidateAnswerDetail,
  CandidateOption,
} from "./_types"
import { formatDuration, formatDateTime, formatSeconds, resolvePct } from "./_types"


// ─── Page Header ──────────────────────────────────────────────────────────────

function PageHeader({ test }: { test: CandidateTestDetail }) {
  return (
    <div className="flex flex-col gap-1.5">
      <h1 className="text-3xl font-bold font-cirka tracking-tight text-foreground">
        {test.title}
      </h1>
      {test.institute_name && (
        <p className="text-sm text-muted-foreground">
          Published by {test.institute_name}
        </p>
      )}
      {test.description && (
        <p className="mt-0.5 max-w-2xl text-sm text-muted-foreground">
          {test.description}
        </p>
      )}
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
        <span className={cn("text-sm leading-snug break-words", textClass)}><MathText>{opt.option_text}</MathText></span>
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
                      : "border-destructive/20 text-destructive"
                  )}
                >
                  {isCorrect ? "Correct" : "Incorrect"} · {answer.marks_awarded ?? 0}/
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


// ─── Page ─────────────────────────────────────────────────────────────────────

interface Props {
  test: CandidateTestDetail
  attempt: CandidateAttemptDetail | null
  serverNow: string
}

export function CandidateTestDetailClient({ test, attempt, serverNow }: Props) {
  const isInProgress = attempt?.status === "in_progress"
  const showIntro = !attempt || attempt.status === "in_progress" || ((test.completed_count ?? 0) < (test.max_attempts ?? 1))

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

  const totalMarks = test.questions?.reduce((s: number, q: { marks: number }) => s + q.marks, 0) ?? 0
  const questionCount = test.questions?.length ?? 0

  const pct =
    attempt?.score != null && attempt?.total_marks != null
      ? resolvePct(attempt.percentage, attempt.score, attempt.total_marks)
      : 0

  const pctColorClass =
    pct >= 75
      ? "text-emerald-600 dark:text-emerald-500"
      : pct >= 50
        ? "text-amber-600 dark:text-amber-500"
        : "text-destructive"


  // ── Pre-test / Intro view ──────────────────────────────────────────────────

  if (showIntro) {
    return (
      <div className="flex flex-col gap-6 px-4 py-8 md:px-8">

        {/* ── Page Header ──────────────────────────────────────────────── */}
        <PageHeader test={test} />

        {/* ── Meta grid ───────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <MetaItem
            icon={<ListChecks className="h-3.5 w-3.5" />}
            label="Questions"
            value={`${questionCount} question${questionCount !== 1 ? "s" : ""} · ${totalMarks} mark${totalMarks !== 1 ? "s" : ""}`}
          />
          <MetaItem
            icon={<Clock className="h-3.5 w-3.5" />}
            label="Duration"
            value={formatDuration(test.time_limit_seconds)}
          />
          {test.max_attempts != null && test.max_attempts > 0 && (
            <MetaItem
              icon={<RotateCcw className="h-3.5 w-3.5" />}
              label="Attempts Allowed"
              value={`${test.completed_count} / ${test.max_attempts} used`}
            />
          )}
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
              label={isExpired ? "Closed On" : "Closes"}
              value={formatDateTime(test.available_until)}
            />
          )}
        </div>

        {/* ── Instructions ────────────────────────────────────────────── */}
        {test.instructions && (
          <div className="rounded-xl border bg-muted/30 p-4">
            <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <BookOpen className="h-3.5 w-3.5" />
              Instructions
            </p>
            <p className="overflow-hidden break-words whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
              {test.instructions}
            </p>
          </div>
        )}

        {/* ── Past Attempts Summary List ────────────────────────────────── */}
        {test.pastAttempts && test.pastAttempts.length > 0 && (
          <div className="rounded-xl border bg-card p-4 space-y-3">
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <RotateCcw className="h-3.5 w-3.5" />
              Your Previous Attempts
            </p>
            <div className="space-y-2">
              {[...test.pastAttempts].reverse().map((att, idx, arr) => {
                const attemptNum = arr.length - idx
                const attemptPct = resolvePct(att.percentage, att.score, att.total_marks)
                return (
                  <div key={att.id} className="flex items-center justify-between rounded-lg border bg-muted/20 px-3.5 py-2.5 text-sm">
                    <div className="flex flex-col gap-0.5">
                      <span className="font-semibold text-foreground">Attempt #{attemptNum}</span>
                      <span className="text-[10px] text-muted-foreground">{formatDateTime(att.submitted_at)}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      {att.status === "in_progress" ? (
                        <Badge variant="secondary" className="h-5 text-[10px]">In Progress</Badge>
                      ) : (
                        <span className="font-bold tabular-nums text-foreground">{attemptPct.toFixed(2)}%</span>
                      )}
                      {test.results_available && att.status !== "in_progress" && (
                        <Button asChild variant="outline" size="sm" className="h-7 text-xs font-medium">
                          <Link href={`/tests/${test.id}/result/${att.id}`}>
                            View Details
                          </Link>
                        </Button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ── In Progress: resume banner ───────────────────────────────── */}
        {isInProgress && (
          <div className="space-y-2.5 rounded-xl border border-primary/20 bg-primary/5 p-4">
            <div className="flex items-start gap-2">
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
              <p className="text-sm font-medium text-primary">You have an unfinished attempt.</p>
            </div>
            <div className="flex items-start gap-2">
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
              <p className="text-sm text-primary/80">
                Resume to continue from where you left off. Your previous answers are saved.
              </p>
            </div>
            <div className="pt-1">
              <Button asChild size="sm" className="w-full sm:w-auto">
                <Link href={`${test.id}/attempt`}>
                  <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                  Resume Test
                </Link>
              </Button>
            </div>
          </div>
        )}

        {/* ── Live: CTA ───────────────────────────────────────────────── */}
        {(!attempt || attempt.status === "submitted") && isLive && (
          <div>
            <Button asChild size="lg" className="w-full sm:w-auto">
              <Link href={`${test.id}/attempt`}>
                {(test.completed_count ?? 0) > 0 ? "Retake Assessment" : "Start Assessment"}
              </Link>
            </Button>
          </div>
        )}

        {/* ── Expired ─────────────────────────────────────────────────── */}
        {(!attempt || attempt.status === "submitted") && isExpired && (
          <div className="space-y-2.5 rounded-xl border border-destructive/20 bg-destructive/5 p-4 text-xs text-destructive">
            <div className="flex items-start gap-2">
              <CalendarX className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <p className="text-sm font-medium">Test Closed</p>
            </div>
            <div className="flex items-start gap-2">
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <p>Stopped accepting responses on {formatDateTime(test.available_until!)}.</p>
            </div>
          </div>
        )}

        {/* ── Not yet open ────────────────────────────────────────────── */}
        {(!attempt || attempt.status === "submitted") && isNotYetOpen && (
          <div className="space-y-2.5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-800 dark:border-amber-900 dark:bg-amber-950/20 dark:text-amber-300">
            <div className="flex items-start gap-2">
              <CalendarClock className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <p className="text-sm font-medium">Not Yet Available</p>
            </div>
            <div className="flex items-start gap-2">
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <p>Opens on {formatDateTime(test.available_from!)}.</p>
            </div>
          </div>
        )}

      </div>
    )
  }


  // ── Results view ────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-6 px-4 py-8 md:px-8 animate-in fade-in duration-500">

      {/* ── Page Header ────────────────────────────────────────────────── */}
      <PageHeader test={test} />

      <Card className="rounded-xl overflow-hidden border">
        <CardContent className="p-5 space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                Performance Summary
              </p>
              <h3 className="text-lg font-semibold">Test Submitted</h3>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <CalendarClock className="h-3.5 w-3.5" />
                <span>
                  {attempt?.submitted_at ? formatDateTime(attempt.submitted_at) : "Recorded successfully"}
                </span>
              </div>
            </div>
          </div>

          {!test.results_available ? (
            <div className="rounded-lg border bg-muted/30 p-3 flex items-start gap-2.5">
              <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <p className="text-xs leading-relaxed text-muted-foreground">
                Detailed results and scores are currently hidden by the instructor. They will be visible once released.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border bg-muted/20 p-3">
                <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Score</p>
                <p className={cn("mt-1 text-2xl font-bold tabular-nums", pctColorClass)}>
                  {pct.toFixed(2)}%
                </p>
              </div>
              <div className="rounded-lg border bg-muted/20 p-3">
                <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Time Taken</p>
                <p className="mt-1 text-2xl font-bold tabular-nums text-foreground">
                  {attempt?.time_spent_seconds ? formatSeconds(attempt.time_spent_seconds) : "—"}
                </p>
              </div>
            </div>
          )}

          {test.results_available && (
            <div className="pt-2">
              <Button asChild variant="default" className="w-full sm:w-auto">
                <Link href={`/tests/${test.id}/result/${attempt?.id}`}>
                  View Detailed Report
                </Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

    </div>
  )
}
