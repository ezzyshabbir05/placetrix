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
//  5. When the user refreshes /maintenance or /connection-error and the system
//     has recovered, they are automatically redirected back to /.
//
// ─────────────────────────────────────────────────────────────────────────────

import { updateSession } from "@/lib/supabase/proxy";
import { type NextRequest, NextResponse } from "next/server";

// ── In-memory maintenance mode cache ──────────────────────────────────────────
// Each serverless instance keeps its own cache. The worst-case propagation
// delay for a toggle is CACHE_TTL_MS (30 s).

type SystemStatus = "online" | "maintenance" | "connection_error";

interface StatusCache {
  value: SystemStatus;
  expiresAt: number;
}

let statusCache: StatusCache | null = null;
const CACHE_TTL_MS = 30_000; // 30 seconds

async function getSystemStatus(): Promise<SystemStatus> {
  const now = Date.now();

  // Return cached value if still fresh
  if (statusCache && now < statusCache.expiresAt) {
    return statusCache.value;
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
      console.error("[status] Failed to fetch app_config:", res.status);
      statusCache = { value: "connection_error", expiresAt: now + CACHE_TTL_MS };
      return "connection_error";
    }

    const rows: { value: unknown }[] = await res.json();
    const active = rows[0]?.value === true;

    const status: SystemStatus = active ? "maintenance" : "online";
    statusCache = { value: status, expiresAt: now + CACHE_TTL_MS };
    return status;
  } catch (err) {
    console.error("[status] Supabase unreachable:", err);
    statusCache = { value: "connection_error", expiresAt: now + CACHE_TTL_MS };
    return "connection_error";
  }
}

// Paths that bypass ALL middleware logic — no status check, no auth guard.
const BYPASS_PREFIXES = ["/_next", "/api/", "/favicon"];

// Paths that get the status check but skip updateSession.
// They must NOT be in BYPASS_PREFIXES so a refresh can detect recovery
// and redirect the user back to / when the system comes back online.
const STATUS_ONLY_PREFIXES = ["/maintenance", "/connection-error"];

function isBypassPath(pathname: string): boolean {
  if (BYPASS_PREFIXES.some((p) => pathname.startsWith(p))) return true;
  // Static files (images, icons, fonts, etc.)
  if (/\.[a-zA-Z0-9]+$/.test(pathname)) return true;
  return false;
}

function isStatusOnlyPath(pathname: string): boolean {
  return STATUS_ONLY_PREFIXES.some((p) => pathname.startsWith(p));
}

export async function proxy(request: NextRequest) {
  // 1. Skip middleware entirely for prefetches.
  // Browsers often ignore Set-Cookie on prefetches, so we shouldn't waste
  // CPU or Supabase Auth hits (invocations) on them.
  const isPrefetch =
    request.headers.get("next-router-prefetch") ||
    request.headers.get("purpose") === "prefetch";
  if (isPrefetch) return NextResponse.next();

  const { pathname } = request.nextUrl;

  // 2. Full bypass — skip status check and auth entirely (/_next, /api/, static files).
  if (isBypassPath(pathname)) return NextResponse.next();

  // 3. Check system status (DB-driven, cached for 30 s).
  //    Also runs on /maintenance and /connection-error so that a page refresh
  //    detects recovery and sends the user back to /.
  //    Use 307 Temporary Redirect — browsers do NOT cache 307, so toggling
  //    maintenance off takes effect immediately without the browser serving
  //    a stale redirect from cache (which 301/302 would risk).
  const systemStatus = await getSystemStatus();

  if (systemStatus === "maintenance") {
    // Already on the maintenance page — render it, don't loop.
    if (pathname.startsWith("/maintenance")) return NextResponse.next();
    return NextResponse.redirect(new URL("/maintenance", request.url), { status: 307 });
  }

  if (systemStatus === "connection_error") {
    // Already on the connection-error page — render it, don't loop.
    if (pathname.startsWith("/connection-error")) return NextResponse.next();
    return NextResponse.redirect(new URL("/connection-error", request.url), { status: 307 });
  }

  // 4. System is online.
  //    If the user is sitting on /maintenance or /connection-error and refreshes,
  //    send them back to the homepage now that the system has recovered.
  if (isStatusOnlyPath(pathname)) {
    return NextResponse.redirect(new URL("/", request.url), { status: 307 });
  }

  // 5. Session refresh + auth route guards (only reached when system is online
  //    and the path is not a status page).
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