"use client"

import React, { useState, useEffect, useMemo, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Flame } from "lucide-react"
import { cn } from "@/lib/utils"

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

interface LogicLabStatsCardsProps {
  globalStats: {
    total: number
    solved: number
    easy: { total: number; solved: number }
    medium: { total: number; solved: number }
    hard: { total: number; solved: number }
  }
  activityCalendar: CalendarCell[]
  streakStats: {
    currentStreak: number
    maxStreak: number
  }
}

export function ConcentricRing({
  radius,
  value,
  max,
  color,
  trackColor,
  isActive,
  isDimmed,
  onMouseEnter,
  onMouseLeave
}: {
  radius: number
  value: number
  max: number
  color: string
  trackColor: string
  isActive?: boolean
  isDimmed?: boolean
  onMouseEnter?: () => void
  onMouseLeave?: () => void
}) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  const circumference = 2 * Math.PI * radius
  const percent = max > 0 ? value / max : 0
  const strokeDashoffset = circumference - percent * circumference

  return (
    <g
      transform="rotate(-90 50 50)"
      className={cn(
        "cursor-pointer group/ring transition-opacity duration-300",
        isDimmed ? "opacity-30" : "opacity-100"
      )}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <circle
        cx="50"
        cy="50"
        r={radius}
        fill="none"
        stroke={trackColor}
        strokeWidth="8"
        className={cn(
          "transition-all duration-300 group-hover/ring:stroke-[10]",
          isActive && "stroke-[10]"
        )}
      />
      <circle
        cx="50"
        cy="50"
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth="8"
        strokeDasharray={circumference}
        strokeDashoffset={mounted ? strokeDashoffset : circumference}
        strokeLinecap="round"
        className={cn(
          "transition-all duration-1000 ease-out group-hover/ring:stroke-[10] group-hover/ring:duration-300",
          isActive && "stroke-[10] duration-300"
        )}
      />
    </g>
  )
}

