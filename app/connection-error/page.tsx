"use client";

import React from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { useTheme } from "next-themes";
import {
  ArrowRightIcon,
  GithubIcon,
  InstagramIcon,
  LinkedinIcon,
  MailIcon,
  MenuIcon,
  MoonIcon,
  SunIcon,
  XIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";
import PlaceTrixLogo from "@/assets/placetrix.svg";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { UserProfile } from "@/lib/supabase/profile";
import { getUserProfileAction } from "@/lib/supabase/profile";
import { buildStorageUrl } from "@/lib/storage";

const Galaxy = dynamic(() => import("@/components/Galaxy"), {
  ssr: false,
  loading: () => (
    <div className="absolute inset-0 bg-transparent" aria-hidden="true" />
  ),
});

const CONTENT = "mx-auto w-full max-w-6xl px-4 md:px-6";
const SECTION_Y = "py-14 md:py-20";

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

  return (
    <Button
      aria-label="Toggle theme"
      onClick={handleToggle}
      size="icon"
      variant="outline"
      className={cn("size-8 text-foreground [&_svg]:size-4.5", NAV_BUTTON)}
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
    return user.full_name
      ? user.full_name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
      : user.email[0].toUpperCase();
  }, [user.full_name, user.email]);

  const avatarUrl = React.useMemo(() => {
    return buildStorageUrl("avatars", user.avatar_path);
  }, [user.avatar_path]);

  return (
    <Avatar className={cn(AVATAR_SHELL, className)}>
      <AvatarImage
        src={avatarUrl ?? undefined}
        alt={user.full_name || user.email}
        className="object-cover"
      />
      <AvatarFallback className="text-xs font-medium">
        {initials}
      </AvatarFallback>
    </Avatar>
  );
}

