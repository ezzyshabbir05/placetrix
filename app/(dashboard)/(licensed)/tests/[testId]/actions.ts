"use server"

// ─────────────────────────────────────────────────────────────────────────────
// app/tests/[testId]/actions.ts
// ─────────────────────────────────────────────────────────────────────────────

import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { getUserProfile } from "@/lib/supabase/profile"
import { getFriendlyErrorMessage } from "@/lib/errors"


// ─── Guard helper ─────────────────────────────────────────────────────────────
// Verifies the authenticated user is the institute that owns the test.

async function requireAuth(): Promise<string> {
  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()
  const user = data?.claims
  if (!user) throw new Error("Not authenticated")
  return user.sub as string
}

async function assertOwner(testId: string): Promise<string> {
  const profile = await getUserProfile()
  if (
    !profile ||
    (profile.account_type !== "institute_primary" &&
      profile.account_type !== "institute_staff" &&
      profile.account_type !== "institute_placement_officer" &&
      profile.account_type !== "admin")
  ) {
    throw new Error("Forbidden")
  }

  const supabase = await createClient()

  const { data: test, error } = await (supabase as any)
    .from("tests")
    .select("institute_id")
    .eq("id", testId)
    .maybeSingle()

  if (error || !test) throw new Error("Test not found")
  if (profile.account_type !== "admin" && test.institute_id !== profile.institute_id) {
    throw new Error("Forbidden")
  }

  return profile.id
}


// ─── Toggle Marks ─────────────────────────────────────────────────────────────
// Flips marks_available. Students can/cannot see scores and percentages after this.

export async function toggleMarksAction(testId: string): Promise<void> {
  await requireAuth()
  await assertOwner(testId)
  const supabase = await createClient()

  const { data: current, error: selError } = await (supabase as any)
    .from("tests")
    .select("marks_available")
    .eq("id", testId)
    .maybeSingle()

  if (selError && selError.message?.includes("marks_available")) {
    throw new Error("Column 'marks_available' does not exist in DB tests table yet. Please run the SQL migration script.")
  }

  const { error } = await (supabase as any)
    .from("tests")
    .update({ marks_available: !current?.marks_available })
    .eq("id", testId)

  if (error) {
    if (error.message?.includes("marks_available")) {
      throw new Error("Column 'marks_available' does not exist in DB tests table yet. Please run the SQL migration script.")
    }
    throw new Error(getFriendlyErrorMessage(error, "Failed to toggle marks visibility. Please try again."))
  }
  revalidatePath(`/tests/${testId}`)
}


// ─── Toggle Results ────────────────────────────────────────────────────────────
// Flips results_available. Students can/cannot see detailed answer key & report after this.

export async function toggleResultsAction(testId: string): Promise<void> {
  await requireAuth()
  await assertOwner(testId)
  const supabase = await createClient()

  const { data: current } = await (supabase as any)
    .from("tests")
    .select("results_available, marks_available")
    .eq("id", testId)
    .maybeSingle()

  const nextResults = !current?.results_available
  const updateData: Record<string, any> = { results_available: nextResults }
  if (nextResults) {
    updateData.marks_available = true
  }

  let { error } = await (supabase as any)
    .from("tests")
    .update(updateData)
    .eq("id", testId)

  if (error && error.message?.includes("marks_available")) {
    // If marks_available is missing in DB, update only results_available
    const res = await (supabase as any)
      .from("tests")
      .update({ results_available: nextResults })
      .eq("id", testId)
    error = res.error
  }

  if (error) throw new Error(getFriendlyErrorMessage(error, "Failed to toggle results visibility. Please try again."))
  revalidatePath(`/tests/${testId}`)
}


// ─── Toggle Publish ────────────────────────────────────────────────────────────
// draft → published  or  published → draft.
// Archived tests are not touched here.

export async function togglePublishAction(testId: string): Promise<void> {
  await requireAuth()
  await assertOwner(testId)
  const supabase = await createClient()

  const { data: current } = await (supabase as any)
    .from("tests")
    .select("status")
    .eq("id", testId)
    .maybeSingle()

  if (current?.status === "archived") throw new Error("Cannot publish an archived test.")

  const next = current?.status === "published" ? "draft" : "published"

  const { error } = await (supabase as any)
    .from("tests")
    .update({ status: next })
    .eq("id", testId)

  if (error) throw new Error(getFriendlyErrorMessage(error, "Failed to update test status. Please try again."))
  revalidatePath(`/tests/${testId}`)
  revalidatePath("/tests")
}


// ─── Delete Test ───────────────────────────────────────────────────────────────
// Hard-deletes the test row. Cascade removes questions, options, attempts.

export async function deleteTestAction(testId: string): Promise<void> {
  await requireAuth()
  await assertOwner(testId)
  const supabase = await createClient()

  const { error } = await (supabase as any)
    .from("tests")
    .delete()
    .eq("id", testId)

  if (error) throw new Error(getFriendlyErrorMessage(error, "Failed to delete the test. Please try again."))

  revalidatePath("/tests")
  redirect("/tests")
}


// ─── Delete Attempt ───────────────────────────────────────────────────────────
// Hard-deletes a single test attempt. Cascade removes answers.

