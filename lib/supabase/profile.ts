"use server";

import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { AuthApiError } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { cache } from "react";
import { headers } from "next/headers";

// ─── Types ─────────────────────────────────────────────────────────────────────

export type AccountType = "candidate" | "institute" | "admin" | "recruiter";
export type InstituteSubtype = "primary" | "staff" | "tpo";

export interface UserProfile {
  id: string;
  display_name: string;
  email: string;
  avatar_path: string | null;
  username: string | null;
  account_type: AccountType;
  account_subtype: InstituteSubtype | null;
  institute_id: string | null;
  signature_path?: string | null;
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
  // user_metadata is a fallback for legacy tokens.
  const account_type =
    (appMeta.account_type as AccountType)
    ?? (meta.account_type as AccountType)
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
    display_name: (meta.display_name as string)
      ?? (meta.full_name as string)
      ?? (meta.name as string)
      ?? email
      ?? "User",
    avatar_path: (meta.avatar_path as string) ?? (meta.avatar_url as string) ?? (meta.picture as string) ?? null,
    username: (meta.username as string) ?? null,
    account_type: account_type as AccountType,
    account_subtype: (meta.account_subtype as InstituteSubtype) ?? null,
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
    ?? (meta.account_type as AccountType)
    ?? null;

  return {
    id,
    email: user.email ?? "",
    display_name: (meta.display_name as string)
      ?? (meta.full_name as string)
      ?? (meta.name as string)
      ?? user.email
      ?? "User",
    avatar_path: (meta.avatar_path as string) ?? (meta.avatar_url as string) ?? (meta.picture as string) ?? null,
    username: (meta.username as string) ?? null,
    account_type: (account_type ?? "candidate") as AccountType,
    account_subtype: (meta.account_subtype as InstituteSubtype) ?? null,
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
          username, display_name, avatar_path, account_type, account_subtype, signature_path,
          candidate_profiles!candidate_profiles_profile_id_fkey (institute_id),
          staff_profiles!staff_profiles_profile_id_fkey (institute_id),
          tpo_profiles!tpo_profiles_profile_id_fkey (institute_id),
          institute_profiles!institute_profiles_profile_id_fkey (institute_id)
        `)
        .eq("id", built.id)
        .maybeSingle();

      if (dbError) {
        console.error("[getUserProfile] Database query failed:", dbError);
      }

      if (dbProfile) {
        if (dbProfile.username !== undefined) built.username = dbProfile.username;
        if (dbProfile.display_name !== undefined) built.display_name = dbProfile.display_name;
        if (dbProfile.avatar_path !== undefined) built.avatar_path = dbProfile.avatar_path;
        if (dbProfile.account_type !== undefined) built.account_type = dbProfile.account_type as AccountType;
        if (dbProfile.account_subtype !== undefined) built.account_subtype = dbProfile.account_subtype as InstituteSubtype | null;
        
        const getInstituteId = (val: any) => {
          if (!val) return null;
          if (Array.isArray(val)) return val[0]?.institute_id || null;
          return val.institute_id || null;
        };

        let fetchedInstituteId = null;
        if (built.account_type === 'candidate') fetchedInstituteId = getInstituteId(dbProfile.candidate_profiles);
        else if (built.account_subtype === 'staff') fetchedInstituteId = getInstituteId(dbProfile.staff_profiles);
        else if (built.account_subtype === 'tpo') fetchedInstituteId = getInstituteId(dbProfile.tpo_profiles);
        else if (built.account_type === 'institute') fetchedInstituteId = getInstituteId(dbProfile.institute_profiles);
        
        built.institute_id = fetchedInstituteId || null;
        
        if (dbProfile.signature_path !== undefined) built.signature_path = dbProfile.signature_path;
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
  const supabase = await createClient();

  // Only hit the Auth server if middleware has not already done so for this
  // request. Calling getUser() on a just-refreshed token races with the
  // browser receiving the new cookies and can produce refresh_token_already_used.
  const head = await headers();
  const wasRefreshedInMiddleware = head.get("x-supabase-refreshed") === "true";
  if (!wasRefreshedInMiddleware) {
    await supabase.auth.getUser();
  }

  return await getUserProfile();
}
