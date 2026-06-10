"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { getUserProfile as getUser } from "@/lib/supabase/profile"
import type { JobApplicationStatus } from "./_types"

export async function updateApplicationStatusAction(applicationId: string, postingId: string, status: JobApplicationStatus) {
  const profile = await getUser()
  if (!profile || profile.account_type !== "recruiter") {
    throw new Error("Unauthorized")
  }

  const supabase = await createClient()

  // Update status (RLS ensures they own the job posting associated with this application)
  const { error } = await (supabase as any)
    .from("job_applications")
    .update({ status })
    .eq("id", applicationId)

  if (error) {
    console.error("Error updating application status:", error)
    throw new Error("Failed to update status")
  }

  revalidatePath(`/postings/${postingId}/applications`)
}
