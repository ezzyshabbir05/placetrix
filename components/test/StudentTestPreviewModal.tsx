"use client"

import { useState, useEffect, useMemo, useCallback, useRef } from "react"
import {
  X,
  Eye,
  Clock,
  CheckCircle2,
  Circle,
  CheckSquare,
  Square,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  Flag,
  RotateCcw,
  Sparkles,
  Tag,
  Send,
  Layers,
  BookOpen,
  Keyboard,
  Lock,
  Unlock,
  AlertCircle,
  AlertTriangle,
  Maximize,
  Minimize,
  EyeOff,
  Shuffle,
  Play,
  Pause,
  Menu,
  Award,
  ShieldCheck,
  Check,
  HelpCircle,
  RefreshCw,
  FileText,
  Sliders,
  CheckCheck,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { InlineRichText } from "@/components/others/rich-text"
import { EssayAnswerEditor } from "@/components/test/EssayAnswerEditor"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
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
import { Separator } from "@/components/ui/separator"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTime(seconds: number): string {
  if (seconds <= 0) return "0:00"
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) {
    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
  }
  return `${m}:${String(s).padStart(2, "0")}`
}

// ─── Deterministic PRNG for Shuffling ─────────────────────────────────────────

function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// ─── Timer Display ────────────────────────────────────────────────────────────

function TimerDisplay({
  timeRemaining,
  timerDanger,
  timerWarning,
  compact = false,
  isPaused = false,
  isUntimed = false,
}: {
  timeRemaining: number | null
  timerDanger: boolean
  timerWarning: boolean
  compact?: boolean
  isPaused?: boolean
  isUntimed?: boolean
}) {
  if (isUntimed || timeRemaining === null) {
    if (compact) {
      return (
        <span className="flex shrink-0 items-center gap-1.5 font-mono text-xs font-medium text-muted-foreground">
          <Clock className="h-3.5 w-3.5 shrink-0" />
          Untimed
        </span>
      )
    }
    return (
      <div className="flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-muted/20 py-2.5 font-mono text-sm text-muted-foreground">
        <Clock className="h-4 w-4 shrink-0" />
        Untimed Assessment
      </div>
    )
  }

  if (compact) {
    return (
      <span
        className={cn(
          "flex shrink-0 items-center gap-1.5 font-mono text-sm font-semibold tabular-nums",
          timerDanger
            ? "text-red-600 dark:text-red-400"
            : timerWarning
              ? "text-amber-700 dark:text-amber-400"
              : "text-foreground",
          isPaused && "opacity-60"
        )}
      >
        <Clock className={cn("h-3.5 w-3.5 shrink-0", timerDanger && !isPaused && "animate-pulse")} />
        {formatTime(timeRemaining)}
        {isPaused && <span className="text-[10px] uppercase font-bold text-amber-500">(Paused)</span>}
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
            : "border-border bg-muted/30 text-foreground",
        isPaused && "border-amber-300/60 bg-amber-50/50 dark:bg-amber-950/20 text-muted-foreground"
      )}
    >
      <Clock className="h-4 w-4 shrink-0" />
      {formatTime(timeRemaining)}
      {isPaused && <span className="text-[11px] font-sans font-medium text-amber-600 dark:text-amber-400">Paused</span>}
    </div>
  )
}

// ─── Keyboard Shortcuts Dialog ────────────────────────────────────────────────

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
            Candidate Keyboard Shortcuts
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-2.5 py-2 text-xs">
          <div className="flex items-center justify-between rounded-xl border bg-muted/20 p-3">
            <span className="font-medium text-foreground">Select Option A, B, C, D, E</span>
            <div className="flex items-center gap-1 font-mono text-[11px]">
              <kbd className="rounded border bg-background px-1.5 py-0.5 font-semibold shadow-xs">Ctrl</kbd>
              <span>+</span>
              <kbd className="rounded border bg-background px-1.5 py-0.5 font-semibold shadow-xs">A / B / C / D / E</kbd>
            </div>
          </div>
          <div className="flex items-center justify-between rounded-xl border bg-muted/20 p-3">
            <span className="font-medium text-foreground">Save & Next Question</span>
            <div className="flex items-center gap-1 font-mono text-[11px]">
              <kbd className="rounded border bg-background px-1.5 py-0.5 font-semibold shadow-xs">Ctrl</kbd>
              <span>+</span>
              <kbd className="rounded border bg-background px-1.5 py-0.5 font-semibold shadow-xs">Enter / S</kbd>
            </div>
          </div>
          <div className="flex items-center justify-between rounded-xl border bg-muted/20 p-3">
            <span className="font-medium text-foreground">Clear Current Response</span>
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
            <span className="font-medium text-foreground">Previous / Next Navigation</span>
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

// ─── Option Button Component ──────────────────────────────────────────────────

function OptionButton({
  option,
  optionIndex,
  isSelected,
  questionType,
  isReviewMode,
  onClick,
}: {
  option: { id: string; option_text: string; is_correct?: boolean }
  optionIndex: number
  isSelected: boolean
  questionType: "single_correct" | "multiple_correct"
  isReviewMode?: boolean
  onClick: () => void
}) {
  const isSingle = questionType === "single_correct"
  const letter = String.fromCharCode(65 + optionIndex)
  const isCorrect = Boolean(option.is_correct)

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isReviewMode}
      className={cn(
        "group relative flex w-full min-h-12 items-start gap-3.5 rounded-xl border p-4 text-left text-sm transition-all duration-150 select-none",
        !isReviewMode && "cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        // Review Mode Styling
        isReviewMode
          ? isCorrect
            ? "border-emerald-500 bg-emerald-50/80 text-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200 font-medium"
            : isSelected
              ? "border-red-400 bg-red-50/80 text-red-900 dark:bg-red-950/30 dark:text-red-200"
              : "border-border bg-card/60 opacity-60 text-muted-foreground"
          : isSelected
            ? "border-primary bg-primary/5 text-foreground font-medium shadow-2xs"
            : "border-border bg-card text-foreground/90 hover:border-muted-foreground/30 hover:bg-muted/30"
      )}
    >
      <span
        className={cn(
          "flex h-6 w-6 shrink-0 items-center justify-center rounded-md border text-[11px] font-bold mt-0.5 transition-colors",
          isReviewMode && isCorrect
            ? "border-emerald-500 bg-emerald-500 text-white"
            : isReviewMode && isSelected && !isCorrect
              ? "border-red-500 bg-red-500 text-white"
              : isSelected
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-muted/40 text-muted-foreground group-hover:border-primary/40 group-hover:text-primary"
        )}
      >
        {letter}
      </span>

      <span className="shrink-0 mt-0.5">
        {isSingle ? (
          isSelected ? (
            <CheckCircle2
              className={cn(
                "h-5 w-5",
                isReviewMode
                  ? isCorrect
                    ? "text-emerald-600"
                    : "text-red-600"
                  : "text-primary"
              )}
            />
          ) : (
            <Circle className="h-5 w-5 text-muted-foreground/50" />
          )
        ) : isSelected ? (
          <CheckSquare
            className={cn(
              "h-5 w-5",
              isReviewMode
                ? isCorrect
                  ? "text-emerald-600"
                  : "text-red-600"
                : "text-primary"
            )}
          />
        ) : (
          <Square className="h-5 w-5 text-muted-foreground/50" />
        )}
      </span>

      <span
        className={cn(
          "min-w-0 flex-1 wrap-break-word leading-snug text-left space-y-1.5",
          isSelected && "font-medium"
        )}
      >
        <InlineRichText>{option.option_text || ""}</InlineRichText>
      </span>

      {/* Review Mode Badges */}
      {isReviewMode && (
        <div className="ml-auto flex items-center gap-1 shrink-0">
          {isCorrect && isSelected && (
            <span className="inline-flex items-center gap-1 rounded bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 px-2 py-0.5 text-[11px] font-bold">
              <Check className="size-3" /> Your Answer · Correct
            </span>
          )}
          {isCorrect && !isSelected && (
            <span className="inline-flex items-center gap-1 rounded bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 text-[11px] font-bold">
              <Check className="size-3" /> Correct Key
            </span>
          )}
          {!isCorrect && isSelected && (
            <span className="inline-flex items-center gap-1 rounded bg-red-100 dark:bg-red-900/60 text-red-800 dark:text-red-300 px-2 py-0.5 text-[11px] font-bold">
              <X className="size-3" /> Your Answer · Incorrect
            </span>
          )}
        </div>
      )}
    </button>
  )
}

// ─── Interfaces ───────────────────────────────────────────────────────────────

export interface StudentTestPreviewModalProps {
  open: boolean
  onClose: () => void
  testTitle: string
  testDescription?: string | null
  instructions?: string | null
  timeLimitMinutes?: string | number | null
  passPercentage?: string | number | null
  strictMode?: boolean
  shuffleQuestions?: boolean
  shuffleOptions?: boolean
  availableUntil?: string | null
  sections: Array<{
    id: string
    name: string
    description?: string | null
    time_limit_minutes?: string | number
    pass_percentage?: string | number
    order_index?: number
    section_total_marks?: string | number
  }>
  questions: Array<{
    id: string
    question_text: string
    question_type: "single_correct" | "multiple_correct" | "essay"
    marks: number
    explanation?: string | null
    tag_names?: string[]
    tags?: { id: string; name: string }[]
    section_id?: string | null
    options: Array<{
      id?: string
      _key?: string
      option_text: string
      is_correct?: boolean
    }>
    min_words?: number
    max_words?: number
    rubric_guidelines?: string
  }>
}

