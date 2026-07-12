"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { getUserProfile } from "@/lib/supabase/profile"
import { sendTicketEmail } from "@/lib/email"
import type { EventFormData, TicketStatus } from "./types"

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function requireStaff() {
  const profile = await getUserProfile()
  if (!profile) throw new Error("Unauthorized: Please log in.")
  if (!["institute_primary", "institute_staff", "institute_placement_officer", "admin"].includes(profile.account_type)) {
    throw new Error("Unauthorized: Only institute staff can perform this action.")
  }
  return profile
}

async function requireCandidate() {
  const profile = await getUserProfile()
  if (!profile) throw new Error("Unauthorized: Please log in.")
  if (profile.account_type !== "institute_candidate") {
    throw new Error("Only candidates can perform this action.")
  }
  return profile
}

// ─── Staff Actions ────────────────────────────────────────────────────────────

export async function createEventAction(data: EventFormData) {
  const profile = await requireStaff()
  const supabase = await createClient()

  const { data: event, error } = await (supabase as any)
    .from("events")
    .insert({
      institute_id: profile.institute_id,
      title: data.title,
      description: data.description || null,
      date: data.date,
      venue: data.venue,
      capacity: data.capacity,
      status: data.status,
      targeting_rules: data.targeting_rules,
      duration_minutes: data.duration_minutes,
      event_banner: data.event_banner || null,
      speaker_name: data.speaker_name || null,
    })
    .select("id")
    .maybeSingle()

  if (error || !event) {
    console.error("Error creating event:", error)
    throw new Error(error?.message || "Failed to create event.")
  }

  if (data.agenda && data.agenda.length > 0) {
    const agendaRows = data.agenda.map((item) => ({
      event_id: event.id,
      title: item.title,
      description: item.description || null,
      start_time: item.start_time,
      order_index: item.order_index,
    }))
    const { error: agendaError } = await (supabase as any)
      .from("event_agenda")
      .insert(agendaRows)
    if (agendaError) {
      console.error("Error creating event agenda:", agendaError)
      throw new Error("Failed to save event agenda.")
    }
  }

  revalidatePath("/events")
  return { success: true, eventId: event.id }
}

export async function updateEventAction(eventId: string, data: EventFormData) {
  await requireStaff()
  const supabase = await createClient()

  const { error } = await (supabase as any)
    .from("events")
    .update({
      title: data.title,
      description: data.description || null,
      date: data.date,
      venue: data.venue,
      capacity: data.capacity,
      status: data.status,
      targeting_rules: data.targeting_rules,
      duration_minutes: data.duration_minutes,
      event_banner: data.event_banner || null,
      speaker_name: data.speaker_name || null,
    })
    .eq("id", eventId)

  if (error) {
    console.error("Error updating event:", error)
    throw new Error(error.message || "Failed to update event.")
  }

  const { error: deleteError } = await (supabase as any)
    .from("event_agenda")
    .delete()
    .eq("event_id", eventId)

  if (deleteError) {
    console.error("Error deleting old agenda:", deleteError)
    throw new Error("Failed to update event agenda.")
  }

  if (data.agenda && data.agenda.length > 0) {
    const agendaRows = data.agenda.map((item) => ({
      event_id: eventId,
      title: item.title,
      description: item.description || null,
      start_time: item.start_time,
      order_index: item.order_index,
    }))
    const { error: agendaError } = await (supabase as any)
      .from("event_agenda")
      .insert(agendaRows)
    if (agendaError) {
      console.error("Error updating event agenda:", agendaError)
      throw new Error("Failed to save event agenda.")
    }
  }

  revalidatePath("/events")
  revalidatePath(`/events/${eventId}`)
  return { success: true }
}

export async function deleteEventAction(eventId: string) {
  await requireStaff()
  const supabase = await createClient()

  const { error } = await (supabase as any)
    .from("events")
    .delete()
    .eq("id", eventId)

  if (error) {
    console.error("Error deleting event:", error)
    throw new Error(error.message || "Failed to delete event.")
  }

  revalidatePath("/events")
  return { success: true }
}

export async function concludeEventAction(eventId: string) {
  await requireStaff()
  const supabase = await createClient()

  const { error } = await (supabase as any)
    .from("events")
    .update({ status: "Concluded" })
    .eq("id", eventId)

  if (error) {
    console.error("Error concluding event:", error)
    throw new Error(error.message || "Failed to conclude event.")
  }

  revalidatePath("/events")
  revalidatePath(`/events/${eventId}`)
  return { success: true }
}

export async function markAttendanceAction(ticketId: string) {
  await requireStaff()
  const supabase = await createClient()

  // Check if ticket exists and is confirmed
  const { data: ticket, error: fetchError } = await (supabase as any)
    .from("event_tickets")
    .select("id, status, attendance_status, candidate_id")
    .eq("id", ticketId)
    .maybeSingle()

  if (fetchError || !ticket) {
    throw new Error("Ticket not found.")
  }

  if (ticket.status !== "Confirmed") {
    throw new Error("Only confirmed tickets can be checked in.")
  }

  if (ticket.attendance_status === "Present") {
    throw new Error("This attendee has already been checked in.")
  }

  const { error } = await (supabase as any)
    .from("event_tickets")
    .update({ attendance_status: "Present" })
    .eq("id", ticketId)

  if (error) {
    console.error("Error marking attendance:", error)
    throw new Error(error.message || "Failed to mark attendance.")
  }

  revalidatePath("/events")
  return { success: true, candidateId: ticket.candidate_id }
}

