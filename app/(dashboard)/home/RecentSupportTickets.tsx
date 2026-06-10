"use client"

import React, { useState } from "react"
import Link from "next/link"
import {
  Mail,
  Clock,
  Hash,
} from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { updateTicketStatusAction } from "@/app/(dashboard)/gethelp/actions"

type TicketStatus = "open" | "in_progress" | "resolved" | "closed"

export function formatDateTime(dt?: string): string {
  if (!dt) return "—"
  return new Date(dt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })
}

const getStatusColor = (status: string) => {
  switch (status) {
    case "open":
      return "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400 border-blue-200/60 dark:border-blue-800/40"
    case "in_progress":
      return "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400 border-amber-200/60 dark:border-amber-800/40"
    case "resolved":
      return "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border-emerald-200/60 dark:border-emerald-800/40"
    case "closed":
      return "bg-zinc-50 text-zinc-700 dark:bg-zinc-500/10 dark:text-zinc-400 border-zinc-200/60 dark:border-zinc-800/40"
    default:
      return "bg-zinc-50 text-zinc-700 dark:bg-zinc-500/10 dark:text-zinc-400 border-zinc-200/60 dark:border-zinc-800/40"
  }
}

function StatusBadge({ status }: { status: TicketStatus }) {
  switch (status) {
    case "open":
      return (
        <Badge className="gap-1 border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-50 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-300 text-[11px] px-2 py-0.5">
          Open
        </Badge>
      )
    case "in_progress":
      return (
        <Badge className="gap-1 border border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-50 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300 text-[11px] px-2 py-0.5">
          In Progress
        </Badge>
      )
    case "resolved":
      return (
        <Badge className="gap-1 border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300 text-[11px] px-2 py-0.5">
          Resolved
        </Badge>
      )
    case "closed":
      return (
        <Badge className="gap-1 border border-zinc-200 bg-zinc-50 text-zinc-700 hover:bg-zinc-50 dark:border-zinc-500/20 dark:bg-zinc-500/10 dark:text-zinc-300 text-[11px] px-2 py-0.5">
          Closed
        </Badge>
      )
    default:
      return (
        <Badge className="gap-1 border border-zinc-200 bg-zinc-50 text-zinc-700 hover:bg-zinc-50 dark:border-zinc-500/20 dark:bg-zinc-500/10 dark:text-zinc-300 text-[11px] px-2 py-0.5">
          {status}
        </Badge>
      )
  }
}

function StatChip({
  icon,
  children,
  tone = "neutral",
}: {
  icon: React.ReactNode
  children: React.ReactNode
  tone?: "neutral" | "sky" | "emerald" | "amber" | "violet" | "rose"
}) {
  const tones = {
    neutral: "border-border/60 bg-muted/50 text-muted-foreground",
    sky: "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-500/20 dark:bg-sky-500/10 dark:text-sky-300",
    emerald:
      "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300",
    amber:
      "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300",
    violet:
      "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-500/20 dark:bg-violet-500/10 dark:text-violet-300",
    rose:
      "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-300",
  } as const

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium",
        tones[tone]
      )}
    >
      {icon}
      <span className="truncate">{children}</span>
    </span>
  )
}

interface RecentSupportTicketsProps {
  initialTickets: any[]
}

export function RecentSupportTickets({ initialTickets }: RecentSupportTicketsProps) {
  const [tickets, setTickets] = useState(initialTickets)
  const [updatingTicketId, setUpdatingTicketId] = useState<string | null>(null)

  const handleStatusChange = async (ticketId: string, newStatus: TicketStatus) => {
    setUpdatingTicketId(ticketId)
    try {
      await updateTicketStatusAction(ticketId, newStatus)
      setTickets((prev) =>
        prev.map((t) => (t.id === ticketId ? { ...t, status: newStatus } : t))
      )
      toast.success(`Ticket status updated to ${newStatus.replace("_", " ")}`)
    } catch (err: any) {
      toast.error(err.message || "Failed to update ticket status")
    } finally {
      setUpdatingTicketId(null)
    }
  }

  if (tickets.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground bg-white/50 dark:bg-zinc-950/20">
        No support tickets found in the system.
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {tickets.map((ticket) => (
        <Card key={ticket.id} className="overflow-hidden border-border/70 bg-card p-0">
          <div className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:gap-4 md:p-5">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <Link href={`/support/${ticket.id}`} className="hover:underline underline-offset-2 block">
                  <h3 className="min-w-0 text-sm md:text-base font-semibold leading-tight text-foreground">
                    {ticket.title}
                  </h3>
                </Link>
                <StatusBadge status={ticket.status} />
              </div>

              {ticket.description && (
                <p className="mt-1 line-clamp-1 text-xs leading-5 text-muted-foreground">
                  {ticket.description}
                </p>
              )}

              <div className="mt-3 flex flex-wrap gap-2">
                <StatChip icon={<Hash className="h-3.5 w-3.5" />} tone="neutral">
                  <span className="font-mono">{ticket.ticket_number}</span>
                </StatChip>
                <StatChip icon={<Mail className="h-3.5 w-3.5" />} tone="neutral">
                  {ticket.email}
                </StatChip>
                <StatChip icon={<Clock className="h-3.5 w-3.5" />} tone="neutral">
                  Opened: {formatDateTime(ticket.created_at)}
                </StatChip>
              </div>
            </div>

            <div className="flex flex-col gap-3 border-t border-border/60 pt-3 md:min-w-[220px] md:items-end md:pt-0 md:border-t-0 md:text-right">
              <div className="w-full md:w-32 self-end">
                <Select
                  value={ticket.status}
                  disabled={updatingTicketId === ticket.id}
                  onValueChange={(val) => handleStatusChange(ticket.id, val as TicketStatus)}
                >
                  <SelectTrigger className={cn("w-full h-8 text-[11px] font-semibold border-zinc-200/85 dark:border-zinc-800 bg-white dark:bg-zinc-950 rounded-lg shadow-none", getStatusColor(ticket.status))}>
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open" className="text-xs font-semibold">Open</SelectItem>
                    <SelectItem value="in_progress" className="text-xs font-semibold">In Progress</SelectItem>
                    <SelectItem value="resolved" className="text-xs font-semibold">Resolved</SelectItem>
                    <SelectItem value="closed" className="text-xs font-semibold">Closed</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button
                asChild
                variant="outline"
                size="sm"
                className="w-full md:w-auto h-8 text-xs font-semibold gap-1 rounded-lg shadow-sm"
              >
                <Link href={`/support/${ticket.id}`} className="group inline-flex items-center justify-center">
                  View Ticket
                </Link>
              </Button>
            </div>
          </div>
        </Card>
      ))}
    </div>
  )
}
