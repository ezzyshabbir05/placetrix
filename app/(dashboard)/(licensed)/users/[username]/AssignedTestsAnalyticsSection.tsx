"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationPrevious,
  PaginationNext,
  PaginationEllipsis,
} from "@/components/ui/pagination";
import { cn } from "@/lib/utils";
import {
  CheckCircle2,
  XCircle,
  Clock,
  PlayCircle,
  AlertTriangle,
  TrendingUp,
  Search,
  Target,
  ShieldAlert,
  Award,
  BookOpen,
  ArrowUpRight,
  Zap,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  CartesianGrid,
} from "recharts";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CandidateTestAttemptDetail {
  id: string;
  attemptNumber: number;
  status: "submitted" | "in_progress" | "auto_submitted" | string;
  score: number | null;
  totalMarks: number | null;
  percentage: number | null;
  passed: boolean | null;
  startedAt: string;
  submittedAt: string | null;
  activeTimeTaken: number | null;
  totalTimeTaken?: number | null;
  tabSwitchCount: number;
}

export interface CandidateTestStatItem {
  id: string;
  title: string;
  description: string | null;
  passPercentage: number | null;
  timeLimitSeconds: number | null;
  availableFrom: string | null;
  availableUntil: string | null;
  marksAvailable: boolean;
  resultsAvailable: boolean;
  status: string;
  derivedStatus: "completed" | "in_progress" | "live" | "upcoming" | "missed";
  attempt?: CandidateTestAttemptDetail;
}

export interface CandidateTestsPerformanceData {
  totalAssigned: number;
  completedCount: number;
  inProgressCount: number;
  liveCount: number;
  upcomingCount: number;
  missedCount: number;
  averagePercentage: number;
  highestPercentage: number;
  lowestPercentage: number;
  passCount: number;
  failCount: number;
  passRate: number;
  totalTimeSpentSeconds: number;
  avgTimeSpentSeconds: number;
  totalTabSwitches: number;
  questionStats: {
    totalAnswered: number;
    totalCorrect: number;
    accuracyPercentage: number;
  };
  testsList: CandidateTestStatItem[];
}

interface Props {
  data: CandidateTestsPerformanceData;
}

// ─── Helper Formatting Functions ──────────────────────────────────────────────

