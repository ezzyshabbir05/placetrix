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
import {
  Search,
  MoreHorizontal,
  Loader2,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  X,
} from "lucide-react"
import { Button } from "@/components/ui/button"
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
import { cn } from "@/lib/utils"
import { toggleStudentVerification } from "./actions"
import { toast } from "sonner"
import Link from "next/link"
import { useRouter, usePathname } from "next/navigation"


export interface Student {
  profile_id: string
  display_name: string
  email: string
  course_name: string | null
  passout_year: number | null
  university_prn: string | null
  institute_verified: boolean | null
  cgpa: number | null
  profile_image_path: string | null
  created_at: string
}


type SortColumn = "name" | "course" | "passout" | "cgpa" | "status" | "created"


interface Props {
  students: Student[]
  totalCount: number
  initialPage: number
  initialPageSize: number
  initialSearch: string
  initialStatus: "all" | "verified" | "pending"
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


export function StudentsListClient({
  students,
  totalCount,
  initialPage,
  initialPageSize,
  initialSearch,
  initialStatus,
  initialSortCol,
  initialSortDir,
}: Props) {
  const { push } = useRouter()
  const pathname = usePathname()

  const [isPending, startTransition] = useTransition()

  // Local state for search input text
  const [searchInput, setSearchInput] = useState(initialSearch)
  // Local state for toggling loader
  const [loadingId, setLoadingId] = useState<string | null>(null)

  // Tracks whether the last URL change was triggered by our own debounce (not external navigation)
  const isOwnUpdateRef = useRef(false)

  // Sync search input ONLY on external navigation (back/forward), skip our own debounce-triggered updates
  useEffect(() => {
    if (isOwnUpdateRef.current) {
      isOwnUpdateRef.current = false
      return
    }
    setSearchInput(initialSearch)
  }, [initialSearch])

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

  const handleStatusFilterChange = (filter: "all" | "verified" | "pending") => {
    updateParams({ status: filter, page: 1 })
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
      nextDir = col === "name" || col === "course" ? "asc" : "desc"
    }

    updateParams({ sortBy: nextCol, sortOrder: nextDir, page: 1 })
  }

  const totalPages = Math.ceil(totalCount / initialPageSize)
  const activePage = Math.min(initialPage, Math.max(1, totalPages))
  const paginatedStudents = students

