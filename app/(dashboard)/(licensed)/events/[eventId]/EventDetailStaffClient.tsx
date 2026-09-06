"use client"

import { useState, useMemo, useTransition, type ReactNode } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  ArrowLeft,
  Calendar,
  Clock,
  MapPin,
  Users,
  UserCheck,
  UserX,
  Copy,
  Search,
  X,
  QrCode,
  CheckCircle2,
  Hourglass,
  XCircle,
  Loader2,
  ScanLine,
  FileSpreadsheet,
  Edit3,
  Trash2,
  ChevronRight,
  MoreHorizontal,
  Info,
  Image as ImageIcon,
  Mic,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  Filter,
} from "lucide-react"
import { cn, formatDateTime, formatTimeOnly } from "@/lib/utils"
import { toast } from "sonner"
import { buildStorageUrl } from "@/lib/storage"
import { markAttendanceAction, removeAttendanceAction, cancelTicketAction, deleteEventAction, concludeEventAction } from "../actions"
import type { EventTicket, EventStatus, TicketStatus, AttendanceStatus, EventAgendaItem } from "../types"
import { ExportEventAttendeesModal } from "./ExportEventAttendeesModal"
import { QRCheckInScanner } from "./QRCheckInScanner"

// ─── Types & Sort Helpers ────────────────────────────────────────────────────

type SortColumn = "candidate_name" | "candidate_course" | "attendance_status" | "status_time"
type SortDirection = "asc" | "desc"

