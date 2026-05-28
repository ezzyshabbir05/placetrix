import { createServerClient } from "@supabase/ssr";
import { cookies, headers } from "next/headers";
import { cache } from "react";
import type { Database } from "@/types/supabase";

/**
 * Creates a fresh server-side Supabase client per request, cached via React.cache.
 * This ensures that multiple Server Components can call createClient() without
 * redundant overhead or inconsistent cookie state.
 *
 * autoRefreshToken and persistSession are disabled here intentionally.
 * Token refresh happens exactly once per request in middleware (proxy.ts)
 * via getSession(). To avoid "Auth flooding" and 504 errors, middleware
 * trusts the cookie session; actual account status re-validation (getUser) 
 * should only be performed once per request by a Server Component or Action.
 */
export const createClient = cache(async () => {
  const cookieStore = await cookies();
  let userAgent: string | null = null;
  let ip: string | null = null;

  try {
    const headersList = await headers();
    userAgent = headersList.get("user-agent");
    // Firebase App Hosting exposes the verified real client IP in x-fah-client-ip.
    // Fall back to x-real-ip, then x-forwarded-for[0].
    const fahClientIp = headersList.get("x-fah-client-ip");
    const xRealIp = headersList.get("x-real-ip");
    const xForwardedFor = headersList.get("x-forwarded-for");
    ip = fahClientIp ?? xRealIp ?? (xForwardedFor ? xForwardedFor.split(",")[0].trim() : null);
  } catch {
    // Ignore error if called outside a request context (e.g. static generation)
  }

  const globalHeaders: Record<string, string> = {};
  if (userAgent) {
    globalHeaders["User-Agent"] = userAgent;
  }
  if (ip) {
    globalHeaders["x-forwarded-for"] = ip;
  }

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // Called from a Server Component — cookies are read-only.
            // Safe to ignore if middleware is refreshing sessions.
          }
        },
      },
      auth: {
        autoRefreshToken: false, // Middleware handles the single refresh per request
        persistSession: false,   // Server has no persistent storage — don't try to save
      },
      global: {
        headers: globalHeaders,
      },
    },
  );
});
