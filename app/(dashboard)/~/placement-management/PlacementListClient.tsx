"use client"

import { useState, useEffect, useTransition, useRef, useCallback, useEffectEvent } from "react"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Search,
  Loader2,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  X,
  Pencil,
  Building2,
  IndianRupee,
  Mail,
  Phone,
  Calendar,
  Briefcase,
  MapPin,
  Check,
  Download,
  RotateCcw,
  LayoutList,
  LayoutGrid,
  Tags,
  ChevronDown,
  ChevronUp,
  CheckSquare,
  Square,
  AlertTriangle,
  FileSpreadsheet,
} from "lucide-react"
import { Button } from "@/components/ui/button"
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
  SheetDescription,
} from "@/components/ui/sheet"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"
import { upsertPlacementInfo, bulkSetPlacementStatus, exportPlacementData } from "./actions"
import { toast } from "sonner"
import { useRouter, usePathname } from "next/navigation"


// ─── Types ────────────────────────────────────────────────────────────────────

export interface PlacementRecord {
  profile_id: string
  display_name: string
  email: string | null
  phone_number: string | null
  course_name: string | null
  passout_year: number | null
  company_name: string | null
  ctc: number | null
  offer_letter_date: string | null
  job_role: string | null
  offer_type: string | null
  location: string | null
  drive_tag: string | null
  profile_image_path: string | null
}

type SortColumn = "name" | "course" | "passout" | "company" | "ctc"

type OfferType = "on_campus" | "off_campus" | "internship" | "ppo" | "freelance"

interface Props {
  records: PlacementRecord[]
  totalCount: number
  initialPage: number
  initialPageSize: number
  initialSearch: string
  initialPlacedFilter: "all" | "placed" | "not_placed"
  initialPassoutYear: string
  initialCourse: string
  initialSortCol: SortColumn
  initialSortDir: "asc" | "desc"
  availableYears: number[]
  availableCourses: string[]
  initialCtcMin: string
  initialCtcMax: string
  initialDrive: string
  availableDrives: string[]
}


// ─── Constants ────────────────────────────────────────────────────────────────

const OFFER_TYPE_OPTIONS: { value: OfferType; label: string }[] = [
  { value: "on_campus", label: "On-Campus" },
  { value: "off_campus", label: "Off-Campus" },
  { value: "internship", label: "Internship" },
  { value: "ppo", label: "PPO" },
  { value: "freelance", label: "Freelance" },
]

const INDIAN_CITIES = [
  "Ahmedabad", "Bengaluru", "Bhopal", "Chandigarh", "Chennai",
  "Coimbatore", "Delhi", "Gurugram", "Hyderabad", "Indore",
  "Jaipur", "Kochi", "Kolkata", "Lucknow", "Mumbai",
  "Nagpur", "Nashik", "Noida", "Pune", "Surat",
  "Vadodara", "Visakhapatnam",
]

const EXPORT_COLUMNS: { key: string; label: string }[] = [
  { key: "display_name", label: "Student Name" },
  { key: "email", label: "Email" },
  { key: "phone_number", label: "Phone" },
  { key: "course_name", label: "Course" },
  { key: "passout_year", label: "Passout Year" },
  { key: "company_name", label: "Company Name" },
  { key: "ctc", label: "CTC (LPA)" },
  { key: "job_role", label: "Job Role" },
  { key: "offer_type", label: "Offer Type" },
  { key: "location", label: "Location" },
  { key: "offer_letter_date", label: "Offer Letter Date" },
  { key: "drive_tag", label: "Drive Tag" },
  { key: "status", label: "Placement Status" },
]


// ─── Offer Type Badge ─────────────────────────────────────────────────────────

