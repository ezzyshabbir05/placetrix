"use client"

import React, { useMemo } from "react"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { Sparkles, FileText, CheckCircle2, Loader2, AlertCircle, RefreshCw, Lock } from "lucide-react"

interface EssayAnswerEditorProps {
  value: string
  onChange: (val: string) => void
  onBlur?: () => void
  disabled?: boolean
  minWords?: number
  maxWords?: number
  rubricGuidelines?: string | null
  saveStatus?: "idle" | "saving" | "saved" | "error"
  saveError?: string | null
  onRetrySave?: () => void
}

export function EssayAnswerEditor({
  value,
  onChange,
  onBlur,
  disabled,
  minWords = 180,
  maxWords = 220,
  rubricGuidelines,
  saveStatus = "idle",
  saveError,
  onRetrySave,
}: EssayAnswerEditorProps) {
  const wordCount = useMemo(() => {
    const trimmed = value.trim()
    if (!trimmed) return 0
    return trimmed.split(/\s+/).filter(Boolean).length
  }, [value])

  const lengthStatus = useMemo(() => {
    if (wordCount === 0) {
      return {
        label: "0 words",
        badgeClass: "bg-muted text-muted-foreground border-transparent",
        hint: `Recommended target: ${minWords}–${maxWords} words. You can submit at any length.`,
      }
    }
    if (wordCount < minWords) {
      return {
        label: `${wordCount} words (Target: ${minWords}–${maxWords})`,
        badgeClass: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-300 dark:border-amber-700",
        hint: `Currently under recommended target (${minWords}+ words). You can still submit whenever you are ready.`,
      }
    }
    if (wordCount > maxWords) {
      return {
        label: `${wordCount} words (Target: ${minWords}–${maxWords})`,
        badgeClass: "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-300 dark:border-sky-700",
        hint: `Exceeded recommended target (${maxWords} words). Ensure arguments remain concise. Submissions of any length are accepted.`,
      }
    }
    return {
      label: `${wordCount} words (Within Target Range)`,
      badgeClass: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-300 dark:border-emerald-700",
      hint: "Your essay length is within the recommended target range.",
    }
  }, [wordCount, minWords, maxWords])

  const handleBlockedAction = (e: React.SyntheticEvent) => {
    e.preventDefault()
    e.stopPropagation()
    toast.error("Copy and paste is disabled during the assessment. Please type your response directly.", {
      id: "essay-copy-paste-disabled",
    })
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const isModifier = e.ctrlKey || e.metaKey
    const key = e.key.toLowerCase()

    if (isModifier && (key === "v" || key === "c" || key === "x")) {
      e.preventDefault()
      e.stopPropagation()
      toast.error("Copy and paste is disabled during the assessment. Please type your response directly.", {
        id: "essay-copy-paste-disabled",
      })
      return
    }

    if (e.shiftKey && e.key === "Insert") {
      e.preventDefault()
      e.stopPropagation()
      toast.error("Copy and paste is disabled during the assessment. Please type your response directly.", {
        id: "essay-copy-paste-disabled",
      })
      return
    }

    if (isModifier && e.key === "Insert") {
      e.preventDefault()
      e.stopPropagation()
      toast.error("Copy and paste is disabled during the assessment. Please type your response directly.", {
        id: "essay-copy-paste-disabled",
      })
      return
    }
  }

  return (
    <div className="space-y-3.5">
      {/* Top Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-muted/30 px-3.5 py-2">
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground font-medium">
          <FileText className="h-3.5 w-3.5 text-primary" />
          <span>Recommended Target: {minWords} – {maxWords} words</span>
          <span className="text-muted-foreground/40 hidden sm:inline">•</span>
          <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground/80 font-normal">
            <Lock className="h-3 w-3 text-muted-foreground" />
            Copy/Paste Disabled
          </span>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Real-time Save Status Indicator */}
          {saveStatus === "saving" && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
              <span>Saving draft…</span>
            </div>
          )}
          {saveStatus === "saved" && (
            <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>Saved</span>
            </div>
          )}
          {saveStatus === "error" && (
            <div className="flex items-center gap-1.5 text-xs text-destructive font-medium">
              <AlertCircle className="h-3.5 w-3.5" />
              <span>Save failed</span>
              {onRetrySave && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={onRetrySave}
                  className="h-5 px-1.5 text-[11px] text-destructive hover:bg-destructive/10"
                >
                  <RefreshCw className="h-3 w-3 mr-1" />
                  Retry
                </Button>
              )}
            </div>
          )}

          {/* Word Count Badge */}
          <Badge variant="outline" className={`font-mono text-xs px-2.5 py-0.5 ${lengthStatus.badgeClass}`}>
            {lengthStatus.label}
          </Badge>
        </div>
      </div>

      {/* Guidelines / Prompt Instructions if provided */}
      {rubricGuidelines && (
        <div className="rounded-md border border-primary/20 bg-primary/5 p-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5 font-semibold text-primary mb-1">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Essay Instructions & Rubric Focus</span>
          </div>
          <p className="leading-relaxed whitespace-pre-line">{rubricGuidelines}</p>
        </div>
      )}

      {/* Writing Area */}
      <div className="relative">
        <Textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          onKeyDown={handleKeyDown}
          onPaste={handleBlockedAction}
          onCopy={handleBlockedAction}
          onCut={handleBlockedAction}
          onDrop={handleBlockedAction}
          onContextMenu={(e) => {
            e.preventDefault()
            e.stopPropagation()
          }}
          disabled={disabled}
          placeholder="Type your essay here... Structure your essay with an introductory paragraph, supporting points with examples, and a well-reasoned conclusion."
          className="min-h-[320px] font-sans text-sm leading-relaxed p-4 resize-y focus-visible:ring-primary/40 focus-visible:border-primary"
          spellCheck
        />
      </div>

      {/* Bottom Hint Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground px-1">
        <span className="flex-1 min-w-[200px]">{lengthStatus.hint}</span>
        <span className="text-[11px] italic shrink-0">Automated Essay Assessment</span>
      </div>
    </div>
  )
}
