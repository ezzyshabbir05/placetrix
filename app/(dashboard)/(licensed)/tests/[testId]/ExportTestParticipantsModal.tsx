"use client"

import React, { useState } from "react"
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
import { createClient } from "@/lib/supabase/client"

interface ExportTestParticipantsModalProps {
  testId: string
  testName: string
  totalAttempts: number
  trigger?: React.ReactNode
}

const AVAILABLE_FIELDS = [
  { id: "srNo", label: "Sr. No." },
  { id: "name", label: "Candidate Name" },
  { id: "email", label: "Email Address" },
  { id: "branch", label: "Branch / Course" },
  { id: "passoutYear", label: "Passout Year" },
  { id: "status", label: "Attempt Status" },
  { id: "score", label: "Score" },
  { id: "totalScore", label: "Total Score" },
  { id: "percentage", label: "Percentage" },
  { id: "timeSpent", label: "Active Time Spent" },
  { id: "actualTimeSpent", label: "Total Duration" },
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
      const XLSX = await import("xlsx-js-style")
      const supabase = createClient()
      
      const { data, error } = await (supabase as any)
        .from("test_attempts")
        .select(
          "id, tab_switch_count, status, score, total_marks, percentage, active_time_taken, total_time_taken, started_at, submitted_at, profile:profiles!candidate_id(full_name, email, candidate_academic_details(passout_year, course:institute_courses(course_name)))"
        )
        .eq("test_id", testId)
        .not("started_at", "is", null)
        .order("started_at", { ascending: false })
        .order("id", { ascending: true })

      if (error) {
        toast.error("Failed to fetch attempts for export.")
        setIsExporting(false)
        return
      }

      const allAttempts = (data || []).map((a: any) => {
        const cad = Array.isArray(a.profile?.candidate_academic_details)
          ? a.profile?.candidate_academic_details[0]
          : a.profile?.candidate_academic_details
        const courseName = Array.isArray(cad?.course)
          ? cad?.course[0]?.course_name
          : cad?.course?.course_name

        return {
          id: a.id,
          student_name: a.profile?.full_name ?? "Unknown",
          student_email: a.profile?.email ?? "Unknown",
          status: a.status,
          score: a.score ?? null,
          total_marks: a.total_marks ?? null,
          percentage: a.percentage ?? null,
          active_time_taken: a.active_time_taken ?? null,
          total_time_taken: a.total_time_taken ?? (a.started_at && a.submitted_at ? Math.max(0, Math.round((new Date(a.submitted_at).getTime() - new Date(a.started_at).getTime()) / 1000)) : null),
          started_at: a.started_at,
          submitted_at: a.submitted_at ?? null,
          tab_switch_count: a.tab_switch_count ?? null,
          branch: courseName ?? null,
          passout_year: cad?.passout_year ?? null,
        }
      })
      
      if (!allAttempts || allAttempts.length === 0) {
        toast.error("No attempts found to export.")
        setIsExporting(false)
        return
      }

      const exportData = allAttempts.map((a: any, index: number) => {
        const row: any = {}
        if (selectedFields.includes("srNo")) row["Sr. No."] = index + 1
        if (selectedFields.includes("name")) row["Candidate Name"] = a.student_name || "Unknown"
        if (selectedFields.includes("email")) row["Email Address"] = a.student_email || "N/A"
        if (selectedFields.includes("branch")) row["Branch / Course"] = a.branch || "N/A"
        if (selectedFields.includes("passoutYear")) row["Passout Year"] = a.passout_year || "N/A"
        if (selectedFields.includes("status")) row["Status"] = a.status
        if (selectedFields.includes("score")) row["Score"] = a.score != null ? a.score : "N/A"
        if (selectedFields.includes("totalScore")) row["Total Score"] = a.total_marks != null ? a.total_marks : "N/A"
        if (selectedFields.includes("percentage")) row["Percentage (%)"] = a.percentage != null ? a.percentage : "N/A"
        if (selectedFields.includes("timeSpent")) row["Active Time Spent"] = formatSeconds(a.active_time_taken)
        if (selectedFields.includes("actualTimeSpent")) row["Total Duration"] = formatSeconds(a.total_time_taken ?? (a.submitted_at && a.started_at ? Math.max(0, Math.round((new Date(a.submitted_at).getTime() - new Date(a.started_at).getTime()) / 1000)) : null))
        if (selectedFields.includes("tabSwitches")) row["Tab Switches"] = a.tab_switch_count ?? "0"
        if (selectedFields.includes("submittedAt")) row["Submission Date"] = a.submitted_at ? new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(a.submitted_at)) : "N/A"
        return row
      })

      const workbook = XLSX.utils.book_new()
      const worksheet: any = {}

      const headers = Object.keys(exportData[0] || {})
      const totalCols = headers.length

      // ── Branch abbreviation map ──────────────────────────────────────────────
      const branchAbbr: Record<string, string> = {
        "artificial intelligence and data science": "AI & DS",
        "computer engineering": "CE",
        "electronics and telecommunications engineering": "E&TC",
        "information technology": "IT",
        "master of business administration (mba)": "MBA",
        "mechanical engineering": "MECH",
      }

      function abbreviateBranch(branch: string | null | undefined): string {
        if (!branch || branch === "N/A") return branch || "N/A"
        const lower = branch.toLowerCase().trim()
        return branchAbbr[lower] ?? branch
      }

      // Helper to produce a cell address like A1, B2 etc.
      function cellAddr(col: number, row: number) {
        return XLSX.utils.encode_cell({ c: col, r: row })
      }

      // ── Row 0: blank spacer ──────────────────────────────────────────────────
      // (no cells written = blank row)

      // ── Row 1: Test name centered across all columns ─────────────────────────
      const titleCell = cellAddr(0, 1)
      worksheet[titleCell] = {
        v: testName,
        t: "s",
        s: {
          font: { bold: true, sz: 14, color: { rgb: "1A1A2E" } },
          alignment: { horizontal: "center", vertical: "center", wrapText: true },
          fill: { fgColor: { rgb: "EFF6FF" }, patternType: "solid" },
        },
      }
      // Merge title across all columns
      if (!worksheet["!merges"]) worksheet["!merges"] = []
      worksheet["!merges"].push({ s: { r: 1, c: 0 }, e: { r: 1, c: totalCols - 1 } })

      // ── Row 2: Header row with background color ──────────────────────────────
      const headerStyle = {
        font: { bold: true, sz: 11, color: { rgb: "FFFFFF" } },
        fill: { fgColor: { rgb: "1E3A5F" }, patternType: "solid" },
        alignment: { horizontal: "center", vertical: "center", wrapText: true },
        border: {
          top: { style: "thin", color: { rgb: "FFFFFF" } },
          bottom: { style: "thin", color: { rgb: "FFFFFF" } },
          left: { style: "thin", color: { rgb: "FFFFFF" } },
          right: { style: "thin", color: { rgb: "FFFFFF" } },
        },
      }

      headers.forEach((header, colIdx) => {
        const addr = cellAddr(colIdx, 2)
        worksheet[addr] = { v: header, t: "s", s: headerStyle }
      })

      // ── Rows 3+: Data rows centered ──────────────────────────────────────────
      const dataStyle = {
        alignment: { horizontal: "center", vertical: "center", wrapText: true },
        border: {
          top: { style: "thin", color: { rgb: "E2E8F0" } },
          bottom: { style: "thin", color: { rgb: "E2E8F0" } },
          left: { style: "thin", color: { rgb: "E2E8F0" } },
          right: { style: "thin", color: { rgb: "E2E8F0" } },
        },
      }

      exportData.forEach((row: any, rowIdx: number) => {
        headers.forEach((header, colIdx) => {
          let value = row[header]

          // Abbreviate branch
          if (header === "Branch / Course") {
            value = abbreviateBranch(value)
          }

          const addr = cellAddr(colIdx, rowIdx + 3)
          const isNumber = typeof value === "number"
          worksheet[addr] = {
            v: value,
            t: isNumber ? "n" : "s",
            s: dataStyle,
          }
        })
      })

      // ── Sheet dimensions ─────────────────────────────────────────────────────
      worksheet["!ref"] = XLSX.utils.encode_range({
        s: { r: 0, c: 0 },
        e: { r: exportData.length + 2, c: totalCols - 1 },
      })

      // ── Column widths (auto-fit) ─────────────────────────────────────────────
      const colWidths = headers.map((key) => {
        const lengths = exportData.map((row: any) => {
          let v = row[key]
          if (key === "Branch / Course") v = abbreviateBranch(v)
          return String(v ?? "").length
        })
        lengths.push(key.length)
        return { wch: Math.max(...lengths) + 4 }
      })
      worksheet["!cols"] = colWidths

      // ── Row heights ──────────────────────────────────────────────────────────
      worksheet["!rows"] = [
        { hpt: 10 },   // row 0: blank spacer
        { hpt: 28 },   // row 1: title
        { hpt: 22 },   // row 2: header
      ]

      XLSX.utils.book_append_sheet(workbook, worksheet, "Test Participants")

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
