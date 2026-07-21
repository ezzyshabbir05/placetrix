"use client"

import React, { useState } from "react"
import * as XLSX from "xlsx"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { FileSpreadsheet, Loader2 } from "lucide-react"
import { fetchAllTestAttemptsForExportAction } from "./actions"

interface ExportTestParticipantsModalProps {
  testId: string
  testName: string
  totalAttempts: number
  trigger?: React.ReactNode
}

const AVAILABLE_FIELDS = [
  { id: "name", label: "Candidate Name" },
  { id: "email", label: "Email Address" },
  { id: "branch", label: "Branch / Course" },
  { id: "passoutYear", label: "Passout Year" },
  { id: "status", label: "Attempt Status" },
  { id: "score", label: "Score" },
  { id: "totalScore", label: "Total Score" },
  { id: "percentage", label: "Percentage" },
  { id: "timeSpent", label: "Time Spent" },
  { id: "tabSwitches", label: "Tab Switches" },
  { id: "submittedAt", label: "Submission Date" },
]

export function ExportTestParticipantsModal({ testId, testName, totalAttempts, trigger }: ExportTestParticipantsModalProps) {
  const [open, setOpen] = useState(false)
  const [selectedFields, setSelectedFields] = useState<string[]>(AVAILABLE_FIELDS.map((f) => f.id))
  const [isExporting, setIsExporting] = useState(false)

  const toggleField = (id: string) => {
    setSelectedFields((prev) =>
      prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id]
    )
  }

  const formatSeconds = (seconds: number | null) => {
    if (seconds == null || seconds <= 0) return "—"
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = seconds % 60
    if (h > 0) return `${h}h ${String(m).padStart(2, "0")}m`
    if (m > 0) return `${m}m ${String(s).padStart(2, "0")}s`
    return `${s}s`
  }

  const handleExport = async () => {
    if (selectedFields.length === 0) {
      toast.error("Please select at least one field to export.")
      return
    }

    try {
      setIsExporting(true)
      // Fetch all attempts directly from the server bypassing pagination
      const allAttempts = await fetchAllTestAttemptsForExportAction(testId)
      
      if (!allAttempts || allAttempts.length === 0) {
        toast.error("No attempts found to export.")
        setIsExporting(false)
        return
      }

      const exportData = allAttempts.map((a: any) => {
        const row: any = {}
        if (selectedFields.includes("name")) row["Candidate Name"] = a.student_name || "Unknown"
        if (selectedFields.includes("email")) row["Email Address"] = a.student_email || "N/A"
        if (selectedFields.includes("branch")) row["Branch / Course"] = a.branch || "N/A"
        if (selectedFields.includes("passoutYear")) row["Passout Year"] = a.passout_year || "N/A"
        if (selectedFields.includes("status")) row["Status"] = a.status
        if (selectedFields.includes("score")) row["Score"] = a.score != null ? a.score : "N/A"
        if (selectedFields.includes("totalScore")) row["Total Score"] = a.total_marks != null ? a.total_marks : "N/A"
        if (selectedFields.includes("percentage")) row["Percentage (%)"] = a.percentage != null ? a.percentage : "N/A"
        if (selectedFields.includes("timeSpent")) row["Time Spent"] = formatSeconds(a.time_spent_seconds)
        if (selectedFields.includes("tabSwitches")) row["Tab Switches"] = a.tab_switch_count ?? "0"
        if (selectedFields.includes("submittedAt")) row["Submission Date"] = a.submitted_at ? new Date(a.submitted_at).toLocaleString("en-IN") : "N/A"
        return row
      })

      const worksheet = XLSX.utils.json_to_sheet(exportData)
      const workbook = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(workbook, worksheet, "Test Participants")

      // Auto-fit columns
      const maxLens = Object.keys(exportData[0] || {}).map((key) => {
        const lengths = exportData.map((row: any) => String(row[key] ?? "").length)
        lengths.push(key.length)
        return { wch: Math.max(...lengths) + 3 }
      })
      worksheet["!cols"] = maxLens

      const safeName = testName.replace(/[^a-zA-Z0-9]/g, "_")
      XLSX.writeFile(workbook, `${safeName}_participants.xlsx`)
      toast.success("Export successful!")
      setOpen(false)
    } catch (error: any) {
      toast.error("Export failed: " + error.message)
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(val) => !isExporting && setOpen(val)}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" disabled={totalAttempts === 0} className="gap-1.5 h-10 rounded-xl text-xs font-semibold cursor-pointer">
            <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />
            Export to Excel
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle>Export Test Participants</DialogTitle>
          <DialogDescription>
            Select the fields you want to include in the Excel export. This will export all {totalAttempts} participants.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <div className="grid grid-cols-2 gap-4">
            {AVAILABLE_FIELDS.map((field) => (
              <div key={field.id} className="flex items-center space-x-2">
                <Checkbox
                  id={`field-${field.id}`}
                  checked={selectedFields.includes(field.id)}
                  onCheckedChange={() => toggleField(field.id)}
                  disabled={isExporting}
                />
                <label
                  htmlFor={`field-${field.id}`}
                  className={`text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 ${isExporting ? 'cursor-default opacity-50' : 'cursor-pointer select-none'}`}
                >
                  {field.label}
                </label>
              </div>
            ))}
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={isExporting} className="rounded-xl">
            Cancel
          </Button>
          <Button onClick={handleExport} disabled={isExporting} className="rounded-xl gap-2">
            {isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSpreadsheet className="h-4 w-4" />}
            {isExporting ? "Exporting..." : "Export to Excel"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
