"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import {
  IconUpload,
  IconFileTypePdf,
  IconFileTypeDocx,
  IconX,
  IconBriefcase,
  IconSparkles,
  IconCheck,
  IconAlertCircle,
  IconBrain,
  IconArrowLeft,
  IconRefresh,
  IconFileText,
  IconTrendingUp,
  IconBulb,
  IconClock,
  IconUser,
  IconBuildingSkyscraper,
  IconTrash,
  IconHistory,
  IconBolt,
  IconArrowRight,
} from "@tabler/icons-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  Attachment,
  AttachmentMedia,
  AttachmentContent,
  AttachmentTitle,
  AttachmentDescription,
  AttachmentActions,
  AttachmentAction,
} from "@/components/ui/attachment"
import { analyzeResumeAction, type AnalysisResult } from "./actions"
import { GenerateButton } from "@/components/others/generate-button"

// ─────────────────────────────────────────────
// localStorage helpers
// ─────────────────────────────────────────────
const HISTORY_KEY = "placetrix_resume_history"

function saveResult(r: AnalysisResult) {
  try {
    saveToHistory(r)
  } catch { }
}

function getHistory(): AnalysisResult[] {
  try {
    const v = localStorage.getItem(HISTORY_KEY)
    return v ? JSON.parse(v) : []
  } catch {
    return []
  }
}

function saveToHistory(r: AnalysisResult) {
  try {
    const history = getHistory()
    const exists = history.some((h) => h.analyzedAt === r.analyzedAt)
    if (!exists) {
      // If there is an entry with the exact same file name and overall score within 10s (re-analyze), replace it
      const dupIdx = history.findIndex(
        (h) => h.fileName === r.fileName && Math.abs(new Date(h.analyzedAt).getTime() - new Date(r.analyzedAt).getTime()) < 10000
      )
      if (dupIdx > -1) {
        history[dupIdx] = r
      } else {
        history.unshift(r)
      }
      localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, 15))) // Keep last 15 reports
    }
  } catch { }
}

// ─────────────────────────────────────────────
// Score colour helpers
// ─────────────────────────────────────────────
function scoreColor(s: number) { return s >= 75 ? "text-emerald-500" : s >= 50 ? "text-amber-500" : "text-rose-500" }
function scoreRingColor(s: number) { return s >= 75 ? "#10b981" : s >= 50 ? "#f59e0b" : "#f43f5e" }
function scoreLabel(s: number) { return s >= 85 ? "Excellent" : s >= 70 ? "Good" : s >= 50 ? "Fair" : "Needs Work" }
function scoreBgClass(s: number) { return s >= 75 ? "bg-emerald-500/10 border-emerald-500/20" : s >= 50 ? "bg-amber-500/10 border-amber-500/20" : "bg-rose-500/10 border-rose-500/20" }
function severityColor(sev: string) { return sev === "High" ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20" : sev === "Medium" ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20" : "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20" }
function severityBorder(sev: string) { return sev === "High" ? "border-rose-500/10" : sev === "Medium" ? "border-amber-500/10" : "border-blue-500/10" }
function impactColor(impact: string) { return impact === "High" ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20" : impact === "Medium" ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20" : "bg-muted text-muted-foreground border-border" }

// ─────────────────────────────────────────────
// Animated circular dial
// ─────────────────────────────────────────────
function ScoreDial({ score, size = 160, label }: { score: number; size?: number; label?: string }) {
  const radius = (size - 20) / 2
  const circumference = 2 * Math.PI * radius
  const [displayed, setDisplayed] = React.useState(0)
  const [dashOffset, setDashOffset] = React.useState(circumference)

  React.useEffect(() => {
    let frame: number
    const start = performance.now()
    const duration = 1200
    const animate = (now: number) => {
      const p = Math.min((now - start) / duration, 1)
      const e = 1 - Math.pow(1 - p, 3)
      setDisplayed(Math.round(e * score))
      setDashOffset(circumference - e * (circumference * (score / 100)))
      if (p < 1) frame = requestAnimationFrame(animate)
    }
    frame = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(frame)
  }, [score, circumference])

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="currentColor" strokeWidth={10} className="text-muted/30" />
          <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={scoreRingColor(score)} strokeWidth={10} strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={dashOffset} style={{ transition: "stroke-dashoffset 0.05s linear" }} />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={cn("text-3xl font-bold tabular-nums", scoreColor(score))}>{displayed}</span>
          <span className="text-xs text-muted-foreground">/100</span>
        </div>
      </div>
      {label && <Badge variant="secondary" className={cn("text-xs font-semibold", scoreColor(score))}>{label}</Badge>}
    </div>
  )
}

