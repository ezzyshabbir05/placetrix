import { redirect, notFound } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { getUserProfile } from "@/lib/supabase/profile"
import { CandidateCoursesInnerClient } from "./CandidateCoursesInnerClient"

interface PageProps {
  params: Promise<{
    courseId: string
  }>
}

export const metadata = {
  title: "Course Curriculum",
  description: "Detailed syllabus and learning path",
}

export default async function CourseDetailPage({ params }: PageProps) {
  const { courseId } = await params
  const profile = await getUserProfile()
  if (!profile) {
    redirect("/auth/login")
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
    console.error("Error fetching modules for course details:", modulesError)
  }

  // 3. Fetch candidate's enrollment
  const { data: enrollment } = await (supabase as any)
    .from("course_enrollments")
    .select("id")
    .eq("course_id", courseId)
    .eq("user_id", profile.id)
    .maybeSingle()

  // 4. Fetch candidate's module progress
  const { data: progress } = await (supabase as any)
    .from("course_module_progress")
    .select("*")
    .eq("course_id", courseId)
    .eq("user_id", profile.id)

  // 5. Fetch candidate's issued certificate
  const { data: certificate } = await (supabase as any)
    .from("course_certificates")
    .select("id")
    .eq("course_id", courseId)
    .eq("user_id", profile.id)
    .maybeSingle()

  // Format database models to UI components interface
  const courseModules = (modules ?? []).map((m: any) => {
    const prog = (progress ?? []).find((p: any) => p.module_id === m.id)
    return {
      id: m.id,
      title: m.title,
      description: m.description || "",
      type: m.type as any,
      completed: prog ? prog.completed : false,
      duration: m.duration || "",
    }
  })

  const formattedCourse = {
    id: course.id,
    title: course.title,
    description: course.description,
    category: course.category as any,
    level: course.level as any,
    duration: course.duration,
    type: course.type as any,
    badge: course.badge || undefined,
    cover_image_path: course.cover_image_path || undefined,
    partner: {
      name: "CS Foundation",
      logo: "C",
      logoBg: "bg-indigo-600",
    },
    instructor: {
      name: course.instructor_name,
      role: "Course Instructor",
      avatar: course.instructor_name.slice(0, 2).toUpperCase(),
    },
    modules: courseModules,
  }

  // Admins are automatically considered enrolled for curriculum browsing and management convenience
  const isEnrolled = enrollment !== null || profile.account_type === "admin"
  const certificateId = certificate?.id || null

  return (
    <CandidateCoursesInnerClient
      course={formattedCourse as any}
      isEnrolled={isEnrolled}
      certificateId={certificateId}
      userProfile={profile}
    />
  )
}
