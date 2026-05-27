// app/auth/change-password/page.tsx
//
// Fallback for the LINK-based recovery flow only.
//
// Users arrive here when they click a password reset link in their email
// (rather than entering an OTP code). The flow is:
//
//   /auth/confirm verifies the token_hash server-side → session established
//   → redirects here with ?mode=recovery
//
// The primary reset flow is now OTP-based via /auth/reset-password.
// This page exists for users who click links from older email templates,
// or if you have "link + code" in the same template.
//
// Session check on mount:
//   session + mode=recovery  → password-form   (correct path ✓)
//   session + no mode param  → redirect to /auth/reset-password
//   no session               → expired         (link already used / invalid)
//
// On success: signs out to invalidate the one-time recovery session.
//
// States: loading → password-form | expired | success
"use client";

import type React from "react";
import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import {
  CheckCircleIcon,
  EyeIcon,
  EyeOffIcon,
  Loader2Icon,
  LockIcon,
  ShieldAlertIcon,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type PageState = "loading" | "password-form" | "expired" | "success";

export default function ChangePasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto flex sm:w-sm items-center justify-center py-12">
          <Loader2Icon className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <ChangePasswordContent />
    </Suspense>
  );
}

function ChangePasswordContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const isRecoveryMode = searchParams.get("mode") === "recovery";

  const [pageState, setPageState] = useState<PageState>("loading");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Session check ──────────────────────────────────────────────────────────
  useEffect(() => {
    const checkSession = async () => {
      const supabase = createClient();
      const { data } = await supabase.auth.getClaims();
      const user = data?.claims;

      if (user && isRecoveryMode) {
        setPageState("password-form");
      } else if (user && !isRecoveryMode) {
        // Authenticated user who navigated here directly — bounce back.
        // react-doctor-disable-next-line
        router.replace("/auth/reset-password");
      } else {
        // No valid user session: link expired, already used, or never valid.
        setPageState("expired");
      }
    };

    checkSession();
  }, [isRecoveryMode, router]);

  // ── Update password ────────────────────────────────────────────────────────
  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    const supabase = createClient();
    setIsLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;

      // Invalidate the recovery session so the link cannot be reused.
      await supabase.auth.signOut();
      setPageState("success");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  // ── Loading ────────────────────────────────────────────────────────────────
  if (pageState === "loading") {
    return (
      <div className="mx-auto flex sm:w-sm items-center justify-center py-12">
        <Loader2Icon className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // ── Expired ────────────────────────────────────────────────────────────────
  if (pageState === "expired") {
    return (
      <div className="mx-auto space-y-4 sm:w-sm text-center">
        <div className="flex h-14 w-14 mx-auto items-center justify-center rounded-full bg-destructive/10">
          <ShieldAlertIcon className="h-7 w-7 text-destructive" />
        </div>
        <div className="space-y-1">
          <h1 className="font-bold text-2xl tracking-wide">Link Expired</h1>
          <p className="text-base text-muted-foreground">
            This password reset link is invalid or has already been used.
            Please request a new one.
          </p>
        </div>
        <Button asChild className="w-full">
          <Link href="/auth/reset-password">Request New Reset</Link>
        </Button>
        <Button asChild variant="outline" className="w-full">
          <Link href="/auth/login">Back to Sign In</Link>
        </Button>
      </div>
    );
  }

  // ── Success ────────────────────────────────────────────────────────────────
  if (pageState === "success") {
    return (
      <div className="mx-auto space-y-4 sm:w-sm text-center">
        <div className="flex h-14 w-14 mx-auto items-center justify-center rounded-full bg-green-500/10">
          <CheckCircleIcon className="h-7 w-7 text-green-500" />
        </div>
        <div className="space-y-1">
          <h1 className="font-bold text-2xl tracking-wide">Password Updated!</h1>
          <p className="text-base text-muted-foreground">
            Your password has been reset successfully. Sign in with your new
            password to continue.
          </p>
        </div>
        <Button asChild className="w-full">
          <Link href="/auth/login">Sign In</Link>
        </Button>
      </div>
    );
  }

  // ── Password form ──────────────────────────────────────────────────────────
  return (
    <div className="mx-auto space-y-4 sm:w-sm">
      <div className="flex flex-col space-y-1">
        <h1 className="font-bold text-2xl tracking-wide">Set New Password</h1>
        <p className="text-base text-muted-foreground">
          Choose a strong password for your account.
        </p>
      </div>

      <form className="space-y-2" onSubmit={handleUpdatePassword}>
        <InputGroup>
          <InputGroupInput
            placeholder="New password"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <InputGroupAddon align="inline-start">
            <LockIcon />
          </InputGroupAddon>
          <InputGroupAddon
            align="inline-end"
            className="cursor-pointer"
            onClick={() => setShowPassword((p) => !p)}
          >
            {showPassword ? <EyeOffIcon /> : <EyeIcon />}
          </InputGroupAddon>
        </InputGroup>

        <InputGroup>
          <InputGroupInput
            placeholder="Confirm new password"
            type={showConfirm ? "text" : "password"}
            autoComplete="new-password"
            required
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
          <InputGroupAddon align="inline-start">
            <LockIcon />
          </InputGroupAddon>
          <InputGroupAddon
            align="inline-end"
            className="cursor-pointer"
            onClick={() => setShowConfirm((p) => !p)}
          >
            {showConfirm ? <EyeOffIcon /> : <EyeIcon />}
          </InputGroupAddon>
        </InputGroup>

        <p className="text-xs text-muted-foreground">
          Must be at least 6 characters.
        </p>

        {error && (
          <p className="text-sm text-destructive rounded-md bg-destructive/10 px-3 py-2">
            {error}
          </p>
        )}

        <Button className="w-full" type="submit" disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
              Updating...
            </>
          ) : (
            "Update Password"
          )}
        </Button>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        Remember your password?{" "}
        <Link
          href="/auth/login"
          className="underline underline-offset-4 hover:text-primary"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}