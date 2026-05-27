"use client"

import { useState, useTransition, useEffect, useRef } from "react"
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
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
  Combobox, ComboboxContent, ComboboxEmpty, ComboboxInput,
  ComboboxItem, ComboboxList,
} from "@/components/ui/combobox"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Upload, Plus, Minus, Mail, Globe, Phone, Loader2, Camera,
  CheckCircle2, XCircle, AtSign, Pencil, X, Info,
  Building, MapPin, Phone as PhoneIcon, Users, BookOpen, Share2, CheckCircle,
} from "lucide-react"
import { cn } from "@/lib/utils"

// ─── Constants ────────────────────────────────────────────────────────────────

const AFFILIATION_OPTIONS = [
  "SPPU - Savitribai Phule Pune University",
  "Mumbai University",
  "AICTE - All India Council for Technical Education",
  "UGC - University Grants Commission",
  "Autonomous",
  "Other",
]

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

type SectionId = "account" | "basic" | "contact" | "admin" | "courses" | "social"
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

function getStorageUrl(
  supabase: ReturnType<typeof createClient>,
  bucket: string,
  path: string | null
): string | null {
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

export function InstituteProfileClient({ userProfile, initialData }: Props) {
  const supabase = createClient()
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const isFirstTime = !initialData?.profile_updated
  const [editingSection, setEditingSection] = useState<SectionId | null>(
    isFirstTime ? "basic" : null
  )
  const [bannerDismissed, setBannerDismissed] = useState(false)

  // ── Username ──────────────────────────────────────────────────────────────
  const [username, setUsername] = useState(userProfile.username ?? "")
  const [usernameStatus, setUsernameStatus] = useState<UsernameStatus>("idle")
  const usernameDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const initialUsername = useRef(userProfile.username ?? "")

  // ── Logo ──────────────────────────────────────────────────────────────────
  const storedLogoPath = useRef<string | null>(initialData?.logo_path ?? null)
  const [logoSrc, setLogoSrc] = useState<string | null>(() =>
    getStorageUrl(supabase, "avatars", storedLogoPath.current)
  )
  const [isUploadingLogo, setIsUploadingLogo] = useState(false)
  const logoInputRef = useRef<HTMLInputElement>(null)

  // ── Basic fields ──────────────────────────────────────────────────────────
  const [instituteName, setInstituteName] = useState(initialData?.institute_name ?? "")
  const [instituteCode, setInstituteCode] = useState(initialData?.institute_code ?? "")
  const [establishedYear, setEstablishedYear] = useState(
    initialData?.established_year ? String(initialData.established_year) : ""
  )
  const [affiliation, setAffiliation] = useState(initialData?.affiliation ?? "")
  const [address, setAddress] = useState(initialData?.address ?? "")
  const [city, setCity] = useState(initialData?.city ?? "")
  const [stateVal, setStateVal] = useState(initialData?.state ?? "")
  const [pincode, setPincode] = useState(initialData?.pincode ?? "")
  const [country, setCountry] = useState(initialData?.country ?? "India")

  // ── Contact fields ────────────────────────────────────────────────────────
  const [instPhone, setInstPhone] = useState(initialData?.phone_number ?? "")
  const [instEmail, setInstEmail] = useState(initialData?.email ?? "")
  const [websiteUrl, setWebsiteUrl] = useState(initialData?.website_url ?? "")

  // ── Admin fields ──────────────────────────────────────────────────────────
  const [principalName, setPrincipalName] = useState(initialData?.principal_name ?? "")
  const [principalEmail, setPrincipalEmail] = useState(initialData?.principal_email ?? "")
  const [principalPhone, setPrincipalPhone] = useState(initialData?.principal_phone ?? "")

  // ── Courses ───────────────────────────────────────────────────────────────
  const [courses, setCourses] = useState<string[]>(
    initialData?.courses?.length ? initialData.courses : [""]
  )

  // ── Social links ──────────────────────────────────────────────────────────
  const [socialLinks, setSocialLinks] = useState<string[]>(
    initialData?.social_links?.length ? initialData.social_links : [""]
  )

  // ── Errors ────────────────────────────────────────────────────────────────
  const [errors, setErrors] = useState<Record<string, string>>({})

  // ── Section completeness (from server data) ───────────────────────────────
  const basicComplete = !!(initialData?.institute_name && initialData?.affiliation && initialData?.city)
  const contactComplete = !!(initialData?.phone_number && initialData?.email)
  const adminComplete = !!(initialData?.principal_name && initialData?.principal_email)
  const coursesComplete = !!(initialData?.courses?.some((c: string) => c.trim()))
  const socialComplete = !!(initialData?.social_links?.some((l: string) => l.trim()))

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
      const { data, error } = await supabase.rpc("check_username_available", {
        p_username: trimmed,
        p_user_id: userProfile.id,
      })
      if (error) { setUsernameStatus("idle"); return }
      setUsernameStatus(data === true ? "available" : "taken")
    }, 500)
  }

  useEffect(() => {
    return () => { if (usernameDebounceRef.current) clearTimeout(usernameDebounceRef.current) }
  }, [])

  // ── Section open/close ────────────────────────────────────────────────────

  function openSection(section: SectionId) {
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
    } else if (section === "basic") {
      setInstituteName(initialData?.institute_name ?? "")
      setInstituteCode(initialData?.institute_code ?? "")
      setEstablishedYear(initialData?.established_year ? String(initialData.established_year) : "")
      setAffiliation(initialData?.affiliation ?? "")
      setAddress(initialData?.address ?? "")
      setCity(initialData?.city ?? "")
      setStateVal(initialData?.state ?? "")
      setPincode(initialData?.pincode ?? "")
      setCountry(initialData?.country ?? "India")
    } else if (section === "contact") {
      setInstPhone(initialData?.phone_number ?? "")
      setInstEmail(initialData?.email ?? "")
      setWebsiteUrl(initialData?.website_url ?? "")
    } else if (section === "admin") {
      setPrincipalName(initialData?.principal_name ?? "")
      setPrincipalEmail(initialData?.principal_email ?? "")
      setPrincipalPhone(initialData?.principal_phone ?? "")
    } else if (section === "courses") {
      setCourses(initialData?.courses?.length ? initialData.courses : [""])
    } else if (section === "social") {
      setSocialLinks(initialData?.social_links?.length ? initialData.social_links : [""])
    }
    setEditingSection(null)
  }

  // ── Course management ─────────────────────────────────────────────────────

  function addCourse() { setCourses((prev) => [...prev, ""]) }
  function handleCourseChange(index: number, value: string) {
    setCourses((prev) => { const u = [...prev]; u[index] = value; return u })
  }
  function removeCourse(index: number) {
    setCourses((prev) => prev.filter((_, i) => i !== index))
  }

  // ── Social link management ────────────────────────────────────────────────

  function addSocialLink() { setSocialLinks((prev) => [...prev, ""]) }
  function handleSocialLinkChange(index: number, value: string) {
    setSocialLinks((prev) => { const u = [...prev]; u[index] = value; return u })
  }
  function removeSocialLink(index: number) {
    setSocialLinks((prev) => prev.filter((_, i) => i !== index))
  }

  // ── Validation ────────────────────────────────────────────────────────────

  function validateAccount() {
    const e: Record<string, string> = {}
    if (username && !USERNAME_REGEX.test(username)) e.username = "3–20 characters: letters, numbers, and underscores only."
    if (usernameStatus === "taken") e.username = "This username is already taken."
    if (usernameStatus === "checking") e.username = "Please wait for username availability check."
    return e
  }

  function validateBasic() {
    const e: Record<string, string> = {}
    if (!instituteName.trim()) e.instituteName = "College name is required."
    if (!affiliation) e.affiliation = "Affiliation is required."
    if (!address.trim()) e.address = "Address is required."
    if (!city.trim()) e.city = "City is required."
    if (!stateVal) e.state = "State is required."
    if (!pincode.trim()) e.pincode = "Pincode is required."
    else if (!/^[0-9]{6}$/.test(pincode)) e.pincode = "Must be exactly 6 digits."
    if (!country) e.country = "Country is required."
    return e
  }

  function validateContact() {
    const e: Record<string, string> = {}
    if (!instPhone.trim()) e.instPhone = "Contact number is required."
    if (!instEmail.trim()) e.instEmail = "Email address is required."
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(instEmail)) e.instEmail = "Enter a valid email address."
    return e
  }

  function validateAdmin() {
    const e: Record<string, string> = {}
    if (!principalName.trim()) e.principalName = "Principal name is required."
    if (!principalEmail.trim()) e.principalEmail = "Principal email is required."
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(principalEmail)) e.principalEmail = "Enter a valid email address."
    if (!principalPhone.trim()) e.principalPhone = "Principal phone is required."
    return e
  }

  // ── Per-section save ──────────────────────────────────────────────────────

  function handleSaveSection(section: SectionId) {
    let newErrors: Record<string, string> = {}
    if (section === "account") newErrors = validateAccount()
    else if (section === "basic") newErrors = validateBasic()
    else if (section === "contact") newErrors = validateContact()
    else if (section === "admin") newErrors = validateAdmin()

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
            const { error } = await supabase.from("profiles").update({ username: trimmedUsername }).eq("id", userProfile.id)
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

        else if (section === "basic") {
          const payload = {
            profile_id: userProfile.id,
            institute_name: instituteName.trim() || null,
            institute_code: instituteCode.trim() || null,
            established_year: establishedYear ? Number(establishedYear) : null,
            affiliation: affiliation || null,
            address: address.trim() || null,
            city: city.trim() || null,
            state: stateVal || null,
            pincode: pincode.trim() || null,
            country: country || null,
            profile_updated: true,
          }
          const { error } = await supabase
            .from("institute_profiles")
            .upsert(payload, { onConflict: "profile_id" })
          if (error) throw error
          const newDisplayName = instituteName.trim() || userProfile.display_name
          await supabase.from("profiles").update({ display_name: newDisplayName }).eq("id", userProfile.id)
          await supabase.auth.updateUser({ data: { display_name: newDisplayName } })
          toast.success("Basic information saved!")
        }

        else if (section === "contact") {
          const { error } = await supabase
            .from("institute_profiles")
            .update({
              phone_number: instPhone.trim() || null,
              email: instEmail.trim() || null,
              website_url: websiteUrl.trim() || null,
              profile_updated: true,
            })
            .eq("profile_id", userProfile.id)
          if (error) {
            if (error.code === "PGRST116") {
              toast.error("Please save Basic Information first.")
              return
            }
            throw error
          }
          toast.success("Contact information saved!")
        }

        else if (section === "admin") {
          const { error } = await supabase
            .from("institute_profiles")
            .update({
              principal_name: principalName.trim() || null,
              principal_email: principalEmail.trim() || null,
              principal_phone: principalPhone.trim() || null,
              profile_updated: true,
            })
            .eq("profile_id", userProfile.id)
          if (error) {
            if (error.code === "PGRST116") {
              toast.error("Please save Basic Information first.")
              return
            }
            throw error
          }
          toast.success("Administrative contacts saved!")
        }


        else if (section === "courses") {
          const filteredCourses = courses.filter((c) => c.trim())
          const { error } = await supabase
            .from("institute_profiles")
            .update({ courses: filteredCourses, profile_updated: true })
            .eq("profile_id", userProfile.id)
          if (error) {
            if (error.code === "PGRST116" || filteredCourses.length === 0) {
              toast.error("Please save Basic Information first before adding courses.")
              return
            }
            throw error
          }
          // If no row was matched, the update silently no-ops — check by re-fetching
          toast.success("Courses updated!")
        }

        else if (section === "social") {
          const filteredLinks = socialLinks.filter((l) => l.trim())
          const { error } = await supabase
            .from("institute_profiles")
            .update({ social_links: filteredLinks, profile_updated: true })
            .eq("profile_id", userProfile.id)
          if (error) {
            if (error.code === "PGRST116") {
              toast.error("Please save Basic Information first before adding social links.")
              return
            }
            throw error
          }
          toast.success("Social links updated!")
        }

        setErrors({})
        setEditingSection(null)
        router.refresh()
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
    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      toast.error("Please upload a JPEG, PNG, or WEBP image.")
      return
    }
    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      toast.error("Image must be smaller than 2 MB.")
      return
    }
    const blobUrl = URL.createObjectURL(file)
    setLogoSrc(blobUrl)
    setIsUploadingLogo(true)
    try {
      const oldPath = storedLogoPath.current
      if (oldPath) await supabase.storage.from("avatars").remove([oldPath])
      const ext = file.name.split(".").pop() ?? "jpg"
      const timestamp = Date.now()
      const newPath = `institutes/${userProfile.id}/logo/${timestamp}.${ext}`
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(newPath, file, { upsert: false, contentType: file.type })
      if (uploadError) throw uploadError
      const { error: dbError } = await supabase
        .from("institute_profiles")
        .update({ logo_path: newPath })
        .eq("profile_id", userProfile.id)
      if (dbError) throw dbError
      await supabase.from("profiles").update({ avatar_path: newPath }).eq("id", userProfile.id)
      await supabase.auth.updateUser({ data: { avatar_path: newPath } })
      storedLogoPath.current = newPath
      const newPublicUrl = getStorageUrl(supabase, "avatars", newPath)
      setLogoSrc(`${newPublicUrl}?v=${timestamp}`)
      URL.revokeObjectURL(blobUrl)
      toast.success("Logo updated!")
      router.refresh()
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
  const editing = (s: SectionId) => editingSection === s

  return (
    <div className="flex flex-col gap-6 px-4 py-8 md:px-8">

      {/* Page Header */}
      <div className="flex flex-col gap-1.5">
        <h1 className="text-3xl font-bold font-cirka tracking-tight text-foreground">My Profile</h1>
        <p className="text-sm text-muted-foreground">Manage your institution profile details</p>
      </div>

      <div className="space-y-6">

        {/* Onboarding Banner */}
        {isFirstTime && !bannerDismissed && (
          <Alert className="border-primary/30 bg-primary/5">
            <Info className="size-4 text-primary" />
            <AlertTitle className="text-primary">Welcome! Let's set up your institution profile</AlertTitle>
            <AlertDescription className="mt-1 flex items-start justify-between gap-4">
              <span className="text-muted-foreground text-sm">
                Click <strong>Edit</strong> on each section to fill in your institution details.
                Start with <strong>Basic Information</strong>, then proceed to Contact, Administrative Contacts, and Courses.
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

        {/* Account Settings — only shown if username not yet set */}
        {!initialUsername.current ? (
          <Card>
            <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
              <div>
                <CardTitle>Account Settings</CardTitle>
                <CardDescription>Your unique username identifies your institution on the platform</CardDescription>
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
                      placeholder="your_institution"
                      className={cn(
                        "pl-9 pr-9",
                        errors.username && "border-destructive focus-visible:ring-destructive"
                      )}
                      value={username}
                      maxLength={20}
                      onChange={(e) => handleUsernameChange(e.target.value.replace(/\s/g, ""))}
                      autoComplete="username"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2">
                      <UsernameStatusIcon status={usernameStatus} />
                    </span>
                  </div>
                  {errors.username ? (
                    <p className="text-xs text-destructive">{errors.username}</p>
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
                  {isPending && <Loader2 className="size-3.5 mr-1.5 animate-spin" />}
                  Save
                </Button>
              </CardFooter>
            )}
          </Card>
        ) : null}

        {/* College Logo — always interactive */}
        <Card>
          <CardHeader>
            <CardTitle>College Logo</CardTitle>
            <CardDescription>JPEG, PNG or WEBP · max 2 MB · square recommended</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="relative shrink-0">
                <Avatar className="size-20">
                  <AvatarImage src={logoSrc ?? undefined} alt="Institution logo" className="object-cover" />
                  <AvatarFallback className="text-xl font-semibold">
                    {instituteName ? instituteName[0].toUpperCase() : "?"}
                  </AvatarFallback>
                </Avatar>
                <button
                  type="button"
                  onClick={() => logoInputRef.current?.click()}
                  disabled={isUploadingLogo}
                  aria-label="Change institution logo"
                  className="absolute -bottom-1 -right-1 size-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-md hover:bg-primary/90 disabled:opacity-50 transition-colors"
                >
                  {isUploadingLogo
                    ? <Loader2 className="size-3.5 animate-spin" />
                    : <Camera className="size-3.5" />}
                </button>
              </div>
              <div className="space-y-2">
                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={handleLogoFileChange}
                />
                <Button variant="outline" size="sm" onClick={() => logoInputRef.current?.click()} disabled={isUploadingLogo}>
                  {isUploadingLogo
                    ? <><Loader2 className="size-4 mr-2 animate-spin" />Uploading…</>
                    : <><Upload className="size-4 mr-2" />Upload Logo</>}
                </Button>
                <p className="text-xs text-muted-foreground">Square image recommended · max 2 MB</p>
                {!initialData?.institute_name && (
                  <p className="text-xs text-amber-600 dark:text-amber-400">
                    Save institution details first, then upload the logo.
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Basic Information */}
        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
            <div>
              <CardTitle>Basic Information</CardTitle>
              <CardDescription>Essential details about your institution</CardDescription>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {!editing("basic") && (basicComplete ? <SectionComplete /> : <SectionIncomplete />)}
              {!editing("basic") && (
                <Button variant="outline" size="sm" onClick={() => openSection("basic")}>
                  <Pencil className="size-3.5 mr-1.5" />
                  Edit
                </Button>
              )}
            </div>
          </CardHeader>

          <CardContent>
            {editing("basic") ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>College Name<RequiredMark /></Label>
                    <Input
                      placeholder="Enter college name"
                      value={instituteName}
                      onChange={(e) => setInstituteName(e.target.value)}
                    />
                    <FieldError message={errors.instituteName} />
                  </div>
                  <div className="space-y-2">
                    <Label>College Code</Label>
                    <Input
                      placeholder="College code (optional)"
                      value={instituteCode}
                      onChange={(e) => setInstituteCode(e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Established Year</Label>
                    <Input
                      placeholder="e.g. 1990"
                      type="number"
                      min={1800}
                      max={2026}
                      value={establishedYear}
                      onChange={(e) => setEstablishedYear(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Affiliation<RequiredMark /></Label>
                    <Combobox items={AFFILIATION_OPTIONS} value={affiliation} onValueChange={(v) => setAffiliation(v || "")}>
                      <ComboboxInput placeholder="Select affiliation" />
                      <ComboboxContent>
                        <ComboboxEmpty>No affiliation found.</ComboboxEmpty>
                        <ComboboxList>
                          {AFFILIATION_OPTIONS.map((item) => (
                            <ComboboxItem key={item} value={item}>{item}</ComboboxItem>
                          ))}
                        </ComboboxList>
                      </ComboboxContent>
                    </Combobox>
                    <FieldError message={errors.affiliation} />
                  </div>
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label>Address<RequiredMark /></Label>
                  <Textarea
                    placeholder="Complete address"
                    rows={3}
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                  />
                  <FieldError message={errors.address} />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>City<RequiredMark /></Label>
                    <Input placeholder="City" value={city} onChange={(e) => setCity(e.target.value)} />
                    <FieldError message={errors.city} />
                  </div>
                  <div className="space-y-2">
                    <Label>State<RequiredMark /></Label>
                    <Combobox items={STATE_OPTIONS} value={stateVal} onValueChange={(v) => setStateVal(v || "")}>
                      <ComboboxInput placeholder="Select state" />
                      <ComboboxContent>
                        <ComboboxEmpty>No state found.</ComboboxEmpty>
                        <ComboboxList>
                          {STATE_OPTIONS.map((item) => (
                            <ComboboxItem key={item} value={item}>{item}</ComboboxItem>
                          ))}
                        </ComboboxList>
                      </ComboboxContent>
                    </Combobox>
                    <FieldError message={errors.state} />
                  </div>
                  <div className="space-y-2">
                    <Label>Pincode<RequiredMark /></Label>
                    <Input
                      placeholder="6-digit pincode"
                      maxLength={6}
                      value={pincode}
                      onChange={(e) => setPincode(e.target.value.replace(/\D/g, ""))}
                    />
                    <FieldError message={errors.pincode} />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Country<RequiredMark /></Label>
                  <Combobox items={COUNTRY_OPTIONS} value={country} onValueChange={(v) => setCountry(v || "India")}>
                    <ComboboxInput placeholder="Select country" />
                    <ComboboxContent>
                      <ComboboxEmpty>No country found.</ComboboxEmpty>
                      <ComboboxList>
                        {COUNTRY_OPTIONS.map((item) => (
                          <ComboboxItem key={item} value={item}>{item}</ComboboxItem>
                        ))}
                      </ComboboxList>
                    </ComboboxContent>
                  </Combobox>
                  <FieldError message={errors.country} />
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
                  <ReadonlyField label="College Name" value={instituteName} />
                  <ReadonlyField label="College Code" value={instituteCode} />
                  <ReadonlyField label="Established Year" value={establishedYear} />
                  <ReadonlyField label="Affiliation" value={affiliation} />
                </div>
                {(address || city || stateVal) && (
                  <>
                    <Separator />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
                      {address && (
                        <div className="sm:col-span-2 space-y-0.5">
                          <p className="text-xs text-muted-foreground">Address</p>
                          <p className="text-sm font-medium">{address}</p>
                        </div>
                      )}
                      <ReadonlyField label="City" value={city} />
                      <ReadonlyField label="State" value={stateVal} />
                      <ReadonlyField label="Pincode" value={pincode} />
                      <ReadonlyField label="Country" value={country} />
                    </div>
                  </>
                )}
              </div>
            )}
          </CardContent>

          {editing("basic") && (
            <CardFooter className="flex justify-end gap-2 border-t pt-4">
              <Button variant="ghost" size="sm" onClick={() => cancelSection("basic")} disabled={isPending}>
                Cancel
              </Button>
              <Button size="sm" onClick={() => handleSaveSection("basic")} disabled={isPending}>
                {isPending && <Loader2 className="size-3.5 mr-1.5 animate-spin" />}
                Save Changes
              </Button>
            </CardFooter>
          )}
        </Card>

        {/* Contact Information */}
        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
            <div>
              <CardTitle>Contact Information</CardTitle>
              <CardDescription>Primary contact details for the institution</CardDescription>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {!editing("contact") && (contactComplete ? <SectionComplete /> : <SectionIncomplete />)}
              {!editing("contact") && (
                <Button variant="outline" size="sm" onClick={() => openSection("contact")}>
                  <Pencil className="size-3.5 mr-1.5" />
                  Edit
                </Button>
              )}
            </div>
          </CardHeader>

          <CardContent>
            {editing("contact") ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1.5">
                      <Phone className="size-3.5 text-muted-foreground" />
                      Contact Number<RequiredMark />
                    </Label>
                    <Input
                      placeholder="Institution contact number"
                      type="tel"
                      value={instPhone}
                      onChange={(e) => setInstPhone(e.target.value)}
                    />
                    <FieldError message={errors.instPhone} />
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1.5">
                      <Mail className="size-3.5 text-muted-foreground" />
                      Email Address<RequiredMark />
                    </Label>
                    <Input
                      placeholder="college@example.com"
                      type="email"
                      value={instEmail}
                      onChange={(e) => setInstEmail(e.target.value)}
                    />
                    <FieldError message={errors.instEmail} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-1.5">
                    <Globe className="size-3.5 text-muted-foreground" />
                    Website URL
                  </Label>
                  <Input
                    placeholder="https://www.yourcollege.edu"
                    type="url"
                    value={websiteUrl}
                    onChange={(e) => setWebsiteUrl(e.target.value)}
                  />
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
                <ReadonlyField label="Contact Number" value={instPhone} />
                <ReadonlyField label="Email Address" value={instEmail} />
                <ReadonlyField label="Website" value={websiteUrl} />
              </div>
            )}
          </CardContent>

          {editing("contact") && (
            <CardFooter className="flex justify-end gap-2 border-t pt-4">
              <Button variant="ghost" size="sm" onClick={() => cancelSection("contact")} disabled={isPending}>
                Cancel
              </Button>
              <Button size="sm" onClick={() => handleSaveSection("contact")} disabled={isPending}>
                {isPending && <Loader2 className="size-3.5 mr-1.5 animate-spin" />}
                Save Changes
              </Button>
            </CardFooter>
          )}
        </Card>

        {/* Administrative Contacts */}
        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
            <div>
              <CardTitle>Administrative Contacts</CardTitle>
              <CardDescription>Key personnel contact information</CardDescription>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {!editing("admin") && (adminComplete ? <SectionComplete /> : <SectionIncomplete />)}
              {!editing("admin") && (
                <Button variant="outline" size="sm" onClick={() => openSection("admin")}>
                  <Pencil className="size-3.5 mr-1.5" />
                  Edit
                </Button>
              )}
            </div>
          </CardHeader>

          <CardContent>
            {editing("admin") ? (
              <div className="space-y-3">
                <p className="text-sm font-medium">Principal Details</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Name<RequiredMark /></Label>
                    <Input
                      placeholder="Principal name"
                      value={principalName}
                      onChange={(e) => setPrincipalName(e.target.value)}
                    />
                    <FieldError message={errors.principalName} />
                  </div>
                  <div className="space-y-2">
                    <Label>Email<RequiredMark /></Label>
                    <Input
                      placeholder="principal@example.com"
                      type="email"
                      value={principalEmail}
                      onChange={(e) => setPrincipalEmail(e.target.value)}
                    />
                    <FieldError message={errors.principalEmail} />
                  </div>
                  <div className="space-y-2">
                    <Label>Contact Number<RequiredMark /></Label>
                    <Input
                      placeholder="Contact number"
                      type="tel"
                      value={principalPhone}
                      onChange={(e) => setPrincipalPhone(e.target.value)}
                    />
                    <FieldError message={errors.principalPhone} />
                  </div>
                </div>
              </div>
            ) : (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-3">Principal</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-8 gap-y-4">
                  <ReadonlyField label="Name" value={principalName} />
                  <ReadonlyField label="Email" value={principalEmail} />
                  <ReadonlyField label="Phone" value={principalPhone} />
                </div>
              </div>
            )}
          </CardContent>

          {editing("admin") && (
            <CardFooter className="flex justify-end gap-2 border-t pt-4">
              <Button variant="ghost" size="sm" onClick={() => cancelSection("admin")} disabled={isPending}>
                Cancel
              </Button>
              <Button size="sm" onClick={() => handleSaveSection("admin")} disabled={isPending}>
                {isPending && <Loader2 className="size-3.5 mr-1.5 animate-spin" />}
                Save Changes
              </Button>
            </CardFooter>
          )}
        </Card>

        {/* Courses Offered */}
        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
            <div>
              <CardTitle>Courses Offered</CardTitle>
              <CardDescription>Departments / courses available at your institution</CardDescription>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {!editing("courses") && (coursesComplete ? <SectionComplete /> : <SectionIncomplete />)}
              {!editing("courses") && (
                <Button variant="outline" size="sm" onClick={() => openSection("courses")}>
                  <Pencil className="size-3.5 mr-1.5" />
                  Edit
                </Button>
              )}
            </div>
          </CardHeader>

          <CardContent>
            {editing("courses") ? (
              <div className="space-y-3">
                {courses.map((course, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Input
                      placeholder="e.g. Computer Science"
                      value={course}
                      onChange={(e) => handleCourseChange(index, e.target.value)}
                    />
                    {courses.length > 1 && (
                      <Button variant="ghost" size="icon" type="button" onClick={() => removeCourse(index)}>
                        <Minus className="size-4" />
                      </Button>
                    )}
                  </div>
                ))}
                <Button variant="outline" size="sm" onClick={addCourse} type="button">
                  <Plus className="size-4 mr-2" />Add course
                </Button>
              </div>
            ) : (
              <div>
                {courses.filter(c => c.trim()).length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {courses.filter(c => c.trim()).map((course, i) => (
                      <Badge key={i} variant="secondary">{course}</Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No courses added yet. Click Edit to add courses offered by your institution.</p>
                )}
              </div>
            )}
          </CardContent>

          {editing("courses") && (
            <CardFooter className="flex justify-end gap-2 border-t pt-4">
              <Button variant="ghost" size="sm" onClick={() => cancelSection("courses")} disabled={isPending}>
                Cancel
              </Button>
              <Button size="sm" onClick={() => handleSaveSection("courses")} disabled={isPending}>
                {isPending && <Loader2 className="size-3.5 mr-1.5 animate-spin" />}
                Save Changes
              </Button>
            </CardFooter>
          )}
        </Card>

        {/* Social Media & Links */}
        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
            <div>
              <CardTitle>Social Media &amp; Links</CardTitle>
              <CardDescription>Connect your institution's social presence</CardDescription>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {!editing("social") && (socialComplete ? <SectionComplete /> : <SectionIncomplete />)}
              {!editing("social") && (
                <Button variant="outline" size="sm" onClick={() => openSection("social")}>
                  <Pencil className="size-3.5 mr-1.5" />
                  Edit
                </Button>
              )}
            </div>
          </CardHeader>

          <CardContent>
            {editing("social") ? (
              <div className="space-y-3">
                {socialLinks.map((link, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Input
                      value={link}
                      onChange={(e) => handleSocialLinkChange(index, e.target.value)}
                      placeholder="https://facebook.com/yourcollegepage"
                      type="url"
                    />
                    <Button variant="ghost" size="icon" type="button" onClick={() => removeSocialLink(index)}>
                      <Minus className="size-4" />
                    </Button>
                  </div>
                ))}
                <Button variant="outline" size="sm" onClick={addSocialLink} type="button">
                  <Plus className="size-4 mr-2" />Add link
                </Button>
              </div>
            ) : (
              <div>
                {socialLinks.filter(l => l.trim()).length > 0 ? (
                  <div className="space-y-1">
                    {socialLinks.filter(l => l.trim()).map((link, i) => (
                      <a
                        key={i}
                        href={link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block text-sm text-primary hover:underline truncate"
                      >
                        {link}
                      </a>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No social links added yet.</p>
                )}
              </div>
            )}
          </CardContent>

          {editing("social") && (
            <CardFooter className="flex justify-end gap-2 border-t pt-4">
              <Button variant="ghost" size="sm" onClick={() => cancelSection("social")} disabled={isPending}>
                Cancel
              </Button>
              <Button size="sm" onClick={() => handleSaveSection("social")} disabled={isPending}>
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