// ─────────────────────────────────────────────
// Before / After rewrite card
// ─────────────────────────────────────────────
function RewriteExample({ before, after }: { before: string; after: string }) {
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-border/60 bg-muted/20 p-3">
      <div className="flex flex-col gap-1">
        <span className="text-[10px] font-bold uppercase tracking-widest text-rose-500 font-sans">Before</span>
        <p className="text-xs text-muted-foreground italic leading-relaxed line-through decoration-rose-400/60 font-sans">
          &quot;{before}&quot;
        </p>
      </div>
      <Separator />
      <div className="flex flex-col gap-1">
        <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-500 font-sans">After</span>
        <p className="text-xs text-emerald-700 dark:text-emerald-400 font-medium leading-relaxed font-sans">
          &quot;{after}&quot;
        </p>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// File drop zone
// ─────────────────────────────────────────────
function FileDropZone({ file, onFileChange }: { file: File | null; onFileChange: (f: File | null) => void }) {
  const [dragging, setDragging] = React.useState(false)
  const inputRef = React.useRef<HTMLInputElement>(null)

  const validateAndSet = (f: File) => {
    const ok = ["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"].includes(f.type)
    if (!ok) { toast.error("Only PDF and DOCX files are supported."); return }
    if (f.size > 5 * 1024 * 1024) { toast.error("File must be under 5 MB."); return }
    onFileChange(f)
  }

  const handleDrop = (e: React.DragEvent) => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) validateAndSet(f) }
  const FileIcon = file?.type === "application/pdf" ? IconFileTypePdf : IconFileTypeDocx

  return (
    <div
      className={cn(
        "relative flex items-center gap-4 rounded-xl border border-dashed p-4 transition-all duration-200 cursor-pointer w-full select-none",
        dragging
          ? "border-primary bg-primary/5 scale-[1.005] ring-2 ring-primary/10"
          : "border-border/60 bg-muted/20 hover:border-primary/50 hover:bg-primary/5 hover:shadow-sm"
      )}
      onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      onClick={() => !file && inputRef.current?.click()}
    >
      <input ref={inputRef} type="file" accept=".pdf,.docx" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) validateAndSet(f) }} />
      {file ? (
        <Attachment size="default" className="w-full">
          <AttachmentMedia>
            <FileIcon className="size-4" />
          </AttachmentMedia>
          <AttachmentContent>
            <AttachmentTitle>{file.name}</AttachmentTitle>
            <AttachmentDescription>{(file.size / 1024).toFixed(0)} KB · Ready to analyze</AttachmentDescription>
          </AttachmentContent>
          <AttachmentActions>
            <AttachmentAction
              variant="ghost"
              onClick={(e) => { e.stopPropagation(); onFileChange(null) }}
            >
              <IconX className="size-3.5" />
            </AttachmentAction>
          </AttachmentActions>
        </Attachment>
      ) : (
        <div className="flex items-center gap-3 w-full justify-between">
          <div className="flex items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground transition-colors duration-200">
              <IconUpload className="size-5 animate-pulse" />
            </div>
            <div className="flex flex-col text-left">
              <p className="text-sm font-medium text-foreground">
                Drop your resume here or <span className="text-primary hover:underline font-semibold">browse</span>
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Supports PDF & DOCX (Max 5MB)
              </p>
            </div>
          </div>
          <div className="flex gap-1.5 hidden sm:flex shrink-0">
            <Badge variant="secondary" className="bg-background/50 hover:bg-background/50 text-[10px] py-0 px-2 h-5 text-muted-foreground border border-border/40">PDF</Badge>
            <Badge variant="secondary" className="bg-background/50 hover:bg-background/50 text-[10px] py-0 px-2 h-5 text-muted-foreground border border-border/40">DOCX</Badge>
          </div>
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────
// Main client component
// ─────────────────────────────────────────────
export function ResumeAnalyzerClient() {
  const router = useRouter()
  const [file, setFile] = React.useState<File | null>(null)
  const [mode, setMode] = React.useState<"standalone" | "jd">("standalone")
  const [jobDescription, setJobDescription] = React.useState("")
  const [loading, setLoading] = React.useState(false)
  const [result, setResult] = React.useState<AnalysisResult | null>(null)
  const [activeTab, setActiveTab] = React.useState<"audit" | "history">("audit")
  const [historyList, setHistoryList] = React.useState<AnalysisResult[]>([])

  const resultsRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    setHistoryList(getHistory())
  }, [])

  React.useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" })
  }, [activeTab])

  const handleAnalyze = async () => {
    if (!file) { toast.error("Please select a resume file first."); return }
    setLoading(true)
    try {
      const fd = new FormData()
      fd.append("file", file)
      if (mode === "jd" && jobDescription.trim()) fd.append("jobDescription", jobDescription)
      const res = await analyzeResumeAction(fd)
      setResult(res)
      saveResult(res)
      setHistoryList(getHistory())
      setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 200)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Analysis failed. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const handleReset = () => {
    setResult(null); setFile(null); setJobDescription("")
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  const restoreReport = (r: AnalysisResult) => {
    setResult(r)
    setActiveTab("audit")
    toast.success(`Restored analysis for ${r.fileName}`)
    setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 200)
  }

  const deleteReport = (e: React.MouseEvent, r: AnalysisResult) => {
    e.stopPropagation()
    try {
      const history = getHistory()
      const updated = history.filter((h) => h.analyzedAt !== r.analyzedAt)
      localStorage.setItem(HISTORY_KEY, JSON.stringify(updated))
      setHistoryList(updated)
      toast.success("Report deleted from history.")
      if (result && result.analyzedAt === r.analyzedAt) {
        setResult(null)
      }
    } catch { }
  }

  // Safely access verdict fields (handles both string legacy and object format)
  const verdict = result?.verdict
  const verdictHeadline = typeof verdict === "object" ? verdict?.headline : verdict
  const verdictSummary = typeof verdict === "object" ? verdict?.summary : verdict
  const verdictPriority = typeof verdict === "object" ? verdict?.topPriority : undefined

  return (
    <div className="flex flex-col gap-6 px-4 py-6 md:px-8 md:py-8 font-sans">

      {/* ── Page Header ── */}
      <div className="flex flex-col gap-3 pb-2 border-b border-border/60">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" className="h-8 px-2 text-muted-foreground -ml-2 hover:bg-muted/50" onClick={() => router.back()}>
            <IconArrowLeft className="size-4 mr-1" />
            Back to Tools
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <h1 className="text-3xl font-bold font-cirka tracking-tight text-foreground">Resume Analyzer</h1>
          <Badge variant="secondary" className="bg-violet-500/10 text-violet-600 dark:text-violet-400 text-xs ml-1">AI-Powered</Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          Upload your resume for a deep AI audit — ATS scoring, keyword alignment, and historical progression tracking.
        </p>
      </div>

      {/* ── Tabs Navigation ── */}
      <div className="flex border-b border-border/60 gap-1">
        <button
          onClick={() => setActiveTab("audit")}
          className={cn(
            "flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-all -mb-px outline-none",
            activeTab === "audit"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          <IconFileText className="size-4" />
          {result ? "Dashboard & Audit" : "Analyze & Upload"}
        </button>
        <button
          onClick={() => setActiveTab("history")}
          className={cn(
            "flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-all -mb-px outline-none",
            activeTab === "history"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          <IconHistory className="size-4" />
          History & Progress
          {historyList.length > 0 && (
            <Badge variant="secondary" className="px-1.5 py-px text-[10px] ml-1 bg-muted text-muted-foreground">
              {historyList.length}
            </Badge>
          )}
        </button>
      </div>

      {/* ── Tab Content ── */}
      <div className="flex flex-col gap-6">

        {/* ── Tab 1: Audit & Upload ── */}
        {activeTab === "audit" && (
          <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
            {!result ? (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Upload Resume</CardTitle>
                  <CardDescription>PDF or DOCX only · Max 5 MB · Your file is never stored on our servers</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-6">
                  <FileDropZone file={file} onFileChange={setFile} />

                  {/* Mode toggle */}
                  <div className="flex flex-col gap-3">
                    <p className="text-sm font-medium text-foreground">Analysis Mode</p>
                    <div className="flex gap-2 flex-wrap">
                      {(["standalone", "jd"] as const).map((m) => (
                        <button key={m} onClick={() => setMode(m)} className={cn("flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition-all", mode === m ? "border-primary bg-primary/10 text-primary" : "border-border bg-muted/30 text-muted-foreground hover:border-primary/40 hover:text-foreground")}>
                          {m === "standalone" ? <><IconFileText className="size-4" />Resume Only</> : <><IconBriefcase className="size-4" />Match a Job</>}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* JD textarea */}
                  <div className={cn("overflow-hidden transition-all duration-300", mode === "jd" ? "max-h-72 opacity-100" : "max-h-0 opacity-0")}>
                    <div className="flex flex-col gap-2">
                      <label className="text-sm font-medium text-foreground">Paste Job Title & Description</label>
                      <textarea
                        className="min-h-36 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 resize-none transition"
                        placeholder={"e.g. Senior Frontend Engineer at Acme Corp\n\nWe are looking for a React developer with 3+ years of experience..."}
                        value={jobDescription}
                        onChange={(e) => setJobDescription(e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground">The AI will extract required skills and score your resume against them.</p>
                    </div>
                  </div>

                  <GenerateButton
                    className="w-full h-11 text-sm font-semibold"
                    onClick={handleAnalyze}
                    isGenerating={loading}
                    disabled={!file || loading}
                    text="Analyze"
                    generatingText="Analyzing"
                    hue={260}
                  />
                </CardContent>
              </Card>
            ) : (
              <div ref={resultsRef} className="flex flex-col gap-6 animate-in fade-in duration-300">

                {/* Results header */}
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                      Analysis Results
                    </h2>
                    <div className="flex items-center gap-3 mt-1 flex-wrap">
                      <p className="text-xs text-muted-foreground">{result.fileName} · {new Date(result.analyzedAt).toLocaleString()}</p>
                      {result.detectedIndustry && (
                        <Badge variant="secondary" className="text-[10px] gap-1">
                          <IconBuildingSkyscraper className="size-3" />{result.detectedIndustry}
                        </Badge>
                      )}
                      {result.experienceLevel && (
                        <Badge variant="secondary" className="text-[10px] gap-1">
                          <IconUser className="size-3" />{result.experienceLevel} Level
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2 mt-3 sm:mt-0">
                    <Button variant="outline" size="sm" className="gap-1.5" onClick={handleAnalyze} disabled={loading || !file}>
                      <IconRefresh className="size-3.5" />Re-analyze
                    </Button>
                    <Button variant="secondary" size="sm" className="gap-1.5 border border-border" onClick={handleReset}>
                      <IconUpload className="size-3.5" />New Resume
                    </Button>
                  </div>
                </div>

                {/* ── AI Verdict ── */}
                {verdict && (
                  <Card className="border-violet-500/20 bg-violet-500/5">
                    <CardContent className="pt-5 pb-5">
                      <div className="flex flex-col gap-3">
                        <div className="flex items-start gap-3">
                          <div className="flex flex-col gap-1.5 flex-1 font-sans">
                            <span className="text-xs font-semibold uppercase tracking-widest text-violet-600 dark:text-violet-400">AI Verdict</span>
                            {verdictHeadline && (
                              <p className="text-sm font-semibold text-foreground">{verdictHeadline}</p>
                            )}
                            {verdictSummary && verdictSummary !== verdictHeadline && (
                              <p className="text-sm text-foreground/80 leading-relaxed">{verdictSummary}</p>
                            )}
                          </div>
                        </div>
                        {verdictPriority && (
                          <div className="rounded-lg border border-violet-500/20 bg-violet-500/10 px-3 py-2">
                            <p className="text-xs text-foreground leading-relaxed">
                              <span className="font-semibold text-violet-600 dark:text-violet-400">Top Priority: </span>
                              {verdictPriority}
                            </p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* ── Quick Wins ── */}
                {result.quickWins && result.quickWins.length > 0 && (
                  <Card className="border-amber-500/20 bg-amber-500/5">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm text-amber-700 dark:text-amber-400 font-semibold">
                        Quick Wins — High Impact Fixes (under 10 mins)
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-2.5 pt-1">
                      {result.quickWins.map((win, i) => (
                        <div key={i} className="flex items-start justify-between gap-3 border-b border-border/20 last:border-0 pb-2 last:pb-0">
                          <div className="flex items-start gap-2.5">
                            <div className="flex flex-col items-center gap-1 mt-0.5 shrink-0">
                              <Badge className={cn("text-[9px] font-bold uppercase tracking-wider", impactColor(win.impact))}>
                                {win.impact}
                              </Badge>
                              {win.estimatedTime && (
                                <span className="flex items-center gap-0.5 text-[8px] text-muted-foreground font-mono">
                                  <IconClock className="size-2.5" />{win.estimatedTime}
                                </span>
                              )}
                            </div>
                            <div className="flex flex-col gap-0.5">
                              <span className="text-sm font-semibold text-foreground leading-none">{win.title}</span>
                              <span className="text-xs text-muted-foreground leading-relaxed">{win.action}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}

                {/* ── Score Overview Grid ── */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Overall score */}
                  <Card className="flex flex-col items-center justify-center py-8 gap-4">
                    <span className="text-sm font-medium text-muted-foreground">Overall Score</span>
                    <ScoreDial score={result.overallScore} size={160} label={scoreLabel(result.overallScore)} />
                    <p className="text-xs text-muted-foreground text-center px-6">Based on formatting, impact, and content quality.</p>
                  </Card>

                  {/* ATS Compatibility Score */}
                  <Card className="flex flex-col items-center justify-center py-8 gap-4">
                    <span className="text-sm font-medium text-muted-foreground">ATS Compatibility</span>
                    <ScoreDial score={result.atsScore} size={160} />
                    <p className="text-xs text-muted-foreground text-center px-6">Scan-ability and structural layout alignment.</p>
                  </Card>

                  {/* Mode-specific Third Card */}
                  {result.jdMatchScore !== undefined ? (
                    <Card className={cn("border flex flex-col gap-4 p-6 justify-center items-center", scoreBgClass(result.jdMatchScore))}>
                      <div className="flex items-center gap-2 text-foreground font-semibold">
                        <span className="text-sm font-semibold">Job Match Score</span>
                      </div>
                      <div className="flex justify-center mt-1">
                        <ScoreDial score={result.jdMatchScore} size={110} label={scoreLabel(result.jdMatchScore)} />
                      </div>
                    </Card>
                  ) : (
                    <Card className="flex flex-col gap-4 p-6 font-sans">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold">Detected Skills</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5 overflow-y-auto max-h-48 pt-1">
                        {result.detectedSkills && result.detectedSkills.length > 0 ? (
                          result.detectedSkills.map((s) => (
                            <Badge key={s} variant="secondary" className="text-xs">{s}</Badge>
                          ))
                        ) : (
                          <span className="text-xs text-muted-foreground italic">No skills extracted.</span>
                        )}
                      </div>
                    </Card>
                  )}
                </div>

                {/* ── Main Details Grid (Recommendations on left, Audits & Clouds on right) ── */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                  {/* Left Column: Recommendations (Take 2/3 width) */}
                  <div className="lg:col-span-2 flex flex-col gap-6">
                    {/* Key Recommendations */}
                    {result.recommendations && result.recommendations.length > 0 && (
                      <Card className="h-full">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-base font-sans">
                            Key Suggestions & Action Items
                          </CardTitle>
                          <CardDescription>
                            Prioritized instructions to refine and rewrite specific sections of your resume.
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="flex flex-col gap-4">
                          {result.recommendations.map((rec, i) => (
                            <div
                              key={i}
                              className={cn(
                                "rounded-xl border p-4 flex flex-col gap-3 transition-all hover:bg-muted/10",
                                severityBorder(rec.severity)
                              )}
                            >
                              <div className="flex items-center gap-2">
                                <Badge className={cn("text-[9px] font-bold uppercase tracking-wider", severityColor(rec.severity))}>
                                  {rec.severity} Severity
                                </Badge>
                                <h4 className="text-sm font-semibold text-foreground">{rec.title}</h4>
                              </div>

                              <div className="flex flex-col gap-1.5 text-sm pl-0.5">
                                <p className="text-muted-foreground leading-relaxed font-sans">
                                  <span className="font-semibold text-foreground">Issue: </span>
                                  {rec.feedback}
                                </p>
                                <p className="text-foreground leading-relaxed font-sans">
                                  <span className="font-semibold text-violet-600 dark:text-violet-400">Fix: </span>
                                  {rec.suggestion}
                                </p>
                              </div>

                              {rec.rewrite && (
                                <div className="mt-1">
                                  <RewriteExample before={rec.rewrite.before} after={rec.rewrite.after} />
                                </div>
                              )}
                            </div>
                          ))}
                        </CardContent>
                      </Card>
                    )}
                  </div>

                  {/* Right Column: Checklists, Audits, Keywords (Take 1/3 width) */}
                  <div className="flex flex-col gap-6">

                    {/* Resume Metadata & Contact Audit */}
                    {result.localAnalysis && (
                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-sm font-semibold">
                            Resume Metadata & Contact Audit
                          </CardTitle>
                          <CardDescription>Deterministic checks for key contact details.</CardDescription>
                        </CardHeader>
                        <CardContent className="flex flex-col gap-3 pt-1">
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div className="flex items-center gap-1.5">
                              {result.localAnalysis.hasEmail ? (
                                <IconCheck className="size-4 text-emerald-500 shrink-0" />
                              ) : (
                                <IconAlertCircle className="size-4 text-amber-500 shrink-0" />
                              )}
                              <span className="text-muted-foreground">Email Address</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              {result.localAnalysis.hasPhone ? (
                                <IconCheck className="size-4 text-emerald-500 shrink-0" />
                              ) : (
                                <IconAlertCircle className="size-4 text-amber-500 shrink-0" />
                              )}
                              <span className="text-muted-foreground">Phone Number</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              {result.localAnalysis.hasLinkedIn ? (
                                <IconCheck className="size-4 text-emerald-500 shrink-0" />
                              ) : (
                                <IconAlertCircle className="size-4 text-amber-500 shrink-0" />
                              )}
                              <span className="text-muted-foreground">LinkedIn Link</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              {result.localAnalysis.hasGitHub ? (
                                <IconCheck className="size-4 text-emerald-500 shrink-0" />
                              ) : (
                                <IconAlertCircle className="size-4 text-amber-500 shrink-0" />
                              )}
                              <span className="text-muted-foreground">GitHub Profile</span>
                            </div>
                          </div>

                          <Separator className="my-1" />

                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>Words: <span className="font-semibold text-foreground">{result.localAnalysis.wordCount}</span></span>
                            <span>Read Time: <span className="font-semibold text-foreground">{Math.ceil(result.localAnalysis.wordCount / 200)} min</span></span>
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {/* Strengths Card */}
                    <Card className="border-emerald-500/20 bg-emerald-500/5">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm text-emerald-700 dark:text-emerald-400">
                          Strengths
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ul className="flex flex-col gap-2.5">
                          {result.strengths && result.strengths.map((s, i) => (
                            <li key={i} className="flex items-start gap-2 text-xs">
                              <IconCheck className="size-3.5 text-emerald-500 mt-0.5 shrink-0" />
                              <span className="text-foreground font-medium leading-relaxed">{s}</span>
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>

                    {/* ATS Formatting Audit checklist */}
                    {result.formatChecks && result.formatChecks.length > 0 && (
                      <Card className="font-sans">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-sm text-foreground font-semibold">
                            Layout & Format Audit
                          </CardTitle>
                          <CardDescription>Visual scan of layout parse-ability checklist.</CardDescription>
                        </CardHeader>
                        <CardContent className="flex flex-col gap-3 pt-1">
                          {result.formatChecks.map((check, i) => {
                            const icon =
                              check.status === "Passed" ? (
                                <IconCheck className="size-4 text-emerald-500 shrink-0 mt-0.5" />
                              ) : check.status === "Warning" ? (
                                <IconAlertCircle className="size-4 text-amber-500 shrink-0 mt-0.5" />
                              ) : (
                                <IconX className="size-4 text-rose-500 shrink-0 mt-0.5" />
                              )

                            const labelColor =
                              check.status === "Passed"
                                ? "text-emerald-700 dark:text-emerald-400"
                                : check.status === "Warning"
                                  ? "text-amber-700 dark:text-amber-400"
                                  : "text-rose-700 dark:text-rose-400"

                            return (
                              <div key={i} className="flex items-start gap-2 text-xs border-b border-border/20 last:border-0 pb-2 last:pb-0">
                                {icon}
                                <div className="flex flex-col gap-0.5 flex-1">
                                  <span className={cn("font-semibold text-[11px]", labelColor)}>{check.label}</span>
                                  <span className="text-muted-foreground text-[10px] leading-relaxed">{check.feedback}</span>
                                </div>
                              </div>
                            )
                          })}
                        </CardContent>
                      </Card>
                    )}

                    {/* Job Match missing skills (if mode === jd) */}
                    {mode === "jd" && (
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm">
                            Missing Job Skills
                          </CardTitle>
                          <CardDescription>Identified in JD but missing in resume</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="flex flex-wrap gap-1.5 pt-0.5">
                            {result.missingSkills && result.missingSkills.length > 0 ? (
                              result.missingSkills.map((s) => (
                                <Badge key={s} variant="secondary" className="text-[10px] bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                                  {s}
                                </Badge>
                              ))
                            ) : (
                              <p className="text-[11px] text-muted-foreground">No major skills missing relative to this job description.</p>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {/* Detected Skills Cloud (if mode === jd, else shown as scores column) */}
                    {mode === "jd" && (
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm">
                            Detected Skills
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto pt-0.5">
                            {result.detectedSkills && result.detectedSkills.length > 0 ? (
                              result.detectedSkills.map((s) => (
                                <Badge key={s} variant="secondary" className="text-[10px]">{s}</Badge>
                              ))
                            ) : (
                              <span className="text-xs text-muted-foreground italic">No skills detected.</span>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {/* Suggested keywords to add */}
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm flex items-center gap-2">
                          Suggested Keywords
                        </CardTitle>
                        <CardDescription>Add naturally to improve ATS match</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="flex flex-wrap gap-1.5">
                          {result.suggestedKeywords && result.suggestedKeywords.length > 0 ? (
                            result.suggestedKeywords.map((k) => (
                              <Badge key={k} variant="secondary" className="text-[10px] gap-1 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                                + {k}
                              </Badge>
                            ))
                          ) : (
                            <p className="text-xs text-muted-foreground">Great keyword coverage!</p>
                          )}
                        </div>
                      </CardContent>
                    </Card>

                  </div>
                </div>

              </div>
            )}
          </div>
        )}

        {/* ── Tab 2: History & Progress ── */}
        {activeTab === "history" && (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 flex flex-col gap-6">
            {historyList.length === 0 ? (
              <Card className="flex flex-col items-center justify-center p-12 text-center">
                <div className="flex size-14 items-center justify-center rounded-2xl bg-muted mb-4">
                  <IconHistory className="size-7 text-muted-foreground" />
                </div>
                <h3 className="font-semibold text-foreground text-base">No analysis history</h3>
                <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                  Upload and analyze your resume on the first tab. Your progress history will populate here automatically.
                </p>
              </Card>
            ) : (
              <div className="flex flex-col gap-6">

                {/* Score Progression Overview */}
                {historyList.length >= 2 && (
                  <Card className="border-emerald-500/20 bg-emerald-500/5">
                    <CardContent className="p-5 flex flex-col gap-1.5">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-400 font-sans">Progression Tracker</span>
                      <h3 className="text-lg font-bold text-foreground">
                        Your overall score improved by {historyList[0].overallScore - historyList[historyList.length - 1].overallScore} points!
                      </h3>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        From a starting score of {historyList[historyList.length - 1].overallScore} (first upload) to your latest score of {historyList[0].overallScore}.
                      </p>
                    </CardContent>
                  </Card>
                )}

                {/* Timeline */}
                <h3 className="text-base font-semibold text-foreground px-1">Analysis History</h3>
                <div className="relative border-l border-border/80 ml-4 pl-6 flex flex-col gap-5">
                  {historyList.map((h, i) => {
                    const isCurrent = result?.analyzedAt === h.analyzedAt
                    return (
                      <div key={h.analyzedAt} className="relative">
                        {/* Timeline node */}
                        <span className={cn(
                          "absolute -left-[31px] top-1.5 flex size-4 items-center justify-center rounded-full border bg-background",
                          isCurrent ? "border-primary ring-2 ring-primary/20" : "border-muted-foreground"
                        )}>
                          <span className={cn("size-2 rounded-full", h.overallScore >= 75 ? "bg-emerald-500" : h.overallScore >= 50 ? "bg-amber-500" : "bg-rose-500")} />
                        </span>

                        <Card
                          className={cn(
                            "transition-all cursor-pointer",
                            isCurrent ? "border-primary bg-primary/5 shadow-sm" : "hover:border-primary/40 hover:bg-muted/10"
                          )}
                          onClick={() => restoreReport(h)}
                        >
                          <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                            <div className="flex flex-col gap-1">
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-sm text-foreground">{h.fileName}</span>
                                {isCurrent && <Badge className="text-[9px] px-1.5 py-px bg-primary text-primary-foreground font-medium">Active Report</Badge>}
                              </div>
                              <span className="text-xs text-muted-foreground">
                                {new Date(h.analyzedAt).toLocaleString()} · {h.detectedIndustry || "General"} · {h.experienceLevel} Level
                              </span>
                            </div>

                            <div className="flex items-center gap-4">
                              <div className="flex flex-col items-end">
                                <span className={cn("text-lg font-bold tabular-nums", scoreColor(h.overallScore))}>
                                  {h.overallScore}
                                </span>
                                <span className="text-[10px] text-muted-foreground">Overall Score</span>
                              </div>

                              <div className="flex items-center gap-1.5 border-l border-border pl-4">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="size-8 text-muted-foreground hover:text-foreground hover:bg-muted/80"
                                  onClick={(e) => { e.stopPropagation(); restoreReport(h) }}
                                  title="Restore and view this report"
                                >
                                  <IconFileText className="size-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="size-8 text-rose-500 hover:text-rose-600 hover:bg-rose-500/10"
                                  onClick={(e) => deleteReport(e, h)}
                                  title="Delete from history"
                                >
                                  <IconTrash className="size-4" />
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  )
}
