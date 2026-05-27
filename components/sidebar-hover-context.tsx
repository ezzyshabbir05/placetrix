"use client"

import * as React from "react"

export interface SidebarHoverContextValue {
  /** Called by NavUser when its dropdown opens/closes */
  onUserMenuOpenChange: (open: boolean) => void
  /** Stable ref-based handlers — never cause re-renders in consumers */
  hoverProps: {
    onPointerEnter: (e: React.PointerEvent) => void
    onPointerLeave: (e: React.PointerEvent) => void
  }
}

export const SidebarHoverContext = React.createContext<SidebarHoverContextValue>({
  onUserMenuOpenChange: () => { },
  hoverProps: { onPointerEnter: () => { }, onPointerLeave: () => { } },
})

export function useSidebarHoverContext() {
  return React.useContext(SidebarHoverContext)
}
