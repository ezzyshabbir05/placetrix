import { Metadata } from "next"
import { getUserProfile } from "@/lib/supabase/profile"
import { redirect } from "next/navigation"
import { ToolsClient } from "./ToolsClient"

export const metadata: Metadata = {
  title: "Tools ",
  description: "Explore AI tools to supercharge your career journey.",
}

export default async function ToolsPage() {
  const profile = await getUserProfile()
  if (!profile) redirect("/auth/login")
  if (profile.account_type !== "institute_candidate" && profile.account_type !== "admin") {
    redirect("/home")
  }
  return <ToolsClient />
}
