import { getUserProfile } from "@/lib/supabase/profile"
import { redirect } from "next/navigation"
import LandingPageClient from "./LandingPageClient"
import type { Metadata } from "next"

export const metadata: Metadata = {
  robots: {
    index: true,
    follow: true,
    noimageindex: true,
    googleBot: {
      index: true,
      follow: true,
      noimageindex: true,
    },
  },
}

export default async function RootPage() {
  const profile = await getUserProfile()

  if (profile) {
    redirect("/home")
  }

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": "https://placetrix.app/#website",
        "url": "https://placetrix.app",
        "name": "Placetrix",
        "description": "Educational Assessment Platform for mock tests and study groups.",
        "publisher": {
          "@id": "https://placetrix.app/#organization"
        },
        "inLanguage": "en-US"
      },
      {
        "@type": "Organization",
        "@id": "https://placetrix.app/#organization",
        "name": "Placetrix",
        "url": "https://placetrix.app",
        "logo": {
          "@type": "ImageObject",
          "@id": "https://placetrix.app/#logo",
          "url": "https://placetrix.app/placetrix.svg",
          "caption": "Placetrix Logo"
        },
        "image": {
          "@id": "https://placetrix.app/#logo"
        },
        "description": "Educational Assessment Platform for mock tests and study groups.",
        "sameAs": [
          "https://www.linkedin.com/company/4-grid-technologies/",
          "https://www.instagram.com/4grid.tech/",
          "https://github.com/4-Grid-Tech/"
        ]
      }
    ]
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <LandingPageClient />
    </>
  )
}
