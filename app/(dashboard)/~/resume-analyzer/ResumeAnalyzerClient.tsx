"use client"

import * as React from "react"
import { analyzeResumeAction, type ResumeAnalysisResult } from "./actions"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { toast } from "sonner"
import { motion, AnimatePresence } from "motion/react"
import { cn } from "@/lib/utils"
import {
  IconUpload,
  IconFileText,
  IconX,
  IconSparkles,
  IconLoader2,
  IconCheck,
  IconAlertTriangle,
  IconTarget,
  IconBulb,
  IconQuote,
  IconLayout,
  IconBriefcase,
  IconCode,
  IconTools,
  IconUsers,
  IconStarFilled,
  IconChevronDown,
  IconChevronUp,
} from "@tabler/icons-react"


// ─── ATS Score Ring ───────────────────────────────────────────────────────────

function ATSScoreRing({ score }: { score: number }) {
  const radius = 58
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (score / 100) * circumference

  const getScoreColor = (s: number) => {
    if (s >= 80) return { stroke: "#22c55e", bg: "from-emerald-500/20 to-emerald-500/5", text: "text-emerald-500 dark:text-emerald-400", label: "Excellent" }
    if (s >= 65) return { stroke: "#3b82f6", bg: "from-blue-500/20 to-blue-500/5", text: "text-blue-500 dark:text-blue-400", label: "Good" }
    if (s >= 45) return { stroke: "#f59e0b", bg: "from-amber-500/20 to-amber-500/5", text: "text-amber-500 dark:text-amber-400", label: "Fair" }
    return { stroke: "#ef4444", bg: "from-red-500/20 to-red-500/5", text: "text-red-500 dark:text-red-400", label: "Needs Work" }
  }

  const colors = getScoreColor(score)

  return (
    <Card className={cn("relative flex flex-col items-center justify-center bg-gradient-to-br h-full min-h-[220px] overflow-hidden", colors.bg)}>
      <CardContent className="flex flex-col items-center justify-center p-6 sm:p-8 pb-4 sm:pb-6">
        <div className="relative">
          <svg width="140" height="140" className="-rotate-90">
            <circle
              cx="70"
              cy="70"
              r={radius}
              fill="none"
              stroke="currentColor"
              strokeWidth="8"
              className="text-muted/20"
            />
            <motion.circle
              cx="70"
              cy="70"
              r={radius}
              fill="none"
              stroke={colors.stroke}
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={circumference}
              initial={{ strokeDashoffset: circumference }}
              animate={{ strokeDashoffset: offset }}
              transition={{ duration: 1.2, ease: "easeOut", delay: 0.3 }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
              className={`text-4xl font-bold tabular-nums ${colors.text}`}
            >
              {score}
            </motion.span>
            <span className="text-xs text-muted-foreground mt-0.5 font-medium">/ 100</span>
          </div>
        </div>
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1 }}
          className="mt-4 text-center"
        >
          <p className="text-sm font-semibold text-foreground">ATS Score</p>
          <p className={`text-xs font-medium mt-0.5 ${colors.text}`}>{colors.label}</p>
        </motion.div>
      </CardContent>
    </Card>
  )
}


// ─── Section Card ─────────────────────────────────────────────────────────────

function AnalysisCard({
  title,
  icon,
  children,
  delay = 0,
  collapsible = false,
  defaultOpen = true,
}: {
  title: string
  icon: React.ReactNode
  children: React.ReactNode
  delay?: number
  collapsible?: boolean
  defaultOpen?: boolean
}) {
  const [isOpen, setIsOpen] = React.useState(defaultOpen)

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
    >
      <Collapsible
        open={collapsible ? isOpen : true}
        onOpenChange={collapsible ? setIsOpen : undefined}
      >
        <Card>
          <CardHeader
            className={cn(
              "flex flex-row items-center justify-between space-y-0 pb-0",
              collapsible && "cursor-pointer"
            )}
            onClick={() => collapsible && setIsOpen(!isOpen)}
          >
            <div className="flex items-center gap-2.5">
              <span className="text-muted-foreground">{icon}</span>
              <CardTitle className="text-sm font-semibold">{title}</CardTitle>
            </div>
            {collapsible && (
              <CollapsibleTrigger asChild onClick={(e) => e.stopPropagation()}>
                <Button variant="ghost" size="icon" className="h-6 w-6 rounded-md shrink-0">
                  {isOpen ? <IconChevronUp size={16} /> : <IconChevronDown size={16} />}
                  <span className="sr-only">Toggle</span>
                </Button>
              </CollapsibleTrigger>
            )}
          </CardHeader>
          <CollapsibleContent>
            <CardContent className="pt-4">
              {children}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>
    </motion.div>
  )
}


