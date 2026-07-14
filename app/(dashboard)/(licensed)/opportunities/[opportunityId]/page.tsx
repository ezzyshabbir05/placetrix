// app/(dashboard)/(licensed)/opportunities/[opportunityId]/page.tsx
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { getUserProfile } from "@/lib/supabase/profile"
import { CandidateOpportunityDetailClient } from "./CandidateOpportunityDetailClient"
import { InstituteOpportunityDetailClient } from "./InstituteOpportunityDetailClient"
import type { OpportunityListItem, OpportunityApplication } from "../types"

interface PageProps {
  params: Promise<{
    opportunityId: string
  }>
}

export default async function OpportunityDetailPage(props: PageProps) {
  const { opportunityId } = await props.params
  const profile = await getUserProfile()
  if (!profile) redirect("/auth/login")

  const allowedRoles = ["institute_candidate", "institute_placement_officer", "institute_primary"]
  if (!allowedRoles.includes(profile.account_type)) {
    redirect("/home")
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

  // Fetch opportunity joining company profile
  const { data: opp, error: oppErr } = await (supabase as any)
    .from("opportunities")
    .select("*, company:companies(*)")
    .eq("id", opportunityId)
    .eq("institute_id", instituteId)
    .maybeSingle()

  if (oppErr || !opp) {
    return (
      <div className="p-8 text-center text-red-500">
        Opportunity not found.
      </div>
    )
  }

  // ─── Staff View ───────────────────────────────────────────────────────────
  if (profile.account_type !== "institute_candidate") {

    // Fetch applications with candidate profiles
    const { data: apps } = await (supabase as any)
      .from("opportunity_applications")
      .select(`
        *,
        profiles(
          id,
          full_name,
          email,
          phone_number,
          candidate_academic_details(
            passout_year,
            course:institute_courses(course_name)
          ),
          candidate_semester_grades(sgpa)
        )
      `)
      .eq("opportunity_id", opportunityId)

    const mappedApps: OpportunityApplication[] = []

    for (const app of apps || []) {
      const p = app.profiles
      const cad = Array.isArray(p?.candidate_academic_details)
        ? p.candidate_academic_details[0]
        : p?.candidate_academic_details
      const course = Array.isArray(cad?.course)
        ? cad?.course[0]
        : cad?.course

      const grades = p?.candidate_semester_grades || []
      const sgpas = grades.map((g: any) => parseFloat(g.sgpa)).filter((v: number) => !isNaN(v))
      const cgpa = sgpas.length > 0 ? sgpas.reduce((acc: number, v: number) => acc + v, 0) / sgpas.length : null

      mappedApps.push({
        id: app.id,
        opportunity_id: app.opportunity_id,
        candidate_id: app.candidate_id,
        resume_url: app.resume_url,
        status: app.status,
        created_at: app.created_at,
        updated_at: app.updated_at,
        candidate_name: p?.full_name || "Unknown Candidate",
        candidate_email: p?.email || "",
        candidate_phone: p?.phone_number || null,
        candidate_course: course?.course_name || null,
        candidate_passout_year: cad?.passout_year || null,
        candidate_cgpa: cgpa
      })
    }

    const mappedOpp: OpportunityListItem = {
      ...opp,
      applications_count: mappedApps.length
    }

    return (
      <InstituteOpportunityDetailClient
        opportunity={mappedOpp}
        applications={mappedApps}
      />
    )
  }

  // ─── Candidate View ───────────────────────────────────────────────────────
  // Fetch candidate grades to compute current CGPA
  const { data: gradesRow } = await (supabase as any)
    .from("candidate_semester_grades")
    .select("sgpa")
    .eq("profile_id", profile.id)

  const sgpas = (gradesRow || []).map((g: any) => parseFloat(g.sgpa)).filter((v: number) => !isNaN(v))
  const candidateCgpa = sgpas.length > 0 ? sgpas.reduce((acc: number, v: number) => acc + v, 0) / sgpas.length : null

  const candidateAcademic = {
    cgpa: candidateCgpa
  }

  // Fetch applicant's application details if they already applied
  const { data: appData } = await (supabase as any)
    .from("opportunity_applications")
    .select("id, status, resume_url")
    .eq("candidate_id", profile.id)
    .eq("opportunity_id", opportunityId)
    .maybeSingle()

  const mappedOpp = {
    ...opp,
    my_application_id: appData?.id || null,
    my_application_status: appData?.status || null,
    my_application_resume_url: appData?.resume_url || null
  }

  return (
    <CandidateOpportunityDetailClient
      opp={mappedOpp}
      candidateAcademic={candidateAcademic}
      profileId={profile.id}
    />
  )
}
