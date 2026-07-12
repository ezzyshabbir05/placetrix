"use client";

import React, { useState, useCallback, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  FileText, Loader2, Plus, Trash2, ChevronLeft,
  UserRound, GraduationCap, Briefcase, FolderGit2, Award,
  Wrench, Code2, Sparkles, ChevronDown, ChevronUp,
} from "lucide-react";
import { ResumeFormData, EducationEntry, ExperienceEntry, ProjectEntry, CertificationEntry, SkillGroup } from "./ResumePDFDocument";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
  prefillData: ResumeFormData;
}

// ─── Empty entry factories ────────────────────────────────────────────────────

const emptyEducation = (): EducationEntry => ({
  degree: "", institution: "", location: "", year: "", grade: "",
});
const emptyExperience = (): ExperienceEntry => ({
  title: "", company: "", location: "", startDate: "", endDate: "", isCurrent: false, bullets: [""],
});
const emptyProject = (): ProjectEntry => ({
  title: "", technologies: "", url: "", description: "",
});
const emptyCertification = (): CertificationEntry => ({
  name: "", issuer: "", date: "", url: "",
});
const emptySkillGroup = (): SkillGroup => ({
  category: "", skills: "",
});

// ─── Default blank form ───────────────────────────────────────────────────────

const BLANK_FORM: ResumeFormData = {
  fullName: "", email: "", phone: "", location: "", linkedin: "", github: "", portfolio: "",
  summary: "",
  education: [emptyEducation()],
  experience: [emptyExperience()],
  projects: [emptyProject()],
  certifications: [emptyCertification()],
  skillGroups: [{ category: "Languages", skills: "" }, { category: "Frameworks", skills: "" }, { category: "Tools", skills: "" }],
};

// ─── Date helpers ─────────────────────────────────────────────────────────────

function fmtDate(iso?: string | null): string {
  if (!iso) return "";
  try {
    const d = new Date(`${iso}T00:00:00`);
    return d.toLocaleDateString("en-IN", { month: "short", year: "numeric" });
  } catch { return iso; }
}

// ─── LaTeX code generator ─────────────────────────────────────────────────────

