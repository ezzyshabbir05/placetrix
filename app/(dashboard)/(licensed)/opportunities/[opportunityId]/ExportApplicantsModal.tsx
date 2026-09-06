"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Download, FileSpreadsheet } from "lucide-react"
import type { OpportunityApplication } from "../types"

interface ExportApplicantsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  applications: OpportunityApplication[]
  opportunityTitle: string
}

export const EXPORT_FIELDS = [
  { id: "candidate_name", label: "Full Name" },
  { id: "candidate_email", label: "Email Address" },
  { id: "candidate_phone", label: "Phone Number" },
  { id: "candidate_course", label: "Course / Department" },
  { id: "candidate_passout_year", label: "Passout Year" },
  { id: "candidate_cgpa", label: "CGPA" },
  { id: "status", label: "Application Status" },
  { id: "resume_url", label: "Resume Link" },
]

export function ExportApplicantsModal({
  open,
  onOpenChange,
  applications,
  opportunityTitle,
}: ExportApplicantsModalProps) {
  // Select all fields by default
  const [selectedFields, setSelectedFields] = useState<Set<string>>(
    new Set(EXPORT_FIELDS.map((f) => f.id))
  )

  const handleToggleField = (fieldId: string) => {
    setSelectedFields((prev) => {
      const next = new Set(prev)
      if (next.has(fieldId)) {
        next.delete(fieldId)
      } else {
        next.add(fieldId)
      }
      return next
    })
  }

  const handleExport = async () => {
    if (applications.length === 0) return
    const XLSX = await import("xlsx")

    // 1. Filter data based on selected fields
    const exportData = applications.map((app, index) => {
      const row: Record<string, any> = {}
      row["Sr. No."] = index + 1
      EXPORT_FIELDS.forEach((field) => {
        if (selectedFields.has(field.id)) {
          // Explicit casting to grab fields from app
          row[field.label] = (app as any)[field.id] ?? "N/A"
        }
      })
      return row
    })

    // 2. Generate Worksheet and Workbook
    const worksheet = XLSX.utils.json_to_sheet(exportData)

    // Convert Resume URLs into clickable hyperlinks
    if (selectedFields.has("resume_url") && worksheet['!ref']) {
      const range = XLSX.utils.decode_range(worksheet['!ref'])
      let resumeColIdx = -1
      
      // Find the "Resume Link" column index
      for (let C = range.s.c; C <= range.e.c; ++C) {
        const cell = worksheet[XLSX.utils.encode_cell({ c: C, r: 0 })]
        if (cell && cell.v === "Resume Link") {
          resumeColIdx = C
          break
        }
      }

      // Add hyperlink to each row in that column
      if (resumeColIdx !== -1) {
        for (let R = 1; R <= range.e.r; ++R) {
          const cellAddr = XLSX.utils.encode_cell({ c: resumeColIdx, r: R })
          const cell = worksheet[cellAddr]
          if (cell && cell.v && cell.v !== "N/A" && typeof cell.v === "string") {
            const url = cell.v
            // Use Excel HYPERLINK formula for guaranteed clickability
            cell.t = 'f'
            cell.f = `HYPERLINK("${url}", "${url}")`
            delete cell.v
          }
        }
      }
    }

    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, "Applicants")

    // 3. Clean up title for filename
    const safeTitle = opportunityTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase()
    const fileName = `applicants_${safeTitle}_${new Date().toISOString().split('T')[0]}.xlsx`

    // 4. Download file
    XLSX.writeFile(workbook, fileName)
    
    // 5. Close modal
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-106.25">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-primary" />
            Export Applicant Data
          </DialogTitle>
          <DialogDescription>
            Select the fields you want to include in the exported Excel spreadsheet. ({applications.length} applicants selected)
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="flex flex-col gap-3">
            {EXPORT_FIELDS.map((field) => (
              <div key={field.id} className="flex items-center space-x-3">
                <Checkbox
                  id={field.id}
                  checked={selectedFields.has(field.id)}
                  onCheckedChange={() => handleToggleField(field.id)}
                />
                <Label
                  htmlFor={field.id}
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                >
                  {field.label}
                </Label>
              </div>
            ))}
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleExport} 
            disabled={selectedFields.size === 0 || applications.length === 0}
            className="gap-2"
          >
            <Download className="h-4 w-4" />
            Export to Excel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
