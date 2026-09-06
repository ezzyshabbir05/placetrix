"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter, usePathname } from "next/navigation"
import {
  Bell,
  User,
  Settings,
  HelpCircle,
  LogOut,
  History,
  Menu,
  X,
  Sun,
  Moon,
} from "lucide-react"
import { useTheme } from "next-themes"
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
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import { createClient } from "@/lib/supabase/client"
import { buildStorageUrl } from "@/lib/storage"
import { NotificationsPopover } from "@/components/notifications/notifications-popover"
import { AnimatedThemeToggler } from "@/components/ui/animated-theme-toggler"
import type { UserProfile } from "@/lib/supabase/profile"

function getRouteTitle(pathname: string): string {
  if (pathname === "/home" || pathname === "/") return "Home"
  if (pathname.startsWith("/courses")) return "Courses"
  if (pathname.startsWith("/tests")) return "Tests"
  if (pathname.startsWith("/events")) return "Events"
  if (pathname.startsWith("/logiclab")) return "Logic Lab"
  if (pathname.startsWith("/opportunities")) return "Opportunities"
  if (pathname.startsWith("/users")) return "Users"
  if (pathname.startsWith("/licenses")) return "Licenses"
  if (pathname.startsWith("/analytics")) return "Analytics"
  if (pathname.startsWith("/candidates")) return "Candidates"
  if (pathname.startsWith("/settings")) return "Settings"
  if (pathname.startsWith("/myprofile")) return "My Profile"
  if (pathname.startsWith("/support")) return "Support Queue"
  if (pathname.startsWith("/gethelp")) return "Get Help"
  if (pathname.startsWith("/groups")) return "Cohorts & Groups"
  if (pathname.startsWith("/changelog")) return "Changelog"

  const segment = pathname.split("/").filter(Boolean)[0]
  if (!segment) return "Dashboard"
  return segment.charAt(0).toUpperCase() + segment.slice(1)
}

function ThemeToggleWithTooltip() {
  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <AnimatedThemeToggler
            variant="circle"
            className="size-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors shrink-0"
          />
        </TooltipTrigger>
        <TooltipContent side="bottom">Toggle theme</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

// ─── DashboardTopbar ──────────────────────────────────────────────────────────

interface DashboardTopbarProps {
  user: UserProfile | null
  onMenuClick?: () => void
  mobileOpen?: boolean
}

export function DashboardTopbar({ user, onMenuClick, mobileOpen }: DashboardTopbarProps) {
  const router = useRouter()
  const pathname = usePathname()

  const displayName = user?.full_name?.trim() || "User"
  const email = user?.email?.trim() || "No email"
  const initials = user?.full_name?.trim()
    ? displayName.split(" ").filter(Boolean).map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : (user?.email?.trim()[0]?.toUpperCase() ?? "?")
  const avatarUrl = buildStorageUrl("avatars", user?.avatar_path ?? null)
  const pageTitle = getRouteTitle(pathname)

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut({ scope: "local" })
    router.push("/auth/login")
    router.refresh()
  }

  return (
    <>
      <header className="flex h-12 w-full shrink-0 items-center justify-between border-b border-border bg-background z-20 px-3 md:px-4">
        {/* ── Left: Hamburger trigger + Page Title ───────────────────────── */}
        <div className="flex items-center gap-2 min-w-0">
          <Button
            variant="ghost"
            size="icon"
            className="size-8 rounded-lg md:hidden text-muted-foreground hover:text-foreground hover:bg-muted/60 shrink-0"
            onClick={onMenuClick}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="size-4" /> : <Menu className="size-4" />}
          </Button>

          <h1 className="text-sm font-semibold text-foreground tracking-tight truncate select-none pl-0.5 md:pl-1">
            {pageTitle}
          </h1>
        </div>

        {/* ── Right: Theme Toggle + Notification + Divider + Avatar ───────── */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Theme Toggle */}
          <ThemeToggleWithTooltip />

          {/* Notifications Popover */}
          <NotificationsPopover />

          {/* Subtle Divider */}
          <div className="h-4 w-px bg-border/60 mx-1 shrink-0" aria-hidden="true" />

          {/* Avatar Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild disabled={!user}>
              <button
                className={cn(
                  "size-8 flex items-center justify-center rounded-full outline-none ring-offset-background",
                  "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                  "transition-all duration-150 hover:ring-2 hover:ring-border/80 cursor-pointer shrink-0",
                  !user && "cursor-default"
                )}
                aria-label="Open user menu"
              >
                {user ? (
                  <div className="relative">
                    <Avatar className="size-8 rounded-full border border-border/80">
                      <AvatarImage src={avatarUrl ?? undefined} alt={displayName} className="object-cover" />
                      <AvatarFallback className="rounded-full bg-muted text-xs font-semibold">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                ) : (
                  <Skeleton className="size-8 rounded-full" />
                )}
              </button>
            </DropdownMenuTrigger>

            {user && (
              <DropdownMenuContent
                align="end"
                sideOffset={8}
                className="w-56 rounded-xl p-1.5 [&_svg]:stroke-[2.5]"
              >
                {/* ── Identity ─────────────────────── */}
                <DropdownMenuLabel className="p-2 font-normal">
                  <div className="flex items-start gap-2.5 text-sm">
                    <Avatar className="size-9 rounded-lg shrink-0 border border-border/60 mt-0.5">
                      <AvatarImage src={avatarUrl ?? undefined} alt={displayName} className="object-cover" />
                      <AvatarFallback className="rounded-lg text-xs font-semibold">{initials}</AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col flex-1 min-w-0 gap-0.5">
                      <span className="font-semibold text-sm leading-tight text-foreground truncate">{displayName}</span>
                      <span className="text-xs text-muted-foreground truncate leading-tight">{email}</span>
                    </div>
                  </div>
                </DropdownMenuLabel>

                <DropdownMenuSeparator />

                {/* ── Account Links ─────────────────── */}
                <DropdownMenuGroup>
                  <DropdownMenuItem asChild className="cursor-pointer">
                    <Link href="/myprofile" prefetch={false}>
                      <User className="size-4 shrink-0" />
                      <span>My Profile</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild className="cursor-pointer">
                    <Link href="/settings" prefetch={false}>
                      <Settings className="size-4 shrink-0" />
                      <span>Settings</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild className="cursor-pointer">
                    <Link href="/gethelp" prefetch={false}>
                      <HelpCircle className="size-4 shrink-0" />
                      <span>Get Help</span>
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuGroup>

                <DropdownMenuSeparator />

                {/* ── Changelog ─────────────────────── */}
                <DropdownMenuItem asChild className="cursor-pointer">
                  <Link href="/changelog" prefetch={false}>
                    <History className="size-4 shrink-0" />
                    <span>Changelog</span>
                  </Link>
                </DropdownMenuItem>

                <DropdownMenuSeparator />

                {/* ── Logout ────────────────────────── */}
                <DropdownMenuItem
                  variant="destructive"
                  onClick={handleLogout}
                  className="cursor-pointer"
                >
                  <LogOut className="size-4 shrink-0" />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            )}
          </DropdownMenu>
        </div>
      </header>
    </>
  )
}
