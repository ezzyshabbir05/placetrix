"use server";

import { createClient } from "@/lib/supabase/server";
import { getUserProfile } from "@/lib/supabase/profile";
import { encryptString } from "@/lib/encryption";
import { revalidatePath } from "next/cache";

// Ensure candidate is authenticated and authorized
async function getAuthorizedCandidate() {
  const profile = await getUserProfile();
  if (!profile || profile.account_type !== "institute_candidate") {
    throw new Error("Unauthorized");
  }
  return profile;
}

export async function updateCandidatePersonalDetails(payload: any) {
  const profile = await getAuthorizedCandidate();

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

  revalidatePath("/myprofile");
  return { success: true };
}

// ─── Bio Actions ──────────────────────────────────────────────────────────────

export async function updateCandidateBioAction(bio: string) {
  const profile = await getAuthorizedCandidate();
  const supabase = await createClient();

  const { error } = await (supabase as any)
    .from("candidate_profiles")
    .update({ bio })
    .eq("profile_id", profile.id);

  if (error) {
    console.error("updateCandidateBioAction Error:", error);
    throw new Error(error.message);
  }

  revalidatePath("/myprofile");
  return { success: true };
}

// ─── Experience Actions ───────────────────────────────────────────────────────

export async function saveExperienceAction(payload: any) {
  const profile = await getAuthorizedCandidate();
  const supabase = await createClient();

  const data = {
    ...payload,
    profile_id: profile.id,
    start_date: payload.start_date || null,
    end_date: payload.end_date || null,
  };

  const { error } = await (supabase as any)
    .from("candidate_experiences")
    .upsert(data);

  if (error) {
    console.error("saveExperienceAction Error:", error);
    throw new Error(error.message);
  }

  revalidatePath("/myprofile");
  return { success: true };
}

export async function deleteExperienceAction(id: string) {
  const profile = await getAuthorizedCandidate();
  const supabase = await createClient();

  const { error } = await (supabase as any)
    .from("candidate_experiences")
    .delete()
    .eq("id", id)
    .eq("profile_id", profile.id);

  if (error) {
    console.error("deleteExperienceAction Error:", error);
    throw new Error(error.message);
  }

  revalidatePath("/myprofile");
  return { success: true };
}

// ─── Project Actions ──────────────────────────────────────────────────────────

export async function saveProjectAction(payload: any) {
  const profile = await getAuthorizedCandidate();
  const supabase = await createClient();

  const data = {
    ...payload,
    profile_id: profile.id,
    start_date: payload.start_date || null,
    end_date: payload.end_date || null,
  };

  const { error } = await (supabase as any)
    .from("candidate_projects")
    .upsert(data);

  if (error) {
    console.error("saveProjectAction Error:", error);
    throw new Error(error.message);
  }

  revalidatePath("/myprofile");
  return { success: true };
}

export async function deleteProjectAction(id: string) {
  const profile = await getAuthorizedCandidate();
  const supabase = await createClient();

  const { error } = await (supabase as any)
    .from("candidate_projects")
    .delete()
    .eq("id", id)
    .eq("profile_id", profile.id);

  if (error) {
    console.error("deleteProjectAction Error:", error);
    throw new Error(error.message);
  }

  revalidatePath("/myprofile");
  return { success: true };
}

// ─── Certification Actions ────────────────────────────────────────────────────

export async function saveCertificationAction(payload: any) {
  const profile = await getAuthorizedCandidate();
  const supabase = await createClient();

  const data = {
    ...payload,
    profile_id: profile.id,
    issue_date: payload.issue_date || null,
    expiration_date: payload.expiration_date || null,
  };

  const { error } = await (supabase as any)
    .from("candidate_certifications")
    .upsert(data);

  if (error) {
    console.error("saveCertificationAction Error:", error);
    throw new Error(error.message);
  }

  revalidatePath("/myprofile");
  return { success: true };
}

export async function deleteCertificationAction(id: string) {
  const profile = await getAuthorizedCandidate();
  const supabase = await createClient();

  const { error } = await (supabase as any)
    .from("candidate_certifications")
    .delete()
    .eq("id", id)
    .eq("profile_id", profile.id);

  if (error) {
    console.error("deleteCertificationAction Error:", error);
    throw new Error(error.message);
  }

  revalidatePath("/myprofile");
  return { success: true };
}
