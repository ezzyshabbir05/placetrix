import { Metadata } from "next"
import { ResumeAnalyzerClient } from "./ResumeAnalyzerClient"

export const metadata: Metadata = {
  title: "Resume Analyzer | PlaceTrix",
  description:
    "Upload your resume for an AI-powered ATS score, section breakdown, skills gap analysis, and personalized improvement tips.",
}

export default function ResumeAnalyzerPage() {
  return <ResumeAnalyzerClient />
}
