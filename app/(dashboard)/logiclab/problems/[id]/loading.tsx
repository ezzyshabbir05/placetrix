// app/(dashboard)/logiclab/problems/[id]/loading.tsx

import { Skeleton } from "@/components/ui/skeleton"

export default function ProblemIDELoading() {
  return (
    <div className="flex flex-col h-[calc(100svh-56px)] bg-background text-foreground overflow-hidden">
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-0 min-h-0">
        {/* Left Panel: Description */}
        <div className="lg:col-span-5 flex flex-col border-r border-border min-h-0 overflow-hidden bg-card/10">
          {/* Header */}
          <div className="flex items-center justify-between gap-2 bg-card/60 border-b px-4 py-2 shrink-0">
            <div className="flex items-center gap-3">
              <Skeleton className="h-8 w-8 rounded-lg shrink-0" />
              <div className="space-y-1">
                <Skeleton className="h-4 w-36 rounded" />
                <div className="flex gap-2">
                  <Skeleton className="h-3 w-10 rounded" />
                  <Skeleton className="h-3 w-20 rounded" />
                </div>
              </div>
            </div>
            <div className="flex gap-1">
              <Skeleton className="h-7 w-7 rounded-md" />
              <Skeleton className="h-7 w-7 rounded-md" />
            </div>
          </div>

          {/* Tabs */}
          <div className="flex bg-card border-b shrink-0">
            <div className="px-4 py-2.5 border-b-2 border-emerald-400">
              <Skeleton className="h-3.5 w-16 rounded" />
            </div>
            <div className="px-4 py-2.5">
              <Skeleton className="h-3.5 w-20 rounded" />
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            <Skeleton className="h-4 w-1/3 rounded" />
            <div className="space-y-2">
              <Skeleton className="h-3 w-full rounded" />
              <Skeleton className="h-3 w-full rounded" />
              <Skeleton className="h-3 w-3/4 rounded" />
            </div>
            <div className="pt-4 space-y-2">
              <Skeleton className="h-3 w-24 rounded" />
              <Skeleton className="h-16 w-full rounded-lg" />
            </div>
          </div>
        </div>

        {/* Right Panel: Editor / Console */}
        <div className="lg:col-span-7 flex flex-col min-h-0 bg-background">
          {/* Editor Header */}
          <div className="flex items-center justify-between bg-card px-4 py-2 border-b shrink-0">
            <div className="flex items-center gap-2">
              <Skeleton className="h-2 w-2 rounded-full" />
              <Skeleton className="h-2.5 w-32 rounded" />
            </div>
            <div className="flex gap-2">
              <Skeleton className="h-8 w-24 rounded-lg" />
              <Skeleton className="h-8 w-20 rounded-lg" />
              <Skeleton className="h-8 w-24 rounded-lg" />
            </div>
          </div>

          {/* Editor Block */}
          <div className="flex-1 flex flex-col items-center justify-center gap-2 bg-card p-10">
            <div className="h-8 w-8 border-2 border-muted border-t-foreground rounded-full animate-spin" />
            <Skeleton className="h-3.5 w-24 rounded" />
          </div>

          {/* Console Output */}
          <div className="h-[200px] border-t bg-card flex flex-col overflow-hidden shrink-0">
            <div className="bg-muted/40 px-4 py-2 border-b">
              <Skeleton className="h-3.5 w-24 rounded" />
            </div>
            <div className="flex-1 p-4">
              <Skeleton className="h-3 w-40 rounded mb-2" />
              <Skeleton className="h-3 w-48 rounded" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
