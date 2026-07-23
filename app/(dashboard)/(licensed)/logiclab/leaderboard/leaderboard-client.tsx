"use client"

import React, { useState, useTransition } from "react"
import { LeaderboardEntry, getLeaderboardAction } from "./actions"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Trophy, Medal, ChevronLeft, ChevronRight, Loader2, Target, CheckCircle2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface LeaderboardClientProps {
  initialData: LeaderboardEntry[]
  totalCount: number
  instituteId: string
  currentUserId: string
  currentUserRank: number | null
  currentUserScore: number
}

const PAGE_SIZE = 50

export default function LeaderboardClient({
  initialData,
  totalCount,
  instituteId,
  currentUserId,
  currentUserRank,
  currentUserScore,
}: LeaderboardClientProps) {
  const [data, setData] = useState<LeaderboardEntry[]>(initialData)
  const [page, setPage] = useState(1)
  const [isPending, startTransition] = useTransition()

  const totalPages = Math.ceil(totalCount / PAGE_SIZE)

  const handlePageChange = (newPage: number) => {
    startTransition(async () => {
      const res = await getLeaderboardAction(instituteId, newPage)
      setData(res.data)
      setPage(newPage)
      window.scrollTo({ top: 0, behavior: "smooth" })
    })
  }

  // Remove podium separation, map entire data array
  
  return (
    <div className="flex flex-col relative pb-24">
      {/* List Section */}
      <div className={cn('flex', 'flex-col', 'border', 'border-border', 'rounded-xl', 'overflow-hidden', 'shadow-sm', 'bg-background/40', 'mt-4')}>
        <div className="flex flex-col relative min-h-[400px]">
          {isPending && (
            <div className="absolute inset-0 z-10 bg-background/50 backdrop-blur-[1px] flex items-center justify-center">
              <Loader2 className="h-8 w-8 text-primary animate-spin" />
            </div>
          )}
          
          {/* Table Header */}
          <div className={cn('hidden', 'md:flex', 'items-center', 'gap-3', 'px-4', 'py-3.5', 'bg-muted/40', 'border-b', 'border-border', 'text-xs', 'font-bold', 'text-muted-foreground', 'uppercase', 'tracking-wider', 'select-none')}>
            <div className={cn('w-14', 'shrink-0', 'text-center')}>Rank</div>
            <div className={cn('w-14', 'shrink-0')}></div>
            <div className={cn('flex-1', 'min-w-0', 'pl-2')}>Student</div>
            <div className={cn('w-[140px]', 'shrink-0', 'pl-4')}>Problems Solved</div>
            <div className={cn('w-[120px]', 'shrink-0', 'pl-4', 'text-right')}>Score</div>
          </div>
          
          <div className="flex flex-col">
            {data.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground flex flex-col items-center gap-2">
                <Target className="h-10 w-10 text-muted-foreground/30 mb-2" />
                <p>No leaderboard data found.</p>
                <p className="text-sm">Start solving challenges to appear here!</p>
              </div>
            ) : (
              data.map((user, idx) => {
                const isEven = idx % 2 === 0;
                const isCurrentUser = user.id === currentUserId;
                const isRank1 = user.rank === 1;
                const isRank2 = user.rank === 2;
                const isRank3 = user.rank === 3;
                
                let premiumBg = "";
                let premiumText = "text-muted-foreground/80";
                let premiumAvatarBorder = "border-border/50";
                
                if (isRank1) {
                  premiumBg = "bg-gradient-to-r from-amber-500/20 to-amber-500/5 hover:from-amber-500/25 hover:to-amber-500/10 border-amber-500/40";
                  premiumText = "text-amber-600 dark:text-amber-400 font-bold";
                  premiumAvatarBorder = "border-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.3)]";
                } else if (isRank2) {
                  premiumBg = "bg-gradient-to-r from-slate-400/20 to-slate-400/5 hover:from-slate-400/25 hover:to-slate-400/10 border-slate-300/40";
                  premiumText = "text-slate-600 dark:text-slate-300 font-bold";
                  premiumAvatarBorder = "border-slate-400 shadow-[0_0_10px_rgba(148,163,184,0.3)]";
                } else if (isRank3) {
                  premiumBg = "bg-gradient-to-r from-orange-600/15 to-orange-600/5 hover:from-orange-600/20 hover:to-orange-600/10 border-orange-700/30";
                  premiumText = "text-orange-700 dark:text-orange-500 font-bold";
                  premiumAvatarBorder = "border-orange-600 shadow-[0_0_10px_rgba(234,88,12,0.3)]";
                }
                
                return (
                  <div 
                    key={user.id} 
                    className={cn(
                      "group flex items-center gap-3 px-4 py-3 transition-colors duration-200 hover:bg-muted/40",
                      isEven && !premiumBg ? "bg-transparent" : "bg-zinc-100 dark:bg-white/[0.04]",
                      isCurrentUser && !premiumBg && "bg-primary/5 dark:bg-primary/10",
                      premiumBg,
                      idx !== data.length - 1 && "border-b border-border"
                    )}
                  >
                    <div className={cn('shrink-0', 'flex', 'items-center', 'justify-center', 'w-14', 'relative')}>
                      {(isRank1 || isRank2 || isRank3) && (
                        <Trophy className={cn("absolute -left-1 opacity-50 h-5 w-5", premiumText)} />
                      )}
                      <span className={cn('text-sm', 'font-mono', 'font-semibold', isCurrentUser && !premiumBg ? 'text-primary' : premiumText)}>
                        #{user.rank}
                      </span>
                    </div>
                    
                    <div className={cn('shrink-0', 'w-14', 'flex', 'items-center', 'justify-center')}>
                      <Avatar className={cn("h-8 w-8 sm:h-9 sm:w-9 border shrink-0 transition-colors", premiumAvatarBorder)}>
                        <AvatarImage src={user.avatar_path || ""} className="object-cover" />
                        <AvatarFallback className="font-semibold text-xs bg-muted">
                          {user.first_name?.[0]}{user.last_name?.[0]}
                        </AvatarFallback>
                      </Avatar>
                    </div>
                    
                    <div className={cn('flex-1', 'min-w-0', 'flex', 'items-center', 'gap-2', 'pl-2')}>
                      <span className={cn('text-sm', 'font-medium', 'text-foreground', 'truncate', 'leading-snug')}>
                        {user.username || `${user.first_name} ${user.last_name}`}
                      </span>
                      {isCurrentUser && (
                        <Badge variant="secondary" className="text-[10px] h-4 px-1.5 shrink-0 bg-primary/10 text-primary uppercase font-bold tracking-wider">You</Badge>
                      )}
                    </div>
                    
                    <div className={cn('hidden', 'md:flex', 'items-center', 'w-[140px]', 'shrink-0', 'pl-4')}>
                      <span className={cn('text-xs', 'font-medium', 'text-muted-foreground/90', 'flex', 'items-center', 'gap-1.5')}>
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500/80" />
                        {user.logiclab_solved_count} solved
                      </span>
                    </div>
                    
                    <div className={cn('flex', 'items-center', 'justify-end', 'w-[120px]', 'shrink-0', 'pl-4', 'gap-1.5', 'font-mono')}>
                      <Trophy className="h-3.5 w-3.5 text-amber-500/80 hidden sm:block" />
                      <span className={cn('text-sm', 'font-semibold', 'text-foreground')}>
                        {user.logiclab_score.toLocaleString()}
                      </span>
                      <span className="text-[10px] text-muted-foreground/70 uppercase tracking-wider hidden sm:block mt-0.5">pts</span>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(page - 1)}
            disabled={page === 1 || isPending}
            className="h-9 w-9 p-0"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="text-sm font-medium text-muted-foreground min-w-[100px] text-center">
            Page {page} of {totalPages}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(page + 1)}
            disabled={page === totalPages || isPending}
            className="h-9 w-9 p-0"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Sticky Current User Footer (only show if they have a rank and it's outside the top 3 on page 1) */}
      {currentUserRank !== null && (currentUserRank > 3 || page > 1) && (
        <div className="fixed bottom-0 left-0 right-0 z-50 p-4 pointer-events-none flex justify-center">
          <div className="bg-background/95 backdrop-blur-md border shadow-lg rounded-full px-6 py-3 flex items-center gap-4 pointer-events-auto max-w-xl w-full mx-auto justify-between border-primary/20 ring-1 ring-primary/10">
            <div className="flex items-center gap-3">
              <div className="flex flex-col items-center justify-center bg-primary/10 text-primary rounded-full h-10 w-10 shrink-0 font-bold">
                #{currentUserRank}
              </div>
              <div className="flex flex-col">
                <span className="font-semibold text-sm">Your Current Rank</span>
                <span className="text-xs text-muted-foreground">Keep solving to climb!</span>
              </div>
            </div>
            <div className="flex items-center gap-2 font-mono">
              <span className="font-bold text-lg text-foreground">{currentUserScore.toLocaleString()}</span>
              <span className="text-xs text-muted-foreground">pts</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
