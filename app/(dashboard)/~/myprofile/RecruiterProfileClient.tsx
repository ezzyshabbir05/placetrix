"use client"

import { useState, useTransition, useCallback, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { UserProfile } from "@/lib/supabase/profile"
import { toast } from "sonner"
import {
  Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Separator } from "@/components/ui/separator"
import {
  Combobox, ComboboxContent, ComboboxEmpty, ComboboxInput, ComboboxItem, ComboboxList,
} from "@/components/ui/combobox"
import {
  Upload, Loader2, Camera, CheckCircle2, XCircle, AtSign,
  Pencil, X, CheckCircle, Info, Building2, MapPin, User,
} from "lucide-react"
import { cn } from "@/lib/utils"

// ─── Constants ────────────────────────────────────────────────────────────────

const INDUSTRY_OPTIONS = [
  "Information Technology", "Software Development", "Finance & Banking", "Healthcare",
  "Education", "Manufacturing", "Consulting", "E-Commerce", "Telecommunications",
  "Media & Entertainment", "Real Estate", "Automotive", "Energy & Utilities",
  "Government", "Non-Profit", "Other",
]

const COMPANY_SIZE_OPTIONS = ["1-10", "11-50", "51-200", "201-500", "501-1000", "1001-5000", "5000+"]

const STATE_OPTIONS = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
  "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka",
  "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram",
  "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu",
  "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal",
]

const COUNTRY_OPTIONS = ["India", "Other"]
const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"]
const MAX_IMAGE_SIZE_BYTES = 2 * 1024 * 1024
const USERNAME_REGEX = /^[a-zA-Z0-9_]{3,20}$/

// ─── Types ────────────────────────────────────────────────────────────────────

type SectionId = "account" | "company" | "headquarters" | "recruiter"
type UsernameStatus = "idle" | "checking" | "available" | "taken" | "invalid" | "unchanged"

