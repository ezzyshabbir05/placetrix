// app/(dashboard)/(licensed)/cohorts/actions.ts
"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { getUserProfile } from "@/lib/supabase/profile"
import type { Cohort, CohortMember, CohortOption } from "./types"

// ─── Auth Helper ──────────────────────────────────────────────────────────────

async function requireCohortManager() {
  const profile = await getUserProfile()
  if (!profile) throw new Error("Unauthorized: Please log in.")
  if (
    !["institute_primary", "institute_staff", "institute_placement_officer"].includes(
      profile.account_type
    )
  ) {
    throw new Error("Unauthorized: Only institute staff can manage cohorts.")
  }
  if (!profile.institute_id) throw new Error("No institute associated with your profile.")
  return profile
}

// ─── Cohort CRUD ──────────────────────────────────────────────────────────────

export async function getCohortsAction(): Promise<Cohort[]> {
  const profile = await requireCohortManager()
  const supabase = await createClient()

  const { data, error } = await (supabase as any)
    .from("cohorts")
    .select(`id, institute_id, name, description, created_at, updated_at, cohort_students(count)`)
    .eq("institute_id", profile.institute_id)
    .order("created_at", { ascending: true })

  if (error) {
    console.error("Error fetching cohorts:", error)
    return []
  }

  return (data ?? []).map((c: any) => ({
    id: c.id,
    institute_id: c.institute_id,
    name: c.name,
    description: c.description,
    created_at: c.created_at,
    updated_at: c.updated_at,
    student_count: c.cohort_students?.[0]?.count ?? 0,
  }))
}

export async function getCohortOptionsAction(): Promise<CohortOption[]> {
  const profile = await requireCohortManager()
  const supabase = await createClient()

  const { data, error } = await (supabase as any)
    .from("cohorts")
    .select(`id, name, cohort_students(count)`)
    .eq("institute_id", profile.institute_id)
    .order("name", { ascending: true })

  if (error) {
    console.error("Error fetching cohort options:", error)
    return []
  }

  return (data ?? []).map((c: any) => ({
    id: c.id,
    name: c.name,
    student_count: c.cohort_students?.[0]?.count ?? 0,
  }))
}

export async function createCohortAction(data: {
  name: string
  description?: string
}): Promise<{ success: boolean; cohortId?: string }> {
  const profile = await requireCohortManager()
  const supabase = await createClient()

  if (!data.name?.trim()) throw new Error("Cohort name is required.")

  const { data: cohort, error } = await (supabase as any)
    .from("cohorts")
    .insert({
      institute_id: profile.institute_id,
      name: data.name.trim(),
      description: data.description?.trim() || null,
    })
    .select("id")
    .maybeSingle()

  if (error) {
    if (error.code === "23505") throw new Error("A cohort with this name already exists.")
    console.error("Error creating cohort:", error)
    throw new Error(error.message || "Failed to create cohort.")
  }

  revalidatePath("/cohorts")
  return { success: true, cohortId: cohort.id }
}

