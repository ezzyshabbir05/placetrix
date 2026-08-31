// app/tests/[testId]/page.tsx

import { notFound, redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { getUserProfile } from "@/lib/supabase/profile"
import { CandidateTestDetailClient } from "./CandidateTestDetailClient"
import { InstituteTestDetailClient } from "./InstituteTestDetailClient"
import {
  toggleMarksAction,
  toggleResultsAction,
  togglePublishAction,
  deleteTestAction,
  deleteAttemptAction,
  clearAllAttemptsAction,
} from "./actions"
import { buildStorageUrl, buildOptimizedStorageUrl } from "@/lib/storage"
import type {
  CandidateTestDetail,
  CandidateAttemptDetail,
  CandidateAnswerDetail,
  CandidateOption,
  InstituteTestDetail,
  InstituteQuestion,
  InstituteAttemptRow,
  AttemptPageStats,
} from "./_types"


// ─── Candidate data ───────────────────────────────────────────────────────────


async function fetchCandidateView(
  testId: string,
  userId: string,
  candidateInstituteId: string | null
): Promise<{ test: CandidateTestDetail; attempt: CandidateAttemptDetail | null }> {
  const supabase = await createClient()

  // Fetch test with its nested data for THIS student only
  const testRes = await (supabase as any)
    .from("tests")
    .select(`
      id, title, description, instructions, time_limit_seconds, 
      available_from, available_until, results_available, marks_available, status, institute_id, created_by,
      creator:profiles!created_by(id, full_name, email, avatar_path),
      shuffle_questions, shuffle_options, max_attempts,
      institute:institutes(institute_name, logo_path),
      test_questions (
        id, question_text, marks, explanation, order_index,
        test_question_options (id, option_text, is_correct, order_index),
        question_tags (test_question_tags (id, name))
      ),
      test_attempts (
        id, status, submitted_at, started_at, score, total_marks, percentage, 
        active_time_taken, total_time_taken, tab_switch_count,
        test_attempt_answers (
          question_id, selected_option_ids, is_correct, marks_awarded, time_spent_seconds
        )
      )
    `)
    .eq("id", testId)
    .eq("test_attempts.candidate_id", userId)
    .order("created_at", { foreignTable: "test_attempts", ascending: false })
    .maybeSingle()

  let raw = testRes.data

  if (!raw && testRes.error) {
    // If marks_available column is not created in DB yet, retry without it
    const fallbackRes = await (supabase as any)
      .from("tests")
      .select(`
        id, title, description, instructions, time_limit_seconds, 
        available_from, available_until, results_available, status, institute_id,
        shuffle_questions, shuffle_options, max_attempts,
        institute:institutes(institute_name, logo_path),
        test_questions (
          id, question_text, marks, explanation, order_index,
          test_question_options (id, option_text, is_correct, order_index),
          question_tags (test_question_tags (id, name))
        ),
        test_attempts (
          id, status, submitted_at, started_at, score, total_marks, percentage, 
          active_time_taken, total_time_taken, tab_switch_count,
          test_attempt_answers (
            question_id, selected_option_ids, is_correct, marks_awarded, time_spent_seconds
          )
        )
      `)
      .eq("id", testId)
      .eq("test_attempts.candidate_id", userId)
      .order("created_at", { foreignTable: "test_attempts", ascending: false })
      .maybeSingle()
    raw = fallbackRes.data
  }

  if (!candidateInstituteId || !raw || raw.status !== "published" || raw.institute_id !== candidateInstituteId) {
    notFound()
  }

  // Verify that this test is targeted to one of the candidate's cohorts
  const { data: memberRows } = await (supabase as any)
    .from("cohort_students")
    .select("cohort_id")
    .eq("student_id", userId)

  const cohortIds = (memberRows ?? []).map((r: any) => r.cohort_id)

  if (cohortIds.length === 0) {
    notFound()
  }

  const { data: isTargeted } = await (supabase as any)
    .from("test_cohorts")
    .select("cohort_id")
    .eq("test_id", testId)
    .in("cohort_id", cohortIds)
    .limit(1)
    .maybeSingle()

  if (!isTargeted) {
    notFound()
  }

  const logoPath = (raw.institute as any)?.logo_path ?? null
  const instituteLogoUrl = logoPath
    ? supabase.storage.from("avatars").getPublicUrl(logoPath).data.publicUrl
    : null

  const attempts = raw.test_attempts ?? []
  const completedCount = attempts.filter((a: any) => a.status === "submitted" || a.status === "auto_submitted").length

  const test: CandidateTestDetail = {
    id: raw.id,
    title: raw.title,
    description: raw.description ?? null,
    instructions: raw.instructions ?? null,
    time_limit_seconds: raw.time_limit_seconds ?? null,
    available_from: raw.available_from ?? null,
    available_until: raw.available_until ?? null,
    results_available: raw.results_available,
    marks_available: raw.marks_available ?? true,
    shuffle_questions: raw.shuffle_questions,
    shuffle_options: raw.shuffle_options,
    max_attempts: raw.max_attempts,
    completed_count: completedCount,
    pastAttempts: attempts.map((a: any) => ({
      id: a.id,
      score: a.score ?? null,
      total_marks: a.total_marks ?? null,
      percentage: a.percentage ?? null,
      status: a.status,
      submitted_at: a.submitted_at ?? null,
      active_time_taken: a.active_time_taken ?? null,
      total_time_taken: a.total_time_taken ?? (a.started_at && a.submitted_at ? Math.max(0, Math.round((new Date(a.submitted_at).getTime() - new Date(a.started_at).getTime()) / 1000)) : null),
    })),
    institute_name: (raw.institute as any)?.institute_name ?? null,
    institute_logo_url: instituteLogoUrl,
    creator: raw.creator
      ? {
          id: raw.creator.id,
          full_name: raw.creator.full_name ?? null,
          email: raw.creator.email ?? null,
          avatar_url: buildOptimizedStorageUrl("avatars", raw.creator.avatar_path, { width: 64, height: 64, quality: 80, format: "webp" }),
        }
      : null,
    status: raw.status as any,
    questions: (raw.test_questions ?? []).map((q: any) => ({ marks: q.marks })),
  }

  const rawAttempt = attempts[0]
  if (!rawAttempt) return { test, attempt: null }

  const attemptBase = {
    id: rawAttempt.id,
    status: rawAttempt.status as "in_progress" | "submitted",
    started_at: rawAttempt.started_at ?? null,
    submitted_at: rawAttempt.submitted_at ?? null,
    score: rawAttempt.score ?? null,
    total_marks: rawAttempt.total_marks ?? null,
    percentage: rawAttempt.percentage ?? null,
    active_time_taken: rawAttempt.active_time_taken ?? null,
    total_time_taken: rawAttempt.total_time_taken ?? (rawAttempt.started_at && rawAttempt.submitted_at ? Math.max(0, Math.round((new Date(rawAttempt.submitted_at).getTime() - new Date(rawAttempt.started_at).getTime()) / 1000)) : null),
    tab_switch_count: rawAttempt.tab_switch_count ?? null,
  }

  // If results aren't available, we don't return the full answer set
  if (rawAttempt.status !== "submitted" || !raw.results_available) {
    return { test, attempt: { ...attemptBase, answers: [] } }
  }

  const answerMap: Record<string, any> = {}
  for (const a of rawAttempt.test_attempt_answers ?? []) {
    answerMap[a.question_id] = a
  }

  // Ensure questions and options are sorted by order_index
  const sortedQuestions = [...(raw.test_questions ?? [])].sort(
    (a, b) => (a.order_index ?? 0) - (b.order_index ?? 0)
  )

  const answers: CandidateAnswerDetail[] = sortedQuestions.map((q: any) => {
    const ans = answerMap[q.id]
    const sortedOptions = [...(q.test_question_options ?? [])].sort(
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
        .map((qt) => qt.test_question_tags)
        .filter(Boolean)
        .flat(),
    }
  })

  return { test, attempt: { ...attemptBase, answers } }
}



// ─── Institute data ───────────────────────────────────────────────────────────

const PAGE_SIZE = 20

function mapAttemptRow(a: any): InstituteAttemptRow {
  const cad = Array.isArray(a.profile?.candidate_academic_details)
    ? a.profile?.candidate_academic_details[0]
    : a.profile?.candidate_academic_details;
  
  const courseName = Array.isArray(cad?.course)
    ? cad?.course[0]?.course_name
    : cad?.course?.course_name;

  return {
    id: a.id,
    student_name: a.profile?.full_name ?? "Unknown",
    student_email: a.profile?.email ?? "Unknown",
    status: a.status as InstituteAttemptRow["status"],
    score: a.score ?? null,
    total_marks: a.total_marks ?? null,
    percentage: a.percentage ?? null,
    active_time_taken: a.active_time_taken ?? null,
    total_time_taken: a.total_time_taken ?? (a.started_at && a.submitted_at ? Math.max(0, Math.round((new Date(a.submitted_at).getTime() - new Date(a.started_at).getTime()) / 1000)) : null),
    started_at: a.started_at,
    submitted_at: a.submitted_at ?? null,
    tab_switch_count: a.tab_switch_count ?? null,
    branch: courseName ?? null,
    passout_year: cad?.passout_year ?? null,
  }
}

async function fetchInstituteView(
  testId: string,
  instituteId: string
): Promise<InstituteTestDetail> {
  const supabase = await createClient()

  // 1. Core test data + sections + questions — no attempts in this query
  let { data: raw, error } = await (supabase as any)
    .from("tests")
    .select(`
      id, title, description, instructions, time_limit_seconds, 
      available_from, available_until, status, results_available, marks_available, institute_id, created_by,
      creator:profiles!created_by(id, full_name, email, avatar_path),
      institute:institutes(institute_name),
      test_sections (id, name, description, order_index),
      test_questions (
        id, section_id, question_text, question_type, marks, order_index, explanation,
        test_question_options (id, option_text, is_correct, order_index),
        question_tags (test_question_tags (id, name))
      )
    `)
    .eq("id", testId)
    .eq("institute_id", instituteId)
    .maybeSingle()

  if (!raw && error) {
    // Fallback if marks_available column is not yet present in database
    const fallbackRes = await (supabase as any)
      .from("tests")
      .select(`
        id, title, description, instructions, time_limit_seconds, 
        available_from, available_until, status, results_available, institute_id, created_by,
        creator:profiles!created_by(id, full_name, email, avatar_path),
        institute:institutes(institute_name),
        test_sections (id, name, description, order_index),
        test_questions (
          id, section_id, question_text, question_type, marks, order_index, explanation,
          test_question_options (id, option_text, is_correct, order_index),
          question_tags (test_question_tags (id, name))
        )
      `)
      .eq("id", testId)
      .eq("institute_id", instituteId)
      .maybeSingle()
    raw = fallbackRes.data
    error = fallbackRes.error
  }

  if (error || !raw) notFound()

  // 2. Parallel fetches (SSR seed, 20 rows, newest first, stats, analytics)
  const [attemptsRes, statsRes, analyticsRes] = await Promise.all([
    (supabase as any)
      .from("test_attempts")
      .select(
        "id, tab_switch_count, status, score, total_marks, percentage, active_time_taken, total_time_taken, started_at, submitted_at, profile:profiles!candidate_id(full_name, email, candidate_academic_details(passout_year, course:institute_courses(course_name)))"
      )
      .eq("test_id", testId)
      .not("started_at", "is", null)
      .order("started_at", { ascending: false })
      .order("id", { ascending: true })
      .range(0, PAGE_SIZE - 1),

    // 3. Aggregate stats across ALL attempts (pre-aggregated via RPC)
    (supabase as any).rpc("get_test_attempt_stats", { p_test_id: testId }),

    // 4. Question analysis data
    (supabase as any)
      .from("view_test_question_analysis")
      .select("question_id, question_text, marks, total_answers, correct_answers, success_rate_pct, avg_time_spent")
      .eq("test_id", testId),
  ])

  if (attemptsRes.error) console.error("[fetchInstituteView] attempts error:", attemptsRes.error)
  if (statsRes.error) console.error("[fetchInstituteView] stats error:", statsRes.error)
  if (analyticsRes.error) console.error("[fetchInstituteView] analytics error:", analyticsRes.error)

  const firstPageAttempts: InstituteAttemptRow[] = (attemptsRes.data ?? []).map(mapAttemptRow)

  const attemptStats: AttemptPageStats = (statsRes.data as any) ?? {
    total: 0,
    submitted: 0,
    in_progress: 0,
    avg_pct: null,
  }

  const questionAnalytics = (analyticsRes.data ?? []).map((a: any) => ({
    question_id: a.question_id,
    question_text: a.question_text,
    marks: Number(a.marks),
    total_answers: Number(a.total_answers),
    correct_answers: Number(a.correct_answers),
    success_rate_pct: a.success_rate_pct != null ? Number(a.success_rate_pct) : null,
    avg_time_spent: a.avg_time_spent != null ? Number(a.avg_time_spent) : null,
  }))

  const sections = ((raw.test_sections as any[]) ?? [])
    .sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0))
    .map((s) => ({
      id: s.id,
      name: s.name,
      description: s.description ?? null,
      order_index: s.order_index,
    }))

  const questions: InstituteQuestion[] = (raw.test_questions ?? []).map((q: any) => ({
    id: q.id,
    section_id: q.section_id ?? null,
    question_text: q.question_text,
    question_type: q.question_type as "single_correct" | "multiple_correct",
    marks: q.marks,
    order_index: q.order_index,
    explanation: (q.explanation as string) ?? null,
    options: ((q.test_question_options as any[]) ?? []).map((o) => ({
      id: o.id,
      option_text: o.option_text,
      is_correct: o.is_correct,
      order_index: o.order_index,
    })),
    tags: ((q.question_tags as any[]) ?? [])
      .map((qt) => qt.test_question_tags)
      .filter(Boolean)
      .flat(),
  }))

  return {
    id: raw.id,
    title: raw.title,
    description: raw.description ?? null,
    instructions: raw.instructions ?? null,
    sections,
    time_limit_seconds: raw.time_limit_seconds ?? null,
    available_from: raw.available_from ?? null,
    available_until: raw.available_until ?? null,
    status: raw.status as "draft" | "published" | "archived",
    results_available: raw.results_available,
    marks_available: raw.marks_available ?? true,
    institute_name: (raw.institute as any)?.institute_name ?? null,
    creator: raw.creator
      ? {
          id: raw.creator.id,
          full_name: raw.creator.full_name ?? null,
          email: raw.creator.email ?? null,
          avatar_url: buildOptimizedStorageUrl("avatars", raw.creator.avatar_path, { width: 64, height: 64, quality: 80, format: "webp" }),
        }
      : null,
    questions,
    attempts: firstPageAttempts,
    attemptStats,
    questionAnalytics,
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
  if (testId === "new") redirect("/tests")

  const profile = await getUserProfile()
  if (!profile) redirect("/auth/login")

  const serverNow = new Date().toISOString()

  if (profile.account_type === "institute_candidate") {
    const { test, attempt } = await fetchCandidateView(testId, profile.id, profile.institute_id)
    return <CandidateTestDetailClient test={test} attempt={attempt} serverNow={serverNow} />
  }

  if (profile.account_type === "institute_staff" || profile.account_type === "institute_placement_officer" || profile.account_type === "institute_primary") {
    const instituteId = profile.institute_id
    if (!instituteId) redirect("/home")
    const test = await fetchInstituteView(testId, instituteId)
    return (
      <InstituteTestDetailClient
        testId={testId}
        test={test}
        serverNow={serverNow}
        onToggleMarks={toggleMarksAction.bind(null, testId)}
        onToggleResults={toggleResultsAction.bind(null, testId)}
        onTogglePublish={togglePublishAction.bind(null, testId)}
        onDeleteTest={deleteTestAction.bind(null, testId)}
        onDeleteAttempt={deleteAttemptAction.bind(null, testId)}
        onClearAllAttempts={clearAllAttemptsAction.bind(null, testId)}
      />
    )
  }

  // Recruiter / admin / other — not supported for test detail
  redirect("/tests")
}

