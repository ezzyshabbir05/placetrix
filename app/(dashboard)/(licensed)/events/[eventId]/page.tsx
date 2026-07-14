import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { getUserProfile } from "@/lib/supabase/profile"
import { EventDetailStaffClient } from "./EventDetailStaffClient"
import { EventDetailCandidateClient } from "./EventDetailCandidateClient"

interface Params {
  eventId: string
}

export async function generateMetadata({ params }: { params: Promise<Params> }) {
  const { eventId } = await params
  const supabase = await createClient()
  const { data: event } = await (supabase as any)
    .from("events")
    .select("title")
    .eq("id", eventId)
    .maybeSingle()

  return {
    title: event?.title ?? "Event Details",
    description: "Event details and management",
  }
}

export default async function EventDetailPage({ params }: { params: Promise<Params> }) {
  const { eventId } = await params
  const profile = await getUserProfile()
  if (!profile) redirect("/auth/login")

  const allowedRoles = ["institute_candidate", "institute_staff", "institute_placement_officer", "institute_primary"]
  if (!allowedRoles.includes(profile.account_type)) {
    redirect("/home")
  }

  const supabase = await createClient()

  // Fetch event
  const { data: event, error: eventError } = await (supabase as any)
    .from("events")
    .select(`
      *,
      event_agenda(*),
      institutes(institute_name)
    `)
    .eq("id", eventId)
    .maybeSingle()

  if (eventError || !event) {
    redirect("/events")
  }

  // ─── Staff View ────────────────────────────────────────────────────────────
  if (profile.account_type !== "institute_candidate") {
    // Fetch tickets with candidate info
    const { data: tickets } = await (supabase as any)
      .from("event_tickets")
      .select(`
        id, status, attendance_status, candidate_id, created_at,
        profile:profiles!candidate_id(
          full_name,
          email,
          candidate_academic_details(
            passout_year,
            course:institute_courses(course_name)
          )
        )
      `)
      .eq("event_id", eventId)
      .order("created_at", { ascending: true })

    const formattedTickets = (tickets ?? []).map((t: any) => {
      const cad = Array.isArray(t.profile?.candidate_academic_details)
        ? t.profile?.candidate_academic_details[0]
        : t.profile?.candidate_academic_details;
      const courseName = Array.isArray(cad?.course)
        ? cad?.course[0]?.course_name
        : cad?.course?.course_name;

      return {
        id: t.id,
        event_id: eventId,
        candidate_id: t.candidate_id,
        status: t.status,
        attendance_status: t.attendance_status,
        created_at: t.created_at,
        candidate_name: t.profile?.full_name ?? "Unknown",
        candidate_email: t.profile?.email ?? "",
        candidate_course: courseName ?? null,
        candidate_passout_year: cad?.passout_year ?? null,
      }
    })

    return (
      <EventDetailStaffClient
        event={{
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
        }}
        agenda={(event.event_agenda ?? [])
          .sort((a: any, b: any) => a.order_index - b.order_index)
          .map((item: any) => ({
            id: item.id,
            event_id: item.event_id,
            title: item.title,
            description: item.description,
            start_time: item.start_time,
            order_index: item.order_index,
          }))}
        tickets={formattedTickets}
      />
    )
  }

  // ─── Candidate View ────────────────────────────────────────────────────────
  // Check if candidate belongs to targeted cohorts of this event
  const { data: memberRows } = await (supabase as any)
    .from("cohort_students")
    .select("cohort_id")
    .eq("student_id", profile.id)

  const cohortIds = (memberRows ?? []).map((r: any) => r.cohort_id)

  if (cohortIds.length === 0) {
    redirect("/events")
  }

  const { data: isTargeted } = await (supabase as any)
    .from("event_cohorts")
    .select("id")
    .eq("event_id", eventId)
    .in("cohort_id", cohortIds)
    .limit(1)
    .maybeSingle()

  if (!isTargeted) {
    redirect("/events")
  }

  const { data: myTicket } = await (supabase as any)
    .from("event_tickets")
    .select("id, status, attendance_status")
    .eq("event_id", eventId)
    .eq("candidate_id", profile.id)
    .neq("status", "Cancelled")
    .maybeSingle()

  return (
    <EventDetailCandidateClient
      event={{
        id: event.id,
        title: event.title,
        description: event.description,
        date: event.date,
        venue: event.venue,
        capacity: event.capacity,
        status: event.status,
        duration_minutes: event.duration_minutes ?? 120,
        event_banner: event.event_banner ?? null,
        institute_name: event.institutes?.institute_name ?? null,
        speaker_name: event.speaker_name ?? null,
      }}
      agenda={(event.event_agenda ?? [])
        .sort((a: any, b: any) => a.order_index - b.order_index)
        .map((item: any) => ({
          id: item.id,
          event_id: item.event_id,
          title: item.title,
          description: item.description,
          start_time: item.start_time,
          order_index: item.order_index,
        }))}
      ticket={myTicket ? {
        id: myTicket.id,
        status: myTicket.status,
        attendance_status: myTicket.attendance_status,
      } : null}
      candidateName={profile.full_name}
    />
  )
}
