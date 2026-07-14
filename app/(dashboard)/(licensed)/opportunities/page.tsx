// app/(dashboard)/(licensed)/opportunities/page.tsx
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { getUserProfile } from "@/lib/supabase/profile"
import { OpportunitiesStaffClient } from "./OpportunitiesStaffClient"
import { OpportunitiesCandidateClient } from "./OpportunitiesCandidateClient"
import type { OpportunityListItem, OpportunityApplication } from "./types"

export const metadata = {
  title: "Opportunities",
  description: "Campus Job Openings & Placement Drives",
}

export default async function OpportunitiesPage() {
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

  // ─── Staff / Placement Officer / Admin View ───────────────────────────────
  if (profile.account_type !== "institute_candidate") {

    // Fetch opportunities joining their company profile
    const { data: opps } = await (supabase as any)
      .from("opportunities")
      .select("*, company:companies(*)")
      .eq("institute_id", instituteId)
      .order("created_at", { ascending: false })

    const oppList: OpportunityListItem[] = opps || []
    const oppIds = oppList.map(o => o.id)

    const applicationsMap: Record<string, OpportunityApplication[]> = {}

    if (oppIds.length > 0) {
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
        .in("opportunity_id", oppIds)

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

        const mappedApp: OpportunityApplication = {
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
        }

        if (!applicationsMap[app.opportunity_id]) {
          applicationsMap[app.opportunity_id] = []
        }
        applicationsMap[app.opportunity_id].push(mappedApp)
      }
    }

    // Fetch list of saved companies for dropdown selection
    const { data: companies } = await (supabase as any)
      .from("companies")
      .select("*")
      .eq("institute_id", instituteId)
      .order("name")

    // Map computed applications count
    const oppListWithCount = oppList.map(opp => ({
      ...opp,
      applications_count: applicationsMap[opp.id]?.length || 0
    }))

    return (
      <OpportunitiesStaffClient
        opportunities={oppListWithCount}
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

  // Find which cohorts this candidate belongs to
  const { data: memberRows } = await (supabase as any)
    .from("cohort_students")
    .select("cohort_id")
    .eq("student_id", profile.id)

  const cohortIds = (memberRows ?? []).map((r: any) => r.cohort_id)

  if (cohortIds.length === 0) {
    return (
      <OpportunitiesCandidateClient
        opportunities={[]}
        candidateAcademic={candidateAcademic}
        profileId={profile.id}
      />
    )
  }

  // Get opportunity IDs targeted at these cohorts
  const { data: oppCohortRows } = await (supabase as any)
    .from("opportunity_cohorts")
    .select("opportunity_id")
    .in("cohort_id", cohortIds)

  const eligibleOppIds = [...new Set((oppCohortRows ?? []).map((r: any) => r.opportunity_id))]

  if (eligibleOppIds.length === 0) {
    return (
      <OpportunitiesCandidateClient
        opportunities={[]}
        candidateAcademic={candidateAcademic}
        profileId={profile.id}
      />
    )
  }

  // Fetch published opportunities joining company profiles, filtered by eligible IDs
  const { data: opps } = await (supabase as any)
    .from("opportunities")
    .select("*, company:companies(*)")
    .eq("institute_id", instituteId)
    .eq("status", "Published")
    .in("id", eligibleOppIds)
    .order("deadline", { ascending: true })

  const oppList: OpportunityListItem[] = opps || []
  const oppIds = oppList.map(o => o.id)

  const myApplications: Record<string, { id: string; status: any; resume_url: string }> = {}

  if (oppIds.length > 0) {
    const { data: apps } = await (supabase as any)
      .from("opportunity_applications")
      .select("id, opportunity_id, status, resume_url")
      .eq("candidate_id", profile.id)
      .in("opportunity_id", oppIds)

    for (const app of apps || []) {
      myApplications[app.opportunity_id] = {
        id: app.id,
        status: app.status,
        resume_url: app.resume_url
      }
    }
  }

  const mappedOpps = oppList.map((opp) => {
    const app = myApplications[opp.id]
    return {
      ...opp,
      my_application_id: app?.id || null,
      my_application_status: app?.status || null,
      my_application_resume_url: app?.resume_url || null
    }
  })

  return (
    <OpportunitiesCandidateClient
      opportunities={mappedOpps}
      candidateAcademic={candidateAcademic}
      profileId={profile.id}
    />
  )
}
