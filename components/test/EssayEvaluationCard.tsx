import React from "react"
import { Badge } from "@/components/ui/badge"
import { Sparkles, FileText, CheckCircle2, AlertCircle } from "lucide-react"
import type { EssayEvaluationResult } from "@/lib/essay-evaluator"

interface EssayEvaluationCardProps {
  evaluation?: EssayEvaluationResult | null
  candidateEssay?: string | null
  maxMarks?: number
}

export function EssayEvaluationCard({
  evaluation,
  candidateEssay,
  maxMarks = 10,
}: EssayEvaluationCardProps) {
  if (!evaluation) {
    return (
      <div className="rounded-xl border border-dashed p-4 text-center text-xs text-muted-foreground">
        No automated assessment data available for this essay.
      </div>
    )
  }

  const {
    band_score,
    scaled_marks,
    band_descriptor,
    metrics,
  } = evaluation

  const isPassing = scaled_marks >= (maxMarks * 0.5)

  return (
    <div className="space-y-4 rounded-xl border bg-card p-5 shadow-xs">
      {/* Header with Band and Marks */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-3">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <h4 className="font-semibold text-sm">Automated Essay Evaluation</h4>
          </div>
          <p className="text-xs text-muted-foreground">
            Automated Rubric &amp; Linguistic Assessment
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-xl font-bold tracking-tight text-foreground">
              Band {band_score} <span className="text-xs font-normal text-muted-foreground">/ 6</span>
            </div>
            <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
              {scaled_marks} / {maxMarks} Marks
            </p>
          </div>
          <Badge
            variant={isPassing ? "default" : "destructive"}
            className="text-xs px-2.5 py-1 uppercase tracking-wider font-bold"
          >
            {isPassing ? "Passed" : "Needs Work"}
          </Badge>
        </div>
      </div>

      {/* Rubric Descriptor */}
      <div className="rounded-lg border border-primary/20 bg-primary/5 p-3.5 text-xs">
        <span className="font-bold text-primary">{band_descriptor?.name || `Band ${band_score}`}: </span>
        <span className="text-foreground/80 leading-relaxed">
          {band_descriptor?.description || "Evaluation completed against automated rubrics."}
        </span>
      </div>

      {/* Linguistic Analytics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-center">
        <div className="rounded-lg border bg-muted/30 p-2.5">
          <span className="text-[11px] font-medium text-muted-foreground block">Word Count</span>
          <span className="text-sm font-bold font-mono text-foreground">{metrics.word_count}</span>
          <span className="text-[10px] text-muted-foreground block capitalize mt-0.5">
            {metrics.length_compliance.replace("_", " ")}
          </span>
        </div>

        <div className="rounded-lg border bg-muted/30 p-2.5">
          <span className="text-[11px] font-medium text-muted-foreground block">Sentences</span>
          <span className="text-sm font-bold font-mono text-foreground">{metrics.sentence_count}</span>
          <span className="text-[10px] text-muted-foreground block mt-0.5">Structure</span>
        </div>

        <div className="rounded-lg border bg-muted/30 p-2.5">
          <span className="text-[11px] font-medium text-muted-foreground block">Avg Sentence Len</span>
          <span className="text-sm font-bold font-mono text-foreground">
            {metrics.avg_sentence_length} <span className="text-[10px] font-normal">w/s</span>
          </span>
          <span className="text-[10px] text-muted-foreground block mt-0.5">Readability</span>
        </div>

        <div className="rounded-lg border bg-muted/30 p-2.5">
          <span className="text-[11px] font-medium text-muted-foreground block">Lexical Richness</span>
          <span className="text-sm font-bold font-mono text-foreground">
            {Math.round(metrics.lexical_diversity * 100)}%
          </span>
          <span className="text-[10px] text-muted-foreground block mt-0.5">Unique vocabulary</span>
        </div>
      </div>

      {/* Candidate Essay Review text */}
      {candidateEssay && (
        <div className="space-y-1.5 pt-2">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
            <FileText className="h-3.5 w-3.5" />
            <span>Candidate Submitted Text</span>
          </div>
          <div className="rounded-lg border bg-muted/20 p-3 text-xs leading-relaxed text-foreground/90 whitespace-pre-wrap font-sans">
            {candidateEssay}
          </div>
        </div>
      )}
    </div>
  )
}
