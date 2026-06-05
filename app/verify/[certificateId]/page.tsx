import Link from "next/link"
import { createAdminClient } from "@/lib/supabase/admin"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { CheckCircle, AlertTriangle, ShieldCheck, Download, Award, ArrowLeft } from "lucide-react"

interface PageProps {
  params: Promise<{
    certificateId: string
  }>
}

export const metadata = {
  title: "Verify Certificate — PlaceTrix",
  description: "Verify the authenticity of PlaceTrix Academy course completion certificates",
}

export default async function VerifyCertificatePage({ params }: PageProps) {
  const { certificateId } = await params

  let certificate: any = null
  let errorOccurred = false

  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from("course_certificates")
      .select(`
        id,
        issued_at,
        courses(title),
        profiles(display_name)
      `)
      .eq("id", certificateId)
      .maybeSingle()

    if (error || !data) {
      errorOccurred = true
    } else {
      certificate = data
    }
  } catch (err) {
    console.error("Exception checking certificate:", err)
    errorOccurred = true
  }

  const issueDateStr = certificate
    ? new Date(certificate.issued_at).toLocaleDateString("en-IN", {
        dateStyle: "long",
      })
    : ""

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-between py-12 px-4 relative overflow-hidden font-sans">
      {/* Background Ornaments */}
      <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full bg-indigo-500/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full bg-amber-500/5 blur-[120px] pointer-events-none" />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col justify-center items-center max-w-xl mx-auto w-full z-10">
        
        {/* Brand Header */}
        <div className="text-center mb-8 space-y-1 select-none">
          <h2 className="text-sm font-bold text-amber-500 tracking-[0.25em] uppercase">PlaceTrix Academy</h2>
          <p className="text-[10px] text-muted-foreground/60 uppercase tracking-widest">Credentials Verification Registry</p>
        </div>

        {errorOccurred || !certificate ? (
          /* FAILURE VIEW */
          <Card className="border-rose-500/20 bg-zinc-900/50 backdrop-blur-md shadow-2xl w-full text-center p-4">
            <CardHeader className="flex flex-col items-center gap-3 pt-6">
              <div className="h-16 w-16 rounded-full bg-rose-500/10 border border-rose-500/25 flex items-center justify-center text-rose-500 shadow-lg shadow-rose-500/5">
                <AlertTriangle className="h-8 w-8" />
              </div>
              <CardTitle className="text-xl font-bold font-cirka text-foreground">
                Verification Failed
              </CardTitle>
              <CardDescription className="text-xs text-rose-450 dark:text-rose-400 font-medium">
                Invalid or Expired Certificate ID
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-2 pb-6 space-y-4 px-6">
              <p className="text-xs text-muted-foreground leading-relaxed">
                The certificate ID <code className="bg-rose-500/5 px-2 py-1 rounded text-rose-400 font-mono text-[10px] select-all border border-rose-500/10 break-all">{certificateId}</code> was not found in our directory or has been revoked. 
              </p>
              <p className="text-[11px] text-muted-foreground/60 leading-normal">
                Please double-check the unique identifier printed on the bottom-left of the credential document and try again.
              </p>
              <div className="pt-4 border-t border-border/40">
                <Button asChild size="sm" variant="outline" className="rounded-full gap-2 text-xs">
                  <Link href="/">
                    <ArrowLeft className="h-3.5 w-3.5" />
                    Back to Portal
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          /* SUCCESS VIEW */
          <Card className="border-amber-500/25 bg-zinc-900/40 backdrop-blur-md shadow-2xl w-full relative overflow-hidden">
            {/* Top gold bar */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-600" />
            
            <CardHeader className="flex flex-col items-center gap-3 pt-8 pb-4 text-center">
              <div className="h-16 w-16 rounded-full bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center text-emerald-500 shadow-lg shadow-emerald-500/5 animate-pulse">
                <ShieldCheck className="h-9 w-9" />
              </div>
              <CardTitle className="text-xl font-bold font-cirka text-foreground tracking-wide mt-1">
                Credential Verified
              </CardTitle>
              <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-[10px] px-3 py-0.5 rounded-full font-bold uppercase tracking-wider">
                Authentic & Active
              </Badge>
            </CardHeader>
            <CardContent className="px-6 pb-8 space-y-6 pt-2">
              <div className="divide-y divide-border/40 border border-border/40 rounded-xl bg-zinc-950/40 overflow-hidden text-xs">
                
                {/* Recipient */}
                <div className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-4">
                  <span className="text-muted-foreground uppercase font-bold text-[9px] tracking-widest shrink-0">Recipient Name</span>
                  <span className="font-bold text-foreground truncate text-sm sm:text-right">{certificate.profiles?.display_name || "Candidate"}</span>
                </div>

                {/* Course */}
                <div className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-4">
                  <span className="text-muted-foreground uppercase font-bold text-[9px] tracking-widest shrink-0">Course Title</span>
                  <span className="font-bold text-foreground truncate text-sm sm:text-right text-amber-500">{certificate.courses?.title || "Training Track"}</span>
                </div>

                {/* Date */}
                <div className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-4">
                  <span className="text-muted-foreground uppercase font-bold text-[9px] tracking-widest shrink-0">Issue Date</span>
                  <span className="font-medium text-foreground text-sm sm:text-right">{issueDateStr}</span>
                </div>

                {/* Certificate ID */}
                <div className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-4">
                  <span className="text-muted-foreground uppercase font-bold text-[9px] tracking-widest shrink-0">Certificate ID</span>
                  <span className="font-mono text-muted-foreground text-[10px] sm:text-right break-all select-all">{certificate.id}</span>
                </div>

                {/* Issuer */}
                <div className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-4">
                  <span className="text-muted-foreground uppercase font-bold text-[9px] tracking-widest shrink-0">Authority</span>
                  <span className="font-semibold text-foreground text-sm sm:text-right flex items-center gap-1 sm:justify-end">
                    <Award className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                    PlaceTrix Assessment Board
                  </span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <Button asChild className="flex-1 rounded-full h-10 font-bold text-xs bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600 text-white shadow-md shadow-emerald-500/10">
                  <a href={`/api/courses/certificate/${certificate.id}`} target="_blank" rel="noopener noreferrer">
                    <Download className="h-4 w-4 mr-1.5" />
                    Download PDF Certificate
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Footer copyright */}
      <div className="text-center text-[10px] text-muted-foreground/40 mt-8 z-10 select-none">
        © {new Date().getFullYear()} PlaceTrix Inc. All rights secured.
      </div>
    </div>
  )
}
