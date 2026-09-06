"use client"

import React, { useState, useEffect } from "react"
import { motion } from "framer-motion"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  Award,
  ArrowRight,
  Clock,
  ChevronRight,
  MapPin,
  Building2,
  Ticket,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { LicenseBanner } from "@/components/license/LicenseBanner"
import { Suspense } from "react"
import { RecentSupportTickets } from "../RecentSupportTickets"
import {
  fetchTeacherDashboardData,
  fetchAdminDashboardData,
  type TeacherHomeData,
} from "@/lib/supabase/home-data"
import { Skeleton } from "@/components/ui/skeleton"
import { LogoLoading } from "@/components/others/logo-loading"

export interface TeacherDashboardStats {
  total_tests: number
  live_tests: number
  upcoming_tests: number
  past_tests: number
  draft_tests: number
  total_attempts: number
  total_students?: number
  total_cohorts?: number
  total_opportunities?: number
  total_events?: number
  completion_rate?: number
}

export interface FeaturedTest {
  id: string
  title: string
  description: string | null
  time_limit_seconds: number | null
  available_from: string | null
  available_until: string | null
  status: string
  attempts_count?: number
  derived_status?: "live" | "upcoming" | "past" | "draft"
  isLive?: boolean
}

export interface FeaturedOpportunity {
  id: string
  title: string
  job_role: string | null
  location: string | null
  ctc_lpa: number | null
  stipend_monthly: number | null
  deadline: string
  applicants_count?: number
  derived_status?: "active" | "past"
  company: {
    name: string
    logo_url: string | null
  } | null
}

export interface FeaturedEvent {
  id: string
  title: string
  description: string | null
  date: string
  venue: string | null
  speaker_name: string | null
  duration_minutes: number | null
  derived_status?: "live" | "upcoming" | "past"
}

export interface TeacherDashboardClientProps {
  profile: {
    id: string
    username: string | null
    full_name: string | null
    account_type: string
    profile_updated: boolean
    institute_id: string | null
    institute_name?: string | null
  }
  stats?: TeacherDashboardStats
  activityCalendar?: any[]
  streakStats?: {
    currentStreak: number
    maxStreak: number
  }
  featuredTest?: FeaturedTest | null
  featuredOpportunity?: FeaturedOpportunity | null
  featuredEvent?: FeaturedEvent | null
  recentSupportTickets?: any[]
  adminStats?: {
    candidates: number
    institutes: number
    pendingTickets: number
  }
}

// ── Framer Motion Layout Variants ────────────────────────────────────────────

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
    },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      type: "spring",
      stiffness: 110,
      damping: 15,
    },
  },
} as const

// ── Main Component ────────────────────────────────────────────────────────────

