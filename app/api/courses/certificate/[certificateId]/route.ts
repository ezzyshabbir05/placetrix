import { NextRequest } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { jsPDF } from "jspdf"
import QRCode from "qrcode"

// ─── Types ────────────────────────────────────────────────────────────────────

interface RouteParams {
  params: Promise<{ certificateId: string }>
}

// ─── Font Helpers ─────────────────────────────────────────────────────────────

/** Download a font file from a URL and return it as a base64 string. Returns null on failure. */
async function fetchFontBase64(url: string): Promise<string | null> {
  try {
    const resp = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; PlaceTrix/1.0)" },
    })
    if (!resp.ok) return null
    return Buffer.from(await resp.arrayBuffer()).toString("base64")
  } catch {
    return null
  }
}

/**
 * Load EB Garamond variants by parsing the Google Fonts CSS API response.
 * Request order: 400 normal → 700 normal → 700 italic.
 * Returns null for any weight that could not be fetched — callers fall back to "times".
 */
async function loadGaramondFonts(): Promise<{
  regular: string | null
  bold: string | null
  boldItalic: string | null
}> {
  const NONE = { regular: null, bold: null, boldItalic: null }
  try {
    const cssUrl =
      "https://fonts.googleapis.com/css2?family=EB+Garamond:ital,wght@0,400;0,700;1,700&display=swap"
    const cssResp = await fetch(cssUrl, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; PlaceTrix/1.0)" },
    })
    if (!cssResp.ok) return NONE

    const css = await cssResp.text()
    const urlRegex = /src:\s*url\(([^)]+)\)\s*format\(['"']?(?:woff2?|truetype)['"']?\)/g
    const fontUrls: string[] = []
    let m: RegExpExecArray | null
    while ((m = urlRegex.exec(css)) !== null) {
      fontUrls.push(m[1].replace(/['"]/g, ""))
    }

    const [regular, bold, boldItalic] = await Promise.all([
      fontUrls[0] ? fetchFontBase64(fontUrls[0]) : Promise.resolve(null),
      fontUrls[1] ? fetchFontBase64(fontUrls[1]) : Promise.resolve(null),
      fontUrls[2] ? fetchFontBase64(fontUrls[2]) : Promise.resolve(null),
    ])

    return { regular, bold, boldItalic }
  } catch {
    return NONE
  }
}

// ─── Route Handler ────────────────────────────────────────────────────────────

export async function GET(_request: NextRequest, props: RouteParams) {
  const { certificateId } = await props.params

  if (!certificateId) {
    return new Response(JSON.stringify({ error: "Certificate ID is required." }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    })
  }

  // Bypass RLS — certificates are public documents
  const supabase = createAdminClient()

  const { data: certificate, error } = await supabase
    .from("course_certificates")
    .select(`
      id,
      issued_at,
      courses(title, instructor_name),
      profiles(display_name)
    `)
    .eq("id", certificateId)
    .maybeSingle()

  if (error || !certificate) {
    console.error("Certificate fetch error:", error)
    return new Response(JSON.stringify({ error: "Certificate not found." }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    })
  }

  const courseData     = certificate.courses as any
  const recipientName  = certificate.profiles?.display_name ?? "Candidate"
  const courseTitle    = courseData?.title ?? "Training Track"
  const instructorName = courseData?.instructor_name ?? "Course Instructor"
  const issueDateStr   = new Date(certificate.issued_at).toLocaleDateString("en-IN", {
    year: "numeric", month: "long", day: "numeric",
  })

  const siteUrl    = process.env.NEXT_PUBLIC_SITE_URL ?? "https://placetrix.app"
  const verifyLink = `${siteUrl}/verify/${certificateId}`

  try {
    // ── Generate QR Code Data URL ─────────────────────────────────────────────
    const qrDataUrl = await QRCode.toDataURL(verifyLink, {
      margin: 1,
      width: 150,
      color: {
        dark: "#1e1b4b",  // Navy color to match certificate theme
        light: "#ffffff",
      }
    })

    // ── PDF Setup ────────────────────────────────────────────────────────────

    const ownerPassword =
      Math.random().toString(36).substring(2) + Math.random().toString(36).substring(2)

    const garamond = await loadGaramondFonts()
    const hasGaramond = !!garamond.regular

    const doc = new jsPDF({
      orientation: "landscape",
      unit: "pt",
      format: "a4",
      putOnlyUsedFonts: true,
      encryption: {
        userPassword: "",
        ownerPassword,
        userPermissions: ["print"],
      },
    })

    // Register EB Garamond weights
    if (garamond.regular) {
      doc.addFileToVFS("EBGaramond-Regular.ttf", garamond.regular)
      doc.addFont("EBGaramond-Regular.ttf", "EBGaramond", "normal")
    }
    if (garamond.bold) {
      doc.addFileToVFS("EBGaramond-Bold.ttf", garamond.bold)
      doc.addFont("EBGaramond-Bold.ttf", "EBGaramond", "bold")
    }
    if (garamond.boldItalic) {
      doc.addFileToVFS("EBGaramond-BoldItalic.ttf", garamond.boldItalic)
      doc.addFont("EBGaramond-BoldItalic.ttf", "EBGaramond", "bolditalic")
    }

    // Font family (uses EB Garamond, falls back to times if needed)
    const G = hasGaramond ? "EBGaramond" : "times"

    doc.setProperties({
      title:    `${courseTitle} — Certificate of Completion`,
      subject:  "Course Completion Certificate",
      author:   instructorName,
      creator:  "System",
      keywords: "certificate, completion, verification",
    })

    // ── Dimensions ───────────────────────────────────────────────────────────

    const W  = 841.89   // landscape A4 width  (pt)
    const H  = 595.28   // landscape A4 height (pt)
    const CX = W / 2    // horizontal center

    // ── Background & Borders ─────────────────────────────────────────────────

    // Dark outer frame
    doc.setFillColor(15, 23, 42)
    doc.rect(0, 0, W, H, "F")

    // White inner page
    doc.setFillColor(255, 255, 255)
    doc.rect(20, 20, W - 40, H - 40, "F")

    // Gold outer border
    doc.setDrawColor(180, 83, 9)
    doc.setLineWidth(2)
    doc.rect(30, 30, W - 60, H - 60, "S")

    // Navy inner border
    doc.setDrawColor(30, 27, 75)
    doc.setLineWidth(1)
    doc.rect(36, 36, W - 72, H - 72, "S")

    // Gold corner ornaments
    const corner = (x: number, y: number) => {
      doc.setFillColor(180, 83, 9)
      doc.rect(x, y, 7, 7, "F")
    }
    corner(28, 28);  corner(W - 35, 28)
    corner(28, H - 35); corner(W - 35, H - 35)

    // ── Content Layout ───────────────────────────────────────────────────────

    // 1. Certificate title
    doc.setFont(G, "bold")
    doc.setFontSize(32)
    doc.setTextColor(30, 27, 75)
    doc.text("CERTIFICATE OF COMPLETION", CX, 115, { align: "center" })

    // Decorative divider line under title
    doc.setDrawColor(180, 83, 9)
    doc.setLineWidth(0.75)
    doc.line(CX - 120, 130, CX + 120, 130)

    // 2. Presentation label
    doc.setFont(G, hasGaramond ? "bolditalic" : "italic")
    doc.setFontSize(12)
    doc.setTextColor(113, 113, 122)
    doc.text("This is proudly presented to", CX, 175, { align: "center" })

    // 3. Recipient name
    doc.setFont(G, hasGaramond ? "bolditalic" : "bolditalic")
    doc.setFontSize(34)
    doc.setTextColor(180, 83, 9)
    doc.text(recipientName, CX, 225, { align: "center" })

    // Gold line under name
    const nameWidth = doc.getTextWidth(recipientName)
    const underlineHalf = Math.min(nameWidth / 2 + 10, 150)
    doc.setDrawColor(180, 83, 9)
    doc.setLineWidth(1.2)
    doc.line(CX - underlineHalf, 237, CX + underlineHalf, 237)

    // 4. Completion description
    doc.setFont(G, hasGaramond ? "bolditalic" : "italic")
    doc.setFontSize(12)
    doc.setTextColor(63, 63, 70)
    doc.text(
      "for successfully fulfilling all curriculum requirements and completing the course",
      CX,
      275,
      { align: "center" }
    )

    // 5. Course title (uses Garamond G family as requested)
    doc.setFont(G, "bold")
    doc.setFontSize(22)
    doc.setTextColor(30, 27, 75)
    const wrappedTitle = doc.splitTextToSize(courseTitle.toUpperCase(), W - 220)
    doc.text(wrappedTitle, CX, 320, { align: "center" })

    const titleBlockBottom = 320 + (wrappedTitle.length - 1) * 26

    // 6. Issue date
    doc.setFont(G, hasGaramond ? "bolditalic" : "italic")
    doc.setFontSize(11)
    doc.setTextColor(113, 113, 122)
    doc.text(`Issued on ${issueDateStr}`, CX, Math.max(titleBlockBottom + 32, 380), {
      align: "center",
    })

    // ── 7. Signatures & Verification Section ──────────────────────────────────
    // Properly structured and positioned at the bottom of the card area
    const sigY = 475
    const leftX = 210
    const rightX = W - 210

    // Left: Instructor Signature
    doc.setDrawColor(180, 83, 9)
    doc.setLineWidth(1)
    doc.line(leftX - 80, sigY, leftX + 80, sigY)

    doc.setFont(G, "bold")
    doc.setFontSize(10.5)
    doc.setTextColor(63, 63, 70)
    doc.text(instructorName.toUpperCase(), leftX, sigY + 14, { align: "center" })

    doc.setFont(G, hasGaramond ? "bolditalic" : "italic")
    doc.setFontSize(9)
    doc.setTextColor(130, 130, 140)
    doc.text("Course Instructor", leftX, sigY + 26, { align: "center" })

    // Right: QR Code for Verification
    const qrSize = 65
    const qrX = rightX - qrSize / 2
    const qrY = sigY - 45 // position qr code slightly above the alignment line

    doc.addImage(qrDataUrl, "PNG", qrX, qrY, qrSize, qrSize)

    doc.setFont(G, hasGaramond ? "bolditalic" : "italic")
    doc.setFontSize(8)
    doc.setTextColor(113, 113, 122)
    doc.text("Scan to verify authenticity", rightX, sigY + 28, { align: "center" })

    // ── 8. Footer metadata ────────────────────────────────────────────────────

    doc.setFont(G, "normal")
    doc.setFontSize(7.5)
    doc.setTextColor(160, 160, 160)
    doc.text(`Certificate ID: ${certificateId}`, 55, H - 50)
    doc.text(`Verify at: ${verifyLink}`, W - 55, H - 50, { align: "right" })

    // ── Emit PDF ──────────────────────────────────────────────────────────────

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
    console.error("PDF generation error:", err)
    return new Response(JSON.stringify({ error: "Failed to generate certificate PDF." }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    })
  }
}
