"use server"

import { createClient } from "@/lib/supabase/server"
import { getUserProfile as getUser } from "@/lib/supabase/profile"
import { revalidatePath } from "next/cache"

// ─── Types ────────────────────────────────────────────────────────────────────

export interface UpsertPlacementInfoInput {
  candidateUuid: string
  companyName: string | null
  ctc: number | null
  offerLetterDate: string | null   // ISO date string "YYYY-MM-DD" or null
  jobRole: string | null
  offerType: "on_campus" | "off_campus" | "internship" | "ppo" | "freelance" | null
  location: string | null
  driveTag: string | null
}

export interface ExportFilters {
  search: string
  placedFilter: "all" | "placed" | "not_placed"
  passoutYear: string
  courseFilter: string
  ctcMin: string
  ctcMax: string
  driveFilter: string
  columns: string[]
}

// ─── Upsert single placement record ──────────────────────────────────────────

export async function upsertPlacementInfo(input: UpsertPlacementInfoInput) {
  const profile = await getUser()
  if (!profile || profile.account_type !== "institute" || (profile.account_subtype !== "tpo" && profile.account_subtype !== "primary")) {
    throw new Error("Unauthorized")
  }

  const instituteId = profile.institute_id

  const supabase = await createClient()

  // Verify the student belongs to this institute
  const { data: student, error: checkErr } = await (supabase as any)
    .from("candidate_profiles")
    .select("profile_id")
    .eq("profile_id", input.candidateUuid)
    .eq("institute_id", instituteId)
    .single()

  if (checkErr || !student) {
    throw new Error("Student not found or does not belong to your institute.")
  }

  const { error } = await (supabase as any)
    .from("pt_mt_info")
    .upsert(
      {
        candidate_uuid: input.candidateUuid,
        company_name: input.companyName || null,
        ctc: input.ctc ?? null,
        offer_letter_date: input.offerLetterDate || null,
        job_role: input.jobRole?.trim() || null,
        offer_type: input.offerType || null,
        location: input.location?.trim() || null,
        drive_tag: input.driveTag?.trim() || null,
      },
      { onConflict: "candidate_uuid" }
    )

  if (error) {
    console.error("Supabase Error (upsertPlacementInfo):", error)
    throw new Error(error.message)
  }

  revalidatePath("/placement-management")
}

// ─── Bulk set placement status ─────────────────────────────────────────────────

export async function bulkSetPlacementStatus(
  candidateUuids: string[],
  status: "placed" | "not_placed"
) {
  if (candidateUuids.length === 0) return

  const profile = await getUser()
  if (!profile || profile.account_type !== "institute" || (profile.account_subtype !== "tpo" && profile.account_subtype !== "primary")) {
    throw new Error("Unauthorized")
  }

  const instituteId = profile.institute_id

  const supabase = await createClient()

  // Verify all students belong to this institute
  const { data: students, error: checkErr } = await (supabase as any)
    .from("candidate_profiles")
    .select("profile_id")
    .eq("institute_id", instituteId)
    .in("profile_id", candidateUuids)

  if (checkErr) throw new Error(checkErr.message)
  const validIds: string[] = (students || []).map((s: any) => s.profile_id)

  if (validIds.length === 0) {
    throw new Error("No valid students found for this institute.")
  }

  if (status === "not_placed") {
    // Clear company_name, ctc, offer fields — student is marked not placed
    const rows = validIds.map((uuid) => ({
      candidate_uuid: uuid,
      company_name: null,
      ctc: null,
      offer_letter_date: null,
      job_role: null,
      offer_type: null,
      location: null,
      drive_tag: null,
    }))
    const { error } = await (supabase as any)
      .from("pt_mt_info")
      .upsert(rows, { onConflict: "candidate_uuid" })
    if (error) throw new Error(error.message)
  }
  // "placed" — no bulk data to set; individual edit is used via the side panel

  revalidatePath("/placement-management")
}

// ─── Export placement data ─────────────────────────────────────────────────────

