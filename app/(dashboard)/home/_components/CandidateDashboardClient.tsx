"use client"

import React, { useState, useEffect } from "react"
import { motion } from "framer-motion"
import Link from "next/link"
import {
  Flame,
  Award,
  Briefcase,
  ArrowRight,
  Clock,
  AlertCircle,
  MapPin,
  Building2,
  Sparkles,
  Laptop,
  BookOpen,
  ChevronRight,
  Info,
  FileText,
  Search,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert"
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
  EmptyMedia,
} from "@/components/ui/empty"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"

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

interface JobApplication {
  id: string
  status: string
  created_at: string
  title: string
  company_name: string
  location: string | null
  work_mode: string | null
}

interface MockTest {
  id: string
  title: string
  description: string | null
  time_limit_seconds: number | null
  available_from: string | null
  available_until: string | null
}

interface CandidateDashboardClientProps {
  profile: {
    id: string
    username: string | null
    full_name: string | null
    first_name: string | null
    last_name: string | null
    profile_complete: boolean | null
    profile_updated: boolean
    institute_id: string | null
  }
  stats: TestStats
  globalStats: ProblemStats
  streakStats: {
    currentStreak: number
    maxStreak: number
  }
  activityCalendar: Array<{
    date: string
    count: number
    status: "none" | "attempted" | "solved"
  }>
  jobApplications: JobApplication[]
  liveTests: MockTest[]
  upcomingTests: MockTest[]
  todayStr: string
}

const STATUS_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  applied: {
    bg: "bg-blue-50 dark:bg-blue-950/20",
    text: "text-blue-700 dark:text-blue-400 border-blue-200/50 dark:border-blue-800/30",
    dot: "bg-blue-500",
  },
  screening: {
    bg: "bg-indigo-50 dark:bg-indigo-950/20",
    text: "text-indigo-700 dark:text-indigo-400 border-indigo-200/50 dark:border-indigo-800/30",
    dot: "bg-indigo-500",
  },
  interviewing: {
    bg: "bg-amber-50 dark:bg-amber-950/20",
    text: "text-amber-700 dark:text-amber-400 border-amber-200/50 dark:border-amber-800/30",
    dot: "bg-amber-500",
  },
  offered: {
    bg: "bg-emerald-50 dark:bg-emerald-950/20",
    text: "text-emerald-700 dark:text-emerald-400 border-emerald-200/50 dark:border-emerald-800/30",
    dot: "bg-emerald-500",
  },
  rejected: {
    bg: "bg-rose-50 dark:bg-rose-950/20",
    text: "text-rose-700 dark:text-rose-400 border-rose-200/50 dark:border-rose-800/30",
    dot: "bg-rose-500",
  },
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

