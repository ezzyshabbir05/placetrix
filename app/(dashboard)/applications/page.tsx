import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { getUserProfile } from "@/lib/supabase/profile"
import { MyApplicationsClient, type MyJobApplication } from "./MyApplicationsClient"

export default async function ApplicationsPage() {
  const profile = await getUserProfile()
  if (!profile) {
    redirect("/auth/login")
  }

  if (profile.account_type === "recruiter") {
    redirect("/postings")
  }

  const supabase = await createClient()

  const { data: apps, error } = await (supabase as any)
    .from("job_applications")
    .select(`
      id,
      status,
      created_at,
      job_postings!inner (
        id,
        title,
        job_type,
        location,
        work_mode,
        profiles!inner (
          recruiter_profiles ( company_name )
        )
      )
    `)
    .eq("candidate_id", profile.id)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("Error fetching my applications:", error)
  }

  const applications: MyJobApplication[] = (apps ?? []).map((row: any) => {
    const jobData = Array.isArray(row.job_postings) ? row.job_postings[0] : row.job_postings

    let companyName = "Unknown Company"
    if (jobData?.profiles) {
      const p = Array.isArray(jobData.profiles) ? jobData.profiles[0] : jobData.profiles
      if (p?.recruiter_profiles) {
        const rp = Array.isArray(p.recruiter_profiles) ? p.recruiter_profiles[0] : p.recruiter_profiles
        companyName = rp?.company_name || "Unknown Company"
      }
    }

    return {
      id: row.id,
      status: row.status,
      created_at: row.created_at,
      job: {
        id: jobData?.id,
        title: jobData?.title,
        job_type: jobData?.job_type,
        location: jobData?.location,
        work_mode: jobData?.work_mode,
        company_name: companyName,
      }
    }
  })

  return <MyApplicationsClient applications={applications} />
}