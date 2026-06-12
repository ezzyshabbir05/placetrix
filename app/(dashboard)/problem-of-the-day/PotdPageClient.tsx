"use client"

import React, { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Bookmark, CheckCircle2, ChevronRight, PlayCircle, ChevronLeft, Clock, Timer, ArrowRight, BookOpen } from "lucide-react"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"

interface PotdHistoryItem {
  date: string
  problem_id: string
  title: string
  difficulty: string
  solved_status: string | null
  total_submissions: number
  acceptance_rate: number
}

interface PotdPageClientProps {
  history: PotdHistoryItem[]
  currentPotd: PotdHistoryItem | null
  totalPotds: number
  solvedPotds: number
}

const DIFFICULTY_COLORS: Record<string, string> = {
  Easy: "text-emerald-500",
  Medium: "text-amber-500",
  Hard: "text-rose-500",
}

export function PotdPageClient({ history, currentPotd, totalPotds, solvedPotds }: PotdPageClientProps) {
  const router = useRouter()
  const [page, setPage] = useState(1)
  const [timeLeft, setTimeLeft] = useState("")
  const pageSize = 15

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date()
      const midnight = new Date()
      midnight.setHours(24, 0, 0, 0)
      const diff = midnight.getTime() - now.getTime()
      
      const h = Math.floor(diff / (1000 * 60 * 60))
      const m = Math.floor((diff / (1000 * 60)) % 60)
      const s = Math.floor((diff / 1000) % 60)
      
      setTimeLeft(`${h.toString().padStart(2, '0')}h ${m.toString().padStart(2, '0')}m ${s.toString().padStart(2, '0')}s`)
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  const progressPercentage = totalPotds > 0 ? (solvedPotds / totalPotds) * 100 : 0

  const totalPages = Math.ceil(history.length / pageSize)
  const paginatedHistory = history.slice((page - 1) * pageSize, page * pageSize)

  // Formatter for large numbers (e.g., 1500 -> 1.5K)
  const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + "M"
    if (num >= 1000) return (num / 1000).toFixed(1) + "K"
    return num.toString()
  }

  // Format date nicely
  const formatDate = (dateString: string) => {
    const d = new Date(dateString)
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
  }

  return (
    <div className="flex flex-col gap-8 px-4 py-8 md:px-8 max-w-5xl mx-auto w-full">
      
      {/* Header Section */}
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-1.5">
          <h1 className="text-4xl font-bold font-cirka tracking-tight text-foreground">Problem of the Day History</h1>
          <p className="text-base text-muted-foreground">
            Track your consistency and revisit past daily challenges.
          </p>
        </div>

        {/* Progress Card */}
        <Card className="p-6 border-border/60 shadow-sm bg-card/50">
          <div className="flex flex-col gap-4">
            <div className="flex justify-between items-end">
              <div className="flex flex-col gap-1">
                <span className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Overall Progress</span>
                <span className="text-2xl font-bold text-foreground">
                  {solvedPotds} <span className="text-muted-foreground text-lg font-normal">of {totalPotds} Problems Solved</span>
                </span>
              </div>
              <span className="text-xl font-bold text-foreground/80">{progressPercentage.toFixed(1)}%</span>
            </div>
            <Progress value={progressPercentage} className="h-3 rounded-full bg-muted/60 [&>div]:bg-orange-500" />
          </div>
        </Card>
      </div>

      {/* Current POTD Banner */}
      <div className="flex flex-col gap-4">
        <h2 className="text-xl font-bold font-cirka text-foreground flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-orange-500" /> Today's Challenge
        </h2>
        
        {currentPotd ? (
          <Card className="relative overflow-hidden border-orange-500/30 bg-gradient-to-br from-orange-500/5 to-transparent p-1 shadow-sm">
            <div className="absolute top-0 right-0 p-6 opacity-5 pointer-events-none">
              <BookOpen className="w-32 h-32" />
            </div>
            
            <div className="relative bg-card/80 backdrop-blur-sm border border-border/40 rounded-lg p-6 sm:p-8 flex flex-col md:flex-row gap-6 justify-between items-start md:items-center">
              <div className="flex flex-col gap-3 max-w-xl">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold bg-orange-500/10 text-orange-600 dark:text-orange-400 px-2.5 py-1 rounded-md">
                    {formatDate(currentPotd.date)}
                  </span>
                  <span className={cn("text-sm font-bold tracking-wide uppercase", DIFFICULTY_COLORS[currentPotd.difficulty])}>
                    {currentPotd.difficulty}
                  </span>
                  {currentPotd.solved_status === "Accepted" && (
                    <span className="flex items-center gap-1 text-xs font-bold text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded-md">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Solved
                    </span>
                  )}
                </div>
                
                <h3 className="text-2xl sm:text-3xl font-bold text-foreground">
                  {currentPotd.title}
                </h3>
                
                <div className="flex items-center gap-4 text-sm font-medium text-muted-foreground mt-1">
                  <span className="flex items-center gap-1.5">
                    <Timer className="w-4 h-4" /> {formatNumber(currentPotd.total_submissions)} Submissions
                  </span>
                  <span className="text-muted-foreground/30">•</span>
                  <span>{currentPotd.acceptance_rate.toFixed(1)}% Acceptance</span>
                </div>
              </div>

              <div className="flex flex-col items-start md:items-end gap-4 shrink-0 w-full md:w-auto mt-2 md:mt-0">
                <div className="flex flex-col items-start md:items-end gap-1 text-sm font-medium text-muted-foreground bg-background/50 px-4 py-2 rounded-lg border border-border/40">
                  <span className="flex items-center gap-1.5 uppercase text-[10px] font-bold tracking-wider">
                    <Clock className="w-3 h-3 text-orange-500" /> Time Remaining
                  </span>
                  <span className="text-lg font-mono text-foreground">{timeLeft || "Calculating..."}</span>
                </div>
                
                <Button 
                  onClick={() => router.push(`/logiclab/problems/${currentPotd.problem_id}`)}
                  className="w-full md:w-auto h-12 px-8 text-base font-semibold bg-orange-600 hover:bg-orange-700 text-white gap-2 group shadow-md"
                >
                  {currentPotd.solved_status === "Accepted" ? "Review Challenge" : "Solve Challenge"}
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Button>
              </div>
            </div>
          </Card>
        ) : (
          <Card className="p-8 border-dashed flex flex-col items-center justify-center text-center gap-3">
            <BookOpen className="w-10 h-10 text-muted-foreground/30" />
            <div className="flex flex-col gap-1">
              <span className="text-base font-semibold">No Daily Challenge Available</span>
              <span className="text-sm text-muted-foreground">The challenge for today hasn't been posted yet. Check back later!</span>
            </div>
          </Card>
        )}
      </div>

      {/* History Section Header */}
      <div className="flex items-center justify-between mt-4">
        <h2 className="text-xl font-bold font-cirka text-foreground">Past Challenges</h2>
      </div>

      {/* History List */}
      <div className="flex flex-col gap-2.5">
        {paginatedHistory.map((item) => {
          const isSolved = item.solved_status === "Accepted"
          
          return (
            <Card 
              key={item.date}
              onClick={() => router.push(`/logiclab/problems/${item.problem_id}`)}
              className="group flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:py-3 sm:px-4 border-border/60 hover:border-orange-500/30 hover:shadow-sm transition-all cursor-pointer bg-card hover:bg-muted/10 gap-3 rounded-lg"
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5">
                  <Bookmark className={cn(
                    "w-4 h-4 transition-colors", 
                    isSolved ? "text-emerald-500 fill-emerald-500/20" : "text-muted-foreground/40 group-hover:text-orange-500"
                  )} />
                </div>
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider w-[80px] shrink-0">
                      {formatDate(item.date)}
                    </span>
                    <span className="text-sm font-semibold text-foreground group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors line-clamp-1">
                      {item.title}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-2 text-[11px] font-medium text-muted-foreground ml-[88px]">
                    <span className={cn("font-bold tracking-wide", DIFFICULTY_COLORS[item.difficulty])}>
                      {item.difficulty}
                    </span>
                    <span className="text-muted-foreground/30">•</span>
                    <span>{formatNumber(item.total_submissions)} Submissions</span>
                    <span className="text-muted-foreground/30">•</span>
                    <span>{item.acceptance_rate.toFixed(1)}% Acceptance</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center sm:pl-3 pl-[108px] mt-1 sm:mt-0">
                {isSolved ? (
                  <Button variant="ghost" className="pointer-events-none text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/10 gap-1.5 h-8 px-3 rounded-full text-xs font-bold">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Solved
                  </Button>
                ) : (
                  <Button variant="outline" className="text-foreground hover:text-orange-600 hover:border-orange-500/50 hover:bg-orange-500/5 gap-1.5 h-8 px-3 rounded-full text-xs font-bold transition-all">
                    <PlayCircle className="w-3.5 h-3.5" />
                    Solve
                  </Button>
                )}
              </div>
            </Card>
          )
        })}
        
        {history.length === 0 && (
          <div className="text-center py-12 text-muted-foreground border rounded-xl border-dashed text-sm">
            No daily challenges found yet. Check back later!
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="h-8 gap-1"
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <div className="text-xs font-medium text-muted-foreground px-2">
              Page {page} of {totalPages}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="h-8 gap-1"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

    </div>
  )
}
