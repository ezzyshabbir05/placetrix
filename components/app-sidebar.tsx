"use client"
import * as React from "react"
import { usePathname } from "next/navigation"
import {
  type LucideIcon,
  Bell,
  Briefcase,
  Building2,
  BarChart3,
  ClipboardList,
  LayoutDashboard,
  MoreVertical,
  MoreHorizontal,
  ChevronUp,
  FileText,
  Folder,
  CircleHelp,
  Home,
  LogOut,
  Lock,
  Search,
  Settings,
  ShieldCheck,
  User,
  CircleUser,
  Users,
  CreditCard,
  Calendar,
  GraduationCap,
  FileBarChart,
  Target,
  Sun,
  Moon,
  Laptop,
  Check,
  ChevronRight,
  Wrench,
  Code,
  BookOpen,
  Trophy,
  UsersRound,
  Heart,
} from "lucide-react"
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarHeader, SidebarMenu, SidebarMenuButton,
  SidebarMenuItem, SidebarMenuSkeleton, SidebarMenuSub, SidebarMenuSubItem, SidebarMenuSubButton,
  SidebarSeparator, useSidebar, SidebarMenuBadge,
} from "@/components/ui/sidebar"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "./ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"


import { AccountType, UserProfile } from "@/lib/supabase/profile"

import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useSidebarHoverContext } from "@/components/sidebar-hover-context"
import { useTheme } from "next-themes"
import { buildStorageUrl } from "@/lib/storage"
import { version } from "@/package.json"
import { useLicense } from "@/components/license/LicenseProvider"
import { toast } from "sonner"


type NavItem = {
  title: string
  url: string
  icon: LucideIcon
  items?: {
    title: string
    url: string
  }[]
  badge?: string
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
    { title: "Logic Lab", url: "/logiclab", icon: Code },
    { title: "Courses", url: "/courses", icon: BookOpen },
    { title: "Tests", url: "/tests", icon: BarChart3 },
    { title: "Events", url: "/events", icon: Calendar },
    { title: "Opportunities", url: "/opportunities", icon: Briefcase },
    { title: "Tools", url: "/tools", icon: Wrench },
  ],
  institute_primary: [
    { title: "Home", url: "/home", icon: Home },
    { title: "Users", url: "/users", icon: Users },
    { title: "Cohorts", url: "/cohorts", icon: UsersRound },
    { title: "Opportunities", url: "/opportunities", icon: Briefcase },
    { title: "Companies", url: "/companies", icon: Building2 },
  ],
  institute_staff: [
    { title: "Home", url: "/home", icon: Home },
    { title: "Cohorts", url: "/cohorts", icon: UsersRound },
    { title: "Tests", url: "/tests", icon: BarChart3 },
    { title: "Courses", url: "/courses", icon: BookOpen },
    { title: "Events", url: "/events", icon: Calendar },
  ],
  institute_placement_officer: [
    { title: "Home", url: "/home", icon: Home },
    { title: "Cohorts", url: "/cohorts", icon: UsersRound },
    { title: "Opportunities", url: "/opportunities", icon: Briefcase },
    { title: "Companies", url: "/companies", icon: Building2 },
  ],
  admin: [
    { title: "Home", url: "/home", icon: Home },
    { title: "Analytics", url: "/analytics", icon: FileBarChart },
    { title: "Users", url: "/users", icon: Users },
    { title: "Licenses", url: "/licenses", icon: ShieldCheck },
    { title: "Courses", url: "/courses", icon: BookOpen },
    { title: "LogicLab", url: "/logiclab/admin", icon: Code },
    { title: "Support Queue", url: "/support", icon: CircleHelp },
  ],
}


const NAV_SECONDARY: NavItem[] = [
  { title: "My Profile", url: "/myprofile", icon: CircleUser },
  { title: "Notifications", url: "/notifications", icon: Bell },
  { title: "Settings", url: "/settings", icon: Settings },
  { title: "Get Help", url: "/gethelp", icon: CircleHelp },
  { title: "Our Team", url: "/our-team", icon: Heart },
]


