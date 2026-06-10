// ─────────────────────────────────────────────────────────────────────────────
// app/tests/[testId]/_types.ts
// ─────────────────────────────────────────────────────────────────────────────

import type { Database } from "@/types/supabase"

// ─── Supabase row aliases ─────────────────────────────────────────────────────

type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"]

type Views<T extends keyof Database["public"]["Views"]> =
  Database["public"]["Views"][T]["Row"]

// Raw row types — use these if you ever need to pass plain DB rows around
export type TestRow = Tables<"tests">
export type QuestionRow = Tables<"questions">
export type OptionRow = Tables<"options">
export type TagRow = Tables<"tags">
export type AttemptRow = Tables<"test_attempts">
export type AttemptDetail = Views<"attempt_details">   // the view




// ─── Candidate ────────────────────────────────────────────────────────────────

// Directly use the generated OptionRow — no need for a hand-written interface.
// We only re-export a Pick so callers don't import from a deep path.
export type CandidateOption = Pick<
  OptionRow,
  "id" | "option_text" | "is_correct" | "order_index"
>

export interface CandidateAnswerDetail {
  question_id: string
  question_text: string
  marks: number
  is_correct: boolean | null
  marks_awarded: number | null
  selected_option_ids: string[]
  time_spent_seconds: number | null
  explanation: string | null
  options: CandidateOption[]
  tags: Pick<TagRow, "id" | "name">[]
}

export interface CandidateAttemptDetail
  extends Pick<
    AttemptRow,
    "id" | "status" | "submitted_at" | "score" | "total_marks" | "percentage" | "time_spent_seconds" | "tab_switch_count"
  > {
  status: "in_progress" | "submitted"   // narrow the DB string union
  student_name?: string | null
  answers: CandidateAnswerDetail[]
}

export interface CandidateTestDetail
  extends Pick<
    TestRow,
    | "id"
    | "title"
    | "description"
    | "instructions"
    | "time_limit_seconds"
    | "available_from"
    | "available_until"
    | "results_available"
    | "shuffle_questions"
    | "shuffle_options"
  > {
  status: "draft" | "published" | "archived" | null
  institute_name: string | null
  institute_logo_url: string | null
  /** Lightweight list — only marks needed for the pre-test totals display */
  questions: Pick<QuestionRow, "marks">[]
}



// ─── Institute ────────────────────────────────────────────────────────────────

export type InstituteOption = Pick<
  OptionRow,
  "id" | "option_text" | "is_correct" | "order_index"
>

export interface InstituteQuestion
  extends Pick<
    QuestionRow,
    "id" | "question_text" | "question_type" | "marks" | "order_index" | "explanation"
  > {
  question_type: "single_correct" | "multiple_correct"  // narrow
  options: InstituteOption[]
  tags: Pick<TagRow, "id" | "name">[]
}

// ─── Attempt Pagination ──────────────────────────────────────────────────────

/** Pre-computed aggregate stats across ALL attempts for a test (not just one page). */
export interface AttemptPageStats {
  total: number
  submitted: number
  in_progress: number
  /** Average percentage across submitted attempts; null if no submissions yet. */
  avg_pct: number | null
}

// AttemptDetail is a view — all columns are nullable in generated types.
// We override the fields we know are structurally non-null using MergeDeep,
// OR simply Pick + override manually (no extra dependency needed):
export interface InstituteAttemptRow
  extends Pick<
    AttemptDetail,
    | "student_name"
    | "student_email"
    | "score"
    | "total_marks"
    | "percentage"
    | "time_spent_seconds"
    | "submitted_at"
  > {
  id: string             // view types nullable, but we filter nulls before mapping
  started_at: string     // same — guaranteed by .filter() in page.tsx
  status: "in_progress" | "submitted" | "abandoned" | "auto_submitted"
  tab_switch_count: number | null
  branch: string | null
  passout_year: number | null
}

export interface InstituteTestDetail
  extends Pick<
    TestRow,
    | "id"
    | "title"
    | "description"
    | "instructions"
    | "time_limit_seconds"
    | "available_from"
    | "available_until"
    | "results_available"
  > {
  status: "draft" | "published" | "archived"  // narrow the DB string
  institute_name: string | null
  questions: InstituteQuestion[]
  /** First page of attempts (20 rows) — SSR seed for the client. */
  attempts: InstituteAttemptRow[]
  /** Aggregate counts for ALL attempts — SSR seed for the client. */
  attemptStats: AttemptPageStats
}



// ─── Shared utilities ─────────────────────────────────────────────────────────

export function formatDuration(seconds: number | null | undefined): string {
  if (!seconds) return "Untimed"
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (h > 0 && m > 0) return `${h}h ${m}m`
  if (h > 0) return `${h}h`
  return `${m} min`
}

export function formatDateTime(dt?: string | null): string {
  if (!dt) return "—"
  return new Date(dt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })
}

export function formatSeconds(seconds: number | null | undefined): string {
  if (!seconds || seconds <= 0) return "—"
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h}h ${String(m).padStart(2, "0")}m`
  if (m > 0) return `${m}m ${String(s).padStart(2, "0")}s`
  return `${s}s`
}

/** Resolves percentage: use DB value if present, otherwise compute from score/total. */
export function resolvePct(
  pct: number | null | undefined,
  score: number | null | undefined,
  total: number | null | undefined
): number {
  if (pct != null) return pct
  if (score != null && total != null && total > 0)
    return Math.round(((score / total) * 100) * 100) / 100
  return 0
}
