import { redirect, notFound } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { getUserProfile } from "@/lib/supabase/profile"
import { CandidateModuleClient } from "./CandidateModuleClient"
import { buildStorageUrl } from "@/lib/storage"

interface PageProps {
  params: Promise<{
    courseId: string
    moduleId: string
  }>
}

export const metadata = {
  title: "Module Classroom",
  description: "Interactive learning curriculum and tasks",
}

export default async function ModuleDetailPage({ params }: PageProps) {
  const { courseId, moduleId } = await params
  const profile = await getUserProfile()
  if (!profile) {
    redirect("/auth/login")
  }

  const supabase = await createClient()

  // 1. Verify enrollment (unless admin)
  if (profile.account_type !== "admin") {
    const { data: enrollment } = await (supabase as any)
      .from("course_enrollments")
      .select("id")
      .eq("course_id", courseId)
      .eq("user_id", profile.id)
      .maybeSingle()

    if (!enrollment) {
      redirect(`/courses/${courseId}`)
    }
  }

  // 2. Fetch course metadata
  const { data: course, error: courseError } = await (supabase as any)
    .from("courses")
    .select(`
      *,
      instructor:profiles!courses_instructor_id_fkey(
        display_name,
        avatar_path
      )
    `)
    .eq("id", courseId)
    .maybeSingle()

  if (courseError || !course) {
    notFound()
  }

  // 3. Fetch all course modules ordered by order_index
  const { data: modules, error: modulesError } = await (supabase as any)
    .from("course_modules")
    .select("*")
    .eq("course_id", courseId)
    .order("order_index", { ascending: true })

  if (modulesError) {
    console.error("Error fetching course modules for classroom:", modulesError)
  }

  const activeModule = (modules ?? []).find((m: any) => m.id === moduleId)
  if (!activeModule) {
    notFound()
  }

  // 4. Fetch module completion progress
  const { data: progress } = await (supabase as any)
    .from("course_module_progress")
    .select("*")
    .eq("course_id", courseId)
    .eq("user_id", profile.id)

  // Format data
  const courseModules = (modules ?? []).map((m: any) => {
    const prog = (progress ?? []).find((p: any) => p.module_id === m.id)
    return {
      id: m.id,
      title: m.title,
      description: m.description || "",
      type: m.type as any,
      completed: prog ? prog.completed : false,
      duration: m.duration || "",
      content: m.content || "",
    }
  })

  const formattedCourse = {
    id: course.id,
    title: course.title,
    description: course.description,
    level: course.level as any,
    duration: course.duration,
    type: course.type as any,
    cover_image_path: course.cover_image_path || undefined,
    instructor: {
      name: course.instructor?.display_name || "Instructor",
      role: "Course Instructor",
      avatar: course.instructor?.avatar_path 
        ? buildStorageUrl("avatars", course.instructor.avatar_path) 
        : null,
    },
    modules: courseModules,
  }

  const formattedActiveModule = courseModules.find((m: any) => m.id === moduleId)

  return (
    <CandidateModuleClient
      course={formattedCourse as any}
      module={formattedActiveModule as any}
    />
  )
}
