// app/auth/confirm/route.ts
//
// Fallback handler for LINK-based email flows (token_hash method).
// Device-independent — no PKCE verifier required, so links work on any device.
//
// Triggered when a user clicks a link in:
//   - Signup confirmation email  (type=signup)
//   - Password reset email       (type=recovery)
//   - Email change email         (type=email_change)
//   - Magic link email           (type=magiclink)
//
// The primary OTP flow (user types a code) is handled entirely client-side
// via supabase.auth.verifyOtp(). This route only handles clicked links.
//
// ── Email template variables ──────────────────────────────────────────────────
//
//  To support BOTH a code and a clickable link in the same email:
//
//  Confirm signup:
//    Code: {{ .Token }}
//    Link: {{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=signup&next=/~
//
//  Reset password:
//    Code: {{ .Token }}
//    Link: {{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery
//
// ─────────────────────────────────────────────────────────────────────────────

import { createClient } from "@/lib/supabase/server";
import { type EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = searchParams.get("next");

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

  const safeNext = sanitizeNext(next);

  // Explicitly define your base URL using an environment variable or request url.
  // This bypasses the Docker 0.0.0.0 internal binding issue entirely.
  const getBaseUrl = () => {
    const requestUrl = new URL(request.url);
    if (requestUrl.hostname === "localhost" || requestUrl.hostname === "127.0.0.1") {
      return `${requestUrl.protocol}//${requestUrl.host}`;
    }
    let url =
      process.env.NEXT_PUBLIC_SITE_URL ??
      process.env.NEXT_PUBLIC_VERCEL_URL ??
      "http://localhost:3000";
    url = url.startsWith("http") ? url : `https://${url}`;
    return url.charAt(url.length - 1) === "/" ? url.slice(0, -1) : url;
  };

  const baseUrl = getBaseUrl();

  if (!token_hash || !type) {
    return NextResponse.redirect(
      `${baseUrl}/auth/error?error=${encodeURIComponent(
        "Invalid verification link — missing token or type."
      )}`
    );
  }

  const supabase = await createClient();
  // Map "magiclink" to "email" for GoTrue verification compatibility
  const verifyType = type === "magiclink" ? "email" : type;
  const { error } = await supabase.auth.verifyOtp({ type: verifyType, token_hash });

  if (error) {
    console.error("[auth/confirm] verifyOtp error:", error.message);
    return NextResponse.redirect(
      `${baseUrl}/auth/error?error=${encodeURIComponent(error.message)}`
    );
  }

  // Recovery and Invite tokens → change-password so the user can set their password.
  // "invite" arrives when an admin provisions an account via inviteUserByEmail();
  // without this, the invited user reaches /home with no password ever set.
  if (type === "recovery" || type === "invite") {
    return NextResponse.redirect(
      `${baseUrl}/auth/change-password?mode=recovery`
    );
  }

  return NextResponse.redirect(`${baseUrl}${safeNext}`);
}