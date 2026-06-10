"use server"

// ─────────────────────────────────────────────────────────────────────────────
// app/postings/actions.ts
// Server Actions for Job Postings CRUD
// ─────────────────────────────────────────────────────────────────────────────

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import type { JobPostingForm, JobPostingStatus } from "./_types"

// ─── Guard ────────────────────────────────────────────────────────────────────

async function requireAuth(): Promise<string> {
  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()
  const user = data?.claims
  if (!user) throw new Error("Not authenticated")
  return user.sub as string
}

async function assertPostingOwner(postingId: string): Promise<string> {
  const userId = await requireAuth()
  const supabase = await createClient()

  const { data, error } = await (supabase as any)
    .from("job_postings")
    .select("recruiter_id")
    .eq("id", postingId)
    .single()

  const postingData = data as any;
  if (error || !postingData) throw new Error("Posting not found")
  if (postingData.recruiter_id !== userId) throw new Error("Forbidden")
  return userId
}

// ─── Create ───────────────────────────────────────────────────────────────────

export async function createPostingAction(
  form: JobPostingForm
): Promise<{ id: string }> {
  const userId = await requireAuth()
  const supabase = await createClient()

  if (!form.title.trim()) throw new Error("Title is required")

  const { data, error } = await (supabase as any)
    .from("job_postings")
    .insert({
      recruiter_id: userId,
      title: form.title.trim(),
      description: form.description.trim() || null,
      requirements: form.requirements.trim() || null,
      job_type: form.job_type,
      work_mode: form.work_mode,
      location: form.location.trim() || null,
      salary_min: form.salary_min ? parseInt(form.salary_min, 10) : null,
      salary_max: form.salary_max ? parseInt(form.salary_max, 10) : null,
      skills: form.skills.filter(Boolean),
      application_deadline: form.application_deadline || null,
      status: form.status,
    })
    .select("id")
    .single()

  const newPosting = data as any;
  if (error) throw new Error("Failed to create posting: " + error.message)
  revalidatePath("/postings")
  return { id: newPosting.id }
}

// ─── Update ───────────────────────────────────────────────────────────────────

export async function updatePostingAction(
  postingId: string,
  form: JobPostingForm
): Promise<void> {
  await requireAuth()
  await assertPostingOwner(postingId)
  const supabase = await createClient()

  if (!form.title.trim()) throw new Error("Title is required")

  const { error } = await (supabase as any)
    .from("job_postings")
    .update({
      title: form.title.trim(),
      description: form.description.trim() || null,
      requirements: form.requirements.trim() || null,
      job_type: form.job_type,
      work_mode: form.work_mode,
      location: form.location.trim() || null,
      salary_min: form.salary_min ? parseInt(form.salary_min, 10) : null,
      salary_max: form.salary_max ? parseInt(form.salary_max, 10) : null,
      skills: form.skills.filter(Boolean),
      application_deadline: form.application_deadline || null,
      status: form.status,
    })
    .eq("id", postingId)

  if (error) throw new Error("Failed to update posting: " + error.message)
  revalidatePath("/postings")
}

// ─── Toggle Status ────────────────────────────────────────────────────────────

export async function togglePostingStatusAction(
  postingId: string,
  newStatus: JobPostingStatus
): Promise<void> {
  await requireAuth()
  await assertPostingOwner(postingId)
  const supabase = await createClient()

  const { error } = await (supabase as any)
    .from("job_postings")
    .update({ status: newStatus })
    .eq("id", postingId)

  if (error) throw new Error("Failed to update status: " + error.message)
  revalidatePath("/postings")
}

// ─── Delete ───────────────────────────────────────────────────────────────────

export async function deletePostingAction(postingId: string): Promise<void> {
  await requireAuth()
  await assertPostingOwner(postingId)
  const supabase = await createClient()

  const { error } = await (supabase as any)
    .from("job_postings")
    .delete()
    .eq("id", postingId)

  if (error) throw new Error("Failed to delete posting: " + error.message)
  revalidatePath("/postings")
}
