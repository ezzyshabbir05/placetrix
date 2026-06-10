import { getTicketAction } from "@/app/(dashboard)/gethelp/actions";
import TicketDetailClient from "../../gethelp/[ticketId]/TicketDetailClient";
import { notFound, redirect } from "next/navigation";
import { getUserProfile } from "@/lib/supabase/profile";

export default async function SupportTicketDetailPage(props: { params: Promise<{ ticketId: string }> }) {
  const params = await props.params;

  // Validate user is logged in and is admin
  const profile = await getUserProfile();
  if (!profile || profile.account_type !== "admin") {
    redirect("/home");
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

  return (
    <TicketDetailClient
      initialTicket={data.ticket}
      initialMessages={data.messages}
      userProfile={profile}
    />
  );
}