export async function updateCohortAction(
  cohortId: string,
  data: { name: string; description?: string }
): Promise<{ success: boolean }> {
  const profile = await requireCohortManager()
  const supabase = await createClient()

  if (!data.name?.trim()) throw new Error("Cohort name is required.")

  // Verify this cohort belongs to this institute
  const { data: existing } = await (supabase as any)
    .from("cohorts")
    .select("institute_id")
    .eq("id", cohortId)
    .maybeSingle()

  if (!existing || existing.institute_id !== profile.institute_id) {
    throw new Error("Cohort not found or access denied.")
  }

  const { error } = await (supabase as any)
    .from("cohorts")
    .update({
      name: data.name.trim(),
      description: data.description?.trim() || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", cohortId)

  if (error) {
    if (error.code === "23505") throw new Error("A cohort with this name already exists.")
    console.error("Error updating cohort:", error)
    throw new Error(error.message || "Failed to update cohort.")
  }

  revalidatePath("/cohorts")
  revalidatePath(`/cohorts/${cohortId}`)
  return { success: true }
}

export async function deleteCohortAction(cohortId: string): Promise<{ success: boolean }> {
  const profile = await requireCohortManager()
  const supabase = await createClient()

  // Verify this cohort belongs to this institute
  const { data: existing } = await (supabase as any)
    .from("cohorts")
    .select("institute_id")
    .eq("id", cohortId)
    .maybeSingle()

  if (!existing || existing.institute_id !== profile.institute_id) {
    throw new Error("Cohort not found or access denied.")
  }

  const { error } = await (supabase as any).from("cohorts").delete().eq("id", cohortId)

  if (error) {
    console.error("Error deleting cohort:", error)
    throw new Error(error.message || "Failed to delete cohort.")
  }

  revalidatePath("/cohorts")
  return { success: true }
}

// ─── Member Management ────────────────────────────────────────────────────────

export async function getCohortMembersAction(
  cohortId: string,
  page?: number,
  size?: number,
  search?: string
): Promise<{ members: CohortMember[]; count: number }> {
  const profile = await requireCohortManager()
  const supabase = await createClient()

  // Verify ownership
  const { data: cohort } = await (supabase as any)
    .from("cohorts")
    .select("institute_id")
    .eq("id", cohortId)
    .maybeSingle()

  if (!cohort || cohort.institute_id !== profile.institute_id) {
    return { members: [], count: 0 }
  }

  let query = (supabase as any)
    .from("cohort_students")
    .select(`
      student_id,
      profiles!inner (
        id,
        full_name,
        email,
        avatar_path,
        account_type,
        candidate_academic_details (
          passout_year,
          course:institute_courses ( course_name )
        )
      )
    `, { count: "exact" })
    .eq("cohort_id", cohortId)

  if (search && search.trim()) {
    const s = search.trim()
    query = query.or(`full_name.ilike.%${s}%,email.ilike.%${s}%`, { foreignTable: "profiles" })
  }

  if (page && size) {
    const from = (page - 1) * size
    const to = page * size - 1
    query = query.range(from, to)
  }

  const { data, count, error } = await query

  if (error) {
    console.error("Error fetching cohort members:", error)
    return { members: [], count: 0 }
  }

  const members = (data ?? []).map((row: any) => {
    const p = row.profiles
    const cad = Array.isArray(p?.candidate_academic_details)
      ? p?.candidate_academic_details[0]
      : p?.candidate_academic_details
    const course = Array.isArray(cad?.course) ? cad?.course[0] : cad?.course
    return {
      student_id: row.student_id,
      full_name: p?.full_name || "Unknown",
      email: p?.email || "",
      avatar_path: p?.avatar_path || null,
      account_type: p?.account_type || "institute_candidate",
      course_name: course?.course_name || null,
      passout_year: cad?.passout_year || null,
    }
  })

  return { members, count: count ?? 0 }
}


export async function getInstituteStudentsNotInCohortAction(
  cohortId: string,
  search: string = ""
): Promise<CohortMember[]> {
  const profile = await requireCohortManager()
  const supabase = await createClient()

  // Verify ownership
  const { data: cohort } = await (supabase as any)
    .from("cohorts")
    .select("institute_id")
    .eq("id", cohortId)
    .maybeSingle()

  if (!cohort || cohort.institute_id !== profile.institute_id) {
    throw new Error("Cohort not found or access denied.")
  }

  const { data, error } = await (supabase as any).rpc("get_students_not_in_cohort", {
    p_cohort_id: cohortId,
    p_search: search.trim(),
  })

  if (error) {
    console.error("Error fetching students not in cohort:", error)
    return []
  }

  return (data ?? []).map((row: any) => ({
    student_id: row.student_id,
    full_name: row.full_name || "Unknown",
    email: row.email || "",
    avatar_path: row.avatar_path || null,
    account_type: row.account_type,
    course_name: row.course_name || null,
    passout_year: row.passout_year || null,
  }))
}

export async function addStudentsToCohortAction(
  cohortId: string,
  studentIds: string[]
): Promise<{ success: boolean }> {
  const profile = await requireCohortManager()
  const supabase = await createClient()

  if (!studentIds || studentIds.length === 0) throw new Error("No students selected.")

  // Verify this cohort belongs to this institute
  const { data: cohort } = await (supabase as any)
    .from("cohorts")
    .select("institute_id")
    .eq("id", cohortId)
    .maybeSingle()

  if (!cohort || cohort.institute_id !== profile.institute_id) {
    throw new Error("Cohort not found or access denied.")
  }

  // Verify target students belong to the same institute
  const { data: students, error: studentError } = await (supabase as any)
    .from("profiles")
    .select("id")
    .in("id", studentIds)
    .eq("institute_id", profile.institute_id)

  if (studentError || !students || students.length !== studentIds.length) {
    throw new Error("Some selected students do not belong to your institute.")
  }

  const rows = studentIds.map((id) => ({ cohort_id: cohortId, student_id: id }))

  const { error } = await (supabase as any)
    .from("cohort_students")
    .insert(rows)
    .throwOnError()

  if (error) {
    console.error("Error adding students to cohort:", error)
    throw new Error("Failed to add students to cohort.")
  }

  revalidatePath(`/cohorts/${cohortId}`)
  return { success: true }
}


export async function removeStudentFromCohortAction(
  cohortId: string,
  studentId: string
): Promise<{ success: boolean }> {
  const profile = await requireCohortManager()
  const supabase = await createClient()

  // Verify ownership
  const { data: cohort } = await (supabase as any)
    .from("cohorts")
    .select("institute_id")
    .eq("id", cohortId)
    .maybeSingle()

  if (!cohort || cohort.institute_id !== profile.institute_id) {
    throw new Error("Cohort not found or access denied.")
  }

  const { error } = await (supabase as any)
    .from("cohort_students")
    .delete()
    .eq("cohort_id", cohortId)
    .eq("student_id", studentId)

  if (error) {
    console.error("Error removing student from cohort:", error)
    throw new Error("Failed to remove student.")
  }

  revalidatePath(`/cohorts/${cohortId}`)
  return { success: true }
}

export async function getCandidateCohortsAction(): Promise<Cohort[]> {
  const profile = await getUserProfile()
  if (!profile || profile.account_type !== "institute_candidate") {
    throw new Error("Unauthorized: Only candidates can fetch their cohorts.")
  }
  const supabase = await createClient()

  const { data, error } = await (supabase as any)
    .from("cohort_students")
    .select(`
      cohort_id,
      cohorts (
        id,
        institute_id,
        name,
        description,
        created_at,
        updated_at
      )
    `)
    .eq("student_id", profile.id)

  if (error) {
    console.error("Error fetching candidate cohorts:", error)
    return []
  }

  return (data ?? [])
    .filter((row: any) => row.cohorts !== null)
    .map((row: any) => {
      const c = row.cohorts
      return {
        id: c.id,
        institute_id: c.institute_id,
        name: c.name,
        description: c.description,
        created_at: c.created_at,
        updated_at: c.updated_at,
        student_count: 0,
      }
    })
}
