"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import {
  Bell,
  CheckCheck,
  Trash2,
  Sparkles,
  ChevronRight,
  Rocket,
  LifeBuoy,
  FileCheck,
  AlertCircle,
  Megaphone,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { startNavigationProgress } from "@/components/ui/navigation-progress"
import { useNotifications } from "@/components/notifications/notification-provider"
import type { NotificationItem } from "@/types/notifications"

import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"

// ── Time & Formatting Helpers ────────────────────────────────────────────────

function formatRelativeTime(dateString: string): string {
  try {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffSec = Math.floor(diffMs / 1000)
    const diffMin = Math.floor(diffSec / 60)
    const diffHour = Math.floor(diffMin / 60)
    const diffDay = Math.floor(diffHour / 24)

    if (diffSec < 60) return "Just now"
    if (diffMin < 60) return `${diffMin}m ago`
    if (diffHour < 24) return `${diffHour}h ago`
    if (diffDay === 1) return "Yesterday"
    if (diffDay < 7) return `${diffDay}d ago`

    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    })
  } catch {
    return ""
  }
}

function formatCompactCount(count: number): string {
  if (count <= 0) return ""
  if (count > 99) return "99+"
  return count.toString()
}

function getNotificationIcon(notif: NotificationItem) {
  const type = notif.metadata?.type || ""
  if (type === "announcement" || notif.title.includes("v1.") || notif.title.includes("🚀")) {
    return <Rocket className="size-3.5 text-primary" />
  }
  if (type === "ticket" || type === "support") {
    return <LifeBuoy className="size-3.5 text-blue-500" />
  }
  if (type === "test" || type === "exam") {
    return <FileCheck className="size-3.5 text-emerald-500" />
  }
  if (type === "alert" || type === "warning") {
    return <AlertCircle className="size-3.5 text-amber-500" />
  }
  return <Megaphone className="size-3.5 text-muted-foreground" />
}

// ── Main Popover Component ───────────────────────────────────────────────────

