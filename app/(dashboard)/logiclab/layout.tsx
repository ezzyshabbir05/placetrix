import { getUserProfile } from "@/lib/supabase/profile"
import { redirect } from "next/navigation"

export default async function LogicLabLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const profile = await getUserProfile()
  if (!profile) redirect("/auth/login")

  if (profile.account_type === "institute") {
    redirect("/home")
  }

  return <>{children}</>
}