export async function exportPlacementData(filters: ExportFilters): Promise<Record<string, any>[]> {
  const profile = await getUser()
  if (!profile || profile.account_type !== "institute" || (profile.account_subtype !== "tpo" && profile.account_subtype !== "primary")) {
    throw new Error("Unauthorized")
  }

  const instituteId = profile.institute_id

  const supabase = await createClient()

  // ── Base query ──
  let query = (supabase as any)
    .from("candidate_profiles")
    .select(
      `
      profile_id,
      course_name,
      passout_year,
      phone_number,
      profiles!inner (
        display_name,
        email
      )
    `
    )
    .eq("institute_id", instituteId)

  // ── Placed filter ──
  if (filters.placedFilter === "placed") {
    const { data: placedIds } = await (supabase as any)
      .from("pt_mt_info")
      .select("candidate_uuid")
      .not("company_name", "is", null)
    const ids = (placedIds || []).map((r: any) => r.candidate_uuid)
    if (ids.length === 0) return []
    query = query.in("profile_id", ids)
  } else if (filters.placedFilter === "not_placed") {
    const { data: placedIds } = await (supabase as any)
      .from("pt_mt_info")
      .select("candidate_uuid")
      .not("company_name", "is", null)
    const ids = (placedIds || []).map((r: any) => r.candidate_uuid)
    if (ids.length > 0) {
      query = query.not("profile_id", "in", `(${ids.join(",")})`)
    }
  }

  // ── Year / course filters ──
  if (filters.passoutYear) {
    query = query.eq("passout_year", parseInt(filters.passoutYear, 10))
  }
  if (filters.courseFilter) {
    query = query.eq("course_name", filters.courseFilter)
  }

  // ── Search ──
  if (filters.search.trim()) {
    const { data: matchedProfiles } = await (supabase as any)
      .from("profiles")
      .select("id")
      .ilike("display_name", `%${filters.search.trim()}%`)
    const matchedIds = (matchedProfiles || []).map((p: any) => p.id)
    if (matchedIds.length === 0) return []
    query = query.in("profile_id", matchedIds)
  }

  const { data: rawData, error } = await query
  if (error) throw new Error(error.message)

  const profileIds: string[] = (rawData || []).map((r: any) => r.profile_id)
  if (profileIds.length === 0) return []

  // ── Fetch pt_mt_info ──
  const { data: ptData } = await (supabase as any)
    .from("pt_mt_info")
    .select("candidate_uuid, company_name, ctc, offer_letter_date, job_role, offer_type, location, drive_tag")
    .in("candidate_uuid", profileIds)

  const ptMap = new Map<string, any>()
  for (const row of ptData || []) {
    ptMap.set(row.candidate_uuid, row)
  }

  // ── Merge and filter by CTC / drive ──
  const cols = filters.columns
  const ctcMinNum = filters.ctcMin ? parseFloat(filters.ctcMin) : null
  const ctcMaxNum = filters.ctcMax ? parseFloat(filters.ctcMax) : null

  const rows: Record<string, any>[] = []

  for (const r of rawData || []) {
    const pt = ptMap.get(r.profile_id)

    const ctcVal: number | null = pt?.ctc ?? null

    // CTC range filter
    if (ctcMinNum !== null && (ctcVal === null || ctcVal < ctcMinNum)) continue
    if (ctcMaxNum !== null && (ctcVal === null || ctcVal > ctcMaxNum)) continue

    // Drive filter
    if (filters.driveFilter && (pt?.drive_tag ?? "") !== filters.driveFilter) continue

    const status = pt?.company_name ? "Placed" : "Not Placed"

    const row: Record<string, any> = {}
    if (cols.includes("display_name")) row["Student Name"] = r.profiles?.display_name ?? ""
    if (cols.includes("email")) row["Email"] = r.profiles?.email ?? ""
    if (cols.includes("phone_number")) row["Phone"] = r.phone_number ?? ""
    if (cols.includes("course_name")) row["Course"] = r.course_name ?? ""
    if (cols.includes("passout_year")) row["Passout Year"] = r.passout_year ?? ""
    if (cols.includes("company_name")) row["Company Name"] = pt?.company_name ?? ""
    if (cols.includes("ctc")) row["CTC (LPA)"] = ctcVal ?? ""
    if (cols.includes("job_role")) row["Job Role"] = pt?.job_role ?? ""
    if (cols.includes("offer_type")) row["Offer Type"] = pt?.offer_type ?? ""
    if (cols.includes("location")) row["Location"] = pt?.location ?? ""
    if (cols.includes("offer_letter_date")) row["Offer Letter Date"] = pt?.offer_letter_date ?? ""
    if (cols.includes("drive_tag")) row["Drive Tag"] = pt?.drive_tag ?? ""
    if (cols.includes("status")) row["Placement Status"] = status

    rows.push(row)
  }

  return rows
}
