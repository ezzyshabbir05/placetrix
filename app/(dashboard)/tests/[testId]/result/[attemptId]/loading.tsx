// app/(dashboard)/tests/[testId]/result/[attemptId]/loading.tsx

import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"

export default function TestResultLoading() {
  return (
    <div className="flex flex-col gap-6 px-4 py-8 md:px-8">
      {/* Page Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-1.5 min-w-0">
          <Skeleton className="h-3 w-32 rounded" />
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-3xl font-bold font-cirka tracking-tight text-foreground flex items-center">
              <Skeleton className="h-8 w-60" />
            </h1>
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
          <Skeleton className="h-4 w-72 rounded" />
        </div>
      </div>

      {/* Score Card */}
      <div className="rounded-xl border bg-card p-5 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <Skeleton className="h-3 w-16 rounded" />
            <Skeleton className="h-9 w-24 rounded" />
            <Skeleton className="h-4.5 w-20 rounded" />
          </div>
          <div className="flex flex-col items-end gap-2 shrink-0">
            <Skeleton className="h-8 w-24 rounded-lg" />
          </div>
        </div>

        <Separator />

        <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5">
          <Skeleton className="h-4 w-16 rounded" />
          <Skeleton className="h-4 w-16 rounded" />
          <Skeleton className="h-4 w-16 rounded" />
          <Skeleton className="h-4 w-16 rounded" />
        </div>
      </div>

      {/* Question Review List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-4.5 w-24 rounded" />
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="border rounded-xl p-4 flex items-center justify-between bg-card">
              <div className="flex items-start gap-3 flex-1">
                <Skeleton className="h-5 w-6 rounded shrink-0" />
                <div className="space-y-1.5 flex-1">
                  <Skeleton className="h-4 w-3/4 rounded" />
                  <Skeleton className="h-3 w-1/2 rounded" />
                </div>
              </div>
              <Skeleton className="h-4 w-4 rounded shrink-0" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