function OfferTypeBadge({ type }: { type: string | null }) {
  if (!type) return <span className="text-sm text-muted-foreground">—</span>

  const config: Record<string, { label: string; className: string }> = {
    on_campus:  { label: "On-Campus",  className: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 border-blue-200 dark:border-blue-800" },
    off_campus: { label: "Off-Campus", className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800" },
    internship: { label: "Internship", className: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300 border-purple-200 dark:border-purple-800" },
    ppo:        { label: "PPO",        className: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300 border-orange-200 dark:border-orange-800" },
    freelance:  { label: "Freelance",  className: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 border-gray-200 dark:border-gray-700" },
  }

  const c = config[type]
  if (!c) return <Badge variant="outline">{type}</Badge>

  return (
    <Badge variant="outline" className={cn("text-[11px] font-medium px-2 py-0.5 whitespace-nowrap", c.className)}>
      {c.label}
    </Badge>
  )
}


// ─── Placement Status Badge ───────────────────────────────────────────────────

function PlacementStatusBadge({ placed }: { placed: boolean }) {
  if (placed) {
    return (
      <Badge
        variant="outline"
        className="text-[11px] font-semibold px-2 py-0.5 whitespace-nowrap bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800"
      >
        <span className="mr-1">●</span> Placed
      </Badge>
    )
  }
  return (
    <Badge
      variant="outline"
      className="text-[11px] font-semibold px-2 py-0.5 whitespace-nowrap bg-red-50 text-red-600 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800"
    >
      <span className="mr-1">●</span> Not Placed
    </Badge>
  )
}


// ─── Sortable Table Head ───────────────────────────────────────────────────────

function SortableHead<T extends string>({
  label,
  col,
  sortCol,
  sortDir,
  onSort,
  className,
}: {
  label: string
  col: T
  sortCol: T
  sortDir: "asc" | "desc"
  onSort: (col: T) => void
  className?: string
}) {
  return (
    <TableHead
      className={cn(
        "text-xs font-semibold select-none cursor-pointer hover:bg-muted/60 transition-colors",
        className
      )}
      onClick={() => onSort(col)}
    >
      <div className="flex items-center gap-1.5">
        {label}
        {sortCol === col ? (
          sortDir === "asc" ? (
            <ArrowUp className="size-3.5 text-foreground" />
          ) : (
            <ArrowDown className="size-3.5 text-foreground" />
          )
        ) : (
          <ArrowUpDown className="size-3.5 opacity-30 hover:opacity-100 transition-opacity" />
        )}
      </div>
    </TableHead>
  )
}


// ─── Student Detail Panel (Sheet) ─────────────────────────────────────────────

interface PanelProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  record: PlacementRecord | null
  onSaved: () => void
  availableDrives: string[]
}

function StudentDetailPanel({ open, onOpenChange, record, onSaved, availableDrives }: PanelProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [saving, setSaving] = useState(false)

  // Edit form state
  const [companyName, setCompanyName] = useState("")
  const [ctc, setCtc] = useState("")
  const [offerLetterDate, setOfferLetterDate] = useState("")
  const [jobRole, setJobRole] = useState("")
  const [offerType, setOfferType] = useState<OfferType | "">("")
  const [location, setLocation] = useState("")
  const [driveTag, setDriveTag] = useState("")

  // Reset state when record changes or panel opens
  useEffect(() => {
    if (record) {
      setCompanyName(record.company_name ?? "")
      setCtc(record.ctc != null ? String(record.ctc) : "")
      setOfferLetterDate(record.offer_letter_date ?? "")
      setJobRole(record.job_role ?? "")
      setOfferType((record.offer_type as OfferType) ?? "")
      setLocation(record.location ?? "")
      setDriveTag(record.drive_tag ?? "")
    }
    setIsEditing(false)
  }, [record, open])

  const handleCancelEdit = () => {
    if (record) {
      setCompanyName(record.company_name ?? "")
      setCtc(record.ctc != null ? String(record.ctc) : "")
      setOfferLetterDate(record.offer_letter_date ?? "")
      setJobRole(record.job_role ?? "")
      setOfferType((record.offer_type as OfferType) ?? "")
      setLocation(record.location ?? "")
      setDriveTag(record.drive_tag ?? "")
    }
    setIsEditing(false)
  }

  const handleSave = async () => {
    if (!record) return
    const ctcNum = ctc.trim() === "" ? null : parseFloat(ctc)
    if (ctc.trim() !== "" && (isNaN(ctcNum!) || ctcNum! < 0)) {
      toast.error("Please enter a valid CTC value (e.g. 12.5)")
      return
    }
    try {
      setSaving(true)
      await upsertPlacementInfo({
        candidateUuid: record.profile_id,
        companyName: companyName.trim() || null,
        ctc: ctcNum,
        offerLetterDate: offerLetterDate || null,
        jobRole: jobRole.trim() || null,
        offerType: (offerType as OfferType) || null,
        location: location.trim() || null,
        driveTag: driveTag.trim() || null,
      })
      toast.success("Placement info updated")
      onSaved()
      setIsEditing(false)
    } catch (err: any) {
      toast.error(err.message || "Something went wrong")
    } finally {
      setSaving(false)
    }
  }

  const formatCtc = (val: number | null) => {
    if (val == null) return "—"
    return `₹${val.toFixed(1)} LPA`
  }

  const formatDate = (val: string | null) => {
    if (!val) return "—"
    return new Date(val).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
  }

  if (!record) return null

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-lg flex flex-col gap-0 p-0 overflow-y-auto"
      >
        {/* ── Header ── */}
        <SheetHeader className="p-6 pb-5 border-b bg-muted/30">
          <div className="flex items-center gap-4">
            <Avatar className="size-14 shrink-0 ring-2 ring-background shadow-sm">
              <AvatarImage src={record.profile_image_path || undefined} />
              <AvatarFallback className="text-lg font-semibold bg-primary/10 text-primary">
                {record.display_name.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col min-w-0">
              <SheetTitle className="text-lg font-bold leading-tight truncate">
                {record.display_name}
              </SheetTitle>
              <SheetDescription className="text-sm text-muted-foreground mt-0.5">
                {record.course_name || "—"}{record.passout_year ? ` · ${record.passout_year}` : ""}
              </SheetDescription>
            </div>
          </div>

          {/* Badges row */}
          <div className="flex items-center gap-2 mt-3 flex-wrap">
            <PlacementStatusBadge placed={!!record.company_name} />
            {record.drive_tag && (
              <Badge variant="secondary" className="text-[11px] gap-1">
                <Tags className="size-3" />
                {record.drive_tag}
              </Badge>
            )}
          </div>

          {/* Contact info */}
          <div className="flex flex-col gap-2 mt-3">
            {record.email && (
              <div className="flex items-center gap-2.5 text-sm text-muted-foreground">
                <Mail className="size-3.5 shrink-0 text-muted-foreground/70" />
                <span className="truncate">{record.email}</span>
              </div>
            )}
            {record.phone_number && (
              <div className="flex items-center gap-2.5 text-sm text-muted-foreground">
                <Phone className="size-3.5 shrink-0 text-muted-foreground/70" />
                <span>{record.phone_number}</span>
              </div>
            )}
            {!record.email && !record.phone_number && (
              <p className="text-xs text-muted-foreground italic">No contact info available</p>
            )}
          </div>
        </SheetHeader>

        {/* ── Placement Info ── */}
        <div className="flex flex-col flex-1 p-6 gap-6">
          {/* Section title + Edit toggle */}
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-foreground">Placement Details</p>
            {!isEditing && (
              <Button
                size="sm"
                variant="outline"
                className="h-8 gap-1.5"
                onClick={() => setIsEditing(true)}
              >
                <Pencil className="size-3.5" />
                Edit
              </Button>
            )}
          </div>

          {/* ── VIEW MODE ── */}
          {!isEditing && (
            <div className="grid grid-cols-1 gap-4">
              <InfoRow icon={<Building2 className="size-3.5" />} label="Company" value={record.company_name || "—"} />
              <InfoRow icon={<IndianRupee className="size-3.5" />} label="CTC" value={formatCtc(record.ctc)} highlight={record.ctc != null} />
              <InfoRow icon={<Calendar className="size-3.5" />} label="Offer Letter Date" value={formatDate(record.offer_letter_date)} />
              <InfoRow icon={<Briefcase className="size-3.5" />} label="Job Role / Designation" value={record.job_role || "—"} />
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Offer Type</span>
                <OfferTypeBadge type={record.offer_type} />
              </div>
              <InfoRow icon={<MapPin className="size-3.5" />} label="Location" value={record.location || "—"} />
              <InfoRow icon={<Tags className="size-3.5" />} label="Placement Drive" value={record.drive_tag || "—"} />
            </div>
          )}

          {/* ── EDIT MODE ── */}
          {isEditing && (
            <div className="flex flex-col gap-4">
              {/* Company */}
              <div className="flex flex-col gap-2">
                <Label htmlFor="panel-company">Company Name</Label>
                <div className="relative">
                  <Building2 className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
                  <Input
                    id="panel-company"
                    className="pl-9"
                    placeholder="e.g. Google, Infosys…"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    disabled={saving}
                  />
                </div>
              </div>

              {/* CTC */}
              <div className="flex flex-col gap-2">
                <Label htmlFor="panel-ctc">CTC (LPA)</Label>
                <div className="relative">
                  <IndianRupee className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
                  <Input
                    id="panel-ctc"
                    type="number"
                    min={0}
                    step={0.5}
                    className="pl-9"
                    placeholder="e.g. 12.5"
                    value={ctc}
                    onChange={(e) => setCtc(e.target.value)}
                    disabled={saving}
                  />
                </div>
                <p className="text-[11px] text-muted-foreground">Lakhs Per Annum</p>
              </div>

              {/* Offer Letter Date */}
              <div className="flex flex-col gap-2">
                <Label htmlFor="panel-date">Offer Letter Date</Label>
                <div className="relative">
                  <Calendar className="absolute left-2.5 top-2.5 size-4 text-muted-foreground pointer-events-none" />
                  <Input
                    id="panel-date"
                    type="date"
                    className="pl-9"
                    value={offerLetterDate}
                    onChange={(e) => setOfferLetterDate(e.target.value)}
                    disabled={saving}
                  />
                </div>
              </div>

              {/* Job Role */}
              <div className="flex flex-col gap-2">
                <Label htmlFor="panel-role">Job Role / Designation</Label>
                <div className="relative">
                  <Briefcase className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
                  <Input
                    id="panel-role"
                    className="pl-9"
                    placeholder="e.g. Software Engineer, Data Analyst…"
                    value={jobRole}
                    onChange={(e) => setJobRole(e.target.value)}
                    disabled={saving}
                  />
                </div>
              </div>

              {/* Offer Type */}
              <div className="flex flex-col gap-2">
                <Label htmlFor="panel-offer-type">Offer Type</Label>
                <Select
                  value={offerType || "none"}
                  onValueChange={(val) => setOfferType(val === "none" ? "" : val as OfferType)}
                  disabled={saving}
                >
                  <SelectTrigger id="panel-offer-type">
                    <SelectValue placeholder="Select offer type…" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Not specified</SelectItem>
                    {OFFER_TYPE_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Location */}
              <div className="flex flex-col gap-2">
                <Label htmlFor="panel-location">Location</Label>
                <div className="relative">
                  <MapPin className="absolute left-2.5 top-2.5 size-4 text-muted-foreground pointer-events-none" />
                  <input
                    id="panel-location"
                    list="city-suggestions"
                    className={cn(
                      "flex h-10 w-full rounded-md border border-input bg-background pl-9 pr-3 py-2 text-sm",
                      "ring-offset-background placeholder:text-muted-foreground",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                      "disabled:cursor-not-allowed disabled:opacity-50"
                    )}
                    placeholder="e.g. Bengaluru, Maharashtra…"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    disabled={saving}
                  />
                  <datalist id="city-suggestions">
                    {INDIAN_CITIES.map((city) => (
                      <option key={city} value={city} />
                    ))}
                  </datalist>
                </div>
              </div>

              {/* Drive Tag */}
              <div className="flex flex-col gap-2">
                <Label htmlFor="panel-drive">Placement Drive / Batch Tag</Label>
                <div className="relative">
                  <Tags className="absolute left-2.5 top-2.5 size-4 text-muted-foreground pointer-events-none" />
                  <input
                    id="panel-drive"
                    list="drive-suggestions"
                    className={cn(
                      "flex h-10 w-full rounded-md border border-input bg-background pl-9 pr-3 py-2 text-sm",
                      "ring-offset-background placeholder:text-muted-foreground",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                      "disabled:cursor-not-allowed disabled:opacity-50"
                    )}
                    placeholder="e.g. TCS Campus Drive – March 2025"
                    value={driveTag}
                    onChange={(e) => setDriveTag(e.target.value)}
                    disabled={saving}
                  />
                  <datalist id="drive-suggestions">
                    {availableDrives.map((d) => (
                      <option key={d} value={d} />
                    ))}
                  </datalist>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Group this student under a campus drive or batch placement event.
                </p>
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-2">
                <Button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 gap-1.5"
                >
                  {saving ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Check className="size-4" />
                  )}
                  Save Changes
                </Button>
                <Button
                  variant="outline"
                  onClick={handleCancelEdit}
                  disabled={saving}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}

// Small helper for view-mode rows
function InfoRow({
  icon,
  label,
  value,
  highlight,
}: {
  icon: React.ReactNode
  label: string
  value: string
  highlight?: boolean
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
        {icon}
        {label}
      </span>
      <span className={cn("text-sm font-medium", highlight && "text-emerald-600 dark:text-emerald-400")}>
        {value}
      </span>
    </div>
  )
}


// ─── Export Dialog ─────────────────────────────────────────────────────────────

interface ExportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  filters: {
    search: string
    placedFilter: "all" | "placed" | "not_placed"
    passoutYear: string
    courseFilter: string
    ctcMin: string
    ctcMax: string
    driveFilter: string
  }
}

function ExportDialog({ open, onOpenChange, filters }: ExportDialogProps) {
  const [selectedCols, setSelectedCols] = useState<Set<string>>(
    new Set(EXPORT_COLUMNS.map((c) => c.key))
  )
  const [exporting, setExporting] = useState(false)

  const toggleCol = (key: string) => {
    setSelectedCols((prev) => {
      const next = new Set(prev)
      if (next.has(key)) {
        next.delete(key)
      } else {
        next.add(key)
      }
      return next
    })
  }

  const selectAll = () => setSelectedCols(new Set(EXPORT_COLUMNS.map((c) => c.key)))
  const clearAll = () => setSelectedCols(new Set())

  const doExport = async (format: "csv" | "xlsx") => {
    if (selectedCols.size === 0) {
      toast.error("Select at least one column to export.")
      return
    }
    try {
      setExporting(true)
      const rows = await exportPlacementData({
        ...filters,
        columns: Array.from(selectedCols),
      })

      if (rows.length === 0) {
        toast.info("No records to export with current filters.")
        return
      }

      if (format === "csv") {
        const headers = Object.keys(rows[0])
        const csvLines = [
          headers.join(","),
          ...rows.map((row) =>
            headers.map((h) => {
              const val = String(row[h] ?? "").replace(/"/g, '""')
              return val.includes(",") || val.includes('"') || val.includes("\n")
                ? `"${val}"`
                : val
            }).join(",")
          ),
        ]
        const blob = new Blob([csvLines.join("\n")], { type: "text/csv;charset=utf-8;" })
        const url = URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = `placement-report-${new Date().toISOString().slice(0, 10)}.csv`
        a.click()
        URL.revokeObjectURL(url)
      } else {
        // XLSX
        const XLSX = await import("xlsx")
        const ws = XLSX.utils.json_to_sheet(rows)
        const wb = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(wb, ws, "Placements")
        XLSX.writeFile(wb, `placement-report-${new Date().toISOString().slice(0, 10)}.xlsx`)
      }

      toast.success(`Exported ${rows.length} records as ${format.toUpperCase()}`)
      onOpenChange(false)
    } catch (err: any) {
      toast.error(err.message || "Export failed")
    } finally {
      setExporting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="size-5" />
            Export Placement Report
          </DialogTitle>
          <DialogDescription>
            Choose which columns to include in your export. Current filters will be applied.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          {/* Select / Deselect all */}
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-foreground">Columns</p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={selectAll}
                className="text-xs text-primary hover:underline"
              >
                Select all
              </button>
              <span className="text-xs text-muted-foreground">·</span>
              <button
                type="button"
                onClick={clearAll}
                className="text-xs text-muted-foreground hover:underline"
              >
                Clear all
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 rounded-md border p-3 bg-muted/30">
            {EXPORT_COLUMNS.map((col) => (
              <div key={col.key} className="flex items-center gap-2">
                <Checkbox
                  id={`export-col-${col.key}`}
                  checked={selectedCols.has(col.key)}
                  onCheckedChange={() => toggleCol(col.key)}
                />
                <label
                  htmlFor={`export-col-${col.key}`}
                  className="text-sm cursor-pointer select-none"
                >
                  {col.label}
                </label>
              </div>
            ))}
          </div>

          <p className="text-xs text-muted-foreground">
            {selectedCols.size} of {EXPORT_COLUMNS.length} columns selected
          </p>
        </div>

        <DialogFooter className="flex gap-2 sm:gap-2">
          <Button
            variant="outline"
            onClick={() => doExport("csv")}
            disabled={exporting || selectedCols.size === 0}
            className="flex-1 gap-1.5"
          >
            {exporting ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
            Export CSV
          </Button>
          <Button
            onClick={() => doExport("xlsx")}
            disabled={exporting || selectedCols.size === 0}
            className="flex-1 gap-1.5"
          >
            {exporting ? <Loader2 className="size-4 animate-spin" /> : <FileSpreadsheet className="size-4" />}
            Export Excel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}


// ─── Bulk Confirm Dialog ───────────────────────────────────────────────────────

interface BulkConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  count: number
  action: "not_placed" | null
  onConfirm: () => Promise<void>
}

function BulkConfirmDialog({ open, onOpenChange, count, action, onConfirm }: BulkConfirmDialogProps) {
  const [loading, setLoading] = useState(false)

  const handleConfirm = async () => {
    setLoading(true)
    try {
      await onConfirm()
      onOpenChange(false)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="size-5 text-amber-500" />
            Confirm Bulk Action
          </DialogTitle>
          <DialogDescription>
            {action === "not_placed" ? (
              <>
                You are about to mark <strong>{count} student{count !== 1 ? "s" : ""}</strong> as{" "}
                <strong>Not Placed</strong>. This will clear their company name, CTC, job role, offer
                type, location, and drive tag.
                <br />
                <br />
                <span className="text-destructive font-medium">This action cannot be undone from this view.</span>
              </>
            ) : (
              <>Mark {count} student{count !== 1 ? "s" : ""} as Placed?</>
            )}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button
            variant={action === "not_placed" ? "destructive" : "default"}
            onClick={handleConfirm}
            disabled={loading}
            className="gap-1.5"
          >
            {loading ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
            Confirm
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}


// ─── Company Grouping View ─────────────────────────────────────────────────────

function CompanyGroupView({ records }: { records: PlacementRecord[] }) {
  const [expandedCompanies, setExpandedCompanies] = useState<Set<string>>(new Set())

  const toggleCompany = (key: string) => {
    setExpandedCompanies((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  // Group by company
  const groups = new Map<string, PlacementRecord[]>()
  for (const r of records) {
    const key = r.company_name ?? "__unplaced__"
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(r)
  }

  const sortedGroups = Array.from(groups.entries()).sort((a, b) => {
    if (a[0] === "__unplaced__") return 1
    if (b[0] === "__unplaced__") return -1
    return b[1].length - a[1].length
  })

  const formatCtc = (ctc: number | null) => {
    if (ctc == null) return null
    return `₹${ctc.toFixed(1)} LPA`
  }

  return (
    <div className="flex flex-col gap-3">
      {sortedGroups.map(([key, groupRecords]) => {
        const isUnplaced = key === "__unplaced__"
        const isExpanded = expandedCompanies.has(key)
        const placed = groupRecords.filter((r) => r.company_name).length
        const ctcValues = groupRecords.map((r) => r.ctc).filter((c): c is number => c !== null)
        const avgCtc = ctcValues.length > 0
          ? ctcValues.reduce((a, b) => a + b, 0) / ctcValues.length
          : null

        return (
          <div
            key={key}
            className="rounded-lg border bg-card overflow-hidden shadow-sm"
          >
            {/* Company Header */}
            <button
              type="button"
              className="w-full flex items-center gap-4 p-4 hover:bg-muted/40 transition-colors text-left"
              onClick={() => toggleCompany(key)}
            >
              <div
                className={cn(
                  "flex items-center justify-center size-10 rounded-full shrink-0",
                  isUnplaced
                    ? "bg-red-50 dark:bg-red-900/20"
                    : "bg-primary/10"
                )}
              >
                {isUnplaced ? (
                  <X className="size-5 text-red-500" />
                ) : (
                  <Building2 className="size-5 text-primary" />
                )}
              </div>

              <div className="flex flex-col min-w-0 flex-1">
                <span className="font-semibold text-sm truncate">
                  {isUnplaced ? "Unplaced Students" : key}
                </span>
                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                  <span className="text-xs text-muted-foreground">
                    {groupRecords.length} student{groupRecords.length !== 1 ? "s" : ""}
                  </span>
                  {!isUnplaced && avgCtc !== null && (
                    <>
                      <span className="text-xs text-muted-foreground">·</span>
                      <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                        Avg {formatCtc(avgCtc)}
                      </span>
                    </>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <Badge variant={isUnplaced ? "destructive" : "secondary"} className="text-xs">
                  {isUnplaced ? placed === 0 ? groupRecords.length : placed : groupRecords.length}
                </Badge>
                {isExpanded ? (
                  <ChevronUp className="size-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="size-4 text-muted-foreground" />
                )}
              </div>
            </button>

            {/* Expanded student list */}
            {isExpanded && (
              <div className="border-t bg-muted/20">
                {groupRecords.map((record, idx) => (
                  <div
                    key={record.profile_id}
                    className={cn(
                      "flex items-center gap-3 px-4 py-3 hover:bg-muted/40 transition-colors",
                      idx !== groupRecords.length - 1 && "border-b border-border/50"
                    )}
                  >
                    <Avatar className="size-8 shrink-0">
                      <AvatarImage src={record.profile_image_path || undefined} />
                      <AvatarFallback className="text-[10px]">
                        {record.display_name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col min-w-0 flex-1">
                      <span className="text-sm font-medium truncate">{record.display_name}</span>
                      <span className="text-xs text-muted-foreground truncate">
                        {record.course_name || "—"} · {record.passout_year || "—"}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 shrink-0 flex-wrap justify-end">
                      {record.job_role && (
                        <span className="text-xs text-muted-foreground hidden sm:block">{record.job_role}</span>
                      )}
                      {record.ctc != null && (
                        <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                          {formatCtc(record.ctc)}
                        </span>
                      )}
                      {record.drive_tag && (
                        <Badge variant="secondary" className="text-[10px] gap-0.5 px-1.5 py-0.5 hidden sm:flex">
                          <Tags className="size-2.5" />
                          {record.drive_tag}
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      })}

      {sortedGroups.length === 0 && (
        <div className="rounded-md border bg-card p-8 text-center text-sm text-muted-foreground">
          No records to group.
        </div>
      )}
    </div>
  )
}


// ─── Main Client Component ────────────────────────────────────────────────────

export function PlacementListClient({
  records,
  totalCount,
  initialPage,
  initialPageSize,
  initialSearch,
  initialPlacedFilter,
  initialPassoutYear,
  initialCourse,
  initialSortCol,
  initialSortDir,
  availableYears,
  availableCourses,
  initialCtcMin,
  initialCtcMax,
  initialDrive,
  availableDrives,
}: Props) {
  const { push } = useRouter()
  const pathname = usePathname()

  const [isPending, startTransition] = useTransition()
  const [searchInput, setSearchInput] = useState(initialSearch)
  const isOwnUpdateRef = useRef(false)

  const [panelOpen, setPanelOpen] = useState(false)
  const [panelRecord, setPanelRecord] = useState<PlacementRecord | null>(null)

  // ── New state ──────────────────────────────────────────────────────────
  const [viewMode, setViewMode] = useState<"list" | "group">("list")
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [exportOpen, setExportOpen] = useState(false)
  const [bulkConfirmOpen, setBulkConfirmOpen] = useState(false)
  const [bulkAction, setBulkAction] = useState<"not_placed" | null>(null)
  const [ctcMinInput, setCtcMinInput] = useState(initialCtcMin)
  const [ctcMaxInput, setCtcMaxInput] = useState(initialCtcMax)

  // Sync search input on external navigation
  useEffect(() => {
    if (isOwnUpdateRef.current) {
      isOwnUpdateRef.current = false
      return
    }
    setSearchInput(initialSearch)
  }, [initialSearch])

  // Sync CTC inputs on external navigation
  useEffect(() => { setCtcMinInput(initialCtcMin) }, [initialCtcMin])
  useEffect(() => { setCtcMaxInput(initialCtcMax) }, [initialCtcMax])

  const updateParams = useCallback(
    (newParams: Partial<Record<string, string | number>>) => {
      const params = new URLSearchParams(window.location.search)
      Object.entries(newParams).forEach(([key, val]) => {
        if (val === undefined || val === "" || val === null) {
          params.delete(key)
        } else {
          params.set(key, String(val))
        }
      })
      startTransition(() => {
        push(`${pathname}?${params.toString()}`)
      })
    },
    [pathname, push]
  )

  const onDebouncedSearch = useEffectEvent(() => {
    isOwnUpdateRef.current = true
    updateParams({ search: searchInput, page: 1 })
  })

  useEffect(() => {
    if (searchInput === initialSearch) return
    const timer = setTimeout(onDebouncedSearch, 400)
    return () => clearTimeout(timer)
  }, [searchInput, initialSearch])

  // Debounced CTC filter
  const onDebouncedCtc = useEffectEvent(() => {
    updateParams({ ctcMin: ctcMinInput, ctcMax: ctcMaxInput, page: 1 })
  })

  useEffect(() => {
    if (ctcMinInput === initialCtcMin && ctcMaxInput === initialCtcMax) return
    const timer = setTimeout(onDebouncedCtc, 500)
    return () => clearTimeout(timer)
  }, [ctcMinInput, ctcMaxInput, initialCtcMin, initialCtcMax])

  const handlePlacedFilterChange = (val: "all" | "placed" | "not_placed") => {
    updateParams({ placed: val, page: 1 })
  }

  const handlePassoutYearChange = (val: string) => {
    updateParams({ year: val === "all" ? "" : val, page: 1 })
  }

  const handleCourseChange = (val: string) => {
    updateParams({ course: val === "all" ? "" : val, page: 1 })
  }

  const handleDriveChange = (val: string) => {
    updateParams({ drive: val === "all" ? "" : val, page: 1 })
  }

  const handlePageSizeChange = (val: string) => {
    updateParams({ size: val, page: 1 })
  }

  const handleSort = (col: SortColumn) => {
    let nextDir: "asc" | "desc" = "desc"
    let nextCol = col
    if (initialSortCol === col) {
      if (initialSortDir === "asc") {
        nextDir = "desc"
      } else {
        nextCol = "name"
        nextDir = "asc"
      }
    } else {
      nextDir = col === "name" || col === "course" || col === "company" ? "asc" : "desc"
    }
    updateParams({ sortBy: nextCol, sortOrder: nextDir, page: 1 })
  }

  // ── Reset all filters ──────────────────────────────────────────────────
  const hasActiveFilters =
    initialSearch ||
    initialPlacedFilter !== "all" ||
    initialPassoutYear ||
    initialCourse ||
    initialCtcMin ||
    initialCtcMax ||
    initialDrive

  const resetFilters = () => {
    isOwnUpdateRef.current = true
    setSearchInput("")
    setCtcMinInput("")
    setCtcMaxInput("")
    push(pathname)
  }

  const totalPages = Math.ceil(totalCount / initialPageSize)
  const activePage = Math.min(initialPage, Math.max(1, totalPages))

  const openPanel = (record: PlacementRecord) => {
    setPanelRecord(record)
    setPanelOpen(true)
  }

  const formatCtc = (ctc: number | null) => {
    if (ctc == null) return "—"
    return `₹${ctc.toFixed(1)} LPA`
  }

  // ── Selection helpers ──────────────────────────────────────────────────
  const allOnPageSelected = records.length > 0 && records.every((r) => selectedIds.has(r.profile_id))
  const someOnPageSelected = records.some((r) => selectedIds.has(r.profile_id))

  const toggleSelectAll = () => {
    if (allOnPageSelected) {
      setSelectedIds((prev) => {
        const next = new Set(prev)
        records.forEach((r) => next.delete(r.profile_id))
        return next
      })
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev)
        records.forEach((r) => next.add(r.profile_id))
        return next
      })
    }
  }

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const clearSelection = () => setSelectedIds(new Set())

  const triggerBulkAction = (action: "not_placed") => {
    setBulkAction(action)
    setBulkConfirmOpen(true)
  }

  const executeBulkAction = async () => {
    if (!bulkAction) return
    const ids = Array.from(selectedIds)
    await bulkSetPlacementStatus(ids, bulkAction)
    toast.success(`${ids.length} student${ids.length !== 1 ? "s" : ""} updated`)
    clearSelection()
  }

  return (
    <div className="flex flex-col gap-4">
      {/* ── Top Bar ─────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3">
        {/* Row 1: Search + actions */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {/* Search */}
          <div className="relative w-full sm:max-w-xs">
            {isPending ? (
              <Loader2 className="absolute left-2.5 top-2.5 size-4 text-muted-foreground animate-spin" />
            ) : (
              <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
            )}
            <Input
              placeholder="Search students…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="pl-9 pr-9"
            />
            {searchInput && (
              <button
                type="button"
                onClick={() => {
                  isOwnUpdateRef.current = true
                  setSearchInput("")
                  updateParams({ search: "", page: 1 })
                }}
                className="absolute right-2.5 top-2.5 size-4 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                title="Clear search"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* View mode toggle */}
            <div className="flex items-center border rounded-md p-1 bg-muted/50">
              <button
                type="button"
                onClick={() => setViewMode("list")}
                className={cn(
                  "px-2.5 py-1 text-xs font-medium rounded-sm transition-all flex items-center gap-1",
                  viewMode === "list"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
                title="List view"
              >
                <LayoutList className="size-3.5" />
                List
              </button>
              <button
                type="button"
                onClick={() => setViewMode("group")}
                className={cn(
                  "px-2.5 py-1 text-xs font-medium rounded-sm transition-all flex items-center gap-1",
                  viewMode === "group"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
                title="Group by company"
              >
                <LayoutGrid className="size-3.5" />
                Company
              </button>
            </div>

            {/* Export button */}
            <Button
              size="sm"
              variant="outline"
              className="h-8 gap-1.5"
              onClick={() => setExportOpen(true)}
            >
              <Download className="size-3.5" />
              Export
            </Button>

            {/* Reset filters */}
            {hasActiveFilters && (
              <Button
                size="sm"
                variant="outline"
                className="h-8 gap-1.5 text-muted-foreground hover:text-foreground"
                onClick={resetFilters}
                title="Reset all filters"
              >
                <RotateCcw className="size-3.5" />
                Reset filters
              </Button>
            )}
          </div>
        </div>

        {/* Row 2: Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Placed / Not Placed toggle */}
          <div className="flex items-center border rounded-md p-1 bg-muted/50">
            {(["all", "placed", "not_placed"] as const).map((f) => (
              <button
                type="button"
                key={f}
                onClick={() => handlePlacedFilterChange(f)}
                className={cn(
                  "px-3 py-1 text-xs font-medium rounded-sm transition-all",
                  initialPlacedFilter === f
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {f === "all" ? "All" : f === "placed" ? "Placed" : "Not Placed"}
              </button>
            ))}
          </div>

          {/* Passout Year */}
          <Select
            value={initialPassoutYear || "all"}
            onValueChange={handlePassoutYearChange}
          >
            <SelectTrigger className="h-8 w-[130px] text-xs">
              <SelectValue placeholder="Passout Year" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">All Years</SelectItem>
              {availableYears.map((y) => (
                <SelectItem key={y} value={String(y)} className="text-xs">
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Course */}
          <Select
            value={initialCourse || "all"}
            onValueChange={handleCourseChange}
          >
            <SelectTrigger className="h-8 w-[160px] text-xs">
              <SelectValue placeholder="Course" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">All Courses</SelectItem>
              {availableCourses.map((c) => (
                <SelectItem key={c} value={c} className="text-xs">
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Drive */}
          {availableDrives.length > 0 && (
            <Select
              value={initialDrive || "all"}
              onValueChange={handleDriveChange}
            >
              <SelectTrigger className="h-8 w-[180px] text-xs">
                <Tags className="size-3 mr-1 text-muted-foreground" />
                <SelectValue placeholder="Drive / Batch" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">All Drives</SelectItem>
                {availableDrives.map((d) => (
                  <SelectItem key={d} value={d} className="text-xs">
                    {d}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {/* CTC Range */}
          <div className="flex items-center gap-1.5 border rounded-md px-2 py-1 bg-muted/50 h-8">
            <IndianRupee className="size-3 text-muted-foreground shrink-0" />
            <input
              type="number"
              min={0}
              step={0.5}
              placeholder="Min"
              className="w-12 text-xs bg-transparent outline-none placeholder:text-muted-foreground"
              value={ctcMinInput}
              onChange={(e) => setCtcMinInput(e.target.value)}
            />
            <span className="text-xs text-muted-foreground">–</span>
            <input
              type="number"
              min={0}
              step={0.5}
              placeholder="Max"
              className="w-12 text-xs bg-transparent outline-none placeholder:text-muted-foreground"
              value={ctcMaxInput}
              onChange={(e) => setCtcMaxInput(e.target.value)}
            />
            <span className="text-xs text-muted-foreground">LPA</span>
            {(ctcMinInput || ctcMaxInput) && (
              <button
                type="button"
                onClick={() => {
                  setCtcMinInput("")
                  setCtcMaxInput("")
                  updateParams({ ctcMin: "", ctcMax: "", page: 1 })
                }}
                className="text-muted-foreground hover:text-foreground transition-colors ml-0.5"
              >
                <X className="size-3" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Bulk Action Bar ──────────────────────────────────────── */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 rounded-lg border bg-primary/5 border-primary/20 px-4 py-2.5 flex-wrap">
          <div className="flex items-center gap-2">
            <CheckSquare className="size-4 text-primary" />
            <span className="text-sm font-medium">
              {selectedIds.size} student{selectedIds.size !== 1 ? "s" : ""} selected
            </span>
          </div>
          <Separator orientation="vertical" className="h-5 hidden sm:block" />
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              size="sm"
              variant="destructive"
              className="h-7 gap-1.5 text-xs"
              onClick={() => triggerBulkAction("not_placed")}
            >
              <X className="size-3.5" />
              Mark as Not Placed
            </Button>
          </div>
          <button
            type="button"
            onClick={clearSelection}
            className="ml-auto text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Deselect all
          </button>
        </div>
      )}

      {/* ── Content ────────────────────────────────────────────── */}
      <div className={cn("flex flex-col gap-4 transition-opacity duration-200", isPending && "opacity-50 pointer-events-none")}>

        {/* ── Group View ── */}
        {viewMode === "group" && (
          <CompanyGroupView records={records} />
        )}

        {/* ── List View ── */}
        {viewMode === "list" && (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block rounded-md border bg-card overflow-hidden">
              <Table className="table-fixed w-full min-w-[1000px]">
                <colgroup>
                  <col className="w-[36px]" />
                  <col className="w-[20%]" />
                  <col className="w-[14%]" />
                  <col className="w-[7%]" />
                  <col className="w-[17%]" />
                  <col className="w-[9%]" />
                  <col className="w-[11%]" />
                  <col className="w-[13%]" />
                  <col className="w-[9%]" />
                </colgroup>
                <TableHeader>
                  <TableRow>
                    {/* Select all checkbox */}
                    <TableHead className="pr-0">
                      <button
                        type="button"
                        onClick={toggleSelectAll}
                        className="flex items-center justify-center w-full"
                        title={allOnPageSelected ? "Deselect all" : "Select all on page"}
                      >
                        {allOnPageSelected ? (
                          <CheckSquare className="size-4 text-primary" />
                        ) : someOnPageSelected ? (
                          <Square className="size-4 text-primary opacity-60" />
                        ) : (
                          <Square className="size-4 text-muted-foreground/50" />
                        )}
                      </button>
                    </TableHead>
                    <SortableHead label="Student" col="name" sortCol={initialSortCol} sortDir={initialSortDir} onSort={handleSort} />
                    <SortableHead label="Course" col="course" sortCol={initialSortCol} sortDir={initialSortDir} onSort={handleSort} />
                    <SortableHead label="Passout" col="passout" sortCol={initialSortCol} sortDir={initialSortDir} onSort={handleSort} />
                    <SortableHead label="Company" col="company" sortCol={initialSortCol} sortDir={initialSortDir} onSort={handleSort} />
                    <SortableHead label="CTC" col="ctc" sortCol={initialSortCol} sortDir={initialSortDir} onSort={handleSort} />
                    <TableHead className="text-xs font-semibold select-none">Offer Type</TableHead>
                    <TableHead className="text-xs font-semibold select-none">Drive Details</TableHead>
                    <TableHead className="text-xs font-semibold select-none">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {records.length > 0 ? (
                    records.map((record) => (
                      <TableRow
                        key={record.profile_id}
                        className={cn(
                          "cursor-pointer hover:bg-muted/50 transition-colors",
                          selectedIds.has(record.profile_id) && "bg-primary/5 hover:bg-primary/10"
                        )}
                        onClick={() => openPanel(record)}
                      >
                        {/* Checkbox */}
                        <TableCell
                          className="pr-0"
                          onClick={(e) => {
                            e.stopPropagation()
                            toggleSelect(record.profile_id)
                          }}
                        >
                          <div className="flex items-center justify-center">
                            {selectedIds.has(record.profile_id) ? (
                              <CheckSquare className="size-4 text-primary" />
                            ) : (
                              <Square className="size-4 text-muted-foreground/40 hover:text-muted-foreground transition-colors" />
                            )}
                          </div>
                        </TableCell>

                        {/* Student */}
                        <TableCell className="overflow-hidden">
                          <div className="flex items-center gap-3 min-w-0">
                            <Avatar className="size-8 shrink-0">
                              <AvatarImage src={record.profile_image_path || undefined} />
                              <AvatarFallback className="text-[10px]">
                                {record.display_name.charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-sm font-medium truncate">{record.display_name}</span>
                          </div>
                        </TableCell>

                        {/* Course */}
                        <TableCell className="text-sm truncate overflow-hidden">
                          {record.course_name || "—"}
                        </TableCell>

                        {/* Passout */}
                        <TableCell className="text-sm truncate overflow-hidden">
                          {record.passout_year || "—"}
                        </TableCell>

                        {/* Company */}
                        <TableCell className="truncate overflow-hidden">
                          {record.company_name ? (
                            <div className="flex items-center gap-1.5 min-w-0">
                              <Building2 className="size-3.5 shrink-0 text-muted-foreground" />
                              <span className="text-sm truncate">{record.company_name}</span>
                            </div>
                          ) : (
                            <span className="text-sm text-muted-foreground">—</span>
                          )}
                        </TableCell>

                        {/* CTC */}
                        <TableCell className="truncate overflow-hidden">
                          <span className={cn("text-sm font-medium", record.ctc != null && "text-emerald-600 dark:text-emerald-400")}>
                            {formatCtc(record.ctc)}
                          </span>
                        </TableCell>

                        {/* Offer Type */}
                        <TableCell className="overflow-hidden">
                          <OfferTypeBadge type={record.offer_type} />
                        </TableCell>

                        {/* Drive Details */}
                        <TableCell className="overflow-hidden">
                          {record.drive_tag ? (
                            <div className="flex items-center gap-1.5 min-w-0">
                              <Tags className="size-3.5 shrink-0 text-muted-foreground" />
                              <span className="text-xs truncate" title={record.drive_tag}>{record.drive_tag}</span>
                            </div>
                          ) : (
                            <span className="text-sm text-muted-foreground">—</span>
                          )}
                        </TableCell>

                        {/* Status */}
                        <TableCell className="overflow-hidden">
                          <PlacementStatusBadge placed={!!record.company_name} />
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={9} className="h-32 text-center text-sm text-muted-foreground">
                        No students found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Mobile Cards */}
            {records.length > 0 ? (
              <div className="grid grid-cols-1 gap-4 md:hidden">
                {records.map((record) => (
                  <div
                    key={record.profile_id}
                    className={cn(
                      "rounded-lg border bg-card p-4 shadow-sm flex flex-col gap-3 transition-colors",
                      selectedIds.has(record.profile_id) ? "border-primary/40 bg-primary/5" : "cursor-pointer hover:bg-muted/30 active:bg-muted/50"
                    )}
                    onClick={() => openPanel(record)}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Mobile select checkbox */}
                      <button
                        type="button"
                        className="shrink-0"
                        onClick={(e) => {
                          e.stopPropagation()
                          toggleSelect(record.profile_id)
                        }}
                      >
                        {selectedIds.has(record.profile_id) ? (
                          <CheckSquare className="size-5 text-primary" />
                        ) : (
                          <Square className="size-5 text-muted-foreground/40" />
                        )}
                      </button>
                      <Avatar className="size-10 shrink-0">
                        <AvatarImage src={record.profile_image_path || undefined} />
                        <AvatarFallback className="text-xs">
                          {record.display_name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col min-w-0 flex-1">
                        <span className="text-sm font-semibold truncate">{record.display_name}</span>
                        <span className="text-xs text-muted-foreground truncate">
                          {record.course_name || "No course"} · {record.passout_year || "—"}
                        </span>
                      </div>
                      <PlacementStatusBadge placed={!!record.company_name} />
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-3 border-t text-xs">
                      <div className="min-w-0">
                        <span className="text-muted-foreground block text-[10px] uppercase font-semibold tracking-wider">Company</span>
                        <span className="font-medium text-foreground truncate block mt-0.5">
                          {record.company_name || "—"}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <span className="text-muted-foreground block text-[10px] uppercase font-semibold tracking-wider">CTC</span>
                        <span className={cn("font-medium block mt-0.5", record.ctc != null ? "text-emerald-600 dark:text-emerald-400" : "text-foreground")}>
                          {formatCtc(record.ctc)}
                        </span>
                      </div>
                      <div className="col-span-2 flex items-center gap-2 flex-wrap">
                        <OfferTypeBadge type={record.offer_type} />
                        {record.drive_tag && (
                          <Badge variant="secondary" className="text-[10px] gap-0.5 px-1.5 py-0.5">
                            <Tags className="size-2.5" />
                            {record.drive_tag}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="md:hidden rounded-md border bg-card p-8 text-center text-sm text-muted-foreground">
                No students found.
              </div>
            )}
          </>
        )}

        {/* Pagination */}
        {totalCount > 0 && viewMode === "list" && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-1">
            <div className="text-xs text-muted-foreground">
              Showing{" "}
              <span className="font-medium">{Math.min(totalCount, (activePage - 1) * initialPageSize + 1)}</span>
              {" "}to{" "}
              <span className="font-medium">{Math.min(totalCount, activePage * initialPageSize)}</span>
              {" "}of{" "}
              <span className="font-medium">{totalCount}</span> students
            </div>

            <div className="flex flex-wrap items-center gap-4 sm:gap-6">
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground whitespace-nowrap">Rows per page</span>
                <Select
                  value={initialPageSize.toString()}
                  onValueChange={handlePageSizeChange}
                >
                  <SelectTrigger className="h-8 w-[70px] text-xs">
                    <SelectValue placeholder={initialPageSize.toString()} />
                  </SelectTrigger>
                  <SelectContent>
                    {[5, 10, 20, 50, 100].map((size) => (
                      <SelectItem key={size} value={size.toString()} className="text-xs">
                        {size}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-1">
                <Button
                  variant="outline" size="icon" className="size-8"
                  onClick={() => updateParams({ page: 1 })}
                  disabled={activePage === 1}
                >
                  <ChevronsLeft className="size-4" />
                  <span className="sr-only">First page</span>
                </Button>
                <Button
                  variant="outline" size="icon" className="size-8"
                  onClick={() => updateParams({ page: Math.max(1, activePage - 1) })}
                  disabled={activePage === 1}
                >
                  <ChevronLeft className="size-4" />
                  <span className="sr-only">Previous page</span>
                </Button>

                <div className="flex items-center justify-center text-xs font-medium min-w-[80px]">
                  Page {activePage} of {totalPages}
                </div>

                <Button
                  variant="outline" size="icon" className="size-8"
                  onClick={() => updateParams({ page: Math.min(totalPages, activePage + 1) })}
                  disabled={activePage === totalPages || totalPages === 0}
                >
                  <ChevronRight className="size-4" />
                  <span className="sr-only">Next page</span>
                </Button>
                <Button
                  variant="outline" size="icon" className="size-8"
                  onClick={() => updateParams({ page: totalPages })}
                  disabled={activePage === totalPages || totalPages === 0}
                >
                  <ChevronsRight className="size-4" />
                  <span className="sr-only">Last page</span>
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Student Detail Panel ────────────────────────────────── */}
      <StudentDetailPanel
        open={panelOpen}
        onOpenChange={setPanelOpen}
        record={panelRecord}
        onSaved={() => {
          // revalidatePath in the action refreshes the server data automatically
        }}
        availableDrives={availableDrives}
      />

      {/* ── Export Dialog ───────────────────────────────────────── */}
      <ExportDialog
        open={exportOpen}
        onOpenChange={setExportOpen}
        filters={{
          search: initialSearch,
          placedFilter: initialPlacedFilter,
          passoutYear: initialPassoutYear,
          courseFilter: initialCourse,
          ctcMin: initialCtcMin,
          ctcMax: initialCtcMax,
          driveFilter: initialDrive,
        }}
      />

      {/* ── Bulk Confirm Dialog ─────────────────────────────────── */}
      <BulkConfirmDialog
        open={bulkConfirmOpen}
        onOpenChange={setBulkConfirmOpen}
        count={selectedIds.size}
        action={bulkAction}
        onConfirm={executeBulkAction}
      />
    </div>
  )
}
