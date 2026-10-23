"use client"

import React, { useState } from "react"
import { Flame, Brain, Star, TrendingUp, ChevronDown, ChevronUp } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"

export interface LeaderboardEntry {
  rank: number
  user_id: string
  student_name: string
  student_email: string
  total_points: number
  solved_count: number
  easy_solved: number
  medium_solved: number
  hard_solved: number
  current_streak: number
  longest_streak: number
  potd_streak: number
}

interface AdminLeaderboardTabProps {
  leaderboard: LeaderboardEntry[]
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase()
}

function RankCell({ rank }: { rank: number }) {
  if (rank === 1)
    return (
      <span className="inline-flex items-center justify-center size-6 rounded-md bg-amber-500/15 text-amber-600 dark:text-amber-400 text-xs font-bold font-mono tabular-nums">
        1
      </span>
    )
  if (rank === 2)
    return (
      <span className="inline-flex items-center justify-center size-6 rounded-md bg-slate-400/15 text-slate-500 dark:text-slate-300 text-xs font-bold font-mono tabular-nums">
        2
      </span>
    )
  if (rank === 3)
    return (
      <span className="inline-flex items-center justify-center size-6 rounded-md bg-amber-700/15 text-amber-700 dark:text-amber-600 text-xs font-bold font-mono tabular-nums">
        3
      </span>
    )
  return (
    <span className="inline-flex items-center justify-center size-6 text-xs font-mono font-semibold text-muted-foreground/50 tabular-nums">
      {rank}
    </span>
  )
}

