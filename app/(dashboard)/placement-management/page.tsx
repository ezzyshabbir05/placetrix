import { createClient } from "@/lib/supabase/server"
import { getUserProfile } from "@/lib/supabase/profile"
import { redirect } from "next/navigation"
import { PlacementListClient, PlacementRecord } from "./PlacementListClient"

export const metadata = {
  title: "Placement Management | PlaceTrix",
  description: "View and manage student placement records for your institution.",
}

interface SearchParams {
  page?: string
  size?: string
  search?: string
  placed?: string
  year?: string
  course?: string
  sortBy?: string
  sortOrder?: string
  ctcMin?: string
  ctcMax?: string
  drive?: string
}

export default async function PlacementManagementPage(props: {
  searchParams: Promise<SearchParams>
}) {
  const profile = await getUserProfile()
  if (!profile || profile.account_type !== "institute" || (profile.account_subtype !== "tpo" && profile.account_subtype !== "primary")) {
    redirect("/home")
  }

  const instituteId = profile.institute_id

  const params = await props.searchParams
  const page = Math.max(1, parseInt(params.page || "1", 10))
  const size = Math.max(1, parseInt(params.size || "10", 10))
  const search = params.search || ""
  const placedFilter = (params.placed as "all" | "placed" | "not_placed") || "all"
  const passoutYear = params.year || ""
  const courseFilter = params.course || ""
  const sortBy = params.sortBy || "name"
  const sortOrder = params.sortOrder || "asc"
  const ctcMin = params.ctcMin || ""
  const ctcMax = params.ctcMax || ""
  const driveFilter = params.drive || ""

  const supabase = await createClient()

  // ── Fetch available filter options (years + courses + drives for this institute) ──
  const { data: filterOptions } = await (supabase as any)
    .from("candidate_profiles")
    .select("passout_year, course_name")
    .eq("institute_id", instituteId)
    .not("passout_year", "is", null)

  const availableYears: number[] = Array.from(
    new Set<number>((filterOptions || []).map((r: any) => r.passout_year).filter(Boolean))
  ).sort((a, b) => b - a)

  const availableCourses: string[] = Array.from(
    new Set<string>(
      (filterOptions || []).map((r: any) => r.course_name).filter(Boolean)
    )
  ).sort()

  // ── Fetch available drive tags for this institute's students ──
  // We get all candidate UUIDs for this institute first
  const { data: candidateIds } = await (supabase as any)
    .from("candidate_profiles")
    .select("profile_id")
    .eq("institute_id", instituteId)

  const allCandidateUuids: string[] = (candidateIds || []).map((r: any) => r.profile_id)

  let availableDrives: string[] = []
  if (allCandidateUuids.length > 0) {
    const { data: driveData } = await (supabase as any)
      .from("placement_records")
      .select("drive_tag")
      .in("candidate_id", allCandidateUuids)
      .not("drive_tag", "is", null)

    availableDrives = Array.from(
      new Set<string>((driveData || []).map((r: any) => r.drive_tag).filter(Boolean))
    ).sort()
  }

  // ── Build query against candidate_profiles ────────────────────────────
  let query = (supabase as any)
    .from("candidate_profiles")
    .select(
      `
      profile_id,
      course_name,
      passout_year,
      profile_image_path,
      phone_number,
      profiles!inner (
        display_name,
        email
      )
    `,
      { count: "exact" }
    )
    .eq("institute_id", instituteId)

  // ── Placed filter ──────────────────────────────────────────────────────
  if (placedFilter === "placed") {
    const { data: placedIds } = await (supabase as any)
      .from("placement_records")
      .select("candidate_id")
      .not("company_name", "is", null)

    const ids = (placedIds || []).map((r: any) => r.candidate_id)
    if (ids.length === 0) {
      query = query.eq("profile_id", "00000000-0000-0000-0000-000000000000")
    } else {
      query = query.in("profile_id", ids)
    }
  } else if (placedFilter === "not_placed") {
    const { data: placedIds } = await (supabase as any)
      .from("placement_records")
      .select("candidate_id")
      .not("company_name", "is", null)

    const ids = (placedIds || []).map((r: any) => r.candidate_id)
    if (ids.length > 0) {
      query = query.not("profile_id", "in", `(${ids.join(",")})`)
    }
  }

  // ── Drive filter ───────────────────────────────────────────────────────
  if (driveFilter) {
    const { data: driveIds } = await (supabase as any)
      .from("placement_records")
      .select("candidate_id")
      .eq("drive_tag", driveFilter)

    const ids = (driveIds || []).map((r: any) => r.candidate_id)
    if (ids.length === 0) {
      query = query.eq("profile_id", "00000000-0000-0000-0000-000000000000")
    } else {
      query = query.in("profile_id", ids)
    }
  }

  // ── Passout year filter ────────────────────────────────────────────────
  if (passoutYear) {
    query = query.eq("passout_year", parseInt(passoutYear, 10))
  }

  // ── Course filter ──────────────────────────────────────────────────────
  if (courseFilter) {
    query = query.eq("course_name", courseFilter)
  }

  // ── Search ─────────────────────────────────────────────────────────────
  if (search.trim()) {
    const s = search.trim()
    const { data: matchedProfiles } = await (supabase as any)
      .from("profiles")
      .select("id")
      .ilike("display_name", `%${s}%`)

    const matchedIds = (matchedProfiles || []).map((p: any) => p.id)
    if (matchedIds.length === 0) {
      query = query.eq("profile_id", "00000000-0000-0000-0000-000000000000")
    } else {
      query = query.in("profile_id", matchedIds)
    }
  }

  // ── Sorting ────────────────────────────────────────────────────────────
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
    // company / ctc: sorted in code after merge
    default:
      query = query.order("profiles(display_name)", { ascending: true })
      break
  }

  // ── Pagination ─────────────────────────────────────────────────────────
  const from = (page - 1) * size
  const to = page * size - 1

  const { data: rawData, count, error } = await query.range(from, to)

  if (error) {
    console.error("Error fetching placement records:", error)
  }

  // ── Fetch placement_records separately for the returned profile IDs ───────────
  const profileIds: string[] = (rawData || []).map((r: any) => r.profile_id)

  const ptMap = new Map<string, {
    company_name: string | null
    ctc: number | null
    offer_letter_date: string | null
    job_role: string | null
    offer_type: string | null
    location: string | null
    drive_tag: string | null
  }>()

  if (profileIds.length > 0) {
    const { data: ptData, error: ptError } = await (supabase as any)
      .from("placement_records")
      .select("candidate_id, company_name, ctc, offer_letter_date, job_role, offer_type, location, drive_tag")
      .in("candidate_id", profileIds)

    if (ptError) {
      console.error("Error fetching placement_records:", ptError)
    }

    for (const row of ptData || []) {
      ptMap.set(row.candidate_id, {
        company_name: row.company_name ?? null,
        ctc: row.ctc ?? null,
        offer_letter_date: row.offer_letter_date ?? null,
        job_role: row.job_role ?? null,
        offer_type: row.offer_type ?? null,
        location: row.location ?? null,
        drive_tag: row.drive_tag ?? null,
      })
    }
  }

  // ── Merge ──────────────────────────────────────────────────────────────
  let records: PlacementRecord[] = (rawData || []).map((r: any) => {
    const pt = ptMap.get(r.profile_id)
    return {
      profile_id: r.profile_id,
      display_name: r.profiles?.display_name ?? "Unknown",
      email: r.profiles?.email ?? null,
      phone_number: r.phone_number ?? null,
      course_name: r.course_name,
      passout_year: r.passout_year,
      company_name: pt?.company_name ?? null,
      ctc: pt?.ctc ?? null,
      offer_letter_date: pt?.offer_letter_date ?? null,
      job_role: pt?.job_role ?? null,
      offer_type: pt?.offer_type ?? null,
      location: pt?.location ?? null,
      drive_tag: pt?.drive_tag ?? null,
      profile_image_path: r.profile_image_path
        ? supabase.storage.from("avatars").getPublicUrl(r.profile_image_path).data.publicUrl
        : null,
    }
  })

  // ── CTC range filter (post-merge) ──────────────────────────────────────
  const ctcMinNum = ctcMin ? parseFloat(ctcMin) : null
  const ctcMaxNum = ctcMax ? parseFloat(ctcMax) : null

  if (ctcMinNum !== null || ctcMaxNum !== null) {
    records = records.filter((r) => {
      if (r.ctc === null) return false
      if (ctcMinNum !== null && r.ctc < ctcMinNum) return false
      if (ctcMaxNum !== null && r.ctc > ctcMaxNum) return false
      return true
    })
  }

  // ── Sort company/ctc in code after merge ───────────────────────────────
  if (sortBy === "company") {
    records = records.sort((a, b) => {
      const av = a.company_name ?? ""
      const bv = b.company_name ?? ""
      return ascending ? av.localeCompare(bv) : bv.localeCompare(av)
    })
  } else if (sortBy === "ctc") {
    records = records.sort((a, b) => {
      const av = a.ctc ?? -Infinity
      const bv = b.ctc ?? -Infinity
      return ascending ? av - bv : bv - av
    })
  }

  const placedCount = records.filter((r) => r.company_name).length

  return (
    <div className="flex flex-col gap-6 px-4 py-8 md:px-8">
      <div className="flex flex-col gap-1.5">
        <h1 className="text-3xl font-bold font-cirka tracking-tight text-foreground">
          Placement Management
        </h1>
        <p className="text-sm text-muted-foreground">
          {count ?? 0} student{count === 1 ? "" : "s"} registered
          {placedFilter === "all" && count && count > 0
            ? ` · ${placedCount} placed on this page`
            : ""}
          .
        </p>
      </div>

      <PlacementListClient
        records={records}
        totalCount={count ?? 0}
        initialPage={page}
        initialPageSize={size}
        initialSearch={search}
        initialPlacedFilter={placedFilter}
        initialPassoutYear={passoutYear}
        initialCourse={courseFilter}
        initialSortCol={sortBy as any}
        initialSortDir={sortOrder as "asc" | "desc"}
        availableYears={availableYears}
        availableCourses={availableCourses}
        initialCtcMin={ctcMin}
        initialCtcMax={ctcMax}
        initialDrive={driveFilter}
        availableDrives={availableDrives}
      />
    </div>
  )
}
