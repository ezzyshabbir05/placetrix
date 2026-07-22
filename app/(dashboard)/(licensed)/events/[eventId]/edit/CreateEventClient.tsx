"use client"

import { useState, useEffect, useTransition } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"
import {
  ArrowLeft,
  Clock,
  Loader2,
  Save,
  CheckCircle2,
  Image as ImageIcon,
  Upload,
  X,
  Plus,
  Trash2,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { createEventAction, updateEventAction } from "../../actions"
import type { EventFormData, EventStatus, EventTargetingRules } from "../../types"
import { createClient } from "@/lib/supabase/client"
import { buildStorageUrl } from "@/lib/storage"
import { CohortSelector } from "@/app/(dashboard)/(licensed)/cohorts/CohortsClient"
import type { CohortOption } from "@/app/(dashboard)/(licensed)/cohorts/types"

const BRANCHES = [
  "Computer Science",
  "Information Technology",
  "Electronics & Telecom",
  "Mechanical",
  "Civil",
  "Electrical",
  "Chemical",
  "Other",
]

const YEARS = [2024, 2025, 2026, 2027, 2028, 2029, 2030]

interface Props {
  eventId?: string
  initialData?: EventFormData
  cohortOptions?: CohortOption[]
}

const toLocalDatetimeString = (isoStr?: string) => {
  if (!isoStr) return ""
  try {
    const date = new Date(isoStr)
    const pad = (num: number) => String(num).padStart(2, '0')
    const year = date.getFullYear()
    const month = pad(date.getMonth() + 1)
    const day = pad(date.getDate())
    const hours = pad(date.getHours())
    const minutes = pad(date.getMinutes())
    return `${year}-${month}-${day}T${hours}:${minutes}`
  } catch {
    return ""
  }
}

export function CreateEventClient({ eventId, initialData, cohortOptions }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const [selectedCohortIds, setSelectedCohortIds] = useState<string[]>(
    initialData?.cohort_ids ?? []
  )

  const [formData, setFormData] = useState<EventFormData>(
    initialData
      ? {
          ...initialData,
          date: toLocalDatetimeString(initialData.date),
          speaker_name: initialData.speaker_name || "",
        }
      : {
          title: "",
          description: "",
          date: "",
          venue: "",
          capacity: 100,
          status: "Draft",
          duration_minutes: 120,
          targeting_rules: { years: [], branches: [] },
          speaker_name: "",
        }
  )

  // Banner State
  const [bannerFile, setBannerFile] = useState<File | null>(null)
  const [bannerPreviewUrl, setBannerPreviewUrl] = useState<string | null>(
    (initialData as any)?.event_banner
      ? buildStorageUrl("event-banners", (initialData as any).event_banner)
      : null
  )
  const [imageOrientation, setImageOrientation] = useState<"landscape" | "portrait" | null>(null)

  useEffect(() => {
    if ((initialData as any)?.event_banner) {
      const img = new Image()
      img.src = buildStorageUrl("event-banners", (initialData as any).event_banner) || ""
      img.onload = () => {
        setImageOrientation(img.width >= img.height ? "landscape" : "portrait")
      }
    }
  }, [initialData])

  // Agenda State
  const [agenda, setAgenda] = useState<Array<{ title: string; description: string | null; start_time: string; order_index: number }>>(
    (initialData as any)?.agenda ?? []
  )

  // Agenda Form State
  const [newAgendaTitle, setNewAgendaTitle] = useState("")
  const [newAgendaTime, setNewAgendaTime] = useState("")
  const [newAgendaDesc, setNewAgendaDesc] = useState("")

  // Date/Time combination helpers
  const combineDateAndTime = (dateStr: string, timeStr: string): string => {
    const dateOnly = dateStr.split("T")[0]
    return new Date(`${dateOnly}T${timeStr}`).toISOString()
  }

  const formatTimeOnly = (isoStr: string): string => {
    if (!isoStr) return ""
    try {
      const d = new Date(isoStr)
      return d.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", hour12: true })
    } catch {
      return ""
    }
  }

  const getHHMM = (isoStr: string): string => {
    if (!isoStr) return ""
    try {
      const d = new Date(isoStr)
      const hh = String(d.getHours()).padStart(2, "0")
      const mm = String(d.getMinutes()).padStart(2, "0")
      return `${hh}:${mm}`
    } catch {
      return ""
    }
  }

  const handleAddAgendaItem = () => {
    if (!formData.date) {
      toast.error("Please set the Event Start Date & Time first.")
      return
    }
    if (!newAgendaTitle.trim()) {
      toast.error("Please enter a title for the agenda item.")
      return
    }
    if (!newAgendaTime) {
      toast.error("Please select a start time.")
      return
    }

    try {
      const combinedTime = combineDateAndTime(formData.date, newAgendaTime)
      setAgenda((prev) => [
        ...prev,
        {
          title: newAgendaTitle.trim(),
          description: newAgendaDesc.trim() || null,
          start_time: combinedTime,
          order_index: prev.length,
        },
      ])
      setNewAgendaTitle("")
      setNewAgendaTime("")
      setNewAgendaDesc("")
    } catch {
      toast.error("Failed to add agenda item.")
    }
  }

  const handleSave = (status: EventStatus) => {
    if (!formData.title.trim()) {
      toast.error("Please enter a Title.")
      return
    }
    if (!formData.date) {
      toast.error("Please select a Date and Time.")
      return
    }
    if (!formData.venue.trim()) {
      toast.error("Please enter a Venue.")
      return
    }

    // Convert local datetime to UTC ISO string before saving
    let utcIsoDate = ""
    try {
      utcIsoDate = new Date(formData.date).toISOString()
    } catch {
      toast.error("Invalid Date format.")
      return
    }

    startTransition(async () => {
      try {
        let finalBannerPath = (initialData as any)?.event_banner || null

        // 1. Upload Banner Image if selected
        if (bannerFile) {
          const supabaseClient = createClient()
          const fileExt = bannerFile.name.split(".").pop()
          const fileName = `${crypto.randomUUID()}.${fileExt}`
          const filePath = `banners/${fileName}`

          const { error: uploadError } = await supabaseClient.storage
            .from("event-banners")
            .upload(filePath, bannerFile)

          if (uploadError) throw uploadError
          finalBannerPath = filePath

          // Delete old banner if it existed
          if ((initialData as any)?.event_banner) {
            await supabaseClient.storage
              .from("event-banners")
              .remove([(initialData as any).event_banner])
          }
        } else if (!bannerPreviewUrl && (initialData as any)?.event_banner) {
          // Banner was removed
          const supabaseClient = createClient()
          await supabaseClient.storage
            .from("event-banners")
            .remove([(initialData as any).event_banner])
          finalBannerPath = null
        }

        // 2. Prepare agenda items: sort chronologically on save and shift to event date
        const eventDatePart = formData.date.split("T")[0]
        const sortedAgenda = [...agenda].sort(
          (a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
        )
        const agendaPayload = sortedAgenda.map((item, idx) => {
          const timePart = getHHMM(item.start_time)
          const combinedTime = new Date(`${eventDatePart}T${timePart}`).toISOString()
          return {
            title: item.title,
            description: item.description || null,
            start_time: combinedTime,
            order_index: idx,
          }
        })

        const payload: EventFormData = {
          ...formData,
          date: utcIsoDate,
          status,
          event_banner: finalBannerPath,
          agenda: agendaPayload,
          speaker_name: formData.speaker_name || null,
          cohort_ids: selectedCohortIds,
        }

        if (eventId) {
          await updateEventAction(eventId, payload)
          toast.success("Event updated successfully!")
          router.push(`/events/${eventId}`)
        } else {
          await createEventAction(payload)
          toast.success("Event created successfully!")
          router.push("/events")
        }
        router.refresh()
      } catch (err: any) {
        toast.error(err.message || "Failed to save event.")
      }
    })
  }

  const toggleYear = (year: number) => {
    setFormData((prev) => ({
      ...prev,
      targeting_rules: {
        ...prev.targeting_rules,
        years: prev.targeting_rules.years.includes(year)
          ? prev.targeting_rules.years.filter((y) => y !== year)
          : [...prev.targeting_rules.years, year],
      },
    }))
  }

  const toggleBranch = (branch: string) => {
    setFormData((prev) => ({
      ...prev,
      targeting_rules: {
        ...prev.targeting_rules,
        branches: prev.targeting_rules.branches.includes(branch)
          ? prev.targeting_rules.branches.filter((b) => b !== branch)
          : [...prev.targeting_rules.branches, branch],
      },
    }))
  }

  // Helper to format date for live preview
  const formatPreviewDate = (dtStr: string) => {
    if (!dtStr) return "Select date & time"
    try {
      return new Date(dtStr).toLocaleString("en-IN", {
        dateStyle: "medium",
        timeStyle: "short",
      })
    } catch {
      return "Invalid date"
    }
  }

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6 w-full">
      {/* Header Actions */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b pb-5">
        <div className="flex items-center gap-3">
          <Link href={eventId ? `/events/${eventId}` : "/events"}>
            <Button variant="ghost" size="icon" className="h-9 w-9">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold font-cirka tracking-tight">
              {eventId ? "Edit Event" : "Create New Event"}
            </h1>
            <p className="text-xs text-muted-foreground">
              Define schedules, capacities, and target cohorts for campus drives or sessions.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link href={eventId ? `/events/${eventId}` : "/events"}>
            <Button variant="outline" size="sm" disabled={isPending}>
              Cancel
            </Button>
          </Link>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => handleSave("Draft")}
            disabled={isPending}
            className="gap-1.5"
          >
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Save Draft
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={() => handleSave("Published")}
            disabled={isPending}
            className="gap-1.5"
          >
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle2 className="h-4 w-4" />
            )}
            Publish Event
          </Button>
        </div>
      </div>

      {/* Form Panel (Full width, no grid) */}
      <div className="space-y-6 w-full">
        {/* General Details */}
        <Card>
          <CardContent className="p-5 space-y-4">
            <h3 className="font-semibold text-sm border-b pb-2 mb-2 text-foreground/90">
              General Details
            </h3>
            <div className="grid gap-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                placeholder="e.g. Campus Placement Drive 2026"
                value={formData.title}
                onChange={(e) => setFormData((p) => ({ ...p, title: e.target.value }))}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="speaker_name">Speaker Name (Optional)</Label>
              <Input
                id="speaker_name"
                placeholder="e.g. Dr. Jane Doe (Tech Director at Acme Corp)"
                value={formData.speaker_name || ""}
                onChange={(e) => setFormData((p) => ({ ...p, speaker_name: e.target.value }))}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Provide a detailed description of the event details, guest speakers, or guidelines..."
                value={formData.description}
                onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))}
                rows={4}
              />
            </div>
          </CardContent>
        </Card>

        {/* Event Banner */}
        <Card>
          <CardContent className="p-5 space-y-4">
            <h3 className="font-semibold text-sm border-b pb-2 mb-2 text-foreground/90 flex items-center gap-2">
              <ImageIcon className="h-4 w-4" /> Event Banner
            </h3>
            <div className="flex flex-col gap-4">
              {bannerPreviewUrl ? (
                <div className="space-y-2 max-w-xl">
                  <div className={cn(
                    "relative rounded-lg overflow-hidden border bg-muted flex items-center justify-center",
                    imageOrientation === "landscape" ? "aspect-video w-full" : "aspect-[3/4] w-64"
                  )}>
                    <img
                      src={bannerPreviewUrl}
                      alt="Banner Preview"
                      className="w-full h-full object-contain"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      onClick={() => {
                        setBannerFile(null)
                        setBannerPreviewUrl(null)
                        setImageOrientation(null)
                      }}
                      className="absolute top-2 right-2 h-7 w-7 rounded-full shadow-md cursor-pointer"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  {imageOrientation && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">Detected Orientation:</span>
                      <Badge variant="outline" className={cn(
                        imageOrientation === "landscape"
                          ? "bg-sky-500/10 text-sky-700 dark:text-sky-400 border-sky-500/30"
                          : "bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/30"
                      )}>
                        {imageOrientation === "landscape" ? "Landscape (Horizontal)" : "Portrait / Square (Vertical)"}
                      </Badge>
                    </div>
                  )}
                </div>
              ) : (
                <div className="border-2 border-dashed border-muted-foreground/30 rounded-lg p-6 flex flex-col items-center justify-center text-center gap-2 max-w-xl bg-muted/10 hover:bg-muted/20 transition-all">
                  <Upload className="h-8 w-8 text-muted-foreground/60" />
                  <p className="text-xs text-muted-foreground">Upload Event Banner (Landscape, Portrait, or Square)</p>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) {
                        setBannerFile(file)
                        const previewUrl = URL.createObjectURL(file)
                        setBannerPreviewUrl(previewUrl)
                        const img = new Image()
                        img.src = previewUrl
                        img.onload = () => {
                          setImageOrientation(img.width >= img.height ? "landscape" : "portrait")
                        }
                      }
                    }}
                    className="hidden"
                    id="banner-upload"
                  />
                  <label
                    htmlFor="banner-upload"
                    className="mt-1 text-xs font-semibold text-primary hover:underline cursor-pointer"
                  >
                    Select File
                  </label>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Schedule & Venue */}
        <Card>
          <CardContent className="p-5 space-y-4">
            <h3 className="font-semibold text-sm border-b pb-2 mb-2 text-foreground/90">
              Schedule & Venue
            </h3>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="date">Start Date & Time *</Label>
                <Input
                  id="date"
                  type="datetime-local"
                  value={formData.date}
                  onChange={(e) => setFormData((p) => ({ ...p, date: e.target.value }))}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="duration">Duration (Minutes) *</Label>
                <Input
                  id="duration"
                  type="number"
                  min={15}
                  value={formData.duration_minutes}
                  onChange={(e) =>
                    setFormData((p) => ({
                      ...p,
                      duration_minutes: parseInt(e.target.value) || 120,
                    }))
                  }
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="venue">Venue *</Label>
              <Input
                id="venue"
                placeholder="e.g. Seminar Hall 3 / Placement Cell Library"
                value={formData.venue}
                onChange={(e) => setFormData((p) => ({ ...p, venue: e.target.value }))}
              />
            </div>
          </CardContent>
        </Card>

        {/* Event Agenda */}
        <Card>
          <CardContent className="p-5 space-y-4">
            <h3 className="font-semibold text-sm border-b pb-2 mb-2 text-foreground/90 flex items-center gap-2">
              <Clock className="h-4 w-4" /> Event Agenda
            </h3>

            {/* Existing Agenda Items */}
            {agenda.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">No agenda items added yet.</p>
            ) : (
              <div className="space-y-3">
                {[...agenda]
                  .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
                  .map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-start justify-between p-3 rounded-lg border bg-muted/10 gap-3 text-xs"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono bg-primary/10 text-primary px-1.5 py-0.5 rounded text-[10px] font-semibold">
                            {formatTimeOnly(item.start_time)}
                          </span>
                          <span className="font-semibold text-foreground">{item.title}</span>
                        </div>
                        {item.description && (
                          <p className="text-muted-foreground whitespace-pre-line pl-1.5 mt-1">
                            {item.description}
                          </p>
                        )}
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-destructive hover:text-destructive/80 hover:bg-destructive/10 shrink-0"
                        onClick={() => {
                          setAgenda((prev) => prev.filter((_, i) => i !== idx))
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
              </div>
            )}

            {/* Add Agenda Item Form */}
            <div className="border rounded-lg p-4 bg-muted/20 space-y-3">
              <h4 className="font-semibold text-xs text-foreground/80">Add Agenda Item</h4>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="sm:col-span-2 space-y-1.5">
                  <Label htmlFor="agenda-title" className="text-xs">
                    Title *
                  </Label>
                  <Input
                    id="agenda-title"
                    placeholder="e.g. Keynote Speech / Networking Session"
                    value={newAgendaTitle}
                    onChange={(e) => setNewAgendaTitle(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="agenda-time" className="text-xs">
                    Start Time *
                  </Label>
                  <Input
                    id="agenda-time"
                    type="time"
                    value={newAgendaTime}
                    onChange={(e) => setNewAgendaTime(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="agenda-desc" className="text-xs">
                  Description
                </Label>
                <Textarea
                  id="agenda-desc"
                  placeholder="Provide details about the session..."
                  value={newAgendaDesc}
                  onChange={(e) => setNewAgendaDesc(e.target.value)}
                  rows={2}
                />
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddAgendaItem}
                className="gap-1 text-xs"
              >
                <Plus className="h-3.5 w-3.5" /> Add to Agenda
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Audience, Capacity & Cohorts */}
        <Card>
          <CardContent className="p-5 space-y-4">
            <h3 className="font-semibold text-sm border-b pb-2 mb-2 text-foreground/90">
              Audience &amp; Capacity
            </h3>
            <div className="grid gap-2 max-w-xs">
              <Label htmlFor="capacity">Seating Capacity *</Label>
              <Input
                id="capacity"
                type="number"
                min={1}
                value={formData.capacity}
                onChange={(e) =>
                  setFormData((p) => ({
                    ...p,
                    capacity: parseInt(e.target.value) || 10,
                  }))
                }
              />
            </div>

            {/* Cohort Targeting */}
            <div className="grid gap-4 border rounded-lg p-4 bg-muted/20">
              <div>
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Target Cohorts *
                </Label>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Select which cohorts can see this event. At least one cohort is required to publish.
                </p>
              </div>
              <CohortSelector
                selectedCohortIds={selectedCohortIds}
                onChange={setSelectedCohortIds}
                cohorts={cohortOptions}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
