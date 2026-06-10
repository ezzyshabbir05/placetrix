"use server"

// ─────────────────────────────────────────────────────────────────────────────
// app/(fullscreen)/tests/[testId]/attempt/actions.ts
// ─────────────────────────────────────────────────────────────────────────────

import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { getUserProfile } from "@/lib/supabase/profile"
import type { AttemptInfo } from "./_types"


// ─── Internal helpers ─────────────────────────────────────────────────────────

/**
 * Returns the Supabase client and a normalised user object.
 *
 * Uses getUserProfile (which handles token refresh + race conditions) so that
 * long-running exam sessions — e.g. a 2-hour paper — don't fail with an
 * "Unauthorized" error the first time a save fires after the access token
 * silently expires in the background.
 */
async function requireAuth() {
  const supabase = await createClient()
  const profile = await getUserProfile()
  if (!profile) throw new Error("Unauthorized or session expired")
  return { supabase, userId: profile.id }
}


// ─── Start Attempt ────────────────────────────────────────────────────────────
//
// Creates a new attempt row ONLY when the student clicks "Begin test".
// If an in-progress attempt already exists it is returned as-is (idempotent).
//
// Race condition mitigation: the INSERT uses a unique constraint on
// (test_id, student_id, attempt_number) rather than a client-side check so
// that two simultaneous clicks produce one attempt row, not two.
// ──────────────────────────────────────────────────────────────────────────────

export async function startAttemptAction(testId: string): Promise<AttemptInfo> {
  const { supabase, userId } = await requireAuth()

  // Fetch everything we need in a single round-trip.
  const [profileRes, testRes, existingRes, completedRes] = await Promise.all([
    (supabase as any)
      .from("candidate_profiles")
      .select("institute_id, profile_complete, profile_updated")
      .eq("profile_id", userId)
      .maybeSingle(),
    (supabase as any)
      .from("tests")
      .select(
        "status, institute_id, time_limit_seconds, max_attempts, available_from, available_until"
      )
      .eq("id", testId)
      .single(),
    (supabase as any)
      .from("test_attempts")
      .select("id, started_at, expires_at, tab_switch_count, attempt_number")
      .eq("test_id", testId)
      .eq("student_id", userId)
      .eq("status", "in_progress")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    (supabase as any)
      .from("test_attempts")
      .select("*", { count: "exact", head: true })
      .eq("test_id", testId)
      .eq("student_id", userId)
      .in("status", ["submitted", "auto_submitted"]),
  ])

  const candidateProfile = profileRes.data
  const test = testRes.data
  const existingAttempt = existingRes.data

  if (
    !candidateProfile ||
    !candidateProfile.profile_complete ||
    !candidateProfile.profile_updated
  ) {
    throw new Error("Profile is incomplete")
  }

  if (
    !test ||
    test.status !== "published" ||
    test.institute_id !== candidateProfile.institute_id
  ) {
    throw new Error("Test not available")
  }

  // Return the existing in-progress attempt; the client already has all
  // required state so we just refresh the server_time.
  if (existingAttempt) {
    return {
      id: existingAttempt.id,
      started_at: existingAttempt.started_at,
      server_time: new Date().toISOString(),
      expires_at: existingAttempt.expires_at,
      tab_switch_count: existingAttempt.tab_switch_count ?? 0,
      attempt_number: existingAttempt.attempt_number,
    }
  }

  // Validate the availability window for NEW attempts only.
  const now = new Date()
  if (test.available_from && new Date(test.available_from) > now) {
    throw new Error("Test is not yet open")
  }
  if (test.available_until && new Date(test.available_until) < now) {
    throw new Error("Test has closed")
  }

  const completedCount = completedRes.count ?? 0
  if (completedCount >= test.max_attempts) {
    throw new Error("Max attempts reached")
  }

  const attemptNumber = completedCount + 1
  const expiresAt = test.time_limit_seconds
    ? new Date(Date.now() + test.time_limit_seconds * 1000).toISOString()
    : null

  // The unique constraint on (test_id, student_id, attempt_number) turns a
  // concurrent duplicate INSERT into a conflict that we surface as a clear
  // error rather than silently creating two rows.
  const { data: newAttempt, error: insertError } = await (supabase as any)
    .from("test_attempts")
    .insert({
      test_id: testId,
      student_id: userId,
      attempt_number: attemptNumber,
      expires_at: expiresAt,
    })
    .select("id, started_at")
    .single()

  if (insertError) {
    // Unique-violation code in Postgres is "23505".  Another tab won the race;
    // fetch the winning row instead of crashing.
    if (insertError.code === "23505") {
      const { data: racedAttempt } = await (supabase as any)
        .from("test_attempts")
        .select("id, started_at, expires_at, tab_switch_count, attempt_number")
        .eq("test_id", testId)
        .eq("student_id", userId)
        .eq("status", "in_progress")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle()

      if (racedAttempt) {
        return {
          id: racedAttempt.id,
          started_at: racedAttempt.started_at,
          server_time: new Date().toISOString(),
          expires_at: racedAttempt.expires_at,
          tab_switch_count: racedAttempt.tab_switch_count ?? 0,
          attempt_number: racedAttempt.attempt_number,
        }
      }
    }
    throw new Error(insertError.message || "Failed to start attempt")
  }

  if (!newAttempt) throw new Error("Failed to start attempt")

  return {
    id: newAttempt.id,
    started_at: newAttempt.started_at,
    server_time: new Date().toISOString(),
    expires_at: expiresAt,
    tab_switch_count: 0,
    attempt_number: attemptNumber,
  }
}


