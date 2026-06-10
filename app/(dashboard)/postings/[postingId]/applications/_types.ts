// ─────────────────────────────────────────────────────────────────────────────
// app/postings/[postingId]/applications/_types.ts
// ─────────────────────────────────────────────────────────────────────────────

export type JobApplicationStatus = "applied" | "reviewing" | "shortlisted" | "rejected" | "hired"

export const APPLICATION_STATUS_LABELS: Record<JobApplicationStatus, string> = {
  applied: "Applied",
  reviewing: "Reviewing",
  shortlisted: "Shortlisted",
  rejected: "Rejected",
  hired: "Hired",
}

export interface ApplicationDetails {
  id: string
  job_id: string
  candidate_id: string
  status: JobApplicationStatus
  resume_url?: string
  cover_letter?: string
  created_at: string
  updated_at: string
  
  // Joined from profiles -> candidate_profiles (assuming a similar structure, or just profiles if we don't have candidate_profiles)
  candidate_name: string
  candidate_email?: string
}
