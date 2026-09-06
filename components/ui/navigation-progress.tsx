"use client"

import * as React from "react"
import { usePathname, useSearchParams } from "next/navigation"

/**
 * Triggers the top navigation progress bar programmatically.
 * Use when navigating with router.push() instead of standard <a> links.
 */
export function startNavigationProgress() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("start-navigation-progress"))
  }
}

/**
 * Stops and resets the navigation progress bar programmatically.
 * Use when an async operation or navigation encounters an error.
 */
export function stopNavigationProgress() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("stop-navigation-progress"))
  }
}

function NavigationProgressContent() {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [isLoading, setIsLoading] = React.useState(false)
  const [progress, setProgress] = React.useState(0)

  // Listen to programmatic navigation starts & stops
  React.useEffect(() => {
    const handleStart = () => {
      setIsLoading(true)
      setProgress(20)
    }

    const handleStop = () => {
      setIsLoading(false)
      setProgress(0)
    }

    window.addEventListener("start-navigation-progress", handleStart)
    window.addEventListener("stop-navigation-progress", handleStop)
    return () => {
      window.removeEventListener("start-navigation-progress", handleStart)
      window.removeEventListener("stop-navigation-progress", handleStop)
    }
  }, [])

  // Complete and fade out progress bar when navigation finishes
  React.useEffect(() => {
    if (isLoading) {
      setProgress(100)
      const timer = setTimeout(() => {
        setIsLoading(false)
        setProgress(0)
      }, 300)
      return () => clearTimeout(timer)
    }
  }, [pathname, searchParams])

  // Listen to all link clicks for instant (0ms) click feedback
  React.useEffect(() => {
    const handleAnchorClick = (e: MouseEvent) => {
      const target = (e.target as HTMLElement).closest("a, [data-nav-href]")
      if (!target) return

      const href = target.getAttribute("href") || target.getAttribute("data-nav-href")
      if (!href) return

      // Skip external links, target="_blank", or anchor hashes
      if (
        target.getAttribute("target") === "_blank" ||
        e.metaKey ||
        e.ctrlKey ||
        e.shiftKey ||
        e.altKey ||
        href.startsWith("http") ||
        href.startsWith("mailto:") ||
        href.startsWith("#")
      ) {
        return
      }

      try {
        const currentUrl = new URL(window.location.href)
        const targetUrl = new URL(href, window.location.href)

        // If navigating to a different internal route
        if (
          targetUrl.origin === currentUrl.origin &&
          (targetUrl.pathname !== currentUrl.pathname || targetUrl.search !== currentUrl.search)
        ) {
          setIsLoading(true)
          setProgress(20)
        }
      } catch {
        // Fallback for relative paths
        if (href.startsWith("/")) {
          setIsLoading(true)
          setProgress(20)
        }
      }
    }

    document.addEventListener("click", handleAnchorClick, { capture: true })
    return () => document.removeEventListener("click", handleAnchorClick, { capture: true })
  }, [])

  // Incremental progress animation while waiting for server response
  React.useEffect(() => {
    if (!isLoading || progress >= 90) return

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev < 40) return prev + 15
        if (prev < 70) return prev + 8
        if (prev < 88) return prev + 3
        return prev + 1
      })
    }, 150)

    return () => clearInterval(interval)
  }, [isLoading, progress])

  if (!isLoading && progress === 0) return null

  return (
    <div className="fixed top-0 left-0 right-0 z-99999 pointer-events-none h-0.5">
      <div
        className="h-full bg-primary shadow-[0_0_8px_var(--primary)] transition-all duration-300 ease-out"
        style={{
          width: `${progress}%`,
          opacity: progress === 100 ? 0 : 1,
        }}
      />
    </div>
  )
}

export function NavigationProgress() {
  return (
    <React.Suspense fallback={null}>
      <NavigationProgressContent />
    </React.Suspense>
  )
}
