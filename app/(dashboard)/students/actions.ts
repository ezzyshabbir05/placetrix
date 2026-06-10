"use server"

import { createClient } from "@/lib/supabase/server"
import { getUserProfile as getUser } from "@/lib/supabase/profile"
import { revalidatePath } from "next/cache"

export async function toggleStudentVerification(studentId: string, verified: boolean) {
  const profile = await getUser()
  if (!profile || profile.account_type !== "institute") {
    throw new Error("Unauthorized")
  }

  const supabase = await createClient()

  const { data, error } = await (supabase as any)
    .from("candidate_profiles")
    .update({ institute_verified: verified })
    .eq("profile_id", studentId)
    .eq("institute_id", profile.id)
    .select()

  if (error) {
    console.error("Supabase Error:", error)
    throw new Error(error.message)
  }

  if (!data || data.length === 0) {
    console.error("No rows updated. StudentId:", studentId, "InstituteId:", profile.id)
    throw new Error("Action failed. Student profile not found or already in sync.")
  }

  revalidatePath("/students")
}
