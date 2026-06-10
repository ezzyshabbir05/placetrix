// ─────────────────────────────────────────────────────────────────────────────
// app/postings/_types.ts
// ─────────────────────────────────────────────────────────────────────────────

export type JobPostingStatus = "draft" | "active" | "paused" | "closed"
export type JobType = "full_time" | "part_time" | "internship" | "contract"
export type WorkMode = "onsite" | "remote" | "hybrid"

export interface JobPosting {
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
  application_count: number
  status: JobPostingStatus
  created_at: string
  updated_at: string
}

export interface JobPostingForm {
  title: string
  description: string
  requirements: string
  job_type: JobType
  work_mode: WorkMode
  location: string
  salary_min: string
  salary_max: string
  skills: string[]
  application_deadline: string
  status: JobPostingStatus
}

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

export const STATUS_LABELS: Record<JobPostingStatus, string> = {
  draft: "Draft",
  active: "Active",
  paused: "Paused",
  closed: "Closed",
}

export function emptyForm(): JobPostingForm {
  return {
    title: "",
    description: "",
    requirements: "",
    job_type: "full_time",
    work_mode: "onsite",
    location: "",
    salary_min: "",
    salary_max: "",
    skills: [],
    application_deadline: "",
    status: "draft",
  }
}
