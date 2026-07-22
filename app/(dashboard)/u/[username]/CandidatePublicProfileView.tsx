"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { getSkillIconClass, DEVICON_SUFFIXES } from "@/lib/skill-icon";
import {
  Card, CardContent, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import {
  GraduationCap, Briefcase, FolderGit2, Award, Link2,
  Globe, Linkedin, Github, Mail, AtSign, Tag, Building2,
  CalendarDays, Hash, BarChart3, BookOpen, Flame, Trophy,
  Target, Code2, Brain, Zap, CheckCircle2, Activity, Sparkles,
  ChevronRight, ChevronDown,
} from "lucide-react";
import type {
  CandidateEducation, CandidateExperience, CandidateProject,
  CandidateCertification, Skill,
} from "@/types/profile-extensions";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface LogicLabCalendarCell {
  date: string;
  count: number;
  status: "none" | "attempted" | "solved";
  dayOfWeek: number;
  easySolved?: number;
  mediumSolved?: number;
  hardSolved?: number;
}

export interface LogicLabData {
  streakStats: {
    currentStreak: number;
    maxStreak: number;
    totalActiveDays: number;
  };
  activityCalendar: LogicLabCalendarCell[];
  globalStats: {
    total: number;
    solved: number;
    easy: { total: number; solved: number };
    medium: { total: number; solved: number };
    hard: { total: number; solved: number };
  };
  topics: Array<{ name: string; count: number }>;
  uniqueSolvedCount: number;
}

interface EventCertificate {
  ticketId: string;
  eventId: string;
  eventTitle: string;
  eventDate: string;
}

interface PublicData {
  profile_id: string;
  full_name: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
  username: string | null;
  avatar_path: string | null;
  bio: string | null;
  gender: string | null;
  linkedin_url: string | null;
  github_url: string | null;
  portfolio_links: string[] | null;
  course_name: string | null;
  passout_year: number | null;
  university_prn: string | null;
  institute_name: string | null;
  sgpa_semesters: (string | null)[];
}

interface Props {
  publicData: PublicData;
  educationData: CandidateEducation[];
  experienceData: CandidateExperience[];
  projectsData: CandidateProject[];
  certificationsData: CandidateCertification[];
  eventCertificates: EventCertificate[];
  allSkills: Skill[];
  selectedSkillIds: string[];
  semestersCount: number;
  logicLabData?: LogicLabData | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const EDUCATION_TYPE_LABELS: Record<string, string> = {
  ssc: "Class 10 (SSC)",
  hsc: "Class 12 (HSC)",
  diploma: "Diploma",
  ug: "Undergraduate (UG)",
  pg: "Postgraduate (PG)",
  other: "Other",
};

const GENDER_REVERSE: Record<string, string> = { M: "Male", F: "Female", O: "Other" };

function getInitials(firstName: string | null, lastName: string | null, fullName: string): string {
  if (firstName && lastName) return `${firstName[0]}${lastName[0]}`.toUpperCase();
  if (firstName) return firstName[0].toUpperCase();
  return fullName?.[0]?.toUpperCase() ?? "?";
}

function formatDateRange(start: string | null, end: string | null, isCurrent: boolean): string {
  const fmt = (d: string) =>
    new Date(d).toLocaleDateString("en-IN", { month: "short", year: "numeric" });
  if (!start) return "";
  return `${fmt(start)} – ${isCurrent ? "Present" : end ? fmt(end) : ""}`;
}

function formatIssueDate(date: string | null): string {
  if (!date) return "";
  return new Date(date).toLocaleDateString("en-IN", { month: "short", year: "numeric" });
}

function SkillIcon({ name, className }: { name: string; className?: string }) {
  const iconClass = getSkillIconClass(name);
  const sizeClass = "w-4 h-4 text-base";
  const cleanClassName = className
    ?.replace(/\btext-(?:base|lg|sm|xs|\[11px\]|\[10px\])\b/g, "")
    ?.trim();

  if (iconClass) {
    const suffix = DEVICON_SUFFIXES[iconClass] || "plain";
    return (
      <span className={cn("inline-flex items-center justify-center shrink-0 text-muted-foreground", sizeClass, cleanClassName)}>
        <i className={`devicon-${iconClass}-${suffix}`} style={{ fontSize: "inherit", lineHeight: 1 }} />
      </span>
    );
  }
  return (
    <Tag className={cn("text-muted-foreground shrink-0", sizeClass, cleanClassName)} />
  );
}

function SectionCard({ icon: Icon, title, children, defaultExpanded = true }: {
  icon: React.ElementType;
  title: string;
  children: React.ReactNode;
  defaultExpanded?: boolean;
}) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  return (
    <Card className="transition-all duration-200">
      <CardHeader
        className="pb-3 cursor-pointer select-none hover:bg-muted/30 transition-colors rounded-t-xl"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <CardTitle className="flex items-center justify-between text-base font-semibold">
          <div className="flex items-center gap-2">
            <Icon className="h-4 w-4 text-muted-foreground" />
            {title}
          </div>
          <ChevronDown
            className={cn(
              "h-4 w-4 text-muted-foreground transition-transform duration-300",
              isExpanded && "rotate-180"
            )}
          />
        </CardTitle>
      </CardHeader>
      {isExpanded && <CardContent>{children}</CardContent>}
    </Card>
  );
}

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  if (!value?.trim()) return null;
  return (
    <div className="space-y-0.5">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium">{value}</p>
    </div>
  );
}

