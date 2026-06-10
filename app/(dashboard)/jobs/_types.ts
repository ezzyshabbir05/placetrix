// ─────────────────────────────────────────────────────────────────────────────
// app/jobs/_types.ts
// ─────────────────────────────────────────────────────────────────────────────

export type JobType = "full_time" | "part_time" | "internship" | "contract"
export type WorkMode = "onsite" | "remote" | "hybrid"

export const JOB_TYPE_LABELS: Record<JobType, string> = {
  full_time: "Full-time",
  part_time: "Part-time",
  internship: "Internship",
  contract: "Contract",
}

export const WORK_MODE_LABELS: Record<WorkMode, string> = {
  onsite: "On-site",
  remote: "Remote",
  hybrid: "Hybrid",
}

export interface CandidateJobPosting {
  id: string
  title: string
  description?: string
  requirements?: string
  job_type: JobType
  work_mode: WorkMode
  location?: string
  salary_min?: number
  salary_max?: number
  salary_currency: string
  skills: string[]
  application_deadline?: string
  created_at: string
  
  // Joined from recruiter_profiles
  company_name: string
  company_logo_path?: string
  industry?: string
}
