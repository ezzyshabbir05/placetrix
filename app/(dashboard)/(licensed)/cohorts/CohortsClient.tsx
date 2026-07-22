"use client"

import { useState, useTransition, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription, EmptyContent, EmptyMedia } from "@/components/ui/empty"
import { Spinner } from "@/components/ui/spinner"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Users,
  Plus,
  ChevronRight,
  Loader2,
  UsersRound,
  Search,
  Calendar,
  X,
} from "lucide-react"
import { toast } from "sonner"
import { createCohortAction } from "./actions"
import type { Cohort } from "./types"
import { cn } from "@/lib/utils"

interface Props {
  cohorts: Cohort[]
  isCandidate?: boolean
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatDateTime(dt?: string): string {
  if (!dt) return "—"
  return new Date(dt).toLocaleDateString("en-IN", { dateStyle: "medium" })
}

// ─── Stat Chip ───────────────────────────────────────────────────────────────
function StatChip({
  icon,
  children,
  tone = "neutral",
}: {
  icon: React.ReactNode
  children: React.ReactNode
  tone?: "neutral" | "sky" | "emerald" | "amber" | "violet" | "rose"
}) {
  const tones = {
    neutral: "border-border/60 bg-muted/50 text-muted-foreground",
    sky: "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-500/20 dark:bg-sky-500/10 dark:text-sky-300",
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300",
    amber: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300",
    violet: "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-500/20 dark:bg-violet-500/10 dark:text-violet-300",
    rose: "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-300",
  } as const

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium",
        tones[tone]
      )}
    >
      {icon}
      <span className="truncate">{children}</span>
    </span>
  )
}

// ─── Cohort Card ─────────────────────────────────────────────────────────────
function CohortCard({ cohort, isCandidate }: { cohort: Cohort; isCandidate?: boolean }) {
  const createdDate = formatDateTime(cohort.created_at)

  const cardContent = (
    <>
      {/* Mobile Compact View */}
      <div className="p-3.5 block md:hidden">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex items-center gap-2 w-full min-w-0">
              <h4 className="font-semibold text-sm text-foreground truncate leading-snug min-w-0 flex-1">
                {cohort.name}
              </h4>
            </div>
            <p className={cn("text-xs line-clamp-1", cohort.description ? "text-muted-foreground" : "italic text-muted-foreground/60")}>
              {cohort.description ?? "No description provided"}
            </p>
            <div className="flex items-center gap-2 text-[10px] text-muted-foreground flex-wrap">
              {!isCandidate && (
                <>
                  <span className="flex items-center gap-1">
                    <Users className="h-3 w-3 shrink-0" />
                    {cohort.student_count ?? 0} students
                  </span>
                  <span>•</span>
                </>
              )}
              <span>Created: {createdDate}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Desktop Card View */}
      <div className="hidden md:flex flex-row items-center justify-between gap-4 p-5">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 w-full min-w-0">
            <h3 className="min-w-0 flex-1 text-base font-semibold leading-tight text-foreground truncate">
              {cohort.name}
            </h3>
          </div>
          <p className={cn("mt-1 text-xs leading-normal line-clamp-1", cohort.description ? "text-muted-foreground" : "italic text-muted-foreground/60")}>
            {cohort.description ?? "No description provided"}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {!isCandidate && (
              <StatChip icon={<Users className="h-3.5 w-3.5" />} tone="neutral">
                {cohort.student_count ?? 0} students
              </StatChip>
            )}
            <StatChip icon={<Calendar className="h-3.5 w-3.5" />} tone="neutral">
              Created: {createdDate}
            </StatChip>
          </div>
        </div>
        {!isCandidate && (
          <div className="flex items-center gap-1 shrink-0">
            <ChevronRight className="h-5 w-5 text-muted-foreground/80" />
          </div>
        )}
      </div>
    </>
  )

  return (
    <Card className="overflow-hidden border-border/70 bg-card p-0 shadow-xs">
      {isCandidate ? (
        <div className="block">{cardContent}</div>
      ) : (
        <Link href={`/cohorts/${cohort.id}`} className="block hover:bg-muted/30 transition-colors">
          {cardContent}
        </Link>
      )}
    </Card>
  )
}

