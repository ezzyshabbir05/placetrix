"use client"

import { useSearchParams } from "next/navigation"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Search,
  MoreHorizontal,
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
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"

function SortableHeadLoading<T extends string>({
  label,
  col,
  sortCol,
  sortDir,
  className,
}: {
  label: string
  col: T
  sortCol: T
  sortDir: "asc" | "desc"
  className?: string
}) {
  return (
    <TableHead
      className={cn(
        "text-xs font-semibold select-none cursor-default",
        className
      )}
    >
      <div className="flex items-center gap-1.5">
        {label}
        {sortCol === col ? (
          sortDir === "asc" ? (
            <ArrowUp className="h-3.5 w-3.5 text-foreground" />
          ) : (
            <ArrowDown className="h-3.5 w-3.5 text-foreground" />
          )
        ) : (
          <ArrowUpDown className="h-3.5 w-3.5 opacity-30" />
        )}
      </div>
    </TableHead>
  )
}

export default function StudentsLoading() {
  const searchParams = useSearchParams()
  const search = searchParams?.get("search") || ""
  const status = (searchParams?.get("status") || "all") as "all" | "verified" | "pending"
  const sortBy = searchParams?.get("sortBy") || "created"
  const sortOrder = (searchParams?.get("sortOrder") || "desc") as "asc" | "desc"
  const pageSize = searchParams?.get("size") || "10"
  const page = searchParams?.get("page") || "1"

  const pageNum = parseInt(page, 10)
  const isFirstPage = pageNum <= 1

  return (
    <div className="flex flex-col gap-6 px-4 py-8 md:px-8">
      {/* Page Header */}
      <div className="flex flex-col gap-1.5">
        <h1 className="text-3xl font-bold font-cirka tracking-tight text-foreground">Students</h1>
        <div className="h-5 flex items-center">
          <Skeleton className="h-3.5 w-36" />
        </div>
      </div>

      <div className="space-y-4">
        {/* Search & Status Filters */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search students..."
              defaultValue={search}
              className="pl-9 pr-9 cursor-default pointer-events-none"
              readOnly
            />
            {search && (
              <div className="absolute right-2.5 top-2.5 h-4 w-4 flex items-center justify-center text-muted-foreground pointer-events-none">
                <X className="h-3.5 w-3.5" />
              </div>
            )}
          </div>
          
          <div className="flex items-center border rounded-md p-1 bg-muted/50 pointer-events-none">
            {(["all", "verified", "pending"] as const).map((filter) => (
              <button
                key={filter}
                className={cn(
                  "px-3 py-1 text-xs font-medium rounded-sm capitalize transition-all",
                  status === filter
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground"
                )}
              >
                {filter}
              </button>
            ))}
          </div>
        </div>

        {/* Desktop Table View Skeleton */}
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
                <SortableHeadLoading label="Student" col="name" sortCol={sortBy} sortDir={sortOrder} />
                <SortableHeadLoading label="Course" col="course" sortCol={sortBy} sortDir={sortOrder} />
                <SortableHeadLoading label="Passout" col="passout" sortCol={sortBy} sortDir={sortOrder} />
                <SortableHeadLoading label="CGPA" col="cgpa" sortCol={sortBy} sortDir={sortOrder} />
                <SortableHeadLoading label="Status" col="status" sortCol={sortBy} sortDir={sortOrder} />
                <TableHead className="text-right text-xs font-semibold select-none pr-4">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: 10 }).map((_, i) => (
                <TableRow key={i}>
                  {/* Student Column */}
                  <TableCell className="overflow-hidden text-ellipsis">
                    <div className="flex items-center gap-3 min-w-0">
                      <Skeleton className="h-8 w-8 rounded-full shrink-0" />
                      <div className="flex flex-col min-w-0 w-full justify-center">
                        <div className="h-5 flex items-center">
                          <Skeleton className="h-3.5 w-24 rounded" />
                        </div>
                        <div className="h-4 flex items-center">
                          <Skeleton className="h-3 w-36 rounded" />
                        </div>
                      </div>
                    </div>
                  </TableCell>

                  {/* Course Column */}
                  <TableCell className="overflow-hidden text-ellipsis">
                    <div className="flex flex-col min-w-0 w-full justify-center">
                      <div className="h-5 flex items-center">
                        <Skeleton className="h-3.5 w-32 rounded" />
                      </div>
                      <div className="h-3.5 flex items-center">
                        <Skeleton className="h-3 w-20 rounded" />
                      </div>
                    </div>
                  </TableCell>

                  {/* Passout Column */}
                  <TableCell className="truncate overflow-hidden">
                    <div className="h-5 flex items-center">
                      <Skeleton className="h-4 w-12 rounded" />
                    </div>
                  </TableCell>

                  {/* CGPA Column */}
                  <TableCell className="truncate overflow-hidden">
                    <div className="h-5 flex items-center">
                      <Skeleton className="h-4 w-8 rounded" />
                    </div>
                  </TableCell>

                  {/* Status Column */}
                  <TableCell className="truncate overflow-hidden">
                    <div className="h-5 flex items-center">
                      <Skeleton className="h-5 w-16 rounded-full" />
                    </div>
                  </TableCell>

                  {/* Actions Column */}
                  <TableCell className="text-right shrink-0 pr-4">
                    <div className="flex justify-end pr-0">
                      <Button variant="ghost" size="icon" className="h-8 w-8" disabled>
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Mobile Card List View Skeleton */}
        <div className="grid grid-cols-1 gap-4 md:hidden">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="rounded-lg border bg-card p-4 shadow-sm space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <Skeleton className="h-10 w-10 rounded-full shrink-0" />
                  <div className="flex flex-col min-w-0 justify-center">
                    <div className="h-5 flex items-center">
                      <Skeleton className="h-3.5 w-24 rounded" />
                    </div>
                    <div className="h-4 flex items-center">
                      <Skeleton className="h-3 w-32 rounded" />
                    </div>
                  </div>
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" disabled>
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-3 border-t text-xs">
                <div className="min-w-0">
                  <span className="text-muted-foreground block text-[10px] uppercase font-semibold tracking-wider">Course</span>
                  <div className="h-4 flex items-center mt-0.5">
                    <Skeleton className="h-3 w-24 rounded" />
                  </div>
                </div>
                <div className="min-w-0">
                  <span className="text-muted-foreground block text-[10px] uppercase font-semibold tracking-wider">University PRN</span>
                  <div className="h-4 flex items-center mt-0.5">
                    <Skeleton className="h-3 w-28 rounded" />
                  </div>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px] uppercase font-semibold tracking-wider">Passout Year</span>
                  <div className="h-4 flex items-center mt-0.5">
                    <Skeleton className="h-3.5 w-12 rounded" />
                  </div>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px] uppercase font-semibold tracking-wider">CGPA</span>
                  <div className="h-4 flex items-center mt-0.5">
                    <Skeleton className="h-3.5 w-8 rounded" />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t">
                <span className="text-xs text-muted-foreground font-medium">Verification Status</span>
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
            </div>
          ))}
        </div>

        {/* Pagination Footer Skeleton */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-1 px-1">
          <div className="text-xs text-muted-foreground">
            Showing — to — of — students
          </div>
          
          <div className="flex flex-wrap items-center gap-4 sm:gap-6">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground whitespace-nowrap">Rows per page</span>
              <Select value={pageSize}>
                <SelectTrigger className="h-8 w-[70px] text-xs pointer-events-none">
                  <SelectValue placeholder={pageSize} />
                </SelectTrigger>
              </Select>
            </div>
            
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                className={cn("h-8 w-8", !isFirstPage && "pointer-events-none")}
                disabled={isFirstPage}
              >
                <ChevronsLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className={cn("h-8 w-8", !isFirstPage && "pointer-events-none")}
                disabled={isFirstPage}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="flex items-center justify-center text-xs font-medium min-w-[80px]">
                Page {page} of —
              </div>
              <Button variant="outline" size="icon" className="h-8 w-8 pointer-events-none">
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" className="h-8 w-8 pointer-events-none">
                <ChevronsRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
