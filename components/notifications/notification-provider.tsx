"use client"

import * as React from "react"
import { toast } from "sonner"
import { createClient } from "@/lib/supabase/client"
// Removed server actions import - now using direct browser client Supabase with RLS
import type { NotificationItem, NotificationFilter } from "@/types/notifications"
import type { UserProfile } from "@/lib/supabase/profile"
import { Bell } from "lucide-react"

const PAGE_SIZE = 5

interface NotificationContextValue {
  notifications: NotificationItem[]
  unreadCount: number
  isLoading: boolean
  isLoadingMore: boolean
  hasMore: boolean
  filter: NotificationFilter
  setFilter: (filter: NotificationFilter) => void
  loadMore: () => Promise<void>
  markAsRead: (id: string) => Promise<void>
  markAllAsRead: () => Promise<void>
  deleteNotification: (id: string) => Promise<void>
  deleteAllNotifications: () => Promise<void>
  refresh: () => Promise<void>
  requestBrowserPermission: () => Promise<NotificationPermission>
}

const NotificationContext = React.createContext<NotificationContextValue | null>(null)

export function useNotifications() {
  const context = React.useContext(NotificationContext)
  if (!context) {
    throw new Error("useNotifications must be used within a NotificationProvider")
  }
  return context
}

interface NotificationProviderProps {
  user: UserProfile | null
  children: React.ReactNode
}

