"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { getUserProfile } from "@/lib/supabase/profile"

// Type interfaces for admin operations
export interface AdminModuleInput {
  id?: string
  title: string
  description?: string
  duration?: string
  type: string
  content?: string
}

export interface AdminCourseInput {
  title: string
  description: string
  level: string
  duration: string
  type: string
  badge?: string | null
  cover_image_path?: string | null
  instructor_id?: string | null
  is_published: boolean
}

/**
 * Ensures the user is authorized as an Admin.
 */
async function requireAdmin() {
  const profile = await getUserProfile()
  if (!profile || profile.account_type !== "admin") {
    throw new Error("Unauthorized: Only admins can perform this action.")
  }
  return profile
}

/**
 * Creates a new course and inserts its topic-wise modules.
 */
export async function createCourseAction(
  courseData: AdminCourseInput,
  modules: AdminModuleInput[]
) {
  const admin = await requireAdmin()
  const supabase = await createClient()

  // 1. Insert course
  const { data: course, error: courseError } = await (supabase as any)
    .from("courses")
    .insert({
      ...courseData,
      created_by: admin.id,
      instructor_id: admin.id,
      updated_at: new Date().toISOString(),
    })
    .select("id")
    .single()

  if (courseError || !course) {
    console.error("Error creating course:", courseError)
    throw new Error(courseError?.message || "Failed to create course.")
  }

  // 2. Insert modules if any exist
  if (modules && modules.length > 0) {
    const modulesToInsert = modules.map((mod, index) => ({
      course_id: course.id,
      title: mod.title,
      description: mod.description || null,
      duration: mod.duration || null,
      type: mod.type || "text",
      content: mod.content || null,
      order_index: index,
      updated_at: new Date().toISOString(),
    }))

    const { error: modulesError } = await (supabase as any)
      .from("course_modules")
      .insert(modulesToInsert)

    if (modulesError) {
      console.error("Error creating course modules:", modulesError)
      // Delete the course we just created to keep DB clean
      await (supabase as any).from("courses").delete().eq("id", course.id)
      throw new Error(modulesError.message || "Failed to create course modules.")
    }
  }

  revalidatePath("/courses")
  return { success: true, courseId: course.id }
}

/**
 * Updates an existing course and re-syncs its modules.
 */
export async function updateCourseAction(
  courseId: string,
  courseData: AdminCourseInput,
  modules: AdminModuleInput[]
) {
  await requireAdmin()
  const supabase = await createClient()

  // 1. Update course
  const { error: courseError } = await (supabase as any)
    .from("courses")
    .update({
      ...courseData,
      updated_at: new Date().toISOString(),
    })
    .eq("id", courseId)

  if (courseError) {
    console.error("Error updating course:", courseError)
    throw new Error(courseError.message || "Failed to update course.")
  }

  // 2. Re-sync modules: delete existing and insert new
  const { error: deleteError } = await (supabase as any)
    .from("course_modules")
    .delete()
    .eq("course_id", courseId)

  if (deleteError) {
    console.error("Error clearing existing course modules:", deleteError)
    throw new Error(deleteError.message || "Failed to update course modules (clear phase).")
  }

  if (modules && modules.length > 0) {
    const modulesToInsert = modules.map((mod, index) => ({
      course_id: courseId,
      title: mod.title,
      description: mod.description || null,
      duration: mod.duration || null,
      type: mod.type || "text",
      content: mod.content || null,
      order_index: index,
      updated_at: new Date().toISOString(),
    }))

    const { error: modulesError } = await (supabase as any)
      .from("course_modules")
      .insert(modulesToInsert)

    if (modulesError) {
      console.error("Error updating course modules:", modulesError)
      throw new Error(modulesError.message || "Failed to update course modules (insert phase).")
    }
  }

  revalidatePath(`/courses/${courseId}`)
  revalidatePath("/courses")
  return { success: true }
}

/**
 * Deletes a course (modules are deleted automatically via CASCADE in DB schema).
 */
export async function deleteCourseAction(courseId: string) {
  await requireAdmin()
  const supabase = await createClient()

  const { error } = await (supabase as any)
    .from("courses")
    .delete()
    .eq("id", courseId)

  if (error) {
    console.error("Error deleting course:", error)
    throw new Error(error.message || "Failed to delete course.")
  }

  revalidatePath("/courses")
  return { success: true }
}

