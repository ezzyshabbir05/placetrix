"use client"

import { useState, useMemo, useTransition, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter, CardAction } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import {
  LayoutList, Plus, MapPin, Clock, Users, Briefcase, IndianRupee, CalendarClock, PenLine,
  Trash2, Play, Pause, CheckCircle2, X, Eye, Archive, Loader2, BriefcaseBusiness, MoreVertical,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import type {
  JobPosting, JobPostingForm, JobPostingStatus, JobType, WorkMode,
} from "./_types"
import {
  JOB_TYPE_LABELS, WORK_MODE_LABELS, STATUS_LABELS, emptyForm,
} from "./_types"
import {
  createPostingAction, updatePostingAction, togglePostingStatusAction, deletePostingAction,
} from "./actions"

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(dt?: string): string {
  if (!dt) return "—"
  return new Date(dt).toLocaleDateString("en-IN", { dateStyle: "medium" })
}

function formatSalary(min?: number, max?: number): string | null {
  if (!min && !max) return null
  const fmt = (n: number) => {
    if (n >= 100000) return `₹${(n / 100000).toFixed(n % 100000 === 0 ? 0 : 1)}L`
    if (n >= 1000) return `₹${(n / 1000).toFixed(0)}K`
    return `₹${n}`
  }
  if (min && max) return `${fmt(min)} – ${fmt(max)}`
  if (min) return `From ${fmt(min)}`
  return `Up to ${fmt(max!)}`
}

type Tab = "all" | "active" | "draft" | "paused" | "closed"

// ─── Status Badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: JobPostingStatus }) {
  switch (status) {
    case "active":
      return (
        <Badge className="gap-1.5 bg-emerald-500 hover:bg-emerald-500 text-white border-0 text-[11px] px-2 py-0.5">
          <span className="relative flex h-1.5 w-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-white" />
          </span>
          Active
        </Badge>
      )
    case "draft":
      return (
        <Badge variant="outline" className="gap-1 text-[11px] px-2 py-0.5 text-muted-foreground border-dashed">
          <PenLine className="h-3 w-3" />Draft
        </Badge>
      )
    case "paused":
      return (
        <Badge variant="secondary" className="gap-1 text-[11px] px-2 py-0.5">
          <Pause className="h-3 w-3" />Paused
        </Badge>
      )
    case "closed":
      return (
        <Badge variant="outline" className="gap-1 text-[11px] px-2 py-0.5 text-muted-foreground">
          <CheckCircle2 className="h-3 w-3" />Closed
        </Badge>
      )
  }
}

// ─── Stat Pill ────────────────────────────────────────────────────────────────

function StatPill({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <span className="flex items-center gap-1 text-xs text-muted-foreground">
      {icon}{label}
    </span>
  )
}

// ─── Posting Card ─────────────────────────────────────────────────────────────

