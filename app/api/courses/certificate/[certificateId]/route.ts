import { NextRequest } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { jsPDF } from "jspdf"

interface RouteParams {
  params: Promise<{
    certificateId: string
  }>
}

export async function GET(request: NextRequest, props: RouteParams) {
  const { certificateId } = await props.params

  if (!certificateId) {
    return new Response(JSON.stringify({ error: "Certificate ID is required." }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    })
  }

  // Use admin client to bypass RLS for public downloads
  const supabase = createAdminClient()

  // Fetch certificate details with joined profile and course
  const { data: certificate, error } = await supabase
    .from("course_certificates")
    .select(`
      id,
      issued_at,
      courses(title),
      profiles(display_name)
    `)
    .eq("id", certificateId)
    .maybeSingle()

  if (error || !certificate) {
    console.error("Error retrieving certificate:", error)
    return new Response(JSON.stringify({ error: "Certificate not found." }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    })
  }

  const recipientName = certificate.profiles?.display_name || "Candidate"
  const courseTitle = certificate.courses?.title || "Training Track"
  const issueDateStr = new Date(certificate.issued_at).toLocaleDateString("en-IN", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })

  try {
    // Generate landscape A4 PDF: A4 size is 841.89 pt width x 595.28 pt height
    const doc = new jsPDF({
      orientation: "landscape",
      unit: "pt",
      format: "a4",
      putOnlyUsedFonts: true,
    })

    const width = 841.89
    const height = 595.28
    const centerX = width / 2

    // ─── Drawing Background & Elegant Borders ───
    // Dark Outer Background/Accent Frame
    doc.setFillColor(15, 23, 42) // Slate 900
    doc.rect(0, 0, width, height, "F")

    // Ivory Inner Card Content area
    doc.setFillColor(255, 255, 255)
    doc.rect(20, 20, width - 40, height - 40, "F")

    // Double Border Lines (Gold & Navy)
    doc.setDrawColor(180, 83, 9) // Gold/Amber 700
    doc.setLineWidth(2)
    doc.rect(30, 30, width - 60, height - 60, "S")

    doc.setDrawColor(30, 27, 75) // Indigo 900
    doc.setLineWidth(1)
    doc.rect(35, 35, width - 70, height - 70, "S")

    // Corner Ornament Squares
    doc.setFillColor(180, 83, 9)
    doc.rect(28, 28, 6, 6, "F")
    doc.rect(width - 34, 28, 6, 6, "F")
    doc.rect(28, height - 34, 6, 6, "F")
    doc.rect(width - 34, height - 34, 6, 6, "F")

    // ─── Content ───

    // 1. Logo/Branding Header
    doc.setFont("helvetica", "bold")
    doc.setFontSize(14)
    doc.setTextColor(180, 83, 9) // Gold
    doc.text("P L A C E T R I X   A C A D E M Y", centerX, 80, { align: "center" })

    // Minimalist Divider Line under Header
    doc.setDrawColor(228, 228, 231) // Zinc 200
    doc.setLineWidth(1)
    doc.line(centerX - 100, 100, centerX + 100, 100)

    // 2. Certificate Type Title
    doc.setFont("helvetica", "bold")
    doc.setFontSize(28)
    doc.setTextColor(30, 27, 75) // Navy
    doc.text("CERTIFICATE OF COMPLETION", centerX, 150, { align: "center" })

    // 3. Presentation label
    doc.setFont("helvetica", "normal")
    doc.setFontSize(10)
    doc.setTextColor(113, 113, 122) // Zinc 500
    doc.text("THIS IS PROUDLY PRESENTED TO", centerX, 195, { align: "center" })

    // 4. Candidate Name
    doc.setFont("helvetica", "bold")
    doc.setFontSize(26)
    doc.setTextColor(180, 83, 9) // Gold
    doc.text(recipientName, centerX, 240, { align: "center" })

    // Underline for name
    doc.setDrawColor(180, 83, 9)
    doc.setLineWidth(1.5)
    doc.line(centerX - 120, 252, centerX + 120, 252)

    // 5. Completion Description Text
    doc.setFont("helvetica", "normal")
    doc.setFontSize(12)
    doc.setTextColor(63, 63, 70) // Zinc 700
    doc.text("for successfully fulfilling all training curriculum requirements and completing the course", centerX, 290, { align: "center" })

    // 6. Course Title
    doc.setFont("helvetica", "bold")
    doc.setFontSize(20)
    doc.setTextColor(30, 27, 75) // Navy
    // Handle multi-line title mapping if needed
    const wrappedTitle = doc.splitTextToSize(courseTitle.toUpperCase(), width - 200)
    doc.text(wrappedTitle, centerX, 335, { align: "center" })

    // 7. Issued On Date
    doc.setFont("helvetica", "normal")
    doc.setFontSize(11)
    doc.setTextColor(113, 113, 122)
    doc.text(`Issued on ${issueDateStr}`, centerX, 395, { align: "center" })

    // 8. Signatures Placeholder Lines
    // Left side: Director
    doc.setDrawColor(200, 200, 200)
    doc.setLineWidth(1)
    doc.line(120, 480, 280, 480)
    doc.setFont("helvetica", "bold")
    doc.setFontSize(9)
    doc.setTextColor(63, 63, 70)
    doc.text("DR. EVELYN VANCE", 200, 495, { align: "center" })
    doc.setFont("helvetica", "normal")
    doc.setTextColor(113, 113, 122)
    doc.text("Director, PlaceTrix Academy", 200, 508, { align: "center" })

    // Right side: Registrar
    doc.line(width - 280, 480, width - 120, 480)
    doc.setFont("helvetica", "bold")
    doc.setTextColor(63, 63, 70)
    doc.text("MARCUS CHEN", width - 200, 495, { align: "center" })
    doc.setFont("helvetica", "normal")
    doc.setTextColor(113, 113, 122)
    doc.text("Registrar of Assessments", width - 200, 508, { align: "center" })

    // 9. Bottom Metadata (Verification & Unique ID)
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://placetrix.app"
    const verifyLink = `${siteUrl}/verify/${certificateId}`

    doc.setFont("helvetica", "normal")
    doc.setFontSize(7.5)
    doc.setTextColor(140, 140, 140)
    doc.text(`Certificate ID: ${certificateId}`, 45, 545)
    doc.text(`Verify authenticity at: ${verifyLink}`, width - 45, 545, { align: "right" })

    // Output raw buffer
    const pdfBuffer = Buffer.from(doc.output("arraybuffer"))

    return new Response(pdfBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="certificate_${certificateId.slice(0, 8)}.pdf"`,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    })
  } catch (err: any) {
    console.error("PDF generation exception:", err)
    return new Response(JSON.stringify({ error: "Failed to generate certificate PDF." }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    })
  }
}