export function AdminLeaderboardTab({ leaderboard }: AdminLeaderboardTabProps) {
  const [showAll, setShowAll] = useState(false)

  const maxPoints = leaderboard[0]?.total_points || 1
  const displayList = showAll ? leaderboard : leaderboard.slice(0, 20)

  const topSolved = Math.max(...leaderboard.map((e) => e.solved_count), 0)
  const topStreak = Math.max(...leaderboard.map((e) => e.current_streak), 0)
  const topHard = Math.max(...leaderboard.map((e) => e.hard_solved), 0)

  return (
    <div className="space-y-5 animate-in fade-in-50 duration-200">

      {/* Summary stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: "Ranked Students",
            value: leaderboard.length,
            sub: "with LogicLab activity",
            icon: TrendingUp,
            color: "text-indigo-500",
            bg: "bg-indigo-500/10",
          },
          {
            label: "Highest Score",
            value: leaderboard[0]?.total_points ?? "—",
            sub: leaderboard[0]?.student_name || "",
            icon: Star,
            color: "text-amber-500",
            bg: "bg-amber-500/10",
          },
          {
            label: "Most Hard Solved",
            value: topHard,
            sub: "across all students",
            icon: Brain,
            color: "text-rose-500",
            bg: "bg-rose-500/10",
          },
          {
            label: "Longest Active Streak",
            value: topStreak > 0 ? `${topStreak}d` : "—",
            sub: "current streak",
            icon: Flame,
            color: "text-orange-500",
            bg: "bg-orange-500/10",
          },
        ].map(({ label, value, sub, icon: Icon, color, bg }) => (
          <Card key={label} className="py-4 gap-2 bg-background/40 backdrop-blur-sm">
            <CardContent className="px-5 flex items-start gap-3">
              <div className={cn("size-9 rounded-lg flex items-center justify-center shrink-0 mt-0.5", bg)}>
                <Icon className={cn("size-4", color)} />
              </div>
              <div className="min-w-0">
                <div className="text-xl font-bold font-mono text-foreground truncate">{value}</div>
                <div className="text-xs text-muted-foreground leading-tight">{label}</div>
                {sub && <div className="text-[10px] text-muted-foreground/50 truncate mt-0.5">{sub}</div>}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main ranking table */}
      <Card className="py-0 bg-background/40 backdrop-blur-sm overflow-hidden">
        <CardHeader className="px-6 py-4 border-b">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm font-semibold text-foreground">Rankings</CardTitle>
              <CardDescription className="text-xs mt-0.5">Sorted by total points earned</CardDescription>
            </div>
            <span className="text-xs text-muted-foreground font-mono">
              {leaderboard.length} students
            </span>
          </div>
        </CardHeader>

        {/* Table header */}
        <div className="grid grid-cols-[40px_1fr_100px_130px_80px_80px] items-center gap-0 px-5 py-2.5 bg-muted/30 border-b border-border/40 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider select-none">
          <div className="text-center">#</div>
          <div className="pl-2">Student</div>
          <div className="text-center">Solved</div>
          <div className="text-center">E / M / H</div>
          <div className="text-center">Streak</div>
          <div className="text-right pr-1">Points</div>
        </div>

        {/* Rows */}
        <div className="divide-y divide-border/30">
          {displayList.map((entry, idx) => {
            const isTop3 = entry.rank <= 3
            const pointsPct = (entry.total_points / maxPoints) * 100

            return (
              <div
                key={entry.user_id}
                className={cn(
                  "grid grid-cols-[40px_1fr_100px_130px_80px_80px] items-center gap-0 px-5 py-3 transition-colors hover:bg-muted/20",
                  idx % 2 !== 0 && "bg-muted/[0.04]"
                )}
              >
                {/* Rank */}
                <div className="flex justify-center">
                  <RankCell rank={entry.rank} />
                </div>

                {/* Student */}
                <div className="flex items-center gap-2.5 pl-2 min-w-0">
                  <Avatar className="size-7 shrink-0">
                    <AvatarFallback
                      className={cn(
                        "text-[10px] font-bold",
                        isTop3 ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                      )}
                    >
                      {getInitials(entry.student_name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate leading-tight">
                      {entry.student_name}
                    </p>
                    <p className="text-[10px] text-muted-foreground/50 truncate">{entry.student_email}</p>
                  </div>
                </div>

                {/* Solved */}
                <div className="text-center">
                  <span className="text-sm font-mono font-semibold text-foreground tabular-nums">
                    {entry.solved_count}
                  </span>
                </div>

                {/* E / M / H */}
                <div className="text-center text-xs font-mono tabular-nums">
                  <span className="text-emerald-600 dark:text-emerald-400">{entry.easy_solved}</span>
                  <span className="text-muted-foreground/30 mx-1">/</span>
                  <span className="text-amber-600 dark:text-amber-400">{entry.medium_solved}</span>
                  <span className="text-muted-foreground/30 mx-1">/</span>
                  <span className="text-rose-600 dark:text-rose-400">{entry.hard_solved}</span>
                </div>

                {/* Streak */}
                <div className="text-center">
                  {entry.current_streak > 0 ? (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-orange-500 tabular-nums">
                      <Flame className="size-3 shrink-0" />
                      {entry.current_streak}d
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground/30">—</span>
                  )}
                </div>

                {/* Points with bar */}
                <div className="flex flex-col items-end gap-1 pr-1">
                  <span className="text-sm font-mono font-bold text-foreground tabular-nums">
                    {entry.total_points.toLocaleString()}
                  </span>
                  <Progress
                    value={pointsPct}
                    className="h-[3px] w-14 bg-muted [&>div]:bg-indigo-500"
                  />
                </div>
              </div>
            )
          })}
        </div>

        {/* Show more / less toggle */}
        {leaderboard.length > 20 && (
          <div className="px-5 py-3.5 border-t border-border/40 bg-muted/10">
            <button
              onClick={() => setShowAll((v) => !v)}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors font-medium"
            >
              {showAll ? (
                <>
                  <ChevronUp className="size-3.5" />
                  Show fewer
                </>
              ) : (
                <>
                  <ChevronDown className="size-3.5" />
                  Show all {leaderboard.length} students
                </>
              )}
            </button>
          </div>
        )}
      </Card>
    </div>
  )
}
