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
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
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
    MonitorSmartphone,
    Keyboard,
    ShieldCheck,
    HelpCircle,
    RotateCw,
    ArrowRight,
    WifiOff,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { InlineRichText } from "@/components/others/rich-text"
import { createClient } from "@/lib/supabase/client"
import { isDeploymentError, getFriendlyErrorMessage } from "@/lib/errors"
import type { AttemptTest, AttemptQuestion, AttemptSection, AttemptInfo, SavedAnswer } from "./_types"


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

async function requestFullscreen(el?: Element): Promise<boolean> {
    try {
        const target = el || (typeof document !== "undefined" ? document.documentElement || document.body : null)
        if (!target) return false
        if (target.requestFullscreen) {
            await target.requestFullscreen({ navigationUI: "hide" } as any)
            return true
        } else if ((target as any).webkitRequestFullscreen) {
            await (target as any).webkitRequestFullscreen()
            return true
        } else if ((target as any).mozRequestFullScreen) {
            await (target as any).mozRequestFullScreen()
            return true
        } else if ((target as any).msRequestFullscreen) {
            await (target as any).msRequestFullscreen()
            return true
        }
    } catch (err) {
        console.warn("[Fullscreen] Request rejected by browser:", err)
        return false
    }
    return false
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


// ─── Keyboard Shortcuts Modal ──────────────────────────────────────────────────

function KeyboardShortcutsDialog({
    open,
    onOpenChange,
}: {
    open: boolean
    onOpenChange: (open: boolean) => void
}) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-base font-bold">
                        <Keyboard className="h-5 w-5 text-primary" />
                        Keyboard Shortcuts
                    </DialogTitle>
                </DialogHeader>
                <div className="space-y-2.5 py-2 text-xs">
                    <div className="flex items-center justify-between rounded-xl border bg-muted/20 p-3">
                        <span className="font-medium text-foreground">Select Option A, B, C, D, E</span>
                        <div className="flex items-center gap-1 font-mono text-[11px]">
                            <kbd className="rounded border bg-background px-1.5 py-0.5 font-semibold shadow-xs">Ctrl</kbd>
                            <span>+</span>
                            <kbd className="rounded border bg-background px-1.5 py-0.5 font-semibold shadow-xs">A / B / C / D</kbd>
                        </div>
                    </div>
                    <div className="flex items-center justify-between rounded-xl border bg-muted/20 p-3">
                        <span className="font-medium text-foreground">Save & Next</span>
                        <div className="flex items-center gap-1 font-mono text-[11px]">
                            <kbd className="rounded border bg-background px-1.5 py-0.5 font-semibold shadow-xs">Ctrl</kbd>
                            <span>+</span>
                            <kbd className="rounded border bg-background px-1.5 py-0.5 font-semibold shadow-xs">S / Enter</kbd>
                        </div>
                    </div>
                    <div className="flex items-center justify-between rounded-xl border bg-muted/20 p-3">
                        <span className="font-medium text-foreground">Clear Response</span>
                        <div className="flex items-center gap-1 font-mono text-[11px]">
                            <kbd className="rounded border bg-background px-1.5 py-0.5 font-semibold shadow-xs">Ctrl</kbd>
                            <span>+</span>
                            <kbd className="rounded border bg-background px-1.5 py-0.5 font-semibold shadow-xs">Backspace</kbd>
                        </div>
                    </div>
                    <div className="flex items-center justify-between rounded-xl border bg-muted/20 p-3">
                        <span className="font-medium text-foreground">Toggle Flag for Review</span>
                        <div className="flex items-center gap-1 font-mono text-[11px]">
                            <kbd className="rounded border bg-background px-1.5 py-0.5 font-semibold shadow-xs">Ctrl</kbd>
                            <span>+</span>
                            <kbd className="rounded border bg-background px-1.5 py-0.5 font-semibold shadow-xs">F</kbd>
                        </div>
                    </div>
                    <div className="flex items-center justify-between rounded-xl border bg-muted/20 p-3">
                        <span className="font-medium text-foreground">Previous / Next Question</span>
                        <div className="flex items-center gap-1 font-mono text-[11px]">
                            <kbd className="rounded border bg-background px-1.5 py-0.5 font-semibold shadow-xs">←</kbd>
                            <span>/</span>
                            <kbd className="rounded border bg-background px-1.5 py-0.5 font-semibold shadow-xs">→</kbd>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}


// ─── Question Navigator ───────────────────────────────────────────────────────

