import { redirect, notFound } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { getUserProfile } from "@/lib/supabase/profile"
import { buildStorageUrl } from "@/lib/storage"
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

  if (profile.account_type !== "institute_candidate" && profile.account_type !== "admin") {
    redirect("/home")
  }

  const supabase = await createClient()

  // ─── Fetch core course ────────────────────────────────────────────────────────
  const { data: course, error: courseError } = await (supabase as any)
    .from("courses")
    .select(`
      *,
      instructor:profiles!courses_instructor_id_fkey(
        full_name,
        avatar_path
      )
    `)
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
      .select("id, user_id, enrolled_at, profiles(full_name, email)")
      .eq("course_id", courseId)
      .order("enrolled_at", { ascending: false })

    const totalModules = courseModules.length

    // Bulk fetch progress counts for all users in this course
    const { data: progressRows } = await (supabase as any)
      .from("course_module_progress")
      .select("user_id")
      .eq("course_id", courseId)
      .eq("completed", true)

    // Build lookup map: user_id -> count of completed modules
    const progressMap: Record<string, number> = {}
    progressRows?.forEach((row: any) => {
      progressMap[row.user_id] = (progressMap[row.user_id] || 0) + 1
    })

    // Bulk fetch certificates for this course
    const { data: certRows } = await (supabase as any)
      .from("course_certificates")
      .select("user_id, id")
      .eq("course_id", courseId)

    // Build lookup set of user_ids with certificates
    const certSet = new Set<string>(certRows?.map((c: any) => c.user_id) ?? [])

    const students = (enrollments ?? []).map((enr: any) => {
      const userId = enr.user_id
      const displayName = enr.profiles?.full_name ?? null
      const email = enr.profiles?.email ?? "unknown@email.com"

      const modulesCompleted = progressMap[userId] || 0
      const completionPct = totalModules > 0 ? Math.round((modulesCompleted / totalModules) * 100) : 0

      return {
        enrollment_id: enr.id,
        user_id: userId,
        full_name: displayName,
        email,
        enrolled_at: enr.enrolled_at,
        modules_completed: modulesCompleted,
        total_modules: totalModules,
        completion_pct: completionPct,
        has_certificate: certSet.has(userId),
      }
    })

    const adminCourse = {
      id: course.id,
      title: course.title,
      description: course.description,
      level: course.level,
      duration: course.duration,
      cover_image_path: course.cover_image_path || undefined,
      instructor_name: course.instructor?.full_name || "Instructor",
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
    cover_image_path: course.cover_image_path || undefined,
    instructor: {
      name: course.instructor?.full_name || "Instructor",
      role: "Course Instructor",
      avatar: course.instructor?.avatar_path 
        ? buildStorageUrl("avatars", course.instructor.avatar_path) 
        : null,
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
