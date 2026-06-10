// ─────────────────────────────────────────────────────────────────────────────
// app/postings/page.tsx
// Server Component — fetches job postings for the recruiter
// ─────────────────────────────────────────────────────────────────────────────

import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { getUserProfile } from "@/lib/supabase/profile"
import { PostingsClient } from "./PostingsClient"
import type { JobPosting } from "./_types"

export default async function PostingsPage() {
  const profile = await getUserProfile()
  if (!profile) redirect("/auth/login")

  // Only recruiters should access this page
  if (profile.account_type !== "recruiter") {
    redirect("/home")
  }

  const supabase = await createClient()

  const { data, error } = await (supabase as any)
    .from("job_postings")
    .select("*")
    .eq("recruiter_id", profile.id)
    .order("created_at", { ascending: false })

  const postings: JobPosting[] = (data ?? []).map((row: any) => ({
    id: row.id,
    title: row.title,
    description: row.description,
    requirements: row.requirements,
    job_type: row.job_type,
    work_mode: row.work_mode,
    location: row.location,
    salary_min: row.salary_min,
    salary_max: row.salary_max,
    salary_currency: row.salary_currency ?? "INR",
    skills: row.skills ?? [],
    application_deadline: row.application_deadline,
    application_count: row.application_count ?? 0,
    status: row.status,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }))

  return <PostingsClient postings={postings} />
}
