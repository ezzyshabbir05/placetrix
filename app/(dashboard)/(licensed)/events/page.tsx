// app/(dashboard)/(licensed)/events/page.tsx
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { getUserProfile } from "@/lib/supabase/profile"
import { EventsStaffClient } from "./EventsStaffClient"
import { EventsCandidateClient } from "./EventsCandidateClient"
import type { EventListItem, CandidateEventListItem } from "./types"

export const metadata = {
  title: "Events",
  description: "Campus Events & Activities",
}

async function fetchInstituteEvents(
  userId: string
): Promise<{
  events: EventListItem[]
  totalAttendeesCount: number
  totalCheckedInCount: number
}> {
  const supabase = await createClient()

  // Find institute ID of the staff user
  const { data: profile } = await (supabase as any)
    .from("profiles")
    .select("institute_id")
    .eq("id", userId)
    .maybeSingle()

  const instituteId = profile?.institute_id
  if (!instituteId) {
    return {
      events: [],
      totalAttendeesCount: 0,
      totalCheckedInCount: 0,
    }
  }

  // Fetch all events for the institute joining their tickets and cohorts
  const { data: rawEvents } = await (supabase as any)
    .from("events")
    .select(`
      *,
      event_tickets(id, status, attendance_status),
      event_cohorts(cohort_id, cohorts(name))
    `)
    .eq("institute_id", instituteId)
    .order("date", { ascending: false })

  // Compute attendee stats
  const { data: allTickets } = await (supabase as any)
    .from("event_tickets")
    .select("status, attendance_status, events!inner(institute_id)")
    .eq("events.institute_id", instituteId)
    .neq("status", "Cancelled")

  const totalAttendeesCount = allTickets?.length ?? 0
  const totalCheckedInCount = allTickets?.filter((t: any) => t.attendance_status === "Present").length ?? 0

  const events = (rawEvents ?? []).map((event: any): EventListItem => {
    const tickets = event.event_tickets ?? []
    return {
      id: event.id,
      title: event.title,
      description: event.description,
      date: event.date,
      venue: event.venue,
      capacity: event.capacity,
      status: event.status,
      targeting_rules: event.targeting_rules ?? { years: [], branches: [] },
      duration_minutes: event.duration_minutes ?? 120,
      event_banner: event.event_banner ?? null,
      speaker_name: event.speaker_name ?? null,
      created_at: event.created_at,
      updated_at: event.updated_at,
      tickets_confirmed: tickets.filter((t: any) => t.status === "Confirmed").length,
      tickets_waitlisted: tickets.filter((t: any) => t.status === "Waitlisted").length,
      tickets_present: tickets.filter((t: any) => t.attendance_status === "Present").length,
    }
  })

  return { events, totalAttendeesCount, totalCheckedInCount }
}

async function fetchCandidateEvents(
  userId: string
): Promise<{
  events: CandidateEventListItem[]
}> {
  const supabase = await createClient()

  // 1. Resolve candidate profile details
  const { data: profile } = await (supabase as any)
    .from("profiles")
    .select("institute_id")
    .eq("id", userId)
    .maybeSingle()

  const instituteId = profile?.institute_id
  if (!instituteId) {
    return { events: [] }
  }

  // 2. Find which cohorts this candidate belongs to
  const { data: memberRows } = await (supabase as any)
    .from("cohort_students")
    .select("cohort_id")
    .eq("student_id", userId)

  const cohortIds = (memberRows ?? []).map((r: any) => r.cohort_id)

  // If not in any cohort, show nothing
  if (cohortIds.length === 0) {
    return { events: [] }
  }

  // 3. Get event IDs targeted at these cohorts
  const { data: eventCohortRows } = await (supabase as any)
    .from("event_cohorts")
    .select("event_id")
    .in("cohort_id", cohortIds)

  const eligibleEventIds = [...new Set((eventCohortRows ?? []).map((r: any) => r.event_id))]

  if (eligibleEventIds.length === 0) {
    return { events: [] }
  }

  // 4. Query published events from eligible set
  const { data: rawEvents } = await (supabase as any)
    .from("events")
    .select(`
      id, title, description, date, venue, capacity, status, duration_minutes, created_at, event_banner, speaker_name,
      event_tickets(id, status, attendance_status, candidate_id)
    `)
    .eq("status", "Published")
    .eq("institute_id", instituteId)
    .in("id", eligibleEventIds)
    .order("date", { ascending: true })

  // 5. Map to CandidateEventListItem
  const candidateEvents: CandidateEventListItem[] = (rawEvents ?? []).map((event: any) => {
    const allTickets = event.event_tickets ?? []
    const myTicket = allTickets.find((t: any) => t.candidate_id === userId && t.status !== "Cancelled")
    return {
      id: event.id,
      title: event.title,
      description: event.description,
      date: event.date,
      venue: event.venue,
      capacity: event.capacity,
      status: event.status,
      duration_minutes: event.duration_minutes ?? 120,
      event_banner: event.event_banner ?? null,
      speaker_name: event.speaker_name ?? null,
      created_at: event.created_at,
      tickets_confirmed: allTickets.filter((t: any) => t.status === "Confirmed").length,
      my_ticket_id: myTicket?.id ?? null,
      my_ticket_status: myTicket?.status ?? null,
      my_attendance_status: myTicket?.attendance_status ?? null,
    }
  })

  return { events: candidateEvents }
}

export default async function EventsPage() {
  const profile = await getUserProfile()
  if (!profile) redirect("/auth/login")

  const allowedRoles = ["institute_candidate", "institute_staff", "institute_placement_officer", "institute_primary"]
  if (!allowedRoles.includes(profile.account_type)) {
    redirect("/home")
  }

  // ─── Staff / Institute View ──────────────────────────────────────────────
  if (profile.account_type !== "institute_candidate") {
    const {
      events,
      totalAttendeesCount,
      totalCheckedInCount,
    } = await fetchInstituteEvents(profile.id)

    return (
      <EventsStaffClient
        events={events}
        totalAttendeesCount={totalAttendeesCount}
        totalCheckedInCount={totalCheckedInCount}
      />
    )
  }

  // ─── Candidate View ──────────────────────────────────────────────────────
  const { events } = await fetchCandidateEvents(profile.id)

  return (
    <EventsCandidateClient
      events={events}
      candidateName={profile.full_name}
    />
  )
}

