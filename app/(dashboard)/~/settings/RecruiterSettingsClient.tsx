"use client"

import { useState, useTransition, useEffect, useCallback, useReducer } from "react"
import { createClient } from "@/lib/supabase/client"
import { UserProfile } from "@/lib/supabase/profile"
import { toast } from "sonner"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardAction } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader,
  AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
  Loader2, RefreshCw, LogOut, Clock, ShieldAlert, CalendarClock,
  Eye, EyeOff, KeyRound, MapPin, Smartphone, Tablet, Monitor,
  CheckCircle2,
} from "lucide-react"
import { cn } from "@/lib/utils"

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
  userProfile: UserProfile
  initialData: Record<string, any> | null
}

interface SessionEntry {
  id: string
  created_at: string | null
  updated_at: string | null
  not_after: string | null
  ip: unknown
  user_agent: string | null
}

interface ParsedUA {
  browser: string
  os: string
  device: "desktop" | "mobile" | "tablet"
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseUserAgent(ua: string | null): ParsedUA {
  if (!ua) return { browser: "Unknown Browser", os: "Unknown OS", device: "desktop" }

  if (
    ua.includes("Next.js") ||
    ua.includes("Middleware") ||
    ua.includes("Vercel") ||
    ua.includes("node-fetch") ||
    ua.includes("undici") ||
    ua.includes("Go-http-client") ||
    ua.includes("postgrest-js") ||
    ua.includes("supabase-js")
  ) {
    return { browser: "System Server", os: "Next.js / Node", device: "desktop" }
  }

  let browser = "Unknown Browser", os = "Unknown OS"
  let device: "desktop" | "mobile" | "tablet" = "desktop"

  if (ua.includes("Edg/") || ua.includes("EdgA/") || ua.includes("Edge/")) browser = "Edge"
  else if (ua.includes("SamsungBrowser/")) browser = "Samsung Browser"
  else if (ua.includes("OPR/") || ua.includes("Opera/")) browser = "Opera"
  else if (ua.includes("Chrome/") && !ua.includes("Chromium/")) browser = "Chrome"
  else if (ua.includes("Firefox/") || ua.includes("FxiOS/")) browser = "Firefox"
  else if (ua.includes("Safari/") && !ua.includes("Chrome/")) browser = "Safari"
  else if (ua.includes("MSIE") || ua.includes("Trident/")) browser = "Internet Explorer"

  if (ua.includes("iPhone")) { os = "iOS"; device = "mobile" }
  else if (ua.includes("iPad")) { os = "iPadOS"; device = "tablet" }
  else if (ua.includes("Android")) { os = "Android"; device = ua.includes("Mobile") ? "mobile" : "tablet" }
  else if (ua.includes("Windows NT")) os = "Windows"
  else if (ua.includes("Macintosh") || ua.includes("Mac OS X")) os = "macOS"
  else if (ua.includes("CrOS")) os = "ChromeOS"
  else if (ua.includes("Linux")) os = "Linux"

  return { browser, os, device }
}

function formatTimeAgo(dateStr: string | null): string {
  if (!dateStr) return "Unknown"
  const date = new Date(dateStr)
  const diffMs = Date.now() - date.getTime()
  const diffSecs = Math.floor(Math.abs(diffMs) / 1000)
  const diffMins = Math.floor(diffSecs / 60)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)
  if (diffSecs < 60) return "Just now"
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 30) return `${diffDays}d ago`
  return date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
}

function formatExpiry(dateStr: string | null): string | null {
  if (!dateStr) return null
  const date = new Date(dateStr)
  if (date < new Date()) return null
  return date.toLocaleDateString("en-IN", {
    day: "numeric", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  })
}

function isExpired(not_after: string | null): boolean {
  return !!not_after && new Date(not_after) < new Date()
}

// ─── Password Strength ────────────────────────────────────────────────────────

