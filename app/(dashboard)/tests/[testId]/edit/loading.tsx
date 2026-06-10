// app/(dashboard)/tests/[testId]/edit/loading.tsx

import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardHeader } from "@/components/ui/card"

export default function TestEditorLoading() {
  return (
    <div className="flex flex-col gap-6 px-4 py-8 md:px-8">

        {/* ── Page Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="flex flex-col gap-1.5">
            <h1 className="text-3xl font-bold font-cirka tracking-tight text-foreground flex items-center"><Skeleton className="h-8 w-28" /></h1>
            <Skeleton className="h-4 w-64" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-8 w-28 rounded-md" />
            <Skeleton className="h-8 w-24 rounded-md" />
          </div>
        </div>

        {/* ── Settings Card ── */}
        <Card>
          <CardHeader className="pb-4">
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-3.5 w-48 mt-1" />
          </CardHeader>
          <CardContent className="space-y-4">

            {/* Title */}
            <div className="space-y-1.5">
              <Skeleton className="h-4 w-8" />
              <Skeleton className="h-9 w-full rounded-md" />
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-16 w-full rounded-md" />
            </div>

            {/* Instructions */}
            <div className="space-y-1.5">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-20 w-full rounded-md" />
            </div>

            {/* Time Limit */}
            <div className="space-y-1.5">
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-9 w-40 rounded-md" />
            </div>

            {/* Available From / Until */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-9 w-full rounded-md" />
              </div>
              <div className="space-y-1.5">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-9 w-full rounded-md" />
              </div>
            </div>

            {/* Save Settings button */}
            <div className="pt-1">
              <Skeleton className="h-9 w-36 rounded-md" />
            </div>

          </CardContent>
        </Card>

        {/* ── Questions Card ── */}
        <Card className="opacity-50">
          <CardHeader className="pb-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="space-y-1.5">
                <Skeleton className="h-5 w-24" />
                <Skeleton className="h-3.5 w-52 mt-1" />
              </div>
              {/* Toolbar buttons */}
              <div className="flex gap-2">
                <Skeleton className="h-8 w-28 rounded-md" />
                <Skeleton className="h-8 w-20 rounded-md" />
                <Skeleton className="h-8 w-28 rounded-md" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center gap-3 py-10">
              <Skeleton className="h-9 w-9 rounded-md" />
              <div className="space-y-1.5 text-center">
                <Skeleton className="h-4 w-32 mx-auto" />
                <Skeleton className="h-3.5 w-52 mx-auto" />
              </div>
            </div>
          </CardContent>
        </Card>

      </div>
  )
}
