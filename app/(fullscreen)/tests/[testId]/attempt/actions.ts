"use server"

// ─────────────────────────────────────────────────────────────────────────────
// app/(fullscreen)/tests/[testId]/attempt/actions.ts
// ─────────────────────────────────────────────────────────────────────────────

import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { getUserProfile } from "@/lib/supabase/profile"
import { getFriendlyErrorMessage } from "@/lib/errors"
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

/**
 * Ultra-fast auth check for high-frequency exam sync actions — uses JWT claims
 * without querying the profiles table.
 */
async function requireFastAuth() {
  const supabase = await createClient()
  const { data: claimsData } = await supabase.auth.getClaims()
  const userId = claimsData?.claims?.sub
  if (!userId) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error("Unauthorized or session expired")
    return { supabase, userId: user.id }
  }
  return { supabase, userId }
}


// ─── Start Attempt ────────────────────────────────────────────────────────────
export async function startAttemptAction(testId: string): Promise<AttemptInfo> {
  const { supabase } = await requireAuth()

  const { data, error } = await (supabase as any).rpc("test_attempt_start", {
    p_test_id: testId,
  })

  if (error) {
    console.error("[startAttemptAction] RPC error:", error)
    throw new Error(getFriendlyErrorMessage(error, "Failed to start the test. Please try again."))
  }

  if (data?.error) {
    throw new Error(getFriendlyErrorMessage(data, data.error))
  }

  return {
    id: data.id,
    started_at: data.started_at,
    server_time: data.server_time || new Date().toISOString(),
    expires_at: data.expires_at,
    tab_switch_count: data.tab_switch_count ?? 0,
    attempt_number: data.attempt_number ?? 1,
  }
}



// ─── Sync Attempt (Combined Heartbeat + Answer Delta Batch) ───────────────────
export async function syncAction(
  attemptId: string,
  sessionToken: string,
  batch: Array<{
    questionId: string
    selectedOptionIds: string[]
    timeSpentSeconds: number
  }>
): Promise<{ ok: boolean; error?: string }> {
  const { supabase } = await requireFastAuth()

  const { data, error } = await (supabase as any).rpc("test_attempt_sync", {
    p_attempt_id: attemptId,
    p_session_token: sessionToken,
    p_batch: batch,
  })

  if (error) {
    console.error("[syncAction] RPC error:", error)
    return { ok: false, error: getFriendlyErrorMessage(error, "Failed to sync your answers. They are saved locally and will retry.") }
  }

  if (data?.error) {
    return { ok: false, error: getFriendlyErrorMessage(data, "An issue occurred during sync. Your answers are safe.") }
  }

  return { ok: true }
}


// ─── Claim Session ─────────────────────────────────────────────────────────────
export async function claimSessionAction(
  attemptId: string,
  sessionToken: string
): Promise<{ ok: boolean; error?: string }> {
  const { supabase } = await requireAuth()

  const { data, error } = await (supabase as any).rpc("test_attempt_claim_session", {
    p_attempt_id: attemptId,
    p_session_token: sessionToken,
  })

  if (error) {
    console.error("[claimSessionAction] RPC error:", error)
    return { ok: false, error: getFriendlyErrorMessage(error, "Failed to claim session. Please refresh and try again.") }
  }

  if (data?.error) {
    return { ok: false, error: getFriendlyErrorMessage(data, "Session could not be claimed. Please try again.") }
  }

  return { ok: true }
}


// ─── Submit Attempt ────────────────────────────────────────────────────────────
export async function submitAttemptAction(
  attemptId: string
): Promise<{ error?: string; redirectPath?: string }> {
  const { supabase, userId } = await requireAuth()

  const { data: ownerCheck } = await (supabase as any)
    .from("test_attempts")
    .select("id")
    .eq("id", attemptId)
    .eq("candidate_id", userId)
    .in("status", ["in_progress", "auto_submitted"])
    .maybeSingle()

  if (!ownerCheck) {
    return { error: "Attempt not found or already submitted" }
  }

  const { data: result, error } = await (supabase as any).rpc("test_attempt_grade", {
    p_attempt_id: attemptId,
  })

  if (error) {
    console.error("[submitAttemptAction] RPC error:", error)
    return { error: getFriendlyErrorMessage(error, "Failed to submit your test. Please try again.") }
  }

  const typedResult = result as { test_id?: string; error?: string } | null

  if (!typedResult) {
    return { error: "Received an empty response from server while grading." }
  }

  if (typedResult.error) {
    return { error: getFriendlyErrorMessage(typedResult, "Something went wrong during grading. Please contact your instructor.") }
  }

  const testId = typedResult.test_id
  return { redirectPath: testId ? `/tests/${testId}` : "/tests" }
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
    const { supabase, userId } = await requireFastAuth()

    const { error } = await (supabase as any)
      .from("test_attempts")
      .update({ tab_switch_count: totalCount })
      .eq("id", attemptId)
      .eq("candidate_id", userId)   // ownership guard
      .eq("status", "in_progress") // don't mutate a completed attempt

    if (error) {
      console.error("[recordViolationAction] update error:", error.message)
    }
  } catch (err) {
    // Intentionally swallowed: violation recording must never interrupt the exam.
    console.error("[recordViolationAction] unexpected error:", err)
  }
}