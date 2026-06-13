// app/tests/page.tsx

import { createClient } from "@/lib/supabase/server"
import { getUserProfile } from "@/lib/supabase/profile"
import { CandidateTestsClient } from "./CandidateTestsClient"
import { InstituteTestsClient } from "./InstituteTestsClient"
import { UnderDevelopment } from "@/components/under-development"
import {
  deriveStatus,
  type CandidateTest,
  type CandidateTestAttempt,
  type InstituteTest,
} from "./_types"

export const metadata = {
  title: "Tests",
  description: "Mock Tests",
}

// ─── Candidate data ───────────────────────────────────────────────────────────

async function fetchCandidateTests(
  userId: string,
  now: string,
  page: number,
  size: number,
  search: string,
  tab: string
): Promise<{
  tests: CandidateTest[]
  count: number
  tabCounts: { all: number; live: number; upcoming: number; past: number }
}> {
  const supabase = await createClient()

  // 1. Resolve the candidate's institute
  const { data: profile } = await (supabase as any)
    .from("candidate_profiles")
    .select("institute_id")
    .eq("profile_id", userId)
    .maybeSingle()

  if (!profile?.institute_id) {
    return { tests: [], count: 0, tabCounts: { all: 0, live: 0, upcoming: 0, past: 0 } }
  }

  // 2. Fetch candidate's attempts to identify submitted vs in-progress tests
  const { data: attempts } = await (supabase as any)
    .from("test_attempts")
    .select("test_id, status")
    .eq("candidate_id", userId)

  const submittedTestIds = (attempts ?? [])
    .filter((a: any) => a.status === "submitted")
    .map((a: any) => a.test_id)

  const searchFilter = (q: any) => {
    if (search.trim()) {
      const s = search.trim()
      return q.or(`title.ilike.%${s}%,description.ilike.%${s}%`)
    }
    return q
  }

  // 3. Count parallel queries for each tab matching the search term
  const allCountQuery = searchFilter(
    (supabase as any)
      .from("tests")
      .select("id", { count: "exact", head: true })
      .eq("status", "published")
      .eq("institute_id", profile.institute_id)
  )

  const liveCountQuery = searchFilter(
    (supabase as any)
      .from("tests")
      .select("id", { count: "exact", head: true })
      .eq("status", "published")
      .eq("institute_id", profile.institute_id)
      .lte("available_from", now)
      .or(`available_until.gt.${now},available_until.is.null`)
  )
  if (submittedTestIds.length > 0) {
    liveCountQuery.not("id", "in", `(${submittedTestIds.join(",")})`)
  }

  const upcomingCountQuery = searchFilter(
    (supabase as any)
      .from("tests")
      .select("id", { count: "exact", head: true })
      .eq("status", "published")
      .eq("institute_id", profile.institute_id)
      .gt("available_from", now)
  )
  if (submittedTestIds.length > 0) {
    upcomingCountQuery.not("id", "in", `(${submittedTestIds.join(",")})`)
  }

  let pastCountQuery = (supabase as any)
    .from("tests")
    .select("id", { count: "exact", head: true })
    .eq("status", "published")
    .eq("institute_id", profile.institute_id)

  if (submittedTestIds.length > 0) {
    pastCountQuery = pastCountQuery.or(`available_until.lt.${now},id.in.(${submittedTestIds.join(",")})`)
  } else {
    pastCountQuery = pastCountQuery.lt("available_until", now)
  }
  pastCountQuery = searchFilter(pastCountQuery)

  const [countAllRes, countLiveRes, countUpcomingRes, countPastRes] = await Promise.all([
    allCountQuery,
    liveCountQuery,
    upcomingCountQuery,
    pastCountQuery,
  ])

  const tabCounts = {
    all: countAllRes.count ?? 0,
    live: countLiveRes.count ?? 0,
    upcoming: countUpcomingRes.count ?? 0,
    past: countPastRes.count ?? 0,
  }

  // 4. Main Paginated query
  const activeTab = ["all", "live", "upcoming", "past"].includes(tab) ? tab : "all"

  let query = (supabase as any)
    .from("tests")
    .select(
      `
      id, title, description, time_limit_seconds, available_from, available_until, results_available,
      test_attempts!left (status, submitted_at, score, total_marks, percentage)
    `,
      { count: "exact" }
    )
    .eq("status", "published")
    .eq("institute_id", profile.institute_id)
    .eq("test_attempts.candidate_id", userId)

  if (activeTab === "live") {
    query = query
      .lte("available_from", now)
      .or(`available_until.gt.${now},available_until.is.null`)
    if (submittedTestIds.length > 0) {
      query = query.not("id", "in", `(${submittedTestIds.join(",")})`)
    }
  } else if (activeTab === "upcoming") {
    query = query.gt("available_from", now)
    if (submittedTestIds.length > 0) {
      query = query.not("id", "in", `(${submittedTestIds.join(",")})`)
    }
  } else if (activeTab === "past") {
    if (submittedTestIds.length > 0) {
      query = query.or(`available_until.lt.${now},id.in.(${submittedTestIds.join(",")})`)
    } else {
      query = query.lt("available_until", now)
    }
  }

  query = searchFilter(query)
  if (activeTab === "live") {
    query = query
      .order("available_until", { ascending: true, nullsFirst: false })
      .order("available_from", { ascending: false })
  } else if (activeTab === "upcoming") {
    query = query
      .order("available_from", { ascending: true })
      .order("available_until", { ascending: true, nullsFirst: false })
  } else if (activeTab === "past") {
    query = query
      .order("available_until", { ascending: false, nullsFirst: false })
      .order("available_from", { ascending: false })
  } else {
    // "all" tab
    query = query
      .order("available_from", { ascending: false, nullsFirst: false })
      .order("title", { ascending: true })
  }

  const from = (page - 1) * size
  const to = page * size - 1

  const { data: rawTests, count, error } = await query.range(from, to)

  if (error) {
    console.error("Error fetching candidate tests:", error)
    return { tests: [], count: 0, tabCounts }
  }

  const tests = (rawTests ?? []).map((t: any): CandidateTest => {
    const rawAttempt = t.test_attempts?.[0]
    let attempt: CandidateTestAttempt | undefined
    if (rawAttempt) {
      attempt = {
        status: rawAttempt.status as "in_progress" | "submitted",
        submitted_at: rawAttempt.submitted_at ?? undefined,
        score: rawAttempt.score ?? undefined,
        total_marks: rawAttempt.total_marks ?? undefined,
        percentage: rawAttempt.percentage ?? undefined,
      }
    }

    return {
      id: t.id,
      title: t.title,
      description: t.description ?? undefined,
      time_limit_seconds: t.time_limit_seconds ?? undefined,
      available_from: t.available_from ?? undefined,
      available_until: t.available_until ?? undefined,
      derived_status: deriveStatus(
        "published",
        t.available_from,
        t.available_until,
        new Date(now)
      ) as CandidateTest["derived_status"],
      results_available: t.results_available,
      attempt,
    }
  })

  return { tests, count: count ?? 0, tabCounts }
}