function SortableHead({
  label,
  col,
  align = "left",
  sortCol,
  sortDir,
  onSort,
  className,
}: {
  label: ReactNode
  col: SortColumn
  align?: "left" | "center" | "right"
  sortCol: SortColumn
  sortDir: SortDirection
  onSort: (col: SortColumn) => void
  className?: string
}) {
  return (
    <TableHead
      className={cn(
        "text-xs font-semibold select-none cursor-pointer hover:bg-muted/60 transition-colors py-3.5",
        align === "right" && "text-right",
        align === "center" && "text-center",
        className
      )}
      onClick={() => onSort(col)}
    >
      <div className={cn("flex items-center gap-1.5", align === "right" && "justify-end", align === "center" && "justify-center")}>
        <span>{label}</span>
        {sortCol === col ? (
          sortDir === "asc" ? (
            <ArrowUp className="h-3.5 w-3.5 text-primary shrink-0" />
          ) : (
            <ArrowDown className="h-3.5 w-3.5 text-primary shrink-0" />
          )
        ) : (
          <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground/40 shrink-0" />
        )}
      </div>
    </TableHead>
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getInitials(name: string) {
  if (!name) return "?"
  return name
    .split(" ")
    .filter(Boolean)
    .map(n => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)
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

// ─── Manual Check-in Dialog ──────────────────────────────────────────────────

function ManualCheckInDialog({ eventId, onCheckIn }: { eventId: string; onCheckIn: (ticketId: string) => void }) {
  const [open, setOpen] = useState(false)
  const [ticketId, setTicketId] = useState("")
  const [isPending, startTransition] = useTransition()

  const handleSubmit = () => {
    if (!ticketId.trim()) {
      toast.error("Please enter a ticket ID.")
      return
    }
    startTransition(async () => {
      try {
        await markAttendanceAction(ticketId.trim(), eventId)
        toast.success("Attendee checked in successfully!")
        onCheckIn(ticketId.trim())
        setTicketId("")
        setOpen(false)
      } catch (err: any) {
        toast.error(err.message)
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-1.5 h-9 rounded-xl text-xs font-semibold cursor-pointer border bg-card">
          <ScanLine className="h-4 w-4" />
          Manual Check-in
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle>Manual Check-in</DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground/80">
            Enter the ticket ID from the QR code to check in an attendee.
          </DialogDescription>
        </DialogHeader>
        <div className="flex gap-2 mt-2">
          <Input
            placeholder="Ticket ID (UUID)"
            value={ticketId}
            onChange={(e) => setTicketId(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            className="flex-1 rounded-xl"
          />
          <Button onClick={handleSubmit} disabled={isPending} className="rounded-xl">
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Check In"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ─── Ticket Status Badge ──────────────────────────────────────────────────────

function TicketStatusBadge({ status }: { status: TicketStatus }) {
  switch (status) {
    case "Confirmed":
      return (
        <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-[10px] font-bold uppercase tracking-wide">
          Confirmed
        </Badge>
      )
    case "Waitlisted":
      return (
        <Badge variant="outline" className="border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400 text-[10px] font-bold uppercase tracking-wide">
          Waitlisted
        </Badge>
      )
    case "Cancelled":
      return (
        <Badge variant="outline" className="border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-400 text-[10px] font-bold uppercase tracking-wide">
          Cancelled
        </Badge>
      )
  }
}

function AttendanceBadge({ status }: { status: AttendanceStatus }) {
  if (status === "Present") {
    return (
      <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-[10px] font-bold uppercase tracking-wide">
        Present
      </Badge>
    )
  }
  return (
    <Badge variant="outline" className="text-muted-foreground text-[10px] font-bold uppercase tracking-wide">
      Pending
    </Badge>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface Props {
  event: {
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
    speaker_name: string | null
  }
  agenda: EventAgendaItem[]
  tickets: EventTicket[]
}

export function EventDetailStaffClient({ event, agenda, tickets: initialTickets }: Props) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState("overview")
  const [search, setSearch] = useState("")
  const [filter, setFilter] = useState<"all" | "confirmed" | "waitlisted" | "present" | "cancelled">("all")
  const [sortCol, setSortCol] = useState<SortColumn>("status_time")
  const [sortDir, setSortDir] = useState<SortDirection>("asc")
  const [isPending, startTransition] = useTransition()
  
  const eventEndTime = event.end_date 
    ? new Date(event.end_date) 
    : new Date(new Date(event.date).getTime() + (event.duration_minutes || 120) * 60000)
  const isPast = eventEndTime < new Date()

  const onCheckIn = () => router.refresh()

  const handleDelete = () => {
    startTransition(async () => {
      try {
        await deleteEventAction(event.id)
        toast.success("Event deleted successfully.")
        router.push("/events")
      } catch (err: any) {
        toast.error(err.message)
      }
    })
  }

  const handleConclude = () => {
    startTransition(async () => {
      try {
        await concludeEventAction(event.id)
        toast.success("Event concluded.")
        router.refresh()
      } catch (err: any) {
        toast.error(err.message)
      }
    })
  }

  const handleSort = (col: SortColumn) => {
    if (sortCol === col) {
      setSortDir((prev) => (prev === "asc" ? "desc" : "asc"))
    } else {
      setSortCol(col)
      setSortDir("asc")
    }
  }

  const stats = useMemo(() => {
    const all = initialTickets.filter((t) => t.status !== "Cancelled").length
    const confirmed = initialTickets.filter((t) => t.status === "Confirmed").length
    const waitlisted = initialTickets.filter((t) => t.status === "Waitlisted").length
    const present = initialTickets.filter((t) => t.attendance_status === "Present").length
    const cancelled = initialTickets.filter((t) => t.status === "Cancelled").length
    return { all, confirmed, waitlisted, present, cancelled }
  }, [initialTickets])

  const filteredTickets = useMemo(() => {
    let items = [...initialTickets]

    if (filter === "confirmed") items = items.filter((t) => t.status === "Confirmed")
    else if (filter === "waitlisted") items = items.filter((t) => t.status === "Waitlisted")
    else if (filter === "present") items = items.filter((t) => t.attendance_status === "Present")
    else if (filter === "cancelled") items = items.filter((t) => t.status === "Cancelled")
    else items = items.filter((t) => t.status !== "Cancelled")

    if (search.trim()) {
      const q = search.toLowerCase()
      items = items.filter(
        (t) =>
          t.candidate_name?.toLowerCase().includes(q) ||
          t.candidate_email?.toLowerCase().includes(q) ||
          t.candidate_course?.toLowerCase().includes(q) ||
          (t.candidate_passout_year && String(t.candidate_passout_year).includes(q))
      )
    }

    // Sort items
    items.sort((a, b) => {
      let comp = 0
      if (sortCol === "candidate_name") {
        comp = (a.candidate_name || "").localeCompare(b.candidate_name || "")
      } else if (sortCol === "candidate_course") {
        const aCourse = `${a.candidate_course || ""} ${a.candidate_passout_year || ""}`
        const bCourse = `${b.candidate_course || ""} ${b.candidate_passout_year || ""}`
        comp = aCourse.localeCompare(bCourse)
      } else if (sortCol === "attendance_status") {
        const aStatus = `${a.status}-${a.attendance_status}`
        const bStatus = `${b.status}-${b.attendance_status}`
        comp = aStatus.localeCompare(bStatus)
      } else if (sortCol === "status_time") {
        const aTime = a.attendance_status === "Present" ? (a.marked_present_at || a.updated_at || a.created_at) : (a.rsvp_at || a.created_at)
        const bTime = b.attendance_status === "Present" ? (b.marked_present_at || b.updated_at || b.created_at) : (b.rsvp_at || b.created_at)
        comp = new Date(aTime || 0).getTime() - new Date(bTime || 0).getTime()
      }
      return sortDir === "asc" ? comp : -comp
    })

    return items
  }, [initialTickets, filter, search, sortCol, sortDir])


  return (
    <div className="flex flex-col gap-6 px-4 py-4 md:py-8 md:px-8 w-full">
      {/* Back Button */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <Button variant="ghost" asChild className="gap-1.5 -ml-2 md:-ml-3 self-start hover:bg-muted/50 rounded-xl transition-all">
          <Link href="/events">
            <ArrowLeft className="h-4 w-4" /> Back to Events
          </Link>
        </Button>
      </div>

      {/* Page Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-1.5 min-w-0">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <h1 className="text-3xl font-bold font-cirka tracking-tight text-foreground wrap-break-word leading-tight">
                {event.title}
              </h1>
              <Badge variant={event.status === "Published" ? "default" : "secondary"} className="text-xs">
                {event.status}
              </Badge>
            </div>
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-sm text-muted-foreground mt-1">
              <span>
                {event.speaker_name && (
                  <span className="font-semibold text-foreground mr-1.5">by {event.speaker_name} ·</span>
                )}
                Campus Event · <span className="font-semibold text-foreground">{event.venue}</span>
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

        {/* Actions Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="w-full gap-1.5 sm:w-auto h-9 rounded-xl font-semibold shadow-2xs cursor-pointer"
              disabled={isPending}
            >
              {isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <MoreHorizontal className="h-4 w-4" />
              )}
              Actions
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48 rounded-xl">
            {(event.status === "Draft" || event.status === "Published") && (
              <DropdownMenuItem onClick={() => router.push(`/events/${event.id}/edit`)} disabled={isPending} className="rounded-lg cursor-pointer">
                <Edit3 className="mr-2 h-3.5 w-3.5" />
                Edit Event
              </DropdownMenuItem>
            )}

            {event.status === "Published" && !isPast && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <button className="relative flex w-full select-none items-center rounded-sm px-2 py-1.5 text-xs outline-hidden transition-colors hover:bg-accent hover:text-accent-foreground data-disabled:pointer-events-none data-disabled:opacity-50 text-left cursor-pointer">
                    <CheckCircle2 className="mr-2 h-3.5 w-3.5 text-emerald-600" />
                    Conclude Event
                  </button>
                </AlertDialogTrigger>
                <AlertDialogContent className="rounded-2xl">
                  <AlertDialogHeader>
                    <AlertDialogTitle>Conclude this event?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will mark the event as concluded. No new RSVPs will be accepted.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleConclude} disabled={isPending} className="cursor-pointer rounded-xl">
                      {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Conclude
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}

            <DropdownMenuSeparator />

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <button className="relative flex w-full select-none items-center rounded-sm px-2 py-1.5 text-xs outline-hidden transition-colors hover:bg-destructive hover:text-destructive-foreground data-disabled:pointer-events-none data-disabled:opacity-50 text-left text-destructive font-semibold cursor-pointer">
                  <Trash2 className="mr-2 h-3.5 w-3.5" />
                  Delete Event
                </button>
              </AlertDialogTrigger>
              <AlertDialogContent className="rounded-2xl">
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete this event?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. All candidate tickets will also be deleted.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDelete}
                    disabled={isPending}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90 cursor-pointer rounded-xl"
                  >
                    {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>


      {/* Tabs Layout */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        {/* Header Row: Tabs on Left + Action Buttons on Right */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 pb-1">
          <TabsList className="inline-flex h-9 gap-0.5 rounded-lg bg-muted p-1 border shrink-0">
            {[
              { value: "overview", label: "Overview", icon: <Info className="h-3.5 w-3.5" />, count: null },
              { value: "attendees", label: "Attendees List", icon: <Users className="h-3.5 w-3.5" />, count: initialTickets.length }
            ].map(({ value, label, icon, count }) => (
              <TabsTrigger
                key={value}
                value={value}
                className="gap-1.5 rounded-md px-3 text-xs font-medium data-[state=active]:bg-background data-[state=active]:shadow-sm text-muted-foreground data-[state=active]:text-foreground cursor-pointer"
              >
                {icon}
                <span>{label}</span>
                {count != null && count > 0 && (
                  <span className={cn(
                    "inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-semibold tabular-nums",
                    activeTab === value
                      ? "bg-foreground text-background"
                      : "bg-muted-foreground/20 text-muted-foreground"
                  )}>
                    {count}
                  </span>
                )}
              </TabsTrigger>
            ))}
          </TabsList>

          {/* Action Buttons Row on Right */}
          <div className="flex flex-wrap items-center gap-2">
            <QRCheckInScanner eventId={event.id} onCheckIn={onCheckIn} tickets={initialTickets} />
            <ManualCheckInDialog eventId={event.id} onCheckIn={onCheckIn} />
            {initialTickets.length > 0 && (
              <ExportEventAttendeesModal tickets={filteredTickets} eventName={event.title} />
            )}
          </div>
        </div>

        {/* Tab 1: Overview */}
        <TabsContent value="overview" className="m-0 space-y-6">

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
                  value={`${formatDateTime(event.date)} – ${formatTimeOnly(eventEndTime.toISOString())}`}
                />
                <MetaItem
                  icon={<MapPin className="h-4 w-4" />}
                  label="Venue"
                  value={event.venue}
                />
                <MetaItem
                  icon={<Users className="h-4 w-4" />}
                  label="Capacity"
                  value={`${event.capacity} seats`}
                />
                <MetaItem
                  icon={<Clock className="h-4 w-4" />}
                  label="Duration"
                  value={`${event.duration_minutes} minutes`}
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
        </TabsContent>

        {/* Tab 2: Attendees */}
        <TabsContent value="attendees" className="m-0 space-y-4">
          {/* Full-width Search and Filter Bar */}
          <div className="flex items-center gap-2 w-full">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search attendees by candidate name, email, course, branch or passout year..."
                className="pl-9 pr-8 h-10 text-sm rounded-xl focus-visible:ring-primary/20 w-full"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1 cursor-pointer"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Filter Dropdown Button */}
            <Select value={filter} onValueChange={(val: any) => setFilter(val)}>
              <SelectTrigger className="h-10 w-auto gap-2 rounded-xl text-xs font-semibold px-3.5 border bg-card shrink-0 cursor-pointer shadow-2xs">
                <Filter className="h-3.5 w-3.5 text-muted-foreground" />
                <SelectValue placeholder="Filter Attendees" />
              </SelectTrigger>
              <SelectContent align="end" className="rounded-xl text-xs font-medium">
                <SelectItem value="all">All Attendees ({stats.all})</SelectItem>
                <SelectItem value="confirmed">Confirmed Seats ({stats.confirmed})</SelectItem>
                <SelectItem value="present">Checked In / Present ({stats.present})</SelectItem>
                <SelectItem value="waitlisted">Waitlisted Queue ({stats.waitlisted})</SelectItem>
                <SelectItem value="cancelled">Cancelled ({stats.cancelled})</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {filteredTickets.length === 0 ? (
            <Card className="p-12 text-center border-2 border-dashed bg-card/50 rounded-2xl">
              <Users className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
              <h4 className="font-bold text-lg text-foreground">No attendees found</h4>
              <p className="text-sm text-muted-foreground/80 mt-1.5 max-w-sm mx-auto">
                {initialTickets.length === 0
                  ? "No candidate has registered for this event yet."
                  : "No registered attendees match the current search or filters."}
              </p>
            </Card>
          ) : (
            <div className="space-y-4">
              {/* Desktop Table View with Sortable Headers */}
              <div className="hidden md:block border rounded-xl bg-card overflow-hidden">
                <Table>
                  <TableHeader className="bg-muted/30">
                    <TableRow>
                      <SortableHead label="Candidate Name" col="candidate_name" sortCol={sortCol} sortDir={sortDir} onSort={handleSort} className="pl-6" />
                      <SortableHead label="Course / Branch Passout Year" col="candidate_course" sortCol={sortCol} sortDir={sortDir} onSort={handleSort} />
                      <SortableHead label="Attendance Status" col="attendance_status" align="center" sortCol={sortCol} sortDir={sortDir} onSort={handleSort} />
                      <SortableHead label="Attendance Status Time" col="status_time" align="center" sortCol={sortCol} sortDir={sortDir} onSort={handleSort} />
                      <TableHead className="font-semibold text-xs text-muted-foreground text-right pr-6">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTickets.map((ticket) => (
                      <AttendeeRow key={ticket.id} ticket={ticket} onCheckIn={onCheckIn} />
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile Card List View */}
              <div className="grid grid-cols-1 gap-4 md:hidden">
                {filteredTickets.map((ticket) => (
                  <AttendeeCard key={ticket.id} ticket={ticket} onCheckIn={onCheckIn} />
                ))}
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}

// ─── Attendee Actions Dropdown (3-dot Menu) ───────────────────────────────────

function AttendeeActionsDropdown({
  ticket,
  onUpdate,
}: {
  ticket: EventTicket
  onUpdate: () => void
}) {
  const [isPending, startTransition] = useTransition()

  const handleCheckIn = () => {
    startTransition(async () => {
      try {
        await markAttendanceAction(ticket.id, ticket.event_id)
        toast.success(`${ticket.candidate_name || "Attendee"} checked in!`)
        onUpdate()
      } catch (err: any) {
        toast.error(err.message)
      }
    })
  }

  const handleRemoveAttendance = () => {
    startTransition(async () => {
      try {
        await removeAttendanceAction(ticket.id, ticket.event_id)
        toast.success(`Attendance removed for ${ticket.candidate_name || "Attendee"}`)
        onUpdate()
      } catch (err: any) {
        toast.error(err.message)
      }
    })
  }

  const handleCancelTicket = () => {
    startTransition(async () => {
      try {
        await cancelTicketAction(ticket.id, ticket.event_id)
        toast.success(`RSVP ticket cancelled for ${ticket.candidate_name || "Attendee"}`)
        onUpdate()
      } catch (err: any) {
        toast.error(err.message)
      }
    })
  }

  const handleCopyId = () => {
    navigator.clipboard.writeText(ticket.id)
    toast.success("Ticket ID copied to clipboard")
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8 p-0 cursor-pointer hover:bg-muted">
          <span className="sr-only">Open menu</span>
          <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        {ticket.status === "Confirmed" && ticket.attendance_status !== "Present" && (
          <DropdownMenuItem onClick={handleCheckIn} disabled={isPending} className="cursor-pointer">
            <UserCheck className="h-4 w-4 mr-2 text-emerald-600 dark:text-emerald-400" />
            <span>Check In Attendance</span>
          </DropdownMenuItem>
        )}

        {ticket.attendance_status === "Present" && (
          <DropdownMenuItem onClick={handleRemoveAttendance} disabled={isPending} className="cursor-pointer text-amber-600 dark:text-amber-400">
            <UserX className="h-4 w-4 mr-2" />
            <span>Remove Attendance</span>
          </DropdownMenuItem>
        )}

        <DropdownMenuItem onClick={handleCopyId} className="cursor-pointer">
          <Copy className="h-4 w-4 mr-2 text-muted-foreground" />
          <span>Copy Ticket ID</span>
        </DropdownMenuItem>

        {ticket.status !== "Cancelled" && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleCancelTicket} disabled={isPending} className="cursor-pointer text-destructive focus:text-destructive">
              <XCircle className="h-4 w-4 mr-2" />
              <span>Cancel Ticket RSVP</span>
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

// ─── Attendee Row (Desktop) ──────────────────────────────────────────────────

function AttendeeRow({
  ticket,
  onCheckIn,
}: {
  ticket: EventTicket
  onCheckIn: () => void
}) {
  const isPresent = ticket.attendance_status === "Present"
  const statusTime = isPresent ? (ticket.marked_present_at || ticket.updated_at || ticket.created_at) : (ticket.rsvp_at || ticket.created_at)

  return (
    <TableRow className="hover:bg-muted/20">
      <TableCell className="pl-6 py-3.5">
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8 border shrink-0">
            <AvatarFallback className="text-[11px] font-bold bg-primary/5 text-primary">
              {getInitials(ticket.candidate_name || "Unknown")}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="font-semibold text-sm text-foreground truncate">{ticket.candidate_name || "Unknown"}</p>
            {ticket.candidate_email && (
              <p className="text-muted-foreground text-xs font-normal truncate">{ticket.candidate_email}</p>
            )}
          </div>
        </div>
      </TableCell>
      <TableCell className="text-sm font-medium text-foreground">
        {ticket.candidate_course ?? "—"}
        {ticket.candidate_passout_year && (
          <span className="text-xs text-muted-foreground ml-1.5 font-mono">({ticket.candidate_passout_year})</span>
        )}
      </TableCell>
      <TableCell className="text-center">
        <div className="flex items-center justify-center gap-1.5 flex-wrap">
          <TicketStatusBadge status={ticket.status} />
          <AttendanceBadge status={ticket.attendance_status} />
        </div>
      </TableCell>
      <TableCell className="text-center">
        <div className="flex items-center justify-center gap-1.5 text-xs">
          {isPresent ? (
            <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold bg-emerald-500/10 px-2 py-0.5 rounded-md">
              <CheckCircle2 className="h-3 w-3" />
              {formatDateTime(statusTime)}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-muted-foreground font-medium bg-muted/50 px-2 py-0.5 rounded-md">
              <Clock className="h-3 w-3" />
              {formatDateTime(statusTime)}
            </span>
          )}
        </div>
      </TableCell>
      <TableCell className="text-right pr-6">
        <AttendeeActionsDropdown ticket={ticket} onUpdate={onCheckIn} />
      </TableCell>
    </TableRow>
  )
}

// ─── Attendee Card (Mobile) ───────────────────────────────────────────────────

function AttendeeCard({
  ticket,
  onCheckIn,
}: {
  ticket: EventTicket
  onCheckIn: () => void
}) {
  const isPresent = ticket.attendance_status === "Present"
  const statusTime = isPresent ? (ticket.marked_present_at || ticket.updated_at || ticket.created_at) : (ticket.rsvp_at || ticket.created_at)

  return (
    <Card className="rounded-xl border bg-card p-4 space-y-3 shadow-xs">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <Avatar className="h-9 w-9 border shrink-0">
            <AvatarFallback className="text-xs font-bold bg-primary/5 text-primary">
              {getInitials(ticket.candidate_name || "Unknown")}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <h4 className="font-bold text-sm text-foreground truncate">{ticket.candidate_name || "Unknown"}</h4>
            <p className="text-muted-foreground text-xs font-medium truncate">{ticket.candidate_email}</p>
          </div>
        </div>

        <AttendeeActionsDropdown ticket={ticket} onUpdate={onCheckIn} />
      </div>

      <div className="flex flex-col gap-2 border-t pt-3 text-xs">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <TicketStatusBadge status={ticket.status} />
            <AttendanceBadge status={ticket.attendance_status} />
          </div>
          <span className="text-muted-foreground text-xs font-medium">
            {ticket.candidate_course ?? "—"} {ticket.candidate_passout_year ? `(${ticket.candidate_passout_year})` : ""}
          </span>
        </div>
        <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1 border-t border-dashed">
          <span>{isPresent ? "Marked Present At:" : "RSVP'd At:"}</span>
          <span className="font-semibold text-foreground">{formatDateTime(statusTime)}</span>
        </div>
      </div>
    </Card>
  )
}
