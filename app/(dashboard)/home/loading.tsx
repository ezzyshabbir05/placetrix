import React from "react"
import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardHeader } from "@/components/ui/card"

export default function HomeLoading() {
  return (
    <div className="flex flex-col gap-6 px-4 py-8 md:px-8 w-full animate-in fade-in duration-500">
      {/* ─── Hero Welcome Banner Skeleton ─── */}
      <Card className="relative overflow-hidden border-border/40 bg-card/50 backdrop-blur-sm shadow-sm py-6">
        <CardContent className="flex flex-col md:flex-row md:items-center justify-between gap-6 px-6 py-0">
          <div className="space-y-3 flex-1 min-w-0">
            <Skeleton className="h-4 w-28 rounded-full" />
            <Skeleton className="h-9 w-60 rounded-md" />
            <Skeleton className="h-4 w-96 rounded" />
          </div>
          <Skeleton className="h-14 w-full md:w-80 rounded-xl shrink-0" />
        </CardContent>
      </Card>

      {/* ─── Main Grid Layout Skeleton ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* COLUMN 1: Performance & Assessments (Span 2) */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Card: Performance Insights Skeleton */}
          <Card className="bg-card/50 backdrop-blur-sm border-border/40 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <Skeleton className="h-6 w-44 rounded-md" />
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Left Panel: Coding Challenges */}
                <Card className="border bg-card/40 shadow-none py-0">
                  <CardContent className="flex flex-row items-center justify-between gap-6 p-5">
                    <div className="space-y-4 flex-1">
                      <div className="space-y-2">
                        <Skeleton className="h-3 w-28 rounded" />
                        <Skeleton className="h-7 w-36 rounded" />
                      </div>
                      <div className="space-y-3">
                        {Array.from({ length: 3 }).map((_, idx) => (
                          <div key={idx} className="space-y-1.5">
                            <div className="flex justify-between">
                              <Skeleton className="h-3 w-12 rounded" />
                              <Skeleton className="h-3 w-8 rounded" />
                            </div>
                            <Skeleton className="h-1.5 w-full rounded-full" />
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    <Skeleton className="h-28 w-px bg-border/45 shrink-0 hidden sm:block" />
                    
                    {/* Concentric rings skeleton circle */}
                    <div className="h-28 w-28 rounded-full border-4 border-muted/20 flex items-center justify-center shrink-0 relative">
                      <div className="h-20 w-20 rounded-full border-4 border-muted/20 flex items-center justify-center">
                        <div className="h-12 w-12 rounded-full border-4 border-muted/20" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Right Panel: Mock Test Accuracy */}
                <Card className="border bg-card/40 shadow-none py-0">
                  <CardContent className="flex flex-row items-center justify-between gap-6 p-5">
                    <div className="space-y-4 flex-1">
                      <div className="space-y-2">
                        <Skeleton className="h-3 w-36 rounded" />
                        <Skeleton className="h-7 w-24 rounded" />
                      </div>
                      <div className="space-y-3">
                        <div className="space-y-1.5">
                          <div className="flex justify-between">
                            <Skeleton className="h-3 w-20 rounded" />
                            <Skeleton className="h-3 w-8 rounded" />
                          </div>
                          <Skeleton className="h-1.5 w-full rounded-full" />
                        </div>
                        {/* 3 stats layout */}
                        <div className="grid grid-cols-3 gap-2 mt-4 bg-muted/25 rounded-xl p-2.5 border border-border/10">
                          {Array.from({ length: 3 }).map((_, idx) => (
                            <div key={idx} className="flex flex-col items-center justify-center">
                              <Skeleton className="h-2.5 w-10 rounded mb-1" />
                              <Skeleton className="h-4 w-6 rounded" />
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    <Skeleton className="h-28 w-px bg-border/45 shrink-0 hidden sm:block" />

                    {/* Radial progress ring circle */}
                    <div className="h-28 w-28 rounded-full border-4 border-muted/20 flex flex-col items-center justify-center shrink-0">
                      <Skeleton className="h-5 w-10 rounded" />
                      <Skeleton className="h-2.5 w-12 rounded mt-1.5" />
                    </div>
                  </CardContent>
                </Card>

              </div>

              {/* 14-Day Activity Tracker Section */}
              <div className="border-t border-border/30 pt-5 space-y-3">
                <div className="flex justify-between items-center">
                  <Skeleton className="h-3.5 w-48 rounded" />
                  <Skeleton className="h-3 w-32 rounded" />
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {Array.from({ length: 14 }).map((_, idx) => (
                    <Skeleton key={idx} className="h-10 flex-1 min-w-[36px] rounded-lg" />
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Active & Upcoming Assessments Card */}
          <Card className="bg-card/50 backdrop-blur-sm border-border/40 shadow-sm">
            <CardHeader>
              <Skeleton className="h-6 w-56 rounded-md" />
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Array.from({ length: 2 }).map((_, idx) => (
                <div key={idx} className="border border-border/30 rounded-xl p-4 flex flex-col justify-between gap-4">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <Skeleton className="h-5.5 w-16 rounded-full" />
                      <Skeleton className="h-4 w-10 rounded" />
                    </div>
                    <Skeleton className="h-5 w-3/4 rounded" />
                    <Skeleton className="h-3.5 w-full rounded" />
                    <Skeleton className="h-3.5 w-5/6 rounded" />
                  </div>
                  <Skeleton className="h-9 w-full rounded-lg" />
                </div>
              ))}
            </CardContent>
          </Card>

        </div>

        {/* COLUMN 2: Navigation & Recent Timeline (Span 1) */}
        <div className="space-y-6">
          
          {/* Quick Shortcuts */}
          <Card className="bg-card/50 backdrop-blur-sm border-border/40 shadow-sm">
            <CardHeader>
              <Skeleton className="h-4 w-28 rounded" />
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-2">
              {Array.from({ length: 6 }).map((_, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 rounded-xl border border-border/30">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-9 w-9 rounded-lg shrink-0" />
                    <div className="space-y-1.5">
                      <Skeleton className="h-4 w-24 rounded" />
                      <Skeleton className="h-3 w-36 rounded" />
                    </div>
                  </div>
                  <Skeleton className="h-4 w-4 rounded shrink-0" />
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Recent Applications Timeline */}
          <Card className="bg-card/50 backdrop-blur-sm border-border/40 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <Skeleton className="h-4.5 w-36 rounded" />
              <Skeleton className="h-3.5 w-12 rounded" />
            </CardHeader>
            <CardContent className="space-y-1">
              {Array.from({ length: 3 }).map((_, idx) => (
                <div key={idx} className="flex gap-3 p-2 relative">
                  <Skeleton className="h-7 w-7 rounded-full shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <div className="flex justify-between">
                      <Skeleton className="h-4 w-28 rounded" />
                      <Skeleton className="h-3 w-10 rounded" />
                    </div>
                    <Skeleton className="h-3 w-36 rounded" />
                    <Skeleton className="h-5 w-16 rounded-full" />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

        </div>

      </div>
    </div>
  )
}