export function LogicLabStatsCards({ globalStats, activityCalendar, streakStats }: LogicLabStatsCardsProps) {
  const [hoverDifficulty, setHoverDifficulty] = useState<"Easy" | "Medium" | "Hard" | null>(null)
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

  // Align cells into weeks starting on Sunday
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

  return (
    <>
      <Card className={cn('min-w-0', 'flex', 'flex-col', 'relative', 'py-0')}>
        <CardHeader className={cn('flex', 'flex-row', 'items-center', 'justify-between', 'pt-4', 'pb-1')}>
          <CardTitle className={cn('text-xs', 'font-semibold', 'text-muted-foreground', 'uppercase', 'tracking-wider')}>
            Overall Progress
          </CardTitle>
          <div className={cn('text-xs', 'text-muted-foreground/80', 'font-medium', 'select-none')}>
            {globalStats.total > 0 ? Math.round((globalStats.solved / globalStats.total) * 100) : 0}% Solved
          </div>
        </CardHeader>

        <CardContent className={cn('flex', 'flex-col', 'flex-1', 'justify-between', 'gap-5', 'pb-4')}>
          <div className={cn('flex', 'items-center', 'justify-between', 'gap-6', 'min-w-0', 'w-full')}>
            <div className={cn('flex', 'flex-col', 'gap-1', 'flex-1', 'min-w-0')}>
              <div
                className={cn(
                  "flex items-center justify-between text-sm cursor-pointer transition-all duration-200 px-2 py-1 rounded-md",
                  hoverDifficulty === "Easy" ? "bg-emerald-500/10 dark:bg-emerald-500/20" : "hover:bg-muted/40"
                )}
                onMouseEnter={() => setHoverDifficulty("Easy")}
                onMouseLeave={() => setHoverDifficulty(null)}
              >
                <div className={cn('flex', 'items-center', 'gap-2', 'min-w-0')}>
                  <span className={cn('size-2', 'rounded-full', 'bg-emerald-500', 'shrink-0')} />
                  <span className={cn('text-muted-foreground', 'font-medium', 'truncate')}>Easy</span>
                </div>
                <div className={cn('flex', 'items-baseline', 'gap-1', 'shrink-0', 'font-semibold')}>
                  <span className={cn('text-emerald-600', 'dark:text-emerald-400')}>{globalStats.easy.solved}</span>
                  <span className={cn('text-xs', 'text-muted-foreground/50')}>/ {globalStats.easy.total}</span>
                </div>
              </div>

              <div
                className={cn(
                  "flex items-center justify-between text-sm cursor-pointer transition-all duration-200 px-2 py-1 rounded-md",
                  hoverDifficulty === "Medium" ? "bg-amber-500/10 dark:bg-amber-500/20" : "hover:bg-muted/40"
                )}
                onMouseEnter={() => setHoverDifficulty("Medium")}
                onMouseLeave={() => setHoverDifficulty(null)}
              >
                <div className={cn('flex', 'items-center', 'gap-2', 'min-w-0')}>
                  <span className={cn('size-2', 'rounded-full', 'bg-amber-500', 'shrink-0')} />
                  <span className={cn('text-muted-foreground', 'font-medium', 'truncate')}>Medium</span>
                </div>
                <div className={cn('flex', 'items-baseline', 'gap-1', 'shrink-0', 'font-semibold')}>
                  <span className={cn('text-amber-600', 'dark:text-amber-400')}>{globalStats.medium.solved}</span>
                  <span className={cn('text-xs', 'text-muted-foreground/50')}>/ {globalStats.medium.total}</span>
                </div>
              </div>

              <div
                className={cn(
                  "flex items-center justify-between text-sm cursor-pointer transition-all duration-200 px-2 py-1 rounded-md",
                  hoverDifficulty === "Hard" ? "bg-rose-500/10 dark:bg-rose-500/20" : "hover:bg-muted/40"
                )}
                onMouseEnter={() => setHoverDifficulty("Hard")}
                onMouseLeave={() => setHoverDifficulty(null)}
              >
                <div className={cn('flex', 'items-center', 'gap-2', 'min-w-0')}>
                  <span className={cn('size-2', 'rounded-full', 'bg-rose-500', 'shrink-0')} />
                  <span className={cn('text-muted-foreground', 'font-medium', 'truncate')}>Hard</span>
                </div>
                <div className={cn('flex', 'items-baseline', 'gap-1', 'shrink-0', 'font-semibold')}>
                  <span className={cn('text-rose-600', 'dark:text-rose-400')}>{globalStats.hard.solved}</span>
                  <span className={cn('text-xs', 'text-muted-foreground/50')}>/ {globalStats.hard.total}</span>
                </div>
              </div>
            </div>

            <div className={cn('relative', 'size-24', 'sm:size-28', 'shrink-0')}>
              <svg className={cn('w-full', 'h-full', 'drop-shadow-md')} viewBox="0 0 100 100" preserveAspectRatio="xMaxYMid meet">
                <defs>
                  <linearGradient id="easyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#34d399" />
                    <stop offset="100%" stopColor="#059669" />
                  </linearGradient>
                  <linearGradient id="medGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#fbbf24" />
                    <stop offset="100%" stopColor="#d97706" />
                  </linearGradient>
                  <linearGradient id="hardGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#fb7185" />
                    <stop offset="100%" stopColor="#be123c" />
                  </linearGradient>
                </defs>
                <ConcentricRing
                  radius={44}
                  value={globalStats.easy.solved}
                  max={globalStats.easy.total}
                  color="url(#easyGrad)"
                  trackColor="rgba(16, 185, 129, 0.15)"
                  isActive={hoverDifficulty === "Easy"}
                  isDimmed={hoverDifficulty !== null && hoverDifficulty !== "Easy"}
                  onMouseEnter={() => setHoverDifficulty("Easy")}
                  onMouseLeave={() => setHoverDifficulty(null)}
                />
                <ConcentricRing
                  radius={31}
                  value={globalStats.medium.solved}
                  max={globalStats.medium.total}
                  color="url(#medGrad)"
                  trackColor="rgba(245, 158, 11, 0.15)"
                  isActive={hoverDifficulty === "Medium"}
                  isDimmed={hoverDifficulty !== null && hoverDifficulty !== "Medium"}
                  onMouseEnter={() => setHoverDifficulty("Medium")}
                  onMouseLeave={() => setHoverDifficulty(null)}
                />
                <ConcentricRing
                  radius={18}
                  value={globalStats.hard.solved}
                  max={globalStats.hard.total}
                  color="url(#hardGrad)"
                  trackColor="rgba(244, 63, 94, 0.15)"
                  isActive={hoverDifficulty === "Hard"}
                  isDimmed={hoverDifficulty !== null && hoverDifficulty !== "Hard"}
                  onMouseEnter={() => setHoverDifficulty("Hard")}
                  onMouseLeave={() => setHoverDifficulty(null)}
                />
              </svg>
            </div>
          </div>

          <div className={cn('mt-auto', 'select-none', 'flex', 'flex-col', 'gap-2')}>
            <div className={cn('flex', 'items-center', 'justify-between', 'text-xs', 'sm:text-sm', 'text-muted-foreground')}>
              <span className={cn('font-semibold', 'text-foreground')}>Total Solved</span>
              <span className={cn('font-bold', 'text-foreground')}>
                {globalStats.solved} <span className={cn('text-xs', 'font-normal', 'text-muted-foreground/60')}>/ {globalStats.total}</span>
              </span>
            </div>
            <Progress
              value={globalStats.total > 0 ? (globalStats.solved / globalStats.total) * 100 : 0}
              className={cn('h-1.5', 'bg-muted/60', '[&>div]:bg-blue-500', 'dark:[&>div]:bg-blue-400')}
            />
          </div>
        </CardContent>
      </Card>

      <Card className={cn('min-w-0', 'flex', 'flex-col', 'relative', 'py-0')}>
        <CardHeader className={cn('pt-4', 'pb-1')}>
          <CardTitle className={cn('text-xs', 'font-semibold', 'text-muted-foreground', 'uppercase', 'tracking-wider')}>
            Activity Graph
          </CardTitle>
        </CardHeader>

        <CardContent className={cn('flex', 'flex-col', 'flex-1', 'justify-between', 'gap-5', 'pb-4')}>
          <div className="w-full">
            <div
              className={cn('grid', 'gap-x-[2px]', 'gap-y-[2px]', 'sm:gap-x-[3px]', 'sm:gap-y-[3px]', 'w-full')}
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
              <div className={cn('flex', 'gap-[3px]', 'items-center')}>
                <div className={cn("size-[10px] bg-muted", cellRadiusClass)} title="0 submissions" />
                <div className={cn("size-[10px] bg-rose-400/80 dark:bg-rose-500/60", cellRadiusClass)} title="Attempted" />
                <div className={cn("size-[10px] bg-sky-300 dark:bg-sky-800", cellRadiusClass)} title="1 submission" />
                <div className={cn("size-[10px] bg-sky-400 dark:bg-sky-600", cellRadiusClass)} title="2-3 submissions" />
                <div className={cn("size-[10px] bg-sky-500 dark:bg-sky-500", cellRadiusClass)} title="4-6 submissions" />
                <div className={cn("size-[10px] bg-sky-600 dark:bg-sky-400", cellRadiusClass)} title="7+ submissions" />
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
    </>
  )
}
