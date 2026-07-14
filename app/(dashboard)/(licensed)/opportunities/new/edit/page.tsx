// app/(dashboard)/(licensed)/opportunities/new/edit/page.tsx
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { getUserProfile } from "@/lib/supabase/profile"
import { OpportunityEditorClient } from "../../OpportunityEditorClient"
import { getCohortOptionsAction } from "@/app/(dashboard)/(licensed)/cohorts/actions"

export default async function NewOpportunityPage() {
  const profile = await getUserProfile()
  if (!profile) redirect("/auth/login")

  // Verify staff/placement officer role
  if (!["institute_primary", "institute_placement_officer"].includes(profile.account_type)) {
    redirect("/opportunities")
  }

  const instituteId = profile.institute_id
  if (!instituteId) {
    return (
      <div className="p-8 text-center text-red-500">
        Error: No institute associated with your account.
      </div>
    )
  }

  const supabase = await createClient()
  const [cohortOptions, { data: companies }] = await Promise.all([
    getCohortOptionsAction(),
    (supabase as any)
      .from("companies")
      .select("*")
      .eq("institute_id", instituteId)
      .order("name"),
  ])

  return (
    <OpportunityEditorClient 
      companies={companies || []}
      cohortOptions={cohortOptions}
    />
  )
}
