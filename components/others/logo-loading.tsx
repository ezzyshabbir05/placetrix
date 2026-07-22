import React from "react"
import { cn } from "@/lib/utils"

interface LogoLoadingProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "screen-centered" | "full-screen" | "inline"
  size?: "sm" | "md" | "lg"
}

export function LogoLoading({
  variant = "screen-centered",
  size = "md",
  className,
  ...props
}: LogoLoadingProps) {
  // Determine dimensions based on size prop
  const logoDimensions = {
    sm: "w-16 h-10",
    md: "w-28 h-16 md:w-36 md:h-20",
    lg: "w-48 h-28 md:w-56 md:h-32",
  }[size]

  // Placetrix SVG logo with a built-in shimmer gradient
  const PlacetrixShimmerLogo = ({ className }: { className?: string }) => {
    // Generate a unique ID to avoid gradient ID collisions on the same page
    const gradientId = React.useId().replace(/:/g, "")

    return (
      <svg
        viewBox="0 0 234 139"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={cn("w-full h-full select-none pointer-events-none", className)}
      >
        <defs>
          <linearGradient id={`shimmer-${gradientId}`} x1="-150%" y1="0%" x2="50%" y2="0%">
            <stop offset="0%" stopColor="var(--logo-shimmer-base)" stopOpacity="1" />
            <stop offset="50%" stopColor="var(--logo-shimmer-highlight)" stopOpacity="1" />
            <stop offset="100%" stopColor="var(--logo-shimmer-base)" stopOpacity="1" />
            <animate
              attributeName="x1"
              from="-150%"
              to="150%"
              dur="1.8s"
              repeatCount="indefinite"
            />
            <animate
              attributeName="x2"
              from="50%"
              to="350%"
              dur="1.8s"
              repeatCount="indefinite"
            />
          </linearGradient>
        </defs>
        {/* Left path shape */}
        <path
          d="M3.78965 131.389L49.3376 57.9376C53.1673 51.7618 59.9207 48 67.1876 48H137.213C140.37 48 142.283 51.4846 140.588 54.1475L121.179 84.6475C120.445 85.8013 119.172 86.5 117.804 86.5H78.2496C76.8527 86.5 75.5571 87.2287 74.8315 88.4223L50.8424 127.888C47.2146 133.857 40.7363 137.5 33.752 137.5H7.1871C4.05169 137.5 2.13726 134.053 3.78965 131.389Z"
          fill={`url(#shimmer-${gradientId})`}
        />
        {/* Right path shape */}
        <path
          d="M57.0333 32.8693L72.9628 8.65652C76.107 3.87731 81.4442 1 87.1649 1H155.75H216.833C223.991 1 228.285 8.95097 224.359 14.9362L177.535 86.3238C174.393 91.1143 169.049 94 163.32 94H133.417C130.233 94 128.326 90.4625 130.074 87.8027L157.47 46.1296C159.21 43.4836 157.331 39.9616 154.165 39.9324L60.3381 39.0676C57.1712 39.0384 55.2926 35.5152 57.0333 32.8693Z"
          fill={`url(#shimmer-${gradientId})`}
        />
      </svg>
    )
  }

  if (variant === "inline") {
    return (
      <div className={cn("inline-flex items-center justify-center", className)} {...props}>
        <PlacetrixShimmerLogo className={logoDimensions} />
      </div>
    )
  }

  return (
    <div
      className={cn(
        variant === "full-screen"
          ? "fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-md"
          : "flex flex-col items-center justify-center flex-1 w-full min-h-[400px] md:min-h-[500px] animate-in fade-in duration-500",
        className
      )}
      {...props}
    >
      <PlacetrixShimmerLogo className={cn(logoDimensions, "animate-pulse")} />
    </div>
  )
}
