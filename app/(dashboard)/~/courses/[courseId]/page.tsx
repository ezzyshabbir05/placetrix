import { redirect, notFound } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { getUserProfile } from "@/lib/supabase/profile"
import { CandidateCourseDetailClient } from "./CandidateCourseDetailClient"
import { AdminCourseDetailClient } from "./AdminCourseDetailClient"

interface PageProps {
  params: Promise<{
    courseId: string
  }>
}

export async function generateMetadata({ params }: PageProps) {
  const { courseId } = await params
  const supabase = await createClient()
  const { data: course } = await (supabase as any)
    .from("courses")
    .select("title")
    .eq("id", courseId)
    .maybeSingle()
  return {
    title: course?.title ? `${course.title} — Course Detail` : "Course Detail",
    description: "Course curriculum and enrolled student management",
  }
}

export default async function CourseDetailPage({ params }: PageProps) {
  const { courseId } = await params
  const profile = await getUserProfile()
  if (!profile) {
    redirect("/auth/login")
  }

  const supabase = await createClient()

  // ─── Fetch core course ────────────────────────────────────────────────────────
  const { data: course, error: courseError } = await (supabase as any)
    .from("courses")
    .select("*")
    .eq("id", courseId)
    .maybeSingle()

  if (courseError || !course) {
    notFound()
  }

  // ─── Fetch modules ────────────────────────────────────────────────────────────
  const { data: modules } = await (supabase as any)
    .from("course_modules")
    .select("*")
    .eq("course_id", courseId)
    .order("order_index", { ascending: true })

  const courseModules = (modules ?? []).map((m: any) => ({
    id: m.id,
    title: m.title,
    description: m.description || "",
    type: m.type as any,
    duration: m.duration || "",
    order_index: m.order_index ?? 0,
  }))

  // ─────────────────────────────────────────────────────────────────────────────
  // ADMIN VIEW — enrolled students, stats, syllabus
  // ─────────────────────────────────────────────────────────────────────────────
  if (profile.account_type === "admin") {
    // Fetch all enrollments joined with profile data
    const { data: enrollments } = await (supabase as any)
      .from("course_enrollments")
      .select("id, user_id, enrolled_at, profiles(display_name, email)")
      .eq("course_id", courseId)
      .order("enrolled_at", { ascending: false })

    const totalModules = courseModules.length

    // For each enrolled user, get their module progress count and certificate
    const studentPromises = (enrollments ?? []).map(async (enr: any) => {
      const userId = enr.user_id
      const displayName = enr.profiles?.display_name ?? null
      const email = enr.profiles?.email ?? "unknown@email.com"

      // Count completed modules
      const { count: completedCount } = await (supabase as any)
        .from("course_module_progress")
        .select("id", { count: "exact", head: true })
        .eq("course_id", courseId)
        .eq("user_id", userId)
        .eq("completed", true)

      const modulesCompleted = completedCount ?? 0
      const completionPct = totalModules > 0 ? Math.round((modulesCompleted / totalModules) * 100) : 0

      // Check certificate
      const { data: cert } = await (supabase as any)
        .from("course_certificates")
        .select("id")
        .eq("course_id", courseId)
        .eq("user_id", userId)
        .maybeSingle()

      return {
        enrollment_id: enr.id,
        user_id: userId,
        display_name: displayName,
        email,
        enrolled_at: enr.enrolled_at,
        modules_completed: modulesCompleted,
        total_modules: totalModules,
        completion_pct: completionPct,
        has_certificate: !!cert,
      }
    })

    const students = await Promise.all(studentPromises)

    const adminCourse = {
      id: course.id,
      title: course.title,
      description: course.description,
      level: course.level,
      duration: course.duration,
      type: course.type,
      badge: course.badge || undefined,
      cover_image_path: course.cover_image_path || undefined,
      instructor_name: course.instructor_name,
      is_published: course.is_published,
      created_at: course.created_at,
      modules: courseModules,
    }

    return <AdminCourseDetailClient course={adminCourse} students={students} />
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // CANDIDATE VIEW — enrollment, progress, certificate
  // ─────────────────────────────────────────────────────────────────────────────

  // Fetch candidate's enrollment
  const { data: enrollment } = await (supabase as any)
    .from("course_enrollments")
    .select("id")
    .eq("course_id", courseId)
    .eq("user_id", profile.id)
    .maybeSingle()

  // Fetch candidate's module progress
  const { data: progress } = await (supabase as any)
    .from("course_module_progress")
    .select("*")
    .eq("course_id", courseId)
    .eq("user_id", profile.id)

  // Fetch candidate's issued certificate
  const { data: certificate } = await (supabase as any)
    .from("course_certificates")
    .select("id")
    .eq("course_id", courseId)
    .eq("user_id", profile.id)
    .maybeSingle()

  // Map modules with progress
  const modulesWithProgress = courseModules.map((m: any) => {
    const prog = (progress ?? []).find((p: any) => p.module_id === m.id)
    return {
      ...m,
      completed: prog ? prog.completed : false,
    }
  })

  const formattedCourse = {
    id: course.id,
    title: course.title,
    description: course.description,
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
    modules: modulesWithProgress,
  }

  const isEnrolled = enrollment !== null
  const certificateId = certificate?.id || null

  return (
    <CandidateCourseDetailClient
      course={formattedCourse as any}
      isEnrolled={isEnrolled}
      certificateId={certificateId}
      userProfile={profile}
    />
  )
}
