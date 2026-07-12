import { Skeleton } from "@/components/ui/skeleton"
import { Card } from "@/components/ui/card"
import { PublicPageLayout } from "@/components/ui/loading-skeleton"

export default function OurTeamLoading() {
  return (
    <PublicPageLayout>
      {/* Mission Section Skeleton */}
      <section className="py-14 md:py-20">
        <div className="mx-auto w-full max-w-6xl px-4 md:px-6">
          <Card className="p-6 backdrop-blur-sm border-border/60 shadow-2xs md:p-8 lg:p-10 space-y-6">
            <div className="max-w-4xl space-y-4">
              <Skeleton className="h-3.5 w-28 uppercase tracking-widest rounded" />
              <Skeleton className="h-10 w-3/4 max-w-md rounded" />
              <div className="space-y-3 pt-2">
                <Skeleton className="h-4 w-full rounded" />
                <Skeleton className="h-4 w-full rounded" />
                <Skeleton className="h-4 w-5/6 rounded" />
                <Skeleton className="h-4 w-4/5 rounded" />
              </div>
            </div>
          </Card>
        </div>
      </section>

      {/* Team Section Skeleton */}
      <section className="py-14 md:py-20 text-center">
        <div className="mx-auto w-full max-w-6xl px-4 md:px-6">
          <div className="space-y-4 flex flex-col items-center">
            <Skeleton className="h-3.5 w-20 uppercase tracking-widest rounded" />
            <Skeleton className="h-10 w-3/4 max-w-md rounded" />
            <Skeleton className="h-4 w-full max-w-xl rounded" />
          </div>

          {/* Grid of Team Cards */}
          <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-5">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i} className="p-4 space-y-4 border-border/60 shadow-2xs">
                {/* Square Image Placeholder */}
                <Skeleton className="aspect-square w-full rounded-2xl" />
                <div className="space-y-2 text-left">
                  <Skeleton className="h-5 w-2/3 rounded" />
                  <Skeleton className="h-4 w-1/2 rounded" />
                </div>
                <div className="flex gap-2 pt-2">
                  <Skeleton className="h-8.5 w-20 rounded-lg" />
                  <Skeleton className="size-8.5 rounded-lg" />
                  <Skeleton className="size-8.5 rounded-lg" />
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>
    </PublicPageLayout>
  )
}
