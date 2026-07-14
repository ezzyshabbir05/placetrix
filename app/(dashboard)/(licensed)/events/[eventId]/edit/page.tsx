import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { getUserProfile } from "@/lib/supabase/profile"
import { CreateEventClient } from "./CreateEventClient"
import { getCohortOptionsAction } from "@/app/(dashboard)/(licensed)/cohorts/actions"

interface Props {
  params: Promise<{ eventId: string }>
}

export default async function EventEditorPage({ params }: Props) {
  const { eventId } = await params
  const profile = await getUserProfile()
  if (!profile) redirect("/auth/login")

  // Guard: Only institute staff, placement officers, or primary users can edit events
  const allowedRoles = ["institute_primary", "institute_staff", "institute_placement_officer"]
  if (!allowedRoles.includes(profile.account_type)) {
    redirect("/events")
  }

  const isNew = eventId === "new"
  let initialData = null
  let initialCohortIds: string[] = []

  const [cohortOptions] = await Promise.all([getCohortOptionsAction()])

  if (!isNew) {
    const supabase = await createClient()
    let eventQuery = (supabase as any)
      .from("events")
      .select(`*, event_agenda(*)`)
      .eq("id", eventId)

    if (profile.account_type !== "admin") {
      eventQuery = eventQuery.eq("institute_id", profile.institute_id)
    }

    const [{ data: eventData, error }, { data: cohortRows }] = await Promise.all([
      eventQuery.maybeSingle(),
      (supabase as any)
        .from("event_cohorts")
        .select("cohort_id")
        .eq("event_id", eventId),
    ])

    if (error || !eventData) {
      console.error("Error loading event for editing:", error)
      redirect("/events")
    }

    initialCohortIds = (cohortRows ?? []).map((r: any) => r.cohort_id)

    initialData = {
      title: eventData.title,
      description: eventData.description ?? "",
      date: eventData.date ?? "",
      venue: eventData.venue,
      capacity: eventData.capacity,
      status: eventData.status,
      targeting_rules: eventData.targeting_rules ?? { years: [], branches: [] },
      duration_minutes: eventData.duration_minutes ?? 120,
      event_banner: eventData.event_banner ?? null,
      speaker_name: eventData.speaker_name ?? null,
      cohort_ids: initialCohortIds,
      agenda: (eventData.event_agenda ?? [])
        .sort((a: any, b: any) => a.order_index - b.order_index)
        .map((item: any) => ({
          title: item.title,
          description: item.description ?? "",
          start_time: item.start_time,
          order_index: item.order_index,
        })),
    }
  }

  return (
    <CreateEventClient
      eventId={isNew ? undefined : eventId}
      initialData={initialData ?? undefined}
      cohortOptions={cohortOptions}
    />
  )
}
