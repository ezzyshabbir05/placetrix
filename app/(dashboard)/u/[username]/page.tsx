import { createClient } from "@/lib/supabase/server";
import { getUserProfile } from "@/lib/supabase/profile";
import { notFound } from "next/navigation";
import { CandidatePublicProfileView } from "./CandidatePublicProfileView";

interface PageProps {
  params: Promise<{ username: string }>;
}

export default async function PublicProfilePage({ params }: PageProps) {
  const { username } = await params;

  // 1. Get the viewer's profile (auth check — redirects if unauthenticated)
  const viewer = await getUserProfile();
  if (!viewer) return notFound();

  const supabase = await createClient();

  // 2. Look up the target candidate by username
  const { data: targetProfile } = await (supabase as any)
    .from("profiles")
    .select("*")
    .eq("username", username)
    .eq("account_type", "institute_candidate")
    .maybeSingle();

  if (!targetProfile) return notFound();

  // 3. Access-control check
  const isAdmin = viewer.account_type === "admin";
  const isSameInstitute =
    viewer.institute_id &&
    targetProfile.institute_id &&
    viewer.institute_id === targetProfile.institute_id;

  if (!isAdmin && !isSameInstitute) return notFound();

  // 4. Fetch all public data for the target candidate
  const [
    { data: academicDetails },
    { data: candidateEducation },
    { data: candidateExperiences },
    { data: candidateProjects },
    { data: candidateCertifications },
    { data: eventTickets },
    { data: allSkills },
    { data: candidateSkillRows },
    { data: semesterGrades },
  ] = await Promise.all([
    (supabase as any)
      .from("candidate_academic_details")
      .select("course_id, passout_year, university_prn, course:institute_courses(course_name)")
      .eq("profile_id", targetProfile.id)
      .maybeSingle(),
    (supabase as any)
      .from("candidate_education")
      .select("*")
      .eq("profile_id", targetProfile.id)
      .order("passout_year", { ascending: false }),
    (supabase as any)
      .from("candidate_experiences")
      .select("*")
      .eq("profile_id", targetProfile.id)
      .order("start_date", { ascending: false }),
    (supabase as any)
      .from("candidate_projects")
      .select("*")
      .eq("profile_id", targetProfile.id)
      .order("start_date", { ascending: false }),
    (supabase as any)
      .from("candidate_certifications")
      .select("*")
      .eq("profile_id", targetProfile.id)
      .order("issue_date", { ascending: false }),
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
      .eq("candidate_id", targetProfile.id)
      .eq("attendance_status", "Present")
      .eq("events.status", "Concluded"),
    (supabase as any).from("skills").select("*").order("category").order("name"),
    (supabase as any)
      .from("candidate_skills")
      .select("skill_id")
      .eq("profile_id", targetProfile.id),
    (supabase as any)
      .from("candidate_semester_grades")
      .select("semester_number, sgpa")
      .eq("profile_id", targetProfile.id)
      .order("semester_number"),
  ]);

  // 5. Derive semester count from the course config
  let semestersCount = 8;
  if (targetProfile.institute_id && academicDetails?.course_id) {
    const { data: courseData } = await (supabase as any)
      .from("institute_courses")
      .select("semesters_count")
      .eq("id", academicDetails.course_id)
      .maybeSingle();
    if (courseData) semestersCount = courseData.semesters_count;
  }

  // 6. Get institute name
  let instituteName: string | null = null;
  if (targetProfile.institute_id) {
    const { data: inst } = await (supabase as any)
      .from("institutes")
      .select("institute_name")
      .eq("id", targetProfile.institute_id)
      .maybeSingle();
    instituteName = inst?.institute_name ?? null;
  }

  const sgpaArray = Array.from({ length: semestersCount }, (_, i) => {
    const row = (semesterGrades || []).find(
      (g: any) => g.semester_number === i + 1
    );
    return row && row.sgpa != null ? Number(row.sgpa).toFixed(2) : null;
  });

  const eventCertificates = (eventTickets ?? [])
    .filter((t: any) => t.event)
    .map((t: any) => ({
      ticketId: t.id,
      eventId: t.event.id,
      eventTitle: t.event.title,
      eventDate: t.event.date,
    }));

  const courseName = Array.isArray(academicDetails?.course)
    ? (academicDetails?.course as any)[0]?.course_name
    : (academicDetails?.course as any)?.course_name;

  const selectedSkillIds: string[] = (candidateSkillRows ?? []).map(
    (r: any) => r.skill_id
  );

  // 7. Build safe public data object — private fields explicitly excluded
  const publicData = {
    profile_id: targetProfile.id,
    full_name: targetProfile.full_name,
    first_name: targetProfile.first_name,
    last_name: targetProfile.last_name,
    email: targetProfile.email,
    username: targetProfile.username,
    avatar_path: targetProfile.avatar_path,
    bio: targetProfile.bio,
    gender: targetProfile.gender,
    linkedin_url: targetProfile.linkedin_url,
    github_url: targetProfile.github_url,
    portfolio_links: targetProfile.portfolio_links,
    course_name: courseName ?? null,
    passout_year: academicDetails?.passout_year ?? null,
    university_prn: academicDetails?.university_prn ?? null,
    institute_name: instituteName,
    sgpa_semesters: sgpaArray,
  };

  return (
    <CandidatePublicProfileView
      publicData={publicData}
      educationData={candidateEducation ?? []}
      experienceData={candidateExperiences ?? []}
      projectsData={candidateProjects ?? []}
      certificationsData={candidateCertifications ?? []}
      eventCertificates={eventCertificates}
      allSkills={allSkills ?? []}
      selectedSkillIds={selectedSkillIds}
      semestersCount={semestersCount}
    />
  );
}
