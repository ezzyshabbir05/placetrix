"use client"

import { useState, useTransition, useEffect, useRef, useReducer } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { UserProfile } from "@/lib/supabase/profile"
import { toast } from "sonner"
import { ImageCropperModal } from "@/components/ImageCropperModal"
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

interface ProfileState {
  editingSection: SectionId | null
  bannerDismissed: boolean
  username: string
  usernameStatus: UsernameStatus
  logoSrc: string | null
  isUploadingLogo: boolean
  instituteName: string
  instituteCode: string
  establishedYear: string
  affiliation: string
  address: string
  city: string
  stateVal: string
  pincode: string
  country: string
  instPhone: string
  instEmail: string
  websiteUrl: string
  principalName: string
  principalEmail: string
  principalPhone: string
  courses: { id: string; value: string }[]
  socialLinks: { id: string; value: string }[]
  errors: Record<string, string>
}

type ProfileAction =
  | { type: "SET_FIELD"; field: keyof ProfileState; value: any }
  | { type: "SET_FIELDS"; fields: Partial<ProfileState> }
  | { type: "SET_COURSE"; index: number; value: string }
  | { type: "ADD_COURSE" }
  | { type: "REMOVE_COURSE"; index: number }
  | { type: "SET_SOCIAL_LINK"; index: number; value: string }
  | { type: "ADD_SOCIAL_LINK" }
  | { type: "REMOVE_SOCIAL_LINK"; index: number }
  | { type: "RESET_SECTION"; section: SectionId; initialData: Record<string, any> | null; userProfile: UserProfile }
  | { type: "SET_ERRORS"; errors: Record<string, string> }

// ─── Helpers ──────────────────────────────────────────────────────────────────

function generateId() {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).substring(2, 9)
}

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

function createInitialState(
  userProfile: UserProfile,
  initialData: Record<string, any> | null,
  isFirstTime: boolean,
  supabase: ReturnType<typeof createClient>
): ProfileState {
  return {
    editingSection: isFirstTime ? "basic" : null,
    bannerDismissed: false,
    username: userProfile.username ?? "",
    usernameStatus: "idle",
    logoSrc: getStorageUrl(supabase, "avatars", initialData?.logo_path ?? null),
    isUploadingLogo: false,
    instituteName: initialData?.institute_name ?? "",
    instituteCode: initialData?.institute_code ?? "",
    establishedYear: initialData?.established_year ? String(initialData.established_year) : "",
    affiliation: initialData?.affiliation ?? "",
    address: initialData?.address ?? "",
    city: initialData?.city ?? "",
    stateVal: initialData?.state ?? "",
    pincode: initialData?.pincode ?? "",
    country: initialData?.country ?? "India",
    instPhone: initialData?.phone_number ?? "",
    instEmail: initialData?.email ?? "",
    websiteUrl: initialData?.website_url ?? "",
    principalName: initialData?.principal_name ?? "",
    principalEmail: initialData?.principal_email ?? "",
    principalPhone: initialData?.principal_phone ?? "",
    courses: initialData?.courses?.length
      ? initialData.courses.map((c: string) => ({ id: generateId(), value: c }))
      : [{ id: generateId(), value: "" }],
    socialLinks: initialData?.social_links?.length
      ? initialData.social_links.map((l: string) => ({ id: generateId(), value: l }))
      : [{ id: generateId(), value: "" }],
    errors: {},
  }
}

