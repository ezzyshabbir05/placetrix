"use client"

// app/resume/ResumeGeneratorClient.tsx

import {
  useState,
  useRef,
  useCallback,
  useLayoutEffect,
  memo,
} from "react"
import { AnimatePresence, LazyMotion, domAnimation, m } from "framer-motion"
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core"
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import {
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  GripVertical,
  RotateCcw,
  FileText,
  Printer,
  Eye,
  Sparkles,
  Mail,
  Phone,
  MapPin,
  Linkedin,
  Github,
  Globe,
  CheckCircle2,
  User,
  Briefcase,
  GraduationCap,
  Code2,
  FolderGit2,
  Award,
  Palette,
} from "lucide-react"

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

interface PersonalInfo {
  fullName: string; email: string; phone: string; location: string
  linkedin: string; github: string; portfolio: string; tagline: string
}
interface ExperienceItem {
  id: string; company: string; title: string; location: string
  startDate: string; endDate: string; current: boolean; bullets: string[]
}
interface EducationItem {
  id: string; institution: string; degree: string; field: string
  location: string; startDate: string; endDate: string; gpa: string; honors: string
}
interface SkillCategory { id: string; category: string; skills: string }
interface ProjectItem {
  id: string; name: string; techStack: string; dateRange: string
  liveUrl: string; repoUrl: string; bullets: string[]
}
interface CertificationItem { id: string; name: string; issuer: string; date: string; credentialId: string }

interface ResumeData {
  personal: PersonalInfo
  summaryEnabled: boolean; summaryContent: string
  experience: ExperienceItem[]; education: EducationItem[]
  skills: SkillCategory[]; projects: ProjectItem[]
  certifications: CertificationItem[]; sectionOrder: string[]
}
interface ResumeConfig {
  font: "garamond" | "palatino" | "lato"
  fontSize: number; marginPx: number; accentColor: string; thickRule: boolean
}

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

const A4_W = 794
const A4_H = 1123

const FONT_STACK: Record<string, string> = {
  garamond: '"EB Garamond", Garamond, Georgia, serif',
  palatino: '"Palatino Linotype", Palatino, "Book Antiqua", Georgia, serif',
  lato: '"Lato", "Helvetica Neue", Arial, sans-serif',
}

const FONT_DISPLAY: Record<string, string> = {
  garamond: "EB Garamond",
  palatino: "Palatino",
  lato: "Lato",
}

const ACCENT_PRESETS = [
  "#1a1a2e", "#0f3460", "#1b4332", "#6b21a8",
  "#7f1d1d", "#374151", "#0c4a6e", "#713f12",
]

function uid() { return Math.random().toString(36).slice(2, 9) }

// ─────────────────────────────────────────────────────────────────────────────
// STEP CONFIG
// ─────────────────────────────────────────────────────────────────────────────

type StepId = "personal" | "experience" | "education" | "skills" | "projects" | "certifications" | "style"

interface StepConfig {
  id: StepId; label: string; description: string
  icon: React.ReactNode; optional?: boolean
}

const STEPS: StepConfig[] = [
  { id: "personal", label: "Personal Info", description: "Contact details and summary", icon: <User className="size-4" /> },
  { id: "experience", label: "Experience", description: "Work history and achievements", icon: <Briefcase className="size-4" /> },
  { id: "education", label: "Education", description: "Degrees and academic background", icon: <GraduationCap className="size-4" /> },
  { id: "skills", label: "Skills", description: "Technical skills by category", icon: <Code2 className="size-4" /> },
  { id: "projects", label: "Projects", description: "Side projects and open-source", icon: <FolderGit2 className="size-4" />, optional: true },
  { id: "certifications", label: "Certifications", description: "Professional credentials", icon: <Award className="size-4" />, optional: true },
  { id: "style", label: "Style & Layout", description: "Typography, colors, section order", icon: <Palette className="size-4" /> },
]

// ─────────────────────────────────────────────────────────────────────────────
// DEFAULTS
// ─────────────────────────────────────────────────────────────────────────────

function makeEmpty(): ResumeData {
  return {
    personal: { fullName: "", email: "", phone: "", location: "", linkedin: "", github: "", portfolio: "", tagline: "" },
    summaryEnabled: true, summaryContent: "",
    experience: [{ id: uid(), company: "", title: "", location: "", startDate: "", endDate: "", current: false, bullets: [""] }],
    education: [{ id: uid(), institution: "", degree: "", field: "", location: "", startDate: "", endDate: "", gpa: "", honors: "" }],
    skills: [
      { id: uid(), category: "Languages", skills: "" },
      { id: uid(), category: "Frameworks", skills: "" },
      { id: uid(), category: "Tools", skills: "" },
    ],
    projects: [{ id: uid(), name: "", techStack: "", dateRange: "", liveUrl: "", repoUrl: "", bullets: [""] }],
    certifications: [{ id: uid(), name: "", issuer: "", date: "", credentialId: "" }],
    sectionOrder: ["summary", "experience", "education", "skills", "projects", "certifications"],
  }
}

const DEFAULT_CONFIG: ResumeConfig = {
  font: "garamond", fontSize: 11, marginPx: 48, accentColor: "#1a1a2e", thickRule: false,
}

// ─────────────────────────────────────────────────────────────────────────────
// STEP COMPLETION
// ─────────────────────────────────────────────────────────────────────────────

// ✅ FIX: Accept visitedSteps so "style" is only marked done after visiting
function isStepDone(id: StepId, data: ResumeData, visitedSteps: Set<StepId>): boolean {
  switch (id) {
    case "personal": return !!(data.personal.fullName.trim() && data.personal.email.trim() && data.personal.phone.trim() && data.personal.location.trim())
    case "experience": return data.experience.some((e) => e.company.trim() && e.title.trim())
    case "education": return data.education.some((e) => e.institution.trim())
    case "skills": return data.skills.some((s) => s.skills.trim())
    case "projects": return data.projects.some((p) => p.name.trim())
    case "certifications": return data.certifications.some((c) => c.name.trim())
    case "style": return visitedSteps.has("style") // ✅ FIX: only done after visiting
  }
}

