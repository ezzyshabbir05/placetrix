"use client"

import React from "react"
import { motion, type HTMLMotionProps } from "framer-motion"
import { cn } from "@/lib/utils"

export interface SolveChallengeButtonProps extends Omit<HTMLMotionProps<"button">, "ref"> {
  isSolved?: boolean
  label?: string
  size?: "default" | "sm" | "lg"
}

export const SolveChallengeButton = React.forwardRef<HTMLButtonElement, SolveChallengeButtonProps>(
  ({ isSolved = false, label, className, size = "default", disabled, onClick, ...props }, ref) => {
    const defaultLabel = isSolved ? "Review Challenge" : "Solve Challenge"
    const displayLabel = label || defaultLabel

    const sizeClasses = {
      sm: "h-9 px-4 text-xs sm:text-sm py-1.5 rounded-lg",
      default: "h-11 sm:h-12 px-5 text-sm sm:text-base py-2.5 sm:py-3 rounded-xl",
      lg: "h-12 sm:h-14 px-6 text-base sm:text-lg py-3.5 rounded-2xl",
    }

    return (
      <div className={cn("relative group/solve-btn w-full", disabled && "opacity-50 pointer-events-none")}>
        {/* ── Interactive Spring Button ── */}
        <motion.button
          ref={ref}
          type="button"
          disabled={disabled}
          onClick={onClick}
          whileHover={disabled ? undefined : { scale: 1.012, y: -1 }}
          whileTap={disabled ? undefined : { scale: 0.988, y: 1 }}
          transition={{ type: "spring", stiffness: 450, damping: 26 }}
          className={cn(
            "relative w-full overflow-hidden font-bold flex items-center justify-center",
            "transition-colors duration-200 select-none cursor-pointer outline-none",
            "focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
            sizeClasses[size],
            isSolved
              ? [
                  "bg-linear-to-r from-emerald-600 via-teal-600 to-emerald-500",
                  "text-white border border-emerald-400/35 hover:border-emerald-300/60",
                  "shadow-[inset_0_1px_1px_rgba(255,255,255,0.35)]",
                ]
              : [
                  "bg-linear-to-r from-orange-500 via-amber-500 to-orange-600 dark:from-orange-600 dark:via-amber-500 dark:to-orange-500",
                  "text-white border border-orange-400/40 hover:border-amber-300/70",
                  "shadow-[inset_0_1px_1px_rgba(255,255,255,0.4)]",
                ],
            className
          )}
          {...props}
        >
          {/* ── Continuous Angled Light Shimmer Beam ── */}
          {!disabled && (
            <motion.div
              aria-hidden="true"
              className="absolute top-0 left-0 h-full w-1/2 -skew-x-20 bg-linear-to-r from-transparent via-white/30 to-transparent pointer-events-none"
              animate={{
                x: ["-150%", "300%"],
              }}
              transition={{
                repeat: Infinity,
                repeatDelay: 2.8,
                duration: 1.5,
                ease: [0.4, 0, 0.2, 1],
              }}
            />
          )}

          {/* ── Upper Glass Highlight Rim ── */}
          <div
            aria-hidden="true"
            className="absolute inset-x-0 top-0 h-1/2 bg-linear-to-b from-white/20 to-transparent pointer-events-none"
          />

          {/* ── Centered Content: Clean Text Label ── */}
          <span className="relative z-10 tracking-wide font-bold drop-shadow-[0_1px_2px_rgba(0,0,0,0.25)]">
            {displayLabel}
          </span>
        </motion.button>
      </div>
    )
  }
)

SolveChallengeButton.displayName = "SolveChallengeButton"
