// app/(dashboard)/logiclab/admin/loading.tsx

import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

export default function LogicLabAdminLoading() {
  return (
    <div className="flex flex-col gap-6 px-4 py-8 md:px-12 max-w-7xl mx-auto w-full text-foreground bg-background">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">LogicLab Admin Center</h1>
          <Skeleton className="h-4 w-96 rounded" />
        </div>
        <div className="bg-muted/50 p-1 rounded-xl shrink-0">
          <div className="inline-flex h-8 gap-1 p-0">
            <Skeleton className="h-7 w-20 rounded-lg shrink-0" />
            <Skeleton className="h-7 w-28 rounded-lg shrink-0" />
            <Skeleton className="h-7 w-28 rounded-lg shrink-0" />
            <Skeleton className="h-7 w-24 rounded-lg shrink-0" />
          </div>
        </div>
      </div>

      {/* 2-Column Overview Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Leaderboard Table */}
        <div className="lg:col-span-8">
          <Card className="border shadow-none overflow-hidden p-0 rounded-2xl">
            <CardHeader className="p-6 pb-4 flex flex-row items-center justify-between border-b">
              <div className="space-y-1.5">
                <Skeleton className="h-4 w-48 rounded" />
                <Skeleton className="h-3 w-72 rounded" />
              </div>
              <Skeleton className="h-5 w-20 rounded-full shrink-0" />
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              {/* Search & Export Row */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <Skeleton className="h-9 flex-1 max-w-md rounded-xl" />
                <Skeleton className="h-9 w-24 rounded-xl shrink-0" />
              </div>

              {/* Leaderboard Table Grid */}
              <div className="border rounded-xl overflow-hidden">
                <Table className="text-xs">
                  <TableHeader>
                    <TableRow className="bg-muted border-b">
                      <TableHead className="w-12 text-center"><Skeleton className="h-3 w-6 mx-auto" /></TableHead>
                      <TableHead><Skeleton className="h-3 w-16" /></TableHead>
                      <TableHead className="w-24 text-center"><Skeleton className="h-3 w-10 mx-auto" /></TableHead>
                      <TableHead className="w-24 text-center"><Skeleton className="h-3 w-10 mx-auto" /></TableHead>
                      <TableHead className="w-24 text-center"><Skeleton className="h-3 w-12 mx-auto" /></TableHead>
                      <TableHead className="w-36 text-center"><Skeleton className="h-3 w-10 mx-auto" /></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i} className="border-b">
                        <TableCell className="text-center font-mono"><Skeleton className="h-3.5 w-4 mx-auto" /></TableCell>
                        <TableCell>
                          <div className="space-y-1.5">
                            <Skeleton className="h-3.5 w-32 rounded" />
                            <Skeleton className="h-2.5 w-44 rounded" />
                          </div>
                        </TableCell>
                        <TableCell className="text-center"><Skeleton className="h-5 w-8 rounded-full mx-auto" /></TableCell>
                        <TableCell className="text-center"><Skeleton className="h-3.5 w-6 rounded mx-auto" /></TableCell>
                        <TableCell className="text-center"><Skeleton className="h-3.5 w-8 rounded mx-auto" /></TableCell>
                        <TableCell className="text-center"><Skeleton className="h-5 w-16 rounded-full mx-auto" /></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Live Submission Feed */}
        <div className="lg:col-span-4 space-y-6">
          <Card className="border shadow-none overflow-hidden p-0 rounded-2xl">
            <CardHeader className="p-6 pb-4 flex flex-row items-center justify-between border-b">
              <div className="space-y-1.5">
                <Skeleton className="h-4 w-40 rounded" />
                <Skeleton className="h-3 w-52 rounded" />
              </div>
              <Skeleton className="h-5 w-16 rounded-full shrink-0" />
            </CardHeader>
            <CardContent className="p-6">
              <div className="border rounded-lg p-2 bg-background/25 space-y-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="border rounded-xl p-3 flex items-start justify-between gap-2">
                    <div className="space-y-1.5 min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <Skeleton className="h-3.5 w-24 rounded" />
                        <Skeleton className="h-2.5 w-8 rounded" />
                      </div>
                      <Skeleton className="h-3 w-3/4 rounded" />
                    </div>
                    <Skeleton className="h-5 w-8 rounded-full shrink-0" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
