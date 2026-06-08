import { redirect, notFound } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { getUserProfile } from "@/lib/supabase/profile"
import { CreateCourseClient } from "./CreateCourseClient"

interface PageProps {
  params: Promise<{
    courseId: string
  }>
}

export async function generateMetadata({ params }: PageProps) {
  const { courseId } = await params
  const isNew = courseId === "new"
  return {
    title: isNew ? "Create Course — Admin" : "Edit Course — Admin",
    description: isNew
      ? "Form to create a new database-linked training course"
      : "Modify course details and syllabus modules",
  }
}

export default async function EditCoursePage({ params }: PageProps) {
  const { courseId } = await params
  const profile = await getUserProfile()
  if (!profile || profile.account_type !== "admin") {
    redirect("/~/courses")
  }

  const isNew = courseId === "new"

  if (isNew) {
    return <CreateCourseClient />
  }

  const supabase = await createClient()

  // 1. Fetch course details
  const { data: course, error: courseError } = await (supabase as any)
    .from("courses")
    .select("*")
    .eq("id", courseId)
    .maybeSingle()

  if (courseError || !course) {
    notFound()
  }

  // 2. Fetch course modules ordered by order_index
  const { data: modules, error: modulesError } = await (supabase as any)
    .from("course_modules")
    .select("*")
    .eq("course_id", courseId)
    .order("order_index", { ascending: true })

  if (modulesError) {
    console.error("Error fetching modules for editing:", modulesError)
  }

  // Format modules for form input structure
  const formattedModules = (modules ?? []).map((m: any) => ({
    id: m.id,
    title: m.title,
    description: m.description || "",
    duration: m.duration || "30 min",
    type: m.type || "text",
    content: m.content || "",
  }))

  return (
    <CreateCourseClient
      initialCourse={course}
      initialModules={formattedModules}
    />
  )
}

