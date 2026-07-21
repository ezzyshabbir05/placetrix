import { createClient } from "@/lib/supabase/server"
import { getUserProfile } from "@/lib/supabase/profile"
import { redirect } from "next/navigation"
import { getInstituteCourses } from "./actions"
import { UsersListClient, InstituteUser } from "./UsersListClient"
import { buildStorageUrl } from "@/lib/storage"

export const metadata = {
  title: "User Management | PlaceTrix",
  description: "Create and manage Student, Staff, and TPO accounts for your institution.",
}

interface SearchParams {
  page?: string
  size?: string
  search?: string
  role?: string
  sortBy?: string
  sortOrder?: string
}

export default async function UsersPage(props: {
  searchParams: Promise<SearchParams>
}) {
  const profile = await getUserProfile()
  if (!profile || profile.account_type !== "institute_primary") {
    redirect("/home")
  }

  const params = await props.searchParams
  const page = Math.max(1, parseInt(params.page || "1", 10))
  const size = Math.max(1, parseInt(params.size || "10", 10))
  const search = params.search || ""
  const role = params.role || "all"
  const sortBy = params.sortBy || "created"
  const sortOrder = params.sortOrder || "desc"

  const supabase = await createClient()

  let query = (supabase as any)
    .from("profiles")
    .select(`
      id,
      full_name,
      email,
      username,
      account_type,
      avatar_path,
      created_at,
      candidate_academic_details (
        passout_year,
        university_prn,
        course:institute_courses (
          course_name
        )
      )
    `, { count: "exact" })
    .eq("institute_id", profile.institute_id)
    .in("account_type", ["institute_candidate", "institute_staff", "institute_placement_officer"])

  // Role Filter
  if (role !== "all") {
    query = query.eq("account_type", role)
  }

  // Search Filter
  if (search.trim()) {
    const s = search.trim()
    query = query.or(`full_name.ilike.%${s}%,email.ilike.%${s}%`)
  }

  // Sorting
  const ascending = sortOrder === "asc"
  switch (sortBy) {
    case "name":
      query = query.order("full_name", { ascending })
      break
    case "role":
      query = query.order("account_type", { ascending })
      break
    case "email":
      query = query.order("email", { ascending })
      break
    case "created":
    default:
      query = query.order("created_at", { ascending })
      break
  }

  // Sliced Pagination Range
  const from = (page - 1) * size
  const to = page * size - 1

  const { data: usersData, count, error } = await query.range(from, to)

  if (error) {
    console.error("Error fetching institute users:", error)
  }

  const users: InstituteUser[] = (usersData || []).map((u: any) => {
    const cad = Array.isArray(u.candidate_academic_details)
      ? u.candidate_academic_details[0]
      : u.candidate_academic_details
    const courseName = Array.isArray(cad?.course)
      ? cad?.course[0]?.course_name
      : cad?.course?.course_name

    return {
      id: u.id,
      full_name: u.full_name,
      email: u.email,
      username: u.username || null,
      account_type: u.account_type,
      avatar_path: buildStorageUrl("avatars", u.avatar_path),
      created_at: u.created_at,
      course_name: courseName || null,
      passout_year: cad?.passout_year || null,
    }
  })

  // Fetch courses for dropdown
  const courses = await getInstituteCourses()

  return (
    <div className="flex flex-col gap-6 px-4 py-8 md:px-8">
      <div className="flex flex-col gap-1.5">
        <h1 className="text-3xl font-bold font-cirka tracking-tight text-foreground">
          User Management
        </h1>
        <p className="text-sm text-muted-foreground font-medium">
          Create, view, and manage accounts for Students, Staff, and Placement Officers (TPO) associated with your institution.
        </p>
      </div>

      <UsersListClient
        initialUsers={users}
        courses={courses}
        totalCount={count || 0}
        initialPage={page}
        initialPageSize={size}
        initialSearch={search}
        initialRole={role}
        initialSortCol={sortBy as any}
        initialSortDir={sortOrder as any}
      />
    </div>
  )
}
