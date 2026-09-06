"use client";

import React from "react";
import Link from "next/link";
import {
  IconArrowLeft,
  IconChevronLeft,
  IconChevronRight,
  IconList,
  IconPlayerPlay,
  IconSend,
  IconLayoutBoard,
  IconLayoutSidebar,
  IconLayoutColumns,
  IconLayoutRows,
  IconMaximize,
  IconMinimize,
} from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Spinner } from "@/components/ui/spinner";
import { Kbd } from "@/components/ui/kbd";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { WorkspaceTimer } from "../../WorkspaceTimer";
import { Problem, IdeSettings } from "@/app/(dashboard)/(licensed)/logiclab/_types";
import { cn } from "@/lib/utils";

interface WorkspaceNavbarProps {
  problem: Problem;
  prevProblemId: string | null;
  nextProblemId: string | null;
  onNavigate: (id: string) => void;
  trackContext?: { id: string; title: string; currentStep: number; totalSteps: number } | null;
  companyContext?: { id: string; name: string; currentStep: number; totalSteps: number } | null;
  isDailyChallenge?: boolean;
  isProblemListOpen: boolean;
  onToggleProblemList: () => void;
  running: boolean;
  submitting: boolean;
  onRun: () => void;
  onSubmitClick: () => void;
  ideSettings: IdeSettings;
  ideLayout: "standard" | "split" | "vertical";
  onLayoutChange: (layout: "standard" | "split" | "vertical") => void;
  isFullScreen: boolean;
  onToggleFullScreen: () => void;
  isTransitioning: boolean;
  modKey?: string;
}

