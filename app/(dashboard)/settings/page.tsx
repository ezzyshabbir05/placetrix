import { createClient } from "@/lib/supabase/server"
import { getUserProfile } from "@/lib/supabase/profile"
import { redirect } from "next/navigation"
import { CandidateSettingsClient } from "./CandidateSettingsClient"
import { InstituteSettingsClient } from "./InstituteSettingsClient"
import { AdminSettingsClient } from "./AdminSettingsClient"
import { StaffSettingsClient } from "./StaffSettingsClient"

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

  if (profile.account_type === "institute_candidate") {
    return (
      <CandidateSettingsClient
        userProfile={profile}
        initialData={profile}
      />
    )
  }

  if (profile.account_type === "institute_staff" || profile.account_type === "institute_placement_officer") {
    return <StaffSettingsClient userProfile={profile} />
  }

  if (profile.account_type === "institute_primary") {

    // Primary institute view
    const instituteId = profile.institute_id
    let instituteProfile = null
    if (instituteId) {
      const { data } = await (supabase as any)
        .from("institutes")
        .select("*")
        .eq("id", instituteId)
        .maybeSingle()
      instituteProfile = data
    }

    return (
      <InstituteSettingsClient
        userProfile={profile}
        initialData={instituteProfile ?? null}
      />
    )
  }

  redirect("/home")
}

