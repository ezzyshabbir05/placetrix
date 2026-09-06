"use client";

import { useEffect, useRef, Suspense } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

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
  "/settings",
  "/gethelp",
  "/groups",
  "/myprofile",
];

const AUTH_FLOW_PATHS = [
  "/auth/callback",
  "/auth/confirm",
  "/auth/mfa",
  "/auth/change-password",
  "/auth/error",
];

function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PATHS.some(
    (p) => pathname === p || pathname.startsWith(p + "/")
  );
}

function isAuthPath(pathname: string): boolean {
  if (!pathname.startsWith("/auth")) return false;
  return !AUTH_FLOW_PATHS.some(
    (p) => pathname === p || pathname.startsWith(p + "/")
  );
}

const STORAGE_KEY = "placetrix_auth_sync";

function AuthSyncContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const pathnameRef = useRef(pathname);
  const searchParamsRef = useRef(searchParams);
  const lastUserIdRef = useRef<string | null | undefined>(undefined);

  pathnameRef.current = pathname;
  searchParamsRef.current = searchParams;

  useEffect(() => {
    const supabase = createClient();

    const handleUserChange = (
      newUserId: string | null,
      event?: string
    ) => {
      const prevUserId = lastUserIdRef.current;
      lastUserIdRef.current = newUserId;

      // Ignore initial session or initial ref setup
      if (prevUserId === undefined || event === "INITIAL_SESSION") {
        return;
      }

      const currentPath = pathnameRef.current;
      const currentParams = searchParamsRef.current;

      // Signed out: user ID went from non-null to null
      if (prevUserId !== null && newUserId === null) {
        if (isProtectedPath(currentPath)) {
          const loginUrl = `/auth/login?next=${encodeURIComponent(currentPath)}`;
          window.location.replace(loginUrl);
        }
        return;
      }

      // Signed in: user ID went from null to non-null
      if (prevUserId === null && newUserId !== null) {
        if (isAuthPath(currentPath)) {
          const next = currentParams.get("next") ?? "/home";
          supabase.auth.mfa.getAuthenticatorAssuranceLevel().then(({ data }) => {
            if (data?.currentLevel === "aal1" && data?.nextLevel === "aal2") {
              window.location.replace(`/auth/mfa?next=${encodeURIComponent(next)}`);
            } else {
              window.location.replace(next);
            }
          });
        } else {
          router.refresh();
        }
        return;
      }

      // Switched user account or user profile updated
      if (
        (prevUserId !== newUserId && prevUserId !== undefined) ||
        event === "USER_UPDATED"
      ) {
        router.refresh();
      }
    };

    // Initialize initial session user ID
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (lastUserIdRef.current === undefined) {
        lastUserIdRef.current = session?.user?.id ?? null;
      }
    });

    // Subscribe to Supabase auth events
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      const currentUserId = session?.user?.id ?? null;

      if (event === "SIGNED_OUT") {
        try {
          localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify({ event: "SIGNED_OUT", userId: null, time: Date.now() })
          );
        } catch {}
      } else if (event === "SIGNED_IN") {
        try {
          localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify({ event: "SIGNED_IN", userId: currentUserId, time: Date.now() })
          );
        } catch {}
      }

      handleUserChange(currentUserId, event);
    });

    // Cross-tab window storage listener
    const handleStorage = (e: StorageEvent) => {
      if (e.key !== STORAGE_KEY || !e.newValue) return;
      try {
        const payload = JSON.parse(e.newValue);
        handleUserChange(payload.userId, payload.event);
      } catch {}
    };

    window.addEventListener("storage", handleStorage);

    // Tab visibility & focus change handler
    const handleFocusOrVisibility = async () => {
      if (document.visibilityState === "visible") {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        const activeUserId = session?.user?.id ?? null;
        if (
          lastUserIdRef.current !== undefined &&
          lastUserIdRef.current !== activeUserId
        ) {
          handleUserChange(activeUserId, "VISIBILITY_CHANGE");
        }
      }
    };

    // Back / Forward browser navigation handler (bfcache restoration & popstate)
    const handlePageShowOrPopState = async (e: Event) => {
      const persisted = (e as PageTransitionEvent).persisted;
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const activeUserId = session?.user?.id ?? null;
      const currentPath = pathnameRef.current;

      if (isProtectedPath(currentPath) && !activeUserId) {
        window.location.replace(
          `/auth/login?next=${encodeURIComponent(currentPath)}`
        );
      } else if (isAuthPath(currentPath) && activeUserId) {
        window.location.replace("/home");
      } else if (
        persisted ||
        (lastUserIdRef.current !== undefined &&
          lastUserIdRef.current !== activeUserId)
      ) {
        handleUserChange(activeUserId, "PAGESHOW_PERSISTED");
      }
    };

    window.addEventListener("visibilitychange", handleFocusOrVisibility);
    window.addEventListener("focus", handleFocusOrVisibility);
    window.addEventListener("pageshow", handlePageShowOrPopState);
    window.addEventListener("popstate", handlePageShowOrPopState);

    return () => {
      subscription.unsubscribe();
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("visibilitychange", handleFocusOrVisibility);
      window.removeEventListener("focus", handleFocusOrVisibility);
      window.removeEventListener("pageshow", handlePageShowOrPopState);
      window.removeEventListener("popstate", handlePageShowOrPopState);
    };
  }, [router]);

  return null;
}

export function AuthSync() {
  return (
    <Suspense fallback={null}>
      <AuthSyncContent />
    </Suspense>
  );
}
