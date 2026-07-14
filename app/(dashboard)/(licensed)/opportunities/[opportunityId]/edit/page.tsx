// app/(dashboard)/(licensed)/opportunities/[opportunityId]/edit/page.tsx
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { getUserProfile } from "@/lib/supabase/profile"
import { OpportunityEditorClient } from "../../OpportunityEditorClient"
import { getCohortOptionsAction } from "@/app/(dashboard)/(licensed)/cohorts/actions"

interface PageProps {
  params: Promise<{
    opportunityId: string
  }>
}

export default async function EditOpportunityPage(props: PageProps) {
  const { opportunityId } = await props.params
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

  const [{ data: opp, error: oppErr }, { data: companies }, cohortOptions, { data: cohortRows }] =
    await Promise.all([
      (supabase as any)
        .from("opportunities")
        .select("*, company:companies(*)")
        .eq("id", opportunityId)
        .eq("institute_id", instituteId)
        .maybeSingle(),
      (supabase as any)
        .from("companies")
        .select("*")
        .eq("institute_id", instituteId)
        .order("name"),
      getCohortOptionsAction(),
      (supabase as any)
        .from("opportunity_cohorts")
        .select("cohort_id")
        .eq("opportunity_id", opportunityId),
    ])

  if (oppErr || !opp) {
    return (
      <div className="p-8 text-center text-red-500">
        Opportunity not found.
      </div>
    )
  }

  const initialCohortIds = (cohortRows ?? []).map((r: any) => r.cohort_id)

  return (
    <OpportunityEditorClient 
      opportunity={opp}
      companies={companies || []}
      cohortOptions={cohortOptions}
      initialCohortIds={initialCohortIds}
    />
  )
}
