"use client"

import { useRouter } from "next/navigation"

// ─────────────────────────────────────────────────────────────────────────────
// app/tests/[testId]/attempt/AttemptClient.tsx
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback, useRef, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { toast } from "sonner"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogCancel,
} from "@/components/ui/alert-dialog"
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet"
import {
    CheckCircle2,
    Circle,
    CheckSquare,
    Square,
    Clock,
    ChevronLeft,
    ChevronRight,
    Send,
    Menu,
    Tag,
    BookOpen,
    AlertCircle,
    Loader2,
    AlertTriangle,
    Maximize,
    EyeOff,
    Flag,
    Shuffle,
    Star,
    MessageSquare,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { MathText } from "@/components/others/latex-renderer"
import { Textarea } from "@/components/ui/textarea"
import type { AttemptTest, AttemptQuestion, AttemptInfo, SavedAnswer } from "./_types"


// ─── Constants ────────────────────────────────────────────────────────────────

// Number of focus-loss violations before the test is auto-submitted (strict mode only).
const MAX_VIOLATIONS = 6


// ─── Fullscreen Helpers ───────────────────────────────────────────────────────

function getFullscreenElement(): Element | null {
    return (
        document.fullscreenElement ??
        (document as any).webkitFullscreenElement ??
        (document as any).mozFullScreenElement ??
        null
    )
}

async function requestFullscreen(el: Element): Promise<void> {
    try {
        if (el.requestFullscreen) {
            await el.requestFullscreen()
        } else if ((el as any).webkitRequestFullscreen) {
            await (el as any).webkitRequestFullscreen()
        } else if ((el as any).mozRequestFullScreen) {
            await (el as any).mozRequestFullScreen()
        }
    } catch {
        // Fullscreen denied or not supported — silently continue
    }
}

async function exitFullscreen(): Promise<void> {
    try {
        if (document.exitFullscreen) {
            await document.exitFullscreen()
        } else if ((document as any).webkitExitFullscreen) {
            await (document as any).webkitExitFullscreen()
        } else if ((document as any).mozCancelFullScreen) {
            await (document as any).mozCancelFullScreen()
        }
    } catch {
        // Ignore
    }
}


// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTime(seconds: number): string {
    if (seconds <= 0) return "0:00"
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = seconds % 60
    if (h > 0)
        return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
    return `${m}:${String(s).padStart(2, "0")}`
}



// ─── Seeded PRNG (mulberry32) ──────────────────────────────────────────────────

function mulberry32(seed: number) {
    return function () {
        let t = (seed += 0x6d2b79f5)
        t = Math.imul(t ^ (t >>> 15), t | 1)
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296
    }
}

function seedFromUUID(uuid: string): number {
    let hash = 0
    for (let i = 0; i < uuid.length; i++) {
        hash = (Math.imul(31, hash) + uuid.charCodeAt(i)) | 0
    }
    return hash >>> 0
}

function seededShuffle<T>(arr: readonly T[], rng: () => number): T[] {
    const out = [...arr]
    for (let i = out.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1))
            ;[out[i], out[j]] = [out[j], out[i]]
    }
    return out
}


// ─── Timer Display ────────────────────────────────────────────────────────────

function TimerDisplay({
    timeRemaining,
    timerDanger,
    timerWarning,
    compact = false,
}: {
    timeRemaining: number
    timerDanger: boolean
    timerWarning: boolean
    compact?: boolean
}) {
    if (compact) {
        return (
            <span
                className={cn(
                    "flex shrink-0 items-center gap-1.5 font-mono text-sm font-semibold tabular-nums",
                    timerDanger
                        ? "text-red-600 dark:text-red-400"
                        : timerWarning
                            ? "text-amber-700 dark:text-amber-400"
                            : "text-foreground"
                )}
            >
                <Clock className={cn("h-3.5 w-3.5 shrink-0", timerDanger && "animate-pulse")} />
                {formatTime(timeRemaining)}
            </span>
        )
    }

    return (
        <div
            className={cn(
                "flex w-full items-center justify-center gap-2 rounded-xl border py-3",
                "font-mono text-base font-bold tabular-nums transition-colors",
                timerDanger
                    ? "animate-pulse border-red-300 bg-red-50 text-red-600 dark:border-red-800 dark:bg-red-950/30 dark:text-red-400"
                    : timerWarning
                        ? "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-400"
                        : "border-border bg-muted/30 text-foreground"
            )}
        >
            <Clock className="h-4 w-4 shrink-0" />
            {formatTime(timeRemaining)}
        </div>
    )
}


// ─── Question Navigator ───────────────────────────────────────────────────────

function QuestionNavigator({
    questions: displayQuestions,
    currentIndex,
    answers,
    savingIds,
    unsyncedIds,
    flagged,
    disabled,
    onJump,
}: {
    questions: AttemptQuestion[]
    currentIndex: number
    answers: Record<string, string[]>
    savingIds: Record<string, boolean>
    unsyncedIds: Record<string, boolean>
    flagged: Record<string, boolean>
    disabled?: boolean
    onJump: (i: number) => void
}) {
    const answeredCount = displayQuestions.filter((q) => (answers[q.id] ?? []).length > 0).length

    return (
        <div className="space-y-6">
            <div className="space-y-2">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Progress
                </p>
                <div className="flex min-w-0 items-center gap-2">
                    <Progress
                        value={(answeredCount / displayQuestions.length) * 100}
                        className="h-1.5 min-w-0 flex-1"
                    />
                    <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                        {answeredCount}/{displayQuestions.length}
                    </span>
                </div>
            </div>

            <div>
                <p className="mb-2.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Questions
                </p>
                <div className="grid grid-cols-5 gap-2">
                    {displayQuestions.map((q, i) => {
                        const answered = (answers[q.id] ?? []).length > 0
                        const isFlagged = flagged[q.id] ?? false
                        const isCurrent = i === currentIndex
                        const isSaving = savingIds[q.id]
                        const isUnsynced = unsyncedIds[q.id]

                        return (
                            <button
                                key={q.id}
                                onClick={() => !disabled && onJump(i)}
                                disabled={disabled}
                                className={cn(
                                    "relative aspect-square w-full rounded-full border text-xs font-semibold transition-all",
                                    isCurrent
                                        ? "border-primary bg-primary text-primary-foreground ring-2 ring-primary ring-offset-1"
                                        : isFlagged
                                            ? answered
                                                ? "border-amber-400 bg-amber-100 text-amber-800 hover:bg-amber-200 dark:border-amber-600 dark:bg-amber-900/40 dark:text-amber-300"
                                                : "border-amber-400 bg-amber-50 text-amber-700 hover:bg-amber-100 dark:border-amber-700 dark:bg-amber-950/30 dark:text-amber-400"
                                            : answered
                                                ? "border-primary/40 bg-primary/10 text-primary hover:bg-primary/20"
                                                : "border-border bg-background text-muted-foreground hover:border-muted-foreground hover:text-foreground",
                                    (isSaving || isUnsynced) && !isCurrent && "animate-pulse",
                                    disabled && "cursor-not-allowed opacity-60"
                                )}
                            >
                                {i + 1}
                                {isFlagged && (
                                    <span className="absolute -right-0.5 -top-0.5 flex h-3 w-3 items-center justify-center rounded-full border border-background bg-amber-500">
                                        <Flag className="h-1.5 w-1.5 fill-white text-white" />
                                    </span>
                                )}
                                {(isSaving || isUnsynced) && (
                                    <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 flex h-1 w-1 rounded-full bg-primary" />
                                )}
                            </button>
                        )
                    })}
                </div>
            </div>

            <div className="space-y-2 text-xs text-muted-foreground">
                <div className="flex items-center gap-2">
                    <div className="h-3 w-3 shrink-0 rounded-sm border border-primary/40 bg-primary/10" />
                    Answered
                </div>
                <div className="flex items-center gap-2">
                    <div className="h-3 w-3 shrink-0 rounded-sm border border-border bg-background" />
                    Not answered
                </div>
                <div className="flex items-center gap-2">
                    <div className="relative h-3 w-3 shrink-0 rounded-sm border border-amber-400 bg-amber-100 dark:bg-amber-900/40">
                        <span className="absolute -right-0.5 -top-0.5 h-1.5 w-1.5 rounded-full bg-amber-500" />
                    </div>
                    Flagged for review
                </div>
            </div>
        </div>
    )
}


// ─── Option Button ────────────────────────────────────────────────────────────

function OptionButton({
    option,
    isSelected,
    questionType,
    isSaving,
    disabled,
    onClick,
}: {
    option: AttemptQuestion["options"][number]
    isSelected: boolean
    questionType: "single_correct" | "multiple_correct"
    isSaving: boolean
    disabled?: boolean
    onClick: () => void
}) {
    const isSingle = questionType === "single_correct"

    return (
        <button
            onClick={onClick}
            disabled={isSaving || disabled}
            className={cn(
                "flex w-full min-h-[3rem] items-center gap-3 rounded-xl border p-4 sm:p-5 text-left text-sm transition-all",
                "hover:border-primary/50 hover:bg-primary/5 active:scale-[0.99]",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1",
                isSelected
                    ? "border-primary bg-primary/10 dark:bg-primary/15"
                    : "border-border bg-background",
                (isSaving || disabled) && "cursor-wait opacity-70"
            )}
        >
            <span className="shrink-0">
                {isSingle ? (
                    isSelected ? (
                        <CheckCircle2 className="h-5 w-5 text-primary" />
                    ) : (
                        <Circle className="h-5 w-5 text-muted-foreground/50" />
                    )
                ) : isSelected ? (
                    <CheckSquare className="h-5 w-5 text-primary" />
                ) : (
                    <Square className="h-5 w-5 text-muted-foreground/50" />
                )}
            </span>
            <span className={cn("min-w-0 flex-1 break-words leading-snug space-y-2", isSelected && "font-medium")}>
                <div><MathText>{option.option_text}</MathText></div>
            </span>
            {isSaving && isSelected && (
                <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-muted-foreground" />
            )}
        </button>
    )
}


