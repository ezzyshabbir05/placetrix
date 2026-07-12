"use server";

import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/supabase";
import { SupabaseClient } from "@supabase/supabase-js";
import { getUserProfile } from "@/lib/supabase/profile";
import { sendNewSupportTicketNotification, sendTicketCreatorConfirmation } from "@/lib/email";

export async function createTicketAction(data: { title: string; description: string; email: string }) {
  const profile = await getUserProfile();
  if (!profile) {
    throw new Error("You must be logged in to create a ticket.");
  }
  const userId = profile.id;
  const supabase = await createClient() as SupabaseClient<Database>;

  const { data: ticket, error } = await supabase
    .from("tickets")
    .insert({
      title: data.title,
      description: data.description,
      email: data.email,
      user_id: userId,
      status: "open",
    })
    .select("id")
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  // Fire-and-forget: send both emails in parallel
  if (ticket) {
    const emailPayload = {
      id: ticket.id,
      title: data.title,
      description: data.description,
      email: data.email,
      userName: profile.full_name ?? undefined,
    };

    Promise.allSettled([
      sendNewSupportTicketNotification(emailPayload),
      sendTicketCreatorConfirmation(emailPayload),
    ]).then((results) => {
      results.forEach((r, i) => {
        if (r.status === "rejected") {
          console.error(`[createTicketAction] Email #${i} failed:`, r.reason);
        }
      });
    });
  }

  return ticket;
}

export async function getTicketAction(ticketId: string) {
  const profile = await getUserProfile();
  if (!profile) {
    return null;
  }
  const userId = profile.id;
  const isAdmin = profile.account_type === "admin";
  const supabase = await createClient() as SupabaseClient<Database>;

  let query = supabase.from("tickets").select("*, profiles(avatar_path, full_name, email)").eq("id", ticketId);
  if (!isAdmin) {
    query = query.eq("user_id", userId);
  }
  
  const { data: ticket, error: ticketError } = await query.maybeSingle();

  if (ticketError || !ticket) {
    return null;
  }

  const { data: messages, error: messagesError } = await supabase
    .from("ticket_messages")
    .select("*, profiles(avatar_path, full_name, email)")
    .eq("ticket_id", ticketId)
    .order("created_at", { ascending: true });

  if (messagesError) {
    throw new Error(messagesError.message);
  }

  return { ticket, messages };
}

export async function addTicketMessageAction(ticketId: string, message: string) {
  const profile = await getUserProfile();
  if (!profile) {
    throw new Error("You must be logged in to reply.");
  }
  const userId = profile.id;
  const supabase = await createClient() as SupabaseClient<Database>;

  // Verify the ticket exists and user has access
  const { data: ticket, error: ticketError } = await supabase
    .from("tickets")
    .select("id")
    .eq("id", ticketId)
    .maybeSingle();

  if (ticketError || !ticket) {
    throw new Error("Ticket not found or access denied.");
  }

  const isAdmin = profile.account_type === "admin";
  const sender_type = isAdmin ? "support" : "user";

  const { error } = await supabase
    .from("ticket_messages")
    .insert({
      ticket_id: ticketId,
      message,
      sender_type,
      user_id: userId,
    });

  if (error) {
    throw new Error(error.message);
  }

  return true;
}

export async function validateTicketAction(ticketInput: string) {
  const profile = await getUserProfile();
  if (!profile) {
    throw new Error("You must be logged in to track a ticket.");
  }
  const userId = profile.id;
  const isAdmin = profile.account_type === "admin";
  const supabase = await createClient() as SupabaseClient<Database>;

  const input = ticketInput.trim();
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(input);

  let query = supabase.from("tickets").select("id").limit(1);
  if (isUuid) {
    query = query.eq("id", input);
  } else {
    query = query.eq("ticket_number", input);
  }
  
  if (!isAdmin) {
    query = query.eq("user_id", userId);
  }

  const { data, error } = await query.maybeSingle();

  if (error || !data) {
    throw new Error("Invalid Ticket ID or Number, or you do not have permission to view it.");
  }

  return data.id;
}

export async function getMyTicketsAction() {
  const profile = await getUserProfile();
  if (!profile) {
    return [];
  }
  const userId = profile.id;
  const isAdmin = profile.account_type === "admin";
  const supabase = await createClient() as SupabaseClient<Database>;

  let query = supabase.from("tickets").select("*");
  if (!isAdmin) {
    query = query.eq("user_id", userId);
  }

  const { data, error } = await query.order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function updateTicketStatusAction(ticketId: string, status: "open" | "in_progress" | "resolved" | "closed") {
  const profile = await getUserProfile();
  if (!profile) {
    throw new Error("Not authenticated");
  }

  if (profile.account_type !== "admin") {
    throw new Error("Unauthorized. Only admins can update ticket status.");
  }
  const supabase = await createClient() as SupabaseClient<Database>;

  const { error } = await supabase
    .from("tickets")
    .update({ status })
    .eq("id", ticketId);

  if (error) {
    throw new Error(error.message);
  }

  return true;
}
