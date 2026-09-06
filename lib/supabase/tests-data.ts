import { createClient } from "@/lib/supabase/client"
import { buildOptimizedStorageUrl } from "@/lib/storage"
import {
  deriveStatus,
  type CandidateTest,
  type CandidateTestAttempt,
  type InstituteTest,
} from "@/app/(dashboard)/(licensed)/tests/_types"

export interface InstituteFilterOptions {
  sort?: string
  duration?: string
  questions?: string
  results?: string
  marks?: string
  attempts?: string
  author?: string
  userId?: string
}

export interface CandidateTestsResult {
  tests: CandidateTest[]
  count: number
  tabCounts: { all: number; live: number; upcoming: number; past: number; attempted: number }
}

export interface InstituteTestsResult {
  tests: InstituteTest[]
  count: number
  tabCounts: { all: number; live: number; upcoming: number; past: number; drafts: number }
}

/**
 * Direct Client Fetcher: Candidate Tests Overview
 * Calls RPC `get_candidate_tests_overview` directly from the browser via Supabase client SDK.
 * 0 Cloud Run vCPU time.
 */
export async function fetchCandidateTestsClient({
  userId,
  instituteId,
  now,
  page,
  size,
  search,
  tab,
}: {
  userId: string
  instituteId: string | null
  now: string
  page: number
  size: number
  search: string
  tab: string
}): Promise<CandidateTestsResult> {
  const supabase = createClient()

  const { data, error } = await (supabase as any).rpc("get_candidate_tests_overview", {
    p_user_id: userId,
    p_institute_id: instituteId || null,
    p_now: now,
    p_search: search.trim() || null,
    p_tab: tab || "all",
    p_page: page,
    p_size: size,
  })

  if (error || !data) {
    console.error("Error executing get_candidate_tests_overview RPC:", error)
    return {
      tests: [],
      count: 0,
      tabCounts: { all: 0, live: 0, upcoming: 0, past: 0, attempted: 0 },
    }
  }

  const tabCounts = {
    all: data.tab_counts?.all ?? 0,
    live: data.tab_counts?.live ?? 0,
    upcoming: data.tab_counts?.upcoming ?? 0,
    past: data.tab_counts?.past ?? 0,
    attempted: data.tab_counts?.attempted ?? 0,
  }

  const tests: CandidateTest[] = (data.tests ?? []).map((t: any): CandidateTest => {
    const rawAttempt = t.attempt
    let attempt: CandidateTestAttempt | undefined
    if (rawAttempt) {
      attempt = {
        status: rawAttempt.status as "in_progress" | "submitted",
        submitted_at: rawAttempt.submitted_at ?? undefined,
        score: rawAttempt.score != null ? Number(rawAttempt.score) : undefined,
        total_marks: rawAttempt.total_marks != null ? Number(rawAttempt.total_marks) : undefined,
        percentage: rawAttempt.percentage != null ? Number(rawAttempt.percentage) : undefined,
      }
    }

    return {
      id: t.id,
      title: t.title,
      description: t.description ?? undefined,
      time_limit_seconds: t.time_limit_seconds != null ? Number(t.time_limit_seconds) : undefined,
      available_from: t.available_from ?? undefined,
      available_until: t.available_until ?? undefined,
      derived_status: deriveStatus(
        "published",
        t.available_from,
        t.available_until,
        new Date(now)
      ) as CandidateTest["derived_status"],
      results_available: t.results_available ?? false,
      marks_available: t.marks_available ?? true,
      attempt,
      creator: (t.creator_name || t.creator_email || t.creator_avatar_path)
        ? {
            full_name: t.creator_name ?? null,
            email: t.creator_email ?? null,
            avatar_url: buildOptimizedStorageUrl("avatars", t.creator_avatar_path, {
              width: 64,
              height: 64,
              quality: 80,
              format: "webp",
            }),
          }
        : undefined,
    }
  })

  return { tests, count: data.total_count ?? 0, tabCounts }
}

/**
 * Direct Client Fetcher: Institute Tests Overview
 * Calls RPC `get_institute_tests_overview` directly from the browser via Supabase client SDK.
 * 0 Cloud Run vCPU time.
 */
export async function fetchInstituteTestsClient({
  instituteId,
  now,
  page,
  size,
  search,
  tab,
  options,
}: {
  instituteId: string
  now: string
  page: number
  size: number
  search: string
  tab: string
  options?: InstituteFilterOptions
}): Promise<InstituteTestsResult> {
  const supabase = createClient()

  const { data, error } = await (supabase as any).rpc("get_institute_tests_overview", {
    p_institute_id: instituteId || null,
    p_now: now,
    p_search: search.trim() || null,
    p_tab: tab || "all",
    p_page: page,
    p_size: size,
    p_sort: options?.sort && options.sort !== "default" ? options.sort : null,
    p_duration: options?.duration && options.duration !== "all" ? options.duration : null,
    p_questions: options?.questions && options.questions !== "all" ? options.questions : null,
    p_results: options?.results && options.results !== "all" ? options.results : null,
    p_marks: options?.marks && options.marks !== "all" ? options.marks : null,
    p_attempts: options?.attempts && options.attempts !== "all" ? options.attempts : null,
    p_author: options?.author && options.author !== "all" ? options.author : null,
    p_user_id: options?.userId || null,
  })

  if (error || !data) {
    console.error("Error executing get_institute_tests_overview RPC:", error)
    return {
      tests: [],
      count: 0,
      tabCounts: { all: 0, live: 0, upcoming: 0, past: 0, drafts: 0 },
    }
  }

  const tabCounts = {
    all: data.tab_counts?.all ?? 0,
    live: data.tab_counts?.live ?? 0,
    upcoming: data.tab_counts?.upcoming ?? 0,
    past: data.tab_counts?.past ?? 0,
    drafts: data.tab_counts?.drafts ?? 0,
  }

  const tests: InstituteTest[] = (data.tests ?? []).map((t: any): InstituteTest => ({
    id: t.id,
    title: t.title,
    description: t.description ?? undefined,
    time_limit_seconds: t.time_limit_seconds != null ? Number(t.time_limit_seconds) : undefined,
    available_from: t.available_from ?? undefined,
    available_until: t.available_until ?? undefined,
    derived_status: deriveStatus(
      t.status,
      t.available_from,
      t.available_until,
      new Date(now)
    ) as InstituteTest["derived_status"],
    status: t.status as "draft" | "published",
    results_available: t.results_available ?? false,
    marks_available: t.marks_available ?? true,
    question_count: t.question_count != null ? Number(t.question_count) : 0,
    attempt_count: t.attempt_count != null ? Number(t.attempt_count) : 0,
    avg_score_pct: t.avg_score_pct != null ? Number(t.avg_score_pct) : null,
    total_marks: t.total_marks != null ? Number(t.total_marks) : null,
    submitted_attempts: t.submitted_attempts != null ? Number(t.submitted_attempts) : null,
    created_by: t.created_by ?? null,
    creator: (t.creator_name || t.creator_email || t.creator_avatar_path)
      ? {
          full_name: t.creator_name ?? null,
          email: t.creator_email ?? null,
          avatar_url: buildOptimizedStorageUrl("avatars", t.creator_avatar_path, {
            width: 64,
            height: 64,
            quality: 80,
            format: "webp",
          }),
        }
      : undefined,
  }))

  return { tests, count: data.total_count ?? 0, tabCounts }
}
