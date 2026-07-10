// app/(dashboard)/(licensed)/opportunities/[opportunityId]/CandidateOpportunityDetailClient.tsx
"use client"

import { useState, useTransition, type ReactNode } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { 
  Briefcase, MapPin, IndianRupee, Calendar, CheckCircle2, 
  XCircle, FileText, ChevronRight, Upload, Info, Loader2, Building2,
  Clock, ArrowLeft, Heart, Share2
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
    <div className="group flex items-start gap-4 rounded-2xl border bg-card p-4 transition-all duration-300 hover:shadow-xs hover:border-border/80">
      <span className="mt-0.5 shrink-0 flex h-10 w-10 items-center justify-center rounded-xl bg-muted/40 text-muted-foreground group-hover:bg-primary/5 group-hover:text-primary transition-colors duration-300">
        {icon}
      </span>
      <div className="space-y-0.5">
        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">
          {label}
        </p>
        <p className="text-sm font-semibold text-foreground leading-snug">{value}</p>
      </div>
    </div>
  )
}

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

  // Handle Apply Submission (File Upload + database insertion)
  const handleApplySubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedFile) {
      toast.error("Please upload a resume file.")
      return
    }

    setUploading(true)
    try {
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

      const finalResumeUrl = buildStorageUrl("resumes", filePath)
      if (!finalResumeUrl) {
        throw new Error("Failed to resolve uploaded resume URL.")
      }

      startTransition(async () => {
        try {
          const res = await applyToOpportunityAction(opp.id, finalResumeUrl)
          if (res.success) {
            toast.success("Applied successfully!")
            setIsApplyOpen(false)
            setSelectedFile(null)
            router.refresh()
          }
        } catch (err) {
          toast.error(err instanceof Error ? err.message : "Failed to submit application.")
        }
      })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to upload resume.")
    } finally {
      setUploading(false)
    }
  }

  // Days left calculation
  const diffTime = deadlineDate.getTime() - new Date().getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  const daysLeftText = isExpired ? "Expired" : diffDays > 0 ? `${diffDays} Days Left` : "Closing Today"

  return (
    <div className="flex flex-col gap-6 px-4 py-8 md:px-8 w-full max-w-7xl mx-auto animate-in fade-in duration-500">
      {/* Back Button */}
      <div>
        <Button variant="ghost" asChild className="gap-1.5 -ml-3 hover:bg-muted/50 rounded-xl transition-all">
          <Link href="/opportunities">
            <ArrowLeft className="h-4 w-4" /> Back to Opportunities
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
        {/* Left Column (Details and lists stacked vertically in a single Box) */}
        <Card className="col-span-1 md:col-span-2 order-2 md:order-1 rounded-2xl border bg-card shadow-2xs p-6 md:p-8 space-y-6">
          {/* 1. Title & Company Section (Borderless & Compact inside Box) */}
          <div className="pb-4 border-b border-border/50 relative">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-muted-foreground bg-muted/40 px-2 py-0.5 rounded border border-border/80 uppercase tracking-wider">
                    <MapPin className="h-3 w-3" /> {opp.compensation_type.replace("_", " ")}
                  </span>
                  {opp.my_application_id && (
                    <span className="inline-flex items-center gap-1 text-[9px] font-bold text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 uppercase">
                      Applied
                    </span>
                  )}
                </div>
                
                <h1 className="text-xl md:text-2xl font-bold tracking-tight text-foreground leading-tight">
                  {opp.title}
                </h1>
                <p className="text-xs md:text-sm font-semibold text-foreground/80 flex items-center gap-1.5 flex-wrap">
                  <span>{companyName}</span>
                  <span className="text-muted-foreground/45">•</span>
                  <span className="text-muted-foreground/75 font-medium">{opp.job_role}</span>
                </p>
              </div>

              {/* Action icons & Logo Wrapper */}
              <div className="flex sm:flex-col items-start sm:items-end gap-2 shrink-0 self-start sm:self-auto">
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground rounded-lg">
                    <Calendar className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground rounded-lg">
                    <Heart className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground rounded-lg">
                    <Share2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-xl border bg-card p-2 shadow-2xs">
                  <Building2 className="h-6 w-6 text-foreground/70" />
                </div>
              </div>
            </div>
          </div>

          {/* 2. Eligibility Criteria Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 border-l-4 border-primary pl-3">
              <h2 className="text-base font-bold text-foreground">Eligibility Criteria</h2>
            </div>
            
            <div className="space-y-4 pl-1">
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">CGPA Requirement</span>
                <span className="text-sm font-semibold text-foreground">
                  {opp.min_cgpa > 0 ? `${opp.min_cgpa.toFixed(2)} or above` : "None Required"}
                </span>
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Your Verified CGPA</span>
                <span className="text-sm font-semibold text-foreground">
                  {candidateAcademic.cgpa != null ? candidateAcademic.cgpa.toFixed(2) : "N/A"}
                </span>
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Eligibility Status</span>
                <span className={cn(
                  "text-sm font-bold flex items-center gap-1.5 mt-0.5",
                  isEligible ? "text-emerald-600 dark:text-emerald-400" : "text-red-500 dark:text-red-400"
                )}>
                  {isEligible ? (
                    <>
                      <CheckCircle2 className="h-4 w-4 shrink-0" /> Meets Cutoff
                    </>
                  ) : (
                    <>
                      <XCircle className="h-4 w-4 shrink-0" /> Below Cutoff
                    </>
                  )}
                </span>
              </div>
            </div>
          </div>

          <hr className="border-border/60" />

          {/* 3. Job Details Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 border-l-4 border-primary pl-3">
              <h2 className="text-lg font-bold text-foreground">Details</h2>
            </div>
            
            <p className="text-sm text-muted-foreground/90 whitespace-pre-wrap leading-relaxed min-h-[120px] pl-1">
              {opp.job_description || "No description provided."}
            </p>
          </div>

          {/* 4. Company Profile Section */}
          {opp.company && (
            <>
              <hr className="border-border/60" />
              <div className="space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-3 border-l-4 border-primary pl-3">
                  <h2 className="text-lg font-bold text-foreground">About {opp.company.name}</h2>
                  {opp.company.website && (
                    <a 
                      href={opp.company.website} 
                      target="_blank" 
                      rel="noreferrer" 
                      className="text-xs text-primary hover:text-primary/80 transition-colors font-semibold flex items-center gap-1"
                    >
                      Visit Website <ChevronRight className="h-3 w-3" />
                    </a>
                  )}
                </div>
                
                <p className="text-sm text-muted-foreground/90 leading-relaxed pl-1">
                  {opp.company.description || "No company description provided."}
                </p>
              </div>
            </>
          )}

          <hr className="border-border/60" />

          {/* 5. Additional Details Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 border-l-4 border-primary pl-3">
              <h2 className="text-lg font-bold text-foreground">Additional Details</h2>
            </div>

            <div className="space-y-4 pl-1">
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Location</span>
                <span className="text-sm font-semibold text-foreground">{opp.location || "Nashik, India"}</span>
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Package Details</span>
                <span className="text-sm font-semibold text-foreground">{formatCompensation()}</span>
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Service Agreement</span>
                <span className="text-sm font-semibold text-foreground">{opp.bond_details || "None"}</span>
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Apply Before</span>
                <span className="text-sm font-semibold text-foreground">
                  {new Date(opp.deadline).toLocaleString("en-IN", {
                    dateStyle: "medium",
                    timeStyle: "short"
                  })}
                </span>
              </div>
            </div>
          </div>
        </Card>

        {/* Right Column (Sidebar Quick Apply) */}
        <div className="col-span-1 md:col-span-1 order-1 md:order-2 md:sticky md:top-6">
          <Card className="relative rounded-2xl border-2 bg-card p-6 pt-8 shadow-xs border-border/80 overflow-visible h-full flex flex-col justify-center">
            {/* Days Left Sticking Badge */}
            <div className="absolute -top-3.5 left-6 bg-foreground text-background text-[11px] font-black px-4 py-1 rounded-full shadow-sm">
              {daysLeftText}
            </div>

            <div className="flex flex-col items-center text-center space-y-4">
              {/* Message Info */}
              <div className="space-y-1">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/5 text-primary mx-auto">
                  {opp.my_application_id ? (
                    <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                  ) : !isEligible ? (
                    <XCircle className="h-5 w-5 text-red-500" />
                  ) : (
                    <Info className="h-5 w-5" />
                  )}
                </div>
                
                <h4 className="font-bold text-sm text-foreground">
                  {opp.my_application_id ? "Application Submitted" : !isEligible ? "Eligibility Issue" : "Ready to Apply?"}
                </h4>
                
                <p className="text-[11px] text-muted-foreground max-w-[200px] leading-relaxed">
                  {opp.my_application_id 
                    ? `Status: ${opp.my_application_status === "Offered" ? "Offered (Placed)" : opp.my_application_status}` 
                    : !isEligible 
                    ? "Your CGPA is below the cutoff limit." 
                    : "Think you've got it? Apply or submit your resume below."}
                </p>
              </div>

              {/* Main Button */}
              <div className="w-full">
                {opp.my_application_id ? (
                  <div className="space-y-3">
                    {opp.my_application_resume_url && (
                      <Button className="w-full gap-2 rounded-xl h-10 text-xs font-bold shadow-2xs" variant="outline" asChild>
                        <a 
                          href={opp.my_application_resume_url} 
                          target="_blank" 
                          rel="noreferrer"
                        >
                          <FileText className="h-4 w-4" /> View Resume
                        </a>
                      </Button>
                    )}
                  </div>
                ) : opp.application_link ? (
                  <Button className="w-full gap-2 rounded-xl h-10 text-xs font-bold shadow-2xs bg-primary text-primary-foreground hover:bg-primary/90" disabled={!isEligible || isExpired} asChild>
                    <a 
                      href={opp.application_link} 
                      target="_blank" 
                      rel="noreferrer"
                    >
                      Quick Apply <ChevronRight className="h-3.5 w-3.5" />
                    </a>
                  </Button>
                ) : (
                  <Button 
                    onClick={() => setIsApplyOpen(true)}
                    className="w-full gap-2 rounded-xl h-10 text-xs font-bold shadow-2xs bg-primary text-primary-foreground hover:bg-primary/90 transition-all duration-300" 
                    disabled={!isEligible || isExpired}
                  >
                    {isExpired ? "Application Closed" : "Quick Apply"} <ChevronRight className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Dialog: PDF Resume Uploader */}
      <Dialog open={isApplyOpen} onOpenChange={setIsApplyOpen}>
        <DialogContent className="w-full sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Apply for Opportunity</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground/80">
              Submit your PDF resume to {companyName} for the {opp.title} position.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleApplySubmit} className="space-y-5 pt-3">
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
                  required
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
                      <p className="text-xs font-bold text-foreground max-w-[240px] truncate mx-auto">
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
              <Button type="submit" disabled={uploading || isPending || !selectedFile} className="rounded-xl font-bold">
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