// ─── Theme options ────────────────────────────────────────────────────────────


type ThemeOption = { value: string; label: string; icon: LucideIcon }


const THEME_OPTIONS: ThemeOption[] = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Laptop },
]


// ─── Helpers ──────────────────────────────────────────────────────────────────


const VALID_ACCOUNT_TYPE_SET = new Set<string>(VALID_ACCOUNT_TYPES)

const MAX_PRIMARY_NAV_COUNT = Math.max(
  ...VALID_ACCOUNT_TYPES.map((t) => NAV_MAIN[t].length)
)


function safeAccountType(type: string | null | undefined): AccountType {
  return VALID_ACCOUNT_TYPE_SET.has(type ?? "")
    ? (type as AccountType)
    : "institute_candidate"
}


// ─── NavUser ──────────────────────────────────────────────────────────────────


export function NavUser({ user }: { user: UserProfile | null }) {
  const { isMobile } = useSidebar()
  const router = useRouter()
  const { onUserMenuOpenChange } = useSidebarHoverContext()
  const { theme, setTheme } = useTheme()

  const [mounted, setMounted] = React.useState(false)
  React.useEffect(() => setMounted(true), [])

  const displayName = user?.full_name?.trim() || "User"
  const email = user?.email?.trim() || "No email"
  const sidebarSubtitle = user?.username?.trim()
    ? `@${user.username.trim()}`
    : email
  const accountType = safeAccountType(user?.account_type)
  const initials = user?.full_name?.trim()
    ? displayName.split(" ").filter(Boolean).map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : (user?.email?.trim()[0]?.toUpperCase() ?? "?")

  const avatarUrl = buildStorageUrl("avatars", user?.avatar_path ?? null)

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/auth/login")
    router.refresh()
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu
          onOpenChange={onUserMenuOpenChange}
          modal={false}
        >
          <DropdownMenuTrigger asChild disabled={!user}>
            <SidebarMenuButton
              size="lg"
              className="w-full text-sidebar-foreground group-data-[state=expanded]/sidebar-wrapper:bg-sidebar-border/50 group-data-[state=expanded]/sidebar-wrapper:border group-data-[state=expanded]/sidebar-wrapper:border-sidebar-border/80 group-data-[state=expanded]/sidebar-wrapper:shadow-2xs group-data-[state=expanded]/sidebar-wrapper:p-2.5 group/user transition-all duration-200 cursor-pointer rounded-xl group-data-[state=expanded]/sidebar-wrapper:hover:bg-sidebar-accent group-data-[state=expanded]/sidebar-wrapper:hover:text-sidebar-accent-foreground group-data-[state=expanded]/sidebar-wrapper:hover:border-transparent group-data-[state=expanded]/sidebar-wrapper:data-[state=open]:bg-sidebar-accent group-data-[state=expanded]/sidebar-wrapper:data-[state=open]:text-sidebar-accent-foreground group-data-[state=expanded]/sidebar-wrapper:data-[state=open]:border-transparent data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground data-[state=open]:border-transparent"
              asChild
            >
              <div className="flex items-center gap-2.5 w-full" suppressHydrationWarning>
                {user ? (
                  <>
                    <Avatar className="h-9 w-9 rounded-lg shrink-0 border border-sidebar-border group-hover/user:border-primary/20 group-data-[state=open]/user:border-primary/20 transition-all duration-200 group-hover/user:scale-105 group-data-[state=collapsed]/sidebar-wrapper:h-8 group-data-[state=collapsed]/sidebar-wrapper:w-8">
                      <AvatarImage src={avatarUrl ?? undefined} alt={displayName} className="object-cover" />
                      <AvatarFallback className="rounded-lg bg-sidebar-border text-sidebar-foreground font-semibold">{initials}</AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col flex-1 text-left min-w-0 gap-1 group-data-[state=collapsed]/sidebar-wrapper:hidden">
                      <span className="truncate font-semibold text-sm leading-none text-sidebar-foreground group-hover/user:text-sidebar-accent-foreground group-data-[state=open]/user:text-sidebar-accent-foreground transition-colors duration-200">{displayName}</span>
                      <span className="truncate text-[11px] text-muted-foreground leading-none group-hover/user:text-sidebar-accent-foreground/80 group-data-[state=open]/user:text-sidebar-accent-foreground/80 transition-colors duration-200">{sidebarSubtitle}</span>
                    </div>
                    <MoreVertical className="ml-auto shrink-0 size-4 text-muted-foreground/80 group-hover/user:text-sidebar-accent-foreground group-data-[state=open]/user:text-sidebar-accent-foreground transition-all group-hover/user:translate-x-0.5 duration-200 group-data-[state=collapsed]/sidebar-wrapper:hidden" />
                  </>
                ) : (
                  <>
                    <Skeleton className="h-9 w-9 rounded-lg shrink-0 group-data-[state=collapsed]/sidebar-wrapper:h-8 group-data-[state=collapsed]/sidebar-wrapper:w-8" />
                    <div className="flex flex-col gap-1.5 flex-1 min-w-0 group-data-[state=collapsed]/sidebar-wrapper:hidden">
                      <Skeleton className="h-3.5 w-28" />
                      <Skeleton className="h-3 w-36" />
                    </div>
                    <Skeleton className="h-4 w-4 rounded shrink-0 group-data-[state=collapsed]/sidebar-wrapper:hidden" />
                  </>
                )}
              </div>
            </SidebarMenuButton>
          </DropdownMenuTrigger>

          {user && (
            <DropdownMenuContent
              className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg [&_svg]:stroke-[2.5]"
              side={isMobile ? "bottom" : "right"}
              align="end"
              sideOffset={8}
              onPointerEnter={() => onUserMenuOpenChange(true)}
              onPointerLeave={() => onUserMenuOpenChange(false)}
              onCloseAutoFocus={(e) => e.preventDefault()}
            >
              {/* ── User identity header ───────────────────── */}
              <DropdownMenuLabel className="p-0 font-normal">
                <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                  <Avatar className="h-8 w-8 rounded-lg">
                    <AvatarImage src={avatarUrl ?? undefined} alt={displayName} className="object-cover" />
                    <AvatarFallback className="rounded-lg">{initials}</AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold">{displayName}</span>
                    <span className="truncate text-xs text-muted-foreground">{email}</span>
                  </div>
                </div>
              </DropdownMenuLabel>

              <DropdownMenuSeparator />

              {/* ── Theme selector ─────────────────────────── */}
              <div className="px-2 py-1.5">
                <span className="text-[11px] font-medium text-muted-foreground/80 block mb-1.5 px-1 uppercase tracking-wider">
                  Appearance
                </span>
                <div className="flex items-center gap-1 bg-muted/50 p-0.5 rounded-lg border border-sidebar-border/40">
                  {THEME_OPTIONS.map(({ value, label, icon: ThemeIcon }) => {
                    const isActive = mounted && theme === value
                    return (
                      <button
                        key={value}
                        onClick={(e) => {
                          e.stopPropagation()
                          setTheme(value)
                        }}
                        className={cn(
                          "flex-1 flex items-center justify-center gap-1.5 py-1 px-1.5 text-xs rounded-md transition-all duration-200 cursor-pointer outline-none select-none",
                          isActive
                            ? "bg-background text-sidebar-foreground shadow-2xs font-medium"
                            : "text-muted-foreground hover:bg-sidebar-border/30 hover:text-sidebar-foreground"
                        )}
                        title={label}
                      >
                        <ThemeIcon className={cn("size-3.5", isActive ? "text-primary" : "text-muted-foreground")} />
                        <span className="text-[11px]">{label}</span>
                      </button>
                    )
                  })}
                </div>
              </div>

              <DropdownMenuSeparator />

              {/* ── Logout ─────────────────────────────────── */}
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
      </SidebarMenuItem>
    </SidebarMenu>
  )
}


export function NavMain({ items }: { items: NavItem[] }) {
  const pathname = usePathname()
  const { setOpenMobile } = useSidebar()
  const { isActive: isLicenseActive, isAdmin, user } = useLicense()

  const isProfileComplete = !user || 
    (user.account_type !== "institute_candidate" && 
     user.account_type !== "institute_staff" && 
     user.account_type !== "institute_placement_officer") || 
    user.profile_updated === true

  const hasAccess = isAdmin || (isLicenseActive && isProfileComplete)

  return (
    <SidebarGroup>
      <SidebarGroupContent className="flex flex-col gap-2">
        <SidebarMenu>
          {items.map((item, index) => {
            const isPremium = item.url !== "/home"
            const isLicenseLocked = isPremium && !isAdmin && !isLicenseActive
            const isProfileLocked = isPremium && !isAdmin && !isProfileComplete
            const isLocked = isLicenseLocked || isProfileLocked
            const lockReason = isLicenseLocked 
              ? "Your institution does not have an active license." 
              : "Please complete your profile to unlock this feature."

            if (item.items && item.items.length > 0) {
              return (
                <Collapsible
                  key={item.title}
                  asChild
                  disabled={isLocked}
                  defaultOpen={!isLocked && item.items.some(
                    (subItem) =>
                      pathname === subItem.url ||
                      pathname.startsWith(subItem.url + "/")
                  )}
                  className="group/collapsible"
                >
                  <SidebarMenuItem
                    style={{ "--i": index } as React.CSSProperties}
                    className="animate-nav-in"
                  >
                    <CollapsibleTrigger asChild>
                      <SidebarMenuButton 
                        tooltip={item.title}
                        onClick={(e) => {
                          if (isLocked) {
                            e.preventDefault()
                            e.stopPropagation()
                            toast.error(`Feature Locked`, {
                              description: lockReason
                            })
                          }
                        }}
                        className={cn(isLocked && "opacity-60 cursor-not-allowed")}
                      >
                        {isLocked ? (
                          <Lock className="size-4 text-muted-foreground shrink-0" />
                        ) : (
                          <item.icon className="transition-transform duration-200" />
                        )}
                        <span className={cn(isLocked && "text-muted-foreground font-normal")}>{item.title}</span>
                        {!isLocked && <ChevronRight className="ml-auto transition-transform duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] group-data-[state=open]/collapsible:rotate-90 size-4 shrink-0" />}
                      </SidebarMenuButton>
                    </CollapsibleTrigger>
                    {!isLocked && (
                      <CollapsibleContent className="collapsible-content" suppressHydrationWarning>
                        <SidebarMenuSub suppressHydrationWarning>
                          {item.items.map((subItem) => {
                            const isSubActive = pathname === subItem.url || pathname.startsWith(subItem.url + "/")
                            return (
                              <SidebarMenuSubItem key={subItem.title}>
                                <SidebarMenuSubButton
                                  asChild
                                  isActive={isSubActive}
                                 className={cn(
                                    "transition-all duration-200",
                                    isSubActive &&
                                    "bg-sidebar-accent/50 text-sidebar-accent-foreground font-semibold"
                                  )}
                                >
                                  <Link href={subItem.url} onClick={() => setOpenMobile(false)}>
                                    <span>{subItem.title}</span>
                                  </Link>
                                </SidebarMenuSubButton>
                              </SidebarMenuSubItem>
                            )
                          })}
                        </SidebarMenuSub>
                      </CollapsibleContent>
                    )}
                  </SidebarMenuItem>
                </Collapsible>
              )
            }
            const isActive = pathname === item.url || pathname.startsWith(item.url + "/")
            return (
              <SidebarMenuItem
                key={item.title}
                style={{ "--i": index } as React.CSSProperties}
                className="animate-nav-in"
              >
                <SidebarMenuButton
                  tooltip={item.title}
                  asChild={!isLocked}
                  isActive={isActive && !isLocked}
                  onClick={(e) => {
                    if (isLocked) {
                      e.preventDefault()
                      toast.error(`Feature Locked`, {
                        description: lockReason
                      })
                    }
                  }}
                  className={cn(
                    "transition-all duration-200",
                    isActive && !isLocked &&
                    "bg-sidebar-accent/80 text-sidebar-accent-foreground font-semibold",
                    isLocked && "opacity-60 cursor-not-allowed hover:bg-transparent hover:text-muted-foreground"
                  )}
                >
                  {isLocked ? (
                    <div className="flex items-center gap-2 w-full">
                      <Lock className="size-4 text-muted-foreground shrink-0" />
                      <span className="truncate text-muted-foreground font-normal">{item.title}</span>
                    </div>
                  ) : (
                    <Link href={item.url} onClick={() => setOpenMobile(false)}>
                      <item.icon className="transition-transform duration-200" />
                      <span className="truncate">{item.title}</span>
                    </Link>
                  )}
                </SidebarMenuButton>
                {item.badge && !isLocked && (
                  <SidebarMenuBadge className="italic">
                    {item.badge}
                  </SidebarMenuBadge>
                )}
              </SidebarMenuItem>
            )
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}


// ─── NavSecondary ─────────────────────────────────────────────────────────────


export function NavSecondary({
  items,
  ...props
}: {
  items: NavItem[]
} & React.ComponentPropsWithoutRef<typeof SidebarGroup>) {
  const pathname = usePathname()
  const { setOpenMobile } = useSidebar()

  return (
    <SidebarGroup {...props}>
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => {
            const isActive = pathname === item.url || pathname.startsWith(item.url + "/")
            return (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton
                  asChild
                  tooltip={item.title}
                  isActive={isActive}
                  className={cn(
                    "transition-all duration-200",
                    isActive &&
                    "bg-sidebar-accent/80 text-sidebar-accent-foreground font-semibold"
                  )}
                >
                  <Link
                    href={item.url}
                    onClick={() => setOpenMobile(false)}
                  >
                    <item.icon className="transition-transform duration-200" />
                    <span>{item.title}</span>
                  </Link>
                </SidebarMenuButton>
                {item.badge && (
                  <SidebarMenuBadge>
                    {item.badge}
                  </SidebarMenuBadge>
                )}
              </SidebarMenuItem>
            )
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}


// ─── AppSidebar ───────────────────────────────────────────────────────────────


interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  user: UserProfile | null
}

const Logo = React.memo(() => (
  <div className="shrink-0 size-5 flex items-center justify-center transition-transform duration-300 group-hover/logo:scale-110">
    <svg
      viewBox="0 0 234 139"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="size-full"
    >
      <path
        d="M3.78965 131.389L49.3376 57.9376C53.1673 51.7618 59.9207 48 67.1876 48H137.213C140.37 48 142.283 51.4846 140.588 54.1475L121.179 84.6475C120.445 85.8013 119.172 86.5 117.804 86.5H78.2496C76.8527 86.5 75.5571 87.2287 74.8315 88.4223L50.8424 127.888C47.2146 133.857 40.7363 137.5 33.752 137.5H7.1871C4.05169 137.5 2.13726 134.053 3.78965 131.389Z"
        className="fill-current stroke-current text-foreground"
        strokeWidth="2"
      />
      <path
        d="M57.0333 32.8693L72.9628 8.65652C76.107 3.87731 81.4442 1 87.1649 1H155.75H216.833C223.991 1 228.285 8.95097 224.359 14.9362L177.535 86.3238C174.393 91.1143 169.049 94 163.32 94H133.417C130.233 94 128.326 90.4625 130.074 87.8027L157.47 46.1296C159.21 43.4836 157.331 39.9616 154.165 39.9324L60.3381 39.0676C57.1712 39.0384 55.2926 35.5152 57.0333 32.8693Z"
        className="fill-muted-foreground/30"
      />
      <path
        d="M57.0333 32.8693L72.9628 8.65652C76.107 3.87731 81.4442 1 87.1649 1H155.75H216.833C223.991 1 228.285 8.95097 224.359 14.9362L177.535 86.3238C174.393 91.1143 169.049 94 163.32 94H133.417C130.233 94 128.326 90.4625 130.074 87.8027L157.47 46.1296C159.21 43.4836 157.331 39.9616 154.165 39.9324L60.3381 39.0676C57.1712 39.0384 55.2926 35.5152 57.0333 32.8693Z"
        className="fill-current text-foreground"
      />
      <path
        d="M57.0333 32.8693L72.9628 8.65652C76.107 3.87731 81.4442 1 87.1649 1H155.75H216.833C223.991 1 228.285 8.95097 224.359 14.9362L177.535 86.3238C174.393 91.1143 169.049 94 163.32 94H133.417C130.233 94 128.326 90.4625 130.074 87.8027L157.47 46.1296C159.21 43.4836 157.331 39.9616 154.165 39.9324L60.3381 39.0676C57.1712 39.0384 55.2926 35.5152 57.0333 32.8693Z"
        className="stroke-current text-foreground"
        strokeWidth="2"
      />
    </svg>
  </div>
))
Logo.displayName = "Logo"


export function AppSidebar({ user, ...props }: AppSidebarProps) {
  const accountType = safeAccountType(user?.account_type)
  const mainNav = user ? NAV_MAIN[accountType] : null
  const { hoverProps } = useSidebarHoverContext()

  const secondaryNav = React.useMemo(() => {
    if (user?.account_type === "admin") {
      return NAV_SECONDARY.filter((item) => item.title !== "Get Help");
    }
    return NAV_SECONDARY;
  }, [user]);

  return (
    <Sidebar
      collapsible="icon"
      variant="sidebar"
      {...hoverProps}
      {...props}
    >
      {/* ── Header ───────────────────────────────────────── */}
      <SidebarHeader className="border-b border-sidebar-border/50">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="group/logo cursor-pointer hover:bg-transparent hover:text-current active:bg-transparent focus:bg-transparent group-data-[collapsible=icon]/sidebar-wrapper:p-1.5!"
            >
              <Link href={user ? "/landing" : "/"}>
                <Logo />
                <div className="flex flex-1 items-center gap-1.5 overflow-hidden">
                  <span className="text-base font-bold transition-all duration-300 group-hover/logo:tracking-wider truncate">
                    PlaceTrix
                  </span>
                  <span className="shrink-0 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium leading-none text-muted-foreground tabular-nums">
                    v{version}
                  </span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      {/* ── Content ──────────────────────────────────────── */}
      <SidebarContent>
        {mainNav ? (
          <NavMain items={mainNav} />
        ) : (
          <SidebarGroup>
            <SidebarGroupContent className="flex flex-col gap-2">
              <SidebarMenu>
                {Array.from({ length: MAX_PRIMARY_NAV_COUNT }).map((_, i) => (
                  <SidebarMenuItem key={i}>
                    <SidebarMenuSkeleton showIcon />
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {user ? (
          <NavSecondary items={secondaryNav} className="mt-auto pb-2" />
        ) : (
          <SidebarGroup className="mt-auto pb-2">
            <SidebarGroupContent>
              <SidebarMenu>
                {Array.from({ length: NAV_SECONDARY.length }).map((_, i) => (
                  <SidebarMenuItem key={i}>
                    <SidebarMenuSkeleton showIcon />
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      {/* ── Footer ───────────────────────────────────────── */}
      <SidebarFooter className="border-t border-sidebar-border/50 p-2">
        <NavUser user={user} />
      </SidebarFooter>
    </Sidebar>
  )
}
