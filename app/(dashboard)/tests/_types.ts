// ─────────────────────────────────────────────────────────────────────────────
// app/tests/_types.ts
// ─────────────────────────────────────────────────────────────────────────────

export type DerivedCandidateStatus = "live" | "upcoming" | "past"
export type DerivedInstituteStatus = "draft" | "live" | "upcoming" | "past"

export interface CandidateTestAttempt {
  status: "in_progress" | "submitted"
  submitted_at?: string
  score?: number
  total_marks?: number
  percentage?: number
}

export interface CandidateTest {
  id: string
  title: string
  description?: string
  time_limit_seconds?: number        // undefined = no time limit
  available_from?: string
  available_until?: string           // ← added
  derived_status: DerivedCandidateStatus
  current_derived_status?: DerivedCandidateStatus
  results_available: boolean
  attempt?: CandidateTestAttempt
}

export interface InstituteTest {
  id: string
  title: string
  description?: string
  time_limit_seconds?: number        // undefined = no time limit
  available_from?: string
  available_until?: string
  derived_status: DerivedInstituteStatus
  current_derived_status?: DerivedInstituteStatus
  status: "draft" | "published"
  results_available: boolean
  question_count: number
  attempt_count: number
}

// ─── deriveStatus ─────────────────────────────────────────────────────────────
//
// Derives the display status for a test from its DB status + availability window.
//
// Rules:
//   draft                                          → "draft"
//   published, available_from > now                → "upcoming"
//   published, available_until < now               → "past"
//   published, within window (or no window set)    → "live"
// ─────────────────────────────────────────────────────────────────────────────

export function deriveStatus(
  dbStatus: string,
  available_from?: string | null,
  available_until?: string | null,
  nowOverride?: Date
): DerivedInstituteStatus {
  if (dbStatus === "draft") return "draft"

  const now   = nowOverride ?? new Date()
  const from  = available_from  ? new Date(available_from)  : null
  const until = available_until ? new Date(available_until) : null

  if (from  && from  > now) return "upcoming"
  if (until && until < now) return "past"
  return "live"
}
