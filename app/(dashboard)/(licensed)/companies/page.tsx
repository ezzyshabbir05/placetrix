// app/(dashboard)/(licensed)/companies/page.tsx
import { redirect } from "next/navigation"
import { getUserProfile } from "@/lib/supabase/profile"
import { createClient } from "@/lib/supabase/server"
import { CompaniesClient } from "./CompaniesClient"

export const metadata = {
  title: "Manage Companies",
  description: "Manage company profiles for placement opportunities",
}

export default async function CompaniesPage() {
  const profile = await getUserProfile()
  if (!profile) redirect("/auth/login")

  // Only allow staff/TPOs to manage companies
  if (!["institute_primary", "institute_placement_officer"].includes(profile.account_type)) {
    redirect("/home")
  }

  const supabase = await createClient()

  const { data: companies } = await (supabase as any)
    .from("companies")
    .select("*")
    .eq("institute_id", profile.institute_id)
    .order("name", { ascending: true })

  return (
    <CompaniesClient 
      initialCompanies={companies || []} 
    />
  )
}