// ─── Institute data ───────────────────────────────────────────────────────────

async function fetchInstituteTests(
  userId: string,
  now: string,
  page: number,
  size: number,
  search: string,
  tab: string
): Promise<{
  tests: InstituteTest[]
  count: number
  tabCounts: { all: number; live: number; upcoming: number; past: number; drafts: number }
}> {
  const supabase = await createClient()

  const searchFilter = (q: any) => {
    if (search.trim()) {
      const s = search.trim()
      return q.or(`title.ilike.%${s}%,description.ilike.%${s}%`)
    }
    return q
  }

  // 1. Count parallel queries for each tab matching the search term
  const [countAllRes, countDraftsRes, countLiveRes, countUpcomingRes, countPastRes] = await Promise.all([
    searchFilter((supabase as any).from("view_test_summary").select("*", { count: "exact", head: true }).eq("institute_id", userId)),
    searchFilter((supabase as any).from("view_test_summary").select("*", { count: "exact", head: true }).eq("institute_id", userId).eq("status", "draft")),
    searchFilter((supabase as any).from("view_test_summary").select("*", { count: "exact", head: true }).eq("institute_id", userId).eq("status", "published").or(`available_from.lte.${now},available_from.is.null`).or(`available_until.gt.${now},available_until.is.null`)),
    searchFilter((supabase as any).from("view_test_summary").select("*", { count: "exact", head: true }).eq("institute_id", userId).eq("status", "published").gt("available_from", now)),
    searchFilter((supabase as any).from("view_test_summary").select("*", { count: "exact", head: true }).eq("institute_id", userId).eq("status", "published").lt("available_until", now)),
  ])

  const tabCounts = {
    all: countAllRes.count ?? 0,
    drafts: countDraftsRes.count ?? 0,
    live: countLiveRes.count ?? 0,
    upcoming: countUpcomingRes.count ?? 0,
    past: countPastRes.count ?? 0,
  }

  // 2. Main Paginated query
  let query = (supabase as any)
    .from("view_test_summary")
    .select("*", { count: "exact" })
    .eq("institute_id", userId)

  const activeTab = ["all", "live", "upcoming", "past", "drafts"].includes(tab) ? tab : "all"

  if (activeTab === "drafts") {
    query = query.eq("status", "draft")
  } else if (activeTab === "live") {
    query = query
      .eq("status", "published")
      .or(`available_from.lte.${now},available_from.is.null`)
      .or(`available_until.gt.${now},available_until.is.null`)
  } else if (activeTab === "upcoming") {
    query = query.eq("status", "published").gt("available_from", now)
  } else if (activeTab === "past") {
    query = query.eq("status", "published").lt("available_until", now)
  }

  query = searchFilter(query)
  if (activeTab === "all") {
    query = query
      .order("created_at", { ascending: false, nullsFirst: false })
      .order("title", { ascending: true })
  } else if (activeTab === "drafts") {
    query = query.order("title", { ascending: true })
  } else if (activeTab === "live") {
    query = query
      .order("available_until", { ascending: true, nullsFirst: false })
      .order("available_from", { ascending: false })
  } else if (activeTab === "upcoming") {
    query = query
      .order("available_from", { ascending: true })
      .order("available_until", { ascending: true, nullsFirst: false })
  } else if (activeTab === "past") {
    query = query
      .order("available_until", { ascending: false, nullsFirst: false })
      .order("available_from", { ascending: false })
  }

  const from = (page - 1) * size
  const to = page * size - 1

  const { data: rawTests, count, error } = await query.range(from, to)

  if (error) {
    console.error("Error fetching institute tests:", error)
    return { tests: [], count: 0, tabCounts }
  }

  const tests = (rawTests ?? []).map((t: any): InstituteTest => ({
    id: t.id ?? "",
    title: t.title ?? "Untitled",
    description: t.description ?? undefined,
    time_limit_seconds: t.time_limit_seconds ?? undefined,
    available_from: t.available_from ?? undefined,
    available_until: t.available_until ?? undefined,
    derived_status: deriveStatus(
      t.status ?? "draft",
      t.available_from ?? null,
      t.available_until ?? null,
      new Date(now)
    ),
    status: (t.status as "draft" | "published") ?? "draft",
    results_available: t.results_available ?? false,
    question_count: t.question_count ?? 0,
    attempt_count: t.total_attempts ?? 0,
  }))

  return { tests, count: count ?? 0, tabCounts }
}