export function WorkspaceNavbar({
  problem,
  prevProblemId,
  nextProblemId,
  onNavigate,
  trackContext,
  companyContext,
  isDailyChallenge = false,
  isProblemListOpen,
  onToggleProblemList,
  running,
  submitting,
  onRun,
  onSubmitClick,
  ideSettings,
  ideLayout,
  onLayoutChange,
  isFullScreen,
  onToggleFullScreen,
  isTransitioning,
  modKey = "Ctrl",
}: WorkspaceNavbarProps) {
  const backHref = isDailyChallenge
    ? "/logiclab/dailychallenges"
    : trackContext
    ? `/logiclab/tracks/${trackContext.id}`
    : companyContext
    ? `/logiclab/companies/${companyContext.id}`
    : "/logiclab";

  const backTitle = isDailyChallenge
    ? "Back to Daily Challenges"
    : trackContext
    ? `Back to ${trackContext.title}`
    : companyContext
    ? `Back to ${companyContext.name} Problems`
    : "Back to Problems";

  return (
    <header className="relative flex items-center justify-between px-3.5 py-1.5 bg-background border-b border-border/50 shrink-0 w-full select-none h-12">
      {/* Dynamic SPA transition bar */}
      {isTransitioning && (
        <div className="absolute bottom-0 left-0 right-0 h-0.5 z-50 overflow-hidden bg-primary/20">
          <div className="h-full bg-primary animate-pulse w-full shadow-[0_0_8px_var(--primary)]" />
        </div>
      )}

      {/* Left section: Back Button, List Toggle, Prev/Next, Context Badge */}
      <div className="flex items-center gap-1.5">
        <Button variant="outline" size="icon" asChild className="h-8 w-8 rounded-lg shadow-2xs" title={backTitle}>
          <Link href={backHref}>
            <IconArrowLeft className="h-4 w-4" />
          </Link>
        </Button>

        {!isDailyChallenge && (
          <>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={onToggleProblemList}
                  className={cn(
                    "h-8 w-8 rounded-lg shadow-2xs text-muted-foreground hover:text-foreground",
                    isProblemListOpen && "bg-muted text-foreground"
                  )}
                >
                  <IconList className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">Problems List</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => prevProblemId && onNavigate(prevProblemId)}
                  disabled={!prevProblemId}
                  className="h-8 w-8 rounded-lg shadow-2xs"
                >
                  <IconChevronLeft className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">Previous (Alt + P)</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => nextProblemId && onNavigate(nextProblemId)}
                  disabled={!nextProblemId}
                  className="h-8 w-8 rounded-lg shadow-2xs"
                >
                  <IconChevronRight className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">Next (Alt + N)</TooltipContent>
            </Tooltip>

            {/* Context Badge (Track or Company) */}
            {trackContext && (
              <Badge
                variant="outline"
                asChild
                className="hidden lg:inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-normal hover:bg-muted/80 transition-colors ml-1.5"
              >
                <Link href={`/logiclab/tracks/${trackContext.id}`} title={`Track: ${trackContext.title}`}>
                  <span className="text-muted-foreground font-mono text-[11px]">Track:</span>
                  <span className="font-semibold truncate max-w-35 text-foreground">{trackContext.title}</span>
                  <span className="text-[10px] font-mono text-muted-foreground">
                    ({trackContext.currentStep}/{trackContext.totalSteps})
                  </span>
                </Link>
              </Badge>
            )}

            {companyContext && !trackContext && (
              <Badge
                variant="outline"
                asChild
                className="hidden lg:inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-normal hover:bg-muted/80 transition-colors ml-1.5"
              >
                <Link href={`/logiclab/companies/${companyContext.id}`} title={`Company: ${companyContext.name}`}>
                  <span className="text-muted-foreground font-mono text-[11px]">Company:</span>
                  <span className="font-semibold truncate max-w-35 text-foreground">{companyContext.name}</span>
                  <span className="text-[10px] font-mono text-muted-foreground">
                    ({companyContext.currentStep}/{companyContext.totalSteps})
                  </span>
                </Link>
              </Badge>
            )}
          </>
        )}
      </div>

      {/* Center section: Run & Submit Action Group */}
      {(ideSettings.buttonPosition === "toolbar" || isDailyChallenge) && (
        <div className="absolute left-1/2 -translate-x-1/2">
          <ButtonGroup className="shadow-xs border border-border/60 rounded-lg p-0.5 bg-muted/20">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  onClick={onRun}
                  disabled={running || submitting}
                  className="h-8 px-3.5 text-xs font-semibold hover:bg-background/80 flex items-center gap-1.5 rounded-md transition-all group"
                >
                  {running ? (
                    <Spinner className="size-3.5" />
                  ) : (
                    <IconPlayerPlay className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 fill-emerald-500/20 group-hover:scale-110 transition-transform" />
                  )}
                  <span>{running ? "Running" : "Run"}</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="flex items-center gap-1">
                Run Code <Kbd className="text-[10px]">{modKey}+Enter</Kbd>
              </TooltipContent>
            </Tooltip>

            <Separator orientation="vertical" className="h-4 my-auto bg-border/60" />

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  onClick={onSubmitClick}
                  disabled={running || submitting}
                  className="h-8 px-3.5 text-xs font-semibold hover:bg-background/80 flex items-center gap-1.5 rounded-md transition-all group"
                >
                  {submitting ? (
                    <Spinner className="size-3.5" />
                  ) : (
                    <IconSend className="h-3.5 w-3.5 text-sky-600 dark:text-sky-400 fill-sky-500/20 group-hover:scale-110 transition-transform" />
                  )}
                  <span>{submitting ? "Judging" : "Submit"}</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="flex items-center gap-1">
                Submit Solution <Kbd className="text-[10px]">{modKey}+Shift+Enter</Kbd>
              </TooltipContent>
            </Tooltip>
          </ButtonGroup>
        </div>
      )}

      {/* Right section: Timer, Layout Switcher, Fullscreen */}
      <div className="flex items-center gap-1.5">
        <WorkspaceTimer />

        {/* Standardized Layout Switcher using shadcn DropdownMenu */}
        <DropdownMenu>
          <Tooltip>
            <TooltipTrigger asChild>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground shadow-2xs cursor-pointer"
                >
                  <IconLayoutBoard className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
            </TooltipTrigger>
            <TooltipContent side="bottom">Change Layout</TooltipContent>
          </Tooltip>

          <DropdownMenuContent className="w-56 z-9999" align="end" sideOffset={8}>
            <DropdownMenuLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Workspace Layout
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuRadioGroup
              value={ideLayout}
              onValueChange={(val) => onLayoutChange(val as "standard" | "split" | "vertical")}
            >
              <DropdownMenuRadioItem value="standard" className="text-xs font-medium cursor-pointer gap-2.5 py-2">
                <IconLayoutSidebar className="h-4 w-4 text-muted-foreground shrink-0" />
                <div className="flex flex-col gap-0.5">
                  <span className="font-semibold text-foreground">Standard</span>
                  <span className="text-[11px] text-muted-foreground">Code & console stacked</span>
                </div>
              </DropdownMenuRadioItem>

              <DropdownMenuRadioItem value="split" className="text-xs font-medium cursor-pointer gap-2.5 py-2">
                <IconLayoutColumns className="h-4 w-4 text-muted-foreground shrink-0" />
                <div className="flex flex-col gap-0.5">
                  <span className="font-semibold text-foreground">3-Columns Split</span>
                  <span className="text-[11px] text-muted-foreground">Description, code & output</span>
                </div>
              </DropdownMenuRadioItem>

              <DropdownMenuRadioItem value="vertical" className="text-xs font-medium cursor-pointer gap-2.5 py-2">
                <IconLayoutRows className="h-4 w-4 text-muted-foreground shrink-0" />
                <div className="flex flex-col gap-0.5">
                  <span className="font-semibold text-foreground">Stacked Vertical</span>
                  <span className="text-[11px] text-muted-foreground">Full-width stacked rows</span>
                </div>
              </DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Fullscreen Toggle */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              onClick={onToggleFullScreen}
              className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground shadow-2xs"
            >
              {isFullScreen ? (
                <IconMinimize className="h-4 w-4" />
              ) : (
                <IconMaximize className="h-4 w-4" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            {isFullScreen ? "Exit Fullscreen" : "Fullscreen Mode"}
          </TooltipContent>
        </Tooltip>
      </div>
    </header>
  );
}
