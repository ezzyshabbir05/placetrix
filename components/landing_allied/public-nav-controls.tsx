"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  User,
  Settings,
  HelpCircle,
  History,
  LogOut,
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { AnimatedThemeToggler } from "@/components/ui/animated-theme-toggler"
import Image from "next/image"
import PlaceTrixLogo from "@/assets/placetrix.svg"
import { cn } from "@/lib/utils"
import { createClient } from "@/lib/supabase/client"
import { buildStorageUrl } from "@/lib/storage"
import type { UserProfile } from "@/lib/supabase/profile"

export function useMounted() {
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  return mounted
}

export function useScrolled(threshold = 10) {
  const [scrolled, setScrolled] = React.useState(false)

  React.useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > threshold)
    }

    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })

    return () => {
      window.removeEventListener("scroll", onScroll)
    }
  }, [threshold])

  return scrolled
}

export function Logo() {
  return (
    <div className="flex shrink-0 items-center justify-center">
      <Image
        src={PlaceTrixLogo}
        alt="PlaceTrix"
        width={24}
        height={24}
        className="size-6 dark:invert"
        priority
      />
    </div>
  )
}

export function PublicThemeToggle({ className }: { className?: string }) {
  return (
    <AnimatedThemeToggler
      variant="circle"
      className={cn(
        "size-8 rounded-md border border-black/10 bg-white/70 text-zinc-900 hover:bg-black/5 dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10 transition-colors shrink-0 inline-flex items-center justify-center cursor-pointer",
        className
      )}
    />
  )
}

export function UserAvatar({
  user,
  className,
}: {
  user: UserProfile
  className?: string
}) {
  const displayName = user.full_name?.trim() || "User"
  const initials = user.full_name?.trim()
    ? displayName
        .split(" ")
        .filter(Boolean)
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : (user.email?.trim()[0]?.toUpperCase() ?? "?")

  const avatarUrl = buildStorageUrl("avatars", user.avatar_path ?? null)

  return (
    <Avatar className={cn("size-8 rounded-full border border-border/80", className)}>
      <AvatarImage
        src={avatarUrl ?? undefined}
        alt={displayName}
        className="object-cover"
      />
      <AvatarFallback className="rounded-full bg-muted text-xs font-semibold">
        {initials}
      </AvatarFallback>
    </Avatar>
  )
}

export function UserAvatarMenu({ user }: { user: UserProfile }) {
  const router = useRouter()
  const [isLoggingOut, setIsLoggingOut] = React.useState(false)

  const displayName = user.full_name?.trim() || "User"
  const email = user.email?.trim() || "No email"
  const initials = user.full_name?.trim()
    ? displayName
        .split(" ")
        .filter(Boolean)
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : (user.email?.trim()[0]?.toUpperCase() ?? "?")
  const avatarUrl = buildStorageUrl("avatars", user.avatar_path ?? null)

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true)
      const supabase = createClient()
      await supabase.auth.signOut({ scope: "local" })
      router.push("/")
      router.refresh()
    } catch (err) {
      console.error("Failed to log out:", err)
      setIsLoggingOut(false)
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className={cn(
            "size-8 flex items-center justify-center rounded-full outline-none ring-offset-background",
            "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            "transition-all duration-150 hover:ring-2 hover:ring-border/80 cursor-pointer shrink-0"
          )}
          aria-label="Open user menu"
        >
          <div className="relative">
            <Avatar className="size-8 rounded-full border border-border/80">
              <AvatarImage
                src={avatarUrl ?? undefined}
                alt={displayName}
                className="object-cover"
              />
              <AvatarFallback className="rounded-full bg-muted text-xs font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>
          </div>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        sideOffset={8}
        className="w-56 rounded-xl p-1.5 [&_svg]:stroke-[2.5]"
      >
        {/* ── Identity ─────────────────────── */}
        <DropdownMenuLabel className="p-2 font-normal">
          <div className="flex items-start gap-2.5 text-sm">
            <Avatar className="size-9 rounded-lg shrink-0 border border-border/60 mt-0.5">
              <AvatarImage
                src={avatarUrl ?? undefined}
                alt={displayName}
                className="object-cover"
              />
              <AvatarFallback className="rounded-lg text-xs font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col flex-1 min-w-0 gap-0.5">
              <span className="font-semibold text-sm leading-tight text-foreground truncate">
                {displayName}
              </span>
              <span className="text-xs text-muted-foreground truncate leading-tight">
                {email}
              </span>
            </div>
          </div>
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        {/* ── Account Links ─────────────────── */}
        <DropdownMenuGroup>
          <DropdownMenuItem asChild className="cursor-pointer">
            <Link href="/myprofile">
              <User className="size-4 shrink-0" />
              <span>My Profile</span>
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild className="cursor-pointer">
            <Link href="/settings">
              <Settings className="size-4 shrink-0" />
              <span>Settings</span>
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild className="cursor-pointer">
            <Link href="/gethelp">
              <HelpCircle className="size-4 shrink-0" />
              <span>Get Help</span>
            </Link>
          </DropdownMenuItem>
        </DropdownMenuGroup>

        <DropdownMenuSeparator />

        {/* ── Changelog ─────────────────────── */}
        <DropdownMenuItem asChild className="cursor-pointer">
          <Link href="/changelog">
            <History className="size-4 shrink-0" />
            <span>Changelog</span>
          </Link>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        {/* ── Logout ────────────────────────── */}
        <DropdownMenuItem
          variant="destructive"
          onClick={handleLogout}
          disabled={isLoggingOut}
          className="cursor-pointer"
        >
          <LogOut className="size-4 shrink-0" />
          {isLoggingOut ? "Logging out..." : "Log out"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function MobileUserCard({
  user,
  onClose,
}: {
  user: UserProfile
  onClose?: () => void
}) {
  const handleLogout = async () => {
    onClose?.()
    try {
      const supabase = createClient()
      await supabase.auth.signOut({ scope: "local" })
      window.location.href = "/"
    } catch (err) {
      console.error("Logout error:", err)
    }
  }

  return (
    <div className="mb-3 flex flex-col gap-2 rounded-xl border border-black/10 bg-black/3 p-3 dark:border-white/10 dark:bg-white/4">
      <Link
        href="/home"
        onClick={onClose}
        className="flex items-center gap-3"
      >
        <UserAvatar user={user} className="size-10" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-zinc-900 dark:text-white">
            {user.full_name || "Your account"}
          </p>
          <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">
            {user.email}
          </p>
        </div>
      </Link>
      <div className="flex items-center gap-2 pt-2 border-t border-black/10 dark:border-white/10">
        <Link
          href="/myprofile"
          onClick={onClose}
          className="flex-1 rounded-lg bg-black/5 py-1.5 text-center text-xs font-medium text-zinc-800 hover:bg-black/10 dark:bg-white/10 dark:text-zinc-200 dark:hover:bg-white/15"
        >
          Profile
        </Link>
        <button
          type="button"
          onClick={handleLogout}
          className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-red-500/10 py-1.5 text-center text-xs font-medium text-red-600 hover:bg-red-500/20 dark:bg-red-500/20 dark:text-red-400 dark:hover:bg-red-500/30 cursor-pointer"
        >
          <LogOut className="size-3.5" />
          <span>Log out</span>
        </button>
      </div>
    </div>
  )
}
