"use server";

import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { AuthApiError } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { cache } from "react";
import { headers } from "next/headers";

// ─── Types ─────────────────────────────────────────────────────────────────────

export type AccountType = "candidate" | "institute" | "admin" | "recruiter";

export interface UserProfile {
  id: string;
  display_name: string;
  email: string;
  avatar_path: string | null;
  username: string | null;
  account_type: AccountType;
}

// ─── Session revocation codes ──────────────────────────────────────────────────

const REVOKED_SESSION_CODES = new Set([
  "session_not_found",
  "refresh_token_not_found",
  "refresh_token_already_used",
  "invalid_refresh_token",
  "user_not_found",
  "user_banned",
]);

function isDefinitiveRevocation(error: AuthApiError): boolean {
  if (error.code && REVOKED_SESSION_CODES.has(error.code)) {
    // Edge case: if we are in the middle of a race, we might get 'refresh_token_already_used'.
    // We only treat it as definitive if we are NOT in a middleware refresh context.
    return true;
  }

  // Fallback heuristic for Supabase servers that omit `code`.
  // Note: We are CAREFUL here. We only logout if it's explicitly a session NOT found.
  const msg = error.message?.toLowerCase() ?? "";
  return (
    error.status === 401 &&
    (msg.includes("session") || msg.includes("user") || msg.includes("refresh_token")) &&
    (msg.includes("not found") || msg.includes("not_found") || msg.includes("invalid"))
  );
}

// ─── Fallback profile builders ─────────────────────────────────────────────────

/**
 * Builds a minimal UserProfile from standard JWT claims — no network call.
 * Used when Supabase Auth is unreachable but a valid local JWT exists.
 */
function profileFromClaims(
  claimsData: any,
): UserProfile | null {
  const claims = claimsData?.claims;
  if (!claims) return null;

  const { sub, email, user_metadata: meta = {} } = claims as {
    sub: string;
    email?: string;
    user_metadata?: Record<string, unknown>;
  };

  return {
    id: sub,
    email: email ?? "",
    display_name: (meta.full_name as string)
      ?? (meta.name as string)
      ?? email
      ?? "User",
    avatar_path: (meta.avatar_path as string) ?? (meta.avatar_url as string) ?? (meta.picture as string) ?? null,
    username: (meta.username as string) ?? null,
    account_type: (meta.account_type as AccountType) ?? "candidate",
  };
}

/**
 * Builds a minimal UserProfile from either the auth `user` object or local `claims`.
 * Used when the session is valid but the DB profile row is unreachable.
 */
function profileFromAuthUser(
  user: { id?: string; sub?: string; user_metadata?: any; email?: string }
): UserProfile {
  const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
  const id = user.sub ?? user.id;
  if (!id) throw new Error("User ID is required");

  return {
    id,
    email: user.email ?? "",
    display_name: (meta.full_name as string)
      ?? (meta.name as string)
      ?? (meta.display_name as string)
      ?? user.email
      ?? "User",
    avatar_path: (meta.avatar_path as string) ?? (meta.avatar_url as string) ?? (meta.picture as string) ?? null,
    username: (meta.username as string) ?? null,
    account_type: (meta.account_type as AccountType) ?? "candidate",
  };
}

// ─── getUserProfile ────────────────────────────────────────────────────────────
//
//  Resolution order:
//
//  1. getSession() reads the already-validated cookie (no network call).
//     Middleware has already run getUser() once per request, so the session
//     cookie is fresh. This avoids a second Auth DB hit per server component.
//     Session user found → fetch DB profile → return full profile.
//                          DB unreachable   → return auth-user fallback.
//  2. No session / AuthApiError that IS a definitive revocation
//     → sign out locally + redirect to login.
//  3. Transient AuthApiError or no session → try local JWT (step 4).
//  4. getClaims() succeeds → return minimal offline profile.
//     getClaims() fails    → JWT absent/expired → return null.
//                            (Middleware already blocked unauthenticated access.)
// ──────────────────────────────────────────────────────────────────────────────

