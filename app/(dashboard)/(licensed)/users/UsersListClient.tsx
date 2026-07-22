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
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu"
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import {
  Search,
  UserPlus,
  Loader2,
  Mail,
  GraduationCap,
  Briefcase,
  UserCheck,
  Building2,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  X,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { createAccount } from "./actions"
import { useRouter, usePathname } from "next/navigation"

export interface InstituteUser {
  id: string
  full_name: string | null
  email: string
  username: string | null
  account_type: string
  avatar_path: string | null
  created_at: string
  course_name: string | null
  passout_year: number | null
}

interface CourseOption {
  id: string
  course_name: string
}

type SortColumn = "created" | "name" | "role" | "email"

interface Props {
  initialUsers: InstituteUser[]
  courses: CourseOption[]
  totalCount: number
  initialPage: number
  initialPageSize: number
  initialSearch: string
  initialRole: string
  initialCourseId?: string
  initialPassoutYear?: string
  initialSortCol: SortColumn
  initialSortDir: "asc" | "desc"
}

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

const ROLE_LABELS: Record<string, string> = {
  institute_candidate: "Student",
  institute_staff: "Staff",
  institute_placement_officer: "TPO / Placement Officer",
}

export function UsersListClient({
  initialUsers,
  courses,
  totalCount,
  initialPage,
  initialPageSize,
  initialSearch,
  initialRole,
  initialCourseId = "all",
  initialPassoutYear = "all",
  initialSortCol,
  initialSortDir,
}: Props) {
  const { push } = useRouter()
  const pathname = usePathname()

  const handleUserClick = useCallback((user: InstituteUser) => {
    if (user.username?.trim()) {
      push(`/u/${user.username.trim()}`)
    } else {
      toast.error("User has not set up a username yet")
    }
  }, [push])

  const [isPending, startTransition] = useTransition()

  // Local state for search input text
  const [searchInput, setSearchInput] = useState(initialSearch)

  // Dialog creation state
  const [isOpen, setIsOpen] = useState(false)
  const [email, setEmail] = useState("")
  const [role, setRole] = useState<"institute_candidate" | "institute_staff" | "institute_placement_officer">("institute_candidate")
  const [courseId, setCourseId] = useState("")
  const [passoutYear, setPassoutYear] = useState("")

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

  // Helper to push updated params to URL
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

  // Debounce search input
  useEffect(() => {
    if (searchInput === initialSearch) return

    const timer = setTimeout(onDebouncedSearch, 400)
    return () => clearTimeout(timer)
  }, [searchInput, initialSearch])

  const handleRoleFilterChange = (val: string) => {
    if (val === "institute_staff" || val === "institute_placement_officer") {
      updateParams({ role: val, courseId: "", passoutYear: "", page: 1 })
    } else {
      updateParams({ role: val, page: 1 })
    }
  }

  const handleCourseFilterChange = (val: string) => {
    updateParams({ courseId: val === "all" ? "" : val, page: 1 })
  }

  const handlePassoutYearFilterChange = (val: string) => {
    updateParams({ passoutYear: val === "all" ? "" : val, page: 1 })
  }

  const isFilterActive =
    Boolean(searchInput.trim()) ||
    initialRole !== "all" ||
    (initialCourseId && initialCourseId !== "all") ||
    (initialPassoutYear && initialPassoutYear !== "all")

  const isNonCandidateRole = initialRole !== "all" && initialRole !== "institute_candidate"

  const handleClearFilters = () => {
    isOwnUpdateRef.current = true
    setSearchInput("")
    updateParams({
      search: "",
      role: "all",
      courseId: "",
      passoutYear: "",
      page: 1,
    })
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
        nextCol = "created"
        nextDir = "desc"
      }
    } else {
      nextDir = col === "name" || col === "email" || col === "role" ? "asc" : "desc"
    }

    updateParams({ sortBy: nextCol, sortOrder: nextDir, page: 1 })
  }

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault()

    if (!email) {
      toast.error("Email is required.")
      return
    }

    if (role === "institute_candidate" && (!courseId || !passoutYear)) {
      toast.error("Branch and Batch/Passout Year are required for students.")
      return
    }

    startTransition(async () => {
      try {
        const result = await createAccount({
          email,
          role,
          course_id: role === "institute_candidate" ? courseId : null,
          passout_year: role === "institute_candidate" ? parseInt(passoutYear, 10) : null,
        })

        if (result?.success) {
          toast.success("Account created successfully. Credentials email sent.")
          setIsOpen(false)
          
          // Reset form fields
          setEmail("")
          setRole("institute_candidate")
          setCourseId("")
          setPassoutYear("")
        }
      } catch (err: any) {
        toast.error(err.message || "Failed to create account.")
      }
    })
  }

  const totalPages = Math.ceil(totalCount / initialPageSize)
  const activePage = Math.min(initialPage, Math.max(1, totalPages))
  const paginatedUsers = initialUsers

  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: 9 }, (_, i) => currentYear - 2 + i)
  const filterYears = Array.from({ length: 11 }, (_, i) => currentYear - 5 + i)

  return (
    <div className="space-y-4">
      {/* Search and Filters Header */}
      <div className="flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-4">
        <div className="flex flex-col sm:flex-row w-full xl:w-auto flex-1 gap-3 items-stretch sm:items-center flex-wrap">
          <div className="relative w-full sm:w-64 shrink-0">
            {isPending ? (
              <Loader2 className="absolute left-2.5 top-2.5 size-4 text-muted-foreground animate-spin" />
            ) : (
              <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
            )}
            <Input
              placeholder="Search by name or email..."
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
                <X className="size-3" />
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full sm:w-auto flex-1 max-w-2xl">
            {/* Roles Filter */}
            <Select value={initialRole} onValueChange={handleRoleFilterChange}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="All Roles" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="institute_candidate">Students</SelectItem>
                <SelectItem value="institute_staff">Staff</SelectItem>
                <SelectItem value="institute_placement_officer">Placement Officers (TPO)</SelectItem>
              </SelectContent>
            </Select>

            {/* Course Filter */}
            <Select
              value={initialCourseId}
              onValueChange={handleCourseFilterChange}
              disabled={isNonCandidateRole}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="All Courses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Courses</SelectItem>
                {courses.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.course_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Passout Year Filter */}
            <Select
              value={initialPassoutYear}
              onValueChange={handlePassoutYearFilterChange}
              disabled={isNonCandidateRole}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="All Passout Years" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Passout Years</SelectItem>
                {filterYears.map((y) => (
                  <SelectItem key={y} value={y.toString()}>
                    {y}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Clear Filters Button */}
          {isFilterActive && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearFilters}
              className="h-9 px-2 sm:px-3 text-xs text-muted-foreground hover:text-foreground shrink-0 gap-1.5 self-start sm:self-auto"
            >
              <X className="size-3.5" />
              <span>Clear filters</span>
            </Button>
          )}
        </div>

        {/* Creation Button */}
        <div className="flex items-center gap-3 w-full xl:w-auto justify-end shrink-0">
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2 shadow-xs shrink-0 text-xs py-1.5 h-8">
                <UserPlus className="size-3.5" />
                Create Account
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md bg-card border border-border/80 backdrop-blur-md">
              <DialogHeader>
                <DialogTitle className="text-xl font-bold flex items-center gap-2">
                  <UserPlus className="size-5 text-primary" />
                  Create New Account
                </DialogTitle>
                <DialogDescription>
                  Invite a new user. They will receive an email with their username (email) and a randomly generated password.
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={handleCreateUser} className="space-y-4 py-2">
                <div className="space-y-1.5">
                  <Label htmlFor="email">Email Address</Label>
                  <div className="relative">
                    <Mail className="absolute top-3 left-3 size-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="name@institution.edu"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-9 bg-muted/20"
                      disabled={isPending}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="role">Account Role</Label>
                  <Select
                    value={role}
                    onValueChange={(val: any) => setRole(val)}
                    disabled={isPending}
                  >
                    <SelectTrigger id="role" className="bg-muted/20">
                      <SelectValue placeholder="Select account type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="institute_candidate">Student</SelectItem>
                      <SelectItem value="institute_staff">Staff Member</SelectItem>
                      <SelectItem value="institute_placement_officer">Placement Officer (TPO)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Conditional Student Fields */}
                {role === "institute_candidate" && (
                  <div className="grid grid-cols-2 gap-4 pt-1 animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="space-y-1.5">
                      <Label htmlFor="course">Branch / Course</Label>
                      <Select
                        value={courseId}
                        onValueChange={setCourseId}
                        disabled={isPending}
                      >
                        <SelectTrigger id="course" className="bg-muted/20">
                          <SelectValue placeholder="Select branch" />
                        </SelectTrigger>
                        <SelectContent>
                          {courses.map((course) => (
                            <SelectItem key={course.id} value={course.id}>
                              {course.course_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="batch">Batch (Passout Year)</Label>
                      <Select
                        value={passoutYear}
                        onValueChange={setPassoutYear}
                        disabled={isPending}
                      >
                        <SelectTrigger id="batch" className="bg-muted/20">
                          <SelectValue placeholder="Select year" />
                        </SelectTrigger>
                        <SelectContent>
                          {years.map((y) => (
                            <SelectItem key={y} value={y.toString()}>
                              {y}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}

                <DialogFooter className="pt-4 border-t border-border/50">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsOpen(false)}
                    disabled={isPending}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isPending} className="gap-1.5">
                    {isPending ? (
                      <>
                        <Loader2 className="size-4 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      "Create User"
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Main Content Area */}
      <div className={cn("space-y-4 transition-opacity duration-200", isPending && "opacity-50 pointer-events-none")}>
        
        {/* Desktop Table View */}
        <div className="hidden md:block rounded-md border bg-card overflow-hidden">
          <Table className="table-fixed w-full min-w-[800px]">
            <colgroup>
              <col className="w-[35%]" />
              <col className="w-[20%]" />
              <col className="w-[45%]" />
            </colgroup>
            <TableHeader>
              <TableRow>
                <SortableHead label="User" col="name" sortCol={initialSortCol} sortDir={initialSortDir} onSort={handleSort} />
                <SortableHead label="Role" col="role" sortCol={initialSortCol} sortDir={initialSortDir} onSort={handleSort} />
                <TableHead className="text-xs font-semibold select-none">Academic/Staff Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedUsers.length > 0 ? (
                paginatedUsers.map((user) => (
                  <ContextMenu key={user.id}>
                    <ContextMenuTrigger asChild>
                      <TableRow className="cursor-context-menu">
                        <TableCell className="overflow-hidden text-ellipsis">
                          <div className="flex items-center gap-3 min-w-0">
                            <Avatar className="size-8 shrink-0">
                              <AvatarImage src={user.avatar_path || undefined} />
                              <AvatarFallback className="text-[10px] bg-primary/5 text-primary">
                                {(user.full_name || user.email || "U").charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex flex-col min-w-0">
                              <span className="text-sm font-medium truncate">{user.full_name || "Unknown User"}</span>
                              <span className="text-[11px] text-muted-foreground truncate">{user.email}</span>
                            </div>
                          </div>
                        </TableCell>

                        <TableCell className="overflow-hidden text-ellipsis">
                          {user.account_type === "institute_candidate" && (
                            <Badge variant="outline" className="gap-1 text-[10px] font-normal text-sky-600 bg-sky-50 dark:bg-sky-950/20 dark:text-sky-400 border-sky-200/50 dark:border-sky-800/30">
                              <GraduationCap className="size-3" />
                              Student
                            </Badge>
                          )}
                          {user.account_type === "institute_staff" && (
                            <Badge variant="outline" className="gap-1 text-[10px] font-normal text-emerald-600 bg-emerald-50 dark:bg-emerald-950/20 dark:text-emerald-400 border-emerald-200/50 dark:border-emerald-800/30">
                              <Briefcase className="size-3" />
                              Staff
                            </Badge>
                          )}
                          {user.account_type === "institute_placement_officer" && (
                            <Badge variant="outline" className="gap-1 text-[10px] font-normal text-violet-600 bg-violet-50 dark:bg-violet-950/20 dark:text-violet-400 border-violet-200/50 dark:border-violet-800/30">
                              <UserCheck className="size-3" />
                              TPO
                            </Badge>
                          )}
                        </TableCell>

                        <TableCell className="overflow-hidden text-ellipsis">
                          {user.account_type === "institute_candidate" ? (
                            <div className="flex flex-col min-w-0 text-xs">
                              <span className="truncate">{user.course_name || "—"}</span>
                              <span className="text-[10px] text-muted-foreground font-mono mt-0.5">
                                Batch: {user.passout_year || "—"}
                              </span>
                            </div>
                          ) : (
                            <span className="text-xs italic text-muted-foreground/60">—</span>
                          )}
                        </TableCell>
                      </TableRow>
                    </ContextMenuTrigger>
                    <ContextMenuContent>
                      <ContextMenuItem onClick={() => { navigator.clipboard.writeText(user.email); toast.success("Email copied to clipboard"); }}>
                        Copy Email
                      </ContextMenuItem>
                      {user.full_name && (
                        <ContextMenuItem onClick={() => { navigator.clipboard.writeText(user.full_name!); toast.success("Name copied"); }}>
                          Copy Name
                        </ContextMenuItem>
                      )}
                    </ContextMenuContent>
                  </ContextMenu>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={3} className="h-32 text-center text-sm text-muted-foreground">
                    No users found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Mobile Card List View */}
        {paginatedUsers.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 md:hidden">
            {paginatedUsers.map((user) => (
              <div
                key={user.id}
                onClick={() => handleUserClick(user)}
                className="rounded-lg border bg-card p-4 shadow-xs space-y-3 cursor-pointer hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar className="size-10 shrink-0">
                    <AvatarImage src={user.avatar_path || undefined} />
                    <AvatarFallback className="text-xs bg-primary/5 text-primary">
                      {(user.full_name || user.email || "U").charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col min-w-0">
                    <span className="text-sm font-semibold truncate">{user.full_name || "Unknown User"}</span>
                    <span className="text-xs text-muted-foreground truncate">{user.email}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-3 border-t text-xs">
                  <div>
                    <span className="text-muted-foreground block text-[10px] uppercase font-semibold tracking-wider">Role</span>
                    <span className="font-medium text-foreground block mt-0.5 capitalize">
                      {ROLE_LABELS[user.account_type] || "User"}
                    </span>
                  </div>
                  {user.account_type === "institute_candidate" && (
                    <>
                      <div className="min-w-0">
                        <span className="text-muted-foreground block text-[10px] uppercase font-semibold tracking-wider">Course</span>
                        <span className="font-medium text-foreground truncate block mt-0.5">{user.course_name || "—"}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block text-[10px] uppercase font-semibold tracking-wider">Passout Year</span>
                        <span className="font-medium text-foreground block mt-0.5">{user.passout_year || "—"}</span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="md:hidden rounded-md border bg-card p-8 text-center text-sm text-muted-foreground">
            No users found.
          </div>
        )}

        {/* Bottom Pagination controls */}
        {totalCount > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-1">
            <div className="text-xs text-muted-foreground">
              Showing <span className="font-medium">{Math.min(totalCount, (activePage - 1) * initialPageSize + 1)}</span> to{" "}
              <span className="font-medium">{Math.min(totalCount, activePage * initialPageSize)}</span> of{" "}
              <span className="font-medium">{totalCount}</span> users
            </div>

            <div className="flex flex-wrap items-center gap-4 sm:gap-6">
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground whitespace-nowrap">Rows per page</span>
                <Select
                  value={initialPageSize.toString()}
                  onValueChange={(val) => handlePageSizeChange(val)}
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

              <Pagination className="w-auto mx-0">
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      onClick={(e) => { e.preventDefault(); if (activePage > 1) updateParams({ page: activePage - 1 }) }}
                      className={cn("cursor-pointer", activePage === 1 && "pointer-events-none opacity-50")}
                    />
                  </PaginationItem>
                  <PaginationItem>
                    <span className="text-xs font-medium px-2">Page {activePage} of {totalPages}</span>
                  </PaginationItem>
                  <PaginationItem>
                    <PaginationNext
                      onClick={(e) => { e.preventDefault(); if (activePage < totalPages) updateParams({ page: activePage + 1 }) }}
                      className={cn("cursor-pointer", (activePage === totalPages || totalPages === 0) && "pointer-events-none opacity-50")}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
              </div>
            </div>
          )}

      </div>
    </div>
  )
}
