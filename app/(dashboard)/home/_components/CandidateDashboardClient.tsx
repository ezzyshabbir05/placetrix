"use client"

import React, { useState, useEffect, useMemo, useCallback } from "react"
import { motion } from "framer-motion"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  Award,
  ArrowRight,
  Clock,
  Laptop,
  BookOpen,
  ChevronRight,
  FileText,
  Search,
  CircleCheck,
  Flame,
  Briefcase,
  MapPin,
  CalendarDays,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { SolveChallengeButton } from "@/components/ui/solve-challenge-button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
  EmptyMedia,
} from "@/components/ui/empty"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"
import { LicenseBanner } from "@/components/license/LicenseBanner"
import { Suspense } from "react"

interface ProblemStats {
  total: number
  solved: number
  easy: { total: number; solved: number }
  medium: { total: number; solved: number }
  hard: { total: number; solved: number }
}

interface TestStats {
  total_tests: number
  live_tests: number
  upcoming_tests: number
  completed_tests: number
  average_score: number
}

interface MockTest {
  id: string
  title: string
  description: string | null
  time_limit_seconds: number | null
  available_from: string | null
  available_until: string | null
}

export interface CalendarCell {
  date: string
  count: number
  status: "none" | "attempted" | "solved"
  dayOfWeek: number
  easySolved?: number
  mediumSolved?: number
  hardSolved?: number
  easyAttempted?: number
  mediumAttempted?: number
  hardAttempted?: number
}

export interface Opportunity {
  id: string
  title: string
  job_role: string | null
  location: string | null
  ctc_lpa: number | null
  stipend_monthly: number | null
  deadline: string
  company: {
    name: string
    logo_url: string | null
  } | null
}

import { fetchCandidateDashboardData, type CandidateHomeData } from "@/lib/supabase/home-data"
import { Skeleton } from "@/components/ui/skeleton"
import { LogoLoading } from "@/components/others/logo-loading"

interface CandidateDashboardClientProps {
  profile: {
    id: string
    username: string | null
    full_name: string | null
    first_name: string | null
    last_name: string | null
    profile_updated: boolean
    institute_id: string | null
  }
  stats?: TestStats
  globalStats?: ProblemStats
  streakStats?: {
    currentStreak: number
    maxStreak: number
  }
  activityCalendar?: CalendarCell[]
  liveTests?: MockTest[]
  upcomingTests?: MockTest[]
  opportunities?: Opportunity[]
  candidateEvent?: any
  todayStr?: string
  initialPotd?: any
  fullPotdProblem?: any
}


function ConcentricRing({
  radius,
  value,
  max,
  className,
  trackClassName,
}: {
  radius: number
  value: number
  max: number
  className?: string
  trackClassName?: string
}) {
  const circumference = 2 * Math.PI * radius
  const percent = max > 0 ? value / max : 0
  const strokeDashoffset = circumference - percent * circumference

  return (
    <g transform="rotate(-90 50 50)" className="origin-center">
      <circle
        cx="50"
        cy="50"
        r={radius}
        fill="none"
        strokeWidth="5"
        className={cn("stroke-muted/20 dark:stroke-muted/10", trackClassName)}
      />
      <motion.circle
        cx="50"
        cy="50"
        r={radius}
        fill="none"
        strokeWidth="5"
        strokeDasharray={circumference}
        initial={{ strokeDashoffset: circumference }}
        animate={{ strokeDashoffset }}
        transition={{ duration: 1.2, ease: "easeOut" }}
        strokeLinecap="round"
        className={cn("stroke-primary", className)}
      />
    </g>
  )
}

// Staggered layout variants
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

