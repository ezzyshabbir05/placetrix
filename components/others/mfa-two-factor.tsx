// components/ui/mfa-two-factor.tsx
//
// Shared component that handles TOTP MFA management in Settings pages.
//
// States:
//   loading     → fetching factor list on mount
//   idle        → no factor enrolled; shows "Enable 2FA" button
//   enrolling   → enrollment dialog open (QR code + verify code input)
//   enrolled    → factor active; shows badge + "Remove" button
//
// Uses the Supabase default TOTP MFA APIs:
//   mfa.enroll()    → start enrollment, get QR code
//   mfa.challenge() → create challenge ID
//   mfa.verify()    → confirm the 6-digit TOTP code
//   mfa.unenroll()  → remove the factor
//   mfa.listFactors() → check current enrollment status
"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { OTPInput } from "@/components/others/otp-input";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
// import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  Copy,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

type MfaState = "loading" | "idle" | "enrolling" | "enrolled";

interface TotpFactor {
  id: string;
  friendly_name?: string;
  status: "verified" | "unverified";
}

// ─── Component ────────────────────────────────────────────────────────────────

export function MfaTwoFactor() {
  const supabase = createClient();

  const [mfaState, setMfaState] = useState<MfaState>("loading");
  const [enrolledFactor, setEnrolledFactor] = useState<TotpFactor | null>(null);

  // Enrollment flow state
  const [qrCode, setQrCode] = useState(""); // SVG data URI
  const [secret, setSecret] = useState(""); // fallback manual secret
  const [factorId, setFactorId] = useState("");
  const [verifyCode, setVerifyCode] = useState("");
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isStartingEnroll, setIsStartingEnroll] = useState(false);
  const [isUnenrolling, setIsUnenrolling] = useState(false);
  const [showDisableDialog, setShowDisableDialog] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  const [copiedSecret, setCopiedSecret] = useState(false);

  // ─── Load factor status ────────────────────────────────────────────────────

  const loadFactors = useCallback(async () => {
    try {
      const { data, error } = await supabase.auth.mfa.listFactors();
      if (error) throw error;

      // Only consider 'verified' TOTP factors as active
      const verified = data.totp.find((f) => f.status === "verified");
      if (verified) {
        setEnrolledFactor(verified as TotpFactor);
        setMfaState("enrolled");
      } else {
        setEnrolledFactor(null);
        setMfaState("idle");
      }
    } catch {
      setMfaState("idle");
    }
  }, [supabase]);

  useEffect(() => {
    loadFactors();
  }, [loadFactors]);

  // ─── Enrollment ───────────────────────────────────────────────────────────

  const handleStartEnroll = async () => {
    setVerifyCode("");
    setVerifyError(null);
    setShowSecret(false);
    setCopiedSecret(false);
    setIsStartingEnroll(true);

    try {
      // Clean up any unverified factors to prevent "name already exists" errors
      const { data: listData, error: listError } = await supabase.auth.mfa.listFactors();
      if (!listError && listData?.all) {
        const unverified = listData.all.filter((f: any) => f.status === "unverified" && f.factor_type === "totp");
        for (const factor of unverified) {
          await supabase.auth.mfa.unenroll({ factorId: factor.id });
        }
      }

      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: "totp",
        friendlyName: "Authenticator App",
        issuer: "Placetrix",
      });
      if (error) throw error;

      setFactorId(data.id);
      // Supabase returns QR code as SVG — convert to a data URI for <img>
      setQrCode(data.totp.qr_code);
      setSecret(data.totp.secret);
      setMfaState("enrolling");
    } catch (err: any) {
      toast.error(err.message ?? "Failed to start 2FA setup.");
    } finally {
      setIsStartingEnroll(false);
    }
  };

  const handleVerify = async (codeOverride?: string) => {
    const codeToVerify = codeOverride ?? verifyCode;
    if (codeToVerify.length < 6) {
      setVerifyError("Please enter the full 6-digit code.");
      return;
    }
    setVerifyError(null);
    setIsVerifying(true);

    try {
      // Step 1: create a challenge
      const { data: challengeData, error: challengeError } =
        await supabase.auth.mfa.challenge({ factorId });
      if (challengeError) throw challengeError;

      // Step 2: verify the TOTP code
      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challengeData.id,
        code: codeToVerify,
      });
      if (verifyError) throw verifyError;

      // Success — factor is now verified/active
      toast.success("Two-factor authentication enabled!");
      setVerifyCode("");
      await loadFactors();
    } catch (err: any) {
      const msg = err.message ?? "Invalid code. Please try again.";
      setVerifyError(msg);
      setVerifyCode("");
    } finally {
      setIsVerifying(false);
    }
  };

  const handleCancelEnroll = async () => {
    // Clean up the pending (unverified) factor to avoid orphaned entries
    if (factorId) {
      try {
        await supabase.auth.mfa.unenroll({ factorId });
      } catch {
        // Ignore — cleanup is best-effort
      }
    }
    setMfaState("idle");
    setVerifyCode("");
    setVerifyError(null);
    await loadFactors();
  };

  const handleCopySecret = async () => {
    if (!secret) return;
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(secret);
      } else {
        const textArea = document.createElement("textarea");
        textArea.value = secret;
        textArea.style.position = "fixed";
        textArea.style.left = "-9999px";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);
      }
      setCopiedSecret(true);
      toast.success("Secret key copied to clipboard");
      setTimeout(() => setCopiedSecret(false), 2000);
    } catch (err) {
      toast.error("Failed to copy secret key");
    }
  };

  // ─── Unenrollment ─────────────────────────────────────────────────────────

  const handleUnenroll = async () => {
    if (!enrolledFactor) return;
    setIsUnenrolling(true);

    try {
      const { error } = await supabase.auth.mfa.unenroll({
        factorId: enrolledFactor.id,
      });
      if (error) throw error;

      // Refresh session to immediately downgrade AAL from aal2 → aal1
      await supabase.auth.refreshSession();

      toast.success("Two-factor authentication removed.");
      setShowDisableDialog(false);
      await loadFactors();
    } catch (err: any) {
      toast.error(err.message ?? "Failed to remove 2FA.");
    } finally {
      setIsUnenrolling(false);
    }
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  if (mfaState === "loading") {
    return (
      <div className="flex items-center gap-2.5 py-6 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin text-primary" />
        <span>Checking two-factor authentication status…</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* ── Status Container ─────────────────────────────────────────────────── */}
      {mfaState !== "enrolling" && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-foreground">
                Status:{" "}
                <span className={mfaState === "enrolled" ? "text-emerald-500" : "text-muted-foreground"}>
                  {mfaState === "enrolled" ? "Active" : "Disabled"}
                </span>
              </span>
            </div>
            <p className="text-xs text-muted-foreground leading-normal max-w-xl">
              {mfaState === "enrolled"
                ? "Your account is extra secure. A unique 6-digit verification code from your authenticator app will be required each time you sign in."
                : "Protect your account from unauthorized access by requiring a 6-digit verification code from your authenticator app at login."}
            </p>
          </div>

          <div className="shrink-0 flex items-center pt-3 sm:pt-0 mt-2 sm:mt-0">
            {mfaState === "enrolled" ? (
              <AlertDialog open={showDisableDialog} onOpenChange={setShowDisableDialog}>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-destructive hover:text-destructive border-destructive/30 hover:bg-destructive/5 hover:border-destructive transition-colors"
                  >
                    Disable 2FA
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Disable two-factor authentication?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will remove the extra layer of security on your account.
                      You will only need your password to log in. You can re-enable this at any time.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel disabled={isUnenrolling}>Cancel</AlertDialogCancel>
                    <Button
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      onClick={handleUnenroll}
                      disabled={isUnenrolling}
                    >
                      {isUnenrolling ? (
                        <>
                          <Loader2 className="animate-spin" />
                          Disabling…
                        </>
                      ) : (
                        "Disable 2FA"
                      )}
                    </Button>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            ) : (
              <Button
                size="sm"
                className="shadow-sm hover:shadow"
                onClick={handleStartEnroll}
                disabled={isStartingEnroll}
              >
                {isStartingEnroll ? (
                  <>
                    <Loader2 className="animate-spin" />
                    Setting up…
                  </>
                ) : (
                  "Enable 2FA"
                )}
              </Button>
            )}
          </div>
        </div>
      )}

      {/* ── Enrollment Flow Inline ──────────────────────────────────────────────── */}
      {mfaState === "enrolling" && (
        <div>
          <div className="flex flex-col gap-5 pt-2">
            {/* Step-by-step instructions */}
            <div className="flex flex-col gap-5">

              {/* Step 1 */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center">
                  <p className="text-sm font-semibold text-foreground">
                    1. Install an authenticator app
                  </p>
                </div>
                <div className="text-xs text-muted-foreground leading-normal">
                  Download any compatible app like{" "}
                  <span className="font-medium text-foreground">Google Authenticator</span>,{" "}
                  <span className="font-medium text-foreground">Authy</span>, or{" "}
                  <span className="font-medium text-foreground">Microsoft Authenticator</span>.
                </div>
              </div>

              {/* Step 2 */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center">
                  <p className="text-sm font-semibold text-foreground">
                    2. Scan the QR Code
                  </p>
                </div>
                <div className="flex flex-col gap-3">
                  <p className="text-xs text-muted-foreground leading-normal">
                    Scan the QR code below using your app's camera.
                  </p>

                  {/* QR Code Container */}
                  {qrCode && (
                    <div className="flex flex-col items-center sm:items-start gap-2 py-1">
                      <div className="rounded-xl border bg-white p-3.5 shadow-sm transition-all hover:shadow-md">
                        <img
                          src={qrCode}
                          alt="MFA QR Code"
                          className="h-44 w-44 sm:h-48 sm:w-48 block select-none"
                        />
                      </div>
                    </div>
                  )}

                  {/* Manual Key Section */}
                  <div className="rounded-lg border bg-muted/30 p-2.5 text-xs w-full overflow-hidden min-w-0">
                    <button
                      type="button"
                      onClick={() => setShowSecret(!showSecret)}
                      className="flex items-center gap-1.5 font-medium text-muted-foreground hover:text-foreground transition-colors underline underline-offset-4 outline-none text-left w-full truncate"
                    >
                      {showSecret ? "Hide manual configuration key" : "Can't scan QR code? Show key"}
                    </button>
                    {showSecret && (
                      <div className="mt-2.5 flex items-center justify-between gap-2 rounded-md bg-background border p-2 font-mono w-full min-w-0">
                        <span className="text-foreground break-all select-all text-[11px] flex-1 min-w-0 pr-1">
                          {secret}
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={handleCopySecret}
                          className="h-7 w-7 shrink-0 text-muted-foreground hover:text-foreground hover:bg-muted"
                        >
                          {copiedSecret ? (
                            <Check className="text-emerald-500" />
                          ) : (
                            <Copy />
                          )}
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Step 3 */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center">
                  <p className="text-sm font-semibold text-foreground">
                    3. Verify code
                  </p>
                </div>
                <div className="flex flex-col gap-2.5">
                  <p className="text-xs text-muted-foreground leading-normal font-normal">
                    Enter the 6-digit verification code generated by your app.
                  </p>

                  <div className="flex flex-col gap-2.5">
                    <OTPInput
                      value={verifyCode}
                      onChange={(v) => {
                        setVerifyCode(v);
                        if (verifyError) setVerifyError(null);
                        if (v.length === 6 && !isVerifying) {
                          handleVerify(v);
                        }
                      }}
                      disabled={isVerifying}
                      className="py-1 sm:justify-start"
                    />
                    {verifyError && (
                      <p className="text-xs text-destructive text-center rounded-md bg-destructive/10 px-3 py-2 font-medium animate-in fade-in zoom-in-95 duration-150">
                        {verifyError}
                      </p>
                    )}
                  </div>
                </div>
              </div>

            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2.5 pt-4 mt-4">
              <Button
                variant="outline"
                size="sm"
                className="h-9 text-xs px-4"
                onClick={handleCancelEnroll}
                disabled={isVerifying}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                className="h-9 text-xs px-4"
                onClick={() => handleVerify()}
                disabled={isVerifying || verifyCode.length < 6}
              >
                {isVerifying ? (
                  <>
                    <Loader2 className="animate-spin" />
                    Verifying…
                  </>
                ) : (
                  "Activate 2FA"
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