export function CohortsClient({ cohorts: initialCohorts, isCandidate = false }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [cohorts, setCohorts] = useState<Cohort[]>(initialCohorts)
  const [search, setSearch] = useState("")

  useEffect(() => {
    setCohorts(initialCohorts)
  }, [initialCohorts])

  // Create dialog state
  const [createOpen, setCreateOpen] = useState(false)
  const [newName, setNewName] = useState("")
  const [newDescription, setNewDescription] = useState("")

  const filteredCohorts = cohorts.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      (c.description?.toLowerCase().includes(search.toLowerCase()) ?? false)
  )

  const handleCreate = () => {
    if (!newName.trim()) {
      toast.error("Please enter a cohort name.")
      return
    }

    startTransition(async () => {
      try {
        const result = await createCohortAction({ name: newName, description: newDescription })
        if (result.success) {
          toast.success(`Cohort "${newName}" created!`)
          setCreateOpen(false)
          setNewName("")
          setNewDescription("")
          router.refresh()
        }
      } catch (err: any) {
        toast.error(err.message || "Failed to create cohort.")
      }
    })
  }

  const totalStudents = cohorts.reduce((sum, c) => sum + (c.student_count ?? 0), 0)

  return (
    <div className="flex flex-col gap-6 px-4 py-8 md:px-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <h1 className="text-3xl font-bold font-cirka tracking-tight text-foreground">Cohorts</h1>
          <p className="text-sm text-muted-foreground">
            {cohorts.length} cohort{cohorts.length !== 1 ? "s" : ""} total
            {!isCandidate && totalStudents > 0 && (
              <span className="ml-2 inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                {totalStudents} students
              </span>
            )}
          </p>
        </div>
        {!isCandidate && (
          <Button
            className="gap-1.5 cursor-pointer shrink-0"
            onClick={() => setCreateOpen(true)}
          >
            <Plus className="h-3.5 w-3.5" />
            New Cohort
          </Button>
        )}
      </div>

      <div className="space-y-4">
        {/* Search */}
        <div className="flex items-stretch gap-4 max-w-sm">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search cohorts..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-9"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-2.5 top-2.5 h-4 w-4 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Cohort List */}
        {filteredCohorts.length === 0 ? (
          <Empty className="border border-dashed border-border/60 rounded-xl bg-card/50 p-12">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <UsersRound className="h-5 w-5 text-muted-foreground/60" />
              </EmptyMedia>
              <EmptyTitle>No cohorts found</EmptyTitle>
              <EmptyDescription>
                {search ? "No matching cohorts were found. Try adjusting your search query." : (isCandidate ? "You are not enrolled in any cohorts yet." : "No cohorts yet. Create your first cohort to get started.")}
              </EmptyDescription>
            </EmptyHeader>
            {!search && !isCandidate && (
              <EmptyContent>
                <Button variant="outline" size="sm" onClick={() => setCreateOpen(true)} className="gap-1.5 mt-1">
                  <Plus className="h-3.5 w-3.5" /> Create Cohort
                </Button>
              </EmptyContent>
            )}
          </Empty>
        ) : (
          <div className="flex flex-col gap-3">
            {filteredCohorts.map((cohort) => (
              <CohortCard
                key={cohort.id}
                cohort={cohort}
                isCandidate={isCandidate}
              />
            ))}
          </div>
        )}
      </div>

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Cohort</DialogTitle>
            <DialogDescription>
              A cohort is a named group of students. You can add students and assign events, tests, and drives to it.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="cohort-name">Cohort Name *</Label>
              <Input
                id="cohort-name"
                placeholder="e.g. CS 2026 Batch"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="cohort-desc">Description (Optional)</Label>
              <Textarea
                id="cohort-desc"
                placeholder="Brief description of who this cohort is for..."
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)} disabled={isPending}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={isPending} className="gap-1.5">
              {isPending ? <Spinner /> : <Plus className="h-4 w-4" />}
              Create Cohort
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
