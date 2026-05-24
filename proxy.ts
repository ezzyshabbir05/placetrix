// middleware.ts
//
// ── What this file does ────────────────────────────────────────────────────────
//
//  1. Refreshes the Supabase session cookie on every request so it never
//     silently expires mid-session.
//  2. Redirects unauthenticated visitors away from protected routes.
//  3. Redirects authenticated visitors away from auth pages (login, sign-up …).
//
// ─────────────────────────────────────────────────────────────────────────────

import { updateSession } from "@/lib/supabase/proxy";
import { type NextRequest, NextResponse } from "next/server";

export async function proxy(request: NextRequest) {
  // 1. Skip middleware entirely for prefetches. 
  // Browsers often ignore Set-Cookie on prefetches, so we shouldn't waste 
  // CPU or Supabase Auth hits (invocations) on them.
  const isPrefetch = request.headers.get("next-router-prefetch") ||
    request.headers.get("purpose") === "prefetch";
  if (isPrefetch) {
    return NextResponse.next();
  }

  // 2. Check for maintenance mode first
  const isMaintenanceMode = process.env.NEXT_PUBLIC_MAINTENANCE_MODE === "true";

  if (isMaintenanceMode) {
    const { pathname } = request.nextUrl;

    // Don't intercept the maintenance page itself or static assets
    if (
      pathname !== '/maintenance' &&
      !pathname.startsWith('/_next') &&
      !pathname.includes('/api/') &&
      !pathname.includes('.') // for images, icons, etc.
    ) {
      return NextResponse.rewrite(new URL('/maintenance', request.url));
    }
  }

  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Only run middleware for:
     *   - Protected app routes ( /~/* )
     *   - Authentication routes ( /auth/* )
     */
    '/~/:path*',
    '/auth/:path*',
  ],
};

