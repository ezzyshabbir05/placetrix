"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { getUserProfile as getUser } from "@/lib/supabase/profile"

export async function applyForJobAction(jobId: string, coverLetter?: string) {
  const profile = await getUser()
  if (!profile) throw new Error("Unauthorized")

  if (profile.account_type !== "candidate") {
    throw new Error("Only candidates can apply for jobs")
  }

  const supabase = await createClient()

  // Note: Due to RLS and UNIQUE constraint, if the user already applied, 
  // Supabase will throw a unique constraint error which we can catch.
  const { error } = await supabase
    // @ts-ignore
    .from("job_applications" as any)
    .insert({
      job_id: jobId,
      candidate_id: profile.id,
      cover_letter: coverLetter || null,
      status: "applied"
    })

  if (error) {
    if (error.code === "23505") {
      throw new Error("You have already applied for this job.")
    }
    console.error("Error applying for job:", error)
    throw new Error("Failed to submit application. Please try again.")
  }

  // Revalidate so the application count updates and UI reflects the "applied" state
  revalidatePath("/~/jobs")
}
