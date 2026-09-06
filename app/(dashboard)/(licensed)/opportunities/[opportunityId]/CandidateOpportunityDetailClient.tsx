// app/(dashboard)/(licensed)/opportunities/[opportunityId]/CandidateOpportunityDetailClient.tsx
"use client"

import { useState, useTransition, useMemo, type ReactNode } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import {
  Briefcase, MapPin, IndianRupee, Calendar, CheckCircle2,
  XCircle, FileText, ChevronRight, Upload, Info, Loader2, Building2,
  ArrowLeft, CalendarX, Clock, Sparkles, ListTodo, Award, ShieldCheck
} from "lucide-react"
import { toast } from "sonner"
import { createClient } from "@/lib/supabase/client"
import { buildStorageUrl } from "@/lib/storage"
import { applyToOpportunityAction } from "../actions"
import type { CandidateOpportunityListItem } from "../types"

interface CandidateOpportunityDetailClientProps {
  opp: CandidateOpportunityListItem
  candidateAcademic: {
    cgpa: number | null
  }
  profileId: string
}

function MetaItem({
  icon,
  label,
  value,
}: {
  icon: ReactNode
  label: string
  value: string
}) {
  return (
    <div className="flex items-start gap-2.5">
      <span className="mt-0.5 shrink-0 text-muted-foreground">{icon}</span>
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
        <p className="mt-0.5 text-sm font-semibold text-foreground">{value}</p>
      </div>
    </div>
  )
}

function renderBullets(text: string | null) {
  if (!text) return null
  const lines = text.split("\n").map(l => l.trim()).filter(Boolean)
  if (lines.length === 0) return null

  return (
    <ul className="list-disc pl-5 space-y-2 text-sm text-muted-foreground">
      {lines.map((line, idx) => {
        const cleanLine = line.replace(/^[\s*\-•\d+\.]+\s*/, "")
        return <li key={idx}>{cleanLine}</li>
      })}
    </ul>
  )
}

// ─── Consent Configuration ───────────────────────────────────────────────
interface ConsentItem {
  id: string
  label: string
  description: string
}

const CONSENT_ITEMS: ConsentItem[] = [
  {
    id: "accuracy",
    label: "My academic and profile details are accurate",
    description: "False details can lead to disqualification."
  },
  {
    id: "data_sharing",
    label: "Consent to share profile/documents with the recruiter",
    description: "Necessary for candidate evaluation."
  },
  {
    id: "terms",
    label: "Agree to the Terms & Placement Policy",
    description: "Abide by all institute guidelines and bond agreements."
  }
]

