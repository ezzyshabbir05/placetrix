"use client"

import { useState, useTransition, useEffect, useRef } from "react"
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
  Upload, Loader2, Camera, CheckCircle2, XCircle, AtSign,
  Pencil, X, CheckCircle, Info,
} from "lucide-react"
import { cn } from "@/lib/utils"

const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"]
const MAX_IMAGE_SIZE_BYTES = 2 * 1024 * 1024
const USERNAME_REGEX = /^[a-zA-Z0-9_]{3,20}$/

type SectionId = "account" | "profile"
type UsernameStatus = "idle" | "checking" | "available" | "taken" | "invalid" | "unchanged"

interface Props {
  userProfile: UserProfile
  initialData: any
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
      <p className="text-sm font-medium">
        {value?.trim() ? value : <span className="text-muted-foreground font-normal">—</span>}
      </p>
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

function getInitials(displayName: string, email: string): string {
  if (displayName) {
    const parts = displayName.trim().split(/\s+/)
    if (parts.length > 1) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
    }
    return displayName[0].toUpperCase()
  }
  return email[0]?.toUpperCase() ?? "A"
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

export function AdminProfileClient({ userProfile }: Props) {
  const supabase = createClient()
  const { refresh } = useRouter()
  const [isPending, startTransition] = useTransition()

  const isFirstTime = !userProfile.username || !userProfile.full_name
  const [editingSection, setEditingSection] = useState<SectionId | null>(
    isFirstTime ? "profile" : null
  )
  const [bannerDismissed, setBannerDismissed] = useState(false)

  // Username status state
  const [username, setUsername] = useState(userProfile.username ?? "")
  const [usernameStatus, setUsernameStatus] = useState<UsernameStatus>("idle")
  const usernameDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const initialUsername = useRef(userProfile.username ?? "")

  // Avatar path state
  const storedAvatarPath = useRef<string | null>(userProfile.avatar_path ?? null)
  const [avatarSrc, setAvatarSrc] = useState<string | null>(() =>
    getStorageUrl(supabase, "avatars", storedAvatarPath.current)
  )
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false)
  const avatarInputRef = useRef<HTMLInputElement>(null)
  const [cropModalOpen, setCropModalOpen] = useState(false)
  const [tempImageSrc, setTempImageSrc] = useState<string | null>(null)
  const [tempFileName, setTempFileName] = useState("")

