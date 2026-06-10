// app/tests/loading.tsx

import { Skeleton } from "@/components/ui/skeleton"
import { Input } from "@/components/ui/input"
import { Search } from "lucide-react"

// ─── Test Card Skeleton ───────────────────────────────────────────────────────
//
// Mirrors the real <TestCard>:
//   <Card>
//     <CardHeader pb-3>
//       flex justify-between: [title + description] | [status badge]
//     <CardContent flex-col gap-4>
//       meta row: icon pills (duration · questions/date · attempts)
//       schedule row
//       mt-auto: action button

function TestCardSkeleton() {
  return (
    <div className="rounded-xl border bg-card flex flex-col">
      <div className="flex flex-col md:flex-row md:items-center justify-between p-4 gap-4">
        
        {/* Left: Title, Description, Status */}
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center gap-2.5 flex-wrap">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-5 w-14 rounded-full shrink-0" />
          </div>
          <div className="space-y-1">
            <Skeleton className="h-3 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>

        {/* Middle: Details & Meta */}
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs md:text-sm text-muted-foreground border-t md:border-t-0 pt-3 md:pt-0">
          <div className="flex flex-col gap-0.5 min-w-[90px]">
            <Skeleton className="h-2 w-10" />
            <Skeleton className="h-4 w-16" />
          </div>

          <div className="flex flex-col gap-0.5 min-w-[100px]">
            <Skeleton className="h-2 w-12" />
            <Skeleton className="h-4 w-20" />
          </div>

          <div className="flex flex-col gap-0.5 min-w-[100px]">
            <Skeleton className="h-2 w-12" />
            <Skeleton className="h-4 w-20" />
          </div>

          <div className="flex flex-col gap-0.5 min-w-[140px]">
            <Skeleton className="h-2 w-16" />
            <Skeleton className="h-4 w-24" />
          </div>

          <div className="flex flex-col gap-0.5 min-w-[150px]">
            <Skeleton className="h-2 w-20" />
            <Skeleton className="h-4 w-28" />
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center justify-end md:pl-4 border-t md:border-t-0 pt-3 md:pt-0 shrink-0 w-full md:w-auto">
          <Skeleton className="h-8 w-full md:w-24 rounded-md" />
        </div>

      </div>
    </div>
  )
}

// ─── Loading ──────────────────────────────────────────────────────────────────

export default function TestsLoading() {
  return (
    <div className="flex flex-col gap-6 px-4 py-8 md:px-8">

      {/* ── Page Header ──────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <h1 className="text-3xl font-bold font-cirka tracking-tight text-foreground">Tests</h1>
          <div className="h-5 flex items-center">
            <Skeleton className="h-3.5 w-36" />
          </div>
        </div>
        {/* Institute "Create Test" button */}
        <Skeleton className="h-8 w-28 rounded-md shrink-0" />
      </div>

      {/* ── Search (left) + Tab Bar (right) — mirrors ~/students ──────────────── */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Search input skeleton */}
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search tests..."
            className="pl-9 pr-9 cursor-default pointer-events-none"
            readOnly
          />
        </div>

        {/* Tab pills skeleton */}
        <div className="overflow-x-auto shrink-0">
          <div className="inline-flex h-9 items-center gap-0.5 rounded-lg bg-muted p-1">
            <Skeleton className="h-7 w-[52px]  rounded-md shrink-0" />
            <Skeleton className="h-7 w-[58px]  rounded-md shrink-0" />
            <Skeleton className="h-7 w-[84px]  rounded-md shrink-0" />
            <Skeleton className="h-7 w-[56px]  rounded-md shrink-0" />
            <Skeleton className="h-7 w-[64px]  rounded-md shrink-0" />
          </div>
        </div>
      </div>

      {/* ── Card Grid ────────────────────────────────────────────────────────── */}
      {/*
        Matches: <div className="flex flex-col gap-3 w-full">
        Show 5 cards to fill the list at any breakpoint.
      */}
      <div className="flex flex-col gap-3 w-full">
        {Array.from({ length: 5 }).map((_, i) => (
          <TestCardSkeleton key={i} />
        ))}
      </div>

    </div>
  )
}