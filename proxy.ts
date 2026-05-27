// middleware.ts
//
// ── What this file does ────────────────────────────────────────────────────────
//
//  1. Refreshes the Supabase session cookie on every request so it never
//     silently expires mid-session.
//  2. Redirects unauthenticated visitors away from protected routes.
//  3. Redirects authenticated visitors away from auth pages (login, sign-up …).
//  4. Checks a database-driven maintenance mode flag (app_config table) and
//     redirects all traffic to /maintenance when active. The flag value is
//     cached in-memory for 30 seconds to avoid hitting Supabase on every
//     request while still allowing near-instant toggling without redeploying.
//     If Supabase itself is unreachable, maintenance mode is activated
//     automatically — the whole app depends on Supabase, so an unreachable DB
//     is effectively downtime.
//
// ─────────────────────────────────────────────────────────────────────────────

import { updateSession } from "@/lib/supabase/proxy";
import { type NextRequest, NextResponse } from "next/server";

// ── In-memory maintenance mode cache ──────────────────────────────────────────
// Each serverless instance keeps its own cache. The worst-case propagation
// delay for a toggle is CACHE_TTL_MS (30 s).

interface MaintenanceCache {
  value: boolean;
  expiresAt: number;
}

let maintenanceCache: MaintenanceCache | null = null;
const CACHE_TTL_MS = 30_000; // 30 seconds

async function isMaintenanceModeActive(): Promise<boolean> {
  const now = Date.now();

  // Return cached value if still fresh
  if (maintenanceCache && now < maintenanceCache.expiresAt) {
    return maintenanceCache.value;
  }

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

    const res = await fetch(
      `${supabaseUrl}/rest/v1/app_config?key=eq.maintenance_mode&select=value`,
      {
        headers: {
          apikey: supabaseAnonKey,
          Authorization: `Bearer ${supabaseAnonKey}`,
        },
        // Do not cache at the fetch layer — we handle caching ourselves
        cache: "no-store",
      }
    );

    if (!res.ok) {
      // Supabase returned an error — the DB is unavailable or degraded.
      // Since the whole app depends on Supabase, show the maintenance page.
      console.error("[maintenance] Failed to fetch app_config:", res.status);
      return true;
    }

    const rows: { value: unknown }[] = await res.json();
    const active = rows[0]?.value === true;

    maintenanceCache = { value: active, expiresAt: now + CACHE_TTL_MS };
    return active;
  } catch (err) {
    // Network error — Supabase is unreachable. The whole app depends on it,
    // so activate maintenance mode automatically.
    console.error("[maintenance] Supabase unreachable, activating maintenance mode:", err);
    return true;
  }
}

// Paths that should never be intercepted by maintenance mode
const MAINTENANCE_BYPASS_PREFIXES = [
  "/maintenance",
  "/_next",
  "/api/",
  "/favicon",
];

function isBypassPath(pathname: string): boolean {
  if (MAINTENANCE_BYPASS_PREFIXES.some((p) => pathname.startsWith(p))) {
    return true;
  }
  // Static files (images, icons, fonts, etc.)
  if (/\.[a-zA-Z0-9]+$/.test(pathname)) {
    return true;
  }
  return false;
}

export async function proxy(request: NextRequest) {
  // 1. Skip middleware entirely for prefetches.
  // Browsers often ignore Set-Cookie on prefetches, so we shouldn't waste
  // CPU or Supabase Auth hits (invocations) on them.
  const isPrefetch =
    request.headers.get("next-router-prefetch") ||
    request.headers.get("purpose") === "prefetch";
  if (isPrefetch) {
    return NextResponse.next();
  }

  // 2. Check maintenance mode (DB-driven, cached for 30 s)
  const { pathname } = request.nextUrl;

  if (!isBypassPath(pathname)) {
    const inMaintenance = await isMaintenanceModeActive();

    if (inMaintenance) {
      // Rewrite to /maintenance so the URL stays the same in the browser
      return NextResponse.rewrite(new URL("/maintenance", request.url));
    }
  }

  // 3. Session refresh + auth route guards
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Run middleware on all routes except Next.js internals and static files.
     * This is required so maintenance mode can intercept any page, not just
     * the protected routes below.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?|ttf|otf)$).*)",
  ],
};
