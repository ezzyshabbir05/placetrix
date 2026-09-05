"use client";

import React, { useState, useEffect } from "react";
import { IconClock, IconPlayerPlay, IconPlayerPause, IconRefresh } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export const WorkspaceTimer = React.memo(function WorkspaceTimer() {
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);

  useEffect(() => {
    let interval: any = null;
    if (timerRunning) {
      interval = setInterval(() => {
        setTimerSeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [timerRunning]);

  const formatTimer = (totalSeconds: number) => {
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    if (hrs > 0) {
      return `${hrs.toString().padStart(2, "0")}:${mins
        .toString()
        .padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    }
    return `${mins.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          title="Coding Time"
          className={cn(
            "h-7 px-2 text-zinc-600 dark:text-muted-foreground hover:text-foreground",
            "flex items-center gap-1.5 font-mono text-[11px] font-semibold transition-colors select-none bg-background"
          )}
          onMouseDown={(e) => e.preventDefault()}
          onClick={(e) => e.currentTarget.blur()}
        >
          <IconClock
            className={`h-3.5 w-3.5 ${
              timerRunning ? "animate-pulse text-emerald-500" : "text-zinc-600 dark:text-muted-foreground"
            }`}
          />
          {(timerSeconds > 0 || timerRunning) && (
            <span className={cn("tabular-nums", "font-bold", "tracking-wider")}>
              {formatTimer(timerSeconds)}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className={cn("w-56 p-4 z-[9999]")}
        align="end"
        onOpenAutoFocus={(e) => e.preventDefault()}
        onCloseAutoFocus={(e) => e.preventDefault()}
      >
        <div className={cn("flex flex-col gap-3.5 items-center text-center")}>
          <span className={cn("text-[10px] font-extrabold uppercase tracking-widest text-zinc-500 dark:text-muted-foreground")}>
            Coding Time
          </span>
          <span className={cn("text-2xl font-black font-mono tracking-wide text-foreground tabular-nums select-all")}>
            {formatTimer(timerSeconds)}
          </span>
          <div className={cn("flex gap-2 w-full justify-center")}>
            <Button
              size="sm"
              variant="outline"
              className={cn("h-8 text-xs font-semibold flex items-center gap-1.5 flex-1 bg-background")}
              onClick={() => setTimerRunning(!timerRunning)}
            >
              {timerRunning ? (
                <>
                  <IconPlayerPause className={cn("h-3.5 w-3.5 text-amber-500 fill-amber-500/20")} />
                  <span>Pause</span>
                </>
              ) : (
                <>
                  <IconPlayerPlay className={cn("h-3.5 w-3.5 text-emerald-500 fill-emerald-500/20")} />
                  <span>Start</span>
                </>
              )}
            </Button>
            <Button
              size="sm"
              variant="outline"
              className={cn("h-8 px-2.5 bg-background")}
              title="Reset Timer"
              onClick={() => {
                setTimerRunning(false);
                setTimerSeconds(0);
              }}
            >
              <IconRefresh className={cn("h-3.5 w-3.5 text-muted-foreground")} />
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
});
