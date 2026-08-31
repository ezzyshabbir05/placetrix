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

import { createClient } from "@/lib/supabase/client"

export function UsersListClient({
  initialUsers,
  courses,
  totalCount: initialTotalCount,
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
      push(`/users/${user.username.trim()}`)
    } else {
      toast.error("User has not set up a username yet")
    }
  }, [push])

  const [isPending, startTransition] = useTransition()

  // Local state for users, counts, filters, pagination, sort
  const [users, setUsers] = useState<InstituteUser[]>(initialUsers)
  const [currentTotalCount, setCurrentTotalCount] = useState<number>(initialTotalCount)
  const [currentRole, setCurrentRole] = useState<string>(initialRole)
  const [currentCourseId, setCurrentCourseId] = useState<string>(initialCourseId)
  const [currentPassoutYear, setCurrentPassoutYear] = useState<string>(initialPassoutYear)
  const [currentSortCol, setCurrentSortCol] = useState<SortColumn>(initialSortCol)
  const [currentSortDir, setCurrentSortDir] = useState<"asc" | "desc">(initialSortDir)
  const [currentPage, setCurrentPage] = useState<number>(initialPage)
  const [currentPageSize, setCurrentPageSize] = useState<number>(initialPageSize)
  const [searchInput, setSearchInput] = useState(initialSearch)
  const [isFetching, setIsFetching] = useState(false)

  // Dialog creation state
  const [isOpen, setIsOpen] = useState(false)
  const [email, setEmail] = useState("")
  const [role, setRole] = useState<"institute_candidate" | "institute_staff" | "institute_placement_officer">("institute_candidate")
  const [courseId, setCourseId] = useState("")
  const [passoutYear, setPassoutYear] = useState("")

  // Direct client Supabase fetcher
  const fetchUsersClient = useCallback(
    async (
      searchVal: string,
      roleVal: string,
      courseVal: string,
      passoutVal: string,
      sortColVal: SortColumn,
      sortDirVal: "asc" | "desc",
      pageVal: number,
      sizeVal: number
    ) => {
      setIsFetching(true)
      try {
        const supabase = createClient()
        const hasAcademicFilter = courseVal !== "all" || passoutVal !== "all"
        const academicRelation = hasAcademicFilter
          ? "candidate_academic_details!inner"
          : "candidate_academic_details"

        let query = (supabase as any)
          .from("profiles")
          .select(
            `
            id,
            full_name,
            email,
            username,
            account_type,
            avatar_path,
            created_at,
            ${academicRelation} (
              course_id,
              passout_year,
              university_prn,
              course:institute_courses (
                course_name
              )
            )
          `,
            { count: "exact" }
          )
          .in("account_type", ["institute_candidate", "institute_staff", "institute_placement_officer"])

        if (roleVal !== "all") {
          query = query.eq("account_type", roleVal)
        }
        if (courseVal && courseVal !== "all") {
          query = query.eq("candidate_academic_details.course_id", courseVal)
        }
        if (passoutVal && passoutVal !== "all") {
          const yearNum = parseInt(passoutVal, 10)
          if (!isNaN(yearNum)) {
            query = query.eq("candidate_academic_details.passout_year", yearNum)
          }
        }
        if (searchVal.trim()) {
          const s = searchVal.trim()
          query = query.or(`full_name.ilike.%${s}%,email.ilike.%${s}%`)
        }

        const ascending = sortDirVal === "asc"
        switch (sortColVal) {
          case "name":
            query = query.order("full_name", { ascending })
            break
          case "email":
            query = query.order("email", { ascending })
            break
          case "role":
            query = query.order("account_type", { ascending })
            break
          case "created":
          default:
            query = query.order("created_at", { ascending })
            break
        }

        const from = (pageVal - 1) * sizeVal
        const to = pageVal * sizeVal - 1
        const { data, count, error } = await query.range(from, to)

        if (!error && data) {
          const mapped: InstituteUser[] = data.map((u: any) => {
            const cad = Array.isArray(u.candidate_academic_details)
              ? u.candidate_academic_details[0]
              : u.candidate_academic_details
            const course = Array.isArray(cad?.course)
              ? cad?.course[0]
              : cad?.course
            return {
              id: u.id,
              full_name: u.full_name,
              email: u.email,
              username: u.username,
              account_type: u.account_type,
              avatar_path: u.avatar_path,
              created_at: u.created_at,
              course_name: course?.course_name ?? null,
              passout_year: cad?.passout_year ?? null,
            }
          })
          setUsers(mapped)
          setCurrentTotalCount(count ?? 0)
        }
      } catch (err) {
        console.error("[UsersListClient] Error fetching users on client:", err)
      } finally {
        setIsFetching(false)
      }
    },
    []
  )

  // Unified updater that updates client state, fetches data, and syncs URL shallowly
  const updateParams = useCallback(
    (newParams: {
      search?: string
      role?: string
      courseId?: string
      passoutYear?: string
      sortBy?: SortColumn
      sortOrder?: "asc" | "desc"
      page?: number
      size?: number | string
    }) => {
      const nextSearch = newParams.search !== undefined ? newParams.search : searchInput
      const nextRole = newParams.role !== undefined ? newParams.role : currentRole
      const nextCourseId = newParams.courseId !== undefined ? newParams.courseId : currentCourseId
      const nextPassoutYear = newParams.passoutYear !== undefined ? newParams.passoutYear : currentPassoutYear
      const nextSortCol = newParams.sortBy !== undefined ? newParams.sortBy : currentSortCol
      const nextSortDir = newParams.sortOrder !== undefined ? newParams.sortOrder : currentSortDir
      const nextPage = newParams.page !== undefined ? newParams.page : 1
      const nextSize = newParams.size !== undefined ? Number(newParams.size) : currentPageSize

      if (newParams.search !== undefined) setSearchInput(newParams.search)
      if (newParams.role !== undefined) setCurrentRole(newParams.role)
      if (newParams.courseId !== undefined) setCurrentCourseId(newParams.courseId)
      if (newParams.passoutYear !== undefined) setCurrentPassoutYear(newParams.passoutYear)
      if (newParams.sortBy !== undefined) setCurrentSortCol(newParams.sortBy)
      if (newParams.sortOrder !== undefined) setCurrentSortDir(newParams.sortOrder)
      if (newParams.page !== undefined) setCurrentPage(newParams.page)
      if (newParams.size !== undefined) setCurrentPageSize(Number(newParams.size))

      fetchUsersClient(
        nextSearch,
        nextRole,
        nextCourseId,
        nextPassoutYear,
        nextSortCol,
        nextSortDir,
        nextPage,
        nextSize
      )

      if (typeof window !== "undefined") {
        const params = new URLSearchParams(window.location.search)
        if (nextSearch) params.set("search", nextSearch)
        else params.delete("search")

        if (nextRole && nextRole !== "all") params.set("role", nextRole)
        else params.delete("role")

        if (nextCourseId && nextCourseId !== "all") params.set("courseId", nextCourseId)
        else params.delete("courseId")

        if (nextPassoutYear && nextPassoutYear !== "all") params.set("passoutYear", nextPassoutYear)
        else params.delete("passoutYear")

        if (nextSortCol !== "created") params.set("sortBy", nextSortCol)
        else params.delete("sortBy")

        if (nextSortDir !== "desc") params.set("sortOrder", nextSortDir)
        else params.delete("sortOrder")

        if (nextPage > 1) params.set("page", String(nextPage))
        else params.delete("page")

        if (nextSize !== 10) params.set("size", String(nextSize))
        else params.delete("size")

        const qs = params.toString()
        window.history.replaceState(null, "", qs ? `${pathname}?${qs}` : pathname)
      }
    },
    [
      searchInput,
      currentRole,
      currentCourseId,
      currentPassoutYear,
      currentSortCol,
      currentSortDir,
      currentPageSize,
      fetchUsersClient,
      pathname,
    ]
  )

  // Debounce search input
  const isFirstMount = useRef(true)
  useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false
      return
    }

    const timer = setTimeout(() => {
      updateParams({ search: searchInput, page: 1 })
    }, 400)
    return () => clearTimeout(timer)
  }, [searchInput])

  const handleRoleFilterChange = (val: string) => {
    if (val === "institute_staff" || val === "institute_placement_officer") {
      updateParams({ role: val, courseId: "all", passoutYear: "all", page: 1 })
    } else {
      updateParams({ role: val, page: 1 })
    }
  }

  const handleCourseFilterChange = (val: string) => {
    updateParams({ courseId: val, page: 1 })
  }

  const handlePassoutYearFilterChange = (val: string) => {
    updateParams({ passoutYear: val, page: 1 })
  }

  const isFilterActive =
    Boolean(searchInput.trim()) ||
    currentRole !== "all" ||
    (currentCourseId && currentCourseId !== "all") ||
    (currentPassoutYear && currentPassoutYear !== "all")

  const isNonCandidateRole = currentRole !== "all" && currentRole !== "institute_candidate"

  const handleClearFilters = () => {
    setSearchInput("")
    updateParams({
      search: "",
      role: "all",
      courseId: "all",
      passoutYear: "all",
      page: 1,
    })
  }

  const handlePageSizeChange = (val: string) => {
    updateParams({ size: val, page: 1 })
  }

  const handleSort = (col: SortColumn) => {
    let nextDir: "asc" | "desc" = "desc"
    let nextCol = col

    if (currentSortCol === col) {
      if (currentSortDir === "asc") {
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

  const totalPages = Math.ceil(currentTotalCount / currentPageSize)
  const activePage = Math.min(currentPage, Math.max(1, totalPages))

  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: 9 }, (_, i) => currentYear - 2 + i)
  const filterYears = Array.from({ length: 11 }, (_, i) => currentYear - 5 + i)

  return (
    <div className="space-y-4">
      {/* Search and Filters Header */}
      <div className="flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-4">
        <div className="flex flex-col sm:flex-row w-full xl:w-auto flex-1 gap-3 items-stretch sm:items-center flex-wrap">
          <div className="relative w-full sm:w-64 shrink-0">
            {isPending || isFetching ? (
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
            <Select value={currentRole} onValueChange={handleRoleFilterChange}>
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
              value={currentCourseId}
              onValueChange={handleCourseFilterChange}
              disabled={isNonCandidateRole}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="All Courses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Courses</SelectItem>
                {courses.map((course) => (
                  <SelectItem key={course.id} value={course.id}>
                    {course.course_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Passout Year Filter */}
            <Select
              value={currentPassoutYear}
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
                <SortableHead label="User" col="name" sortCol={currentSortCol} sortDir={currentSortDir} onSort={handleSort} />
                <SortableHead label="Role" col="role" sortCol={currentSortCol} sortDir={currentSortDir} onSort={handleSort} />
                <TableHead className="text-xs font-semibold select-none">Academic/Staff Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.length > 0 ? (
                users.map((user) => (
                  <ContextMenu key={user.id}>
                    <ContextMenuTrigger asChild>
                      <TableRow
                        onClick={() => handleUserClick(user)}
                        className="cursor-pointer hover:bg-muted/50 transition-colors"
                      >
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

                        <TableCell className="overflow-hidden text-ellipsis text-xs font-medium text-foreground">
                          {user.account_type === "institute_candidate"
                            ? "Student"
                            : user.account_type === "institute_staff"
                            ? "Staff"
                            : user.account_type === "institute_placement_officer"
                            ? "TPO"
                            : ROLE_LABELS[user.account_type] || "User"}
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
                      <ContextMenuItem onClick={() => handleUserClick(user)}>
                        View Profile
                      </ContextMenuItem>
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
        {users.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 md:hidden">
            {users.map((user) => (
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
        {currentTotalCount > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-1">
            <div className="text-xs text-muted-foreground">
              Showing <span className="font-medium">{Math.min(currentTotalCount, (activePage - 1) * currentPageSize + 1)}</span> to{" "}
              <span className="font-medium">{Math.min(currentTotalCount, activePage * currentPageSize)}</span> of{" "}
              <span className="font-medium">{currentTotalCount}</span> users
            </div>

            <div className="flex flex-wrap items-center gap-4 sm:gap-6">
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground whitespace-nowrap">Rows per page</span>
                <Select
                  value={currentPageSize.toString()}
                  onValueChange={(val) => handlePageSizeChange(val)}
                >
                  <SelectTrigger className="h-8 w-[70px] text-xs">
                    <SelectValue placeholder={currentPageSize.toString()} />
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
