// app/auth/reset-password/page.tsx
//
// Full OTP-based password reset — all steps on a single page:
//
//   email-form    → resetPasswordForEmail(email)  → OTP sent
//   otp-entry     → verifyOtp({ email, token, type: 'recovery' })
//                   → recovery session established
//   password-form → updateUser({ password })
//                   → signOut() to invalidate the one-time recovery session
//   success       → prompt to sign in
//
// ── Required Supabase email template ─────────────────────────────────────────
//
//  Dashboard → Authentication → Email Templates → Reset Password
//  Subject: Reset your password
//  Body:
//    Your password reset code is: {{ .Token }}
//    This code expires in 1 hour.
//
// ─────────────────────────────────────────────────────────────────────────────
"use client";

import type React from "react";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { OTPInput } from "@/components/ui/otp-input";
import {
  AtSignIcon,
  CheckCircleIcon,
  EyeIcon,
  EyeOffIcon,
  Loader2Icon,
  LockIcon,
  MailIcon,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type PageState = "email-form" | "otp-entry" | "password-form" | "success";

const RESEND_COOLDOWN = 60;

export default function ResetPasswordPage() {
  // ── State ──────────────────────────────────────────────────────────────────
  const [pageState, setPageState] = useState<PageState>("email-form");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Cooldown timer ─────────────────────────────────────────────────────────
  const startCooldown = () => {
    setResendCooldown(RESEND_COOLDOWN);
    cooldownRef.current = setInterval(() => {
      setResendCooldown((s) => {
        if (s <= 1) {
          clearInterval(cooldownRef.current!);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
  };

  useEffect(
    () => () => {
      if (cooldownRef.current) clearInterval(cooldownRef.current);
    },
    []
  );

  // ── Step 1: Send reset email ───────────────────────────────────────────────
  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.resetPasswordForEmail(email);
      if (error) throw error;
      setPageState("otp-entry");
      startCooldown();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  // ── Step 2: Verify OTP ─────────────────────────────────────────────────────
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length < 8) {
      setError("Please enter the full 8-digit code");
      return;
    }
    setError(null);
    setIsLoading(true);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.verifyOtp({
        email,
        token: otp,
        type: "recovery",
      });
      if (error) throw error;
      setPageState("password-form");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Invalid or expired code");
      setOtp("");
    } finally {
      setIsLoading(false);
    }
  };

  // ── Resend OTP ─────────────────────────────────────────────────────────────
  const handleResend = async () => {
    if (resendCooldown > 0) return;
    setError(null);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.resetPasswordForEmail(email);
      if (error) throw error;
      startCooldown();
      setOtp("");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to resend code");
    }
  };

  // ── Step 3: Update password ────────────────────────────────────────────────
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

    setIsLoading(true);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;

      // Invalidate the one-time recovery session so it cannot be reused.
      await supabase.auth.signOut();
      setPageState("success");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  // ── Success ────────────────────────────────────────────────────────────────
  if (pageState === "success") {
    return (
      <div className="mx-auto space-y-4 sm:w-sm text-center">
        <div className="flex h-14 w-14 mx-auto items-center justify-center rounded-full bg-green-500/10">
          <CheckCircleIcon className="h-7 w-7 text-green-500" />
        </div>
        <div className="space-y-1">
          <h1 className="font-bold text-2xl tracking-wide">
            Password Updated!
          </h1>
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
  if (pageState === "password-form") {
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
                Updating…
              </>
            ) : (
              "Update Password"
            )}
          </Button>
        </form>
      </div>
    );
  }

  // ── OTP entry ──────────────────────────────────────────────────────────────
  if (pageState === "otp-entry") {
    return (
      <div className="mx-auto space-y-6 sm:w-sm">
        <div className="flex flex-col items-center space-y-3 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
            <MailIcon className="h-7 w-7 text-primary" />
          </div>
          <div className="space-y-1">
            <h1 className="font-bold text-2xl tracking-wide">
              Enter Reset Code
            </h1>
            <p className="text-base text-muted-foreground">
              We sent an 8-digit code to{" "}
              <span className="font-medium text-foreground">{email}</span>
            </p>
          </div>
        </div>

        <form className="space-y-4" onSubmit={handleVerifyOtp}>
          <OTPInput value={otp} onChange={setOtp} disabled={isLoading} />

          {error && (
            <p className="text-sm text-destructive rounded-md bg-destructive/10 px-3 py-2 text-center">
              {error}
            </p>
          )}

          <Button
            className="w-full"
            type="submit"
            disabled={isLoading || otp.length < 8}
          >
            {isLoading ? (
              <>
                <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                Verifying…
              </>
            ) : (
              "Verify Code"
            )}
          </Button>
        </form>

        <div className="rounded-md border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
          <div className="flex items-start gap-2">
            <MailIcon className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              Didn&apos;t receive it?{" "}
              {resendCooldown > 0 ? (
                <span>Resend in {resendCooldown}s</span>
              ) : (
                <button
                  type="button"
                  onClick={handleResend}
                  className="underline underline-offset-4 hover:text-foreground"
                >
                  Resend code
                </button>
              )}{" "}
              or check your spam folder.
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            setPageState("email-form");
            setOtp("");
            setError(null);
          }}
          className="w-full text-center text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground"
        >
          Use a different email
        </button>
      </div>
    );
  }

  // ── Email form ─────────────────────────────────────────────────────────────
  return (
    <div className="mx-auto space-y-4 sm:w-sm">
      <div className="flex flex-col space-y-1">
        <h1 className="font-bold text-2xl tracking-wide">Reset Password</h1>
        <p className="text-base text-muted-foreground">
          Enter your email and we&apos;ll send you a reset code.
        </p>
      </div>

      <form className="space-y-2" onSubmit={handleSendEmail}>
        <InputGroup>
          <InputGroupInput
            placeholder="your.email@example.com"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <InputGroupAddon align="inline-start">
            <AtSignIcon />
          </InputGroupAddon>
        </InputGroup>

        {error && (
          <p className="text-sm text-destructive rounded-md bg-destructive/10 px-3 py-2">
            {error}
          </p>
        )}

        <Button className="w-full" type="submit" disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
              Sending…
            </>
          ) : (
            "Send Reset Code"
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