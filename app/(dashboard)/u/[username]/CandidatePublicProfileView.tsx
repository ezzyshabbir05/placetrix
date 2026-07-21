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
  CalendarDays, Hash, BarChart3, BookOpen,
} from "lucide-react";
import type {
  CandidateEducation, CandidateExperience, CandidateProject,
  CandidateCertification, Skill,
} from "@/types/profile-extensions";

// ─── Types ────────────────────────────────────────────────────────────────────

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

function SectionCard({ icon: Icon, title, children }: {
  icon: React.ElementType;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Icon className="h-4 w-4 text-muted-foreground" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
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
                <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
                  {publicData.course_name && (
                    <Badge variant="secondary" className="gap-1">
                      <GraduationCap className="h-3 w-3" />
                      {publicData.course_name}
                      {publicData.passout_year ? ` · ${publicData.passout_year}` : ""}
                    </Badge>
                  )}
                  {publicData.institute_name && (
                    <Badge variant="outline" className="gap-1">
                      <Building2 className="h-3 w-3" />
                      {publicData.institute_name}
                    </Badge>
                  )}
                  {cgpa && (
                    <Badge variant="outline" className="gap-1 text-primary border-primary/30 bg-primary/5">
                      <BarChart3 className="h-3 w-3" />
                      CGPA {cgpa}
                    </Badge>
                  )}
                  {publicData.gender && (
                    <Badge variant="outline" className="gap-1">
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
            {(publicData.course_name || publicData.passout_year || publicData.university_prn) && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <InfoRow label="Course / Branch" value={publicData.course_name} />
                <InfoRow label="Institute" value={publicData.institute_name} />
                <InfoRow label="Expected Graduation" value={publicData.passout_year ? String(publicData.passout_year) : null} />
                <InfoRow label="University PRN" value={publicData.university_prn} />
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

        {/* ── Experience ────────────────────────────────────────────────────── */}
        {hasExperiences && (
          <SectionCard icon={Briefcase} title="Experience">
            <div className="space-y-4">
              {experienceData.map((exp, idx) => (
                <div key={exp.id}>
                  {idx > 0 && <Separator className="mb-4" />}
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0 space-y-1">
                      <p className="text-sm font-semibold">{exp.title}</p>
                      <p className="text-sm text-muted-foreground">{exp.company_name}</p>
                      {exp.location && (
                        <p className="text-xs text-muted-foreground">{exp.location}</p>
                      )}
                      {exp.description && (
                        <p className="text-sm text-muted-foreground leading-relaxed mt-1.5">
                          {exp.description}
                        </p>
                      )}
                    </div>
                    <div className="shrink-0 text-right">
                      <div className="flex items-center gap-1 text-xs text-muted-foreground justify-end">
                        <CalendarDays className="h-3 w-3" />
                        <span>
                          {formatDateRange(exp.start_date, exp.end_date, exp.is_current)}
                        </span>
                      </div>
                      {exp.is_current && (
                        <Badge variant="secondary" className="mt-1 text-[10px] h-4 px-1.5">
                          Current
                        </Badge>
                      )}
                    </div>
                  </div>
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
