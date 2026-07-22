"use client";

import { Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import PlaceTrixLogo from "@/assets/placetrix.svg";

function FloatingPaths({ position }: { position: number }) {
  const paths = Array.from({ length: 36 }, (_, i) => ({
    id: i,
    d: `M-${380 - i * 5 * position} -${189 + i * 6}C-${380 - i * 5 * position
      } -${189 + i * 6} -${312 - i * 5 * position} ${216 - i * 6} ${152 - i * 5 * position
      } ${343 - i * 6}C${616 - i * 5 * position} ${470 - i * 6} ${684 - i * 5 * position
      } ${875 - i * 6} ${684 - i * 5 * position} ${875 - i * 6}`,
    color: `rgba(15,23,42,${0.1 + i * 0.03})`,
    width: 0.5 + i * 0.03,
  }));

  return (
    <div className="pointer-events-none absolute inset-0">
      <svg
        className="h-full w-full text-primary"
        fill="none"
        viewBox="0 0 696 316"
      >
        <title>Background Paths</title>
        {paths.map((path) => (
          <motion.path
            animate={{
              pathLength: 1,
              opacity: [0.3, 0.6, 0.3],
              pathOffset: [0, 1, 0],
            }}
            d={path.d}
            initial={{ pathLength: 0.3, opacity: 0.6 }}
            key={path.id}
            stroke="currentColor"
            strokeOpacity={0.1 + path.id * 0.03}
            strokeWidth={path.width}
            transition={{
              duration: 20 + Math.random() * 10,
              repeat: Number.POSITIVE_INFINITY,
              ease: "linear",
            }}
          />
        ))}
      </svg>
    </div>
  );
}

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="relative md:h-screen md:overflow-hidden lg:grid lg:grid-cols-2">
      {/* ── Left decorative panel (desktop only) ── */}
      <div className="relative hidden h-full flex-col border-r bg-secondary p-10 lg:flex dark:bg-secondary/20">
        <div className="absolute inset-0 bg-linear-to-b from-transparent via-transparent to-background pointer-events-none" />
        <Link href="/" className="flex items-center gap-2 font-bold tracking-[0.05em]">
          <Image
            src={PlaceTrixLogo}
            alt="PlaceTrix"
            width={24}
            height={24}
            className="size-6 dark:invert"
            priority
          />
          <span className="pl-1 text-lg font-bold tracking-wider text-zinc-950 dark:text-white">
            PlaceTrix
          </span>
        </Link>
        <div className="z-10 mt-auto">
          <blockquote className="space-y-2">
            <p className="text-xl">
              &ldquo;The app's quizzes and mock tests significantly improved my speed and accuracy, leaving me well-prepared for the placement process. Truly thankful!&rdquo;
            </p>
            <footer className="font-mono font-semibold text-sm">
              ~ Pinal Lagdhir
            </footer>
          </blockquote>
        </div>
        <div className="absolute inset-0 pointer-events-none">
          <Suspense fallback={null}>
            <FloatingPaths position={1} />
            <FloatingPaths position={-1} />
          </Suspense>
        </div>
      </div>

      {/* ── Right content panel ── */}
      <div className="relative flex min-h-screen flex-col justify-center px-6 py-12 md:px-8">
        {/* Mobile Header Logo */}
        <div className="absolute top-6 left-6 lg:hidden">
          <Link href="/" className="flex items-center gap-2 font-bold tracking-[0.05em]">
            <Image
              src={PlaceTrixLogo}
              alt="PlaceTrix"
              width={24}
              height={24}
              className="size-6 dark:invert"
              priority
            />
            <span className="pl-1 text-base font-bold tracking-wider text-zinc-950 dark:text-white">
              PlaceTrix
            </span>
          </Link>
        </div>

        {/* Subtle radial glow */}
        <div
          aria-hidden
          className="absolute inset-0 isolate -z-10 opacity-60 contain-strict"
        >
          <div className="absolute top-0 right-0 h-320 w-140 -translate-y-87.5 rounded-full bg-[radial-gradient(68.54%_68.72%_at_55.02%_31.46%,--theme(--color-foreground/.06)_0,hsla(0,0%,55%,.02)_50%,--theme(--color-foreground/.01)_80%)]" />
          <div className="absolute top-0 right-0 h-320 w-60 rounded-full bg-[radial-gradient(50%_50%_at_50%_50%,--theme(--color-foreground/.04)_0,--theme(--color-foreground/.01)_80%,transparent_100%)] [translate:5%_-50%]" />
          <div className="absolute top-0 right-0 h-320 w-60 -translate-y-87.5 rounded-full bg-[radial-gradient(50%_50%_at_50%_50%,--theme(--color-foreground/.04)_0,--theme(--color-foreground/.01)_80%,transparent_100%)]" />
        </div>
        {children}
      </div>
    </main>
  );
}