// ─── Question View ────────────────────────────────────────────────────────────

function QuestionView({
    question,
    index,
    total,
    selectedIds,
    syncedIds,
    isSaving,
    isUnsynced,
    saveError,
    isFlagged,
    disabled,
    onAnswer,
    onToggleFlag,
}: {
    question: AttemptQuestion
    index: number
    total: number
    selectedIds: string[]
    syncedIds: string[]
    isSaving: boolean
    isUnsynced: boolean
    saveError: string | null
    isFlagged: boolean
    disabled?: boolean
    onAnswer: (optionId: string) => void
    onToggleFlag: () => void
}) {
    const isActuallySynced = JSON.stringify([...selectedIds].sort()) === JSON.stringify([...syncedIds].sort())

    return (
        <div className="space-y-6">
            <div className="space-y-3">
                <div className="flex min-w-0 flex-wrap items-center gap-2.5">
                    <Badge variant="outline" className="shrink-0 text-xs">
                        Q{index + 1} of {total}
                    </Badge>
                    <Badge variant="secondary" className="shrink-0 text-xs">
                        {question.marks} {question.marks === 1 ? "mark" : "marks"}
                    </Badge>
                    <Badge variant="outline" className="shrink-0 text-xs text-muted-foreground">
                        {question.question_type === "single_correct"
                            ? "Single correct answer"
                            : "Select all correct answers"}
                    </Badge>

                    {/* ── Flag for review ───────────────────────────────────── */}
                    <button
                        onClick={onToggleFlag}
                        className={cn(
                            "ml-auto flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-all",
                            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-1",
                            isFlagged
                                ? "border-amber-400 bg-amber-100 text-amber-700 hover:bg-amber-200 dark:border-amber-600 dark:bg-amber-900/40 dark:text-amber-300"
                                : "border-border bg-background text-muted-foreground hover:border-amber-400 hover:bg-amber-50 hover:text-amber-700 dark:hover:bg-amber-950/20 dark:hover:text-amber-400"
                        )}
                        aria-label={isFlagged ? "Remove flag" : "Flag for review"}
                    >
                        <Flag
                            className={cn(
                                "h-3 w-3 shrink-0 transition-colors",
                                isFlagged ? "fill-amber-500 text-amber-500" : "text-muted-foreground"
                            )}
                        />
                        {isFlagged ? "Flagged" : "Flag"}
                    </button>
                </div>

                <p className="break-words text-base font-medium leading-relaxed">
                    <MathText>{question.question_text}</MathText>
                </p>

                {question.tags.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5">
                        <Tag className="h-3 w-3 shrink-0 text-muted-foreground/60" />
                        {question.tags.map((t) => (
                            <Badge key={t.id} variant="secondary" className="px-2 py-0 text-xs">
                                {t.name}
                            </Badge>
                        ))}
                    </div>
                )}
            </div>

            <div className="space-y-2.5">
                {question.options.map((opt) => (
                    <OptionButton
                        key={opt.id}
                        option={opt}
                        isSelected={selectedIds.includes(opt.id)}
                        questionType={question.question_type}
                        isSaving={isSaving}
                        disabled={disabled}
                        onClick={() => onAnswer(opt.id)}
                    />
                ))}
            </div>

            {saveError ? (
                <p className="flex items-center gap-1.5 text-xs text-destructive font-medium">
                    <AlertTriangle className="h-3 w-3 shrink-0" />
                    Failed to save: {saveError}
                </p>
            ) : (isSaving || isUnsynced || !isActuallySynced || selectedIds.length > 0) ? (
                <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    {isSaving ? (
                        <>
                            <Loader2 className="h-3 w-3 animate-spin text-primary" />
                            <span className="text-primary font-medium">Saving to server…</span>
                        </>
                    ) : (isUnsynced || !isActuallySynced) ? (
                        <>
                            <Clock className="h-3 w-3 text-amber-500" />
                            <span className="text-amber-600 dark:text-amber-400 font-medium">Changes pending…</span>
                        </>
                    ) : (
                        <>
                            <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                            <span className="text-emerald-600 dark:text-emerald-400 font-medium">Saved to database</span>
                        </>
                    )}
                </p>
            ) : (
                <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <AlertCircle className="h-3 w-3 shrink-0" />
                    Not answered yet
                </p>
            )}
        </div>
    )
}


// ─── Intro Screen ─────────────────────────────────────────────────────────────

function IntroScreen({
    test,
    questions: displayQuestions,
    isResuming,
    isStarting,
    onBegin,
}: {
    test: AttemptTest
    questions: AttemptQuestion[]
    isResuming: boolean
    isStarting: boolean
    onBegin: () => void
}) {
    const totalMarks = displayQuestions.reduce((s, q) => s + q.marks, 0)
    const hasTimer = !!test.time_limit_seconds

    return (
        <div className="flex min-h-screen bg-background px-6 py-6 md:px-7 md:py-7 lg:px-8 lg:py-8">
            <div className="space-y-7">

                <div className="space-y-3">
                    <h1 className="break-words text-2xl font-bold leading-tight sm:text-3xl">
                        {test.title}
                    </h1>
                    {test.description && (
                        <p className="break-words text-sm text-muted-foreground sm:text-base">
                            {test.description}
                        </p>
                    )}
                </div>

                <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                    <div className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5">
                        <BookOpen className="h-3.5 w-3.5 shrink-0" />
                        <span>
                            {displayQuestions.length} question{displayQuestions.length !== 1 ? "s" : ""} · {totalMarks} mark
                            {totalMarks !== 1 ? "s" : ""}
                        </span>
                    </div>
                    <div className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5">
                        <Clock className="h-3.5 w-3.5 shrink-0" />
                        <span>
                            {hasTimer
                                ? `${Math.round(test.time_limit_seconds! / 60)} minutes`
                                : "Untimed"}
                        </span>
                    </div>
                    {test.available_until && (
                        <div className="inline-flex min-w-0 items-center gap-2 rounded-full border px-3 py-1.5 text-xs sm:text-sm">
                            <AlertCircle className="h-3.5 w-3.5 shrink-0 text-amber-600" />
                            <span className="truncate">
                                Closes{" "}
                                {new Date(test.available_until).toLocaleString("en-IN", {
                                    day: "2-digit",
                                    month: "short",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                })}
                            </span>
                        </div>
                    )}
                </div>

                {test.instructions && (
                    <div className="space-y-2 rounded-xl border bg-muted/40 p-5">
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            Instructions
                        </p>
                        <p className="overflow-hidden break-words whitespace-pre-line text-sm leading-relaxed">
                            {test.instructions}
                        </p>
                    </div>
                )}

                <div className="space-y-2.5 rounded-xl border border-amber-200 bg-amber-50 p-5 text-xs text-amber-800 dark:border-amber-900 dark:bg-amber-950/20 dark:text-amber-300">
                    <div className="flex items-start gap-2">
                        <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                        <p>
                            <strong>Important update:</strong> You must manually save your answers using the Save button or the <kbd className="pointer-events-none inline-flex h-4 select-none items-center gap-1 rounded border border-amber-300 bg-amber-100 px-1 font-mono text-[10px] font-medium text-amber-800 dark:border-amber-700 dark:bg-amber-900 dark:text-amber-300">CTRL+S</kbd> keyboard shortcut.
                        </p>
                    </div>
                    <div className="flex items-start gap-2">
                        <Maximize className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                        <p>
                            This test runs in <strong>fullscreen mode</strong>. Exiting fullscreen
                            will pause your interaction until you return.
                        </p>
                    </div>
                    <div className="flex items-start gap-2">
                        <EyeOff className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                        {test.strict_mode ? (
                            <p>
                                <strong>Strict mode is enabled.</strong> Do not switch tabs, minimize the
                                browser, or open other applications. After{" "}
                                <strong>{MAX_VIOLATIONS} violations</strong>, your test will be
                                automatically submitted.
                            </p>
                        ) : (
                            <p>
                                <strong>Anti-cheat is active.</strong> Do not switch tabs, minimize the
                                browser, or open other applications. Violations are recorded and
                                visible to your instructor.
                            </p>
                        )}
                    </div>
                    {(test.shuffle_questions || test.shuffle_options) && (
                        <div className="flex items-start gap-2">
                            <Shuffle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                            <p>
                                {test.shuffle_questions && test.shuffle_options
                                    ? "Questions and answer options are displayed in a randomised order."
                                    : test.shuffle_questions
                                        ? "Questions are displayed in a randomised order."
                                        : "Answer options are displayed in a randomised order."}
                                {" "}Each candidate may see a different sequence.
                            </p>
                        </div>
                    )}
                    {hasTimer && (
                        <div className="flex items-start gap-2">
                            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                            <p>The timer starts when you begin and cannot be paused.</p>
                        </div>
                    )}
                    <div className="flex items-start gap-2">
                        <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                        <p>Do not close this tab. You can resume from where you left off but timer will not pause.</p>
                    </div>
                </div>

                <div className="pt-2">
                    <Button size="lg" className="w-full sm:w-auto" onClick={onBegin} disabled={isStarting}>
                        {isStarting ? (
                            <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Starting…</>
                        ) : isResuming ? (
                            "Resume test"
                        ) : (
                            "Begin test"
                        )}
                    </Button>
                </div>
            </div>
        </div>
    )
}


// ─── Submitted Screen ─────────────────────────────────────────────────────────