function PostingCard({
  posting, onEdit, onToggleStatus, onDelete, onClose, router
}: {
  posting: JobPosting
  onEdit: (p: JobPosting) => void
  onToggleStatus: (id: string, status: JobPostingStatus) => void
  onDelete: (id: string) => void
  onClose: (id: string) => void
  router: any
}) {
  const salary = formatSalary(posting.salary_min, posting.salary_max)
  const isExpired = posting.application_deadline && new Date(posting.application_deadline) < new Date()

  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-3 border-b border-border/50">
        <div className="flex items-start justify-between gap-3 relative">
          <div className="space-y-1 min-w-0 pr-8">
            <CardTitle className="text-base leading-snug">{posting.title}</CardTitle>
            <CardDescription className={cn("text-xs", posting.description ? "line-clamp-2" : "italic text-muted-foreground/60")}>
              {posting.description ?? "No description provided"}
            </CardDescription>
          </div>
          <CardAction className="absolute right-0 top-0 mt-0">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0">
                  <span className="sr-only">Open menu</span>
                  <MoreVertical className="h-4 w-4 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onEdit(posting)}>
                  <PenLine className="h-4 w-4 mr-2 text-muted-foreground" /> Edit
                </DropdownMenuItem>
                
                {posting.status === "draft" && (
                  <DropdownMenuItem onClick={() => onToggleStatus(posting.id, "active")}>
                    <Play className="h-4 w-4 mr-2 text-emerald-600" /> Publish
                  </DropdownMenuItem>
                )}
                
                {posting.status === "active" && (
                  <DropdownMenuItem onClick={() => onToggleStatus(posting.id, "paused")}>
                    <Pause className="h-4 w-4 mr-2 text-muted-foreground" /> Pause
                  </DropdownMenuItem>
                )}
                
                {posting.status === "paused" && (
                  <DropdownMenuItem onClick={() => onToggleStatus(posting.id, "active")}>
                    <Play className="h-4 w-4 mr-2 text-emerald-600" /> Resume
                  </DropdownMenuItem>
                )}
                
                {posting.status !== "closed" && (
                  <DropdownMenuItem onClick={() => onClose(posting.id)}>
                    <Archive className="h-4 w-4 mr-2 text-muted-foreground" /> Close
                  </DropdownMenuItem>
                )}
                
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-destructive focus:bg-destructive/10 focus:text-destructive" onClick={() => onDelete(posting.id)}>
                  <Trash2 className="h-4 w-4 mr-2" /> Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </CardAction>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col flex-1 gap-4 pt-4 pb-4">
        <div className="flex items-center justify-between mb-1">
          <StatusBadge status={posting.status} />
          {posting.application_deadline && (
            <div className={cn("flex items-center gap-1.5 text-[11px] font-medium", isExpired ? "text-red-500" : "text-muted-foreground")}>
              <CalendarClock className="h-3.5 w-3.5 shrink-0" />
              {isExpired ? "Expired" : formatDate(posting.application_deadline)}
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-x-4 gap-y-1.5">
          <StatPill icon={<Briefcase className="h-3.5 w-3.5" />} label={JOB_TYPE_LABELS[posting.job_type]} />
          <StatPill icon={<MapPin className="h-3.5 w-3.5" />} label={posting.location || WORK_MODE_LABELS[posting.work_mode]} />
          {salary && <StatPill icon={<IndianRupee className="h-3.5 w-3.5" />} label={salary} />}
        </div>

        {posting.skills.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {posting.skills.slice(0, 5).map((s) => (
              <Badge key={s} variant="secondary" className="text-[10px] px-1.5 py-0 font-normal">{s}</Badge>
            ))}
            {posting.skills.length > 5 && (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 font-normal">+{posting.skills.length - 5}</Badge>
            )}
          </div>
        )}
      </CardContent>
      <CardFooter className="pt-0 pb-4 px-4 flex justify-between items-center border-t border-border/50 mt-auto pt-4 bg-muted/20">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">
            {posting.application_count} {posting.application_count === 1 ? 'Applicant' : 'Applicants'}
          </span>
        </div>
        <Button 
          variant={posting.application_count > 0 ? "default" : "outline"}
          size="sm" 
          className="gap-1.5"
          onClick={() => router.push(`/postings/${posting.id}/applications`)}
        >
          View Candidates
        </Button>
      </CardFooter>
    </Card>
  )
}

// ─── Empty State ──────────────────────────────────────────────────────────────

function EmptyState({ isFiltered, onCreate }: { isFiltered: boolean; onCreate: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center gap-3">
      <div className="h-12 w-12 rounded-xl bg-muted flex items-center justify-center">
        <BriefcaseBusiness className="h-5 w-5 text-muted-foreground/60" />
      </div>
      <div className="space-y-0.5">
        <p className="text-sm font-medium">{isFiltered ? "No postings in this category" : "No job postings yet"}</p>
        <p className="text-xs text-muted-foreground">{isFiltered ? "Try switching tabs to view others" : "Create your first job posting to attract candidates"}</p>
      </div>
      {!isFiltered && (
        <Button size="sm" onClick={onCreate} className="gap-1.5 mt-1"><Plus className="h-3.5 w-3.5" />Create Posting</Button>
      )}
    </div>
  )
}

// ─── Create / Edit Dialog ─────────────────────────────────────────────────────