interface StrengthResult {
  score: 0 | 1 | 2 | 3 | 4
  label: string
  color: string
}

function getPasswordStrength(password: string): StrengthResult {
  if (!password) return { score: 0, label: "", color: "" }
  let score = 0
  if (password.length >= 8) score++
  if (password.length >= 12) score++
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++
  if (/[0-9]/.test(password)) score++
  if (/[^A-Za-z0-9]/.test(password)) score++
  const clamped = Math.min(score, 4) as 0 | 1 | 2 | 3 | 4
  const labels = ["", "Weak", "Fair", "Good", "Strong"]
  const colors = ["", "text-destructive", "text-amber-500", "text-yellow-500 dark:text-yellow-400", "text-emerald-600 dark:text-emerald-400"]
  return { score: clamped, label: labels[clamped], color: colors[clamped] }
}

function PasswordStrengthBar({ score }: { score: 0 | 1 | 2 | 3 | 4 }) {
  if (score === 0) return null
  const segColors: Record<number, string> = {
    1: "bg-destructive", 2: "bg-amber-500", 3: "bg-yellow-500", 4: "bg-emerald-500",
  }
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
  )
}

// ─── Tab config ───────────────────────────────────────────────────────────────

type Tab = "security" | "notifications" | "history" | "privacy"

const TABS: { value: Tab; label: string }[] = [
  { value: "security", label: "Security" },
  { value: "notifications", label: "Notifications" },
  { value: "history", label: "Login History" },
  { value: "privacy", label: "Privacy" },
]

function DeviceIcon({ device }: { device: "desktop" | "mobile" | "tablet" }) {
  const cls = "size-4 text-muted-foreground shrink-0 mt-0.5"
  if (device === "mobile") return <Smartphone className={cls} />
  if (device === "tablet") return <Tablet className={cls} />
  return <Monitor className={cls} />
}

// ─── Sessions State Reducer ──────────────────────────────────────────────────

interface SessionsState {
  sessions: SessionEntry[]
  loading: boolean
  currentSessionId: string | null
  revokingId: string | null
  revokingAll: boolean
}

type SessionsAction =
  | { type: "FETCH_START" }
  | { type: "FETCH_SUCCESS"; sessions: SessionEntry[]; currentSessionId: string | null }
  | { type: "FETCH_FAILURE" }
  | { type: "REVOKE_START"; sessionId: string }
  | { type: "REVOKE_SUCCESS"; sessionId: string }
  | { type: "REVOKE_FAILURE" }
  | { type: "REVOKE_ALL_START" }
  | { type: "REVOKE_ALL_SUCCESS"; currentSessionId: string | null }
  | { type: "REVOKE_ALL_FAILURE" }

const initialSessionsState: SessionsState = {
  sessions: [],
  loading: true,
  currentSessionId: null,
  revokingId: null,
  revokingAll: false,
}

function sessionsReducer(state: SessionsState, action: SessionsAction): SessionsState {
  switch (action.type) {
    case "FETCH_START":
      return { ...state, loading: true }
    case "FETCH_SUCCESS":
      return {
        ...state,
        loading: false,
        sessions: action.sessions,
        currentSessionId: action.currentSessionId,
      }
    case "FETCH_FAILURE":
      return { ...state, loading: false }
    case "REVOKE_START":
      return { ...state, revokingId: action.sessionId }
    case "REVOKE_SUCCESS":
      return {
        ...state,
        revokingId: null,
        sessions: state.sessions.filter((s) => s.id !== action.sessionId),
      }
    case "REVOKE_FAILURE":
      return { ...state, revokingId: null }
    case "REVOKE_ALL_START":
      return { ...state, revokingAll: true }
    case "REVOKE_ALL_SUCCESS":
      return {
        ...state,
        revokingAll: false,
        sessions: state.sessions.filter((s) => s.id === action.currentSessionId),
      }
    case "REVOKE_ALL_FAILURE":
      return { ...state, revokingAll: false }
    default:
      return state
  }
}

