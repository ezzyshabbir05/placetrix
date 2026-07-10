"use client"

// ─────────────────────────────────────────────────────────────────────────────
// app/(dashboard)/(licensed)/events/[eventId]/EventDetailStaffClient.tsx
// Staff view: Manage attendees, scan QR codes, view Q&A
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useMemo, useTransition } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
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
  Calendar,
  Clock,
  MapPin,
  Users,
  UserCheck,
  Search,
  X,
  QrCode,
  CheckCircle2,
  Hourglass,
  XCircle,
  Loader2,
  ScanLine,
  FileSpreadsheet,
  PenLine,
  Trash2,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import * as XLSX from "xlsx"
import { markAttendanceAction, deleteEventAction, concludeEventAction } from "../actions"
import type { EventTicket, EventStatus, TicketStatus, AttendanceStatus } from "../types"


// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDateTime(dt: string): string {
  return new Date(dt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })
}


// ─── Manual Check-in Dialog ──────────────────────────────────────────────────

function ManualCheckInDialog({ onCheckIn }: { onCheckIn: (ticketId: string) => void }) {
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
        await markAttendanceAction(ticketId.trim())
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
        <Button variant="outline" className="gap-1.5">
          <ScanLine className="h-4 w-4" />
          Manual Check-in
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Manual Check-in</DialogTitle>
          <DialogDescription>
            Enter the ticket ID from the QR code to check in an attendee.
          </DialogDescription>
        </DialogHeader>
        <div className="flex gap-2 mt-2">
          <Input
            placeholder="Ticket ID (UUID)"
            value={ticketId}
            onChange={(e) => setTicketId(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            className="flex-1"
          />
          <Button onClick={handleSubmit} disabled={isPending}>
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
        <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-[11px]">
          <CheckCircle2 className="mr-1 h-3 w-3" /> Confirmed
        </Badge>
      )
    case "Waitlisted":
      return (
        <Badge variant="outline" className="border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400 text-[11px]">
          <Hourglass className="mr-1 h-3 w-3" /> Waitlisted
        </Badge>
      )
    case "Cancelled":
      return (
        <Badge variant="outline" className="border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-400 text-[11px]">
          <XCircle className="mr-1 h-3 w-3" /> Cancelled
        </Badge>
      )
  }
}

function AttendanceBadge({ status }: { status: AttendanceStatus }) {
  if (status === "Present") {
    return (
      <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-[11px]">
        <UserCheck className="mr-1 h-3 w-3" /> Present
      </Badge>
    )
  }
  return (
    <Badge variant="outline" className="text-muted-foreground text-[11px]">
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
    venue: string
    capacity: number
    status: EventStatus
    duration_minutes: number
  }
  tickets: EventTicket[]
}