function esc(str: string): string {
  return (str ?? "")
    .replace(/\\/g, "\\textbackslash{}")
    .replace(/&/g, "\\&")
    .replace(/%/g, "\\%")
    .replace(/\$/g, "\\$")
    .replace(/#/g, "\\#")
    .replace(/_/g, "\\_")
    .replace(/\{/g, "\\{")
    .replace(/\}/g, "\\}")
    .replace(/~/g, "\\textasciitilde{}")
    .replace(/\^/g, "\\textasciicircum{}");
}

function generateLatexCode(data: ResumeFormData): string {
  const name = esc(data.fullName);

  // Contact line — build as \href links where applicable
  const contactParts: string[] = [];
  if (data.email) contactParts.push(`\\href{mailto:${data.email}}{${esc(data.email)}}`);
  if (data.phone) contactParts.push(esc(data.phone));
  if (data.location) contactParts.push(esc(data.location));
  if (data.linkedin) {
    const href = data.linkedin.startsWith("http") ? data.linkedin : `https://${data.linkedin}`;
    contactParts.push(`\\href{${href}}{LinkedIn}`);
  }
  if (data.github) {
    const href = data.github.startsWith("http") ? data.github : `https://${data.github}`;
    contactParts.push(`\\href{${href}}{GitHub}`);
  }
  if (data.portfolio) {
    const href = data.portfolio.startsWith("http") ? data.portfolio : `https://${data.portfolio}`;
    contactParts.push(`\\href{${href}}{Portfolio}`);
  }
  const contactLine = contactParts.join(" $|$ ");

  // Education
  let eduSection = "";
  const validEdu = data.education.filter(e => e.degree || e.institution);
  if (validEdu.length > 0) {
    const items = validEdu.map(e =>
      `  \\resumeSubheading\n    {${esc(e.degree)}}{${esc(e.year)}}\n    {${esc(e.institution)}${e.location ? `, ${esc(e.location)}` : ""}}{${esc(e.grade ?? "")}}`
    ).join("\n");
    eduSection = `
%----------- EDUCATION -----------
\\section{Education}
  \\resumeSubHeadingListStart
${items}
  \\resumeSubHeadingListEnd`;
  }

  // Experience
  let expSection = "";
  const validExp = data.experience.filter(e => e.title || e.company);
  if (validExp.length > 0) {
    const items = validExp.map(e => {
      const dateStr = `${esc(e.startDate)}${e.startDate && (e.isCurrent || e.endDate) ? " -- " : ""}${e.isCurrent ? "Present" : esc(e.endDate ?? "")}`;
      const bullets = e.bullets.filter(b => b.trim()).map(
        b => `      \\resumeItem{${esc(b.replace(/^[-•]\s*/, "").trim())}}`
      ).join("\n");
      return `  \\resumeSubheading\n    {${esc(e.title)}}{${dateStr}}\n    {${esc(e.company)}${e.location ? `, ${esc(e.location)}` : ""}}{}${bullets ? `\n    \\resumeItemListStart\n${bullets}\n    \\resumeItemListEnd` : ""}`;
    }).join("\n\n");
    expSection = `
%----------- EXPERIENCE -----------
\\section{Experience}
  \\resumeSubHeadingListStart
${items}
  \\resumeSubHeadingListEnd`;
  }

  // Projects
  let projSection = "";
  const validProj = data.projects.filter(p => p.title);
  if (validProj.length > 0) {
    const items = validProj.map(p => {
      const tech = p.technologies ? ` $|$ \\emph{\\small{${esc(p.technologies)}}}` : "";
      const link = p.url
        ? ` \\href{${p.url.startsWith("http") ? p.url : `https://${p.url}`}}{\\underline{[link]}}`
        : "";
      const bullets = p.description.split("\n").filter(l => l.trim()).map(
        l => `      \\resumeItem{${esc(l.replace(/^[-•]\s*/, "").trim())}}`
      ).join("\n");
      return `  \\resumeProjectHeading\n    {\\textbf{${esc(p.title)}}${tech}${link}}{}\n    \\resumeItemListStart\n${bullets}\n    \\resumeItemListEnd`;
    }).join("\n\n");
    projSection = `
%----------- PROJECTS -----------
\\section{Projects}
  \\resumeSubHeadingListStart
${items}
  \\resumeSubHeadingListEnd`;
  }

  // Certifications
  let certSection = "";
  const validCerts = data.certifications.filter(c => c.name);
  if (validCerts.length > 0) {
    const rows = validCerts.map(c => {
      const link = c.url ? ` \\href{${c.url.startsWith("http") ? c.url : `https://${c.url}`}}{[link]}` : "";
      return `    \\resumeItem{\\textbf{${esc(c.name)}} $|$ \\emph{${esc(c.issuer)}}${link} \\hfill ${esc(c.date)}}`;
    }).join("\n");
    certSection = `
%----------- CERTIFICATIONS -----------
\\section{Certifications}
  \\resumeItemListStart
${rows}
  \\resumeItemListEnd`;
  }

  // Skills
  let skillSection = "";
  const validSkills = data.skillGroups.filter(g => g.skills.trim());
  if (validSkills.length > 0) {
    const rows = validSkills.map(
      g => `     \\textbf{${esc(g.category)}}{: ${esc(g.skills)}} \\\\`
    ).join("\n");
    skillSection = `
%----------- TECHNICAL SKILLS -----------
\\section{Technical Skills}
 \\begin{itemize}[leftmargin=0.15in, label={}]
    \\small{\\item{
${rows}
    }}
 \\end{itemize}`;
  }

  // Summary
  let summarySection = "";
  if (data.summary.trim()) {
    summarySection = `
%----------- SUMMARY -----------
\\section{Summary}
  \\small{${esc(data.summary)}}`;
  }

  return `%-------------------------
% Resume generated by PlaceTrix
% Compile with: pdflatex resume.tex
% Or paste into https://www.overleaf.com
%-------------------------

\\documentclass[letterpaper,11pt]{article}

\\usepackage{latexsym}
\\usepackage[empty]{fullpage}
\\usepackage{titlesec}
\\usepackage{marvosym}
\\usepackage[usenames,dvipsnames]{color}
\\usepackage{verbatim}
\\usepackage{enumitem}
\\usepackage[hidelinks]{hyperref}
\\usepackage{fancyhdr}
\\usepackage[english]{babel}
\\usepackage{tabularx}
\\input{glyphtounicode}

\\pagestyle{fancy}
\\fancyhf{}
\\fancyfoot{}
\\renewcommand{\\headrulewidth}{0pt}
\\renewcommand{\\footrulewidth}{0pt}

\\addtolength{\\oddsidemargin}{-0.5in}
\\addtolength{\\evensidemargin}{-0.5in}
\\addtolength{\\textwidth}{1in}
\\addtolength{\\topmargin}{-.5in}
\\addtolength{\\textheight}{1.0in}

\\urlstyle{same}
\\raggedbottom
\\raggedright
\\setlength{\\tabcolsep}{0in}

\\titleformat{\\section}{
  \\vspace{-4pt}\\scshape\\raggedright\\large
}{}{0em}{}[\\color{black}\\titlerule \\vspace{-5pt}]

\\pdfgentounicode=1

%--- Custom commands ---
\\newcommand{\\resumeItem}[1]{
  \\item\\small{#1 \\vspace{-2pt}}
}

\\newcommand{\\resumeSubheading}[4]{
  \\vspace{-2pt}\\item
    \\begin{tabular*}{0.97\\textwidth}[t]{l@{\\extracolsep{\\fill}}r}
      \\textbf{#1} & #2 \\\\
      \\textit{\\small#3} & \\textit{\\small #4} \\\\
    \\end{tabular*}\\vspace{-7pt}
}

\\newcommand{\\resumeProjectHeading}[2]{
    \\item
    \\begin{tabular*}{0.97\\textwidth}{l@{\\extracolsep{\\fill}}r}
      \\small#1 & #2 \\\\
    \\end{tabular*}\\vspace{-7pt}
}

\\newcommand{\\resumeSubItem}[1]{\\resumeItem{#1}\\vspace{-4pt}}
\\renewcommand\\labelitemii{$\\vcenter{\\hbox{\\tiny$\\bullet$}}$}
\\newcommand{\\resumeSubHeadingListStart}{\\begin{itemize}[leftmargin=0.15in, label={}]}
\\newcommand{\\resumeSubHeadingListEnd}{\\end{itemize}}
\\newcommand{\\resumeItemListStart}{\\begin{itemize}}
\\newcommand{\\resumeItemListEnd}{\\end{itemize}\\vspace{-5pt}}

%===========================================
\\begin{document}

%----------- HEADING -----------
\\begin{center}
    {\\Huge \\textbf{${name}}} \\\\ \\vspace{4pt}
    \\small ${contactLine}
\\end{center}
${summarySection}
${eduSection}
${expSection}
${projSection}
${certSection}
${skillSection}

\\end{document}
`;
}



function FormSection({
  title, icon, children, defaultOpen = true,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-border/60 rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between gap-3 px-4 py-3 bg-muted/30 hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <span className="text-muted-foreground">{icon}</span>
          <span className="text-sm font-semibold">{title}</span>
        </div>
        {open ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
      </button>
      {open && <div className="p-4 space-y-4 bg-card">{children}</div>}
    </div>
  );
}

// ─── Row helper ───────────────────────────────────────────────────────────────

function Row({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("grid gap-3", className)}>{children}</div>;
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground">
        {label}{required && <span className="text-destructive ml-0.5">*</span>}
      </Label>
      {children}
    </div>
  );
}

// ─── Live LaTeX Preview ───────────────────────────────────────────────────────

function HRule() {
  return <div className="border-t border-black my-0.5" />;
}

function Bullet({ text }: { text: string }) {
  if (!text.trim()) return null;
  return (
    <div className="flex gap-1.5 pl-2">
      <span className="text-[10px] text-black mt-px shrink-0">•</span>
      <span className="text-[10px] leading-relaxed text-gray-800">{text.replace(/^[-•]\s*/, "").trim()}</span>
    </div>
  );
}

function PreviewSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-3">
      <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-black mb-0.5">{title}</p>
      <HRule />
      <div className="mt-1 space-y-2">{children}</div>
    </div>
  );
}

