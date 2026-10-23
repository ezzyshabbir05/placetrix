"use client"

import React from "react"
import { cn } from "@/lib/utils"
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationPrevious,
  PaginationNext,
  PaginationEllipsis,
  PaginationPageSize,
  PaginationInfo,
} from "@/components/ui/pagination"

export interface TablePaginationBarProps {
  total: number
  page: number // 0-indexed
  pageSize: number
  onPageChange: (page: number) => void
  onPageSizeChange?: (pageSize: number) => void
  itemName?: string
  pageSizeOptions?: number[]
  className?: string
  showPageSize?: boolean
}

export function TablePaginationBar({
  total,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
  itemName = "items",
  pageSizeOptions = [10, 20, 50],
  className,
  showPageSize = true,
}: TablePaginationBarProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  if (total === 0) return null

  return (
    <div
      className={cn(
        "flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-border/40 bg-muted/10 text-xs text-muted-foreground select-none",
        className
      )}
    >
      <div className="flex flex-wrap items-center gap-3">
        <PaginationInfo
          total={total}
          page={page}
          pageSize={pageSize}
          itemName={itemName}
        />
        {showPageSize && onPageSizeChange && (
          <div className="flex items-center pl-3 border-l border-border/60">
            <PaginationPageSize
              pageSize={pageSize}
              onPageSizeChange={onPageSizeChange}
              options={pageSizeOptions}
            />
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <Pagination className="w-auto mx-0">
          <PaginationContent className="gap-1">
            <PaginationItem>
              <PaginationPrevious
                href="#"
                onClick={(e) => {
                  e.preventDefault()
                  if (page > 0) onPageChange(page - 1)
                }}
                className={cn(
                  "cursor-pointer h-7 px-2.5 text-xs select-none",
                  page === 0 && "pointer-events-none opacity-40"
                )}
              />
            </PaginationItem>

            {Array.from({ length: totalPages }, (_, i) => i).map((pIndex) => {
              const pNumber = pIndex + 1
              if (
                pIndex === 0 ||
                pIndex === totalPages - 1 ||
                (pIndex >= page - 1 && pIndex <= page + 1)
              ) {
                return (
                  <PaginationItem key={pIndex}>
                    <PaginationLink
                      href="#"
                      isActive={pIndex === page}
                      onClick={(e) => {
                        e.preventDefault()
                        onPageChange(pIndex)
                      }}
                      className="cursor-pointer size-7 text-xs select-none"
                    >
                      {pNumber}
                    </PaginationLink>
                  </PaginationItem>
                )
              }
              if (pIndex === page - 2 || pIndex === page + 2) {
                return (
                  <PaginationItem key={pIndex}>
                    <PaginationEllipsis className="size-7" />
                  </PaginationItem>
                )
              }
              return null
            })}

            <PaginationItem>
              <PaginationNext
                href="#"
                onClick={(e) => {
                  e.preventDefault()
                  if (page < totalPages - 1) onPageChange(page + 1)
                }}
                className={cn(
                  "cursor-pointer h-7 px-2.5 text-xs select-none",
                  page >= totalPages - 1 && "pointer-events-none opacity-40"
                )}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}
    </div>
  )
}