function QuestionNavigator({
    questions: displayQuestions,
    sections,
    currentIndex,
    answers,
    syncedAnswers = {},
    flagged,
    disabled,
    onJump,
}: {
    questions: AttemptQuestion[]
    sections?: AttemptSection[]
    currentIndex: number
    answers: Record<string, string[]>
    syncedAnswers?: Record<string, string[]>
    flagged: Record<string, boolean>
    disabled?: boolean
    onJump: (i: number) => void
}) {
    const savedCount = useMemo(() => {
        return displayQuestions.filter((q) => {
            const current = answers[q.id] ?? []
            const synced = syncedAnswers[q.id] ?? []
            return current.length > 0 && JSON.stringify([...current].sort()) === JSON.stringify([...synced].sort())
        }).length
    }, [displayQuestions, answers, syncedAnswers])

    const unsavedCount = useMemo(() => {
        return displayQuestions.filter((q) => {
            const current = answers[q.id] ?? []
            const synced = syncedAnswers[q.id] ?? []
            return current.length > 0 && JSON.stringify([...current].sort()) !== JSON.stringify([...synced].sort())
        }).length
    }, [displayQuestions, answers, syncedAnswers])

    const flaggedCount = useMemo(() => {
        return Object.values(flagged).filter(Boolean).length
    }, [flagged])

    const hasSections = sections && sections.length > 0

    return (
        <div className="space-y-6">
            <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    <span>Progress</span>
                    <span className="tabular-nums font-semibold text-foreground">
                        {savedCount} / {displayQuestions.length} Saved
                    </span>
                </div>
                <Progress
                    value={(savedCount / displayQuestions.length) * 100}
                    className="h-2 w-full rounded-full"
                />
            </div>

            <div className="space-y-4">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Question Palette
                </p>

                {hasSections ? (
                  <div className="space-y-4">
                    {sections.map((sec) => {
                      const secQuestions = displayQuestions.filter((q) => q.section_id === sec.id)
                      if (secQuestions.length === 0) return null
                      const secSaved = secQuestions.filter((q) => {
                        const local = answers[q.id] ?? []
                        const synced = syncedAnswers[q.id] ?? []
                        return local.length > 0 && JSON.stringify([...local].sort()) === JSON.stringify([...synced].sort())
                      }).length

                      return (
                        <div key={sec.id} className="space-y-2 border-t pt-3 first:border-t-0 first:pt-0">
                          <div className="flex items-center justify-between text-[11px] font-bold text-foreground uppercase tracking-wider">
                            <span>{sec.name}</span>
                            <span className="text-[10px] text-muted-foreground font-normal">
                              {secSaved} / {secQuestions.length}
                            </span>
                          </div>
                          <div className="grid grid-cols-5 gap-2">
                            {secQuestions.map((q) => {
                              const globalIndex = displayQuestions.findIndex((dq) => dq.id === q.id)
                              const localAns = answers[q.id] ?? []
                              const syncedAns = syncedAnswers[q.id] ?? []
                              const hasLocal = localAns.length > 0
                              const isSaved = hasLocal && JSON.stringify([...localAns].sort()) === JSON.stringify([...syncedAns].sort())
                              const isPending = hasLocal && !isSaved
                              const isFlagged = flagged[q.id] ?? false
                              const isCurrent = globalIndex === currentIndex

                              return (
                                <button
                                  key={q.id}
                                  onClick={() => !disabled && onJump(globalIndex)}
                                  disabled={disabled}
                                  className={cn(
                                    "relative aspect-square w-full rounded-full border text-xs font-bold transition-all duration-150 flex items-center justify-center cursor-pointer select-none",
                                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                                    isCurrent && "ring-2 ring-primary ring-offset-2 z-10 scale-105 shadow-sm",
                                    isSaved
                                      ? "border-emerald-500 bg-emerald-50/80 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-300 font-bold"
                                      : isPending
                                        ? "border-amber-500 bg-amber-50/80 text-amber-700 hover:bg-amber-100 animate-pulse dark:border-amber-600 dark:bg-amber-950/40 dark:text-amber-300 font-bold"
                                        : isFlagged
                                          ? "border-indigo-500 bg-indigo-50/80 text-indigo-700 hover:bg-indigo-100 dark:border-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-300 font-bold"
                                          : "border-border bg-background text-muted-foreground hover:border-muted-foreground/50 hover:text-foreground font-semibold",
                                    disabled && "cursor-not-allowed opacity-60"
                                  )}
                                >
                                  {globalIndex + 1}
                                  {isFlagged && (
                                    <span className="absolute -right-1 -top-1 flex h-3.5 w-3.5 items-center justify-center rounded-full border border-indigo-200 bg-indigo-600 shadow-xs dark:border-indigo-900">
                                      <Flag className="h-2 w-2 fill-white text-white" />
                                    </span>
                                  )}
                                </button>
                              )
                            })}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="grid grid-cols-5 gap-2">
                    {displayQuestions.map((q, i) => {
                        const localAns = answers[q.id] ?? []
                        const syncedAns = syncedAnswers[q.id] ?? []
                        const hasLocal = localAns.length > 0
                        const isSaved = hasLocal && JSON.stringify([...localAns].sort()) === JSON.stringify([...syncedAns].sort())
                        const isPending = hasLocal && !isSaved
                        const isFlagged = flagged[q.id] ?? false
                        const isCurrent = i === currentIndex

                        return (
                            <button
                                key={q.id}
                                onClick={() => !disabled && onJump(i)}
                                disabled={disabled}
                                className={cn(
                                    "relative aspect-square w-full rounded-full border text-xs font-bold transition-all duration-150 flex items-center justify-center cursor-pointer select-none",
                                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                                    isCurrent && "ring-2 ring-primary ring-offset-2 z-10 scale-105 shadow-sm",
                                    isSaved
                                        ? "border-emerald-500 bg-emerald-50/80 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-300 font-bold"
                                        : isPending
                                            ? "border-amber-500 bg-amber-50/80 text-amber-700 hover:bg-amber-100 animate-pulse dark:border-amber-600 dark:bg-amber-950/40 dark:text-amber-300 font-bold"
                                            : isFlagged
                                                ? "border-indigo-500 bg-indigo-50/80 text-indigo-700 hover:bg-indigo-100 dark:border-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-300 font-bold"
                                                : "border-border bg-background text-muted-foreground hover:border-muted-foreground/50 hover:text-foreground font-semibold",
                                    disabled && "cursor-not-allowed opacity-60"
                                )}
                            >
                                {i + 1}
                                {isFlagged && (
                                    <span className="absolute -right-1 -top-1 flex h-3.5 w-3.5 items-center justify-center rounded-full border border-indigo-200 bg-indigo-600 shadow-xs dark:border-indigo-900">
                                        <Flag className="h-2 w-2 fill-white text-white" />
                                    </span>
                                )}
                            </button>
                        )
                    })}
                  </div>
                )}
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground pt-1 border-t">
                <div className="flex items-center gap-2">
                    <div className="h-3 w-3 shrink-0 rounded-full border border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40" />
                    <span>Saved ({savedCount})</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="h-3 w-3 shrink-0 rounded-full border border-amber-500 bg-amber-50 dark:bg-amber-950/40" />
                    <span>Unsaved ({unsavedCount})</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="h-3 w-3 shrink-0 rounded-full border border-indigo-500 bg-indigo-50 dark:bg-indigo-950/40 flex items-center justify-center">
                        <Flag className="h-2 w-2 fill-indigo-600 text-indigo-600 dark:fill-indigo-400 dark:text-indigo-400" />
                    </div>
                    <span>Flagged ({flaggedCount})</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="h-3 w-3 shrink-0 rounded-full border border-border bg-background" />
                    <span>Unanswered</span>
                </div>
            </div>
        </div>
    )
}


// ─── Option Button ────────────────────────────────────────────────────────────

function OptionButton({
    option,
    optionIndex,
    isSelected,
    questionType,
    isSaving,
    disabled,
    onClick,
}: {
    option: AttemptQuestion["options"][number]
    optionIndex: number
    isSelected: boolean
    questionType: "single_correct" | "multiple_correct"
    isSaving: boolean
    disabled?: boolean
    onClick: () => void
}) {
    const isSingle = questionType === "single_correct"
    const letter = String.fromCharCode(65 + optionIndex)

    return (
        <button
            onClick={onClick}
            disabled={disabled}
            className={cn(
                "group relative flex w-full min-h-[3rem] items-start gap-3.5 rounded-xl border p-4 text-left text-sm transition-all duration-150 cursor-pointer",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                isSelected
                    ? "border-primary bg-primary/5 text-foreground font-medium shadow-2xs"
                    : "border-border bg-card text-foreground/90 hover:border-muted-foreground/30 hover:bg-muted/30",
                disabled && "cursor-not-allowed opacity-70"
            )}
        >
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border bg-muted/40 text-[11px] font-bold text-muted-foreground group-hover:border-primary/40 group-hover:text-primary mt-0.5">
                {letter}
            </span>
            <span className="shrink-0 mt-0.5">
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
            <span className={cn("min-w-0 flex-1 break-words leading-snug text-left space-y-1.5", isSelected && "font-medium")}>
                <InlineRichText>{option.option_text}</InlineRichText>
            </span>
            {isSaving && isSelected && (
                <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-muted-foreground mt-0.5" />
            )}
        </button>
    )
}


// ─── Question View ────────────────────────────────────────────────────────────

function QuestionView({
    question,
    sections,
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
    onClearResponse,
}: {
    question: AttemptQuestion
    sections?: AttemptSection[]
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
    onClearResponse: () => void
}) {
    const isActuallySynced = JSON.stringify([...selectedIds].sort()) === JSON.stringify([...syncedIds].sort())
    const hasSelection = selectedIds.length > 0

    const currentSecIdx = sections && question.section_id
        ? sections.findIndex((s) => s.id === question.section_id)
        : -1
    const currentSec = currentSecIdx !== -1 && sections ? sections[currentSecIdx] : null

    return (
        <div className="space-y-6">
            {/* Section Header Text */}
            {currentSec && (
                <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-2">
                    <div className="flex items-center gap-2 min-w-0">
                        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                            {currentSec.name}
                        </span>
                        {currentSec.description && (
                            <span className="text-xs text-muted-foreground/70 truncate hidden sm:inline">
                                — {currentSec.description}
                            </span>
                        )}
                    </div>
                    {sections && sections.length > 1 && (
                        <span className="text-xs font-medium text-muted-foreground tabular-nums">
                            Section {currentSecIdx + 1} of {sections.length}
                        </span>
                    )}
                </div>
            )}

            <div className="space-y-3">
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                    <Badge variant="outline" className="shrink-0 text-xs font-semibold">
                        Q{index + 1} of {total}
                    </Badge>
                    <Badge variant="secondary" className="shrink-0 text-xs font-medium">
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

                <div className="break-words text-base font-medium leading-relaxed">
                    <InlineRichText>{question.question_text}</InlineRichText>
                </div>

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
                {question.options.map((opt, optIdx) => (
                    <OptionButton
                        key={opt.id}
                        option={opt}
                        optionIndex={optIdx}
                        isSelected={selectedIds.includes(opt.id)}
                        questionType={question.question_type}
                        isSaving={isSaving}
                        disabled={disabled}
                        onClick={() => onAnswer(opt.id)}
                    />
                ))}
            </div>

            {/* ── Clear Selection Control ────────────────────────────────────── */}
            {hasSelection && (
                <div className="flex items-center justify-start pt-1">
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={onClearResponse}
                        disabled={disabled || isSaving}
                        className="h-8 px-3 text-xs text-muted-foreground hover:text-foreground"
                    >
                        Clear Selection
                    </Button>
                </div>
            )}

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
                            <span className="text-primary font-medium">Saving to database…</span>
                        </>
                    ) : (!isActuallySynced) ? (
                        <>
                            <Clock className="h-3 w-3 text-amber-500 animate-pulse" />
                            <span className="text-amber-600 dark:text-amber-400 font-medium">Unsaved changes (Saving automatically…)</span>
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
                                {new Intl.DateTimeFormat(undefined, {
                                    day: "2-digit",
                                    month: "short",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                    hour12: true,
                                }).format(new Date(test.available_until))}
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

                {(() => {
                    const sectionsToUse = test.sections && test.sections.length > 0 ? test.sections : [{ id: "default-section-a", name: "Section A", description: null, order_index: 0 }]
                    return (
                        <div className="space-y-3 rounded-xl border bg-muted/40 p-5">
                            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                Test Sections ({sectionsToUse.length})
                            </p>
                            <div className="space-y-2 pt-0.5">
                                {sectionsToUse.map((sec, idx) => {
                                    const secQs = displayQuestions.filter((q) => (q.section_id ?? "default-section-a") === sec.id || sectionsToUse.length === 1)
                                    const secMarks = secQs.reduce((s, q) => s + q.marks, 0)
                                    return (
                                        <div key={sec.id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                                            <div className="flex items-center gap-2">
                                                <span className="font-semibold text-foreground">
                                                    {idx + 1}. {sec.name}
                                                </span>
                                                {sec.description && (
                                                    <span className="text-xs text-muted-foreground hidden sm:inline">
                                                        — {sec.description}
                                                    </span>
                                                )}
                                            </div>
                                            <span className="text-xs text-muted-foreground font-medium tabular-nums">
                                                {secQs.length} {secQs.length === 1 ? "question" : "questions"} ({secMarks} {secMarks === 1 ? "mark" : "marks"})
                                            </span>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    )
                })()}

                <div className="space-y-2.5 rounded-xl border border-amber-200 bg-amber-50 p-5 text-xs text-amber-800 dark:border-amber-900 dark:bg-amber-950/20 dark:text-amber-300">
                    <div className="flex items-start gap-2">
                        <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                        <p>
                            <strong>Answers are auto-saved every 5 seconds.</strong> You do not need to manually save anything.
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

function SubmittedScreen({
    test,
    reason,
    onViewResults,
}: {
    test: AttemptTest
    reason: "manual" | "auto"
    onViewResults: () => void
}) {
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
                        Submitted on {new Intl.DateTimeFormat(undefined, {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                            hour12: true,
                        }).format(new Date())}
                    </p>
                </div>

                {/* ── Centered Navigation Button ──────────────────────────── */}
                <div className="flex flex-col items-center justify-center gap-2 pt-3">
                    <Button
                        size="lg"
                        className="gap-2 px-8 font-semibold shadow-md sm:w-auto w-full"
                        onClick={onViewResults}
                    >
                        Go to Test Details
                        <ArrowRight className="h-4 w-4" />
                    </Button>
                    <p className="text-xs text-muted-foreground">
                        View released marks and test analysis for this test.
                    </p>
                </div>
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
    candidateId: string
    candidateName?: string
    candidateEmail?: string
    onStartAttempt: () => Promise<AttemptInfo>
    onSync: (
        attemptId: string,
        sessionToken: string,
        batch: Array<{
            questionId: string
            selectedOptionIds: string[]
            timeSpentSeconds: number
        }>
    ) => Promise<{ ok: boolean; error?: string }>
    onClaimSession: (attemptId: string, sessionToken: string) => Promise<{ ok: boolean; error?: string }>
    onSubmit?: (attemptId: string) => Promise<{ error?: string; redirectPath?: string }>
    serverNow: string
    // Called on every detected violation — fire-and-forget, never throws.
    onViolation?: (
        attemptId: string,
        type: "focus_loss" | "fullscreen_exit",
        totalCount: number,
        timestamp: string
    ) => Promise<void>
    shuffleSeed: string
}

function ExamWatermark({ name, email, candidateId }: { name?: string; email?: string; candidateId: string }) {
    const text = `${name || "Candidate"}${email ? ` • ${email}` : ""} • ID: ${candidateId.slice(0, 8).toUpperCase()}`
    const rows = [0, 1, 2, 3, 4]

    return (
        <div className="pointer-events-none fixed inset-0 z-50 flex flex-col justify-between overflow-hidden opacity-[0.045] select-none rotate-[-22deg] scale-125">
            {rows.map((row) => (
                <div key={row} className="flex whitespace-nowrap gap-12 font-mono text-xs font-bold uppercase tracking-widest text-foreground">
                    <span>{text}</span>
                    <span>{text}</span>
                    <span>{text}</span>
                    <span>{text}</span>
                </div>
            ))}
        </div>
    )
}

export function AttemptClient({
    test,
    questions,
    attemptInfo: initialAttemptInfo,
    savedAnswers,
    candidateId,
    candidateName,
    candidateEmail,
    onStartAttempt,
    onSync,
    onClaimSession,
    onSubmit,
    onViolation,
    serverNow,
    shuffleSeed,
}: Props) {
    const isResuming = initialAttemptInfo !== null

    // ── Shuffling (Client-Side) ──────────────────────────────────────────────────

    // ── Effective Sections & Normalized Questions ────────────────────────────────

    const effectiveSections = useMemo<AttemptSection[]>(() => {
        if (test.sections && test.sections.length > 0) {
            return test.sections
        }
        return [
            {
                id: "default-section-a",
                name: "Section A",
                description: null,
                order_index: 0,
            },
        ]
    }, [test.sections])

    const normalizedQuestions = useMemo(() => {
        const defaultSecId = effectiveSections[0].id

        return questions.map((q) => {
            if (!q.section_id) return { ...q, section_id: defaultSecId }
            const rawSecId = String(q.section_id).trim().toLowerCase()
            const matchedSec = effectiveSections.find(
                (s) => s.id.trim().toLowerCase() === rawSecId
            )
            return {
                ...q,
                section_id: matchedSec ? matchedSec.id : defaultSecId,
            }
        })
    }, [questions, effectiveSections])

    const displayQuestions = useMemo(() => {
        const seed = seedFromUUID(shuffleSeed)
        const qs = [...normalizedQuestions]

        const result: AttemptQuestion[] = []
        const sectionMap = new Map<string, AttemptQuestion[]>()
        
        effectiveSections.forEach((sec) => sectionMap.set(sec.id, []))

        qs.forEach((q) => {
            const targetKey = q.section_id && sectionMap.has(q.section_id)
                ? q.section_id
                : effectiveSections[0].id
            sectionMap.get(targetKey)!.push(q)
        })

        effectiveSections.forEach((sec, secIdx) => {
            let secQs = sectionMap.get(sec.id) ?? []
            if (secQs.length === 0) return

            // Shuffle questions per section
            if (test.shuffle_questions) {
                const secSeed = (seed + (secIdx + 1) * 10007) >>> 0
                const rng = mulberry32(secSeed)
                secQs = seededShuffle(secQs, rng)
            }

            // Shuffle options for each question
            if (test.shuffle_options) {
                secQs = secQs.map((q) => {
                    const qSeed = (seed + seedFromUUID(q.id)) >>> 0
                    const rng = mulberry32(qSeed)
                    return { ...q, options: seededShuffle(q.options, rng) }
                })
            }

            result.push(...secQs)
        })

        return result
    }, [normalizedQuestions, effectiveSections, test.shuffle_questions, test.shuffle_options, shuffleSeed])

    // ── State ──────────────────────────────────────────────────────────────────

    const [attemptInfo, setAttemptInfo] = useState<AttemptInfo | null>(initialAttemptInfo)
    const [phase, setPhase] = useState<"intro" | "active" | "submitted">("intro")
    const [submitReason, setSubmitReason] = useState<"manual" | "auto">("manual")
    const [submitRedirectPath, setSubmitRedirectPath] = useState<string | null>(null)
    const [showShortcutsModal, setShowShortcutsModal] = useState(false)
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

    const storagePrefix = attemptInfo ? `pt_attempt_${attemptInfo.id}` : null

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

    const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'error'>('idle')
    const [syncError, setSyncError] = useState<string | null>(null)
    const [sessionState, setSessionState] = useState<'ok' | 'conflict' | 'superseded'>('ok')
    const [conflictSince, setConflictSince] = useState<string | null>(null)
    const [syncedAnswers, setSyncedAnswers] = useState<Record<string, string[]>>(
        () => Object.fromEntries(savedAnswers.map((a) => [a.question_id, a.selected_option_ids]))
    )
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [submitError, setSubmitError] = useState<string | null>(null)
    const [showSubmitDialog, setShowSubmitDialog] = useState(false)
    const [navSheetOpen, setNavSheetOpen] = useState(false)
    const [timeRemaining, setTimeRemaining] = useState<number | null>(null)
    const [isClaimingSession, setIsClaimingSession] = useState(false)
    const [claimError, setClaimError] = useState<string | null>(null)
    // Set to true when a new deployment invalidates this browser's server-action IDs
    const [showDeploymentError, setShowDeploymentError] = useState(false)

    // Fullscreen
    const [showFullscreenWarning, setShowFullscreenWarning] = useState(false)

    // Anti-cheat
    const [showFocusWarning, setShowFocusWarning] = useState(false)
    const [showMultiMonitorWarning, setShowMultiMonitorWarning] = useState(false)
    const [showDevToolsWarning, setShowDevToolsWarning] = useState(false)
    const [focusLostCount, setFocusLostCount] = useState(initialAttemptInfo?.tab_switch_count ?? 0)

    // ── Session Token (sessionStorage per tab) ─────────────────────────────────
    const sessionTokenRef = useRef<string>("")
    useEffect(() => {
        const key = `pt_session_${test.id}`
        let token = attemptInfo?.active_session_token || sessionStorage.getItem(key)
        if (!token) {
            token = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2)
            sessionStorage.setItem(key, token)
        } else {
            sessionStorage.setItem(key, token)
        }
        sessionTokenRef.current = token
    }, [test.id, attemptInfo?.active_session_token])

    // ── Refs ───────────────────────────────────────────────────────────────────
    const autoSubmitted = useRef(false)
    const handleSubmitRef = useRef<((auto?: boolean) => Promise<void>) | undefined>(undefined)
    const performSyncRef = useRef<((isFinal?: boolean) => Promise<boolean>) | null>(null)
    const awayStartRef = useRef<number | null>(null)
    const beaconSentRef = useRef(false)

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
    const syncedAnswersRef = useRef(syncedAnswers)
    const syncPromiseRef = useRef<Promise<boolean> | null>(null)

    // ── High-Precision Active Question Timing Engine ──────────────────────────
    // Tracks active solving time per question (excluding backgrounding, blur, and idle).
    const questionPacingRef = useRef<Record<string, number>>({})
    useEffect(() => {
        if (typeof window !== "undefined" && storagePrefix) {
            try {
                const saved = localStorage.getItem(`${storagePrefix}_pacing`)
                if (saved) {
                    questionPacingRef.current = JSON.parse(saved)
                }
            } catch {}
        }
    }, [storagePrefix])
    const activeQuestionTrackerRef = useRef<{
        questionId: string | null
        lastActivePerfTime: number
        isPaused: boolean
    }>({
        questionId: null,
        lastActivePerfTime: typeof window !== "undefined" ? performance.now() : 0,
        isPaused: false,
    })

    const flushCurrentQuestionActiveTime = useCallback(() => {
        const tracker = activeQuestionTrackerRef.current
        if (!tracker || tracker.isPaused || !tracker.questionId) return

        const now = typeof window !== "undefined" ? performance.now() : 0
        const elapsedSec = Math.max(0, Math.floor((now - tracker.lastActivePerfTime) / 1000))
        if (elapsedSec > 0) {
            const qId = tracker.questionId
            const currentTotal = questionPacingRef.current[qId] ?? 0
            const nextTotal = currentTotal + elapsedSec
            questionPacingRef.current[qId] = nextTotal
            tracker.lastActivePerfTime += elapsedSec * 1000

            if (attemptInfo && typeof window !== "undefined") {
                try {
                    localStorage.setItem(
                        `pt_attempt_${attemptInfo.id}_pacing`,
                        JSON.stringify(questionPacingRef.current)
                    )
                } catch {}
            }
        }
    }, [attemptInfo])

    // Update active question target on question navigation
    useEffect(() => {
        if (phase === "active" && displayQuestions[currentIndex]) {
            const targetQId = displayQuestions[currentIndex].id
            activeQuestionTrackerRef.current = {
                questionId: targetQId,
                lastActivePerfTime: typeof window !== "undefined" ? performance.now() : 0,
                isPaused: typeof document !== "undefined" ? document.hidden : false,
            }
        }
    }, [phase, currentIndex, displayQuestions])

    // ── Idle / Inactivity Ceiling (AFK Protection: > 75s of zero activity pauses active clock) ──
    useEffect(() => {
        if (phase !== "active") return

        let idleTimer: NodeJS.Timeout | null = null

        const resetIdleTimer = () => {
            const tracker = activeQuestionTrackerRef.current
            // If was paused due to inactivity, resume clock from now
            if (tracker.isPaused && !document.hidden && !showFocusWarningRef.current) {
                tracker.lastActivePerfTime = performance.now()
                tracker.isPaused = false
            }

            if (idleTimer) clearTimeout(idleTimer)
            idleTimer = setTimeout(() => {
                if (phase === "active") {
                    flushCurrentQuestionActiveTime()
                    activeQuestionTrackerRef.current.isPaused = true
                }
            }, 75_000)
        }

        const events = ["mousemove", "mousedown", "keydown", "touchstart", "scroll"]
        events.forEach((ev) => window.addEventListener(ev, resetIdleTimer, { passive: true }))

        resetIdleTimer()

        return () => {
            if (idleTimer) clearTimeout(idleTimer)
            events.forEach((ev) => window.removeEventListener(ev, resetIdleTimer))
        }
    }, [phase, flushCurrentQuestionActiveTime])

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
    useEffect(() => { syncedAnswersRef.current = syncedAnswers }, [syncedAnswers])


    // ── Fullscreen helpers ─────────────────────────────────────────────────────

    const enterFullscreen = useCallback(async () => {
        await requestFullscreen(document.documentElement)
    }, [])

    const leaveFullscreen = useCallback(async () => {
        if (getFullscreenElement()) await exitFullscreen()
    }, [])


    // ── Event Listeners: Fullscreen, Anti-Cheat & Copy-Block ──────────────────

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
        const triggerFocusLoss = () => {
            if (autoSubmitted.current || isSubmittingRef.current) return
            if (showFocusWarningRef.current) return
            if (focusGuardRef.current) return
            focusGuardRef.current = true

            focusLostCountRef.current += 1
            const currentCount = focusLostCountRef.current

            setFocusLostCount(currentCount)
            setShowFocusWarning(true)

            if (attemptInfo) {
                const now = Date.now()
                const lastSync = (window as any)._lastViolationSync ?? 0
                if (now - lastSync > 2000) {
                    (window as any)._lastViolationSync = now
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
                setTimeout(() => handleSubmitRef.current?.(true), 0)
            }
        }

        const handleVisibilityChange = () => {
            if (document.visibilityState === "hidden") {
                flushCurrentQuestionActiveTime()
                activeQuestionTrackerRef.current.isPaused = true

                if (showFocusWarningRef.current) return
                awayStartRef.current = getNowOnServer().getTime()
                if (phase === "active" && attemptInfo) {
                    beaconSentRef.current = true
                    try {
                        navigator.sendBeacon(
                            "/api/attempt/beacon",
                            JSON.stringify({
                                attemptId: attemptInfo.id,
                                type: "tab_switch",
                                count: focusLostCountRef.current + 1,
                                timestamp: getNowOnServer().toISOString(),
                            })
                        )
                    } catch {}
                }
                triggerFocusLoss()
            } else if (document.visibilityState === "visible") {
                activeQuestionTrackerRef.current.lastActivePerfTime = performance.now()
                activeQuestionTrackerRef.current.isPaused = false
                awayStartRef.current = null
                focusGuardRef.current = false
            }
        }

        const handleBlur = () => {
            flushCurrentQuestionActiveTime()
            activeQuestionTrackerRef.current.isPaused = true

            setTimeout(() => {
                // Ensure document visibility is hidden (tab switch/minimize) or genuinely lost focus without active warning
                if (!document.hasFocus() && document.visibilityState === "hidden" && !showFocusWarningRef.current) {
                    triggerFocusLoss()
                }
            }, 300)
        }

        const handleWindowFocus = () => {
            activeQuestionTrackerRef.current.lastActivePerfTime = performance.now()
            activeQuestionTrackerRef.current.isPaused = false
            if (document.hasFocus()) {
                focusGuardRef.current = false
            }
        }

        // 3. Copy / keyboard blocking / Navigation ──────────────────────────
        const handleKeyDown = (e: KeyboardEvent) => {
            if (
                e.target instanceof HTMLInputElement ||
                e.target instanceof HTMLTextAreaElement
            ) {
                return
            }

            const ctrl = e.ctrlKey || e.metaKey

            // Copy & DevTools blocking
            if (ctrl && ["p", "u"].includes(e.key.toLowerCase())) {
                e.preventDefault()
            }
            if (ctrl && e.shiftKey && ["i", "j", "c"].includes(e.key.toLowerCase())) {
                e.preventDefault()
            }
            if (e.key === "F12") e.preventDefault()

            if (
                !showSubmitDialogRef.current &&
                !navSheetOpenRef.current &&
                !showFocusWarningRef.current &&
                !showFullscreenWarningRef.current &&
                !isSubmittingRef.current
            ) {
                const keyLower = e.key.toLowerCase()
                const q = questionsRef.current[currentIndexRef.current]

                // Action shortcuts requiring Ctrl / Cmd key
                if (ctrl) {
                    // Option select via Ctrl+1..5 or Ctrl+A..E
                    if (q && (["1", "2", "3", "4", "5"].includes(e.key) || ["a", "b", "c", "d", "e"].includes(keyLower))) {
                        let optIndex = -1
                        if (["1", "2", "3", "4", "5"].includes(e.key)) {
                            optIndex = parseInt(e.key, 10) - 1
                        } else {
                            optIndex = keyLower.charCodeAt(0) - 97
                        }
                        if (optIndex >= 0 && optIndex < q.options.length) {
                            const opt = q.options[optIndex]
                            handleAnswer(q.id, opt.id, q.question_type)
                            e.preventDefault()
                            return
                        }
                    }

                    // Save & Next via Ctrl+S or Ctrl+Enter
                    if (keyLower === "s" || e.key === "Enter") {
                        handleNextRef.current?.()
                        e.preventDefault()
                        return
                    }

                    // Clear selection via Ctrl+Backspace, Ctrl+Delete, or Ctrl+X
                    if (e.key === "Backspace" || e.key === "Delete" || keyLower === "x") {
                        handleClearResponseRef.current?.()
                        e.preventDefault()
                        return
                    }

                    // Toggle Flag via Ctrl+F
                    if (keyLower === "f") {
                        if (q) {
                            toggleFlag(q.id)
                            e.preventDefault()
                            return
                        }
                    }

                    // Previous / Next via Ctrl+Left / Ctrl+Right
                    if (e.key === "ArrowLeft") {
                        handlePreviousRef.current?.()
                        e.preventDefault()
                        return
                    } else if (e.key === "ArrowRight") {
                        handleNextRef.current?.()
                        e.preventDefault()
                        return
                    }
                } else {
                    // Arrow navigation without modifier keys
                    if (e.key === "ArrowLeft") {
                        handlePreviousRef.current?.()
                        e.preventDefault()
                    } else if (e.key === "ArrowRight") {
                        handleNextRef.current?.()
                        e.preventDefault()
                    }
                }
            }
        }

        const handleCopy = (e: ClipboardEvent) => e.preventDefault()
        const handleContextMenu = (e: MouseEvent) => e.preventDefault()
        const handleDragStart = (e: DragEvent) => e.preventDefault()

        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (autoSubmitted.current || isSubmittingRef.current) return
            e.preventDefault()
            e.returnValue = ""

            if (!beaconSentRef.current && attemptInfo) {
                try {
                    navigator.sendBeacon(
                        "/api/attempt/beacon",
                        JSON.stringify({
                            attemptId: attemptInfo.id,
                            type: "tab_close",
                            count: focusLostCountRef.current + 1,
                            timestamp: getNowOnServer().toISOString(),
                        })
                    )
                } catch {}
            }
            beaconSentRef.current = false
        }

        document.addEventListener("fullscreenchange", handleFullscreenChange)
        document.addEventListener("webkitfullscreenchange", handleFullscreenChange)
        document.addEventListener("mozfullscreenchange", handleFullscreenChange)
        document.addEventListener("visibilitychange", handleVisibilityChange)
        document.addEventListener("keydown", handleKeyDown)
        document.addEventListener("copy", handleCopy)
        document.addEventListener("contextmenu", handleContextMenu)
        document.addEventListener("dragstart", handleDragStart)
        window.addEventListener("blur", handleBlur)
        window.addEventListener("focus", handleWindowFocus)
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
            window.removeEventListener("focus", handleWindowFocus)
            window.removeEventListener("beforeunload", handleBeforeUnload)
        }
    }, [phase, attemptInfo, getNowOnServer, onViolation, test.strict_mode])


    // ── Level 2 & Level 3 Security Checks (Multi-Monitor & DevTools Detection) ──
    useEffect(() => {
        if (phase !== "active") return

        // 1. Level 2: Extended Screen / Multi-Monitor Detection
        const checkScreenCount = async () => {
            try {
                if ("getScreenDetails" in window) {
                    const details = await (window as any).getScreenDetails()
                    if (details?.screens?.length > 1) {
                        setShowMultiMonitorWarning(true)
                    } else {
                        setShowMultiMonitorWarning(false)
                    }
                } else if (typeof window !== "undefined" && window.screen) {
                    if ((window as any).screen.isExtended) {
                        setShowMultiMonitorWarning(true)
                    }
                }
            } catch {}
        }

        checkScreenCount()
        const monitorInterval = setInterval(checkScreenCount, 5000)

        // 2. Level 3: DevTools Geometry & Inspection Detector
        const detectDevTools = () => {
            if (autoSubmitted.current || isSubmittingRef.current) return
            const threshold = 160
            const widthDiff = window.outerWidth - window.innerWidth > threshold
            const heightDiff = window.outerHeight - window.innerHeight > threshold
            if (widthDiff || heightDiff) {
                setShowDevToolsWarning(true)
            } else {
                setShowDevToolsWarning(false)
            }
        }

        window.addEventListener("resize", detectDevTools)
        detectDevTools()

        return () => {
            clearInterval(monitorInterval)
            window.removeEventListener("resize", detectDevTools)
        }
    }, [phase])


    // ── Supabase Realtime Channels ──────────────────────────────────────────────
    useEffect(() => {
        if (!attemptInfo || phase !== "active") return
        const supabase = createClient()

        // 1. Presence: Live active candidate tracking for institute dashboard
        const liveChannel = supabase.channel(`pt-test-live-${test.id}`)
        liveChannel.subscribe(async (status) => {
            if (status === "SUBSCRIBED") {
                try {
                    await liveChannel.track({
                        userId: candidateId,
                        attemptId: attemptInfo.id,
                    })
                } catch (e) {
                    console.error("[Realtime] Presence track error:", e)
                }
            }
        })

        // 2. Broadcast: Instant session kick if another device claims session
        const sessionChannel = supabase.channel(`pt-session-${attemptInfo.id}`)
        sessionChannel
            .on("broadcast", { event: "session_claimed" }, () => {
                setSessionState("superseded")
            })
            .subscribe()

        // 3. Postgres Changes: Status changes (force-submit by institute)
        const attemptChannel = supabase.channel(`pt-attempt-${attemptInfo.id}`)
        attemptChannel
            .on(
                "postgres_changes",
                {
                    event: "UPDATE",
                    schema: "public",
                    table: "test_attempts",
                    filter: `id=eq.${attemptInfo.id}`,
                },
                (payload: any) => {
                    const updated = payload.new
                    if (updated && ["submitted", "auto_submitted"].includes(updated.status)) {
                        setPhase("submitted")
                        setSubmitReason("auto")
                    }
                    if (
                        updated &&
                        updated.active_session_token &&
                        sessionTokenRef.current &&
                        updated.active_session_token !== sessionTokenRef.current
                    ) {
                        setSessionState("superseded")
                    }
                }
            )
            .subscribe()

        return () => {
            try {
                liveChannel.untrack().catch(() => {})
                supabase.removeChannel(liveChannel).catch(() => {})
                supabase.removeChannel(sessionChannel).catch(() => {})
                supabase.removeChannel(attemptChannel).catch(() => {})
            } catch {}
        }
    }, [attemptInfo?.id, phase, test.id, candidateId])


    // ── Toggle flag ────────────────────────────────────────────────────────────

    const toggleFlag = useCallback((questionId: string) => {
        setFlagged((prev) => ({ ...prev, [questionId]: !prev[questionId] }))
    }, [])


    // ── Adaptive Exam Sync & Heartbeat Loop ──────────────────────────────────
    const batchQueueRef = useRef<Set<string>>(new Set())
    const lastSyncTimestampRef = useRef<number>(Date.now())

    const performSync = useCallback(
        async (isFinalSync = false): Promise<boolean> => {
            if (!onSync || !attemptInfo || (isSubmittingRef.current && !isFinalSync)) return true

            // Mutex lock: if another sync is currently in flight, wait for it to complete
            if (syncPromiseRef.current) {
                try {
                    await syncPromiseRef.current
                } catch {}
            }

            // Commit current question active elapsed time
            flushCurrentQuestionActiveTime()

            // If final sync on test submission, ensure all questions with recorded pacing or answers are queued
            if (isFinalSync) {
                displayQuestions.forEach((q) => {
                    const pacing = questionPacingRef.current[q.id] ?? 0
                    const ans = answersRef.current[q.id] ?? []
                    if (pacing > 0 || ans.length > 0) {
                        batchQueueRef.current.add(q.id)
                    }
                })
            }

            const idsToSync = Array.from(batchQueueRef.current)
            if (idsToSync.length === 0 && !isFinalSync) return true

            batchQueueRef.current.clear()

            const batch = idsToSync.map((id) => ({
                questionId: id,
                selectedOptionIds: [...(answersRef.current[id] ?? [])],
                timeSpentSeconds: questionPacingRef.current[id] ?? 0,
            }))

            setSyncStatus("syncing")

            const syncTask = (async (): Promise<boolean> => {
                try {
                    const result = await onSync(attemptInfo.id, sessionTokenRef.current, batch)

                    if (!result.ok) {
                        idsToSync.forEach((id) => batchQueueRef.current.add(id))

                        if (result.error === "session_superseded") {
                            setSessionState("superseded")
                            return false
                        }

                        setSyncStatus("error")
                        setSyncError(result.error ?? "Sync failed")
                        return false
                    }

                    // Success
                    lastSyncTimestampRef.current = Date.now()
                    const newSynced: Record<string, string[]> = {}
                    batch.forEach((b) => { newSynced[b.questionId] = b.selectedOptionIds })
                    setSyncedAnswers((prev) => ({ ...prev, ...newSynced }))
                    setSyncStatus("idle")
                    setSyncError(null)
                    return true
                } catch (err: any) {
                    idsToSync.forEach((id) => batchQueueRef.current.add(id))
                    if (isDeploymentError(err)) {
                        setShowDeploymentError(true)
                        setSyncStatus("error")
                        setSyncError("App was updated — please refresh")
                    } else {
                        setSyncStatus("error")
                        setSyncError(getFriendlyErrorMessage(err, "Connection lost. Your answers are saved locally and will sync when reconnected."))
                    }
                    return false
                } finally {
                    syncPromiseRef.current = null
                }
            })()

            syncPromiseRef.current = syncTask
            return syncTask
        },
        [attemptInfo, onSync, flushCurrentQuestionActiveTime, displayQuestions]
    )

    useEffect(() => {
        performSyncRef.current = performSync
    }, [performSync])

    // ── Navigation & Integrated Auto-Save Handlers ─────────────────────────────

    const currentQuestion = displayQuestions[currentIndex]

    const handleNext = useCallback(() => {
        if (isSubmittingRef.current) return
        flushCurrentQuestionActiveTime()
        setCurrentIndex((i) => Math.min(displayQuestions.length - 1, i + 1))
        performSync()
    }, [displayQuestions.length, flushCurrentQuestionActiveTime, performSync])

    const handlePrevious = useCallback(() => {
        if (isSubmittingRef.current) return
        flushCurrentQuestionActiveTime()
        setCurrentIndex((i) => Math.max(0, i - 1))
        performSync()
    }, [flushCurrentQuestionActiveTime, performSync])

    const handleJump = useCallback((targetIndex: number) => {
        if (isSubmittingRef.current || targetIndex === currentIndex) return
        flushCurrentQuestionActiveTime()
        setCurrentIndex(targetIndex)
        performSync()
    }, [currentIndex, flushCurrentQuestionActiveTime, performSync])

    const autoSyncTimerRef = useRef<NodeJS.Timeout | null>(null)

    const triggerDebouncedSync = useCallback(() => {
        if (autoSyncTimerRef.current) clearTimeout(autoSyncTimerRef.current)
        autoSyncTimerRef.current = setTimeout(() => {
            if (!isSubmittingRef.current && performSyncRef.current) {
                performSyncRef.current()
            }
        }, 400)
    }, [])

    const handleClearResponse = useCallback(() => {
        if (!currentQuestion || isSubmittingRef.current) return
        const qId = currentQuestion.id
        answersRef.current[qId] = []

        const synced = syncedAnswersRef.current[qId] ?? []
        if (synced.length > 0) {
            batchQueueRef.current.add(qId)
        } else {
            batchQueueRef.current.delete(qId)
        }

        setAnswers((prev) => ({ ...prev, [qId]: [] }))
        triggerDebouncedSync()
    }, [currentQuestion, triggerDebouncedSync])

    const handleNextRef = useRef<() => void>(() => {})
    const handlePreviousRef = useRef<() => void>(() => {})
    const handleClearResponseRef = useRef<(() => void) | undefined>(undefined)

    useEffect(() => {
        handleNextRef.current = handleNext
        handlePreviousRef.current = handlePrevious
        handleClearResponseRef.current = handleClearResponse
    }, [handleNext, handlePrevious, handleClearResponse])

    // Adaptive session heartbeat: checks every 120s; skips if a sync occurred within the last 120s
    useEffect(() => {
        if (phase !== "active" || !attemptInfo || !onSync) return

        const id = setInterval(async () => {
            if (isSubmittingRef.current || !sessionTokenRef.current) return

            const timeSinceLastSync = Date.now() - lastSyncTimestampRef.current
            // If the student already synced within the last 120 seconds, skip the heartbeat ping
            if (timeSinceLastSync < 120_000) return

            try {
                lastSyncTimestampRef.current = Date.now()
                const res = await onSync(attemptInfo.id, sessionTokenRef.current, [])
                if (!res.ok && res.error === "session_superseded") {
                    setSessionState("superseded")
                }
            } catch {}
        }, 120_000)

        return () => clearInterval(id)
    }, [phase, attemptInfo, onSync])


    // ── Handle option select ───────────────────────────────────────────────────

    const handleAnswer = useCallback(
        (
            questionId: string,
            optionId: string,
            questionType: "single_correct" | "multiple_correct"
        ) => {
            if (isSubmittingRef.current) return

            const current = answersRef.current[questionId] ?? []
            const next =
                questionType === "single_correct"
                    ? (current.length === 1 && current[0] === optionId ? [] : [optionId])
                    : current.includes(optionId)
                        ? current.filter((id) => id !== optionId)
                        : [...current, optionId]

            answersRef.current[questionId] = next

            // Only queue question for save if the new selection differs from what is saved on the server!
            const synced = syncedAnswersRef.current[questionId] ?? []
            const isDifferentFromSynced = JSON.stringify([...next].sort()) !== JSON.stringify([...synced].sort())

            if (isDifferentFromSynced) {
                batchQueueRef.current.add(questionId)
            } else {
                batchQueueRef.current.delete(questionId)
            }

            setAnswers((prev) => ({ ...prev, [questionId]: next }))
            triggerDebouncedSync()
        },
        [triggerDebouncedSync]
    )


    // ── Submit ─────────────────────────────────────────────────────────────────

    const handleSubmit = useCallback(
        async (auto = false) => {
            if (isSubmittingRef.current || !attemptInfo) return
            isSubmittingRef.current = true
            setIsSubmitting(true)
            setSubmitError(null)
            setShowSubmitDialog(false)
            setNavSheetOpen(false)
            setShowFullscreenWarning(false)
            setShowFocusWarning(false)

            try {
                // Final flush of all pending answers and pacing
                if (phase === "active" && performSyncRef.current) {
                    const syncOk = await performSyncRef.current(true)
                    if (syncOk === false && !auto) {
                        throw new Error("Failed to save pending answers. Please check your connection and retry.")
                    }
                }

                await leaveFullscreen()

                const prefix = `pt_attempt_${attemptInfo.id}`
                localStorage.removeItem(`${prefix}_idx`)
                localStorage.removeItem(`${prefix}_flags`)

                const submitResult = await onSubmit?.(attemptInfo.id)
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
                if (err?.message === "NEXT_REDIRECT" || err?.digest?.includes("NEXT_REDIRECT")) throw err

                setIsSubmitting(false)
                isSubmittingRef.current = false

                if (isDeploymentError(err)) {
                    setShowDeploymentError(true)
                    return
                }

                const userFriendlyMsg = getFriendlyErrorMessage(err, "Submission failed. Please try again.")

                setSubmitError(userFriendlyMsg)
                toast.error(userFriendlyMsg)
            }
        },
        [attemptInfo, onSubmit, leaveFullscreen, phase, test.id]
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


    const savedCount = useMemo(() => {
        return displayQuestions.filter((q) => {
            const current = answers[q.id] ?? []
            const synced = syncedAnswers[q.id] ?? []
            return current.length > 0 && JSON.stringify([...current].sort()) === JSON.stringify([...synced].sort())
        }).length
    }, [displayQuestions, answers, syncedAnswers])

    const pendingCount = useMemo(() => {
        return displayQuestions.filter((q) => {
            const current = answers[q.id] ?? []
            const synced = syncedAnswers[q.id] ?? []
            return current.length > 0 && JSON.stringify([...current].sort()) !== JSON.stringify([...synced].sort())
        }).length
    }, [displayQuestions, answers, syncedAnswers])

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





    // ── Intro ──────────────────────────────────────────────────────────────────

    // ── Deployment Update Overlay (checked before all other phase guards) ──────
    if (showDeploymentError) {
        return (
            <div className="flex min-h-screen items-center justify-center p-6 bg-background">
                <div className="mx-auto w-full max-w-md space-y-5 rounded-2xl border bg-card p-6 shadow-xl">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-950/40">
                            <RotateCw className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                        </div>
                        <div>
                            <h2 className="text-base font-bold text-foreground">App Updated Mid-Session</h2>
                            <p className="text-xs text-muted-foreground">A new version was deployed while you had this page open.</p>
                        </div>
                    </div>
                    <div className="rounded-xl border border-amber-200 bg-amber-50 dark:border-amber-900/40 dark:bg-amber-950/20 p-4 space-y-2 text-sm text-amber-800 dark:text-amber-300">
                        <p className="font-semibold">Your answers are safe.</p>
                        <p className="text-xs leading-relaxed">
                            All answers synced to this point are stored on the server. Refreshing will load the updated app and reconnect your test session — you can continue exactly where you left off.
                        </p>
                    </div>
                    <div className="rounded-xl border bg-muted/50 p-3 text-xs text-muted-foreground space-y-1">
                        <p className="font-semibold text-foreground">What to do:</p>
                        <ol className="list-decimal list-inside space-y-0.5 leading-relaxed">
                            <li>Note any unsaved answers (shown in your navigation panel)</li>
                            <li>Click <span className="font-semibold text-foreground">Refresh Page</span> below</li>
                            <li>Your test will resume automatically — continue and submit normally</li>
                        </ol>
                    </div>
                    <Button className="w-full" onClick={() => window.location.reload()}>
                        <RotateCw className="mr-2 h-4 w-4" />
                        Refresh Page to Continue
                    </Button>
                </div>
            </div>
        )
    }

    // ── Session Conflict & Superseded Screens ──────────────────────────────────
    if (sessionState === "conflict") {
        return (
            <div className="flex min-h-screen items-center justify-center p-6 bg-background">
                <div className="mx-auto w-full max-w-md space-y-6 rounded-2xl border bg-card p-6 shadow-lg">
                    <div className="flex items-center gap-3 text-amber-600 dark:text-amber-500">
                        <MonitorSmartphone className="h-6 w-6 shrink-0" />
                        <h2 className="text-lg font-bold text-foreground">Test Open on Another Device</h2>
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                        This test session is currently active on another device or tab.
                    </p>
                    {claimError && (
                        <p className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-xs text-destructive font-medium">
                            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                            {claimError}
                        </p>
                    )}
                    <div className="flex justify-end gap-3 pt-2">
                        <Button variant="outline" onClick={() => router.push(`/tests/${test.id}`)} disabled={isClaimingSession}>
                            Cancel
                        </Button>
                        <Button
                            disabled={isClaimingSession}
                            onClick={async () => {
                                if (!attemptInfo) return
                                setIsClaimingSession(true)
                                setClaimError(null)
                                try {
                                    const res = await onClaimSession(attemptInfo.id, sessionTokenRef.current)
                                    if (res.ok) {
                                        try {
                                            const supabase = createClient()
                                            const sessionChannel = supabase.channel(`pt-session-${attemptInfo.id}`)
                                            await sessionChannel.send({ type: "broadcast", event: "session_claimed", payload: {} })
                                        } catch {}
                                        setSessionState("ok")
                                    } else {
                                        setClaimError(res.error ?? "Failed to switch session. Please try again.")
                                    }
                                } catch (err: any) {
                                    setClaimError(err?.message ?? "Failed to switch session. Please try again.")
                                } finally {
                                    setIsClaimingSession(false)
                                }
                            }}
                        >
                            {isClaimingSession ? (
                                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Switching…</>
                            ) : (
                                "Switch to This Device"
                            )}
                        </Button>
                    </div>
                </div>
            </div>
        )
    }

    if (sessionState === "superseded") {
        return (
            <div className="flex min-h-screen items-center justify-center p-6 bg-background">
                <div className="mx-auto w-full max-w-md space-y-6 rounded-2xl border border-destructive/30 bg-card p-6 shadow-lg">
                    <div className="flex items-center gap-3 text-destructive">
                        <AlertTriangle className="h-6 w-6 shrink-0" />
                        <h2 className="text-lg font-bold text-foreground">Session Moved to Another Device</h2>
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                        Your test session was opened and claimed on another device. Interaction on this window is paused. Your progress is preserved.
                    </p>
                    {claimError && (
                        <p className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-xs text-destructive font-medium">
                            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                            {claimError}
                        </p>
                    )}
                    <div className="flex justify-end gap-3 pt-2">
                        <Button
                            disabled={isClaimingSession}
                            onClick={async () => {
                                if (!attemptInfo) return
                                setIsClaimingSession(true)
                                setClaimError(null)
                                try {
                                    const res = await onClaimSession(attemptInfo.id, sessionTokenRef.current)
                                    if (res.ok) {
                                        try {
                                            const supabase = createClient()
                                            const sessionChannel = supabase.channel(`pt-session-${attemptInfo.id}`)
                                            await sessionChannel.send({ type: "broadcast", event: "session_claimed", payload: {} })
                                        } catch {}
                                        setSessionState("ok")
                                    } else {
                                        setClaimError(res.error ?? "Failed to reclaim session. Please try again.")
                                    }
                                } catch (err: any) {
                                    setClaimError(err?.message ?? "Failed to reclaim session. Please try again.")
                                } finally {
                                    setIsClaimingSession(false)
                                }
                            }}
                        >
                            {isClaimingSession ? (
                                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Reclaiming…</>
                            ) : (
                                "Reclaim This Session"
                            )}
                        </Button>
                    </div>
                </div>
            </div>
        )
    }

    if (phase === "submitted") {
        return (
            <SubmittedScreen
                test={test}
                reason={submitReason}
                onViewResults={() => {
                    router.push(submitRedirectPath ?? `/tests/${test.id}`)
                }}
            />
        )
    }

    if (phase === "intro") {
        return (
            <IntroScreen
                test={test}
                questions={displayQuestions}
                isResuming={isResuming}
                isStarting={isStarting}
                onBegin={async () => {
                    // Synchronously fire fullscreen request in response to direct click gesture
                    const fsPromise = requestFullscreen(document.documentElement)
                    try {
                        let info = attemptInfo
                        if (!info) {
                            setIsStarting(true)
                            try {
                                info = await onStartAttempt()
                                setAttemptInfo(info)
                                setFocusLostCount(info.tab_switch_count)
                                focusLostCountRef.current = info.tab_switch_count
                            } catch (err: any) {
                                await exitFullscreen()
                                if (isDeploymentError(err)) {
                                    setShowDeploymentError(true)
                                    setIsStarting(false)
                                    return
                                }
                                const userFriendlyMsg = getFriendlyErrorMessage(err, "Failed to start test. Please check your connection and try again.")
                                toast.error(userFriendlyMsg)
                                setIsStarting(false)
                                return
                            }
                            setIsStarting(false)
                        }
                        if (info) {
                            await fsPromise
                            setPhase("active")
                        }
                    } catch (err: any) {
                        await exitFullscreen()
                        setIsStarting(false)
                        toast.error("Failed to start test due to a network glitch. Please try again.")
                    }
                }}
            />
        )
    }


    // ── Active ─────────────────────────────────────────────────────────────────

    const isAnyModalOpen =
        showFocusWarning ||
        showFullscreenWarning ||
        showMultiMonitorWarning ||
        showDevToolsWarning ||
        showSubmitDialog ||
        showShortcutsModal ||
        navSheetOpen

    return (
        <div
            className={cn(
                "relative flex h-screen h-[100dvh] w-full overflow-hidden bg-background select-none transition-all duration-300",
                isAnyModalOpen && "blur-2xl contrast-75 brightness-75 scale-[0.99] pointer-events-none select-none"
            )}
            style={{
                WebkitUserSelect: "none",
                MozUserSelect: "none",
                msUserSelect: "none",
                userSelect: "none",
            }}
            onCopy={(e) => e.preventDefault()}
            onCut={(e) => e.preventDefault()}
            onPaste={(e) => e.preventDefault()}
            onContextMenu={(e) => e.preventDefault()}
            onDragStart={(e) => e.preventDefault()}
        >

            {/* Heavy Blur & Opacity Backdrop Overlay when any modal is open */}
            {isAnyModalOpen && (
                <div
                    className="fixed inset-0 z-40 bg-background/80 backdrop-blur-3xl transition-all duration-300 pointer-events-none"
                    aria-hidden="true"
                />
            )}

            {/* ── Level 1: Dynamic Anti-Cheat Screen Watermarking ───────────── */}
            <ExamWatermark name={candidateName} email={candidateEmail} candidateId={candidateId} />

            {/* ── Level 2: Multi-Monitor Warning Dialog ───────────────────────── */}
            <AlertDialog open={showMultiMonitorWarning && !showFocusWarning}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Multiple Displays Detected</AlertDialogTitle>
                        <AlertDialogDescription>
                            An extended display or secondary monitor was detected. Please disconnect external displays or switch to single-screen mode to continue your test.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogAction
                            onClick={() => setShowMultiMonitorWarning(false)}
                            className="!bg-amber-500 !text-slate-950 hover:!bg-amber-400 font-semibold shadow-xs border-none"
                        >
                            I Have Disconnected External Display
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* ── Level 3: DevTools Inspection Warning Dialog ───────────────────── */}
            <AlertDialog open={showDevToolsWarning && !showFocusWarning}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Developer Tools Detected</AlertDialogTitle>
                        <AlertDialogDescription>
                            Browser developer tools or an inspection panel was detected. Please close developer tools to continue your test session.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogAction
                            onClick={() => setShowDevToolsWarning(false)}
                            className="!bg-red-600 !text-white hover:!bg-red-700 font-semibold shadow-xs border-none"
                        >
                            Close Inspection & Resume
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* ── Anti-Cheat: Focus Lost Dialog (highest priority) ─────────────── */}
            <AlertDialog open={showFocusWarning}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Focus Lost Warning</AlertDialogTitle>
                        <AlertDialogDescription asChild>
                            <div className="space-y-2 pt-1 text-sm">
                                <p>
                                    You navigated away from the test window or switched tabs.
                                </p>
                                <p className="font-medium text-foreground">
                                    Violation #{focusLostCount}{test.strict_mode ? <> of {MAX_VIOLATIONS}</> : null} recorded.{" "}
                                    {test.strict_mode
                                        ? focusLostCount >= MAX_VIOLATIONS
                                            ? "Your test is being automatically submitted now."
                                            : `${MAX_VIOLATIONS - focusLostCount} remaining before automatic submission.`
                                        : "This incident has been logged."}
                                </p>
                            </div>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogAction
                            onClick={() => {
                                focusGuardRef.current = false
                                setShowFocusWarning(false)
                            }}
                            className="!bg-red-600 !text-white hover:!bg-red-700 font-semibold shadow-xs border-none"
                        >
                            Return to Test
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* ── Fullscreen Required Dialog (shown only when focus dialog is closed) */}
            <AlertDialog open={showFullscreenWarning && !showFocusWarning}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Fullscreen Required</AlertDialogTitle>
                        <AlertDialogDescription>
                            You exited fullscreen mode. Your progress has been saved. Please return to fullscreen to continue the test.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogAction
                            onClick={enterFullscreen}
                            className="!bg-amber-500 !text-slate-950 hover:!bg-amber-400 font-semibold shadow-xs border-none"
                        >
                            Return to Fullscreen
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>


            {/* ── Question column ───────────────────────────────────────────────── */}
            <main className="flex min-w-0 flex-1 flex-col h-full overflow-hidden">

                {/* Top Glassmorphic Header */}
                <header className="shrink-0 z-30 flex h-14 items-center justify-between border-b bg-background/95 px-6 backdrop-blur supports-[backdrop-filter]:bg-background/80">
                    <div className="flex items-center gap-3 min-w-0">
                        <h1 className="truncate text-sm font-bold text-foreground">
                            {test.title}
                        </h1>
                    </div>

                    <div className="flex items-center gap-3">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setShowShortcutsModal(true)}
                            className="hidden sm:flex h-8 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                        >
                            <Keyboard className="h-3.5 w-3.5" />
                            Shortcuts
                        </Button>
                        {test.time_limit_seconds && timeRemaining !== null && (
                            <div className="hidden md:flex">
                                <TimerDisplay
                                    timeRemaining={timeRemaining}
                                    timerDanger={timerDanger}
                                    timerWarning={timerWarning}
                                    compact
                                />
                            </div>
                        )}
                    </div>
                </header>



                {/* Offline banner */}
                {isOffline && (
                    <div className="shrink-0 border-b border-red-200 bg-red-50 dark:border-red-900/60 dark:bg-red-950/30 px-6 py-3">
                        <div className="mx-auto flex items-center gap-3 text-sm font-medium text-red-800 dark:text-red-300">
                            <WifiOff className="h-4 w-4 shrink-0" />
                            <span className="flex-1 min-w-0">
                                You are offline. Your answers are saved locally and will sync automatically when you reconnect.
                            </span>
                        </div>
                    </div>
                )}

                {/* Global sync error banner */}
                {syncStatus === "error" && !isOffline && (
                    <div className="shrink-0 border-b border-amber-200 bg-amber-50 dark:border-amber-900/60 dark:bg-amber-950/30 px-6 py-3">
                        <div className="mx-auto flex flex-wrap items-center gap-3 text-sm font-medium text-amber-800 dark:text-amber-300">
                            <AlertTriangle className="h-4 w-4 shrink-0" />
                            <span className="flex-1 min-w-0">
                                Couldn't sync answers ({syncError}). Your selections are preserved locally.
                            </span>
                            <Button
                                size="sm"
                                variant="outline"
                                className="shrink-0 border-amber-400 text-amber-700 hover:bg-amber-100 dark:text-amber-300"
                                onClick={() => performSyncRef.current?.()}
                            >
                                Retry
                            </Button>
                        </div>
                    </div>
                )}



                {/* Submit error banner */}
                {submitError && (
                    <div className="shrink-0 border-b border-destructive/20 bg-destructive/5 px-6 py-3">
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

                {/* Question body (Scrollable content area) */}
                <div className="flex-1 w-full min-h-0 overflow-y-auto px-6 py-6 pb-24 md:px-8 md:py-8 md:pb-8">
                    {currentQuestion && (
                        <QuestionView
                            question={currentQuestion}
                            sections={effectiveSections}
                            index={currentIndex}
                            total={displayQuestions.length}
                            selectedIds={currentAnswers}
                            syncedIds={syncedAnswers[currentQuestion.id] ?? []}
                            isSaving={syncStatus === "syncing"}
                            isUnsynced={syncStatus === "error"}
                            saveError={syncStatus === "error" ? syncError : null}
                            isFlagged={flagged[currentQuestion.id] ?? false}
                            disabled={isSubmitting}
                            onAnswer={(optId) =>
                                handleAnswer(currentQuestion.id, optId, currentQuestion.question_type)
                            }
                            onToggleFlag={() => toggleFlag(currentQuestion.id)}
                            onClearResponse={handleClearResponse}
                        />
                    )}
                </div>

                {/* Desktop prev / next fixed footer bar */}
                <div className="hidden md:flex shrink-0 h-16 border-t bg-background/95 backdrop-blur px-6 lg:px-8 items-center justify-between z-20">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handlePrevious}
                        disabled={currentIndex === 0}
                    >
                        <ChevronLeft className="mr-1 h-4 w-4" />
                        Previous
                    </Button>

                    <span className="text-xs tabular-nums text-muted-foreground font-medium">
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
                            size="sm"
                            onClick={handleNext}
                            className="font-semibold px-5"
                        >
                            Next
                            <ChevronRight className="ml-1 h-4 w-4" />
                        </Button>
                    )}
                </div>
            </main>


            {/* ── Desktop sidebar ───────────────────────────────────────────────── */}
            <aside className="hidden md:flex md:w-56 lg:w-64 xl:w-72 shrink-0 h-full flex-col border-l bg-card/30 overflow-y-auto">
                <div className="flex flex-col gap-5 p-5 lg:p-6">

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
                            sections={effectiveSections}
                            currentIndex={currentIndex}
                            answers={answers}
                            syncedAnswers={syncedAnswers}
                            flagged={flagged}
                            disabled={isSubmitting}
                            onJump={handleJump}
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
            </aside>


            {/* ── Mobile fixed bottom bar ───────────────────────────────────────── */}
            <div className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur supports-[backdrop-filter]:bg-background/80 md:hidden">
                <div className="flex h-16 items-center gap-2 px-5">

                    <Button
                        variant="outline"
                        size="icon"
                        className="h-9 w-9 shrink-0"
                        onClick={handlePrevious}
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
                            onClick={handleNext}
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
                    </SheetHeader>
                    <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-5 py-5">
                        <QuestionNavigator
                            questions={displayQuestions}
                            sections={effectiveSections}
                            currentIndex={currentIndex}
                            answers={answers}
                            syncedAnswers={syncedAnswers}
                            flagged={flagged}
                            disabled={isSubmitting}
                            onJump={(i) => {
                                handleJump(i)
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
                <AlertDialogContent className="max-w-md">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-xl font-bold">Submit Assessment?</AlertDialogTitle>
                        <AlertDialogDescription asChild>
                            <div className="space-y-4 pt-2">
                                <p className="text-sm text-muted-foreground">
                                    Are you sure you want to finish and submit your test? Once submitted, your answers cannot be modified.
                                </p>

                                {/* Structured Summary Grid */}
                                <div className="grid grid-cols-2 gap-2.5 rounded-xl border bg-muted/30 p-3.5 text-xs">
                                    <div className="flex flex-col gap-0.5 rounded-lg border bg-background p-2.5">
                                        <span className="text-muted-foreground font-medium">Saved Answers</span>
                                        <span className="text-base font-bold text-emerald-600 dark:text-emerald-400">{savedCount}</span>
                                    </div>
                                    <div className="flex flex-col gap-0.5 rounded-lg border bg-background p-2.5">
                                        <span className="text-muted-foreground font-medium">Unsaved Changes</span>
                                        <span className="text-base font-bold text-amber-600 dark:text-amber-400">{pendingCount}</span>
                                    </div>
                                    <div className="flex flex-col gap-0.5 rounded-lg border bg-background p-2.5">
                                        <span className="text-muted-foreground font-medium">Flagged for Review</span>
                                        <span className="text-base font-bold text-indigo-600 dark:text-indigo-400">{flaggedCount}</span>
                                    </div>
                                    <div className="flex flex-col gap-0.5 rounded-lg border bg-background p-2.5">
                                        <span className="text-muted-foreground font-medium">Unanswered</span>
                                        <span className="text-base font-bold text-muted-foreground">{unansweredCount}</span>
                                    </div>
                                </div>

                                {pendingCount > 0 && (
                                    <div className="flex items-start gap-2 rounded-xl border border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/20 p-3.5">
                                        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
                                        <p className="text-xs text-amber-800 dark:text-amber-300">
                                            You have {pendingCount} unsaved answer{pendingCount > 1 ? "s" : ""}. Submitting will flush and save them now.
                                        </p>
                                    </div>
                                )}
                            </div>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="mt-2">
                        <AlertDialogCancel disabled={isSubmitting}>Continue Test</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => handleSubmit()}
                            disabled={isSubmitting}
                            className="bg-primary text-primary-foreground font-semibold"
                        >
                            {isSubmitting ? (
                                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Submitting…</>
                            ) : (
                                "Confirm Submission"
                            )}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* ── Keyboard Shortcuts Modal ────────────────────────────────────── */}
            <KeyboardShortcutsDialog
                open={showShortcutsModal}
                onOpenChange={setShowShortcutsModal}
            />
        </div>
    )
}
