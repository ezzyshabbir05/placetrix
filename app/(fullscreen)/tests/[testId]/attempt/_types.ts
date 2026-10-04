// ─────────────────────────────────────────────────────────────────────────────
// app/(fullscreen)/tests/[testId]/attempt/_types.ts
// ─────────────────────────────────────────────────────────────────────────────

export interface AttemptSection {
  id: string
  name: string
  description: string | null
  order_index: number
  time_limit_seconds: number
  pass_percentage: number
}

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
  sections?: AttemptSection[]
}

export interface AttemptQuestion {
  id: string
  section_id: string | null
  question_text: string
  question_type: "single_correct" | "multiple_correct" | "essay"
  marks: number
  order_index: number
  tags: { id: string; name: string }[]
  options: {
    id: string
    option_text: string
    order_index: number
  }[]
  min_words?: number | null
  max_words?: number | null
  rubric_guidelines?: string | null
}

export interface AttemptInfo {
  id: string
  started_at: string
  /** ISO timestamp of the server clock at the moment this object was created. */
  server_time: string
  expires_at: string | null
  tab_switch_count: number
  attempt_number: number
  active_session_token?: string | null
  current_section_id?: string | null
  section_started_at?: string | null
  section_expires_at?: string | null
  completed_section_ids?: string[]
}

export interface SavedAnswer {
  question_id: string
  selected_option_ids: string[]
  essay_text?: string | null
}