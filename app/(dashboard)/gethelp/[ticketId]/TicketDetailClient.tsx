"use client";

import React from "react";
import { format } from "date-fns";
import {
  Send,
  ArrowLeft,
  User,
  Headphones,
  Hash,
  Activity,
  CalendarClock,
  Mail,
  BookOpen,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  addTicketMessageAction,
  getTicketAction,
  updateTicketStatusAction,
} from "@/app/(dashboard)/gethelp/actions";
import type { UserProfile } from "@/lib/supabase/profile";

// ─── Meta Item ────────────────────────────────────────────────────────────────

function MetaItem({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-2.5 rounded-xl border bg-muted/20 p-3.5">
      <span className="mt-0.5 shrink-0 text-muted-foreground">{icon}</span>
      <div>
        <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        <div className="mt-0.5 text-sm font-medium text-foreground">{value}</div>
      </div>
    </div>
  );
}

// ─── Status Badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case "open":
      return (
        <span className="text-blue-600 dark:text-blue-400 font-semibold capitalize">
          Open
        </span>
      );
    case "in_progress":
      return (
        <span className="text-amber-600 dark:text-amber-500 font-semibold capitalize">
          In Progress
        </span>
      );
    case "resolved":
      return (
        <span className="text-emerald-600 dark:text-emerald-400 font-semibold capitalize">
          Resolved
        </span>
      );
    case "closed":
      return (
        <span className="text-zinc-600 dark:text-zinc-400 font-semibold capitalize">
          Closed
        </span>
      );
    default:
      return (
        <span className="text-zinc-600 dark:text-zinc-400 font-semibold capitalize">
          {status.replace("_", " ")}
        </span>
      );
  }
}

// ─── Main Client ──────────────────────────────────────────────────────────────

interface TicketDetailClientProps {
  initialTicket: any;
  initialMessages: any[];
  userProfile: UserProfile;
}

