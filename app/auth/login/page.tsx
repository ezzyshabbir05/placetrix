// app/auth/login/page.tsx
//
// Login flow:
//
//   login-form    → signInWithPassword()
//                   ✓ confirmed, no MFA  → redirect /~
//                   ✓ confirmed, has MFA → mfa-challenge
//                   ✗ unconfirmed        → resend OTP → otp-entry
//
//   otp-entry     → verifyOtp({ email, token, type: 'signup' })
//                   ✓ verified    → session active → redirect /~
//
//   mfa-challenge → mfa.listFactors() → mfa.challenge() → mfa.verify()
//                   ✓ verified    → session aal2 → redirect /~
//
//   OR: Continue with Google → signInWithOAuth() → /auth/callback
//       → middleware AAL check → /auth/mfa (if MFA enrolled) → /~
//
//   OR: Google One Tap → signInWithIdToken() → /~
//       → middleware AAL check → /auth/mfa (if MFA enrolled) → /~
//
// Industry note: never grant access to an unconfirmed account.
"use client";

import type React from "react";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { Button } from "@/components/ui/button";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { OTPInput } from "@/components/others/otp-input";
import { Separator } from "@/components/ui/separator";
import {
  AtSignIcon,
  EyeIcon,
  EyeOffIcon,
  Loader2Icon,
  LockIcon,
  MailIcon,
  ShieldCheckIcon,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { GoogleOneTap } from "@/components/auth/google-one-tap";

type PageState = "login-form" | "otp-entry" | "mfa-challenge";

const RESEND_COOLDOWN = 60;

const GoogleIcon = (props: React.ComponentProps<"svg">) => (
  <svg fill="currentColor" viewBox="0 0 24 24" {...props}>
    <path d="M12.479,14.265v-3.279h11.049c0.108,0.571,0.164,1.247,0.164,1.979c0,2.46-0.672,5.502-2.84,7.669C18.744,22.829,16.051,24,12.483,24C5.869,24,0.308,18.613,0.308,12S5.869,0,12.483,0c3.659,0,6.265,1.436,8.223,3.307L18.392,5.62c-1.404-1.317-3.307-2.341-5.913-2.341C7.65,3.279,3.873,7.171,3.873,12s3.777,8.721,8.606,8.721c3.132,0,4.916-1.258,6.059-2.401c0.927-0.927,1.537-2.251,1.777-4.059L12.479,14.265z" />
  </svg>
);

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto flex sm:w-sm items-center justify-center py-12">
          <Loader2Icon className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/home";

  const [pageState, setPageState] = useState<PageState>("login-form");
  const [loginMethod, setLoginMethod] = useState<"password" | "magiclink">("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [otp, setOtp] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

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

  const handleMagicLinkLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);
    setIsLoading(true);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/confirm?next=${encodeURIComponent(next)}`,
        },
      });

      if (error) {
        // 504 / network timeout — auth server is under load, ask user to retry
        if (
          error.status === 504 ||
          error.message?.toLowerCase().includes("timeout") ||
          error.message?.toLowerCase().includes("fetch")
        ) {
          setError("The server is temporarily busy. Please wait a moment and try again.");
          return;
        }
        throw error;
      }

      setSuccessMessage("We sent a sign-in link to your email address. Please check your inbox.");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        // 504 / network timeout — auth server is under load, ask user to retry
        if (
          error.status === 504 ||
          error.message?.toLowerCase().includes("timeout") ||
          error.message?.toLowerCase().includes("fetch")
        ) {
          setError("The server is temporarily busy. Please wait a moment and try again.");
          return;
        }

        if (error.message === "Email not confirmed") {
          const { error: resendError } = await supabase.auth.resend({
            type: "signup",
            email,
          });
          if (resendError) throw resendError;
          setPageState("otp-entry");
          startCooldown();
          return;
        }
        throw error;
      }

      // Check if the user has MFA enrolled and needs to verify it.
      // getAuthenticatorAssuranceLevel() is very fast and rarely hits the network.
      const { data: aalData } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (aalData?.currentLevel === "aal1" && aalData?.nextLevel === "aal2") {
        // User has MFA enrolled — show the TOTP challenge screen
        setPageState("mfa-challenge");
        return;
      }

      router.push(next);
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };


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
        type: "signup",
      });
      if (error) throw error;

      router.push(next);
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Invalid or expired code");
      setOtp("");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;
    setError(null);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.resend({ type: "signup", email });
      if (error) throw error;
      startCooldown();
      setOtp("");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to resend code");
    }
  };

  const handleGoogleLogin = async () => {
    setIsGoogleLoading(true);
    setError(null);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
          queryParams: { prompt: "select_account" },
        },
      });
      if (error) throw error;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Google sign-in failed");
      setIsGoogleLoading(false);
    }
  };

  // ── MFA Challenge screen ───────────────────────────────────────────────────
  if (pageState === "mfa-challenge") {
    return (
      <div className="mx-auto space-y-6 sm:w-sm">
        <div className="flex flex-col space-y-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <ShieldCheckIcon className="h-6 w-6 text-primary" />
          </div>
          <div className="space-y-1">
            <h1 className="font-cirka font-bold text-2xl tracking-wide">Two-Factor Authentication</h1>
            <p className="text-base text-muted-foreground">
              Enter the 6-digit code from your authenticator app.
            </p>
          </div>
        </div>

        <form
          className="space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();
            if (otp.length < 6) { setError("Please enter the full 6-digit code."); return; }
            setError(null);
            setIsLoading(true);
            try {
              const supabase = createClient();
              const { data: factorsData, error: listErr } = await supabase.auth.mfa.listFactors();
              if (listErr) throw listErr;
              const totpFactor = factorsData.totp.find((f: any) => f.status === "verified");
              if (!totpFactor) { router.push(next); router.refresh(); return; }
              const { data: challengeData, error: challengeErr } = await supabase.auth.mfa.challenge({ factorId: totpFactor.id });
              if (challengeErr) throw challengeErr;
              const { error: verifyErr } = await supabase.auth.mfa.verify({ factorId: totpFactor.id, challengeId: challengeData.id, code: otp });
              if (verifyErr) throw verifyErr;
              router.push(next);
              router.refresh();
            } catch (err: unknown) {
              setError(err instanceof Error ? err.message : "Invalid code. Please try again.");
              setOtp("");
            } finally {
              setIsLoading(false);
            }
          }}
        >
          <OTPInput length={6} value={otp} onChange={setOtp} disabled={isLoading} />

          {error && (
            <p className="text-sm text-destructive rounded-md bg-destructive/10 px-3 py-2">
              {error}
            </p>
          )}

          <Button className="w-full cursor-pointer" type="submit" disabled={isLoading || otp.length < 6}>
            {isLoading ? (
              <><Loader2Icon className="mr-2 h-4 w-4 animate-spin" />Verifying…</>
            ) : (
              "Verify & Sign In"
            )}
          </Button>
        </form>

        <div className="rounded-md border bg-muted/40 px-4 py-3 text-xs text-muted-foreground">
          <p>
            Open your authenticator app and enter the current 6-digit code for this account.
            Codes refresh every 30 seconds.
          </p>
        </div>

        <button
          type="button"
          disabled={isLoading}
          onClick={() => { setPageState("login-form"); setOtp(""); setError(null); }}
          className="w-full text-center text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          Back to sign in
        </button>
      </div>
    );
  }

  // ── OTP screen ─────────────────────────────────────────────────────────────
  if (pageState === "otp-entry") {
    return (
      <div className="mx-auto space-y-6 sm:w-sm">
        <div className="flex flex-col space-y-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <MailIcon className="h-6 w-6 text-primary" />
          </div>
          <div className="space-y-1">
            <h1 className="font-cirka font-bold text-2xl tracking-wide">
              Confirm Your Email
            </h1>
            <p className="text-base text-muted-foreground">
              Your email isn&apos;t confirmed yet. We sent an 8-digit code to{" "}
              <span className="font-medium text-foreground">{email}</span>.
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
            className="w-full cursor-pointer"
            type="submit"
            disabled={isLoading || otp.length < 8}
          >
            {isLoading ? (
              <>
                <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                Verifying…
              </>
            ) : (
              "Confirm & Sign In"
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
                  disabled={isLoading}
                  onClick={handleResend}
                  className="underline underline-offset-4 hover:text-foreground disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
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
          disabled={isLoading}
          onClick={() => {
            setPageState("login-form");
            setOtp("");
            setError(null);
          }}
          className="w-full text-center text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          Back to sign in
        </button>
      </div>
    );
  }

  // ── Login form ─────────────────────────────────────────────────────────────
  return (
    <>
      {/* One Tap only shown on the login form, not the OTP screen */}
      <GoogleOneTap next={next} />

      <div className="mx-auto space-y-4 sm:w-sm">
        <div className="flex flex-col space-y-1">
          <h1 className="font-cirka font-bold text-2xl tracking-wide">Welcome Back!</h1>
          <p className="text-base text-muted-foreground">
            Sign in to your account to continue.
          </p>
        </div>

        <Button
          className="w-full cursor-pointer"
          variant="outline"
          type="button"
          onClick={handleGoogleLogin}
          disabled={isGoogleLoading || isLoading}
        >
          {isGoogleLoading ? (
            <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <GoogleIcon className="mr-2 h-4 w-4" />
          )}
          {isGoogleLoading ? "Redirecting…" : "Continue with Google"}
        </Button>

        {/* Toggle between Password and Magic Link below Google Login */}
        <Button
          className="w-full cursor-pointer"
          variant="secondary"
          type="button"
          onClick={() => {
            setLoginMethod(loginMethod === "password" ? "magiclink" : "password");
            setError(null);
            setSuccessMessage(null);
          }}
          disabled={isLoading || isGoogleLoading}
        >
          {loginMethod === "password" ? "Sign in with Magic Link" : "Sign in with Password"}
        </Button>

        <div className="flex w-full items-center justify-center gap-2">
          <Separator className="flex-1" />
          <span className="shrink-0 text-muted-foreground text-xs">OR</span>
          <Separator className="flex-1" />
        </div>

        <form
          className="space-y-4"
          onSubmit={loginMethod === "password" ? handleLogin : handleMagicLinkLogin}
        >
          <p className="text-start text-muted-foreground text-xs">
            {loginMethod === "password"
              ? "Enter your credentials to sign in"
              : "Enter your email to receive a secure login link"}
          </p>

          <InputGroup>
            <InputGroupInput
              placeholder="your.email@example.com"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading || isGoogleLoading}
            />
            <InputGroupAddon align="inline-start">
              <AtSignIcon />
            </InputGroupAddon>
          </InputGroup>

          {loginMethod === "password" && (
            <InputGroup>
              <InputGroupInput
                placeholder="Password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading || isGoogleLoading}
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
          )}

          {error && (
            <p className="text-sm text-destructive rounded-md bg-destructive/10 px-3 py-2">
              {error}
            </p>
          )}

          {successMessage && (
            <p className="text-sm text-green-500 rounded-md bg-green-500/10 px-3 py-2">
              {successMessage}
            </p>
          )}

          <Button
            className="w-full cursor-pointer"
            type="submit"
            disabled={isLoading || isGoogleLoading}
          >
            {isLoading ? (
              <>
                <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                {loginMethod === "password" ? "Signing in…" : "Sending link…"}
              </>
            ) : (
              loginMethod === "password" ? "Sign In" : "Send Magic Link"
            )}
          </Button>

          <div className="flex justify-between items-center text-xs">
            <Link
              href={isLoading || isGoogleLoading ? "#" : "/auth/sign-up"}
              className={`text-muted-foreground underline underline-offset-4 hover:text-primary transition-all ${isLoading || isGoogleLoading ? "pointer-events-none opacity-50" : ""
                }`}
            >
              Don&apos;t have an account? Sign up
            </Link>

            {loginMethod === "password" && (
              <Link
                href={isLoading || isGoogleLoading ? "#" : "/auth/reset-password"}
                className={`text-muted-foreground underline underline-offset-4 hover:text-primary ${isLoading || isGoogleLoading ? "pointer-events-none opacity-50" : ""
                  }`}
              >
                Forgot password?
              </Link>
            )}
          </div>
        </form>

        <p className="text-muted-foreground text-xs text-center pt-2">
          By signing in, you agree to our{" "}
          <Link
            href="/terms-of-service"
            className="underline underline-offset-4 hover:text-primary"
          >
            Terms
          </Link>{" "}
          and{" "}
          <Link
            href="/privacy-policy"
            className="underline underline-offset-4 hover:text-primary"
          >
            Privacy Policy
          </Link>
          .
        </p>
      </div>
    </>
  );
}
