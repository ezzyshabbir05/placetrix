"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Home,
  Terminal,
  BookOpen,
  ClipboardCheck,
  Users,
  FolderKanban,
  Calendar,
  Briefcase,
  Wrench,
  Building2,
  ShieldCheck,
  HelpCircle,
  Heart,
  Lock,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { useLicense } from "@/components/license/LicenseProvider"
import type { AccountType, UserProfile } from "@/lib/supabase/profile"
import { Logo } from "@/components/logo"
import { Badge } from "@/components/ui/badge"
import { version } from "@/package.json"


// ─── Nav definitions ──────────────────────────────────────────────────────────


type NavItem = {
  title: string
  url: string
  icon: React.ComponentType<any>
}

const VALID_ACCOUNT_TYPES: AccountType[] = [
  "admin",
  "institute_candidate",
  "institute_primary",
  "institute_staff",
  "institute_placement_officer",
]

const NAV_MAIN: Record<AccountType, NavItem[]> = {
  institute_candidate: [
    { title: "Home", url: "/home", icon: Home },
    { title: "Logic Lab", url: "/logiclab", icon: Terminal },
    { title: "Courses", url: "/courses", icon: BookOpen },
    { title: "Tests", url: "/tests", icon: ClipboardCheck },
    { title: "Cohorts", url: "/cohorts", icon: FolderKanban },
    { title: "Events", url: "/events", icon: Calendar },
    { title: "Opportunities", url: "/opportunities", icon: Briefcase },
    { title: "Tools", url: "/tools", icon: Wrench },
  ],
  institute_primary: [
    { title: "Home", url: "/home", icon: Home },
    { title: "Users", url: "/users", icon: Users },
    { title: "Cohorts", url: "/cohorts", icon: FolderKanban },
    { title: "Tests", url: "/tests", icon: ClipboardCheck },
    { title: "Events", url: "/events", icon: Calendar },
    { title: "Opportunities", url: "/opportunities", icon: Briefcase },
    { title: "Companies", url: "/companies", icon: Building2 },
  ],
  institute_staff: [
    { title: "Home", url: "/home", icon: Home },
    { title: "Cohorts", url: "/cohorts", icon: FolderKanban },
    { title: "Tests", url: "/tests", icon: ClipboardCheck },
    { title: "Events", url: "/events", icon: Calendar },
  ],
  institute_placement_officer: [
    { title: "Home", url: "/home", icon: Home },
    { title: "Cohorts", url: "/cohorts", icon: FolderKanban },
    { title: "Tests", url: "/tests", icon: ClipboardCheck },
    { title: "Events", url: "/events", icon: Calendar },
    { title: "Opportunities", url: "/opportunities", icon: Briefcase },
    { title: "Companies", url: "/companies", icon: Building2 },
  ],
  admin: [
    { title: "Home", url: "/home", icon: Home },
    { title: "Licenses", url: "/licenses", icon: ShieldCheck },
    { title: "Courses", url: "/courses", icon: BookOpen },
    { title: "LogicLab", url: "/logiclab/admin", icon: Terminal },
    { title: "Support Queue", url: "/support", icon: HelpCircle },
  ],
}

const NAV_SECONDARY: NavItem[] = [
  { title: "Our Team", url: "/our-team", icon: Heart },
]

const VALID_ACCOUNT_TYPE_SET = new Set<string>(VALID_ACCOUNT_TYPES)

function safeAccountType(type: string | null | undefined): AccountType {
  return VALID_ACCOUNT_TYPE_SET.has(type ?? "")
    ? (type as AccountType)
    : "institute_candidate"
}


// ─── NavItem button ───────────────────────────────────────────────────────────


interface NavItemButtonProps {
  item: NavItem
  isActive: boolean
  isLocked?: boolean
  lockReason?: string
}

function NavItemButton({ item, isActive, isLocked, lockReason }: NavItemButtonProps) {
  const Icon = isLocked ? Lock : item.icon

  const inner = (
    <div
      className={cn(
        "group/navbtn flex h-9 w-full items-center rounded-sm transition-colors duration-150 ease-out cursor-pointer",
        isActive && !isLocked
          ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
          : !isLocked && "text-sidebar-foreground/85 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
        isLocked && "opacity-50 cursor-not-allowed text-sidebar-foreground/50 hover:bg-transparent",
      )}
    >
      {/* Icon outer container — 36x36px square, perfectly centered icon */}
      <div className="flex size-9 shrink-0 items-center justify-center">
        <Icon className="size-4 shrink-0 transition-transform duration-150 group-hover/navbtn:scale-105" />
      </div>

      {/* Label — fades in on desktop hover or mobile open */}
      <span className="whitespace-nowrap text-[15px] leading-none opacity-0 group-hover/sidebar:opacity-100 group-data-[mobile-open=true]/sidebar:opacity-100 transition-opacity duration-100 delay-75 select-none pr-2">
        {item.title}
      </span>
    </div>
  )

  const focusClasses = "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-sidebar-ring focus-visible:ring-inset rounded-sm"

  if (isLocked) {
    return (
      <button
        className={cn("w-full text-left block", focusClasses)}
        onClick={() => {
          toast.error("Feature Locked", { description: lockReason })
        }}
      >
        {inner}
      </button>
    )
  }

  return (
    <Link href={item.url} prefetch={false} className={cn("w-full block", focusClasses)}>
      {inner}
    </Link>
  )
}