function PostingDialog({
  open, onOpenChange, initial, editId, onSuccess,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  initial: JobPostingForm
  editId: string | null
  onSuccess: () => void
}) {
  const [form, setForm] = useState<JobPostingForm>(initial)
  const [skillInput, setSkillInput] = useState("")
  const [isPending, startTransition] = useTransition()

  const set = useCallback(<K extends keyof JobPostingForm>(key: K, val: JobPostingForm[K]) => {
    setForm((prev) => ({ ...prev, [key]: val }))
  }, [])

  const addSkill = useCallback(() => {
    const s = skillInput.trim()
    if (s && !form.skills.includes(s)) {
      set("skills", [...form.skills, s])
      setSkillInput("")
    }
  }, [skillInput, form.skills, set])

  const removeSkill = useCallback((skill: string) => {
    set("skills", form.skills.filter((s) => s !== skill))
  }, [form.skills, set])

  const handleSave = (status: JobPostingStatus) => {
    if (!form.title.trim()) { toast.error("Title is required"); return }
    startTransition(async () => {
      try {
        const payload = { ...form, status }
        if (editId) {
          await updatePostingAction(editId, payload)
          toast.success("Posting updated")
        } else {
          await createPostingAction(payload)
          toast.success(status === "active" ? "Posting published!" : "Draft saved")
        }
        onOpenChange(false)
        onSuccess()
      } catch (err: any) {
        toast.error(err.message ?? "Something went wrong")
      }
    })
  }

  // Reset form when dialog opens
  const handleOpenChange = (o: boolean) => {
    if (o) setForm(initial)
    onOpenChange(o)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editId ? "Edit Posting" : "New Job Posting"}</DialogTitle>
          <DialogDescription>
            {editId ? "Update your job posting details." : "Fill in the details to create a new job posting."}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-5 py-2">
          {/* Title */}
          <div className="grid gap-2">
            <Label htmlFor="title">Job Title *</Label>
            <Input id="title" placeholder="e.g. Software Engineer" value={form.title} onChange={(e) => set("title", e.target.value)} />
          </div>

          {/* Description */}
          <div className="grid gap-2">
            <Label htmlFor="desc">Description</Label>
            <Textarea id="desc" placeholder="Describe the role, responsibilities, and what makes it exciting…" rows={4} value={form.description} onChange={(e) => set("description", e.target.value)} />
          </div>

          {/* Requirements */}
          <div className="grid gap-2">
            <Label htmlFor="req">Requirements</Label>
            <Textarea id="req" placeholder="Qualifications, experience, education…" rows={3} value={form.requirements} onChange={(e) => set("requirements", e.target.value)} />
          </div>

          {/* Type + Mode + Location */}
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="grid gap-2">
              <Label>Job Type</Label>
              <Select value={form.job_type} onValueChange={(v) => set("job_type", v as JobType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.entries(JOB_TYPE_LABELS) as [JobType, string][]).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Work Mode</Label>
              <Select value={form.work_mode} onValueChange={(v) => set("work_mode", v as WorkMode)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.entries(WORK_MODE_LABELS) as [WorkMode, string][]).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="loc">Location</Label>
              <Input id="loc" placeholder="e.g. Mumbai" value={form.location} onChange={(e) => set("location", e.target.value)} />
            </div>
          </div>

          {/* Salary */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="salmin">Salary Min (₹)</Label>
              <Input id="salmin" type="number" placeholder="e.g. 400000" value={form.salary_min} onChange={(e) => set("salary_min", e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="salmax">Salary Max (₹)</Label>
              <Input id="salmax" type="number" placeholder="e.g. 800000" value={form.salary_max} onChange={(e) => set("salary_max", e.target.value)} />
            </div>
          </div>

          {/* Skills */}
          <div className="grid gap-2">
            <Label>Skills</Label>
            <div className="flex gap-2">
              <Input
                placeholder="Add a skill and press Enter"
                value={skillInput}
                onChange={(e) => setSkillInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addSkill() } }}
              />
              <Button type="button" variant="outline" size="sm" onClick={addSkill} className="shrink-0 h-9">Add</Button>
            </div>
            {form.skills.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-1">
                {form.skills.map((s) => (
                  <Badge key={s} variant="secondary" className="gap-1 text-xs pr-1">
                    {s}
                    <button type="button" onClick={() => removeSkill(s)} className="ml-0.5 rounded-full hover:bg-muted-foreground/20 p-0.5">
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Deadline */}
          <div className="grid gap-2 sm:max-w-xs">
            <Label htmlFor="deadline">Application Deadline</Label>
            <Input id="deadline" type="date" value={form.application_deadline ? form.application_deadline.slice(0, 10) : ""} onChange={(e) => set("application_deadline", e.target.value ? new Date(e.target.value).toISOString() : "")} />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => handleSave("draft")} disabled={isPending}>
            {isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : null}
            Save as Draft
          </Button>
          <Button onClick={() => handleSave("active")} disabled={isPending}>
            {isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <Play className="h-4 w-4 mr-1.5" />}
            {editId ? "Save & Publish" : "Publish"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface Props {
  postings: JobPosting[]
}

export function PostingsClient({ postings }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>("all")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<JobPostingForm>(emptyForm())
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [closeId, setCloseId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  const active = useMemo(() => postings.filter((p) => p.status === "active"), [postings])
  const drafts = useMemo(() => postings.filter((p) => p.status === "draft"), [postings])
  const paused = useMemo(() => postings.filter((p) => p.status === "paused"), [postings])
  const closed = useMemo(() => postings.filter((p) => p.status === "closed"), [postings])

  const tabConfig: { value: Tab; label: string; count: number }[] = [
    { value: "all", label: "All", count: postings.length },
    { value: "active", label: "Active", count: active.length },
    { value: "draft", label: "Drafts", count: drafts.length },
    { value: "paused", label: "Paused", count: paused.length },
    { value: "closed", label: "Closed", count: closed.length },
  ]

  const tabPostings: Record<Tab, JobPosting[]> = { all: postings, active, draft: drafts, paused, closed }

  const handleCreate = () => {
    setEditId(null)
    setEditForm(emptyForm())
    setDialogOpen(true)
  }

  const handleEdit = (p: JobPosting) => {
    setEditId(p.id)
    setEditForm({
      title: p.title,
      description: p.description ?? "",
      requirements: p.requirements ?? "",
      job_type: p.job_type,
      work_mode: p.work_mode,
      location: p.location ?? "",
      salary_min: p.salary_min ? String(p.salary_min) : "",
      salary_max: p.salary_max ? String(p.salary_max) : "",
      skills: p.skills,
      application_deadline: p.application_deadline ?? "",
      status: p.status,
    })
    setDialogOpen(true)
  }

  const handleToggleStatus = (id: string, newStatus: JobPostingStatus) => {
    startTransition(async () => {
      try {
        await togglePostingStatusAction(id, newStatus)
        toast.success(`Posting ${STATUS_LABELS[newStatus].toLowerCase()}`)
        router.refresh()
      } catch (err: any) {
        toast.error(err.message)
      }
    })
  }

  const handleClose = () => {
    if (!closeId) return
    startTransition(async () => {
      try {
        await togglePostingStatusAction(closeId, "closed")
        toast.success("Posting closed")
        setCloseId(null)
        router.refresh()
      } catch (err: any) {
        toast.error(err.message)
      }
    })
  }

  const handleDelete = () => {
    if (!deleteId) return
    startTransition(async () => {
      try {
        await deletePostingAction(deleteId)
        toast.success("Posting deleted")
        setDeleteId(null)
        router.refresh()
      } catch (err: any) {
        toast.error(err.message)
      }
    })
  }

  return (
    <div className="flex flex-col gap-6 px-4 py-8 md:px-8">
      {/* Page Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <h1 className="text-3xl font-bold font-cirka tracking-tight text-foreground">Job Postings</h1>
          <p className="text-sm text-muted-foreground">
            {postings.length} posting{postings.length !== 1 ? "s" : ""} total
            {active.length > 0 && (
              <span className="ml-2 inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                {active.length} active
              </span>
            )}
          </p>
        </div>
        <Button size="sm" onClick={handleCreate} className="gap-1.5 shrink-0">
          <Plus className="h-3.5 w-3.5" />Create Posting
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as Tab)}>
        <div className="overflow-x-auto">
          <TabsList className="inline-flex h-9 gap-0.5 rounded-lg bg-muted p-1">
            {tabConfig.map(({ value, label, count }) => (
              <TabsTrigger key={value} value={value} className="gap-1.5 rounded-md px-3 text-xs font-medium data-[state=active]:bg-background data-[state=active]:shadow-sm">
                {label}
                {count > 0 && (
                  <span className={cn(
                    "inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-semibold tabular-nums",
                    activeTab === value ? "bg-foreground text-background" : "bg-muted-foreground/20 text-muted-foreground"
                  )}>{count}</span>
                )}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        <div className="mt-4">
          {tabConfig.map(({ value }) => (
            <TabsContent key={value} value={value} className="mt-0 outline-none">
              {tabPostings[value].length === 0 ? (
                <EmptyState isFiltered={value !== "all"} onCreate={handleCreate} />
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {tabPostings[value].map((p) => (
                    <PostingCard key={p.id} posting={p} onEdit={handleEdit} onToggleStatus={handleToggleStatus} onDelete={(id) => setDeleteId(id)} onClose={(id) => setCloseId(id)} router={router} />
                  ))}
                </div>
              )}
            </TabsContent>
          ))}
        </div>
      </Tabs>

      {/* Create / Edit Dialog */}
      <PostingDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        initial={editForm}
        editId={editId}
        onSuccess={() => router.refresh()}
      />

      {/* Close Confirmation */}
      <AlertDialog open={!!closeId} onOpenChange={(o) => { if (!o) setCloseId(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Close this posting?</AlertDialogTitle>
            <AlertDialogDescription>Are you sure you want to close this job posting? Candidates will no longer be able to apply.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleClose} disabled={isPending}>
              {isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <Archive className="h-4 w-4 mr-1.5" />}
              Close Posting
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(o) => { if (!o) setDeleteId(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this posting?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone. The job posting will be permanently removed.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isPending} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <Trash2 className="h-4 w-4 mr-1.5" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
