"use client";

import { useState, useEffect, useTransition, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { UserProfile } from "@/lib/supabase/profile";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardAction } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader,
  AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { parseUserAgent } from "@/lib/ua-parser";
import {
  Loader2, CheckCircle2, Eye, EyeOff, KeyRound, Clock,
  Monitor, Smartphone, Tablet, RefreshCw, LogOut, MapPin,
  ShieldAlert, CalendarClock,
} from "lucide-react";
import { MfaTwoFactor } from "@/components/ui/mfa-two-factor";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
  userProfile: UserProfile;
  initialData: any;
}

interface SessionEntry {
  id: string;
  created_at: string | null;
  updated_at: string | null;
  not_after: string | null;
  ip: unknown;
  user_agent: string | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTimeAgo(dateStr: string | null): string {
  if (!dateStr) return "Unknown";
  const date = new Date(dateStr);
  const diffMs = Date.now() - date.getTime();
  const diffSecs = Math.floor(Math.abs(diffMs) / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  if (diffSecs < 60) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 30) return `${diffDays}d ago`;
  return date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function formatExpiry(dateStr: string | null): string | null {
  if (!dateStr) return null;
  const date = new Date(dateStr);
  if (date < new Date()) return null;
  return date.toLocaleDateString("en-IN", {
    day: "numeric", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function isExpired(not_after: string | null): boolean {
  return !!not_after && new Date(not_after) < new Date();
}

// ─── Password Strength ────────────────────────────────────────────────────────

interface StrengthResult {
  score: 0 | 1 | 2 | 3 | 4;
  label: string;
  color: string;
}

function getPasswordStrength(password: string): StrengthResult {
  if (!password) return { score: 0, label: "", color: "" };
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  const clamped = Math.min(score, 4) as 0 | 1 | 2 | 3 | 4;
  const labels = ["", "Weak", "Fair", "Good", "Strong"];
  const colors = ["", "text-destructive", "text-amber-500", "text-yellow-500 dark:text-yellow-400", "text-emerald-600 dark:text-emerald-400"];
  return { score: clamped, label: labels[clamped], color: colors[clamped] };
}

function PasswordStrengthBar({ score }: { score: 0 | 1 | 2 | 3 | 4 }) {
  if (score === 0) return null;
  const segColors: Record<number, string> = {
    1: "bg-destructive", 2: "bg-amber-500", 3: "bg-yellow-500", 4: "bg-emerald-500",
  };
  return (
    <div className="flex gap-1 mt-1.5">
      {[1, 2, 3, 4].map((s) => (
        <div
          key={s}
          className={cn(
            "h-1 flex-1 rounded-full transition-colors duration-200",
            s <= score ? segColors[score] : "bg-muted"
          )}
        />
      ))}
    </div>
  );
}

// ─── Tab config ───────────────────────────────────────────────────────────────

type Tab = "security" | "notifications" | "history" | "privacy";

const TABS: { value: Tab; label: string }[] = [
  { value: "security", label: "Security" },
  { value: "notifications", label: "Notifications" },
  { value: "history", label: "Login History" },
  { value: "privacy", label: "Privacy" },
];

function DeviceIcon({ device }: { device: "desktop" | "mobile" | "tablet" }) {
  const cls = "h-4 w-4 text-muted-foreground shrink-0 mt-0.5";
  if (device === "mobile") return <Smartphone className={cls} />;
  if (device === "tablet") return <Tablet className={cls} />;
  return <Monitor className={cls} />;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function AdminSettingsClient({ userProfile }: Props) {
  const supabase = createClient();
  const [isPwPending, startPwTransition] = useTransition();
  const [activeTab, setActiveTab] = useState<Tab>("security");

  // Login History
  const [sessions, setSessions] = useState<SessionEntry[]>([]);
  const [sessionsLoading, setSessLoading] = useState(true);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [revokingAll, setRevokingAll] = useState(false);

  // ─── Password state ──────────────────────────────────────────────────────────
  const [pwCurrent, setPwCurrent] = useState("");
  const [pwNew, setPwNew] = useState("");
  const [pwConfirm, setPwConfirm] = useState("");
  const [pwShowCurrent, setPwShowCurrent] = useState(false);
  const [pwShowNew, setPwShowNew] = useState(false);
  const [pwShowConfirm, setPwShowConfirm] = useState(false);
  const [pwErrors, setPwErrors] = useState<Record<string, string>>({});
  const [pwSuccess, setPwSuccess] = useState(false);

  const pwStrength = getPasswordStrength(pwNew);
  const pwConfirmMatch = pwConfirm.length > 0 && pwConfirm === pwNew;
  const pwConfirmMismatch = pwConfirm.length > 0 && pwConfirm !== pwNew;

  // ─── Login History Loading ───────────────────────────────────────────────────

  const loadSessions = useCallback(async () => {
    setSessLoading(true);
    try {
      const { data, error: authError } = await supabase.auth.getClaims();
      const user = data?.claims as any;
      if (!user || authError) { setSessions([]); return; }
      
      if (user.session_id) setCurrentSessionId(user.session_id);
      
      const { data: sessionData, error } = await (supabase as any)
        .from("user_sessions")
        .select("id, created_at, updated_at, not_after, ip, user_agent")
        .eq("user_id", user.sub)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      setSessions(sessionData ?? []);
    } catch {
      toast.error("Failed to load login history.");
    } finally {
      setSessLoading(false);
    }
  }, [supabase]);

  useEffect(() => { loadSessions(); }, [loadSessions]);

  async function handleRevokeSession(sessionId: string) {
    setRevokingId(sessionId);
    try {
      const { error } = await (supabase as any).rpc("revoke_session", { p_session_id: sessionId });
      if (error) throw error;
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
      toast.success("Session revoked.");
    } catch (err: any) {
      toast.error(err.message ?? "Failed to revoke session.");
    } finally {
      setRevokingId(null);
    }
  }

  async function handleRevokeAllSessions() {
    const others = sessions.filter((s) => s.id !== currentSessionId);
    if (!others.length) { toast.info("No other active sessions."); return; }
    setRevokingAll(true);
    try {
      const ids = others.map((s) => s.id);
      const { error } = await (supabase as any).rpc("revoke_sessions_batch", { p_session_ids: ids });
      if (error) throw error;

      setSessions((prev) => prev.filter((s) => s.id === currentSessionId));
      toast.success(`${ids.length} session${ids.length !== 1 ? "s" : ""} revoked.`);
    } catch (err: any) {
      toast.error(err.message ?? "Failed to revoke sessions.");
    } finally {
      setRevokingAll(false);
    }
  }

  const otherSessionCount = sessions.filter((s) => s.id !== currentSessionId).length;

  // ─── Password handlers ───────────────────────────────────────────────────────

  function clearPwError(key: string) {
    setPwErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }

  function validatePassword(): Record<string, string> {
    const e: Record<string, string> = {};
    if (!pwCurrent) e.current = "Current password is required.";
    if (!pwNew) e.new = "New password is required.";
    else if (pwNew.length < 8) e.new = "Password must be at least 8 characters.";
    else if (pwStrength.score < 2) e.new = "Password is too weak — add uppercase letters, numbers, or symbols.";
    else if (pwCurrent && pwNew === pwCurrent) e.new = "New password must be different from your current password.";
    if (!pwConfirm) e.confirm = "Please confirm your new password.";
    else if (pwConfirm !== pwNew) e.confirm = "Passwords do not match.";
    return e;
  }

  function handlePasswordSubmit() {
    const errs = validatePassword();
    setPwErrors(errs);
    if (Object.keys(errs).length > 0) return;

    startPwTransition(async () => {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: userProfile.email,
        password: pwCurrent,
      });
      if (signInError) {
        setPwErrors({ current: "Current password is incorrect." });
        return;
      }

      const { error: updateError } = await supabase.auth.updateUser({ password: pwNew });
      if (updateError) {
        const msg = updateError.message ?? "";
        if (msg.toLowerCase().includes("same") || msg.toLowerCase().includes("different")) {
          setPwErrors({ new: "New password must be different from your current password." });
        } else if (msg.toLowerCase().includes("weak")) {
          setPwErrors({ new: "Password does not meet security requirements." });
        } else {
          toast.error("Failed to update password. Please try again.");
        }
        return;
      }

      toast.success("Password updated successfully!");
      setPwSuccess(true);
      setPwCurrent(""); setPwNew(""); setPwConfirm("");
      setPwErrors({});
    });
  }

  return (
    <div className="flex flex-col gap-6 px-4 py-8 md:px-8">
      {/* Page Header */}
      <div className="flex flex-col gap-1.5">
        <h1 className="text-3xl font-bold font-cirka tracking-tight text-foreground">Settings</h1>
        <p className="text-sm text-muted-foreground">Manage your administrator preferences and security</p>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as Tab)}>
        {/* Tab Bar */}
        <div className="overflow-x-auto">
          <TabsList className="inline-flex h-9 gap-0.5 rounded-lg bg-muted p-1">
            {TABS.map(({ value, label }) => (
              <TabsTrigger
                key={value}
                value={value}
                className="gap-1.5 rounded-md px-3 text-xs font-medium data-[state=active]:bg-background data-[state=active]:shadow-sm"
              >
                {label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        <div className="mt-4">
          {/* ── SECURITY TAB ── */}
          <TabsContent value="security" className="space-y-6 mt-0">
            {/* Change Password */}
            <Card>
              <CardHeader>
                <CardTitle>Change Password</CardTitle>
                <CardDescription>Keep your administrator credentials secure</CardDescription>
              </CardHeader>
              <CardContent>
                {pwSuccess ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10">
                      <CheckCircle2 className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-sm font-medium">Password updated successfully</p>
                      <p className="text-xs text-muted-foreground">Your new password is active on all devices.</p>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => setPwSuccess(false)}>
                      Change Again
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4 max-w-sm">
                    {/* Current Password */}
                    <div className="space-y-2">
                      <Label htmlFor="pw-current">Current Password</Label>
                      <div className="relative">
                        <Input
                          id="pw-current"
                          type={pwShowCurrent ? "text" : "password"}
                          placeholder="Enter current password"
                          value={pwCurrent}
                          autoComplete="current-password"
                          disabled={isPwPending}
                          className={cn("pr-10", pwErrors.current && "border-destructive focus-visible:ring-destructive")}
                          onChange={(e) => { setPwCurrent(e.target.value); clearPwError("current"); }}
                        />
                        <button
                          type="button"
                          tabIndex={-1}
                          onClick={() => setPwShowCurrent((v) => !v)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                        >
                          {pwShowCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                      {pwErrors.current && <p className="text-xs text-destructive">{pwErrors.current}</p>}
                    </div>

                    {/* New Password */}
                    <div className="space-y-2">
                      <Label htmlFor="pw-new">New Password</Label>
                      <div className="relative">
                        <Input
                          id="pw-new"
                          type={pwShowNew ? "text" : "password"}
                          placeholder="Enter new password"
                          value={pwNew}
                          autoComplete="new-password"
                          disabled={isPwPending}
                          className={cn("pr-10", pwErrors.new && "border-destructive focus-visible:ring-destructive")}
                          onChange={(e) => { setPwNew(e.target.value); clearPwError("new"); }}
                        />
                        <button
                          type="button"
                          tabIndex={-1}
                          onClick={() => setPwShowNew((v) => !v)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                        >
                          {pwShowNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                      {pwNew ? (
                        <>
                           <PasswordStrengthBar score={pwStrength.score} />
                          <p className={cn("text-xs", pwStrength.color)}>{pwStrength.label}</p>
                        </>
                      ) : (
                        <p className="text-xs text-muted-foreground">
                          Min. 8 characters · Uppercase, lowercase, numbers &amp; symbols recommended
                        </p>
                      )}
                      {pwErrors.new && <p className="text-xs text-destructive">{pwErrors.new}</p>}
                    </div>

                    {/* Confirm Password */}
                    <div className="space-y-2">
                      <Label htmlFor="pw-confirm">Confirm New Password</Label>
                      <div className="relative">
                        <Input
                          id="pw-confirm"
                          type={pwShowConfirm ? "text" : "password"}
                          placeholder="Confirm new password"
                          value={pwConfirm}
                          autoComplete="new-password"
                          disabled={isPwPending}
                          className={cn(
                            "pr-10",
                            pwConfirmMatch && "border-emerald-500 focus-visible:ring-emerald-500",
                            (pwConfirmMismatch && !pwErrors.confirm) && "border-destructive focus-visible:ring-destructive",
                            pwErrors.confirm && "border-destructive focus-visible:ring-destructive"
                          )}
                          onChange={(e) => { setPwConfirm(e.target.value); clearPwError("confirm"); }}
                        />
                        <button
                          type="button"
                          tabIndex={-1}
                          onClick={() => setPwShowConfirm((v) => !v)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                        >
                          {pwShowConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                      {pwConfirmMatch && (
                        <p className="text-xs text-emerald-600 dark:text-emerald-400">Passwords match ✓</p>
                      )}
                      {pwConfirmMismatch && !pwErrors.confirm && (
                        <p className="text-xs text-destructive">Passwords do not match.</p>
                      )}
                      {pwErrors.confirm && <p className="text-xs text-destructive">{pwErrors.confirm}</p>}
                    </div>

                    <Button onClick={handlePasswordSubmit} disabled={isPwPending} className="gap-2">
                      {isPwPending
                        ? <><Loader2 className="h-4 w-4 animate-spin" />Updating Password…</>
                        : <><KeyRound className="h-4 w-4" />Update Password</>}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Two-Factor Authentication */}
            <Card>
              <CardHeader>
                <CardTitle>Two-Factor Authentication</CardTitle>
                <CardDescription>Add an extra layer of security to your administrator account</CardDescription>
              </CardHeader>
              <CardContent>
                <MfaTwoFactor />
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── NOTIFICATIONS TAB ── */}
          <TabsContent value="notifications" className="mt-0">
            <Card>
              <CardHeader>
                <CardTitle>Notification Preferences</CardTitle>
                <CardDescription>Configure alerts for support tickets and system events</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {[
                  { label: "Admin Alerts", desc: "Receive email alerts when new support tickets are created" },
                  { label: "System Alerts", desc: "Get notified of critical server migrations and updates" },
                ].map(({ label, desc }) => (
                  <div key={label} className="flex items-center justify-between">
                    <div>
                      <Label>{label}</Label>
                      <p className="text-sm text-muted-foreground">{desc}</p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── LOGIN HISTORY TAB ── */}
          <TabsContent value="history" className="mt-0">
            <Card>
              <CardHeader>
                <CardTitle>Login History</CardTitle>
                <CardDescription>Devices currently signed in to your administrator account</CardDescription>
                <CardAction>
                  <Button variant="outline" size="sm" onClick={loadSessions} disabled={sessionsLoading} className="gap-1.5 text-xs h-8">
                    {sessionsLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                    Refresh
                  </Button>
                </CardAction>
              </CardHeader>
              <CardContent className="space-y-4">
                {!sessionsLoading && otherSessionCount > 0 && (
                  <div className="flex items-center justify-between rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <ShieldAlert className="h-4 w-4 text-destructive" />
                      <span className="text-xs font-medium text-destructive">
                        {otherSessionCount} other active session{otherSessionCount !== 1 ? "s" : ""} detected
                      </span>
                    </div>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="sm" disabled={revokingAll} className="h-7 px-3 text-xs gap-1.5">
                          {revokingAll ? <Loader2 className="h-3 w-3 animate-spin" /> : <LogOut className="h-3 w-3" />}
                          Sign out all
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Sign out all other sessions?</AlertDialogTitle>
                          <AlertDialogDescription>
                            <strong>{otherSessionCount} other device{otherSessionCount !== 1 ? "s" : ""}</strong>{" "}
                            will be signed out immediately. Your current session will remain active.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={handleRevokeAllSessions}>
                            Sign out all
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                )}

                {sessionsLoading && (
                  <div className="space-y-2">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="flex items-center gap-3 rounded-lg border p-3.5 animate-pulse">
                        <div className="h-9 w-9 rounded-md bg-muted shrink-0" />
                        <div className="flex-1 space-y-2">
                          <div className="h-3 w-1/3 rounded bg-muted" />
                          <div className="h-2.5 w-1/2 rounded bg-muted" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {!sessionsLoading && sessions.length === 0 && (
                  <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12 text-center">
                    <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                      <Clock className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <p className="text-sm font-medium">No sessions found</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">Login activity will appear here once detected.</p>
                  </div>
                )}

                {!sessionsLoading && sessions.length > 0 && (
                  <div className="space-y-2">
                    {sessions.map((session) => {
                      const { browser, os, device } = parseUserAgent(session.user_agent);
                      const isCurrent = session.id === currentSessionId;
                      const expired = isExpired(session.not_after);
                      const expiryLabel = formatExpiry(session.not_after);
                      const isRevoking = revokingId === session.id;

                      return (
                        <div
                          key={session.id}
                          className={cn(
                            "group flex items-center justify-between gap-3 rounded-lg border bg-card px-4 py-3 transition-colors",
                            isCurrent && "border-primary/30 bg-primary/5",
                            expired && !isCurrent && "opacity-50"
                          )}
                        >
                          <div className={cn(
                            "flex h-9 w-9 shrink-0 items-center justify-center rounded-md",
                            isCurrent ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                          )}>
                            <DeviceIcon device={device} />
                          </div>

                          <div className="flex-1 min-w-0 space-y-1">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="text-sm font-medium leading-none truncate">{browser} on {os}</span>
                              {isCurrent && (
                                <Badge className="h-4 px-1.5 text-[10px] rounded-sm bg-primary/15 text-primary border-0 font-medium">
                                  This device
                                </Badge>
                              )}
                              {expired && (
                                <Badge className="h-4 px-1.5 text-[10px] rounded-sm bg-orange-500/10 text-orange-600 dark:text-orange-400 border-0 font-medium">
                                  Expired
                                </Badge>
                              )}
                            </div>
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
                              {session.ip != null && (
                                <span className="flex items-center gap-1">
                                  <MapPin className="h-2.5 w-2.5" />{String(session.ip)}
                                </span>
                              )}
                              <span className="flex items-center gap-1">
                                <Clock className="h-2.5 w-2.5" />Signed in {formatTimeAgo(session.created_at)}
                              </span>
                              {session.updated_at && session.updated_at !== session.created_at && (
                                <span className="flex items-center gap-1">
                                  <RefreshCw className="h-2.5 w-2.5" />Last active {formatTimeAgo(session.updated_at)}
                                </span>
                              )}
                              {expiryLabel && (
                                <span className="flex items-center gap-1">
                                  <CalendarClock className="h-2.5 w-2.5" />Expires {expiryLabel}
                                </span>
                              )}
                            </div>
                          </div>

                          {!isCurrent && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  disabled={isRevoking || revokingAll}
                                  className="h-8 w-8 shrink-0 text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-destructive hover:bg-destructive/10 transition-all"
                                >
                                  {isRevoking ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <LogOut className="h-3.5 w-3.5" />}
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Sign out this device?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    <strong>{browser} on {os}</strong>
                                    {session.ip != null ? ` (IP: ${String(session.ip)})` : ""} will be signed out immediately.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    onClick={() => handleRevokeSession(session.id)}
                                  >
                                    Sign out
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── PRIVACY TAB ── */}
          <TabsContent value="privacy" className="space-y-6 mt-0">
            <Card>
              <CardHeader>
                <CardTitle>Privacy Controls</CardTitle>
                <CardDescription>Manage your administrator privacy settings</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {[
                  { label: "Activity Logging", desc: "Log my administrative changes for security audit trails" },
                ].map(({ label, desc }) => (
                  <div key={label} className="flex items-center justify-between">
                    <div>
                      <Label>{label}</Label>
                      <p className="text-sm text-muted-foreground">{desc}</p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
