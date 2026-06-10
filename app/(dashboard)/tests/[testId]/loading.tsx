// app/tests/[id]/loading.tsx

import { Skeleton } from "@/components/ui/skeleton"
import { Separator } from "@/components/ui/separator"

function MetaItemSkeleton() {
  return (
    <div className="flex items-start gap-2.5 rounded-xl border bg-muted/20 p-3.5">
      <Skeleton className="mt-0.5 h-3.5 w-3.5 shrink-0 rounded" />
      <div className="space-y-1.5">
        <Skeleton className="h-2.5 w-14 rounded" />
        <Skeleton className="h-4 w-28 rounded" />
      </div>
    </div>
  )
}

function StatsCardSkeleton() {
  return (
    <div className="rounded-xl border bg-card p-4 space-y-2.5">
      <div className="flex items-center gap-1.5">
        <Skeleton className="h-3.5 w-3.5 rounded" />
        <Skeleton className="h-3 w-20 rounded" />
      </div>
      <Skeleton className="h-8 w-12 rounded" />
      <Skeleton className="h-3 w-24 rounded" />
    </div>
  )
}

function QuestionRowSkeleton() {
  return (
    <div className="overflow-hidden rounded-xl border bg-card px-4 py-3">
      <div className="flex items-start gap-3">
        <Skeleton className="mt-px h-5 w-6 shrink-0 rounded-md" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-full rounded" />
          <Skeleton className="h-4 w-3/4 rounded" />
          <div className="flex gap-1.5 pt-0.5">
            <Skeleton className="h-4 w-12 rounded-full" />
            <Skeleton className="h-4 w-10 rounded-full" />
          </div>
        </div>
        <Skeleton className="h-4 w-4 shrink-0 rounded" />
      </div>
    </div>
  )
}

export default function Loading() {
  return (
    <div className="flex flex-col gap-6 px-4 py-8 md:px-8">

      {/* ── Page Header ───────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-1.5 min-w-0">
          <Skeleton className="h-2.5 w-24 rounded" />
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-3xl font-bold font-cirka tracking-tight text-foreground flex items-center"><Skeleton className="h-8 w-52" /></h1>
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
          <Skeleton className="h-4 w-72 rounded" />
        </div>
        <Skeleton className="h-8 w-full shrink-0 rounded-lg sm:w-24" />
      </div>

        {/* ── Stats Bar ─────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatsCardSkeleton />
          <StatsCardSkeleton />
          <StatsCardSkeleton />
          <StatsCardSkeleton />
        </div>

        {/* ── Tabs ──────────────────────────────────────────────────────── */}
        <div className="space-y-6">

          {/* Tab list */}
          <div className="inline-flex h-9 gap-0.5 rounded-lg bg-muted p-1">
            <Skeleton className="h-7 w-24 rounded-md" />
            <Skeleton className="h-7 w-24 rounded-md" />
            <Skeleton className="h-7 w-24 rounded-md" />
          </div>

          {/* ── Overview Tab: Test Details card ───────────────────────── */}
          <div className="space-y-4">
            <div className="rounded-xl border bg-card p-5 space-y-5">
              <div className="space-y-1">
                <Skeleton className="h-4 w-28 rounded" />
                <Skeleton className="h-3 w-52 rounded" />
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Skeleton className="h-4 w-full rounded" />
                <Skeleton className="h-4 w-2/3 rounded" />
              </div>

              {/* Instructions block */}
              <div className="rounded-xl border bg-muted/30 p-4 space-y-2">
                <Skeleton className="h-3 w-24 rounded" />
                <Skeleton className="h-3.5 w-full rounded" />
                <Skeleton className="h-3.5 w-5/6 rounded" />
                <Skeleton className="h-3.5 w-4/6 rounded" />
              </div>

              <Separator />

              {/* Meta grid */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <MetaItemSkeleton />
                <MetaItemSkeleton />
                <MetaItemSkeleton />
                <MetaItemSkeleton />
              </div>
            </div>

            {/* ── Overview Tab: Controls card ────────────────────────── */}
            <div className="rounded-xl border bg-card p-5 space-y-4">
              <div className="space-y-1">
                <Skeleton className="h-4 w-20 rounded" />
                <Skeleton className="h-3 w-56 rounded" />
              </div>

              {/* Visibility row */}
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-1.5">
                  <Skeleton className="h-4 w-20 rounded" />
                  <Skeleton className="h-3 w-56 rounded" />
                </div>
                <Skeleton className="h-8 w-full shrink-0 rounded-lg sm:w-28" />
              </div>

              <Separator />

              {/* Results row */}
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-1.5">
                  <Skeleton className="h-4 w-16 rounded" />
                  <Skeleton className="h-3 w-56 rounded" />
                </div>
                <Skeleton className="h-8 w-full shrink-0 rounded-lg sm:w-28" />
              </div>
            </div>

            {/* ── Questions preview (subtle) ─────────────────────────── */}
            <div className="space-y-2">
              <QuestionRowSkeleton />
              <QuestionRowSkeleton />
              <QuestionRowSkeleton />
            </div>
          </div>

        </div>
      </div>
  )
}
