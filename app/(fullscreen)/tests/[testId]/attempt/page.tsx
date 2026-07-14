// ─────────────────────────────────────────────────────────────────────────────
// app/(fullscreen)/tests/[testId]/attempt/page.tsx
// ─────────────────────────────────────────────────────────────────────────────

import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { AttemptClient } from "./AttemptClient"
import {
  saveAnswerAction,
  saveAnswersBatchAction,
  submitAttemptAction,
  recordViolationAction,
  startAttemptAction,
  submitFeedbackAction,
} from "./actions"
import { getTestQuestions } from "@/lib/test-data"
import type { AttemptQuestion, AttemptTest, AttemptInfo, SavedAnswer } from "./_types"


export default async function AttemptPage({
  params,
}: {
  params: Promise<{ testId: string }>
}) {
  const { testId } = await params
  const supabase = await createClient()

  const { data: authData } = await supabase.auth.getClaims()
  if (!authData?.claims) redirect("/auth/login")

  const userId = authData.claims.sub

  // Verify that this test is targeted to one of the candidate's cohorts
  const { data: memberRows } = await (supabase as any)
    .from("cohort_students")
    .select("cohort_id")
    .eq("student_id", userId)

  const cohortIds = (memberRows ?? []).map((r: any) => r.cohort_id)

  if (cohortIds.length === 0) {
    redirect("/tests")
  }

  const { data: isTargeted } = await (supabase as any)
    .from("test_cohorts")
    .select("id")
    .eq("test_id", testId)
    .in("cohort_id", cohortIds)
    .limit(1)
    .maybeSingle()

  if (!isTargeted) {
    redirect("/tests")
  }

  // ── 1. Consolidated Initialization (RPC) ────────────────────────────────────
  const { data: initResult, error: initError } = await (supabase as any).rpc(
    "test_attempt_init",
    { p_test_id: testId }
  ) as { data: any; error: any }

  if (initError || !initResult) {
    throw new Error("Failed to initialize test: " + (initError?.message ?? "unknown"))
  }

  if (initResult.error) {
    if (initResult.error === "Profile incomplete") redirect("/settings")
    redirect("/tests")
  }

  // Capture the server timestamp immediately after the RPC returns so that
  // it reflects real server-side time rather than the pre-RPC instant.
  const serverNow = new Date()

  if (initResult.status === "expired") {
    redirect(`/tests/${testId}`)
  }

  // ── 2. Data Preparation ─────────────────────────────────────────────────────
  let attemptInfo: AttemptInfo | null = null
  let savedAnswers: SavedAnswer[] = []

  if (initResult.status === "resumed") {
    attemptInfo = {
      ...initResult.attempt,
      server_time: serverNow.toISOString(),
    }
    savedAnswers = initResult.saved_answers ?? []
  }

  // ── 3. Fetch questions + test details in parallel ───────────────────────────
  const [questions, testDetailRes] = await Promise.all([
    getTestQuestions(testId),
    (supabase as any)
      .from("tests")
      .select(
        "title, description, instructions, time_limit_seconds, available_until, strict_mode, shuffle_questions, shuffle_options"
      )
      .eq("id", testId)
      .maybeSingle(),
  ])

  const testDetail = testDetailRes.data
  const user = authData.claims
  const currentAttemptNumber = (initResult.completed_count ?? 0) + 1
  const shuffleSeedString = `${user.sub}_${testId}_${currentAttemptNumber}`

  // ── 4. Build client-safe test object ────────────────────────────────────────
  const testForClient: AttemptTest = {
    id: testId,
    title: testDetail?.title ?? "Test",
    description: testDetail?.description ?? null,
    instructions: testDetail?.instructions ?? null,
    time_limit_seconds: testDetail?.time_limit_seconds ?? null,
    available_until: testDetail?.available_until ?? null,
    strict_mode: testDetail?.strict_mode ?? false,
    shuffle_questions: testDetail?.shuffle_questions ?? false,
    shuffle_options: testDetail?.shuffle_options ?? false,
  }

  return (
    <AttemptClient
      test={testForClient}
      questions={questions}
      attemptInfo={attemptInfo}
      savedAnswers={savedAnswers}
      serverNow={serverNow.toISOString()}
      shuffleSeed={shuffleSeedString}
      onStartAttempt={startAttemptAction.bind(null, testId)}
      onSaveAnswer={saveAnswerAction}
      onSaveAnswersBatch={saveAnswersBatchAction}
      onSubmit={submitAttemptAction}
      onViolation={recordViolationAction}
      onSubmitFeedback={submitFeedbackAction}
    />
  )
}