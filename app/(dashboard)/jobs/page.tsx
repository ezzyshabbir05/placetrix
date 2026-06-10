import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { getUserProfile } from "@/lib/supabase/profile"
import { JobsClient } from "./JobsClient"
import type { CandidateJobPosting } from "./_types"

export default async function JobsPage() {
  const profile = await getUserProfile()
  if (!profile) redirect("/auth/login")

  if (profile.account_type !== "candidate") {
    redirect("/home")
  }

  const supabase = await createClient()

  const { data: jobsData, error: jobsError } = await (supabase as any)
    .from("job_postings")
    .select(`
      *,
      profiles!inner (
        recruiter_profiles (
          company_name,
          industry,
          company_logo_path
        )
      )
    `)
    .eq("status", "active")
    .order("created_at", { ascending: false })

  if (jobsError) {
    console.error("Error fetching jobs:", jobsError)
  }

  const { data: applicationsData } = await (supabase as any)
    .from("job_applications")
    .select("job_id")
    .eq("candidate_id", profile.id)

  const appliedJobIds = new Set<string>((applicationsData ?? []).map((a: any) => a.job_id as string))

  const jobs: CandidateJobPosting[] = (jobsData ?? []).map((row: any) => {
    const rpArray = row.profiles?.recruiter_profiles
    const rp = Array.isArray(rpArray) ? rpArray[0] : rpArray

    return {
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
      created_at: row.created_at,
      company_name: rp?.company_name ?? "Unknown Company",
      industry: rp?.industry,
      company_logo_path: rp?.company_logo_path,
    }
  })

  return <JobsClient jobs={jobs} appliedJobIds={Array.from(appliedJobIds)} />
}