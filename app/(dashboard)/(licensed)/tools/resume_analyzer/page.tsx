import { Metadata } from "next"
import { getUserProfile } from "@/lib/supabase/profile"
import { redirect } from "next/navigation"
import { ResumeAnalyzerClient } from "./ResumeAnalyzerClient"

export const metadata: Metadata = {
  title: "Resume Analyzer",
  description:
    "Upload your resume for an AI-powered ATS score, section breakdown, skills gap analysis, and personalized improvement tips.",
}

export default async function ResumeAnalyzerPage() {
  const profile = await getUserProfile()
  if (!profile) redirect("/auth/login")
  if (profile.account_type !== "institute_candidate" && profile.account_type !== "admin") {
    redirect("/home")
  }
  return <ResumeAnalyzerClient />
}
