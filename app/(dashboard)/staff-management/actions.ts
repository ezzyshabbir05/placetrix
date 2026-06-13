"use server"

import { createClient } from "@/lib/supabase/server"
import { getUserProfile } from "@/lib/supabase/profile"
import { createAdminClient } from "@/lib/supabase/admin"
import { revalidatePath } from "next/cache"

// ─── Types ────────────────────────────────────────────────────────────────────

export interface StaffMember {
  id: string
  email: string
  display_name: string | null
  account_subtype: string | null
  is_active: boolean
  created_at: string
}

export interface CreateStaffInput {
  email: string
  displayName: string
  subtype: "staff" | "tpo"
  password: string
}

// ─── Fetch staff members ──────────────────────────────────────────────────────

export async function getStaffMembers(): Promise<StaffMember[]> {
  const profile = await getUserProfile()
  if (!profile || profile.account_type !== "institute" || profile.account_subtype !== "primary") {
    throw new Error("Unauthorized")
  }

  const supabase = await createClient()

  const [{ data: staff }, { data: tpo }] = await Promise.all([
    (supabase as any)
      .from("staff_profiles")
      .select("institute_id, profiles!inner(id, email, display_name, account_subtype, is_active, created_at)")
      .eq("institute_id", profile.institute_id),
    (supabase as any)
      .from("tpo_profiles")
      .select("institute_id, profiles!inner(id, email, display_name, account_subtype, is_active, created_at)")
      .eq("institute_id", profile.institute_id),
  ])

  const allStaff = [
    ...(staff ?? []).map((s: any) => s.profiles),
    ...(tpo ?? []).map((t: any) => t.profiles)
  ];

  allStaff.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  return allStaff as StaffMember[]
}

// ─── Create staff / TPO account ───────────────────────────────────────────────

export async function createStaffAccount(input: CreateStaffInput): Promise<{ success: boolean; error?: string }> {
  const profile = await getUserProfile()
  if (!profile || profile.account_type !== "institute" || profile.account_subtype !== "primary") {
    return { success: false, error: "Unauthorized" }
  }

  const supabase = await createClient()

  // Check if email already exists
  const { data: existing } = await (supabase as any)
    .from("profiles")
    .select("id")
    .eq("email", input.email.toLowerCase().trim())
    .maybeSingle()

  if (existing) {
    return { success: false, error: "An account with this email already exists." }
  }

  // Create the auth user via Supabase Auth admin API
  const adminSupabase = createAdminClient()
  const { data: signUpData, error: signUpError } = await adminSupabase.auth.admin.createUser({
    email: input.email.toLowerCase().trim(),
    password: input.password,
    email_confirm: true,
    user_metadata: {
      display_name: input.displayName.trim(),
      account_type: "institute",
      account_subtype: input.subtype,
    },
  })

  if (signUpError) {
    console.error("Error creating staff account:", signUpError)
    return { success: false, error: signUpError.message }
  }

  const newUserId = signUpData.user?.id
  if (!newUserId) {
    return { success: false, error: "Failed to create user account." }
  }

  // Update the profiles row with the correct fields using admin client to bypass RLS
  const { error: updateError } = await (adminSupabase as any)
    .from("profiles")
    .update({
      account_type: "institute",
      account_subtype: input.subtype,
      display_name: input.displayName.trim(),
    })
    .eq("id", newUserId)

  if (updateError) {
    console.error("Error updating staff profile:", updateError)
    return { success: false, error: updateError.message }
  }

  // Insert to appropriate role table
  const table = input.subtype === "staff" ? "staff_profiles" : "tpo_profiles";
  const { error: insertError } = await (adminSupabase as any)
    .from(table)
    .insert({ profile_id: newUserId, institute_id: profile.institute_id })

  if (insertError) {
    console.error("Error creating staff role profile:", insertError)
    return { success: false, error: insertError.message }
  }

  revalidatePath("/staff-management")
  return { success: true }
}

// ─── Update staff role ────────────────────────────────────────────────────────

export async function updateStaffRole(
  staffId: string,
  newSubtype: "staff" | "tpo"
): Promise<{ success: boolean; error?: string }> {
  const profile = await getUserProfile()
  if (!profile || profile.account_type !== "institute" || profile.account_subtype !== "primary") {
    return { success: false, error: "Unauthorized" }
  }

  const supabase = await createClient()

  // Verify the staff member belongs to this institute
  const [{ data: isStaff }, { data: isTpo }] = await Promise.all([
    (supabase as any).from("staff_profiles").select("profile_id").eq("profile_id", staffId).eq("institute_id", profile.institute_id).maybeSingle(),
    (supabase as any).from("tpo_profiles").select("profile_id").eq("profile_id", staffId).eq("institute_id", profile.institute_id).maybeSingle()
  ])

  if (!isStaff && !isTpo) {
    return { success: false, error: "Staff member not found." }
  }

  const currentSubtype = isStaff ? "staff" : "tpo"
  if (currentSubtype === newSubtype) {
    return { success: true } // no change
  }

  const adminSupabase = createAdminClient()
  
  // Delete from old table
  const oldTable = currentSubtype === "staff" ? "staff_profiles" : "tpo_profiles";
  await (adminSupabase as any).from(oldTable).delete().eq("profile_id", staffId)

  // Insert to new table
  const newTable = newSubtype === "staff" ? "staff_profiles" : "tpo_profiles";
  await (adminSupabase as any).from(newTable).insert({ profile_id: staffId, institute_id: profile.institute_id })

  const { error } = await (adminSupabase as any)
    .from("profiles")
    .update({ account_subtype: newSubtype })
    .eq("id", staffId)

  if (error) {
    console.error("Error updating staff role:", error)
    return { success: false, error: error.message }
  }

  revalidatePath("/staff-management")
  return { success: true }
}

// ─── Toggle staff active status ───────────────────────────────────────────────

export async function toggleStaffActive(
  staffId: string,
  isActive: boolean
): Promise<{ success: boolean; error?: string }> {
  const profile = await getUserProfile()
  if (!profile || profile.account_type !== "institute" || profile.account_subtype !== "primary") {
    return { success: false, error: "Unauthorized" }
  }

  const supabase = await createClient()

  // Verify the staff member belongs to this institute
  const [{ data: isStaff }, { data: isTpo }] = await Promise.all([
    (supabase as any).from("staff_profiles").select("profile_id").eq("profile_id", staffId).eq("institute_id", profile.institute_id).maybeSingle(),
    (supabase as any).from("tpo_profiles").select("profile_id").eq("profile_id", staffId).eq("institute_id", profile.institute_id).maybeSingle()
  ])

  if (!isStaff && !isTpo) {
    return { success: false, error: "Staff member not found." }
  }

  const adminSupabase = createAdminClient()
  const { error } = await (adminSupabase as any)
    .from("profiles")
    .update({ is_active: isActive })
    .eq("id", staffId)

  if (error) {
    console.error("Error toggling staff status:", error)
    return { success: false, error: error.message }
  }

  revalidatePath("/staff-management")
  return { success: true }
}
