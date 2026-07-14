// app/(dashboard)/(licensed)/cohorts/page.tsx
import { redirect } from "next/navigation"
import { getUserProfile } from "@/lib/supabase/profile"
import { getCohortsAction, getCandidateCohortsAction } from "./actions"
import { CohortsClient } from "./CohortsClient"
import type { Cohort } from "./types"

export const metadata = {
  title: "Cohorts",
  description: "Manage student groups (cohorts) for targeted placement activities.",
}

export default async function CohortsPage() {
  const profile = await getUserProfile()
  if (!profile) redirect("/auth/login")

  const allowedRoles = ["institute_primary", "institute_staff", "institute_placement_officer", "institute_candidate"]
  if (!allowedRoles.includes(profile.account_type)) {
    redirect("/home")
  }

  const isCandidate = profile.account_type === "institute_candidate"
  const cohorts: Cohort[] = isCandidate
    ? await getCandidateCohortsAction()
    : await getCohortsAction()

  return <CohortsClient cohorts={cohorts} isCandidate={isCandidate} />
}