export function NotificationProvider({ user, children }: NotificationProviderProps) {
  const [notifications, setNotifications] = React.useState<NotificationItem[]>([])
  const [unreadCount, setUnreadCount] = React.useState<number>(0)
  const [totalCount, setTotalCount] = React.useState<number>(0)
  const [isLoading, setIsLoading] = React.useState<boolean>(true)
  const [isLoadingMore, setIsLoadingMore] = React.useState<boolean>(false)
  const [filter, setFilter] = React.useState<NotificationFilter>("all")

  const hasMore = notifications.length < totalCount

  // Load initial 5 notifications directly via client Supabase
  const loadNotifications = React.useCallback(async () => {
    if (!user?.id) {
      setNotifications([])
      setUnreadCount(0)
      setTotalCount(0)
      setIsLoading(false)
      return
    }

    try {
      setIsLoading(true)
      const supabase = createClient()

      let query = (supabase as any)
        .from("notifications")
        .select("*", { count: "exact" })
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })

      if (filter === "unread") {
        query = query.eq("is_read", false)
      }

      const [{ data, count, error }, unreadRes] = await Promise.all([
        query.range(0, PAGE_SIZE - 1),
        (supabase as any)
          .from("notifications")
          .select("*", { count: "exact", head: true })
          .eq("user_id", user.id)
          .eq("is_read", false),
      ])

      if (error) {
        console.error("[NOTIFICATION_PROVIDER] Error loading notifications:", error)
        return
      }

      setNotifications((data || []) as NotificationItem[])
      setUnreadCount(unreadRes.count ?? 0)
      setTotalCount(count ?? 0)
    } catch (err) {
      console.error("[NOTIFICATION_PROVIDER] Error loading notifications:", err)
    } finally {
      setIsLoading(false)
    }
  }, [user?.id, filter])

  // Load next 5 notifications on scroll directly via client Supabase
  const loadMore = React.useCallback(async () => {
    if (!user?.id || isLoadingMore || !hasMore || isLoading) return

    try {
      setIsLoadingMore(true)
      const offset = notifications.length
      const supabase = createClient()

      let query = (supabase as any)
        .from("notifications")
        .select("*", { count: "exact" })
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })

      if (filter === "unread") {
        query = query.eq("is_read", false)
      }

      const { data, count, error } = await query.range(offset, offset + PAGE_SIZE - 1)

      if (error) {
        console.error("[NOTIFICATION_PROVIDER] Error loading more notifications:", error)
        return
      }

      const incoming = (data || []) as NotificationItem[]
      setNotifications((prev) => {
        const existingIds = new Set(prev.map((n) => n.id))
        const filtered = incoming.filter((n) => !existingIds.has(n.id))
        return [...prev, ...filtered]
      })
      setTotalCount(count ?? 0)
    } catch (err) {
      console.error("[NOTIFICATION_PROVIDER] Error loading more notifications:", err)
    } finally {
      setIsLoadingMore(false)
    }
  }, [user?.id, isLoadingMore, hasMore, isLoading, filter, notifications.length])

  React.useEffect(() => {
    loadNotifications()
  }, [loadNotifications])

  // Real-time Supabase subscription
  React.useEffect(() => {
    if (!user?.id) return

    const supabase = createClient()
    const channelName = `realtime-notifications-${user.id}`

    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const newNotif = payload.new as NotificationItem
          setNotifications((prev) => [newNotif, ...prev.filter((n) => n.id !== newNotif.id)])
          setUnreadCount((prev) => prev + 1)
          setTotalCount((prev) => prev + 1)

          // Show Toast notification
          toast(newNotif.title, {
            description: newNotif.message,
            icon: <Bell className="size-4 text-foreground animate-bounce" />,
            action: newNotif.link
              ? {
                  label: "View",
                  onClick: () => {
                    if (typeof window !== "undefined") {
                      if (newNotif.link!.startsWith("http://") || newNotif.link!.startsWith("https://")) {
                        window.open(newNotif.link!, "_blank", "noopener,noreferrer")
                      } else {
                        window.location.href = newNotif.link!
                      }
                    }
                  },
                }
              : undefined,
          })

          // Trigger native Web Desktop Notification if permitted
          if (
            typeof window !== "undefined" &&
            "Notification" in window &&
            Notification.permission === "granted" &&
            document.hidden
          ) {
            try {
              new Notification(newNotif.title, {
                body: newNotif.message,
                icon: "/favicon.ico",
              })
            } catch {
              // Ignore native notification errors
            }
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const updated = payload.new as NotificationItem
          setNotifications((prev) => {
            const prevItem = prev.find((n) => n.id === updated.id)
            if (prevItem && !prevItem.is_read && updated.is_read) {
              setUnreadCount((c) => Math.max(0, c - 1))
            } else if (prevItem && prevItem.is_read && !updated.is_read) {
              setUnreadCount((c) => c + 1)
            }
            return prev.map((n) => (n.id === updated.id ? updated : n))
          })
        }
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const deletedId = (payload.old as any)?.id
          if (deletedId) {
            setNotifications((prev) => {
              const item = prev.find((n) => n.id === deletedId)
              if (item && !item.is_read) {
                setUnreadCount((c) => Math.max(0, c - 1))
              }
              return prev.filter((n) => n.id !== deletedId)
            })
            setTotalCount((prev) => Math.max(0, prev - 1))
          }
        }
      )
      .subscribe((status) => {
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          // Realtime WebSocket might not be reverse-proxied on self-hosted domain; polling/REST serves as fallback
        }
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user?.id])

  const markAsRead = React.useCallback(async (id: string) => {
    if (!user?.id) return
    // Optimistic update
    setNotifications((prev) => {
      if (filter === "unread") {
        return prev.filter((n) => n.id !== id)
      }
      return prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
    })
    if (filter === "unread") {
      setTotalCount((prev) => Math.max(0, prev - 1))
    }
    setUnreadCount((prev) => Math.max(0, prev - 1))

    try {
      const supabase = createClient()
      const { error } = await (supabase as any)
        .from("notifications")
        .update({ is_read: true })
        .eq("id", id)
        .eq("user_id", user.id)

      if (error) {
        console.error("[NOTIFICATIONS] Failed to mark as read:", error)
      }
    } catch (err) {
      console.error("[NOTIFICATIONS] Exception marking as read:", err)
    }
  }, [filter, user?.id])

  const markAllAsRead = React.useCallback(async () => {
    if (!user?.id) return
    // Snapshot for rollback in case of network/server error
    const prevNotifications = notifications
    const prevUnreadCount = unreadCount
    const prevTotalCount = totalCount

    // Optimistic UI update across all visible items
    if (filter === "unread") {
      setNotifications([])
      setTotalCount(0)
    } else {
      setNotifications((prev) =>
        prev.map((n) => (n.is_read ? n : { ...n, is_read: true }))
      )
    }
    setUnreadCount(0)

    try {
      const supabase = createClient()
      const { error } = await (supabase as any)
        .from("notifications")
        .update({ is_read: true })
        .eq("user_id", user.id)
        .eq("is_read", false)

      if (error) {
        // Rollback on failure
        setNotifications(prevNotifications)
        setUnreadCount(prevUnreadCount)
        setTotalCount(prevTotalCount)
        toast.error(error.message || "Failed to mark all as read")
        return
      }
      toast.success("All notifications marked as read")
    } catch (err: any) {
      // Rollback on exception
      setNotifications(prevNotifications)
      setUnreadCount(prevUnreadCount)
      setTotalCount(prevTotalCount)
      toast.error(err?.message || "Failed to mark all as read")
    }
  }, [filter, notifications, unreadCount, totalCount, user?.id])

  const deleteNotification = React.useCallback(async (id: string) => {
    if (!user?.id) return
    const itemToDelete = notifications.find((n) => n.id === id)
    // Optimistic update
    setNotifications((prev) => prev.filter((n) => n.id !== id))
    setTotalCount((prev) => Math.max(0, prev - 1))
    if (itemToDelete && !itemToDelete.is_read) {
      setUnreadCount((prev) => Math.max(0, prev - 1))
    }

    try {
      const supabase = createClient()
      await (supabase as any)
        .from("notifications")
        .delete()
        .eq("id", id)
        .eq("user_id", user.id)
    } catch (err) {
      console.error("[NOTIFICATIONS] Error deleting notification:", err)
    }
  }, [notifications, user?.id])

  const deleteAllNotifications = React.useCallback(async () => {
    if (!user?.id) return
    const prevNotifications = notifications
    const prevUnreadCount = unreadCount
    const prevTotalCount = totalCount

    // Optimistic clear
    setNotifications([])
    setUnreadCount(0)
    setTotalCount(0)

    try {
      const supabase = createClient()
      const { error } = await (supabase as any)
        .from("notifications")
        .delete()
        .eq("user_id", user.id)

      if (error) {
        setNotifications(prevNotifications)
        setUnreadCount(prevUnreadCount)
        setTotalCount(prevTotalCount)
        toast.error(error.message || "Failed to delete all notifications")
        return
      }
      toast.success("All notifications deleted")
    } catch {
      setNotifications(prevNotifications)
      setUnreadCount(prevUnreadCount)
      setTotalCount(prevTotalCount)
      toast.error("Failed to delete all notifications")
    }
  }, [notifications, unreadCount, totalCount, user?.id])

  const requestBrowserPermission = React.useCallback(async (): Promise<NotificationPermission> => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      return "denied"
    }
    try {
      const permission = await Notification.requestPermission()
      if (permission === "granted") {
        toast.success("Desktop notifications enabled!")
      }
      return permission
    } catch {
      return "denied"
    }
  }, [])

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        isLoading,
        isLoadingMore,
        hasMore,
        filter,
        setFilter,
        loadMore,
        markAsRead,
        markAllAsRead,
        deleteNotification,
        deleteAllNotifications,
        refresh: loadNotifications,
        requestBrowserPermission,
      }}
    >
      {children}
    </NotificationContext.Provider>
  )
}