export function CandidateDashboardClient({
  profile,
  stats: initialStats,
  globalStats: initialGlobalStats,
  streakStats: initialStreakStats,
  activityCalendar: initialActivityCalendar,
  liveTests: initialLiveTests,
  upcomingTests: initialUpcomingTests,
  opportunities: initialOpportunities = [],
  candidateEvent: initialCandidateEvent = null,
  todayStr: initialTodayStr,
  initialPotd: initialPotdProp,
  fullPotdProblem: initialFullPotdProblem,
}: CandidateDashboardClientProps) {
  const router = useRouter()
  const [greeting, setGreeting] = useState("Hello")

  const [data, setData] = useState<CandidateHomeData | null>(() => {
    if (initialStats && initialGlobalStats && initialStreakStats && initialActivityCalendar) {
      return {
        stats: initialStats,
        globalStats: initialGlobalStats,
        streakStats: initialStreakStats,
        activityCalendar: initialActivityCalendar,
        liveTests: initialLiveTests || [],
        upcomingTests: initialUpcomingTests || [],
        opportunities: initialOpportunities || [],
        candidateEvent: initialCandidateEvent || null,
        todayStr: initialTodayStr || new Date().toISOString().split("T")[0],
        initialPotd: initialPotdProp || null,
        fullPotdProblem: initialFullPotdProblem || null,
      }
    }
    return null
  })
  const [isLoading, setIsLoading] = useState<boolean>(!data)

  useEffect(() => {
    if (data) return
    let isMounted = true

    fetchCandidateDashboardData(profile.id, profile.institute_id)
      .then((res) => {
        if (isMounted) {
          setData(res)
          setIsLoading(false)
        }
      })
      .catch((err) => {
        console.error("[CandidateDashboardClient] Client fetch error:", err)
        if (isMounted) setIsLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [profile.id, profile.institute_id, data])

  const stats = data?.stats || {
    total_tests: 0,
    live_tests: 0,
    upcoming_tests: 0,
    completed_tests: 0,
    average_score: 0,
  }
  const globalStats = data?.globalStats || {
    total: 0,
    solved: 0,
    easy: { total: 0, solved: 0 },
    medium: { total: 0, solved: 0 },
    hard: { total: 0, solved: 0 },
  }
  const streakStats = data?.streakStats || { currentStreak: 0, maxStreak: 0 }
  const activityCalendar = data?.activityCalendar || []
  const liveTests = data?.liveTests || []
  const upcomingTests = data?.upcomingTests || []
  const opportunities = data?.opportunities || []
  const candidateEvent = data?.candidateEvent || null
  const todayStr = data?.todayStr || new Date().toISOString().split("T")[0]
  const initialPotd = data?.initialPotd || null
  const fullPotdProblem = data?.fullPotdProblem || null

  const calculateTimeLeft = () => {
    const now = new Date();
    const nextMidnightUTC = new Date(now);
    nextMidnightUTC.setUTCHours(24, 0, 0, 0);

    const diff = nextMidnightUTC.getTime() - now.getTime();

    if (diff <= 0) return "00h 00m 00s";

    const h = Math.floor(diff / (1000 * 60 * 60)).toString().padStart(2, '0');
    const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)).toString().padStart(2, '0');
    const s = Math.floor((diff % (1000 * 60)) / 1000).toString().padStart(2, '0');

    return `${h}h ${m}m ${s}s`;
  }

  const [timeLeft, setTimeLeft] = useState<string>("")

  const cellRadiusClass = "rounded-[18%]"

  const getTooltipText = useCallback((cell: CalendarCell) => {
    if (!cell.count || cell.count === 0) {
      return `No activity on ${cell.date}`
    }

    const solvedParts: string[] = []
    if (cell.easySolved && cell.easySolved > 0) solvedParts.push(`${cell.easySolved} Easy`)
    if (cell.mediumSolved && cell.mediumSolved > 0) solvedParts.push(`${cell.mediumSolved} Medium`)
    if (cell.hardSolved && cell.hardSolved > 0) solvedParts.push(`${cell.hardSolved} Hard`)

    const attemptedParts: string[] = []
    if (cell.easyAttempted && cell.easyAttempted > 0) attemptedParts.push(`${cell.easyAttempted} Easy`)
    if (cell.mediumAttempted && cell.mediumAttempted > 0) attemptedParts.push(`${cell.mediumAttempted} Medium`)
    if (cell.hardAttempted && cell.hardAttempted > 0) attemptedParts.push(`${cell.hardAttempted} Hard`)

    const solvedStr = solvedParts.length > 0 ? `${solvedParts.join(", ")} solved` : ""
    const attemptedStr = attemptedParts.length > 0 ? `${attemptedParts.join(", ")} attempted` : ""

    let detail = ""
    if (solvedStr && attemptedStr) {
      detail = ` (${solvedStr}, ${attemptedStr})`
    } else if (solvedStr) {
      detail = ` (${solvedStr})`
    } else if (attemptedStr) {
      detail = ` (${attemptedStr})`
    }

    return `${cell.date}: ${cell.count} submission${cell.count > 1 ? "s" : ""}${detail}`
  }, [])

  // Align cells into weeks starting on Sunday for 20-week heatmap
  const alignedWeeks = useMemo(() => {
    const result: CalendarCell[][] = []
    let currentWeek: CalendarCell[] = []

    if (!activityCalendar || activityCalendar.length === 0) return result

    const firstDay = activityCalendar[0].dayOfWeek
    for (let i = 0; i < firstDay; i++) {
      currentWeek.push({ date: "", count: 0, status: "none", dayOfWeek: i })
    }

    activityCalendar.forEach((cell) => {
      currentWeek.push(cell)
      if (cell.dayOfWeek === 6) {
        result.push(currentWeek)
        currentWeek = []
      }
    })

    if (currentWeek.length > 0) {
      const lastDay = currentWeek[currentWeek.length - 1].dayOfWeek
      for (let i = lastDay + 1; i <= 6; i++) {
        currentWeek.push({ date: "", count: 0, status: "none", dayOfWeek: i })
      }
      result.push(currentWeek)
    }

    return result.slice(-20)
  }, [activityCalendar])

  const { displayColumns, visibleMonthLabels } = useMemo(() => {
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const cols: any[] = [];
    const labels: string[] = [];

    let currentMonthStr = "";

    alignedWeeks.forEach((week) => {
      const monthsInWeek: string[] = [];
      week.forEach((cell) => {
        if (cell && cell.date) {
          const m = cell.date.substring(0, 7);
          if (!monthsInWeek.includes(m)) monthsInWeek.push(m);
        }
      });

      if (monthsInWeek.length === 2) {
        const m1 = monthsInWeek[0];
        const m2 = monthsInWeek[1];

        const part1 = week.map((c) =>
          c && c.date && c.date.substring(0, 7) === m1 ? c : { date: "", count: 0, status: "none", dayOfWeek: c?.dayOfWeek || 0 }
        );
        const part2 = week.map((c) =>
          c && c.date && c.date.substring(0, 7) === m2 ? c : { date: "", count: 0, status: "none", dayOfWeek: c?.dayOfWeek || 0 }
        );

        if (currentMonthStr === "") {
          currentMonthStr = m1;
          labels.push(monthNames[parseInt(m1.split("-")[1], 10) - 1]);
        } else {
          labels.push("");
        }
        cols.push(part1);

        cols.push("GAP");
        labels.push("");

        cols.push(part2);
        labels.push(monthNames[parseInt(m2.split("-")[1], 10) - 1]);
        currentMonthStr = m2;
      } else if (monthsInWeek.length === 1) {
        const m = monthsInWeek[0];
        if (currentMonthStr !== "" && m !== currentMonthStr) {
          cols.push("GAP");
          labels.push("");
          cols.push(week);
          labels.push(monthNames[parseInt(m.split("-")[1], 10) - 1]);
        } else {
          cols.push(week);
          if (currentMonthStr === "") {
            labels.push(monthNames[parseInt(m.split("-")[1], 10) - 1]);
          } else {
            labels.push("");
          }
        }
        currentMonthStr = m;
      } else {
        cols.push(week);
        labels.push("");
      }
    });

    return { displayColumns: cols, visibleMonthLabels: labels };
  }, [alignedWeeks])

  useEffect(() => {
    const hours = new Date().getHours()
    if (hours >= 0 && hours <= 6) setGreeting("Still up? You're Unstoppable")
    else if (hours < 12) setGreeting("Good morning")
    else if (hours < 17) setGreeting("Good afternoon")
    else setGreeting("Good evening")
  }, [])

  const computedFirstName = profile.full_name ? profile.full_name.split(' ')[0] : null
  const profileName = computedFirstName || profile.username || "Candidate"
  const isProfileComplete = profile.profile_updated === true

  if (isLoading || !data) {
    return <LogoLoading variant="screen-centered" className="min-h-[70vh]" />
  }

  return (
    <div className="flex flex-col gap-6 px-4 py-8 md:px-8 w-full animate-in fade-in duration-500">
      <Suspense><LicenseBanner /></Suspense>

      {!isProfileComplete && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-lg border border-amber-500/20 bg-amber-500/10 p-3.5 text-sm text-amber-800 dark:text-amber-300">
          <div className="flex items-start gap-3 min-w-0">
            <Award className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
            <div className="min-w-0">
              <p className="font-semibold leading-none">Profile Incomplete</p>
              <p className="mt-1 text-xs opacity-90 leading-relaxed">
                Please complete your profile to unlock placement opportunities, test schedules, and other features.
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

        {/* Cell 1: Welcome & Streak (col-span-3 - natural height header) */}
        <motion.div variants={itemVariants} className="lg:col-span-3 md:col-span-2 col-span-1">
          <Card className="relative overflow-hidden shadow-md rounded-2xl flex flex-col p-0 gap-0">
            {/* Glowing gradients */}
            <div className="absolute inset-0 bg-linear-to-br from-indigo-500/8 via-purple-500/3 to-sky-500/6 pointer-events-none" />

            {/* Tech Dot Pattern */}
            <div className="absolute inset-0 bg-[radial-gradient(#cbd5e1_1.5px,transparent_1.5px)] dark:bg-[radial-gradient(#334155_1.5px,transparent_1.5px)] bg-size-[16px_14px] opacity-60 pointer-events-none" />

            {/* Dynamic background blur blobs (Indigo, Purple, and Sky Blue) */}
            <div className="absolute top-0 right-0 -mt-6 -mr-6 w-44 h-44 bg-indigo-500/20 rounded-full blur-3xl group-hover:bg-indigo-500/25 transition-all duration-300 pointer-events-none" />
            <div className="absolute right-1/4 top-1/4 w-32 h-32 bg-sky-500/15 rounded-full blur-3xl group-hover:bg-sky-500/20 transition-all duration-300 pointer-events-none" />
            <div className="absolute bottom-0 left-1/3 -mb-6 w-36 h-36 bg-purple-500/15 rounded-full blur-2xl group-hover:bg-purple-500/20 transition-all duration-300 pointer-events-none" />

            <CardContent className="p-5 relative z-10 flex flex-col justify-start gap-3.5">
              <div className="flex flex-col gap-1">
                <h1 className="text-3xl md:text-4xl font-bold font-cirka tracking-tight text-foreground leading-tight">
                  {greeting}, {profileName}!
                </h1>
                <p className="text-sm text-muted-foreground max-w-2xl leading-relaxed">
                  Track your Placements, Tests, and Progress in Coding Challenges all from One Dashboard.
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

        {/* Card 1: Daily Challenge (col-span-1) */}
        <motion.div variants={itemVariants} className="col-span-1">
          <Card className="shadow-md rounded-2xl flex flex-col p-0 gap-0 h-full relative py-0">
            <CardContent className="p-5 flex flex-col flex-1 justify-between gap-5 h-full">
              <div className="flex flex-col gap-4 min-w-0">
                <div className="flex flex-row items-center justify-between pb-1">
                  <Link href="/logiclab/dailychallenges" prefetch={false} className="hover:opacity-80 transition-opacity cursor-pointer">
                    <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                      Daily Challenge<ChevronRight className="size-3" />
                    </div>
                  </Link>
                  {timeLeft && (
                    <div className="text-xs text-muted-foreground/80 flex items-center gap-1 font-medium select-none">
                      <Clock className="size-3.5" />
                      {timeLeft}
                    </div>
                  )}
                </div>

                {fullPotdProblem ? (
                  <div className="flex flex-col gap-1.5 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="font-bold text-lg sm:text-xl text-foreground leading-snug">
                        {fullPotdProblem.title}
                      </h3>
                      {fullPotdProblem.solved_status === "Accepted" && (
                        <CircleCheck className="size-6 text-emerald-500 shrink-0 mt-0.5" />
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs sm:text-sm text-muted-foreground">
                      {fullPotdProblem.difficulty && (
                        <span className={cn(
                          "font-semibold",
                          fullPotdProblem.difficulty === "Easy" ? "text-emerald-600 dark:text-emerald-400" :
                            fullPotdProblem.difficulty === "Medium" ? "text-amber-600 dark:text-amber-400" :
                              "text-rose-600 dark:text-rose-400"
                        )}>
                          {fullPotdProblem.difficulty}
                        </span>
                      )}
                      <span>•</span>
                      {fullPotdProblem.acceptance_rate !== undefined && fullPotdProblem.acceptance_rate !== null && (
                        <>
                          <span>{fullPotdProblem.acceptance_rate}% acceptance</span>
                          <span>•</span>
                        </>
                      )}
                      <span>{fullPotdProblem.total_submissions?.toLocaleString() || 0} submissions</span>
                    </div>

                    {fullPotdProblem.tags && fullPotdProblem.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-0.5">
                        {fullPotdProblem.tags.slice(0, 2).map((t: string) => (
                          <span key={t} className="text-[11px] bg-muted px-2.5 py-1 rounded-md text-muted-foreground font-medium">
                            {t}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center text-center gap-2 py-8 text-muted-foreground flex-1">
                    <span className="text-sm font-semibold">No Challenge Available</span>
                    <span className="text-xs">Check back later for today's puzzle.</span>
                  </div>
                )}
              </div>

              <div className="mt-auto pt-2 shrink-0">
                <SolveChallengeButton
                  isSolved={fullPotdProblem?.solved_status === "Accepted"}
                  disabled={!initialPotd || !fullPotdProblem}
                  onClick={() => initialPotd && router.push(`/logiclab/dailychallenges/${initialPotd.id}`)}
                />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Cell 3: Mock Test Performance (col-span-1) */}
        <motion.div variants={itemVariants} className="col-span-1">
          <Card className="shadow-md rounded-2xl flex flex-col p-0 gap-0 h-full">
            <CardContent className="p-5 flex flex-col justify-between flex-1 gap-4">
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Test Performance
              </div>

              <div className="flex items-center justify-between gap-4 flex-1">
                <div className="space-y-2 flex-1">
                  <div>
                    <p className="text-2xl font-extrabold text-foreground tracking-tight">
                      {stats.completed_tests} <span className="text-xs font-normal text-muted-foreground">Tests Taken</span>
                    </p>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] text-muted-foreground">
                      <span className="font-medium">Test Accuracy</span>
                      <span className="font-semibold text-foreground">{Math.round(stats.average_score)}%</span>
                    </div>
                    <Progress
                      value={stats.average_score}
                      className="h-1 bg-primary/10 [&>div]:bg-primary"
                    />
                  </div>
                </div>

                {/* Accuracy Circular Indicator */}
                <div className="relative h-24 w-24 shrink-0 flex items-center justify-center transition-transform duration-500 hover:scale-105">
                  <svg className="w-full h-full" viewBox="0 0 100 100">
                    <ConcentricRing
                      radius={36}
                      value={stats.average_score}
                      max={100}
                      className="stroke-primary"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-lg font-extrabold tracking-tight text-primary">
                      {Math.round(stats.average_score)}
                      <span className="text-xs font-semibold text-primary/70 ml-0.5">%</span>
                    </span>
                    <span className="text-[7px] font-bold tracking-widest text-muted-foreground/80 uppercase text-center leading-none mt-0.5">Avg Score</span>
                  </div>
                </div>
              </div>

              {/* Micro grid stats */}
              <div className="grid grid-cols-3 gap-1 bg-background/50 dark:bg-muted/60 rounded-xl p-2 border border-border select-none text-center">
                <div>
                  <span className="text-[8px] text-muted-foreground font-semibold uppercase tracking-wider block">Assigned</span>
                  <span className="text-xs font-bold text-foreground block">{stats.total_tests}</span>
                </div>
                <div className="border-x border-border">
                  <span className="text-[8px] text-muted-foreground font-semibold uppercase tracking-wider block">Live</span>
                  <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 block">{stats.live_tests}</span>
                </div>
                <div>
                  <span className="text-[8px] text-muted-foreground font-semibold uppercase tracking-wider block">Done</span>
                  <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 block">{stats.completed_tests}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Practice Activity Calendar -> Heatmap Graph (md:col-span-2 lg:col-span-1) */}
        <motion.div variants={itemVariants} className="md:col-span-2 lg:col-span-1">
          <Card className={cn('min-w-0', 'flex', 'flex-col', 'relative', 'py-0', 'shadow-md rounded-2xl h-full')}>
            <CardHeader className={cn('pt-4', 'pb-1')}>
              <CardTitle className={cn('text-xs', 'font-semibold', 'text-muted-foreground', 'uppercase', 'tracking-wider')}>
                Logic Lab Activity Graph
              </CardTitle>
            </CardHeader>

            <CardContent className={cn('flex', 'flex-col', 'flex-1', 'justify-between', 'gap-5', 'pb-4')}>
              <div className="w-full">
                <div
                  className={cn('grid', 'gap-x-0.5', 'gap-y-0.5', 'sm:gap-x-0.75', 'sm:gap-y-0.75', 'w-full')}
                  style={{
                    gridTemplateColumns: `auto ${displayColumns.map(c => c === "GAP" ? "minmax(4px, 8px)" : "minmax(0, 1fr)").join(" ")}`
                  }}
                >
                  <div className=""></div>
                  {(() => {
                    const blocks: { label: string; span: number }[] = [];
                    let currentLabel: string | null = null;
                    let currentSpan = 0;

                    displayColumns.forEach((col, wIdx) => {
                      const m = visibleMonthLabels[wIdx];
                      if (m) {
                        if (currentSpan > 0) {
                          blocks.push({ label: currentLabel || "", span: currentSpan });
                        }
                        currentLabel = m;
                        currentSpan = 1;
                      } else {
                        if (currentLabel === null) {
                          currentLabel = "";
                        }
                        currentSpan += 1;
                      }
                    });
                    if (currentSpan > 0) {
                      blocks.push({ label: currentLabel || "", span: currentSpan });
                    }

                    return blocks.map((block, i) => (
                      <div key={`month-block-${i}`} className={cn('relative', 'h-5', 'flex', 'items-end', 'justify-center', 'pb-1')} style={{ gridColumn: `span ${block.span}` }}>
                        {block.label && (
                          <span className={cn('text-[10px]', 'font-semibold', 'text-muted-foreground/70', 'whitespace-nowrap')}>
                            {block.label}
                          </span>
                        )}
                      </div>
                    ));
                  })()}

                  {[0, 1, 2, 3, 4, 5, 6].map((dayIndex) => (
                    <React.Fragment key={dayIndex}>
                      <div className={cn('relative', 'w-6', 'sm:w-7')}>
                        <span className={cn('absolute', 'inset-y-0', 'right-2', 'flex', 'items-center', 'text-[10px]', 'font-medium', 'text-muted-foreground/50', 'leading-none')}>
                          {dayIndex === 1 ? "Mon" : dayIndex === 3 ? "Wed" : dayIndex === 5 ? "Fri" : ""}
                        </span>
                      </div>
                      {displayColumns.map((col, wIdx) => {
                        if (col === "GAP") return <div key={`gap-cell-${dayIndex}-${wIdx}`} className="" />;

                        const cell = col[dayIndex];

                        if (!cell || !cell.date) {
                          return (
                            <div
                              key={`cell-${dayIndex}-${wIdx}`}
                              className={cn("w-full aspect-square bg-transparent pointer-events-none", cellRadiusClass)}
                            />
                          );
                        }

                        let cellColor = "bg-muted";
                        if (cell.status === "attempted") {
                          cellColor = "bg-rose-400/80 dark:bg-rose-500/60";
                        } else if (cell.status === "solved") {
                          if (cell.count === 1) cellColor = "bg-sky-300 dark:bg-sky-800";
                          else if (cell.count <= 3) cellColor = "bg-sky-400 dark:bg-sky-600";
                          else if (cell.count <= 6) cellColor = "bg-sky-500 dark:bg-sky-500";
                          else cellColor = "bg-sky-600 dark:bg-sky-400";
                        }

                        return (
                          <div
                            key={`cell-${dayIndex}-${wIdx}`}
                            className={cn(
                              "w-full aspect-square cursor-pointer transition-all hover:ring-2 hover:ring-offset-1 hover:ring-foreground/20 dark:hover:ring-offset-background",
                              cellRadiusClass,
                              cellColor
                            )}
                            title={getTooltipText(cell)}
                          />
                        );
                      })}
                    </React.Fragment>
                  ))}
                </div>
              </div>

              <div className={cn('mt-auto', 'flex', 'items-end', 'justify-between', 'gap-4', 'flex-wrap', 'min-w-0', 'w-full')}>
                <div className={cn('flex', 'items-center', 'gap-2', 'text-[10px]', 'font-medium', 'text-muted-foreground/70', 'pb-0.5')}>
                  <span>Less</span>
                  <div className={cn('flex', 'gap-0.75', 'items-center')}>
                    <div className={cn("size-2.5 bg-muted", cellRadiusClass)} title="0 submissions" />
                    <div className={cn("size-2.5 bg-rose-400/80 dark:bg-rose-500/60", cellRadiusClass)} title="Attempted" />
                    <div className={cn("size-2.5 bg-sky-300 dark:bg-sky-800", cellRadiusClass)} title="1 submission" />
                    <div className={cn("size-2.5 bg-sky-400 dark:bg-sky-600", cellRadiusClass)} title="2-3 submissions" />
                    <div className={cn("size-2.5 bg-sky-500 dark:bg-sky-500", cellRadiusClass)} title="4-6 submissions" />
                    <div className={cn("size-2.5 bg-sky-600 dark:bg-sky-400", cellRadiusClass)} title="7+ submissions" />
                  </div>
                  <span>More</span>
                </div>

                <div className={cn('flex', 'items-center', 'gap-2.5', 'shrink-0', 'text-sm', 'font-semibold', 'cursor-pointer', 'group/streak')}>
                  <div className={cn('flex', 'items-center', 'gap-1.5', 'text-foreground')}>
                    <Flame className={cn('size-4', 'text-orange-500', 'fill-orange-500/10', 'shrink-0', 'transition-all', 'duration-300', 'group-hover/streak:scale-125', 'group-hover/streak:text-orange-600', 'dark:group-hover/streak:text-orange-400', 'group-hover/streak:rotate-12', 'group-hover/streak:filter', 'group-hover/streak:drop-shadow-[0_0_8px_rgba(249,115,22,0.6)]')} />
                    <span className={cn('transition-colors', 'group-hover/streak:text-orange-500')}>{streakStats.currentStreak} day streak</span>
                  </div>
                  <span className="text-muted-foreground/30">|</span>
                  <span className={cn('text-xs', 'text-muted-foreground', 'font-medium')}>
                    Max: <span className={cn('text-foreground', 'font-semibold', 'transition-colors', 'group-hover/streak:text-foreground/80')}>{streakStats.maxStreak}</span>
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Card 1: Active & Upcoming Tests */}
        <motion.div variants={itemVariants} className="lg:col-span-1 md:col-span-2 col-span-1">
          <Card className="shadow-md rounded-2xl flex flex-col p-0 gap-0 h-full relative py-0">
            <CardContent className="p-5 flex flex-col flex-1 justify-between gap-5 h-full">
              {(() => {
                const displayTest = liveTests.length > 0
                  ? { ...liveTests[0], isLive: true }
                  : upcomingTests.length > 0
                    ? { ...upcomingTests[0], isLive: false }
                    : null

                return (
                  <>
                    <div className="flex flex-col gap-4 min-w-0">
                      <div className="flex flex-row items-center justify-between pb-1">
                        <Link href="/tests" prefetch={false} className="hover:opacity-80 transition-opacity cursor-pointer">
                          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                            Tests<ChevronRight className="size-3" />
                          </div>
                        </Link>
                        {displayTest && (
                          displayTest.isLive ? (
                            <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-transparent font-medium text-[10px] px-2 py-0.5">
                              Live Now
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-blue-600 dark:text-blue-400 border-blue-500/20 bg-blue-500/5 font-medium text-[10px] px-2 py-0.5">
                              Upcoming
                            </Badge>
                          )
                        )}
                      </div>

                      {displayTest ? (
                        <div className="flex flex-col gap-1.5 flex-1">
                          <h3 className="font-bold text-lg sm:text-xl text-foreground leading-snug">
                            {displayTest.title}
                          </h3>
                          <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                            {displayTest.description || "No description provided."}
                          </p>

                          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground pt-1">
                            {displayTest.time_limit_seconds && (
                              <span className="flex items-center gap-1 font-medium">
                                <Clock className="size-3.5" />
                                {Math.round(displayTest.time_limit_seconds / 60)} mins
                              </span>
                            )}
                            {displayTest.isLive && displayTest.available_until && (
                              <span>• Ends: {new Date(displayTest.available_until).toLocaleString([], { dateStyle: "short", timeStyle: "short", hour12: true })}</span>
                            )}
                            {!displayTest.isLive && displayTest.available_from && (
                              <span>• Starts: {new Date(displayTest.available_from).toLocaleString([], { dateStyle: "short", timeStyle: "short", hour12: true })}</span>
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
                        if (displayTest) {
                          router.push(`/tests/${displayTest.id}`)
                        } else {
                          router.push("/tests")
                        }
                      }}
                    >
                      {displayTest ? (displayTest.isLive ? "Start Test" : "View Test Details") : "Go to Tests Hub"}
                    </Button>
                  </>
                )
              })()}
            </CardContent>
          </Card>
        </motion.div>

        {/* Card 2: Active & Upcoming Events */}
        <motion.div variants={itemVariants} className="lg:col-span-1 md:col-span-2 col-span-1">
          <Card className="shadow-md rounded-2xl flex flex-col p-0 gap-0 h-full relative py-0">
            <CardContent className="p-5 flex flex-col flex-1 justify-between gap-5 h-full">
              <div className="flex flex-col gap-4 min-w-0">
                <div className="flex flex-row items-center justify-between pb-1">
                  <Link href="/events" prefetch={false} className="hover:opacity-80 transition-opacity cursor-pointer">
                    <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                      Events<ChevronRight className="size-3" />
                    </div>
                  </Link>
                  {candidateEvent && (
                    candidateEvent.derived_status === "live" ? (
                      <Badge className="bg-sky-500/10 text-sky-700 dark:text-sky-400 border-transparent font-medium text-[10px] px-2 py-0.5">
                        Happening Now
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-blue-600 dark:text-blue-400 border-blue-500/20 bg-blue-500/5 font-medium text-[10px] px-2 py-0.5">
                        Upcoming
                      </Badge>
                    )
                  )}
                </div>

                {candidateEvent ? (
                  <div className="flex flex-col gap-1.5 flex-1">
                    <h3 className="font-bold text-lg sm:text-xl text-foreground leading-snug">
                      {candidateEvent.title}
                    </h3>
                    {candidateEvent.speaker_name && (
                      <p className="text-xs font-semibold text-sky-600 dark:text-sky-400">
                        Speaker: {candidateEvent.speaker_name}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                      {candidateEvent.description || "No description provided."}
                    </p>

                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground pt-1">
                      <span className="flex items-center gap-1 font-medium">
                        <MapPin className="size-3.5" />
                        {candidateEvent.venue || "Campus Main Hall"}
                      </span>
                      {candidateEvent.date && (
                        <span>
                          • {candidateEvent.derived_status === "live" ? "Started: " : "Date: "}
                          {new Date(candidateEvent.date).toLocaleString([], { dateStyle: "short", timeStyle: "short", hour12: true })}
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
                  if (candidateEvent) {
                    router.push(`/events/${candidateEvent.id}`)
                  } else {
                    router.push("/events")
                  }
                }}
              >
                {candidateEvent ? (candidateEvent.derived_status === "live" ? "Join Live Event" : "View Event Details") : "Explore Events"}
              </Button>
            </CardContent>
          </Card>
        </motion.div>

        {/* Card 3: Active & Upcoming Opportunities */}
        <motion.div variants={itemVariants} className="lg:col-span-1 md:col-span-2 col-span-1">
          <Card className="shadow-md rounded-2xl flex flex-col p-0 gap-0 h-full relative py-0">
            <CardContent className="p-5 flex flex-col flex-1 justify-between gap-5 h-full">
              {(() => {
                const opp = opportunities.length > 0 ? opportunities[0] : null
                const ctcOrStipend = opp?.ctc_lpa
                  ? `${opp.ctc_lpa} LPA`
                  : opp?.stipend_monthly
                    ? `₹${opp.stipend_monthly.toLocaleString()}/mo`
                    : null

                return (
                  <>
                    <div className="flex flex-col gap-4 min-w-0">
                      <div className="flex flex-row items-center justify-between pb-1">
                        <Link href="/opportunities" prefetch={false} className="hover:opacity-80 transition-opacity cursor-pointer">
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
                            <Badge className="bg-purple-500/10 text-purple-700 dark:text-purple-300 border-transparent font-medium text-[10px] px-2 py-0.5">
                              Active Drive
                            </Badge>
                          )}
                        </div>
                      </div>

                      {opp ? (
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
                              <span>• Deadline: {new Date(opp.deadline).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
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
                          router.push("/opportunities")
                        }
                      }}
                    >
                      {opp ? "View Opportunity" : "Explore Opportunities"}
                    </Button>
                  </>
                )
              })()}
            </CardContent>
          </Card>
        </motion.div>

      </motion.div>
    </div>
  )
}