// ─── Main Modal Component ─────────────────────────────────────────────────────

export function StudentTestPreviewModal({
  open,
  onClose,
  testTitle,
  testDescription,
  instructions,
  timeLimitMinutes,
  passPercentage = 50,
  strictMode = false,
  shuffleQuestions = false,
  shuffleOptions = false,
  availableUntil,
  sections,
  questions,
}: StudentTestPreviewModalProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false)

  // Lock body scroll while preview is active and handle Escape key
  useEffect(() => {
    if (!open) return
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"

    return () => {
      document.body.style.overflow = prevOverflow
    }
  }, [open])

  // Fullscreen toggle handler
  const toggleFullscreen = useCallback(async () => {
    try {
      if (!document.fullscreenElement) {
        if (containerRef.current?.requestFullscreen) {
          await containerRef.current.requestFullscreen()
          setIsFullscreen(true)
        }
      } else {
        if (document.exitFullscreen) {
          await document.exitFullscreen()
          setIsFullscreen(false)
        }
      }
    } catch (err) {
      console.warn("Fullscreen toggle rejected:", err)
    }
  }, [])

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement))
    }
    document.addEventListener("fullscreenchange", handleFsChange)
    return () => document.removeEventListener("fullscreenchange", handleFsChange)
  }, [])

  // Shuffle toggle state
  const [useShuffledOrder, setUseShuffledOrder] = useState<boolean>(false)

  // Normalize sections (guarantee at least one valid section)
  const normalizedSections = useMemo(() => {
    if (sections && sections.length > 0) {
      return sections.map((s, idx) => ({
        id: s.id || `sec-${idx}`,
        name: s.name?.trim() || `Section ${String.fromCharCode(65 + idx)}`,
        description: s.description || null,
        time_limit_minutes: s.time_limit_minutes || timeLimitMinutes || "",
        pass_percentage: s.pass_percentage ?? passPercentage ?? 50,
        order_index: s.order_index ?? idx + 1,
      }))
    }
    return [
      {
        id: "default-sec",
        name: "Section A",
        description: null,
        time_limit_minutes: timeLimitMinutes || "",
        pass_percentage: passPercentage ?? 50,
        order_index: 1,
      },
    ]
  }, [sections, timeLimitMinutes, passPercentage])

  // Normalize questions with edge cases handled (missing section_id, options, etc.)
  const normalizedQuestions = useMemo(() => {
    const validSectionIds = new Set(normalizedSections.map((s) => s.id))
    const fallbackSecId = normalizedSections[0]?.id || "default-sec"

    let list = (questions || []).map((q, idx) => {
      const qSecId = q.section_id && validSectionIds.has(q.section_id) ? q.section_id : fallbackSecId
      let opts = (q.options || []).map((opt, oi) => ({
        id: opt.id ?? opt._key ?? `opt-${idx}-${oi}`,
        option_text: opt.option_text || "",
        is_correct: Boolean(opt.is_correct),
      }))

      // Shuffle options if simulated
      if (useShuffledOrder && (shuffleOptions || q.question_type !== "essay")) {
        const rng = mulberry32(idx + 42)
        opts = [...opts].sort(() => rng() - 0.5)
      }

      return {
        ...q,
        id: q.id || `q-${idx}`,
        section_id: qSecId,
        question_text: q.question_text || "Untitled Question",
        marks: Number(q.marks) > 0 ? Number(q.marks) : 1,
        options: opts,
        tags: q.tag_names ?? (q.tags ? q.tags.map((t: any) => t.name) : []),
      }
    })

    // Shuffle questions if simulated
    if (useShuffledOrder && shuffleQuestions) {
      const rng = mulberry32(1337)
      // Group by section and shuffle within section
      const grouped: typeof list = []
      normalizedSections.forEach((sec) => {
        const secQs = list.filter((q) => q.section_id === sec.id)
        grouped.push(...[...secQs].sort(() => rng() - 0.5))
      })
      list = grouped.length > 0 ? grouped : list
    }

    return list
  }, [questions, normalizedSections, useShuffledOrder, shuffleOptions, shuffleQuestions])

  // Total Marks
  const totalMarks = useMemo(() => {
    return normalizedQuestions.reduce((sum, q) => sum + (Number(q.marks) || 0), 0)
  }, [normalizedQuestions])

  // ─── Modal Stage State ──────────────────────────────────────────────────────
  // "intro" (instructions) -> "attempt" (test answering) -> "submitted" (completion)
  const [stage, setStage] = useState<"intro" | "attempt" | "submitted">("intro")
  const [isReviewMode, setIsReviewMode] = useState<boolean>(false)

  // Current Navigation State
  const [currentSectionId, setCurrentSectionId] = useState<string>(
    normalizedSections[0]?.id || "default-sec"
  )
  const [currentIndex, setCurrentIndex] = useState<number>(0)

  // Student Responses State
  const [answers, setAnswers] = useState<Record<string, string[]>>({})
  const [essayAnswers, setEssayAnswers] = useState<Record<string, string>>({})
  const [flagged, setFlagged] = useState<Record<string, boolean>>({})
  const [completedSectionIds, setCompletedSectionIds] = useState<Set<string>>(new Set())

  // Save feedback state (simulates real candidate database sync indicator)
  const [isSavingMock, setIsSavingMock] = useState<boolean>(false)
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Navigation / Dialog Modals
  const [showSectionSubmitDialog, setShowSectionSubmitDialog] = useState<boolean>(false)
  const [showSubmitDialog, setShowSubmitDialog] = useState<boolean>(false)
  const [showShortcutsModal, setShowShortcutsModal] = useState<boolean>(false)
  const [navSheetOpen, setNavSheetOpen] = useState<boolean>(false)

  // Enforce Section Locking Toggle (gives instructor choice to test strict lockdown or free jump)
  const [enforceLocking, setEnforceLocking] = useState<boolean>(true)

  // ─── Timer Simulation State ─────────────────────────────────────────────────
  const currentSectionIndex = useMemo(() => {
    const idx = normalizedSections.findIndex((s) => s.id === currentSectionId)
    return idx >= 0 ? idx : 0
  }, [normalizedSections, currentSectionId])

  const currentSection = normalizedSections[currentSectionIndex] ?? normalizedSections[0]

  const isUntimed = useMemo(() => {
    const mins = Number(currentSection.time_limit_minutes)
    return isNaN(mins) || mins <= 0
  }, [currentSection.time_limit_minutes])

  const initialSectionSeconds = useMemo(() => {
    if (isUntimed) return null
    const mins = Number(currentSection.time_limit_minutes) || 30
    return Math.max(mins * 60, 60)
  }, [currentSection.time_limit_minutes, isUntimed])

  const [timeRemaining, setTimeRemaining] = useState<number | null>(initialSectionSeconds)
  const [timerRunning, setTimerRunning] = useState<boolean>(true)

  // Sync timer when section changes
  useEffect(() => {
    if (isUntimed) {
      setTimeRemaining(null)
    } else {
      const mins = Number(currentSection.time_limit_minutes) || 30
      setTimeRemaining(Math.max(mins * 60, 60))
    }
  }, [currentSectionId, currentSection.time_limit_minutes, isUntimed])

  // Timer Tick
  useEffect(() => {
    if (!open || stage !== "attempt" || !timerRunning || isUntimed || timeRemaining === null) return

    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev === null) return null
        if (prev <= 1) {
          clearInterval(timer)
          toast.warning("Section time expired! Automatically submitting section...", {
            id: "timer-expired-warning",
          })
          handleAdvanceSectionDirect(false)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [open, stage, timerRunning, currentSectionId, isUntimed, timeRemaining])

  const timerDanger = timeRemaining !== null && timeRemaining <= 60
  const timerWarning = timeRemaining !== null && timeRemaining <= 300 && timeRemaining > 60

  // Reset state on open
  useEffect(() => {
    if (open) {
      setStage("intro")
      setIsReviewMode(false)
      setCurrentSectionId(normalizedSections[0]?.id || "default-sec")
      setCurrentIndex(0)
      setAnswers({})
      setEssayAnswers({})
      setFlagged({})
      setCompletedSectionIds(new Set())
      setTimerRunning(true)
      setUseShuffledOrder(false)
    }
  }, [open, normalizedSections])

  // Questions in current section
  const sectionQuestionIndices = useMemo(() => {
    const indices: number[] = []
    normalizedQuestions.forEach((q, idx) => {
      if (q.section_id === currentSection.id || normalizedSections.length === 1) {
        indices.push(idx)
      }
    })
    return indices.length > 0 ? indices : normalizedQuestions.map((_, i) => i)
  }, [normalizedQuestions, currentSection.id, normalizedSections.length])

  // Ensure currentIndex is valid for active section
  useEffect(() => {
    if (sectionQuestionIndices.length > 0 && !sectionQuestionIndices.includes(currentIndex)) {
      setCurrentIndex(sectionQuestionIndices[0])
    }
  }, [currentSectionId, sectionQuestionIndices, currentIndex])

  const currentQuestion = normalizedQuestions[currentIndex]
  const isFirstOfSection = currentIndex === (sectionQuestionIndices[0] ?? 0)
  const isLastOfSection =
    currentIndex === (sectionQuestionIndices[sectionQuestionIndices.length - 1] ?? 0)
  const isFinalSection = currentSectionIndex >= normalizedSections.length - 1

  // Handle Option Selection
  const handleSelectOption = useCallback(
    (questionId: string, optionId: string, qType: "single_correct" | "multiple_correct" | "essay") => {
      if (qType === "essay" || isReviewMode) return

      // Trigger simulated database save pulse
      setIsSavingMock(true)
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
      saveTimeoutRef.current = setTimeout(() => {
        setIsSavingMock(false)
      }, 350)

      setAnswers((prev) => {
        const cur = prev[questionId] ?? []
        let next: string[]
        if (qType === "single_correct") {
          next = cur.includes(optionId) ? [] : [optionId]
        } else {
          next = cur.includes(optionId)
            ? cur.filter((id) => id !== optionId)
            : [...cur, optionId]
        }
        return { ...prev, [questionId]: next }
      })
    },
    [isReviewMode]
  )

  const handleClearCurrent = useCallback(() => {
    if (!currentQuestion || isReviewMode) return
    if (currentQuestion.question_type === "essay") {
      setEssayAnswers((prev) => ({ ...prev, [currentQuestion.id]: "" }))
    } else {
      setAnswers((prev) => ({ ...prev, [currentQuestion.id]: [] }))
    }
    toast.info("Response cleared", { duration: 1500 })
  }, [currentQuestion, isReviewMode])

  const toggleFlag = useCallback(
    (qid: string) => {
      if (isReviewMode) return
      setFlagged((prev) => {
        const nextVal = !prev[qid]
        toast.info(nextVal ? "Question flagged for review" : "Question unflagged", {
          duration: 1500,
        })
        return { ...prev, [qid]: nextVal }
      })
    },
    [isReviewMode]
  )

  // Navigation: Next
  const handleNext = useCallback(() => {
    const currentPos = sectionQuestionIndices.indexOf(currentIndex)

    // In Review Mode: seamlessly navigate across all questions & sections without blocking dialogs
    if (isReviewMode) {
      if (currentPos !== -1 && currentPos < sectionQuestionIndices.length - 1) {
        setCurrentIndex(sectionQuestionIndices[currentPos + 1])
      } else if (!isFinalSection) {
        // Go to next section in review mode
        const nextSec = normalizedSections[currentSectionIndex + 1]
        setCurrentSectionId(nextSec.id)
        const nextIndices = normalizedQuestions
          .map((q, i) => (q.section_id === nextSec.id ? i : -1))
          .filter((i) => i !== -1)
        if (nextIndices.length > 0) setCurrentIndex(nextIndices[0])
      } else {
        toast.info("You have reached the last question. Returning to summary.", { duration: 2000 })
        setStage("submitted")
      }
      return
    }

    // Attempt Mode navigation
    if (currentPos !== -1 && currentPos < sectionQuestionIndices.length - 1) {
      setCurrentIndex(sectionQuestionIndices[currentPos + 1])
    } else if (isLastOfSection) {
      if (isFinalSection) {
        setShowSubmitDialog(true)
      } else {
        setShowSectionSubmitDialog(true)
      }
    }
  }, [
    sectionQuestionIndices,
    currentIndex,
    isReviewMode,
    isLastOfSection,
    isFinalSection,
    normalizedSections,
    currentSectionIndex,
    normalizedQuestions,
  ])

  // Navigation: Previous
  const handlePrevious = useCallback(() => {
    const currentPos = sectionQuestionIndices.indexOf(currentIndex)

    if (currentPos > 0) {
      setCurrentIndex(sectionQuestionIndices[currentPos - 1])
    } else if (isReviewMode && currentSectionIndex > 0) {
      // Allow moving backward into previous section when reviewing
      const prevSec = normalizedSections[currentSectionIndex - 1]
      setCurrentSectionId(prevSec.id)
      const prevIndices = normalizedQuestions
        .map((q, i) => (q.section_id === prevSec.id ? i : -1))
        .filter((i) => i !== -1)
      if (prevIndices.length > 0) {
        setCurrentIndex(prevIndices[prevIndices.length - 1])
      }
    }
  }, [sectionQuestionIndices, currentIndex, isReviewMode, currentSectionIndex, normalizedSections, normalizedQuestions])

  // Advance Section directly
  const handleAdvanceSectionDirect = useCallback(
    (manual = true) => {
      setShowSectionSubmitDialog(false)
      setCompletedSectionIds((prev) => new Set([...prev, currentSection.id]))

      if (currentSectionIndex < normalizedSections.length - 1) {
        const nextSec = normalizedSections[currentSectionIndex + 1]
        setCurrentSectionId(nextSec.id)
        const nextSecIndices = normalizedQuestions
          .map((q, i) => (q.section_id === nextSec.id ? i : -1))
          .filter((i) => i !== -1)
        if (nextSecIndices.length > 0) {
          setCurrentIndex(nextSecIndices[0])
        }
        if (manual) {
          toast.success(`Section submitted! Advanced to ${nextSec.name}.`)
        }
      } else {
        // Final section completed
        setStage("submitted")
      }
    },
    [currentSection.id, currentSectionIndex, normalizedSections, normalizedQuestions]
  )

  // Submit assessment
  const handleFinalSubmit = useCallback(() => {
    setShowSubmitDialog(false)
    setCompletedSectionIds((prev) => new Set([...prev, currentSection.id]))
    setStage("submitted")
    toast.success("Assessment submitted successfully!")
  }, [currentSection.id])

  // Jump to Question
  const handleJump = useCallback(
    (targetIndex: number) => {
      const targetQ = normalizedQuestions[targetIndex]
      if (!targetQ) return

      if (enforceLocking && !isReviewMode) {
        const isTargetSecCompleted = completedSectionIds.has(targetQ.section_id || "")
        const isTargetSecActive = (targetQ.section_id || "") === currentSectionId

        if (!isTargetSecActive) {
          if (isTargetSecCompleted) {
            toast.error("This section has already been submitted and is locked.", {
              id: "sec-already-submitted",
            })
            return
          } else {
            toast.warning("Upcoming section is locked. Please complete the current section first.", {
              id: "sec-locked-jump",
            })
            return
          }
        }
      } else {
        // Free jumping allowed (or review mode)
        if (targetQ.section_id && targetQ.section_id !== currentSectionId) {
          setCurrentSectionId(targetQ.section_id)
        }
      }

      setCurrentIndex(targetIndex)
    },
    [normalizedQuestions, enforceLocking, isReviewMode, completedSectionIds, currentSectionId]
  )

  // Keyboard Shortcuts Handler
  useEffect(() => {
    if (!open) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose()
        return
      }

      if (stage !== "attempt") return

      const isEditingText =
        document.activeElement?.tagName === "TEXTAREA" ||
        document.activeElement?.tagName === "INPUT"

      if (isEditingText) return

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "f") {
        e.preventDefault()
        if (currentQuestion) toggleFlag(currentQuestion.id)
      } else if ((e.ctrlKey || e.metaKey) && e.key === "Backspace") {
        e.preventDefault()
        handleClearCurrent()
      } else if ((e.ctrlKey || e.metaKey) && (e.key === "Enter" || e.key.toLowerCase() === "s")) {
        e.preventDefault()
        handleNext()
      } else if (e.key === "ArrowLeft") {
        handlePrevious()
      } else if (e.key === "ArrowRight") {
        handleNext()
      } else if ((e.ctrlKey || e.metaKey) && ["a", "b", "c", "d", "e", "1", "2", "3", "4", "5"].includes(e.key.toLowerCase())) {
        e.preventDefault()
        let optIdx = -1
        const key = e.key.toLowerCase()
        if (["a", "b", "c", "d", "e"].includes(key)) {
          optIdx = key.charCodeAt(0) - 97
        } else {
          optIdx = parseInt(key, 10) - 1
        }
        if (currentQuestion && currentQuestion.question_type !== "essay" && optIdx >= 0) {
          const opt = currentQuestion.options[optIdx]
          if (opt) {
            handleSelectOption(currentQuestion.id, opt.id, currentQuestion.question_type)
          }
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [
    open,
    stage,
    currentQuestion,
    handleNext,
    handlePrevious,
    handleClearCurrent,
    toggleFlag,
    handleSelectOption,
    onClose,
  ])

  // Reset Answers
  const handleResetAnswers = () => {
    setAnswers({})
    setEssayAnswers({})
    setFlagged({})
    setCompletedSectionIds(new Set())
    if (initialSectionSeconds !== null) setTimeRemaining(initialSectionSeconds)
    setTimerRunning(true)
    toast.info("All preview responses, flags, and timers have been reset.")
  }

  // Answered Counts
  const savedCount = useMemo(() => {
    return normalizedQuestions.filter((q) => {
      if (q.question_type === "essay") {
        return Boolean((essayAnswers[q.id] ?? "").trim())
      }
      return (answers[q.id] ?? []).length > 0
    }).length
  }, [normalizedQuestions, answers, essayAnswers])

  const flaggedCount = useMemo(() => {
    return Object.values(flagged).filter(Boolean).length
  }, [flagged])

  const unansweredCount = Math.max(0, normalizedQuestions.length - savedCount)

  // Current Section Stats (for section dialog)
  const currentSectionQuestions = useMemo(() => {
    return normalizedQuestions.filter((q) => q.section_id === currentSection.id)
  }, [normalizedQuestions, currentSection.id])

  const secAnsweredCount = useMemo(() => {
    return currentSectionQuestions.filter((q) => {
      if (q.question_type === "essay") {
        return Boolean((essayAnswers[q.id] ?? "").trim())
      }
      return (answers[q.id] ?? []).length > 0
    }).length
  }, [currentSectionQuestions, answers, essayAnswers])

  const secUnansweredCount = Math.max(0, currentSectionQuestions.length - secAnsweredCount)
  const secFlaggedCount = useMemo(() => {
    return currentSectionQuestions.filter((q) => flagged[q.id]).length
  }, [currentSectionQuestions, flagged])

  // Calculated Score for Submission Screen & Question Palette in Review Mode
  const scoreResults = useMemo(() => {
    let earnedMarks = 0
    let totalMCQMarks = 0
    let correctCount = 0
    let incorrectCount = 0
    let essayCount = 0
    let essayTotalMarks = 0

    const questionStatusMap: Record<string, "correct" | "incorrect" | "skipped" | "essay"> = {}

    const sectionBreakdown: Array<{
      sectionId: string
      sectionName: string
      earned: number
      total: number
      passPercentage: number
      passed: boolean
    }> = []

    normalizedSections.forEach((sec) => {
      const secQs = normalizedQuestions.filter((q) => q.section_id === sec.id)
      let secEarned = 0
      let secTotal = 0

      secQs.forEach((q) => {
        const marks = Number(q.marks) || 1
        secTotal += marks

        if (q.question_type === "essay") {
          essayCount++
          essayTotalMarks += marks
          questionStatusMap[q.id] = (essayAnswers[q.id] ?? "").trim() ? "essay" : "skipped"
        } else {
          totalMCQMarks += marks
          const chosen = answers[q.id] ?? []
          const correctIds = q.options.filter((o) => o.is_correct).map((o) => o.id)

          if (chosen.length === 0) {
            questionStatusMap[q.id] = "skipped"
          } else {
            const isFullyCorrect =
              chosen.length === correctIds.length &&
              chosen.every((id) => correctIds.includes(id))

            if (isFullyCorrect) {
              earnedMarks += marks
              secEarned += marks
              correctCount++
              questionStatusMap[q.id] = "correct"
            } else {
              incorrectCount++
              questionStatusMap[q.id] = "incorrect"
            }
          }
        }
      })

      const secPct = secTotal > 0 ? (secEarned / secTotal) * 100 : 0
      const passPct = Number(sec.pass_percentage) || 50
      sectionBreakdown.push({
        sectionId: sec.id,
        sectionName: sec.name,
        earned: secEarned,
        total: secTotal,
        passPercentage: passPct,
        passed: secPct >= passPct,
      })
    })

    const overallPct = totalMarks > 0 ? Math.round((earnedMarks / totalMarks) * 100) : 0
    const overallPassed = overallPct >= (Number(passPercentage) || 50)

    return {
      earnedMarks,
      totalMCQMarks,
      correctCount,
      incorrectCount,
      essayCount,
      essayTotalMarks,
      overallPct,
      overallPassed,
      sectionBreakdown,
      questionStatusMap,
    }
  }, [normalizedSections, normalizedQuestions, answers, essayAnswers, totalMarks, passPercentage])

  if (!open) return null

  const currentAnswers = currentQuestion ? answers[currentQuestion.id] ?? [] : []
  const currentEssayText = currentQuestion ? essayAnswers[currentQuestion.id] ?? "" : ""

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-50 flex flex-col bg-background text-foreground animate-in fade-in duration-200"
    >
      {/* ── TOP CANDIDATE SIMULATION CONTROLLER BANNER ── */}
      <div className="shrink-0 flex flex-wrap items-center justify-between gap-2 border-b border-amber-500/30 bg-amber-500/10 px-4 sm:px-6 py-2 backdrop-blur-md">
        <div className="flex items-center gap-2.5 min-w-0">
          <Badge className="bg-amber-500 text-black font-semibold text-xs shrink-0 flex items-center gap-1 shadow-sm">
            <Eye className="size-3.5" />
            Candidate Test Simulator
          </Badge>

          {/* Quick Stage Stepper Tabs */}
          <div className="flex items-center rounded-lg border border-amber-500/30 bg-background/80 p-0.5 text-xs">
            <button
              onClick={() => {
                setStage("intro")
                setIsReviewMode(false)
              }}
              className={cn(
                "px-2.5 py-1 rounded font-medium transition-colors cursor-pointer",
                stage === "intro"
                  ? "bg-amber-500 text-black font-bold shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              1. Instructions
            </button>
            <button
              onClick={() => {
                setStage("attempt")
                setIsReviewMode(false)
              }}
              className={cn(
                "px-2.5 py-1 rounded font-medium transition-colors cursor-pointer",
                stage === "attempt" && !isReviewMode
                  ? "bg-amber-500 text-black font-bold shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              2. Live Test
            </button>
            <button
              onClick={() => {
                setStage("submitted")
                setIsReviewMode(false)
              }}
              className={cn(
                "px-2.5 py-1 rounded font-medium transition-colors cursor-pointer",
                stage === "submitted"
                  ? "bg-amber-500 text-black font-bold shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              3. Submission & Results
            </button>
          </div>

          {/* Review Mode Active Indicator */}
          {isReviewMode && (
            <Badge variant="outline" className="border-emerald-500 text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 text-[11px] font-bold">
              Review Mode (Solutions Active)
            </Badge>
          )}
        </div>

        {/* Simulator Controls Toolbar */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Fullscreen Toggle */}
          <Button
            variant="outline"
            size="sm"
            onClick={toggleFullscreen}
            className="h-7 text-xs gap-1 border-amber-500/30 bg-background/80 hidden sm:flex"
            title="Toggle authentic fullscreen testing mode"
          >
            {isFullscreen ? (
              <>
                <Minimize className="size-3" />
                <span>Exit Fullscreen</span>
              </>
            ) : (
              <>
                <Maximize className="size-3" />
                <span>Fullscreen</span>
              </>
            )}
          </Button>

          {/* Shuffled Order Simulator */}
          {(shuffleQuestions || shuffleOptions) && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setUseShuffledOrder((prev) => !prev)
                toast.info(!useShuffledOrder ? "Shuffled order simulated." : "Authoring order restored.")
              }}
              className={cn(
                "h-7 text-xs gap-1 border-amber-500/30 bg-background/80",
                useShuffledOrder && "border-primary bg-primary/10 text-primary font-bold"
              )}
              title="Toggle question/option shuffle preview"
            >
              <Shuffle className="size-3" />
              <span>{useShuffledOrder ? "Shuffled Order" : "Original Order"}</span>
            </Button>
          )}

          {stage === "attempt" && (
            <>
              {/* Timer Pause/Play toggle */}
              {!isUntimed && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setTimerRunning((prev) => !prev)}
                  className="h-7 text-xs gap-1 border-amber-500/30 bg-background/80"
                  title={timerRunning ? "Pause candidate countdown" : "Resume candidate countdown"}
                >
                  {timerRunning ? (
                    <>
                      <Pause className="size-3 text-amber-600" />
                      <span>Pause Timer</span>
                    </>
                  ) : (
                    <>
                      <Play className="size-3 text-emerald-600" />
                      <span>Resume</span>
                    </>
                  )}
                </Button>
              )}

              {/* Strict Section Locking Toggle */}
              {normalizedSections.length > 1 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEnforceLocking((prev) => !prev)}
                  className="h-7 text-xs gap-1 border-amber-500/30 bg-background/80 hidden md:flex"
                  title="Toggle section lock enforcement"
                >
                  {enforceLocking ? (
                    <>
                      <Lock className="size-3 text-primary" />
                      <span>Locking: Strict</span>
                    </>
                  ) : (
                    <>
                      <Unlock className="size-3 text-emerald-600" />
                      <span>Locking: Free</span>
                    </>
                  )}
                </Button>
              )}
            </>
          )}

          <Button
            variant="ghost"
            size="sm"
            onClick={handleResetAnswers}
            className="h-7 text-xs text-muted-foreground hover:text-foreground hidden sm:flex items-center gap-1"
            title="Reset simulated answers and timers"
          >
            <RotateCcw className="size-3" />
            Reset
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={onClose}
            className="h-8 border-border bg-background hover:bg-muted text-xs font-semibold gap-1.5 shadow-sm"
          >
            <X className="size-3.5" />
            Exit Preview
          </Button>
        </div>
      </div>

      {/* ────────────────────────────────────────────────────────────────────── */}
      {/* ── STAGE 1: AUTHENTIC STUDENT INTRO SCREEN ─────────────────────────── */}
      {/* ────────────────────────────────────────────────────────────────────── */}
      {stage === "intro" && (
        <div className="flex-1 w-full min-h-0 overflow-y-auto bg-background px-6 py-6 md:px-10 md:py-8 lg:px-14">
          <div className="max-w-4xl mx-auto space-y-7">
            {/* Title and Description */}
            <div className="space-y-3">
              <h1 className="wrap-break-word text-2xl font-bold leading-tight sm:text-3xl">
                {testTitle || "Untitled Assessment"}
              </h1>
              {testDescription && (
                <p className="wrap-break-word text-sm text-muted-foreground sm:text-base">
                  {testDescription}
                </p>
              )}
            </div>

            {/* Test Metadata Badges */}
            <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
              <div className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 bg-card/60">
                <BookOpen className="h-3.5 w-3.5 shrink-0 text-primary" />
                <span>
                  {normalizedQuestions.length} question{normalizedQuestions.length !== 1 ? "s" : ""} · {totalMarks} mark
                  {totalMarks !== 1 ? "s" : ""}
                </span>
              </div>

              <div className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 bg-card/60">
                <Clock className="h-3.5 w-3.5 shrink-0 text-primary" />
                <span>
                  {timeLimitMinutes ? `${timeLimitMinutes} minutes total` : "Untimed"}
                </span>
              </div>

              <div className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 bg-card/60">
                <Award className="h-3.5 w-3.5 shrink-0 text-primary" />
                <span>Pass threshold: {passPercentage}%</span>
              </div>

              {availableUntil && (
                <div className="inline-flex min-w-0 items-center gap-2 rounded-full border px-3 py-1.5 text-xs sm:text-sm bg-card/60">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0 text-amber-600" />
                  <span className="truncate">
                    Closes{" "}
                    {new Intl.DateTimeFormat(undefined, {
                      day: "2-digit",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                      hour12: true,
                    }).format(new Date(availableUntil))}
                  </span>
                </div>
              )}
            </div>

            {/* Candidate Instructions */}
            {instructions ? (
              <div className="space-y-2 rounded-xl border bg-muted/40 p-5">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Candidate Instructions
                </p>
                <p className="overflow-hidden wrap-break-word whitespace-pre-line text-sm leading-relaxed">
                  {instructions}
                </p>
              </div>
            ) : (
              <div className="rounded-xl border border-dashed p-4 text-xs text-muted-foreground">
                No custom instructions set. You can set them in Settings &gt; Instructions.
              </div>
            )}

            {/* Test Sections Breakdown Cards */}
            <div className="space-y-3 rounded-xl border bg-muted/40 p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Assessment Sections ({normalizedSections.length})
              </p>
              <div className="space-y-2 pt-0.5">
                {normalizedSections.map((sec, idx) => {
                  const secQs = normalizedQuestions.filter(
                    (q) => q.section_id === sec.id || normalizedSections.length === 1
                  )
                  const secMarks = secQs.reduce((s, q) => s + (Number(q.marks) || 0), 0)
                  const secMins = Number(sec.time_limit_minutes) || 30
                  const secPass = sec.pass_percentage ?? 50

                  return (
                    <div
                      key={sec.id}
                      className="flex flex-wrap items-center justify-between gap-2 text-sm rounded-lg border bg-background/70 p-3 shadow-2xs"
                    >
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
                      <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium tabular-nums">
                        <span>
                          {secQs.length} {secQs.length === 1 ? "question" : "questions"} ({secMarks} {secMarks === 1 ? "mark" : "marks"})
                        </span>
                        <span>•</span>
                        <span className="text-foreground font-semibold">
                          {sec.time_limit_minutes ? `${secMins} mins` : "Untimed"}
                        </span>
                        <span>•</span>
                        <span className="text-primary font-semibold">{secPass}% pass cutoff</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Security & System Info Box (Matches real AttemptClient) */}
            <div className="space-y-2.5 rounded-xl border border-amber-200 bg-amber-50 p-5 text-xs text-amber-800 dark:border-amber-900 dark:bg-amber-950/20 dark:text-amber-300">
              <div className="flex items-start gap-2">
                <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <p>
                  <strong>Answers are auto-saved every 5 seconds.</strong> Candidates do not need to manually save their responses.
                </p>
              </div>
              <div className="flex items-start gap-2">
                <Maximize className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <p>
                  In live testing, this test runs in <strong>fullscreen mode</strong>. Exiting fullscreen prompts a proctor violation warning.
                </p>
              </div>
              <div className="flex items-start gap-2">
                <EyeOff className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                {strictMode ? (
                  <p>
                    <strong>Strict mode is enabled.</strong> Switching tabs or windows triggers violations. After 6 violations, tests are auto-submitted.
                  </p>
                ) : (
                  <p>
                    <strong>Anti-cheat monitoring is active.</strong> Tab-switching and focus loss are logged and visible in test analytics.
                  </p>
                )}
              </div>
              {(shuffleQuestions || shuffleOptions) && (
                <div className="flex items-start gap-2">
                  <Shuffle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <p>
                    {shuffleQuestions && shuffleOptions
                      ? "Questions and answer options will be randomized for each student."
                      : shuffleQuestions
                        ? "Questions will be randomized for each student."
                        : "Answer options will be randomized for each student."}
                  </p>
                </div>
              )}
              {!isUntimed && (
                <div className="flex items-start gap-2">
                  <Clock className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <p>The section timer begins immediately upon starting and cannot be paused by the student.</p>
                </div>
              )}
            </div>

            {/* Begin Test CTA */}
            <div className="pt-2 flex items-center gap-3">
              <Button
                size="lg"
                className="gap-2 px-8 font-semibold shadow-md sm:w-auto w-full"
                onClick={() => {
                  setStage("attempt")
                  setIsReviewMode(false)
                }}
              >
                <span>Begin Test Simulation</span>
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────── */}
      {/* ── STAGE 2: AUTHENTIC LIVE TEST ATTEMPT ENVIRONMENT ────────────────── */}
      {/* ────────────────────────────────────────────────────────────────────── */}
      {stage === "attempt" && (
        <div className="flex flex-1 min-h-0 overflow-hidden">
          {/* Main Question Column */}
          <main className="flex min-w-0 flex-1 flex-col h-full overflow-hidden bg-background">
            {/* Top Glassmorphic Header */}
            <header className="shrink-0 z-30 flex h-14 items-center justify-between border-b bg-background/95 px-6 backdrop-blur supports-backdrop-filter:bg-background/80">
              <div className="flex items-center gap-3 min-w-0">
                <h1 className="truncate text-sm font-bold text-foreground">
                  {testTitle || "Untitled Assessment"}
                </h1>
                {normalizedSections.length > 1 && (
                  <Badge variant="secondary" className="hidden sm:inline-flex text-[11px] font-semibold shrink-0">
                    {currentSection.name} ({currentSectionIndex + 1}/{normalizedSections.length})
                  </Badge>
                )}
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

                <div className="hidden md:flex">
                  <TimerDisplay
                    timeRemaining={timeRemaining}
                    timerDanger={timerDanger}
                    timerWarning={timerWarning}
                    isPaused={!timerRunning}
                    isUntimed={isUntimed}
                    compact
                  />
                </div>
              </div>
            </header>

            {/* Scrollable Question Content Area */}
            <div className="flex-1 w-full min-h-0 overflow-y-auto px-6 py-6 pb-24 md:px-8 md:py-8 md:pb-8">
              {currentQuestion ? (
                <div className="max-w-3xl mx-auto space-y-6">
                  {/* Section Header Strip */}
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        {currentSection.name}
                      </span>
                      {currentSection.description && (
                        <span className="text-xs text-muted-foreground/70 truncate hidden sm:inline">
                          — {currentSection.description}
                        </span>
                      )}
                    </div>
                    {normalizedSections.length > 1 && (
                      <span className="text-xs font-medium text-muted-foreground tabular-nums">
                        Section {currentSectionIndex + 1} of {normalizedSections.length}
                      </span>
                    )}
                  </div>

                  {/* Question Metadata & Flag Button */}
                  <div className="space-y-3">
                    <div className="flex min-w-0 flex-wrap items-center gap-2">
                      <Badge variant="outline" className="shrink-0 text-xs font-semibold">
                        Q{currentIndex + 1} of {normalizedQuestions.length}
                      </Badge>
                      <Badge variant="secondary" className="shrink-0 text-xs font-medium">
                        {currentQuestion.marks} {currentQuestion.marks === 1 ? "mark" : "marks"}
                      </Badge>
                      <Badge variant="outline" className="shrink-0 text-xs text-muted-foreground">
                        {currentQuestion.question_type === "single_correct"
                          ? "Single correct answer"
                          : currentQuestion.question_type === "essay"
                            ? "Essay Writing"
                            : "Select all correct answers"}
                      </Badge>

                      {/* Flag for review button */}
                      <button
                        type="button"
                        onClick={() => toggleFlag(currentQuestion.id)}
                        disabled={isReviewMode}
                        className={cn(
                          "ml-auto flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-all cursor-pointer",
                          flagged[currentQuestion.id]
                            ? "border-amber-400 bg-amber-100 text-amber-700 hover:bg-amber-200 dark:border-amber-600 dark:bg-amber-900/40 dark:text-amber-300"
                            : "border-border bg-background text-muted-foreground hover:border-amber-400 hover:bg-amber-50 hover:text-amber-700 dark:hover:bg-amber-950/20 dark:hover:text-amber-400"
                        )}
                      >
                        <Flag
                          className={cn(
                            "h-3 w-3 shrink-0 transition-colors",
                            flagged[currentQuestion.id]
                              ? "fill-amber-500 text-amber-500"
                              : "text-muted-foreground"
                          )}
                        />
                        <span>{flagged[currentQuestion.id] ? "Flagged" : "Flag"}</span>
                      </button>
                    </div>

                    {/* Question Prompt */}
                    <div className="wrap-break-word text-base font-medium leading-relaxed">
                      <InlineRichText>{currentQuestion.question_text}</InlineRichText>
                    </div>

                    {/* Question Tags */}
                    {currentQuestion.tags && currentQuestion.tags.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Tag className="h-3 w-3 shrink-0 text-muted-foreground/60" />
                        {currentQuestion.tags.map((t) => (
                          <Badge key={t} variant="secondary" className="px-2 py-0 text-xs">
                            {t}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Options or Essay Editor */}
                  <div className="space-y-2.5">
                    {currentQuestion.question_type === "essay" ? (
                      <EssayAnswerEditor
                        value={currentEssayText}
                        onChange={(text) => {
                          if (isReviewMode) return
                          setIsSavingMock(true)
                          if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
                          saveTimeoutRef.current = setTimeout(() => setIsSavingMock(false), 350)
                          setEssayAnswers((prev) => ({
                            ...prev,
                            [currentQuestion.id]: text,
                          }))
                        }}
                        disabled={isReviewMode}
                        minWords={currentQuestion.min_words ?? 180}
                        maxWords={currentQuestion.max_words ?? 220}
                        rubricGuidelines={currentQuestion.rubric_guidelines}
                        saveStatus={isSavingMock ? "saving" : currentEssayText ? "saved" : "idle"}
                      />
                    ) : (
                      currentQuestion.options.map((opt, optIdx) => (
                        <OptionButton
                          key={opt.id}
                          option={opt}
                          optionIndex={optIdx}
                          isSelected={currentAnswers.includes(opt.id)}
                          questionType={currentQuestion.question_type as "single_correct" | "multiple_correct"}
                          isReviewMode={isReviewMode}
                          onClick={() =>
                            handleSelectOption(
                              currentQuestion.id,
                              opt.id,
                              currentQuestion.question_type
                            )
                          }
                        />
                      ))
                    )}
                  </div>

                  {/* Explanation Box (Visible in Review Mode) */}
                  {isReviewMode && (
                    <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-2 text-xs text-foreground">
                      <p className="font-bold flex items-center gap-1.5 text-primary text-sm">
                        <Sparkles className="size-4" />
                        Official Explanation & Solution
                      </p>
                      {currentQuestion.explanation ? (
                        <div className="leading-relaxed text-foreground/90 text-sm">
                          <InlineRichText>{currentQuestion.explanation}</InlineRichText>
                        </div>
                      ) : (
                        <p className="text-muted-foreground italic">
                          No explanation provided for this question. You can add one in the test editor.
                        </p>
                      )}
                    </div>
                  )}

                  {/* Clear Response Button */}
                  {!isReviewMode && (currentAnswers.length > 0 || currentEssayText) && (
                    <div className="flex items-center justify-start pt-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={handleClearCurrent}
                        className="h-8 px-3 text-xs text-muted-foreground hover:text-foreground"
                      >
                        {currentQuestion.question_type === "essay"
                          ? "Clear Essay Draft"
                          : "Clear Selection"}
                      </Button>
                    </div>
                  )}

                  {/* Simulated Auto-Save / Response Status Line */}
                  <div className="pt-1">
                    {isSavingMock ? (
                      <p className="flex items-center gap-1.5 text-xs text-primary font-medium">
                        <RefreshCw className="h-3 w-3 animate-spin" />
                        Saving to database…
                      </p>
                    ) : currentAnswers.length > 0 || currentEssayText ? (
                      <p className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                        <CheckCircle2 className="h-3 w-3" />
                        {currentQuestion.question_type === "essay"
                          ? "Draft saved to database"
                          : "Saved to database"}
                      </p>
                    ) : (
                      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <AlertCircle className="h-3 w-3 shrink-0" />
                        Not answered yet
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="max-w-md mx-auto text-center py-20 space-y-4">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
                    <BookOpen className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-foreground">No questions in this section</h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      This section has no questions assigned yet.
                    </p>
                  </div>
                  {!isFinalSection && (
                    <Button size="sm" onClick={handleNext}>
                      Advance to Next Section
                    </Button>
                  )}
                </div>
              )}
            </div>

            {/* Desktop Prev / Next Fixed Footer Bar */}
            <div className="hidden md:flex shrink-0 h-16 border-t bg-background/95 backdrop-blur px-6 lg:px-8 items-center justify-between z-20">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrevious}
                disabled={isFirstOfSection && (!isReviewMode || currentSectionIndex === 0)}
              >
                <ChevronLeft className="mr-1 h-4 w-4" />
                Previous
              </Button>

              <div className="flex items-center gap-2">
                {normalizedSections.length > 1 && (
                  <span className="text-xs font-semibold text-foreground bg-muted px-2 py-0.5 rounded border border-border">
                    {currentSection.name}
                  </span>
                )}
                <span className="text-xs tabular-nums text-muted-foreground font-medium">
                  {currentIndex + 1} / {normalizedQuestions.length}
                </span>
              </div>

              {isReviewMode ? (
                <Button size="sm" onClick={handleNext} className="font-semibold px-5">
                  {isLastOfSection && isFinalSection ? "Finish Review" : "Next"}
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              ) : isLastOfSection ? (
                isFinalSection ? (
                  <Button
                    size="sm"
                    onClick={() => setShowSubmitDialog(true)}
                    className="font-semibold px-4"
                  >
                    <Send className="mr-1.5 h-4 w-4" />
                    Submit Test
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    onClick={() => setShowSectionSubmitDialog(true)}
                    className="font-semibold px-4 bg-primary text-primary-foreground"
                  >
                    Submit Section
                    <ArrowRight className="ml-1.5 h-4 w-4" />
                  </Button>
                )
              ) : (
                <Button size="sm" onClick={handleNext} className="font-semibold px-5">
                  Next
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              )}
            </div>
          </main>

          {/* ── Desktop Sidebar: Question Palette & Section Navigation ── */}
          <aside className="hidden md:flex md:w-56 lg:w-64 xl:w-72 shrink-0 h-full flex-col border-l bg-card/30 overflow-y-auto">
            <div className="flex flex-col gap-5 p-5 lg:p-6">
              {/* Section Countdown Timer */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[11px] text-muted-foreground font-medium">
                  <span>Section Time</span>
                  {normalizedSections.length > 1 && (
                    <span>
                      Sec {currentSectionIndex + 1}/{normalizedSections.length}
                    </span>
                  )}
                </div>
                <TimerDisplay
                  timeRemaining={timeRemaining}
                  timerDanger={timerDanger}
                  timerWarning={timerWarning}
                  isPaused={!timerRunning}
                  isUntimed={isUntimed}
                />
              </div>

              {/* Progress Bar */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  <span>Progress</span>
                  <span className="tabular-nums font-semibold text-foreground">
                    {savedCount} / {normalizedQuestions.length} Saved
                  </span>
                </div>
                <Progress
                  value={(savedCount / (normalizedQuestions.length || 1)) * 100}
                  className="h-2 w-full rounded-full"
                />
              </div>

              {/* Question Palette */}
              <div className="space-y-4">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Question Palette
                </p>

                <div className="space-y-4">
                  {normalizedSections.map((sec) => {
                    const secQuestions = normalizedQuestions.filter((q) => q.section_id === sec.id)
                    if (secQuestions.length === 0) return null
                    const isSecCompleted = completedSectionIds.has(sec.id)
                    const isSecActive = sec.id === currentSectionId
                    const isSecLocked = enforceLocking && !isSecActive && !isSecCompleted && !isReviewMode

                    const secSaved = secQuestions.filter((q) => {
                      if (q.question_type === "essay") {
                        return Boolean((essayAnswers[q.id] ?? "").trim())
                      }
                      return (answers[q.id] ?? []).length > 0
                    }).length

                    return (
                      <div key={sec.id} className="space-y-2 border-t pt-3 first:border-t-0 first:pt-0">
                        <div className="flex items-center justify-between text-[11px] font-bold text-foreground uppercase tracking-wider">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="truncate">{sec.name}</span>
                            {isSecCompleted && (
                              <span className="inline-flex items-center rounded px-1 py-0.2 text-[9px] font-semibold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300">
                                Done
                              </span>
                            )}
                            {isSecActive && (
                              <span className="inline-flex items-center rounded px-1 py-0.2 text-[9px] font-semibold text-primary bg-primary/10 border border-primary/30">
                                Current
                              </span>
                            )}
                            {isSecLocked && (
                              <span className="inline-flex items-center rounded px-1 py-0.2 text-[9px] font-medium text-muted-foreground bg-muted border border-border">
                                <Lock className="mr-0.5 size-2.5" /> Locked
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-muted-foreground font-normal shrink-0">
                            {secSaved} / {secQuestions.length}
                          </span>
                        </div>

                        {/* Circular Question Buttons */}
                        <div className="grid grid-cols-5 gap-2">
                          {secQuestions.map((q) => {
                            const globalIndex = normalizedQuestions.findIndex((dq) => dq.id === q.id)
                            const localAns = answers[q.id] ?? []
                            const isEssay = q.question_type === "essay"
                            const localEssay = (essayAnswers[q.id] ?? "").trim()
                            const isSaved = isEssay ? Boolean(localEssay) : localAns.length > 0
                            const isFlagged = flagged[q.id] ?? false
                            const isCurrent = globalIndex === currentIndex
                            const isClickable = !isSecLocked || isReviewMode

                            // Review mode state for this question
                            const revStatus = scoreResults.questionStatusMap[q.id]

                            return (
                              <button
                                key={q.id}
                                onClick={() => isClickable && handleJump(globalIndex)}
                                disabled={!isClickable}
                                className={cn(
                                  "relative aspect-square w-full rounded-full border text-xs font-bold transition-all duration-150 flex items-center justify-center select-none",
                                  isClickable ? "cursor-pointer" : "cursor-not-allowed",
                                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                                  isCurrent && "ring-2 ring-primary ring-offset-2 z-10 scale-105 shadow-sm",
                                  // Review mode palette coloring
                                  isReviewMode
                                    ? revStatus === "correct"
                                      ? "border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 font-bold"
                                      : revStatus === "incorrect"
                                        ? "border-red-400 bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-300 font-bold"
                                        : revStatus === "essay"
                                          ? "border-purple-400 bg-purple-50 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300 font-bold"
                                          : "border-border bg-background text-muted-foreground font-semibold"
                                    : isSecActive
                                      ? isSaved
                                        ? "border-emerald-500 bg-emerald-50/80 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-300 font-bold"
                                        : isFlagged
                                          ? "border-indigo-500 bg-indigo-50/80 text-indigo-700 hover:bg-indigo-100 dark:border-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-300 font-bold"
                                          : "border-border bg-background text-muted-foreground hover:border-muted-foreground/50 hover:text-foreground font-semibold"
                                      : isSecCompleted
                                        ? "opacity-60 bg-muted/60 border-emerald-300/80 dark:border-emerald-900/60 text-muted-foreground"
                                        : "opacity-35 bg-muted/20 border-dashed border-border text-muted-foreground"
                                )}
                              >
                                {globalIndex + 1}
                                {isFlagged && (isSecActive || isReviewMode) && (
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
              </div>

              {/* Legend */}
              <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground pt-3 border-t">
                {isReviewMode ? (
                  <>
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 shrink-0 rounded-full border border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40" />
                      <span>Correct</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 shrink-0 rounded-full border border-red-400 bg-red-50 dark:bg-red-950/40" />
                      <span>Incorrect</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 shrink-0 rounded-full border border-purple-400 bg-purple-50 dark:bg-purple-950/40" />
                      <span>Essay Draft</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 shrink-0 rounded-full border border-border bg-background" />
                      <span>Skipped</span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 shrink-0 rounded-full border border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40" />
                      <span>Saved ({savedCount})</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 shrink-0 rounded-full border border-indigo-500 bg-indigo-50 dark:bg-indigo-950/40 flex items-center justify-center">
                        <Flag className="h-2 w-2 fill-indigo-600 text-indigo-600 dark:fill-indigo-400 dark:text-indigo-400" />
                      </div>
                      <span>Flagged ({flaggedCount})</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 shrink-0 rounded-full border-2 border-primary" />
                      <span>Current</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 shrink-0 rounded-full border border-border bg-background" />
                      <span>Unanswered</span>
                    </div>
                  </>
                )}
              </div>

              {/* Sidebar Action Button */}
              <div className="pt-2">
                {isReviewMode ? (
                  <Button
                    variant="outline"
                    className="w-full shrink-0"
                    onClick={() => setStage("submitted")}
                  >
                    Back to Summary
                  </Button>
                ) : isFinalSection ? (
                  <Button
                    className="w-full shrink-0"
                    onClick={() => setShowSubmitDialog(true)}
                  >
                    <Send className="mr-1.5 h-4 w-4" />
                    Submit Test
                  </Button>
                ) : (
                  <Button
                    className="w-full shrink-0 bg-primary text-primary-foreground font-semibold"
                    onClick={() => setShowSectionSubmitDialog(true)}
                  >
                    <ArrowRight className="mr-1.5 h-4 w-4" />
                    Submit & Next Section
                  </Button>
                )}
              </div>
            </div>
          </aside>

          {/* ── Mobile Fixed Bottom Bar ── */}
          <div className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur supports-backdrop-filter:bg-background/80 md:hidden">
            <div className="flex h-16 items-center gap-2 px-5">
              <Button
                variant="outline"
                size="icon"
                className="h-9 w-9 shrink-0"
                onClick={handlePrevious}
                disabled={isFirstOfSection && (!isReviewMode || currentSectionIndex === 0)}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>

              <div className="flex min-w-0 flex-1 items-center justify-center gap-2">
                <TimerDisplay
                  timeRemaining={timeRemaining}
                  timerDanger={timerDanger}
                  timerWarning={timerWarning}
                  isPaused={!timerRunning}
                  isUntimed={isUntimed}
                  compact
                />

                {currentQuestion && !isReviewMode && (
                  <button
                    onClick={() => toggleFlag(currentQuestion.id)}
                    className={cn(
                      "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border transition-all",
                      flagged[currentQuestion.id]
                        ? "border-amber-400 bg-amber-100 text-amber-600 dark:border-amber-600 dark:bg-amber-900/40 dark:text-amber-400"
                        : "border-border bg-background text-muted-foreground hover:border-amber-400 hover:text-amber-600"
                    )}
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
              >
                <Menu className="h-4 w-4" />
              </Button>

              {isReviewMode ? (
                <Button
                  size="sm"
                  className="shrink-0"
                  onClick={handleNext}
                >
                  Next <ChevronRight className="ml-1 h-3.5 w-3.5" />
                </Button>
              ) : isLastOfSection ? (
                isFinalSection ? (
                  <Button
                    size="sm"
                    className="shrink-0"
                    onClick={() => setShowSubmitDialog(true)}
                  >
                    <Send className="mr-1.5 h-3.5 w-3.5" />
                    Submit
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    className="shrink-0 bg-primary text-primary-foreground text-xs font-semibold px-3"
                    onClick={() => setShowSectionSubmitDialog(true)}
                  >
                    Next Sec <ChevronRight className="ml-1 h-3.5 w-3.5" />
                  </Button>
                )
              ) : (
                <Button
                  variant="outline"
                  size="icon"
                  className="h-9 w-9 shrink-0"
                  onClick={handleNext}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          {/* ── Mobile Nav Sheet ── */}
          <Sheet open={navSheetOpen} onOpenChange={setNavSheetOpen}>
            <SheetContent side="right" className="flex w-72 flex-col overflow-hidden">
              <SheetHeader className="border-b pb-4">
                <SheetTitle className="text-sm">Question Navigator</SheetTitle>
              </SheetHeader>
              <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-5 py-5">
                <div className="space-y-4">
                  {normalizedSections.map((sec) => {
                    const secQuestions = normalizedQuestions.filter((q) => q.section_id === sec.id)
                    return (
                      <div key={sec.id} className="space-y-2">
                        <div className="text-xs font-bold uppercase">{sec.name}</div>
                        <div className="grid grid-cols-5 gap-2">
                          {secQuestions.map((q) => {
                            const globalIndex = normalizedQuestions.findIndex((dq) => dq.id === q.id)
                            const isSaved = (answers[q.id] ?? []).length > 0 || Boolean((essayAnswers[q.id] ?? "").trim())
                            const isFlagged = flagged[q.id] ?? false
                            return (
                              <button
                                key={q.id}
                                onClick={() => {
                                  handleJump(globalIndex)
                                  setNavSheetOpen(false)
                                }}
                                className={cn(
                                  "aspect-square w-full rounded-full border text-xs font-bold flex items-center justify-center",
                                  globalIndex === currentIndex && "ring-2 ring-primary ring-offset-2",
                                  isSaved
                                    ? "bg-emerald-500/10 border-emerald-500 text-emerald-600 font-bold"
                                    : isFlagged
                                      ? "bg-indigo-500/10 border-indigo-500 text-indigo-600 font-bold"
                                      : "border-border text-muted-foreground"
                                )}
                              >
                                {globalIndex + 1}
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
              <div className="border-t px-5 pb-4 pt-5">
                <Button
                  className="w-full"
                  onClick={() => {
                    setNavSheetOpen(false)
                    if (isFinalSection) {
                      setShowSubmitDialog(true)
                    } else {
                      setShowSectionSubmitDialog(true)
                    }
                  }}
                >
                  {isFinalSection ? "Submit Assessment" : "Submit Section"}
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────── */}
      {/* ── STAGE 3: AUTHENTIC SUBMITTED / SCORE REVIEW SCREEN ──────────────── */}
      {/* ────────────────────────────────────────────────────────────────────── */}
      {stage === "submitted" && (
        <div className="flex-1 w-full min-h-0 overflow-y-auto bg-background px-6 py-12 flex flex-col items-center justify-center text-center">
          <div className="w-full max-w-xl space-y-7">
            {/* Success Icon */}
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 border border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-800 text-emerald-600">
              <CheckCircle2 className="h-10 w-10" />
            </div>

            {/* Header */}
            <div className="space-y-2">
              <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
                Test Submitted Successfully
              </h1>
              <p className="text-muted-foreground text-sm">
                Candidate assessment simulation finished. Responses were automatically evaluated against answer keys.
              </p>
            </div>

            {/* Test Details Card */}
            <div className="rounded-xl border bg-muted/40 p-5 text-sm space-y-1">
              <p className="font-bold text-lg">{testTitle || "Untitled Assessment"}</p>
              <p className="text-xs text-muted-foreground">
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

            {/* Score Simulation Card */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="rounded-xl border bg-card p-4 space-y-1">
                <span className="text-[11px] font-medium text-muted-foreground uppercase">Marks Scored</span>
                <p className="text-2xl font-bold text-foreground">
                  {scoreResults.earnedMarks} <span className="text-xs text-muted-foreground font-normal">/ {totalMarks}</span>
                </p>
              </div>

              <div className="rounded-xl border bg-card p-4 space-y-1">
                <span className="text-[11px] font-medium text-muted-foreground uppercase">Percentage</span>
                <p className={cn("text-2xl font-bold", scoreResults.overallPassed ? "text-emerald-600" : "text-amber-600")}>
                  {scoreResults.overallPct}%
                </p>
              </div>

              <div className="rounded-xl border bg-card p-4 space-y-1">
                <span className="text-[11px] font-medium text-muted-foreground uppercase">Correct MCQs</span>
                <p className="text-2xl font-bold text-emerald-600">
                  {scoreResults.correctCount}
                </p>
              </div>

              <div className="rounded-xl border bg-card p-4 space-y-1">
                <span className="text-[11px] font-medium text-muted-foreground uppercase">Essays</span>
                <p className="text-xs font-semibold text-primary pt-2">
                  {scoreResults.essayCount > 0 ? `${scoreResults.essayCount} Pending AI Scorer` : "None"}
                </p>
              </div>
            </div>

            {/* Section Breakdown Table */}
            {scoreResults.sectionBreakdown.length > 1 && (
              <div className="rounded-xl border bg-card/60 overflow-hidden text-left text-xs">
                <div className="bg-muted px-4 py-2.5 font-bold text-foreground border-b flex justify-between">
                  <span>Section Breakdown</span>
                  <span>Cutoff Result</span>
                </div>
                <div className="divide-y">
                  {scoreResults.sectionBreakdown.map((sb) => (
                    <div key={sb.sectionId} className="flex items-center justify-between px-4 py-3">
                      <div>
                        <p className="font-semibold text-foreground text-sm">{sb.sectionName}</p>
                        <p className="text-muted-foreground">
                          Score: {sb.earned} / {sb.total} marks ({sb.passPercentage}% cutoff)
                        </p>
                      </div>
                      <Badge
                        variant="outline"
                        className={cn(
                          "font-bold",
                          sb.passed
                            ? "border-emerald-500 text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40"
                            : "border-red-400 text-red-700 bg-red-50 dark:bg-red-950/40"
                        )}
                      >
                        {sb.passed ? "Passed Cutoff" : "Below Cutoff"}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center justify-center gap-3 pt-3">
              <Button
                variant="outline"
                className="gap-2 font-semibold"
                onClick={() => {
                  setIsReviewMode(true)
                  setStage("attempt")
                  setCurrentIndex(0)
                  toast.success("Answer keys and explanations enabled.")
                }}
              >
                <Eye className="h-4 w-4 text-primary" />
                Review Answers with Explanations
              </Button>

              <Button
                variant="outline"
                className="gap-2 font-semibold"
                onClick={handleResetAnswers}
              >
                <RotateCcw className="h-4 w-4" />
                Retake Preview
              </Button>

              <Button
                className="gap-2 font-semibold px-6"
                onClick={onClose}
              >
                Exit Preview
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────── */}
      {/* ── MODALS & DIALOGS ────────────────────────────────────────────────── */}
      {/* ────────────────────────────────────────────────────────────────────── */}

      {/* Section Submit Dialog */}
      <AlertDialog open={showSectionSubmitDialog} onOpenChange={setShowSectionSubmitDialog}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-bold">
              Submit Section: {currentSection.name}?
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-4 pt-2">
                <div className="rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-900/50 dark:bg-amber-950/20 p-3 text-xs text-amber-800 dark:text-amber-300">
                  <strong>Important:</strong> Once you submit this section, you cannot return to review or change any of its answers.
                </div>

                <div className="grid grid-cols-2 gap-2.5 rounded-xl border bg-muted/30 p-3.5 text-xs">
                  <div className="flex flex-col gap-0.5 rounded-lg border bg-background p-2.5">
                    <span className="text-muted-foreground font-medium">Answered</span>
                    <span className="text-base font-bold text-emerald-600 dark:text-emerald-400">
                      {secAnsweredCount} / {currentSectionQuestions.length}
                    </span>
                  </div>
                  <div className="flex flex-col gap-0.5 rounded-lg border bg-background p-2.5">
                    <span className="text-muted-foreground font-medium">Unanswered</span>
                    <span className="text-base font-bold text-muted-foreground">
                      {secUnansweredCount}
                    </span>
                  </div>
                  <div className="flex flex-col gap-0.5 rounded-lg border bg-background p-2.5">
                    <span className="text-muted-foreground font-medium">Flagged</span>
                    <span className="text-base font-bold text-indigo-600 dark:text-indigo-400">
                      {secFlaggedCount}
                    </span>
                  </div>
                  <div className="flex flex-col gap-0.5 rounded-lg border bg-background p-2.5">
                    <span className="text-muted-foreground font-medium">Pass Cutoff</span>
                    <span className="text-base font-bold text-primary">
                      {currentSection.pass_percentage}%
                    </span>
                  </div>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-2">
            <AlertDialogCancel>Review Questions</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => handleAdvanceSectionDirect(true)}
              className="bg-primary text-primary-foreground font-semibold"
            >
              Confirm & Go to Next Section
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Assessment Final Submit Dialog */}
      <AlertDialog open={showSubmitDialog} onOpenChange={setShowSubmitDialog}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-bold">Submit Assessment?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-4 pt-2">
                <p className="text-sm text-muted-foreground">
                  Are you sure you want to finish and submit your test? Once submitted, your answers cannot be modified.
                </p>

                <div className="grid grid-cols-2 gap-2.5 rounded-xl border bg-muted/30 p-3.5 text-xs">
                  <div className="flex flex-col gap-0.5 rounded-lg border bg-background p-2.5">
                    <span className="text-muted-foreground font-medium">Saved Answers</span>
                    <span className="text-base font-bold text-emerald-600 dark:text-emerald-400">
                      {savedCount}
                    </span>
                  </div>
                  <div className="flex flex-col gap-0.5 rounded-lg border bg-background p-2.5">
                    <span className="text-muted-foreground font-medium">Flagged for Review</span>
                    <span className="text-base font-bold text-indigo-600 dark:text-indigo-400">
                      {flaggedCount}
                    </span>
                  </div>
                  <div className="flex flex-col gap-0.5 rounded-lg border bg-background p-2.5">
                    <span className="text-muted-foreground font-medium">Unanswered</span>
                    <span className="text-base font-bold text-muted-foreground">
                      {unansweredCount}
                    </span>
                  </div>
                  <div className="flex flex-col gap-0.5 rounded-lg border bg-background p-2.5">
                    <span className="text-muted-foreground font-medium">Total Questions</span>
                    <span className="text-base font-bold text-foreground">
                      {normalizedQuestions.length}
                    </span>
                  </div>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-2">
            <AlertDialogCancel>Continue Test</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleFinalSubmit}
              className="bg-primary text-primary-foreground font-semibold"
            >
              Confirm Submission
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Keyboard Shortcuts Dialog */}
      <KeyboardShortcutsDialog
        open={showShortcutsModal}
        onOpenChange={setShowShortcutsModal}
      />
    </div>
  )
}
