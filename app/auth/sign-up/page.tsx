// app/auth/sign-up/page.tsx
//
// Sign-up flow:
//
//   register-form → signUp({ email, password, options: { data: { full_name } } })
//                   ✓ success → otp-entry (email confirmation code)
//
//   otp-entry     → verifyOtp({ email, token, type: 'signup' })
//                   ✓ verified → session active → redirect /home
//
"use client";

import type React from "react";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Suspense } from "react";
import { cn } from "@/lib/utils";
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
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { GoogleOneTap } from "@/components/auth/google-one-tap";

type PageState = "register-form" | "otp-entry";

const RESEND_COOLDOWN = 60;

const GoogleIcon = (props: React.ComponentProps<"svg">) => (
  <svg fill="currentColor" viewBox="0 0 24 24" {...props}>
    <path d="M12.479,14.265v-3.279h11.049c0.108,0.571,0.164,1.247,0.164,1.979c0,2.46-0.672,5.502-2.84,7.669C18.744,22.829,16.051,24,12.483,24C5.869,24,0.308,18.613,0.308,12S5.869,0,12.483,0c3.659,0,6.265,1.436,8.223,3.307L18.392,5.62c-1.404-1.317-3.307-2.341-5.913-2.341C7.65,3.279,3.873,7.171,3.873,12s3.777,8.721,8.606,8.721c3.132,0,4.916-1.258,6.059-2.401c0.927-0.927,1.537-2.251,1.777-4.059L12.479,14.265z" />
  </svg>
);

