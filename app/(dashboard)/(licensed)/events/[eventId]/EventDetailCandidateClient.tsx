"use client"

import { useState, useEffect, useCallback, useTransition, type ReactNode } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import QRCode from "qrcode"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog"
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
} from "@/components/ui/alert-dialog"
import {
  ArrowLeft,
  Clock,
  MapPin,
  CheckCircle2,
  Hourglass,
  Ticket,
  UserCheck,
  Loader2,
  Calendar,
  Users,
  QrCode,
  CalendarX,
  FileText,
  Info,
  Image as ImageIcon,
  X,
  Mic,
  Lock,
  ShieldCheck,
} from "lucide-react"
import { cn, formatDateTime, formatTimeOnly } from "@/lib/utils"
import { toast } from "sonner"
import { buildStorageUrl } from "@/lib/storage"
import { rsvpEventAction, cancelRsvpAction } from "../actions"
import type { EventStatus, TicketStatus, AttendanceStatus, EventAgendaItem } from "../types"

// ─── Helpers ──────────────────────────────────────────────────────────────────

interface EventInfo {
  id: string
  title: string
  description: string | null
  date: string
  end_date?: string | null
  venue: string
  capacity: number
  status: EventStatus
  duration_minutes: number
  event_banner: string | null
  institute_name?: string | null
  speaker_name: string | null
}

export interface TicketInfo {
  id: string
  status: TicketStatus
  attendance_status: AttendanceStatus
}

function MetaItem({
  icon,
  label,
  value,
}: {
  icon: ReactNode
  label: string
  value: string
}) {
  return (
    <div className="flex items-start gap-2.5">
      <span className="mt-0.5 shrink-0 text-muted-foreground">{icon}</span>
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
        <p className="mt-0.5 text-sm font-semibold text-foreground">{value}</p>
      </div>
    </div>
  )
}

// ─── QR Ticket Card ──────────────────────────────────────────────────────────

