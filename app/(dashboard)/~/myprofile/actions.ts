"use server";

import { createClient } from "@/lib/supabase/server";
import { getUserProfile } from "@/lib/supabase/profile";
import { encryptString } from "@/lib/encryption";
import { revalidatePath } from "next/cache";

export async function updateCandidatePersonalDetails(payload: any) {
  const profile = await getUserProfile();
  if (!profile || profile.account_type !== "candidate") {
    throw new Error("Unauthorized");
  }

  // Ensure users only update their own profile
  if (payload.profile_id !== profile.id) {
    throw new Error("Forbidden: Cannot update another user's profile.");
  }

  // Encrypt the Aadhaar number if it exists and hasn't been masked
  if (payload.aadhaar_number) {
    if (payload.aadhaar_number.includes("*")) {
      // It's a masked version passed from the client, meaning it wasn't changed.
      // Remove it from the payload so we don't overwrite the real encrypted value with the mask.
      delete payload.aadhaar_number;
    } else {
      // It's a new plain-text value, so encrypt it.
      payload.aadhaar_number = encryptString(payload.aadhaar_number);
    }
  }

  const supabase = await createClient();

  const { error } = await (supabase as any)
    .from("candidate_profiles")
    .upsert(payload, { onConflict: "profile_id" });

  if (error) {
    console.error("Supabase Error:", error);
    throw new Error(error.message);
  }

  revalidatePath("/~/myprofile");
  return { success: true };
}
