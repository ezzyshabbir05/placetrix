"use client"

import { useState, useEffect, useTransition } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  ArrowLeft,
  Loader2,
  Save,
  CheckCircle2,
  Image as ImageIcon,
  Upload,
  X,
  FileText,
  UsersRound,
  Clock,
  MapPin,
  User,
  Sparkles,
  Eye,
} from "lucide-react"
import { cn, toLocalDateTimeInput, toUTCISOString } from "@/lib/utils"
import { toast } from "sonner"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { DateTimePicker } from "@/components/datetime-picker"
import { createEventAction, updateEventAction } from "../../actions"
import type { EventFormData, EventStatus } from "../../types"
import { createClient } from "@/lib/supabase/client"
import { buildStorageUrl } from "@/lib/storage"
import type { CohortOption } from "@/app/(dashboard)/(licensed)/cohorts/types"
import {
  Combobox,
  ComboboxItem,
  ComboboxContent,
  ComboboxList,
  ComboboxEmpty,
  ComboboxChips,
  ComboboxChip,
  ComboboxChipsInput,
  ComboboxInput,
  ComboboxTrigger,
  useComboboxAnchor,
} from "@/components/ui/combobox"

interface Props {
  eventId?: string
  initialData?: EventFormData
  cohortOptions?: CohortOption[]
}

const addMinutesToLocal = (localStr: string, mins: number) => {
  if (!localStr) return ""
  try {
    const d = new Date(localStr)
    if (isNaN(d.getTime())) return ""
    return toLocalDateTimeInput(new Date(d.getTime() + mins * 60000))
  } catch {
    return ""
  }
}

