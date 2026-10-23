// app/auth/sign-up/page.tsx
//
// Registration flow:
//
//   1. User submits form → supabase.auth.signUp()
//   2. Supabase sends a 6-digit OTP to the user's email
//   3. Page switches to otp-entry state (in-place — no redirect)
//   4. User enters OTP → supabase.auth.verifyOtp({ type: 'signup' })
//   5. Session is active → redirect to /home
//
// ── Required Supabase email template ─────────────────────────────────────────
//
//  Dashboard → Authentication → Email Templates → Confirm signup
//  Subject: Confirm your signup
//  Body:
//    Your confirmation code is: {{ .Token }}
//    Enter this code to complete your registration.
//
// ─────────────────────────────────────────────────────────────────────────────
"use client";

import type React from "react";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { Separator } from "@/components/ui/separator";
import {
  EyeIcon,
  EyeOffIcon,
  Loader2Icon,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { GoogleOneTap } from "@/components/auth/google-one-tap";
import { startNavigationProgress, stopNavigationProgress } from "@/components/ui/navigation-progress";

type PageState = "register-form" | "otp-entry";

const RESEND_COOLDOWN = 60;
const LAST_EMAIL_KEY = "placetrix_last_email";

import { GoogleIcon } from "@/components/icons/google-icon";
import { PasswordStrength } from "@/components/auth/password-strength";

export default function SignUpPage() {
  return (
    <Suspense
      fallback={
        <div className={cn('mx-auto', 'flex', 'sm:w-sm', 'items-center', 'justify-center', 'py-12')}>
          <Loader2Icon className={cn('h-6', 'w-6', 'animate-spin', 'text-muted-foreground')} />
        </div>
      }
    >
      <SignUpContent />
    </Suspense>
  );
}

function SignUpContent() {
  const router = useRouter();

  const [pageState, setPageState] = useState<PageState>("register-form");

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [otp, setOtp] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setIsLoading(true);

    try {
      const supabase = createClient();
      const cleanEmail = email.trim().toLowerCase();

      try {
        localStorage.setItem(LAST_EMAIL_KEY, cleanEmail);
      } catch {}

      const { data, error } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?next=/home`,
          data: {
            full_name: fullName.trim() || undefined,
          },
        },
      });

      if (error) {
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

      if (data?.session) {
        router.push("/home");
        return;
      }

      setPageState("otp-entry");
      startCooldown();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (e?: React.FormEvent, tokenOverride?: string) => {
    if (e) e.preventDefault();
    const tokenToVerify = tokenOverride ?? otp;
    if (tokenToVerify.length < 6) {
      setError("Please enter the full 6-digit code");
      return;
    }
    setError(null);
    setIsLoading(true);

    try {
      const supabase = createClient();
      const cleanEmail = email.trim().toLowerCase();
      const { error } = await supabase.auth.verifyOtp({
        email: cleanEmail,
        token: tokenToVerify,
        type: "signup",
      });
      if (error) throw error;

      setIsRedirecting(true);
      startNavigationProgress();
      router.push("/home");
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Invalid or expired code");
      setOtp("");
      setIsLoading(false);
      setIsRedirecting(false);
      stopNavigationProgress();
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;
    setError(null);

    try {
      const supabase = createClient();
      const cleanEmail = email.trim().toLowerCase();
      const { error } = await supabase.auth.resend({ type: "signup", email: cleanEmail });
      if (error) throw error;
      startCooldown();
      setOtp("");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to resend code");
    }
  };

  const handleGoogleSignUp = async () => {
    setIsGoogleLoading(true);
    setError(null);
    startNavigationProgress();

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=/home`,
          queryParams: { prompt: "select_account" },
        },
      });
      if (error) throw error;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Google sign-up failed");
      setIsGoogleLoading(false);
      stopNavigationProgress();
    }
  };

  const isBusy = isLoading || isGoogleLoading || isRedirecting;

  return (
    <>
      <GoogleOneTap
        next="/home"
        onStart={() => {
          setIsGoogleLoading(true);
          setError(null);
          startNavigationProgress();
        }}
        onSuccess={() => {
          setIsGoogleLoading(true);
          setIsRedirecting(true);
        }}
        onError={(msg) => {
          setIsGoogleLoading(false);
          setIsRedirecting(false);
          setError(msg);
          stopNavigationProgress();
        }}
      />

      <div className={cn('mx-auto', 'w-full', 'sm:w-sm')}>
        <AnimatePresence mode="wait">
          {pageState === "otp-entry" ? (
            /* ── OTP verification screen ── */
            <motion.div
              key="otp-entry"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
              className="space-y-6"
            >
              <div className={cn('flex', 'flex-col', 'space-y-1')}>
                <h1 className={cn('font-cirka', 'font-bold', 'text-2xl', 'tracking-wide')}>Confirm Your Email</h1>
                <p className={cn('text-base', 'text-muted-foreground')}>
                  We sent a 6-digit confirmation code to{" "}
                  <span className={cn('font-medium', 'text-foreground')}>{email}</span>.
                  Enter it below to activate your account.
                </p>
              </div>
              <form className="space-y-4" onSubmit={handleVerifyOtp}>
                <div className={cn('flex', 'justify-center')}>
                  <InputOTP
                    autoFocus
                    maxLength={6}
                    value={otp}
                    onChange={(v) => {
                      setOtp(v);
                      if (error) setError(null);
                      if (v.length === 6 && !isLoading && !isRedirecting) {
                        handleVerifyOtp(undefined, v);
                      }
                    }}
                    disabled={isBusy}
                  >
                    <InputOTPGroup>
                      <InputOTPSlot index={0} />
                      <InputOTPSlot index={1} />
                      <InputOTPSlot index={2} />
                      <InputOTPSlot index={3} />
                      <InputOTPSlot index={4} />
                      <InputOTPSlot index={5} />
                    </InputOTPGroup>
                  </InputOTP>
                </div>

                {error && (
                  <motion.p
                    initial={{ opacity: 0, x: -6 }}
                    animate={{ opacity: 1, x: [0, -6, 6, -4, 4, 0] }}
                    transition={{ duration: 0.3 }}
                    className={cn('text-sm', 'text-destructive', 'rounded-md', 'bg-destructive/10', 'px-3', 'py-2', 'text-center')}
                  >
                    {error}
                  </motion.p>
                )}

                <Button
                  className={cn('w-full', 'cursor-pointer')}
                  type="submit"
                  disabled={isBusy || otp.length < 6}
                >
                  {isRedirecting ? (
                    <>
                      <Loader2Icon className={cn('mr-2', 'h-4', 'w-4', 'animate-spin')} />
                      Redirecting…
                    </>
                  ) : isLoading ? (
                    <>
                      <Loader2Icon className={cn('mr-2', 'h-4', 'w-4', 'animate-spin')} />
                      Verifying…
                    </>
                  ) : (
                    "Confirm & Create Account"
                  )}
                </Button>
              </form>

              <div className={cn('rounded-md', 'border', 'bg-muted/40', 'px-4', 'py-3', 'text-sm', 'text-muted-foreground')}>
                <span>
                  Didn&apos;t receive it?{" "}
                  {resendCooldown > 0 ? (
                    <span>Resend in {resendCooldown}s</span>
                  ) : (
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={handleResend}
                      className={cn('underline', 'underline-offset-4', 'hover:text-foreground', 'disabled:opacity-50', 'disabled:cursor-not-allowed', 'cursor-pointer')}
                    >
                      Resend code
                    </button>
                  )}{" "}
                  or check your spam folder.
                </span>
              </div>

              <button
                type="button"
                disabled={isBusy}
                onClick={() => {
                  setPageState("register-form");
                  setOtp("");
                  setError(null);
                }}
                className={cn('w-full', 'text-center', 'text-sm', 'text-muted-foreground', 'underline', 'underline-offset-4', 'hover:text-foreground', 'disabled:opacity-50', 'disabled:cursor-not-allowed', 'cursor-pointer')}
              >
                Back to sign up
              </button>
            </motion.div>
          ) : (
            /* ── Registration form ── */
            <motion.div
              key="register-form"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
              className="space-y-4"
            >
              <div className={cn('flex', 'flex-col', 'space-y-1')}>
                <h1 className={cn('font-cirka', 'font-bold', 'text-2xl', 'tracking-wide')}>Create an Account</h1>
                <p className={cn('text-base', 'text-muted-foreground')}>
                  Sign up to get started with PlaceTrix.
                </p>
              </div>
              <Button
                className={cn('w-full', 'cursor-pointer')}
                variant="outline"
                type="button"
                onClick={handleGoogleSignUp}
                disabled={isBusy}
              >
                {isGoogleLoading ? (
                  <Loader2Icon className={cn('mr-2', 'h-4', 'w-4', 'animate-spin')} />
                ) : (
                  <GoogleIcon className={cn('mr-2', 'h-4', 'w-4')} />
                )}
                {isGoogleLoading ? "Redirecting…" : "Continue with Google"}
              </Button>

              <div className={cn('flex', 'w-full', 'items-center', 'justify-center', 'gap-2')}>
                <Separator className="flex-1" />
                <span className={cn('shrink-0', 'text-muted-foreground', 'text-xs')}>OR</span>
                <Separator className="flex-1" />
              </div>

              <form className="space-y-4" onSubmit={handleSignUp}>
                <p className={cn('text-start', 'text-muted-foreground', 'text-xs')}>
                  Fill in your details to create an account
                </p>

                <Input
                  autoFocus
                  placeholder="Full Name "
                  type="text"
                  autoComplete="name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  disabled={isBusy}
                />

                <Input
                  placeholder="your.email@example.com"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isBusy}
                />

                <InputGroup>
                  <InputGroupInput
                    placeholder="Password (min. 6 characters)"
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isBusy}
                  />
                  <InputGroupAddon
                    align="inline-end"
                    className="cursor-pointer"
                    role="button"
                    tabIndex={-1}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    onClick={() => setShowPassword((p) => !p)}
                  >
                    {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                  </InputGroupAddon>
                </InputGroup>

                <PasswordStrength password={password} />

                <InputGroup>
                  <InputGroupInput
                    placeholder="Confirm Password"
                    type={showConfirmPassword ? "text" : "password"}
                    autoComplete="new-password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    disabled={isBusy}
                  />
                  <InputGroupAddon
                    align="inline-end"
                    className="cursor-pointer"
                    role="button"
                    tabIndex={-1}
                    aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
                    onClick={() => setShowConfirmPassword((p) => !p)}
                  >
                    {showConfirmPassword ? <EyeOffIcon /> : <EyeIcon />}
                  </InputGroupAddon>
                </InputGroup>

                {error && (
                  <motion.p
                    initial={{ opacity: 0, x: -6 }}
                    animate={{ opacity: 1, x: [0, -6, 6, -4, 4, 0] }}
                    transition={{ duration: 0.3 }}
                    className={cn('text-sm', 'text-destructive', 'rounded-md', 'bg-destructive/10', 'px-3', 'py-2')}
                  >
                    {error}
                  </motion.p>
                )}

                <Button
                  className={cn('w-full', 'cursor-pointer')}
                  type="submit"
                  disabled={isBusy}
                >
                  {isLoading ? (
                    <>
                      <Loader2Icon className={cn('mr-2', 'h-4', 'w-4', 'animate-spin')} />
                      Creating account…
                    </>
                  ) : (
                    "Create Account"
                  )}
                </Button>
              </form>

              <p className={cn('text-center', 'text-sm', 'text-muted-foreground', 'pt-2')}>
                Already have an account?{" "}
                <Link
                  href={isBusy ? "#" : "/auth/login"}
                  className={`underline underline-offset-4 hover:text-primary transition-all ${
                    isBusy ? "pointer-events-none opacity-50" : ""
                  }`}
                >
                  Sign in
                </Link>
              </p>
              <p className={cn('text-muted-foreground', 'text-xs', 'text-center', 'pt-1')}>
                By creating an account, you agree to our{" "}
                <Link
                  href="/terms-of-service"
                  className={cn('underline', 'underline-offset-4', 'hover:text-primary')}
                >
                  Terms
                </Link>{" "}
                and{" "}
                <Link
                  href="/privacy-policy"
                  className={cn('underline', 'underline-offset-4', 'hover:text-primary')}
                >
                  Privacy Policy
                </Link>
                .
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}