interface Props {
  userProfile: UserProfile
  initialData: Record<string, any> | null
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function RequiredMark() {
  return <span className="text-destructive ml-0.5">*</span>
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return <p className="text-xs text-destructive mt-1">{message}</p>
}

function ReadonlyField({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="space-y-0.5">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium">{value?.trim() ? value : <span className="text-muted-foreground font-normal">-</span>}</p>
    </div>
  )
}

function SectionComplete() {
  return (
    <Badge variant="secondary" className="h-8 px-3 gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800">
      <CheckCircle className="size-3.5" />
      Complete
    </Badge>
  )
}

function SectionIncomplete() {
  return (
    <Badge variant="outline" className="h-8 px-3 gap-1.5 text-xs text-amber-600 dark:text-amber-400 border-amber-300 dark:border-amber-700">
      <Info className="size-3.5" />
      Not filled
    </Badge>
  )
}

function getStorageUrl(supabase: ReturnType<typeof createClient>, bucket: string, path: string | null): string | null {
  if (!path) return null
  const { data } = supabase.storage.from(bucket).getPublicUrl(path)
  return data.publicUrl
}

function UsernameStatusIcon({ status }: { status: UsernameStatus }) {
  if (status === "checking") return <Loader2 className="size-4 animate-spin text-muted-foreground" />
  if (status === "available") return <CheckCircle2 className="size-4 text-emerald-500" />
  if (status === "taken" || status === "invalid") return <XCircle className="size-4 text-destructive" />
  return null
}

function usernameStatusMessage(status: UsernameStatus): { text: string; className: string } | null {
  if (status === "checking") return { text: "Checking availability…", className: "text-muted-foreground" }
  if (status === "available") return { text: "Username is available!", className: "text-emerald-600 dark:text-emerald-400" }
  if (status === "taken") return { text: "Username is already taken.", className: "text-destructive" }
  if (status === "invalid") return { text: "3–20 characters: letters, numbers, underscores only.", className: "text-destructive" }
  if (status === "unchanged") return { text: "This is your current username.", className: "text-muted-foreground" }
  return null
}

// ─── Component ────────────────────────────────────────────────────────────────

export function RecruiterProfileClient({ userProfile, initialData }: Props) {
  const supabase = createClient()
  const { refresh } = useRouter()
  const [isPending, startTransition] = useTransition()

  const isFirstTime = !initialData?.profile_updated
  const [editingSection, setEditingSection] = useState<SectionId | null>(
    isFirstTime ? "company" : null
  )
  const [bannerDismissed, setBannerDismissed] = useState(false)

  // ── Username ──────────────────────────────────────────────────────────────
  const [username, setUsername] = useState(userProfile.username ?? "")
  const [usernameStatus, setUsernameStatus] = useState<UsernameStatus>("idle")
  const usernameDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const initialUsername = useRef(userProfile.username ?? "")

  // ── Logo ──────────────────────────────────────────────────────────────────
  const storedLogoPath = useRef<string | null>(initialData?.company_logo_path ?? null)
  const [logoSrc, setLogoSrc] = useState<string | null>(() =>
    getStorageUrl(supabase, "avatars", storedLogoPath.current)
  )
  const [isUploadingLogo, setIsUploadingLogo] = useState(false)
  const logoInputRef = useRef<HTMLInputElement>(null)

  // ── Company fields ────────────────────────────────────────────────────────
  const [companyName, setCompanyName] = useState(initialData?.company_name ?? "")
  const [industry, setIndustry] = useState(initialData?.industry ?? "")
  const [companySize, setCompanySize] = useState(initialData?.company_size ?? "")
  const [companyWebsite, setCompanyWebsite] = useState(initialData?.company_website ?? "")
  const [companyDescription, setCompanyDescription] = useState(initialData?.company_description ?? "")

  // ── Headquarters fields ───────────────────────────────────────────────────
  const [hqCity, setHqCity] = useState(initialData?.headquarters_city ?? "")
  const [hqState, setHqState] = useState(initialData?.headquarters_state ?? "")
  const [hqCountry, setHqCountry] = useState(initialData?.headquarters_country ?? "India")

  // ── Recruiter fields ──────────────────────────────────────────────────────
  const [designation, setDesignation] = useState(initialData?.designation ?? "")
  const [department, setDepartment] = useState(initialData?.department ?? "")
  const [phoneNumber, setPhoneNumber] = useState(initialData?.phone_number ?? "")
  const [linkedinUrl, setLinkedinUrl] = useState(initialData?.linkedin_url ?? "")

  // ── Errors ────────────────────────────────────────────────────────────────
  const [errors, setErrors] = useState<Record<string, string>>({})

  // ── Section completeness ──────────────────────────────────────────────────
  const companyComplete = !!(initialData?.company_name && initialData?.industry && initialData?.company_size)
  const hqComplete = !!(initialData?.headquarters_city || initialData?.headquarters_state)
  const recruiterComplete = !!(initialData?.designation && initialData?.phone_number)

  // ── Username debounce ─────────────────────────────────────────────────────

  function handleUsernameChange(value: string) {
    const trimmed = value.trim()
    setUsername(trimmed)
    if (usernameDebounceRef.current) clearTimeout(usernameDebounceRef.current)
    if (!trimmed) { setUsernameStatus("idle"); return }
    if (trimmed === initialUsername.current) { setUsernameStatus("unchanged"); return }
    if (!USERNAME_REGEX.test(trimmed)) { setUsernameStatus("invalid"); return }
    setUsernameStatus("checking")
    usernameDebounceRef.current = setTimeout(async () => {
      const { data, error } = await (supabase as any).rpc("check_username_available", {
        p_username: trimmed,
        p_user_id: userProfile.id,
      })
      if (error) { setUsernameStatus("idle"); return }
      setUsernameStatus(data === true ? "available" : "taken")
    }, 500)
  }

  useEffect(() => {
    const timerRef = usernameDebounceRef
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [])

  // ── Section open/close ────────────────────────────────────────────────────

  function openSection(section: SectionId) {
    // Cancel any active section first (discard unsaved changes)
    if (editingSection && editingSection !== section) {
      cancelSection(editingSection)
    }
    setErrors({})
    setEditingSection(section)
  }

  function cancelSection(section: SectionId) {
    setErrors({})
    if (section === "account") {
      setUsername(userProfile.username ?? "")
      setUsernameStatus("idle")
    } else if (section === "company") {
      setCompanyName(initialData?.company_name ?? "")
      setIndustry(initialData?.industry ?? "")
      setCompanySize(initialData?.company_size ?? "")
      setCompanyWebsite(initialData?.company_website ?? "")
      setCompanyDescription(initialData?.company_description ?? "")
    } else if (section === "headquarters") {
      setHqCity(initialData?.headquarters_city ?? "")
      setHqState(initialData?.headquarters_state ?? "")
      setHqCountry(initialData?.headquarters_country ?? "India")
    } else if (section === "recruiter") {
      setDesignation(initialData?.designation ?? "")
      setDepartment(initialData?.department ?? "")
      setPhoneNumber(initialData?.phone_number ?? "")
      setLinkedinUrl(initialData?.linkedin_url ?? "")
    }
    setEditingSection(null)
  }

  // ── Validation ────────────────────────────────────────────────────────────

  function validateAccount() {
    const e: Record<string, string> = {}
    if (username && !USERNAME_REGEX.test(username)) e.username = "3–20 characters: letters, numbers, and underscores only."
    if (usernameStatus === "taken") e.username = "This username is already taken."
    if (usernameStatus === "checking") e.username = "Please wait for username availability check."
    return e
  }

  function validateCompany() {
    const e: Record<string, string> = {}
    if (!companyName.trim()) e.companyName = "Company name is required."
    if (!industry) e.industry = "Industry is required."
    if (!companySize) e.companySize = "Company size is required."
    return e
  }

  function validateRecruiter() {
    const e: Record<string, string> = {}
    if (!designation.trim()) e.designation = "Your designation is required."
    if (!phoneNumber.trim()) e.phoneNumber = "Contact number is required."
    return e
  }

  // ── Per-section save ──────────────────────────────────────────────────────

  function handleSaveSection(section: SectionId) {
    let newErrors: Record<string, string> = {}
    if (section === "account") newErrors = validateAccount()
    else if (section === "company") newErrors = validateCompany()
    else if (section === "recruiter") newErrors = validateRecruiter()

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      toast.error("Please fix the validation errors before saving.")
      return
    }

    startTransition(async () => {
      try {
        if (section === "account") {
          const trimmedUsername = username.trim() || null
          if (trimmedUsername !== (userProfile.username ?? null)) {
            const { error } = await (supabase as any)
              .from("profiles")
              .update({ username: trimmedUsername })
              .eq("id", userProfile.id)
            if (error) {
              if (error.code === "23505") {
                setErrors({ username: "This username is already taken." })
                setUsernameStatus("taken")
              } else {
                toast.error("Failed to update username. Please try again.")
              }
              return
            }
            await supabase.auth.updateUser({ data: { username: trimmedUsername } })
            if (trimmedUsername) {
              initialUsername.current = trimmedUsername
              setUsernameStatus("unchanged")
            }
          }
          toast.success("Account settings saved!")
        }

        else if (section === "company") {
          const payload = {
            profile_id: userProfile.id,
            company_name: companyName.trim() || null,
            industry: industry || null,
            company_size: companySize || null,
            company_website: companyWebsite.trim() || null,
            company_description: companyDescription.trim() || null,
            profile_updated: true,
          }
          const { error } = await (supabase as any)
            .from("recruiter_profiles")
            .upsert(payload, { onConflict: "profile_id" })
          if (error) throw error
          const newDisplayName = companyName.trim() || userProfile.display_name
          await (supabase as any).from("profiles").update({ display_name: newDisplayName }).eq("id", userProfile.id)
          await supabase.auth.updateUser({ data: { display_name: newDisplayName } })
          toast.success("Company information saved!")
        }

        else if (section === "headquarters") {
          const { error } = await (supabase as any)
            .from("recruiter_profiles")
            .update({
              headquarters_city: hqCity.trim() || null,
              headquarters_state: hqState || null,
              headquarters_country: hqCountry || null,
              profile_updated: true,
            })
            .eq("profile_id", userProfile.id)
          if (error) {
            if (error.code === "PGRST116") {
              toast.error("Please save Company Information first.")
              return
            }
            throw error
          }
          toast.success("Headquarters information saved!")
        }

        else if (section === "recruiter") {
          const { error } = await (supabase as any)
            .from("recruiter_profiles")
            .update({
              designation: designation.trim() || null,
              department: department.trim() || null,
              phone_number: phoneNumber.trim() || null,
              linkedin_url: linkedinUrl.trim() || null,
              profile_updated: true,
            })
            .eq("profile_id", userProfile.id)
          if (error) {
            if (error.code === "PGRST116") {
              toast.error("Please save Company Information first.")
              return
            }
            throw error
          }
          toast.success("Recruiter details saved!")
        }

        setErrors({})
        setEditingSection(null)
        refresh()
      } catch (err: any) {
        console.error("Save error:", err)
        toast.error(err?.message || "Failed to save. Please try again.")
      }
    })
  }

  // ── Logo upload ───────────────────────────────────────────────────────────

  async function handleLogoFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) { toast.error("Please upload a JPEG, PNG, or WEBP image."); return }
    if (file.size > MAX_IMAGE_SIZE_BYTES) { toast.error("Image must be smaller than 2 MB."); return }
    const blobUrl = URL.createObjectURL(file)
    setLogoSrc(blobUrl)
    setIsUploadingLogo(true)
    try {
      const oldPath = storedLogoPath.current
      if (oldPath) await supabase.storage.from("avatars").remove([oldPath])
      const ext = file.name.split(".").pop() ?? "jpg"
      const timestamp = Date.now()
      const newPath = `recruiters/${userProfile.id}/logo/${timestamp}.${ext}`
      const { error: uploadError } = await supabase.storage.from("avatars").upload(newPath, file, { upsert: false, contentType: file.type })
      if (uploadError) throw uploadError
      const { error: dbError } = await (supabase as any).from("recruiter_profiles").update({ company_logo_path: newPath }).eq("profile_id", userProfile.id)
      if (dbError) throw dbError
      await (supabase as any).from("profiles").update({ avatar_path: newPath }).eq("id", userProfile.id)
      await supabase.auth.updateUser({ data: { avatar_path: newPath } })
      storedLogoPath.current = newPath
      const newPublicUrl = getStorageUrl(supabase, "avatars", newPath)
      setLogoSrc(`${newPublicUrl}?v=${timestamp}`)
      URL.revokeObjectURL(blobUrl)
      toast.success("Logo updated!")
      refresh()
    } catch (err) {
      console.error(err)
      toast.error("Failed to upload logo. Please try again.")
      setLogoSrc(getStorageUrl(supabase, "avatars", storedLogoPath.current))
      URL.revokeObjectURL(blobUrl)
    } finally {
      setIsUploadingLogo(false)
      if (logoInputRef.current) logoInputRef.current.value = ""
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  const usernameMsg = usernameStatusMessage(usernameStatus)
  const initials = companyName ? companyName.slice(0, 2).toUpperCase() : userProfile.email[0]?.toUpperCase() ?? "?"
  const editing = (s: SectionId) => editingSection === s

  return (
    <div className="flex flex-col gap-6 px-4 py-8 md:px-8">
      {/* Page Header */}
      <div className="flex flex-col gap-1.5">
        <h1 className="text-3xl font-bold font-cirka tracking-tight text-foreground">My Profile</h1>
        <p className="text-sm text-muted-foreground">Manage your recruiter and company profile details</p>
      </div>

      <div className="space-y-6">

        {/* Onboarding Banner */}
        {isFirstTime && !bannerDismissed && (
          <Alert className="border-primary/30 bg-primary/5">
            <Info className="size-4 text-primary" />
            <AlertTitle className="text-primary">Welcome! Let's set up your recruiter profile</AlertTitle>
            <AlertDescription className="mt-1 flex items-start justify-between gap-4">
              <span className="text-muted-foreground text-sm">
                Click <strong>Edit</strong> on each section below to fill in your details.
                Start with <strong>Company Information</strong>, then work your way down.
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="shrink-0 size-6"
                onClick={() => setBannerDismissed(true)}
              >
                <X className="size-3.5" />
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Account Settings */}
        {!initialUsername.current ? (
          <Card>
            <CardHeader className="flex flex-row items-start justify-between gap-4 gap-y-0">
              <div>
                <CardTitle>Account Settings</CardTitle>
                <CardDescription>Your unique username identifies you on the platform</CardDescription>
              </div>
              {!editing("account") && (
                <Button variant="outline" size="sm" onClick={() => openSection("account")}>
                  <Pencil className="size-3.5 mr-1.5" />
                  Edit
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {editing("account") ? (
                <div className="max-w-sm space-y-2">
                  <Label htmlFor="username">Username</Label>
                  <div className="relative">
                    <AtSign className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                    <Input
                      id="username"
                      placeholder="your_company"
                      className={cn("pl-9 pr-9", errors.username && "border-destructive")}
                      value={username}
                      maxLength={20}
                      onChange={(e) => handleUsernameChange(e.target.value.replace(/\s/g, ""))}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2">
                      <UsernameStatusIcon status={usernameStatus} />
                    </span>
                  </div>
                  {errors.username ? (
                    <FieldError message={errors.username} />
                  ) : usernameMsg ? (
                    <p className={cn("text-xs", usernameMsg.className)}>{usernameMsg.text}</p>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      3–20 characters · letters, numbers, and underscores only · cannot be changed after saving
                    </p>
                  )}
                </div>
              ) : (
                <div className="max-w-sm">
                  <p className="text-xs text-muted-foreground mb-1">Username</p>
                  <p className="text-sm font-medium text-muted-foreground italic">Not set yet</p>
                  <p className="text-xs text-muted-foreground mt-1">Set your username — it cannot be changed once saved</p>
                </div>
              )}
            </CardContent>
            {editing("account") && (
              <CardFooter className="flex justify-end gap-2 border-t pt-4">
                <Button variant="ghost" size="sm" onClick={() => cancelSection("account")} disabled={isPending}>
                  Cancel
                </Button>
                <Button size="sm" onClick={() => handleSaveSection("account")} disabled={isPending}>
                  {isPending && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
                  Save
                </Button>
              </CardFooter>
            )}
          </Card>
        ) : null}

        {/* Company Logo — always interactive */}
        <Card>
          <CardHeader>
            <CardTitle>Company Logo</CardTitle>
            <CardDescription>JPEG, PNG, or WEBP (max 2 MB)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="relative group">
                <Avatar className="size-20 rounded-xl border">
                  <AvatarImage src={logoSrc ?? undefined} alt={companyName || "Logo"} className="object-cover" />
                  <AvatarFallback className="rounded-xl text-lg">{initials}</AvatarFallback>
                </Avatar>
                <button
                  type="button"
                  onClick={() => logoInputRef.current?.click()}
                  disabled={isUploadingLogo}
                  aria-label="Change company logo"
                  className="absolute inset-0 flex items-center justify-center rounded-xl bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  {isUploadingLogo ? <Loader2 className="size-5 animate-spin text-white" /> : <Camera className="size-5 text-white" />}
                </button>
                <input ref={logoInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleLogoFileChange} aria-label="Upload company logo" />
              </div>
              <div className="space-y-1">
                <Button variant="outline" size="sm" onClick={() => logoInputRef.current?.click()} disabled={isUploadingLogo}>
                  <Upload className="mr-2 size-4" />{isUploadingLogo ? "Uploading…" : "Upload Logo"}
                </Button>
                <p className="text-xs text-muted-foreground">Square image recommended · max 2 MB</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Company Information */}
        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-4 gap-y-0">
            <div>
              <CardTitle>Company Information</CardTitle>
              <CardDescription>Details about your organization</CardDescription>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {!editing("company") && (companyComplete ? <SectionComplete /> : <SectionIncomplete />)}
              {!editing("company") && (
                <Button variant="outline" size="sm" onClick={() => openSection("company")}>
                  <Pencil className="size-3.5 mr-1.5" />
                  Edit
                </Button>
              )}
            </div>
          </CardHeader>

          <CardContent>
            {editing("company") ? (
              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="companyName">Company Name<RequiredMark /></Label>
                    <Input
                      id="companyName"
                      placeholder="e.g. Acme Corp"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value.replace(/[<>]/g, ''))}
                      className={errors.companyName ? "border-destructive" : ""}
                    />
                    <FieldError message={errors.companyName} />
                  </div>
                  <div className="space-y-2">
                    <Label>Industry<RequiredMark /></Label>
                    <Combobox items={INDUSTRY_OPTIONS} value={industry} onValueChange={(v) => setIndustry(v || "")}>
                      <ComboboxInput placeholder="Select industry" className={errors.industry ? "border-destructive" : ""} />
                      <ComboboxContent>
                        <ComboboxEmpty>No results</ComboboxEmpty>
                        <ComboboxList>
                          {INDUSTRY_OPTIONS.map((o) => <ComboboxItem key={o} value={o}>{o}</ComboboxItem>)}
                        </ComboboxList>
                      </ComboboxContent>
                    </Combobox>
                    <FieldError message={errors.industry} />
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Company Size<RequiredMark /></Label>
                    <Combobox items={COMPANY_SIZE_OPTIONS} value={companySize} onValueChange={(v) => setCompanySize(v || "")}>
                      <ComboboxInput placeholder="Select size" className={errors.companySize ? "border-destructive" : ""} />
                      <ComboboxContent>
                        <ComboboxEmpty>No results</ComboboxEmpty>
                        <ComboboxList>
                          {COMPANY_SIZE_OPTIONS.map((o) => <ComboboxItem key={o} value={o}>{o} employees</ComboboxItem>)}
                        </ComboboxList>
                      </ComboboxContent>
                    </Combobox>
                    <FieldError message={errors.companySize} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="companyWebsite">Company Website</Label>
                    <Input id="companyWebsite" placeholder="https://example.com" value={companyWebsite} onChange={(e) => setCompanyWebsite(e.target.value)} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="companyDescription">Company Description</Label>
                  <Textarea id="companyDescription" rows={3} placeholder="Brief description of your company" value={companyDescription} onChange={(e) => setCompanyDescription(e.target.value)} />
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
                <ReadonlyField label="Company Name" value={companyName} />
                <ReadonlyField label="Industry" value={industry} />
                <ReadonlyField label="Company Size" value={companySize ? `${companySize} employees` : null} />
                <ReadonlyField label="Website" value={companyWebsite} />
                {companyDescription && (
                  <div className="sm:col-span-2 space-y-0.5">
                    <p className="text-xs text-muted-foreground">Description</p>
                    <p className="text-sm font-medium">{companyDescription}</p>
                  </div>
                )}
              </div>
            )}
          </CardContent>

          {editing("company") && (
            <CardFooter className="flex justify-end gap-2 border-t pt-4">
              <Button variant="ghost" size="sm" onClick={() => cancelSection("company")} disabled={isPending}>
                Cancel
              </Button>
              <Button size="sm" onClick={() => handleSaveSection("company")} disabled={isPending}>
                {isPending && <Loader2 className="size-3.5 mr-1.5 animate-spin" />}
                Save Changes
              </Button>
            </CardFooter>
          )}
        </Card>

        {/* Headquarters */}
        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-4 gap-y-0">
            <div>
              <CardTitle>Headquarters</CardTitle>
              <CardDescription>Company location details</CardDescription>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {!editing("headquarters") && (hqComplete ? <SectionComplete /> : <SectionIncomplete />)}
              {!editing("headquarters") && (
                <Button variant="outline" size="sm" onClick={() => openSection("headquarters")}>
                  <Pencil className="size-3.5 mr-1.5" />
                  Edit
                </Button>
              )}
            </div>
          </CardHeader>

          <CardContent>
            {editing("headquarters") ? (
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="hqCity">City</Label>
                  <Input id="hqCity" placeholder="e.g. Mumbai" value={hqCity} onChange={(e) => setHqCity(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>State</Label>
                  <Combobox items={STATE_OPTIONS} value={hqState} onValueChange={(v) => setHqState(v || "")}>
                    <ComboboxInput placeholder="Select state" />
                    <ComboboxContent>
                      <ComboboxEmpty>No results</ComboboxEmpty>
                      <ComboboxList>
                        {STATE_OPTIONS.map((o) => <ComboboxItem key={o} value={o}>{o}</ComboboxItem>)}
                      </ComboboxList>
                    </ComboboxContent>
                  </Combobox>
                </div>
                <div className="space-y-2">
                  <Label>Country</Label>
                  <Combobox items={COUNTRY_OPTIONS} value={hqCountry} onValueChange={(v) => setHqCountry(v || "India")}>
                    <ComboboxInput placeholder="Select country" />
                    <ComboboxContent>
                      <ComboboxEmpty>No results</ComboboxEmpty>
                      <ComboboxList>
                        {COUNTRY_OPTIONS.map((o) => <ComboboxItem key={o} value={o}>{o}</ComboboxItem>)}
                      </ComboboxList>
                    </ComboboxContent>
                  </Combobox>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-8 gap-y-4">
                <ReadonlyField label="City" value={hqCity} />
                <ReadonlyField label="State" value={hqState} />
                <ReadonlyField label="Country" value={hqCountry} />
              </div>
            )}
          </CardContent>

          {editing("headquarters") && (
            <CardFooter className="flex justify-end gap-2 border-t pt-4">
              <Button variant="ghost" size="sm" onClick={() => cancelSection("headquarters")} disabled={isPending}>
                Cancel
              </Button>
              <Button size="sm" onClick={() => handleSaveSection("headquarters")} disabled={isPending}>
                {isPending && <Loader2 className="size-3.5 mr-1.5 animate-spin" />}
                Save Changes
              </Button>
            </CardFooter>
          )}
        </Card>

        {/* Recruiter Details */}
        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-4 gap-y-0">
            <div>
              <CardTitle>Recruiter Details</CardTitle>
              <CardDescription>Your personal details as a recruiter</CardDescription>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {!editing("recruiter") && (recruiterComplete ? <SectionComplete /> : <SectionIncomplete />)}
              {!editing("recruiter") && (
                <Button variant="outline" size="sm" onClick={() => openSection("recruiter")}>
                  <Pencil className="size-3.5 mr-1.5" />
                  Edit
                </Button>
              )}
            </div>
          </CardHeader>

          <CardContent>
            {editing("recruiter") ? (
              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="designation">Designation<RequiredMark /></Label>
                    <Input
                      id="designation"
                      placeholder="e.g. HR Manager"
                      value={designation}
                      onChange={(e) => setDesignation(e.target.value.replace(/[<>]/g, ''))}
                      className={errors.designation ? "border-destructive" : ""}
                    />
                    <FieldError message={errors.designation} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="department">Department</Label>
                    <Input id="department" placeholder="e.g. Human Resources" value={department} onChange={(e) => setDepartment(e.target.value.replace(/[<>]/g, ''))} />
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="phoneNumber">Contact Number<RequiredMark /></Label>
                    <Input
                      id="phoneNumber"
                      placeholder="10-digit number"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      className={errors.phoneNumber ? "border-destructive" : ""}
                    />
                    <FieldError message={errors.phoneNumber} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="linkedinUrl">LinkedIn Profile</Label>
                    <Input id="linkedinUrl" placeholder="https://linkedin.com/in/..." value={linkedinUrl} onChange={(e) => setLinkedinUrl(e.target.value)} />
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
                <ReadonlyField label="Designation" value={designation} />
                <ReadonlyField label="Department" value={department} />
                <ReadonlyField label="Contact Number" value={phoneNumber} />
                <ReadonlyField label="LinkedIn" value={linkedinUrl} />
              </div>
            )}
          </CardContent>

          {editing("recruiter") && (
            <CardFooter className="flex justify-end gap-2 border-t pt-4">
              <Button variant="ghost" size="sm" onClick={() => cancelSection("recruiter")} disabled={isPending}>
                Cancel
              </Button>
              <Button size="sm" onClick={() => handleSaveSection("recruiter")} disabled={isPending}>
                {isPending && <Loader2 className="size-3.5 mr-1.5 animate-spin" />}
                Save Changes
              </Button>
            </CardFooter>
          )}
        </Card>

      </div>
    </div>
  )
}