// ─── Save Answer ───────────────────────────────────────────────────────────────
//
// Delegates to the save_answer RPC which:
//   • Verifies the caller owns the attempt and it is still in_progress.
//   • Upserts the answer row (attempt_id, question_id) — idempotent.
// ──────────────────────────────────────────────────────────────────────────────

export async function saveAnswerAction(
  attemptId: string,
  questionId: string,
  selectedOptionIds: string[],
  timeSpentSeconds = 0
): Promise<void> {
  const { supabase } = await requireAuth()

  const { error } = await (supabase as any).rpc("save_answer", {
    p_attempt_id: attemptId,
    p_question_id: questionId,
    p_selected_option_ids: selectedOptionIds,
    p_time_spent_seconds: timeSpentSeconds,
  })

  if (error) {
    console.error("[saveAnswerAction] RPC error:", error)
    throw new Error(error.message || "Failed to save answer")
  }
}


/**
 * Batch version of saveAnswerAction.
 * Reduces server round-trips by processing multiple answers in one call.
 */
export async function saveAnswersBatchAction(
  attemptId: string,
  answers: Array<{
    questionId: string
    selectedOptionIds: string[]
    timeSpentSeconds?: number
  }>
): Promise<void> {
  const { supabase } = await requireAuth()

  // Use the new bulk RPC to save everything in one round-trip.
  const { error } = await (supabase as any).rpc("bulk_save_answers", {
    p_attempt_id: attemptId,
    p_batch: answers, // jsonb array
  })

  if (error) {
    console.error("[saveAnswersBatchAction] RPC error:", error)
    throw new Error(error.message || "Failed to save answers in batch")
  }
}


// ─── Submit Attempt ────────────────────────────────────────────────────────────
//
// 1. Calls grade_attempt_v2 which scores every answer, persists
//    time_spent_seconds, and marks the attempt as submitted — all atomically.
// 2. Redirects to the test results page.
// ──────────────────────────────────────────────────────────────────────────────

export async function submitAttemptAction(
  attemptId: string,
  timeSpentSeconds: number
): Promise<string> {
  const { supabase, userId } = await requireAuth()

  // Verify ownership before grading so a malicious caller cannot grade someone
  // else's attempt by guessing a UUID.
  const { data: ownerCheck } = await (supabase as any)
    .from("test_attempts")
    .select("id")
    .eq("id", attemptId)
    .eq("student_id", userId)
    .eq("status", "in_progress")
    .maybeSingle()

  if (!ownerCheck) {
    throw new Error("Attempt not found or already submitted")
  }

  const { data: result, error } = await (supabase as any).rpc("grade_attempt_v2", {
    p_attempt_id: attemptId,
    p_final_time_spent: timeSpentSeconds,
  })

  if (error) {
    console.error("[submitAttemptAction] RPC error:", error)
    throw new Error(error.message || "Failed to submit attempt")
  }

  const typedResult = result as { test_id?: string; error?: string } | null

  if (!typedResult) {
    throw new Error("Received an empty response from server while grading.")
  }

  if (typedResult.error) {
    throw new Error(typedResult.error)
  }

  return typedResult.test_id ? `/tests/${typedResult.test_id}` : "/tests"
}


// ─── Record Violation ──────────────────────────────────────────────────────────
//
// Keeps the attempt's tab_switch_count in sync with the client-side violation
// counter for auditing purposes.
//
// This action is fire-and-forget on the client — the server logs errors but
// does NOT throw so that a transient network hiccup never interrupts the exam.
// ──────────────────────────────────────────────────────────────────────────────

export async function recordViolationAction(
  attemptId: string,
  _type: "focus_loss" | "fullscreen_exit",
  totalCount: number,
  _timestamp: string
): Promise<void> {
  try {
    const { supabase, userId } = await requireAuth()

    const { error } = await (supabase as any)
      .from("test_attempts")
      .update({ tab_switch_count: totalCount })
      .eq("id", attemptId)
      .eq("student_id", userId)   // ownership guard
      .eq("status", "in_progress") // don't mutate a completed attempt

    if (error) {
      console.error("[recordViolationAction] update error:", error.message)
    }
  } catch (err) {
    // Intentionally swallowed: violation recording must never interrupt the exam.
    console.error("[recordViolationAction] unexpected error:", err)
  }
}


// ─── Submit Feedback ───────────────────────────────────────────────────────────
//
// Persists an optional star-rating + free-text feedback after the test is
// submitted.  One feedback per attempt (enforced by a UNIQUE on attempt_id).
// ──────────────────────────────────────────────────────────────────────────────

export async function submitFeedbackAction(
  attemptId: string,
  testId: string,
  data: {
    rating: number
    overallComment?: string
    bugsIssues?: string
    suggestions?: string
    difficultyFelt?: "too_easy" | "as_expected" | "too_hard"
  }
): Promise<void> {
  const { supabase, userId } = await requireAuth()

  const { error } = await (supabase as any).from("test_attempt_feedback").insert({
    attempt_id: attemptId,
    student_id: userId,
    test_id: testId,
    rating: data.rating,
    overall_comment: data.overallComment ?? null,
    bugs_issues: data.bugsIssues ?? null,
    suggestions: data.suggestions ?? null,
    difficulty_felt: data.difficultyFelt ?? null,
  })

  if (error) {
    console.error("[submitFeedbackAction] insert error:", error)
    throw new Error(error.message || "Failed to submit feedback")
  }
}