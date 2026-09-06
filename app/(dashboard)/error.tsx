"use client"

import * as React from "react"
import Link from "next/link"
import { AlertCircle, RotateCcw, Home } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  React.useEffect(() => {
    // Log the error to console for debugging
    console.error("[DashboardError] Route render error caught by boundary:", error)
  }, [error])

  return (
    <div className="flex flex-col items-center justify-center flex-1 w-full min-h-[400px] md:min-h-[500px] p-6 text-center animate-in fade-in duration-300">
      <div className="flex size-14 items-center justify-center rounded-full bg-destructive/10 text-destructive mb-4 shadow-xs">
        <AlertCircle className="size-7" />
      </div>

      <h2 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl mb-2">
        Unable to load this page
      </h2>

      <p className="text-sm text-muted-foreground max-w-md mb-6 leading-relaxed">
        Something went wrong while displaying this section. This might be due to a temporary network blip or an interrupted navigation.
      </p>

      <div className="flex flex-wrap items-center justify-center gap-3">
        <Button
          onClick={() => reset()}
          variant="default"
          className="gap-2"
        >
          <RotateCcw className="size-4" />
          <span>Try Again</span>
        </Button>

        <Button
          onClick={() => {
            if (typeof window !== "undefined") {
              window.location.reload()
            }
          }}
          variant="outline"
          className="gap-2"
        >
          <span>Reload Page</span>
        </Button>

        <Button
          asChild
          variant="ghost"
        >
          <Link href="/home" className="gap-2">
            <Home className="size-4" />
            <span>Go Home</span>
          </Link>
        </Button>
      </div>

      {error?.digest && (
        <p className="mt-8 text-[11px] font-mono text-muted-foreground/60">
          Error ID: {error.digest}
        </p>
      )}
    </div>
  )
}