// ─── Chip List ────────────────────────────────────────────────────────────────

function ChipList({
  items,
  variant,
}: {
  items: string[]
  variant: "success" | "danger" | "neutral"
}) {
  const getBadgeClass = (v: string) => {
    switch (v) {
      case "success": return "bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 border-emerald-500/20 dark:text-emerald-400"
      case "danger": return "bg-red-500/10 text-red-600 hover:bg-red-500/20 border-red-500/20 dark:text-red-400"
      case "neutral": return "bg-blue-500/10 text-blue-600 hover:bg-blue-500/20 border-blue-500/20 dark:text-blue-400"
      default: return "bg-secondary text-secondary-foreground"
    }
  }

  if (items.length === 0) {
    return <p className="text-xs text-muted-foreground italic">None identified</p>
  }

  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item, i) => (
        <Badge key={i} variant="outline" className={getBadgeClass(variant)}>
          {item}
        </Badge>
      ))}
    </div>
  )
}


// ─── Main Component ───────────────────────────────────────────────────────────

export function ResumeAnalyzerClient({ initialDescription = "" }: { initialDescription?: string }) {
  const [file, setFile] = React.useState<File | null>(null)
  const [jobDescription, setJobDescription] = React.useState(initialDescription)
  const [isAnalyzing, setIsAnalyzing] = React.useState(false)
  const [result, setResult] = React.useState<ResumeAnalysisResult | null>(null)
  const [isDragOver, setIsDragOver] = React.useState(false)
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  const canAnalyze = file && jobDescription.trim().length > 20 && !isAnalyzing

  const handleDrop = React.useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    const droppedFile = e.dataTransfer.files[0]
    if (droppedFile?.type === "application/pdf") {
      setFile(droppedFile)
    } else {
      toast.error("Please upload a PDF file")
    }
  }, [])

  const handleFileChange = React.useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0]
    if (selected?.type === "application/pdf") {
      setFile(selected)
    } else if (selected) {
      toast.error("Please upload a PDF file")
    }
  }, [])

  const handleAnalyze = React.useCallback(async () => {
    if (!file || !jobDescription.trim()) return

    setIsAnalyzing(true)
    setResult(null)

    try {
      const formData = new FormData()
      formData.append("resume", file)
      formData.append("jobDescription", jobDescription)

      const analysis = await analyzeResumeAction(formData)
      setResult(analysis)

      try {
        localStorage.setItem(
          "skillbridge_resume_insights",
          JSON.stringify({
            atsScore: analysis.atsScore,
            extractedSkills: analysis.keywordAnalysis.matched,
            keywords: analysis.keywordAnalysis.missing.concat(analysis.keywordAnalysis.matched),
            suggestions: analysis.improvements.slice(0, 3),
            analyzedAt: new Date().toISOString(),
          })
        )
      } catch { /* localStorage might be full — ignore */ }

      toast.success("Resume analysis complete!")
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to analyze resume. Please try again."
      )
    } finally {
      setIsAnalyzing(false)
    }
  }, [file, jobDescription])

  const handleReset = React.useCallback(() => {
    setFile(null)
    setJobDescription("")
    setResult(null)
    if (fileInputRef.current) fileInputRef.current.value = ""
  }, [])

  return (
    <div className="flex flex-col gap-6 px-4 py-8 md:px-8">
      {/* ── Page Header ── */}
      <div className="flex flex-col gap-1.5">
        <h1 className="text-3xl font-bold font-cirka tracking-tight text-foreground">Resume Analyzer</h1>
        <p className="text-sm text-muted-foreground">
          Upload your resume and a job description to get an AI-powered ATS evaluation with actionable feedback.
        </p>
      </div>

      {/* ── Main Content ── */}
      <div>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8">

          {/* ── Left Panel: Inputs ── */}
          <div className="lg:col-span-5 flex flex-col gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Analysis Criteria</CardTitle>
                <CardDescription>Provide the materials required for the ATS analysis.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Upload Area */}
                <div className="space-y-2">
                  <Label htmlFor="resume-upload">Your Resume (PDF)</Label>
                  <div
                    onDrop={handleDrop}
                    onDragOver={(e) => { e.preventDefault(); setIsDragOver(true) }}
                    onDragLeave={() => setIsDragOver(false)}
                    onClick={() => !file && fileInputRef.current?.click()}
                    className={cn(
                      "relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 text-center transition-all duration-200 cursor-pointer min-h-[160px]",
                      isDragOver
                        ? "border-primary/50 bg-primary/5"
                        : file
                          ? "border-emerald-500/40 bg-emerald-500/5 dark:bg-emerald-500/10"
                          : "border-muted-foreground/20 hover:border-muted-foreground/40 hover:bg-muted/30"
                    )}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf"
                      onChange={handleFileChange}
                      className="hidden"
                      id="resume-upload"
                    />

                    {file ? (
                      <div className="flex flex-col items-center gap-3">
                        <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                          <IconFileText size={24} />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground truncate max-w-[200px]">
                            {file.name}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {(file.size / 1024).toFixed(1)} KB
                          </p>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation()
                            setFile(null)
                            if (fileInputRef.current) fileInputRef.current.value = ""
                          }}
                          className="h-8 text-muted-foreground hover:text-destructive"
                        >
                          <IconX size={14} className="mr-1" />
                          Remove File
                        </Button>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-3">
                        <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-muted/50 text-muted-foreground">
                          <IconUpload size={24} />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">
                            Drop your resume here
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            or click to browse · PDF only · Max 5 MB
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Job Description */}
                <div className="space-y-2">
                  <div className="flex justify-between items-end">
                    <Label htmlFor="job-description">Target Job Description</Label>
                    <span className={cn(
                      "text-[10px] font-medium tracking-wide",
                      jobDescription.length === 0 ? "text-muted-foreground" : jobDescription.trim().length > 20 ? "text-emerald-500 dark:text-emerald-400" : "text-amber-500 dark:text-amber-400"
                    )}>
                      {jobDescription.trim().length} chars
                    </span>
                  </div>
                  <Textarea
                    id="job-description"
                    placeholder="Paste the full job description here…"
                    value={jobDescription}
                    onChange={(e) => setJobDescription(e.target.value)}
                    className="min-h-[220px] resize-none text-sm"
                  />
                </div>
              </CardContent>
              <CardFooter className="gap-3">
                <Button
                  onClick={handleAnalyze}
                  disabled={!canAnalyze}
                  className="flex-1 h-11"
                >
                  {isAnalyzing ? (
                    <>
                      <IconLoader2 size={16} className="mr-2 animate-spin" />
                      Analyzing…
                    </>
                  ) : (
                    <>
                      <IconSparkles size={16} className="mr-2" />
                      Analyze Resume
                    </>
                  )}
                </Button>
                {result && (
                  <Button variant="outline" onClick={handleReset} className="h-11 px-6">
                    Clear
                  </Button>
                )}
              </CardFooter>
            </Card>

            {/* Analyzing skeleton */}
            {isAnalyzing && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-xl border border-border/50 bg-card/60 p-6"
              >
                <div className="flex items-center gap-3 mb-5">
                  <div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center animate-pulse">
                    <IconSparkles size={14} className="text-primary" />
                  </div>
                  <p className="text-sm font-medium">
                    Analyzing your resume against the job description…
                  </p>
                </div>
                <div className="space-y-4">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="space-y-2">
                      <div className="h-2.5 w-24 rounded-full bg-muted animate-pulse" style={{ animationDelay: `${i * 150}ms` }} />
                      <div className="h-2 w-full rounded-full bg-muted/60 animate-pulse" style={{ animationDelay: `${i * 150 + 75}ms` }} />
                      <div className="h-2 w-3/4 rounded-full bg-muted/60 animate-pulse" style={{ animationDelay: `${i * 150 + 150}ms` }} />
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </div>

          {/* ── Right Panel: Results ── */}
          <div className="lg:col-span-7">
            <AnimatePresence mode="wait">
              {result ? (
                <motion.div
                  key="results"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.4, ease: "easeOut" }}
                  className="space-y-5"
                >
                  {/* ATS Score + Summary Row */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                    <div className="sm:col-span-1">
                      <ATSScoreRing score={result.atsScore} />
                    </div>
                    <div className="sm:col-span-2 flex flex-col h-full">
                      <Card className="flex flex-col h-full">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                            <IconTarget size={14} /> Match Summary
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="flex flex-col gap-5 flex-1">
                          <p className="text-sm text-foreground leading-relaxed flex-1">{result.matchSummary}</p>

                          {/* Final Verdict */}
                          <div
                            className={cn(
                              "rounded-lg border p-4 flex items-start gap-3 mt-auto",
                              result.finalVerdict.shortlist
                                ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                : "border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400"
                            )}
                          >
                            <div className="mt-0.5 shrink-0">
                              {result.finalVerdict.shortlist ? <IconCheck size={18} /> : <IconAlertTriangle size={18} />}
                            </div>
                            <div>
                              <p className="text-sm font-semibold">
                                {result.finalVerdict.shortlist ? "Likely to be Shortlisted" : "Needs Improvement"}
                              </p>
                              <p className="text-xs opacity-90 mt-1 leading-snug">{result.finalVerdict.reason}</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </div>

                  {/* Keyword Analysis */}
                  <AnalysisCard title="Keyword Analysis" icon={<IconTarget size={16} />} delay={0.2}>
                    <div className="space-y-5">
                      <div>
                        <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 mb-2 flex items-center gap-1.5 uppercase tracking-wide">
                          <IconCheck size={14} /> Matched Keywords
                        </p>
                        <ChipList items={result.keywordAnalysis.matched} variant="success" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-red-600 dark:text-red-400 mb-2 flex items-center gap-1.5 uppercase tracking-wide">
                          <IconX size={14} /> Missing Keywords
                        </p>
                        <ChipList items={result.keywordAnalysis.missing} variant="danger" />
                      </div>
                    </div>
                  </AnalysisCard>

                  {/* Skill Gap */}
                  <AnalysisCard title="Skill Gap Analysis" icon={<IconCode size={16} />} delay={0.3}>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="space-y-2">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                          <IconCode size={14} /> Technical Skills
                        </p>
                        <ChipList items={result.skillGap.technical} variant="danger" />
                      </div>
                      <div className="space-y-2">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                          <IconTools size={14} /> Tools &amp; Technologies
                        </p>
                        <ChipList items={result.skillGap.tools} variant="danger" />
                      </div>
                      <div className="space-y-2">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                          <IconUsers size={14} /> Soft Skills
                        </p>
                        <ChipList items={result.skillGap.soft} variant="neutral" />
                      </div>
                    </div>
                  </AnalysisCard>

                  {/* Section Feedback */}
                  <AnalysisCard title="Section-wise Feedback" icon={<IconLayout size={16} />} delay={0.4} collapsible defaultOpen={true}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {([
                        { key: "structure" as const, label: "Structure", icon: <IconLayout size={16} /> },
                        { key: "projects" as const, label: "Projects", icon: <IconStarFilled size={16} /> },
                        { key: "experience" as const, label: "Experience", icon: <IconBriefcase size={16} /> },
                        { key: "skills" as const, label: "Skills", icon: <IconCode size={16} /> },
                      ]).map(({ key, label, icon }) => (
                        <div key={key} className="rounded-lg bg-muted/30 border border-border/50 p-4 space-y-2">
                          <p className="text-sm font-semibold text-foreground flex items-center gap-2">
                            <span className="text-muted-foreground">{icon}</span>
                            {label}
                          </p>
                          <p className="text-xs text-muted-foreground leading-relaxed">
                            {result.sectionFeedback[key]}
                          </p>
                        </div>
                      ))}
                    </div>
                  </AnalysisCard>

                  {/* Actionable Improvements */}
                  <AnalysisCard title="Actionable Improvements" icon={<IconBulb size={16} />} delay={0.5} collapsible>
                    <ul className="space-y-4">
                      {result.improvements.map((item, i) => (
                        <li key={i} className="flex items-start gap-3">
                          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-[10px] font-bold mt-0.5">
                            {i + 1}
                          </span>
                          <span className="text-sm text-muted-foreground leading-relaxed flex-1 pt-px">{item}</span>
                        </li>
                      ))}
                    </ul>
                  </AnalysisCard>

                  {/* Improved Bullet Points */}
                  {result.improvedBullets.length > 0 && (
                    <AnalysisCard title="Improved Resume Bullets" icon={<IconQuote size={16} />} delay={0.6} collapsible>
                      <div className="space-y-3">
                        {result.improvedBullets.map((bullet, i) => (
                          <div
                            key={i}
                            className="rounded-lg bg-muted/20 border-l-4 border-primary/60 pl-4 pr-3 py-3"
                          >
                            <p className="text-sm text-foreground leading-relaxed italic">{bullet}</p>
                          </div>
                        ))}
                      </div>
                    </AnalysisCard>
                  )}
                </motion.div>
              ) : !isAnalyzing ? (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card/30 p-12 text-center h-full min-h-[400px]"
                >
                  <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-muted text-muted-foreground mb-4">
                    <IconTarget size={32} />
                  </div>
                  <p className="text-base font-medium text-foreground mb-1">
                    Ready for Analysis
                  </p>
                  <p className="text-sm text-muted-foreground max-w-[280px]">
                    Upload your resume PDF and paste a job description, then click Analyze to evaluate your fit.
                  </p>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  )
}
