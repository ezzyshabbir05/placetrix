import { createClient } from "@/lib/supabase/client"

export interface SyncBatchItem {
  questionId: string
  selectedOptionIds: string[]
  timeSpentSeconds: number
}

export interface DirectSyncResult {
  ok: boolean
  error?: string
}

/**
 * Direct Client Sync:
 * Sends answer batches and heartbeats directly from the browser to the Supabase database
 * via RPC `test_attempt_sync`.
 *
 * Benefits:
 * - 0 Next.js hosting server requests
 * - Reduced latency (no server-side hop)
 * - Immune to Next.js deployment redeploy action-id invalidations
 * - Automatically refreshes expired JWTs for multi-hour exams
 */
export async function syncAttemptDirect(
  attemptId: string,
  sessionToken: string,
  batch: SyncBatchItem[]
): Promise<DirectSyncResult> {
  try {
    const supabase = createClient()

    let { data, error } = await (supabase as any).rpc("test_attempt_sync", {
      p_attempt_id: attemptId,
      p_session_token: sessionToken,
      p_batch: batch,
    })

    // If token expired during long exam, refresh and retry once
    const errorMsg = (error?.message ?? "").toLowerCase()
    const isAuthIssue =
      error?.code === "PGRST301" ||
      errorMsg.includes("jwt") ||
      errorMsg.includes("expired") ||
      data?.error === "Unauthorized"

    if (isAuthIssue) {
      console.warn("[DirectSync] Auth token expired, refreshing session...")
      const { data: refreshData, error: refreshErr } = await supabase.auth.refreshSession()
      if (!refreshErr && refreshData?.session) {
        const retry = await (supabase as any).rpc("test_attempt_sync", {
          p_attempt_id: attemptId,
          p_session_token: sessionToken,
          p_batch: batch,
        })
        data = retry.data
        error = retry.error
      }
    }

    if (error) {
      console.warn("[DirectSync] Supabase RPC error:", error)
      return {
        ok: false,
        error: error.message || "Failed to sync answers. Saved locally.",
      }
    }

    if (data?.error) {
      if (
        data.error_code === "session_superseded" ||
        data.error === "Session active in another tab or device"
      ) {
        return { ok: false, error: "session_superseded" }
      }
      return { ok: false, error: data.error }
    }

    return { ok: true }
  } catch (err: any) {
    console.warn("[DirectSync] Network or runtime exception:", err)
    return {
      ok: false,
      error: err?.message || "Connection lost. Answers saved locally.",
    }
  }
}