export function CandidateOpportunityDetailClient({
  opp,
  candidateAcademic,
  profileId
}: CandidateOpportunityDetailClientProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [supabase] = useState(() => createClient())

  const [isApplyOpen, setIsApplyOpen] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)

  // ─── Consent State ──────────────────────────────────────────────────────
  const [consents, setConsents] = useState<Record<string, boolean>>(
    () => Object.fromEntries(CONSENT_ITEMS.map(item => [item.id, false]))
  )

  const allConsentsGiven = useMemo(
    () => CONSENT_ITEMS.every(item => consents[item.id]),
    [consents]
  )

  const toggleConsent = (id: string, checked: boolean) => {
    setConsents(prev => ({ ...prev, [id]: checked }))
  }

  const resetApplyDialog = () => {
    setSelectedFile(null)
    setConsents(Object.fromEntries(CONSENT_ITEMS.map(item => [item.id, false])))
  }

  const deadlineDate = new Date(opp.deadline)
  const isExpired = deadlineDate < new Date()
  const companyName = opp.company?.name || "Unknown Company"

  const cgpaOk = !opp.min_cgpa || (candidateAcademic.cgpa != null && candidateAcademic.cgpa >= opp.min_cgpa)
  const isEligible = !!cgpaOk

  // Helper to format compensation string
  function formatCompensation() {
    if (opp.compensation_type === "full_time" && opp.ctc_lpa) return `${opp.ctc_lpa} LPA`
    if (opp.compensation_type === "internship" && opp.stipend_monthly) return `₹${opp.stipend_monthly.toLocaleString()}/mo`
    if (opp.compensation_type === "stipend_with_ppo" && opp.stipend_monthly) return `₹${opp.stipend_monthly.toLocaleString()}/mo + PPO`
    if (opp.compensation_type === "freelance" && opp.ctc_lpa) return `${opp.ctc_lpa} LPA`
    return "Unpaid / Disclosed later"
  }

  const renderActionCard = (isMobile = false) => {
    if (opp.my_application_id) {
      return (
        <Card className={cn(
          "rounded-xl border shadow-sm overflow-hidden",
          isMobile ? "bg-background/95 backdrop-blur-md" : "bg-muted/30 w-full"
        )}>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 h-4.5 w-4.5 shrink-0 text-emerald-600 dark:text-emerald-500" />
              <div>
                <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-400">Application Submitted</p>
                <p className="text-xs text-emerald-700/80 dark:text-emerald-500/80 mt-0.5">
                  Status: {opp.my_application_status === "Offered" ? "Offered (Placed)" : opp.my_application_status}
                </p>
              </div>
            </div>
            {opp.my_application_resume_url && (
              <div className="pt-1">
                <Button className="w-full gap-2 rounded-xl text-xs font-bold" variant="outline" asChild size="sm">
                  <a href={opp.my_application_resume_url} target="_blank" rel="noreferrer">
                    <FileText className="h-3.5 w-3.5" /> View Resume
                  </a>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )
    }

    if (!isEligible) {
      return (
        <Card className={cn(
          "rounded-xl border shadow-sm overflow-hidden border-destructive/20 text-destructive",
          isMobile ? "bg-background/95 backdrop-blur-md" : "bg-destructive/5 w-full"
        )}>
          <CardContent className="p-4">
            <div className="flex items-start gap-2">
              <XCircle className="mt-0.5 h-4.5 w-4.5 shrink-0 text-destructive" />
              <div>
                <p className="text-sm font-semibold">Not Eligible</p>
                <p className="text-xs mt-0.5 opacity-90">
                  Your verified CGPA ({candidateAcademic.cgpa != null ? candidateAcademic.cgpa.toFixed(2) : "N/A"}) is below cutoff ({opp.min_cgpa.toFixed(2)}).
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )
    }

    if (isExpired) {
      return (
        <Card className={cn(
          "rounded-xl border shadow-sm overflow-hidden border-destructive/20 text-destructive",
          isMobile ? "bg-background/95 backdrop-blur-md" : "bg-destructive/5 w-full"
        )}>
          <CardContent className="p-4">
            <div className="flex items-start gap-2">
              <CalendarX className="mt-0.5 h-4.5 w-4.5 shrink-0 text-destructive" />
              <div>
                <p className="text-sm font-semibold">Application Closed</p>
                <p className="text-xs mt-0.5 opacity-90">
                  Closed on {new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(opp.deadline))}.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )
    }

    // Quick Apply Actions
    return (
      <Card className={cn(
        "rounded-xl border shadow-sm overflow-hidden",
        isMobile ? "bg-background/95 backdrop-blur-md" : "bg-muted/30 w-full"
      )}>
        <CardContent className={cn("p-4", isMobile ? "flex items-center justify-between gap-4" : "space-y-4")}>
          {!isMobile && (
            <div className="space-y-1">
              <h4 className="text-sm font-semibold text-foreground">Apply Now</h4>
              <p className="text-xs text-muted-foreground">
                Submit your profile and resume before the deadline.
              </p>
            </div>
          )}

          <div className={isMobile ? "flex-1" : "w-full"}>
            {opp.application_link ? (
              <Button className="w-full gap-2 rounded-xl h-10 text-xs font-bold" asChild size={isMobile ? "sm" : "lg"}>
                <a href={opp.application_link} target="_blank" rel="noreferrer">
                  Quick Apply <ChevronRight className="h-3.5 w-3.5" />
                </a>
              </Button>
            ) : (
              <Button
                onClick={() => setIsApplyOpen(true)}
                className="w-full gap-2 rounded-xl h-10 text-xs font-bold"
                size={isMobile ? "sm" : "lg"}
              >
                Quick Apply <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }

  // Handle Apply Submission (File Upload + database insertion)
  const handleApplySubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (opp.collect_resume && !selectedFile) {
      toast.error("Please upload a resume file.")
      return
    }
    if (!allConsentsGiven) {
      toast.error("Please accept all consent checkboxes before applying.")
      return
    }

    setUploading(true)
    try {
      let finalResumeUrl: string | null = null

      if (opp.collect_resume && selectedFile) {
        const fileExt = selectedFile.name.split(".").pop()
        const fileName = `${Date.now()}_resume.${fileExt}`
        const filePath = `${profileId}/${fileName}`

        const { error: uploadError } = await supabase.storage
          .from("resumes")
          .upload(filePath, selectedFile, {
            cacheControl: "3600",
            upsert: true
          })

        if (uploadError) {
          throw new Error(uploadError.message || "Failed to upload resume file.")
        }

        finalResumeUrl = buildStorageUrl("resumes", filePath)
        if (!finalResumeUrl) {
          throw new Error("Failed to resolve uploaded resume URL.")
        }
      }

      startTransition(async () => {
        try {
          // NOTE: consent metadata is passed through so the server action
          // can persist an audit trail (timestamp + which consents were given).
          const res = await applyToOpportunityAction(opp.id, finalResumeUrl, {
            consents,
            consentedAt: new Date().toISOString(),
          })
          if (res.success) {
            toast.success("Applied successfully!")
            setIsApplyOpen(false)
            resetApplyDialog()
            router.refresh()
          }
        } catch (err) {
          toast.error(err instanceof Error ? err.message : "Failed to submit application.")
        }
      })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to upload resume.")
      setUploading(false)
    }
  }

  return (
    <div className="flex flex-col gap-6 px-4 py-8 md:px-8 w-full animate-in fade-in duration-500 pb-24 lg:pb-8">
      {/* Back Button */}
      <div>
        <Button variant="ghost" asChild className="gap-1.5 -ml-3 hover:bg-muted/50 rounded-xl transition-all">
          <Link href="/opportunities">
            <ArrowLeft className="h-4 w-4" /> Back to Opportunities
          </Link>
        </Button>
      </div>

      {/* Page Header */}
      <div className="flex gap-4 items-start">
        <Avatar className="h-16 w-16 shrink-0 rounded-xl border shadow-xs bg-background">
          {opp.company?.logo_url && (
            <AvatarImage
              src={opp.company.logo_url}
              alt={`${companyName} logo`}
              className="object-cover"
            />
          )}
          <AvatarFallback className="rounded-xl text-muted-foreground font-bold text-xl flex items-center justify-center">
            {companyName.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="flex flex-col gap-1.5 min-w-0">
          <h1 className="text-3xl font-bold font-cirka tracking-tight text-foreground">
            {opp.title}
          </h1>
          <p className="text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">{companyName}</span> · {opp.job_role}
          </p>
        </div>
      </div>

      {/* Two Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column (Details) */}
        <div className="lg:col-span-8 space-y-6">
          {/* Opportunity Overview Card */}
          <Card className="rounded-xl border bg-muted/30 w-full overflow-hidden">
            <CardContent className="p-4">
              <p className="pb-2.5 border-b mb-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Opportunity Overview
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <MetaItem
                  icon={<IndianRupee className="h-4 w-4" />}
                  label="Package Details"
                  value={formatCompensation()}
                />
                <MetaItem
                  icon={<MapPin className="h-4 w-4" />}
                  label="Location"
                  value={opp.location || "Nashik, India"}
                />
                {opp.job_type && (
                  <MetaItem
                    icon={<Building2 className="h-4 w-4" />}
                    label="Job Type"
                    value={opp.job_type}
                  />
                )}
                {opp.job_timing && (
                  <MetaItem
                    icon={<Clock className="h-4 w-4" />}
                    label="Job Timing"
                    value={opp.job_timing}
                  />
                )}
                <MetaItem
                  icon={<FileText className="h-4 w-4" />}
                  label="Service Agreement"
                  value={opp.bond_details || "None"}
                />
                <MetaItem
                  icon={<Calendar className="h-4 w-4" />}
                  label="Apply Before"
                  value={new Intl.DateTimeFormat(undefined, {
                    dateStyle: "medium",
                    timeStyle: "short",
                    hour12: true,
                  }).format(new Date(opp.deadline))}
                />
              </div>
            </CardContent>
          </Card>

          {/* Eligibility Criteria Card */}
          <Card className="rounded-xl border bg-muted/30 w-full overflow-hidden">
            <CardContent className="p-4">
              <p className="pb-2.5 border-b mb-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Eligibility Criteria
              </p>
              <div className="space-y-4">
                <MetaItem
                  icon={<Building2 className="h-4 w-4" />}
                  label="CGPA Requirement"
                  value={opp.min_cgpa > 0 ? `${opp.min_cgpa.toFixed(2)} or above` : "None Required"}
                />
                <MetaItem
                  icon={<CheckCircle2 className="h-4 w-4" />}
                  label="Your Verified CGPA"
                  value={candidateAcademic.cgpa != null ? candidateAcademic.cgpa.toFixed(2) : "N/A"}
                />
                <div className="flex items-start gap-2.5">
                  {isEligible ? (
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-500 mt-0.5" />
                  ) : (
                    <XCircle className="h-4 w-4 shrink-0 text-destructive mt-0.5" />
                  )}
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Eligibility Status
                    </p>
                    <p className={cn("mt-0.5 text-sm font-semibold", isEligible ? "text-emerald-600 dark:text-emerald-400" : "text-destructive")}>
                      {isEligible ? "Meets Cutoff" : "Below Cutoff"}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Job Description & Details */}
          {opp.job_description && (
            <Card className="rounded-xl border bg-muted/30 w-full overflow-hidden">
              <CardContent className="p-4">
                <p className="pb-2.5 border-b mb-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Job Description & Details
                </p>
                <p className="overflow-hidden wrap-break-word whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
                  {opp.job_description}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Roles & Responsibilities */}
          {opp.roles_responsibilities && (
            <Card className="rounded-xl border bg-muted/30 w-full overflow-hidden">
              <CardContent className="p-4">
                <p className="pb-2.5 border-b mb-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Roles & Responsibilities
                </p>
                {renderBullets(opp.roles_responsibilities)}
              </CardContent>
            </Card>
          )}

          {/* Requirements */}
          {opp.requirements && (
            <Card className="rounded-xl border bg-muted/30 w-full overflow-hidden">
              <CardContent className="p-4">
                <p className="pb-2.5 border-b mb-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Requirements
                </p>
                {renderBullets(opp.requirements)}
              </CardContent>
            </Card>
          )}

          {/* Perks & Benefits */}
          {opp.perks && (
            <Card className="rounded-xl border bg-muted/30 w-full overflow-hidden">
              <CardContent className="p-4">
                <p className="pb-2.5 border-b mb-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Perks & Benefits
                </p>
                {renderBullets(opp.perks)}
              </CardContent>
            </Card>
          )}

          {/* About Company */}
          {opp.company && (
            <Card className="rounded-xl border bg-muted/30 w-full overflow-hidden">
              <CardContent className="p-4">
                <div className="flex items-center justify-between pb-2.5 border-b mb-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    About {opp.company.name}
                  </p>
                  {opp.company.website && (
                    <a
                      href={opp.company.website.startsWith("http://") || opp.company.website.startsWith("https://") 
                        ? opp.company.website 
                        : `https://${opp.company.website}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-primary hover:text-primary/80 transition-colors font-semibold flex items-center gap-1"
                    >
                      Visit Website <ChevronRight className="h-3 w-3" />
                    </a>
                  )}
                </div>
                <p className="overflow-hidden wrap-break-word whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
                  {opp.company.description || "No company description provided."}
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column (Desktop Sidebar CTA) */}
        <div className="hidden lg:block lg:col-span-4 sticky top-6">
          {renderActionCard(false)}
        </div>
      </div>

      {/* Spacer to prevent mobile floating CTA from covering bottom content */}
      <div className="h-28 lg:hidden shrink-0" />

      {/* Floating Bottom Bar/Card for Mobile/Tablet */}
      <div className="lg:hidden sticky bottom-4 z-40 animate-in slide-in-from-bottom duration-300">
        {renderActionCard(true)}
      </div>

      {/* Dialog: PDF Resume Uploader + Consents */}
      <Dialog
        open={isApplyOpen}
        onOpenChange={(open) => {
          setIsApplyOpen(open)
          if (!open) resetApplyDialog()
        }}
      >
        <DialogContent className="w-full sm:max-w-md rounded-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">
              {opp.collect_resume ? "Apply for Opportunity" : "Confirm Application"}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground/80">
              {opp.collect_resume
                ? `Submit your PDF resume to ${companyName} for the ${opp.title} position.`
                : `Review and confirm your application details for the ${opp.title} position at ${companyName}.`}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleApplySubmit} className="space-y-5 pt-3">
            {opp.collect_resume && (
              <div className="space-y-2">
                <Label htmlFor="resume" className="text-xs font-bold text-foreground">Resume PDF File *</Label>

                <div className={cn(
                  "border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer relative group transition-all duration-300",
                  selectedFile
                    ? "border-emerald-500/35 bg-emerald-500/5 hover:bg-emerald-500/10"
                    : "border-border hover:border-primary/45 hover:bg-muted/10"
                )}>
                  <input
                    type="file"
                    id="resume"
                    accept=".pdf"
                    required={opp.collect_resume}
                    disabled={uploading || isPending}
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) {
                        if (file.type !== "application/pdf") {
                          toast.error("Please select a PDF file.")
                          setSelectedFile(null)
                        } else {
                          setSelectedFile(file)
                        }
                      }
                    }}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />

                  {selectedFile ? (
                    <div className="space-y-2">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 mx-auto animate-in scale-in duration-200">
                        <FileText className="h-6 w-6" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-foreground max-w-60 truncate mx-auto">
                          {selectedFile.name}
                        </p>
                        <p className="text-[10px] text-muted-foreground/80 mt-0.5">
                          {(selectedFile.size / 1024 / 1024).toFixed(2)} MB • PDF Format
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          setSelectedFile(null)
                        }}
                        className="text-[10px] font-bold text-red-500 hover:text-red-600 underline pt-1 inline-block z-10 relative"
                      >
                        Remove File
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted/40 text-muted-foreground/60 mx-auto group-hover:bg-primary/5 group-hover:text-primary transition-colors duration-300">
                        <Upload className="h-6 w-6" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-foreground">
                          Click or drag to upload PDF resume
                        </p>
                        <p className="text-[10px] text-muted-foreground/80 mt-1">
                          Only PDF formats are allowed.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ─── Consent Checklist ────────────────────────────────────── */}
            <div className="space-y-2">
              <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">Consent & Declaration *
              </Label>
              <div className="rounded-2xl border bg-muted/20 p-3.5 space-y-3">
                {CONSENT_ITEMS.map((item) => (
                  <div key={item.id} className="space-y-1">
                    <div className="flex items-center gap-2.5">
                      <Checkbox
                        id={`consent-${item.id}`}
                        checked={consents[item.id]}
                        disabled={uploading || isPending}
                        onCheckedChange={(checked) => toggleConsent(item.id, checked === true)}
                      />
                      <label
                        htmlFor={`consent-${item.id}`}
                        className="text-xs font-semibold text-foreground cursor-pointer leading-none select-none"
                      >
                        {item.label}
                      </label>
                    </div>
                    {item.description && (
                      <p className="text-[10px] text-muted-foreground/80 pl-6.5 leading-snug">
                        {item.description}
                      </p>
                    )}
                  </div>
                ))}
              </div>
              {!allConsentsGiven && (
                <p className="text-[10px] text-muted-foreground/70 flex items-center gap-1.5 pt-0.5">
                  <Info className="h-3.5 w-3.5 text-muted-foreground/60 shrink-0" />
                  All consents must be checked to submit your application.
                </p>
              )}
            </div>

            <DialogFooter className="pt-3 gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsApplyOpen(false)}
                disabled={uploading || isPending}
                className="rounded-xl font-semibold"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={uploading || isPending || (opp.collect_resume && !selectedFile) || !allConsentsGiven}
                className="rounded-xl font-bold"
              >
                {uploading || isPending ? (
                  <span className="flex items-center gap-1.5"><Loader2 className="h-4 w-4 animate-spin" /> Submitting...</span>
                ) : (
                  "Submit Application"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}