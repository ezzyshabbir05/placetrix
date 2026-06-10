// app/(dashboard)/postings/[postingId]/applications/loading.tsx

import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

function StatCardSkeleton() {
  return (
    <Card className="rounded-xl py-0">
      <CardContent className="p-4 space-y-1">
        <div className="flex items-center gap-1.5">
          <Skeleton className="h-3.5 w-3.5 rounded" />
          <Skeleton className="h-3 w-20 rounded" />
        </div>
        <Skeleton className="h-7 w-12 rounded" />
      </CardContent>
    </Card>
  )
}

export default function ApplicationsListLoading() {
  return (
    <div className="flex flex-col gap-6 px-4 py-8 md:px-8">
      {/* Page Header */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-2">
          <Skeleton className="h-3.5 w-24 rounded" />
          <span className="text-muted-foreground/30">•</span>
          <Skeleton className="h-3.5 w-16 rounded" />
        </div>
        <h1 className="text-3xl font-bold font-cirka tracking-tight text-foreground">
          Job Applicants
        </h1>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCardSkeleton />
        <StatCardSkeleton />
        <StatCardSkeleton />
        <StatCardSkeleton />
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col gap-2 rounded-xl border bg-muted/10 p-3">
        <div className="flex flex-col sm:flex-row gap-2">
          <Skeleton className="h-9 flex-1 rounded-md" />
          <Skeleton className="h-9 w-24 rounded-md shrink-0" />
        </div>
      </div>

      {/* Desktop Table Skeleton */}
      <div className="hidden overflow-hidden rounded-xl border md:block bg-card">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              <TableHead><Skeleton className="h-3.5 w-20" /></TableHead>
              <TableHead><Skeleton className="h-3.5 w-24" /></TableHead>
              <TableHead><Skeleton className="h-3.5 w-16" /></TableHead>
              <TableHead className="text-right"><Skeleton className="h-3.5 w-16 ml-auto" /></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 6 }).map((_, i) => (
              <TableRow key={i} className="hover:bg-muted/20">
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-9 w-9 rounded-full shrink-0" />
                    <div className="space-y-1.5 min-w-0">
                      <Skeleton className="h-3.5 w-28 rounded" />
                      <Skeleton className="h-3 w-36 rounded" />
                    </div>
                  </div>
                </TableCell>
                <TableCell><Skeleton className="h-3.5 w-24 rounded" /></TableCell>
                <TableCell><Skeleton className="h-5 w-16 rounded-full" /></TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Skeleton className="h-8 w-16 rounded-md" />
                    <Skeleton className="h-8 w-24 rounded-md" />
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Mobile Accordion Placeholder */}
      <div className="rounded-xl border overflow-hidden md:hidden bg-card divide-y">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="p-4 flex items-center justify-between">
            <div className="space-y-1.5 flex-1">
              <Skeleton className="h-3.5 w-32 rounded" />
              <Skeleton className="h-4.5 w-16 rounded-full" />
            </div>
            <Skeleton className="h-4 w-4 rounded shrink-0" />
          </div>
        ))}
      </div>
    </div>
  )
}
