import { createClient } from "@/lib/supabase/server"
import { getUserProfile } from "@/lib/supabase/profile"
import { redirect } from "next/navigation"
import { StudentsListClient, Student } from "./StudentsListClient"

export const metadata = {
  title: "Students | PlaceTrix",
  description: "View and manage students registered in your institution.",
}

interface SearchParams {
  page?: string
  size?: string
  search?: string
  status?: string
  sortBy?: string
  sortOrder?: string
}

export default async function StudentsPage(props: {
  searchParams: Promise<SearchParams>
}) {
  const profile = await getUserProfile()
  if (!profile || profile.account_type !== "institute" || profile.account_subtype !== "primary") {
    redirect("/home")
  }

  const params = await props.searchParams
  const page = Math.max(1, parseInt(params.page || "1", 10))
  const size = Math.max(1, parseInt(params.size || "10", 10))
  const search = params.search || ""
  const status = params.status || "all"
  const sortBy = params.sortBy || "created"
  const sortOrder = params.sortOrder || "desc"

  const supabase = await createClient()

  let query = (supabase as any)
    .from("candidate_profiles")
    .select(`
      profile_id,
      course_name,
      passout_year,
      university_prn,
      institute_verified,
      cgpa,
      profile_image_path,
      created_at,
      profiles!inner (
        display_name,
        email
      )
    `, { count: "exact" })
    .eq("institute_id", profile.institute_id)

  // Status Filter
  if (status === "verified") {
    query = query.eq("institute_verified", true)
  } else if (status === "pending") {
    query = query.or("institute_verified.eq.false,institute_verified.is.null")
  }

  // Search Filter
  if (search.trim()) {
    const s = search.trim()
    
    // First, search profiles table for matching display_name or email
    const { data: matchedProfiles } = await (supabase as any)
      .from("profiles")
      .select("id")
      .or(`display_name.ilike.%${s}%,email.ilike.%${s}%`)
      
    const matchedProfileIds = (matchedProfiles || []).map((p: any) => p.id)
    
    if (matchedProfileIds.length === 0) {
      // Force empty result if no profile matches
      query = query.eq("profile_id", "00000000-0000-0000-0000-000000000000")
    } else {
      query = query.in("profile_id", matchedProfileIds)
    }
  }

  // Sorting
  const ascending = sortOrder === "asc"
  switch (sortBy) {
    case "name":
      query = query.order("profiles(display_name)", { ascending })
      break
    case "course":
      query = query.order("course_name", { ascending })
      break
    case "passout":
      query = query.order("passout_year", { ascending })
      break
    case "cgpa":
      query = query.order("cgpa", { ascending })
      break
    case "status":
      query = query.order("institute_verified", { ascending })
      break
    case "created":
    default:
      query = query.order("created_at", { ascending })
      break
  }

  // Sliced Pagination Range
  const from = (page - 1) * size
  const to = page * size - 1

  const { data: studentsData, count, error } = await query.range(from, to)

  if (error) {
    console.error("Error fetching students:", error)
  }

  const students: Student[] = (studentsData || []).map((s: any) => ({
    profile_id: s.profile_id,
    display_name: s.profiles.display_name,
    email: s.profiles.email,
    course_name: s.course_name,
    passout_year: s.passout_year,
    university_prn: s.university_prn,
    institute_verified: s.institute_verified,
    cgpa: s.cgpa,
    profile_image_path: s.profile_image_path
      ? supabase.storage.from("avatars").getPublicUrl(s.profile_image_path).data.publicUrl
      : null,
    created_at: s.created_at,
  }))

  return (
    <div className="flex flex-col gap-6 px-4 py-8 md:px-8">
      <div className="flex flex-col gap-1.5">
        <h1 className="text-3xl font-bold font-cirka tracking-tight text-foreground">Students</h1>
        <p className="text-sm text-muted-foreground">
          {count || 0} student{count === 1 ? "" : "s"} registered.
        </p>
      </div>
      <StudentsListClient 
        students={students}
        totalCount={count || 0}
        initialPage={page}
        initialPageSize={size}
        initialSearch={search}
        initialStatus={status as "all" | "verified" | "pending"}
        initialSortCol={sortBy as any}
        initialSortDir={sortOrder as any}
      />
    </div>
  )
}

