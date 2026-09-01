"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { getSkillIconClass, DEVICON_SUFFIXES } from "@/lib/skill-icon";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  Award, Globe, Linkedin, Github, Tag,
  CheckCircle2, Flame, Target, Zap, Trophy, Brain,
  Youtube, Instagram, Figma, Codepen, Code2,
  ArrowLeft, Building2, Calendar, FileText, Share2
} from "lucide-react";
import type {
  CandidateEducation, CandidateExperience, CandidateProject,
  CandidateCertification, Skill,
} from "@/types/profile-extensions";
import { LogicLabStatsCards } from "@/app/(dashboard)/(licensed)/logiclab/_components/LogicLabStatsCards";
import {
  AssignedTestsAnalyticsSection,
  type CandidateTestsPerformanceData,
} from "./AssignedTestsAnalyticsSection";
import { generateCandidatePdfReport } from "./generateCandidatePdf";

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
  topics: Array<{ name: string; solvedCount: number; totalCount: number; category: string }>;
  uniqueSolvedCount: number;
  points: number;
  rank?: number | null;
  badges: any[];
  allBadges: any[];
  recentSolved?: {
    id: number;
    title: string;
    difficulty: string;
    created_at: string;
  }[];
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
  assignedTestsData?: CandidateTestsPerformanceData | null;
  viewerRole?: "admin" | "staff" | "owner" | "student";
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
    new Intl.DateTimeFormat(undefined, { month: "short", year: "numeric" }).format(new Date(d));
  if (!start) return "";
  return `${fmt(start)} – ${isCurrent ? "Present" : end ? fmt(end) : ""}`;
}

function formatIssueDate(date: string | null): string {
  if (!date) return "";
  return new Intl.DateTimeFormat(undefined, { month: "short", year: "numeric" }).format(new Date(date));
}

