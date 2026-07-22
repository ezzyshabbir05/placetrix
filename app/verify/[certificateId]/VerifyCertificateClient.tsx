"use client"

import React from "react"
import Link from "next/link"
import Image from "next/image"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { CheckCircle, AlertTriangle, Download, ArrowLeft, Calendar, User, Award, Shield } from "lucide-react"
import BorderGlow from "@/components/landing_allied/BorderGlow"
import PlaceTrixLogo from "@/assets/placetrix.svg"

interface VerifyCertificateClientProps {
  certificateId: string
  certificate: {
    id: string
    issued_at: string
    issued_to_name: string | null
    courses: {
      title: string
    } | null
    profiles: {
      full_name: string | null
    } | null
  } | null
  errorOccurred: boolean
}

export default function VerifyCertificateClient({
  certificateId,
  certificate,
  errorOccurred,
}: VerifyCertificateClientProps) {
  const issueDateStr = certificate
    ? new Date(certificate.issued_at).toLocaleDateString("en-IN", {
      dateStyle: "long",
    })
    : ""

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col justify-between py-12 px-4 relative overflow-hidden font-sans">
      {/* Subtle background glow */}
      <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[600px] h-[350px] rounded-full bg-primary/5 blur-[100px] pointer-events-none -z-10" />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col justify-center items-center max-w-lg mx-auto w-full z-10 space-y-6">

        {/* Brand Header */}
        <div className="text-center select-none">
          <Link href="/" className="inline-flex items-center gap-2.5 group">
            <Image
              src={PlaceTrixLogo}
              alt="PlaceTrix"
              width={28}
              height={28}
              className="size-7 dark:invert group-hover:scale-105 transition-transform"
            />
            <span className="text-2xl font-bold tracking-tight text-foreground">
              PlaceTrix
            </span>
          </Link>
        </div>

        {errorOccurred || !certificate ? (
          /* FAILURE VIEW */
          <BorderGlow
            className="w-full rounded-2xl"
            glowColor="345 75% 50%" // Rose/Red glow
            backgroundColor="hsl(var(--card))"
            borderRadius={16}
            glowRadius={12}
            glowIntensity={0.8}
            fillOpacity={0.03}
          >
            <div className="w-full flex flex-col p-6 text-center space-y-4">
              <div className="flex flex-col items-center gap-2 pt-2">
                <div className="h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center text-destructive mb-2 animate-bounce">
                  <AlertTriangle className="h-6 w-6" />
                </div>
                <h2 className="text-xl font-bold tracking-tight text-foreground">
                  Verification Failed
                </h2>
                <p className="text-sm text-muted-foreground">
                  Invalid or Expired Certificate
                </p>
              </div>

              <div className="space-y-4 px-2">
                <p className="text-sm text-muted-foreground leading-relaxed">
                  The certificate ID <code className="bg-muted px-2 py-0.5 rounded text-destructive font-mono text-xs break-all select-all border border-destructive/10">{certificateId}</code> was not found in our directory or has been revoked.
                </p>
                <p className="text-xs text-muted-foreground/80 leading-normal">
                  Please double-check the unique identifier printed on the credential document and try again.
                </p>
              </div>
            </div>
          </BorderGlow>
        ) : (
          /* SUCCESS VIEW */
          <BorderGlow
            className="w-full rounded-2xl"
            glowColor="142 76% 45%" // Emerald glow
            backgroundColor="hsl(var(--card))"
            borderRadius={16}
            glowRadius={16}
            glowIntensity={1.0}
            fillOpacity={0.04}
          >
            <div className="w-full flex flex-col p-6 space-y-6">
              <div className="flex flex-col items-center text-center gap-2 pt-2">
                <div className="h-12 w-12 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-500 mb-2">
                  <CheckCircle className="h-6 w-6" />
                </div>
                <h2 className="text-xl font-bold tracking-tight text-foreground">
                  Credential Verified
                </h2>
              </div>

              <div className="space-y-6">
                <div className="border rounded-xl bg-muted/20 overflow-hidden text-sm divide-y">

                  {/* Recipient */}
                  <div className="p-3.5 flex items-center justify-between gap-4 hover:bg-muted/10 transition-colors">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <User className="h-4 w-4 shrink-0" />
                      <span className="font-medium text-xs">Recipient Name</span>
                    </div>
                    <span className="font-semibold text-right text-foreground">
                      {certificate.issued_to_name ?? certificate.profiles?.full_name ?? "Candidate"}
                    </span>
                  </div>

                  {/* Course */}
                  <div className="p-3.5 flex items-center justify-between gap-4 hover:bg-muted/10 transition-colors">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Award className="h-4 w-4 shrink-0" />
                      <span className="font-medium text-xs">Course Title</span>
                    </div>
                    <span className="font-bold text-right text-primary">
                      {certificate.courses?.title || "Training Track"}
                    </span>
                  </div>

                  {/* Date */}
                  <div className="p-3.5 flex items-center justify-between gap-4 hover:bg-muted/10 transition-colors">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Calendar className="h-4 w-4 shrink-0" />
                      <span className="font-medium text-xs">Issue Date</span>
                    </div>
                    <span className="font-semibold text-right text-foreground">
                      {issueDateStr}
                    </span>
                  </div>

                  {/* Certificate ID */}
                  <div className="p-3.5 flex items-center justify-between gap-4 hover:bg-muted/10 transition-colors">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Shield className="h-4 w-4 shrink-0" />
                      <span className="font-medium text-xs">Certificate ID</span>
                    </div>
                    <span className="font-mono text-muted-foreground text-xs select-all text-right break-all">
                      {certificate.id}
                    </span>
                  </div>
                </div>

                <div>
                  <Button asChild className="w-full rounded-full font-semibold transition-all hover:scale-[1.01] active:scale-[0.99] shadow-md">
                    <a href={`/api/courses/certificate/${certificate.id}`}>
                      <Download className="h-4 w-4 mr-2" />
                      Download PDF Certificate
                    </a>
                  </Button>
                </div>
              </div>
            </div>
          </BorderGlow>
        )}
      </div>

      {/* Footer copyright */}
      <div className="text-center text-xs text-muted-foreground/60 mt-8 z-10 select-none">
        © {new Date().getFullYear()} PlaceTrix. All rights reserved.
      </div>
    </div>
  )
}
