// app/api/resume/download/route.ts
import { NextRequest, NextResponse } from "next/server"
import {
  Document,
  Page,
  Text,
  View,
  Link,
  StyleSheet,
  Font,
  renderToBuffer,
} from "@react-pdf/renderer"
import React from "react"

// â”€â”€â”€ Types (mirrors ResumeGeneratorClient) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

interface PersonalInfo {
  fullName: string; email: string; phone: string; location: string
  linkedin: string; github: string; portfolio: string; tagline: string
}
interface ExperienceItem {
  id: string; company: string; title: string; location: string
  startDate: string; endDate: string; current: boolean; bullets: string[]
}
interface EducationItem {
  id: string; institution: string; degree: string; field: string
  location: string; startDate: string; endDate: string; gpa: string; honors: string
}
interface SkillCategory { id: string; category: string; skills: string }
interface ProjectItem {
  id: string; name: string; techStack: string; dateRange: string
  liveUrl: string; repoUrl: string; bullets: string[]
}
interface CertificationItem { id: string; name: string; issuer: string; date: string; credentialId: string }

interface ResumeData {
  personal: PersonalInfo
  summaryEnabled: boolean; summaryContent: string
  experience: ExperienceItem[]; education: EducationItem[]
  skills: SkillCategory[]; projects: ProjectItem[]
  certifications: CertificationItem[]; sectionOrder: string[]
}
interface ResumeConfig {
  font: "garamond" | "palatino" | "lato"
  fontSize: number; marginPx: number; accentColor: string; thickRule: boolean
}

// â”€â”€â”€ Font Registration â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

let fontsRegistered = false

async function registerFonts(fontKey: string) {
  if (fontsRegistered) return
  fontsRegistered = true

  // Palatino â€” use Times (built-in PDF font, no network needed)
  // Garamond and Lato â€” load from Google Fonts
  if (fontKey === "garamond") {
    Font.register({
      family: "EB Garamond",
      fonts: [
        {
          src: "https://fonts.gstatic.com/s/ebgaramond/v30/SlGDmQSNjdsmc35JDF1K5E55YMjF_7DPuGi-6_RUA4R-uA.woff2",
          fontWeight: 400,
          fontStyle: "normal",
        },
        {
          src: "https://fonts.gstatic.com/s/ebgaramond/v30/SlGFmQSNjdsmc35JDF1K5GRwSDo_ZTSdA4F-uA.woff2",
          fontWeight: 400,
          fontStyle: "italic",
        },
        {
          src: "https://fonts.gstatic.com/s/ebgaramond/v30/SlGDmQSNjdsmc35JDF1K5E55YMjF_7DPuGi-6_RUPYd-uA.woff2",
          fontWeight: 700,
          fontStyle: "normal",
        },
      ],
    })
  } else if (fontKey === "lato") {
    Font.register({
      family: "Lato",
      fonts: [
        {
          src: "https://fonts.gstatic.com/s/lato/v24/S6uyw4BMUTPHjx4wXiWtFCc.woff2",
          fontWeight: 300,
          fontStyle: "normal",
        },
        {
          src: "https://fonts.gstatic.com/s/lato/v24/S6uyw4BMUTPHjx4wWiWt.woff2",
          fontWeight: 400,
          fontStyle: "normal",
        },
        {
          src: "https://fonts.gstatic.com/s/lato/v24/S6u9w4BMUTPHh7USSwiPHA.woff2",
          fontWeight: 400,
          fontStyle: "italic",
        },
        {
          src: "https://fonts.gstatic.com/s/lato/v24/S6u9w4BMUTPHh6UVSwiPHA.woff2",
          fontWeight: 700,
          fontStyle: "normal",
        },
      ],
    })
  }
  // Palatino: @react-pdf/renderer includes Times as a built-in serif â€” we fall back gracefully
}

