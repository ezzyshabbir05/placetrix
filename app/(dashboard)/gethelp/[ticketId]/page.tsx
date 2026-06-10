import { getTicketAction } from "@/app/(dashboard)/gethelp/actions";
import TicketDetailClient from "./TicketDetailClient";
import { notFound, redirect } from "next/navigation";
import { getUserProfile } from "@/lib/supabase/profile";

export default async function GetHelpTicketDetailPage(props: { params: Promise<{ ticketId: string }> }) {
  const params = await props.params;

  // Validate user is logged in
  const profile = await getUserProfile();
  if (!profile) {
    redirect("/auth/login");
  }

  // Redirect admin to support route
  if (profile.account_type === "admin") {
    redirect(`/support/${params.ticketId}`);
  }

  // Validate ticketId is a UUID to prevent malformed requests
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(params.ticketId)) {
    return notFound();
  }

  const data = await getTicketAction(params.ticketId);
  if (!data) {
    return notFound();
  }

  // Double check that this ticket belongs to the user
  if (data.ticket.user_id !== profile.id) {
    return notFound();
  }

  return (
    <TicketDetailClient
      initialTicket={data.ticket}
      initialMessages={data.messages}
      userProfile={profile}
    />
  );
}

