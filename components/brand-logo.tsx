import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import PlaceTrixLogo from "@/assets/placetrix.svg";
import { cn } from "@/lib/utils";

interface BrandLogoProps {
  href?: string;
  className?: string;
  size?: "sm" | "md" | "lg";
  priority?: boolean;
}

export function BrandLogo({
  href = "/",
  className,
  size = "md",
  priority = true,
}: BrandLogoProps) {
  const iconSize = size === "sm" ? 20 : size === "lg" ? 28 : 24;
  const textSize =
    size === "sm"
      ? "text-sm pl-1 font-bold tracking-wider"
      : size === "lg"
      ? "text-xl pl-1.5 font-bold tracking-wider"
      : "text-lg pl-1 font-bold tracking-wider";

  const content = (
    <div className={cn("flex items-center gap-2 font-bold tracking-wider", className)}>
      <Image
        src={PlaceTrixLogo}
        alt="PlaceTrix"
        width={iconSize}
        height={iconSize}
        className="size-auto dark:invert"
        style={{ width: iconSize, height: iconSize }}
        priority={priority}
        unoptimized
      />
      <span className={cn("text-zinc-950 dark:text-white", textSize)}>
        PlaceTrix
      </span>
    </div>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }

  return content;
}
