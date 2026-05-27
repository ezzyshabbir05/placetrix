// app/(dashboard)/~/logiclab/loading.tsx

import { Skeleton } from "@/components/ui/skeleton"
import { Card } from "@/components/ui/card"

export default function LogicLabLoading() {
  return (
    <div className="flex flex-col gap-6 px-4 py-8 md:px-8">
      {/* Page Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-1.5">
          <h1 className="text-3xl font-bold font-cirka tracking-tight text-foreground">LogicLab</h1>
          <Skeleton className="h-4 w-40 rounded" />
        </div>
        <Skeleton className="h-8 w-28 rounded-md shrink-0 hidden sm:block" />
      </div>

      {/* Tag Filter Pills card */}
      <Card className="border bg-card p-3">
        <div className="flex flex-wrap gap-1.5">
          <Skeleton className="h-6 w-20 rounded" />
          <Skeleton className="h-6 w-16 rounded" />
          <Skeleton className="h-6 w-24 rounded" />
          <Skeleton className="h-6 w-18 rounded" />
          <Skeleton className="h-6 w-20 rounded" />
          <Skeleton className="h-6 w-14 rounded" />
        </div>
      </Card>

      {/* Stats & Activity Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
        {/* Streak Card */}
        <Card className="lg:col-span-3 border bg-card p-3 flex flex-col justify-between h-[150px]">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Skeleton className="h-8 w-8 rounded-lg shrink-0" />
              <div className="space-y-1">
                <Skeleton className="h-2 w-14 rounded" />
                <Skeleton className="h-4 w-20 rounded" />
              </div>
            </div>
            <Skeleton className="h-3 w-full rounded" />
            <Skeleton className="h-3 w-3/4 rounded" />
          </div>
          <div className="pt-2 border-t flex items-center justify-between">
            <Skeleton className="h-2 w-16 rounded" />
            <Skeleton className="h-2.5 w-8 rounded" />
          </div>
        </Card>

        {/* Consistency Grid */}
        <Card className="lg:col-span-5 border bg-card p-3 flex flex-col justify-start gap-2.5 h-[150px]">
          <div className="flex items-center justify-between pb-2 border-b">
            <div className="space-y-1">
              <div className="flex items-center gap-1.5">
                <Skeleton className="h-3.5 w-3.5 rounded" />
                <Skeleton className="h-3 w-28 rounded" />
              </div>
              <Skeleton className="h-2 w-36 rounded" />
            </div>
          </div>
          <div className="flex gap-2 flex-1 items-center justify-center">
            {/* Simple calendar block preview */}
            <Skeleton className="h-14 w-full rounded" />
          </div>
        </Card>

        {/* Difficulty Progress Card */}
        <Card className="lg:col-span-4 border bg-card p-3 flex flex-col justify-between h-[150px]">
          <div className="space-y-2.5">
            <div className="space-y-1">
              <Skeleton className="h-2.5 w-24 rounded" />
              <Skeleton className="h-4.5 w-16 rounded" />
            </div>
            <Skeleton className="h-1.5 w-full rounded-full" />
            <div className="grid grid-cols-3 gap-1">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="space-y-1">
                  <Skeleton className="h-2 w-10 rounded" />
                  <Skeleton className="h-3 w-8 rounded" />
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>

      {/* Problems Table Card */}
      <Card className="border overflow-hidden p-0">
        {/* Search + Filter Toolbar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 px-3 py-2.5 bg-muted/40 border-b">
          <Skeleton className="h-9 flex-1 rounded-md" />
          <Skeleton className="h-9 w-full sm:w-[130px] rounded-md shrink-0" />
          <Skeleton className="h-9 w-full sm:w-[130px] rounded-md shrink-0" />
        </div>

        {/* Column Header */}
        <div className="grid grid-cols-12 gap-2 px-4 py-2.5 bg-muted/30 border-b">
          <div className="col-span-1"><Skeleton className="h-3 w-8" /></div>
          <div className="col-span-5"><Skeleton className="h-3 w-16" /></div>
          <div className="col-span-2"><Skeleton className="h-3 w-12" /></div>
          <div className="col-span-2"><Skeleton className="h-3 w-16" /></div>
          <div className="col-span-2 text-right"><Skeleton className="h-3 w-12 ml-auto" /></div>
        </div>

        {/* Rows */}
        <div className="divide-y">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="grid grid-cols-12 gap-2 items-center px-4 py-3 bg-card">
              <div className="col-span-1">
                <Skeleton className="h-4 w-4 rounded-full" />
              </div>
              <div className="col-span-5 flex items-center gap-2">
                <Skeleton className="h-3.5 w-4 rounded" />
                <Skeleton className="h-3.5 w-3/4 rounded" />
              </div>
              <div className="col-span-2">
                <Skeleton className="h-5 w-12 rounded" />
              </div>
              <div className="col-span-2">
                <Skeleton className="h-3.5 w-10 rounded" />
              </div>
              <div className="col-span-2 flex justify-end gap-1">
                <Skeleton className="h-5 w-10 rounded" />
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
