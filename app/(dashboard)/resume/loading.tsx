// app/(dashboard)/resume/loading.tsx

import { Skeleton } from "@/components/ui/skeleton"
import { Card } from "@/components/ui/card"

export default function ResumeLoading() {
  return (
    <div className="flex flex-col gap-6 px-4 py-8 md:px-8">
      {/* Page Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <h1 className="text-3xl font-bold font-cirka tracking-tight text-foreground">Resume Builder</h1>
          <p className="text-sm text-muted-foreground">
            ATS-optimised resume builder with a LaTeX-inspired layout
          </p>
        </div>
      </div>

      {/* Main split builder workspace */}
      <div className="grid grid-cols-1 xl:grid-cols-[1.1fr_0.9fr] gap-6 items-start">
        {/* Left Side: Form Editor */}
        <div className="space-y-4">
          <Card className="p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Skeleton className="size-5 rounded" />
              <Skeleton className="h-4.5 w-32 rounded" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="space-y-1.5">
                  <Skeleton className="h-3 w-16 rounded" />
                  <Skeleton className="h-9 w-full rounded-md" />
                </div>
              ))}
            </div>
          </Card>

          {/* Collapsible section previews */}
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Skeleton className="size-5 rounded" />
                <Skeleton className="h-4 w-28 rounded" />
              </div>
              <Skeleton className="size-4 rounded" />
            </Card>
          ))}
        </div>

        {/* Right Side: A4 Page Preview */}
        <div className="hidden xl:block bg-muted/20 border rounded-2xl p-6 flex justify-center sticky top-6">
          <div className="bg-card shadow-lg border rounded-lg w-full aspect-[1/1.4] p-8 space-y-6">
            {/* Resume Header Skeleton */}
            <div className="text-center space-y-2">
              <Skeleton className="h-7 w-48 mx-auto rounded" />
              <Skeleton className="h-3.5 w-64 mx-auto rounded" />
              <Skeleton className="h-3 w-80 mx-auto rounded" />
            </div>

            <div className="h-px bg-zinc-200 dark:bg-zinc-800" />

            {/* Experience Section */}
            <div className="space-y-3">
              <Skeleton className="h-4 w-24 rounded" />
              <div className="space-y-2">
                <div className="flex justify-between">
                  <Skeleton className="h-3.5 w-36 rounded" />
                  <Skeleton className="h-3 w-20 rounded" />
                </div>
                <Skeleton className="h-3 w-full rounded" />
                <Skeleton className="h-3 w-5/6 rounded" />
              </div>
            </div>

            {/* Education Section */}
            <div className="space-y-3">
              <Skeleton className="h-4 w-24 rounded" />
              <div className="space-y-2">
                <div className="flex justify-between">
                  <Skeleton className="h-3.5 w-40 rounded" />
                  <Skeleton className="h-3 w-20 rounded" />
                </div>
                <Skeleton className="h-3 w-full rounded" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
