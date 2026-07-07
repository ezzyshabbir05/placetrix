import { createClient } from "@/lib/supabase/server"
import { getUserProfile } from "@/lib/supabase/profile"
import { redirect } from "next/navigation"
import { decryptString, maskAadhaar } from "@/lib/encryption"
import { CandidateProfileClient } from "./CandidateProfileClient"
import { InstituteProfileClient } from "./InstituteProfileClient"
import { AdminProfileClient } from "./AdminProfileClient"
import { StaffProfileClient } from "./StaffProfileClient"
import { TpoProfileClient } from "./TpoProfileClient"
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

  if (profile.account_type === "institute_candidate") {
    const [
      { data: candidateProfile },
      { data: candidateEducation },
      { data: candidateExperiences },
      { data: candidateProjects },
      { data: candidateCertifications },
      { data: eventTickets },
      { data: allSkills },
      { data: candidateSkillRows },
      { data: semesterGrades }
    ] = await Promise.all([
      (supabase as any).from("candidate_profiles").select("*").eq("profile_id", profile.id).maybeSingle(),
      (supabase as any).from("candidate_education").select("*").eq("profile_id", profile.id).order("passout_year", { ascending: false }),
      (supabase as any).from("candidate_experiences").select("*").eq("profile_id", profile.id).order("start_date", { ascending: false }),
      (supabase as any).from("candidate_projects").select("*").eq("profile_id", profile.id).order("start_date", { ascending: false }),
      (supabase as any).from("candidate_certifications").select("*").eq("profile_id", profile.id).order("issue_date", { ascending: false }),
      (supabase as any)
        .from("event_tickets")
        .select(`
          id,
          event:events!inner(
            id,
            title,
            date,
            status
          )
        `)
        .eq("candidate_id", profile.id)
        .eq("attendance_status", "Present")
        .eq("events.status", "Concluded"),
      (supabase as any).from("skills").select("*").order("category").order("name"),
      (supabase as any).from("candidate_skills").select("skill_id").eq("profile_id", profile.id),
      (supabase as any).from("candidate_semester_grades").select("semester_number, sgpa").eq("profile_id", profile.id).order("semester_number"),
    ]);

    let semestersCount = 8;
    let courseConfigured = true;
    if (profile.institute_id && candidateProfile?.course_name) {
      const { data: courseData } = await (supabase as any)
        .from("institute_courses")
        .select("semesters_count")
        .eq("institute_id", profile.institute_id)
        .eq("course_name", candidateProfile.course_name)
        .maybeSingle();
      if (courseData) {
        semestersCount = courseData.semesters_count;
      } else {
        courseConfigured = false;
      }
    }

    const initialSgpaArray = Array.from({ length: semestersCount }, (_, i) => {
      const row = (semesterGrades || []).find((g: any) => g.semester_number === i + 1);
      return row && row.sgpa != null ? Number(row.sgpa).toFixed(2) : "";
    });

    const eventCertificates = (eventTickets ?? [])
      .filter((t: any) => t.event)
      .map((t: any) => ({
        ticketId: t.id,
        eventId: t.event.id,
        eventTitle: t.event.title,
        eventDate: t.event.date,
      }));

    if (candidateProfile?.aadhaar_number) {
      try {
        const decrypted = decryptString(candidateProfile.aadhaar_number);
        candidateProfile.aadhaar_number = maskAadhaar(decrypted);
      } catch (err) {
        console.error("Failed to decrypt Aadhaar number for profile", profile.id);
        candidateProfile.aadhaar_number = maskAadhaar(candidateProfile.aadhaar_number);
      }
    }

    const initialCandidateData = candidateProfile ? {
      ...candidateProfile,
      first_name: profile.first_name,
      middle_name: profile.middle_name,
      last_name: profile.last_name,
      full_name: profile.full_name,
      sgpa_semesters: initialSgpaArray,
    } : null;

    const selectedSkillIds: string[] = (candidateSkillRows ?? []).map((r: any) => r.skill_id);

    return (
      <CandidateProfileClient
        userProfile={profile}
        initialData={initialCandidateData}
        educationData={candidateEducation ?? []}
        experienceData={candidateExperiences ?? []}
        projectsData={candidateProjects ?? []}
        certificationsData={candidateCertifications ?? []}
        eventCertificates={eventCertificates}
        allSkills={allSkills ?? []}
        initialSkillIds={selectedSkillIds}
        semestersCount={semestersCount}
        courseConfigured={courseConfigured}
      />
    )
  }

  if (profile.account_type === "institute_staff") {
    const { data: staffProfile } = await (supabase as any)
      .from("staff_profiles")
      .select("*")
      .eq("profile_id", profile.id)
      .maybeSingle()
    return <StaffProfileClient userProfile={profile} initialData={staffProfile ?? null} />
  }

  if (profile.account_type === "institute_placement_officer") {
    const { data: tpoProfile } = await (supabase as any)
      .from("tpo_profiles")
      .select("*")
      .eq("profile_id", profile.id)
      .maybeSingle()
    return <TpoProfileClient userProfile={profile} initialData={tpoProfile ?? null} />
  }

  if (profile.account_type === "institute_primary") {
    const instituteId = profile.institute_id;
    let instituteProfile = null;
    let instituteCourses: any[] = [];
    
    if (instituteId) {
      const [instRes, coursesRes] = await Promise.all([
        (supabase as any).from("institutes").select("*").eq("id", instituteId).maybeSingle(),
        (supabase as any).from("institute_courses").select("id, course_name, semesters_count").eq("institute_id", instituteId).order("course_name")
      ]);
      instituteProfile = instRes.data;
      instituteCourses = coursesRes.data || [];
    }

    const mergedData = instituteProfile ? {
      ...instituteProfile,
      courses: instituteCourses.map((c: any) => ({
        id: c.id,
        value: c.course_name,
        semesters_count: c.semesters_count
      }))
    } : null;

    return (
      <InstituteProfileClient
        userProfile={profile}
        initialData={mergedData}
      />
    )
  }

  redirect("/home")
}