export async function deleteAttemptAction(testId: string, attemptId: string): Promise<void> {
  await requireAuth()
  await assertOwner(testId)
  const supabase = await createClient()

  const { error } = await (supabase as any)
    .from("test_attempts")
    .delete()
    .eq("id", attemptId)
    .eq("test_id", testId) // safety check

  if (error) throw new Error(getFriendlyErrorMessage(error, "Failed to delete the attempt. Please try again."))

  revalidatePath(`/tests/${testId}`)
}


// ─── Clear All Attempts ────────────────────────────────────────────────────────
// Hard-deletes ALL attempts for a test. Useful when reusing a test for a new cohort.

export async function clearAllAttemptsAction(testId: string): Promise<void> {
  await requireAuth()
  await assertOwner(testId)
  const supabase = await createClient()

  const { error } = await (supabase as any)
    .from("test_attempts")
    .delete()
    .eq("test_id", testId)

  if (error) throw new Error(getFriendlyErrorMessage(error, "Failed to clear attempts. Please try again."))

  revalidatePath(`/tests/${testId}`)
}

// ─── Fetch All Attempts for Export ────────────────────────────────────────────

export async function fetchAllTestAttemptsForExportAction(testId: string) {
  await requireAuth()
  await assertOwner(testId)
  const supabase = await createClient()

  const { data, error } = await (supabase as any)
    .from("test_attempts")
    .select(
      "id, tab_switch_count, status, score, total_marks, percentage, active_time_taken, total_time_taken, started_at, submitted_at, profile:profiles!candidate_id(full_name, email, candidate_academic_details(passout_year, course:institute_courses(course_name)))"
    )
    .eq("test_id", testId)
    .not("started_at", "is", null)
    .order("started_at", { ascending: false })

  if (error) {
    throw new Error(getFriendlyErrorMessage(error, "Failed to fetch attempts for export. Please try again."))
  }

  // Format exactly like mapAttemptRow in page.tsx
  return (data || []).map((a: any) => {
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
      status: a.status,
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
  })
}

// ─── Fetch Paginated Attempts (with Server Filtering & Sorting) ─────────────────

export interface FetchAttemptsParams {
  search?: string
  statusFilter?: "all" | "submitted" | "in_progress"
  scoreFilter?: "all" | "high" | "mid" | "low"
  sortCol?: string
  sortDir?: "asc" | "desc"
  page?: number
  pageSize?: number
}

export async function fetchTestAttemptsAction(
  testId: string,
  params: FetchAttemptsParams
): Promise<{ data: any[]; count: number; error?: string }> {
  try {
    await requireAuth()
    await assertOwner(testId)
    const supabase = await createClient()

    const page = params.page ?? 0
    const pageSize = params.pageSize ?? 20
    const from = page * pageSize
    const to = from + pageSize - 1

    let q = (supabase as any)
      .from("test_attempts")
      .select(
        "id, tab_switch_count, status, score, total_marks, percentage, active_time_taken, total_time_taken, started_at, submitted_at, profile:profiles!candidate_id(full_name, email, candidate_academic_details(passout_year, course:institute_courses(course_name)))",
        { count: "exact" }
      )
      .eq("test_id", testId)
      .not("started_at", "is", null)

    // Status filter
    if (params.statusFilter === "submitted") {
      q = q.in("status", ["submitted", "auto_submitted"])
    } else if (params.statusFilter === "in_progress") {
      q = q.eq("status", "in_progress")
    }

    // Score filter
    if (params.scoreFilter === "high") q = q.gte("percentage", 75)
    else if (params.scoreFilter === "mid") q = q.gte("percentage", 50).lt("percentage", 75)
    else if (params.scoreFilter === "low") q = q.lt("percentage", 50)

    // Sort
    const sortColMap: Record<string, string> = {
      status: "status",
      score: "percentage",
      time: "active_time_taken",
      total_time: "total_time_taken",
      violations: "tab_switch_count",
      started: "started_at",
      submitted: "submitted_at",
    }
    const dbCol = (params.sortCol && sortColMap[params.sortCol]) || "started_at"
    const isAsc = params.sortDir === "asc"
    q = q.order(dbCol, { ascending: isAsc, nullsFirst: isAsc })
    if (dbCol !== "started_at") {
      q = q.order("started_at", { ascending: false })
    }
    q = q.order("id", { ascending: true })

    q = q.range(from, to)

    const { data, count, error } = await q

    if (error) {
      console.error("[fetchTestAttemptsAction] query error:", error)
      return { data: [], count: 0, error: error.message }
    }

    let mapped = (data || []).map((a: any) => {
      const cad = Array.isArray(a.profile?.candidate_academic_details)
        ? a.profile?.candidate_academic_details[0]
        : a.profile?.candidate_academic_details
      const courseName = Array.isArray(cad?.course)
        ? cad?.course[0]?.course_name
        : cad?.course?.course_name

      return {
        id: a.id,
        student_name: a.profile?.full_name ?? "Unknown",
        student_email: a.profile?.email ?? "Unknown",
        status: a.status,
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
    })

    if (params.search && params.search.trim()) {
      const s = params.search.trim().toLowerCase()
      mapped = mapped.filter(
        (r: any) =>
          (r.student_name && r.student_name.toLowerCase().includes(s)) ||
          (r.student_email && r.student_email.toLowerCase().includes(s)) ||
          (r.branch && r.branch.toLowerCase().includes(s))
      )
    }

    return { data: mapped, count: count ?? mapped.length }
  } catch (err: any) {
    console.error("[fetchTestAttemptsAction] catch error:", err)
    return { data: [], count: 0, error: err.message }
  }
}