  const handleToggleVerification = async (studentId: string, currentStatus: boolean) => {
    try {
      setLoadingId(studentId)
      await toggleStudentVerification(studentId, !currentStatus)
      toast.success(currentStatus ? "Verification revoked" : "Student verified")
    } catch (err: any) {
      if (err?.message === "NEXT_REDIRECT") throw err
      toast.error(err.message || "Something went wrong")
    } finally {
      setLoadingId(null)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:max-w-xs">
          {isPending ? (
            <Loader2 className="absolute left-2.5 top-2.5 size-4 text-muted-foreground animate-spin" />
          ) : (
            <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
          )}
          <Input
            placeholder="Search students..."
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
        <div className="flex items-center border rounded-md p-1 bg-muted/50">
          {(["all", "verified", "pending"] as const).map((filter) => (
            <button
              type="button"
              key={filter}
              onClick={() => handleStatusFilterChange(filter)}
              className={cn(
                "px-3 py-1 text-xs font-medium rounded-sm transition-all capitalize",
                initialStatus === filter
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {filter}
            </button>
          ))}
        </div>
      </div>

      {/* Results Content Area */}
      <div className={cn("space-y-4 transition-opacity duration-200", isPending && "opacity-50 pointer-events-none")}>

        {/* Desktop Table View */}
        <div className="hidden md:block rounded-md border bg-card overflow-hidden">
          <Table className="table-fixed w-full min-w-[800px]">
            <colgroup>
              <col className="w-[28%]" />
              <col className="w-[26%]" />
              <col className="w-[11%]" />
              <col className="w-[11%]" />
              <col className="w-[12%]" />
              <col className="w-[12%]" />
            </colgroup>
            <TableHeader>
              <TableRow>
                <SortableHead label="Student" col="name" sortCol={initialSortCol} sortDir={initialSortDir} onSort={handleSort} />
                <SortableHead label="Course" col="course" sortCol={initialSortCol} sortDir={initialSortDir} onSort={handleSort} />
                <SortableHead label="Passout" col="passout" sortCol={initialSortCol} sortDir={initialSortDir} onSort={handleSort} />
                <SortableHead label="CGPA" col="cgpa" sortCol={initialSortCol} sortDir={initialSortDir} onSort={handleSort} />
                <SortableHead label="Status" col="status" sortCol={initialSortCol} sortDir={initialSortDir} onSort={handleSort} />
                <TableHead className="text-right text-xs font-semibold select-none pr-4">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedStudents.length > 0 ? (
                paginatedStudents.map((student) => (
                  <TableRow key={student.profile_id}>
                    <TableCell className="overflow-hidden text-ellipsis">
                      <div className="flex items-center gap-3 min-w-0">
                        <Avatar className="size-8 shrink-0">
                          <AvatarImage src={student.profile_image_path || undefined} />
                          <AvatarFallback className="text-[10px]">
                            {student.display_name.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col min-w-0">
                          <span className="text-sm font-medium truncate">{student.display_name}</span>
                          <span className="text-[11px] text-muted-foreground truncate">{student.email}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="overflow-hidden text-ellipsis">
                      <div className="flex flex-col min-w-0">
                        <span className="text-sm truncate">{student.course_name || "—"}</span>
                        <span className="text-[10px] text-muted-foreground uppercase tracking-tight font-mono truncate">
                          {student.university_prn || "No PRN"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm truncate overflow-hidden">
                      {student.passout_year || "—"}
                    </TableCell>
                    <TableCell className="truncate overflow-hidden">
                      <span className="text-sm font-medium">
                        {student.cgpa ? student.cgpa.toFixed(2) : "—"}
                      </span>
                    </TableCell>
                    <TableCell className="truncate overflow-hidden">
                      {student.institute_verified ? (
                        <Badge variant="secondary" className="font-normal text-[10px]">
                          Verified
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="font-normal text-[10px]">
                          Pending
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right shrink-0 pr-4">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="size-8" disabled={loadingId === student.profile_id}>
                            {loadingId === student.profile_id ? (
                              <Loader2 className="size-3 animate-spin" />
                            ) : (
                              <MoreHorizontal className="size-4" />
                            )}
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link href={`/~/students/${student.profile_id}`} className="cursor-pointer">
                              View Profile
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem className="cursor-pointer">Report</DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className={cn("cursor-pointer", student.institute_verified ? "text-destructive" : "text-emerald-600")}
                            onClick={() => handleToggleVerification(student.profile_id, student.institute_verified || false)}
                          >
                            {student.institute_verified ? "Revoke Verification" : "Verify Student"}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-sm text-muted-foreground">
                    No students found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Mobile Card List View */}
        {paginatedStudents.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 md:hidden">
            {paginatedStudents.map((student) => (
              <div key={student.profile_id} className="rounded-lg border bg-card p-4 shadow-sm space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar className="size-10 shrink-0">
                      <AvatarImage src={student.profile_image_path || undefined} />
                      <AvatarFallback className="text-xs">
                        {student.display_name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col min-w-0">
                      <span className="text-sm font-semibold truncate">{student.display_name}</span>
                      <span className="text-xs text-muted-foreground truncate">{student.email}</span>
                    </div>
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="size-8 shrink-0" disabled={loadingId === student.profile_id}>
                        {loadingId === student.profile_id ? (
                          <Loader2 className="size-3 animate-spin" />
                        ) : (
                          <MoreHorizontal className="size-4" />
                        )}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild>
                        <Link href={`/~/students/${student.profile_id}`} className="cursor-pointer">
                          View Profile
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem className="cursor-pointer">Report</DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className={cn("cursor-pointer", student.institute_verified ? "text-destructive" : "text-emerald-600")}
                        onClick={() => handleToggleVerification(student.profile_id, student.institute_verified || false)}
                      >
                        {student.institute_verified ? "Revoke Verification" : "Verify Student"}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-3 border-t text-xs">
                  <div className="min-w-0">
                    <span className="text-muted-foreground block text-[10px] uppercase font-semibold tracking-wider">Course</span>
                    <span className="font-medium text-foreground truncate block mt-0.5">{student.course_name || "—"}</span>
                  </div>
                  <div className="min-w-0">
                    <span className="text-muted-foreground block text-[10px] uppercase font-semibold tracking-wider">University PRN</span>
                    <span className="font-mono text-foreground truncate block mt-0.5 uppercase">{student.university_prn || "No PRN"}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[10px] uppercase font-semibold tracking-wider">Passout Year</span>
                    <span className="font-medium text-foreground block mt-0.5">{student.passout_year || "—"}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[10px] uppercase font-semibold tracking-wider">CGPA</span>
                    <span className="font-medium text-foreground block mt-0.5">{student.cgpa ? student.cgpa.toFixed(2) : "—"}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t">
                  <span className="text-xs text-muted-foreground font-medium">Verification Status</span>
                  {student.institute_verified ? (
                    <Badge variant="secondary" className="font-normal text-[10px] px-2.5 py-0.5">
                      Verified
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="font-normal text-[10px] px-2.5 py-0.5">
                      Pending
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="md:hidden rounded-md border bg-card p-8 text-center text-sm text-muted-foreground">
            No students found.
          </div>
        )}

        {totalCount > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-1">
            <div className="text-xs text-muted-foreground">
              Showing <span className="font-medium">{Math.min(totalCount, (activePage - 1) * initialPageSize + 1)}</span> to{" "}
              <span className="font-medium">{Math.min(totalCount, activePage * initialPageSize)}</span> of{" "}
              <span className="font-medium">{totalCount}</span> students
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

              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  className="size-8"
                  onClick={() => updateParams({ page: 1 })}
                  disabled={activePage === 1}
                >
                  <ChevronsLeft className="size-4" />
                  <span className="sr-only">First page</span>
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="size-8"
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
                  variant="outline"
                  size="icon"
                  className="size-8"
                  onClick={() => updateParams({ page: Math.min(totalPages, activePage + 1) })}
                  disabled={activePage === totalPages || totalPages === 0}
                >
                  <ChevronRight className="size-4" />
                  <span className="sr-only">Next page</span>
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="size-8"
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
    </div>
  )
}
