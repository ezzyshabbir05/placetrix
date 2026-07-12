"use client"

import * as React from "react"
import { SidebarInset, SidebarProvider, useSidebar } from "@/components/ui/sidebar"
import { SiteHeader } from "@/components/site-header"
import { usePathname } from "next/navigation"


// ─── Constants ────────────────────────────────────────────────────────────────


const HOVER_OPEN_DELAY = 180   // ms
const HOVER_CLOSE_DELAY = 140  // ms


// ─── Hover Context ────────────────────────────────────────────────────────────


import { SidebarHoverContext, type SidebarHoverContextValue } from "./sidebar-hover-context"


// ─── Mobile Hover Guard ───────────────────────────────────────────────────────
// Must be inside SidebarProvider to access useSidebar.


function MobileHoverGuard({
  suspendHoverRef,
}: {
  suspendHoverRef: React.MutableRefObject<boolean>
}) {
  const { isMobile } = useSidebar()

  React.useEffect(() => {
    suspendHoverRef.current = !!isMobile
  }, [isMobile, suspendHoverRef])

  return null
}


// ─── DashboardShell ───────────────────────────────────────────────────────────


export function DashboardShell({
  sidebar,
  children,
}: {
  sidebar: React.ReactNode
  children: React.ReactNode
}) {
  const [open, setOpen] = React.useState(false)
  const pathname = usePathname()
  const insetRef = React.useRef<HTMLElement>(null)

  // Reset scroll on navigation
  React.useEffect(() => {
    if (insetRef.current) {
      insetRef.current.scrollTo(0, 0)
    }
  }, [pathname])

  const manualModeRef = React.useRef(false)
  const hoverOpenedRef = React.useRef(false)
  const suspendHoverRef = React.useRef(false)
  const intentTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastIntentRef = React.useRef<"open" | "close" | null>(null)

  const setOpenRef = React.useRef(setOpen)
  React.useEffect(() => { setOpenRef.current = setOpen }, [setOpen])

  const clearIntentTimer = React.useCallback(() => {
    if (intentTimerRef.current) clearTimeout(intentTimerRef.current)
    intentTimerRef.current = null
    lastIntentRef.current = null
  }, [])

  React.useEffect(() => () => clearIntentTimer(), [clearIntentTimer])

  const commitIntent = React.useCallback((intent: "open" | "close") => {
    if (manualModeRef.current || suspendHoverRef.current) return
    if (intent === "open") {
      hoverOpenedRef.current = true
      setOpenRef.current(true)
    } else {
      if (!hoverOpenedRef.current) return
      hoverOpenedRef.current = false
      setOpenRef.current(false)
    }
  }, [])

  const scheduleIntent = React.useCallback((intent: "open" | "close") => {
    if (manualModeRef.current || suspendHoverRef.current) return
    if (lastIntentRef.current === intent) return
    lastIntentRef.current = intent
    if (intentTimerRef.current) clearTimeout(intentTimerRef.current)
    const delay = intent === "open" ? HOVER_OPEN_DELAY : HOVER_CLOSE_DELAY
    intentTimerRef.current = setTimeout(() => {
      commitIntent(intent)
      intentTimerRef.current = null
      lastIntentRef.current = null
    }, delay)
  }, [commitIntent])

  const onManualToggle = React.useCallback(() => {
    clearIntentTimer()
    hoverOpenedRef.current = false
    setOpenRef.current((prev) => {
      if (prev) {
        manualModeRef.current = true
      } else {
        manualModeRef.current = false
      }
      return prev
    })
  }, [clearIntentTimer])

  React.useEffect(() => {
    if (open && manualModeRef.current) {
      manualModeRef.current = false
    }
  }, [open])

  const handleUserMenuOpenChange = React.useCallback(
    (menuOpen: boolean) => {
      suspendHoverRef.current = menuOpen
      if (menuOpen) {
        clearIntentTimer()
        setOpenRef.current(true)
      }
    },
    [clearIntentTimer],
  )

  const hoverProps = React.useMemo(() => ({
    onPointerEnter: (e: React.PointerEvent) => {
      if (e.pointerType !== "mouse") return
      scheduleIntent("open")
    },
    onPointerLeave: (e: React.PointerEvent) => {
      if (e.pointerType !== "mouse") return
      scheduleIntent("close")
    },
  }), [scheduleIntent])

  const contextValue = React.useMemo<SidebarHoverContextValue>(
    () => ({
      onUserMenuOpenChange: handleUserMenuOpenChange,
      hoverProps,
    }),
    [handleUserMenuOpenChange, hoverProps],
  )

  return (
    <SidebarHoverContext.Provider value={contextValue}>
      <SidebarProvider
        open={open}
        onOpenChange={setOpen}
      >
        {sidebar}

        {/* ✅ flex flex-col added so flex-1 children respond correctly */}
        <SidebarInset ref={insetRef} className="h-svh overflow-y-auto flex flex-col">
          <div className="sticky z-9 top-0 w-full bg-background border-b md:hidden">
            <SiteHeader onManualToggle={onManualToggle} />
          </div>

          {/* ✅ min-h-0 prevents flex child from overflowing the parent */}
          <div className="flex flex-1 flex-col min-h-0">
            <div className="@container/main flex flex-1 flex-col gap-2">
              <div className="flex flex-1 flex-col gap-4 min-h-0">
                {children}
              </div>
            </div>
          </div>
        </SidebarInset>

        <MobileHoverGuard suspendHoverRef={suspendHoverRef} />
      </SidebarProvider>
    </SidebarHoverContext.Provider>
  )
}
