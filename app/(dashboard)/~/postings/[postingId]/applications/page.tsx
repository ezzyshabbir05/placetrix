import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { getUserProfile } from "@/lib/supabase/profile"
import { ApplicationsClient } from "./ApplicationsClient"
import type { ApplicationDetails } from "./_types"

export default async function ApplicationsPage({ params }: { params: Promise<{ postingId: string }> }) {
  const { postingId } = await params
  const profile = await getUserProfile()
  if (!profile || profile.account_type !== "recruiter") {
    redirect("/~/home")
  }

  const supabase = await createClient()

  // First, verify they own this posting
  // @ts-ignore
  const { data: posting, error: postingError } = await supabase
    .from("job_postings" as any)
    .select("title, recruiter_id")
    .eq("id", postingId)
    .single()

  const postingData = posting as any;
  if (postingError || !postingData || postingData.recruiter_id !== profile.id) {
    redirect("/~/postings")
  }

  // Fetch applications
  // @ts-ignore
  const { data: apps, error: appsError } = await supabase
    .from("job_applications" as any)
    .select(`
      *,
      profiles!inner (
        display_name,
        email
      )
    `)
    .eq("job_id", postingId)
    .order("created_at", { ascending: false })

  if (appsError) {
    console.error("Error fetching applications:", appsError)
  }

  const applications: ApplicationDetails[] = (apps ?? []).map((row: any) => ({
    id: row.id,
    job_id: row.job_id,
    candidate_id: row.candidate_id,
    status: row.status,
    resume_url: row.resume_url,
    cover_letter: row.cover_letter,
    created_at: row.created_at,
    updated_at: row.updated_at,
    candidate_name: row.profiles?.display_name ?? "Unknown Candidate",
    candidate_email: row.profiles?.email ?? "No email provided",
  }))

  return <ApplicationsClient applications={applications} postingId={postingId} jobTitle={postingData.title} />
}
