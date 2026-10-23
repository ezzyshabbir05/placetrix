"use client"

import React, { useState, useMemo } from "react"
import {
  Calendar,
  CheckCircle2,
  XCircle,
  ChevronLeft,
  ChevronRight,
  BarChart2,
  Flame,
  TrendingUp,
  Users,
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { Separator } from "@/components/ui/separator"

export interface DailyChallenge {
  id: string
  date: string
  problem_id: string
  problem_title: string
  problem_difficulty: string
  total_attempts: number
  total_solved: number
  acceptance_rate: number
}

export interface DailyChallengeTopSolver {
  rank: number
  student_name: string
  student_email: string
  potd_streak: number
  solved_today: boolean
}

interface AdminDailyChallengesTabProps {
  challenges: DailyChallenge[]
  topSolvers: DailyChallengeTopSolver[]
  totalProblems: number
}

const DAYS_OF_WEEK = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
]

const DIFFICULTY_COLORS: Record<string, string> = {
  Easy: "bg-emerald-100/80 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400",
  Medium: "bg-amber-100/80 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400",
  Hard: "bg-rose-100/80 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400",
}

function CalendarView({
  challenges,
}: {
  challenges: DailyChallenge[]
}) {
  const today = new Date()
  const [viewYear, setViewYear] = useState(today.getFullYear())
  const [viewMonth, setViewMonth] = useState(today.getMonth())

  const challengeMap = useMemo(() => {
    const map: Record<string, DailyChallenge> = {}
    challenges.forEach((c) => {
      map[c.date.slice(0, 10)] = c
    })
    return map
  }, [challenges])

  const firstDay = new Date(viewYear, viewMonth, 1)
  const lastDay = new Date(viewYear, viewMonth + 1, 0)
  const startPad = firstDay.getDay()
  const daysInMonth = lastDay.getDate()

  const cells: (number | null)[] = [
    ...Array(startPad).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear((y) => y - 1) }
    else setViewMonth((m) => m - 1)
  }
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear((y) => y + 1) }
    else setViewMonth((m) => m + 1)
  }

  return (
    <div className="space-y-3">
      {/* Month header */}
      <div className="flex items-center justify-between px-1">
        <Button variant="ghost" size="icon" className="size-7" onClick={prevMonth}>
          <ChevronLeft className="size-4" />
        </Button>
        <span className="text-sm font-semibold text-foreground">
          {MONTHS[viewMonth]} {viewYear}
        </span>
        <Button variant="ghost" size="icon" className="size-7" onClick={nextMonth}>
          <ChevronRight className="size-4" />
        </Button>
      </div>

      {/* Day labels */}
      <div className="grid grid-cols-7 text-center text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest pb-1">
        {DAYS_OF_WEEK.map((d) => <div key={d}>{d}</div>)}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {cells.map((day, i) => {
          if (!day) return <div key={`pad-${i}`} />
          const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
          const challenge = challengeMap[dateStr]
          const isToday =
            viewYear === today.getFullYear() &&
            viewMonth === today.getMonth() &&
            day === today.getDate()

          return (
            <div
              key={dateStr}
              title={challenge ? `${challenge.problem_title} — ${challenge.acceptance_rate}% acceptance` : "No challenge scheduled"}
              className={cn(
                "relative flex flex-col items-center justify-center aspect-square rounded-lg text-xs font-semibold transition-all cursor-default select-none",
                isToday && "ring-1 ring-primary ring-offset-1",
                challenge
                  ? challenge.acceptance_rate >= 60
                    ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/25"
                    : challenge.acceptance_rate >= 30
                    ? "bg-amber-500/15 text-amber-700 dark:text-amber-400 hover:bg-amber-500/25"
                    : "bg-rose-500/15 text-rose-700 dark:text-rose-400 hover:bg-rose-500/25"
                  : "text-muted-foreground/50 hover:bg-muted/40"
              )}
            >
              {day}
              {challenge && (
                <span className="absolute bottom-0.5 size-1 rounded-full bg-current opacity-60" />
              )}
            </div>
          )
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-[10px] text-muted-foreground pt-1">
        {[
          { color: "bg-emerald-500/40", label: "≥60% acceptance" },
          { color: "bg-amber-500/40", label: "30–60%" },
          { color: "bg-rose-500/40", label: "<30%" },
          { color: "bg-muted/60", label: "No challenge" },
        ].map(({ color, label }) => (
          <span key={label} className="flex items-center gap-1">
            <span className={cn("size-2 rounded-sm", color)} />
            {label}
          </span>
        ))}
      </div>
    </div>
  )
}

export function AdminDailyChallengesTab({
  challenges,
  topSolvers,
  totalProblems,
}: AdminDailyChallengesTabProps) {
  const [subTab, setSubTab] = useState("calendar")

  const scheduled = challenges.length
  const totalAttempts = challenges.reduce((sum, c) => sum + c.total_attempts, 0)
  const avgAcceptance =
    challenges.length > 0
      ? Math.round(challenges.reduce((sum, c) => sum + c.acceptance_rate, 0) / challenges.length)
      : 0

  const recentChallenges = useMemo(
    () => [...challenges].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 20),
    [challenges]
  )

  return (
    <div className="space-y-5 animate-in fade-in-50 duration-200">
      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Scheduled */}
        <Card className="p-4 bg-background/40 backdrop-blur-sm rounded-lg border flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground font-medium">Total Scheduled</span>
            <span className="text-[10px] font-mono text-muted-foreground bg-muted/60 px-1.5 py-0.5 rounded">Calendar</span>
          </div>
          <div className="text-2xl font-bold font-mono text-foreground mt-2">{scheduled}</div>
          <div className="mt-2 text-[11px] text-muted-foreground flex items-center justify-between">
            <span>Library coverage</span>
            <span className="font-mono font-semibold text-foreground">
              {totalProblems > 0 ? Math.round((scheduled / totalProblems) * 100) : 0}% of problems
            </span>
          </div>
          <div className="w-full bg-muted/50 rounded-full h-1 mt-1.5 overflow-hidden">
            <div
              className="bg-primary h-full rounded-full transition-all"
              style={{ width: `${totalProblems > 0 ? Math.min((scheduled / totalProblems) * 100, 100) : 0}%` }}
            />
          </div>
        </Card>

        {/* Card 2: Total Attempts */}
        <Card className="p-4 bg-background/40 backdrop-blur-sm rounded-lg border flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground font-medium">Total Attempts</span>
            <span className="text-[10px] font-mono text-muted-foreground bg-muted/60 px-1.5 py-0.5 rounded">Activity</span>
          </div>
          <div className="text-2xl font-bold font-mono text-foreground mt-2">{totalAttempts.toLocaleString()}</div>
          <div className="mt-2 text-[11px] text-muted-foreground flex items-center justify-between">
            <span>Avg per challenge</span>
            <span className="font-mono font-semibold text-foreground">
              {scheduled > 0 ? Math.round(totalAttempts / scheduled) : 0} solves
            </span>
          </div>
          <div className="w-full bg-muted/50 rounded-full h-1 mt-1.5 overflow-hidden">
            <div className="bg-primary h-full rounded-full w-full" />
          </div>
        </Card>

        {/* Card 3: Avg Acceptance */}
        <Card className="p-4 bg-background/40 backdrop-blur-sm rounded-lg border flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground font-medium">Avg. Acceptance</span>
            <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded">Healthy</span>
          </div>
          <div className="text-2xl font-bold font-mono text-foreground mt-2">{avgAcceptance}%</div>
          <div className="mt-2 text-[11px] text-muted-foreground flex items-center justify-between">
            <span>Difficulty target</span>
            <span className="font-mono font-semibold text-muted-foreground">40% - 70%</span>
          </div>
          <div className="w-full bg-muted/50 rounded-full h-1 mt-1.5 overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-all",
                avgAcceptance >= 60 ? "bg-emerald-500" : avgAcceptance >= 40 ? "bg-amber-500" : "bg-rose-500"
              )}
              style={{ width: `${Math.min(avgAcceptance, 100)}%` }}
            />
          </div>
        </Card>

        {/* Card 4: Active Streaks */}
        <Card className="p-4 bg-background/40 backdrop-blur-sm rounded-lg border flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground font-medium">Active Streaks</span>
            <span className="text-[10px] font-mono text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded">Daily Active</span>
          </div>
          <div className="text-2xl font-bold font-mono text-amber-500 mt-2">{topSolvers.filter(s => s.potd_streak >= 1).length}</div>
          <div className="mt-2 text-[11px] text-muted-foreground flex items-center justify-between">
            <span>Students on streak</span>
            <span className="font-mono font-semibold text-foreground">
              {topSolvers.filter(s => s.potd_streak >= 7).length} over 7d
            </span>
          </div>
          <div className="w-full bg-muted/50 rounded-full h-1 mt-1.5 overflow-hidden">
            <div
              className="bg-amber-500 h-full rounded-full transition-all"
              style={{ width: `${Math.min((topSolvers.filter(s => s.potd_streak >= 1).length / 20) * 100, 100)}%` }}
            />
          </div>
        </Card>
      </div>

      {/* Sub-tabs */}
      <Tabs value={subTab} onValueChange={setSubTab}>
        <TabsList className="h-8 bg-muted/50 p-1 rounded-xl gap-1">
          {[
            { value: "calendar", label: "Calendar View" },
            { value: "history", label: "Challenge History" },
          ].map(({ value, label }) => (
            <TabsTrigger
              key={value}
              value={value}
              className="rounded-lg px-3.5 h-6 text-xs font-medium data-[state=active]:bg-background data-[state=active]:shadow-sm"
            >
              {label}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* Calendar */}
        <TabsContent value="calendar" className="mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <Card className="py-0 bg-background/40 backdrop-blur-sm">
                <CardHeader className="p-5 pb-4 border-b">
                  <CardTitle className="text-sm font-semibold text-foreground">
                    Schedule Overview
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Green = high acceptance, Amber = moderate, Red = difficult. Dots indicate scheduled challenges.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-5">
                  <CalendarView challenges={challenges} />
                </CardContent>
              </Card>
            </div>

            {/* Recent challenges sidebar */}
            <div>
              <Card className="py-0 bg-background/40 backdrop-blur-sm h-full">
                <CardHeader className="p-5 pb-4 border-b">
                  <CardTitle className="text-sm font-semibold text-foreground">
                    Recent Challenges
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-3 space-y-2 max-h-80 overflow-y-auto">
                  {recentChallenges.slice(0, 10).map((c) => (
                    <div
                      key={c.id}
                      className="flex items-center gap-2.5 p-2.5 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors text-xs border border-border/40"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-foreground truncate">{c.problem_title}</p>
                        <p className="text-[10px] text-muted-foreground">{c.date.slice(0, 10)}</p>
                      </div>
                      <div className="shrink-0 text-right">
                        <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded", DIFFICULTY_COLORS[c.problem_difficulty])}>
                          {c.problem_difficulty}
                        </span>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          {c.acceptance_rate}% AC
                        </p>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* History Table */}
        <TabsContent value="history" className="mt-4">
          <Card className="py-0 bg-background/40 backdrop-blur-sm overflow-hidden">
            <div className="overflow-x-auto">
              <Table className="min-w-[700px] text-xs">
                <TableHeader>
                  <TableRow className="bg-muted/40 border-b border-border/50 text-xs font-bold text-muted-foreground uppercase tracking-wider select-none hover:bg-muted/40">
                    <TableHead className="px-4 py-3">Date</TableHead>
                    <TableHead className="px-4 py-3">Problem</TableHead>
                    <TableHead className="px-4 py-3 text-center">Difficulty</TableHead>
                    <TableHead className="px-4 py-3 text-center">Attempts</TableHead>
                    <TableHead className="px-4 py-3 text-center">Solved</TableHead>
                    <TableHead className="px-4 py-3 text-center">Acceptance</TableHead>
                    <TableHead className="px-4 py-3 w-40">Rate Bar</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentChallenges.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-16 text-muted-foreground/50">
                        <Calendar className="size-8 mx-auto mb-2 stroke-[1.2]" />
                        <p className="text-xs font-semibold uppercase tracking-widest">No challenges found</p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    recentChallenges.map((c, idx) => {
                      const isEven = idx % 2 === 0
                      const rateColor =
                        c.acceptance_rate >= 60
                          ? "[&>div]:bg-emerald-500"
                          : c.acceptance_rate >= 30
                          ? "[&>div]:bg-amber-500"
                          : "[&>div]:bg-rose-500"
                      return (
                        <TableRow
                          key={c.id}
                          className={cn(
                            "border-b border-border/30 transition-colors",
                            isEven ? "bg-transparent" : "bg-muted/20"
                          )}
                        >
                          <TableCell className="px-4 py-3 font-mono text-muted-foreground">
                            {c.date.slice(0, 10)}
                          </TableCell>
                          <TableCell className="px-4 py-3 font-semibold text-foreground max-w-48">
                            <span className="truncate block">{c.problem_title}</span>
                          </TableCell>
                          <TableCell className="px-4 py-3 text-center">
                            <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded", DIFFICULTY_COLORS[c.problem_difficulty])}>
                              {c.problem_difficulty}
                            </span>
                          </TableCell>
                          <TableCell className="px-4 py-3 text-center font-mono font-semibold">{c.total_attempts}</TableCell>
                          <TableCell className="px-4 py-3 text-center font-mono font-semibold text-emerald-600 dark:text-emerald-400">{c.total_solved}</TableCell>
                          <TableCell className="px-4 py-3 text-center font-mono font-bold">
                            {c.acceptance_rate}%
                          </TableCell>
                          <TableCell className="px-4 py-3">
                            <Progress value={c.acceptance_rate} className={cn("h-1.5 bg-muted", rateColor)} />
                          </TableCell>
                        </TableRow>
                      )
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>
        </TabsContent>


      </Tabs>
    </div>
  )
}
