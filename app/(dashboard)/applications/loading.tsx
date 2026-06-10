// app/(dashboard)/applications/loading.tsx

import { Skeleton } from "@/components/ui/skeleton"

function ApplicationCardSkeleton() {
  return (
    <div className="rounded-xl border bg-card flex flex-col p-5 gap-4">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1.5 flex-1 min-w-0">
          <Skeleton className="h-4.5 w-3/4 rounded" />
          <Skeleton className="h-3 w-1/2 rounded" />
        </div>
        <Skeleton className="h-5 w-16 rounded-full shrink-0" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-3.5 w-2/3 rounded" />
        <Skeleton className="h-3.5 w-1/2 rounded" />
      </div>
      <Skeleton className="h-5 w-16 rounded" />
      <div className="pt-2">
        <Skeleton className="h-8 w-24 rounded-md" />
      </div>
    </div>
  )
}

export default function ApplicationsLoading() {
  return (
    <div className="flex flex-col gap-6 px-4 py-8 md:px-8">
      {/* Page Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <h1 className="text-3xl font-bold font-cirka tracking-tight text-foreground">My Applications</h1>
          <Skeleton className="h-4 w-32 rounded" />
        </div>
        <Skeleton className="h-8 w-24 rounded-md shrink-0" />
      </div>

      {/* Card Grid */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <ApplicationCardSkeleton key={i} />
        ))}
      </div>
    </div>
  )
}
