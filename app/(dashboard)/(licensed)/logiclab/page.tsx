// app/(dashboard)/(licensed)/logiclab/page.tsx

import { getUserProfile } from "@/lib/supabase/profile"
import { redirect } from "next/navigation"
import { LogicLabDashboardClient } from "./_components/LogicLabDashboardClient"

export const metadata = {
  title: "LogicLab",
  description: "Solve coding challenges, practice algorithms, and sharpen your programming skills.",
}

export default async function LogicLabPage() {
  const profile = await getUserProfile()
  if (!profile) redirect("/auth/login")

  if (profile.account_type !== "institute_candidate" && profile.account_type !== "admin") {
    redirect("/home")
  }

  const isAdmin = profile.account_type === "admin"
  if (isAdmin) redirect("/logiclab/admin")

  return (
    <LogicLabDashboardClient
      userId={profile.id}
      isAdmin={false}
    />
  )
}
