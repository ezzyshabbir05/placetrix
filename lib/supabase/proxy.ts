// lib/supabase/middleware.ts
//
// Session refresh + route-protection logic called by /middleware.ts.
//
// Separated here so it can be unit-tested independently of the Next.js
// middleware edge runtime.

import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// ─── Route rules ──────────────────────────────────────────────────────────────

/** Routes that require an authenticated session. */
const PROTECTED_PATHS = [
  "/home",
  "/courses",
  "/tests",
  "/events",
  "/logiclab",
  "/opportunities",
  "/users",
  "/licenses",
  "/analytics",
  "/support",
  "/candidates",
  "/notifications",
  "/settings",
  "/gethelp",
  "/groups",
  "/myprofile",
] as const;


/** Routes that should NOT be visited while authenticated. */
const AUTH_PATHS = ["/auth"] as const;

/**
 * Auth sub-routes that are part of a flow and must be reachable even when
 * the user has an active session (e.g. MFA challenge, OAuth callback, confirm).
 */
const AUTH_FLOW_PATHS = ["/auth/callback", "/auth/confirm", "/auth/mfa", "/auth/change-password", "/auth/error"] as const;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isProtected(pathname: string): boolean {
  return PROTECTED_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

function isAuthPage(pathname: string): boolean {
  return AUTH_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

function isAuthFlowPage(pathname: string): boolean {
  return AUTH_FLOW_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

// ─── updateSession ─────────────────────────────────────────────────────────────

export async function updateSession(request: NextRequest): Promise<NextResponse> {
  const { pathname } = request.nextUrl;

  // Start with a plain pass-through response.
  let supabaseResponse = NextResponse.next({ request });

  const userAgent = request.headers.get("user-agent");
  // Firebase App Hosting exposes the verified real client IP in x-fah-client-ip.
  // Fall back to x-real-ip, then to x-forwarded-for[0] (first non-proxy IP in the chain).
  const fahClientIp = request.headers.get("x-fah-client-ip");
  const xRealIp = request.headers.get("x-real-ip");
  const xForwardedFor = request.headers.get("x-forwarded-for");
  const ip = fahClientIp ?? xRealIp ?? (xForwardedFor ? xForwardedFor.split(",")[0].trim() : null);

  const globalHeaders: Record<string, string> = {};
  if (userAgent) {
    globalHeaders["User-Agent"] = userAgent;
  }
  if (ip) {
    globalHeaders["x-forwarded-for"] = ip;
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: any }[]) {
          // Write updated cookies back onto the request object …
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );

          const refreshedHeaders = new Headers(request.headers);
          refreshedHeaders.set("x-supabase-refreshed", "true");

          supabaseResponse = NextResponse.next({ 
            request: { headers: refreshedHeaders } 
          });

          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
      global: {
        headers: globalHeaders,
      },
      auth: {
        // @ts-ignore - this flag exists in newer versions to disable the warning
        suppressGetSessionWarning: true,
      },
    }
  );


  // 1. Local claim check (Fast path)
  const { data: claimsData } = await supabase.auth.getClaims();
  let user = claimsData?.claims ?? null;

  // 2. Fallback refresh
  if (!user) {
    const hasAuthCookie = request.cookies.getAll().some((c) =>
      c.name.includes("auth-token")
    );

    if (hasAuthCookie) {
      try {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (authUser) {
          user = { ...authUser, sub: authUser.id } as any;
        }
      } catch (e) {
        console.error("[Middleware] Refresh exception:", e);
      }
    }
  }

  // ── Protection: Redirects ──────────────────────────────────────────────────

  // 3a. No session → redirect to login (GET only to avoid double-redirect on POST)
  if (isProtected(pathname) && !user && request.method === "GET") {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/auth/login";
    loginUrl.searchParams.set("next", pathname);
    const redirectRes = NextResponse.redirect(loginUrl);
    redirectRes.headers.set("Cache-Control", "no-store, max-age=0");
    supabaseResponse.cookies.getAll().forEach((c) => {
      const { name, value, ...options } = c;
      redirectRes.cookies.set(name, value, options);
    });
    return redirectRes;
  }

  // 3b. Session present on protected route — check MFA assurance level.
  //     If the user has enrolled MFA (nextLevel=aal2) but this session hasn't verified
  //     it yet (currentLevel=aal1), redirect to the TOTP challenge page.
  //     This covers BOTH password logins and Google OAuth logins.
  //     getAuthenticatorAssuranceLevel() is documented as "very fast, rarely uses network."
  if (isProtected(pathname) && user && request.method === "GET" && (user as any).aal !== "aal2") {
    const { data: aalData } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (aalData?.currentLevel === "aal1" && aalData?.nextLevel === "aal2") {
      const mfaUrl = request.nextUrl.clone();
      mfaUrl.pathname = "/auth/mfa";
      mfaUrl.searchParams.set("next", pathname);
      const redirectRes = NextResponse.redirect(mfaUrl);
      redirectRes.headers.set("Cache-Control", "no-store, max-age=0");
      supabaseResponse.cookies.getAll().forEach((c) => {
        const { name, value, ...options } = c;
        redirectRes.cookies.set(name, value, options);
      });
      return redirectRes;
    }
  }

  // 3c. Authenticated user visits an auth page (e.g. /auth/login) → send to dashboard.
  //     Exception: flow pages like /auth/callback, /auth/confirm, /auth/mfa are always allowed.
  if (isAuthPage(pathname) && !isAuthFlowPage(pathname) && user) {
    const homeUrl = request.nextUrl.clone();
    homeUrl.pathname = "/home";
    homeUrl.search = "";
    const redirectRes = NextResponse.redirect(homeUrl);
    redirectRes.headers.set("Cache-Control", "no-store, max-age=0");
    supabaseResponse.cookies.getAll().forEach((c) => {
      const { name, value, ...options } = c;
      redirectRes.cookies.set(name, value, options as any);
    });
    return redirectRes;
  }

  return supabaseResponse;
}