// ─── Password State Reducer ──────────────────────────────────────────────────

interface PasswordState {
  current: string
  new: string
  confirm: string
  showCurrent: boolean
  showNew: boolean
  showConfirm: boolean
  errors: Record<string, string>
  success: boolean
}

type PasswordAction =
  | { type: "SET_FIELD"; field: "current" | "new" | "confirm"; value: string }
  | { type: "TOGGLE_SHOW"; field: "current" | "new" | "confirm" }
  | { type: "SET_ERRORS"; errors: Record<string, string> }
  | { type: "CLEAR_ERROR"; key: string }
  | { type: "SET_SUCCESS"; success: boolean }
  | { type: "RESET_FORM" }

const initialPasswordState: PasswordState = {
  current: "",
  new: "",
  confirm: "",
  showCurrent: false,
  showNew: false,
  showConfirm: false,
  errors: {},
  success: false,
}

function passwordReducer(state: PasswordState, action: PasswordAction): PasswordState {
  switch (action.type) {
    case "SET_FIELD":
      return { ...state, [action.field]: action.value }
    case "TOGGLE_SHOW":
      if (action.field === "current") {
        return { ...state, showCurrent: !state.showCurrent }
      } else if (action.field === "new") {
        return { ...state, showNew: !state.showNew }
      } else {
        return { ...state, showConfirm: !state.showConfirm }
      }
    case "SET_ERRORS":
      return { ...state, errors: action.errors }
    case "CLEAR_ERROR": {
      if (!state.errors[action.key]) return state
      const nextErrors = { ...state.errors }
      delete nextErrors[action.key]
      return { ...state, errors: nextErrors }
    }
    case "SET_SUCCESS":
      return { ...state, success: action.success }
    case "RESET_FORM":
      return {
        ...state,
        current: "",
        new: "",
        confirm: "",
        errors: {},
      }
    default:
      return state
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

export function RecruiterSettingsClient({ userProfile, initialData }: Props) {
  const supabase = createClient()
  const [isPwPending, startPwTransition] = useTransition()
  const [activeTab, setActiveTab] = useState<Tab>("security")

  // Login History State
  const [sessionsState, dispatchSessions] = useReducer(sessionsReducer, initialSessionsState)
  const {
    sessions,
    loading: sessionsLoading,
    currentSessionId,
    revokingId,
    revokingAll,
  } = sessionsState

  // Password State
  const [pwState, dispatchPw] = useReducer(passwordReducer, initialPasswordState)
  const {
    current: pwCurrent,
    new: pwNew,
    confirm: pwConfirm,
    showCurrent: pwShowCurrent,
    showNew: pwShowNew,
    showConfirm: pwShowConfirm,
    errors: pwErrors,
    success: pwSuccess,
  } = pwState

  const pwStrength = getPasswordStrength(pwNew)
  const pwConfirmMatch = pwConfirm.length > 0 && pwConfirm === pwNew
  const pwConfirmMismatch = pwConfirm.length > 0 && pwConfirm !== pwNew

  // Login History
  const loadSessions = useCallback(async () => {
    dispatchSessions({ type: "FETCH_START" })
    try {
      const { data, error: authError } = await supabase.auth.getClaims()
      const user = data?.claims as any
      if (!user || authError) {
        dispatchSessions({ type: "FETCH_SUCCESS", sessions: [], currentSessionId: null })
        return
      }

      const currentId = user.session_id || null

      const { data: sessionData, error } = await supabase
        .from("user_sessions")
        .select("id, created_at, updated_at, not_after, ip, user_agent")
        .eq("user_id", user.sub)
        .order("created_at", { ascending: false })
        .limit(20)
      if (error) throw error
      dispatchSessions({
        type: "FETCH_SUCCESS",
        sessions: sessionData ?? [],
        currentSessionId: currentId,
      })
    } catch {
      toast.error("Failed to load login history.")
      dispatchSessions({ type: "FETCH_FAILURE" })
    }
  }, [supabase])

  useEffect(() => { loadSessions() }, [loadSessions])

  async function handleRevokeSession(sessionId: string) {
    dispatchSessions({ type: "REVOKE_START", sessionId })
    try {
      const { error } = await supabase.rpc("revoke_session", { p_session_id: sessionId })
      if (error) throw error
      dispatchSessions({ type: "REVOKE_SUCCESS", sessionId })
      toast.success("Session revoked.")
    } catch (err: any) {
      toast.error(err.message ?? "Failed to revoke session.")
      dispatchSessions({ type: "REVOKE_FAILURE" })
    }
  }

  async function handleRevokeAllSessions() {
    const others = sessions.filter((s) => s.id !== currentSessionId)
    if (!others.length) { toast.info("No other active sessions."); return }
    dispatchSessions({ type: "REVOKE_ALL_START" })
    try {
      const ids = others.map((s) => s.id)
      const { error } = await supabase.rpc("revoke_sessions_batch", { p_session_ids: ids })
      if (error) throw error

      dispatchSessions({ type: "REVOKE_ALL_SUCCESS", currentSessionId })
      toast.success(`${ids.length} session${ids.length !== 1 ? "s" : ""} revoked.`)
    } catch (err: any) {
      toast.error(err.message ?? "Failed to revoke sessions.")
      dispatchSessions({ type: "REVOKE_ALL_FAILURE" })
    }
  }

  const otherSessionCount = sessions.filter((s) => s.id !== currentSessionId).length

  // Password handlers
  function clearPwError(key: string) {
    dispatchPw({ type: "CLEAR_ERROR", key })
  }

  function validatePassword(): Record<string, string> {
    const e: Record<string, string> = {}
    if (!pwCurrent) e.current = "Current password is required."
    if (!pwNew) e.new = "New password is required."
    else if (pwNew.length < 8) e.new = "Password must be at least 8 characters."
    else if (pwStrength.score < 2) e.new = "Password is too weak — add uppercase letters, numbers, or symbols."
    else if (pwCurrent && pwNew === pwCurrent) e.new = "New password must be different from your current password."
    if (!pwConfirm) e.confirm = "Please confirm your new password."
    else if (pwConfirm !== pwNew) e.confirm = "Passwords do not match."
    return e
  }

  function handlePasswordSubmit() {
    const errs = validatePassword()
    dispatchPw({ type: "SET_ERRORS", errors: errs })
    if (Object.keys(errs).length > 0) return

    startPwTransition(async () => {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: userProfile.email,
        password: pwCurrent,
      })
      if (signInError) {
        dispatchPw({ type: "SET_ERRORS", errors: { current: "Current password is incorrect." } })
        return
      }

      const { error: updateError } = await supabase.auth.updateUser({ password: pwNew })
      if (updateError) {
        const msg = updateError.message ?? ""
        if (msg.toLowerCase().includes("same") || msg.toLowerCase().includes("different")) {
          dispatchPw({ type: "SET_ERRORS", errors: { new: "New password must be different from your current password." } })
        } else if (msg.toLowerCase().includes("weak")) {
          dispatchPw({ type: "SET_ERRORS", errors: { new: "Password does not meet security requirements." } })
        } else {
          toast.error("Failed to update password. Please try again.")
        }
        return
      }

      toast.success("Password updated successfully!")
      dispatchPw({ type: "SET_SUCCESS", success: true })
      dispatchPw({ type: "RESET_FORM" })
    })
  }

  return (
    <div className="flex flex-col gap-6 px-4 py-8 md:px-8">
      {/* Page Header */}
      <div className="flex flex-col gap-1.5">
        <h1 className="text-3xl font-bold font-cirka tracking-tight text-foreground">Settings</h1>
        <p className="text-sm text-muted-foreground">Manage your recruiter preferences and account security</p>
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
                <CardDescription>Keep your account secure with a strong password</CardDescription>
              </CardHeader>
              <CardContent>
                {pwSuccess ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center gap-3">
                    <div className="flex size-12 items-center justify-center rounded-full bg-emerald-500/10">
                      <CheckCircle2 className="size-6 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-sm font-medium">Password updated successfully</p>
                      <p className="text-xs text-muted-foreground">Your new password is active on all devices.</p>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => dispatchPw({ type: "SET_SUCCESS", success: false })}>
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
                          placeholder="Enter your current password"
                          value={pwCurrent}
                          autoComplete="current-password"
                          disabled={isPwPending}
                          className={cn("pr-10", pwErrors.current && "border-destructive focus-visible:ring-destructive")}
                          onChange={(e) => { dispatchPw({ type: "SET_FIELD", field: "current", value: e.target.value }); clearPwError("current") }}
                        />
                        <button
                          type="button"
                          tabIndex={-1}
                          onClick={() => dispatchPw({ type: "TOGGLE_SHOW", field: "current" })}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                        >
                          {pwShowCurrent ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
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
                          placeholder="Enter a strong new password"
                          value={pwNew}
                          autoComplete="new-password"
                          disabled={isPwPending}
                          className={cn("pr-10", pwErrors.new && "border-destructive focus-visible:ring-destructive")}
                          onChange={(e) => { dispatchPw({ type: "SET_FIELD", field: "new", value: e.target.value }); clearPwError("new") }}
                        />
                        <button
                          type="button"
                          tabIndex={-1}
                          onClick={() => dispatchPw({ type: "TOGGLE_SHOW", field: "new" })}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                        >
                          {pwShowNew ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
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
                          placeholder="Re-enter your new password"
                          value={pwConfirm}
                          autoComplete="new-password"
                          disabled={isPwPending}
                          className={cn(
                            "pr-10",
                            pwConfirmMatch && "border-emerald-500 focus-visible:ring-emerald-500",
                            (pwConfirmMismatch && !pwErrors.confirm) && "border-destructive focus-visible:ring-destructive",
                            pwErrors.confirm && "border-destructive focus-visible:ring-destructive"
                          )}
                          onChange={(e) => { dispatchPw({ type: "SET_FIELD", field: "confirm", value: e.target.value }); clearPwError("confirm") }}
                        />
                        <button
                          type="button"
                          tabIndex={-1}
                          onClick={() => dispatchPw({ type: "TOGGLE_SHOW", field: "confirm" })}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                        >
                          {pwShowConfirm ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
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
                        ? <><Loader2 className="size-4 animate-spin" />Updating Password…</>
                        : <><KeyRound className="size-4" />Update Password</>}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Two-Factor Authentication */}
            <Card>
              <CardHeader>
                <CardTitle>Two-Factor Authentication</CardTitle>
                <CardDescription>Add an extra layer of security to your recruiter account</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">Enable 2FA</p>
                    <p className="text-sm text-muted-foreground">Require a verification code when signing in</p>
                  </div>
                  <Switch disabled />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── NOTIFICATIONS TAB ── */}
          <TabsContent value="notifications" className="mt-0">
            <Card>
              <CardHeader><CardTitle>Notification Preferences</CardTitle><CardDescription>Manage how you receive candidate updates</CardDescription></CardHeader>
              <CardContent className="space-y-4">
                {[
                  { label: "Email Alerts", desc: "Receive updates when candidates apply to your job postings" },
                  { label: "Drive Updates", desc: "Get notified about placement drive confirmations" },
                  { label: "System Messages", desc: "Receive direct updates and announcement alerts" },
                ].map(({ label, desc }) => (
                  <div key={label} className="flex items-center justify-between">
                    <div><Label>{label}</Label><p className="text-sm text-muted-foreground">{desc}</p></div>
                    <Switch />
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
                <CardDescription>Devices currently signed in to your recruiter account</CardDescription>
                <CardAction>
                  <Button variant="outline" size="sm" onClick={loadSessions} disabled={sessionsLoading} className="gap-1.5 text-xs h-8">
                    {sessionsLoading ? <Loader2 className="size-3.5 animate-spin" /> : <RefreshCw className="size-3.5" />}
                    Refresh
                  </Button>
                </CardAction>
              </CardHeader>
              <CardContent className="space-y-4">
                {!sessionsLoading && otherSessionCount > 0 && (
                  <div className="flex items-center justify-between rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <ShieldAlert className="size-4 text-destructive" />
                      <span className="text-xs font-medium text-destructive">
                        {otherSessionCount} other active session{otherSessionCount !== 1 ? "s" : ""} detected
                      </span>
                    </div>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="sm" disabled={revokingAll} className="h-7 px-3 text-xs gap-1.5">
                          {revokingAll ? <Loader2 className="size-3.5 animate-spin" /> : <LogOut className="size-3.5" />}
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
                        <div className="size-9 rounded-md bg-muted shrink-0" />
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
                    <div className="mb-3 flex size-10 items-center justify-center rounded-full bg-muted">
                      <Clock className="size-5 text-muted-foreground" />
                    </div>
                    <p className="text-sm font-medium">No sessions found</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">Login activity will appear here once detected.</p>
                  </div>
                )}

                {!sessionsLoading && sessions.length > 0 && (
                  <div className="space-y-2">
                    {sessions.map((session) => {
                      const { browser, os, device } = parseUserAgent(session.user_agent)
                      const isCurrent = session.id === currentSessionId
                      const expired = isExpired(session.not_after)
                      const expiryLabel = formatExpiry(session.not_after)
                      const isRevoking = revokingId === session.id

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
                            "flex size-9 shrink-0 items-center justify-center rounded-md",
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
                                  <MapPin className="size-2.5" />{String(session.ip)}
                                </span>
                              )}
                              <span className="flex items-center gap-1">
                                <Clock className="size-2.5" />Signed in {formatTimeAgo(session.created_at)}
                              </span>
                              {session.updated_at && session.updated_at !== session.created_at && (
                                <span className="flex items-center gap-1">
                                  <RefreshCw className="size-2.5" />Last active {formatTimeAgo(session.updated_at)}
                                </span>
                              )}
                              {expiryLabel && (
                                <span className="flex items-center gap-1">
                                  <CalendarClock className="size-2.5" />Expires {expiryLabel}
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
                                  className="size-8 shrink-0 text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-destructive hover:bg-destructive/10 transition-all"
                                >
                                  {isRevoking ? <Loader2 className="size-3.5 animate-spin" /> : <LogOut className="size-3.5" />}
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
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── PRIVACY TAB ── */}
          <TabsContent value="privacy" className="space-y-6 mt-0">
            <Card>
              <CardHeader><CardTitle>Privacy Controls</CardTitle><CardDescription>Manage your data privacy settings</CardDescription></CardHeader>
              <CardContent className="space-y-4">
                {[
                  { label: "Allow Usage Statistics", desc: "Help improve platform services" },
                ].map(({ label, desc }) => (
                  <div key={label} className="flex items-center justify-between">
                    <div><Label>{label}</Label><p className="text-sm text-muted-foreground">{desc}</p></div>
                    <Switch />
                  </div>
                ))}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Data Management</CardTitle><CardDescription>Export or request account removal</CardDescription></CardHeader>
              <CardContent className="flex flex-wrap gap-3">
                <Button variant="outline">Export Account Data</Button>
                <Button variant="outline" className="text-destructive hover:text-destructive">Request Account Deletion</Button>
              </CardContent>
            </Card>
          </TabsContent>

        </div>
      </Tabs>
    </div>
  )
}
