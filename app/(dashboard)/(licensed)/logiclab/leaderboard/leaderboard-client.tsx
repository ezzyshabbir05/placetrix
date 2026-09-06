"use client"

import React, { useState, useTransition } from "react"
import Link from "next/link"
import { LeaderboardEntry, getLeaderboardAction } from "./actions"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Trophy, Medal, ChevronLeft, ChevronRight, Loader2, Target, CheckCircle2, Flame, Star, Award, Zap, Brain } from "lucide-react"
import { cn } from "@/lib/utils"

function LatestBadgeIcon({ iconName }: { iconName: string }) {
  const isImage = iconName.endsWith(".png") || iconName.endsWith(".svg") || iconName.endsWith(".webp") || iconName.includes("/");
  if (isImage) {
    return <img src={iconName} alt="" className="w-4 h-4 object-contain shrink-0 drop-shadow-sm" />;
  }
  let IconComp: any = Award;
  if (iconName === "Flame") IconComp = Flame;
  else if (iconName === "Zap") IconComp = Zap;
  else if (iconName === "Trophy") IconComp = Trophy;
  else if (iconName === "Brain") IconComp = Brain;
  else if (iconName === "Target") IconComp = Target;

  return <IconComp className="w-3.5 h-3.5 text-amber-500 shrink-0" />;
}

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
    <TooltipProvider>
      <div className={cn('flex', 'flex-col', 'relative', 'pb-24')}>
        {/* List Section */}
        <div className={cn('flex', 'flex-col', 'border', 'border-border', 'rounded-xl', 'overflow-hidden', 'shadow-sm', 'bg-background/40', 'mt-4')}>
          <div className={cn('flex', 'flex-col', 'relative', 'min-h-100')}>
            {isPending && (
              <div className={cn('absolute', 'inset-0', 'z-10', 'bg-background/50', 'backdrop-blur-[1px]', 'flex', 'items-center', 'justify-center')}>
                <Loader2 className={cn('h-8', 'w-8', 'text-primary', 'animate-spin')} />
              </div>
            )}

            {/* Table Header */}
            <div className={cn('hidden', 'md:grid', 'md:grid-cols-[56px_56px_minmax(150px,1.5fr)_140px_120px]', 'items-center', 'gap-4', 'px-4', 'py-3.5', 'bg-muted/40', 'border-b', 'border-border', 'text-xs', 'font-bold', 'text-muted-foreground', 'uppercase', 'tracking-wider', 'select-none')}>
              <div className="text-center">Rank</div>
              <div></div>
              <div>Student</div>
              <div>Problems Solved</div>
              <div>Score</div>
            </div>

            <div className={cn('flex', 'flex-col')}>
              {data.length === 0 ? (
                <div className={cn('p-8', 'text-center', 'text-muted-foreground', 'flex', 'flex-col', 'items-center', 'gap-2')}>
                  <Target className={cn('h-10', 'w-10', 'text-muted-foreground/30', 'mb-2')} />
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

                  let premiumText = "text-muted-foreground/80";

                  if (isRank1 || isRank2 || isRank3) {
                    premiumText = "text-amber-600 dark:text-amber-400 font-bold";
                  }

                  return (
                    <div
                      key={user.id}
                      className={cn(
                        "group flex md:grid md:grid-cols-[56px_56px_minmax(150px,1.5fr)_140px_120px] items-center gap-3 md:gap-4 px-4 py-3 transition-colors duration-200 hover:bg-muted/40",
                        isEven ? "bg-transparent" : "bg-zinc-100 dark:bg-white/4",
                        isCurrentUser && "bg-primary/5 dark:bg-primary/10",
                        idx !== data.length - 1 && "border-b border-border"
                      )}
                    >
                      <div className={cn('flex', 'items-center', 'justify-center', 'w-14', 'md:w-full', 'relative')}>
                        <span className={cn('text-sm', 'font-mono', 'font-semibold', isCurrentUser && !(isRank1 || isRank2 || isRank3) ? 'text-primary' : premiumText)}>
                          #{user.rank}
                        </span>
                      </div>

                      <div className={cn('flex', 'items-center', 'justify-center', 'w-14', 'md:w-full')}>
                        {user.username ? (
                          <Link href={`/users/${user.username}`} prefetch={false} target="_blank" rel="noopener noreferrer">
                            <Avatar className={cn("h-8 w-8 sm:h-9 sm:w-9 border shrink-0 transition-colors hover:ring-2 hover:ring-primary/50 border-border/50")}>
                              <AvatarImage src={user.avatar_path || ""} className="object-cover" />
                              <AvatarFallback className={cn('font-semibold', 'text-xs', 'bg-muted')}>
                                {user.first_name?.[0]}{user.last_name?.[0]}
                              </AvatarFallback>
                            </Avatar>
                          </Link>
                        ) : (
                          <Avatar className={cn("h-8 w-8 sm:h-9 sm:w-9 border shrink-0 transition-colors border-border/50")}>
                            <AvatarImage src={user.avatar_path || ""} className="object-cover" />
                            <AvatarFallback className={cn('font-semibold', 'text-xs', 'bg-muted')}>
                              {user.first_name?.[0]}{user.last_name?.[0]}
                            </AvatarFallback>
                          </Avatar>
                        )}
                      </div>

                      <div className={cn('flex-1', 'md:w-full', 'min-w-0', 'flex', 'items-center', 'gap-2')}>
                        {user.username ? (
                          <Link href={`/users/${user.username}`} prefetch={false} target="_blank" rel="noopener noreferrer" className={cn('text-sm', 'font-medium', 'text-foreground', 'truncate', 'leading-snug', 'hover:text-primary', 'transition-colors')}>
                            {`${user.first_name} ${user.last_name}`.trim() || user.username}
                          </Link>
                        ) : (
                          <span className={cn('text-sm', 'font-medium', 'text-foreground', 'truncate', 'leading-snug')}>
                            {`${user.first_name} ${user.last_name}`.trim()}
                          </span>
                        )}
                        {isCurrentUser && (
                          <Badge variant="secondary" className={cn('text-[10px]', 'h-4', 'px-1.5', 'shrink-0', 'bg-primary/10', 'text-primary', 'uppercase', 'font-bold', 'tracking-wider')}>You</Badge>
                        )}
                        {user.latest_badge && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="shrink-0 inline-flex items-center justify-center p-0.5 rounded-full hover:bg-muted/80 transition-colors cursor-pointer" title={user.latest_badge.name}>
                                <LatestBadgeIcon iconName={user.latest_badge.icon_name} />
                              </div>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="text-xs font-semibold px-2 py-1">
                              {user.latest_badge.name}
                            </TooltipContent>
                          </Tooltip>
                        )}
                      </div>

                    <div className={cn('hidden', 'md:flex', 'items-center')}>
                      <span className={cn('text-[13px]', 'font-medium', 'text-muted-foreground/90', 'flex', 'items-center', 'gap-1.5')}>
                        {user.logiclab_solved_count} solved
                      </span>
                    </div>

                    <div className={cn('flex', 'items-center', 'justify-end', 'md:justify-start', 'w-30', 'md:w-full', 'shrink-0', 'gap-1.5', 'font-mono')}>
                      <span className={cn('text-sm', 'font-semibold', 'text-foreground')}>
                        {user.logiclab_points?.toLocaleString() || '0'}
                      </span>
                      <span className={cn('text-[10px]', 'text-muted-foreground/70', 'uppercase', 'tracking-wider', 'hidden', 'sm:block', 'mt-0.5')}>pts</span>
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
        <div className={cn('flex', 'items-center', 'justify-center', 'gap-2', 'mt-2')}>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(page - 1)}
            disabled={page === 1 || isPending}
            className={cn('h-9', 'w-9', 'p-0')}
          >
            <ChevronLeft className={cn('h-4', 'w-4')} />
          </Button>
          <div className={cn('text-sm', 'font-medium', 'text-muted-foreground', 'min-w-25', 'text-center')}>
            Page {page} of {totalPages}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(page + 1)}
            disabled={page === totalPages || isPending}
            className={cn('h-9', 'w-9', 'p-0')}
          >
            <ChevronRight className={cn('h-4', 'w-4')} />
          </Button>
        </div>
      )}

      {/* Sticky Current User Footer (only show if they have a rank and it's outside the top 3 on page 1) */}
      {currentUserRank !== null && (currentUserRank > 3 || page > 1) && (
        <div className={cn('fixed', 'bottom-0', 'left-0', 'right-0', 'z-50', 'p-4', 'pointer-events-none', 'flex', 'justify-center')}>
          <div className={cn('bg-background/95', 'backdrop-blur-md', 'border', 'shadow-lg', 'rounded-full', 'px-6', 'py-3', 'flex', 'items-center', 'gap-4', 'pointer-events-auto', 'max-w-xl', 'w-full', 'mx-auto', 'justify-between', 'border-primary/20', 'ring-1', 'ring-primary/10')}>
            <div className={cn('flex', 'items-center', 'gap-3')}>
              <div className={cn('flex', 'flex-col', 'items-center', 'justify-center', 'bg-primary/10', 'text-primary', 'rounded-full', 'h-10', 'w-10', 'shrink-0', 'font-bold')}>
                #{currentUserRank}
              </div>
              <div className={cn('flex', 'flex-col')}>
                <span className={cn('font-semibold', 'text-sm')}>Your Current Rank</span>
                <span className={cn('text-xs', 'text-muted-foreground')}>Keep solving to climb!</span>
              </div>
            </div>
            <div className={cn('flex', 'items-center', 'gap-2', 'font-mono')}>
              <span className={cn('font-bold', 'text-lg', 'text-foreground')}>{currentUserScore.toLocaleString()}</span>
              <span className={cn('text-xs', 'text-muted-foreground')}>pts</span>
            </div>
          </div>
        </div>
      )}
    </div>
  </TooltipProvider>
)
}