export function CreateEventClient({ eventId, initialData, cohortOptions }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const cohortsAnchor = useComboboxAnchor()

  const [selectedCohortIds, setSelectedCohortIds] = useState<string[]>(
    initialData?.cohort_ids ?? []
  )

  const initialStartDate = initialData?.date ? toLocalDateTimeInput(initialData.date) : ""
  const initialEndDate = initialData?.end_date 
    ? toLocalDateTimeInput(initialData.end_date)
    : initialStartDate 
      ? addMinutesToLocal(initialStartDate, initialData?.duration_minutes ?? 120)
      : ""

  const [endDate, setEndDate] = useState<string>(initialEndDate)

  const [formData, setFormData] = useState<EventFormData>(
    initialData
      ? {
          ...initialData,
          date: initialStartDate,
          end_date: initialEndDate || null,
          speaker_name: initialData.speaker_name || "",
        }
      : {
          title: "",
          description: "",
          date: "",
          end_date: null,
          venue: "",
          capacity: 100,
          status: "Draft",
          duration_minutes: 120,
          targeting_rules: { years: [], branches: [] },
          speaker_name: "",
        }
  )

  const handleStartDateChange = (val: string) => {
    const localStr = toLocalDateTimeInput(val)
    setFormData((p) => {
      let duration = p.duration_minutes || 120
      if (localStr && endDate) {
        const startMs = new Date(localStr).getTime()
        const endMs = new Date(endDate).getTime()
        if (endMs > startMs) {
          duration = Math.max(1, Math.round((endMs - startMs) / 60000))
        } else {
          setEndDate(addMinutesToLocal(localStr, duration))
        }
      } else if (localStr && !endDate) {
        setEndDate(addMinutesToLocal(localStr, duration))
      }
      return { ...p, date: localStr, duration_minutes: duration }
    })
  }

  const handleEndDateChange = (val: string) => {
    const localStr = toLocalDateTimeInput(val)
    setEndDate(localStr)
    if (formData.date && localStr) {
      const startMs = new Date(formData.date).getTime()
      const endMs = new Date(localStr).getTime()
      if (endMs > startMs) {
        const duration = Math.max(1, Math.round((endMs - startMs) / 60000))
        setFormData((p) => ({ ...p, duration_minutes: duration }))
      }
    }
  }

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

  const handleSave = (status: EventStatus) => {
    if (!formData.title.trim()) {
      toast.error("Please enter a Title.")
      return
    }
    if (!formData.date) {
      toast.error("Please select a Start Date & Time.")
      return
    }
    if (!endDate) {
      toast.error("Please select an End Date & Time.")
      return
    }
    if (new Date(endDate).getTime() <= new Date(formData.date).getTime()) {
      toast.error("End Date & Time must be after Start Date & Time.")
      return
    }
    if (!formData.venue.trim()) {
      toast.error("Please enter a Venue.")
      return
    }

    let utcIsoDate = ""
    let utcIsoEndDate = ""
    try {
      utcIsoDate = toUTCISOString(formData.date)
      utcIsoEndDate = toUTCISOString(endDate)
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

        const payload: EventFormData = {
          ...formData,
          date: utcIsoDate,
          end_date: utcIsoEndDate,
          status,
          event_banner: finalBannerPath,
          speaker_name: formData.speaker_name || null,
          cohort_ids: selectedCohortIds,
        }
        // Remove agenda if it previously existed
        delete payload.agenda

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

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6 w-full">
      {/* Header Actions */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Link href={eventId ? `/events/${eventId}` : "/events"}>
            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl sm:text-3xl font-bold font-cirka tracking-tight text-foreground">
                {eventId ? "Edit Event" : "Create New Event"}
              </h1>
              <Badge
                variant={formData.status === "Published" ? "default" : "outline"}
                className={cn(
                  "rounded-md text-[11px] font-semibold uppercase tracking-wider",
                  formData.status === "Published"
                    ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {formData.status}
              </Badge>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
              Fill in the details below to schedule and publish an event for your institution.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <Button
            variant="outline"
            disabled={isPending}
            onClick={() => handleSave("Draft")}
            className="rounded-xl text-xs font-semibold"
          >
            Save as Draft
          </Button>
          <Button
            disabled={isPending}
            onClick={() => handleSave("Published")}
            className="rounded-xl text-xs font-semibold gap-1.5"
          >
            {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            {eventId ? "Update Event" : "Publish Event"}
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Details (Left 2 cols) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Card 1: Event Overview */}
          <Card className="py-4">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" /> Event Overview
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Specify the core title, speaker, location, and description for this event.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="title" className="text-xs font-semibold">
                  Event Title <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="title"
                  placeholder="e.g. Campus Placement Drive 2026 / Technical Hackathon"
                  value={formData.title}
                  onChange={(e) => setFormData((p) => ({ ...p, title: e.target.value }))}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="speaker_name" className="text-xs font-semibold">
                  Speaker / Guest Name <span className="text-muted-foreground font-normal">(Optional)</span>
                </Label>
                <Input
                  id="speaker_name"
                  placeholder="e.g. Dr. Jane Doe (Tech Director at Acme Corp)"
                  value={formData.speaker_name || ""}
                  onChange={(e) => setFormData((p) => ({ ...p, speaker_name: e.target.value }))}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="venue" className="text-xs font-semibold">
                  Venue / Location <span className="text-destructive">*</span>
                </Label>
                <div className="relative">
                  <Input
                    id="venue"
                    placeholder="e.g. Main Auditorium / Seminar Hall 3 / Online Google Meet"
                    className="pl-9"
                    value={formData.venue}
                    onChange={(e) => setFormData((p) => ({ ...p, venue: e.target.value }))}
                  />
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="description" className="text-xs font-semibold">
                  Description &amp; Guidelines
                </Label>
                <Textarea
                  id="description"
                  placeholder="Provide a detailed overview of the event schedule, rules, prerequisites, or guest bios..."
                  value={formData.description}
                  onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))}
                  rows={6}
                  className="resize-none"
                />
                <p className="text-[11px] text-muted-foreground">
                  Candidates will see this description on their event registration page.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Card 2: Schedule & Timing */}
          <Card className="py-4">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary" /> Schedule &amp; Timing
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Set when the event begins, ends, and its total duration in IST.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="date" className="text-xs font-semibold">
                    Start Date &amp; Time (IST) <span className="text-destructive">*</span>
                  </Label>
                  <DateTimePicker
                    id="date"
                    value={formData.date}
                    onChange={(val) => handleStartDateChange(val ? (val instanceof Date ? val.toISOString() : String(val)) : "")}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="end_date" className="text-xs font-semibold">
                    End Date &amp; Time (IST) <span className="text-destructive">*</span>
                  </Label>
                  <DateTimePicker
                    id="end_date"
                    value={endDate}
                    onChange={(val) => handleEndDateChange(val ? (val instanceof Date ? val.toISOString() : String(val)) : "")}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="duration" className="text-xs font-semibold">
                    Duration (minutes) <span className="text-destructive">*</span>
                  </Label>
                  <div className="relative">
                    <Input
                      id="duration"
                      type="number"
                      min={1}
                      value={formData.duration_minutes}
                      onChange={(e) => {
                        const mins = parseInt(e.target.value) || 120
                        setFormData((p) => ({ ...p, duration_minutes: mins }))
                        if (formData.date) {
                          setEndDate(addMinutesToLocal(formData.date, mins))
                        }
                      }}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-medium pointer-events-none">
                      min
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Card 3: Event Banner */}
          <Card className="py-4">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <ImageIcon className="h-4 w-4 text-primary" /> Event Banner
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Upload a high-quality cover banner image to customize the event card.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col gap-4">
                {bannerPreviewUrl ? (
                  <div className="space-y-2 w-full">
                    <div className={cn(
                      "relative rounded-xl overflow-hidden border bg-muted flex items-center justify-center shadow-xs",
                      imageOrientation === "landscape" ? "aspect-video w-full" : "aspect-[3/4] max-w-sm mx-auto"
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
                  </div>
                ) : (
                  <div className="border-2 border-dashed border-muted-foreground/25 rounded-xl p-8 flex flex-col items-center justify-center text-center gap-2 w-full bg-muted/10 hover:bg-muted/20 transition-all">
                    <Upload className="h-8 w-8 text-muted-foreground/50" />
                    <p className="text-xs font-semibold text-foreground">Upload Event Banner</p>
                    <p className="text-[11px] text-muted-foreground">PNG, JPG, WebP up to 5MB (Landscape or Portrait)</p>
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
                      className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary text-secondary-foreground text-xs font-medium hover:bg-secondary/80 cursor-pointer transition-colors"
                    >
                      Select File
                    </label>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar (Right 1 col) */}
        <div className="space-y-6">
          {/* Card 1: Status & Visibility */}
          <Card className="py-4">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary" /> Status &amp; Visibility
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Control the current lifecycle state of this event.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="status" className="text-xs font-semibold">
                  Publishing Status
                </Label>
                <Select
                  value={formData.status}
                  onValueChange={(val) => setFormData((p) => ({ ...p, status: val as EventStatus }))}
                >
                  <SelectTrigger id="status" className="w-full">
                    <SelectValue placeholder="Select Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Draft">Draft</SelectItem>
                    <SelectItem value="Published">Published</SelectItem>
                    <SelectItem value="Completed">Completed</SelectItem>
                    <SelectItem value="Cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-muted-foreground">
                  Draft events are hidden from candidates. Published events are visible for RSVP.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Card 2: Audience & Capacity */}
          <Card className="py-4">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <UsersRound className="h-4 w-4 text-primary" /> Audience &amp; Capacity
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Set attendee limits and restrict access to specific cohorts.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="capacity" className="text-xs font-semibold">
                  Seating Capacity <span className="text-destructive">*</span>
                </Label>
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
                <p className="text-[11px] text-muted-foreground">
                  Maximum number of confirmed registrations allowed.
                </p>
              </div>

              {/* Cohort Targeting */}
              <div className="space-y-1.5">
                <Label htmlFor="target_cohorts" className="text-xs font-semibold">
                  Target Cohorts <span className="text-destructive">*</span>
                </Label>
                <p className="text-xs text-muted-foreground">
                  Select which cohorts can view and RSVP to this event.
                </p>
                {(() => {
                  const options = cohortOptions ?? []
                  if (options.length === 0) {
                    return (
                      <p className="text-xs text-muted-foreground italic py-1">
                        No cohorts found. Create cohorts first from the Cohorts page.
                      </p>
                    )
                  }
                  return (
                    <Combobox
                      items={options.map((c) => c.id)}
                      value={selectedCohortIds}
                      onValueChange={(v) => setSelectedCohortIds(v as string[])}
                      multiple
                      itemToStringLabel={(id) => options.find((c) => c.id === id)?.name ?? id}
                    >
                      <ComboboxChips ref={cohortsAnchor} className="w-full">
                        {selectedCohortIds.map((id) => {
                          const cohort = options.find((c) => c.id === id)
                          return (
                            <ComboboxChip key={id} showRemove>
                              <UsersRound className="mr-1 h-3 w-3 text-muted-foreground" />
                              {cohort?.name ?? id}
                              {cohort && (
                                <span className="ml-1 text-[10px] text-muted-foreground">
                                  ({cohort.student_count})
                                </span>
                              )}
                            </ComboboxChip>
                          )
                        })}
                        <ComboboxChipsInput
                          placeholder={selectedCohortIds.length ? "Add more cohorts..." : "Select target cohorts..."}
                        />
                      </ComboboxChips>
                      <ComboboxContent anchor={cohortsAnchor}>
                        <ComboboxEmpty>No cohorts found.</ComboboxEmpty>
                        <ComboboxList>
                          {(id: string) => {
                            const cohort = options.find((c) => c.id === id)
                            return (
                              <ComboboxItem key={id} value={id}>
                                <UsersRound className="mr-2 h-4 w-4 text-muted-foreground" />
                                <span className="text-sm font-medium">{cohort?.name ?? id}</span>
                                <span className="ml-auto text-xs text-muted-foreground">
                                  {cohort?.student_count ?? 0} student{(cohort?.student_count ?? 0) !== 1 ? "s" : ""}
                                </span>
                              </ComboboxItem>
                            )
                          }}
                        </ComboboxList>
                      </ComboboxContent>
                    </Combobox>
                  )
                })()}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
