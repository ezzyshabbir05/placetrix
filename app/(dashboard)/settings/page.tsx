import { createClient } from "@/lib/supabase/server"
import { getUserProfile } from "@/lib/supabase/profile"
import { redirect } from "next/navigation"
import { CandidateSettingsClient } from "./CandidateSettingsClient"
import { InstituteSettingsClient } from "./InstituteSettingsClient"
import { RecruiterSettingsClient } from "./RecruiterSettingsClient"
import { AdminSettingsClient } from "./AdminSettingsClient"

export default async function SettingsPage() {
  const profile = await getUserProfile()
  if (!profile) return null

  const supabase = await createClient()

  if (profile.account_type === "admin") {
    return (
      <AdminSettingsClient
        userProfile={profile}
        initialData={null}
      />
    )
  }

  if (profile.account_type === "candidate") {
    const { data: candidateProfile } = await (supabase as any)
      .from("candidate_profiles")
      .select("*")
      .eq("profile_id", profile.id)
      .maybeSingle() // Fix: prevents throwing if 0 rows exist

    return (
      <CandidateSettingsClient
        userProfile={profile}
        initialData={candidateProfile ?? null}
      />
    )
  }

  if (profile.account_type === "institute") {
    const { data: instituteProfile } = await (supabase as any)
      .from("institute_profiles")
      .select("*")
      .eq("profile_id", profile.id)
      .maybeSingle() // Fix: prevents throwing if 0 rows exist

    return (
      <InstituteSettingsClient
        userProfile={profile}
        initialData={instituteProfile ?? null}
      />
    )
  }

  if (profile.account_type === "recruiter") {
    const { data: recruiterProfile } = await (supabase as any)
      .from("recruiter_profiles")
      .select("*")
      .eq("profile_id", profile.id)
      .maybeSingle()

    return (
      <RecruiterSettingsClient
        userProfile={profile}
        initialData={recruiterProfile ?? null}
      />
    )
  }

  redirect("/home")
}

