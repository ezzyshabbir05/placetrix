import { getUserProfile } from "@/lib/supabase/profile"
import { redirect } from "next/navigation"
import LandingPageClient from "./LandingPageClient"

export default async function RootPage() {
  const profile = await getUserProfile()

  if (profile) {
    redirect("/home")
  }

  return <LandingPageClient />
}
