"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

export interface MeshGradientCardProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string
  description?: string
  variant?: "purple" | "green" | "iridescent" | "sunset" | "ocean"
  children?: React.ReactNode
}

const VARIANTS = {
  // Purple / Violet Iridescent Mesh (Placement Tracks)
  purple: {
    bg: "bg-[#f3e8ff]",
    style: {
      backgroundImage: `
        radial-gradient(at 0% 0%, #c4b5fd 0px, transparent 65%),
        radial-gradient(at 100% 0%, #a5b4fc 0px, transparent 65%),
        radial-gradient(at 65% 45%, #fed7aa 0px, transparent 55%),
        radial-gradient(at 100% 100%, #fbcfe8 0px, transparent 70%),
        radial-gradient(at 0% 100%, #e9d5ff 0px, transparent 65%),
        radial-gradient(at 35% 85%, #f472b6 0px, transparent 60%)
      `,
    },
    border: "border-white/60 dark:border-white/15",
    shadow: "shadow-[inset_0_1px_1px_rgba(255,255,255,0.7),0_8px_20px_-6px_rgba(168,85,247,0.12)] hover:shadow-[inset_0_1px_1px_rgba(255,255,255,0.9),0_12px_28px_-6px_rgba(168,85,247,0.22)]",
  },
  // Green / Emerald / Mint Iridescent Mesh (Company Interview Sets)
  green: {
    bg: "bg-[#ecfdf5]",
    style: {
      backgroundImage: `
        radial-gradient(at 0% 0%, #6ee7b7 0px, transparent 65%),
        radial-gradient(at 100% 0%, #67e8f9 0px, transparent 65%),
        radial-gradient(at 65% 45%, #fef08a 0px, transparent 55%),
        radial-gradient(at 100% 100%, #a7f3d0 0px, transparent 70%),
        radial-gradient(at 0% 100%, #99f6e4 0px, transparent 65%),
        radial-gradient(at 35% 85%, #bef264 0px, transparent 60%)
      `,
    },
    border: "border-white/60 dark:border-white/15",
    shadow: "shadow-[inset_0_1px_1px_rgba(255,255,255,0.7),0_8px_20px_-6px_rgba(16,185,129,0.12)] hover:shadow-[inset_0_1px_1px_rgba(255,255,255,0.9),0_12px_28px_-6px_rgba(16,185,129,0.22)]",
  },
  // Multi-color Iridescent (Exact match to card-07 screenshot)
  iridescent: {
    bg: "bg-[#e0e7ff]",
    style: {
      backgroundImage: `
        radial-gradient(at 10% 20%, #93c5fd 0px, transparent 65%),
        radial-gradient(at 90% 10%, #67e8f9 0px, transparent 65%),
        radial-gradient(at 80% 80%, #fed7aa 0px, transparent 60%),
        radial-gradient(at 20% 90%, #f472b6 0px, transparent 65%),
        radial-gradient(at 50% 45%, #e9d5ff 0px, transparent 55%)
      `,
    },
    border: "border-white/60 dark:border-white/15",
    shadow: "shadow-[inset_0_1px_1px_rgba(255,255,255,0.7),0_8px_20px_-6px_rgba(99,102,241,0.12)] hover:shadow-[inset_0_1px_1px_rgba(255,255,255,0.9),0_12px_28px_-6px_rgba(99,102,241,0.22)]",
  },
  sunset: {
    bg: "bg-[#fed7aa]",
    style: {
      backgroundImage: `
        radial-gradient(at 0% 0%, #fdba74 0px, transparent 65%),
        radial-gradient(at 100% 0%, #f472b6 0px, transparent 65%),
        radial-gradient(at 100% 100%, #fbbf24 0px, transparent 65%),
        radial-gradient(at 0% 100%, #f87171 0px, transparent 65%)
      `,
    },
    border: "border-white/60 dark:border-white/15",
    shadow: "shadow-[inset_0_1px_1px_rgba(255,255,255,0.7),0_8px_20px_-6px_rgba(249,115,22,0.12)] hover:shadow-[inset_0_1px_1px_rgba(255,255,255,0.9),0_12px_28px_-6px_rgba(249,115,22,0.22)]",
  },
  ocean: {
    bg: "bg-[#bae6fd]",
    style: {
      backgroundImage: `
        radial-gradient(at 0% 0%, #38bdf8 0px, transparent 65%),
        radial-gradient(at 100% 0%, #818cf8 0px, transparent 65%),
        radial-gradient(at 100% 100%, #2dd4bf 0px, transparent 65%),
        radial-gradient(at 0% 100%, #60a5fa 0px, transparent 65%)
      `,
    },
    border: "border-white/60 dark:border-white/15",
    shadow: "shadow-[inset_0_1px_1px_rgba(255,255,255,0.7),0_8px_20px_-6px_rgba(14,165,233,0.12)] hover:shadow-[inset_0_1px_1px_rgba(255,255,255,0.9),0_12px_28px_-6px_rgba(14,165,233,0.22)]",
  },
}

export function MeshGradientCard({
  title,
  description,
  variant = "iridescent",
  className,
  children,
  style,
  ...props
}: MeshGradientCardProps) {
  const currentVariant = VARIANTS[variant] || VARIANTS.iridescent

  return (
    <div
      className={cn(
        "group relative flex flex-col justify-between overflow-hidden rounded-3xl sm:rounded-[28px] p-6 sm:p-7 md:p-8",
        "border shadow-md hover:shadow-xl transition-all duration-300",
        "select-none cursor-pointer",
        currentVariant.bg,
        currentVariant.border,
        currentVariant.shadow,
        className
      )}
      style={{
        ...currentVariant.style,
        ...style,
      }}
      {...props}
    >
      {/* Content wrapper */}
      <div className="relative z-10 flex flex-col gap-3 sm:gap-4">
        {title && (
          <h3 className="text-lg sm:text-xl font-bold tracking-tight text-neutral-900 leading-snug">
            {title}
          </h3>
        )}
        {description && (
          <p className="text-sm sm:text-base text-neutral-700/90 leading-relaxed font-normal">
            {description}
          </p>
        )}
        {children}
      </div>
    </div>
  )
}
