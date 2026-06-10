import { getUserProfile } from "@/lib/supabase/profile";
import { redirect } from "next/navigation";
import { CreateTicketClient } from "./CreateTicketClient";

export default async function CreateTicketPage() {
  const profile = await getUserProfile();
  if (!profile) {
    redirect("/auth/login");
  }

  if (profile.account_type === "admin") {
    redirect("/support");
  }

  return <CreateTicketClient userProfile={profile} />;
}