function profileReducer(state: ProfileState, action: ProfileAction): ProfileState {
  switch (action.type) {
    case "SET_FIELD":
      return { ...state, [action.field]: action.value }
    case "SET_FIELDS":
      return { ...state, ...action.fields }
    case "SET_COURSE": {
      const newCourses = [...state.courses]
      newCourses[action.index] = { ...newCourses[action.index], value: action.value }
      return { ...state, courses: newCourses }
    }
    case "ADD_COURSE":
      return { ...state, courses: [...state.courses, { id: generateId(), value: "" }] }
    case "REMOVE_COURSE":
      return {
        ...state,
        courses: state.courses.filter((_, i) => i !== action.index),
      }
    case "SET_SOCIAL_LINK": {
      const newLinks = [...state.socialLinks]
      newLinks[action.index] = { ...newLinks[action.index], value: action.value }
      return { ...state, socialLinks: newLinks }
    }
    case "ADD_SOCIAL_LINK":
      return { ...state, socialLinks: [...state.socialLinks, { id: generateId(), value: "" }] }
    case "REMOVE_SOCIAL_LINK":
      return {
        ...state,
        socialLinks: state.socialLinks.filter((_, i) => i !== action.index),
      }
    case "SET_ERRORS":
      return { ...state, errors: action.errors }
    case "RESET_SECTION": {
      const { section, initialData, userProfile } = action
      const resetFields: Partial<ProfileState> = { errors: {} }
      if (section === "account") {
        resetFields.username = userProfile.username ?? ""
        resetFields.usernameStatus = "idle"
      } else if (section === "basic") {
        resetFields.instituteName = initialData?.institute_name ?? ""
        resetFields.instituteCode = initialData?.institute_code ?? ""
        resetFields.establishedYear = initialData?.established_year ? String(initialData.established_year) : ""
        resetFields.affiliation = initialData?.affiliation ?? ""
        resetFields.address = initialData?.address ?? ""
        resetFields.city = initialData?.city ?? ""
        resetFields.stateVal = initialData?.state ?? ""
        resetFields.pincode = initialData?.pincode ?? ""
        resetFields.country = initialData?.country ?? "India"
      } else if (section === "contact") {
        resetFields.instPhone = initialData?.phone_number ?? ""
        resetFields.instEmail = initialData?.email ?? ""
        resetFields.websiteUrl = initialData?.website_url ?? ""
      } else if (section === "admin") {
        resetFields.principalName = initialData?.principal_name ?? ""
        resetFields.principalEmail = initialData?.principal_email ?? ""
        resetFields.principalPhone = initialData?.principal_phone ?? ""
      } else if (section === "courses") {
        resetFields.courses = initialData?.courses?.length
          ? initialData.courses.map((c: string) => ({ id: generateId(), value: c }))
          : [{ id: generateId(), value: "" }]
      } else if (section === "social") {
        resetFields.socialLinks = initialData?.social_links?.length
          ? initialData.social_links.map((l: string) => ({ id: generateId(), value: l }))
          : [{ id: generateId(), value: "" }]
      }
      return { ...state, ...resetFields, editingSection: null }
    }
    default:
      return state
  }
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
  const { refresh } = useRouter()
  const [isPending, startTransition] = useTransition()

  const isFirstTime = !initialData?.institute_name
  const [state, dispatch] = useReducer(profileReducer, null, () =>
    createInitialState(userProfile, initialData, isFirstTime, supabase)
  )

  const {
    editingSection,
    bannerDismissed,
    username,
    usernameStatus,
    logoSrc,
    isUploadingLogo,
    instituteName,
    instituteCode,
    establishedYear,
    affiliation,
    address,
    city,
    stateVal,
    pincode,
    country,
    instPhone,
    instEmail,
    websiteUrl,
    principalName,
    principalEmail,
    principalPhone,
    courses,
    socialLinks,
    errors,
  } = state

  const usernameDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const initialUsername = useRef(userProfile.username ?? "")
  const storedLogoPath = useRef<string | null>(initialData?.logo_path ?? null)
  const logoInputRef = useRef<HTMLInputElement>(null)
  const [cropModalOpen, setCropModalOpen] = useState(false)
  const [tempImageSrc, setTempImageSrc] = useState<string | null>(null)
  const [tempFileName, setTempFileName] = useState("")

  useEffect(() => {
    return () => {
      if (tempImageSrc) {
        URL.revokeObjectURL(tempImageSrc)
      }
    }
  }, [tempImageSrc])

  // ── Section completeness (from server data) ───────────────────────────────
  const basicComplete = !!(initialData?.institute_name && initialData?.affiliation && initialData?.city)
  const contactComplete = !!(initialData?.phone_number && initialData?.email)
  const adminComplete = !!(initialData?.principal_name && initialData?.principal_email)
  const coursesComplete = !!(initialData?.courses?.some((c: string) => c.trim()))
  const socialComplete = !!(initialData?.social_links?.some((l: string) => l.trim()))

  // ── Username debounce ─────────────────────────────────────────────────────

  function handleUsernameChange(value: string) {
    const trimmed = value.trim()
    dispatch({ type: "SET_FIELD", field: "username", value: trimmed })
    if (usernameDebounceRef.current) clearTimeout(usernameDebounceRef.current)
    if (!trimmed) {
      dispatch({ type: "SET_FIELD", field: "usernameStatus", value: "idle" })
      return
    }
    if (trimmed === initialUsername.current) {
      dispatch({ type: "SET_FIELD", field: "usernameStatus", value: "unchanged" })
      return
    }
    if (!USERNAME_REGEX.test(trimmed)) {
      dispatch({ type: "SET_FIELD", field: "usernameStatus", value: "invalid" })
      return
    }
    dispatch({ type: "SET_FIELD", field: "usernameStatus", value: "checking" })
    usernameDebounceRef.current = setTimeout(async () => {
      const { data, error } = await (supabase as any).rpc("check_username_available", {
        p_username: trimmed,
        p_user_id: userProfile.id,
      })
      if (error) {
        dispatch({ type: "SET_FIELD", field: "usernameStatus", value: "idle" })
        return
      }
      dispatch({
        type: "SET_FIELD",
        field: "usernameStatus",
        value: data === true ? "available" : "taken",
      })
    }, 500)
  }

  useEffect(() => {
    const timerRef = usernameDebounceRef
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  // ── Section open/close ────────────────────────────────────────────────────

  function openSection(section: SectionId) {
    if (editingSection && editingSection !== section) {
      const confirmDiscard = window.confirm("You are currently editing another section. Unsaved changes will be discarded. Do you want to proceed?")
      if (!confirmDiscard) return
      dispatch({ type: "RESET_SECTION", section: editingSection, initialData, userProfile })
    }
    dispatch({ type: "SET_FIELDS", fields: { errors: {}, editingSection: section } })
  }

  function cancelSection(section: SectionId) {
    dispatch({ type: "RESET_SECTION", section, initialData, userProfile })
  }

  // ── Course management ─────────────────────────────────────────────────────

  function addCourse() {
    dispatch({ type: "ADD_COURSE" })
  }
  function handleCourseChange(index: number, value: string) {
    dispatch({ type: "SET_COURSE", index, value })
  }
  function removeCourse(index: number) {
    dispatch({ type: "REMOVE_COURSE", index })
  }

  // ── Social link management ────────────────────────────────────────────────

  function addSocialLink() {
    dispatch({ type: "ADD_SOCIAL_LINK" })
  }
  function handleSocialLinkChange(index: number, value: string) {
    const cleanValue = value.replace(/[<>]/g, '').slice(0, 200)
    dispatch({ type: "SET_SOCIAL_LINK", index, value: cleanValue })
  }
  function removeSocialLink(index: number) {
    dispatch({ type: "REMOVE_SOCIAL_LINK", index })
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

    if (establishedYear) {
      const year = Number(establishedYear)
      const currentYear = new Date().getFullYear()
      if (isNaN(year) || year < 1800 || year > currentYear) {
        e.establishedYear = `Enter a valid established year (1800 - ${currentYear}).`
      }
    }
    return e
  }

  function validateContact() {
    const e: Record<string, string> = {}
    const phone = instPhone.trim()
    if (!phone) e.instPhone = "Contact number is required."
    else if (!/^[0-9]{10}$/.test(phone)) e.instPhone = "Contact number must be exactly 10 digits."

    if (!instEmail.trim()) e.instEmail = "Email address is required."
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(instEmail)) e.instEmail = "Enter a valid email address."

    if (websiteUrl.trim() && !/^(https?:\/\/)?(www\.)?[a-zA-Z0-9-]+\.[a-zA-Z]{2,}.*$/i.test(websiteUrl)) {
      e.websiteUrl = "Please enter a valid website URL."
    }
    return e
  }

  function validateAdmin() {
    const e: Record<string, string> = {}
    if (!principalName.trim()) e.principalName = "Principal name is required."
    if (!principalEmail.trim()) e.principalEmail = "Principal email is required."
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(principalEmail)) e.principalEmail = "Enter a valid email address."

    const phone = principalPhone.trim()
    if (!phone) e.principalPhone = "Principal phone is required."
    else if (!/^[0-9]{10}$/.test(phone)) e.principalPhone = "Contact number must be exactly 10 digits."
    return e
  }

  function validateSocial() {
    const e: Record<string, string> = {}
    const invalidLinks = socialLinks.filter(l => l.value.trim() && !/^(https?:\/\/)?(www\.)?[a-zA-Z0-9-]+\.[a-zA-Z]{2,}.*$/i.test(l.value))
    if (invalidLinks.length > 0) {
      e.socialLinks = "One or more social links are invalid URLs."
    }
    return e
  }

  // ── Per-section save ──────────────────────────────────────────────────────

  function handleSaveSection(section: SectionId) {
    let newErrors: Record<string, string> = {}
    if (section === "account") newErrors = validateAccount()
    else if (section === "basic") newErrors = validateBasic()
    else if (section === "contact") newErrors = validateContact()
    else if (section === "admin") newErrors = validateAdmin()
    else if (section === "social") newErrors = validateSocial()

    if (Object.keys(newErrors).length > 0) {
      dispatch({ type: "SET_ERRORS", errors: newErrors })
      toast.error("Please fix the validation errors before saving.")
      return
    }

    startTransition(async () => {
      try {
        if (section === "account") {
          const trimmedUsername = username.trim() || null
          if (trimmedUsername !== (userProfile.username ?? null)) {
            const { error } = await (supabase as any).from("profiles").update({ username: trimmedUsername }).eq("id", userProfile.id)
            if (error) {
              if (error.code === "23505") {
                dispatch({ type: "SET_ERRORS", errors: { username: "This username is already taken." } })
                dispatch({ type: "SET_FIELD", field: "usernameStatus", value: "taken" })
              } else {
                toast.error("Failed to update username. Please try again.")
              }
              return
            }
            await supabase.auth.updateUser({ data: { username: trimmedUsername } })
            if (trimmedUsername) {
              initialUsername.current = trimmedUsername
              dispatch({ type: "SET_FIELD", field: "usernameStatus", value: "unchanged" })
            }
          }
          toast.success("Account settings saved!")
        }

        else if (section === "basic") {
          const payload = {
            institute_name: instituteName.trim(),
            institute_code: instituteCode.trim() || null,
            established_year: establishedYear ? Number(establishedYear) : null,
            affiliation: affiliation || null,
            address: address.trim() || null,
            city: city.trim() || null,
            state: stateVal || null,
            pincode: pincode.trim() || null,
            country: country || null,
          }
          
          let instId = initialData?.id;
          const newDisplayName = instituteName.trim() || userProfile.display_name;

          if (instId) {
            const { error } = await (supabase as any)
              .from("institutes")
              .update(payload)
              .eq("id", instId)
            if (error) throw error
          } else {
            const { data: newInst, error } = await (supabase as any)
              .from("institutes")
              .insert(payload)
              .select("id")
              .single()
            if (error) throw error
            instId = newInst.id
          }

          await (supabase as any)
            .from("profiles")
            .update({ display_name: newDisplayName, profile_updated: true })
            .eq("id", userProfile.id)

          await (supabase as any)
            .from("institute_profiles")
            .upsert({ profile_id: userProfile.id, institute_id: instId, profile_updated: true }, { onConflict: "profile_id" })

          await supabase.auth.updateUser({ data: { display_name: newDisplayName } })
          toast.success("Basic information saved!")
        }

        else if (section === "contact") {
          if (!initialData?.id) { toast.error("Please save Basic Information first."); return }
          const { error } = await (supabase as any)
            .from("institutes")
            .update({
              phone_number: instPhone.trim() || null,
              email: instEmail.trim() || null,
              website_url: websiteUrl.trim() || null,
            })
            .eq("id", initialData.id)
          if (error) throw error
          toast.success("Contact information saved!")
        }

        else if (section === "admin") {
          if (!initialData?.id) { toast.error("Please save Basic Information first."); return }
          const { error } = await (supabase as any)
            .from("institutes")
            .update({
              principal_name: principalName.trim() || null,
              principal_email: principalEmail.trim() || null,
              principal_phone: principalPhone.trim() || null,
            })
            .eq("id", initialData.id)
          if (error) throw error
          toast.success("Administrative contacts saved!")
        }


        else if (section === "courses") {
          const filteredCourses = courses.map((c) => c.value.trim()).filter(Boolean)
          if (!initialData?.id) { toast.error("Please save Basic Information first."); return }
          const { error } = await (supabase as any)
            .from("institutes")
            .update({ courses: filteredCourses })
            .eq("id", initialData.id)
          if (error) throw error
          toast.success("Courses updated!")
        }

        else if (section === "social") {
          const filteredLinks = socialLinks.map((l) => l.value.trim()).filter(Boolean)
          if (!initialData?.id) { toast.error("Please save Basic Information first."); return }
          const { error } = await (supabase as any)
            .from("institutes")
            .update({ social_links: filteredLinks })
            .eq("id", initialData.id)
          if (error) throw error
          toast.success("Social links updated!")
        }

        dispatch({ type: "SET_FIELDS", fields: { errors: {}, editingSection: null } })
        refresh()
      } catch (err: any) {
        console.error("Save error:", err)
        toast.error(err?.message || "Failed to save. Please try again.")
      }
    })
  }

  // ── Logo upload ───────────────────────────────────────────────────────────

  function handleLogoFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      toast.error("Please upload a JPEG, PNG, or WEBP image.")
      return
    }
    const blobUrl = URL.createObjectURL(file)
    setTempImageSrc(blobUrl)
    setTempFileName(file.name)
    setCropModalOpen(true)
  }

  const handleCropModalClose = () => {
    setCropModalOpen(false)
    if (tempImageSrc) {
      URL.revokeObjectURL(tempImageSrc)
      setTempImageSrc(null)
    }
    if (logoInputRef.current) logoInputRef.current.value = ""
  }

  async function handleCroppedLogoUpload(croppedFile: File) {
    const localPreviewUrl = URL.createObjectURL(croppedFile)
    dispatch({ type: "SET_FIELD", field: "logoSrc", value: localPreviewUrl })
    dispatch({ type: "SET_FIELD", field: "isUploadingLogo", value: true })
    try {
      const oldPath = storedLogoPath.current
      if (oldPath) await supabase.storage.from("avatars").remove([oldPath])
      const timestamp = Date.now()
      const newPath = `institutes/${userProfile.id}/logo/${timestamp}.jpg`
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(newPath, croppedFile, { upsert: false, contentType: croppedFile.type })
      if (uploadError) throw uploadError
      if (!initialData?.id) {
        toast.error("Please save Basic Information first.")
        return
      }
      const { error: dbError } = await (supabase as any)
        .from("institutes")
        .update({ logo_path: newPath })
        .eq("id", initialData.id)
      if (dbError) throw dbError
      await (supabase as any).from("profiles").update({ avatar_path: newPath }).eq("id", userProfile.id)
      await supabase.auth.updateUser({ data: { avatar_path: newPath } })
      storedLogoPath.current = newPath
      const newPublicUrl = getStorageUrl(supabase, "avatars", newPath)
      dispatch({ type: "SET_FIELD", field: "logoSrc", value: `${newPublicUrl}?v=${timestamp}` })
      toast.success("Logo updated!")
      refresh()
    } catch (err) {
      console.error(err)
      toast.error("Failed to upload logo. Please try again.")
      dispatch({
        type: "SET_FIELD",
        field: "logoSrc",
        value: getStorageUrl(supabase, "avatars", storedLogoPath.current),
      })
    } finally {
      dispatch({ type: "SET_FIELD", field: "isUploadingLogo", value: false })
      URL.revokeObjectURL(localPreviewUrl)
      if (tempImageSrc) {
        URL.revokeObjectURL(tempImageSrc)
        setTempImageSrc(null)
      }
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
                onClick={() => dispatch({ type: "SET_FIELD", field: "bannerDismissed", value: true })}
              >
                <X className="size-3.5" />
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Account Settings — only shown if username not yet set */}
        {!initialUsername.current ? (
          <Card className={cn("transition-all duration-200", editing("account") && "border-primary/50 shadow-md ring-1 ring-primary/10")}>
            <CardHeader className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 space-y-0">
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
                  <p className="text-xs text-muted-foreground mt-1">Set your username; it cannot be changed once saved</p>
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
            <CardDescription>JPEG, PNG or WEBP</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row items-center gap-6">
              <div 
                className="relative group cursor-pointer shrink-0"
                onClick={() => !isUploadingLogo && logoInputRef.current?.click()}
              >
                <Avatar className="h-24 w-24 !rounded-xl border-2 border-muted transition-transform duration-200 group-hover:scale-105">
                  <AvatarImage src={logoSrc ?? undefined} alt="Institution logo" className="object-cover !rounded-xl" />
                  <AvatarFallback className="!rounded-xl text-2xl font-semibold">
                    {instituteName ? instituteName[0].toUpperCase() : "?"}
                  </AvatarFallback>
                </Avatar>
                <div className="absolute inset-0 !rounded-xl bg-black/40 flex flex-col items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  <Camera className="h-5 w-5 mb-1" />
                  <span className="text-[10px] font-medium">Change</span>
                </div>
                <div className="absolute bottom-0 right-0 h-7 w-7 rounded-lg bg-primary text-primary-foreground flex items-center justify-center shadow-md border-2 border-background translate-x-1 translate-y-1">
                  {isUploadingLogo
                    ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    : <Camera className="h-3.5 w-3.5" />}
                </div>
              </div>
              <div className="flex flex-col items-center sm:items-start gap-2.5">
                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={handleLogoFileChange}
                  aria-label="Upload logo"
                />
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => logoInputRef.current?.click()} 
                  disabled={isUploadingLogo}
                  className="shadow-sm"
                >
                  {isUploadingLogo ? (
                    <><Loader2 className="size-4 mr-2 animate-spin" />Uploading…</>
                  ) : (
                    <><Upload className="size-4 mr-2" />Upload Logo</>
                  )}
                </Button>
                <p className="text-xs text-muted-foreground text-center sm:text-left">
                  Supports JPEG, PNG or WEBP. Max size 2MB.
                </p>
                {!initialData?.institute_name && (
                  <p className="text-xs text-amber-600 dark:text-amber-400 text-center sm:text-left">
                    Save institution details first, then upload the logo.
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Basic Information */}
        <Card className={cn("transition-all duration-200", editing("basic") && "border-primary/50 shadow-md ring-1 ring-primary/10")}>
          <CardHeader className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 space-y-0">
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
                      onChange={(e) => dispatch({ type: "SET_FIELD", field: "instituteName", value: e.target.value.replace(/[<>]/g, '') })}
                    />
                    <FieldError message={errors.instituteName} />
                  </div>
                  <div className="space-y-2">
                    <Label>College Code</Label>
                    <Input
                      placeholder="College code (optional)"
                      maxLength={20}
                      value={instituteCode}
                      onChange={(e) => dispatch({ type: "SET_FIELD", field: "instituteCode", value: e.target.value.replace(/[<>]/g, '') })}
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
                      onChange={(e) => dispatch({ type: "SET_FIELD", field: "establishedYear", value: e.target.value.replace(/\D/g, "").slice(0, 4) })}
                    />
                    <FieldError message={errors.establishedYear} />
                  </div>
                  <div className="space-y-2">
                    <Label>Affiliation<RequiredMark /></Label>
                    <Combobox items={AFFILIATION_OPTIONS} value={affiliation} onValueChange={(v) => dispatch({ type: "SET_FIELD", field: "affiliation", value: v || "" })}>
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
                    onChange={(e) => dispatch({ type: "SET_FIELD", field: "address", value: e.target.value.replace(/[<>]/g, '') })}
                  />
                  <FieldError message={errors.address} />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>City<RequiredMark /></Label>
                    <Input placeholder="City" value={city} onChange={(e) => dispatch({ type: "SET_FIELD", field: "city", value: e.target.value.replace(/[<>]/g, '') })} />
                    <FieldError message={errors.city} />
                  </div>
                  <div className="space-y-2">
                    <Label>State<RequiredMark /></Label>
                    <Combobox items={STATE_OPTIONS} value={stateVal} onValueChange={(v) => dispatch({ type: "SET_FIELD", field: "stateVal", value: v || "" })}>
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
                      onChange={(e) => dispatch({ type: "SET_FIELD", field: "pincode", value: e.target.value.replace(/\D/g, "") })}
                    />
                    <FieldError message={errors.pincode} />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Country<RequiredMark /></Label>
                  <Combobox items={COUNTRY_OPTIONS} value={country} onValueChange={(v) => dispatch({ type: "SET_FIELD", field: "country", value: v || "India" })}>
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
                  <div className="sm:col-span-2">
                    <ReadonlyField label="College Name" value={instituteName} />
                  </div>
                  <ReadonlyField label="College Code" value={instituteCode} />
                  <ReadonlyField label="Established Year" value={establishedYear} />
                  <div className="sm:col-span-2">
                    <ReadonlyField label="Affiliation" value={affiliation} />
                  </div>
                </div>
                <Separator />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
                  <div className="sm:col-span-2">
                    <ReadonlyField label="Address" value={address} />
                  </div>
                  <ReadonlyField label="City" value={city} />
                  <ReadonlyField label="State" value={stateVal} />
                  <ReadonlyField label="Pincode" value={pincode} />
                  <ReadonlyField label="Country" value={country} />
                </div>
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
        <Card className={cn("transition-all duration-200", editing("contact") && "border-primary/50 shadow-md ring-1 ring-primary/10")}>
          <CardHeader className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 space-y-0">
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
                      maxLength={10}
                      value={instPhone}
                      onChange={(e) => dispatch({ type: "SET_FIELD", field: "instPhone", value: e.target.value.replace(/\D/g, "") })}
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
                      maxLength={100}
                      value={instEmail}
                      onChange={(e) => dispatch({ type: "SET_FIELD", field: "instEmail", value: e.target.value.replace(/[<>]/g, '') })}
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
                    maxLength={200}
                    value={websiteUrl}
                    onChange={(e) => dispatch({ type: "SET_FIELD", field: "websiteUrl", value: e.target.value.replace(/[<>]/g, '') })}
                  />
                  <FieldError message={errors.websiteUrl} />
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
        <Card className={cn("transition-all duration-200", editing("admin") && "border-primary/50 shadow-md ring-1 ring-primary/10")}>
          <CardHeader className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 space-y-0">
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
                      onChange={(e) => dispatch({ type: "SET_FIELD", field: "principalName", value: e.target.value.replace(/[<>]/g, '') })}
                    />
                    <FieldError message={errors.principalName} />
                  </div>
                  <div className="space-y-2">
                    <Label>Email<RequiredMark /></Label>
                    <Input
                      placeholder="principal@example.com"
                      type="email"
                      value={principalEmail}
                      onChange={(e) => dispatch({ type: "SET_FIELD", field: "principalEmail", value: e.target.value })}
                    />
                    <FieldError message={errors.principalEmail} />
                  </div>
                  <div className="space-y-2">
                    <Label>Contact Number<RequiredMark /></Label>
                    <Input
                      placeholder="Contact number"
                      type="tel"
                      maxLength={10}
                      value={principalPhone}
                      onChange={(e) => dispatch({ type: "SET_FIELD", field: "principalPhone", value: e.target.value.replace(/\D/g, "") })}
                    />
                    <FieldError message={errors.principalPhone} />
                  </div>
                </div>
              </div>
            ) : (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-3">Principal</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-8 gap-y-4">
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
        <Card className={cn("transition-all duration-200", editing("courses") && "border-primary/50 shadow-md ring-1 ring-primary/10")}>
          <CardHeader className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 space-y-0">
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
                {courses.map((courseItem, index) => (
                  <div key={courseItem.id} className="flex items-center gap-2">
                    <Input
                      placeholder="e.g. Computer Science"
                      value={courseItem.value}
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
                {(() => {
                  const badges = courses.reduce<React.ReactNode[]>((acc, courseItem) => {
                    const trimmed = courseItem.value.trim()
                    if (trimmed) {
                      acc.push(
                        <Badge key={courseItem.id} variant="secondary">
                          {trimmed}
                        </Badge>
                      )
                    }
                    return acc
                  }, [])
                  return badges.length > 0 ? (
                    <div className="flex flex-wrap gap-2">{badges}</div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      No courses added yet. Click Edit to add courses offered by your institution.
                    </p>
                  )
                })()}
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
        <Card className={cn("transition-all duration-200", editing("social") && "border-primary/50 shadow-md ring-1 ring-primary/10")}>
          <CardHeader className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 space-y-0">
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
                {socialLinks.map((linkItem, index) => (
                  <div key={linkItem.id} className="flex items-center gap-2">
                    <Input
                      value={linkItem.value}
                      onChange={(e) => handleSocialLinkChange(index, e.target.value)}
                      placeholder="https://facebook.com/yourcollegepage"
                      type="url"
                      maxLength={200}
                    />
                    <Button variant="ghost" size="icon" type="button" onClick={() => removeSocialLink(index)}>
                      <Minus className="size-4" />
                    </Button>
                  </div>
                ))}
                <Button variant="outline" size="sm" onClick={addSocialLink} type="button">
                  <Plus className="size-4 mr-2" />Add link
                </Button>
                <FieldError message={errors.socialLinks} />
              </div>
            ) : (
              <div>
                {(() => {
                  const links = socialLinks.reduce<React.ReactNode[]>((acc, linkItem) => {
                    const trimmed = linkItem.value.trim()
                    if (trimmed) {
                      acc.push(
                        <a
                          key={linkItem.id}
                          href={trimmed}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block text-sm text-primary hover:underline truncate"
                        >
                          {trimmed}
                        </a>
                      )
                    }
                    return acc
                  }, [])
                  return links.length > 0 ? (
                    <div className="space-y-1">{links}</div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No social links added yet.</p>
                  )
                })()}
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
      <ImageCropperModal
        isOpen={cropModalOpen}
        onClose={handleCropModalClose}
        imageSrc={tempImageSrc}
        fileName={tempFileName}
        shape="square"
        onCropComplete={handleCroppedLogoUpload}
      />
    </div>
  )
}
