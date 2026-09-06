import { getUserProfile } from "@/lib/supabase/profile";
import { CandidateDashboardClient } from "./_components/CandidateDashboardClient";
import { TeacherDashboardClient } from "./_components/TeacherDashboardClient";

export default async function HomePage() {
  const profile = await getUserProfile();
  if (!profile) return null;

  // ── Candidate ──────────────────────────────────────────────────────────────
  if (profile.account_type === "institute_candidate") {
    const candidateProfile = {
      id: profile.id,
      username: profile.username || null,
      full_name: profile.full_name || null,
      first_name: profile.first_name || null,
      last_name: profile.last_name || null,
      profile_updated: profile.profile_updated || false,
      institute_id: profile.institute_id || null,
    };

    return <CandidateDashboardClient profile={candidateProfile} />;
  }

  // ── Institute / Staff / TPO ────────────────────────────────────────────────
  if (
    profile.account_type === "institute_primary" ||
    profile.account_type === "institute_staff" ||
    profile.account_type === "institute_placement_officer"
  ) {
    const teacherProfile = {
      id: profile.id,
      username: profile.username || null,
      full_name: profile.full_name || null,
      account_type: profile.account_type,
      profile_updated: profile.profile_updated === true,
      institute_id: profile.institute_id || null,
      institute_name: null,
    };

    return <TeacherDashboardClient profile={teacherProfile} />;
  }

  // ── Admin ──────────────────────────────────────────────────────────────────
  if (profile.account_type === "admin") {
    const adminProfile = {
      id: profile.id,
      username: profile.username || null,
      full_name: profile.full_name || null,
      account_type: profile.account_type,
      profile_updated: profile.profile_updated || true,
      institute_id: null,
      institute_name: "PlaceTrix Admin Platform",
    };

    return <TeacherDashboardClient profile={adminProfile} />;
  }

  return (
    <div className="p-8 text-center text-muted-foreground">
      <p>Invalid or missing account type.</p>
    </div>
  );
}