export function QRTicketCard({
  ticket,
  candidateName,
  eventTitle,
}: {
  ticket: TicketInfo
  candidateName: string
  eventTitle: string
}) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)
  const [attendanceStatus, setAttendanceStatus] = useState(ticket.attendance_status)
  const [currentTime, setCurrentTime] = useState<string>("")

  useEffect(() => {
    const updateTime = () => {
      setCurrentTime(
        new Intl.DateTimeFormat(undefined, {
          hour: "numeric",
          minute: "2-digit",
          second: "2-digit",
          hour12: true,
        }).format(new Date())
      )
    }
    updateTime()
    const timer = setInterval(updateTime, 1000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    setAttendanceStatus(ticket.attendance_status)
  }, [ticket.attendance_status])

  useEffect(() => {
    if (ticket.status === "Confirmed") {
      QRCode.toDataURL(ticket.id, {
        width: 240,
        margin: 1,
        color: { dark: "#0f172a", light: "#ffffff" },
      }).then(setQrDataUrl)
    }
  }, [ticket.id, ticket.status])

  useEffect(() => {
    const supabase = createClient()

    // Subscribe to real-time changes on this specific ticket using pure Supabase Realtime best-practice.
    const channel = supabase
      .channel(`ticket-${ticket.id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'event_tickets', filter: `id=eq.${ticket.id}` },
        (payload) => {
          if (payload.new && payload.new.attendance_status) {
            setAttendanceStatus(payload.new.attendance_status)
            if (payload.new.attendance_status === "Present") {
              toast.success("Attendance marked present! Ticket verified.")
            }
          }
        }
      )
      .subscribe(async (status) => {
        // Pure Realtime best practice: On initial connection or re-connection after temporary network drop,
        // perform a single one-time sync check to catch any missed updates without running a continuous polling loop.
        if (status === "SUBSCRIBED" && attendanceStatus !== "Present") {
          const { data } = await supabase
            .from("event_tickets")
            .select("attendance_status")
            .eq("id", ticket.id)
            .maybeSingle()

          if (data && data.attendance_status === "Present") {
            setAttendanceStatus("Present")
            toast.success("Attendance marked present! Ticket verified.")
          }
        }
      })

    return () => {
      try {
        supabase.removeChannel(channel).catch(() => {})
      } catch {}
    }
  }, [ticket.id, attendanceStatus])

  return (
    <Card className="overflow-hidden border-none shadow-none bg-transparent">
      <CardContent className="p-4 sm:p-5">
        <div className="flex flex-col items-center text-center">
          {/* Status badges */}
          <div className="flex items-center gap-2 mb-3">
            {ticket.status === "Confirmed" ? (
              <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30">
                <CheckCircle2 className="mr-1 h-3 w-3" /> Confirmed
              </Badge>
            ) : (
              <Badge className="bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30">
                <Hourglass className="mr-1 h-3 w-3" /> Waitlisted
              </Badge>
            )}
            {attendanceStatus === "Present" && (
              <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30">
                <UserCheck className="mr-1 h-3 w-3" /> Checked In
              </Badge>
            )}
          </div>

          {/* QR Code or Checked In status */}
          {attendanceStatus === "Present" ? (
            <div className="bg-emerald-500/10 p-6 rounded-xl border border-emerald-500/20 mb-3 flex flex-col items-center justify-center size-52">
              <div className="size-12 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="size-6" />
              </div>
              <p className="font-semibold text-sm text-emerald-600 dark:text-emerald-400 mt-3">
                Marked Present
              </p>
              <span className="text-xs text-muted-foreground font-medium mt-0.5">
                Attendance Verified
              </span>
            </div>
          ) : ticket.status === "Confirmed" && qrDataUrl ? (
            <div className="bg-white p-3 rounded-xl border border-border shadow-xs">
              <img
                src={qrDataUrl}
                alt="Event Ticket QR Code"
                className="size-48"
              />
            </div>
          ) : (
            ticket.status === "Waitlisted" && (
              <div className="bg-muted rounded-xl p-8 mb-3 flex flex-col items-center gap-2">
                <Hourglass className="size-8 text-amber-500" />
                <p className="text-xs text-muted-foreground text-center">
                  Your QR will appear here once you&apos;re confirmed.
                </p>
              </div>
            )
          )}

          {/* Attendee Info & Live Clock */}
          <div className="mt-3 flex flex-col items-center text-center">
            <p className="font-semibold text-sm text-foreground">{candidateName}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{eventTitle}</p>
            {currentTime && (
              <div className="mt-2.5 flex items-center gap-1.5 text-xs font-mono font-medium text-muted-foreground bg-muted/60 px-3 py-1 rounded-full border border-border/60">
                <Clock className="size-3.5 text-primary" />
                <span>{currentTime}</span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface Props {
  event: EventInfo
  agenda: EventAgendaItem[]
  ticket: TicketInfo | null
  candidateName: string
}

export function EventDetailCandidateClient({ event, agenda, ticket, candidateName }: Props) {
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  const eventEndTime = event.end_date
    ? new Date(event.end_date)
    : new Date(new Date(event.date).getTime() + (event.duration_minutes || 120) * 60000)
  const isPast = eventEndTime < new Date()

  const handleRSVP = () => {
    startTransition(async () => {
      try {
        const result = await rsvpEventAction(event.id)
        if (result.status === "Waitlisted") {
          toast.info("Event is at capacity. You've been added to the waitlist.")
        } else {
          toast.success("RSVP confirmed! Check your ticket below.")
        }
        router.refresh()
      } catch (err: any) {
        toast.error(err.message || "Failed to RSVP.")
      }
    })
  }

  const handleCancel = () => {
    startTransition(async () => {
      try {
        await cancelRsvpAction(event.id)
        toast.success("RSVP cancelled.")
        router.refresh()
      } catch (err: any) {
        toast.error(err.message || "Failed to cancel RSVP.")
      }
    })
  }

  const renderActionCard = (isMobile = false) => {
    if (ticket) {
      const isConfirmed = ticket.status === "Confirmed"
      return (
        <Card className={cn(
          "rounded-xl border shadow-sm overflow-hidden",
          isMobile ? "bg-background/95 backdrop-blur-md" : "bg-muted/30 w-full"
        )}>
          <CardContent className="p-4 space-y-4">
            <div className="flex items-start gap-2.5">
              {isConfirmed ? (
                <CheckCircle2 className="mt-0.5 h-4.5 w-4.5 shrink-0 text-emerald-600 dark:text-emerald-500" />
              ) : (
                <Hourglass className="mt-0.5 h-4.5 w-4.5 shrink-0 text-amber-600 dark:text-amber-500 animate-pulse" />
              )}
              <div>
                <p className={cn("text-sm font-semibold", isConfirmed ? "text-emerald-800 dark:text-emerald-400" : "text-amber-800 dark:text-amber-400")}>
                  {isConfirmed ? "RSVP Confirmed" : "RSVP Waitlisted"}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {isConfirmed ? "Your seat is confirmed. View your entry QR ticket." : "The event is full. You are in the registration queue."}
                </p>
              </div>
            </div>

            {ticket.attendance_status === "Present" && (
              <div className="flex items-center gap-2 text-xs text-emerald-600 font-semibold bg-emerald-50 dark:bg-emerald-950/20 px-2.5 py-1.5 rounded-lg border border-emerald-100 dark:border-emerald-900/30">
                <UserCheck className="h-4 w-4" /> Checked In Present
              </div>
            )}

            <div className="space-y-2 pt-1">
              <Dialog>
                <DialogTrigger asChild>
                  <Button className="w-full gap-2 rounded-xl text-xs font-bold" size={isMobile ? "sm" : "lg"}>
                    <QrCode className="h-4 w-4" /> View Ticket
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md p-0 border bg-card rounded-2xl">
                  <DialogHeader className="p-4 border-b">
                    <DialogTitle className="text-center font-bold">Your Entry Ticket</DialogTitle>
                  </DialogHeader>
                  <div className="p-4 bg-muted/10">
                    <QRTicketCard
                      ticket={ticket}
                      candidateName={candidateName}
                      eventTitle={event.title}
                    />
                  </div>
                </DialogContent>
              </Dialog>

              {event.status !== "Concluded" && ticket.attendance_status !== "Present" && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full text-destructive hover:bg-destructive/5 hover:text-destructive border-destructive/20 rounded-xl text-xs font-bold h-10"
                      size={isMobile ? "sm" : "lg"}
                    >
                      Cancel RSVP
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="rounded-2xl">
                    <AlertDialogHeader>
                      <AlertDialogTitle>Cancel your RSVP?</AlertDialogTitle>
                      <AlertDialogDescription>
                        You will lose your spot. If the event is full, you'll need to rejoin the waitlist.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel className="rounded-xl">Keep My Spot</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleCancel}
                        disabled={isPending}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90 cursor-pointer rounded-xl"
                      >
                        {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Cancel RSVP
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}

              {ticket.attendance_status === "Present" && (
                <div className="flex items-center justify-center gap-2 text-[11px] font-medium text-muted-foreground bg-muted/40 py-2.5 px-3 rounded-xl border border-border/40">
                  <Lock className="h-3.5 w-3.5" /> RSVP locked (Attendance marked present)
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )
    }

    if (isPast) {
      return (
        <Card className={cn(
          "rounded-xl border shadow-sm overflow-hidden border-destructive/20 text-destructive",
          isMobile ? "bg-background/95 backdrop-blur-md" : "bg-destructive/5 w-full"
        )}>
          <CardContent className="p-4">
            <div className="flex items-start gap-2">
              <CalendarX className="mt-0.5 h-4.5 w-4.5 shrink-0 text-destructive" />
              <div>
                <p className="text-sm font-semibold">Event Ended</p>
                <p className="text-xs mt-0.5 opacity-90">
                  Closed on {formatDateTime(eventEndTime.toISOString())}.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )
    }

    return (
      <Card className={cn(
        "rounded-xl border shadow-sm overflow-hidden",
        isMobile ? "bg-background/95 backdrop-blur-md" : "bg-muted/30 w-full"
      )}>
        <CardContent className={cn("p-4", isMobile ? "flex items-center justify-between gap-4" : "space-y-4")}>
          {!isMobile && (
            <div className="space-y-1">
              <h4 className="text-sm font-semibold text-foreground">Confirm RSVP</h4>
              <p className="text-xs text-muted-foreground">
                Secure your attendance slot before capacity is reached.
              </p>
            </div>
          )}

          <div className={isMobile ? "flex-1" : "w-full"}>
            <Button
              onClick={handleRSVP}
              disabled={isPending}
              className="w-full gap-2 rounded-xl h-10 text-xs font-bold"
              size={isMobile ? "sm" : "lg"}
            >
              {isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Ticket className="h-4 w-4" />
              )}
              RSVP to Event
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="flex flex-col gap-6 px-4 py-8 md:px-8 w-full pb-24 lg:pb-8">
      {/* Back Button */}
      <div>
        <Button variant="ghost" asChild className="gap-1.5 -ml-3 hover:bg-muted/50 rounded-xl transition-all">
          <Link href="/events">
            <ArrowLeft className="h-4 w-4" /> Back to Events
          </Link>
        </Button>
      </div>

      {/* Page Header */}
      <div className="flex flex-col gap-1.5 min-w-0">
        <h1 className="text-3xl font-bold font-cirka tracking-tight text-foreground wrap-break-word leading-tight">
          {event.title}
        </h1>
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-sm text-muted-foreground">
          <span>
            {event.speaker_name && (
              <span className="font-semibold text-foreground mr-1.5">by {event.speaker_name} ·</span>
            )}
            <span className="text-muted-foreground">{event.venue}</span>
          </span>
          {event.event_banner && (
            <>
              <span className="text-muted-foreground/45">•</span>
              <Dialog>
                <DialogTrigger asChild>
                  <button className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:text-primary/80 transition-colors cursor-pointer bg-primary/5 px-2.5 py-0.5 rounded-md border border-primary/10">
                    <ImageIcon className="h-3.5 w-3.5" /> View Banner
                  </button>
                </DialogTrigger>
                <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-3xl p-3 md:p-4 border overflow-hidden rounded-2xl bg-card" showCloseButton={false}>
                  <DialogTitle className="sr-only">Event Banner</DialogTitle>
                  <div className="relative">
                    <img
                      src={buildStorageUrl("event-banners", event.event_banner) || ""}
                      alt="Event Banner"
                      className="w-full h-auto max-h-[85vh] object-contain rounded-xl md:rounded-2xl"
                    />
                    <DialogClose asChild>
                      <Button className="absolute top-4 right-4 h-8 w-8 rounded-full bg-foreground text-background hover:bg-foreground/80 shadow-md flex items-center justify-center p-0 cursor-pointer">
                        <X className="h-4 w-4" />
                      </Button>
                    </DialogClose>
                  </div>
                </DialogContent>
              </Dialog>
            </>
          )}
        </div>
      </div>

      {/* Two Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column (Details) */}
        <div className="lg:col-span-8 space-y-6">
          {/* Event Overview Card */}
          <Card className="rounded-xl border bg-muted/30 w-full overflow-hidden">
            <CardContent className="p-4">
              <p className="pb-2.5 border-b mb-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Event Overview
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <MetaItem
                  icon={<Clock className="h-4 w-4" />}
                  label="Date & Time"
                  value={formatDateTime(event.date)}
                />
                <MetaItem
                  icon={<MapPin className="h-4 w-4" />}
                  label="Venue"
                  value={event.venue}
                />
                <MetaItem
                  icon={<Users className="h-4 w-4" />}
                  label="Capacity Limit"
                  value={`${event.capacity} seats`}
                />
                <MetaItem
                  icon={<Clock className="h-4 w-4" />}
                  label="Duration"
                  value={`${event.duration_minutes} minutes`}
                />
                <MetaItem
                  icon={<Info className="h-4 w-4" />}
                  label="Event Status"
                  value={event.status}
                />
                {event.speaker_name && (
                  <MetaItem
                    icon={<Mic className="h-4 w-4" />}
                    label="Guest Speaker"
                    value={event.speaker_name}
                  />
                )}
              </div>
            </CardContent>
          </Card>

          {/* Description Card */}
          {event.description && (
            <Card className="rounded-xl border bg-muted/30 w-full overflow-hidden">
              <CardContent className="p-4">
                <p className="pb-2.5 border-b mb-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Description
                </p>
                <p className="overflow-hidden wrap-break-word whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
                  {event.description}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Agenda Card */}
          {agenda && agenda.length > 0 && (
            <Card className="rounded-xl border bg-muted/30 w-full overflow-hidden">
              <CardContent className="p-5">
                <p className="pb-2.5 border-b mb-6 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Event Agenda
                </p>
                <div className="relative pl-6 md:pl-8 border-l border-primary/20 space-y-6">
                  {agenda.map((item, idx) => (
                    <div key={item.id || idx} className="relative group">
                      <div className="absolute -left-7.75 md:-left-9.75 top-1.5 h-3.5 w-3.5 rounded-full border-2 border-primary bg-background" />

                      <div className="flex flex-col md:flex-row md:items-start gap-2 md:gap-4">
                        <div className="shrink-0 flex items-center">
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-primary font-mono bg-primary/5 dark:bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-md shadow-2xs">
                            <Clock className="h-3 w-3" />
                            {formatTimeOnly(item.start_time)}
                          </span>
                        </div>

                        <div className="space-y-1 flex-1 min-w-0">
                          <h4 className="text-sm font-bold text-foreground leading-snug">
                            {item.title}
                          </h4>
                          {item.description && (
                            <p className="text-xs text-muted-foreground leading-relaxed">
                              {item.description}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column (Desktop Sidebar CTA) */}
        <div className="hidden lg:block lg:col-span-4 sticky top-6">
          {renderActionCard(false)}
        </div>
      </div>

      {/* Spacer to prevent mobile floating CTA from covering bottom content */}
      <div className="h-28 lg:hidden shrink-0" />

      {/* Floating Bottom Bar/Card for Mobile/Tablet */}
      <div className="lg:hidden sticky bottom-4 z-40">
        {renderActionCard(true)}
      </div>
    </div>
  )
}