// ─── AppSidebarNav ─────────────────────────────────────────────────────────────
// Compact icon sidebar that expands on hover (Supabase Studio style).
// Positioned absolutely so content area never shifts.


interface AppSidebarNavProps {
  user: UserProfile | null
  mobileOpen?: boolean
  onMobileClose?: () => void
}

export function AppSidebarNav({ user, mobileOpen, onMobileClose }: AppSidebarNavProps) {
  const pathname = usePathname()
  const { isActive: isLicenseActive, isAdmin, user: licenseUser } = useLicense()

  const accountType = safeAccountType(user?.account_type)
  const mainNav = user ? NAV_MAIN[accountType] : []

  const isProfileComplete =
    !licenseUser ||
    (licenseUser.account_type !== "institute_candidate" &&
      licenseUser.account_type !== "institute_staff" &&
      licenseUser.account_type !== "institute_placement_officer") ||
    licenseUser.profile_updated === true

  const secondaryNav = NAV_SECONDARY

  return (
    <>
      {/* ── Mobile backdrop ─────────────────────────── */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 md:hidden"
          onClick={onMobileClose}
          aria-hidden
        />
      )}

      {/* ── Sidebar ──────────────────────────────────
          Desktop: absolute icon strip, hover-expands (group/sidebar)
          Mobile:  fixed overlay, slides in from left via translate
      */}
      <nav
        data-mobile-open={mobileOpen}
        className={cn(
          "group/sidebar flex flex-col overflow-hidden border-r border-sidebar-border bg-sidebar",
          // ── Desktop: absolute strip (48px matching topbar 48px height) ──
          "md:absolute md:inset-y-0 md:left-0 md:z-40",
          "md:w-12 md:hover:w-48",
          "md:[transition:width_200ms_ease-out]",
          "md:translate-x-0 md:shadow-none hover:md:shadow-lg",
          // ── Mobile: fixed overlay, toggled ─────────
          "fixed inset-y-0 left-0 z-50 w-48",
          mobileOpen ? "translate-x-0 shadow-xl" : "-translate-x-full",
          "transition-transform duration-300 ease-out md:transition-none",
        )}
        aria-label="Main navigation"
      >
        {/* ── Sidebar Branding Header (48px x 48px square cell when collapsed) ── */}
        <div className="flex h-12 shrink-0 items-center p-1.5 border-b border-sidebar-border overflow-hidden">
          <Link
            href="/home"
            prefetch={false}
            className="flex h-9 w-full items-center rounded-sm transition-colors duration-150 group/logo focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-sidebar-ring focus-visible:ring-inset"
            onClick={onMobileClose}
          >
            <div className="flex size-9 shrink-0 items-center justify-center">
              <Logo />
            </div>
            <div className="flex flex-col min-w-0 opacity-0 group-hover/sidebar:opacity-100 group-data-[mobile-open=true]/sidebar:opacity-100 transition-opacity duration-100 delay-75 select-none pr-2">
              <div className="flex items-center gap-1.5">
                <span className="whitespace-nowrap text-sm font-bold tracking-tight leading-tight">
                  PlaceTrix
                </span>
                <Badge
                  variant="secondary"
                  className="h-4 px-1.5 text-[9px] font-mono font-normal tracking-tight text-muted-foreground border-border/60"
                >
                  v{version}
                </Badge>
              </div>
              <span className="whitespace-nowrap text-[9px] text-muted-foreground/60 font-normal leading-tight">
                by Agilique Solutions LLP
              </span>
            </div>
          </Link>
        </div>

        {/* ── Primary nav ──────────────────────────────── */}
        <div className="flex flex-col flex-1 gap-1 p-1.5 overflow-y-auto overflow-x-hidden">
          {mainNav.map((item) => {
            const isPremium = item.url !== "/home"
            const isLicenseLocked = isPremium && !isAdmin && !isLicenseActive
            const isProfileLocked = isPremium && !isAdmin && !isProfileComplete
            const isLocked = isLicenseLocked || isProfileLocked
            const lockReason = isProfileLocked
              ? "Please complete your profile to unlock this feature."
              : "Your institution does not have an active license."
            const isActive =
              pathname === item.url || pathname.startsWith(item.url + "/")

            return (
              <NavItemButton
                key={item.url}
                item={item}
                isActive={isActive}
                isLocked={isLocked}
                lockReason={lockReason}
              />
            )
          })}

          {/* Skeleton placeholders while user loads */}
          {!user &&
            Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="h-9 w-full rounded-sm bg-muted/40 animate-pulse"
              />
            ))}
        </div>

        {/* ── Divider ──────────────────────────────────── */}
        <div className="mx-2 my-0.5 border-t border-sidebar-border" />

        {/* ── Secondary nav ────────────────────────────── */}
        <div className="flex flex-col gap-1 p-1.5 overflow-x-hidden">
          {secondaryNav.map((item) => {
            const isActive =
              pathname === item.url || pathname.startsWith(item.url + "/")
            return (
              <NavItemButton
                key={item.url}
                item={item}
                isActive={isActive}
              />
            )
          })}
        </div>
      </nav>
    </>
  )
}