// ─── Candidate Actions ────────────────────────────────────────────────────────

export async function rsvpEventAction(eventId: string) {
  const profile = await requireCandidate()
  const supabase = await createClient()

  // 1. Fetch event capacity and targeting rules
  const { data: event } = await (supabase as any)
    .from("events")
    .select("capacity, targeting_rules")
    .eq("id", eventId)
    .maybeSingle()

  if (!event) throw new Error("Event not found.")

  // 2. Enforce targeting rules
  const { data: academic } = await (supabase as any)
    .from("candidate_academic_details")
    .select("passout_year, course:institute_courses(course_name)")
    .eq("profile_id", profile.id)
    .maybeSingle()

  const candidateBranch = academic?.course?.course_name
  const candidateYear = academic?.passout_year
  const rules = event.targeting_rules ?? { years: [], branches: [] }

  if (rules.years && rules.years.length > 0 && (!candidateYear || !rules.years.includes(candidateYear))) {
    throw new Error("You are not eligible for this event (targeting restrictions).")
  }
  if (rules.branches && rules.branches.length > 0 && (!candidateBranch || !rules.branches.includes(candidateBranch))) {
    throw new Error("You are not eligible for this event (targeting restrictions).")
  }

  // 3. Check if candidate already has a ticket
  const { data: existingTicket } = await (supabase as any)
    .from("event_tickets")
    .select("id, status")
    .eq("event_id", eventId)
    .eq("candidate_id", profile.id)
    .maybeSingle()

  if (existingTicket && existingTicket.status !== "Cancelled") {
    throw new Error("You have already RSVP'd for this event.")
  }

  // 4. Check current capacity
  const { count: confirmedCount } = await (supabase as any)
    .from("event_tickets")
    .select("id", { count: "exact", head: true })
    .eq("event_id", eventId)
    .eq("status", "Confirmed")

  const ticketStatus: TicketStatus = (confirmedCount ?? 0) >= event.capacity ? "Waitlisted" : "Confirmed"

  let ticketId: string | undefined

  if (existingTicket && existingTicket.status === "Cancelled") {
    // Reactivate existing ticket
    const { error: updateError } = await (supabase as any)
      .from("event_tickets")
      .update({ status: ticketStatus })
      .eq("id", existingTicket.id)

    if (updateError) {
      console.error("Error reactivating RSVP:", updateError)
      throw new Error(updateError.message || "Failed to RSVP.")
    }
    ticketId = existingTicket.id
  } else {
    // Insert new ticket
    const { data: newTicket, error: insertError } = await (supabase as any)
      .from("event_tickets")
      .insert({
        event_id: eventId,
        candidate_id: profile.id,
        status: ticketStatus,
      })
      .select("id")
      .single()

    if (insertError || !newTicket) {
      console.error("Error creating RSVP:", insertError)
      throw new Error(insertError?.message || "Failed to RSVP.")
    }
    ticketId = newTicket.id
  }

  // Trigger ticket email in the background
  if (ticketId) {
    sendTicketEmail(ticketId).catch((err) => {
      console.error("Error sending RSVP ticket email in background:", err)
    })
  }

  revalidatePath("/events")
  revalidatePath(`/events/${eventId}`)
  return { success: true, status: ticketStatus }
}

export async function cancelRsvpAction(eventId: string) {
  const profile = await requireCandidate()
  const supabase = await createClient()

  // 1. Get the ticket to check if it was Confirmed
  const { data: ticket, error: fetchError } = await (supabase as any)
    .from("event_tickets")
    .select("id, status")
    .eq("event_id", eventId)
    .eq("candidate_id", profile.id)
    .maybeSingle()

  if (fetchError || !ticket) {
    throw new Error("RSVP not found.")
  }

  const wasConfirmed = ticket.status === "Confirmed"

  // 2. Set it to Cancelled
  const { error: cancelError } = await (supabase as any)
    .from("event_tickets")
    .update({ status: "Cancelled" })
    .eq("id", ticket.id)

  if (cancelError) {
    console.error("Error cancelling RSVP:", cancelError)
    throw new Error(cancelError.message || "Failed to cancel RSVP.")
  }

  // 3. Promote oldest waitlisted candidate if a confirmed spot opened up
  if (wasConfirmed) {
    const { data: oldestWaitlist } = await (supabase as any)
      .from("event_tickets")
      .select("id")
      .eq("event_id", eventId)
      .eq("status", "Waitlisted")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle()

    if (oldestWaitlist) {
      const { error: promoteError } = await (supabase as any)
        .from("event_tickets")
        .update({ status: "Confirmed" })
        .eq("id", oldestWaitlist.id)

      if (promoteError) {
        console.error("Error promoting waitlisted candidate:", promoteError)
      } else {
        // Send confirmation email to the promoted candidate
        sendTicketEmail(oldestWaitlist.id).catch((err) => {
          console.error("Error sending promoted RSVP ticket email in background:", err)
        })
      }
    }
  }

  revalidatePath("/events")
  revalidatePath(`/events/${eventId}`)
  return { success: true }
}