// ─── LogicLab Spider Web & Analytics Sub-components ───────────────────────────

function SpiderWebRadarChart({
  topics,
}: {
  topics: Array<{ name: string; count: number }>;
}) {
  const defaultTopics = [
    { name: "Arrays", count: 0 },
    { name: "Strings", count: 0 },
    { name: "DP", count: 0 },
    { name: "Trees", count: 0 },
    { name: "Math", count: 0 },
    { name: "Sorting", count: 0 },
  ];

  let displayTopics = (topics || []).slice(0, 6);
  if (displayTopics.length < 3) {
    const existing = new Set(displayTopics.map((t) => t.name.toLowerCase()));
    for (const d of defaultTopics) {
      if (!existing.has(d.name.toLowerCase()) && displayTopics.length < 6) {
        displayTopics.push(d);
      }
    }
  }

  const numAxes = displayTopics.length;
  const cx = 130;
  const cy = 130;
  const radius = 75;
  const maxCount = Math.max(...displayTopics.map((t) => t.count), 1);

  const levels = [0.25, 0.5, 0.75, 1.0];

  const getCoordinates = (axisIndex: number, scale: number) => {
    const angle = (axisIndex * 2 * Math.PI) / numAxes - Math.PI / 2;
    const r = radius * scale;
    return {
      x: cx + r * Math.cos(angle),
      y: cy + r * Math.sin(angle),
    };
  };

  const dataPoints = displayTopics.map((t, i) => {
    const scale = t.count > 0 ? Math.max(t.count / maxCount, 0.18) : 0.08;
    return getCoordinates(i, scale);
  });
  const dataPolygonString = dataPoints.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");

  return (
    <div className="w-full flex flex-col items-center justify-center p-2 rounded-xl border border-border/40 bg-card/50">
      <div className="flex items-center justify-between w-full mb-1 text-xs">
        <span className="font-semibold uppercase tracking-wider text-muted-foreground text-[11px]">
          Topic Dimension Radar
        </span>
        <Badge variant="secondary" className="text-[10px] h-4 px-1.5 font-normal">
          Spider Web
        </Badge>
      </div>

      <div className="relative w-full max-w-[260px] aspect-square flex items-center justify-center">
        <svg viewBox="0 0 260 260" className="w-full h-full overflow-visible">
          <defs>
            <radialGradient id="spiderWebGradient" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#059669" stopOpacity="0.12" />
            </radialGradient>
          </defs>

          {/* Concentric Web Polygons */}
          {levels.map((level, lIdx) => {
            const levelPoints = Array.from({ length: numAxes }).map((_, i) => getCoordinates(i, level));
            const polyStr = levelPoints.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
            return (
              <polygon
                key={lIdx}
                points={polyStr}
                fill="none"
                stroke="currentColor"
                strokeWidth="1"
                className="text-border/50 dark:text-border/40"
                strokeDasharray={lIdx === levels.length - 1 ? undefined : "2 2"}
              />
            );
          })}

          {/* Radial Axes */}
          {Array.from({ length: numAxes }).map((_, i) => {
            const outer = getCoordinates(i, 1.0);
            return (
              <line
                key={i}
                x1={cx}
                y1={cy}
                x2={outer.x}
                y2={outer.y}
                stroke="currentColor"
                strokeWidth="1"
                className="text-border/60"
              />
            );
          })}

          {/* Data Filled Polygon */}
          <polygon
            points={dataPolygonString}
            fill="url(#spiderWebGradient)"
            stroke="#10b981"
            strokeWidth="2"
            className="transition-all duration-700 ease-out"
          />

          {/* Data Nodes & Topic Labels */}
          {displayTopics.map((t, i) => {
            const dataCoord = dataPoints[i];
            const labelCoord = getCoordinates(i, 1.25);
            const isTop = labelCoord.y < cy - 10;
            const isBottom = labelCoord.y > cy + 10;
            const isLeft = labelCoord.x < cx - 10;
            const isRight = labelCoord.x > cx + 10;

            let textAnchor: "middle" | "start" | "end" = "middle";
            if (isLeft && !isTop && !isBottom) textAnchor = "end";
            else if (isRight && !isTop && !isBottom) textAnchor = "start";

            return (
              <g key={i}>
                <circle
                  cx={dataCoord.x}
                  cy={dataCoord.y}
                  r="3.5"
                  fill="#10b981"
                  stroke="#ffffff"
                  strokeWidth="1.5"
                />
                <text
                  x={labelCoord.x}
                  y={labelCoord.y}
                  textAnchor={textAnchor}
                  dominantBaseline="middle"
                  className="fill-foreground text-[10px] font-semibold tracking-tight"
                >
                  {t.name}
                  <tspan className="fill-emerald-600 dark:text-emerald-400 text-[9px] font-normal" dx="3">
                    ({t.count})
                  </tspan>
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

function ProfileConcentricRing({
  radius,
  value,
  max,
  color,
  trackColor,
}: {
  radius: number;
  value: number;
  max: number;
  color: string;
  trackColor: string;
}) {
  const circumference = 2 * Math.PI * radius;
  const percent = max > 0 ? Math.min(value / max, 1) : 0;
  const strokeDashoffset = circumference - percent * circumference;

  return (
    <g transform="rotate(-90 50 50)">
      <circle
        cx="50"
        cy="50"
        r={radius}
        fill="none"
        stroke={trackColor}
        strokeWidth="7"
      />
      <circle
        cx="50"
        cy="50"
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth="7"
        strokeDasharray={circumference}
        strokeDashoffset={strokeDashoffset}
        strokeLinecap="round"
        className="transition-all duration-1000 ease-out"
      />
    </g>
  );
}

function getProficiencyBadge(count: number) {
  if (count >= 10) return { label: "Expert", bg: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" };
  if (count >= 5) return { label: "Advanced", bg: "bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border-indigo-500/20" };
  if (count >= 3) return { label: "Proficient", bg: "bg-sky-500/15 text-sky-600 dark:text-sky-400 border-sky-500/20" };
  return { label: "Explorer", bg: "bg-muted/50 text-muted-foreground border-border/40" };
}

function getMonthHeadersForWeeks(weeks: LogicLabCalendarCell[][]) {
  const headers: Array<{ label: string; span: number }> = [];
  let currentMonth = "";
  let currentSpan = 0;

  weeks.forEach((week) => {
    if (week.length > 0) {
      const firstDayDate = new Date(week[0].date);
      const monthName = firstDayDate.toLocaleDateString("en-IN", { month: "short" });
      if (monthName !== currentMonth) {
        if (currentMonth !== "") {
          headers.push({ label: currentMonth, span: currentSpan });
        }
        currentMonth = monthName;
        currentSpan = 1;
      } else {
        currentSpan++;
      }
    }
  });
  if (currentMonth !== "") {
    headers.push({ label: currentMonth, span: currentSpan });
  }

  return headers;
}

function LogicLabAnalyticsSection({ data }: { data: LogicLabData }) {
  const [hoveredCell, setHoveredCell] = useState<LogicLabCalendarCell | null>(null);
  const [isSectionExpanded, setIsSectionExpanded] = useState(true);

  const { streakStats, activityCalendar, globalStats, topics } = data;
  const totalSolved = globalStats.solved || 0;
  const totalProblems = globalStats.total || 1;
  const easySolved = globalStats.easy.solved || 0;
  const mediumSolved = globalStats.medium.solved || 0;
  const hardSolved = globalStats.hard.solved || 0;

  const easyTotal = globalStats.easy.total || 1;
  const mediumTotal = globalStats.medium.total || 1;
  const hardTotal = globalStats.hard.total || 1;

  // Group activity into weeks (7 days per column, 20 columns)
  const weeks: LogicLabCalendarCell[][] = [];
  let currentWeek: LogicLabCalendarCell[] = [];

  (activityCalendar || []).forEach((cell, index) => {
    currentWeek.push(cell);
    if (currentWeek.length === 7 || index === activityCalendar.length - 1) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
  });

  const monthHeaders = getMonthHeadersForWeeks(weeks);
  const topTopics = (topics || []).slice(0, 8);
  const maxTopicCount = Math.max(...topTopics.map((t) => t.count), 1);

  return (
    <Card className="border-border/60 shadow-sm overflow-hidden transition-all duration-200">
      <CardHeader
        className="pb-3 border-b border-border/30 bg-muted/20 cursor-pointer select-none hover:bg-muted/30 transition-colors"
        onClick={() => setIsSectionExpanded(!isSectionExpanded)}
      >
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <Brain className="h-4 w-4 text-emerald-500" />
            LogicLab & Problem Solving Performance
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="gap-1 text-xs font-normal border-emerald-500/30 text-emerald-600 dark:text-emerald-400">
              <Sparkles className="h-3 w-3" />
              Verified
            </Badge>
            <ChevronDown
              className={cn(
                "h-4 w-4 text-muted-foreground transition-transform duration-300",
                isSectionExpanded && "rotate-180"
              )}
            />
          </div>
        </div>
      </CardHeader>

      {isSectionExpanded && (
        <CardContent className="p-4 sm:p-6 space-y-6">
          {/* ── Key Stat Pills Row (Mobile Grid 2-col, Desktop 4-col) ── */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3.5 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 shrink-0">
                <Flame className="h-4 sm:h-5 w-4 sm:w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xl sm:text-2xl font-bold tabular-nums text-foreground leading-tight truncate">
                  {streakStats.currentStreak} <span className="text-xs font-normal text-muted-foreground">days</span>
                </p>
                <p className="text-[11px] text-muted-foreground truncate">Streak (Max {streakStats.maxStreak})</p>
              </div>
            </div>

            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3.5 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0">
                <Trophy className="h-4 sm:h-5 w-4 sm:w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xl sm:text-2xl font-bold tabular-nums text-foreground leading-tight truncate">
                  {totalSolved} <span className="text-xs font-normal text-muted-foreground">/ {totalProblems}</span>
                </p>
                <p className="text-[11px] text-muted-foreground truncate">Problems Solved</p>
              </div>
            </div>

            <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-3.5 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 shrink-0">
                <Activity className="h-4 sm:h-5 w-4 sm:w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xl sm:text-2xl font-bold tabular-nums text-foreground leading-tight truncate">
                  {streakStats.totalActiveDays}
                </p>
                <p className="text-[11px] text-muted-foreground truncate">Active Days</p>
              </div>
            </div>

            <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/5 p-3.5 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 shrink-0">
                <Target className="h-4 sm:h-5 w-4 sm:w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xl sm:text-2xl font-bold tabular-nums text-foreground leading-tight truncate">
                  {topTopics.length}
                </p>
                <p className="text-[11px] text-muted-foreground truncate">Topics Practiced</p>
              </div>
            </div>
          </div>

          {/* ── Topic Abilities Section: Dual Column (Spider Web Radar + Skill Bars) ── */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
            {/* Left: SVG Spider Web Radar Chart (5 columns) */}
            <div className="md:col-span-5 flex items-center justify-center">
              <SpiderWebRadarChart topics={topics} />
            </div>

            {/* Right: Topic Proficiency Skill Bars (7 columns) */}
            <div className="md:col-span-7 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Topic Proficiency & Ability Breakdown
                </p>
                <span className="text-xs text-muted-foreground">{topics.length} total topics</span>
              </div>

              {topTopics.length === 0 ? (
                <div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
                  No topic data available yet.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {topTopics.map((t) => {
                    const badge = getProficiencyBadge(t.count);
                    const percent = Math.round((t.count / maxTopicCount) * 100);
                    return (
                      <div key={t.name} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-foreground">{t.name}</span>
                            <Badge variant="outline" className={cn("text-[10px] h-4 px-1.5 font-normal", badge.bg)}>
                              {badge.label}
                            </Badge>
                          </div>
                          <span className="tabular-nums text-muted-foreground font-medium">
                            {t.count} solved
                          </span>
                        </div>
                        <div className="h-2 w-full rounded-full bg-muted/60 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                            style={{ width: `${Math.max(percent, 8)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* ── Difficulty Concentric Rings & Activity Heatmap ── */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start pt-2 border-t border-border/30">
            {/* Difficulty Ring (4 columns) */}
            <div className="md:col-span-4 rounded-xl border border-border/40 p-4 bg-card flex flex-col items-center justify-center min-h-[200px]">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                Difficulty Tier Breakdown
              </p>
              <div className="relative w-36 h-36 flex items-center justify-center">
                <svg viewBox="0 0 100 100" className="w-full h-full">
                  <ProfileConcentricRing
                    radius={40}
                    value={hardSolved}
                    max={hardTotal}
                    color="#f43f5e"
                    trackColor="rgba(244, 63, 94, 0.15)"
                  />
                  <ProfileConcentricRing
                    radius={30}
                    value={mediumSolved}
                    max={mediumTotal}
                    color="#f59e0b"
                    trackColor="rgba(245, 158, 11, 0.15)"
                  />
                  <ProfileConcentricRing
                    radius={20}
                    value={easySolved}
                    max={easyTotal}
                    color="#10b981"
                    trackColor="rgba(16, 185, 129, 0.15)"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span className="text-2xl font-extrabold tabular-nums tracking-tight">{totalSolved}</span>
                  <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Solved</span>
                </div>
              </div>

              <div className="flex items-center justify-center gap-3 mt-2 text-xs">
                <div className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <span className="font-medium text-emerald-700 dark:text-emerald-400">Easy ({easySolved})</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                  <span className="font-medium text-amber-700 dark:text-amber-400">Med ({mediumSolved})</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                  <span className="font-medium text-rose-700 dark:text-rose-400">Hard ({hardSolved})</span>
                </div>
              </div>
            </div>

            {/* Redesigned 20-Week Heatmap with Month Headers & Auto-Stretch Spacing (8 columns) */}
            <div className="md:col-span-8 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <CalendarDays className="h-4 w-4 text-muted-foreground" />
                  <span className="font-semibold text-foreground">20-Week Submission Activity</span>
                </div>
                <span className="text-muted-foreground text-[11px]">Last 140 Days</span>
              </div>

              {/* Shortened Compact Heatmap Card with Month Headers */}
              <div className="rounded-xl border border-border/40 bg-card p-3 sm:p-4 overflow-x-auto max-w-lg">
                <div className="min-w-[440px] w-full">
                  {/* Month Headers Row */}
                  <div className="flex text-[10px] text-muted-foreground font-medium mb-1.5 px-0.5">
                    {monthHeaders.map((m, idx) => (
                      <div key={idx} style={{ flexGrow: m.span, flexBasis: 0 }} className="text-left">
                        {m.label}
                      </div>
                    ))}
                  </div>

                  {/* Auto-stretching Week Columns */}
                  <div className="grid grid-flow-col auto-cols-fr gap-1 w-full">
                    {weeks.map((week, wIdx) => (
                      <div key={wIdx} className="flex flex-col gap-1">
                        {week.map((cell) => {
                          let colorClass = "bg-muted/40 hover:border-muted-foreground/40";
                          if (cell.status === "solved") {
                            if (cell.count >= 5) colorClass = "bg-emerald-600 dark:bg-emerald-400 hover:ring-2 hover:ring-emerald-400";
                            else if (cell.count >= 3) colorClass = "bg-emerald-500 dark:bg-emerald-500 hover:ring-2 hover:ring-emerald-400";
                            else colorClass = "bg-emerald-300 dark:bg-emerald-600/70 hover:ring-2 hover:ring-emerald-400";
                          } else if (cell.status === "attempted") {
                            colorClass = "bg-amber-400/60 dark:bg-amber-500/50 hover:ring-2 hover:ring-amber-400";
                          }

                          return (
                            <div
                              key={cell.date}
                              onMouseEnter={() => setHoveredCell(cell)}
                              onMouseLeave={() => setHoveredCell(null)}
                              className={cn(
                                "w-full aspect-square rounded-2xs transition-all cursor-pointer border border-transparent",
                                colorClass
                              )}
                            />
                          );
                        })}
                      </div>
                    ))}
                  </div>

                  {/* Tooltip & Legend Bar */}
                  <div className="flex items-center justify-between mt-3 text-xs text-muted-foreground pt-2 border-t border-border/20 flex-wrap gap-2">
                    <div className="h-4 flex items-center">
                      {hoveredCell ? (
                        <span className="font-medium text-foreground">
                          {new Date(hoveredCell.date).toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" })}
                          : <span className="text-emerald-600 dark:text-emerald-400 font-semibold">{hoveredCell.count} submissions</span>
                          {hoveredCell.status === "solved" ? " (Solved)" : hoveredCell.status === "attempted" ? " (Attempted)" : ""}
                        </span>
                      ) : (
                        <span>Hover over any day square for details</span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 text-[11px]">
                      <span>Less</span>
                      <span className="w-3 h-3 rounded-sm bg-muted/40 border border-border/40" />
                      <span className="w-3 h-3 rounded-sm bg-amber-400/60 dark:bg-amber-500/50" />
                      <span className="w-3 h-3 rounded-sm bg-emerald-300 dark:bg-emerald-600/70" />
                      <span className="w-3 h-3 rounded-sm bg-emerald-500" />
                      <span className="w-3 h-3 rounded-sm bg-emerald-600 dark:bg-emerald-400" />
                      <span>More</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function CandidatePublicProfileView({
  publicData,
  educationData,
  experienceData,
  projectsData,
  certificationsData,
  eventCertificates,
  allSkills,
  selectedSkillIds,
  semestersCount,
  logicLabData,
}: Props) {
  const supabase = createClient();

  // Resolve avatar URL
  const avatarUrl = publicData.avatar_path
    ? supabase.storage.from("avatars").getPublicUrl(publicData.avatar_path).data.publicUrl
    : null;

  // Group skills by category
  const selectedSet = new Set(selectedSkillIds);
  const groupedSkills: Record<string, Skill[]> = {};
  allSkills.forEach((skill) => {
    if (!selectedSet.has(skill.id)) return;
    if (!groupedSkills[skill.category]) groupedSkills[skill.category] = [];
    groupedSkills[skill.category].push(skill);
  });

  // SGPA grid values
  const validSgpas = publicData.sgpa_semesters.filter((v): v is string => v !== null && v !== "");
  const cgpa =
    validSgpas.length > 0
      ? (validSgpas.reduce((sum, v) => sum + parseFloat(v), 0) / validSgpas.length).toFixed(2)
      : null;

  // Education records
  const sscRecord = educationData.find((e) => e.type === "ssc");
  const hscRecord = educationData.find((e) => e.type === "hsc");
  const diplomaRecord = educationData.find((e) => e.type === "diploma");

  const hasLinks =
    publicData.linkedin_url ||
    publicData.github_url ||
    (publicData.portfolio_links ?? []).filter(Boolean).length > 0;

  const hasSkills = selectedSkillIds.length > 0;
  const hasExperiences = experienceData.length > 0;
  const hasProjects = projectsData.length > 0;
  const hasCertifications = certificationsData.length > 0;
  const hasEventCerts = eventCertificates.length > 0;
  const hasSgpa = validSgpas.length > 0;
  const hasEducationHistory = sscRecord || hscRecord || diplomaRecord;

  return (
    <div className="flex flex-col gap-6 px-4 py-8 md:px-8">
      {/* Page Header */}
      <div className="flex flex-col gap-1.5">
        <h1 className="text-3xl font-bold font-cirka tracking-tight text-foreground">
          Candidate Profile
        </h1>
        <p className="text-sm text-muted-foreground">
          Viewing public profile of{" "}
          <span className="font-medium text-foreground">
            {publicData.full_name || publicData.username || "this candidate"}
          </span>
        </p>
      </div>

      <div className="space-y-6">

        {/* ── Hero Card ─────────────────────────────────────────────────────── */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
              {/* Avatar */}
              <Avatar className="h-24 w-24 shrink-0 border-2 border-muted">
                <AvatarImage src={avatarUrl ?? undefined} alt={publicData.full_name} className="object-cover" />
                <AvatarFallback className="text-2xl font-semibold">
                  {getInitials(publicData.first_name, publicData.last_name, publicData.full_name)}
                </AvatarFallback>
              </Avatar>

              {/* Name / Username / Bio */}
              <div className="flex-1 min-w-0 text-center sm:text-left space-y-2">
                <div>
                  <h2 className="text-2xl font-bold tracking-tight text-foreground">
                    {publicData.full_name || "—"}
                  </h2>
                  {publicData.username && (
                    <div className="flex items-center justify-center sm:justify-start gap-1 mt-0.5 text-muted-foreground">
                      <AtSign className="h-3.5 w-3.5" />
                      <span className="text-sm">{publicData.username}</span>
                    </div>
                  )}
                </div>

                {/* Quick meta badges */}
                <div className="flex flex-wrap gap-2 justify-center sm:justify-start items-center">
                  {publicData.course_name && (
                    <Badge variant="secondary" className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-full max-w-full">
                      <GraduationCap className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">{publicData.course_name}{publicData.passout_year ? ` · ${publicData.passout_year}` : ""}</span>
                    </Badge>
                  )}
                  {publicData.institute_name && (
                    <Badge variant="outline" className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-normal rounded-full border border-border bg-muted/30 max-w-full">
                      <Building2 className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      <span className="truncate max-w-[280px] sm:max-w-md">{publicData.institute_name}</span>
                    </Badge>
                  )}
                  {cgpa && (
                    <Badge variant="outline" className="inline-flex items-center gap-1.5 px-3 py-1 text-xs text-primary border-primary/30 bg-primary/5 rounded-full">
                      <BarChart3 className="h-3.5 w-3.5 shrink-0" />
                      CGPA {cgpa}
                    </Badge>
                  )}
                  {publicData.gender && (
                    <Badge variant="outline" className="inline-flex items-center gap-1.5 px-3 py-1 text-xs rounded-full">
                      {GENDER_REVERSE[publicData.gender] ?? publicData.gender}
                    </Badge>
                  )}
                </div>

                {/* Bio */}
                {publicData.bio && (
                  <p className="text-sm text-muted-foreground leading-relaxed max-w-2xl">
                    {publicData.bio}
                  </p>
                )}

                {/* Email */}
                <div className="flex items-center justify-center sm:justify-start gap-1.5 text-sm text-muted-foreground">
                  <Mail className="h-3.5 w-3.5" />
                  <a
                    href={`mailto:${publicData.email}`}
                    className="hover:text-foreground transition-colors"
                  >
                    {publicData.email}
                  </a>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ── Professional Links ─────────────────────────────────────────────── */}
        {hasLinks && (
          <SectionCard icon={Link2} title="Links & Profiles">
            <div className="flex flex-wrap gap-3">
              {publicData.linkedin_url && (
                <a
                  href={publicData.linkedin_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium border border-border hover:bg-accent transition-colors"
                >
                  <Linkedin className="h-4 w-4 text-[#0077B5]" />
                  LinkedIn
                </a>
              )}
              {publicData.github_url && (
                <a
                  href={publicData.github_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium border border-border hover:bg-accent transition-colors"
                >
                  <Github className="h-4 w-4" />
                  GitHub
                </a>
              )}
              {(publicData.portfolio_links ?? []).filter(Boolean).map((link, i) => (
                <a
                  key={i}
                  href={link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium border border-border hover:bg-accent transition-colors max-w-[200px] truncate"
                >
                  <Globe className="h-4 w-4 shrink-0" />
                  <span className="truncate">{link.replace(/^https?:\/\/(www\.)?/, "")}</span>
                </a>
              ))}
            </div>
          </SectionCard>
        )}

        {/* ── Education ─────────────────────────────────────────────────────── */}
        <SectionCard icon={GraduationCap} title="Education">
          <div className="space-y-5">
            {/* Current Course */}
            {(publicData.course_name || publicData.passout_year) && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <InfoRow label="Course / Branch" value={publicData.course_name} />
                <InfoRow label="Institute" value={publicData.institute_name} />
                <InfoRow label="Expected Graduation" value={publicData.passout_year ? String(publicData.passout_year) : null} />
              </div>
            )}

            {/* SGPA Grid */}
            {hasSgpa && (
              <>
                <Separator />
                <div>
                  <p className="text-xs text-muted-foreground font-medium mb-3 flex items-center gap-1.5">
                    <BarChart3 className="h-3.5 w-3.5" />
                    Semester-wise SGPA
                    {cgpa && (
                      <Badge variant="secondary" className="ml-1 text-xs h-5">
                        CGPA {cgpa}
                      </Badge>
                    )}
                  </p>
                  <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                    {publicData.sgpa_semesters.map((sgpa, i) => (
                      <div
                        key={i}
                        className={cn(
                          "rounded-md border text-center py-2 px-1",
                          sgpa
                            ? "bg-primary/5 border-primary/20"
                            : "border-dashed border-muted-foreground/20 bg-muted/30"
                        )}
                      >
                        <p className="text-[9px] text-muted-foreground mb-0.5">Sem {i + 1}</p>
                        <p className={cn("text-sm font-semibold", sgpa ? "text-foreground" : "text-muted-foreground/40")}>
                          {sgpa || "—"}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Education History (SSC/HSC/Diploma) */}
            {hasEducationHistory && (
              <>
                <Separator />
                <div>
                  <p className="text-xs text-muted-foreground font-medium mb-3 flex items-center gap-1.5">
                    <BookOpen className="h-3.5 w-3.5" />
                    Education History
                  </p>
                  <div className="space-y-3">
                    {[sscRecord, hscRecord, diplomaRecord]
                      .filter(Boolean)
                      .map((rec) => (
                        <div
                          key={rec!.id}
                          className="flex items-start justify-between gap-4 p-3 rounded-lg border border-border bg-muted/30"
                        >
                          <div className="space-y-0.5">
                            <p className="text-sm font-medium">
                              {EDUCATION_TYPE_LABELS[rec!.type] ?? rec!.type}
                            </p>
                            <p className="text-xs text-muted-foreground">{rec!.institution_name}</p>
                          </div>
                          <div className="text-right shrink-0 space-y-0.5">
                            <p className="text-sm font-semibold">{Number(rec!.grade_or_percentage).toFixed(2)}%</p>
                            <p className="text-xs text-muted-foreground">{rec!.passout_year}</p>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              </>
            )}

            {/* Nothing at all */}
            {!publicData.course_name && !hasSgpa && !hasEducationHistory && (
              <p className="text-sm text-muted-foreground italic">No education details added yet.</p>
            )}
          </div>
        </SectionCard>

        {/* ── Skills ────────────────────────────────────────────────────────── */}
        {hasSkills && (
          <SectionCard icon={Tag} title="Skills">
            <div className="space-y-4">
              {Object.entries(groupedSkills).map(([category, skills]) => (
                <div key={category}>
                  <p className="text-xs text-muted-foreground font-medium mb-2">{category}</p>
                  <div className="flex flex-wrap gap-2">
                    {skills.map((skill) => (
                      <Badge
                        key={skill.id}
                        variant="secondary"
                        className="gap-1.5 py-1 px-2.5 text-xs font-medium"
                      >
                        <SkillIcon name={skill.name} />
                        {skill.name}
                      </Badge>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>
        )}

        {/* ── LogicLab Performance Summary ────────────────────────────── */}
        {logicLabData && <LogicLabAnalyticsSection data={logicLabData} />}

        {/* ── Experience ────────────────────────────────────────────────────── */}
        {hasExperiences && (
          <SectionCard icon={Briefcase} title="Experience">
            <div className="space-y-4">
              {experienceData.map((exp, idx) => (
                <div key={exp.id} className="space-y-2">
                  {idx > 0 && <Separator className="mb-4" />}
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-1 sm:gap-4">
                    <div className="space-y-0.5 min-w-0">
                      <p className="text-sm font-semibold text-foreground">{exp.title}</p>
                      <p className="text-sm text-muted-foreground font-medium">{exp.company_name}</p>
                      {exp.location && (
                        <p className="text-xs text-muted-foreground">{exp.location}</p>
                      )}
                    </div>
                    <div className="shrink-0 sm:text-right flex sm:flex-col items-center sm:items-end gap-2 sm:gap-1 mt-0.5 sm:mt-0">
                      {(exp.start_date || exp.end_date) && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <CalendarDays className="h-3.5 w-3.5" />
                          <span>
                            {formatDateRange(exp.start_date, exp.end_date, exp.is_current)}
                          </span>
                        </div>
                      )}
                      {exp.is_current && (
                        <Badge variant="secondary" className="text-[10px] h-4 px-1.5 font-normal">
                          Current
                        </Badge>
                      )}
                    </div>
                  </div>
                  {exp.description && (
                    <p className="text-sm text-muted-foreground leading-relaxed pt-1">
                      {exp.description}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </SectionCard>
        )}

        {/* ── Projects ──────────────────────────────────────────────────────── */}
        {hasProjects && (
          <SectionCard icon={FolderGit2} title="Projects">
            <div className="space-y-4">
              {projectsData.map((proj, idx) => (
                <div key={proj.id}>
                  {idx > 0 && <Separator className="mb-4" />}
                  <div className="space-y-1.5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-semibold">{proj.title}</p>
                          {proj.is_ongoing && (
                            <Badge variant="secondary" className="text-[10px] h-4 px-1.5">Ongoing</Badge>
                          )}
                          {proj.project_url && (
                            <a
                              href={proj.project_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline"
                            >
                              <Globe className="h-3 w-3" />
                              View
                            </a>
                          )}
                        </div>
                        {proj.associated_with && (
                          <p className="text-xs text-muted-foreground">{proj.associated_with}</p>
                        )}
                      </div>
                      {(proj.start_date || proj.end_date) && (
                        <div className="shrink-0 flex items-center gap-1 text-xs text-muted-foreground">
                          <CalendarDays className="h-3 w-3" />
                          <span>
                            {formatDateRange(proj.start_date, proj.end_date, proj.is_ongoing)}
                          </span>
                        </div>
                      )}
                    </div>
                    {proj.description && (
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {proj.description}
                      </p>
                    )}
                    {proj.skills && proj.skills.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        {proj.skills.map((s, i) => (
                          <Badge key={i} variant="outline" className="gap-1 text-[11px] h-5 px-1.5">
                            <SkillIcon name={s} className="w-3 h-3" />
                            {s}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>
        )}

        {/* ── Certifications ────────────────────────────────────────────────── */}
        {hasCertifications && (
          <SectionCard icon={Award} title="Certifications">
            <div className="space-y-4">
              {certificationsData.map((cert, idx) => (
                <div key={cert.id}>
                  {idx > 0 && <Separator className="mb-4" />}
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0 space-y-0.5">
                      <p className="text-sm font-semibold">{cert.name}</p>
                      <p className="text-sm text-muted-foreground">{cert.issuing_org}</p>
                      {cert.credential_id && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Hash className="h-3 w-3" />
                          {cert.credential_id}
                        </div>
                      )}
                      {cert.credential_url && (
                        <a
                          href={cert.credential_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                        >
                          <Globe className="h-3 w-3" />
                          View credential
                        </a>
                      )}
                    </div>
                    <div className="shrink-0 text-right space-y-0.5">
                      {cert.issue_date && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground justify-end">
                          <CalendarDays className="h-3 w-3" />
                          {formatIssueDate(cert.issue_date)}
                        </div>
                      )}
                      {cert.does_not_expire ? (
                        <Badge variant="secondary" className="text-[10px] h-4 px-1.5">No Expiry</Badge>
                      ) : cert.expiration_date ? (
                        <p className="text-xs text-muted-foreground">
                          Expires {formatIssueDate(cert.expiration_date)}
                        </p>
                      ) : null}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>
        )}

        {/* ── Event Certificates ────────────────────────────────────────────── */}
        {hasEventCerts && (
          <SectionCard icon={Award} title="Event Participation">
            <div className="space-y-3">
              {eventCertificates.map((cert, idx) => (
                <div key={cert.ticketId}>
                  {idx > 0 && <Separator className="mb-3" />}
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{cert.eventTitle}</p>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                        <CalendarDays className="h-3 w-3" />
                        {new Date(cert.eventDate).toLocaleDateString("en-IN", {
                          dateStyle: "medium",
                        })}
                      </div>
                    </div>
                    <Badge variant="secondary" className="shrink-0 gap-1 text-xs">
                      <Award className="h-3 w-3" />
                      Attended
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>
        )}

      </div>
    </div>
  );
}