export function CandidateDashboardClient({
  profile,
  stats,
  globalStats,
  streakStats,
  activityCalendar,
  jobApplications,
  liveTests,
  upcomingTests,
  todayStr,
}: CandidateDashboardClientProps) {
  const [greeting, setGreeting] = useState("Hello")

  useEffect(() => {
    const hours = new Date().getHours()
    if (hours >= 0 && hours <= 6) setGreeting("Still up? You're Unstoppable")
    else if (hours < 12) setGreeting("Good morning")
    else if (hours < 17) setGreeting("Good afternoon")
    else setGreeting("Good evening")
  }, [])

  const profileName = profile.first_name || profile.full_name || profile.username || "Candidate"
  const isProfileComplete = profile.profile_complete === true && profile.profile_updated === true

  return (
    <div className="flex flex-col gap-6 px-4 py-8 md:px-8 w-full animate-in fade-in duration-500">
      {/* ─── Hero Welcome Banner (Using Card) ─── */}
      <Card className="relative overflow-hidden border-border/40 bg-card/50 backdrop-blur-sm shadow-sm py-6">

        <CardContent className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10 px-6 py-0">
          <div className="space-y-2">
            {streakStats.currentStreak > 0 && (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 text-xs font-semibold text-orange-600 dark:text-orange-400 bg-orange-500/10 px-2.5 py-1 rounded-full">
                  <Flame className="h-3.5 w-3.5 fill-orange-500 text-orange-500" strokeWidth={1.5} />
                  <span>{streakStats.currentStreak} Day Streak</span>
                </div>
              </div>
            )}
            <h1 className="text-3xl md:text-4xl font-bold font-cirka tracking-tight text-foreground">
              {greeting}, {profileName}!
            </h1>
            <p className="text-sm text-muted-foreground">
              Track your Placements, Mock Tests, and Progress in Coding Challenges all from One Dashboard.
            </p>
          </div>

        </CardContent>
      </Card>

      {/* Complete Profile banner (Separate CTA block) */}
      {!isProfileComplete && (
        <Alert className="bg-amber-500/[0.03] dark:bg-amber-500/[0.01] border-amber-500/20 text-amber-800 dark:text-amber-300 flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 md:p-5 rounded-xl shadow-xs">
          <div className="flex items-start gap-3.5 min-w-0">
            <div className="p-2 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 shrink-0">
              <AlertCircle className="h-5 w-5 animate-pulse" strokeWidth={2} />
            </div>
            <div className="space-y-1">
              <AlertTitle className="text-sm font-bold tracking-tight text-amber-900 dark:text-amber-200">
                Your profile is incomplete!
              </AlertTitle>
              <AlertDescription className="text-xs text-muted-foreground leading-relaxed max-w-2xl">
                Please complete your profile to unlock custom placements, track mock tests, and get verified by your institution.
              </AlertDescription>
            </div>
          </div>
          <Button asChild size="sm" className="bg-amber-600 hover:bg-amber-700 text-white dark:bg-amber-500 dark:hover:bg-amber-600 dark:text-zinc-950 rounded-full font-semibold px-5 shrink-0 shadow-xs shadow-amber-500/10">
            <Link href="/myprofile" className="flex items-center gap-1.5 text-xs">
              Complete Profile
              <ArrowRight className="h-3.5 w-3.5" strokeWidth={2} />
            </Link>
          </Button>
        </Alert>
      )}

      {/* ─── Main Content ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ── COLUMN 1: Performance & Practice (Span 2) ── */}
        <div className="lg:col-span-2 space-y-6">

          {/* Card: Practice & Mock Test Insights */}
          <Card className="bg-card/50 backdrop-blur-sm border-border/40 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-lg font-semibold tracking-tight text-foreground">
                Performance Insights
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Left Panel: LogicLab Coding Stats */}
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.45, ease: "easeOut" }}
                  whileHover={{ y: -3, scale: 1.01 }}
                  className="flex flex-row items-center justify-between gap-6 p-5 md:p-6 rounded-2xl bg-muted/15 border border-border/30 hover:border-border/60 hover:bg-muted/20 transition-all duration-300 shadow-[0_2px_8px_-3px_rgba(0,0,0,0.05)]"
                >
                  <div className="space-y-4 flex-1">
                    <div>
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                        Coding Challenges
                      </p>
                      <p className="text-2xl font-bold mt-0.5 text-foreground">
                        {globalStats.solved} <span className="text-xs font-normal text-muted-foreground">/ {globalStats.total} Solved</span>
                      </p>
                    </div>

                    <div className="space-y-2.5">
                      {/* Easy */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[10px]">
                          <div className="flex items-center gap-1.5 text-muted-foreground">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                            <span className="font-medium">Easy</span>
                          </div>
                          <span className="font-semibold text-foreground">{globalStats.easy.solved}/{globalStats.easy.total}</span>
                        </div>
                        <Progress
                          value={globalStats.easy.total > 0 ? (globalStats.easy.solved / globalStats.easy.total) * 100 : 0}
                          className="h-1.5 bg-emerald-500/10 [&>div]:bg-emerald-500"
                        />
                      </div>
                      {/* Medium */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[10px]">
                          <div className="flex items-center gap-1.5 text-muted-foreground">
                            <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                            <span className="font-medium">Medium</span>
                          </div>
                          <span className="font-semibold text-foreground">{globalStats.medium.solved}/{globalStats.medium.total}</span>
                        </div>
                        <Progress
                          value={globalStats.medium.total > 0 ? (globalStats.medium.solved / globalStats.medium.total) * 100 : 0}
                          className="h-1.5 bg-amber-500/10 [&>div]:bg-amber-500"
                        />
                      </div>
                      {/* Hard */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[10px]">
                          <div className="flex items-center gap-1.5 text-muted-foreground">
                            <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                            <span className="font-medium">Hard</span>
                          </div>
                          <span className="font-semibold text-foreground">{globalStats.hard.solved}/{globalStats.hard.total}</span>
                        </div>
                        <Progress
                          value={globalStats.hard.total > 0 ? (globalStats.hard.solved / globalStats.hard.total) * 100 : 0}
                          className="h-1.5 bg-rose-500/10 [&>div]:bg-rose-500"
                        />
                      </div>
                    </div>
                  </div>

                  <Separator orientation="vertical" className="h-28 hidden sm:block bg-border/40" />

                  {/* SVG Concentric Ring with premium motion transition */}
                  <div className="relative h-28 w-28 shrink-0 flex items-center justify-center">
                    <svg className="w-full h-full" viewBox="0 0 100 100">
                      <ConcentricRing
                        radius={42}
                        value={globalStats.easy.solved}
                        max={globalStats.easy.total}
                        className="stroke-emerald-500"
                      />
                      <ConcentricRing
                        radius={32}
                        value={globalStats.medium.solved}
                        max={globalStats.medium.total}
                        className="stroke-amber-500"
                      />
                      <ConcentricRing
                        radius={22}
                        value={globalStats.hard.solved}
                        max={globalStats.hard.total}
                        className="stroke-rose-500"
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <span className="text-lg font-bold text-foreground">
                        {globalStats.total > 0 ? Math.round((globalStats.solved / globalStats.total) * 100) : 0}%
                      </span>
                      <span className="text-[9px] text-muted-foreground uppercase font-semibold">Progress</span>
                    </div>
                  </div>
                </motion.div>

                {/* Right Panel: Mock Test Performance */}
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.45, ease: "easeOut", delay: 0.1 }}
                  whileHover={{ y: -3, scale: 1.01 }}
                  className="flex flex-row items-center justify-between gap-6 p-5 md:p-6 rounded-2xl bg-muted/15 border border-border/30 hover:border-border/60 hover:bg-muted/20 transition-all duration-300 shadow-[0_2px_8px_-3px_rgba(0,0,0,0.05)]"
                >
                  <div className="space-y-4 flex-1">
                    <div>
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                        Mock Test Performance
                      </p>
                      <p className="text-2xl font-bold mt-0.5 text-foreground">
                        {stats.completed_tests} <span className="text-xs font-normal text-muted-foreground">Tests Taken</span>
                      </p>
                    </div>

                    <div className="space-y-2.5">
                      <div className="space-y-1">
                        <div className="flex justify-between text-[10px] text-muted-foreground">
                          <span className="font-medium">Test Accuracy</span>
                          <span className="font-semibold text-foreground">{Math.round(stats.average_score)}%</span>
                        </div>
                        <Progress
                          value={stats.average_score}
                          className="h-1.5 bg-primary/10 [&>div]:bg-primary"
                        />
                      </div>

                      {/* Refined stats grid */}
                      <div className="grid grid-cols-3 gap-2 mt-4 bg-background/50 dark:bg-muted/10 rounded-xl p-2.5 border border-border/20 select-none text-center">
                        <div>
                          <span className="text-[9px] text-muted-foreground font-semibold uppercase tracking-wider block">Assigned</span>
                          <span className="text-sm font-bold text-foreground mt-0.5 block">{stats.total_tests}</span>
                        </div>
                        <div className="border-x border-border/20">
                          <span className="text-[9px] text-muted-foreground font-semibold uppercase tracking-wider block">Live</span>
                          <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400 mt-0.5 block">{stats.live_tests}</span>
                        </div>
                        <div>
                          <span className="text-[9px] text-muted-foreground font-semibold uppercase tracking-wider block">Completed</span>
                          <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400 mt-0.5 block">{stats.completed_tests}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <Separator orientation="vertical" className="h-28 hidden sm:block bg-border/40" />

                  {/* Score Radial Ring with dynamic grow transition */}
                  <div className="relative h-28 w-28 shrink-0 flex items-center justify-center">
                    <svg className="w-full h-full" viewBox="0 0 100 100">
                      <ConcentricRing
                        radius={36}
                        value={stats.average_score}
                        max={100}
                        className="stroke-primary"
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <span className="text-lg font-bold text-primary">
                        {Math.round(stats.average_score)}%
                      </span>
                      <span className="text-[9px] text-muted-foreground uppercase font-semibold text-center leading-none mt-0.5">Avg Score</span>
                    </div>
                  </div>
                </motion.div>
              </div>

              {/* 14-Day Activity Tracker Section */}
              <div className="border-t border-border/30 pt-5 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                    <Info className="h-3.5 w-3.5 text-muted-foreground/80" strokeWidth={1.5} />
                    Practice Activity (Last 14 Days)
                  </span>

                  {/* Calendar Legend */}
                  <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <span className="h-2 w-2 rounded-sm bg-background border border-border/30" />
                      <span>No Activity</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="h-2 w-2 rounded-sm bg-amber-500/10 border border-amber-500/30" />
                      <span>Attempted</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="h-2 w-2 rounded-sm bg-emerald-500/10 border border-emerald-500/30" />
                      <span>Solved</span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {activityCalendar.map((day) => {
                    const isToday = day.date === todayStr
                    return (
                      <div
                        key={day.date}
                        className={cn(
                          "h-10 flex-1 min-w-[36px] rounded-lg border flex flex-col items-center justify-center gap-0.5 transition-all relative group cursor-default hover:scale-105",
                          day.status === "solved"
                            ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-400"
                            : day.status === "attempted"
                              ? "bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-400"
                              : "bg-background border-border/30 text-muted-foreground",
                          isToday && "ring-2 ring-indigo-500 ring-offset-2 ring-offset-background"
                        )}
                      >
                        <span className="text-[10px] font-bold">
                          {new Date(day.date).getDate()}
                        </span>
                        <span className="text-[8px] opacity-75">
                          {new Date(day.date).toLocaleDateString("en-US", { weekday: "short" }).substring(0, 1)}
                        </span>

                        {/* Tooltip on hover */}
                        <div className="absolute bottom-full mb-2 hidden group-hover:block bg-popover text-popover-foreground border text-xs px-2.5 py-1.5 rounded shadow-lg z-30 whitespace-nowrap pointer-events-none animate-in fade-in slide-in-from-bottom-1">
                          <p className="font-semibold">{day.date}</p>
                          <p className="text-[10px] text-muted-foreground">
                            {day.count} submission{day.count !== 1 && "s"} · {day.status === "solved" ? "Solved Challenge" : day.status === "attempted" ? "Attempted" : "No submissions"}
                          </p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Card: Active / Upcoming Mock Tests */}
          <Card className="bg-card/50 backdrop-blur-sm border-border/40 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg font-semibold tracking-tight text-foreground">
                Active & Upcoming Tests
              </CardTitle>
            </CardHeader>
            <CardContent>
              {liveTests.length === 0 && upcomingTests.length === 0 ? (
                <Empty className="p-8 border-dashed border-border/30 rounded-xl bg-background/10">
                  <EmptyHeader>
                    <EmptyMedia variant="icon" className="bg-blue-500/10 text-blue-500 rounded-full">
                      <BookOpen className="h-5 w-5" strokeWidth={1.5} />
                    </EmptyMedia>
                    <EmptyTitle className="text-sm font-semibold">No active Tests</EmptyTitle>
                    <EmptyDescription className="text-xs">
                      There are no active or upcoming mock Tests assigned by your institution at the moment.
                    </EmptyDescription>
                  </EmptyHeader>
                </Empty>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Live Tests */}
                  {liveTests.map((test) => (
                    <div
                      key={test.id}
                      className="border border-emerald-500/20 bg-emerald-500/[0.02] rounded-xl p-4 flex flex-col justify-between gap-4 transition-all hover:bg-emerald-500/[0.04]"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/20 border-transparent font-medium">
                            Live Now
                          </Badge>
                          {test.time_limit_seconds && (
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Clock className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={1.5} />
                              {Math.round(test.time_limit_seconds / 60)}m
                            </span>
                          )}
                        </div>
                        <h4 className="font-semibold text-foreground text-sm line-clamp-1 mt-1">{test.title}</h4>
                        <p className="text-xs text-muted-foreground line-clamp-2">{test.description || "No description provided."}</p>
                      </div>

                      <Link href={`/tests`} className="w-full mt-2">
                        <Button size="sm" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs">
                          Start Test
                        </Button>
                      </Link>
                    </div>
                  ))}

                  {/* Upcoming Tests */}
                  {upcomingTests.map((test) => (
                    <div
                      key={test.id}
                      className="border border-border/30 bg-background/30 rounded-xl p-4 flex flex-col justify-between gap-4 transition-all hover:bg-background/50"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <Badge variant="outline" className="text-amber-600 dark:text-amber-400 border-amber-500/20 bg-amber-500/5 hover:bg-amber-500/10 font-medium">
                            Upcoming
                          </Badge>
                          {test.time_limit_seconds && (
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Clock className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={1.5} />
                              {Math.round(test.time_limit_seconds / 60)}m
                            </span>
                          )}
                        </div>
                        <h4 className="font-semibold text-foreground text-sm line-clamp-1 mt-1">{test.title}</h4>
                        <p className="text-xs text-muted-foreground line-clamp-2">{test.description || "No description provided."}</p>
                      </div>

                      <div className="text-[11px] text-muted-foreground bg-muted/30 px-2.5 py-1.5 rounded-lg border border-border/20 mt-2">
                        Starts: <span className="font-medium text-foreground">
                          {test.available_from ? new Date(test.available_from).toLocaleString([], { dateStyle: "short", timeStyle: "short" }) : "N/A"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ── COLUMN 2: Tasks & Applications Tracker (Span 1) ── */}
        <div className="space-y-6">

          {/* Card: Quick Shortcuts */}
          <Card className="bg-card/50 backdrop-blur-sm border-border/40 shadow-sm">
            <CardHeader>
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Quick Navigation
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-2">
              <Link href="/logiclab" className="group flex items-center justify-between p-3 rounded-xl border border-border/30 hover:border-indigo-500/30 hover:bg-indigo-500/[0.02] transition-all">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-600 dark:text-indigo-400 group-hover:scale-105 transition-transform">
                    <Laptop className="h-4 w-4 text-indigo-500" strokeWidth={1.5} />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-foreground">Logic Lab</p>
                    <p className="text-[10px] text-muted-foreground">Practice coding challenges</p>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform" strokeWidth={1.5} />
              </Link>

              <Link href="/courses" className="group flex items-center justify-between p-3 rounded-xl border border-border/30 hover:border-sky-500/30 hover:bg-sky-500/[0.02] transition-all">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-sky-500/10 flex items-center justify-center text-sky-600 dark:text-sky-400 group-hover:scale-105 transition-transform">
                    <BookOpen className="h-4 w-4 text-sky-500" strokeWidth={1.5} />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-foreground">Courses</p>
                    <p className="text-[10px] text-muted-foreground">Learn and upgrade your skills</p>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform" strokeWidth={1.5} />
              </Link>

              <Link href="/tests" className="group flex items-center justify-between p-3 rounded-xl border border-border/30 hover:border-emerald-500/30 hover:bg-emerald-500/[0.02] transition-all">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400 group-hover:scale-105 transition-transform">
                    <Award className="h-4 w-4 text-emerald-500" strokeWidth={1.5} />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-foreground">Tests</p>
                    <p className="text-[10px] text-muted-foreground">View and take mock tests</p>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform" strokeWidth={1.5} />
              </Link>

              <Link href="/jobs" className="group flex items-center justify-between p-3 rounded-xl border border-border/30 hover:border-amber-500/30 hover:bg-amber-500/[0.02] transition-all">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-600 dark:text-amber-400 group-hover:scale-105 transition-transform">
                    <Briefcase className="h-4 w-4 text-amber-500" strokeWidth={1.5} />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-foreground">Explore Jobs</p>
                    <p className="text-[10px] text-muted-foreground">Browse corporate job postings</p>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform" strokeWidth={1.5} />
              </Link>

              <Link href="/tools/resume" className="group flex items-center justify-between p-3 rounded-xl border border-border/30 hover:border-rose-500/30 hover:bg-rose-500/[0.02] transition-all">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-rose-500/10 flex items-center justify-center text-rose-600 dark:text-rose-400 group-hover:scale-105 transition-transform">
                    <FileText className="h-4 w-4 text-rose-500" strokeWidth={1.5} />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-foreground">Resume Generator</p>
                    <p className="text-[10px] text-muted-foreground">Create ATS-friendly resumes</p>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform" strokeWidth={1.5} />
              </Link>

              <Link href="/tools/resume-analyzer" className="group flex items-center justify-between p-3 rounded-xl border border-border/30 hover:border-violet-500/30 hover:bg-violet-500/[0.02] transition-all">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-violet-500/10 flex items-center justify-center text-violet-600 dark:text-violet-400 group-hover:scale-105 transition-transform">
                    <Search className="h-4 w-4 text-violet-500" strokeWidth={1.5} />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-foreground">Resume Analyzer</p>
                    <p className="text-[10px] text-muted-foreground">Analyze match scores with AI</p>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform" strokeWidth={1.5} />
              </Link>
            </CardContent>
          </Card>

          {/* Card: Recent Applications Timeline */}
          <Card className="bg-card/50 backdrop-blur-sm border-border/40 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Recent Applications
              </CardTitle>
              <Link href="/applications" className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline">
                View all
              </Link>
            </CardHeader>
            <CardContent>
              {jobApplications.length === 0 ? (
                <Empty className="p-6 border-dashed border-border/30 rounded-xl bg-background/25">
                  <EmptyHeader>
                    <EmptyMedia variant="icon" className="bg-amber-500/10 text-amber-500 rounded-full">
                      <Briefcase className="h-5 w-5" strokeWidth={1.5} />
                    </EmptyMedia>
                    <EmptyTitle className="text-sm font-semibold">No applications yet</EmptyTitle>
                    <EmptyDescription className="text-xs">
                      Find jobs matching your skills and interests.
                    </EmptyDescription>
                  </EmptyHeader>
                  <EmptyContent>
                    <Link href="/jobs">
                      <Button size="sm" variant="outline" className="h-8 text-xs font-medium border-border/40 hover:bg-muted/50">
                        Find jobs now
                      </Button>
                    </Link>
                  </EmptyContent>
                </Empty>
              ) : (
                <div className="space-y-1">
                  {jobApplications.map((app, index) => {
                    const statusColors = STATUS_COLORS[app.status] || STATUS_COLORS.applied

                    return (
                      <div key={app.id} className="relative flex gap-3 p-2 rounded-xl border border-transparent hover:border-border/30 hover:bg-background/40 transition-all group">
                        {/* Timeline Line */}
                        {index < jobApplications.length - 1 && (
                          <div className="absolute left-[22px] top-10 bottom-0 w-[1px] bg-border/40" />
                        )}

                        {/* Icon container */}
                        <div className="h-7 w-7 shrink-0 rounded-full border border-border/40 bg-card flex items-center justify-center font-bold text-xs text-muted-foreground group-hover:border-indigo-500/30 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors z-10">
                          {app.company_name ? app.company_name.substring(0, 1).toUpperCase() : "?"}
                        </div>

                        {/* Details */}
                        <div className="flex-1 min-w-0 space-y-1">
                          <div className="flex items-start justify-between gap-2">
                            <h4 className="font-semibold text-foreground text-xs truncate leading-snug">
                              {app.title}
                            </h4>
                            <span className="text-[9px] text-muted-foreground shrink-0 mt-0.5">
                              {new Date(app.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground truncate">
                            <Building2 className="h-3 w-3 shrink-0 text-muted-foreground" strokeWidth={1.5} />
                            <span>{app.company_name}</span>
                            {app.location && (
                              <>
                                <span>•</span>
                                <MapPin className="h-3 w-3 shrink-0 text-muted-foreground" strokeWidth={1.5} />
                                <span className="truncate">{app.location}</span>
                              </>
                            )}
                          </div>

                          {/* Status Badge */}
                          <div className="pt-1.5">
                            <Badge
                              variant="outline"
                              className={cn(
                                "text-[9px] px-2.5 py-0.5 border font-medium select-none capitalize gap-1",
                                statusColors.bg,
                                statusColors.text
                              )}
                            >
                              <span className={cn("h-1 w-1 rounded-full shrink-0", statusColors.dot)} />
                              {app.status}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  )
}
