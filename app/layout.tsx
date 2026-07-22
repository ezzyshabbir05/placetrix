import { TooltipProvider } from "@/components/ui/tooltip";
import type { Metadata } from "next";
import { ThemeProvider } from "next-themes";
// @ts-ignore: CSS side-effect import for global styles
import "./globals.css";
import { cirka } from "@/app/fonts";
import { Toaster } from "@/components/ui/sonner";
import { Outfit, EB_Garamond, Source_Code_Pro } from "next/font/google";
import "./globals.css";

const fontSans = Outfit({
  subsets: ["latin"],
  variable: "--font-sans",
});

const fontSerif = EB_Garamond({
  subsets: ["latin"],
  variable: "--font-serif",
});

const fontMono = Source_Code_Pro({
  subsets: ["latin"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "https://placetrix.app"),
  title: {
    default: "Placetrix - Educational Assessment Platform",
    template: "%s | Placetrix",
  },
  description:
    "Practice mock tests, join study groups, track your progress, and excel in your exams with Placetrix's advanced educational tools.",
  keywords: [
    "education",
    "assessment",
    "mock tests",
    "study groups",
    "exam preparation",
    "learning platform",
  ],
  authors: [{ name: "4 Grid Technologies" }],
  creator: "4 Grid Technologies",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "/",
    title: "Placetrix - Educational Assessment Platform",
    description: "Practice mock tests, join study groups, and track your progress with Placetrix.",
    siteName: "Placetrix",
  },
  twitter: {
    card: "summary_large_image",
    title: "Placetrix - Educational Assessment Platform",
    description: "Practice mock tests, join study groups, and track your progress with Placetrix.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  alternates: {
    canonical: "/",
  },
  appleWebApp: {
    title: "Placetrix",
    statusBarStyle: "black-translucent",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/devicons/devicon@latest/devicon.min.css" />
      </head>
      <body className={`${cirka.variable} font-sans antialiased`} suppressHydrationWarning>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        ><TooltipProvider>{children}
            <Toaster position="top-right"
              richColors
            />
          </TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
