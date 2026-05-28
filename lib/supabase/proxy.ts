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
const PROTECTED_PATHS = ["/~"] as const;

/** Routes that should NOT be visited while authenticated. */
const AUTH_PATHS = ["/auth"] as const;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isProtected(pathname: string): boolean {
  return PROTECTED_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

function isAuthPage(pathname: string): boolean {
  return AUTH_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"));
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
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
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
  
  if (isProtected(pathname) && !user && request.method === "GET") {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/auth/login";
    loginUrl.searchParams.set("next", pathname);
    const redirectRes = NextResponse.redirect(loginUrl);
    supabaseResponse.cookies.getAll().forEach((c) => {
      const { name, value, ...options } = c;
      redirectRes.cookies.set(name, value, options);
    });
    return redirectRes;
  }

  const isFlowRoute = pathname.includes("/auth/callback") || pathname.includes("/auth/confirm");

  if (isAuthPage(pathname) && !isFlowRoute && user) {
    const homeUrl = request.nextUrl.clone();
    homeUrl.pathname = "/~";
    homeUrl.search = ""; 
    const redirectRes = NextResponse.redirect(homeUrl);
    supabaseResponse.cookies.getAll().forEach((c) => {
      const { name, value, ...options } = c;
      redirectRes.cookies.set(name, value, options as any);
    });
    return redirectRes;
  }

  return supabaseResponse;
}