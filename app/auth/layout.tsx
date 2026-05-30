// app/auth/layout.tsx
//
// Auth shell layout.
//
// Middleware (middleware.ts) already redirects authenticated users away from
// /auth/… routes, so this layout does NOT need to repeat that check.
// A second getUser() call here would be redundant and waste a round-trip.
//
// Exception routes that bypass the middleware redirect:
//   /auth/callback  — OAuth code exchange (must run even when authenticated)
//   /auth/confirm   — Link-based token verification (same reason)

import { Suspense } from "react";
import Image from "next/image";
import { FloatingPaths } from "@/components/ui/auth_page/floating-paths";
import Link from "next/link";
import PlaceTrixLogo from "@/assets/placetrix.svg";

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
              &ldquo;Placetrix helped me crack my dream company placement — the
              mock tests are incredibly accurate.&rdquo;
            </p>
            <footer className="font-mono font-semibold text-sm">
              ~ Priya Sharma
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
      <div className="relative flex min-h-screen flex-col justify-center px-8">
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