const DIFFICULTY_OPTIONS = [
    { value: "too_easy" as const, label: "Easy", emoji: "😌" },
    { value: "as_expected" as const, label: "Just Right", emoji: "👍" },
    { value: "too_hard" as const, label: "Too Hard", emoji: "😰" },
]

function SubmittedScreen({
    test,
    reason,
    attemptId,
    onViewResults,
    onSubmitFeedback,
}: {
    test: AttemptTest
    reason: "manual" | "auto"
    attemptId: string | null
    onViewResults: () => void
    onSubmitFeedback?: (
        attemptId: string,
        testId: string,
        data: {
            rating: number
            overallComment?: string
            bugsIssues?: string
            suggestions?: string
            difficultyFelt?: "too_easy" | "as_expected" | "too_hard"
        }
    ) => Promise<void>
}) {
    const [feedbackPhase, setFeedbackPhase] = useState<"prompt" | "form" | "thanks">("prompt")
    const [rating, setRating] = useState(0)
    const [hoveredStar, setHoveredStar] = useState(0)
    const [overallComment, setOverallComment] = useState("")
    const [bugsIssues, setBugsIssues] = useState("")
    const [suggestions, setSuggestions] = useState("")
    const [difficultyFelt, setDifficultyFelt] = useState<"too_easy" | "as_expected" | "too_hard" | null>(null)
    const [isSendingFeedback, setIsSendingFeedback] = useState(false)
    const [feedbackError, setFeedbackError] = useState<string | null>(null)

    const handleFeedbackSubmit = async () => {
        if (!attemptId || !onSubmitFeedback || rating === 0) return
        setIsSendingFeedback(true)
        setFeedbackError(null)
        try {
            await onSubmitFeedback(attemptId, test.id, {
                rating,
                overallComment: overallComment.trim() || undefined,
                bugsIssues: bugsIssues.trim() || undefined,
                suggestions: suggestions.trim() || undefined,
                difficultyFelt: difficultyFelt ?? undefined,
            })
            setFeedbackPhase("thanks")
        } catch (err: any) {
            setFeedbackError(err?.message ?? "Failed to submit feedback")
        } finally {
            setIsSendingFeedback(false)
        }
    }

    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6 py-12 text-center">
            <div className="w-full max-w-lg space-y-6">

                {/* ── Header ─────────────────────────────────────────────── */}
                <div className="space-y-3">
                    <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
                        Test Submitted
                    </h1>
                    <p className="text-muted-foreground">
                        {reason === "auto"
                            ? "Your test was automatically submitted because the timer expired or too many violations were detected."
                            : "Your test has been successfully submitted for grading."}
                    </p>
                </div>

                <div className="rounded-xl border bg-muted/40 p-5 text-sm">
                    <p className="font-semibold text-xl">{test.title}</p>
                    <p className="mt-1 text-xs text-muted-foreground" suppressHydrationWarning>
                        Submitted on {new Date().toLocaleString("en-IN", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                        })}
                    </p>
                </div>

                {feedbackPhase === "form" && (
                    <div className="space-y-5 rounded-xl border p-6 text-left">
                        <p className="text-center text-sm font-semibold">
                            Rate your experience
                        </p>

                        {/* Star Rating */}
                        <div className="flex items-center justify-center gap-1.5">
                            {[1, 2, 3, 4, 5].map((star) => {
                                const active = star <= (hoveredStar || rating)
                                return (
                                    <button
                                        key={star}
                                        type="button"
                                        onClick={() => setRating(star)}
                                        onMouseEnter={() => setHoveredStar(star)}
                                        onMouseLeave={() => setHoveredStar(0)}
                                        className={cn(
                                            "rounded-lg p-1.5 transition-all duration-150",
                                            "hover:scale-110 active:scale-95",
                                            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                                        )}
                                        aria-label={`Rate ${star} star${star > 1 ? "s" : ""}`}
                                    >
                                        <Star
                                            className={cn(
                                                "h-8 w-8 transition-colors duration-150",
                                                active
                                                    ? "fill-amber-400 text-amber-400"
                                                    : "text-muted-foreground/30"
                                            )}
                                        />
                                    </button>
                                )
                            })}
                        </div>
                        {rating > 0 && (
                            <p className="text-center text-xs text-muted-foreground">
                                {rating === 1 && "Poor"}
                                {rating === 2 && "Fair"}
                                {rating === 3 && "Good"}
                                {rating === 4 && "Very Good"}
                                {rating === 5 && "Excellent"}
                            </p>
                        )}

                        {/* Difficulty Perception */}
                        <div className="space-y-2">
                            <p className="text-xs font-medium text-muted-foreground">
                                How did you find the difficulty?
                            </p>
                            <div className="grid grid-cols-3 gap-2">
                                {DIFFICULTY_OPTIONS.map((opt) => (
                                    <button
                                        key={opt.value}
                                        type="button"
                                        onClick={() => setDifficultyFelt(
                                            difficultyFelt === opt.value ? null : opt.value
                                        )}
                                        className={cn(
                                            "flex flex-col items-center gap-1 rounded-xl border px-3 py-3 text-xs font-medium transition-all",
                                            "hover:border-primary/50 hover:bg-primary/5",
                                            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                                            difficultyFelt === opt.value
                                                ? "border-primary bg-primary/10 text-primary"
                                                : "border-border text-muted-foreground"
                                        )}
                                    >
                                        <span className="text-lg">{opt.emoji}</span>
                                        {opt.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Overall Comment */}
                        <div className="space-y-1.5">
                            <label htmlFor="fb-comment" className="text-xs font-medium text-muted-foreground">
                                Overall thoughts (optional)
                            </label>
                            <Textarea
                                id="fb-comment"
                                placeholder="How was the test overall?"
                                value={overallComment}
                                onChange={(e) => setOverallComment(e.target.value)}
                                className="min-h-[3.5rem] resize-none text-sm"
                                maxLength={1000}
                            />
                        </div>

                        {/* Bugs / Issues */}
                        <div className="space-y-1.5">
                            <label htmlFor="fb-bugs" className="text-xs font-medium text-muted-foreground">
                                Any bugs or issues? (optional)
                            </label>
                            <Textarea
                                id="fb-bugs"
                                placeholder="Describe any issues you faced..."
                                value={bugsIssues}
                                onChange={(e) => setBugsIssues(e.target.value)}
                                className="min-h-[3.5rem] resize-none text-sm"
                                maxLength={1000}
                            />
                        </div>

                        {/* Suggestions */}
                        <div className="space-y-1.5">
                            <label htmlFor="fb-suggestions" className="text-xs font-medium text-muted-foreground">
                                Suggestions for improvement (optional)
                            </label>
                            <Textarea
                                id="fb-suggestions"
                                placeholder="What could we do better?"
                                value={suggestions}
                                onChange={(e) => setSuggestions(e.target.value)}
                                className="min-h-[3.5rem] resize-none text-sm"
                                maxLength={1000}
                            />
                        </div>

                        {feedbackError && (
                            <p className="flex items-center gap-1.5 text-xs text-destructive">
                                <AlertTriangle className="h-3 w-3 shrink-0" />
                                {feedbackError}
                            </p>
                        )}

                        <div className="flex gap-3 pt-1">
                            <Button
                                variant="ghost"
                                className="flex-1"
                                onClick={onViewResults}
                                disabled={isSendingFeedback}
                            >
                                Skip & View Results
                            </Button>
                            <Button
                                className="flex-1"
                                onClick={handleFeedbackSubmit}
                                disabled={rating === 0 || isSendingFeedback}
                            >
                                {isSendingFeedback ? (
                                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Sending…</>
                                ) : (
                                    "Submit Feedback"
                                )}
                            </Button>
                        </div>
                    </div>
                )}

                {feedbackPhase === "thanks" && (
                    <div className="space-y-2 rounded-xl border border-emerald-200 bg-emerald-50 p-5 dark:border-emerald-900 dark:bg-emerald-950/20">
                        <div className="flex items-center justify-center gap-2 text-emerald-700 dark:text-emerald-400">
                            <p className="text-sm font-semibold">Thank you for your feedback!</p>
                        </div>
                        <p className="text-xs text-emerald-600 dark:text-emerald-400/80">
                            Your response has been recorded and will help us improve.
                        </p>
                    </div>
                )}

                {/* ── Action Buttons ──────────────────────────────────────── */}
                {feedbackPhase !== "form" && (
                    <div className="pt-2">
                        {feedbackPhase === "prompt" && attemptId && onSubmitFeedback ? (
                            <div className="flex gap-3">
                                <Button
                                    className="flex-1 gap-2"
                                    onClick={() => setFeedbackPhase("form")}
                                >
                                    <MessageSquare className="h-4 w-4" />
                                    Share Feedback
                                </Button>
                                <Button
                                    variant="outline"
                                    className="flex-1"
                                    onClick={onViewResults}
                                >
                                    View Results
                                </Button>
                            </div>
                        ) : (
                            <Button onClick={onViewResults} className="w-full">
                                View Results & Back to Dashboard
                            </Button>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}


// ─── Main Component ───────────────────────────────────────────────────────────

interface Props {
    test: AttemptTest
    questions: AttemptQuestion[]
    attemptInfo: AttemptInfo | null
    savedAnswers: SavedAnswer[]
    onStartAttempt: () => Promise<AttemptInfo>
    onSaveAnswer?: (
        attemptId: string,
        questionId: string,
        selectedIds: string[],
        timeSpentSeconds?: number
    ) => Promise<void>
    onSaveAnswersBatch?: (
        attemptId: string,
        answers: Array<{
            questionId: string
            selectedOptionIds: string[]
            timeSpentSeconds?: number
        }>
    ) => Promise<void>
    onSubmit?: (attemptId: string, timeSpentSeconds: number) => Promise<{ error?: string; redirectPath?: string }>
    serverNow: string
    // Called on every detected violation — fire-and-forget, never throws.
    onViolation?: (
        attemptId: string,
        type: "focus_loss" | "fullscreen_exit",
        totalCount: number,
        timestamp: string
    ) => Promise<void>
    onSubmitFeedback?: (
        attemptId: string,
        testId: string,
        data: {
            rating: number
            overallComment?: string
            bugsIssues?: string
            suggestions?: string
            difficultyFelt?: "too_easy" | "as_expected" | "too_hard"
        }
    ) => Promise<void>
    shuffleSeed: string
}

export function AttemptClient({
    test,
    questions,
    attemptInfo: initialAttemptInfo,
    savedAnswers,
    onStartAttempt,
    onSaveAnswer,
    onSaveAnswersBatch,
    onSubmit,
    onViolation,
    onSubmitFeedback,
    serverNow,
    shuffleSeed,
}: Props) {
    const isResuming = initialAttemptInfo !== null

    // ── Shuffling (Client-Side) ──────────────────────────────────────────────────

    const displayQuestions = useMemo(() => {
        const seed = seedFromUUID(shuffleSeed)
        let qs = [...questions]

        if (test.shuffle_questions) {
            const rng = mulberry32(seed)
            qs = seededShuffle(qs, rng)
        }

        if (test.shuffle_options) {
            qs = qs.map((q) => {
                const rng = mulberry32(seed ^ seedFromUUID(q.id))
                return { ...q, options: seededShuffle(q.options, rng) }
            })
        }

        return qs
    }, [questions, test.shuffle_questions, test.shuffle_options, shuffleSeed])

    // ── State ──────────────────────────────────────────────────────────────────

    const [attemptInfo, setAttemptInfo] = useState<AttemptInfo | null>(initialAttemptInfo)
    const [phase, setPhase] = useState<"intro" | "active" | "submitted">("intro")
    const [submitReason, setSubmitReason] = useState<"manual" | "auto">("manual")
    const [submitRedirectPath, setSubmitRedirectPath] = useState<string | null>(null)
    const [showUpdateNotice, setShowUpdateNotice] = useState(false)
    const router = useRouter()

    // ── Server Time Sync ───────────────────────────────────────────────────────
    // Using performance.now() instead of Date.now() ensures that system clock drift
    // or manual clock manipulation by the user doesn't affect the test timer/timing data.
    const syncTimeBase = useMemo(() => {
        return {
            serverAtMount: new Date(serverNow).getTime(),
            perfAtMount: typeof window !== "undefined" ? performance.now() : 0,
        }
    }, [serverNow])

    const getNowOnServer = useCallback(() => {
        const elapsed = (typeof window !== "undefined" ? performance.now() : 0) - syncTimeBase.perfAtMount
        return new Date(syncTimeBase.serverAtMount + elapsed)
    }, [syncTimeBase])

    const storagePrefix = initialAttemptInfo ? `pt_attempt_${initialAttemptInfo.id}` : null

    const [currentIndex, setCurrentIndex] = useState(() => {
        if (typeof window !== "undefined" && storagePrefix) {
            const saved = localStorage.getItem(`${storagePrefix}_idx`)
            if (saved) return parseInt(saved, 10)
        }
        return 0
    })

    const [isStarting, setIsStarting] = useState(false)

    const [answers, setAnswers] = useState<Record<string, string[]>>(
        () => Object.fromEntries(savedAnswers.map((a) => [a.question_id, a.selected_option_ids]))
    )

    // flagged: tracks which question IDs are flagged for review (client-side only)
    const [flagged, setFlagged] = useState<Record<string, boolean>>(() => {
        if (typeof window !== "undefined" && storagePrefix) {
            const saved = localStorage.getItem(`${storagePrefix}_flags`)
            if (saved) return JSON.parse(saved)
        }
        return {}
    })

    const [savingIds, setSavingIds] = useState<Record<string, boolean>>({})
    const [unsyncedIds, setUnsyncedIds] = useState<Record<string, boolean>>({})
    const [syncedAnswers, setSyncedAnswers] = useState<Record<string, string[]>>(
        () => Object.fromEntries(savedAnswers.map((a) => [a.question_id, a.selected_option_ids]))
    )
    const [saveErrors, setSaveErrors] = useState<Record<string, string | null>>({})
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [submitError, setSubmitError] = useState<string | null>(null)
    const [showSubmitDialog, setShowSubmitDialog] = useState(false)
    const [navSheetOpen, setNavSheetOpen] = useState(false)
    const [timeRemaining, setTimeRemaining] = useState<number | null>(null)

    // Fullscreen
    const [showFullscreenWarning, setShowFullscreenWarning] = useState(false)

    // Anti-cheat
    const [showFocusWarning, setShowFocusWarning] = useState(false)
    const [focusLostCount, setFocusLostCount] = useState(initialAttemptInfo?.tab_switch_count ?? 0)

    // ── Refs ───────────────────────────────────────────────────────────────────
    const autoSubmitted = useRef(false)
    const handleSubmitRef = useRef<((auto?: boolean) => Promise<void>) | undefined>(undefined)

    // Synchronous mutex: prevents dual-event firing (visibilitychange + blur)
    // from counting as two separate violations for the same user action.
    const focusGuardRef = useRef(false)

    // Ref mirrors — used inside the anti-cheat effect so it only registers once
    // (phase === "active") without isSubmitting or showFocusWarning in deps.
    const isSubmittingRef = useRef(false)
    const showFocusWarningRef = useRef(false)
    // Ref mirror for violation count so closures always see the latest value.
    const focusLostCountRef = useRef(initialAttemptInfo?.tab_switch_count ?? 0)

    const showSubmitDialogRef = useRef(false)
    const navSheetOpenRef = useRef(false)
    const showFullscreenWarningRef = useRef(false)
    const questionsLengthRef = useRef(displayQuestions.length)
    const currentIndexRef = useRef(currentIndex)
    const questionsRef = useRef(displayQuestions)
    const answersRef = useRef(answers)
    const syncPromiseRef = useRef<Promise<boolean> | null>(null)
    const pacingBufferRef = useRef<Record<string, number>>({})
    const lastSyncAtRef = useRef<number>(0)

    // ── Persistence ───────────────────────────────────────────────────────────
    useEffect(() => {
        if (attemptInfo && typeof window !== "undefined") {
            const prefix = `pt_attempt_${attemptInfo.id}`
            localStorage.setItem(`${prefix}_idx`, currentIndex.toString())
            localStorage.setItem(`${prefix}_flags`, JSON.stringify(flagged))
        }
    }, [attemptInfo, currentIndex, flagged])


    // ── Keep ref mirrors in sync ───────────────────────────────────────────────

    useEffect(() => { isSubmittingRef.current = isSubmitting }, [isSubmitting])
    useEffect(() => { showFocusWarningRef.current = showFocusWarning }, [showFocusWarning])
    useEffect(() => { showSubmitDialogRef.current = showSubmitDialog }, [showSubmitDialog])
    useEffect(() => { navSheetOpenRef.current = navSheetOpen }, [navSheetOpen])
    useEffect(() => { showFullscreenWarningRef.current = showFullscreenWarning }, [showFullscreenWarning])
    useEffect(() => { questionsLengthRef.current = displayQuestions.length }, [displayQuestions.length])
    useEffect(() => { currentIndexRef.current = currentIndex }, [currentIndex])
    useEffect(() => { questionsRef.current = displayQuestions }, [displayQuestions])
    useEffect(() => { answersRef.current = answers }, [answers])


    // ── Fullscreen helpers ─────────────────────────────────────────────────────

    const enterFullscreen = useCallback(async () => {
        await requestFullscreen(document.documentElement)
    }, [])

    const leaveFullscreen = useCallback(async () => {
        if (getFullscreenElement()) await exitFullscreen()
    }, [])


    // ── Event Listeners: Fullscreen, Anti-Cheat & Copy-Block ──────────────────
    //
    // This effect registers ONCE when phase becomes "active" and never re-runs,
    // because isSubmitting and showFocusWarning are read from refs instead of
    // being in the dependency array. This closes the race window that existed
    // when the effect tore down and re-registered listeners on every state change.

    useEffect(() => {
        if (phase !== "active") return

        // 0. Violation threshold check (immediate on start/resume)
        if (test.strict_mode && focusLostCountRef.current >= MAX_VIOLATIONS && !autoSubmitted.current) {
            autoSubmitted.current = true
            setTimeout(() => handleSubmitRef.current?.(true), 0)
            return
        }

        // 1. Fullscreen change ─────────────────────────────────────────────────
        const handleFullscreenChange = () => {
            const active = !!getFullscreenElement()
            if (!active && !autoSubmitted.current && !isSubmittingRef.current && attemptInfo) {
                setShowFullscreenWarning(true)
                // Persist fullscreen-exit violation (fire-and-forget)
                onViolation?.(
                    attemptInfo.id,
                    "fullscreen_exit",
                    focusLostCountRef.current,
                    getNowOnServer().toISOString()
                ).catch(() => { /* never throw */ })
            } else {
                setShowFullscreenWarning(false)
            }
        }

        // 2. Focus-loss trigger ────────────────────────────────────────────────
        //    Guarded by a ref so only one violation is counted no matter how
        //    many events fire for the same user action.
        const triggerFocusLoss = () => {
            if (autoSubmitted.current || isSubmittingRef.current) return
            if (focusGuardRef.current) return
            focusGuardRef.current = true

            focusLostCountRef.current += 1
            const currentCount = focusLostCountRef.current

            setFocusLostCount(currentCount)
            setShowFocusWarning(true)

            if (attemptInfo) {
                // Throttled violation recording: only sync to server every 2s
                // to prevent traffic storms from rapid browser focus events.
                const now = Date.now()
                const lastSync = (window as any)._lastViolationSync ?? 0
                if (now - lastSync > 2000) {
                    (window as any)._lastViolationSync = now
                    // Persist violation to the server immediately (fire-and-forget).
                    onViolation?.(
                        attemptInfo.id,
                        "focus_loss",
                        currentCount,
                        getNowOnServer().toISOString()
                    ).catch(() => { /* never throw */ })
                }
            }

            // Auto-submit once the threshold is crossed (strict mode only).
            if (test.strict_mode && currentCount >= MAX_VIOLATIONS && !autoSubmitted.current) {
                autoSubmitted.current = true
                // Defer so state updates above are flushed before submission starts.
                setTimeout(() => handleSubmitRef.current?.(true), 0)
            }
        }

        const handleVisibilityChange = () => {
            if (document.visibilityState === "hidden") triggerFocusLoss()
        }

        const handleBlur = () => {
            // Longer delay (200 ms) to:
            //   a) avoid false positives from shadcn dialogs that briefly steal focus, and
            //   b) ensure showFocusWarningRef is up-to-date before we check it.
            setTimeout(() => {
                // Suppress blur when the focus-warning dialog is already open —
                // clicking "I Understand" itself causes a transient blur.
                if (!document.hasFocus() && !showFocusWarningRef.current) {
                    triggerFocusLoss()
                }
            }, 200)
        }

        // 3. Copy / keyboard blocking / Navigation ──────────────────────────
        const handleKeyDown = (e: KeyboardEvent) => {
            // Guard: stop logic if the user is typing in an input/textarea.
            if (
                e.target instanceof HTMLInputElement ||
                e.target instanceof HTMLTextAreaElement
            ) {
                return
            }

            const ctrl = e.ctrlKey || e.metaKey
            // Block copy, save, view-source, print, select all
            if (ctrl && ["c", "p", "s", "u", "a"].includes(e.key.toLowerCase())) {
                e.preventDefault()
            }
            // Block DevTools shortcuts
            if (ctrl && e.shiftKey && ["i", "j", "c"].includes(e.key.toLowerCase())) {
                e.preventDefault()
            }
            if (e.key === "F12") e.preventDefault()

            // Ctrl + S (Save)
            if (ctrl && e.key.toLowerCase() === "s") {
                e.preventDefault()
                syncBatch()
            }

            if (
                !showSubmitDialogRef.current &&
                !navSheetOpenRef.current &&
                !showFocusWarningRef.current &&
                !showFullscreenWarningRef.current &&
                !isSubmittingRef.current
            ) {
                // 'F' key: Toggle flag for review
                if (e.key.toLowerCase() === "f") {
                    const q = questionsRef.current[currentIndexRef.current]
                    if (q) {
                        toggleFlag(q.id)
                        e.preventDefault()
                    }
                }

                // Arrow keys for Next/Prev question
                if (e.key === "ArrowLeft") {
                    setCurrentIndex((i) => Math.max(0, i - 1))
                    e.preventDefault()
                } else if (e.key === "ArrowRight") {
                    setCurrentIndex((i) => Math.min(questionsLengthRef.current - 1, i + 1))
                    e.preventDefault()
                }
            }
        }

        const handleCopy = (e: ClipboardEvent) => e.preventDefault()
        const handleContextMenu = (e: MouseEvent) => e.preventDefault()
        const handleDragStart = (e: DragEvent) => e.preventDefault()

        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (autoSubmitted.current || isSubmittingRef.current) return;
            e.preventDefault()
            e.returnValue = "" // Modern browsers require setting this property
        }

        // Register all listeners
        document.addEventListener("fullscreenchange", handleFullscreenChange)
        document.addEventListener("webkitfullscreenchange", handleFullscreenChange)
        document.addEventListener("mozfullscreenchange", handleFullscreenChange)
        document.addEventListener("visibilitychange", handleVisibilityChange)
        document.addEventListener("keydown", handleKeyDown)
        document.addEventListener("copy", handleCopy)
        document.addEventListener("contextmenu", handleContextMenu)
        document.addEventListener("dragstart", handleDragStart)
        window.addEventListener("blur", handleBlur)
        window.addEventListener("beforeunload", handleBeforeUnload)

        return () => {
            document.removeEventListener("fullscreenchange", handleFullscreenChange)
            document.removeEventListener("webkitfullscreenchange", handleFullscreenChange)
            document.removeEventListener("mozfullscreenchange", handleFullscreenChange)
            document.removeEventListener("visibilitychange", handleVisibilityChange)
            document.removeEventListener("keydown", handleKeyDown)
            document.removeEventListener("copy", handleCopy)
            document.removeEventListener("contextmenu", handleContextMenu)
            document.removeEventListener("dragstart", handleDragStart)
            window.removeEventListener("blur", handleBlur)
            window.removeEventListener("beforeunload", handleBeforeUnload)
        }
        // ─── Intentionally only [phase] in deps ───────────────────────────────
        // isSubmitting and showFocusWarning are read from their ref mirrors so
        // this effect registers exactly once when the test becomes active.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [phase])


    // ── Toggle flag ────────────────────────────────────────────────────────────

    const toggleFlag = useCallback((questionId: string) => {
        setFlagged((prev) => ({ ...prev, [questionId]: !prev[questionId] }))
    }, [])


    // ── Save answer ────────────────────────────────────────────────────────────

    const saveAnswer = useCallback(
        async (questionId: string, selectedIds: string[], timeSpentSeconds: number = 0) => {
            if (!onSaveAnswer || !attemptInfo) return
            setSavingIds((prev) => ({ ...prev, [questionId]: true }))
            setSaveErrors((prev) => ({ ...prev, [questionId]: null }))
            try {
                await onSaveAnswer(attemptInfo.id, questionId, selectedIds, timeSpentSeconds)
                setSyncedAnswers((prev) => ({ ...prev, [questionId]: selectedIds }))
                setUnsyncedIds((prev) => ({ ...prev, [questionId]: false }))
            } catch (err: any) {
                if (err?.message === "NEXT_REDIRECT" || err?.digest?.includes("NEXT_REDIRECT")) throw err
                const msg = err?.message ?? "Failed to save answer"
                const userFriendlyMsg = msg.toLowerCase().includes("unexpected response")
                    ? "Your session may have expired. Please refresh the page."
                    : msg
                setSaveErrors((prev) => ({ ...prev, [questionId]: userFriendlyMsg }))
                toast.error(userFriendlyMsg)
                setUnsyncedIds((prev) => ({ ...prev, [questionId]: true }))
                throw err
            } finally {
                setSavingIds((prev) => ({ ...prev, [questionId]: false }))
            }
        },
        [attemptInfo, onSaveAnswer]
    )

    // BATCH SAVING logic
    const batchQueueRef = useRef<Set<string>>(new Set())
    const isSyncingRef = useRef(false)

    const syncBatch = useCallback(async (isFinalSync = false) => {
        // If a sync is already in flight, wait for it then re-sync if needed
        if (isSyncingRef.current) {
            if (!isFinalSync && isSubmittingRef.current) return true
            // Wait for the current sync to finish, then recurse to pick up queued changes
            if (syncPromiseRef.current) {
                await syncPromiseRef.current
            }
            // After waiting, if there are queued items, run again
            if (batchQueueRef.current.size > 0) {
                return syncBatch(isFinalSync)
            }
            return true
        }

        if ((!isFinalSync && isSubmittingRef.current) || !onSaveAnswersBatch || !attemptInfo) return true

        // Helper to commit recent seconds for a question into the batch buffer
        const commitPacing = (id: string, nowMs: number) => {
            const track = timeTrackingRef.current
            if (!id || id !== track.id || track.enteredAtServerTime <= 0) return 0

            const baseTime = lastSyncAtRef.current > track.enteredAtServerTime
                ? lastSyncAtRef.current
                : track.enteredAtServerTime

            const elapsed = Math.max(0, Math.floor((nowMs - baseTime) / 1000))
            if (elapsed > 0) {
                pacingBufferRef.current[id] = (pacingBufferRef.current[id] ?? 0) + elapsed
                batchQueueRef.current.add(id)
                lastSyncAtRef.current = nowMs
                // Mark as unsynced so UI shows progress
                setUnsyncedIds(prev => ({ ...prev, [id]: true }))
            }
            return elapsed
        }

        const nowMs = getNowOnServer().getTime()
        const track = timeTrackingRef.current
        if (track.id) {
            commitPacing(track.id, nowMs)
        }

        if (batchQueueRef.current.size === 0) return true

        const syncInternal = async (): Promise<boolean> => {
            isSyncingRef.current = true
            const idsToSync = Array.from(batchQueueRef.current)
            batchQueueRef.current.clear()

            // Snapshot the current answers at the moment we build the batch.
            // This lets us detect if the user changed an answer during the RPC call.
            const batch = idsToSync.map(id => ({
                questionId: id,
                selectedOptionIds: [...(answersRef.current[id] ?? [])],
                timeSpentSeconds: pacingBufferRef.current[id] ?? 0
            }))

            // Snapshot the deltas we're about to clear on success
            const clearedDeltas: Record<string, number> = {}
            batch.forEach(item => { clearedDeltas[item.questionId] = item.timeSpentSeconds })

            const savingManifest: Record<string, boolean> = {}
            idsToSync.forEach(id => savingManifest[id] = true)
            setSavingIds(prev => ({ ...prev, ...savingManifest }))

            try {
                await onSaveAnswersBatch(attemptInfo.id, batch)

                const newSynced: Record<string, string[]> = {}
                const newUnsynced: Record<string, boolean> = {}
                const doneSaving: Record<string, boolean> = {}

                batch.forEach(item => {
                    newSynced[item.questionId] = item.selectedOptionIds
                    doneSaving[item.questionId] = false
                    // Success! Clear these specific deltas from the buffer
                    pacingBufferRef.current[item.questionId] = Math.max(0, (pacingBufferRef.current[item.questionId] ?? 0) - (clearedDeltas[item.questionId] ?? 0))

                    // CRITICAL: Only mark as synced if the current answer still
                    // matches what we just sent. If the user changed their answer
                    // while the RPC was in flight, keep it marked as unsynced so
                    // the next save captures the latest value.
                    const currentAnswer = answersRef.current[item.questionId] ?? []
                    const sentAnswer = item.selectedOptionIds
                    const answersMatch =
                        currentAnswer.length === sentAnswer.length &&
                        [...currentAnswer].sort().join(',') === [...sentAnswer].sort().join(',')

                    if (answersMatch) {
                        newUnsynced[item.questionId] = false
                    } else {
                        // Answer changed during sync — re-queue for next sync
                        newUnsynced[item.questionId] = true
                        batchQueueRef.current.add(item.questionId)
                    }
                })

                setSyncedAnswers(prev => ({ ...prev, ...newSynced }))
                setUnsyncedIds(prev => ({ ...prev, ...newUnsynced }))
                setSavingIds(prev => ({ ...prev, ...doneSaving }))

                // If new items were queued during the sync, chain another sync
                if (batchQueueRef.current.size > 0) {
                    // Let the finally block release the lock first
                    setTimeout(() => syncBatch(isFinalSync), 0)
                }

                return true
            } catch (err: any) {
                console.error("[AttemptClient] Sync failed:", err)
                // Put IDs back in the queue to retry
                idsToSync.forEach(id => batchQueueRef.current.add(id))
                setSavingIds(prev => {
                    const updated = { ...prev }
                    idsToSync.forEach(id => updated[id] = false)
                    return updated
                })
                // Note: pacingBufferRef remains intact for retry
                toast.error("Network error: some answers failed to sync.")
                return false
            } finally {
                isSyncingRef.current = false
                syncPromiseRef.current = null
            }
        }

        syncPromiseRef.current = syncInternal()
        toast.promise(syncPromiseRef.current, {
            loading: "Saving changes...",
            success: "All changes saved to server.",
            error: (err) => err?.message || "Failed to save answers."
        })
        return syncPromiseRef.current
    }, [attemptInfo, onSaveAnswersBatch, getNowOnServer]) // commitPacing is internal to useCallback

    // Removed recurring sync timer (manual saves only)


    // ── Handle option select ───────────────────────────────────────────────────

    const handleAnswer = useCallback(
        (
            questionId: string,
            optionId: string,
            questionType: "single_correct" | "multiple_correct"
        ) => {
            if (isSubmittingRef.current) return

            // Immediately mark as "unsynced" and clear errors
            if (onSaveAnswersBatch && attemptInfo) {
                setUnsyncedIds((prev) => ({ ...prev, [questionId]: true }))
                setSaveErrors((prev) => ({ ...prev, [questionId]: null }))
            }

            // Calculate 'next' outside of the state setter to ensure synchronous Ref update
            const current = answersRef.current[questionId] ?? []
            const next =
                questionType === "single_correct"
                    ? (current.length === 1 && current[0] === optionId ? [] : [optionId])
                    : current.includes(optionId)
                        ? current.filter((id) => id !== optionId)
                        : [...current, optionId]

            // Synchronously update the ref so syncBatch (on interval) sees it immediately
            answersRef.current[questionId] = next
            batchQueueRef.current.add(questionId)

            // Trigger the re-render with the new state
            setAnswers((prev) => ({ ...prev, [questionId]: next }))
        },
        [onSaveAnswersBatch, attemptInfo]
    )




    // ── Submit ─────────────────────────────────────────────────────────────────

    // ── Submit ─────────────────────────────────────────────────────────────────

    const handleSubmit = useCallback(
        async (auto = false) => {
            if (isSubmittingRef.current || !attemptInfo) return
            isSubmittingRef.current = true // Atomic guard
            setIsSubmitting(true)
            setSubmitError(null)
            setShowSubmitDialog(false)
            setNavSheetOpen(false)
            setShowFullscreenWarning(false)
            setShowFocusWarning(false)

            const timeSpentSeconds = Math.floor(
                (getNowOnServer().getTime() - new Date(attemptInfo.started_at).getTime()) / 1000
            )

            try {
                // Ensure any in-flight background sync finishes
                if (syncPromiseRef.current) {
                    await syncPromiseRef.current
                }

                // Trigger one last sync to flush everything (answers + final pacing)
                if (phase === "active") {
                    const syncSuccess = await syncBatch(true)
                    if (syncSuccess === false) {
                        throw new Error("Some answers could not be saved to the database. Please check your connection and try again.")
                    }
                }

                await leaveFullscreen()              // ← exit fullscreen FIRST

                // Clear persistent local state for this attempt
                const prefix = `pt_attempt_${attemptInfo.id}`
                localStorage.removeItem(`${prefix}_idx`)
                localStorage.removeItem(`${prefix}_flags`)

                const submitResult = await onSubmit?.(attemptInfo.id, timeSpentSeconds)
                if (submitResult?.error) {
                    throw new Error(submitResult.error)
                }
                const redirectPath = submitResult?.redirectPath

                if (auto) {
                    setSubmitReason("auto")
                } else {
                    setSubmitReason("manual")
                    setSubmitRedirectPath(redirectPath ?? `/tests/${test.id}`)
                }
                setPhase("submitted")
            } catch (err: any) {
                // REQUIRED for Next.js 15: Re-throw redirect errors so the router can handle them.
                if (err?.message === "NEXT_REDIRECT" || err?.digest?.includes("NEXT_REDIRECT")) throw err

                setIsSubmitting(false)
                isSubmittingRef.current = false // Allow retry!
                const msg = err?.message ?? "Submission failed. Please try again."

                // "An unexpected response" usually means the server returned HTML (redirect to login) 
                // instead of the action response, likely due to session expiry.
                const lowerMsg = msg.toLowerCase()
                const userFriendlyMsg = (lowerMsg.includes("unexpected") && lowerMsg.includes("response"))
                    ? "Your session may have expired. Please refresh the page and try finishing again."
                    : msg

                setSubmitError(userFriendlyMsg)
                toast.error(userFriendlyMsg)
            }
        },
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [attemptInfo, onSubmit, leaveFullscreen, phase, syncBatch, router, getNowOnServer]
    )

    useEffect(() => {
        handleSubmitRef.current = handleSubmit
    }, [handleSubmit])


    // ── Timer ──────────────────────────────────────────────────────────────────

    const timerStartRef = useRef<number>(0)
    const initialRemainingRef = useRef<number>(0)

    useEffect(() => {
        if (phase !== "active" || !test.time_limit_seconds || !attemptInfo || !attemptInfo.expires_at) return

        const serverNowMs = new Date(attemptInfo.server_time).getTime()
        const expiresAtMs = new Date(attemptInfo.expires_at).getTime()
        initialRemainingRef.current = Math.max(0, expiresAtMs - serverNowMs)
        timerStartRef.current = window.performance.now()

        const tick = () => {
            const elapsedMs = window.performance.now() - timerStartRef.current
            const remaining = Math.max(0, Math.floor((initialRemainingRef.current - elapsedMs) / 1000))
            setTimeRemaining(remaining)
            if (remaining === 0 && !autoSubmitted.current) {
                autoSubmitted.current = true
                handleSubmitRef.current?.(true)
            }
        }

        tick()
        const id = setInterval(tick, 1000)
        return () => clearInterval(id)
    }, [phase, test.time_limit_seconds, attemptInfo])


    // ── Derived ────────────────────────────────────────────────────────────────

    const currentQuestion = displayQuestions[currentIndex]
    const currentAnswers = answers[currentQuestion?.id ?? ""] ?? []
    const answeredCount = displayQuestions.filter((q) => (answers[q.id] ?? []).length > 0).length
    const unansweredCount = displayQuestions.length - answeredCount
    const flaggedCount = Object.values(flagged).filter(Boolean).length
    const progressPct = displayQuestions.length > 0
        ? Math.round((answeredCount / displayQuestions.length) * 100)
        : 0
    const timerDanger = timeRemaining !== null && timeRemaining <= 60
    const timerWarning = timeRemaining !== null && timeRemaining > 60 && timeRemaining <= 300
    const isLastQuestion = currentIndex === displayQuestions.length - 1

    const isAnySaving = Object.values(savingIds).some(Boolean)
    const isAnyUnsynced = Object.values(unsyncedIds).some(Boolean)
    const unsyncedCount = Object.values(unsyncedIds).filter(Boolean).length
    const hasUnsyncedWork = isAnySaving || isAnyUnsynced


    // ── Tracking Offline and Question Pacing ───────────────────────────────────

    const [isOffline, setIsOffline] = useState(false)
    const timeTrackingRef = useRef<{ id: string; enteredAtServerTime: number }>({ id: "", enteredAtServerTime: 0 })

    useEffect(() => {
        setIsOffline(!navigator.onLine)
        const handleOffline = () => setIsOffline(true)
        const handleOnline = () => setIsOffline(false)
        window.addEventListener("offline", handleOffline)
        window.addEventListener("online", handleOnline)
        return () => {
            window.removeEventListener("offline", handleOffline)
            window.removeEventListener("online", handleOnline)
        }
    }, [])

    useEffect(() => {
        if (phase !== "active" || !currentQuestion || isSubmittingRef.current) return

        const nowServerTime = getNowOnServer().getTime()
        const track = timeTrackingRef.current

        // If we switched away from a previous question:
        if (track.id && track.id !== currentQuestion.id && track.enteredAtServerTime > 0) {
            // Unify: the commitPacing logic within syncBatch is exactly what we need here,
            // but since it's inside useCallback, we replicate the logic or rely on a syncBatch trigger.
            // Best is to call syncBatch() but only after committing the final delta for the previous question.

            const baseTime = lastSyncAtRef.current > track.enteredAtServerTime
                ? lastSyncAtRef.current
                : track.enteredAtServerTime

            const elapsed = Math.max(0, Math.floor((nowServerTime - baseTime) / 1000))

            if (elapsed > 0 && attemptInfo) {
                pacingBufferRef.current[track.id] = (pacingBufferRef.current[track.id] ?? 0) + elapsed
                batchQueueRef.current.add(track.id)
                setUnsyncedIds(prev => ({ ...prev, [track.id]: true }))
                // NO automatic sync on switch anymore; wait for manual save or submission
            }
        }

        // Only explicitly reset tracker if we are indeed looking at a new/different question
        if (track.id !== currentQuestion.id) {
            timeTrackingRef.current = { id: currentQuestion.id, enteredAtServerTime: nowServerTime }
            lastSyncAtRef.current = nowServerTime
        }
    }, [currentIndex, currentQuestion, phase, attemptInfo, syncBatch, getNowOnServer])



    // ── Intro ──────────────────────────────────────────────────────────────────

    if (phase === "submitted") {
        return (
            <SubmittedScreen
                test={test}
                reason={submitReason}
                attemptId={attemptInfo?.id ?? null}
                onViewResults={() => {
                    router.push(submitRedirectPath ?? `/tests/${test.id}`)
                }}
                onSubmitFeedback={onSubmitFeedback}
            />
        )
    }

    if (phase === "intro") {
        return (
            <>
                <AlertDialog open={showUpdateNotice} onOpenChange={setShowUpdateNotice}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle className="flex items-center gap-2 text-primary">
                                Important Update
                            </AlertDialogTitle>
                            <AlertDialogDescription asChild>
                                <div className="space-y-3 pt-2 text-foreground">
                                    <p>
                                        <strong>New changes to Placetrix:</strong>
                                    </p>
                                    <p>
                                        Answers are no longer saved automatically. You will now need to manually save your pending selections!
                                    </p>
                                    <p>
                                        Use the <strong>Save Changes</strong> button at the top of the interface, or press the <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">CTRL + S</kbd> shortcut to save your progress periodically.
                                    </p>
                                </div>
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel onClick={() => setShowUpdateNotice(false)}>
                                Cancel
                            </AlertDialogCancel>
                            <AlertDialogAction onClick={async () => {
                                setShowUpdateNotice(false)
                                await enterFullscreen()
                                setPhase("active")
                            }}>
                                I Understand, Start Test
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>

                <IntroScreen
                    test={test}
                    questions={displayQuestions}
                    isResuming={isResuming}
                    isStarting={isStarting}
                    onBegin={async () => {
                        let info = attemptInfo
                        if (!info) {
                            setIsStarting(true)
                            try {
                                info = await onStartAttempt()
                                setAttemptInfo(info)
                                setFocusLostCount(info.tab_switch_count)
                                focusLostCountRef.current = info.tab_switch_count
                            } catch (err: any) {
                                const msg = err?.message ?? "Failed to start test"
                                const lowerMsg = msg.toLowerCase()
                                const userFriendlyMsg = (lowerMsg.includes("unexpected") && lowerMsg.includes("response"))
                                    ? "Your session may have expired. Please refresh the page and try again."
                                    : msg
                                toast.error(userFriendlyMsg)
                                setIsStarting(false)
                                return
                            }
                            setIsStarting(false)
                        }
                        setShowUpdateNotice(true)
                    }}
                />
            </>
        )
    }


    // ── Active ─────────────────────────────────────────────────────────────────

    return (
        <div className="flex min-h-screen overflow-hidden bg-background select-none">

            {/* ── Anti-Cheat: Focus Lost Dialog (highest priority) ─────────────── */}
            <AlertDialog open={showFocusWarning}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2 text-destructive">
                            <AlertTriangle className="h-5 w-5 shrink-0" />
                            Warning: Focus Lost
                        </AlertDialogTitle>
                        <AlertDialogDescription asChild>
                            <div className="space-y-3 pt-2">
                                <p className="text-sm text-foreground">
                                    You navigated away from the test window or switched tabs.
                                    This test is actively monitored for fair play.
                                </p>
                                <div className="flex items-start gap-2.5 rounded-xl border border-destructive bg-destructive/10 p-4">
                                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                                    <p className="text-sm text-destructive">
                                        Violation #{focusLostCount}{test.strict_mode ? <> of {MAX_VIOLATIONS}</> : null} recorded.{" "}
                                        {test.strict_mode
                                            ? focusLostCount >= MAX_VIOLATIONS
                                                ? "Your test is being submitted now."
                                                : `${MAX_VIOLATIONS - focusLostCount} remaining before automatic submission.`
                                            : "This incident has been logged and will be visible to your instructor."}
                                    </p>
                                </div>
                            </div>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogAction
                            onClick={() => {
                                // Re-arm the guard so the next real violation is detected.
                                focusGuardRef.current = false
                                setShowFocusWarning(false)
                            }}
                        >
                            I Understand, Return to Test
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* ── Fullscreen Required Dialog (shown only when focus dialog is closed) */}
            <AlertDialog open={showFullscreenWarning && !showFocusWarning}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2 text-amber-600 dark:text-amber-500">
                            <Maximize className="h-5 w-5 shrink-0" />
                            Fullscreen Required
                        </AlertDialogTitle>
                        <AlertDialogDescription asChild>
                            <div className="space-y-3 pt-2">
                                <p className="text-sm text-foreground">
                                    You exited fullscreen. This test must be completed in fullscreen mode.
                                </p>
                                <div className="flex items-start gap-2.5 rounded-xl border border-amber-500/50 bg-amber-50 dark:bg-amber-950/20 p-4">
                                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-500" />
                                    <p className="text-sm text-amber-800 dark:text-amber-300">
                                        Your progress is saved. No answers were lost.
                                        Please return to fullscreen to continue the test.
                                    </p>
                                </div>
                            </div>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogAction onClick={enterFullscreen}>
                            Return to Fullscreen
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>


            {/* ── Question column ───────────────────────────────────────────────── */}
            <main className="flex min-w-0 flex-1 flex-col">



                {/* Submit error banner */}
                {submitError && (
                    <div className="border-b border-destructive/20 bg-destructive/5 px-6 py-3">
                        <div className="mx-auto flex items-center gap-2 text-sm text-destructive">
                            <AlertTriangle className="h-4 w-4 shrink-0" />
                            <span className="min-w-0 flex-1 break-words">{submitError}</span>
                            <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 shrink-0 px-2 text-destructive hover:bg-destructive/10"
                                onClick={() => handleSubmit()}
                                disabled={isSubmitting}
                            >
                                Retry
                            </Button>
                        </div>
                    </div>
                )}

                {/* Offline banner */}
                {isOffline && (
                    <div className="border-b border-destructive/20 bg-destructive/5 px-6 py-3">
                        <div className="mx-auto flex flex-wrap items-center gap-2 text-sm font-semibold text-destructive">
                            <AlertTriangle className="h-4 w-4 shrink-0" />
                            <span>You are currently offline. Answers cannot be saved until you reconnect to the internet.</span>
                        </div>
                    </div>
                )}

                {/* Question body */}
                <div className="mx-auto w-full flex-1 px-6 py-6 pb-24 md:px-7 md:py-7 md:pb-14 lg:px-8 lg:py-8">

                    {currentQuestion && (
                        <QuestionView
                            question={currentQuestion}
                            index={currentIndex}
                            total={displayQuestions.length}
                            selectedIds={currentAnswers}
                            syncedIds={syncedAnswers[currentQuestion.id] ?? []}
                            isSaving={!!savingIds[currentQuestion.id]}
                            isUnsynced={!!unsyncedIds[currentQuestion.id]}
                            saveError={saveErrors[currentQuestion.id] ?? null}
                            isFlagged={flagged[currentQuestion.id] ?? false}
                            disabled={isSubmitting}
                            onAnswer={(optId) =>
                                handleAnswer(currentQuestion.id, optId, currentQuestion.question_type)
                            }
                            onToggleFlag={() => toggleFlag(currentQuestion.id)}
                        />
                    )}

                    {/* Desktop prev / next */}
                    <div className="mt-10 hidden items-center justify-between md:flex">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
                            disabled={currentIndex === 0}
                        >
                            <ChevronLeft className="mr-1 h-4 w-4" />
                            Previous
                        </Button>

                        <span className="text-xs tabular-nums text-muted-foreground">
                            {currentIndex + 1} / {questions.length}
                        </span>

                        {isLastQuestion ? (
                            <Button
                                size="sm"
                                onClick={() => setShowSubmitDialog(true)}
                                disabled={isSubmitting}
                            >
                                <Send className="mr-1.5 h-4 w-4" />
                                Submit Test
                            </Button>
                        ) : (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setCurrentIndex((i) => Math.min(questions.length - 1, i + 1))}
                            >
                                Next
                                <ChevronRight className="ml-1 h-4 w-4" />
                            </Button>
                        )}
                    </div>
                </div>
            </main>


            {/* ── Desktop sidebar ───────────────────────────────────────────────── */}
            <aside className="hidden md:flex md:w-56 lg:w-64 xl:w-72 shrink-0 border-l">
                <div className="sticky top-0 h-screen w-full overflow-y-auto">
                    <div className="flex flex-col gap-5 p-5 lg:p-6">

                        <div className="min-w-0 overflow-hidden border-b pb-4 flex flex-col gap-3">
                            <div className="flex justify-between items-start gap-2">
                                <p className="line-clamp-2 min-w-0 break-words text-sm font-semibold leading-snug">
                                    {test.title}
                                </p>
                                {isOffline && (
                                    <Badge variant="destructive" className="h-5 px-1.5 text-[10px] shrink-0">Offline</Badge>
                                )}
                            </div>

                            <Button
                                variant={unsyncedCount > 0 ? "default" : "outline"}
                                className={cn(
                                    "w-full gap-2 transition-all shadow-sm",
                                    unsyncedCount > 0 && "bg-primary text-primary-foreground hover:bg-primary/90",
                                    unsyncedCount === 0 && "border-emerald-200 bg-emerald-50 text-emerald-600 hover:bg-emerald-50 hover:text-emerald-600 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-400"
                                )}
                                onClick={() => syncBatch()}
                                disabled={isSubmitting || unsyncedCount === 0 || isAnySaving}
                            >
                                {isAnySaving ? (
                                    <><Loader2 className="h-3.5 w-3.5 animate-spin" />Saving…</>
                                ) : unsyncedCount > 0 ? (
                                    <>
                                        <span>Save Changes ({unsyncedCount})</span>
                                    </>
                                ) : (
                                    <>
                                        <span>Saved</span>
                                    </>
                                )}
                            </Button>
                        </div>

                        {test.time_limit_seconds && timeRemaining !== null && (
                            <TimerDisplay
                                timeRemaining={timeRemaining}
                                timerDanger={timerDanger}
                                timerWarning={timerWarning}
                            />
                        )}

                        <div className="px-1">
                            <QuestionNavigator
                                questions={displayQuestions}
                                currentIndex={currentIndex}
                                answers={answers}
                                savingIds={savingIds}
                                unsyncedIds={unsyncedIds}
                                flagged={flagged}
                                disabled={isSubmitting}
                                onJump={setCurrentIndex}
                            />
                        </div>

                        <div className="space-y-4">
                            <Button
                                className="w-full shrink-0"
                                onClick={() => setShowSubmitDialog(true)}
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? (
                                    <><Loader2 className="h-4 w-4 animate-spin" />Submitting…</>
                                ) : (
                                    <><Send className="h-4 w-4" />Submit Test</>
                                )}
                            </Button>
                        </div>

                    </div>
                </div>
            </aside>


            {/* ── Mobile fixed bottom bar ───────────────────────────────────────── */}
            <div className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur supports-[backdrop-filter]:bg-background/80 md:hidden">
                <div className="flex h-16 items-center gap-2 px-5">

                    <Button
                        variant="outline"
                        size="icon"
                        className="h-9 w-9 shrink-0"
                        onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
                        disabled={currentIndex === 0}
                        aria-label="Previous question"
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </Button>

                    <div className="flex min-w-0 flex-1 items-center justify-center gap-2">
                        {test.time_limit_seconds && timeRemaining !== null ? (
                            <TimerDisplay
                                timeRemaining={timeRemaining}
                                timerDanger={timerDanger}
                                timerWarning={timerWarning}
                                compact
                            />
                        ) : (
                            <span className="text-xs tabular-nums text-muted-foreground">
                                {currentIndex + 1} / {displayQuestions.length}
                            </span>
                        )}

                        {/* Mobile flag button — inline in bottom bar */}
                        {currentQuestion && (
                            <button
                                onClick={() => toggleFlag(currentQuestion.id)}
                                className={cn(
                                    "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border transition-all",
                                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500",
                                    flagged[currentQuestion.id]
                                        ? "border-amber-400 bg-amber-100 text-amber-600 dark:border-amber-600 dark:bg-amber-900/40 dark:text-amber-400"
                                        : "border-border bg-background text-muted-foreground hover:border-amber-400 hover:text-amber-600"
                                )}
                                aria-label={flagged[currentQuestion.id] ? "Remove flag" : "Flag for review"}
                            >
                                <Flag
                                    className={cn(
                                        "h-3.5 w-3.5",
                                        flagged[currentQuestion.id] && "fill-amber-500 text-amber-500"
                                    )}
                                />
                            </button>
                        )}
                    </div>

                    <Button
                        variant="outline"
                        size="icon"
                        className="h-9 w-9 shrink-0"
                        onClick={() => setNavSheetOpen(true)}
                        aria-label="Open question navigator"
                    >
                        <Menu className="h-4 w-4" />
                    </Button>

                    {isLastQuestion ? (
                        <Button
                            size="sm"
                            className="shrink-0"
                            onClick={() => setShowSubmitDialog(true)}
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <><Send className="mr-1.5 h-3.5 w-3.5" />Submit</>
                            )}
                        </Button>
                    ) : (
                        <Button
                            variant="outline"
                            size="icon"
                            className="h-9 w-9 shrink-0"
                            onClick={() => setCurrentIndex((i) => Math.min(questions.length - 1, i + 1))}
                            aria-label="Next question"
                        >
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    )}
                </div>
            </div>


            {/* ── Mobile nav sheet ──────────────────────────────────────────────── */}
            <Sheet open={navSheetOpen} onOpenChange={setNavSheetOpen}>
                <SheetContent side="right" className="flex w-72 flex-col overflow-hidden">
                    <SheetHeader className="border-b pb-4">
                        <div className="flex items-center justify-between">
                            <SheetTitle className="text-sm">Navigator</SheetTitle>
                            {isOffline && (
                                <Badge variant="destructive" className="h-5 px-1.5 text-[10px]">Offline</Badge>
                            )}
                        </div>
                        <Button
                            variant={unsyncedCount > 0 ? "default" : "outline"}
                            size="sm"
                            className={cn(
                                "w-full gap-2 transition-all shadow-sm mt-2",
                                unsyncedCount > 0 && "bg-primary text-primary-foreground hover:bg-primary/90",
                                unsyncedCount === 0 && "border-emerald-200 bg-emerald-50 text-emerald-600 hover:bg-emerald-50 hover:text-emerald-600 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-400"
                            )}
                            onClick={() => syncBatch()}
                            disabled={isSubmitting || unsyncedCount === 0 || isAnySaving}
                        >
                            {isAnySaving ? (
                                <><Loader2 className="h-3.5 w-3.5 animate-spin" />Saving…</>
                            ) : unsyncedCount > 0 ? (
                                <>
                                    <Clock className="h-3.5 w-3.5" />
                                    <span>Save ({unsyncedCount})</span>
                                </>
                            ) : (
                                <>
                                    <CheckCircle2 className="h-3.5 w-3.5" />
                                    <span>Saved</span>
                                </>
                            )}
                        </Button>
                    </SheetHeader>
                    <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-5 py-5">
                        <QuestionNavigator
                            questions={displayQuestions}
                            currentIndex={currentIndex}
                            answers={answers}
                            savingIds={savingIds}
                            unsyncedIds={unsyncedIds}
                            flagged={flagged}
                            disabled={isSubmitting}
                            onJump={(i) => {
                                setCurrentIndex(i)
                                setNavSheetOpen(false)
                            }}
                        />
                    </div>
                    <div className="border-t px-5 pb-4 pt-5">
                        <Button
                            className="w-full"
                            onClick={() => {
                                setNavSheetOpen(false)
                                setShowSubmitDialog(true)
                            }}
                            disabled={isSubmitting}
                        >
                            <Send />
                            Submit Test
                        </Button>
                    </div>
                </SheetContent>
            </Sheet>


            {/* ── Submit dialog ─────────────────────────────────────────────────── */}
            <AlertDialog open={showSubmitDialog} onOpenChange={setShowSubmitDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Submit your test?</AlertDialogTitle>
                        <AlertDialogDescription asChild>
                            <div className="space-y-3">
                                <p>
                                    You have answered{" "}
                                    <span className="font-semibold text-foreground">{answeredCount}</span> of{" "}
                                    <span className="font-semibold text-foreground">{questions.length}</span> questions.
                                </p>
                                {unansweredCount > 0 && (
                                    <div className="flex items-start gap-2 rounded-xl border border-destructive bg-destructive/10 p-4">
                                        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                                        <p className="text-sm text-destructive">
                                            {unansweredCount}{" "}
                                            {unansweredCount === 1 ? "question is" : "questions are"} unanswered.
                                            You cannot change answers after submitting.
                                        </p>
                                    </div>
                                )}
                                {flaggedCount > 0 && (
                                    <div className="flex items-start gap-2 rounded-xl border border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/20 p-4">
                                        <Flag className="mt-0.5 h-4 w-4 shrink-0 fill-amber-500 text-amber-600 dark:text-amber-400" />
                                        <p className="text-sm text-amber-700 dark:text-amber-300">
                                            {flaggedCount}{" "}
                                            {flaggedCount === 1 ? "question is" : "questions are"} flagged for review.
                                            Make sure you have revisited them before submitting.
                                        </p>
                                    </div>
                                )}
                                {unsyncedCount > 0 && (
                                    <div className="flex items-start gap-2 rounded-xl border border-blue-200 bg-blue-50 dark:border-blue-900/50 dark:bg-blue-950/30 p-4">
                                        <Clock className="mt-0.5 h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400" />
                                        <p className="text-sm text-blue-700 dark:text-blue-300">
                                            You have <span className="font-bold underline">{unsyncedCount}</span> unsaved {unsyncedCount === 1 ? "change" : "changes"}.
                                            All pending answers and pacing data will be automatically saved to our database before the test is submitted.
                                        </p>
                                    </div>
                                )}
                            </div>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isSubmitting}>Go back</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => handleSubmit()}
                            disabled={isSubmitting}
                            className={cn(hasUnsyncedWork && "bg-blue-600 hover:bg-blue-700")}
                        >
                            {isSubmitting ? (
                                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Submitting…</>
                            ) : hasUnsyncedWork ? (
                                "Sync & Submit"
                            ) : (
                                "Submit Test"
                            )}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}
