// app/auth/mfa/page.tsx
//
// Standalone TOTP challenge page.
//
// This page is reached when:
//   1. Middleware detects a protected-route visit where currentLevel=aal1 but nextLevel=aal2
//      (user has MFA enrolled but hasn't verified this session yet).
//   2. After Google OAuth callback lands the user in /~ but middleware redirects here.
//
// Flow: verify TOTP → session upgraded to aal2 → redirect to `next` param.
"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { OTPInput } from "@/components/others/otp-input";
import { Button } from "@/components/ui/button";
import { Loader2Icon, LogOutIcon } from "lucide-react";
import Link from "next/link";

export default function MfaPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto flex sm:w-sm items-center justify-center py-12">
          <Loader2Icon className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <MfaContent />
    </Suspense>
  );
}

function MfaContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/home";

  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  // Validate the redirect target — only allow relative paths
  const safeNext = next.startsWith("/") ? next : "/home";

  // Guard: if the user somehow lands here without needing MFA, push them through
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.mfa.getAuthenticatorAssuranceLevel().then(({ data }) => {
      if (data?.currentLevel === "aal2") {
        // Already verified — redirect
        router.replace(safeNext);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length < 6) {
      setError("Please enter the full 6-digit code.");
      return;
    }

    setError(null);
    setIsLoading(true);

    try {
      const supabase = createClient();

      // 1. Get the enrolled TOTP factor
      const { data: factorsData, error: listErr } =
        await supabase.auth.mfa.listFactors();
      if (listErr) throw listErr;

      const totpFactor = factorsData.totp.find((f) => f.status === "verified");
      if (!totpFactor) {
        // No verified factor found — shouldn't happen; send to dashboard
        router.replace(safeNext);
        return;
      }

      // 2. Create a challenge
      const { data: challengeData, error: challengeErr } =
        await supabase.auth.mfa.challenge({ factorId: totpFactor.id });
      if (challengeErr) throw challengeErr;

      // 3. Verify the code — this upgrades the session to aal2
      const { error: verifyErr } = await supabase.auth.mfa.verify({
        factorId: totpFactor.id,
        challengeId: challengeData.id,
        code,
      });
      if (verifyErr) throw verifyErr;

      // Success — push to the intended destination
      router.push(safeNext);
      router.refresh();
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "Invalid code. Please check your authenticator app and try again."
      );
      setCode("");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignOut = async () => {
    setIsSigningOut(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/auth/login");
    router.refresh();
  };

  return (
    <div className="mx-auto space-y-6 sm:w-sm">
      {/* Header */}
      <div className="flex flex-col space-y-1">
        <h1 className="font-cirka font-bold text-2xl tracking-wide">
          Two-Factor Authentication
        </h1>
        <p className="text-base text-muted-foreground">
          Enter the 6-digit code from your authenticator app to continue.
        </p>
      </div>

      {/* Form */}
      <form className="space-y-4" onSubmit={handleVerify}>
        <OTPInput
          length={6}
          value={code}
          onChange={(v) => {
            setCode(v);
            if (error) setError(null);
          }}
          disabled={isLoading}
        />

        {error && (
          <p className="text-sm text-destructive rounded-md bg-destructive/10 px-3 py-2 text-center">
            {error}
          </p>
        )}

        <Button
          className="w-full"
          type="submit"
          disabled={isLoading || code.length < 6}
        >
          {isLoading ? (
            <>
              <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
              Verifying…
            </>
          ) : (
            "Verify & Continue"
          )}
        </Button>
      </form>

      {/* Help */}
      <div className="rounded-md border bg-muted/40 px-4 py-3 text-sm text-muted-foreground space-y-1">
        <p className="font-medium text-foreground text-xs">Using an authenticator app?</p>
        <p className="text-xs">
          Open Google Authenticator, Authy, or your preferred TOTP app and enter
          the current 6-digit code for this account. Codes refresh every 30 seconds.
        </p>
      </div>

      {/* Lost access / sign out */}
      <div className="flex flex-col items-center gap-2">
        <p className="text-xs text-muted-foreground text-center">
          Lost access to your authenticator app?{" "}
          <Link
            href="/help-center"
            className="underline underline-offset-4 hover:text-foreground"
          >
            Contact support
          </Link>
        </p>

        <button
          type="button"
          onClick={handleSignOut}
          disabled={isSigningOut || isLoading}
          className="flex items-center gap-1.5 text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isSigningOut ? (
            <Loader2Icon className="h-3 w-3 animate-spin" />
          ) : (
            <LogOutIcon className="h-3 w-3" />
          )}
          Sign out instead
        </button>
      </div>
    </div>
  );
}