function LivePreview({ data }: { data: ResumeFormData }) {
  const hasExperience = data.experience.some(e => e.title || e.company);
  const hasEducation = data.education.some(e => e.degree || e.institution);
  const hasProjects = data.projects.some(p => p.title || p.description);
  const hasCerts = data.certifications.some(c => c.name);
  const hasSkills = data.skillGroups.some(g => g.skills.trim());

  type ContactItem = { type: "text"; value: string } | { type: "link"; label: string; href: string };
  const contactItems: ContactItem[] = [
    ...(data.email ? [{ type: "text" as const, value: data.email }] : []),
    ...(data.phone ? [{ type: "text" as const, value: data.phone }] : []),
    ...(data.location ? [{ type: "text" as const, value: data.location }] : []),
    ...(data.linkedin ? [{ type: "link" as const, label: "LinkedIn", href: data.linkedin }] : []),
    ...(data.github ? [{ type: "link" as const, label: "GitHub", href: data.github }] : []),
    ...(data.portfolio ? [{ type: "link" as const, label: "Portfolio", href: data.portfolio }] : []),
  ];

  return (
    <div
      className="bg-white shadow-2xl text-black overflow-hidden"
      style={{
        fontFamily: "'Times New Roman', Times, serif",
        lineHeight: 1.35,
        minHeight: "1120px",
        padding: "44px 50px",
        fontSize: "10px",
      }}
    >
      {/* Name */}
      <p className="text-center font-bold text-[22px] tracking-wide mb-1">
        {data.fullName || <span className="text-gray-300 font-normal italic text-base">Your Name</span>}
      </p>

      {/* Contact */}
      <div className="flex flex-wrap justify-center gap-x-1 text-[9px] text-gray-700 mb-3">
        {contactItems.map((item, i) => (
          <React.Fragment key={i}>
            {i > 0 && <span className="text-gray-400 mx-0.5">|</span>}
            {item.type === "text"
              ? <span>{item.value}</span>
              : <a href={item.href} target="_blank" rel="noopener noreferrer" className="underline underline-offset-1 text-black">{item.label}</a>
            }
          </React.Fragment>
        ))}
        {contactItems.length === 0 && (
          <span className="text-gray-300 italic text-[9px]">email · phone · location · LinkedIn · GitHub</span>
        )}
      </div>

      {/* Summary */}
      {data.summary.trim() && (
        <PreviewSection title="Summary">
          <p className="text-[9.5px] leading-relaxed text-gray-800 text-justify">{data.summary}</p>
        </PreviewSection>
      )}

      {/* Education */}
      {hasEducation && (
        <PreviewSection title="Education">
          {data.education.filter(e => e.degree || e.institution).map((edu, i) => (
            <div key={i}>
              <div className="flex justify-between items-baseline">
                <span className="text-[10px] font-bold">{edu.degree}</span>
                <span className="text-[9px] text-gray-500">{edu.year}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[9.5px] italic text-gray-600">
                  {edu.institution}{edu.location ? `, ${edu.location}` : ""}
                </span>
                {edu.grade && <span className="text-[9px] text-gray-500">{edu.grade}</span>}
              </div>
            </div>
          ))}
        </PreviewSection>
      )}

      {/* Experience */}
      {hasExperience && (
        <PreviewSection title="Experience">
          {data.experience.filter(e => e.title || e.company).map((exp, i) => (
            <div key={i}>
              <div className="flex justify-between items-baseline">
                <span className="text-[10px] font-bold">{exp.title}</span>
                <span className="text-[9px] text-gray-500">
                  {exp.startDate}{exp.startDate && (exp.endDate || exp.isCurrent) ? " – " : ""}
                  {exp.isCurrent ? "Present" : exp.endDate}
                </span>
              </div>
              <span className="text-[9.5px] italic text-gray-600 block mb-0.5">
                {exp.company}{exp.location ? `, ${exp.location}` : ""}
              </span>
              {exp.bullets.map((b, j) => <Bullet key={j} text={b} />)}
            </div>
          ))}
        </PreviewSection>
      )}

      {/* Projects */}
      {hasProjects && (
        <PreviewSection title="Projects">
          {data.projects.filter(p => p.title || p.description).map((proj, i) => (
            <div key={i}>
              <div className="flex items-baseline gap-1 flex-wrap">
                <span className="text-[10px] font-bold">{proj.title}</span>
                {proj.technologies && (
                  <><span className="text-[9px] text-gray-400">|</span>
                    <span className="text-[9.5px] italic text-gray-600">{proj.technologies}</span>
                  </>
                )}
                {proj.url && (
                  <a href={proj.url} target="_blank" rel="noopener noreferrer"
                    className="text-[9px] text-black underline underline-offset-1 ml-auto">[link]</a>
                )}
              </div>
              {proj.description.split("\n").filter(l => l.trim()).map((line, j) => (
                <Bullet key={j} text={line} />
              ))}
            </div>
          ))}
        </PreviewSection>
      )}

      {/* Certifications */}
      {hasCerts && (
        <PreviewSection title="Certifications">
          {data.certifications.filter(c => c.name).map((cert, i) => (
            <div key={i} className="flex items-baseline justify-between gap-2">
              <span className="text-[10px] font-bold">{cert.name}</span>
              <span className="text-[9.5px] italic text-gray-600 flex-1 text-center">{cert.issuer}</span>
              <span className="text-[9px] text-gray-500">{cert.date}</span>
            </div>
          ))}
        </PreviewSection>
      )}

      {/* Skills */}
      {hasSkills && (
        <PreviewSection title="Technical Skills">
          {data.skillGroups.filter(g => g.skills.trim()).map((group, i) => (
            <div key={i} className="flex gap-1.5 text-[9.5px]">
              <span className="font-bold text-black shrink-0">{group.category}:</span>
              <span className="text-gray-800">{group.skills}</span>
            </div>
          ))}
        </PreviewSection>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function ResumeGeneratorClient({ prefillData }: Props) {
  const router = useRouter();
  const [form, setForm] = useState<ResumeFormData>(BLANK_FORM);
  const [isPrefilling, startPrefill] = useTransition();

  // ── Prefill from profile ──────────────────────────────────────────────────
  const handlePrefill = useCallback(() => {
    startPrefill(() => {
      setForm(prev => ({
        ...prefillData,
        // Keep any manually entered data that's richer than prefill
        fullName: prefillData.fullName || prev.fullName,
        email: prefillData.email || prev.email,
      }));
      toast.success("Profile data filled! Review and edit as needed.");
    });
  }, [prefillData]);



  // ── Generate & Download LaTeX source ─────────────────────────────────────
  const handleDownloadLatex = useCallback(() => {
    if (!form.fullName.trim()) {
      toast.error("Please enter your name before downloading.");
      return;
    }
    const tex = generateLatexCode(form);
    const blob = new Blob([tex], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${form.fullName.replace(/\s+/g, "_")}_Resume.tex`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("LaTeX source downloaded! Open with Overleaf or a local LaTeX editor.");
  }, [form]);

  // ── Generic field updater ─────────────────────────────────────────────────
  const setField = <K extends keyof ResumeFormData>(key: K, value: ResumeFormData[K]) =>
    setForm(f => ({ ...f, [key]: value }));

  // ── Array section helpers ─────────────────────────────────────────────────
  function updateEntry<T>(arr: T[], index: number, patch: Partial<T>): T[] {
    return arr.map((item, i) => (i === index ? { ...item, ...patch } : item));
  }
  function removeEntry<T>(arr: T[], index: number): T[] {
    return arr.filter((_, i) => i !== index);
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">

      {/* ── Top Bar ── */}
      <div className="sticky top-0 z-30 flex items-center justify-between gap-4 border-b border-border/60 bg-background/95 backdrop-blur px-4 py-3 md:px-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground" onClick={() => router.back()}>
            <ChevronLeft className="h-4 w-4" />
            Back
          </Button>
          <Separator orientation="vertical" className="h-5" />
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-emerald-500/10">
              <FileText className="h-4 w-4 text-emerald-500" />
            </div>
            <span className="font-semibold text-sm">Resume Generator</span>
            <Badge variant="secondary" className="text-[10px] px-1.5 h-4">LaTeX Style</Badge>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            className="gap-2 border-emerald-500/40 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/10"
            onClick={handlePrefill}
            disabled={isPrefilling}
          >
            {isPrefilling
              ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
              : <Sparkles className="h-3.5 w-3.5" />
            }
            Prefill from Profile
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-2 border-violet-500/40 text-violet-700 dark:text-violet-400 hover:bg-violet-500/10"
            onClick={handleDownloadLatex}
          >
            <Code2 className="h-3.5 w-3.5" />
            Download .tex
          </Button>
        </div>
      </div>

      {/* ── Body ── */}
      <div className="flex flex-col lg:flex-row flex-1 overflow-hidden">

        {/* ── LEFT: Editable Form ── */}
        <div className="w-full lg:w-[440px] flex-shrink-0 overflow-y-auto border-r border-border/60 bg-background">
          <div className="p-4 space-y-3">

            {/* ─ Personal Info ─ */}
            <FormSection title="Personal Information" icon={<UserRound className="h-4 w-4" />}>
              <Row className="grid-cols-1">
                <Field label="Full Name" required>
                  <Input placeholder="e.g. Priya Sharma" value={form.fullName}
                    onChange={e => setField("fullName", e.target.value)} />
                </Field>
              </Row>
              <Row className="grid-cols-2">
                <Field label="Email" required>
                  <Input type="email" placeholder="priya@email.com" value={form.email}
                    onChange={e => setField("email", e.target.value)} />
                </Field>
                <Field label="Phone">
                  <Input placeholder="+91 98765 43210" value={form.phone}
                    onChange={e => setField("phone", e.target.value)} />
                </Field>
              </Row>
              <Row className="grid-cols-1">
                <Field label="Location">
                  <Input placeholder="Pune, India" value={form.location}
                    onChange={e => setField("location", e.target.value)} />
                </Field>
              </Row>
              <Row className="grid-cols-2">
                <Field label="LinkedIn URL">
                  <Input placeholder="linkedin.com/in/priya" value={form.linkedin}
                    onChange={e => setField("linkedin", e.target.value)} />
                </Field>
                <Field label="GitHub URL">
                  <Input placeholder="github.com/priya" value={form.github}
                    onChange={e => setField("github", e.target.value)} />
                </Field>
              </Row>
              <Row className="grid-cols-1">
                <Field label="Portfolio URL">
                  <Input placeholder="https://priya.dev" value={form.portfolio}
                    onChange={e => setField("portfolio", e.target.value)} />
                </Field>
              </Row>
              <Field label="Summary / Objective">
                <Textarea
                  placeholder="A brief 2-3 line professional summary..."
                  rows={3}
                  value={form.summary}
                  onChange={e => setField("summary", e.target.value)}
                  className="resize-none text-sm"
                />
              </Field>
            </FormSection>

            {/* ─ Education ─ */}
            <FormSection title="Education" icon={<GraduationCap className="h-4 w-4" />}>
              {form.education.map((edu, idx) => (
                <div key={idx} className="relative space-y-3 p-3 border border-border/50 rounded-lg bg-muted/20">
                  {form.education.length > 1 && (
                    <button type="button" onClick={() => setField("education", removeEntry(form.education, idx))}
                      className="absolute top-2 right-2 text-muted-foreground hover:text-destructive transition-colors">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                  <Row className="grid-cols-1">
                    <Field label="Degree / Course">
                      <Input placeholder="B.E. Computer Engineering" value={edu.degree}
                        onChange={e => setField("education", updateEntry(form.education, idx, { degree: e.target.value }))} />
                    </Field>
                  </Row>
                  <Row className="grid-cols-2">
                    <Field label="Institution">
                      <Input placeholder="MIT Pune" value={edu.institution}
                        onChange={e => setField("education", updateEntry(form.education, idx, { institution: e.target.value }))} />
                    </Field>
                    <Field label="Location">
                      <Input placeholder="Pune, India" value={edu.location ?? ""}
                        onChange={e => setField("education", updateEntry(form.education, idx, { location: e.target.value }))} />
                    </Field>
                  </Row>
                  <Row className="grid-cols-2">
                    <Field label="Year of Passing">
                      <Input placeholder="2025" value={edu.year}
                        onChange={e => setField("education", updateEntry(form.education, idx, { year: e.target.value }))} />
                    </Field>
                    <Field label="CGPA / %">
                      <Input placeholder="8.5 CGPA" value={edu.grade ?? ""}
                        onChange={e => setField("education", updateEntry(form.education, idx, { grade: e.target.value }))} />
                    </Field>
                  </Row>
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" className="w-full gap-2 border-dashed"
                onClick={() => setField("education", [...form.education, emptyEducation()])}>
                <Plus className="h-3.5 w-3.5" /> Add Education
              </Button>
            </FormSection>

            {/* ─ Experience ─ */}
            <FormSection title="Experience" icon={<Briefcase className="h-4 w-4" />} defaultOpen={false}>
              {form.experience.map((exp, idx) => (
                <div key={idx} className="relative space-y-3 p-3 border border-border/50 rounded-lg bg-muted/20">
                  {form.experience.length > 1 && (
                    <button type="button" onClick={() => setField("experience", removeEntry(form.experience, idx))}
                      className="absolute top-2 right-2 text-muted-foreground hover:text-destructive transition-colors">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                  <Row className="grid-cols-2">
                    <Field label="Job Title">
                      <Input placeholder="Software Engineer" value={exp.title}
                        onChange={e => setField("experience", updateEntry(form.experience, idx, { title: e.target.value }))} />
                    </Field>
                    <Field label="Company">
                      <Input placeholder="Infosys" value={exp.company}
                        onChange={e => setField("experience", updateEntry(form.experience, idx, { company: e.target.value }))} />
                    </Field>
                  </Row>
                  <Row className="grid-cols-1">
                    <Field label="Location">
                      <Input placeholder="Bengaluru, India" value={exp.location ?? ""}
                        onChange={e => setField("experience", updateEntry(form.experience, idx, { location: e.target.value }))} />
                    </Field>
                  </Row>
                  <Row className="grid-cols-2">
                    <Field label="Start Date">
                      <Input placeholder="Jun 2023" value={exp.startDate}
                        onChange={e => setField("experience", updateEntry(form.experience, idx, { startDate: e.target.value }))} />
                    </Field>
                    <div className="space-y-1">
                      <Field label="End Date">
                        <Input placeholder="Jun 2024" value={exp.endDate ?? ""}
                          disabled={exp.isCurrent}
                          onChange={e => setField("experience", updateEntry(form.experience, idx, { endDate: e.target.value }))} />
                      </Field>
                      <div className="flex items-center gap-2 pt-0.5">
                        <Switch
                          id={`current-${idx}`}
                          checked={exp.isCurrent}
                          onCheckedChange={v => setField("experience", updateEntry(form.experience, idx, { isCurrent: v, endDate: v ? "" : exp.endDate }))}
                        />
                        <Label htmlFor={`current-${idx}`} className="text-xs text-muted-foreground cursor-pointer">Currently working</Label>
                      </div>
                    </div>
                  </Row>
                  <Field label="Responsibilities (one per line, start each with an action verb)">
                    <Textarea
                      placeholder={"• Developed REST APIs using Node.js...\n• Led a team of 4 engineers..."}
                      rows={4}
                      className="resize-none text-sm font-mono"
                      value={exp.bullets.join("\n")}
                      onChange={e => setField("experience", updateEntry(form.experience, idx, {
                        bullets: e.target.value.split("\n"),
                      }))}
                    />
                  </Field>
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" className="w-full gap-2 border-dashed"
                onClick={() => setField("experience", [...form.experience, emptyExperience()])}>
                <Plus className="h-3.5 w-3.5" /> Add Experience
              </Button>
            </FormSection>

            {/* ─ Projects ─ */}
            <FormSection title="Projects" icon={<FolderGit2 className="h-4 w-4" />} defaultOpen={false}>
              {form.projects.map((proj, idx) => (
                <div key={idx} className="relative space-y-3 p-3 border border-border/50 rounded-lg bg-muted/20">
                  {form.projects.length > 1 && (
                    <button type="button" onClick={() => setField("projects", removeEntry(form.projects, idx))}
                      className="absolute top-2 right-2 text-muted-foreground hover:text-destructive transition-colors">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                  <Row className="grid-cols-2">
                    <Field label="Project Title">
                      <Input placeholder="Campus Placement Tracker" value={proj.title}
                        onChange={e => setField("projects", updateEntry(form.projects, idx, { title: e.target.value }))} />
                    </Field>
                    <Field label="Technologies">
                      <Input placeholder="React, Node.js, Supabase" value={proj.technologies ?? ""}
                        onChange={e => setField("projects", updateEntry(form.projects, idx, { technologies: e.target.value }))} />
                    </Field>
                  </Row>
                  <Field label="Project URL (optional)">
                    <Input placeholder="https://github.com/..." value={proj.url ?? ""}
                      onChange={e => setField("projects", updateEntry(form.projects, idx, { url: e.target.value }))} />
                  </Field>
                  <Field label="Description (one point per line)">
                    <Textarea
                      placeholder={"• Built a dashboard for tracking placement drives...\n• Integrated AI resume analysis..."}
                      rows={3}
                      className="resize-none text-sm font-mono"
                      value={proj.description}
                      onChange={e => setField("projects", updateEntry(form.projects, idx, { description: e.target.value }))}
                    />
                  </Field>
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" className="w-full gap-2 border-dashed"
                onClick={() => setField("projects", [...form.projects, emptyProject()])}>
                <Plus className="h-3.5 w-3.5" /> Add Project
              </Button>
            </FormSection>

            {/* ─ Certifications ─ */}
            <FormSection title="Certifications" icon={<Award className="h-4 w-4" />} defaultOpen={false}>
              {form.certifications.map((cert, idx) => (
                <div key={idx} className="relative space-y-3 p-3 border border-border/50 rounded-lg bg-muted/20">
                  {form.certifications.length > 1 && (
                    <button type="button" onClick={() => setField("certifications", removeEntry(form.certifications, idx))}
                      className="absolute top-2 right-2 text-muted-foreground hover:text-destructive transition-colors">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                  <Row className="grid-cols-2">
                    <Field label="Certificate Name">
                      <Input placeholder="AWS Cloud Practitioner" value={cert.name}
                        onChange={e => setField("certifications", updateEntry(form.certifications, idx, { name: e.target.value }))} />
                    </Field>
                    <Field label="Issuing Organization">
                      <Input placeholder="Amazon Web Services" value={cert.issuer}
                        onChange={e => setField("certifications", updateEntry(form.certifications, idx, { issuer: e.target.value }))} />
                    </Field>
                  </Row>
                  <Row className="grid-cols-2">
                    <Field label="Date">
                      <Input placeholder="Mar 2024" value={cert.date}
                        onChange={e => setField("certifications", updateEntry(form.certifications, idx, { date: e.target.value }))} />
                    </Field>
                    <Field label="Credential URL">
                      <Input placeholder="https://credly.com/..." value={cert.url ?? ""}
                        onChange={e => setField("certifications", updateEntry(form.certifications, idx, { url: e.target.value }))} />
                    </Field>
                  </Row>
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" className="w-full gap-2 border-dashed"
                onClick={() => setField("certifications", [...form.certifications, emptyCertification()])}>
                <Plus className="h-3.5 w-3.5" /> Add Certification
              </Button>
            </FormSection>

            {/* ─ Skills ─ */}
            <FormSection title="Technical Skills" icon={<Wrench className="h-4 w-4" />} defaultOpen={false}>
              <p className="text-xs text-muted-foreground -mt-2">Each row = one category. Skills are comma-separated.</p>
              {form.skillGroups.map((group, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <Input
                    placeholder="Category"
                    className="w-28 shrink-0 text-sm"
                    value={group.category}
                    onChange={e => setField("skillGroups", updateEntry(form.skillGroups, idx, { category: e.target.value }))}
                  />
                  <Input
                    placeholder="Python, React, PostgreSQL, Docker..."
                    className="flex-1 text-sm"
                    value={group.skills}
                    onChange={e => setField("skillGroups", updateEntry(form.skillGroups, idx, { skills: e.target.value }))}
                  />
                  {form.skillGroups.length > 1 && (
                    <button type="button" onClick={() => setField("skillGroups", removeEntry(form.skillGroups, idx))}
                      className="text-muted-foreground hover:text-destructive transition-colors shrink-0">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" className="w-full gap-2 border-dashed"
                onClick={() => setField("skillGroups", [...form.skillGroups, emptySkillGroup()])}>
                <Plus className="h-3.5 w-3.5" /> Add Skill Category
              </Button>
            </FormSection>

          </div>
        </div>

        {/* ── RIGHT: Live Preview ── */}
        <div className="flex-1 overflow-auto bg-muted/40 p-4 md:p-8">
          <div className="mx-auto max-w-[680px]">
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs text-muted-foreground">Live preview — updates as you type</p>
              <Badge variant="outline" className="text-[10px] gap-1">
                <FileText className="h-3 w-3" /> LaTeX Style
              </Badge>
            </div>
            <LivePreview data={form} />
            <p className="text-center text-[11px] text-muted-foreground mt-4">
              Generated by <span className="font-medium text-foreground">PlaceTrix</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
