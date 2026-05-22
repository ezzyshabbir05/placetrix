import { createClient } from "@/lib/supabase/server"
import { getUserProfile } from "@/lib/supabase/profile"
import { redirect, notFound } from "next/navigation"
import { AdminProblemCreatorClient } from "../../AdminProblemCreatorClient"

export const metadata = {
  title: "Edit Problem — LogicLab Admin",
  description: "Edit coding problems inside the LogicLab Portal.",
}

interface PageProps {
  params: Promise<{
    id: string
  }>
}

export default async function EditProblemPage({ params }: PageProps) {
  const { id } = await params
  const profile = await getUserProfile()
  if (!profile) redirect("/auth/login")

  const isAdmin = profile.account_type === "admin" || profile.account_type === "institute"
  if (!isAdmin) redirect("/~/logiclab")

  const supabase = (await createClient()) as any
  const { data: problem, error } = await supabase
    .from("coding_problems")
    .select("*")
    .eq("id", id)
    .single()

  if (error || !problem) {
    notFound()
  }

  return (
    <AdminProblemCreatorClient
      initialProblem={problem}
      isEdit={true}
    />
  )
}
