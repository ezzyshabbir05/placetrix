import { createClient } from "@/lib/supabase/server"
import { getUserProfile } from "@/lib/supabase/profile"
import { redirect } from "next/navigation"
import { SupportQueueClient } from "./SupportQueueClient"

interface SearchParams {
  page?: string
  size?: string
  search?: string
  tab?: string
}

async function fetchTickets(
  page: number,
  size: number,
  search: string,
  tab: string
): Promise<{
  tickets: any[]
  count: number
  tabCounts: { all: number; open: number; in_progress: number; resolved: number; closed: number }
}> {
  const supabase = await createClient()

  const searchFilter = (q: any) => {
    if (search.trim()) {
      const s = search.trim()
      return q.or(`title.ilike.%${s}%,email.ilike.%${s}%,ticket_number.ilike.%${s}%`)
    }
    return q
  }

  // Count parallel queries for each tab matching the search term
  const [countAllRes, countOpenRes, countInProgressRes, countResolvedRes, countClosedRes] = await Promise.all([
    searchFilter((supabase as any).from("tickets").select("id", { count: "exact", head: true })),
    searchFilter((supabase as any).from("tickets").select("id", { count: "exact", head: true }).eq("status", "open")),
    searchFilter((supabase as any).from("tickets").select("id", { count: "exact", head: true }).eq("status", "in_progress")),
    searchFilter((supabase as any).from("tickets").select("id", { count: "exact", head: true }).eq("status", "resolved")),
    searchFilter((supabase as any).from("tickets").select("id", { count: "exact", head: true }).eq("status", "closed")),
  ])

  const tabCounts = {
    all: countAllRes.count ?? 0,
    open: countOpenRes.count ?? 0,
    in_progress: countInProgressRes.count ?? 0,
    resolved: countResolvedRes.count ?? 0,
    closed: countClosedRes.count ?? 0,
  }

  // Main paginated query
  const activeTab = ["all", "open", "in_progress", "resolved", "closed"].includes(tab) ? tab : "all"

  let query = (supabase as any).from("tickets").select("*", { count: "exact" })

  if (activeTab !== "all") {
    query = query.eq("status", activeTab)
  }

  query = searchFilter(query)
  query = query.order("created_at", { ascending: false })

  const from = (page - 1) * size
  const to = page * size - 1

  const { data: tickets, count, error } = await query.range(from, to)

  if (error) {
    console.error("Error fetching tickets:", error)
    return { tickets: [], count: 0, tabCounts }
  }

  return { tickets: tickets ?? [], count: count ?? 0, tabCounts }
}

export default async function SupportQueuePage(props: {
  searchParams: Promise<SearchParams>
}) {
  const profile = await getUserProfile()
  if (!profile || profile.account_type !== "admin") {
    redirect("/home")
  }

  const params = await props.searchParams
  const page = Math.max(1, parseInt(params.page || "1", 10))
  const size = Math.max(1, parseInt(params.size || "10", 10))
  const search = params.search || ""
  const tab = params.tab || ""

  const { tickets, count, tabCounts } = await fetchTickets(page, size, search, tab)

  return (
    <SupportQueueClient
      tickets={tickets}
      initialPage={page}
      initialPageSize={size}
      initialSearch={search}
      initialTab={tab || "all"}
      totalCount={count}
      tabCounts={tabCounts}
    />
  )
}