// â”€â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function getFontFamily(fontKey: string): string {
  switch (fontKey) {
    case "garamond": return "EB Garamond"
    case "lato": return "Lato"
    case "palatino":
    default:
      return "Times-Roman"
  }
}

/** Convert browser px (96dpi screen) to PDF pt (72dpi) */
function pxToPt(px: number): number {
  return px * 0.75
}

// â”€â”€â”€ PDF Document Component â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function ResumePDF({ data, config }: { data: ResumeData; config: ResumeConfig }) {
  const {
    personal, summaryEnabled, summaryContent,
    experience, education, skills, projects, certifications, sectionOrder,
  } = data

  const fontFamily = getFontFamily(config.font)
  const fs = config.fontSize
  const acc = config.accentColor
  const mg = pxToPt(config.marginPx)
  const useThickRule = config.thickRule

  const styles = StyleSheet.create({
    page: {
      fontFamily,
      fontSize: fs,
      color: "#111",
      backgroundColor: "#ffffff",
      paddingTop: mg,
      paddingBottom: mg,
      paddingLeft: mg,
      paddingRight: mg,
    },
    header: { alignItems: "center", marginBottom: 8 },
    headerName: {
      fontFamily,
      fontSize: fs * 2.5,
      fontWeight: 700,
      color: acc,
      letterSpacing: 0.3,
      lineHeight: 1.1,
      marginBottom: 2,
    },
    headerTagline: {
      fontFamily,
      fontSize: fs * 0.95,
      fontStyle: "italic",
      color: "#555",
      marginBottom: 4,
    },
    headerContact: {
      fontFamily,
      fontSize: fs * 0.88,
      color: "#444",
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: "center",
    },
    contactSep: { color: "#bbb", marginHorizontal: 4 },
    headerRule: { borderTopWidth: 1.5, borderTopColor: acc, marginTop: 6, width: "100%" },
    sectionTitle: {
      fontFamily,
      fontWeight: 700,
      letterSpacing: 1.2,
      textTransform: "uppercase",
      color: useThickRule ? acc : "#222",
      borderBottomWidth: useThickRule ? 2 : 1,
      borderBottomColor: useThickRule ? acc : "#333",
      paddingBottom: useThickRule ? 3 : 2,
      marginTop: 10,
      marginBottom: 5,
      fontSize: fs,
    },
    row: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
    rowLeft: { fontFamily, fontWeight: 400, flex: 1 },
    rowLeftBold: { fontFamily, fontWeight: 700, flex: 1 },
    rowLeftItalic: { fontFamily, fontStyle: "italic", flex: 1 },
    rowRight: { fontFamily, fontSize: fs * 0.9, color: "#555", flexShrink: 0, marginLeft: 8 },
    bulletList: { marginTop: 3, marginLeft: 12 },
    bulletItem: { fontFamily, marginBottom: 1.5, lineHeight: 1.4 },
    summaryText: { fontFamily, lineHeight: 1.5 },
    skillRow: { flexDirection: "row", marginBottom: 2 },
    skillLabel: { fontFamily, fontWeight: 700, flexShrink: 0, marginRight: 4 },
    skillValue: { fontFamily, flex: 1 },
    certRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 3 },
    certLeft: { fontFamily, flex: 1 },
    certRight: { fontFamily, fontSize: fs * 0.9, color: "#555", flexShrink: 0, marginLeft: 8 },
    projHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
    projNameRow: { flexDirection: "row", alignItems: "baseline", flex: 1, flexWrap: "wrap" },
    projName: { fontFamily, fontWeight: 700 },
    projTech: { fontFamily, fontStyle: "italic", marginTop: 1 },
    projLink: { color: acc, fontWeight: 400, fontSize: fs * 0.85, marginLeft: 3 },
    projDate: { fontFamily, fontSize: fs * 0.9, color: "#555", flexShrink: 0, marginLeft: 8 },
    entryBlock: { marginBottom: 8 },
    gpaText: { fontFamily, fontSize: fs * 0.9, color: "#444", marginTop: 1 },
  })

  function renderSectionTitle(label: string) {
    return <Text style={styles.sectionTitle}>{label.toUpperCase()}</Text>
  }

  function renderRow(left?: string, right?: string, bold?: boolean, italic?: boolean) {
    if (!left && !right) return null
    return (
      <View style={styles.row}>
        {left ? (
          <Text style={bold ? styles.rowLeftBold : italic ? styles.rowLeftItalic : styles.rowLeft}>
            {left}
          </Text>
        ) : <View style={{ flex: 1 }} />}
        {right && <Text style={styles.rowRight}>{right}</Text>}
      </View>
    )
  }

  function renderBullets(bullets: string[]) {
    const clean = bullets.filter(Boolean)
    if (!clean.length) return null
    return (
      <View style={styles.bulletList}>
        {clean.map((b, i) => (
          <Text key={i} style={styles.bulletItem}>{"â€¢ "}{b}</Text>
        ))}
      </View>
    )
  }

  function renderSection(key: string): React.ReactNode {
    switch (key) {
      case "summary": {
        if (!summaryEnabled || !summaryContent.trim()) return null
        return (
          <View key="summary">
            {renderSectionTitle("Summary")}
            <Text style={styles.summaryText}>{summaryContent}</Text>
          </View>
        )
      }

      case "experience": {
        const items = experience.filter((e) => e.company || e.title)
        if (!items.length) return null
        return (
          <View key="experience">
            {renderSectionTitle("Experience")}
            {items.map((exp, idx) => (
              <View key={exp.id} style={idx < items.length - 1 ? styles.entryBlock : undefined}>
                {renderRow(
                  exp.company,
                  [exp.startDate, exp.current ? "Present" : exp.endDate].filter(Boolean).join(" \u2013 "),
                  true,
                )}
                {(exp.title || exp.location) ? renderRow(exp.title, exp.location, false, true) : null}
                {renderBullets(exp.bullets)}
              </View>
            ))}
          </View>
        )
      }

      case "education": {
        const items = education.filter((e) => e.institution)
        if (!items.length) return null
        return (
          <View key="education">
            {renderSectionTitle("Education")}
            {items.map((edu, idx) => (
              <View key={edu.id} style={idx < items.length - 1 ? styles.entryBlock : undefined}>
                {renderRow(
                  edu.institution,
                  [edu.startDate, edu.endDate].filter(Boolean).join(" \u2013 "),
                  true,
                )}
                {(edu.degree || edu.field || edu.location) ? renderRow(
                  [edu.degree, edu.field].filter(Boolean).join(", ") + (edu.honors ? ` \u00b7 ${edu.honors}` : ""),
                  edu.location,
                  false,
                  true,
                ) : null}
                {edu.gpa ? <Text style={styles.gpaText}>GPA: {edu.gpa}</Text> : null}
              </View>
            ))}
          </View>
        )
      }

      case "skills": {
        const items = skills.filter((s) => s.skills.trim())
        if (!items.length) return null
        return (
          <View key="skills">
            {renderSectionTitle("Skills")}
            {items.map((cat) => (
              <View key={cat.id} style={styles.skillRow}>
                {cat.category ? <Text style={styles.skillLabel}>{cat.category}:</Text> : null}
                <Text style={styles.skillValue}>{cat.skills}</Text>
              </View>
            ))}
          </View>
        )
      }

      case "projects": {
        const items = projects.filter((p) => p.name)
        if (!items.length) return null
        return (
          <View key="projects">
            {renderSectionTitle("Projects")}
            {items.map((proj, idx) => (
              <View key={proj.id} style={idx < items.length - 1 ? styles.entryBlock : undefined}>
                <View style={styles.projHeader}>
                  <View style={styles.projNameRow}>
                    <Text style={styles.projName}>{proj.name}</Text>
                    {proj.liveUrl ? (
                      <Link
                        src={proj.liveUrl.startsWith("http") ? proj.liveUrl : `https://${proj.liveUrl}`}
                        style={styles.projLink}
                      >
                        [Live]
                      </Link>
                    ) : null}
                    {proj.repoUrl ? (
                      <Link
                        src={proj.repoUrl.startsWith("http") ? proj.repoUrl : `https://${proj.repoUrl}`}
                        style={styles.projLink}
                      >
                        [Code]
                      </Link>
                    ) : null}
                  </View>
                  {proj.dateRange ? <Text style={styles.projDate}>{proj.dateRange}</Text> : null}
                </View>
                {proj.techStack ? <Text style={styles.projTech}>{proj.techStack}</Text> : null}
                {renderBullets(proj.bullets)}
              </View>
            ))}
          </View>
        )
      }

      case "certifications": {
        const items = certifications.filter((c) => c.name)
        if (!items.length) return null
        return (
          <View key="certifications">
            {renderSectionTitle("Certifications")}
            {items.map((cert, idx) => (
              <View key={cert.id} style={[styles.certRow, idx === items.length - 1 ? { marginBottom: 0 } : {}]}>
                <Text style={styles.certLeft}>
                  <Text style={{ fontWeight: 700 }}>{cert.name}</Text>
                  {cert.issuer ? ` \u00b7 ${cert.issuer}` : ""}
                  {cert.credentialId ? ` \u00b7 ID: ${cert.credentialId}` : ""}
                </Text>
                {cert.date ? <Text style={styles.certRight}>{cert.date}</Text> : null}
              </View>
            ))}
          </View>
        )
      }

      default: return null
    }
  }

  const contactParts: string[] = []
  if (personal.email) contactParts.push(personal.email)
  if (personal.phone) contactParts.push(personal.phone)
  if (personal.location) contactParts.push(personal.location)
  if (personal.linkedin) contactParts.push(personal.linkedin.replace(/^https?:\/\/(www\.)?/i, ""))
  if (personal.github) contactParts.push(personal.github.replace(/^https?:\/\/(www\.)?/i, ""))
  if (personal.portfolio) contactParts.push(personal.portfolio.replace(/^https?:\/\/(www\.)?/i, ""))

  return (
    <Document title={personal.fullName || "Resume"} author={personal.fullName || undefined}>
      <Page size="A4" style={styles.page}>

        {personal.fullName && (
          <View style={styles.header}>
            <Text style={styles.headerName}>{personal.fullName}</Text>
            {personal.tagline ? <Text style={styles.headerTagline}>{personal.tagline}</Text> : null}
            {contactParts.length > 0 && (
              <View style={styles.headerContact}>
                {contactParts.map((p, i) => (
                  <React.Fragment key={p + i}>
                    {i > 0 ? <Text style={styles.contactSep}> | </Text> : null}
                    <Text>{p}</Text>
                  </React.Fragment>
                ))}
              </View>
            )}
            <View style={styles.headerRule} />
          </View>
        )}

        {sectionOrder.map((key) => renderSection(key))}

      </Page>
    </Document>
  )
}

// â”€â”€â”€ Route Handler â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export async function POST(req: NextRequest) {
  let body: { data: ResumeData; config: ResumeConfig }

  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const { data, config } = body

  if (!data || !config) {
    return NextResponse.json({ error: "Missing data or config" }, { status: 400 })
  }

  try {
    await registerFonts(config.font)

    const pdfBuffer = await renderToBuffer(<ResumePDF data={data} config={config} />)

    const fileName = data.personal.fullName
      ? `${data.personal.fullName.replace(/[^a-zA-Z0-9 ]/g, "").replace(/\s+/g, "_")}_Resume.pdf`
      : "Resume.pdf"

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "Cache-Control": "no-store",
      },
    })
  } catch (err: unknown) {
    console.error("[resume/download] PDF generation error:", err)
    const message = err instanceof Error ? err.message : "PDF generation failed"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
