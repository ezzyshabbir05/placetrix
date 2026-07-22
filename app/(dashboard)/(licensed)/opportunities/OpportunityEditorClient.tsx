// app/(dashboard)/(licensed)/opportunities/OpportunityEditorClient.tsx
"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { ArrowLeft, Loader2, Save, Send, Building2, MapPin, IndianRupee, Calendar, Info, FileText } from "lucide-react"
import { toast } from "sonner"
import { createOpportunityAction, updateOpportunityAction } from "./actions"
import type { 
  OpportunityListItem, 
  OpportunityFormData, 
  CompanyProfile,
  CompensationType
} from "./types"
import { CohortSelector } from "@/app/(dashboard)/(licensed)/cohorts/CohortsClient"
import type { CohortOption } from "@/app/(dashboard)/(licensed)/cohorts/types"

const COMPENSATION_TYPES: { value: CompensationType; label: string }[] = [
  { value: "full_time", label: "Full-Time Job" },
  { value: "internship", label: "Internship" },
  { value: "stipend_with_ppo", label: "Internship with PPO" },
  { value: "freelance", label: "Freelance" }
]

interface OpportunityEditorClientProps {
  opportunity?: OpportunityListItem
  companies: CompanyProfile[]
  cohortOptions?: CohortOption[]
  initialCohortIds?: string[]
}

