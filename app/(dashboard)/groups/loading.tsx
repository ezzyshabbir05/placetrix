// app/(dashboard)/groups/loading.tsx

import { Skeleton } from "@/components/ui/skeleton"

export default function GroupsLoading() {
  return (
    <div className="flex flex-col gap-6 px-4 py-8 md:px-8">
      <div className="flex flex-col gap-1.5">
        <h1 className="text-3xl font-bold font-cirka tracking-tight text-foreground">Study Groups</h1>
        <Skeleton className="h-4 w-60" />
      </div>
      <div className="flex min-h-[400px] flex-col items-center justify-center gap-4">
        <Skeleton className="size-12 rounded-full" />
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-4 w-72" />
      </div>
    </div>
  )
}
