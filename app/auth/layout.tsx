"use client";

import { Suspense, useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { StarIcon } from "lucide-react";
import { buildOptimizedStorageUrl } from "@/lib/storage";
import { BrandLogo } from "@/components/brand-logo";

interface Testimonial {
  quote: string;
  imagePath: string;
  name: string;
  role: string;
  company?: string;
}

const TESTIMONIALS: Testimonial[] = [
  {
    quote:
      "PlaceTrix's structured aptitude and technical tests were vital to my prep. Consistent practice boosted my confidence and helped me clear the Infosys aptitude round.",
    imagePath: "testimonials/pranjal.png",
    name: "Pranjal Haral",
    role: "Software Engineer",
    company: "Infosys",
  },
  {
    quote:
      "Regular practice with PlaceTrix improved my fundamentals and helped me crack the Infosys aptitude round. I recommend it to all aspirants.",
    imagePath: "testimonials/janhavi.png",
    name: "Janhavi Patil",
    role: "Software Engineer",
    company: "Infosys",
  },
  {
    quote:
      "The app's quizzes and mock tests significantly improved my speed and accuracy, leaving me well-prepared for the placement process. Truly thankful!",
    imagePath: "testimonials/pinal.png",
    name: "Pinal Lagdhir",
    role: "Software Engineer",
    company: "Infosys",
  },
  {
    quote:
      "PlaceTrix helped me approach placements in a structured way. The consistent practice strengthened my problem-solving skills and boosted my confidence.",
    imagePath: "testimonials/chaitali.png",
    name: "Chaitali Bonde",
    role: "Software Engineer",
    company: "Infosys",
  },
];

function FloatingPaths({ position }: { position: number }) {
  const paths = Array.from({ length: 36 }, (_, i) => ({
    id: i,
    d: `M-${380 - i * 5 * position} -${189 + i * 6}C-${
      380 - i * 5 * position
    } -${189 + i * 6} -${312 - i * 5 * position} ${216 - i * 6} ${
      152 - i * 5 * position
    } ${343 - i * 6}C${616 - i * 5 * position} ${470 - i * 6} ${
      684 - i * 5 * position
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

function TestimonialCarousel() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % TESTIMONIALS.length);
    }, 7000);
    return () => clearInterval(timer);
  }, []);

  const current = TESTIMONIALS[index];
  const optimizedImageUrl =
    buildOptimizedStorageUrl("landing-page-material", current.imagePath, {
      width: 80,
      height: 80,
      quality: 80,
      format: "webp",
    }) ?? `https://db.placetrix.app/storage/v1/render/image/public/landing-page-material/${current.imagePath}?width=80&height=80&quality=80&format=webp`;

  return (
    <div className="relative min-h-40">
      <AnimatePresence mode="wait">
        <motion.div
          key={index}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          className="space-y-4"
        >
          <div className="flex items-center gap-1 text-amber-500">
            {[...Array(5)].map((_, i) => (
              <StarIcon key={i} className="size-3.5 fill-amber-500" />
            ))}
          </div>

          <blockquote className="space-y-2">
            <p className="text-base leading-relaxed text-foreground/90 font-normal">
              &ldquo;{current.quote}&rdquo;
            </p>
          </blockquote>

          <footer className="flex items-center gap-3 pt-1">
            <div className="relative size-10 shrink-0 overflow-hidden rounded-full border border-primary/20 bg-muted">
              <Image
                src={optimizedImageUrl}
                alt={current.name}
                width={40}
                height={40}
                className="size-full object-cover"
                unoptimized
              />
            </div>
            <div className="flex flex-col">
              <span className="font-semibold text-sm text-foreground">
                {current.name}
              </span>
              <span className="text-xs text-muted-foreground">
                {current.role} {current.company ? `• ${current.company}` : ""}
              </span>
            </div>
          </footer>
        </motion.div>
      </AnimatePresence>

      {/* Slide indicators */}
      <div className="flex items-center gap-1.5 pt-4">
        {TESTIMONIALS.map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setIndex(i)}
            className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${
              i === index
                ? "w-6 bg-primary"
                : "w-1.5 bg-muted-foreground/30 hover:bg-muted-foreground/50"
            }`}
            aria-label={`Go to testimonial ${i + 1}`}
          />
        ))}
      </div>
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
      <div className="relative hidden h-full flex-col justify-between border-r bg-secondary p-10 lg:flex dark:bg-secondary/20">
        <div className="absolute inset-0 bg-linear-to-b from-transparent via-transparent to-background pointer-events-none" />

        <div className="z-10">
          <BrandLogo href="/" size="md" />
        </div>

        {/* Testimonials Carousel */}
        <div className="z-10 mt-auto">
          <TestimonialCarousel />
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
          <BrandLogo href="/" size="sm" />
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