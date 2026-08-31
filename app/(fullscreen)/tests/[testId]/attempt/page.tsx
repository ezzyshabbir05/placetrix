// ─────────────────────────────────────────────────────────────────────────────
// app/(fullscreen)/tests/[testId]/attempt/page.tsx
// ─────────────────────────────────────────────────────────────────────────────

import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { AttemptClient } from "./AttemptClient"
import {
  syncAction,
  claimSessionAction,
  submitAttemptAction,
  recordViolationAction,
  startAttemptAction,
} from "./actions"
import { getTestQuestions, getTestSections } from "@/lib/test-data"
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

  // Verify cohort targeting (only if test has specific cohort restrictions)
  const { count: targetCohortCount } = await (supabase as any)
    .from("test_cohorts")
    .select("cohort_id", { count: "exact", head: true })
    .eq("test_id", testId)

  if (targetCohortCount && targetCohortCount > 0) {
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
      .select("cohort_id")
      .eq("test_id", testId)
      .in("cohort_id", cohortIds)
      .limit(1)
      .maybeSingle()

    if (!isTargeted) {
      redirect("/tests")
    }
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
    redirect(`/tests/${testId}`)
  }

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

  // ── 3. Fetch questions + test sections + test details in parallel ──────────
  const [questions, sections, testDetailRes] = await Promise.all([
    getTestQuestions(testId),
    getTestSections(testId),
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

  const candidateName =
    (user.user_metadata?.full_name as string) ??
    (user.user_metadata?.name as string) ??
    (user.email as string) ??
    "Candidate"
  const candidateEmail = (user.email as string) ?? ""

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
    sections,
  }

  return (
    <AttemptClient
      test={testForClient}
      questions={questions}
      attemptInfo={attemptInfo}
      savedAnswers={savedAnswers}
      serverNow={serverNow.toISOString()}
      shuffleSeed={shuffleSeedString}
      candidateId={userId}
      candidateName={candidateName}
      candidateEmail={candidateEmail}
      onStartAttempt={startAttemptAction.bind(null, testId)}
      onSync={syncAction}
      onClaimSession={claimSessionAction}
      onSubmit={submitAttemptAction}
      onViolation={recordViolationAction}
    />
  )
}