function AuthButtons({ size }: { size: "sm" | "default" }) {
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
                    href="/home"
                    onClick={closeMenu}
                    className="mb-3 flex items-center gap-3 rounded-xl border border-black/10 bg-black/[0.03] p-3 dark:border-white/10 dark:bg-white/[0.04]"
                  >
                    <UserAvatar user={user} className="size-10" />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-zinc-900 dark:text-white">
                        {user.full_name || "Your account"}
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
                    href="/our-team#team"
                    onClick={closeMenu}
                    className="flex h-11 items-center justify-between rounded-xl px-3 text-sm font-medium text-zinc-800 hover:bg-black/[0.04] dark:text-zinc-100 dark:hover:bg-white/[0.06]"
                  >
                    <span>Our Team</span>
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
            <Link href="/" className="flex items-center gap-2 font-bold tracking-[0.05em]">
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

function HeaderShell({
  initialUser = null,
}: {
  initialUser?: UserProfile | null;
}) {
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
      typeof document !== "undefined" &&
      (document.cookie.includes("auth-token") || document.cookie.includes("sb-"));

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

function ConnectionErrorHeroSection() {
  return (
    <section
      className={cn(
        "scroll-mt-24 bg-white text-zinc-950 dark:bg-black dark:text-white md:scroll-mt-20",
        "pt-24 md:pt-28"
      )}
    >
      <div className={CONTENT}>
        <div className="mx-auto max-w-3xl text-center">
          <p className="mb-2 text-xs font-medium uppercase tracking-widest text-red-500 dark:text-red-400">
            Service Disruption
          </p>
          <h1 className="font-cirka text-balance text-3xl font-semibold tracking-tight md:text-5xl">
            Temporarily unavailable.
          </h1>
          <p className="mt-3 text-sm leading-7 text-stone-600 dark:text-stone-300 md:text-base md:leading-8">
            PlaceTrix is currently experiencing difficulty communicating with our database servers.
            We are working to re-establish the connection. Thank you for your patience.
          </p>
        </div>
      </div>
    </section>
  );
}

function ConnectionErrorBodySection() {
  const items = [
    {
      id: "whats-happening",
      title: "What's happening?",
      paragraphs: [
        "We are unable to establish a secure connection to our core database services. This is not scheduled maintenance, but an unexpected network disruption or service outage from our hosting providers.",
        "During this time, user profiles, test configurations, and active dashboards cannot load properly. Our operations team has been notified automatically and is already investigating the root cause.",
      ],
    },
    {
      id: "is-data-safe",
      title: "Is my progress safe?",
      paragraphs: [
        "Absolutely. All your mock test results, progress indicators, saved questions, and profile information are safely stored in our persistent database. None of your data is affected or lost.",
        "Since the database is currently unreachable, no changes are being written or read, ensuring total data integrity. Everything will be exactly as you left it once the system comes back online.",
      ],
    },
    {
      id: "what-should-i-do",
      title: "What should I do?",
      paragraphs: [
        "You do not need to do anything. We recommend waiting a few minutes and then refreshing the page in your browser.",
        "Most database connection disruptions are short-lived and are resolved within minutes. If you are in the middle of an critical session, your local progress will sync back as soon as the service recovers.",
      ],
    },
    {
      id: "stay-updated",
      title: "How can I stay updated?",
      paragraphs: [
        "We post updates to our status channels as issues are resolved. You can also reach out to our support team at 360viewtech@gmail.com for assistance or questions.",
        "We strive for maximum transparency and will make sure our services are fully operational as quickly as possible.",
      ],
    },
  ];

  return (
    <section
      className={cn(
        "bg-white text-zinc-950 dark:bg-black dark:text-white",
        SECTION_Y
      )}
    >
      <div className={CONTENT}>
        <article className="rounded-3xl border border-black/10 bg-white/95 p-6 backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.03] md:p-8 lg:p-10">
          <div className="mb-8 flex flex-wrap gap-2">
            {items.map((item) => (
              <a
                key={item.id}
                href={`#${item.id}`}
                className="rounded-full border border-black/10 bg-black/[0.03] px-3 py-1 text-xs font-medium text-zinc-600 transition-colors hover:bg-black/[0.06] dark:border-white/10 dark:bg-white/[0.05] dark:text-zinc-300 dark:hover:bg-white/[0.09]"
              >
                {item.title}
              </a>
            ))}
          </div>

          <div className="space-y-10">
            {items.map((item, index) => (
              <React.Fragment key={item.id}>
                {index !== 0 && (
                  <div className="h-px w-full bg-black/[0.06] dark:bg-white/[0.07]" />
                )}
                <div id={item.id} className="scroll-mt-28">
                  <h2 className="font-cirka text-balance text-2xl font-semibold tracking-tight md:text-3xl">
                    {item.title}
                  </h2>
                  <div className="mt-4 space-y-3 text-sm leading-7 text-stone-600 dark:text-stone-300 md:text-base md:leading-8">
                    {item.paragraphs.map((paragraph, i) => (
                      <p key={`${item.id}-${i}`}>{paragraph}</p>
                    ))}
                  </div>
                </div>
              </React.Fragment>
            ))}
          </div>
        </article>
      </div>
    </section>
  );
}

function CTASection() {
  const { resolvedTheme } = useTheme();
  const mounted = useMounted();
  const showGalaxy = mounted && resolvedTheme === "dark";

  return (
    <section className="w-full bg-white pb-14 text-zinc-950 dark:bg-black dark:text-white md:pb-20">
      <div className={CONTENT}>
        <div className="relative overflow-hidden rounded-2xl border border-zinc-300/80 px-6 py-12 text-center dark:border-white/10 dark:bg-white/[0.02] md:px-10 md:py-14">
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

          <div className="relative z-20 mx-auto max-w-2xl">
            <p className="mb-2 text-xs font-medium uppercase tracking-widest text-zinc-500 dark:text-zinc-400">
              Need help?
            </p>
            <h2 className="font-cirka text-balance text-3xl font-semibold tracking-tight md:text-5xl">
              Still unable to connect?
            </h2>
            <p className="mx-auto mt-3 text-sm leading-7 text-stone-600 dark:text-stone-300 md:text-base md:leading-8">
              If the database connection takes longer than expected or if you have urgent questions,
              feel free to contact our support team.
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <Button size="lg" className="rounded-full font-medium" asChild>
                <a href="mailto:360viewtech@gmail.com">
                  <MailIcon className="mr-2 size-4" />
                  Email Support
                </a>
              </Button>
              <Button
                size="lg"
                variant="outline"
                className={cn("rounded-full", NAV_BUTTON)}
                asChild
              >
                <Link href="/help-center">Help Center</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

const company = [
  { title: "Our Team", href: "/our-team" },
  { title: "Privacy Policy", href: "/privacy-policy" },
  { title: "Terms of Service", href: "/terms-of-service" },
];

const resources = [
  { title: "Pricing", href: "/pricing" },
  { title: "Help Center", href: "/help-center" },
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
            <Link className="font-bold text-zinc-950 dark:text-white" href="/">
              PlaceTrix
            </Link>
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
                  <a href={item.link} target="_blank" rel="noopener noreferrer">
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
            &copy; {new Date().getFullYear()},{" "}
            <a
              href="https://4grid.tech"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:underline font-medium"
            >
              4 Grid Technologies
            </a>
            . All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}

export default function ConnectionErrorPage() {
  return (
    <div
      suppressHydrationWarning
      className="relative flex min-h-screen flex-col overflow-hidden bg-white text-zinc-950 supports-[overflow:clip]:overflow-clip dark:bg-black dark:text-white"
    >
      <HeaderShell />
      <main className="flex flex-col">
        <ConnectionErrorHeroSection />
        <ConnectionErrorBodySection />
        <CTASection />
      </main>
      <Footer />
    </div>
  );
}

