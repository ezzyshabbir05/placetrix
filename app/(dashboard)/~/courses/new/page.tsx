import { redirect } from "next/navigation"
import { getUserProfile } from "@/lib/supabase/profile"
import { AdminCourseForm } from "../AdminCourseForm"

export const metadata = {
  title: "Create Course — Admin",
  description: "Form to create a new database-linked training course",
}

export default async function NewCoursePage() {
  const profile = await getUserProfile()
  if (!profile || profile.account_type !== "admin") {
    redirect("/~/courses")
  }

  return (
    <div className="px-4 py-8 md:px-8">
      <AdminCourseForm />
    </div>
  )
}