function overallCompletion(data: ResumeData, visitedSteps: Set<StepId>): number {
  const required: StepId[] = ["personal", "experience", "education", "skills"]
  return Math.round(required.filter((id) => isStepDone(id, data, visitedSteps)).length / required.length * 100)
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function Req() { return <span className="text-destructive ml-0.5">*</span> }

// ─────────────────────────────────────────────────────────────────────────────
// TIP CARD
// ─────────────────────────────────────────────────────────────────────────────

function TipCard({ tips }: { tips: string[] }) {
  return (
    <div className="border rounded-lg p-4 bg-amber-50/50 dark:bg-amber-950/20 border-amber-200/60 dark:border-amber-800/40">
      <p className="text-sm font-medium flex items-center gap-1.5 mb-2 text-amber-800 dark:text-amber-400">
        <Sparkles className="size-3.5" /> Tips
      </p>
      <ul className="text-sm text-amber-900/70 dark:text-amber-300/70 space-y-1 list-disc list-inside leading-relaxed">
        {tips.map((tip) => <li key={tip}>{tip}</li>)}
      </ul>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// SORTABLE COLLAPSIBLE ENTRY
// ─────────────────────────────────────────────────────────────────────────────

function SortableCollapsibleEntry({
  id, title, subtitle, canRemove = true, onRemove, defaultOpen = false, children,
}: {
  id: string; title: string; subtitle?: string; canRemove?: boolean
  onRemove: () => void; defaultOpen?: boolean; children: React.ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, zIndex: isDragging ? 50 : undefined, opacity: isDragging ? 0.5 : 1 }}
    >
      <div className="flex items-center gap-2 px-3 py-2.5 hover:bg-muted/50 transition-colors select-none">
        <button
          type="button"
          className="cursor-grab active:cursor-grabbing touch-none p-0.5 text-muted-foreground/40 hover:text-muted-foreground transition-colors shrink-0"
          aria-label="Drag to reorder"
          {...attributes} {...listeners}
        >
          <GripVertical className="size-3.5" />
        </button>

        <div className="flex flex-1 items-center gap-2 min-w-0">
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setOpen((v) => !v) } }}
            className="flex-1 min-w-0 cursor-pointer text-left focus:outline-none"
          >
            <p className="text-sm font-medium truncate leading-tight">{title || "Untitled"}</p>
            {subtitle && <p className="text-xs text-muted-foreground truncate leading-tight mt-0.5">{subtitle}</p>}
          </button>

          <div className="flex items-center gap-1 shrink-0">
            {canRemove && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onRemove() }}
                aria-label="Remove entry"
                className="size-7 flex items-center justify-center rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
              >
                <Trash2 className="size-3.5" />
              </button>
            )}
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-label={open ? "Collapse" : "Expand"}
              className="size-7 flex items-center justify-center rounded-md hover:bg-muted text-muted-foreground transition-colors"
            >
              {open ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
            </button>
          </div>
        </div>
      </div>

      <div className={cn("grid transition-all duration-200 ease-in-out", open ? "grid-rows-[1fr]" : "grid-rows-[0fr]")}>
        <div className="overflow-hidden">
          <div className="px-4 pb-4 pt-2 bg-muted/20 space-y-4">
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// ENTRY LIST CONTAINER
// ─────────────────────────────────────────────────────────────────────────────

function EntryListContainer({ children }: { children: React.ReactNode }) {
  return (
    <div className="border rounded-lg overflow-hidden divide-y divide-border bg-background">
      {children}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// SORTABLE SECTION ROW (style tab)
// ─────────────────────────────────────────────────────────────────────────────

function SortableSectionRow({ id, label }: { id: string; label: string }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, zIndex: isDragging ? 50 : undefined, opacity: isDragging ? 0.5 : 1 }}
      className="flex items-center gap-2 px-3 py-2.5 border rounded-lg bg-muted/30"
    >
      <button
        type="button"
        className="cursor-grab active:cursor-grabbing touch-none text-muted-foreground/50 hover:text-muted-foreground transition-colors"
        aria-label="Drag to reorder"
        {...attributes} {...listeners}
      >
        <GripVertical className="size-4" />
      </button>
      <span className="text-sm font-medium capitalize">{label}</span>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// BULLET EDITOR
// ─────────────────────────────────────────────────────────────────────────────

function BulletEditor({ bullets, onChange, placeholder = "Add a bullet point..." }: {
  bullets: string[]; onChange: (b: string[]) => void; placeholder?: string
}) {
  const idsRef = useRef<string[]>([])

  if (bullets.length === 0) {
    idsRef.current = []
  } else {
    if (idsRef.current.length > bullets.length) {
      idsRef.current = idsRef.current.slice(0, bullets.length)
    } else {
      while (idsRef.current.length < bullets.length) {
        idsRef.current.push(uid())
      }
    }
  }

  return (
    <div className="space-y-2">
      <Label>Bullet Points</Label>
      <div className="space-y-2">
        {bullets.map((b, i) => {
          const key = idsRef.current[i] || (idsRef.current[i] = uid())
          return (
            <div key={key} className="flex items-start gap-2">
              <span className="mt-2.5 text-muted-foreground text-xs shrink-0 font-bold">•</span>
              <Textarea
                rows={2} value={b} placeholder={placeholder}
                onChange={(e) => { const next = [...bullets]; next[i] = e.target.value; onChange(next) }}
                className="flex-1 min-w-0 text-sm resize-none"
              />
              <button
                type="button"
                onClick={() => {
                  idsRef.current.splice(i, 1)
                  onChange(bullets.filter((_, j) => j !== i))
                }}
                aria-label="Remove bullet"
                className="mt-2 size-7 flex items-center justify-center shrink-0 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
              >
                <Trash2 className="size-3.5" />
              </button>
            </div>
          )
        })}
      </div>
      <Button
        type="button" variant="outline" size="sm" className="border-dashed w-full"
        onClick={() => {
          idsRef.current.push(uid())
          onChange([...bullets, ""])
        }}
      >
        <Plus className="size-3.5 mr-1.5" /> Add Bullet
      </Button>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// RESUME DOCUMENT
// ─────────────────────────────────────────────────────────────────────────────

const getSectionTitleStyle = (base: React.CSSProperties, thickRule: boolean, acc: string): React.CSSProperties => ({
  ...base,
  fontWeight: 700,
  letterSpacing: "0.07em",
  textTransform: "uppercase",
  color: thickRule ? acc : "#222",
  borderBottom: thickRule ? `2px solid ${acc}` : "1px solid #333",
  paddingBottom: thickRule ? 3 : 2,
  marginTop: 10,
  marginBottom: 5,
})

function SectionTitle({ label, base, thickRule, accentColor }: { label: string; base: React.CSSProperties; thickRule: boolean; accentColor: string }) {
  return (
    <div style={getSectionTitleStyle(base, thickRule, accentColor)}>
      {label}
    </div>
  )
}

function Row({ left, bold, italic, right, base, fs }: { left?: string; bold?: boolean; italic?: boolean; right?: string; base: React.CSSProperties; fs: number }) {
  if (!left && !right) return null
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
      {left && <span style={{ ...base, fontWeight: bold ? 700 : 400, fontStyle: italic ? "italic" : "normal", minWidth: 0, flexShrink: 1 }}>{left}</span>}
      {right && <span style={{ ...base, fontSize: fs * 0.9, color: "#555", flexShrink: 0, whiteSpace: "nowrap" }}>{right}</span>}
    </div>
  )
}

function Bullets({ items, base }: { items: string[]; base: React.CSSProperties }) {
  const clean = items.filter(Boolean)
  if (!clean.length) return null
  return (
    <ul style={{ margin: "3px 0 0 16px", padding: 0, listStyleType: "disc" }}>
      {clean.map((b) => <li key={b} style={{ ...base, marginBottom: 1.5 }}>{b}</li>)}
    </ul>
  )
}

const emptyStateStyle: React.CSSProperties = {
  position: "absolute",
  inset: 0,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: 12,
  color: "#d1d5db",
  pointerEvents: "none",
  userSelect: "none",
}

const ResumeDocument = memo(function ResumeDocument({ data, config }: { data: ResumeData; config: ResumeConfig }) {
  const { personal, summaryEnabled, summaryContent, experience, education, skills, projects, certifications, sectionOrder } = data
  const fs = config.fontSize
  const font = FONT_STACK[config.font]
  const acc = config.accentColor
  const mg = config.marginPx
  const base: React.CSSProperties = { fontFamily: font, fontSize: fs, lineHeight: 1.42, color: "#111" }

  function renderSection(key: string): React.ReactNode {
    switch (key) {
      case "summary":
        if (!summaryEnabled || !summaryContent.trim()) return null
        return <div key="summary"><SectionTitle label="Summary" base={base} thickRule={config.thickRule} accentColor={acc} /><p style={{ ...base, margin: 0 }}>{summaryContent}</p></div>

      case "experience": {
        const items = experience.filter((e) => e.company || e.title)
        if (!items.length) return null
        return (
          <div key="experience"><SectionTitle label="Experience" base={base} thickRule={config.thickRule} accentColor={acc} />
            {items.map((exp, idx) => (
              <div key={exp.id} style={{ marginBottom: idx < items.length - 1 ? 8 : 0 }}>
                <Row left={exp.company} bold right={[exp.startDate, exp.current ? "Present" : exp.endDate].filter(Boolean).join(" – ")} base={base} fs={fs} />
                {(exp.title || exp.location) && <Row left={exp.title} italic right={exp.location} base={base} fs={fs} />}
                <Bullets items={exp.bullets} base={base} />
              </div>
            ))}
          </div>
        )
      }

      case "education": {
        const items = education.filter((e) => e.institution)
        if (!items.length) return null
        return (
          <div key="education"><SectionTitle label="Education" base={base} thickRule={config.thickRule} accentColor={acc} />
            {items.map((edu, idx) => (
              <div key={edu.id} style={{ marginBottom: idx < items.length - 1 ? 8 : 0 }}>
                <Row left={edu.institution} bold right={[edu.startDate, edu.endDate].filter(Boolean).join(" – ")} base={base} fs={fs} />
                {(edu.degree || edu.field || edu.location) && <Row left={[edu.degree, edu.field].filter(Boolean).join(", ") + (edu.honors ? ` · ${edu.honors}` : "")} italic right={edu.location} base={base} fs={fs} />}
                {edu.gpa && <p style={{ ...base, margin: "1px 0 0", fontSize: fs * 0.9, color: "#444" }}>GPA: {edu.gpa}</p>}
              </div>
            ))}
          </div>
        )
      }

      case "skills": {
        const items = skills.filter((s) => s.skills.trim())
        if (!items.length) return null
        return (
          <div key="skills"><SectionTitle label="Skills" base={base} thickRule={config.thickRule} accentColor={acc} />
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              {items.map((cat) => (
                <div key={cat.id} style={{ ...base, display: "flex", gap: 5 }}>
                  {cat.category && <span style={{ fontWeight: 700, flexShrink: 0 }}>{cat.category}:</span>}
                  <span>{cat.skills}</span>
                </div>
              ))}
            </div>
          </div>
        )
      }

      case "projects": {
        const items = projects.filter((p) => p.name)
        if (!items.length) return null
        return (
          <div key="projects"><SectionTitle label="Projects" base={base} thickRule={config.thickRule} accentColor={acc} />
            {items.map((proj, idx) => (
              <div key={proj.id} style={{ marginBottom: idx < items.length - 1 ? 8 : 0 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
                  <span style={{ ...base, fontWeight: 700 }}>
                    {proj.name}
                    {proj.liveUrl && <a href={proj.liveUrl.startsWith("http") ? proj.liveUrl : `https://${proj.liveUrl}`} style={{ color: acc, fontWeight: 400, fontSize: fs * 0.85, marginLeft: 4, textDecoration: "none" }}>[Live]</a>}
                    {proj.repoUrl && <a href={proj.repoUrl.startsWith("http") ? proj.repoUrl : `https://${proj.repoUrl}`} style={{ color: acc, fontWeight: 400, fontSize: fs * 0.85, marginLeft: 4, textDecoration: "none" }}>[Code]</a>}
                  </span>
                  {proj.dateRange && <span style={{ ...base, fontSize: fs * 0.9, color: "#555", flexShrink: 0 }}>{proj.dateRange}</span>}
                </div>
                {proj.techStack && <p style={{ ...base, fontStyle: "italic", margin: 0 }}>{proj.techStack}</p>}
                <Bullets items={proj.bullets} base={base} />
              </div>
            ))}
          </div>
        )
      }

      case "certifications": {
        const items = certifications.filter((c) => c.name)
        if (!items.length) return null
        return (
          <div key="certifications"><SectionTitle label="Certifications" base={base} thickRule={config.thickRule} accentColor={acc} />
            {items.map((cert, idx) => (
              <div key={cert.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8, marginBottom: idx < items.length - 1 ? 3 : 0 }}>
                <span style={base}>
                  <span style={{ fontWeight: 700 }}>{cert.name}</span>
                  {cert.issuer && <span style={{ fontStyle: "italic" }}>{" · "}{cert.issuer}</span>}
                  {cert.credentialId && <span style={{ fontSize: fs * 0.88, color: "#666" }}>{" · ID: "}{cert.credentialId}</span>}
                </span>
                {cert.date && <span style={{ ...base, fontSize: fs * 0.9, color: "#555", flexShrink: 0 }}>{cert.date}</span>}
              </div>
            ))}
          </div>
        )
      }

      default: return null
    }
  }

  const contactParts: string[] = []
  if (personal.email) contactParts.push(personal.email)
  if (personal.phone) contactParts.push(personal.phone)
  if (personal.location) contactParts.push(personal.location)
  if (personal.linkedin) contactParts.push(personal.linkedin.replace(/^https?:\/\/(www\.)?/i, ""))
  if (personal.github) contactParts.push(personal.github.replace(/^https?:\/\/(www\.)?/i, ""))
  if (personal.portfolio) contactParts.push(personal.portfolio.replace(/^https?:\/\/(www\.)?/i, ""))
  const empty = !personal.fullName && !personal.email

  return (
    <div id="resume-doc" style={{ width: A4_W, minHeight: A4_H, background: "#fff", padding: `${mg}px`, boxSizing: "border-box", position: "relative", ...base }}>
      {empty && (
        <div style={emptyStateStyle}>
          <FileText size={56} strokeWidth={1} />
          <span style={{ fontFamily: font, fontSize: 13, letterSpacing: "0.04em" }}>Fill in the form to see your resume</span>
        </div>
      )}
      {personal.fullName && (
        <div style={{ textAlign: "center", marginBottom: 10 }}>
          <div style={{ fontFamily: font, fontSize: fs * 2.5, fontWeight: 700, letterSpacing: "0.01em", color: acc, lineHeight: 1.1, marginBottom: personal.tagline ? 3 : 5 }}>{personal.fullName}</div>
          {personal.tagline && <div style={{ fontFamily: font, fontSize: fs * 0.95, fontStyle: "italic", color: "#555", marginBottom: 5 }}>{personal.tagline}</div>}
          {contactParts.length > 0 && (
            <div style={{ fontFamily: font, fontSize: fs * 0.88, color: "#444", lineHeight: 1.5 }}>
              {contactParts.map((p) => (
                <span key={p}>{contactParts.indexOf(p) > 0 && <span style={{ margin: "0 5px", color: "#bbb" }}>|</span>}{p}</span>
              ))}
            </div>
          )}
          <div style={{ borderTop: `1.5px solid ${acc}`, marginTop: 8 }} />
        </div>
      )}
      <div style={{ display: "flex", flexDirection: "column" }}>
        {sectionOrder.map((key) => renderSection(key))}
      </div>
    </div>
  )
})

// ─────────────────────────────────────────────────────────────────────────────
// SCALED PREVIEW
// ─────────────────────────────────────────────────────────────────────────────

function ScaledPreview({ data, config }: { data: ResumeData; config: ResumeConfig }) {
  const outerRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)
  useLayoutEffect(() => {
    const el = outerRef.current
    if (!el) return
    const measure = () => { const w = el.getBoundingClientRect().width; if (w > 0) setScale(w / A4_W) }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  return (
    <div ref={outerRef} style={{ width: "100%", height: A4_H * scale, overflow: "hidden", position: "relative" }}>
      <div style={{ width: A4_W, transformOrigin: "top left", transform: `scale(${scale})`, pointerEvents: "none", userSelect: "none" }}>
        <ResumeDocument data={data} config={config} />
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// PDF EXPORT
// ─────────────────────────────────────────────────────────────────────────────

function exportToPDF(data: ResumeData, config: ResumeConfig) {
  const el = document.getElementById("resume-doc")
  if (!el) { toast.error("Open the preview first, then export."); return }
  const fontQuery =
    config.font === "garamond" ? "EB+Garamond:ital,wght@0,400;0,500;0,700;1,400;1,500"
      : config.font === "lato" ? "Lato:ital,wght@0,300;0,400;0,700;1,400" : null
  const fontLink = fontQuery ? `<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=${fontQuery}&display=swap">` : ""
  const win = window.open("", "_blank")
  if (!win) { toast.error("Please allow pop-ups to export PDF."); return }
  win.document.write(`<!DOCTYPE html><html lang="en"><head>
  <meta charset="UTF-8"/><title>${data.personal.fullName || "Resume"}</title>${fontLink}
  <style>@page{size:A4;margin:0}*{box-sizing:border-box}html,body{margin:0;padding:0;background:#fff;-webkit-print-color-adjust:exact;print-color-adjust:exact}#wrap{width:210mm;min-height:297mm}a{color:inherit;text-decoration:none}@media print{html,body{width:210mm}}</style>
  </head><body><div id="wrap">${el.outerHTML}</div>
  <script>window.onload=function(){document.fonts.ready.then(function(){setTimeout(function(){window.print()},300)})}<\/script>
  </body></html>`)
  win.document.close()
}

// ─────────────────────────────────────────────────────────────────────────────
// PREVIEW SHEET
// ─────────────────────────────────────────────────────────────────────────────

const PreviewSheetContent = memo(function PreviewSheetContent({ data, config, onExport }: {
  data: ResumeData; config: ResumeConfig; onExport: () => void
}) {
  return (
    <>
      <SheetHeader className="px-4 pt-4 pb-3 shrink-0 border-b">
        <SheetTitle className="text-base flex items-center gap-2"><Eye className="size-4" /> Resume Preview</SheetTitle>
      </SheetHeader>
      <div className="flex-1 overflow-y-auto px-4 pt-4 pb-3">
        <div className="rounded-xl border bg-[#e4e7eb] p-3 md:p-5">
          <div className="shadow-2xl rounded-sm overflow-hidden">
            <ScaledPreview data={data} config={config} />
          </div>
        </div>
      </div>
      <div className="px-4 pb-5 pt-3 border-t shrink-0">
        <Button className="w-full h-10 gap-2" onClick={onExport}>
          <Printer className="size-4" /> Export as PDF
        </Button>
      </div>
    </>
  )
})

// ─────────────────────────────────────────────────────────────────────────────
// FLOATING ACTION BAR
// ─────────────────────────────────────────────────────────────────────────────

function ResumeFloatingBar({
  completion, onPreview, onExport, onReset,
}: {
  completion: number
  onPreview: () => void
  onExport: () => void
  onReset: () => void
}) {
  return (
    <LazyMotion features={domAnimation}>
      <AnimatePresence>
        <m.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="fixed bottom-0 left-0 right-0 z-50 md:bottom-6 md:left-1/2 md:right-auto md:-translate-x-1/2 md:w-auto"
        >
          {/* Mobile */}
          <div className="flex items-center justify-between gap-3 w-full px-4 py-3 border-t border-border bg-background/95 backdrop-blur-md md:hidden">
            <p className="text-sm text-muted-foreground truncate">Manage your resume</p>
            <div className="flex items-center gap-2 shrink-0">
              <Button size="sm" onClick={onPreview} className="h-9 gap-1.5">
                <Eye className="size-3.5" />
                <span>Preview</span>
              </Button>
            </div>
          </div>

          {/* Desktop */}
          <div className="hidden md:flex items-center gap-3 px-4 py-3 rounded-xl border border-border bg-background/80 shadow-lg backdrop-blur-md whitespace-nowrap">
            <span className="text-sm text-muted-foreground">Manage your resume</span>
            <div className="flex items-center gap-2">
              <Button size="sm" onClick={onPreview} className="h-8 gap-1.5">
                <Eye className="size-3.5" />
                Preview & Export
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-muted-foreground hover:text-foreground">
                    <RotateCcw className="size-3.5" /> Reset
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Reset resume data?</AlertDialogTitle>
                    <AlertDialogDescription>This will clear all fields and restore defaults. This action cannot be undone.</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={onReset}>Reset</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </m.div>
      </AnimatePresence>
    </LazyMotion>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// STEP HEADER
// ─────────────────────────────────────────────────────────────────────────────

function StepHeader({ step, index, isActive, isDone, onClick }: {
  step: StepConfig; index: number; isActive: boolean
  isDone: boolean; onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-4 px-5 py-4 text-left transition-colors cursor-pointer",
        isActive && "bg-primary/5",
        !isActive && "hover:bg-muted/40",
      )}
    >
      <div className={cn(
        "size-8 rounded-full flex items-center justify-center shrink-0 text-sm font-semibold border-2 transition-all",
        isDone && !isActive && "bg-emerald-500 border-emerald-500 text-white",
        isActive && "border-primary text-primary bg-primary/10",
        !isDone && !isActive && "border-muted-foreground/30 text-muted-foreground",
      )}>
        {isDone && !isActive ? <CheckCircle2 className="size-4" /> : <span>{index + 1}</span>}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={cn("text-sm font-semibold", isActive || isDone ? "text-foreground" : "text-muted-foreground")}>
            {step.label}
          </span>
          {step.optional && (
            <span className="text-xs text-muted-foreground border rounded-full px-1.5 py-0.5 leading-none">optional</span>
          )}
          {isDone && !isActive && (
            <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">Complete</span>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-0.5 truncate">{step.description}</p>
      </div>
      <div className="shrink-0 text-muted-foreground">
        {isActive ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
      </div>
    </button>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// STEP FOOTER
// ─────────────────────────────────────────────────────────────────────────────

function StepFooter({ isLast, isDone, onContinue, onSkip }: {
  isLast: boolean; isDone: boolean; onContinue: () => void; onSkip?: () => void
}) {
  return (
    <div className="flex items-center justify-between pt-4 mt-2 border-t gap-3">
      {onSkip
        ? <Button type="button" variant="ghost" size="sm" className="text-muted-foreground" onClick={onSkip}>Skip for now</Button>
        : <div />
      }
      <Button type="button" size="sm" className="gap-2 min-w-[140px] justify-center" onClick={onContinue}>
        {isLast
          ? <><Eye className="size-3.5" /> Preview & Export</>
          : isDone
            ? <>Save & Continue <ChevronRight className="size-3.5" /></>
            : <>Continue anyway <ChevronRight className="size-3.5" /></>
        }
      </Button>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

export function ResumeGeneratorClient() {
  const [data, setData] = useState<ResumeData>(() => makeEmpty())
  const [config, setConfig] = useState<ResumeConfig>(DEFAULT_CONFIG)
  const [activeStep, setActiveStep] = useState<StepId | null>("personal")
  const [previewOpen, setPreviewOpen] = useState(false)
  // ✅ FIX: Track which steps the user has actually visited
  const [visitedSteps, setVisitedSteps] = useState<Set<StepId>>(new Set())
  const stepRefs = useRef<Record<string, HTMLDivElement | null>>({})

  const completion = overallCompletion(data, visitedSteps)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  // ── Step navigation ───────────────────────────────────────────────────────

  function goToStep(id: StepId) {
    setActiveStep(id)
    // ✅ FIX: Mark step as visited when navigated to
    setVisitedSteps((prev) => new Set(prev).add(id))
    setTimeout(() => {
      const el = stepRefs.current[id]
      if (!el) return
      const top = el.getBoundingClientRect().top + window.scrollY - 16
      window.scrollTo({ top, behavior: "smooth" })
    }, 60)
  }

  function goNext() {
    const idx = STEPS.findIndex((s) => s.id === activeStep)
    if (idx >= 0 && idx < STEPS.length - 1) goToStep(STEPS[idx + 1].id)
    else setPreviewOpen(true)
  }

  function handleStepHeaderClick(id: StepId) {
    if (activeStep === id) {
      setActiveStep(null)
    } else {
      // ✅ FIX: Mark step as visited when user opens it manually
      setVisitedSteps((prev) => new Set(prev).add(id))
      goToStep(id)
    }
  }

  // ── Data updaters ─────────────────────────────────────────────────────────

  const setPersonal = useCallback((k: keyof PersonalInfo, v: string) =>
    setData((d) => ({ ...d, personal: { ...d.personal, [k]: v } })), [])
  const setSummary = useCallback((v: string) => setData((d) => ({ ...d, summaryContent: v })), [])
  const togSummary = useCallback((v: boolean) => setData((d) => ({ ...d, summaryEnabled: v })), [])

  const setExp = useCallback((id: string, k: keyof ExperienceItem, v: any) =>
    setData((d) => ({ ...d, experience: d.experience.map((e) => e.id === id ? { ...e, [k]: v } : e) })), [])
  const addExp = useCallback(() =>
    setData((d) => ({ ...d, experience: [...d.experience, { id: uid(), company: "", title: "", location: "", startDate: "", endDate: "", current: false, bullets: [""] }] })), [])
  const removeExp = useCallback((id: string) =>
    setData((d) => ({ ...d, experience: d.experience.filter((e) => e.id !== id) })), [])

  const setEdu = useCallback((id: string, k: keyof EducationItem, v: any) =>
    setData((d) => ({ ...d, education: d.education.map((e) => e.id === id ? { ...e, [k]: v } : e) })), [])
  const addEdu = useCallback(() =>
    setData((d) => ({ ...d, education: [...d.education, { id: uid(), institution: "", degree: "", field: "", location: "", startDate: "", endDate: "", gpa: "", honors: "" }] })), [])
  const removeEdu = useCallback((id: string) =>
    setData((d) => ({ ...d, education: d.education.filter((e) => e.id !== id) })), [])

  const setSkill = useCallback((id: string, k: keyof SkillCategory, v: string) =>
    setData((d) => ({ ...d, skills: d.skills.map((s) => s.id === id ? { ...s, [k]: v } : s) })), [])
  const addSkill = useCallback(() =>
    setData((d) => ({ ...d, skills: [...d.skills, { id: uid(), category: "", skills: "" }] })), [])
  const removeSkill = useCallback((id: string) =>
    setData((d) => ({ ...d, skills: d.skills.filter((s) => s.id !== id) })), [])

  const setProj = useCallback((id: string, k: keyof ProjectItem, v: any) =>
    setData((d) => ({ ...d, projects: d.projects.map((p) => p.id === id ? { ...p, [k]: v } : p) })), [])
  const addProj = useCallback(() =>
    setData((d) => ({ ...d, projects: [...d.projects, { id: uid(), name: "", techStack: "", dateRange: "", liveUrl: "", repoUrl: "", bullets: [""] }] })), [])
  const removeProj = useCallback((id: string) =>
    setData((d) => ({ ...d, projects: d.projects.filter((p) => p.id !== id) })), [])

  const setCert = useCallback((id: string, k: keyof CertificationItem, v: string) =>
    setData((d) => ({ ...d, certifications: d.certifications.map((c) => c.id === id ? { ...c, [k]: v } : c) })), [])
  const addCert = useCallback(() =>
    setData((d) => ({ ...d, certifications: [...d.certifications, { id: uid(), name: "", issuer: "", date: "", credentialId: "" }] })), [])
  const removeCert = useCallback((id: string) =>
    setData((d) => ({ ...d, certifications: d.certifications.filter((c) => c.id !== id) })), [])

  const setConf = useCallback((k: keyof ResumeConfig, v: any) =>
    setConfig((c) => ({ ...c, [k]: v })), [])

  // ── Drag handlers ─────────────────────────────────────────────────────────

  const makeDragEnd = <T extends { id: string }>(key: keyof ResumeData) =>
    (e: DragEndEvent) => {
      const { active, over } = e;
      if (!over || active.id === over.id) return;
      setData(d => {
        const arr = d[key] as unknown as T[];
        const ids = arr.map(x => x.id);
        return {
          ...d,
          [key]: arrayMove(arr, ids.indexOf(String(active.id)), ids.indexOf(String(over.id))),
        };
      });
    };

  const handleExpDragEnd = makeDragEnd<ExperienceItem>("experience")
  const handleEduDragEnd = makeDragEnd<EducationItem>("education")
  const handleSkillDragEnd = makeDragEnd<SkillCategory>("skills")
  const handleProjDragEnd = makeDragEnd<ProjectItem>("projects")
  const handleCertDragEnd = makeDragEnd<CertificationItem>("certifications")

  function handleSectionDragEnd(e: DragEndEvent) {
    const { active, over } = e
    if (!over || active.id === over.id) return
    setData((d) => {
      const oi = d.sectionOrder.indexOf(String(active.id))
      const ni = d.sectionOrder.indexOf(String(over.id))
      return { ...d, sectionOrder: arrayMove(d.sectionOrder, oi, ni) }
    })
  }

  const handleReset = useCallback(() => {
    setData(makeEmpty())
    setConfig(DEFAULT_CONFIG)
    setActiveStep("personal")
    // ✅ FIX: Also reset visited steps on reset
    setVisitedSteps(new Set())
    toast.info("Resume reset to defaults.")
  }, [])

  const handleExportFromSheet = useCallback(() => {
    setPreviewOpen(false)
    setTimeout(() => exportToPDF(data, config), 150)
  }, [data, config])

  // ── Done summary lines ────────────────────────────────────────────────────

  function getDoneSummary(id: StepId): string {
    switch (id) {
      case "personal": return data.personal.fullName ? `${data.personal.fullName} · ${data.personal.email}` : ""
      case "experience": { const n = data.experience.filter((e) => e.company).length; return `${n} position${n !== 1 ? "s" : ""} added` }
      case "education": { const n = data.education.filter((e) => e.institution).length; return `${n} institution${n !== 1 ? "s" : ""} added` }
      case "skills": { const n = data.skills.filter((s) => s.skills.trim()).length; return `${n} skill categor${n !== 1 ? "ies" : "y"} added` }
      case "projects": { const n = data.projects.filter((p) => p.name).length; return `${n} project${n !== 1 ? "s" : ""} added` }
      case "certifications": { const n = data.certifications.filter((c) => c.name).length; return `${n} certification${n !== 1 ? "s" : ""} added` }
      case "style": return `${FONT_DISPLAY[config.font]} · ${config.fontSize}pt · ${config.marginPx === 32 ? "Narrow" : config.marginPx === 64 ? "Wide" : "Normal"} margins`
    }
  }

  // ── Step content ──────────────────────────────────────────────────────────

  function getStepContent(id: StepId) {
    const isLast = STEPS[STEPS.length - 1].id === id
    const done = isStepDone(id, data, visitedSteps)

    switch (id) {

      case "personal": return (
        <div className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Full Name <Req /></Label>
              <Input placeholder="Jane Doe" value={data.personal.fullName} onChange={(e) => setPersonal("fullName", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Professional Tagline</Label>
              <Input placeholder="Full-Stack Engineer · Open to Work" value={data.personal.tagline} onChange={(e) => setPersonal("tagline", e.target.value)} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5"><Mail className="size-3.5" /> Email <Req /></Label>
                <Input type="email" placeholder="jane@example.com" value={data.personal.email} onChange={(e) => setPersonal("email", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5"><Phone className="size-3.5" /> Phone <Req /></Label>
                <Input placeholder="+1 (555) 000-0000" value={data.personal.phone} onChange={(e) => setPersonal("phone", e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5"><MapPin className="size-3.5" /> Location <Req /></Label>
              <Input placeholder="San Francisco, CA" value={data.personal.location} onChange={(e) => setPersonal("location", e.target.value)} />
            </div>
            <Separator />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5"><Linkedin className="size-3.5" /> LinkedIn</Label>
                <Input placeholder="linkedin.com/in/janedoe" value={data.personal.linkedin} onChange={(e) => setPersonal("linkedin", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5"><Github className="size-3.5" /> GitHub</Label>
                <Input placeholder="github.com/janedoe" value={data.personal.github} onChange={(e) => setPersonal("github", e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5"><Globe className="size-3.5" /> Portfolio / Website</Label>
              <Input placeholder="janedoe.dev" value={data.personal.portfolio} onChange={(e) => setPersonal("portfolio", e.target.value)} />
            </div>
          </div>

          <div className="border rounded-lg overflow-hidden">
            <div className="flex items-start justify-between gap-4 px-4 py-3 bg-muted/30">
              <div>
                <p className="text-sm font-medium">Professional Summary</p>
                <p className="text-xs text-muted-foreground mt-0.5">2–4 sentence overview below your name</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs text-muted-foreground">{data.summaryEnabled ? "On" : "Off"}</span>
                <Switch checked={data.summaryEnabled} onCheckedChange={togSummary} />
              </div>
            </div>
            {data.summaryEnabled && (
              <div className="p-4 space-y-2 border-t">
                <Textarea rows={4} placeholder="Experienced software engineer with 5+ years building scalable web applications..."
                  value={data.summaryContent} onChange={(e) => setSummary(e.target.value)} />
                <p className="text-xs text-muted-foreground">{data.summaryContent.trim().split(/\s+/).filter(Boolean).length} words</p>
              </div>
            )}
          </div>

          <TipCard tips={[
            "Include a professional email — avoid nicknames or numbers.",
            "Add LinkedIn and GitHub for extra credibility with tech recruiters.",
            "Keep location to City, State — a full address is unnecessary.",
            'Write your summary without "I" — get straight to your value proposition.',
          ]} />
          <StepFooter isLast={isLast} isDone={done} onContinue={goNext} />
        </div>
      )

      case "experience": return (
        <div className="space-y-4">
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleExpDragEnd}>
            <SortableContext items={data.experience.map((e) => e.id)} strategy={verticalListSortingStrategy}>
              <EntryListContainer>
                {data.experience.map((exp, idx) => (
                  <SortableCollapsibleEntry key={exp.id} id={exp.id}
                    title={exp.company || `Position ${idx + 1}`} subtitle={exp.title}
                    canRemove={data.experience.length > 1} onRemove={() => removeExp(exp.id)} defaultOpen={idx === 0}>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2"><Label>Company <Req /></Label>
                        <Input placeholder="Acme Corp" value={exp.company} onChange={(e) => setExp(exp.id, "company", e.target.value)} /></div>
                      <div className="space-y-2"><Label>Job Title <Req /></Label>
                        <Input placeholder="Software Engineer" value={exp.title} onChange={(e) => setExp(exp.id, "title", e.target.value)} /></div>
                    </div>
                    <div className="space-y-2"><Label>Location</Label>
                      <Input placeholder="New York, NY / Remote" value={exp.location} onChange={(e) => setExp(exp.id, "location", e.target.value)} /></div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2"><Label>Start Date</Label>
                        <Input placeholder="Jan 2022" value={exp.startDate} onChange={(e) => setExp(exp.id, "startDate", e.target.value)} /></div>
                      <div className="space-y-2"><Label>End Date</Label>
                        <Input placeholder="Dec 2024" disabled={exp.current} value={exp.current ? "Present" : exp.endDate}
                          onChange={(e) => setExp(exp.id, "endDate", e.target.value)} />
                        <div className="flex items-center gap-2 mt-1.5">
                          <Checkbox id={`current-${exp.id}`} checked={exp.current} onCheckedChange={(v) => setExp(exp.id, "current", v === true)} />
                          <Label htmlFor={`current-${exp.id}`} className="cursor-pointer text-sm font-normal text-muted-foreground">Currently here</Label>
                        </div>
                      </div>
                    </div>
                    <BulletEditor bullets={exp.bullets} onChange={(b) => setExp(exp.id, "bullets", b)}
                      placeholder="Developed a feature that reduced load time by 40%..." />
                  </SortableCollapsibleEntry>
                ))}
              </EntryListContainer>
            </SortableContext>
          </DndContext>
          <Button variant="outline" className="w-full border-dashed" onClick={addExp}>
            <Plus className="size-4 mr-2" /> Add Experience
          </Button>
          <TipCard tips={[
            "Start each bullet with a strong action verb: Built, Designed, Led, Reduced.",
            "Quantify impact wherever possible — numbers stand out to ATS and recruiters.",
            "Mirror keywords from the job description in your bullet points.",
            "Aim for 3–5 bullets per role; more dilutes impact.",
          ]} />
          <StepFooter isLast={isLast} isDone={done} onContinue={goNext} />
        </div>
      )

      case "education": return (
        <div className="space-y-4">
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleEduDragEnd}>
            <SortableContext items={data.education.map((e) => e.id)} strategy={verticalListSortingStrategy}>
              <EntryListContainer>
                {data.education.map((edu, idx) => (
                  <SortableCollapsibleEntry key={edu.id} id={edu.id}
                    title={edu.institution || `Education ${idx + 1}`}
                    subtitle={[edu.degree, edu.field].filter(Boolean).join(", ")}
                    canRemove={data.education.length > 1} onRemove={() => removeEdu(edu.id)} defaultOpen={idx === 0}>
                    <div className="space-y-2"><Label>Institution <Req /></Label>
                      <Input placeholder="Massachusetts Institute of Technology" value={edu.institution} onChange={(e) => setEdu(edu.id, "institution", e.target.value)} /></div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2"><Label>Degree</Label>
                        <Input placeholder="Bachelor of Science" value={edu.degree} onChange={(e) => setEdu(edu.id, "degree", e.target.value)} /></div>
                      <div className="space-y-2"><Label>Field of Study</Label>
                        <Input placeholder="Computer Science" value={edu.field} onChange={(e) => setEdu(edu.id, "field", e.target.value)} /></div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2"><Label>Start</Label>
                        <Input placeholder="Sep 2018" value={edu.startDate} onChange={(e) => setEdu(edu.id, "startDate", e.target.value)} /></div>
                      <div className="space-y-2"><Label>End</Label>
                        <Input placeholder="May 2022" value={edu.endDate} onChange={(e) => setEdu(edu.id, "endDate", e.target.value)} /></div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2"><Label>Location</Label>
                        <Input placeholder="Cambridge, MA" value={edu.location} onChange={(e) => setEdu(edu.id, "location", e.target.value)} /></div>
                      <div className="space-y-2"><Label>GPA</Label>
                        <Input placeholder="3.9 / 4.0" value={edu.gpa} onChange={(e) => setEdu(edu.id, "gpa", e.target.value)} /></div>
                    </div>
                    <div className="space-y-2"><Label>Honors / Awards</Label>
                      <Input placeholder="Magna Cum Laude, Dean's List" value={edu.honors} onChange={(e) => setEdu(edu.id, "honors", e.target.value)} /></div>
                  </SortableCollapsibleEntry>
                ))}
              </EntryListContainer>
            </SortableContext>
          </DndContext>
          <Button variant="outline" className="w-full border-dashed" onClick={addEdu}>
            <Plus className="size-4 mr-2" /> Add Education
          </Button>
          <TipCard tips={[
            "Include GPA only if it's 3.5 or above — lower GPAs are better left out.",
            "Honors like Dean's List or Magna Cum Laude add real credibility.",
            "For recent grads, education can come before experience in section order.",
          ]} />
          <StepFooter isLast={isLast} isDone={done} onContinue={goNext} />
        </div>
      )

      case "skills": return (
        <div className="space-y-4">
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleSkillDragEnd}>
            <SortableContext items={data.skills.map((s) => s.id)} strategy={verticalListSortingStrategy}>
              <EntryListContainer>
                {data.skills.map((cat, idx) => (
                  <SortableCollapsibleEntry key={cat.id} id={cat.id}
                    title={cat.category || `Category ${idx + 1}`}
                    subtitle={cat.skills ? cat.skills.slice(0, 60) + (cat.skills.length > 60 ? "…" : "") : "No skills added yet"}
                    canRemove={data.skills.length > 1} onRemove={() => removeSkill(cat.id)} defaultOpen>
                    <div className="space-y-2"><Label>Category Name</Label>
                      <Input placeholder="e.g. Languages, Frameworks, Tools" value={cat.category} onChange={(e) => setSkill(cat.id, "category", e.target.value)} /></div>
                    <div className="space-y-2"><Label>Skills (comma-separated)</Label>
                      <Textarea rows={3} placeholder="Python, TypeScript, Go, Rust" value={cat.skills} onChange={(e) => setSkill(cat.id, "skills", e.target.value)} /></div>
                  </SortableCollapsibleEntry>
                ))}
              </EntryListContainer>
            </SortableContext>
          </DndContext>
          <Button variant="outline" className="w-full border-dashed" onClick={addSkill}>
            <Plus className="size-4 mr-2" /> Add Category
          </Button>
          <TipCard tips={[
            "Group skills by category — makes scanning easy for both ATS and humans.",
            "Only list skills you can actually speak to in an interview.",
            "Prioritise skills explicitly mentioned in the job description.",
            "Keep each category to 5–8 skills; a long list looks padded.",
          ]} />
          <StepFooter isLast={isLast} isDone={done} onContinue={goNext} />
        </div>
      )

      case "projects": return (
        <div className="space-y-4">
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleProjDragEnd}>
            <SortableContext items={data.projects.map((p) => p.id)} strategy={verticalListSortingStrategy}>
              <EntryListContainer>
                {data.projects.map((proj, idx) => (
                  <SortableCollapsibleEntry key={proj.id} id={proj.id}
                    title={proj.name || `Project ${idx + 1}`} subtitle={proj.techStack}
                    canRemove={data.projects.length > 1} onRemove={() => removeProj(proj.id)} defaultOpen={idx === 0}>
                    <div className="space-y-2"><Label>Project Name <Req /></Label>
                      <Input placeholder="My Awesome App" value={proj.name} onChange={(e) => setProj(proj.id, "name", e.target.value)} /></div>
                    <div className="space-y-2"><Label>Tech Stack</Label>
                      <Input placeholder="Next.js, Supabase, Tailwind CSS" value={proj.techStack} onChange={(e) => setProj(proj.id, "techStack", e.target.value)} /></div>
                    <div className="space-y-2"><Label>Date Range</Label>
                      <Input placeholder="Jan 2024 – Mar 2024" value={proj.dateRange} onChange={(e) => setProj(proj.id, "dateRange", e.target.value)} /></div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="flex items-center gap-1.5"><Globe className="size-3.5" /> Live URL</Label>
                        <Input placeholder="myapp.vercel.app" value={proj.liveUrl} onChange={(e) => setProj(proj.id, "liveUrl", e.target.value)} /></div>
                      <div className="space-y-2">
                        <Label className="flex items-center gap-1.5"><Github className="size-3.5" /> Repo URL</Label>
                        <Input placeholder="github.com/user/repo" value={proj.repoUrl} onChange={(e) => setProj(proj.id, "repoUrl", e.target.value)} /></div>
                    </div>
                    <BulletEditor bullets={proj.bullets} onChange={(b) => setProj(proj.id, "bullets", b)}
                      placeholder="Built a real-time feature using WebSockets..." />
                  </SortableCollapsibleEntry>
                ))}
              </EntryListContainer>
            </SortableContext>
          </DndContext>
          <Button variant="outline" className="w-full border-dashed" onClick={addProj}>
            <Plus className="size-4 mr-2" /> Add Project
          </Button>
          <TipCard tips={[
            "Include a live URL or GitHub link so recruiters can verify your work.",
            "Describe impact: users, performance gains, or problem solved.",
            "Choose quality over quantity — 2 strong projects beat 5 half-finished ones.",
          ]} />
          <StepFooter isLast={isLast} isDone={done} onContinue={goNext} onSkip={goNext} />
        </div>
      )

      case "certifications": return (
        <div className="space-y-4">
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleCertDragEnd}>
            <SortableContext items={data.certifications.map((c) => c.id)} strategy={verticalListSortingStrategy}>
              <EntryListContainer>
                {data.certifications.map((cert, idx) => (
                  <SortableCollapsibleEntry key={cert.id} id={cert.id}
                    title={cert.name || `Certification ${idx + 1}`} subtitle={cert.issuer}
                    canRemove={data.certifications.length > 1} onRemove={() => removeCert(cert.id)} defaultOpen={idx === 0}>
                    <div className="space-y-2"><Label>Certification Name <Req /></Label>
                      <Input placeholder="AWS Solutions Architect Associate" value={cert.name} onChange={(e) => setCert(cert.id, "name", e.target.value)} /></div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2"><Label>Issuer</Label>
                        <Input placeholder="Amazon Web Services" value={cert.issuer} onChange={(e) => setCert(cert.id, "issuer", e.target.value)} /></div>
                      <div className="space-y-2"><Label>Date</Label>
                        <Input placeholder="Jun 2024" value={cert.date} onChange={(e) => setCert(cert.id, "date", e.target.value)} /></div>
                    </div>
                    <div className="space-y-2"><Label>Credential ID</Label>
                      <Input placeholder="ABC-123-XYZ" value={cert.credentialId} onChange={(e) => setCert(cert.id, "credentialId", e.target.value)} /></div>
                  </SortableCollapsibleEntry>
                ))}
              </EntryListContainer>
            </SortableContext>
          </DndContext>
          <Button variant="outline" className="w-full border-dashed" onClick={addCert}>
            <Plus className="size-4 mr-2" /> Add Certification
          </Button>
          <TipCard tips={[
            "Include the Credential ID so recruiters can verify it instantly.",
            "Only list certifications relevant to the role you're applying for.",
            "Recent certifications (last 3 years) carry significantly more weight.",
          ]} />
          <StepFooter isLast={isLast} isDone={done} onContinue={goNext} onSkip={goNext} />
        </div>
      )

      case "style": return (
        <div className="space-y-6">
          <div className="space-y-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Typography</p>
            <div className="space-y-2">
              <Label htmlFor="font-family-select">Font Family</Label>
              <Select value={config.font} onValueChange={(v) => setConf("font", v)}>
                <SelectTrigger id="font-family-select"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="garamond">EB Garamond: Classic Serif (Recommended)</SelectItem>
                  <SelectItem value="palatino">Palatino: Elegant Serif</SelectItem>
                  <SelectItem value="lato">Lato: Clean Sans-Serif</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="font-size-select">Font Size</Label>
                <Select value={String(config.fontSize)} onValueChange={(v) => setConf("fontSize", Number(v))}>
                  <SelectTrigger id="font-size-select"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10pt (Compact)</SelectItem>
                    <SelectItem value="11">11pt (Standard)</SelectItem>
                    <SelectItem value="12">12pt (Spacious)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="margins-select">Margins</Label>
                <Select value={String(config.marginPx)} onValueChange={(v) => setConf("marginPx", Number(v))}>
                  <SelectTrigger id="margins-select"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="32">Narrow</SelectItem>
                    <SelectItem value="48">Normal</SelectItem>
                    <SelectItem value="64">Wide</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <Separator />

          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Accent Color</p>
            <div className="flex items-center gap-3 flex-wrap">
              {ACCENT_PRESETS.map((color) => (
                <button
                  key={color}
                  type="button"
                  title={color}
                  onClick={() => setConf("accentColor", color)}
                  aria-label={`Select accent color ${color}`}
                  className={cn(
                    "h-7 w-7 rounded-full border-2 transition-all hover:scale-110 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-foreground/30",
                    config.accentColor === color ? "border-foreground scale-110 ring-2 ring-offset-1 ring-foreground/30" : "border-transparent"
                  )}
                  style={{ background: color }}
                />
              ))}
              <label
                title="Custom color"
                aria-label="Custom accent color picker"
                className={cn(
                  "h-7 w-7 rounded-full border-2 cursor-pointer transition-all hover:scale-110 relative overflow-hidden focus-within:ring-2 focus-within:ring-offset-1 focus-within:ring-foreground/30 shrink-0",
                  !ACCENT_PRESETS.includes(config.accentColor)
                    ? "border-foreground scale-110 ring-2 ring-offset-1 ring-foreground/30"
                    : "border-dashed border-muted-foreground/40"
                )}
                style={{ background: !ACCENT_PRESETS.includes(config.accentColor) ? config.accentColor : "conic-gradient(red, yellow, lime, cyan, blue, magenta, red)" }}>
                <input
                  type="color"
                  value={config.accentColor}
                  onChange={(e) => setConf("accentColor", e.target.value)}
                  aria-label="Custom accent color"
                  className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                />
              </label>
            </div>
          </div>

          <Separator />

          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Visual Options</p>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Colored Section Rules</p>
                <p className="text-sm text-muted-foreground mt-0.5">Use accent color for section dividers</p>
              </div>
              <Switch checked={config.thickRule} onCheckedChange={(v) => setConf("thickRule", v)} />
            </div>
          </div>

          <Separator />

          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Section Order</p>
            <p className="text-xs text-muted-foreground">Drag to reorder sections on your resume</p>
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleSectionDragEnd}>
              <SortableContext items={data.sectionOrder} strategy={verticalListSortingStrategy}>
                <div className="space-y-2">
                  {data.sectionOrder.map((section) => (
                    <SortableSectionRow key={section} id={section} label={section} />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          </div>

          <TipCard tips={[
            "Garamond and Palatino are preferred by recruiters for print and PDF.",
            "11pt is the standard size — use 10pt to fit more, 12pt for spacious layouts.",
            "Stick to a dark accent color — avoid bright or neon shades.",
            "Place your strongest section first — experience for seniors, education for fresh grads.",
          ]} />
          <StepFooter isLast={isLast} isDone={done} onContinue={goNext} />
        </div>
      )
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-6 px-4 py-8 md:px-8 pb-24 md:pb-20">

      {/* ── Page Header ── */}
      <div className="flex flex-col gap-1.5">
        <h1 className="text-3xl font-bold font-cirka tracking-tight text-foreground">Resume Builder</h1>
        <p className="text-sm text-muted-foreground">
          Build a professional, ATS-friendly resume
        </p>
      </div>

      {/* ── Accordion steps ── */}
      <div className="space-y-3">
        {STEPS.map((step, idx) => {
          const isActive = activeStep === step.id
          const isDone = isStepDone(step.id, data, visitedSteps)

          return (
            <div
              key={step.id}
              ref={(el) => { stepRefs.current[step.id] = el }}
              className={cn(
                "rounded-xl overflow-hidden transition-all duration-200 border",
                isActive && "shadow-sm",
                isDone && "border-emerald-200/60 dark:border-emerald-800/30",
                !isDone && "border-border",
              )}
            >
              <StepHeader
                step={step}
                index={idx}
                isActive={isActive}
                isDone={isDone}
                onClick={() => handleStepHeaderClick(step.id)}
              />

              <div className={cn(
                "grid transition-all duration-300 ease-in-out",
                isActive ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
              )}>
                <div className="overflow-hidden">
                  {isActive && (
                    <div className="px-5 pb-6 pt-2 border-t">
                      {getStepContent(step.id)}
                    </div>
                  )}
                </div>
              </div>

              {!isActive && isDone && (
                <div className="px-5 py-2 border-t bg-muted/20 flex items-center gap-2">
                  <CheckCircle2 className="size-3 text-emerald-500 shrink-0" />
                  <p className="text-xs text-muted-foreground truncate">{getDoneSummary(step.id)}</p>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* ── Floating action bar ── */}
      <ResumeFloatingBar
        completion={completion}
        onPreview={() => setPreviewOpen(true)}
        onExport={handleExportFromSheet}
        onReset={handleReset}
      />

      {/* ── Preview sheet ── */}
      <Sheet open={previewOpen} onOpenChange={setPreviewOpen}>
        <SheetContent side="right" className="w-full sm:max-w-xl flex flex-col p-0">
          <PreviewSheetContent data={data} config={config} onExport={handleExportFromSheet} />
        </SheetContent>
      </Sheet>

    </div>
  )
}