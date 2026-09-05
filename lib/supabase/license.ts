"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getUserProfile } from "@/lib/supabase/profile";
import type { UserProfile } from "@/lib/supabase/profile";
import { revalidatePath } from "next/cache";
import { cache } from "react";

// --- Types ---

export type LicenseStatus = "active" | "expired" | "pending" | "revoked" | null;

export interface InstituteLicense {
  status: LicenseStatus;
  plan_name: string | null;
  starts_at: string | null;
  ends_at: string | null;
  institute_name?: string | null;
}

// --- getInstituteLicense ---
export const getInstituteLicense = cache(async (
  institute_id: string
): Promise<InstituteLicense> => {
  try {
    const supabase = await createClient();

    const { data, error } = await (supabase as any)
      .from("institute_licenses")
      .select("status, plan_name, starts_at, ends_at, institutes(institute_name)")
      .eq("institute_id", institute_id)
      .maybeSingle();

    if (error) {
      console.error("[getInstituteLicense] Error fetching license:", error);
      return { status: null, plan_name: null, starts_at: null, ends_at: null, institute_name: null };
    }

    let instName = (data?.institutes as any)?.institute_name ?? null;

    if (!data) {
      if (!instName) {
        const { data: instData } = await (supabase as any)
          .from("institutes")
          .select("institute_name")
          .eq("id", institute_id)
          .maybeSingle();
        instName = instData?.institute_name ?? null;
      }
      return { status: null, plan_name: null, starts_at: null, ends_at: null, institute_name: instName };
    }

    const now = new Date();
    const startsAt = data.starts_at ? new Date(data.starts_at) : null;
    const endsAt = data.ends_at ? new Date(data.ends_at) : null;

    let effectiveStatus: LicenseStatus = data.status as LicenseStatus;
    if (data.status === "active") {
      if (startsAt && startsAt > now) {
        effectiveStatus = "pending";
      } else if (endsAt && endsAt < now) {
        effectiveStatus = "expired";
      }
    }

    return {
      status: effectiveStatus,
      plan_name: data.plan_name ?? null,
      starts_at: data.starts_at ?? null,
      ends_at: data.ends_at ?? null,
      institute_name: instName,
    };
  } catch (e) {
    console.error("[getInstituteLicense] Unexpected error:", e);
    return { status: null, plan_name: null, starts_at: null, ends_at: null, institute_name: null };
  }
});

// --- getLicenseForProfile ---
export async function getLicenseForProfile(
  profile: UserProfile
): Promise<InstituteLicense | null> {
  if (profile.account_type === "admin") return null;

  const institute_id = profile.institute_id;
  if (!institute_id) return null;

  return getInstituteLicense(institute_id);
}

// --- requireActiveLicense ---
export async function requireActiveLicense(
  profile: UserProfile
): Promise<InstituteLicense | null> {
  if (profile.account_type === "admin") return null;

  // (Verification gate removed)

  const license = await getLicenseForProfile(profile);
  const status = license?.status ?? null;

  if (status !== "active") {
    redirect("/home");
  }

  return license;
}

// --- verifyActiveLicense ---
// Helper for API routes and server actions to check active license without Next.js redirects.
// Throws an error if the user's institute has no active license.
export async function verifyActiveLicense(): Promise<void> {
  const profile = await getUserProfile();
  if (!profile) throw new Error("Unauthorized");
  if (profile.account_type === "admin") return; // bypass

  // (Verification gate removed)

  const license = await getLicenseForProfile(profile);
  if (license?.status !== "active") {
    throw new Error("Active institution subscription required");
  }
}

// --- Admin Server Actions ---

// Fetches all institutes and their licenses. Admin role only.
export async function getAllInstitutesAndLicenses() {
  const profile = await getUserProfileAdminCheck();
  if (!profile) throw new Error("Unauthorized");

  const supabase = await createClient();
  const { data, error } = await (supabase as any)
    .from("institutes")
    .select(`
      id,
      institute_name,
      logo_path,
      institute_licenses (
        id,
        status,
        plan_name,
        starts_at,
        ends_at,
        notes
      )
    `)
    .order("institute_name", { ascending: true });

  if (error) {
    console.error("[getAllInstitutesAndLicenses] Database error:", error);
    throw new Error("Failed to fetch institutes and licenses");
  }

  return data || [];
}

// Upserts a license for an institute. Admin role only.
export async function upsertInstituteLicense(payload: {
  institute_id: string;
  status: LicenseStatus;
  plan_name: string;
  starts_at: string | null;
  ends_at: string | null;
  notes: string | null;
}) {
  const profile = await getUserProfileAdminCheck();
  if (!profile) throw new Error("Unauthorized");

  if (payload.starts_at && payload.ends_at && new Date(payload.ends_at) < new Date(payload.starts_at)) {
    throw new Error("End date cannot be earlier than start date");
  }

  const supabase = await createClient();
  const { data, error } = await (supabase as any)
    .from("institute_licenses")
    .upsert({
      institute_id: payload.institute_id,
      status: payload.status,
      plan_name: payload.plan_name,
      starts_at: payload.starts_at,
      ends_at: payload.ends_at,
      notes: payload.notes,
      updated_at: new Date().toISOString(),
    }, { onConflict: "institute_id" })
    .select("id, status, plan_name, starts_at, ends_at, notes")
    .single();

  if (error) {
    console.error("[upsertInstituteLicense] Database error:", error);
    throw new Error(error.message || "Failed to update license");
  }

  revalidatePath("/licenses");

  const now = new Date();
  const startsAt = data.starts_at ? new Date(data.starts_at) : null;
  const endsAt = data.ends_at ? new Date(data.ends_at) : null;

  let effectiveStatus: LicenseStatus = data.status as LicenseStatus;
  if (data.status === "active") {
    if (startsAt && startsAt > now) {
      effectiveStatus = "pending";
    } else if (endsAt && endsAt < now) {
      effectiveStatus = "expired";
    }
  }

  return {
    success: true,
    license: {
      id: data.id,
      status: effectiveStatus,
      plan_name: data.plan_name,
      starts_at: data.starts_at,
      ends_at: data.ends_at,
      notes: data.notes,
    },
  };
}

// Helper to check if current user is admin
async function getUserProfileAdminCheck() {
  try {
    const profile = await getUserProfile();
    if (profile && profile.account_type === "admin") {
      return profile;
    }
  } catch (e) {
    console.error("[getUserProfileAdminCheck] Error:", e);
  }
  return null;
}
