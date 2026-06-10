// app/(dashboard)/jobs/loading.tsx

import { Skeleton } from "@/components/ui/skeleton"

function JobCardSkeleton() {
  return (
    <div className="rounded-xl border bg-card flex flex-col p-5 gap-4">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1.5 flex-1 min-w-0">
          <Skeleton className="h-4.5 w-3/4 rounded" />
          <Skeleton className="h-3 w-1/2 rounded" />
        </div>
        <Skeleton className="h-5 w-14 rounded shrink-0" />
      </div>
      <div className="space-y-2">
        <div className="flex flex-wrap gap-x-4 gap-y-1.5">
          <Skeleton className="h-3.5 w-16 rounded" />
          <Skeleton className="h-3.5 w-20 rounded" />
        </div>
        <Skeleton className="h-3 w-28 rounded" />
      </div>
      <div className="flex flex-wrap gap-1.5">
        <Skeleton className="h-4.5 w-10 rounded" />
        <Skeleton className="h-4.5 w-12 rounded" />
        <Skeleton className="h-4.5 w-10 rounded" />
      </div>
      <div className="pt-2">
        <Skeleton className="h-8 w-24 rounded-md" />
      </div>
    </div>
  )
}

export default function JobsLoading() {
  return (
    <div className="flex flex-col gap-6 px-4 py-8 md:px-8">
      {/* Page Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <h1 className="text-3xl font-bold font-cirka tracking-tight text-foreground">Job Board</h1>
          <Skeleton className="h-4 w-40 rounded" />
        </div>
      </div>

      {/* Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <Skeleton className="h-9 w-full sm:max-w-xs rounded-md" />
      </div>

      {/* Card Grid */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <JobCardSkeleton key={i} />
        ))}
      </div>
    </div>
  )
}