export default function TicketDetailClient({
  initialTicket,
  initialMessages,
  userProfile,
}: TicketDetailClientProps) {
  const [messages, setMessages] = React.useState(initialMessages);
  const [newMessage, setNewMessage] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [ticketStatus, setTicketStatus] = React.useState(initialTicket.status);
  const [isUpdatingStatus, setIsUpdatingStatus] = React.useState(false);
  const scrollContainerRef = React.useRef<HTMLDivElement>(null);
  const isFirstRender = React.useRef(true);

  const scrollToBottom = (behavior: ScrollBehavior = "auto") => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({
        top: scrollContainerRef.current.scrollHeight,
        behavior,
      });
    }
  };

  React.useEffect(() => {
    if (isFirstRender.current) {
      scrollToBottom("auto");
      isFirstRender.current = false;
    } else {
      scrollToBottom("smooth");
    }
  }, [messages]);

  const isAdmin = userProfile.account_type === "admin";

  async function handleSendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!newMessage.trim()) return;

    setIsSubmitting(true);
    try {
      await addTicketMessageAction(initialTicket.id, newMessage);
      setNewMessage("");
      const data = await getTicketAction(initialTicket.id);
      if (data) {
        setMessages(data.messages);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to send message");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleStatusChange(newStatus: any) {
    setIsUpdatingStatus(true);
    try {
      await updateTicketStatusAction(initialTicket.id, newStatus);
      setTicketStatus(newStatus);
      toast.success(`Ticket status updated to ${newStatus.replace("_", " ")}`);
    } catch (err: any) {
      toast.error(err.message || "Failed to update ticket status");
    } finally {
      setIsUpdatingStatus(false);
    }
  }

  const allMessages = [
    {
      id: "initial",
      message: initialTicket.description,
      created_at: initialTicket.created_at,
      sender_type: "user",
      profiles: initialTicket.profiles,
    },
    ...messages,
  ];

  return (
    <div className="flex flex-col gap-6 px-4 py-8 md:px-8 mx-auto w-full animate-in fade-in duration-500">
      {/* ── Page Header ────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-1.5">
        <h1 className="text-3xl font-bold font-cirka tracking-tight text-foreground">
          {initialTicket.title}
        </h1>
        <p className="mt-0.5 max-w-2xl text-sm font-medium text-muted-foreground">
          Ticket #{initialTicket.ticket_number}
        </p>
      </div>

      {/* ── Meta Grid ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetaItem
          icon={<Hash className="h-3.5 w-3.5" />}
          label="Ticket ID"
          value={<span className="font-mono">{initialTicket.ticket_number}</span>}
        />
        <MetaItem
          icon={<Activity className="h-3.5 w-3.5" />}
          label="Status"
          value={
            isAdmin ? (
              <div className="mt-0.5">
                <Select
                  value={ticketStatus}
                  disabled={isUpdatingStatus}
                  onValueChange={handleStatusChange}
                >
                  <SelectTrigger className="h-8 text-xs font-semibold bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 rounded-lg shadow-none">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open" className="text-xs font-semibold">
                      Open
                    </SelectItem>
                    <SelectItem value="in_progress" className="text-xs font-semibold">
                      In Progress
                    </SelectItem>
                    <SelectItem value="resolved" className="text-xs font-semibold">
                      Resolved
                    </SelectItem>
                    <SelectItem value="closed" className="text-xs font-semibold">
                      Closed
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <StatusBadge status={ticketStatus} />
            )
          }
        />
        <MetaItem
          icon={<CalendarClock className="h-3.5 w-3.5" />}
          label="Opened On"
          value={format(new Date(initialTicket.created_at), "MMM d, yyyy 'at' h:mm a")}
        />
        <MetaItem
          icon={<Mail className="h-3.5 w-3.5" />}
          label="Contact Email"
          value={
            <span className="truncate block max-w-[200px]" title={initialTicket.email}>
              {initialTicket.email}
            </span>
          }
        />
      </div>

      {/* ── Ticket Description ─────────────────────────────────────────── */}
      {initialTicket.description && (
        <div className="rounded-xl border bg-muted/30 p-4">
          <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <BookOpen className="h-3.5 w-3.5" />
            Description
          </p>
          <p className="overflow-hidden break-words whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
            {initialTicket.description}
          </p>
        </div>
      )}

      {/* ── Chat Container ─────────────────────────────────────────────── */}
      <Card className="h-[calc(100vh-20rem)] min-h-[500px] max-h-[750px] flex flex-col gap-0 overflow-hidden border border-zinc-200/80 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-950/20 backdrop-blur-sm shadow-none">
        <CardHeader className="flex flex-row items-center justify-between px-6 py-4 space-y-0 border-b border-border/40">
          <div className="flex flex-col gap-1">
            <CardTitle className="text-base font-semibold text-foreground">Ticket Conversation</CardTitle>
            <CardDescription className="text-xs text-muted-foreground/80">
              Collaborate and resolve support queries in real-time
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="flex-1 overflow-y-auto p-4 md:p-6 bg-transparent" ref={scrollContainerRef}>
          <TooltipProvider>
            <div className="space-y-6">
              {allMessages.map((msg, index) => {
                const isMyMessage = isAdmin
                  ? msg.sender_type === "support"
                  : msg.sender_type === "user";
                const showAvatar =
                  index === 0 || allMessages[index - 1].sender_type !== msg.sender_type;

                const displayName = msg.sender_type === "user"
                  ? (isAdmin ? (msg.profiles?.full_name || "Customer") : "You")
                  : `${msg.profiles?.full_name || "Support"} (Support)`;

                const email = msg.profiles?.email || "";

                return (
                  <div
                    key={msg.id}
                    className={cn(
                      "flex gap-3 max-w-[85%]",
                      isMyMessage ? "ml-auto flex-row-reverse" : "mr-auto"
                    )}
                  >
                    {/* Avatar */}
                    <div className="shrink-0 flex flex-col justify-start pt-1">
                      {showAvatar ? (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Avatar className="h-7 w-7 border border-border/40 shadow-none cursor-help">
                              {msg.profiles?.avatar_path && (
                                <AvatarImage
                                  src={
                                    msg.profiles.avatar_path.startsWith("http")
                                      ? msg.profiles.avatar_path
                                      : `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/avatars/${msg.profiles.avatar_path}`
                                  }
                                  alt="User"
                                  className="object-cover"
                                />
                              )}
                              <AvatarFallback
                                className={cn(
                                  "text-[10px] font-semibold",
                                  isMyMessage
                                    ? "bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                                    : "bg-zinc-900 text-zinc-50 dark:bg-zinc-100 dark:text-zinc-950"
                                )}
                              >
                                {msg.sender_type === "user" ? (
                                  <User className="h-3.5 w-3.5" />
                                ) : (
                                  <Headphones className="h-3.5 w-3.5" />
                                )}
                              </AvatarFallback>
                            </Avatar>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="text-[10px] py-1 px-2">
                            <p className="font-semibold">{displayName}</p>
                            {email && <p className="text-[9px] opacity-85">{email}</p>}
                          </TooltipContent>
                        </Tooltip>
                      ) : (
                        <div className="h-7 w-7" />
                      )}
                    </div>

                    {/* Message Bubble */}
                    <div
                      className={cn(
                        "flex flex-col gap-1",
                        isMyMessage ? "items-end" : "items-start"
                      )}
                    >
                      {showAvatar && (
                        <div className="flex items-baseline gap-1.5 px-1 mb-0.5">
                          <span className="text-[11px] font-semibold text-foreground/80">
                            {displayName}
                          </span>
                          <span className="text-[9px] text-muted-foreground font-medium">
                            {format(new Date(msg.created_at), "h:mm a")}
                          </span>
                        </div>
                      )}
                      <div
                        className={cn(
                          "px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap break-words rounded-2xl transition-all duration-200",
                          isMyMessage
                            ? "bg-zinc-900 text-zinc-50 dark:bg-zinc-100 dark:text-zinc-950 rounded-tr-sm"
                            : "bg-zinc-200/50 text-zinc-900 dark:bg-zinc-800/50 dark:text-zinc-100 rounded-tl-sm"
                        )}
                      >
                        {msg.message}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div className="h-2" />
            </div>
          </TooltipProvider>
        </CardContent>

        <Separator className="bg-border/40" />

        {/* Reply Form Area */}
        <CardFooter className="p-4 bg-zinc-50/80 dark:bg-zinc-950/40 block">
          <form
            onSubmit={handleSendMessage}
            className="relative flex items-end gap-2 max-w-full"
          >
            <Textarea
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type your reply here..."
              className="min-h-[44px] max-h-[120px] w-full resize-none rounded-xl pr-12 py-3 px-4 border border-border/50 bg-background dark:bg-zinc-900/60 focus-visible:ring-1 focus-visible:ring-ring text-sm transition-all shadow-none"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage(e);
                }
              }}
            />
            <Button
              type="submit"
              size="icon"
              disabled={!newMessage.trim() || isSubmitting}
              className="absolute right-1.5 bottom-1.5 h-8 w-8 rounded-lg shadow-none transition-all active:scale-95 bg-zinc-900 text-zinc-50 hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-zinc-200 disabled:opacity-30 disabled:pointer-events-none"
            >
              <Send className="h-3.5 w-3.5" />
              <span className="sr-only">Send</span>
            </Button>
          </form>
          <div className="flex justify-between items-center mt-2 px-1 text-[9px] text-muted-foreground/80 font-medium">
            <p>{isSubmitting ? "Sending..." : "Press Enter to send"}</p>
            <p>Shift + Enter for new line</p>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
