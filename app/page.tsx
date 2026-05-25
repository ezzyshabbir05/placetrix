"use client";

import React from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { useTheme } from "next-themes";
import {
  ArrowRightIcon,
  ClipboardCheck,
  BellRing,
  Briefcase,
  BarChart3,
  MenuIcon,
  MoonIcon,
  SunIcon,
  XIcon,
  GithubIcon,
  InstagramIcon,
  LinkedinIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";
import TextType from "@/components/TextType";
import PlaceTrixLogo from "@/assets/placetrix.svg";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cirka } from "@/app/fonts";
import type { UserProfile } from "@/lib/supabase/profile";
import { getUserProfileAction } from "@/lib/supabase/profile";
import { buildStorageUrl } from "@/lib/storage";
import BorderGlow from "@/components/BorderGlow";

const Galaxy = dynamic(() => import("@/components/Galaxy"), {
  ssr: false,
  loading: () => (
    <div className="absolute inset-0 bg-transparent" aria-hidden="true" />
  ),
});

const CONTENT = "mx-auto w-full max-w-6xl px-4 md:px-6";
const SECTION_Y = "py-16 md:py-24";

const NAV_SHELL =
  "border border-black/10 bg-white/30 backdrop-blur-xl dark:border-white/10 dark:bg-black/30";

const NAV_BUTTON =
  "border-black/10 bg-white/70 text-zinc-900 hover:bg-black/5 dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10";

const AVATAR_SHELL =
  "size-8 shrink-0 border border-black/10 bg-white/70 dark:border-white/10 dark:bg-white/5";

function useMounted() {
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  return mounted;
}

function useScrolled(threshold = 10) {
  const [scrolled, setScrolled] = React.useState(false);

  React.useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > threshold);
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", onScroll);
    };
  }, [threshold]);

  return scrolled;
}

function Logo() {
  return (
    <div className="flex shrink-0 items-center justify-center">
      <Image
        src={PlaceTrixLogo}
        alt="PlaceTrix"
        width={24}
        height={24}
        className="size-6 dark:invert"
        priority
      />
    </div>
  );
}