export function OpportunityEditorClient({
  opportunity,
  companies,
  cohortOptions,
  initialCohortIds = [],
}: OpportunityEditorClientProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const isEditMode = opportunity !== undefined

  const [selectedCohortIds, setSelectedCohortIds] = useState<string[]>(initialCohortIds)

  // Initialize form state
  const [formData, setFormData] = useState<OpportunityFormData>({
    company_id: opportunity?.company_id || (companies.length > 0 ? companies[0].id : "new"),
    new_company_name: "",
    new_company_logo_url: "",
    new_company_website: "",
    new_company_description: "",
    title: opportunity?.title || "",
    job_role: opportunity?.job_role || "",
    job_description: opportunity?.job_description || "",
    location: opportunity?.location || "",
    job_type: opportunity?.job_type || "In-Office",
    job_timing: opportunity?.job_timing || "Full-time",
    roles_responsibilities: opportunity?.roles_responsibilities || "",
    requirements: opportunity?.requirements || "",
    perks: opportunity?.perks || "",
    compensation_type: opportunity?.compensation_type || "full_time",
    ctc_lpa: opportunity?.ctc_lpa || null,
    stipend_monthly: opportunity?.stipend_monthly || null,
    bond_details: opportunity?.bond_details || "",
    application_link: opportunity?.application_link || "",
    deadline: opportunity 
      ? new Date(opportunity.deadline).toISOString().slice(0, 16)
      : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16),
    status: opportunity?.status || "Draft",
    min_cgpa: opportunity?.min_cgpa || 0,
    collect_resume: opportunity ? opportunity.collect_resume : true
  })

  const handleSubmit = async (e?: React.FormEvent, overrideStatus?: "Draft" | "Published") => {
    if (e) e.preventDefault()
    
    const finalData = {
      ...formData,
      status: overrideStatus || formData.status,
      cohort_ids: selectedCohortIds,
    }

    if (finalData.company_id === "new" && !finalData.new_company_name) {
      toast.error("Please provide a company name.")
      return
    }
    if (!finalData.title || !finalData.job_role || !finalData.deadline) {
      toast.error("Please fill in all required fields.")
      return
    }

    startTransition(async () => {
      try {
        if (opportunity) {
          const res = await updateOpportunityAction(opportunity.id, finalData)
          if (res.success) {
            toast.success("Opportunity updated successfully!")
            router.push(`/opportunities/${opportunity.id}`)
            router.refresh()
          }
        } else {
          const res = await createOpportunityAction(finalData)
          if (res.success) {
            toast.success("Opportunity created successfully!")
            router.push("/opportunities")
            router.refresh()
          }
        }
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to save opportunity")
      }
    })
  }

  const cancelPath = opportunity ? `/opportunities/${opportunity.id}` : "/opportunities"

  return (
    <div className="min-h-screen w-full">
      <div className="mx-auto space-y-6 px-4 py-6 md:px-8 md:py-8 w-full">
        
        {/* Back Button */}
        <div>
          <Button variant="ghost" asChild className="gap-1.5 -ml-3">
            <Link href={cancelPath}>
              <ArrowLeft className="h-4 w-4" /> Back
            </Link>
          </Button>
        </div>

        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-0.5">
            <h1 className="text-2xl font-semibold tracking-tight font-cirka">
              {isEditMode ? "Edit Opportunity" : "Create Opportunity"}
            </h1>
            <p className="text-sm text-muted-foreground">
              {isEditMode
                ? "Update drive specifications and student eligibility criteria."
                : "Fill in posting settings and eligibility rules, then publish."}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={isPending}
              onClick={(e) => handleSubmit(e, "Draft")}
            >
              <Save className="mr-2 size-4" />
              Save Draft
            </Button>

            <Button
              size="sm"
              disabled={isPending}
              onClick={(e) => handleSubmit(e, "Published")}
            >
              {isPending ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : (
                <Send className="mr-2 size-4" />
              )}
              Publish
            </Button>
          </div>
        </div>

        {/* Forms Split into Cards */}
        <form onSubmit={(e) => handleSubmit(e)} className="space-y-6">
          
          {/* Card 1: Company Profile and Basic Details */}
          <Card className="border-border/70 shadow-xs bg-card">
            <CardHeader className="pb-4">
              <CardTitle className="text-base flex items-center gap-2">
                <Building2 className="h-4 w-4 text-primary" />
                <span>Job Information</span>
              </CardTitle>
              <CardDescription>Select the company profile and define basic role properties.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Company Profile Selection */}
              <div className="space-y-2 border-b pb-4">
                <Label htmlFor="company_id">Company Profile *</Label>
                <Select 
                  value={formData.company_id} 
                  onValueChange={v => setFormData({ ...formData, company_id: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Company Profile" />
                  </SelectTrigger>
                  <SelectContent>
                    {companies.map((c: CompanyProfile) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                    <SelectItem value="new">+ Add New Company Profile...</SelectItem>
                  </SelectContent>
                </Select>

                {formData.company_id === "new" && (
                  <div className="border border-dashed p-4 rounded-lg space-y-3 bg-muted/10 mt-3 animate-in slide-in-from-top-2 duration-200">
                    <p className="text-xs font-semibold text-muted-foreground">New Company Profile Details</p>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label htmlFor="new_company_name" className="text-xs">Company Name *</Label>
                        <Input 
                          id="new_company_name" 
                          value={formData.new_company_name || ""} 
                          onChange={e => setFormData({ ...formData, new_company_name: e.target.value })} 
                          className="h-8 text-xs"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="new_company_website" className="text-xs">Website URL</Label>
                        <Input 
                          id="new_company_website" 
                          placeholder="https://..."
                          value={formData.new_company_website || ""} 
                          onChange={e => setFormData({ ...formData, new_company_website: e.target.value })} 
                          className="h-8 text-xs"
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="new_company_logo" className="text-xs">Logo Image URL</Label>
                      <Input 
                        id="new_company_logo" 
                        placeholder="https://..."
                        value={formData.new_company_logo_url || ""} 
                        onChange={e => setFormData({ ...formData, new_company_logo_url: e.target.value })} 
                        className="h-8 text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="new_company_desc" className="text-xs">Brief Description</Label>
                      <Textarea 
                        id="new_company_desc" 
                        rows={2}
                        value={formData.new_company_description || ""} 
                        onChange={e => setFormData({ ...formData, new_company_description: e.target.value })} 
                        className="text-xs"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Opportunity Job Role */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="title">Opportunity Title (Visible to Students) *</Label>
                  <Input 
                    id="title" 
                    value={formData.title} 
                    placeholder="e.g., Google Step Internship 2026"
                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                    required 
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="job_role">Job Role / Position *</Label>
                  <Input 
                    id="job_role" 
                    placeholder="e.g. Software Engineer"
                    value={formData.job_role} 
                    onChange={e => setFormData({ ...formData, job_role: e.target.value })}
                    required 
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="location">Job Location</Label>
                  <Input 
                    id="location" 
                    placeholder="e.g., Bangalore"
                    value={formData.location || ""} 
                    onChange={e => setFormData({ ...formData, location: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="job_type">Job Type (Work Mode) *</Label>
                  <Select 
                    value={formData.job_type} 
                    onValueChange={v => setFormData({ ...formData, job_type: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select Work Mode" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="In-Office">In-Office</SelectItem>
                      <SelectItem value="Remote">Remote</SelectItem>
                      <SelectItem value="Hybrid">Hybrid</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="job_timing">Job Timing / Engagement *</Label>
                  <Select 
                    value={formData.job_timing} 
                    onValueChange={v => setFormData({ ...formData, job_timing: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select Engagement" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Full-time">Full-time</SelectItem>
                      <SelectItem value="Internship">Internship</SelectItem>
                      <SelectItem value="Part-time">Part-time</SelectItem>
                      <SelectItem value="Freelance">Freelance</SelectItem>
                      <SelectItem value="Project-based / Flexible">Project-based / Flexible</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Card 2: Compensation & Schedule */}
          <Card className="border-border/70 shadow-xs bg-card">
            <CardHeader className="pb-4">
              <CardTitle className="text-base flex items-center gap-2">
                <IndianRupee className="h-4 w-4 text-primary" />
                <span>Compensation & Deadlines</span>
              </CardTitle>
              <CardDescription>Set target compensation types, service bonds, and deadlines.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="compensation_type">Type *</Label>
                  <Select 
                    value={formData.compensation_type} 
                    onValueChange={v => setFormData({ ...formData, compensation_type: v as any })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select Type" />
                    </SelectTrigger>
                    <SelectContent>
                      {COMPENSATION_TYPES.map(t => (
                        <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                {/* Conditionally show stipend / CTC */}
                {(formData.compensation_type === "full_time" || formData.compensation_type === "stipend_with_ppo" || formData.compensation_type === "freelance") && (
                  <div className="space-y-1.5">
                    <Label htmlFor="ctc_lpa">CTC Package (LPA)</Label>
                    <Input 
                      id="ctc_lpa" 
                      type="number" 
                      step="0.01" 
                      placeholder="e.g., 14.5"
                      value={formData.ctc_lpa ?? ""} 
                      onChange={e => setFormData({ ...formData, ctc_lpa: e.target.value ? parseFloat(e.target.value) : null })}
                    />
                  </div>
                )}

                {(formData.compensation_type === "internship" || formData.compensation_type === "stipend_with_ppo") && (
                  <div className="space-y-1.5">
                    <Label htmlFor="stipend_monthly">Monthly Stipend (₹)</Label>
                    <Input 
                      id="stipend_monthly" 
                      type="number" 
                      placeholder="e.g., 35000"
                      value={formData.stipend_monthly ?? ""} 
                      onChange={e => setFormData({ ...formData, stipend_monthly: e.target.value ? parseInt(e.target.value) : null })}
                    />
                  </div>
                )}

                <div className="space-y-1.5">
                  <Label htmlFor="bond_details">Service Agreement / Bond (e.g. 2 Years, None)</Label>
                  <Input 
                    id="bond_details" 
                    placeholder="e.g., 18 months agreement, or None"
                    value={formData.bond_details || ""} 
                    onChange={e => setFormData({ ...formData, bond_details: e.target.value })}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="deadline">Application Deadline *</Label>
                  <Input 
                    id="deadline" 
                    type="datetime-local" 
                    value={formData.deadline} 
                    onChange={e => setFormData({ ...formData, deadline: e.target.value })}
                    required 
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Card 3: Cutoffs & Detailed Descriptions */}
          <Card className="border-border/70 shadow-xs bg-card">
            <CardHeader className="pb-4">
              <CardTitle className="text-base flex items-center gap-2">
                <Info className="h-4 w-4 text-primary" />
                <span>Eligibility Cutoffs & Job Descriptions</span>
              </CardTitle>
              <CardDescription>Setup student screening filters and job descriptions.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="min_cgpa">Minimum CGPA Target</Label>
                  <Input 
                    id="min_cgpa" 
                    type="number" 
                    step="0.01" 
                    min="0" 
                    max="10"
                    placeholder="e.g. 8.0 (0 for no limit)"
                    value={formData.min_cgpa || ""} 
                    onChange={e => setFormData({ ...formData, min_cgpa: e.target.value ? parseFloat(e.target.value) : 0 })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="application_link">External Apply URL (Optional)</Label>
                  <Input 
                    id="application_link" 
                    placeholder="e.g. Google Form or company portal"
                    value={formData.application_link || ""} 
                    onChange={e => setFormData({ ...formData, application_link: e.target.value })}
                  />
                </div>
                
                <div className="space-y-1.5">
                  <Label htmlFor="status">Publish Status *</Label>
                  <Select 
                    value={formData.status} 
                    onValueChange={v => setFormData({ ...formData, status: v as any })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Draft">Draft</SelectItem>
                      <SelectItem value="Published">Published</SelectItem>
                      <SelectItem value="Concluded">Concluded</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-1 pt-6">
                  <div className="flex items-center gap-2.5">
                    <Checkbox 
                      id="collect_resume"
                      checked={formData.collect_resume}
                      onCheckedChange={checked => setFormData({ ...formData, collect_resume: checked === true })}
                    />
                    <label 
                      htmlFor="collect_resume" 
                      className="text-xs font-semibold leading-none cursor-pointer select-none"
                    >
                      Collect Resume
                    </label>
                  </div>
                  <p className="text-[10px] text-muted-foreground pl-6.5">
                    Candidates must upload a PDF resume to apply.
                  </p>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="job_description">Job Description & Details</Label>
                <Textarea 
                  id="job_description" 
                  rows={6}
                  placeholder="Enter details about responsibilities, qualifications, Interview rounds, CTC structure, etc."
                  value={formData.job_description || ""} 
                  onChange={e => setFormData({ ...formData, job_description: e.target.value })}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="roles_responsibilities">Roles & Responsibilities</Label>
                <Textarea 
                  id="roles_responsibilities" 
                  rows={4}
                  placeholder="Enter main responsibilities (one per line or as a paragraph)..."
                  value={formData.roles_responsibilities || ""} 
                  onChange={e => setFormData({ ...formData, roles_responsibilities: e.target.value })}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="requirements">Requirements</Label>
                <Textarea 
                  id="requirements" 
                  rows={4}
                  placeholder="Enter requirements & required skills (one per line or as a paragraph)..."
                  value={formData.requirements || ""} 
                  onChange={e => setFormData({ ...formData, requirements: e.target.value })}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="perks">Perks & Benefits</Label>
                <Textarea 
                  id="perks" 
                  rows={4}
                  placeholder="Enter additional perks, health cover, workspace benefits (one per line or as a paragraph)..."
                  value={formData.perks || ""} 
                  onChange={e => setFormData({ ...formData, perks: e.target.value })}
                />
              </div>
            </CardContent>
          </Card>

          {/* Cohort Targeting */}
          <Card>
            <CardContent className="p-5 space-y-3">
              <div>
                <h3 className="font-semibold text-sm text-foreground">Target Cohorts *</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Select which student cohorts can see this opportunity. At least one cohort is required to publish.
                </p>
              </div>
              <CohortSelector
                selectedCohortIds={selectedCohortIds}
                onChange={setSelectedCohortIds}
                cohorts={cohortOptions}
              />
            </CardContent>
          </Card>

          {/* Form Actions Footer */}
          <div className="flex justify-end gap-2 pt-2">
            <Button 
              type="button" 
              variant="outline" 
              asChild
              disabled={isPending}
            >
              <Link href={cancelPath}>
                Cancel
              </Link>
            </Button>
            
            <Button type="submit" disabled={isPending}>
              {isPending ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : isEditMode ? (
                "Save Changes"
              ) : (
                "Post Opportunity"
              )}
            </Button>
          </div>

        </form>
      </div>
    </div>
  )
}