export function EventDetailStaffClient({ event, tickets: initialTickets }: Props) {
  const router = useRouter()
  const [search, setSearch] = useState("")
  const [filter, setFilter] = useState<"all" | "confirmed" | "waitlisted" | "present">("all")
  const [isPending, startTransition] = useTransition()
  const isPast = new Date(event.date) < new Date()

  const onCheckIn = () => router.refresh()

  const handleDelete = () => {
    startTransition(async () => {
      try {
        await deleteEventAction(event.id)
        toast.success("Event deleted.")
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

  const stats = useMemo(() => {
    const confirmed = initialTickets.filter((t) => t.status === "Confirmed").length
    const waitlisted = initialTickets.filter((t) => t.status === "Waitlisted").length
    const present = initialTickets.filter((t) => t.attendance_status === "Present").length
    const cancelled = initialTickets.filter((t) => t.status === "Cancelled").length
    return { confirmed, waitlisted, present, cancelled }
  }, [initialTickets])

  const filtered = useMemo(() => {
    let items = initialTickets.filter((t) => t.status !== "Cancelled")

    if (filter === "confirmed") items = items.filter((t) => t.status === "Confirmed")
    else if (filter === "waitlisted") items = items.filter((t) => t.status === "Waitlisted")
    else if (filter === "present") items = items.filter((t) => t.attendance_status === "Present")

    if (search.trim()) {
      const q = search.toLowerCase()
      items = items.filter(
        (t) =>
          t.candidate_name?.toLowerCase().includes(q) ||
          t.candidate_email?.toLowerCase().includes(q) ||
          t.candidate_course?.toLowerCase().includes(q)
      )
    }

    return items
  }, [initialTickets, filter, search])

  const handleExport = () => {
    try {
      const exportData = filtered.map((t) => ({
        "Attendee Name": t.candidate_name ?? "Unknown",
        "Email": t.candidate_email ?? "",
        "Branch / Course": t.candidate_course ?? "—",
        "Passout Year": t.candidate_passout_year ?? "—",
        "RSVP Status": t.status,
        "Attendance": t.attendance_status === "Present" ? "Present" : "Pending",
        "Registration Date": new Date(t.created_at).toLocaleDateString("en-IN"),
      }))

      const worksheet = XLSX.utils.json_to_sheet(exportData)
      const workbook = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(workbook, worksheet, "Attendees")

      // Auto-fit columns
      const maxLens = Object.keys(exportData[0] || {}).map((key) => {
        const lengths = exportData.map((row: any) => String(row[key] ?? "").length)
        lengths.push(key.length)
        return { wch: Math.max(...lengths) + 3 }
      })
      worksheet["!cols"] = maxLens

      const fileName = `${event.title.replace(/[^a-zA-Z0-9]/g, "_")}_attendees.xlsx`
      XLSX.writeFile(workbook, fileName)
      toast.success("Excel sheet exported successfully!")
    } catch (err: any) {
      toast.error("Failed to export Excel sheet: " + err.message)
    }
  }

  return (
    <div className="flex flex-col gap-5 p-4 md:p-6 max-w-6xl mx-auto w-full">
      {/* Back + Header */}
      <div>
        <Link
          href="/events"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-3"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Events
        </Link>
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-bold tracking-tight">{event.title}</h1>
            {event.description && (
              <p className="text-sm text-muted-foreground mt-1">{event.description}</p>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2 md:mt-1">
            {(event.status === "Draft" || event.status === "Published") && (
              <Link href={`/events/${event.id}/edit`}>
                <Button size="sm" variant="outline" className="gap-1.5 text-xs cursor-pointer">
                  <PenLine className="h-3.5 w-3.5" />
                  Edit
                </Button>
              </Link>
            )}

            {event.status === "Published" && !isPast && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button size="sm" variant="outline" className="text-xs text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950/20 border-amber-200 dark:border-amber-900/30 gap-1.5 cursor-pointer">
                    Conclude
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Conclude this event?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will mark the event as concluded. No new RSVPs will be accepted.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleConclude} disabled={isPending} className="cursor-pointer">
                      {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Conclude
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button size="sm" variant="outline" className="text-xs text-destructive hover:bg-destructive/5 border-destructive/20 hover:border-destructive/30 gap-1.5 cursor-pointer">
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete this event?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. All candidate tickets will also be deleted.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDelete}
                    disabled={isPending}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90 cursor-pointer"
                  >
                    {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </div>

      {/* Event Info */}
      <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <Clock className="h-4 w-4" /> {formatDateTime(event.date)}
        </span>
        <span className="flex items-center gap-1.5">
          <MapPin className="h-4 w-4" /> {event.venue}
        </span>
        <span className="flex items-center gap-1.5">
          <Users className="h-4 w-4" /> Capacity: {event.capacity}
        </span>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Confirmed", value: stats.confirmed, color: "text-emerald-600 dark:text-emerald-400", filterKey: "confirmed" as const },
          { label: "Waitlisted", value: stats.waitlisted, color: "text-amber-600 dark:text-amber-400", filterKey: "waitlisted" as const },
          { label: "Checked In", value: stats.present, color: "text-indigo-600 dark:text-indigo-400", filterKey: "present" as const },
          { label: "Cancelled", value: stats.cancelled, color: "text-red-500", filterKey: "all" as const },
        ].map((stat) => (
          <button
            key={stat.label}
            onClick={() => setFilter(stat.filterKey)}
            className={cn(
              "rounded-lg border p-3 text-left transition-all",
              filter === stat.filterKey
                ? "border-primary bg-primary/5 shadow-sm"
                : "hover:border-primary/30"
            )}
          >
            <p className="text-xs text-muted-foreground">{stat.label}</p>
            <p className={cn("text-xl font-bold tabular-nums", stat.color)}>{stat.value}</p>
          </button>
        ))}
      </div>

      {/* Scanner + Search */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex items-center gap-2">
          <ManualCheckInDialog onCheckIn={onCheckIn} />
          {filtered.length > 0 && (
            <Button variant="outline" onClick={handleExport} className="gap-1.5 h-9 text-xs cursor-pointer">
              <FileSpreadsheet className="h-4 w-4" />
              Export to Excel
            </Button>
          )}
        </div>
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search attendees..."
            className="pl-9 h-9 text-sm"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Attendees Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Attendees ({filtered.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[200px]">Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Course</TableHead>
                  <TableHead>Year</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Attendance</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No attendees found.
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((ticket) => (
                    <AttendeeRow key={ticket.id} ticket={ticket} onCheckIn={onCheckIn} />
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}


// ─── Attendee Row ─────────────────────────────────────────────────────────────

function AttendeeRow({
  ticket,
  onCheckIn,
}: {
  ticket: EventTicket
  onCheckIn: () => void
}) {
  const [isPending, startTransition] = useTransition()

  const handleCheckIn = () => {
    startTransition(async () => {
      try {
        await markAttendanceAction(ticket.id)
        toast.success(`${ticket.candidate_name} checked in!`)
        onCheckIn()
      } catch (err: any) {
        toast.error(err.message)
      }
    })
  }

  return (
    <TableRow>
      <TableCell className="font-medium">{ticket.candidate_name}</TableCell>
      <TableCell className="text-sm text-muted-foreground">{ticket.candidate_email}</TableCell>
      <TableCell className="text-sm">{ticket.candidate_course ?? "—"}</TableCell>
      <TableCell className="text-sm">{ticket.candidate_passout_year ?? "—"}</TableCell>
      <TableCell><TicketStatusBadge status={ticket.status} /></TableCell>
      <TableCell><AttendanceBadge status={ticket.attendance_status} /></TableCell>
      <TableCell className="text-right">
        {ticket.status === "Confirmed" && ticket.attendance_status !== "Present" && (
          <Button
            size="sm"
            variant="outline"
            onClick={handleCheckIn}
            disabled={isPending}
            className="text-xs gap-1"
          >
            {isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <UserCheck className="h-3.5 w-3.5" />
            )}
            Check In
          </Button>
        )}
      </TableCell>
    </TableRow>
  )
}
