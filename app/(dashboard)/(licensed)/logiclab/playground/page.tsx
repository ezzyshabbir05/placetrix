import { getUserProfile } from "@/lib/supabase/profile"
import { redirect } from "next/navigation"
import PlaygroundWorkspaceClient from "../_components/PlaygroundWorkspaceClient"

export const metadata = {
  title: "Playground — LogicLab",
  description: "A free programming sandbox to write, execute, and test code.",
}

export default async function PlaygroundPage() {
  const profile = await getUserProfile()
  if (!profile) redirect("/auth/login")
  if (profile.account_type !== "institute_candidate" && profile.account_type !== "admin") {
    redirect("/home")
  }
  return <PlaygroundWorkspaceClient userId={profile?.id} />
}

