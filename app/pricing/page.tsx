"use client";

import React from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { useTheme } from "next-themes";
import {
    ArrowRightIcon,
    CheckIcon,
    MenuIcon,
    MoonIcon,
    SunIcon,
    XIcon,
    GithubIcon,
    InstagramIcon,
    LinkedinIcon,
    BellRing,
    ShieldCheck,
    WalletCards,
    ChevronDownIcon,
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
        const onScroll = () => setScrolled(window.scrollY > threshold);

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

function HeaderShell({ initialUser = null }: HeaderShellProps) {
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

// ─── Data ────────────────────────────────────────────────────────────────────

const promiseItems = [
    {
        icon: WalletCards,
        title: "Zero-cost access today",
        description:
            "Every user can use PlaceTrix for free right now. No paid tier is required to get started.",
    },
    {
        icon: BellRing,
        title: "Advance notice later",
        description:
            "If paid plans are introduced in the future, users will be notified before anything changes.",
    },
    {
        icon: ShieldCheck,
        title: "Clear communication",
        description:
            "Any future pricing will be shared in a straightforward way, without hidden terms or surprise paywalls.",
    },
];

const faqs: { question: string; answer: string }[] = [
    {
        question: "Is PlaceTrix free right now?",
        answer: "Yes. PlaceTrix is currently free for all users.",
    },
    {
        question: "Do I need to add payment details?",
        answer:
            "No. You do not need to enter any card or billing information to use PlaceTrix at the moment.",
    },
    {
        question: "Will paid plans be introduced later?",
        answer:
            "Possibly. If we release paid plans in the future, we will notify users in advance before the change takes effect.",
    },
    {
        question: "Will my current access suddenly stop?",
        answer:
            "No sudden surprises are planned. If pricing changes happen, they will be communicated clearly ahead of time.",
    },
];

// ─── Sections ────────────────────────────────────────────────────────────────

/**
 * Hero — matches the landing page pattern exactly:
 *  • min-h-[100svh] on mobile
 *  • md:-mt-14  +  md:min-h-[calc(100dvh+3.5rem)]  so content sits flush
 *    behind the fixed header on desktop (same as landing page)
 *  • inner flex-center div uses min-h-[calc(100svh-3.5rem)] to centre the
 *    copy within the visible viewport on mobile
 */
function HeroSection() {
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
                        Pricing
                    </p>

                    <h1
                        className="font-cirka text-balance text-3xl font-semibold tracking-tight md:text-5xl"
                    >
                        PlaceTrix is currently free for all.
                    </h1>

                    <p className="mt-3 text-sm leading-7 text-stone-600 dark:text-stone-300 md:text-base md:leading-8">
                        Start using PlaceTrix today without paying anything. When paid plans
                        are introduced in the future, we&apos;ll notify users clearly and in advance.
                    </p>
                </div>
            </div>
        </section>
    );
}

function CurrentPlanSection() {
    return (
        <section
            id="current-plan"
            className={cn(
                "scroll-mt-24 w-full bg-white text-zinc-950 dark:bg-black dark:text-white md:scroll-mt-20",
                SECTION_Y
            )}
        >
            <div className={CONTENT}>
                <div className="mx-auto max-w-6xl">
                    <div className="rounded-3xl border border-black/10 bg-white/95 p-6 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.03] md:p-8 lg:p-10">
                        <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-start">
                            {/* Left column */}
                            <div>
                                <p className="mb-3 text-xs font-medium uppercase tracking-widest text-zinc-500 dark:text-zinc-400">
                                    Current access
                                </p>
                                <h2
                                    className="font-cirka text-balance text-4xl font-semibold tracking-tight md:text-6xl"
                                >
                                    One plan. No cost.
                                </h2>
                                <p className="mt-4 max-w-xl text-sm leading-7 text-stone-600 dark:text-stone-300 md:text-base md:leading-8">
                                    Right now, PlaceTrix is available to everyone for free. No plan
                                    comparison maze, no billing anxiety, and no &ldquo;contact sales to
                                    discover reality&rdquo; moment.
                                </p>

                                <div className="mt-8 flex flex-wrap items-center gap-3">
                                    <Button size="lg" className="rounded-full font-medium" asChild>
                                        <Link href="/auth/sign-up">Get Started</Link>
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

                            {/* Right column — plan card */}
                            <div className="rounded-3xl border border-emerald-500/20 bg-emerald-500/[0.06] p-6 dark:bg-emerald-500/[0.08] md:p-7">
                                <p className="text-xs font-medium uppercase tracking-widest text-emerald-700 dark:text-emerald-300">
                                    Active plan
                                </p>

                                <div className="mt-5 flex items-end gap-2">
                                    <span
                                        className="font-cirka text-5xl font-semibold tracking-tight md:text-6xl"
                                    >
                                        ₹0
                                    </span>
                                    <span className="pb-2 text-sm text-zinc-500 dark:text-zinc-400">
                                        currently
                                    </span>
                                </div>

                                <p className="mt-4 text-sm leading-7 text-zinc-700 dark:text-zinc-300">
                                    Use PlaceTrix today without entering payment details.
                                </p>

                                <div className="mt-6 h-px w-full bg-black/10 dark:bg-white/10" />

                                <ul className="mt-6 space-y-3">
                                    {[
                                        "No card required",
                                        "No billing setup",
                                        "Future changes will be announced",
                                    ].map((item) => (
                                        <li
                                            key={item}
                                            className="flex items-start gap-3 text-sm text-zinc-700 dark:text-zinc-300"
                                        >
                                            <CheckIcon className="mt-0.5 size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                                            <span>{item}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}

function FuturePlansSection() {
    return (
        <section
            id="included"
            className={cn(
                "scroll-mt-24 w-full bg-white text-zinc-950 dark:bg-black dark:text-white md:scroll-mt-20",
                SECTION_Y
            )}
        >
            <div className={CONTENT}>
                <div className="mx-auto max-w-6xl text-center">
                    <p className="mb-3 text-xs font-medium uppercase tracking-widest text-zinc-500 dark:text-zinc-400">
                        Looking ahead
                    </p>
                    <h2
                        className="font-cirka text-balance text-4xl font-semibold tracking-tight md:text-7xl"
                    >
                        If paid plans arrive, you&apos;ll know first
                    </h2>
                </div>

                <div className="mt-12 grid gap-5 md:grid-cols-3">
                    {promiseItems.map((item) => {
                        const Icon = item.icon;

                        return (
                            <article
                                key={item.title}
                                className="rounded-3xl border border-black/10 bg-white/95 p-6 backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.03] md:p-7"
                            >
                                <h3 className="text-[15px] font-semibold tracking-[-0.01em] text-zinc-900 dark:text-white md:text-base">
                                    {item.title}
                                </h3>
                                <p className="pt-3 text-[15px] leading-7 font-medium tracking-[-0.01em] text-stone-600 dark:text-stone-300 md:text-base">
                                    {item.description}
                                </p>
                            </article>
                        );
                    })}
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
                            Start now
                        </p>
                        <h2
                            className="font-cirka text-balance text-4xl font-semibold tracking-tight sm:text-5xl md:text-6xl"
                        >
                            Simple access, no surprises.
                        </h2>
                        <p className="mx-auto mt-4 max-w-md text-sm text-stone-600 dark:text-stone-300 md:text-base">
                            Use PlaceTrix now at no cost. If paid plans are released later,
                            we&apos;ll notify users before they go live.
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

// ─── Footer ──────────────────────────────────────────────────────────────────

const companyLinks = [
    { title: "Our Team", href: "/our-team" },
    { title: "Privacy Policy", href: "/privacy-policy" },
    { title: "Terms of Service", href: "/terms-of-service" },
];

const resourceLinks = [
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
                            {resourceLinks.map(({ href, title }) => (
                                <Link
                                    className="w-max text-sm text-zinc-700 hover:underline dark:text-zinc-300"
                                    href={href}
                                    key={title}
                                >
                                    {title}
                                </Link>
                            ))}
                        </div>
                    </div>

                    <div className="col-span-3 w-full md:col-span-1">
                        <span className="text-xs text-zinc-500 dark:text-zinc-400">Company</span>
                        <div className="mt-2 flex flex-col gap-2">
                            {companyLinks.map(({ href, title }) => (
                                <Link
                                    className="w-max text-sm text-zinc-700 hover:underline dark:text-zinc-300"
                                    href={href}
                                    key={title}
                                >
                                    {title}
                                </Link>
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
                        , All rights reserved
                    </p>
                </div>
            </div>
        </footer>
    );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PricingPage() {
    return (
        <div
            suppressHydrationWarning
            className="select-none relative flex min-h-screen flex-col overflow-hidden bg-white text-zinc-950 supports-[overflow:clip]:overflow-clip dark:bg-black dark:text-white"
        >
            <HeaderShell />
            <main className="flex flex-col gap-0">
                <HeroSection />
                <CurrentPlanSection />
                <FuturePlansSection />
                <CTASection />
            </main>
            <Footer />
        </div>
    );
}