function SectionCard({ title, children }: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="gap-2 py-5 print:border-none print:shadow-none print:break-inside-avoid">
      <CardHeader className="pb-0">
        <CardTitle className="text-base font-semibold">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function SkillIcon({ name, className }: { name: string; className?: string }) {
  const iconClass = getSkillIconClass(name);
  if (iconClass) {
    const suffix = DEVICON_SUFFIXES[iconClass] || "plain";
    return (
      <span className={cn("inline-flex items-center justify-center shrink-0 text-muted-foreground size-4 text-base print:hidden", className)}>
        <i className={`devicon-${iconClass}-${suffix}`} style={{ fontSize: "inherit", lineHeight: 1 }} />
      </span>
    );
  }
  return <Tag className={cn("text-muted-foreground shrink-0 size-4 print:hidden", className)} />;
}

// ─── LogicLab Analytics Component ─────────────────────────────────────────────

function LogicLabAnalyticsSection({ data }: { data: LogicLabData }) {
  const { streakStats, activityCalendar, globalStats } = data;

  return (
    <Card className="gap-3 py-5 print:border-none print:shadow-none print:break-inside-avoid">
      <CardHeader className="pb-0">
        <CardTitle className="text-base font-semibold">
          LogicLab Performance
        </CardTitle>
      </CardHeader>

      <CardContent className="flex flex-col gap-6">
        {/* ── Key Stats Grid ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 print:grid-cols-4">
          <div className="rounded-lg border p-3">
            <p className="text-xl font-bold tabular-nums leading-tight">
              {streakStats.currentStreak}
              <span className="text-xs font-normal text-muted-foreground ml-1">days</span>
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">Streak (Max {streakStats.maxStreak})</p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-xl font-bold tabular-nums leading-tight">
              {globalStats.solved}
              <span className="text-xs font-normal text-muted-foreground ml-1">/ {globalStats.total}</span>
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">Problems Solved</p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-xl font-bold tabular-nums leading-tight">{streakStats.totalActiveDays}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Active Days</p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-xl font-bold tabular-nums leading-tight">{data.topics.length}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Topics Practiced</p>
          </div>
        </div>

        {/* ── LogicLab Stats Cards (Rings & Heatmap) & Recent Solved ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 print:grid-cols-1">
          <LogicLabStatsCards globalStats={globalStats} activityCalendar={activityCalendar} streakStats={streakStats} />

          {/* ── Recent Solved Problems ── */}
          {data.recentSolved && data.recentSolved.length > 0 && (
            <Card className={cn('min-w-0', 'flex', 'flex-col', 'relative', 'transition-all', 'hover:border-border/80', 'py-0')}>
              <CardHeader className={cn('flex', 'flex-row', 'items-center', 'justify-between', 'pt-4', 'pb-1')}>
                <CardTitle className={cn('text-xs', 'font-semibold', 'text-muted-foreground', 'uppercase', 'tracking-wider')}>
                  Recently Solved
                </CardTitle>
              </CardHeader>

              <CardContent className={cn('flex', 'flex-col', 'flex-1', 'gap-2', 'pb-4')}>
                {data.recentSolved.slice(0, 5).map((problem, i) => (
                  <div key={`${problem.id}-${i}`} className="flex items-center justify-between py-1.5 border-b border-border/40 last:border-0 last:pb-0">
                    <div className="flex items-center gap-3">
                      <span className={cn(
                        "text-[10px] px-2 py-0.5 rounded font-medium",
                        problem.difficulty === "Easy" ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" :
                        problem.difficulty === "Medium" ? "bg-amber-500/10 text-amber-600 dark:text-amber-400" :
                        "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                      )}>
                        {problem.difficulty}
                      </span>
                      <span className="text-sm font-medium line-clamp-1">{problem.title}</span>
                    </div>
                    <span className="text-xs text-muted-foreground whitespace-nowrap ml-4">
                      {new Date(problem.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Main Report Component ───────────────────────────────────────────────────

export function CandidateProfileReportView({
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
  assignedTestsData,
  viewerRole,
}: Props) {
  const supabase = createClient();

  const avatarUrl = publicData.avatar_path
    ? supabase.storage.from("avatars").getPublicUrl(publicData.avatar_path).data.publicUrl
    : null;

  const selectedSet = new Set(selectedSkillIds);
  const groupedSkills: Record<string, Skill[]> = {};
  allSkills.forEach((skill) => {
    if (!selectedSet.has(skill.id)) return;
    if (!groupedSkills[skill.category]) groupedSkills[skill.category] = [];
    groupedSkills[skill.category].push(skill);
  });

  const validSgpas = publicData.sgpa_semesters.filter((v): v is string => v !== null && v !== "");
  const cgpa =
    validSgpas.length > 0
      ? (validSgpas.reduce((sum, v) => sum + parseFloat(v), 0) / validSgpas.length).toFixed(2)
      : null;

  const sscRecord = educationData.find((e) => e.type === "ssc");
  const hscRecord = educationData.find((e) => e.type === "hsc");
  const diplomaRecord = educationData.find((e) => e.type === "diploma");

  const hasSkills = selectedSkillIds.length > 0;
  const hasExperiences = experienceData.length > 0;
  const hasProjects = projectsData.length > 0;
  const hasCertifications = certificationsData.length > 0;
  const hasEventCerts = eventCertificates.length > 0;
  const hasSgpa = validSgpas.length > 0;
  const hasEducationHistory = sscRecord || hscRecord || diplomaRecord;

  const todayDateStr = new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date());

  const [isExporting, setIsExporting] = useState(false);

  const handleExportPdf = () => {
    try {
      setIsExporting(true);
      generateCandidatePdfReport({
        publicData,
        educationData,
        experienceData,
        projectsData,
        certificationsData,
        allSkills,
        selectedSkillIds,
        logicLabData,
        assignedTestsData,
      });
    } catch (err) {
      console.error("Failed to generate PDF:", err);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <TooltipProvider>
      <div className="flex flex-col gap-6 px-4 py-8 md:px-8 w-full print:p-0 print:m-0 print:max-w-none">

        {/* Action Header bar - Hidden on Print */}
        <div className="flex flex-col gap-4 print:hidden">
          <div>
            <Link href="/users">
              <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                <ArrowLeft className="size-3.5" />
                Back to Users
              </Button>
            </Link>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-xl font-bold tracking-tight">
                {viewerRole === "student" ? "Candidate Profile and Progress" : "Candidate Comprehensive Report"}
              </h1>
              <p className="text-xs text-muted-foreground">
                Confidential Student Academic & Performance Progress Report
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Button
                variant="outline"
                className="gap-2"
                onClick={() => {
                  const shareUrl = `${window.location.origin}/users/${publicData.username}`;
                  navigator.clipboard.writeText(shareUrl);
                  toast.success("Profile link copied to clipboard!", {
                    description: shareUrl,
                  });
                }}
              >
                <Share2 className="size-4" />
                Share Profile
              </Button>
              {viewerRole !== "student" && (
                <Button onClick={handleExportPdf} disabled={isExporting} className="gap-2 bg-primary text-primary-foreground">
                  <FileText className="size-4" />
                  {isExporting ? "Generating PDF..." : "Export PDF Report"}
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* ── Official Print Header (Visible on Print) ────────────────────────── */}
        <div className="hidden print:flex flex-col gap-2 pb-4 mb-4 border-b-2 border-black">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-black uppercase tracking-tight break-words max-w-xl leading-snug">
                {publicData.institute_name || "Educational Institution"}
              </h1>
              <p className="text-sm font-semibold text-gray-800">
                OFFICIAL STUDENT ACADEMIC & PERFORMANCE PROGRESS REPORT
              </p>
            </div>
            <div className="text-right text-xs text-gray-600">
              <p>Report Date: {todayDateStr}</p>
              <p>Generated by Staff/Placement Office</p>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-6">

          {/* ── Hero Profile Overview Card ─────────────────────────────────── */}
          <Card className="py-5 print:border-none print:shadow-none">
            <CardContent>
              <div className="flex flex-col sm:flex-row items-center gap-6">
                <Avatar className="size-20 sm:size-24 shrink-0 border-2 border-muted print:size-16">
                  <AvatarImage src={avatarUrl ?? undefined} alt={publicData.full_name} className="object-cover" />
                  <AvatarFallback className="text-2xl font-semibold">
                    {getInitials(publicData.first_name, publicData.last_name, publicData.full_name)}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1 min-w-0 text-center sm:text-left space-y-1.5">
                  <h2 className="text-2xl font-bold tracking-tight">{publicData.full_name || "—"}</h2>
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-0.5">
                    {publicData.username && (
                      <span className="text-sm text-muted-foreground">@{publicData.username}</span>
                    )}
                    {publicData.gender && (
                      <Badge variant="outline" className="text-xs font-normal">
                        {GENDER_REVERSE[publicData.gender] ?? publicData.gender}
                      </Badge>
                    )}
                    {publicData.course_name && (
                      <Badge variant="secondary" className="text-xs font-medium">
                        {publicData.course_name}
                      </Badge>
                    )}
                    {cgpa && (
                      <Badge variant="default" className="text-xs font-bold bg-primary text-primary-foreground">
                        CGPA {cgpa}
                      </Badge>
                    )}
                    {logicLabData?.badges && logicLabData.badges.length > 0 && (
                      <div className="flex items-center gap-1.5 ml-1 pl-3 border-l border-border/60">
                        {logicLabData!.badges.slice(0, 3).map((badge: any, idx: number) => {
                          const isUrl = badge.icon_name && (badge.icon_name.startsWith('http') || badge.icon_name.startsWith('/'));
                          return (
                            <TooltipProvider key={idx}>
                              <Tooltip delayDuration={200}>
                                <TooltipTrigger asChild>
                                  <div className="flex items-center justify-center size-[30px] rounded-full bg-muted border border-border/50 hover:bg-muted-foreground/10 transition-colors cursor-pointer group shadow-sm overflow-hidden">
                                    {isUrl ? (
                                      <img src={badge.icon_name} alt={badge.name} className="size-[22px] object-contain drop-shadow-sm group-hover:scale-110 transition-transform" />
                                    ) : (
                                      <Award className="size-4 text-primary drop-shadow-sm group-hover:scale-110 transition-transform" />
                                    )}
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent className="flex flex-col gap-0.5 max-w-[200px] text-center p-2">
                                  <p className="font-semibold text-xs">{badge.name}</p>
                                  <p className="text-[10px] text-muted-foreground">{badge.description}</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          );
                        })}
                        <Dialog>
                          <DialogTrigger asChild>
                            <button className="flex items-center justify-center size-[30px] rounded-full bg-muted border border-border/50 hover:bg-muted-foreground/10 transition-colors cursor-pointer shadow-sm text-[10px] font-semibold text-muted-foreground ml-0.5">
                              {logicLabData!.badges.length > 3 ? `+${logicLabData!.badges.length - 3}` : '...'}
                            </button>
                          </DialogTrigger>
                          <DialogContent className="max-w-md w-full sm:max-w-lg">
                            <DialogHeader>
                              <DialogTitle>Earned Badges</DialogTitle>
                            </DialogHeader>
                            <div className="grid grid-cols-4 sm:grid-cols-5 gap-4 pt-4">
                              {(() => {
                                  const allBadges = logicLabData!.allBadges || [];
                                  const earnedBadgeIds = new Map(logicLabData!.badges?.map((b: any) => [b.id, b]) || []);

                                  if (allBadges.length === 0) {
                                    return <div className="text-sm text-muted-foreground italic w-full col-span-full text-center py-8">No badges available yet.</div>;
                                  }

                                  const sortedAllBadges = [...allBadges].sort((a: any, b: any) => {
                                    const aEarned = earnedBadgeIds.has(a.id);
                                    const bEarned = earnedBadgeIds.has(b.id);
                                    if (aEarned && !bEarned) return -1;
                                    if (!aEarned && bEarned) return 1;
                                    if (aEarned && bEarned) {
                                      const aDate = new Date(earnedBadgeIds.get(a.id).earned_at).getTime();
                                      const bDate = new Date(earnedBadgeIds.get(b.id).earned_at).getTime();
                                      return bDate - aDate;
                                    }
                                    return 0;
                                  });

                                  return sortedAllBadges.map((badge: any, idx: number) => {
                                    const earnedData = earnedBadgeIds.get(badge.id);
                                    const isEarned = !!earnedData;
                                    const isUrl = badge.icon_name && (badge.icon_name.startsWith('http') || badge.icon_name.startsWith('/'));

                                    return (
                                      <TooltipProvider key={idx}>
                                        <Tooltip delayDuration={200}>
                                          <TooltipTrigger asChild>
                                            <div className={cn("flex flex-col items-center gap-2 cursor-pointer group", !isEarned && "opacity-70 grayscale hover:grayscale-0 hover:opacity-100 transition-all duration-300")}>
                                              <div className={cn(
                                                "flex items-center justify-center size-14 rounded-2xl border transition-colors shadow-sm overflow-hidden",
                                                isEarned ? "bg-muted/50 hover:bg-muted" : "bg-muted/30 border-dashed"
                                              )}>
                                                {isUrl ? (
                                                  <img 
                                                    src={badge.icon_name} 
                                                    alt={badge.name} 
                                                    className={cn(
                                                      "size-10 object-contain transition-transform duration-300",
                                                      isEarned ? "drop-shadow-sm group-hover:scale-110" : "group-hover:scale-105"
                                                    )} 
                                                  />
                                                ) : (
                                                  <Award className={cn(
                                                    "size-6 transition-transform duration-300",
                                                    isEarned ? "text-primary drop-shadow-sm group-hover:scale-110" : "text-muted-foreground group-hover:scale-105"
                                                  )} />
                                                )}
                                              </div>
                                              <p className={cn("text-[10px] font-medium text-center leading-tight line-clamp-2 px-1", !isEarned && "text-muted-foreground")}>
                                                {badge.name}
                                              </p>
                                            </div>
                                          </TooltipTrigger>
                                          <TooltipContent className="flex flex-col gap-1 max-w-[220px] text-center p-3 bg-popover text-popover-foreground">
                                            <p className="font-semibold text-sm">{badge.name}</p>
                                            <p className="text-xs text-muted-foreground">{badge.description}</p>
                                            {isEarned ? (
                                              <p className="text-[10px] text-muted-foreground/50 mt-1.5 pt-1.5 border-t">
                                                Earned: {new Date(earnedData.earned_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                              </p>
                                            ) : (
                                              <p className="text-[10px] text-muted-foreground/50 mt-1.5 pt-1.5 border-t italic">
                                                Not earned yet
                                              </p>
                                            )}
                                          </TooltipContent>
                                        </Tooltip>
                                      </TooltipProvider>
                                    );
                                  });
                                })()}
                              </div>
                            </DialogContent>
                          </Dialog>
                        </div>
                      )}
                  </div>
                  <div className="text-xs text-muted-foreground flex flex-wrap items-center justify-center sm:justify-start gap-4 pt-1">
                    <span>Email: {publicData.email}</span>
                    {publicData.passout_year && <span>Passout Year: {publicData.passout_year}</span>}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* ── About Section ────────────────────────────────────────── */}
          {publicData.bio && (
            <SectionCard title="About / Student Summary">
              <p className="text-sm text-muted-foreground leading-relaxed">
                {publicData.bio}
              </p>
            </SectionCard>
          )}

          {/* ── Education & Academic Performance ──────────────────────── */}
          <SectionCard title="Education & Academic Performance">
            <div className="flex flex-col gap-5">
              {(publicData.course_name || publicData.passout_year || publicData.university_prn) && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 print:grid-cols-4">
                  {publicData.course_name && (
                    <div className="space-y-0.5">
                      <p className="text-xs text-muted-foreground">Course / Branch</p>
                      <p className="text-sm font-medium">{publicData.course_name}</p>
                    </div>
                  )}
                  {publicData.institute_name && (
                    <div className="space-y-0.5">
                      <p className="text-xs text-muted-foreground">Institute</p>
                      <p className="text-sm font-medium">{publicData.institute_name}</p>
                    </div>
                  )}
                  {publicData.passout_year && (
                    <div className="space-y-0.5">
                      <p className="text-xs text-muted-foreground">Graduation Year</p>
                      <p className="text-sm font-medium">{publicData.passout_year}</p>
                    </div>
                  )}
                  {publicData.university_prn && (
                    <div className="space-y-0.5">
                      <p className="text-xs text-muted-foreground">University PRN</p>
                      <p className="text-sm font-medium">
                        {viewerRole === "student" && publicData.university_prn.length > 4
                          ? `********${publicData.university_prn.slice(-4)}`
                          : publicData.university_prn}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {hasSgpa && (
                <>
                  <Separator />
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <p className="text-xs text-muted-foreground font-medium">Semester-wise SGPA</p>
                      {cgpa && <Badge variant="secondary" className="text-xs h-5">CGPA {cgpa}</Badge>}
                    </div>
                    <div className="grid grid-cols-4 sm:grid-cols-8 gap-2 print:grid-cols-8">
                      {publicData.sgpa_semesters.map((sgpa, i) => (
                        <div
                          key={i}
                          className={cn(
                            "rounded-md border text-center py-2 px-1",
                            sgpa ? "bg-primary/5 border-primary/20" : "border-dashed border-muted-foreground/20 bg-muted/30"
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

              {hasEducationHistory && (
                <>
                  <Separator />
                  <div>
                    <p className="text-xs text-muted-foreground font-medium mb-3">Previous Education History</p>
                    <div className="flex flex-col gap-3">
                      {[sscRecord, hscRecord, diplomaRecord].filter(Boolean).map((rec) => (
                        <div
                          key={rec!.id}
                          className="flex items-start justify-between gap-4 p-3 rounded-lg border bg-muted/30 print:bg-white"
                        >
                          <div className="space-y-0.5">
                            <p className="text-sm font-medium">{EDUCATION_TYPE_LABELS[rec!.type] ?? rec!.type}</p>
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
            </div>
          </SectionCard>

          {/* ── Skills ───────────────────────────────────────────────── */}
          {hasSkills && (
            <SectionCard title="Technical & Professional Skills">
              <div className="flex flex-col gap-4">
                {Object.entries(groupedSkills).map(([category, skills]) => (
                  <div key={category}>
                    <p className="text-xs text-muted-foreground font-medium mb-2">{category}</p>
                    <div className="flex flex-wrap gap-2">
                      {skills.map((skill) => (
                        <Badge key={skill.id} variant="secondary" className="gap-1.5 py-1 px-2.5 text-xs font-medium">
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

          {/* ── Assigned Tests Analytics Section ─────────────────────── */}
          {assignedTestsData && <AssignedTestsAnalyticsSection data={assignedTestsData} />}

          {/* ── LogicLab Performance ─────────────────────────────────── */}
          {logicLabData && <LogicLabAnalyticsSection data={logicLabData} />}

          {/* ── Experience ───────────────────────────────────────────── */}
          {hasExperiences && (
            <SectionCard title="Experience & Internships">
              <div className="flex flex-col gap-4">
                {experienceData.map((exp, idx) => (
                  <div key={exp.id} className="flex flex-col gap-2">
                    {idx > 0 && <Separator className="mb-4" />}
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-1 sm:gap-4">
                      <div className="space-y-0.5 min-w-0">
                        <p className="text-sm font-semibold">{exp.title}</p>
                        <p className="text-sm text-muted-foreground font-medium">{exp.company_name}</p>
                        {exp.location && <p className="text-xs text-muted-foreground">{exp.location}</p>}
                      </div>
                      <div className="shrink-0 sm:text-right flex sm:flex-col items-center sm:items-end gap-2 sm:gap-1">
                        {(exp.start_date || exp.end_date) && (
                          <span className="text-xs text-muted-foreground">
                            {formatDateRange(exp.start_date, exp.end_date, exp.is_current)}
                          </span>
                        )}
                        {exp.is_current && (
                          <Badge variant="secondary" className="text-[10px] h-4 px-1.5 font-normal">Current</Badge>
                        )}
                      </div>
                    </div>
                    {exp.description && (
                      <p className="text-sm text-muted-foreground leading-relaxed">{exp.description}</p>
                    )}
                  </div>
                ))}
              </div>
            </SectionCard>
          )}

          {/* ── Projects ─────────────────────────────────────────────── */}
          {hasProjects && (
            <SectionCard title="Projects">
              <div className="flex flex-col gap-4">
                {projectsData.map((proj, idx) => (
                  <div key={proj.id}>
                    {idx > 0 && <Separator className="mb-4" />}
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-semibold">{proj.title}</p>
                            {proj.is_ongoing && (
                              <Badge variant="secondary" className="text-[10px] h-4 px-1.5">Ongoing</Badge>
                            )}
                          </div>
                          {proj.associated_with && (
                            <p className="text-xs text-muted-foreground">{proj.associated_with}</p>
                          )}
                        </div>
                        {(proj.start_date || proj.end_date) && (
                          <span className="shrink-0 text-xs text-muted-foreground">
                            {formatDateRange(proj.start_date, proj.end_date, proj.is_ongoing)}
                          </span>
                        )}
                      </div>
                      {proj.description && (
                        <p className="text-sm text-muted-foreground leading-relaxed">{proj.description}</p>
                      )}
                      {proj.skills && proj.skills.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-1">
                          {proj.skills.map((s, i) => (
                            <Badge key={i} variant="outline" className="gap-1 text-[11px] h-5 px-1.5">
                              <SkillIcon name={s} className="size-3" />
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

          {/* ── Certifications ───────────────────────────────────────── */}
          {hasCertifications && (
            <SectionCard title="Certifications">
              <div className="flex flex-col gap-4">
                {certificationsData.map((cert, idx) => (
                  <div key={cert.id}>
                    {idx > 0 && <Separator className="mb-4" />}
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0 space-y-0.5">
                        <p className="text-sm font-semibold">{cert.name}</p>
                        <p className="text-sm text-muted-foreground">{cert.issuing_org}</p>
                        {cert.credential_id && (
                          <p className="text-xs text-muted-foreground">{cert.credential_id}</p>
                        )}
                      </div>
                      <div className="shrink-0 text-right space-y-1">
                        {cert.issue_date && (
                          <p className="text-xs text-muted-foreground">{formatIssueDate(cert.issue_date)}</p>
                        )}
                        {cert.does_not_expire ? (
                          <Badge variant="secondary" className="text-[10px] h-4 px-1.5">No Expiry</Badge>
                        ) : cert.expiration_date ? (
                          <p className="text-xs text-muted-foreground">Expires {formatIssueDate(cert.expiration_date)}</p>
                        ) : null}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </SectionCard>
          )}

          {/* ── Event Participation ──────────────────────────────────── */}
          {hasEventCerts && (
            <SectionCard title="Event Participation">
              <div className="flex flex-col gap-3">
                {eventCertificates.map((cert, idx) => (
                  <div key={cert.ticketId}>
                    {idx > 0 && <Separator className="mb-3" />}
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{cert.eventTitle}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(cert.eventDate))}
                        </p>
                      </div>
                      <Badge variant="secondary" className="shrink-0 text-xs">Attended</Badge>
                    </div>
                  </div>
                ))}
              </div>
            </SectionCard>
          )}

          {/* Print Footer */}
          <div className="hidden print:flex flex-col gap-1 text-center text-xs text-gray-500 pt-6 border-t mt-6">
            <p>This document is an official performance report generated from PlaceTrix Platform for {publicData.full_name}.</p>
            <p>Confidential — For Academic & Institutional Guidance Purpose Only.</p>
          </div>

        </div>
      </div>
    </TooltipProvider>
  );
}