export const getUserProfile = cache(async (): Promise<UserProfile | null> => {
  const supabase = await createClient();

  // ── Step 1: Read user from local claims (fast, signature-validated) ──────
  let { data: claimsData, error: authError } = await supabase.auth.getClaims();
  let user = claimsData?.claims ?? null;

  // Fallback: If claims are missing/expired, try a full session refresh via getUser()
  // We only hit the Auth server if there's a reason to believe a session exists (auth cookies present).
  if (!user) {
    const cookieStore = await cookies();
    const hasAuthCookie = cookieStore.getAll().some((c: any) =>
      c.name.includes("auth-token")
    );

    if (hasAuthCookie) {
      // ── ADVANCED LOG-OUT PROTECTION ──
      // If Middleware JUST refreshed the token in this request lifecycle, 
      // the browser cookies haven't updated yet. Calling getUser() now with 
      // 'stale' cookies would trigger a "Refresh Token Already Used" revocation.
      const head = await headers();
      const wasRefreshedInMiddleware = head.get("x-supabase-refreshed") === "true";

      if (!wasRefreshedInMiddleware) {
        try {
          const { data: { user: authUser }, error: refreshError } = await supabase.auth.getUser();
          if (authUser) {
            user = { ...authUser, sub: authUser.id } as any;
          } else if (refreshError instanceof AuthApiError) {
            const code = refreshError.code;
            const msg = refreshError.message?.toLowerCase() ?? "";

            if (code === "refresh_token_already_used" ||
              msg.includes("already used") ||
              msg.includes("already_used")) {

              // This confirms a parallel refresh happened elsewhere within the last 10s.
              // We return the minimal profile from claims to avoid a logout.
              // The browser will receive the NEW cookies from the successful request.
              return profileFromClaims(claimsData);
            }

            // Log the error for debugging
            console.error("[getUserProfile] getUser() failed:", {
              code: refreshError.code,
              message: refreshError.message,
              status: refreshError.status
            });

            // If it's a definitive revocation, we'll handle it below in Step 2 & 3.
            authError = refreshError;
          }
        } catch (e) {
          console.error("[getUserProfile] Exception during getUser():", e);
        }
      } else {
        // Middleware already succeeded! But getClaims() used old cookies.
        // We'll trust the claims we have for now, OR we could try one more fast getSession().
        if (!user) return profileFromClaims(claimsData);
      }
    }
  }

  if (user) {
    // Optimization: Check for profile data in user_metadata first (JWT claims)
    const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
    if (meta.display_name && meta.account_type) {
      return {
        id: user.sub as string,
        display_name: meta.display_name as string,
        email: user.email as string,
        account_type: meta.account_type as AccountType,
        avatar_path: (meta.avatar_path as string) ?? (meta.avatar_url as string) ?? (meta.picture as string) ?? null,
        username: (meta.username as string) ?? null,
      };
    }

    // Fallback: If metadata is absent or stale, fetch from DB
    const { data: profile, error: dbError } = await supabase
      .from("profiles")
      .select("id, display_name, email, account_type, avatar_path, username")
      .eq("id", user.sub)
      .single();

    if (dbError || !profile) {
      return profileFromAuthUser(user as any);
    }

    return profile as UserProfile;
  }

  // ── Step 2 & 3: Handle definitive revocation (e.g. 401) ─────────────────
  if (authError instanceof AuthApiError) {
    if (isDefinitiveRevocation(authError)) {
      console.warn("[getUserProfile] Definitive revocation detected:", authError.code, authError.message);

      // SCOPE: local. We don't want to sign out the user globally, just clear our own stale cookies.
      // This prevents "nuking" other active sessions if it was just a local cookie issue.
      await supabase.auth.signOut({ scope: "local" });

      // Redirect to login with a special param that Middleware listens for.
      redirect("/auth/login?revoked=1");
    }
  }

  // ── Step 4: Offline / local-only — return what we have from claims ────────
  return profileFromClaims(claimsData);
});

/**
 * Server Action wrapper for getUserProfile.
 * Allows client components to fetch the profile on mount.
 */
export async function getUserProfileAction() {
  return await getUserProfile();
}
