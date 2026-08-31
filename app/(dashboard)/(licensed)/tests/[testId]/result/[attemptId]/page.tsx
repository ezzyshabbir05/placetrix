// app/tests/[testId]/result/[attemptId]/page.tsx

import { notFound, redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { getUserProfile } from "@/lib/supabase/profile"
import { TestResultClient } from "./TestResultClient"
import type {
  CandidateTestDetail,
  CandidateAttemptDetail,
  CandidateAnswerDetail,
} from "../../_types"


async function fetchResultData(
  testId: string,
  attemptId: string,
  userId: string,
  accountType: "institute_candidate" | "institute" | "recruiter"
): Promise<{ test: CandidateTestDetail; attempt: CandidateAttemptDetail }> {
  const supabase = await createClient()

  // 1. Fetch the test and the specific attempt with its answers
  let { data: raw, error } = await (supabase as any)
    .from("tests")
    .select(`
      id, title, description, instructions, time_limit_seconds, 
      available_from, available_until, results_available, marks_available, status, institute_id,
      shuffle_questions, shuffle_options,
      institute:institutes(institute_name, logo_path),
      test_sections (id, name, description, order_index),
      test_questions (
        id, section_id, question_text, marks, explanation, order_index,
        test_question_options (id, option_text, is_correct, order_index),
        question_tags (test_question_tags (id, name))
      ),
      test_attempts!inner (
        id, candidate_id, status, submitted_at, started_at, score, total_marks, percentage, 
        active_time_taken, total_time_taken, tab_switch_count, ai_diagnosis,
        student:profiles(full_name),
        test_attempt_answers (
          question_id, selected_option_ids, is_correct, marks_awarded, time_spent_seconds
        )
      )
    `)
    .eq("id", testId)
    .eq("test_attempts.id", attemptId)
    .maybeSingle()

  if (!raw && error) {
    // Retry without marks_available if column doesn't exist in DB
    const fallbackRes = await (supabase as any)
      .from("tests")
      .select(`
        id, title, description, instructions, time_limit_seconds, 
        available_from, available_until, results_available, status, institute_id,
        shuffle_questions, shuffle_options,
        institute:institutes(institute_name, logo_path),
        test_sections (id, name, description, order_index),
        test_questions (
          id, section_id, question_text, marks, explanation, order_index,
          test_question_options (id, option_text, is_correct, order_index),
          question_tags (test_question_tags (id, name))
        ),
        test_attempts!inner (
          id, candidate_id, status, submitted_at, started_at, score, total_marks, percentage, 
          active_time_taken, total_time_taken, tab_switch_count, ai_diagnosis,
          student:profiles(full_name),
          test_attempt_answers (
            question_id, selected_option_ids, is_correct, marks_awarded, time_spent_seconds
          )
        )
      `)
      .eq("id", testId)
      .eq("test_attempts.id", attemptId)
      .maybeSingle()
    raw = fallbackRes.data
    error = fallbackRes.error
  }

  if (error || !raw) notFound()

  const rawAttempt = raw.test_attempts?.[0]
  if (!rawAttempt) notFound()

  // 2. Security Check & Eligibility
  if (accountType === "institute_candidate") {
    // Candidates can only see their own attempts
    if (rawAttempt.candidate_id !== userId) {
      notFound()
    }
    // 2. Candidates can only see results for PUBLISHED tests
    if (raw.status !== "published") {
      notFound()
    }
  } else if (accountType === "institute" || accountType === "recruiter") {
    // Institutes/recruiters can only see attempts for their own tests
    if (raw.institute_id !== userId && raw.institute_id !== (userId)) {
      // Handled via RLS policy and profile institute check
    }
  } else {
    notFound()
  }

  const logoPath = (raw.institute as any)?.logo_path ?? null
  const instituteLogoUrl = logoPath
    ? supabase.storage.from("avatars").getPublicUrl(logoPath).data.publicUrl
    : null

  // 3. Map Data
  const sections = ((raw.test_sections as any[]) ?? [])
    .sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0))
    .map((s) => ({
      id: s.id,
      name: s.name,
      description: s.description ?? null,
      order_index: s.order_index,
    }))

  const test: CandidateTestDetail = {
    id: raw.id,
    title: raw.title,
    description: raw.description ?? null,
    instructions: raw.instructions ?? null,
    time_limit_seconds: raw.time_limit_seconds ?? null,
    available_from: raw.available_from ?? null,
    available_until: raw.available_until ?? null,
    status: raw.status as any,
    results_available: raw.results_available,
    marks_available: raw.marks_available ?? true,
    shuffle_questions: raw.shuffle_questions,
    shuffle_options: raw.shuffle_options,
    institute_name: (raw.institute as any)?.institute_name ?? null,
    institute_logo_url: instituteLogoUrl,
    sections,
    questions: (raw.test_questions ?? []).map((q: any) => ({ marks: q.marks })),
  }

  const student = (rawAttempt as any).student
  const studentName = student?.full_name ?? null

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
    student_name: studentName,
    ai_diagnosis: rawAttempt.ai_diagnosis ?? null,
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
      section_id: q.section_id ?? null,
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

export default async function TestResultPage({
  params,
}: {
  params: Promise<{ testId: string; attemptId: string }>
}) {
  const { testId, attemptId } = await params
  const profile = await getUserProfile()

  if (!profile) redirect("/auth/login")

  const isCandidate = profile.account_type === "institute_candidate"
  const userIdToCheck = isCandidate ? profile.id : (profile.institute_id ?? profile.id)

  const { test, attempt } = await fetchResultData(
    testId,
    attemptId,
    userIdToCheck,
    isCandidate ? "institute_candidate" : "institute"
  )

  const serverNow = new Date().toISOString()

  return (
    <TestResultClient
      test={test}
      attempt={attempt}
      accountType={isCandidate ? "institute_candidate" : "institute"}
      serverNow={serverNow}
    />
  )
}
