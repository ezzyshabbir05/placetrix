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

type TermsContentSection = {
  id: string;
  title: string;
  paragraphs: string[];
};

const TERMS_SECTIONS: TermsContentSection[] = [
  {
    id: "acceptance-of-terms",
    title: "Acceptance of Terms",
    paragraphs: [
      "By accessing or using PlaceTrix, you agree to these Terms and Conditions. If that sounds fair, great. If not, the platform should not be used until you are comfortable with the terms.",
      "These terms apply to visitors, registered users, students, institutions, and anyone else using PlaceTrix services through the website or related offerings.",
    ],
  },
  {
    id: "eligibility-and-account",
    title: "Eligibility & Accounts",
    paragraphs: [
      "You are responsible for making sure the information you provide during registration is accurate and up to date. Please do not impersonate someone else, create misleading accounts, or unleash chaos for sport.",
      "You are also responsible for maintaining the confidentiality of your account credentials and for activity that happens under your account unless caused by our own failure to protect it.",
    ],
  },
  {
    id: "platform-use",
    title: "Use of the Platform",
    paragraphs: [
      "PlaceTrix is provided to support learning, preparation, assessments, and related academic or placement workflows. You agree to use the platform in a lawful, respectful, and reasonable manner.",
      "You must not misuse the service by attempting unauthorised access, scraping restricted data, introducing malicious code, reverse engineering protected systems, disrupting other users, or using the platform in ways that break applicable law.",
      "In short: use the platform like a responsible human, not like a stress test with Wi-Fi.",
    ],
  },
  {
    id: "content-and-submissions",
    title: "Content & Submissions",
    paragraphs: [
      "If you upload, submit, or share content through PlaceTrix, you remain responsible for that content and must have the necessary rights to provide it.",
      "You must not submit content that is unlawful, harmful, defamatory, abusive, infringing, misleading, or otherwise inappropriate for an educational platform.",
      "We may remove or restrict content that violates these terms or creates risk for users, institutions, or the platform.",
    ],
  },
  {
    id: "intellectual-property",
    title: "Intellectual Property",
    paragraphs: [
      "PlaceTrix, including its branding, design, software, workflows, text, graphics, and platform content, is owned by 4 Grid Technologies or its licensors unless stated otherwise.",
      "You may not copy, modify, distribute, reproduce, resell, or exploit platform materials except as permitted by law or with prior written permission.",
      "Translation: you can use the platform, but you do not get to walk off with the furniture.",
    ],
  },
  {
    id: "availability-and-changes",
    title: "Availability & Changes",
    paragraphs: [
      "We work hard to keep PlaceTrix available, reliable, and useful, but we do not guarantee uninterrupted access at all times. Maintenance, updates, bugs, outages, and internet-related gremlins can happen.",
      "We may modify, suspend, improve, or discontinue parts of the platform from time to time, with or without notice where appropriate.",
    ],
  },
  {
    id: "payments-and-plans",
    title: "Payments & Plans",
    paragraphs: [
      "If PlaceTrix offers paid plans, premium features, subscriptions, or institution-based billing, the applicable pricing and billing terms will be presented at the point of purchase or agreement.",
      "You agree to pay any valid charges associated with the services you select. Unless stated otherwise, fees are non-refundable except where required by law or expressly promised by us.",
    ],
  },
  {
    id: "privacy",
    title: "Privacy",
    paragraphs: [
      "Your use of PlaceTrix is also subject to our Privacy Policy, which explains how we collect, use, and protect personal information.",
      "If there is ever a question about data handling, the Privacy Policy and these Terms should be read together like two slightly more organised roommates.",
    ],
  },
  {
    id: "disclaimers",
    title: "Disclaimers",
    paragraphs: [
      "PlaceTrix is provided on an 'as is' and 'as available' basis to the extent permitted by applicable law. We do not guarantee that the platform will always be error-free, uninterrupted, or perfectly suited to every user's exact expectations.",
      "We provide learning tools, preparation features, and platform functionality, but we do not guarantee exam outcomes, placement outcomes, grades, admissions, or career results. We help with preparation; we do not control the universe.",
    ],
  },
  {
    id: "limitation-of-liability",
    title: "Limitation of Liability",
    paragraphs: [
      "To the maximum extent permitted by law, 4 Grid Technologies and its affiliates, team members, partners, and service providers will not be liable for indirect, incidental, special, consequential, or punitive damages arising from your use of, or inability to use, PlaceTrix.",
      "This includes, where applicable, loss of data, loss of opportunity, loss of revenue, interruption of service, or other commercial or personal impacts not directly caused by wilful misconduct or legal obligations that cannot be excluded.",
    ],
  },
  {
    id: "termination",
    title: "Suspension & Termination",
    paragraphs: [
      "We may suspend, restrict, or terminate access to PlaceTrix if we reasonably believe a user has violated these terms, created security risks, misused the platform, or acted in a way that harms users or the service.",
      "You may stop using the platform at any time. Certain provisions, including intellectual property, disclaimers, limitation of liability, and other clauses that logically survive, will continue to apply after termination.",
    ],
  },
  {
    id: "governing-law",
    title: "Governing Law",
    paragraphs: [
      "These Terms and Conditions are governed by the applicable laws of India, unless a different legal framework is required by a specific agreement or mandatory law.",
      "Any disputes related to these terms will be subject to the jurisdiction of the appropriate courts, unless otherwise required by law.",
    ],
  },
  {
    id: "contact-us",
    title: "Contact Us",
    paragraphs: [
      "If you have questions about these Terms and Conditions, account use, platform rules, or anything else that sounds legal enough to deserve a proper answer, contact us at 360viewtech@gmail.com.",
    ],
  },
];