export default function SignUpPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto flex sm:w-sm items-center justify-center py-12">
          <Loader2Icon className="h-6 w-6 animate-spin text-muted-foreground" />
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

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [otp, setOtp] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [isLoading, setIsLoading] = useState(false);
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
      const { error } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?next=/home`,
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

      router.push("/home");
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
    }
  };

  // OTP verification screen
  if (pageState === "otp-entry") {
    return (
      <div className="mx-auto space-y-6 sm:w-sm">
        <div className="flex flex-col space-y-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <MailIcon className="h-6 w-6 text-primary" />
          </div>
          <div className="space-y-1">
            <h1 className="font-cirka font-bold text-2xl tracking-wide">Confirm Your Email</h1>
            <p className="text-base text-muted-foreground">
              We sent a 6-digit confirmation code to{" "}
              <span className="font-medium text-foreground">{email}</span>.
              Enter it below to activate your account.
            </p>
          </div>
        </div>
        <form className="space-y-4" onSubmit={handleVerifyOtp}>
          <OTPInput
            value={otp}
            onChange={(v) => {
              setOtp(v);
              if (v.length === 6 && !isLoading) {
                handleVerifyOtp(undefined, v);
              }
            }}
            disabled={isLoading}
          />

          {error && (
            <p className="text-sm text-destructive rounded-md bg-destructive/10 px-3 py-2 text-center">
              {error}
            </p>
          )}

          <Button
            className="w-full cursor-pointer"
            type="submit"
            disabled={isLoading || otp.length < 6}
          >
            {isLoading ? (
              <>
                <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                Verifying…
              </>
            ) : (
              "Confirm & Create Account"
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
            setPageState("register-form");
            setOtp("");
            setError(null);
          }}
          className="w-full text-center text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          Back to sign up
        </button>
      </div>
    );
  }

  // Registration form
  return (
    <div className="mx-auto space-y-4 sm:w-sm">
      <GoogleOneTap />
      <div className="flex flex-col space-y-1">
        <h1 className="font-cirka font-bold text-2xl tracking-wide">Create an Account</h1>
        <p className="text-base text-muted-foreground">
          Sign up to get started with Placetrix.
        </p>
      </div>
      <Button
        className="w-full cursor-pointer"
        variant="outline"
        type="button"
        onClick={handleGoogleSignUp}
        disabled={isGoogleLoading || isLoading}
      >
        {isGoogleLoading ? (
          <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <GoogleIcon className="mr-2 h-4 w-4" />
        )}
        {isGoogleLoading ? "Redirecting\u2026" : "Continue with Google"}
      </Button>

      <div className="flex w-full items-center justify-center gap-2">
        <Separator className="flex-1" />
        <span className="shrink-0 text-muted-foreground text-xs">OR</span>
        <Separator className="flex-1" />
      </div>

      <form className="space-y-4" onSubmit={handleSignUp}>
        <p className="text-start text-muted-foreground text-xs">
          Fill in your details to create an account
        </p>

        <InputGroup>
          <InputGroupInput
            autoFocus
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

        <InputGroup>
          <InputGroupInput
            placeholder="Password (min. 6 characters)"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
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

        {password.length > 0 && (
          <div className="space-y-1.5 pt-0.5">
            <div className="grid grid-cols-4 gap-1.5 h-1.5 w-full">
              {[1, 2, 3, 4].map((step) => {
                let score = 0;
                if (password.length >= 6) score++;
                if (password.length >= 10) score++;
                if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
                if (/[0-9]/.test(password) || /[^A-Za-z0-9]/.test(password)) score++;
                
                const isActive = step <= score;
                let color = "bg-muted";
                if (isActive) {
                  if (score <= 1) color = "bg-rose-500";
                  else if (score <= 3) color = "bg-amber-500";
                  else color = "bg-emerald-500";
                }
                return (
                  <div
                    key={step}
                    className={cn("rounded-full transition-all duration-300", color)}
                  />
                );
              })}
            </div>
            <div className="flex justify-between items-center text-[10px] text-muted-foreground font-medium">
              <span>Password strength</span>
              <span className={cn(
                (() => {
                  let score = 0;
                  if (password.length >= 6) score++;
                  if (password.length >= 10) score++;
                  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
                  if (/[0-9]/.test(password) || /[^A-Za-z0-9]/.test(password)) score++;
                  return score <= 1 ? "text-rose-500" : score <= 3 ? "text-amber-500" : "text-emerald-500";
                })()
              )}>
                {(() => {
                  let score = 0;
                  if (password.length >= 6) score++;
                  if (password.length >= 10) score++;
                  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
                  if (/[0-9]/.test(password) || /[^A-Za-z0-9]/.test(password)) score++;
                  return score <= 1 ? "Weak" : score <= 3 ? "Fair" : "Strong";
                })()}
              </span>
            </div>
          </div>
        )}

        <InputGroup>
          <InputGroupInput
            placeholder="Confirm Password"
            type={showConfirmPassword ? "text" : "password"}
            autoComplete="new-password"
            required
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            disabled={isLoading || isGoogleLoading}
          />
          <InputGroupAddon align="inline-start">
            <LockIcon />
          </InputGroupAddon>
          <InputGroupAddon
            align="inline-end"
            className="cursor-pointer"
            onClick={() => setShowConfirmPassword((p) => !p)}
          >
            {showConfirmPassword ? <EyeOffIcon /> : <EyeIcon />}
          </InputGroupAddon>
        </InputGroup>

        {error && (
          <p className="text-sm text-destructive rounded-md bg-destructive/10 px-3 py-2">
            {error}
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
              Creating account…
            </>
          ) : (
            "Create Account"
          )}
        </Button>
      </form>

      <p className="text-center text-sm text-muted-foreground pt-2">
        Already have an account?{" "}
        <Link
          href={isLoading || isGoogleLoading ? "#" : "/auth/login"}
          className={`underline underline-offset-4 hover:text-primary transition-all ${isLoading || isGoogleLoading ? "pointer-events-none opacity-50" : ""
            }`}
        >
          Sign in
        </Link>
      </p>
      <p className="text-muted-foreground text-xs text-center pt-1">
        By creating an account, you agree to our{" "}
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
  );
}
