import { createClient } from "@supabase/supabase-js"
import type { Database } from "@/types/supabase"

/**
 * Creates a server-side Supabase client using the service role key.
 * This client bypasses RLS and should ONLY be used in secure server contexts
 * (e.g. API routes, Server Actions) for public verification or admin tasks.
 */
export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Missing Supabase URL or Service Role Key in environment variables.")
  }

  return createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}
