"use client"

import { useState, useTransition, useEffect, useMemo, useRef, useCallback } from "react"
import { useRouter, usePathname } from "next/navigation"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription, EmptyContent, EmptyMedia } from "@/components/ui/empty"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import {
  ArrowLeft,
  Users,
  Plus,
  Trash2,
  Loader2,
  Search,
  UserPlus,
  Pencil,
  GraduationCap,
  Calendar,
  UserMinus,
  X,
  MoreHorizontal,
  CheckSquare,
} from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { buildStorageUrl } from "@/lib/storage"
import {
  updateCohortAction,
  addStudentsToCohortAction,
  removeStudentFromCohortAction,
  getInstituteStudentsNotInCohortAction,
  getCohortMembersAction,
  deleteCohortAction,
  getInstituteFiltersAction,
  addStudentsToCohortByEmailAction,
  removeStudentsFromCohortAction,
} from "../actions"
import type { Cohort, CohortMember } from "../types"

interface Props {
  cohort: Cohort
  initialMembers: CohortMember[]
  totalCount: number
  initialPage: number
  initialPageSize: number
  initialSearch: string
}

function BulkAddStudentsDialog({
  open,
  onOpenChange,
  cohortId,
  onSuccess,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  cohortId: string
  onSuccess: () => void
}) {
  const [isPending, startTransition] = useTransition()
  const [emailsText, setEmailsText] = useState("")
  const [results, setResults] = useState<{addedCount: number, notFoundEmails: string[]} | null>(null)

  useEffect(() => {
    if (open) {
      setEmailsText("")
      setResults(null)
    }
  }, [open])

  const handleAdd = () => {
    if (!emailsText.trim()) {
      toast.error("Please enter at least one email.")
      return
    }
    setResults(null)
    startTransition(async () => {
      try {
        const res = await addStudentsToCohortByEmailAction(cohortId, emailsText)
        setResults(res)
        if (res.addedCount > 0) {
          toast.success(`Successfully added ${res.addedCount} student(s).`)
          onSuccess()
        } else {
          toast.info("No new students were added.")
        }
      } catch (err: any) {
        toast.error(err.message || "Failed to add students.")
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl flex flex-col max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Bulk Add Students by Email</DialogTitle>
          <DialogDescription>
            Paste a comma-separated list of student emails below. We will find matching students in your institute and add them to this cohort.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-2 flex-1 overflow-y-auto">
          {!results ? (
            <Textarea
              placeholder="e.g. student1@example.com, student2@example.com,student3@example.com"
              className="min-h-[250px] font-mono text-sm resize-none"
              value={emailsText}
              onChange={(e) => setEmailsText(e.target.value)}
              disabled={isPending}
            />
          ) : (
            <div className="space-y-4">
              <div className="p-4 rounded-md bg-muted/50 space-y-2">
                <p className="font-medium text-sm text-foreground">Results</p>
                <p className="text-sm text-emerald-600 dark:text-emerald-400">
                  ✅ {results.addedCount} students successfully added.
                </p>
                {results.notFoundEmails.length > 0 && (
                  <div className="mt-4">
                    <p className="text-sm text-destructive font-medium mb-1">
                      ⚠️ {results.notFoundEmails.length} emails not found or not candidates:
                    </p>
                    <div className="max-h-[150px] overflow-y-auto rounded border bg-background p-2">
                      <ul className="list-disc list-inside text-xs text-muted-foreground">
                        {results.notFoundEmails.map(e => <li key={e}>{e}</li>)}
                      </ul>
                    </div>
                  </div>
                )}
              </div>
              <Button variant="outline" className="w-full" onClick={() => setResults(null)}>
                Enter more emails
              </Button>
            </div>
          )}
        </div>
        
        <DialogFooter className="shrink-0 pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            {results ? "Close" : "Cancel"}
          </Button>
          {!results && (
            <Button onClick={handleAdd} disabled={isPending || !emailsText.trim()} className="gap-1.5">
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Add Students
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function AddStudentsSheet({
  open,
  onOpenChange,
  cohortId,
  onSuccess,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  cohortId: string
  onSuccess: () => void
}) {
  const [isPending, startTransition] = useTransition()
  const [search, setSearch] = useState("")
  const [selectedCourse, setSelectedCourse] = useState<string | null>(null)
  const [selectedYear, setSelectedYear] = useState<number | null>(null)
  const [selectedSourceCohort, setSelectedSourceCohort] = useState<string | null>(null)
  const [filters, setFilters] = useState<{ courses: string[]; passoutYears: number[]; otherCohorts: { id: string, name: string }[] }>({ courses: [], passoutYears: [], otherCohorts: [] })
  
  const [students, setStudents] = useState<CohortMember[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [isLoadingStudents, setIsLoadingStudents] = useState(false)

  const loadStudents = async (q: string, course: string | null, year: number | null, sourceCohort: string | null) => {
    setIsLoadingStudents(true)
    try {
      const results = await getInstituteStudentsNotInCohortAction(cohortId, q, course, year, sourceCohort)
      setStudents(results)
    } catch {
      toast.error("Failed to load students.")
    } finally {
      setIsLoadingStudents(false)
    }
  }

  useEffect(() => {
    if (open) {
      setSelected(new Set())
      setSearch("")
      setSelectedCourse(null)
      setSelectedYear(null)
      setSelectedSourceCohort(null)
      
      // Load filters
      getInstituteFiltersAction().then(setFilters).catch(console.error)
      
      loadStudents("", null, null, null)
    }
  }, [open])

  useEffect(() => {
    const timer = setTimeout(() => {
      if (open) loadStudents(search, selectedCourse, selectedYear, selectedSourceCohort)
    }, 350)
    return () => clearTimeout(timer)
  }, [search, selectedCourse, selectedYear, selectedSourceCohort])

  const toggleStudent = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleAdd = () => {
    if (selected.size === 0) {
      toast.error("Please select at least one student.")
      return
    }
    startTransition(async () => {
      try {
        await addStudentsToCohortAction(cohortId, Array.from(selected))
        toast.success(`Added ${selected.size} student(s) to cohort.`)
        onSuccess()
        onOpenChange(false)
      } catch (err: any) {
        toast.error(err.message || "Failed to add students.")
      }
    })
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md flex flex-col p-0">
        <SheetHeader className="px-5 pt-5 pb-3 border-b shrink-0">
          <SheetTitle>Add Students to Cohort</SheetTitle>
          <SheetDescription>
            Search and select students to add. Only students not already in this cohort are shown.
          </SheetDescription>
          <div className="relative mt-2">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9"
            />
          </div>
          <div className="flex flex-col gap-2 mt-3">
            <div className="flex gap-2">
              <Select 
                value={selectedCourse || "all"} 
                onValueChange={(v) => setSelectedCourse(v === "all" ? null : v)}
              >
                <SelectTrigger className="flex-1 text-xs h-9 bg-background">
                  <SelectValue placeholder="All Courses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Courses</SelectItem>
                  {filters.courses.map(c => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select 
                value={selectedYear ? selectedYear.toString() : "all"} 
                onValueChange={(v) => setSelectedYear(v === "all" ? null : parseInt(v))}
              >
                <SelectTrigger className="w-[120px] text-xs h-9 shrink-0 bg-background">
                  <SelectValue placeholder="All Years" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Years</SelectItem>
                  {filters.passoutYears.map(y => (
                    <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <Select 
              value={selectedSourceCohort || "all"} 
              onValueChange={(v) => setSelectedSourceCohort(v === "all" ? null : v)}
            >
              <SelectTrigger className="w-full text-xs h-9 bg-background">
                <SelectValue placeholder="All Cohorts" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Cohorts</SelectItem>
                {filters.otherCohorts.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto">
          {isLoadingStudents ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : students.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-12 text-center px-4">
              <Users className="h-8 w-8 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">
                {search ? "No students match your search." : "All students are already in this cohort."}
              </p>
            </div>
          ) : (
            <div className="flex flex-col">
              <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/20 sticky top-0 z-10 backdrop-blur-sm">
                <span className="text-xs font-medium text-muted-foreground">{students.length} students found</span>
                <Button 
                  type="button" 
                  variant="ghost" 
                  size="sm" 
                  className="h-7 text-xs px-2"
                  onClick={() => {
                    const uniqueIds = Array.from(new Set(students.map(s => s.student_id)))
                    if (selected.size === uniqueIds.length && uniqueIds.length > 0) {
                      setSelected(new Set())
                    } else {
                      setSelected(new Set(uniqueIds))
                    }
                  }}
                >
                  {selected.size === new Set(students.map(s => s.student_id)).size && students.length > 0 ? "Deselect All" : "Select All"}
                </Button>
              </div>
              {students.map((student) => {
                const isSelected = selected.has(student.student_id)
                const initials = student.full_name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .toUpperCase()
                  .slice(0, 2)
                return (
                  <button
                    key={student.student_id}
                    type="button"
                    onClick={() => toggleStudent(student.student_id)}
                    className={cn(
                      "w-full flex items-center gap-3 px-4 py-3 border-b last:border-b-0 text-left transition-colors cursor-pointer",
                      isSelected ? "bg-primary/8 border-l-2 border-l-primary" : "hover:bg-muted/30"
                    )}
                  >
                    <div className={cn(
                      "h-4 w-4 rounded border-2 shrink-0 transition-all",
                      isSelected ? "bg-primary border-primary" : "border-muted-foreground/40"
                    )}>
                      {isSelected && (
                        <svg viewBox="0 0 10 10" className="h-full w-full text-primary-foreground p-0.5">
                          <path d="M2 5l2.5 2.5L8 3" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </div>
                    <Avatar className="h-7 w-7 shrink-0">
                      {student.avatar_path && (
                        <AvatarImage src={buildStorageUrl("avatars", student.avatar_path) || ""} />
                      )}
                      <AvatarFallback className="text-[10px] font-semibold bg-muted text-muted-foreground">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground truncate">{student.full_name}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {student.email}
                        {student.course_name && ` · ${student.course_name}`}
                        {student.passout_year && ` · ${student.passout_year}`}
                      </p>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t px-5 py-4 shrink-0 flex items-center justify-between gap-3 bg-background">
          <p className="text-xs text-muted-foreground">
            {selected.size > 0 ? `${selected.size} student(s) selected` : "Select students above"}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} disabled={isPending}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleAdd} disabled={isPending || selected.size === 0} className="gap-1.5">
              {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UserPlus className="h-3.5 w-3.5" />}
              Add {selected.size > 0 ? `(${selected.size})` : ""}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}

export function CohortDetailClient({
  cohort,
  initialMembers,
  totalCount,
  initialPage,
  initialPageSize,
  initialSearch,
}: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const [isPending, startTransition] = useTransition()
  const [items, setItems] = useState<CohortMember[]>(initialMembers)
  const [page, setPage] = useState(initialPage)
  const [hasMore, setHasMore] = useState(initialMembers.length < totalCount)
  const [loadingMore, setLoadingMore] = useState(false)
  const [addSheetOpen, setAddSheetOpen] = useState(false)
  const [bulkAddOpen, setBulkAddOpen] = useState(false)
  const [removingId, setRemovingId] = useState<string | null>(null)
  const [selectedMembers, setSelectedMembers] = useState<Set<string>>(new Set())

  // Local state for search input text
  const [searchInput, setSearchInput] = useState(initialSearch)

  // Tracks whether the last URL change was triggered by our own debounce
  const isOwnUpdateRef = useRef(false)

  // Sync search input on external navigation
  useEffect(() => {
    if (isOwnUpdateRef.current) {
      isOwnUpdateRef.current = false
      return
    }
    setSearchInput(initialSearch)
  }, [initialSearch])

  // Reset infinite scroll state when props change
  useEffect(() => {
    setItems(initialMembers)
    setPage(initialPage)
    setHasMore(initialMembers.length < totalCount)
  }, [initialMembers, totalCount, initialPage])

  // Helper to push updated search parameters to the URL
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
        router.push(`${pathname}?${params.toString()}`)
      })
    },
    [pathname, router]
  )

  // Debounce search input
  useEffect(() => {
    if (searchInput === initialSearch) return

    const timer = setTimeout(() => {
      isOwnUpdateRef.current = true
      updateParams({ search: searchInput, page: 1 })
    }, 400)
    return () => clearTimeout(timer)
  }, [searchInput, initialSearch, updateParams])

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore || isPending) return
    setLoadingMore(true)
    try {
      const nextPage = page + 1
      const res = await getCohortMembersAction(cohort.id, nextPage, initialPageSize, initialSearch)
      setItems((prev) => {
        const existingIds = new Set(prev.map((i) => i.student_id))
        const newItems = res.members.filter((m) => !existingIds.has(m.student_id))
        return [...prev, ...newItems]
      })
      setPage(nextPage)
      setHasMore((items.length + res.members.length) < res.count)
    } catch (e) {
      console.error("Error loading more members:", e)
    } finally {
      setLoadingMore(false)
    }
  }, [loadingMore, hasMore, isPending, page, initialPageSize, cohort.id, items.length, initialSearch])

  const observerTarget = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore && !isPending) {
          loadMore()
        }
      },
      { threshold: 0.1 }
    )

    const target = observerTarget.current
    if (target) {
      observer.observe(target)
    }

    return () => {
      if (target) {
        observer.unobserve(target)
      }
    }
  }, [loadMore, hasMore, loadingMore, isPending])

  // Edit dialog
  const [editOpen, setEditOpen] = useState(false)
  const [editName, setEditName] = useState(cohort.name)
  const [editDesc, setEditDesc] = useState(cohort.description || "")

  // Delete confirmation state
  const [deleteOpen, setDeleteOpen] = useState(false)


  const handleRemoveMember = (studentId: string) => {
    setRemovingId(studentId)
    startTransition(async () => {
      try {
        await removeStudentFromCohortAction(cohort.id, studentId)
        setItems((prev) => prev.filter((m) => m.student_id !== studentId))
        toast.success("Student removed from cohort.")
        setSelectedMembers(new Set())
        router.refresh()
      } catch (err: any) {
        toast.error(err.message || "Failed to remove student.")
      } finally {
        setRemovingId(null)
      }
    })
  }

  const handleBulkRemove = () => {
    if (selectedMembers.size === 0) return
    startTransition(async () => {
      try {
        await removeStudentsFromCohortAction(cohort.id, Array.from(selectedMembers))
        setItems((prev) => prev.filter((m) => !selectedMembers.has(m.student_id)))
        toast.success(`Removed ${selectedMembers.size} student(s) from cohort.`)
        setSelectedMembers(new Set())
        router.refresh()
      } catch (err: any) {
        toast.error(err.message || "Failed to remove students.")
      }
    })
  }

  const handleMembersAdded = async () => {
    setSelectedMembers(new Set())
    router.refresh()
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedMembers(new Set(items.map(i => i.student_id)))
    } else {
      setSelectedMembers(new Set())
    }
  }

  const toggleSelectMember = (studentId: string) => {
    const newSelected = new Set(selectedMembers)
    if (newSelected.has(studentId)) {
      newSelected.delete(studentId)
    } else {
      newSelected.add(studentId)
    }
    setSelectedMembers(newSelected)
  }

  const handleEditSave = () => {
    if (!editName.trim()) {
      toast.error("Cohort name is required.")
      return
    }
    startTransition(async () => {
      try {
        await updateCohortAction(cohort.id, { name: editName, description: editDesc })
        toast.success("Cohort updated.")
        setEditOpen(false)
        router.refresh()
      } catch (err: any) {
        toast.error(err.message || "Failed to update cohort.")
      }
    })
  }

  const handleDeleteCohort = () => {
    startTransition(async () => {
      try {
        await deleteCohortAction(cohort.id)
        toast.success("Cohort deleted.")
        setDeleteOpen(false)
        router.push("/cohorts")
      } catch (err: any) {
        toast.error(err.message || "Failed to delete cohort.")
      }
    })
  }

  return (
    <div className="flex flex-col gap-6 px-4 py-8 md:px-8">
      {/* Back Button */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <Button variant="ghost" asChild className="gap-1.5 -ml-3 self-start hover:bg-muted/50 rounded-xl transition-all">
          <Link href="/cohorts">
            <ArrowLeft className="h-4 w-4" /> Back to Cohorts
          </Link>
        </Button>
      </div>

      {/* Page Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-1.5 min-w-0">
          <h1 className="text-3xl font-bold font-cirka tracking-tight text-foreground break-words leading-tight">
            {cohort.name}
          </h1>
          {cohort.description && (
            <p className="text-sm text-muted-foreground mt-1 max-w-2xl">{cohort.description}</p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {selectedMembers.size > 0 ? (
            <div className="flex items-center gap-2 animate-in fade-in zoom-in duration-200">
              <span className="text-sm font-medium text-muted-foreground mr-2">{selectedMembers.size} selected</span>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setSelectedMembers(new Set())}
              >
                Clear
              </Button>
              <Button
                size="sm"
                variant="destructive"
                className="gap-1.5"
                onClick={handleBulkRemove}
                disabled={isPending}
              >
                {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UserMinus className="h-3.5 w-3.5" />}
                Remove
              </Button>
            </div>
          ) : (
            <>
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5"
                onClick={() => setBulkAddOpen(true)}
              >
                <Users className="h-3.5 w-3.5" /> Bulk Add by Email
              </Button>
              
              <Button
                size="sm"
                className="gap-1.5"
                onClick={() => setAddSheetOpen(true)}
              >
                <UserPlus className="h-3.5 w-3.5" /> Add Students
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5 cursor-pointer"
                    disabled={isPending}
                  >
                    {isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <MoreHorizontal className="h-4 w-4" />
                    )}
                    Actions
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44">
                  <DropdownMenuItem 
                    onClick={() => setEditOpen(true)}
                    className="cursor-pointer"
                  >
                    <Pencil className="mr-2 h-3.5 w-3.5" />
                    Edit Cohort
                  </DropdownMenuItem>
                  
                  <DropdownMenuSeparator />
                  
                  <DropdownMenuItem 
                    variant="destructive"
                    onClick={() => setDeleteOpen(true)}
                  >
                    <Trash2 className="mr-2 h-3.5 w-3.5" />
                    Delete Cohort
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          )}
        </div>
      </div>



      {/* Search Filter Bar */}
      <div className="flex items-stretch gap-4 max-w-sm">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search members..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="pl-9 pr-9"
          />
          {searchInput && (
            <button
              onClick={() => setSearchInput("")}
              className="absolute right-2.5 top-2.5 h-4 w-4 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>

      {/* Members Table */}
      {items.length === 0 ? (
        initialSearch ? (
          <Empty className="border border-dashed border-border/60 rounded-xl bg-card/50 p-12">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Search className="h-5 w-5 text-muted-foreground/60" />
              </EmptyMedia>
              <EmptyTitle>No members found</EmptyTitle>
              <EmptyDescription>
                No cohort members match your search query. Try clearing the search.
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button variant="outline" size="sm" onClick={() => setSearchInput("")} className="gap-1.5 mt-1">
                Clear Search
              </Button>
            </EmptyContent>
          </Empty>
        ) : (
          <Empty className="border border-dashed border-border/60 rounded-xl bg-card/50 p-12">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Users className="h-5 w-5 text-muted-foreground/60" />
              </EmptyMedia>
              <EmptyTitle>No students in this cohort yet</EmptyTitle>
              <EmptyDescription>
                Get started by adding students from your institution to this cohort.
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button variant="outline" size="sm" onClick={() => setAddSheetOpen(true)} className="gap-1.5 mt-1">
                <UserPlus className="h-3.5 w-3.5" /> Add Students
              </Button>
            </EmptyContent>
          </Empty>
        )
      ) : (
        <div className="space-y-4">
          <div className="rounded-md border bg-card overflow-hidden">
            <Table className="table-fixed w-full min-w-[700px]">
              <colgroup>
                <col className="w-[5%]" />
                <col className="w-[45%]" />
                <col className="w-[20%]" />
                <col className="w-[20%]" />
                <col className="w-[10%]" />
              </colgroup>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12 pl-4">
                    <Checkbox
                      checked={items.length > 0 && selectedMembers.size === items.length}
                      onCheckedChange={(checked) => handleSelectAll(checked as boolean)}
                      aria-label="Select all"
                    />
                  </TableHead>
                  <TableHead className="text-xs font-semibold">Student</TableHead>
                  <TableHead className="text-xs font-semibold">Course</TableHead>
                  <TableHead className="text-xs font-semibold">Graduation Year</TableHead>
                  <TableHead className="text-xs font-semibold text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((member) => {
                  const initials = member.full_name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .toUpperCase()
                    .slice(0, 2)

                  return (
                    <TableRow key={member.student_id} data-state={selectedMembers.has(member.student_id) ? "selected" : undefined}>
                      <TableCell className="pl-4">
                        <Checkbox
                          checked={selectedMembers.has(member.student_id)}
                          onCheckedChange={() => toggleSelectMember(member.student_id)}
                          aria-label={`Select ${member.full_name}`}
                        />
                      </TableCell>
                      <TableCell className="overflow-hidden text-ellipsis">
                        <div className="flex items-center gap-3 min-w-0">
                          <Avatar className="h-8 w-8 shrink-0">
                            {member.avatar_path && (
                              <AvatarImage src={buildStorageUrl("avatars", member.avatar_path) || ""} />
                            )}
                            <AvatarFallback className="text-[11px] font-semibold bg-primary/10 text-primary">
                              {initials}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex flex-col min-w-0">
                            <span className="text-sm font-medium truncate">{member.full_name}</span>
                            <span className="text-[11px] text-muted-foreground truncate">{member.email}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="overflow-hidden text-ellipsis">
                        {member.course_name ? (
                          <div className="flex items-center text-[13px] text-foreground">
                            <GraduationCap className="size-3.5 mr-1.5 shrink-0 text-muted-foreground" />
                            <span className="truncate">{member.course_name}</span>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground/60 italic">—</span>
                        )}
                      </TableCell>
                      <TableCell className="overflow-hidden text-ellipsis">
                        {member.passout_year ? (
                          <div className="flex items-center text-[13px] text-foreground">
                            <Calendar className="size-3.5 mr-1.5 shrink-0 text-muted-foreground" />
                            <span>{member.passout_year}</span>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground/60 italic">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all cursor-pointer shrink-0"
                          onClick={() => handleRemoveMember(member.student_id)}
                          disabled={removingId === member.student_id}
                          title="Remove from cohort"
                        >
                          {removingId === member.student_id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <UserMinus className="h-3.5 w-3.5" />
                          )}
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>

          {/* Scroll Loader Target */}
          <div ref={observerTarget} className="flex justify-center items-center py-4 w-full h-10">
            {loadingMore && (
              <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground animate-pulse">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                Loading more...
              </div>
            )}
            {!hasMore && items.length > 0 && (
              <span className="text-xs text-muted-foreground/70">
                Showing all {totalCount} members
              </span>
            )}
          </div>
        </div>
      )}

      {/* Add Students Sheet */}
      <AddStudentsSheet
        open={addSheetOpen}
        onOpenChange={setAddSheetOpen}
        cohortId={cohort.id}
        onSuccess={handleMembersAdded}
      />

      <BulkAddStudentsDialog
        open={bulkAddOpen}
        onOpenChange={setBulkAddOpen}
        cohortId={cohort.id}
        onSuccess={handleMembersAdded}
      />

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Cohort</DialogTitle>
            <DialogDescription>Update the cohort name and description.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="edit-name">Cohort Name *</Label>
              <Input
                id="edit-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-desc">Description</Label>
              <Textarea
                id="edit-desc"
                value={editDesc}
                onChange={(e) => setEditDesc(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)} disabled={isPending}>Cancel</Button>
            <Button onClick={handleEditSave} disabled={isPending} className="gap-1.5">
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Cohort?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the cohort <strong>"{cohort.name}"</strong>?
              This will unlink it from all events, drives, and tests. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={handleDeleteCohort}
              disabled={isPending}
            >
              {isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
              Delete Cohort
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
