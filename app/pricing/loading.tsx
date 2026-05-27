// app/pricing/loading.tsx

import { Skeleton } from "@/components/ui/skeleton"

function HeaderSkeleton() {
  return (
    <header className="fixed inset-x-0 top-0 z-50 w-full px-3 pt-3 md:px-4">
      <div className="mx-auto w-full max-w-6xl">
        <div className="w-full rounded-full border border-black/10 bg-white/30 backdrop-blur-xl dark:border-white/10 dark:bg-black/30">
          <nav className="flex w-full items-center justify-between px-4 h-14 md:h-12">
            <div className="flex items-center gap-2">
              <Skeleton className="size-6 rounded-full" />
              <Skeleton className="h-4 w-20" />
            </div>
            <div className="flex items-center gap-2">
              <Skeleton className="size-8 rounded-md" />
              <Skeleton className="h-8 w-16 rounded-md" />
              <Skeleton className="h-8 w-24 rounded-md" />
            </div>
          </nav>
        </div>
      </div>
    </header>
  )
}

function FooterSkeleton() {
  return (
    <footer className="relative mt-auto border-t border-black/10 dark:border-white/10 py-10 bg-white dark:bg-black">
      <div className="mx-auto max-w-6xl px-4 md:px-6">
        <div className="grid grid-cols-6 gap-6">
          <div className="col-span-6 md:col-span-4 space-y-4">
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-4 w-40" />
            <div className="flex gap-2">
              <Skeleton className="size-8 rounded-full" />
              <Skeleton className="size-8 rounded-full" />
              <Skeleton className="size-8 rounded-full" />
            </div>
          </div>
          <div className="col-span-3 md:col-span-1 space-y-2">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-3 w-24" />
          </div>
          <div className="col-span-3 md:col-span-1 space-y-2">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
      </div>
    </footer>
  )
}

export default function PricingLoading() {
  return (
    <div className="relative flex min-h-screen flex-col bg-white text-zinc-950 dark:bg-black dark:text-white">
      <HeaderSkeleton />
      <main className="flex flex-col pt-24 md:pt-28">
        
        {/* Hero Section Skeleton */}
        <section className="py-14 md:py-20 text-center">
          <div className="mx-auto w-full max-w-3xl px-4 md:px-6 space-y-4 flex flex-col items-center">
            <Skeleton className="h-3 w-20 uppercase tracking-widest" />
            <Skeleton className="h-10 w-4/5 max-w-lg" />
            <Skeleton className="h-4 w-full max-w-xl" />
          </div>
        </section>

        {/* Current Plan Section Skeleton */}
        <section className="py-10">
          <div className="mx-auto w-full max-w-6xl px-4 md:px-6">
            <div className="rounded-3xl border border-black/10 bg-white/95 p-6 backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.03] md:p-8 lg:p-10">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                <div className="lg:col-span-7 space-y-4">
                  <Skeleton className="h-3 w-28 uppercase" />
                  <Skeleton className="h-10 w-3/4 max-w-md" />
                  <Skeleton className="h-4 w-full max-w-lg" />
                  <Skeleton className="h-4 w-5/6 max-w-md" />
                </div>
                <div className="lg:col-span-5 flex flex-col items-center lg:items-end justify-center p-6 border-t lg:border-t-0 lg:border-l border-black/10 dark:border-white/10 space-y-4">
                  <Skeleton className="h-14 w-28" />
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-10 w-40 rounded-full" />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Future Plans Section Skeleton */}
        <section className="py-14 md:py-20 text-center">
          <div className="mx-auto w-full max-w-3xl px-4 md:px-6 space-y-4 flex flex-col items-center">
            <Skeleton className="h-3 w-28 uppercase" />
            <Skeleton className="h-10 w-4/5 max-w-lg" />
            <Skeleton className="h-4 w-full max-w-xl" />
          </div>
        </section>

      </main>
      <FooterSkeleton />
    </div>
  )
}