function formatDuration(seconds: number | null | undefined): string {
  if (!seconds || seconds <= 0) return "—";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s > 0 ? `${s}s` : ""}`;
  return `${s}s`;
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  try {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(dateStr));
  } catch {
    return dateStr;
  }
}

function formatShortDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  try {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
    }).format(new Date(dateStr));
  } catch {
    return dateStr;
  }
}

// ─── Custom Recharts Tooltip ──────────────────────────────────────────────────

function CustomScoreTooltip({ active, payload }: any) {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="rounded-lg border bg-popover/95 backdrop-blur-md p-3 shadow-xl text-xs flex flex-col gap-1.5 max-w-[240px]">
        <p className="font-semibold text-popover-foreground truncate">{data.title}</p>
        <div className="flex items-center justify-between gap-3 text-muted-foreground">
          <span>Submitted:</span>
          <span className="tabular-nums font-medium text-foreground">{data.fullDateTime || data.date}</span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="text-muted-foreground">Score:</span>
          <span className="font-bold tabular-nums text-emerald-500">
            {data.score !== null ? `${data.score} / ${data.totalMarks}` : "—"} ({data.percentage.toFixed(1)}%)
          </span>
        </div>
      </div>
    );
  }
  return null;
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function AssignedTestsAnalyticsSection({ data }: Props) {
  const [activeTab, setActiveTab] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const ITEMS_PER_PAGE = 5;

  const {
    totalAssigned,
    completedCount,
    inProgressCount,
    liveCount,
    upcomingCount,
    missedCount,
    averagePercentage,
    highestPercentage,
    passCount,
    failCount,
    passRate,
    totalTimeSpentSeconds,
    avgTimeSpentSeconds,
    totalTabSwitches,
    questionStats,
    testsList,
  } = data;

  // Filter tests list by active tab and search query (excluding upcoming tests)
  const filteredTests = useMemo(() => {
    return testsList.filter((test) => {
      // Exclude upcoming tests
      if (test.derivedStatus === "upcoming") return false;

      // Tab filter
      if (activeTab === "completed" && test.derivedStatus !== "completed") return false;
      if (activeTab === "live" && test.derivedStatus !== "live" && test.derivedStatus !== "in_progress") return false;
      if (activeTab === "missed" && test.derivedStatus !== "missed") return false;

      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = test.title.toLowerCase().includes(q);
        const matchesDesc = test.description?.toLowerCase().includes(q) ?? false;
        return matchesTitle || matchesDesc;
      }
      return true;
    });
  }, [testsList, activeTab, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredTests.length / ITEMS_PER_PAGE));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (safeCurrentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = Math.min(startIndex + ITEMS_PER_PAGE, filteredTests.length);
  const paginatedTests = filteredTests.slice(startIndex, endIndex);

  // Chart data for score trend
  const scoreTrendData = useMemo(() => {
    const sortedCompleted = testsList
      .filter((t) => t.derivedStatus === "completed" && t.attempt?.percentage != null)
      .sort((a, b) => {
        const timeA = new Date(a.attempt?.submittedAt || a.attempt?.startedAt || 0).getTime();
        const timeB = new Date(b.attempt?.submittedAt || b.attempt?.startedAt || 0).getTime();
        return timeA - timeB;
      });

    const dateCounts = new Map<string, number>();
    sortedCompleted.forEach((t) => {
      const dayKey = formatShortDate(t.attempt?.submittedAt);
      dateCounts.set(dayKey, (dateCounts.get(dayKey) || 0) + 1);
    });

    const sameDayCounters = new Map<string, number>();

    return sortedCompleted.map((t) => {
      const dayKey = formatShortDate(t.attempt?.submittedAt);
      const count = dateCounts.get(dayKey) || 1;

      let displayLabel = dayKey;
      if (count > 1) {
        const currentNum = (sameDayCounters.get(dayKey) || 0) + 1;
        sameDayCounters.set(dayKey, currentNum);
        displayLabel = `${dayKey} (#${currentNum})`;
      }

      return {
        id: t.id,
        title: t.title,
        date: displayLabel,
        fullDateTime: formatDate(t.attempt?.submittedAt),
        percentage: Number(t.attempt?.percentage?.toFixed(1) || 0),
        score: t.attempt?.score ?? null,
        totalMarks: t.attempt?.totalMarks ?? null,
        passPercentage: t.passPercentage ?? 50,
        passed: t.attempt?.passed ?? (t.attempt?.percentage ?? 0) >= (t.passPercentage ?? 50),
      };
    });
  }, [testsList]);

  const completionRate = totalAssigned > 0 ? (completedCount / totalAssigned) * 100 : 0;
  const availableAssignedCount = Math.max(0, totalAssigned - upcomingCount);

  return (
    <Card className="flex flex-col gap-4 py-5 shadow-xs border border-border/60 print:border-none print:shadow-none print:break-inside-avoid">
      <CardHeader className="pb-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex flex-col gap-1">
            <CardTitle className="text-base font-semibold tracking-tight">
              Assigned Tests & Score Performance
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Detailed breakdown of assigned tests, attempt scores, pass rates, and performance analytics.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2 shrink-0 print:hidden">
            <Badge variant="outline" className="text-xs font-semibold flex items-center gap-1.5 py-1 px-2.5">
              <BookOpen className="size-3.5 text-primary" />
              {availableAssignedCount} Assigned {availableAssignedCount === 1 ? "Test" : "Tests"}
            </Badge>
            {completedCount > 0 && (
              <Badge variant="secondary" className="text-xs font-semibold flex items-center gap-1.5 py-1 px-2.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20">
                <CheckCircle2 className="size-3.5" />
                {completedCount} Completed
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex flex-col gap-6 pt-2">
        {/* ── Key Metrics Cards ────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 print:grid-cols-3">
          {/* Card 1: Completion */}
          <div className="rounded-xl border border-border/50 bg-card p-3.5 flex flex-col gap-1.5 shadow-2xs print:border-border/80">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Completion</span>
            </div>
            <div>
              <p className="text-2xl font-bold tabular-nums leading-none">
                {completedCount}
                <span className="text-xs font-normal text-muted-foreground ml-1">/ {availableAssignedCount}</span>
              </p>
              <p className="text-[11px] text-muted-foreground mt-1">
                {completionRate.toFixed(0)}% completion rate
              </p>
            </div>
          </div>

          {/* Card 2: Average Score */}
          <div className="rounded-xl border border-border/50 bg-card p-3.5 flex flex-col gap-1.5 shadow-2xs print:border-border/80">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Avg Score</span>
            </div>
            <div>
              <p className={cn(
                "text-2xl font-bold tabular-nums leading-none",
                averagePercentage >= 75 ? "text-emerald-600 dark:text-emerald-400" :
                averagePercentage >= 50 ? "text-amber-600 dark:text-amber-400" :
                completedCount > 0 ? "text-rose-600 dark:text-rose-400" : "text-foreground"
              )}>
                {completedCount > 0 ? `${averagePercentage.toFixed(1)}%` : "—"}
              </p>
              <p className="text-[11px] text-muted-foreground mt-1">
                {highestPercentage > 0 ? `Peak: ${highestPercentage.toFixed(1)}%` : "No graded tests"}
              </p>
            </div>
          </div>

          {/* Card 3: Pass Rate */}
          <div className="rounded-xl border border-border/50 bg-card p-3.5 flex flex-col gap-1.5 shadow-2xs print:border-border/80">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Pass Rate</span>
            </div>
            <div>
              <p className="text-2xl font-bold tabular-nums leading-none">
                {completedCount > 0 ? `${passRate.toFixed(1)}%` : "—"}
              </p>
              <p className="text-[11px] text-muted-foreground mt-1">
                {passCount} Passed · {failCount} Failed
              </p>
            </div>
          </div>

          {/* Card 4: Total Time Spent */}
          <div className="rounded-xl border border-border/50 bg-card p-3.5 flex flex-col gap-1.5 shadow-2xs print:border-border/80">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Time Spent</span>
            </div>
            <div>
              <p className="text-2xl font-bold tabular-nums leading-none">
                {formatDuration(totalTimeSpentSeconds)}
              </p>
              <p className="text-[11px] text-muted-foreground mt-1">
                Avg {formatDuration(avgTimeSpentSeconds)} / test
              </p>
            </div>
          </div>

          {/* Card 5: Answer Accuracy */}
          <div className="rounded-xl border border-border/50 bg-card p-3.5 flex flex-col gap-1.5 shadow-2xs print:border-border/80">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Accuracy</span>
            </div>
            <div>
              <p className="text-2xl font-bold tabular-nums leading-none">
                {questionStats.totalAnswered > 0 ? `${questionStats.accuracyPercentage.toFixed(1)}%` : "—"}
              </p>
              <p className="text-[11px] text-muted-foreground mt-1">
                {questionStats.totalCorrect} / {questionStats.totalAnswered} correct
              </p>
            </div>
          </div>

          {/* Card 6: Proctoring / Tab Switches */}
          <div className="rounded-xl border border-border/50 bg-card p-3.5 flex flex-col gap-1.5 shadow-2xs print:border-border/80">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Proctoring</span>
            </div>
            <div>
              <p className={cn(
                "text-2xl font-bold tabular-nums leading-none",
                totalTabSwitches > 0 ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400"
              )}>
                {totalTabSwitches}
              </p>
              <p className="text-[11px] text-muted-foreground mt-1">
                {totalTabSwitches > 0 ? "Tab switches detected" : "Clean attempt record"}
              </p>
            </div>
          </div>
        </div>

        {/* ── Charts & Visual Distribution Section ─────────────────────────── */}
        {scoreTrendData.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 print:grid-cols-1">
            {/* Chart: Score Trend */}
            <div className="lg:col-span-2 rounded-xl border border-border/50 bg-muted/20 p-4 flex flex-col gap-3 print:bg-white print:border-border/80">
              <div className="flex items-center justify-between">
                <div className="flex flex-col gap-0.5">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Score Performance Trend (%)
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    Chronological performance history across completed tests.
                  </p>
                </div>
              </div>

              <div className="h-[210px] w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={scoreTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(128,128,128,0.15)" />
                    <XAxis
                      dataKey="date"
                      tickLine={false}
                      axisLine={false}
                      tick={{ fontSize: 10, fill: "gray" }}
                    />
                    <YAxis
                      domain={[0, 100]}
                      tickLine={false}
                      axisLine={false}
                      tick={{ fontSize: 10, fill: "gray" }}
                      ticks={[0, 25, 50, 75, 100]}
                    />
                    <RechartsTooltip content={<CustomScoreTooltip />} />
                    <Area
                      type="monotone"
                      dataKey="percentage"
                      stroke="#10b981"
                      strokeWidth={2.5}
                      fillOpacity={1}
                      fill="url(#scoreGradient)"
                      activeDot={{ r: 6, fill: "#10b981", stroke: "#ffffff", strokeWidth: 2 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Distribution Breakdown Card */}
            <div className="rounded-xl border border-border/50 bg-muted/20 p-4 flex flex-col justify-between gap-4 print:bg-white print:border-border/80">
              <div className="flex flex-col gap-1">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Test Status & Outcome
                </p>
                <p className="text-[11px] text-muted-foreground">
                  Breakdown of assigned tests by state.
                </p>
              </div>

              <div className="flex flex-col gap-3">
                {/* Passed */}
                <div className="flex flex-col gap-1">
                  <div className="flex items-center justify-between text-xs font-medium">
                    <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                      <CheckCircle2 className="size-3.5" /> Passed Tests
                    </span>
                    <span className="tabular-nums font-semibold">{passCount}</span>
                  </div>
                  <Progress value={availableAssignedCount > 0 ? (passCount / availableAssignedCount) * 100 : 0} className="h-2 bg-emerald-500/10 [&>div]:bg-emerald-500" />
                </div>

                {/* Failed */}
                <div className="flex flex-col gap-1">
                  <div className="flex items-center justify-between text-xs font-medium">
                    <span className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400">
                      <XCircle className="size-3.5" /> Needs Improvement
                    </span>
                    <span className="tabular-nums font-semibold">{failCount}</span>
                  </div>
                  <Progress value={availableAssignedCount > 0 ? (failCount / availableAssignedCount) * 100 : 0} className="h-2 bg-rose-500/10 [&>div]:bg-rose-500" />
                </div>

                {/* Live / Available */}
                <div className="flex flex-col gap-1">
                  <div className="flex items-center justify-between text-xs font-medium">
                    <span className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400">
                      <PlayCircle className="size-3.5" /> Live & Available
                    </span>
                    <span className="tabular-nums font-semibold">{liveCount + inProgressCount}</span>
                  </div>
                  <Progress value={availableAssignedCount > 0 ? ((liveCount + inProgressCount) / availableAssignedCount) * 100 : 0} className="h-2 bg-blue-500/10 [&>div]:bg-blue-500" />
                </div>

                {/* Missed / Expired */}
                {missedCount > 0 && (
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center justify-between text-xs font-medium">
                      <span className="flex items-center gap-1.5 text-muted-foreground">
                        <AlertTriangle className="size-3.5" /> Missed / Unattempted
                      </span>
                      <span className="tabular-nums font-semibold">{missedCount}</span>
                    </div>
                    <Progress value={availableAssignedCount > 0 ? (missedCount / availableAssignedCount) * 100 : 0} className="h-2 bg-muted/40 [&>div]:bg-muted-foreground/40" />
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── Assigned Tests List & Filter Tabs ───────────────────────────── */}
        <div className="flex flex-col gap-4 pt-2 border-t">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 print:hidden">
            <Tabs
              value={activeTab}
              onValueChange={(val) => {
                setActiveTab(val);
                setCurrentPage(1);
              }}
              className="w-full sm:w-auto"
            >
              <TabsList className="grid grid-cols-4 w-full sm:w-auto h-9 p-1">
                <TabsTrigger value="all" className="text-xs px-2.5">
                  All ({availableAssignedCount})
                </TabsTrigger>
                <TabsTrigger value="completed" className="text-xs px-2.5">
                  Done ({completedCount})
                </TabsTrigger>
                <TabsTrigger value="live" className="text-xs px-2.5">
                  Live ({liveCount + inProgressCount})
                </TabsTrigger>
                <TabsTrigger value="missed" className="text-xs px-2.5">
                  Missed ({missedCount})
                </TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="relative w-full sm:w-64">
              <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
              <Input
                placeholder="Search assigned tests..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="pl-9 h-9 text-xs"
              />
            </div>
          </div>

          {/* Tests List Rendering */}
          {filteredTests.length > 0 ? (
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-2.5">
                {paginatedTests.map((test) => {
                  const isSubmitted = test.derivedStatus === "completed";
                  const isInProgress = test.derivedStatus === "in_progress";
                  const isLive = test.derivedStatus === "live";

                  const score = test.attempt?.score ?? null;
                  const totalMarks = test.attempt?.totalMarks ?? null;
                  const percentage = test.attempt?.percentage ?? (score !== null && totalMarks ? (score / totalMarks) * 100 : null);

                  const passThreshold = test.passPercentage ?? 50;
                  const isPassed = percentage !== null ? percentage >= passThreshold : (test.attempt?.passed ?? null);
                  const isScoreVisible = test.marksAvailable || test.resultsAvailable;

                  return (
                    <div
                      key={test.id}
                      className="rounded-lg border border-border/50 bg-card p-3 sm:p-3.5 hover:border-border/80 transition-all flex flex-col gap-2 shadow-2xs print:border-border/80 print:break-inside-avoid"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                        {/* Left Column: Title, Status, Description & Meta */}
                        <div className="flex-1 min-w-0 flex flex-col gap-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="text-xs sm:text-sm font-semibold tracking-tight text-foreground truncate">
                              {test.title}
                            </h4>
                            {/* Status Badge */}
                            {isSubmitted ? (
                              isPassed === true ? (
                                <Badge variant="secondary" className="flex items-center gap-1 text-[10px] h-4.5 px-1.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 font-medium">
                                  <CheckCircle2 className="size-3" /> Passed
                                </Badge>
                              ) : isPassed === false ? (
                                <Badge variant="secondary" className="flex items-center gap-1 text-[10px] h-4.5 px-1.5 bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20 font-medium">
                                  <XCircle className="size-3" /> Failed
                                </Badge>
                              ) : (
                                <Badge variant="secondary" className="flex items-center gap-1 text-[10px] h-4.5 px-1.5 font-medium">
                                  <CheckCircle2 className="size-3" /> Submitted
                                </Badge>
                              )
                            ) : isInProgress ? (
                              <Badge variant="outline" className="flex items-center gap-1 text-[10px] h-4.5 px-1.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 animate-pulse font-medium">
                                <Clock className="size-3" /> In Progress
                              </Badge>
                            ) : isLive ? (
                              <Badge variant="secondary" className="flex items-center gap-1 text-[10px] h-4.5 px-1.5 bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20 font-medium">
                                <PlayCircle className="size-3" /> Live Now
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="flex items-center gap-1 text-[10px] h-4.5 px-1.5 text-muted-foreground font-medium">
                                <AlertTriangle className="size-3" /> Missed
                              </Badge>
                            )}

                            {test.attempt && test.attempt.tabSwitchCount > 0 && (
                              <Badge variant="outline" className="text-[10px] h-4.5 px-1.5 flex items-center gap-1 text-rose-600 dark:text-rose-400 border-rose-500/20 bg-rose-500/5 font-normal">
                                <ShieldAlert className="size-3 print:hidden" />
                                {test.attempt.tabSwitchCount} tab switch{test.attempt.tabSwitchCount > 1 ? "es" : ""}
                              </Badge>
                            )}
                          </div>

                          {test.description && (
                            <p className="text-[11px] text-muted-foreground line-clamp-1 leading-snug">
                              {test.description}
                            </p>
                          )}

                          {/* Meta details row */}
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground pt-0.5">
                            {test.timeLimitSeconds && (
                              <span className="flex items-center gap-1">
                                <Clock className="size-3" />
                                Duration: {formatDuration(test.timeLimitSeconds)}
                              </span>
                            )}
                            {test.attempt?.activeTimeTaken && (
                              <span className="flex items-center gap-1 text-foreground/80" title="Active time spent answering questions">
                                <Zap className="size-3 text-indigo-500 print:hidden" />
                                Active: {formatDuration(test.attempt.activeTimeTaken)}
                              </span>
                            )}
                            {test.attempt?.totalTimeTaken && (
                              <span className="flex items-center gap-1 text-foreground/80" title="Total duration from start to submission">
                                <Clock className="size-3 text-muted-foreground print:hidden" />
                                Total: {formatDuration(test.attempt.totalTimeTaken)}
                              </span>
                            )}
                            {test.attempt?.submittedAt && (
                              <span className="flex items-center gap-1">
                                <CheckCircle2 className="size-3 text-emerald-500 print:hidden" />
                                Submitted: {formatDate(test.attempt.submittedAt)}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Right Column: Score Display & Action Button */}
                        <div className="flex items-center gap-3 shrink-0 self-start sm:self-center">
                          {isSubmitted && (
                            <div className="flex flex-col items-end gap-1 text-right">
                              {isScoreVisible && percentage !== null ? (
                                <>
                                  <div className="flex items-center gap-1.5">
                                    <span className={cn(
                                      "text-xs sm:text-sm font-bold tabular-nums",
                                      (isPassed ?? percentage >= passThreshold) ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
                                    )}>
                                      {percentage.toFixed(1)}%
                                    </span>
                                    {score !== null && totalMarks && (
                                      <span className="text-[11px] text-muted-foreground tabular-nums">
                                        ({score}/{totalMarks})
                                      </span>
                                    )}
                                  </div>
                                  <div className="w-20 sm:w-24">
                                    <Progress
                                      value={percentage}
                                      className={cn(
                                        "h-1.5",
                                        (isPassed ?? percentage >= passThreshold)
                                          ? "[&>div]:bg-emerald-500 bg-emerald-500/10"
                                          : "[&>div]:bg-rose-500 bg-rose-500/10"
                                      )}
                                    />
                                  </div>
                                </>
                              ) : (
                                <span className="text-muted-foreground italic text-[11px]">
                                  Score hidden
                                </span>
                              )}
                            </div>
                          )}

                          {isSubmitted && test.attempt?.id && (
                            <div className="shrink-0 print:hidden">
                              <Link href={`/tests/${test.id}/result/${test.attempt.id}`}>
                                <Button variant="outline" size="sm" className="h-7 text-xs px-2.5 gap-1">
                                  View Result
                                  <ArrowUpRight className="size-3" />
                                </Button>
                              </Link>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Official Shadcn Pagination Controls */}
              {filteredTests.length > ITEMS_PER_PAGE && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 text-xs text-muted-foreground border-t border-border/40 print:hidden">
                  <span className="tabular-nums">
                    Showing <span className="font-semibold text-foreground">{startIndex + 1}</span>–<span className="font-semibold text-foreground">{endIndex}</span> of <span className="font-semibold text-foreground">{filteredTests.length}</span> tests
                  </span>
                  <Pagination className="w-auto mx-0">
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious
                          href="#"
                          onClick={(e) => {
                            e.preventDefault();
                            if (safeCurrentPage > 1) setCurrentPage((prev) => prev - 1);
                          }}
                          className={cn("cursor-pointer", safeCurrentPage <= 1 && "pointer-events-none opacity-50")}
                        />
                      </PaginationItem>

                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => {
                        if (
                          pageNum === 1 ||
                          pageNum === totalPages ||
                          (pageNum >= safeCurrentPage - 1 && pageNum <= safeCurrentPage + 1)
                        ) {
                          return (
                            <PaginationItem key={pageNum}>
                              <PaginationLink
                                href="#"
                                isActive={pageNum === safeCurrentPage}
                                onClick={(e) => {
                                  e.preventDefault();
                                  setCurrentPage(pageNum);
                                }}
                                className="cursor-pointer size-8 text-xs"
                              >
                                {pageNum}
                              </PaginationLink>
                            </PaginationItem>
                          );
                        }
                        if (pageNum === safeCurrentPage - 2 || pageNum === safeCurrentPage + 2) {
                          return (
                            <PaginationItem key={pageNum}>
                              <PaginationEllipsis />
                            </PaginationItem>
                          );
                        }
                        return null;
                      })}

                      <PaginationItem>
                        <PaginationNext
                          href="#"
                          onClick={(e) => {
                            e.preventDefault();
                            if (safeCurrentPage < totalPages) setCurrentPage((prev) => prev + 1);
                          }}
                          className={cn("cursor-pointer", safeCurrentPage >= totalPages && "pointer-events-none opacity-50")}
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed p-8 text-center flex flex-col gap-2 items-center justify-center print:hidden">
              <BookOpen className="size-8 text-muted-foreground/40" />
              <p className="text-sm font-medium text-muted-foreground">
                {searchQuery.trim()
                  ? "No assigned tests match your search query."
                  : activeTab === "all"
                  ? "No tests have been assigned to this candidate yet."
                  : `No ${activeTab} tests found.`}
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
