"use server"

import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getUserProfile as getUser } from "@/lib/supabase/profile"
import { revalidatePath } from "next/cache"
import { sendAccountInviteEmail } from "@/lib/email"

export async function createAccount(params: {
  email: string
  role: "institute_candidate" | "institute_staff" | "institute_placement_officer"
  course_id?: string | null
  passout_year?: number | null
}) {
  const profile = await getUser()
  if (!profile || (profile.account_type !== "institute_primary" && profile.account_type !== "institute_placement_officer")) {
    throw new Error("Unauthorized: Only institute primary or placement officer accounts can create users.")
  }

  const adminClient = createAdminClient()

  // 1. Create the user directly so we can reliably pass user_metadata
  // (GoTrue's generateLink type="invite" often drops metadata payloads in older versions)
  const { data: userData, error: createError } = await adminClient.auth.admin.createUser({
    email: params.email,
    email_confirm: true, // Confirm the email so they don't get stuck in unverified state
    password: crypto.randomUUID(), // Assign a random temp password; they'll set their own via the recovery link
    user_metadata: {
      account_type: params.role,
      institute_id: profile.institute_id,
      course_id: params.course_id || null,
      passout_year: params.passout_year || null,
    }
  })

  if (createError) {
    console.error("Admin API Create User Error:", createError)
    throw new Error(createError.message || "Failed to create account.")
  }

  // 1.5 Workaround for a bug in the Postgres handle_new_user trigger where it forcefully defaults
  // app_metadata.account_type and public.profiles.account_type to 'institute_candidate'.
  // We explicitly overwrite these fields right after creation to ensure the correct role is applied.
  if (userData?.user) {
    await adminClient.auth.admin.updateUserById(userData.user.id, {
      app_metadata: { account_type: params.role }
    })
    
    await (adminClient as any).from("profiles").update({
      account_type: params.role,
      institute_id: profile.institute_id
    }).eq("id", userData.user.id)
  }

  // 2. Generate a password recovery link so the user can securely set their password
  const { data: linkData, error: linkError } = await adminClient.auth.admin.generateLink({
    type: "recovery",
    email: params.email,
    options: {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://placetrix.app'}/auth/change-password?mode=recovery`,
    }
  })

  if (linkError) {
    console.error("Admin API Generate Link Error:", linkError)
    throw new Error(linkError.message || "Account created, but failed to generate invite link.")
  }

  // 3. Send the link via our custom SMTP instead of Supabase Auth SMTP
  if (linkData?.properties?.hashed_token) {
    // Construct a modern PKCE-style link that points to our server-side /auth/confirm route.
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://placetrix.app"
    // Note: Since we generated a 'recovery' link, the type we pass to /auth/confirm is 'recovery'
    const inviteLink = `${baseUrl}/auth/confirm?token_hash=${linkData.properties.hashed_token}&type=recovery`
    
    const emailResult = await sendAccountInviteEmail(params.email, inviteLink, params.role)
    if (!emailResult.success) {
      console.warn("Failed to send invite email, but user was created:", emailResult.error)
      // We don't throw an error here so the account creation still succeeds in the UI, 
      // but the admin might need to manually send the link.
    }
  }

  revalidatePath("/users")

  return { success: true, user: userData.user }
}

export async function getInstituteCourses() {
  const profile = await getUser()
  if (!profile || (profile.account_type !== "institute_primary" && profile.account_type !== "institute_placement_officer")) {
    throw new Error("Unauthorized")
  }

  const supabase = await createClient()
  const { data, error } = await (supabase as any)
    .from("institute_courses")
    .select("id, course_name")
    .eq("institute_id", profile.institute_id)
    .order("course_name", { ascending: true })

  if (error) {
    console.error("Error fetching institute courses:", error)
    throw new Error(error.message)
  }

  return data || []
}
