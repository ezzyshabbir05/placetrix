// app/~/tests/[testId]/page.tsx

import { notFound, redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { getUserProfile } from "@/lib/supabase/profile"
import { CandidateTestDetailClient } from "./CandidateTestDetailClient"
import { InstituteTestDetailClient } from "./InstituteTestDetailClient"
import {
  toggleResultsAction,
  togglePublishAction,
  deleteTestAction,
  deleteAttemptAction,
} from "./actions"
import type {
  CandidateTestDetail,
  CandidateAttemptDetail,
  CandidateAnswerDetail,
  CandidateOption,
  InstituteTestDetail,
  InstituteQuestion,
  InstituteAttemptRow,
} from "./_types"


// ─── Candidate data ───────────────────────────────────────────────────────────


async function fetchCandidateView(
  testId: string,
  userId: string
): Promise<{ test: CandidateTestDetail; attempt: CandidateAttemptDetail | null }> {
  const supabase = await createClient()

  // 1. Fetch user's institute profile and the test with its nested data in parallel.
  // This reduces 7-8 sequential/parallel calls to just 2 master calls.
  const [profileRes, testRes] = await Promise.all([
    (supabase as any)
      .from("candidate_profiles")
      .select("institute_id, profile_complete, profile_updated")
      .eq("profile_id", userId)
      .maybeSingle(),
    (supabase as any)
      .from("tests")
      .select(`
        id, title, description, instructions, time_limit_seconds, 
        available_from, available_until, results_available, status, institute_id,
        shuffle_questions, shuffle_options,
        institute:institute_profiles(institute_name, logo_path),
        questions (
          id, question_text, marks, explanation, order_index,
          options (id, option_text, is_correct, order_index),
          question_tags (tags (id, name))
        ),
        test_attempts (
          id, status, submitted_at, score, total_marks, percentage, 
          time_spent_seconds, tab_switch_count,
          attempt_answers (
            question_id, selected_option_ids, is_correct, marks_awarded, time_spent_seconds
          )
        )
      `)
      .eq("id", testId)
      // We filter attempts for THIS student only
      .eq("test_attempts.student_id", userId)
      .order("created_at", { foreignTable: "test_attempts", ascending: false })
      .limit(1, { foreignTable: "test_attempts" })
      .maybeSingle()
  ])

  const candidateProfile = profileRes.data
  const raw = testRes.data

  if (!candidateProfile?.institute_id || !raw || raw.status !== "published" || raw.institute_id !== candidateProfile.institute_id) {
    notFound()
  }

  const logoPath = (raw.institute as any)?.logo_path ?? null
  const instituteLogoUrl = logoPath
    ? supabase.storage.from("avatars").getPublicUrl(logoPath).data.publicUrl
    : null

  const test: CandidateTestDetail = {
    id: raw.id,
    title: raw.title,
    description: raw.description ?? null,
    instructions: raw.instructions ?? null,
    time_limit_seconds: raw.time_limit_seconds ?? null,
    available_from: raw.available_from ?? null,
    available_until: raw.available_until ?? null,
    results_available: raw.results_available,
    shuffle_questions: raw.shuffle_questions,
    shuffle_options: raw.shuffle_options,
    institute_name: (raw.institute as any)?.institute_name ?? null,
    institute_logo_url: instituteLogoUrl,
    status: raw.status as any,
    questions: (raw.questions ?? []).map((q: any) => ({ marks: q.marks })),
  }

  const rawAttempt = raw.test_attempts?.[0]
  if (!rawAttempt) return { test, attempt: null }

  const attemptBase = {
    id: rawAttempt.id,
    status: rawAttempt.status as "in_progress" | "submitted",
    submitted_at: rawAttempt.submitted_at ?? null,
    score: rawAttempt.score ?? null,
    total_marks: rawAttempt.total_marks ?? null,
    percentage: rawAttempt.percentage ?? null,
    time_spent_seconds: rawAttempt.time_spent_seconds ?? null,
    tab_switch_count: rawAttempt.tab_switch_count ?? null,
  }

  // If results aren't available, we don't return the full answer set
  if (rawAttempt.status !== "submitted" || !raw.results_available) {
    return { test, attempt: { ...attemptBase, answers: [] } }
  }

  const answerMap: Record<string, any> = {}
  for (const a of rawAttempt.attempt_answers ?? []) {
    answerMap[a.question_id] = a
  }

  // Ensure questions and options are sorted by order_index
  const sortedQuestions = [...(raw.questions ?? [])].sort(
    (a, b) => (a.order_index ?? 0) - (b.order_index ?? 0)
  )

  const answers: CandidateAnswerDetail[] = sortedQuestions.map((q: any) => {
    const ans = answerMap[q.id]
    const sortedOptions = [...(q.options ?? [])].sort(
      (a, b) => (a.order_index ?? 0) - (b.order_index ?? 0)
    )

    return {
      question_id: q.id,
      question_text: q.question_text,
      marks: q.marks,
      is_correct: ans?.is_correct ?? null,
      marks_awarded: ans?.marks_awarded ?? null,
      selected_option_ids: (ans?.selected_option_ids as string[]) ?? [],
      time_spent_seconds: ans?.time_spent_seconds ?? null,
      explanation: (q.explanation as string) ?? null,
      options: sortedOptions.map((o: any) => ({
        id: o.id,
        option_text: o.option_text,
        is_correct: o.is_correct,
        order_index: o.order_index,
      })),
      tags: ((q.question_tags as any[]) ?? [])
        .map((qt) => qt.tags)
        .filter(Boolean)
        .flat(),
    }
  })

  return { test, attempt: { ...attemptBase, answers } }
}



// ─── Institute data ───────────────────────────────────────────────────────────


async function fetchInstituteView(
  testId: string,
  userId: string
): Promise<InstituteTestDetail> {
  const supabase = await createClient()

  // 1. Unified Institute View Query
  // Combines core test data, questions, and baseline attempt info.
  const { data: raw, error } = await (supabase as any)
    .from("tests")
    .select(`
      id, title, description, instructions, time_limit_seconds, 
      available_from, available_until, status, results_available, institute_id,
      institute:institute_profiles(institute_name),
      questions (
        id, question_text, question_type, marks, order_index, explanation, 
        options (id, option_text, is_correct, order_index),
        question_tags (tags (id, name))
      ),
      attempts:view_test_results_detailed (
        attempt_id, student_id, student_name, student_email, branch, passout_year,
        tab_switch_count, status, score, total_marks, percentage, 
        time_spent_seconds, started_at, submitted_at
      )
    `)
    .eq("id", testId)
    .eq("institute_id", userId)
    .order("started_at", { foreignTable: "view_test_results_detailed", ascending: false })
    .single()

  if (error || !raw) notFound()

  const questions: InstituteQuestion[] = (raw.questions ?? []).map((q: any) => ({
    id: q.id,
    question_text: q.question_text,
    question_type: q.question_type as "single_correct" | "multiple_correct",
    marks: q.marks,
    order_index: q.order_index,
    explanation: (q.explanation as string) ?? null,
    options: ((q.options as any[]) ?? []).map((o) => ({
      id: o.id,
      option_text: o.option_text,
      is_correct: o.is_correct,
      order_index: o.order_index,
    })),
    tags: ((q.question_tags as any[]) ?? [])
      .map((qt) => qt.tags)
      .filter(Boolean)
      .flat(),
  }))

  // 2. Map attempts
  const attempts: InstituteAttemptRow[] = (raw.attempts ?? [])
    .filter((a: any): a is any & { attempt_id: string; started_at: string } =>
      a.attempt_id != null && a.started_at != null
    )
    .map((a: any) => ({
      id: a.attempt_id,
      student_name: a.student_name,
      student_email: a.student_email,
      status: a.status as InstituteAttemptRow["status"],
      score: a.score ?? null,
      total_marks: a.total_marks ?? null,
      percentage: a.percentage ?? null,
      time_spent_seconds: a.time_spent_seconds ?? null,
      started_at: a.started_at,
      submitted_at: a.submitted_at ?? null,
      tab_switch_count: a.tab_switch_count ?? null,
      branch: a.branch,
      passout_year: a.passout_year,
    }))

  return {
    id: raw.id,
    title: raw.title,
    description: raw.description ?? null,
    instructions: raw.instructions ?? null,
    time_limit_seconds: raw.time_limit_seconds ?? null,
    available_from: raw.available_from ?? null,
    available_until: raw.available_until ?? null,
    status: raw.status as "draft" | "published" | "archived",
    results_available: raw.results_available,
    institute_name: (raw.institute as any)?.institute_name ?? null,
    questions,
    attempts,
  }
}


// ─── Page ─────────────────────────────────────────────────────────────────────


export default async function TestDetailPage({
  params,
}: {
  params: Promise<{ testId: string }>
}) {
  const { testId } = await params

  // ── Redirect "new" to tests list ──────────────────────────────────────────
  if (testId === "new") redirect("/~/tests")

  const profile = await getUserProfile()
  if (!profile) redirect("/auth/login")

  const serverNow = new Date().toISOString()

  if (profile.account_type === "candidate") {
    const { test, attempt } = await fetchCandidateView(testId, profile.id)
    return <CandidateTestDetailClient test={test} attempt={attempt} serverNow={serverNow} />
  }

  if (profile.account_type === "institute") {
    const test = await fetchInstituteView(testId, profile.id)
    return (
      <InstituteTestDetailClient
        testId={testId}
        test={test}
        serverNow={serverNow}
        onToggleResults={toggleResultsAction.bind(null, testId)}
        onTogglePublish={togglePublishAction.bind(null, testId)}
        onDeleteTest={deleteTestAction.bind(null, testId)}
        onDeleteAttempt={deleteAttemptAction.bind(null, testId)}
      />
    )
  }

  // Recruiter / admin / other — not supported for test detail
  redirect("/~/tests")
}

