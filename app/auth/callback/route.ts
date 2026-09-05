import { createClient } from "@/lib/supabase/server";
import { NextResponse, type NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");

  // Validate redirect target — strictly enforce relative paths and disallow protocol-relative // or \\ exploits.
  const sanitizeNext = (target: string | null): string => {
    if (!target) return "/home";
    if (!target.startsWith("/") || target.startsWith("//") || target.startsWith("/\\")) {
      return "/home";
    }
    if (target.startsWith("/auth/") && target !== "/auth/mfa" && target !== "/auth/change-password") {
      return "/home";
    }
    return target;
  };

  const nextParam = searchParams.get("next");
  const safeNext = sanitizeNext(nextParam);

  const getBaseUrl = () => {
    const requestUrl = new URL(request.url);
    // If the request came to localhost, keep it on localhost
    if (requestUrl.hostname === "localhost" || requestUrl.hostname === "127.0.0.1") {
      return `${requestUrl.protocol}//${requestUrl.host}`;
    }

    // Check forwarded headers from reverse proxy (Firebase App Hosting, Cloud Run, Nginx)
    const forwardedHost = request.headers.get("x-forwarded-host");
    const forwardedProto = request.headers.get("x-forwarded-proto") ?? "https";
    if (forwardedHost) {
      return `${forwardedProto}://${forwardedHost}`;
    }

    let url =
      process.env.NEXT_PUBLIC_SITE_URL ?? // Set this to https://placetrix.app in prod
      process.env.NEXT_PUBLIC_VERCEL_URL ?? // Automatically set by Vercel (if you ever use it)
      requestUrl.origin; // Dynamic origin fallback
    
    // Ensure it includes `https://`
    url = url.startsWith("http") ? url : `https://${url}`;
    // Remove trailing slash if present
    return url.charAt(url.length - 1) === "/" ? url.slice(0, -1) : url;
  };

  const baseUrl = getBaseUrl();

  const redirectWithNoCache = (url: string) => {
    const res = NextResponse.redirect(url);
    res.headers.set("Cache-Control", "no-store, max-age=0");
    return res;
  };

  if (!code) {
    return redirectWithNoCache(
      `${baseUrl}/auth/error?error=${encodeURIComponent(
        "No authorisation code returned from provider."
      )}`
    );
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    console.error("[auth/callback] exchangeCodeForSession error:", error.message);
    return redirectWithNoCache(
      `${baseUrl}/auth/error?error=${encodeURIComponent(error.message)}`
    );
  }

  // Check if user has MFA enrolled and needs verification.
  // Direct redirect avoids a secondary middleware bounce through /home.
  const { data: aalData } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (aalData?.currentLevel === "aal1" && aalData?.nextLevel === "aal2") {
    return redirectWithNoCache(
      `${baseUrl}/auth/mfa?next=${encodeURIComponent(safeNext)}`
    );
  }

  return redirectWithNoCache(`${baseUrl}${safeNext}`);
}