// ─── Candidate Actions ─────────────────────────────────────────────────────────

/**
 * Enrolls a candidate in a course.
 */
export async function enrollInCourseAction(courseId: string) {
  const profile = await getUserProfile()
  if (!profile) throw new Error("Unauthorized: Please log in to enroll.")
  if (profile.account_type !== "candidate") {
    throw new Error("Only candidates can enroll in courses.")
  }

  const supabase = await createClient()

  const { error } = await (supabase as any)
    .from("course_enrollments")
    .insert({
      course_id: courseId,
      user_id: profile.id,
      enrolled_at: new Date().toISOString(),
    })

  if (error) {
    console.error("Error enrolling in course:", error)
    throw new Error(error.message || "Failed to enroll in course.")
  }

  revalidatePath(`/courses/${courseId}`)
  revalidatePath("/courses")
  return { success: true }
}

/**
 * Toggles a candidate's module completion status.
 * If 100% modules are completed, automatically issues a certificate.
 */
export async function toggleModuleCompletionAction(
  courseId: string,
  moduleId: string,
  completed: boolean
) {
  const profile = await getUserProfile()
  if (!profile) throw new Error("Unauthorized: Please log in.")

  const supabase = await createClient()

  // 1. Check enrollment (unless admin)
  if (profile.account_type !== "admin") {
    const { data: enrollment } = await (supabase as any)
      .from("course_enrollments")
      .select("id")
      .eq("course_id", courseId)
      .eq("user_id", profile.id)
      .maybeSingle()

    if (!enrollment) {
      throw new Error("You must be enrolled in the course to complete modules.")
    }
  }

  // 2. Upsert completion status
  const completedAt = completed ? new Date().toISOString() : null

  const { error: upsertError } = await (supabase as any)
    .from("course_module_progress")
    .upsert({
      user_id: profile.id,
      course_id: courseId,
      module_id: moduleId,
      completed,
      completed_at: completedAt,
    }, {
      onConflict: "user_id,module_id"
    })

  if (upsertError) {
    console.error("Error updating module completion progress:", upsertError)
    throw new Error(upsertError.message || "Failed to save module progress.")
  }

  revalidatePath(`/courses/${courseId}`)
  revalidatePath(`/courses/${courseId}/module/${moduleId}`)
  revalidatePath("/courses")
  return { success: true }
}

/**
 * Manually generates a certificate for a candidate if they have completed 100% of the course modules.
 */
export async function generateCertificateAction(courseId: string) {
  const profile = await getUserProfile()
  if (!profile) throw new Error("Unauthorized: Please log in.")

  const supabase = await createClient()

  // 1. Verify 100% completion
  // A. Count total modules
  const { count: totalModules } = await (supabase as any)
    .from("course_modules")
    .select("id", { count: "exact", head: true })
    .eq("course_id", courseId)

  // B. Count completed modules
  const { count: completedModules } = await (supabase as any)
    .from("course_module_progress")
    .select("id", { count: "exact", head: true })
    .eq("course_id", courseId)
    .eq("user_id", profile.id)
    .eq("completed", true)

  if (!totalModules || !completedModules || totalModules !== completedModules) {
    throw new Error("You must complete all modules before generating a certificate.")
  }

  // 2. Issue certificate if not already issued
  const { data: existingCert } = await (supabase as any)
    .from("course_certificates")
    .select("id")
    .eq("course_id", courseId)
    .eq("user_id", profile.id)
    .maybeSingle()

  if (existingCert) {
    return { success: true, certificateId: existingCert.id }
  }

  const { data: newCert, error: certError } = await (supabase as any)
    .from("course_certificates")
    .insert({
      course_id: courseId,
      user_id: profile.id,
      issued_to_name: profile.display_name || "Candidate",
      issued_at: new Date().toISOString(),
    })
    .select("id")
    .single()

  if (certError || !newCert) {
    console.error("Error generating completion certificate:", certError)
    throw new Error(certError?.message || "Failed to generate certificate.")
  }

  revalidatePath(`/courses/${courseId}`)
  revalidatePath("/courses")
  return { success: true, certificateId: newCert.id }
}

