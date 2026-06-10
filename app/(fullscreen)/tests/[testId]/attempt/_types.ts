// ─────────────────────────────────────────────────────────────────────────────
// app/(fullscreen)/tests/[testId]/attempt/_types.ts
// ─────────────────────────────────────────────────────────────────────────────

export interface AttemptTest {
  id: string
  title: string
  description: string | null
  instructions: string | null
  time_limit_seconds: number | null
  available_until: string | null
  strict_mode: boolean
  shuffle_questions: boolean
  shuffle_options: boolean
}

export interface AttemptQuestion {
  id: string
  question_text: string
  question_type: "single_correct" | "multiple_correct"
  marks: number
  order_index: number
  tags: { id: string; name: string }[]
  options: {
    id: string
    option_text: string
    order_index: number
  }[]
}

export interface AttemptInfo {
  id: string
  started_at: string
  /** ISO timestamp of the server clock at the moment this object was created. */
  server_time: string
  expires_at: string | null
  tab_switch_count: number
  attempt_number: number
}

export interface SavedAnswer {
  question_id: string
  selected_option_ids: string[]
}