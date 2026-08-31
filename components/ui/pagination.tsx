import * as React from "react"
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  MoreHorizontalIcon,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { buttonVariants, type Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

function Pagination({ className, ...props }: React.ComponentProps<"nav">) {
  return (
    <nav
      role="navigation"
      aria-label="pagination"
      data-slot="pagination"
      className={cn("mx-auto flex w-full justify-center", className)}
      {...props}
    />
  )
}

function PaginationContent({
  className,
  ...props
}: React.ComponentProps<"ul">) {
  return (
    <ul
      data-slot="pagination-content"
      className={cn("flex flex-row items-center gap-1", className)}
      {...props}
    />
  )
}

function PaginationItem({ ...props }: React.ComponentProps<"li">) {
  return <li data-slot="pagination-item" {...props} />
}

type PaginationLinkProps = {
  isActive?: boolean
} & Pick<React.ComponentProps<typeof Button>, "size"> &
  React.ComponentProps<"a">

function PaginationLink({
  className,
  isActive,
  size = "icon",
  ...props
}: PaginationLinkProps) {
  return (
    <a
      aria-current={isActive ? "page" : undefined}
      data-slot="pagination-link"
      data-active={isActive}
      className={cn(
        buttonVariants({
          variant: isActive ? "outline" : "ghost",
          size,
        }),
        className
      )}
      {...props}
    />
  )
}

function PaginationPrevious({
  className,
  ...props
}: React.ComponentProps<typeof PaginationLink>) {
  return (
    <PaginationLink
      aria-label="Go to previous page"
      size="default"
      className={cn("gap-1 px-2.5 sm:pl-2.5", className)}
      {...props}
    >
      <ChevronLeftIcon />
      <span className="hidden sm:block">Previous</span>
    </PaginationLink>
  )
}

function PaginationNext({
  className,
  ...props
}: React.ComponentProps<typeof PaginationLink>) {
  return (
    <PaginationLink
      aria-label="Go to next page"
      size="default"
      className={cn("gap-1 px-2.5 sm:pr-2.5", className)}
      {...props}
    >
      <span className="hidden sm:block">Next</span>
      <ChevronRightIcon />
    </PaginationLink>
  )
}

function PaginationEllipsis({
  className,
  ...props
}: React.ComponentProps<"span">) {
  return (
    <span
      aria-hidden
      data-slot="pagination-ellipsis"
      className={cn("flex size-9 items-center justify-center", className)}
      {...props}
    >
      <MoreHorizontalIcon className="size-4" />
      <span className="sr-only">More pages</span>
    </span>
  )
}

interface PaginationPageSizeProps {
  pageSize: number
  onPageSizeChange: (size: number) => void
  options?: number[]
  disabled?: boolean
  label?: string
  className?: string
}

function PaginationPageSize({
  pageSize,
  onPageSizeChange,
  options = [10, 20, 50, 100],
  disabled = false,
  label = "Per page:",
  className,
}: PaginationPageSizeProps) {
  return (
    <div className={cn("flex items-center gap-1.5 text-xs text-muted-foreground", className)}>
      {label && <span>{label}</span>}
      <Select
        value={String(pageSize)}
        onValueChange={(val) => onPageSizeChange(Number(val))}
        disabled={disabled}
      >
        <SelectTrigger className="h-7 w-[68px] text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent side="top">
          {options.map((size) => (
            <SelectItem key={size} value={String(size)} className="text-xs">
              {size}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

interface PaginationInfoProps {
  total: number
  page: number
  pageSize: number
  itemName?: string
  className?: string
}

function PaginationInfo({
  total,
  page,
  pageSize,
  itemName = "items",
  className,
}: PaginationInfoProps) {
  const start = total === 0 ? 0 : page * pageSize + 1
  const end = Math.min((page + 1) * pageSize, total)

  return (
    <span className={cn("text-xs text-muted-foreground tabular-nums", className)}>
      Showing <span className="font-semibold text-foreground">{start}</span>–<span className="font-semibold text-foreground">{end}</span> of <span className="font-semibold text-foreground">{total}</span> {itemName}
    </span>
  )
}

export {
  Pagination,
  PaginationContent,
  PaginationLink,
  PaginationItem,
  PaginationPrevious,
  PaginationNext,
  PaginationEllipsis,
  PaginationPageSize,
  PaginationInfo,
}