// ─── Page ─────────────────────────────────────────────────────────────────────

interface SearchParams {
  page?: string
  size?: string
  search?: string
  tab?: string
}

export default async function TestsPage(props: {
  searchParams: Promise<SearchParams>
}) {
  const profile = await getUserProfile()
  if (!profile) return null

  const params = await props.searchParams
  const page = Math.max(1, parseInt(params.page || "1", 10))
  const size = Math.max(1, parseInt(params.size || "10", 10))
  const search = params.search || ""
  const tab = params.tab || ""

  const nowStr = new Date().toISOString()

  if (profile.account_type === "candidate") {
    const { tests, count, tabCounts } = await fetchCandidateTests(
      profile.id,
      nowStr,
      page,
      size,
      search,
      tab
    )
    return (
      <CandidateTestsClient
        tests={tests}
        serverNow={nowStr}
        initialPage={page}
        initialPageSize={size}
        initialSearch={search}
        initialTab={tab || "all"}
        totalCount={count}
        tabCounts={tabCounts}
      />
    )
  }

  if (profile.account_type === "institute" && (profile.account_subtype === "staff" || profile.account_subtype === "tpo" || profile.account_subtype === "primary")) {
    // Staff/TPO/Primary users query tests by their parent institute's profile id
    const instituteId = profile.institute_id
    if (!instituteId) return null
    const { tests, count, tabCounts } = await fetchInstituteTests(
      instituteId,
      nowStr,
      page,
      size,
      search,
      tab
    )
    return (
      <InstituteTestsClient
        tests={tests}
        serverNow={nowStr}
        initialPage={page}
        initialPageSize={size}
        initialSearch={search}
        initialTab={tab || "all"}
        totalCount={count}
        tabCounts={tabCounts}
      />
    )
  }

  // Recruiter, admin, etc. — feature not yet available
  return <UnderDevelopment />
}