export function NotificationsPopover() {
  const router = useRouter()
  const [open, setOpen] = React.useState(false)
  const [confirmDeleteOpen, setConfirmDeleteOpen] = React.useState(false)

  const {
    notifications,
    unreadCount,
    isLoading,
    isLoadingMore,
    hasMore,
    loadMore,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    deleteAllNotifications,
  } = useNotifications()

  const viewportRef = React.useRef<HTMLDivElement>(null)
  const observerTarget = React.useRef<HTMLDivElement>(null)

  // Infinite scroll trigger via scroll proximity
  const handleScroll = React.useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      if (!hasMore || isLoadingMore || isLoading) return
      const target = e.currentTarget
      const threshold = 120
      if (target.scrollHeight - target.scrollTop - target.clientHeight < threshold) {
        loadMore()
      }
    },
    [hasMore, isLoadingMore, isLoading, loadMore]
  )

  // IntersectionObserver backup for bottom sentinel
  React.useEffect(() => {
    if (!open || !hasMore || isLoadingMore || isLoading) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          loadMore()
        }
      },
      { threshold: 0.1, rootMargin: "80px" }
    )

    const target = observerTarget.current
    if (target) observer.observe(target)

    return () => {
      if (target) observer.unobserve(target)
      observer.disconnect()
    }
  }, [open, hasMore, isLoadingMore, isLoading, loadMore, notifications.length])

  const handleNotificationClick = (notif: NotificationItem) => {
    if (!notif.is_read) {
      markAsRead(notif.id).catch((err) =>
        console.error("[NOTIFICATIONS] Error marking as read:", err)
      )
    }

    if (notif.link) {
      setOpen(false)
      if (notif.link.startsWith("http://") || notif.link.startsWith("https://")) {
        window.open(notif.link, "_blank", "noopener,noreferrer")
      } else {
        startNavigationProgress()
        router.push(notif.link)
      }
    }
  }

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="relative size-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors shrink-0"
            aria-label={unreadCount > 0 ? `${unreadCount} unread notifications` : "Notifications"}
          >
            <Bell className="size-4" />
            {unreadCount > 0 && (
              <span
                className={cn(
                  "absolute top-0.5 right-0.5 flex items-center justify-center font-bold tabular-nums pointer-events-none",
                  "bg-foreground text-background shadow-xs ring-[1.5px] ring-background rounded-full transition-all duration-200 animate-in fade-in zoom-in-75",
                  unreadCount > 9 ? "min-w-3.5 h-3.5 px-0.5 text-[8px]" : "size-3.5 text-[8.5px]"
                )}
              >
                {formatCompactCount(unreadCount)}
              </span>
            )}
          </Button>
        </PopoverTrigger>

        <PopoverContent
          align="end"
          sideOffset={8}
          collisionPadding={12}
          onOpenAutoFocus={(e) => e.preventDefault()}
          className="w-[calc(100vw-24px)] sm:w-95 max-w-95 p-0 rounded-2xl overflow-hidden shadow-xl border bg-popover text-popover-foreground box-border"
        >
          {/* ── Popover Header ──────────────────────────────────────── */}
          <div className="flex h-11 items-center justify-between px-3.5 border-b border-border/70 bg-card/60 backdrop-blur-xs">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-xs font-bold tracking-tight text-foreground">Notifications</span>
              {unreadCount > 0 && (
                <span className="inline-flex items-center justify-center px-1.5 py-0.5 text-[10px] font-semibold bg-muted text-foreground rounded-full tabular-nums shrink-0">
                  {formatCompactCount(unreadCount)} unread
                </span>
              )}
            </div>

            <div className="flex items-center gap-1 shrink-0">
              {unreadCount > 0 && (
                <TooltipProvider delayDuration={300}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={markAllAsRead}
                        className="size-7 rounded-md text-muted-foreground hover:text-foreground transition-colors"
                        aria-label="Mark all as read"
                      >
                        <CheckCheck className="size-3.5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="text-xs">
                      Mark all as read
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}

              {notifications.length > 0 && (
                <TooltipProvider delayDuration={300}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setConfirmDeleteOpen(true)}
                        className="size-7 rounded-md text-muted-foreground hover:text-destructive transition-colors"
                        aria-label="Delete all notifications"
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="text-xs">
                      Delete all notifications
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
          </div>

          {/* ── Scrollable Feed ─────────────────────────────────────── */}
          <ScrollArea
            className="h-85 w-full [&>div]:block! overflow-x-hidden"
            viewportRef={viewportRef}
            onScroll={handleScroll}
          >
            {isLoading ? (
              <div className="flex h-85 items-center justify-center text-xs text-muted-foreground">
                Loading notifications...
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex h-85 items-center justify-center p-4">
                <Empty className="border-none p-0">
                  <EmptyHeader>
                    <EmptyMedia variant="icon" className="size-9 rounded-full mb-1.5 bg-muted">
                      <Sparkles className="size-4 text-muted-foreground" />
                    </EmptyMedia>
                    <EmptyTitle className="text-xs font-medium text-foreground">
                      You&apos;re all caught up
                    </EmptyTitle>
                    <EmptyDescription className="text-[11px] text-muted-foreground">
                      No new notifications right now.
                    </EmptyDescription>
                  </EmptyHeader>
                </Empty>
              </div>
            ) : (
              <div className="divide-y divide-border/50 w-full min-w-0">
                {notifications.map((notif) => (
                  <div
                    key={notif.id}
                    onClick={() => handleNotificationClick(notif)}
                    className={cn(
                      "group relative flex items-start gap-3 p-3 transition-colors cursor-pointer hover:bg-muted/40 w-full min-w-0 box-border overflow-hidden",
                      !notif.is_read && "bg-muted/15"
                    )}
                  >
                    {/* Category Icon Badge */}
                    <div className="size-7 rounded-lg bg-muted/80 flex items-center justify-center shrink-0 mt-0.5 border border-border/50">
                      {getNotificationIcon(notif)}
                    </div>

                    {/* Content Column */}
                    <div className="flex-1 min-w-0 flex flex-col gap-0.5 pr-5 overflow-hidden">
                      <div className="flex items-center justify-between gap-1.5 min-w-0 w-full overflow-hidden">
                        <span
                          className={cn(
                            "text-xs truncate min-w-0 flex-1 block font-medium",
                            !notif.is_read
                              ? "font-semibold text-foreground"
                              : "text-muted-foreground"
                          )}
                          title={notif.title}
                        >
                          {notif.title}
                        </span>
                        <span className="text-[10px] text-muted-foreground shrink-0 font-normal tabular-nums">
                          {formatRelativeTime(notif.created_at)}
                        </span>
                      </div>

                      <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed whitespace-normal wrap-break-word break-all min-w-0 w-full overflow-hidden block">
                        {notif.message}
                      </p>

                      {notif.link && (
                        <div className="inline-flex items-center gap-0.5 mt-0.5 text-[10px] font-medium text-foreground group-hover:text-primary transition-colors">
                          <span>View</span>
                          <ChevronRight className="size-2.5" />
                        </div>
                      )}
                    </div>

                    {/* Unread dot indicator */}
                    {!notif.is_read && (
                      <span className="absolute right-3 top-3.5 size-1.5 rounded-full bg-foreground shrink-0" />
                    )}

                    {/* Quick Delete button on hover */}
                    <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation()
                          deleteNotification(notif.id)
                        }}
                        className="size-6 text-muted-foreground hover:text-destructive transition-colors"
                        title="Delete notification"
                      >
                        <Trash2 className="size-3" />
                      </Button>
                    </div>
                  </div>
                ))}

                {/* Infinite Scroll Sentinel */}
                {hasMore && (
                  <div
                    ref={observerTarget}
                    className="py-2.5 flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground"
                  >
                    {isLoadingMore && (
                      <>
                        <div className="size-3 rounded-full border-2 border-muted-foreground border-t-transparent animate-spin" />
                        <span>Loading more...</span>
                      </>
                    )}
                  </div>
                )}
              </div>
            )}
          </ScrollArea>
        </PopoverContent>
      </Popover>

      {/* ── Confirmation Dialog for Bulk Delete ────────────────────── */}
      <AlertDialog open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete all notifications?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove all notifications from your inbox. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                deleteAllNotifications()
                setConfirmDeleteOpen(false)
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete All
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