export function TeacherDashboardClient({
  profile,
  stats: initialStats,
  featuredTest: initialFeaturedTest,
  featuredOpportunity: initialFeaturedOpp,
  featuredEvent: initialFeaturedEvent,
  recentSupportTickets: initialRecentTickets = [],
  adminStats: initialAdminStats,
  activityCalendar: initialActivityCalendar,
  streakStats: initialStreakStats,
}: TeacherDashboardClientProps) {
  const router = useRouter()
  const [greeting, setGreeting] = useState("Hello")

  const [data, setData] = useState<TeacherHomeData | null>(() => {
    if (initialStats) {
      return {
        stats: initialStats,
        featuredTest: initialFeaturedTest || null,
        featuredOpportunity: initialFeaturedOpp || null,
        featuredEvent: initialFeaturedEvent || null,
        recentSupportTickets: initialRecentTickets || [],
        adminStats: initialAdminStats,
        activityCalendar: initialActivityCalendar,
        streakStats: initialStreakStats,
      }
    }
    return null
  })
  const [isLoading, setIsLoading] = useState<boolean>(!data)

  useEffect(() => {
    const hours = new Date().getHours()
    if (hours >= 0 && hours <= 6) setGreeting("Good evening")
    else if (hours < 12) setGreeting("Good morning")
    else if (hours < 17) setGreeting("Good afternoon")
    else setGreeting("Good evening")
  }, [])

  useEffect(() => {
    if (data) return
    let isMounted = true

    const fetcher =
      profile.account_type === "admin"
        ? fetchAdminDashboardData()
        : fetchTeacherDashboardData(profile.id, profile.institute_id, profile.account_type)

    fetcher
      .then((res) => {
        if (isMounted) {
          setData(res)
          setIsLoading(false)
        }
      })
      .catch((err) => {
        console.error("[TeacherDashboardClient] Client fetch error:", err)
        if (isMounted) setIsLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [profile.id, profile.institute_id, profile.account_type, data])

  const stats = data?.stats || {
    total_tests: 0,
    live_tests: 0,
    upcoming_tests: 0,
    past_tests: 0,
    draft_tests: 0,
    total_attempts: 0,
    total_students: 0,
    total_cohorts: 0,
  }
  const featuredTest = data ? data.featuredTest : (initialFeaturedTest ?? null)
  const featuredOpportunity = data ? data.featuredOpportunity : (initialFeaturedOpp ?? null)
  const featuredEvent = data ? data.featuredEvent : (initialFeaturedEvent ?? null)
  const recentSupportTickets = data?.recentSupportTickets || initialRecentTickets || []
  const adminStats = data?.adminStats || initialAdminStats

  const defaultRoleTitle =
    profile.account_type === "institute_primary"
      ? "College Admin"
      : profile.account_type === "institute_placement_officer"
      ? "Placement Officer"
      : profile.account_type === "institute_staff"
      ? "Faculty Member"
      : profile.account_type === "admin"
      ? "Administrator"
      : "College Admin"

  const profileName = defaultRoleTitle
  const isProfileComplete = profile.profile_updated === true

  if (isLoading || !data) {
    return <LogoLoading variant="screen-centered" className="min-h-[70vh]" />
  }

  return (
    <div className="flex flex-col gap-6 px-4 py-8 md:px-8 w-full animate-in fade-in duration-500">
      <Suspense>
        <LicenseBanner />
      </Suspense>

      {!isProfileComplete && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-lg border border-amber-500/20 bg-amber-500/10 p-3.5 text-sm text-amber-800 dark:text-amber-300">
          <div className="flex items-start gap-3 min-w-0">
            <Award className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
            <div className="min-w-0">
              <p className="font-semibold leading-none">Profile Incomplete</p>
              <p className="mt-1 text-xs opacity-90 leading-relaxed">
                Please complete your profile details to unlock full teacher tools and batch controls.
              </p>
            </div>
          </div>
          <Button asChild size="sm" variant="outline" className="border-amber-500/30 text-amber-800 hover:bg-amber-500/20 dark:text-amber-300 shrink-0 font-medium">
            <Link href="/myprofile">Complete Profile</Link>
          </Button>
        </div>
      )}

      {/* ─── Bento Grid Layout ─── */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full"
      >
        {/* Welcome Header Card (col-span-3) */}
        <motion.div variants={itemVariants} className="lg:col-span-3 md:col-span-2 col-span-1">
          <Card className="relative overflow-hidden shadow-md rounded-2xl flex flex-col p-0 gap-0">
            {/* Glowing gradients */}
            <div className="absolute inset-0 bg-linear-to-br from-indigo-500/8 via-purple-500/3 to-sky-500/6 pointer-events-none" />

            {/* Tech Dot Pattern */}
            <div className="absolute inset-0 bg-[radial-gradient(#cbd5e1_1.5px,transparent_1.5px)] dark:bg-[radial-gradient(#334155_1.5px,transparent_1.5px)] bg-size-[16px_14px] opacity-60 pointer-events-none" />

            {/* Dynamic background blur blobs */}
            <div className="absolute top-0 right-0 -mt-6 -mr-6 w-44 h-44 bg-indigo-500/20 rounded-full blur-3xl group-hover:bg-indigo-500/25 transition-all duration-300 pointer-events-none" />
            <div className="absolute right-1/4 top-1/4 w-32 h-32 bg-sky-500/15 rounded-full blur-3xl group-hover:bg-sky-500/20 transition-all duration-300 pointer-events-none" />
            <div className="absolute bottom-0 left-1/3 -mb-6 w-36 h-36 bg-purple-500/15 rounded-full blur-2xl group-hover:bg-purple-500/20 transition-all duration-300 pointer-events-none" />

            <CardContent className="p-5 relative z-10 flex flex-col justify-start gap-3.5">
              <div className="flex flex-col gap-1">
                <h1 className="text-3xl md:text-4xl font-bold font-cirka tracking-tight text-foreground leading-tight">
                  {greeting}, {profileName}!
                </h1>
                <p className="text-sm text-muted-foreground max-w-2xl leading-relaxed">
                  Track your Placements, Tests, and Events all from One Dashboard.
                </p>
              </div>

              {!isProfileComplete && (
                <div className="pt-1">
                  <Link href="/myprofile">
                    <Button size="sm" variant="outline" className="h-8 gap-1.5 text-xs border-indigo-500/30 hover:border-indigo-500 hover:bg-indigo-500/5">
                      Complete Profile
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Card 1: Active & Upcoming Tests (lg:col-span-1 md:col-span-2 col-span-1) */}
        <motion.div variants={itemVariants} className="lg:col-span-1 md:col-span-2 col-span-1">
          <Card className="shadow-md rounded-2xl flex flex-col p-0 gap-0 h-full relative py-0">
            <CardContent className="p-5 flex flex-col flex-1 justify-between gap-5 h-full">
              <div className="flex flex-col gap-4 min-w-0">
                <div className="flex flex-row items-center justify-between pb-1">
                  <Link href="/tests" className="hover:opacity-80 transition-opacity cursor-pointer">
                    <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                      Tests<ChevronRight className="size-3" />
                    </div>
                  </Link>
                  {featuredTest && (
                    featuredTest.derived_status === "live" || featuredTest.isLive ? (
                      <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-transparent font-medium text-[10px] px-2 py-0.5">
                        Live Now
                      </Badge>
                    ) : featuredTest.derived_status === "upcoming" ? (
                      <Badge variant="outline" className="text-blue-600 dark:text-blue-400 border-blue-500/20 bg-blue-500/5 font-medium text-[10px] px-2 py-0.5">
                        Upcoming
                      </Badge>
                    ) : featuredTest.derived_status === "draft" ? (
                      <Badge variant="outline" className="text-slate-600 dark:text-slate-400 border-slate-500/20 bg-slate-500/5 font-medium text-[10px] px-2 py-0.5">
                        Draft
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-muted-foreground border-border/40 font-medium text-[10px] px-2 py-0.5">
                        Ended
                      </Badge>
                    )
                  )}
                </div>

                {isLoading ? (
                  <div className="flex flex-col gap-2.5 py-4 flex-1">
                    <Skeleton className="h-5 w-3/4 rounded-md" />
                    <Skeleton className="h-4 w-full rounded-md" />
                    <Skeleton className="h-4 w-1/2 rounded-md" />
                  </div>
                ) : featuredTest ? (
                  <div className="flex flex-col gap-1.5 flex-1">
                    <h3 className="font-bold text-lg sm:text-xl text-foreground leading-snug">
                      {featuredTest.title}
                    </h3>
                    <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                      {featuredTest.description || "No description provided."}
                    </p>

                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground pt-1">
                      {featuredTest.time_limit_seconds && (
                        <span className="flex items-center gap-1 font-medium">
                          <Clock className="size-3.5" />
                          {Math.round(featuredTest.time_limit_seconds / 60)} mins
                        </span>
                      )}
                      {featuredTest.derived_status === "live" && featuredTest.available_until && (
                        <span>• Ends: {new Date(featuredTest.available_until).toLocaleString([], { dateStyle: "short", timeStyle: "short", hour12: true })}</span>
                      )}
                      {featuredTest.derived_status === "upcoming" && featuredTest.available_from && (
                        <span>• Starts: {new Date(featuredTest.available_from).toLocaleString([], { dateStyle: "short", timeStyle: "short", hour12: true })}</span>
                      )}
                      {featuredTest.derived_status === "past" && featuredTest.available_until && (
                        <span>• Ended: {new Date(featuredTest.available_until).toLocaleString([], { dateStyle: "short", timeStyle: "short", hour12: true })}</span>
                      )}
                      {featuredTest.derived_status === "draft" && (
                        <span>• Draft Unpublished</span>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center text-center gap-2 py-8 text-muted-foreground flex-1">
                    <span className="text-sm font-semibold">No Active Tests</span>
                    <span className="text-xs">No active or upcoming tests assigned.</span>
                  </div>
                )}
              </div>

              <Button
                variant="default"
                className="w-full py-5 font-semibold text-sm sm:text-base transition-colors mt-auto shrink-0 cursor-pointer shadow-xs"
                onClick={() => {
                  if (featuredTest) {
                    router.push(`/tests/${featuredTest.id}`)
                  } else {
                    router.push("/tests/new")
                  }
                }}
              >
                {featuredTest
                  ? featuredTest.derived_status === "live" || featuredTest.isLive
                    ? "Manage Live Test"
                    : featuredTest.derived_status === "upcoming"
                    ? "View Upcoming Test"
                    : featuredTest.derived_status === "draft"
                    ? "Edit Draft Test"
                    : "View Test Results"
                  : "Create New Test"}
              </Button>
            </CardContent>
          </Card>
        </motion.div>

        {/* Card 2: Active & Upcoming Events (lg:col-span-1 md:col-span-2 col-span-1) */}
        <motion.div variants={itemVariants} className="lg:col-span-1 md:col-span-2 col-span-1">
          <Card className="shadow-md rounded-2xl flex flex-col p-0 gap-0 h-full relative py-0">
            <CardContent className="p-5 flex flex-col flex-1 justify-between gap-5 h-full">
              <div className="flex flex-col gap-4 min-w-0">
                <div className="flex flex-row items-center justify-between pb-1">
                  <Link href="/events" className="hover:opacity-80 transition-opacity cursor-pointer">
                    <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                      Events<ChevronRight className="size-3" />
                    </div>
                  </Link>
                  {featuredEvent && (
                    featuredEvent.derived_status === "live" ? (
                      <Badge className="bg-sky-500/10 text-sky-700 dark:text-sky-400 border-transparent font-medium text-[10px] px-2 py-0.5">
                        Happening Now
                      </Badge>
                    ) : featuredEvent.derived_status === "upcoming" ? (
                      <Badge variant="outline" className="text-blue-600 dark:text-blue-400 border-blue-500/20 bg-blue-500/5 font-medium text-[10px] px-2 py-0.5">
                        Upcoming
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-muted-foreground border-border/40 font-medium text-[10px] px-2 py-0.5">
                        Past Event
                      </Badge>
                    )
                  )}
                </div>

                {isLoading ? (
                  <div className="flex flex-col gap-2.5 py-4 flex-1">
                    <Skeleton className="h-5 w-3/4 rounded-md" />
                    <Skeleton className="h-4 w-full rounded-md" />
                    <Skeleton className="h-4 w-1/2 rounded-md" />
                  </div>
                ) : featuredEvent ? (
                  <div className="flex flex-col gap-1.5 flex-1">
                    <h3 className="font-bold text-lg sm:text-xl text-foreground leading-snug">
                      {featuredEvent.title}
                    </h3>
                    {featuredEvent.speaker_name && (
                      <p className="text-xs font-semibold text-sky-600 dark:text-sky-400">
                        Speaker: {featuredEvent.speaker_name}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                      {featuredEvent.description || "No description provided."}
                    </p>

                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground pt-1">
                      <span className="flex items-center gap-1 font-medium">
                        <MapPin className="size-3.5" />
                        {featuredEvent.venue || "Campus Main Hall"}
                      </span>
                      {featuredEvent.date && (
                        <span>
                          • {featuredEvent.derived_status === "live" ? "Started: " : featuredEvent.derived_status === "upcoming" ? "Date: " : "Held on: "}
                          {new Date(featuredEvent.date).toLocaleString([], { dateStyle: "short", timeStyle: "short", hour12: true })}
                        </span>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center text-center gap-2 py-8 text-muted-foreground flex-1">
                    <span className="text-sm font-semibold">No Active Events</span>
                    <span className="text-xs">No active or upcoming events scheduled.</span>
                  </div>
                )}
              </div>

              <Button
                variant="default"
                className="w-full py-5 font-semibold text-sm sm:text-base transition-colors mt-auto shrink-0 cursor-pointer shadow-xs"
                onClick={() => {
                  if (featuredEvent) {
                    router.push(`/events/${featuredEvent.id}`)
                  } else {
                    router.push("/events/new")
                  }
                }}
              >
                {featuredEvent
                  ? featuredEvent.derived_status === "live"
                    ? "Join Live Event"
                    : featuredEvent.derived_status === "upcoming"
                    ? "View Event Details"
                    : "View Past Event"
                  : "Schedule New Event"}
              </Button>
            </CardContent>
          </Card>
        </motion.div>

        {/* Card 3: Active & Upcoming Opportunities (lg:col-span-1 md:col-span-2 col-span-1) */}
        <motion.div variants={itemVariants} className="lg:col-span-1 md:col-span-2 col-span-1">
          <Card className="shadow-md rounded-2xl flex flex-col p-0 gap-0 h-full relative py-0">
            <CardContent className="p-5 flex flex-col flex-1 justify-between gap-5 h-full">
              {(() => {
                const opp = featuredOpportunity
                const ctcOrStipend = opp?.ctc_lpa
                  ? `${opp.ctc_lpa} LPA`
                  : opp?.stipend_monthly
                    ? `₹${opp.stipend_monthly.toLocaleString()}/mo`
                    : null

                return (
                  <>
                    <div className="flex flex-col gap-4 min-w-0">
                      <div className="flex flex-row items-center justify-between pb-1">
                        <Link href="/opportunities" className="hover:opacity-80 transition-opacity cursor-pointer">
                          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                            Opportunities<ChevronRight className="size-3" />
                          </div>
                        </Link>
                        <div className="flex items-center gap-1.5">
                          {ctcOrStipend && (
                            <Badge variant="outline" className="text-[10px] font-semibold border-purple-500/30 bg-purple-500/10 text-purple-700 dark:text-purple-300 shrink-0">
                              {ctcOrStipend}
                            </Badge>
                          )}
                          {opp && (
                            opp.derived_status === "past" ? (
                              <Badge variant="outline" className="text-muted-foreground border-border/40 font-medium text-[10px] px-2 py-0.5">
                                Closed
                              </Badge>
                            ) : (
                              <Badge className="bg-purple-500/10 text-purple-700 dark:text-purple-300 border-transparent font-medium text-[10px] px-2 py-0.5">
                                Active Drive
                              </Badge>
                            )
                          )}
                        </div>
                      </div>

                      {isLoading ? (
                        <div className="flex flex-col gap-2.5 py-4 flex-1">
                          <Skeleton className="h-5 w-3/4 rounded-md" />
                          <Skeleton className="h-4 w-full rounded-md" />
                          <Skeleton className="h-4 w-1/2 rounded-md" />
                        </div>
                      ) : opp ? (
                        <div className="flex flex-col gap-1.5 flex-1">
                          <span className="text-xs font-semibold text-purple-700 dark:text-purple-400">
                            {opp.company?.name || "Campus Drive"}
                          </span>
                          <h3 className="font-bold text-lg sm:text-xl text-foreground leading-snug">
                            {opp.title}
                          </h3>
                          {opp.job_role && (
                            <p className="text-xs text-muted-foreground line-clamp-1">{opp.job_role}</p>
                          )}

                          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground pt-1">
                            <span className="flex items-center gap-1 font-medium">
                              <MapPin className="size-3.5" />
                              {opp.location || "Remote / On-site"}
                            </span>
                            {opp.deadline && (
                              <span>
                                • {opp.derived_status === "past" ? "Closed: " : "Deadline: "}
                                {new Date(opp.deadline).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                              </span>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center text-center gap-2 py-8 text-muted-foreground flex-1">
                          <span className="text-sm font-semibold">No Active Opportunities</span>
                          <span className="text-xs">No active or upcoming placement drives assigned.</span>
                        </div>
                      )}
                    </div>

                    <Button
                      variant="default"
                      className="w-full py-5 font-semibold text-sm sm:text-base transition-colors mt-auto shrink-0 cursor-pointer shadow-xs"
                      onClick={() => {
                        if (opp) {
                          router.push(`/opportunities/${opp.id}`)
                        } else {
                          router.push("/opportunities/new")
                        }
                      }}
                    >
                      {opp
                        ? opp.derived_status === "active"
                          ? "Manage Applications"
                          : "View Past Drive"
                        : "Post New Opportunity"}
                    </Button>
                  </>
                )
              })()}
            </CardContent>
          </Card>
        </motion.div>

        {/* ── Additional Bento Section for Admin Role ── */}
        {profile.account_type === "admin" && (
          <motion.div variants={itemVariants} className="lg:col-span-3 md:col-span-2 col-span-1">
            <Card className="shadow-lg rounded-2xl p-5 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Ticket className="size-4 text-indigo-600 dark:text-indigo-400" />
                  <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Support Ticket Queue & Moderation
                  </h2>
                </div>
                <Link
                  href="/support"
                  className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 flex items-center gap-1"
                >
                  Go to Support Queue
                  <ArrowRight className="h-3 w-3" />
                </Link>
              </div>

              {isLoading ? (
                <div className="flex flex-col gap-2 py-2">
                  <Skeleton className="h-10 w-full rounded-lg" />
                  <Skeleton className="h-10 w-full rounded-lg" />
                </div>
              ) : (
                <RecentSupportTickets initialTickets={recentSupportTickets} />
              )}
            </Card>
          </motion.div>
        )}
      </motion.div>
    </div>
  )
}
