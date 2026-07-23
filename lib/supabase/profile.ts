"use server";

import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { AuthApiError } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { cache } from "react";
import { headers } from "next/headers";

// ─── Types ─────────────────────────────────────────────────────────────────────

export type AccountType =
  | "admin"
  | "institute_candidate"
  | "institute_primary"
  | "institute_staff"
  | "institute_placement_officer";

export interface UserProfile {
  id: string;
  full_name: string;
  first_name?: string | null;
  middle_name?: string | null;
  last_name?: string | null;
  email: string;
  avatar_path: string | null;
  username: string | null;
  account_type: AccountType;
  institute_id: string | null;
  signature_path?: string | null;
  profile_updated?: boolean | null;

  // Generic profile columns
  bio?: string | null;
  gender?: string | null;
  phone_number?: string | null;
  date_of_birth?: string | null;
  aadhaar_number?: string | null;
  current_address?: string | null;
  permanent_address?: string | null;
  linkedin_url?: string | null;
  github_url?: string | null;
  portfolio_links?: string[] | null;
  logiclab_score?: number | null;
  logiclab_solved_count?: number | null;
}

function isDefinitiveRevocation(error: AuthApiError): boolean {
  if (error.code && (
    error.code === "session_not_found" ||
    error.code === "refresh_token_not_found" ||
    error.code === "refresh_token_already_used" ||
    error.code === "invalid_refresh_token" ||
    error.code === "user_not_found" ||
    error.code === "user_banned"
  )) {
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

  const {
    sub,
    email,
    app_metadata: appMeta = {},
    user_metadata: meta = {},
  } = claims as {
    sub: string;
    email?: string;
    app_metadata?: Record<string, unknown>;
    user_metadata?: Record<string, unknown>;
  };

  // app_metadata is server-only (not user-editable) — always prefer it for account_type.
  const account_type =
    (appMeta.account_type as AccountType)
    ?? null;

  // If account_type is completely absent from the JWT (e.g. token issued before the
  // app_metadata backfill) we return null rather than silently defaulting to
  // "candidate". In online mode the caller will have already resolved account_type
  // via the DB; this branch is only reached in the offline fast-path where a DB
  // lookup is impossible, so null is the honest answer.
  if (!account_type) return null;

  return {
    id: sub,
    email: email ?? "",
    full_name: (meta.full_name as string)
      ?? (meta.name as string)
      ?? (meta.display_name as string)
      ?? email
      ?? "User",
    first_name: (meta.first_name as string) ?? null,
    middle_name: (meta.middle_name as string) ?? null,
    last_name: (meta.last_name as string) ?? null,
    avatar_path: (meta.avatar_path as string) ?? (meta.avatar_url as string) ?? (meta.picture as string) ?? null,
    username: (meta.username as string) ?? null,
    account_type: account_type as AccountType,
    institute_id: (meta.institute_id as string) ?? null,
    signature_path: (meta.signature_path as string) ?? null,
  };
}

/**
 * Builds a minimal UserProfile from either the auth `user` object or local `claims`.
 * Used when the session is valid but the DB profile row is unreachable.
 */
function profileFromAuthUser(
  user: { id?: string; sub?: string; user_metadata?: any; app_metadata?: any; email?: string }
): UserProfile & { _account_type_missing?: boolean } {
  const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
  const appMeta = (user.app_metadata ?? {}) as Record<string, unknown>;
  const id = user.sub ?? user.id;
  if (!id) throw new Error("User ID is required");

  // app_metadata is server-only (not user-editable) — authoritative for account_type.
  const account_type =
    (appMeta.account_type as AccountType)
    ?? null;

  return {
    id,
    email: user.email ?? "",
    full_name: (meta.full_name as string)
      ?? (meta.name as string)
      ?? (meta.display_name as string)
      ?? user.email
      ?? "User",
    first_name: (meta.first_name as string) ?? null,
    middle_name: (meta.middle_name as string) ?? null,
    last_name: (meta.last_name as string) ?? null,
    avatar_path: (meta.avatar_path as string) ?? (meta.avatar_url as string) ?? (meta.picture as string) ?? null,
    username: (meta.username as string) ?? null,
    account_type: (account_type ?? "institute_candidate") as AccountType,
    institute_id: (meta.institute_id as string) ?? null,
    signature_path: (meta.signature_path as string) ?? null,
    // Internal flag: if true, caller should resolve account_type from DB.
    _account_type_missing: account_type === null,
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
    const built = profileFromAuthUser(user as any);

    try {
      const { data: dbProfile, error: dbError } = await (supabase as any)
        .from("profiles")
        .select(`
          username, full_name, first_name, middle_name, last_name, avatar_path, account_type, signature_path, 
          profile_updated, institute_id, bio, gender, phone_number, date_of_birth, 
          aadhaar_number, current_address, permanent_address, linkedin_url, github_url, portfolio_links,
          logiclab_score, logiclab_solved_count
        `)
        .eq("id", built.id)
        .maybeSingle();

      if (dbError) {
        console.error("[getUserProfile] Database query failed:", dbError);
      }

      if (dbProfile) {
        if (dbProfile.username !== undefined) built.username = dbProfile.username;
        if (dbProfile.full_name !== undefined) built.full_name = dbProfile.full_name;
        if (dbProfile.first_name !== undefined) built.first_name = dbProfile.first_name;
        if (dbProfile.middle_name !== undefined) built.middle_name = dbProfile.middle_name;
        if (dbProfile.last_name !== undefined) built.last_name = dbProfile.last_name;
        if (dbProfile.avatar_path !== undefined) built.avatar_path = dbProfile.avatar_path;
        if (dbProfile.account_type !== undefined) built.account_type = dbProfile.account_type as AccountType;
        if (dbProfile.profile_updated !== undefined) built.profile_updated = dbProfile.profile_updated;
        if (dbProfile.institute_id !== undefined) built.institute_id = dbProfile.institute_id;

        if (dbProfile.signature_path !== undefined) built.signature_path = dbProfile.signature_path;

        // Generic fields mapping
        if (dbProfile.bio !== undefined) built.bio = dbProfile.bio;
        if (dbProfile.gender !== undefined) built.gender = dbProfile.gender;
        if (dbProfile.phone_number !== undefined) built.phone_number = dbProfile.phone_number;
        if (dbProfile.date_of_birth !== undefined) built.date_of_birth = dbProfile.date_of_birth;
        if (dbProfile.aadhaar_number !== undefined) built.aadhaar_number = dbProfile.aadhaar_number;
        if (dbProfile.current_address !== undefined) built.current_address = dbProfile.current_address;
        if (dbProfile.permanent_address !== undefined) built.permanent_address = dbProfile.permanent_address;
        if (dbProfile.linkedin_url !== undefined) built.linkedin_url = dbProfile.linkedin_url;
        if (dbProfile.github_url !== undefined) built.github_url = dbProfile.github_url;
        if (dbProfile.portfolio_links !== undefined) built.portfolio_links = dbProfile.portfolio_links;
        if (dbProfile.logiclab_score !== undefined) built.logiclab_score = dbProfile.logiclab_score;
        if (dbProfile.logiclab_solved_count !== undefined) built.logiclab_solved_count = dbProfile.logiclab_solved_count;

        built._account_type_missing = false;
      }
    } catch (e) {
      console.error("[getUserProfile] Failed to fetch database profile:", e);
    }

    if (built._account_type_missing) {
      // Fallback: resolve account_type from DB — this branch is hit only when the
      // JWT hasn't been refreshed yet after the app_metadata backfill.
      try {
        const { data: dbProfile } = await (supabase as any)
          .from("profiles")
          .select("account_type")
          .eq("id", built.id)
          .single();

        if (dbProfile?.account_type) {
          built.account_type = dbProfile.account_type as AccountType;
        }
      } catch (e) {
        console.error("[getUserProfile] Failed fallback account_type fetch:", e);
      }
    }

    const { _account_type_missing: _, ...profile } = built;
    return profile;
  }

  // ── Step 2 & 3: Handle definitive revocation (e.g. 401) ─────────────────
  if (authError instanceof AuthApiError) {
    if (isDefinitiveRevocation(authError)) {
      // react-doctor-disable-next-line
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
 *
 * Uses the same wasRefreshedInMiddleware guard as getUserProfile() to avoid
 * triggering a "refresh_token_already_used" error when middleware already
 * refreshed the token during the same request lifecycle.
 */
export async function getUserProfileAction() {
  return await getUserProfile();
}
