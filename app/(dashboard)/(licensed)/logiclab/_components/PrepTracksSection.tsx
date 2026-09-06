"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { PREP_TRACKS, PrepTrack } from "../_constants/tracks";
import { Target, CheckCircle2, X, ArrowRight } from "lucide-react";

interface PrepTracksSectionProps {
  activeTrackId: string | null;
  onSelectTrack: (trackId: string | null) => void;
  userSolvedNumbers: number[];
  className?: string;
}

export function PrepTracksSection({
  activeTrackId,
  onSelectTrack,
  userSolvedNumbers,
  className,
}: PrepTracksSectionProps) {
  const solvedSet = new Set(userSolvedNumbers);

  return (
    <div className={cn("space-y-4", className)}>
      {/* Section Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold tracking-tight text-foreground flex items-center gap-2">
            Curated Placement Tracks
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Structured roadmaps designed for specific recruitment rounds and technical interviews.
          </p>
        </div>

        {activeTrackId && (
          <button
            type="button"
            onClick={() => onSelectTrack(null)}
            className="text-xs text-muted-foreground hover:text-foreground font-medium flex items-center gap-1 cursor-pointer transition-colors"
          >
            <X className="size-3.5" />
            Show All Problems
          </button>
        )}
      </div>

      {/* Structured Clean Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {PREP_TRACKS.map((track) => {
          const isActive = activeTrackId === track.id;
          const totalProblems = track.problemNumbers.length;
          const solvedCount = track.problemNumbers.filter((n) => solvedSet.has(n)).length;
          const progress = Math.round((solvedCount / totalProblems) * 100);

          return (
            <div
              key={track.id}
              onClick={() => onSelectTrack(isActive ? null : track.id)}
              className={cn(
                "group relative flex flex-col justify-between p-4 rounded-xl border bg-card transition-all duration-150 cursor-pointer select-none",
                isActive
                  ? "border-foreground/80 shadow-xs ring-1 ring-foreground/20"
                  : "border-border/70 hover:border-border hover:bg-muted/15"
              )}
            >
              {/* Content */}
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-mono text-muted-foreground">
                    {totalProblems} Problems
                  </span>
                  {isActive ? (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-foreground text-background">
                      Selected
                    </span>
                  ) : (
                    <span className="text-[10px] text-muted-foreground/60 group-hover:text-foreground transition-colors flex items-center gap-0.5">
                      View <ArrowRight className="size-3 inline" />
                    </span>
                  )}
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-foreground group-hover:text-foreground transition-colors leading-snug">
                    {track.title}
                  </h3>
                  <p className="text-xs text-muted-foreground/80 line-clamp-2 mt-1 leading-relaxed">
                    {track.subtitle}
                  </p>
                </div>

                <div className="text-[11px] text-muted-foreground font-medium pt-1">
                  <span className="text-muted-foreground/60">Target: </span>
                  <span className="text-foreground/80">{track.targetCompanies.slice(0, 3).join(", ")}</span>
                  {track.targetCompanies.length > 3 && (
                    <span className="text-muted-foreground/60"> +{track.targetCompanies.length - 3}</span>
                  )}
                </div>
              </div>

              {/* Minimal Clean Progress Bar */}
              <div className="mt-4 pt-3 border-t border-border/40 space-y-1.5">
                <div className="flex items-center justify-between text-[11px] font-mono">
                  <span className="text-muted-foreground text-[10px]">Progress</span>
                  <span className="font-medium text-foreground">
                    {solvedCount}/{totalProblems} ({progress}%)
                  </span>
                </div>
                <div className="h-1 w-full bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-foreground/80 rounded-full transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Clean Active Track Strip */}
      {activeTrackId && (
        <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-muted/40 border border-border/60 text-xs text-foreground">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="size-3.5 text-foreground/70" />
            <span>
              Showing {PREP_TRACKS.find((t) => t.id === activeTrackId)?.title} ({PREP_TRACKS.find((t) => t.id === activeTrackId)?.problemNumbers.length} problems).
            </span>
          </div>
          <button
            type="button"
            onClick={() => onSelectTrack(null)}
            className="text-xs font-semibold text-foreground hover:underline ml-2 cursor-pointer"
          >
            Clear Filter
          </button>
        </div>
      )}
    </div>
  );
}
