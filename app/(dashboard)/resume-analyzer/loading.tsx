// app/(dashboard)/resume-analyzer/loading.tsx

import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"

export default function ResumeAnalyzerLoading() {
  return (
    <div className="flex flex-col gap-6 px-4 py-8 md:px-8">
      {/* ── Page Header ── */}
      <div className="flex flex-col gap-1.5">
        <h1 className="text-3xl font-bold font-cirka tracking-tight text-foreground">Resume Analyzer</h1>
        <p className="text-sm text-muted-foreground">
          Upload your resume and a job description to get an AI-powered ATS evaluation with actionable feedback.
        </p>
      </div>

      {/* ── Main Content ── */}
      <div>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8">
          
          {/* ── Left Panel: Inputs Skeleton ── */}
          <div className="lg:col-span-5 flex flex-col gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Analysis Criteria</CardTitle>
                <CardDescription>Provide the materials required for the ATS analysis.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Upload Area Skeleton */}
                <div className="space-y-2">
                  <Skeleton className="h-4 w-28" />
                  <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 text-center min-h-[160px] border-muted-foreground/20">
                    <div className="flex flex-col items-center gap-3">
                      <Skeleton className="size-12 rounded-xl" />
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-36 mx-auto" />
                        <Skeleton className="h-3 w-48 mx-auto" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Job Description Skeleton */}
                <div className="space-y-2">
                  <div className="flex justify-between items-end">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                  <Skeleton className="h-[220px] w-full rounded-md" />
                </div>
              </CardContent>
              <CardFooter>
                <Skeleton className="h-11 w-full rounded-md" />
              </CardFooter>
            </Card>
          </div>

          {/* ── Right Panel: Results Skeleton ── */}
          <div className="lg:col-span-7 space-y-6">
            {/* Ready for Analysis / Results Preview Skeletons */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* ATS Score Ring Card Skeleton */}
              <Card className="sm:col-span-1 flex flex-col items-center justify-center p-6 min-h-[220px] bg-muted/10">
                <div className="size-24 rounded-full border-4 border-muted/30 flex items-center justify-center animate-pulse">
                  <Skeleton className="size-12 rounded-full" />
                </div>
                <Skeleton className="h-4 w-16 mt-4" />
                <Skeleton className="h-3 w-20 mt-1" />
              </Card>

              {/* Keyword Match Card Skeleton */}
              <Card className="sm:col-span-2 p-6 flex flex-col justify-between min-h-[220px]">
                <div className="space-y-2">
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-3 w-48" />
                </div>
                <div className="flex flex-wrap gap-1.5 mt-4">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <Skeleton key={i} className="h-6 w-16 rounded-full" />
                  ))}
                </div>
              </Card>
            </div>

            {/* Section Feedback Skeleton */}
            <Card>
              <CardHeader>
                <Skeleton className="h-5 w-40" />
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="rounded-lg border p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <Skeleton className="size-4 rounded" />
                      <Skeleton className="h-4 w-20" />
                    </div>
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-3 w-5/6" />
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

        </div>
      </div>
    </div>
  )
}
