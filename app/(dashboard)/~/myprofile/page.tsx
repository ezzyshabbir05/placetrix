import { createClient } from "@/lib/supabase/server"
import { getUserProfile } from "@/lib/supabase/profile"
import { redirect } from "next/navigation"
import { decryptString, maskAadhaar } from "@/lib/encryption"
import { CandidateProfileClient } from "./CandidateProfileClient"
import { InstituteProfileClient } from "./InstituteProfileClient"
import { RecruiterProfileClient } from "./RecruiterProfileClient"
import { AdminProfileClient } from "./AdminProfileClient"

export default async function MyProfilePage() {
  const profile = await getUserProfile()
  if (!profile) return null

  const supabase = await createClient()

  if (profile.account_type === "admin") {
    return (
      <AdminProfileClient
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

    if (candidateProfile?.aadhaar_number) {
      try {
        const decrypted = decryptString(candidateProfile.aadhaar_number);
        candidateProfile.aadhaar_number = maskAadhaar(decrypted);
      } catch (err) {
        console.error("Failed to decrypt Aadhaar number for profile", profile.id);
        candidateProfile.aadhaar_number = maskAadhaar(candidateProfile.aadhaar_number);
      }
    }

    return (
      <CandidateProfileClient
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
      <InstituteProfileClient
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
      <RecruiterProfileClient
        userProfile={profile}
        initialData={recruiterProfile ?? null}
      />
    )
  }

  redirect("/~/home")
}