function ThemeToggle() {
  const { setTheme, resolvedTheme } = useTheme();

  const handleToggle = React.useCallback(() => {
    setTheme(resolvedTheme === "dark" ? "light" : "dark");
  }, [resolvedTheme, setTheme]);

  const toggleClassName = cn(
    "size-8 text-foreground [&_svg]:size-4.5",
    NAV_BUTTON
  );

  return (
    <Button
      aria-label="Toggle theme"
      onClick={handleToggle}
      size="icon"
      variant="outline"
      className={toggleClassName}
    >
      <SunIcon className="dark:hidden" />
      <MoonIcon className="hidden dark:block" />
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
}

function UserAvatar({
  user,
  className,
}: {
  user: UserProfile;
  className?: string;
}) {
  const initials = React.useMemo(() => {
    return user.display_name
      ? user.display_name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
      : user.email[0].toUpperCase();
  }, [user.display_name, user.email]);

  const avatarUrl = React.useMemo(() => {
    return buildStorageUrl("avatars", user.avatar_path);
  }, [user.avatar_path]);

  return (
    <Avatar className={cn(AVATAR_SHELL, className)}>
      <AvatarImage
        src={avatarUrl ?? undefined}
        alt={user.display_name || user.email}
        className="object-cover"
      />
      <AvatarFallback className="text-xs font-medium">
        {initials}
      </AvatarFallback>
    </Avatar>
  );
}

function AuthButtons({
  size,
}: {
  size: "sm" | "default";
}) {
  return (
    <>
      <Button size={size} variant="outline" className={NAV_BUTTON} asChild>
        <Link href="/auth/login">Sign In</Link>
      </Button>
      <Button size={size} asChild>
        <Link href="/auth/sign-up">Get Started</Link>
      </Button>
    </>
  );
}

function MobileNav({
  user,
  isLoading,
}: {
  user: UserProfile | null;
  isLoading?: boolean;
}) {
  const [open, setOpen] = React.useState(false);

  const toggleMenu = React.useCallback(() => {
    setOpen((prev) => !prev);
  }, []);

  const closeMenu = React.useCallback(() => {
    setOpen(false);
  }, []);

  React.useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeMenu();
    };

    if (open) {
      document.addEventListener("keydown", onKeyDown);
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [open, closeMenu]);

  return (
    <div className="relative md:hidden">
      <Button
        aria-controls="mobile-menu"
        aria-expanded={open}
        aria-label="Toggle menu"
        className={cn(NAV_BUTTON)}
        onClick={toggleMenu}
        size="icon"
        variant="outline"
      >
        {open ? <XIcon className="size-4.5" /> : <MenuIcon className="size-4.5" />}
      </Button>

      {open && (
        <>
          <button
            aria-label="Close menu"
            className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[2px]"
            onClick={closeMenu}
          />

          <div className="fixed inset-x-0 top-[calc(env(safe-area-inset-top)+4.25rem)] z-50 px-3">
            <div className="mx-auto w-full max-w-sm">
              <div
                id="mobile-menu"
                className={cn(
                  "overflow-hidden rounded-2xl border p-3 shadow-xl",
                  "border-black/10 bg-white/95 backdrop-blur-xl",
                  "dark:border-white/10 dark:bg-neutral-950/95",
                  "animate-in fade-in slide-in-from-top-2 zoom-in-95 duration-200"
                )}
              >
                <div className="mb-3 flex items-center justify-between px-1">
                  <span className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                    Menu
                  </span>
                  <ThemeToggle />
                </div>

                {isLoading ? (
                  <div className="mb-3 flex items-center gap-3 rounded-xl border border-black/10 bg-black/[0.03] p-3 dark:border-white/10 dark:bg-white/[0.04]">
                    <div className="size-10 animate-pulse rounded-full bg-black/10 dark:bg-white/10" />
                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="h-4 w-24 animate-pulse rounded bg-black/10 dark:bg-white/10" />
                      <div className="h-3 w-32 animate-pulse rounded bg-black/10 dark:bg-white/10" />
                    </div>
                  </div>
                ) : user ? (
                  <Link
                    href="/dashboard"
                    onClick={closeMenu}
                    className="mb-3 flex items-center gap-3 rounded-xl border border-black/10 bg-black/[0.03] p-3 dark:border-white/10 dark:bg-white/[0.04]"
                  >
                    <UserAvatar user={user} className="size-10" />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-zinc-900 dark:text-white">
                        {user.display_name || "Your account"}
                      </p>
                      <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">
                        {user.email}
                      </p>
                    </div>
                  </Link>
                ) : (
                  <div className="mb-3 grid grid-cols-2 gap-2">
                    <Button variant="outline" className={cn("w-full", NAV_BUTTON)} asChild>
                      <Link href="/auth/login" onClick={closeMenu}>
                        Sign In
                      </Link>
                    </Button>
                    <Button className="w-full" asChild>
                      <Link href="/auth/sign-up" onClick={closeMenu}>
                        Get Started
                      </Link>
                    </Button>
                  </div>
                )}

                <div className="space-y-1">
                  <a
                    href="/#features"
                    onClick={closeMenu}
                    className="flex h-11 items-center justify-between rounded-xl px-3 text-sm font-medium text-zinc-800 hover:bg-black/[0.04] dark:text-zinc-100 dark:hover:bg-white/[0.06]"
                  >
                    <span>Features</span>
                    <ArrowRightIcon className="size-4 opacity-60" />
                  </a>

                  <a
                    href="/#testimonials"
                    onClick={closeMenu}
                    className="flex h-11 items-center justify-between rounded-xl px-3 text-sm font-medium text-zinc-800 hover:bg-black/[0.04] dark:text-zinc-100 dark:hover:bg-white/[0.06]"
                  >
                    <span>Testimonials</span>
                    <ArrowRightIcon className="size-4 opacity-60" />
                  </a>

                  <Link
                    href="/help-center"
                    onClick={closeMenu}
                    className="flex h-11 items-center justify-between rounded-xl px-3 text-sm font-medium text-zinc-800 hover:bg-black/[0.04] dark:text-zinc-100 dark:hover:bg-white/[0.06]"
                  >
                    <span>Help Center</span>
                    <ArrowRightIcon className="size-4 opacity-60" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

interface HeaderVisualProps {
  user: UserProfile | null;
  isLoading?: boolean;
}

function HeaderVisual({ user, isLoading }: HeaderVisualProps) {
  const scrolled = useScrolled(10);

  return (
    <header className="fixed inset-x-0 top-0 z-50 w-full px-3 pt-[max(0.75rem,env(safe-area-inset-top))] md:px-4 md:pt-3">
      <div
        className={cn(
          "mx-auto w-full transition-all duration-300 ease-out",
          scrolled ? "max-w-5xl" : "max-w-6xl"
        )}
      >
        <div
          className={cn(
            "w-full transition-all duration-300 ease-out",
            scrolled
              ? cn("rounded-full", NAV_SHELL, "md:rounded-full")
              : "rounded-full border-none bg-transparent shadow-none backdrop-blur-none md:rounded-none md:border-none md:bg-transparent md:shadow-none md:backdrop-blur-none"
          )}
        >
          <nav
            className={cn(
              "flex w-full items-center justify-between px-4 transition-[height,padding] duration-300 ease-out",
              scrolled ? "h-14 md:h-12" : "h-14 md:h-14"
            )}
          >
            <Link
              href="/"
              className="flex items-center gap-2 font-bold tracking-[0.05em]"
            >
              <Logo />
              <span className="pl-1 text-lg font-bold tracking-wider text-zinc-950 dark:text-white">
                PlaceTrix
              </span>
            </Link>

            <div className="hidden items-center gap-2 md:flex">
              <ThemeToggle />
              {isLoading ? (
                <div className="size-8 animate-pulse rounded-full bg-black/10 dark:bg-white/10" />
              ) : user ? (
                <UserAvatar user={user} />
              ) : (
                <AuthButtons size="sm" />
              )}
            </div>

            <MobileNav user={user} isLoading={isLoading} />
          </nav>
        </div>
      </div>
    </header>
  );
}

interface HeaderShellProps {
  initialUser?: UserProfile | null;
}

function HeaderShell({
  initialUser = null,
}: HeaderShellProps) {
  const [user, setUser] = React.useState<UserProfile | null>(initialUser);
  const [isFetching, setIsFetching] = React.useState(false);
  const mounted = useMounted();

  React.useEffect(() => {
    let cancelled = false;

    if (initialUser) {
      setUser(initialUser);
      return;
    }

    const hasAuthCookie =
      typeof document !== "undefined" && (document.cookie.includes("auth-token") || document.cookie.includes("sb-"));

    if (!hasAuthCookie) return;

    setIsFetching(true);
    getUserProfileAction()
      .then((data) => {
        if (!cancelled && data) setUser(data);
      })
      .catch(() => { })
      .finally(() => {
        if (!cancelled) setIsFetching(false);
      });

    return () => {
      cancelled = true;
    };
  }, [initialUser]);

  const isLoading = !mounted || isFetching;

  return <HeaderVisual user={user} isLoading={isLoading} />;
}

function HeroSection() {
  return (
    <section className="relative isolate min-h-[100svh] w-full overflow-hidden bg-white pb-0 pt-16 text-zinc-950 dark:bg-black dark:text-white md:-mt-14 md:min-h-[calc(100dvh+3.5rem)] md:pt-28 lg:pt-32">
      <div
        aria-hidden="true"
        className={cn(
          "absolute inset-0 -z-10 overflow-hidden",
          "[mask-image:linear-gradient(to_bottom,black_0%,black_72%,black_84%,transparent_100%)]",
          "[-webkit-mask-image:linear-gradient(to_bottom,black_0%,black_72%,black_84%,transparent_100%)]"
        )}
      >
        <div
          className={cn(
            "absolute inset-0",
            "bg-[radial-gradient(1200px_640px_at_50%_8%,rgba(16,185,129,0.12),transparent_62%)]",
            "dark:bg-[radial-gradient(1200px_640px_at_50%_8%,rgba(52,211,153,0.15),transparent_62%)]"
          )}
        />

        <div
          className={cn(
            "absolute inset-0",
            "bg-[radial-gradient(900px_520px_at_18%_18%,rgba(255,255,255,0.95),transparent_54%)]",
            "dark:bg-[radial-gradient(900px_520px_at_18%_18%,rgba(255,255,255,0.05),transparent_54%)]"
          )}
        />

        <div
          className={cn(
            "absolute inset-0",
            "bg-[radial-gradient(820px_420px_at_50%_100%,rgba(0,0,0,0.05),transparent_62%)]",
            "dark:bg-[radial-gradient(820px_420px_at_50%_100%,rgba(255,255,255,0.07),transparent_62%)]"
          )}
        />

        <div
          className={cn(
            "absolute inset-0 opacity-[0.55] dark:opacity-[0.3]",
            "[background-image:linear-gradient(to_right,rgba(24,24,27,0.10)_1px,transparent_1px),linear-gradient(to_bottom,rgba(24,24,27,0.10)_1px,transparent_1px)]",
            "dark:[background-image:linear-gradient(to_right,rgba(255,255,255,0.12)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.12)_1px,transparent_1px)]",
            "[background-size:34px_34px]",
            "[mask-image:radial-gradient(ellipse_at_center,black_58%,rgba(0,0,0,0.82)_74%,transparent_100%)]",
            "[-webkit-mask-image:radial-gradient(ellipse_at_center,black_58%,rgba(0,0,0,0.82)_74%,transparent_100%)]"
          )}
        />

        <div
          className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05] mix-blend-overlay"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160' viewBox='0 0 160 160'%3E%3Cg fill='none'%3E%3Cg fill='currentColor' fill-opacity='1'%3E%3Ccircle cx='12' cy='14' r='1'/%3E%3Ccircle cx='56' cy='44' r='1'/%3E%3Ccircle cx='102' cy='22' r='1'/%3E%3Ccircle cx='138' cy='68' r='1'/%3E%3Ccircle cx='24' cy='110' r='1'/%3E%3Ccircle cx='84' cy='92' r='1'/%3E%3Ccircle cx='126' cy='128' r='1'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")",
          }}
        />

        <div
          className={cn(
            "absolute inset-x-0 bottom-0 h-32 md:h-40",
            "bg-gradient-to-b from-transparent via-white/75 to-white",
            "dark:from-transparent dark:via-black/75 dark:to-black"
          )}
        />
      </div>

      <div className="relative z-10">
        <div className={CONTENT}>
          <div className="flex min-h-[calc(100svh-3.5rem)] items-center justify-center">
            <div className="mx-auto flex max-w-3xl flex-col items-center justify-center gap-6 pb-24 pt-6 text-center md:pb-32 md:pt-12">
              <a
                href="#features"
                className={cn(
                  "flex w-fit items-center gap-2 rounded-full border border-zinc-200 bg-white/75 px-3 py-1.5 text-zinc-900 shadow-sm backdrop-blur-md transition-all",
                  "dark:border-white/10 dark:bg-white/5 dark:text-white",
                  "fade-in animate-in fill-mode-backwards delay-500 duration-500 ease-out"
                )}
              >
                <span
                  className="size-1.5 rounded-full bg-emerald-500"
                  aria-hidden="true"
                />
                <span className="text-xs font-medium text-zinc-800 dark:text-white/80">
                  <TextType
                    text={["1,000+ mock tests attempted", "500+ active users"]}
                    typingSpeed={15}
                    pauseDuration={1500}
                    showCursor
                    cursorCharacter="|"
                    deletingSpeed={45}
                    cursorBlinkDuration={0.7}
                  />
                </span>
              </a>

              <h1
                className={cn(
                  cirka.className,
                  "text-balance text-5xl font-extrabold leading-[1.06] tracking-tight md:text-7xl lg:text-8xl"
                )}
              >
                <span className="text-zinc-950 dark:text-white">
                  The Gap Between You and Your Goal?
                </span>{" "}
                <span
                  className="glitch-text tracking-wider italic text-emerald-700 dark:text-emerald-300"
                  data-text={"Let's Close It."}
                >
                  Let&apos;s Close It.
                </span>
              </h1>

              <p className="max-w-xl text-sm leading-7 text-zinc-700 dark:text-zinc-300 md:text-base md:leading-8">
                Placetrix gives students the tools to practise smarter, track
                progress, and stay ahead of every campus drive, all in one place.
              </p>

              <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
                <Button size="lg" className="rounded-full font-medium shadow-sm" asChild>
                  <Link href="/auth/sign-up">
                    Get Started
                    <ArrowRightIcon data-icon="inline-end" />
                  </Link>
                </Button>

                <Button
                  size="lg"
                  variant="outline"
                  className="rounded-full border-zinc-200 bg-white/75 text-zinc-900 backdrop-blur-md dark:border-white/10 dark:bg-white/5 dark:text-white"
                  asChild
                >
                  <Link href="#features">Explore Features</Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

type Feature = {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
};

const features: Feature[] = [
  {
    title: "Precision Practice",
    icon: ClipboardCheck,
    description:
      "Access mock tests designed to mimic real-world aptitude and technical rounds.",
  },
  {
    title: "Real-time Drive Updates",
    icon: BellRing,
    description:
      "Stay ahead with instant notifications on campus drives, eligibility criteria, and deadlines.",
  },
  {
    title: "Career Gateway",
    icon: Briefcase,
    description:
      "Discover opportunities and job openings curated specifically for freshers and graduating students.",
  },
  {
    title: "Progress Insights",
    icon: BarChart3,
    description:
      "Detailed analytics across subjects help you identify and close skill gaps before interview day.",
  },
];

function FeatureCard({
  feature,
  glowEnabled,
}: {
  feature: Feature;
  glowEnabled: boolean;
}) {
  return (
    <BorderGlow
      className="group h-full rounded-3xl"
      glowColor="40 85% 62%"
      backgroundColor="transparent"
      borderRadius={24}
      glowRadius={glowEnabled ? 14 : 0}
      glowIntensity={glowEnabled ? 1 : 0}
      fillOpacity={glowEnabled ? 0.08 : 0}
      coneSpread={glowEnabled ? 14 : 0}
    >
      <article className="h-full rounded-3xl bg-white/95 p-6 backdrop-blur-sm transition-all duration-300 dark:bg-white/[0.03]">
        <div className="flex h-full flex-col">
          <div className="flex-1">
            <h3 className="text-[15px] font-semibold tracking-[-0.01em] text-zinc-900 dark:text-white md:text-base">
              {feature.title}
            </h3>
            <p className="max-w-[48ch] pt-3 text-[15px] leading-7 font-medium tracking-[-0.01em] text-stone-600 dark:text-stone-300 md:text-base">
              {feature.description}
            </p>
          </div>
        </div>
      </article>
    </BorderGlow>
  );
}

function FeaturesSection() {
  const { resolvedTheme } = useTheme();
  const mounted = useMounted();
  const glowEnabled = mounted && resolvedTheme === "dark";

  return (
    <section
      id="features"
      className={cn(
        "scroll-mt-24 w-full bg-white text-zinc-950 dark:bg-black dark:text-white md:scroll-mt-20",
        SECTION_Y
      )}
    >
      <div className={CONTENT}>
        <div className="mx-auto max-w-6xl text-center">
          <p className="mb-3 text-xs font-medium uppercase tracking-widest text-zinc-500 dark:text-zinc-400">
            What you get
          </p>
          <h2
            className={cn(
              cirka.className,
              "text-balance text-4xl font-semibold tracking-tight md:text-7xl"
            )}
          >
            Train. Track. Triumph.
          </h2>
          <p className="mt-3 text-balance text-sm text-stone-600 dark:text-stone-300 md:text-base">
            Everything you need to practise, prepare, and get placed.
          </p>
        </div>

        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4">
          {features.map((feature) => (
            <FeatureCard
              key={feature.title}
              feature={feature}
              glowEnabled={glowEnabled}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

type Testimonial = {
  name: string;
  role: string;
  image: string;
  company?: string;
  quote: string;
};

const testimonials: Testimonial[] = [
  {
    quote:
      "Placetrix's structured aptitude and technical tests were vital to my prep. Consistent practice boosted my confidence and helped me clear the Infosys aptitude round.",
    image: "https://supabase.placetrix.app/storage/v1/object/public/landing-page-material/testimonials/pranjal.png",
    name: "Pranjal Haral",
    role: "Software Engineer",
    company: "Infosys",
  },
  {
    quote:
      "Regular practice with Placetrix improved my fundamentals and helped me crack the Infosys aptitude round. I recommend it to all aspirants.",
    image: "https://supabase.placetrix.app/storage/v1/object/public/landing-page-material/testimonials/janhavi.png",
    name: "Janhavi Patil",
    role: "Software Engineer",
    company: "Infosys",
  },
  {
    quote:
      "The app's quizzes and mock tests significantly improved my speed and accuracy, leaving me well-prepared for the placement process. Truly thankful!",
    image: "https://supabase.placetrix.app/storage/v1/object/public/landing-page-material/testimonials/pinal.png",
    name: "Pinal Lagdhir",
    role: "Software Engineer",
    company: "Infosys",
  },
  {
    quote:
      "Placetrix helped me approach placements in a structured way. The consistent practice strengthened my problem-solving skills and boosted my confidence.",
    image: "https://supabase.placetrix.app/storage/v1/object/public/landing-page-material/testimonials/chaitali.png",
    name: "Chaitali Bonde",
    role: "Software Engineer",
    company: "Infosys",
  },
];

function TestimonialCard({
  testimonial,
  glowEnabled,
}: {
  testimonial: Testimonial;
  glowEnabled: boolean;
}) {
  const { quote, company, image, name, role } = testimonial;

  return (
    <BorderGlow
      className="group h-full rounded-3xl"
      glowColor="0 85% 62%"
      backgroundColor="transparent"
      borderRadius={24}
      glowRadius={glowEnabled ? 14 : 0}
      glowIntensity={glowEnabled ? 1.5 : 0}
      fillOpacity={glowEnabled ? 0.08 : 0}
      coneSpread={glowEnabled ? 14 : 0}
    >
      <figure className="h-full rounded-3xl bg-white/95 p-6 backdrop-blur-sm transition-all duration-300 dark:bg-white/[0.03] md:p-7">
        <div className="flex h-full flex-col">
          <blockquote className="flex-1">
            <p className="max-w-[48ch] text-[15px] leading-7 font-medium tracking-[-0.01em] text-stone-700 dark:text-stone-300 md:text-base">
              {quote}
            </p>
          </blockquote>

          <figcaption className="flex items-center gap-3 pt-8">
            <Avatar className="size-11 rounded-full ring-1 ring-black/10 dark:ring-white/10">
              <AvatarImage
                alt={`${name}'s profile picture`}
                src={image}
                className="object-cover"
              />
              <AvatarFallback className="text-xs font-medium">
                {name.charAt(0)}
              </AvatarFallback>
            </Avatar>

            <div className="min-w-0">
              <cite className="block truncate text-sm font-semibold not-italic text-zinc-900 dark:text-white">
                {name}
              </cite>
              <p className="truncate text-xs font-medium text-zinc-500 dark:text-zinc-400">
                {role}
                {company ? `, ${company}` : ""}
              </p>
            </div>
          </figcaption>
        </div>
      </figure>
    </BorderGlow>
  );
}

function TestimonialsSection() {
  const { resolvedTheme } = useTheme();
  const mounted = useMounted();
  const glowEnabled = mounted && resolvedTheme === "dark";

  return (
    <section
      id="testimonials"
      className={cn(
        "w-full bg-white text-zinc-950 dark:bg-black dark:text-white",
        SECTION_Y
      )}
    >
      <div className={CONTENT}>
        <div className="mx-auto max-w-6xl text-center">
          <p className="mb-3 text-xs font-medium uppercase tracking-widest text-zinc-500 dark:text-zinc-400">
            Testimonials
          </p>
          <h2
            className={cn(
              cirka.className,
              "text-balance text-4xl font-semibold tracking-tight md:text-7xl"
            )}
          >
            Real students, real results
          </h2>
          <p className="mt-3 text-sm text-stone-600 dark:text-stone-300 md:text-base">
            Trusted by students and educators across India to prepare with confidence.
          </p>
        </div>

        <div className="mt-12 grid gap-5 md:grid-cols-2">
          {testimonials.map((testimonial) => (
            <TestimonialCard
              key={`${testimonial.name}-${testimonial.company ?? ""}`}
              testimonial={testimonial}
              glowEnabled={glowEnabled}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

function CTASection() {
  const { resolvedTheme } = useTheme();
  const mounted = useMounted();

  const showGalaxy = mounted && resolvedTheme === "dark";

  return (
    <section className="w-full bg-white pb-16 text-zinc-950 dark:bg-black dark:text-white md:pb-24">
      <div className={CONTENT}>
        <div className="relative overflow-hidden rounded-2xl border border-zinc-300/80 px-8 py-16 text-center dark:border-white/10 dark:bg-white/[0.02] md:px-16 md:py-20">
          {showGalaxy && (
            <div className="absolute inset-0 z-0 hidden opacity-40 dark:opacity-70 lg:block">
              <Galaxy
                density={0.7}
                glowIntensity={0.2}
                saturation={0}
                hueShift={140}
                mouseInteraction={false}
                twinkleIntensity={0}
                rotationSpeed={0.02}
                autoCenterRepulsion={0}
                starSpeed={0.2}
                speed={0.5}
              />
            </div>
          )}

          <div className="pointer-events-none absolute inset-0 z-10 bg-white/70 dark:bg-black/45" />

          <div className="relative z-20">
            <p className="mb-3 text-xs font-medium uppercase tracking-widest text-zinc-500 dark:text-zinc-400">
              Get started today
            </p>
            <h2
              className={cn(
                cirka.className,
                "text-balance text-4xl font-semibold tracking-tight sm:text-5xl md:text-6xl"
              )}
            >
              Your placement journey starts here.
            </h2>
            <p className="mx-auto mt-4 max-w-md text-sm text-stone-600 dark:text-stone-300 md:text-base">
              Join hundreds of students who have already cracked their dream
              placements using Placetrix.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Button size="lg" className="rounded-full font-medium" asChild>
                <Link href="/auth/sign-up">Get Started</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

const company = [
  {
    title: "Our Team",
    href: "/our-team",
  },
  {
    title: "Privacy Policy",
    href: "/privacy-policy",
  },
  {
    title: "Terms of Service",
    href: "/terms-of-service",
  },
];

const resources = [
  {
    title: "Pricing",
    href: "/pricing",
  },
  {
    title: "Help Center",
    href: "/help-center",
  },
];

const socialLinks = [
  {
    icon: <LinkedinIcon />,
    link: "https://www.linkedin.com/company/360-view-tech/",
  },
  {
    icon: <InstagramIcon />,
    link: "https://www.instagram.com/360viewtech/",
  },
  {
    icon: <GithubIcon />,
    link: "https://github.com/360viewtech",
  },
];

function Footer() {
  return (
    <footer className="relative">
      <div className="mx-auto max-w-6xl">
        <div className="grid max-w-6xl grid-cols-6 gap-6 p-4">
          <div className="col-span-6 flex flex-col gap-4 pt-5 md:col-span-4">
            <a className="font-bold text-zinc-950 dark:text-white" href="#">
              PlaceTrix
            </a>
            <p className="max-w-sm text-balance text-sm text-zinc-500 dark:text-zinc-400">
              Train. Track. Triumph.
            </p>
            <div className="flex gap-2">
              {socialLinks.map((item, index) => (
                <Button
                  asChild
                  key={`social-${item.link}-${index}`}
                  size="icon-sm"
                  variant="outline"
                >
                  <a
                    href={item.link}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {item.icon}
                  </a>
                </Button>
              ))}
            </div>
          </div>

          <div className="col-span-3 w-full md:col-span-1">
            <span className="text-xs text-zinc-500 dark:text-zinc-400">Resources</span>
            <div className="mt-2 flex flex-col gap-2">
              {resources.map(({ href, title }) => (
                <a
                  className="w-max text-sm text-zinc-700 hover:underline dark:text-zinc-300"
                  href={href}
                  key={title}
                >
                  {title}
                </a>
              ))}
            </div>
          </div>

          <div className="col-span-3 w-full md:col-span-1">
            <span className="text-xs text-zinc-500 dark:text-zinc-400">Company</span>
            <div className="mt-2 flex flex-col gap-2">
              {company.map(({ href, title }) => (
                <a
                  className="w-max text-sm text-zinc-700 hover:underline dark:text-zinc-300"
                  href={href}
                  key={title}
                >
                  {title}
                </a>
              ))}
            </div>
          </div>
        </div>

        <div className="absolute inset-x-0 h-px w-full bg-border" />
        <div className="flex flex-col justify-between gap-2 py-4">
          <p className="text-center text-sm font-light text-zinc-500 dark:text-zinc-400">
            &copy; {new Date().getFullYear()}, 360 View Tech, All rights reserved
          </p>
        </div>
      </div>
    </footer>
  );
}

export default function LandingPage() {
  return (
    <div
      suppressHydrationWarning
      className="select-none relative flex min-h-screen flex-col overflow-hidden bg-white text-zinc-950 supports-[overflow:clip]:overflow-clip dark:bg-black dark:text-white"
    >
      <HeaderShell />
      <main className="flex flex-col">
        <HeroSection />
        <FeaturesSection />
        <TestimonialsSection />
        <CTASection />
      </main>
      <Footer />
    </div>
  );
}