  // Signature path state
  const storedSignaturePath = useRef<string | null>(userProfile.signature_path ?? null)
  const [signatureSrc, setSignatureSrc] = useState<string | null>(() =>
    getStorageUrl(supabase, "avatars", storedSignaturePath.current)
  )
  const [isUploadingSignature, setIsUploadingSignature] = useState(false)
  const signatureInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    return () => {
      if (tempImageSrc) {
        URL.revokeObjectURL(tempImageSrc)
      }
    }
  }, [tempImageSrc])

  const [displayName, setDisplayName] = useState(userProfile.full_name ?? "")
  const [errors, setErrors] = useState<Record<string, string>>({})

  const profileComplete = !!userProfile.full_name

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
    return () => { if (usernameDebounceRef.current) clearTimeout(usernameDebounceRef.current) }
  }, [])

  function openSection(section: SectionId) {
    if (editingSection && editingSection !== section) {
      const confirmDiscard = window.confirm("You are currently editing another section. Unsaved changes will be discarded. Do you want to proceed?")
      if (!confirmDiscard) return
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
    } else if (section === "profile") {
      setDisplayName(userProfile.full_name ?? "")
    }
    setEditingSection(null)
  }

  function validateAccount() {
    const e: Record<string, string> = {}
    if (username && !USERNAME_REGEX.test(username)) e.username = "3–20 characters: letters, numbers, and underscores only."
    if (usernameStatus === "taken") e.username = "This username is already taken."
    if (usernameStatus === "checking") e.username = "Please wait for username availability check."
    return e
  }

  function validateProfile() {
    const e: Record<string, string> = {}
    const trimmed = displayName.trim()
    if (!trimmed) e.displayName = "Display name is required."
    else if (!/^[a-zA-Z\s]+$/.test(trimmed)) e.displayName = "Display name must contain only alphabets and spaces."
    else if (trimmed.length < 3) e.displayName = "Display name must be at least 3 characters."
    else if (trimmed.length > 50) e.displayName = "Display name cannot exceed 50 characters."
    return e
  }

  function handleSaveSection(section: SectionId) {
    let newErrors: Record<string, string> = {}
    if (section === "account") newErrors = validateAccount()
    else if (section === "profile") newErrors = validateProfile()

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
            const { error } = await supabase
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
            await supabase.auth.updateUser({
              data: {
                username: trimmedUsername,
                account_type: userProfile.account_type,
              }
            })
            if (trimmedUsername) {
              initialUsername.current = trimmedUsername
              setUsernameStatus("unchanged")
            }
          }
          toast.success("Account settings saved!")
        }

        else if (section === "profile") {
          const trimmedDisplayName = displayName.trim()
          const { error } = await supabase
            .from("profiles")
            .update({ full_name: trimmedDisplayName })
            .eq("id", userProfile.id)

          if (error) {
            toast.error("Failed to update profile. Please try again.")
            return
          }

          await supabase.auth.updateUser({
            data: {
              full_name: trimmedDisplayName,
              account_type: userProfile.account_type,
            }
          })

          toast.success("Profile updated successfully!")
        }

        setErrors({})
        setEditingSection(null)
        refresh()
      } catch (err: any) {
        console.error("Save error:", err)
        toast.error(err?.message || "Failed to save profile. Please try again.")
      }
    })
  }

  function handleAvatarFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) { toast.error("Please upload a JPEG, PNG, or WEBP image."); return }
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
    if (avatarInputRef.current) avatarInputRef.current.value = ""
  }

  async function handleCroppedAvatarUpload(croppedFile: File) {
    setIsUploadingAvatar(true)
    const localPreviewUrl = URL.createObjectURL(croppedFile)
    setAvatarSrc(localPreviewUrl)
    try {
      const oldPath = storedAvatarPath.current
      if (oldPath) {
        const { error: deleteError } = await supabase.storage.from("avatars").remove([oldPath])
        if (deleteError) console.warn("Could not delete old avatar:", deleteError.message)
      }
      const timestamp = Date.now()
      const newPath = `admins/${userProfile.id}/avatar/${timestamp}.jpg`

      const { error: uploadError } = await supabase.storage.from("avatars").upload(newPath, croppedFile, { upsert: false, contentType: croppedFile.type })
      if (uploadError) throw uploadError

      const { error: dbError } = await supabase.from("profiles").update({ avatar_path: newPath }).eq("id", userProfile.id)
      if (dbError) throw dbError

      await supabase.auth.updateUser({
        data: {
          avatar_path: newPath,
          account_type: userProfile.account_type,
        }
      })
      storedAvatarPath.current = newPath
      const newPublicUrl = getStorageUrl(supabase, "avatars", newPath)
      setAvatarSrc(`${newPublicUrl}?v=${timestamp}`)
      toast.success("Avatar updated!")
      refresh()
    } catch (err) {
      console.error(err)
      toast.error("Failed to upload avatar. Please try again.")
      setAvatarSrc(getStorageUrl(supabase, "avatars", storedAvatarPath.current))
    } finally {
      setIsUploadingAvatar(false)
      URL.revokeObjectURL(localPreviewUrl)
      if (tempImageSrc) {
        URL.revokeObjectURL(tempImageSrc)
        setTempImageSrc(null)
      }
      if (avatarInputRef.current) avatarInputRef.current.value = ""
    }
  }

  async function handleSignatureFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      toast.error("Please upload a JPEG, PNG, or WEBP image.")
      return
    }
    
    setIsUploadingSignature(true)
    const localPreviewUrl = URL.createObjectURL(file)
    setSignatureSrc(localPreviewUrl)
    
    try {
      const oldPath = storedSignaturePath.current
      if (oldPath) {
        const { error: deleteError } = await supabase.storage.from("avatars").remove([oldPath])
        if (deleteError) console.warn("Could not delete old signature:", deleteError.message)
      }
      
      const timestamp = Date.now()
      const fileExt = file.name.split(".").pop() ?? "png"
      const newPath = `admins/${userProfile.id}/signature/${timestamp}.${fileExt}`

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(newPath, file, { upsert: false, contentType: file.type })
      if (uploadError) throw uploadError

      const { error: dbError } = await supabase
        .from("profiles")
        .update({ signature_path: newPath })
        .eq("id", userProfile.id)
      if (dbError) throw dbError

      storedSignaturePath.current = newPath
      const newPublicUrl = getStorageUrl(supabase, "avatars", newPath)
      setSignatureSrc(`${newPublicUrl}?v=${timestamp}`)
      toast.success("Signature uploaded successfully!")
      refresh()
    } catch (err) {
      console.error(err)
      toast.error("Failed to upload signature. Please try again.")
      setSignatureSrc(getStorageUrl(supabase, "avatars", storedSignaturePath.current))
    } finally {
      setIsUploadingSignature(false)
      URL.revokeObjectURL(localPreviewUrl)
      if (signatureInputRef.current) signatureInputRef.current.value = ""
    }
  }

  async function handleRemoveSignature() {
    const confirmRemove = window.confirm("Are you sure you want to remove your signature?")
    if (!confirmRemove) return

    setIsUploadingSignature(true)
    try {
      const oldPath = storedSignaturePath.current
      if (oldPath) {
        const { error: deleteError } = await supabase.storage.from("avatars").remove([oldPath])
        if (deleteError) console.warn("Could not delete old signature:", deleteError.message)
      }

      const { error: dbError } = await supabase
        .from("profiles")
        .update({ signature_path: null })
        .eq("id", userProfile.id)
      if (dbError) throw dbError

      storedSignaturePath.current = null
      setSignatureSrc(null)
      toast.success("Signature removed successfully!")
      refresh()
    } catch (err) {
      console.error(err)
      toast.error("Failed to remove signature. Please try again.")
    } finally {
      setIsUploadingSignature(false)
    }
  }

  const usernameMsg = usernameStatusMessage(usernameStatus)
  const initials = getInitials(displayName, userProfile.email)
  const editing = (s: SectionId) => editingSection === s

  return (
    <div className="flex flex-col gap-6 px-4 py-8 md:px-8">
      {/* Page Header */}
      <div className="flex flex-col gap-1.5">
        <h1 className="text-3xl font-bold font-cirka tracking-tight text-foreground">My Profile</h1>
        <p className="text-sm text-muted-foreground">Manage your personal admin settings and profile details</p>
      </div>

      <div className="space-y-6">
        {/* Onboarding Banner */}
        {isFirstTime && !bannerDismissed && (
          <Alert className="border-primary/30 bg-primary/5">
            <Info className="h-4 w-4 text-primary" />
            <AlertTitle className="text-primary font-semibold">Welcome! Let's complete your admin profile</AlertTitle>
            <AlertDescription className="mt-1 flex items-start justify-between gap-4">
              <span className="text-muted-foreground text-sm leading-relaxed">
                Click <strong>Edit</strong> on the section below to fill in your display name.
                Required fields are marked with <span className="text-destructive font-bold">*</span>.
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="shrink-0 h-6 w-6"
                onClick={() => setBannerDismissed(true)}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Account Settings */}
        <Card className={cn("transition-all duration-200", editing("account") && "border-primary/50 shadow-md ring-1 ring-primary/10")}>
            <CardHeader className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 space-y-0">
              <div>
                <CardTitle>Account Settings</CardTitle>
                <CardDescription>Your unique username is used to identify you on the platform</CardDescription>
              </div>
              {!editing("account") && (
                <Button variant="outline" size="sm" onClick={() => openSection("account")}>
                  <Pencil className="h-3.5 w-3.5 mr-1.5" />
                  Edit
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {editing("account") ? (
                <div className="max-w-sm space-y-2">
                  <Label htmlFor="username">Username</Label>
                  <div className="relative">
                    <AtSign className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="username"
                      placeholder="yourusername"
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
                      3–20 characters: letters, numbers, and underscores only
                    </p>
                  )}
                </div>
              ) : (
                <div className="max-w-sm">
                  <p className="text-xs text-muted-foreground mb-1">Username</p>
                  {initialUsername.current ? (
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-foreground">@{initialUsername.current}</span>
                    </div>
                  ) : (
                    <>
                      <p className="text-sm font-medium text-muted-foreground italic">Not set yet</p>
                      <p className="text-xs text-muted-foreground mt-1">Set your unique username</p>
                    </>
                  )}
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
        {/* Profile Photo */}
        <Card>
          <CardHeader>
            <CardTitle>Profile Photo</CardTitle>
            <CardDescription>JPEG, PNG or WEBP</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row items-center gap-6">
              <div 
                className="relative group cursor-pointer shrink-0"
                onClick={() => !isUploadingAvatar && avatarInputRef.current?.click()}
              >
                <Avatar className="h-24 w-24 border-2 border-muted transition-transform duration-200 group-hover:scale-105">
                  <AvatarImage src={avatarSrc ?? undefined} alt="Profile picture" className="object-cover" />
                  <AvatarFallback className="text-2xl font-semibold bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="absolute inset-0 rounded-full bg-black/40 flex flex-col items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  <Camera className="h-5 w-5 mb-1" />
                  <span className="text-[10px] font-medium">Change</span>
                </div>
                <div className="absolute bottom-0 right-0 h-7 w-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-md border-2 border-background">
                  {isUploadingAvatar
                    ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    : <Camera className="h-3.5 w-3.5" />}
                </div>
              </div>
              <div className="flex flex-col items-center sm:items-start gap-2.5">
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={handleAvatarFileChange}
                  aria-label="Upload avatar picture"
                />
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => avatarInputRef.current?.click()} 
                  disabled={isUploadingAvatar}
                  className="shadow-sm"
                >
                  {isUploadingAvatar ? (
                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Uploading…</>
                  ) : (
                    <><Upload className="h-4 w-4 mr-2" />Upload Photo</>
                  )}
                </Button>
                <p className="text-xs text-muted-foreground text-center sm:text-left">
                  Supports JPEG, PNG or WEBP. Max size 2MB.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Certificate Signature */}
        <Card>
          <CardHeader>
            <CardTitle>Certificate Signature</CardTitle>
            <CardDescription>
              Upload a transparent PNG of your signature to be printed on certificates. Recommended aspect ratio is 3:1 (e.g. 300x100 pixels).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row items-center gap-6">
              {signatureSrc ? (
                <div className="relative shrink-0 border border-muted rounded-lg p-2 bg-zinc-50 dark:bg-zinc-900/50 flex items-center justify-center min-w-[200px] h-20 max-w-[240px]">
                  <img
                    src={signatureSrc}
                    alt="Signature preview"
                    className="max-h-16 object-contain pointer-events-none select-none"
                  />
                  <div className="absolute -top-2 -right-2">
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      className="h-6 w-6 rounded-full shadow-sm"
                      onClick={handleRemoveSignature}
                      disabled={isUploadingSignature}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ) : (
                <div 
                  className="relative group cursor-pointer shrink-0 border-2 border-dashed border-muted hover:border-primary/50 transition-colors duration-200 rounded-lg flex flex-col items-center justify-center bg-zinc-50/50 dark:bg-zinc-900/10 min-w-[200px] h-20 max-w-[240px]"
                  onClick={() => !isUploadingSignature && signatureInputRef.current?.click()}
                >
                  <div className="flex flex-col items-center justify-center gap-1.5 text-muted-foreground group-hover:text-primary transition-colors">
                    <Upload className="h-4 w-4" />
                    <span className="text-[10px] font-medium">Upload Signature</span>
                  </div>
                </div>
              )}
              <div className="flex flex-col items-center sm:items-start gap-2.5">
                <input
                  ref={signatureInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={handleSignatureFileChange}
                  disabled={isUploadingSignature}
                  aria-label="Upload certificate signature"
                />
                {!signatureSrc && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => signatureInputRef.current?.click()} 
                    disabled={isUploadingSignature}
                    className="shadow-sm"
                  >
                    {isUploadingSignature ? (
                      <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Uploading…</>
                    ) : (
                      <><Upload className="h-4 w-4 mr-2" />Select File</>
                    )}
                  </Button>
                )}
                <p className="text-xs text-muted-foreground text-center sm:text-left">
                  Transparent PNG works best. Max size 2MB.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Profile Details */}
        <Card className={cn("transition-all duration-200", editing("profile") && "border-primary/50 shadow-md ring-1 ring-primary/10")}>
          <CardHeader className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 space-y-0">
            <div>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>Your public and system identification details</CardDescription>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {!editing("profile") && (profileComplete ? <SectionComplete /> : <SectionIncomplete />)}
              {!editing("profile") && (
                <Button variant="outline" size="sm" onClick={() => openSection("profile")}>
                  <Pencil className="h-3.5 w-3.5 mr-1.5" />
                  Edit
                </Button>
              )}
            </div>
          </CardHeader>

          <CardContent>
            {editing("profile") ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="displayName">Display Name<RequiredMark /></Label>
                  <Input
                    id="displayName"
                    placeholder="e.g. Administrator"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value.replace(/[^a-zA-Z\s]/g, ''))}
                    className={errors.displayName ? "border-destructive" : ""}
                  />
                  <FieldError message={errors.displayName} />
                </div>

                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input
                    value={userProfile.email}
                    disabled
                    className="bg-zinc-50 dark:bg-zinc-900/50 cursor-not-allowed text-muted-foreground"
                  />
                  <p className="text-[10px] text-muted-foreground">Your account email cannot be changed.</p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
                <ReadonlyField label="Display Name" value={displayName} />
                <ReadonlyField label="Username" value={username ? `@${username}` : "Not set"} />
                <ReadonlyField label="Email" value={userProfile.email} />
                <div className="space-y-0.5">
                  <p className="text-xs text-muted-foreground">Role</p>

                  Administrator

                </div>
              </div>
            )}
          </CardContent>

          {editing("profile") && (
            <CardFooter className="flex justify-end gap-2 border-t pt-4">
              <Button variant="ghost" size="sm" onClick={() => cancelSection("profile")} disabled={isPending}>
                Cancel
              </Button>
              <Button size="sm" onClick={() => handleSaveSection("profile")} disabled={isPending}>
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
        shape="circle"
        onCropComplete={handleCroppedAvatarUpload}
      />
    </div>
  )
}
