// app/(dashboard)/postings/loading.tsx

import { Skeleton } from "@/components/ui/skeleton"

function PostingCardSkeleton() {
  return (
    <div className="rounded-xl border bg-card flex flex-col">
      <div className="p-5 flex-1 space-y-4">
        <div className="space-y-2">
          <Skeleton className="h-4.5 w-3/4 rounded" />
          <Skeleton className="h-3 w-full rounded" />
          <Skeleton className="h-3 w-2/3 rounded" />
        </div>
        <div className="flex items-center justify-between">
          <Skeleton className="h-5 w-14 rounded" />
          <Skeleton className="h-4.5 w-24 rounded" />
        </div>
        <div className="flex flex-wrap gap-2 pt-1">
          <Skeleton className="h-3.5 w-16 rounded" />
          <Skeleton className="h-3.5 w-20 rounded" />
        </div>
        <div className="flex flex-wrap gap-1.5 pt-1">
          <Skeleton className="h-4.5 w-10 rounded" />
          <Skeleton className="h-4.5 w-12 rounded" />
          <Skeleton className="h-4.5 w-10 rounded" />
        </div>
      </div>
      <div className="p-4 border-t bg-muted/20 flex justify-between items-center mt-auto rounded-b-xl">
        <Skeleton className="h-4 w-24 rounded" />
        <Skeleton className="h-8 w-28 rounded-md" />
      </div>
    </div>
  )
}

export default function PostingsLoading() {
  return (
    <div className="flex flex-col gap-6 px-4 py-8 md:px-8">
      {/* Page Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <h1 className="text-3xl font-bold font-cirka tracking-tight text-foreground">Job Postings</h1>
          <Skeleton className="h-4 w-28 rounded" />
        </div>
        <Skeleton className="h-8 w-28 rounded-md shrink-0" />
      </div>

      {/* Tabs */}
      <div className="overflow-x-auto">
        <div className="inline-flex h-9 items-center gap-0.5 rounded-lg bg-muted p-1">
          <Skeleton className="h-7 w-[52px] rounded-md shrink-0" />
          <Skeleton className="h-7 w-[64px] rounded-md shrink-0" />
          <Skeleton className="h-7 w-[60px] rounded-md shrink-0" />
          <Skeleton className="h-7 w-[62px] rounded-md shrink-0" />
          <Skeleton className="h-7 w-[60px] rounded-md shrink-0" />
        </div>
      </div>

      {/* Card Grid */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <PostingCardSkeleton key={i} />
        ))}
      </div>
    </div>
  )
}