function renderParagraph(paragraph: string) {
  if (!paragraph.includes("360viewtech@gmail.com")) return paragraph;

  const parts = paragraph.split("360viewtech@gmail.com");

  return (
    <>
      {parts[0]}
      <a
        href="mailto:360viewtech@gmail.com"
        className="font-medium text-zinc-900 underline underline-offset-2 dark:text-white"
      >
        360viewtech@gmail.com
      </a>
      {parts[1]}
    </>
  );
}

function TermsHeroSection() {
  return (
    <section
      className={cn(
        "scroll-mt-24 bg-white text-zinc-950 dark:bg-black dark:text-white md:scroll-mt-20",
        "pt-24 md:pt-28"
      )}
    >
      <div className={CONTENT}>
        <div className="mx-auto max-w-3xl text-center">
          <p className="mb-2 text-xs font-medium uppercase tracking-widest text-zinc-500 dark:text-zinc-400">
            Terms & Conditions
          </p>
          <h1
            className="font-cirka text-balance text-3xl font-semibold tracking-tight md:text-5xl"
          >
            A few ground rules, minus the dramatic legal fog.
          </h1>
          <p className="mt-3 text-sm leading-7 text-stone-600 dark:text-stone-300 md:text-base md:leading-8">
            These terms explain how PlaceTrix can be used, what we expect from
            users, and what responsibilities sit with both sides. We kept it as
            clear as possible because nobody enjoys decoding legal wallpaper.
          </p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
            <span className="rounded-full border border-black/10 bg-black/[0.03] px-3 py-1.5 text-xs text-zinc-500 dark:border-white/10 dark:bg-white/[0.04] dark:text-zinc-400">
              Effective: May 24, 2026
            </span>
            <span className="rounded-full border border-black/10 bg-black/[0.03] px-3 py-1.5 text-xs text-zinc-500 dark:border-white/10 dark:bg-white/[0.04] dark:text-zinc-400">
              PlaceTrix
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}

function TermsBodySection() {
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
            {TERMS_SECTIONS.map((section) => (
              <a
                key={section.id}
                href={`#${section.id}`}
                className="rounded-full border border-black/10 bg-black/[0.03] px-3 py-1 text-xs font-medium text-zinc-600 transition-colors hover:bg-black/[0.06] dark:border-white/10 dark:bg-white/[0.05] dark:text-zinc-300 dark:hover:bg-white/[0.09]"
              >
                {section.title}
              </a>
            ))}
          </div>

          <div className="space-y-10">
            {TERMS_SECTIONS.map((section, index) => (
              <React.Fragment key={section.id}>
                {index !== 0 && (
                  <div className="h-px w-full bg-black/[0.06] dark:bg-white/[0.07]" />
                )}
                <div id={section.id} className="scroll-mt-28">
                  <h2
                    className="font-cirka text-balance text-2xl font-semibold tracking-tight md:text-3xl"
                  >
                    {section.title}
                  </h2>
                  <div className="mt-4 space-y-3 text-sm leading-7 text-stone-600 dark:text-stone-300 md:text-base md:leading-8">
                    {section.paragraphs.map((paragraph, i) => (
                      <p key={`${section.id}-${i}`}>{renderParagraph(paragraph)}</p>
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
            <h2
              className="font-cirka text-balance text-3xl font-semibold tracking-tight md:text-5xl"
            >
              Questions about the rules?
            </h2>
            <p className="mx-auto mt-3 text-sm leading-7 text-stone-600 dark:text-stone-300 md:text-base md:leading-8">
              Reach out for clarification on accounts, platform use, terms, or
              anything else covered here. We will keep it clear, helpful, and
              easy to understand.
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <Button size="lg" className="rounded-full font-medium" asChild>
                <a href="mailto:360viewtech@gmail.com">Email Us</a>
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
  { title: "Help Center", href: "/help-center" }
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

export default function TermsAndConditionsPage() {
  return (
    <div
      suppressHydrationWarning
      className="relative flex min-h-screen flex-col overflow-hidden bg-white text-zinc-950 supports-[overflow:clip]:overflow-clip dark:bg-black dark:text-white"
    >
      <HeaderShell />
      <main className="flex flex-col">
        <TermsHeroSection />
        <TermsBodySection />
        <CTASection />
      </main>
      <Footer />
    </div>
  );
}
