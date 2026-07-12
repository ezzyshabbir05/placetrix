import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Link,
} from "@react-pdf/renderer";

// ─── Data types ───────────────────────────────────────────────────────────────

export interface ExperienceEntry {
  title: string;
  company: string;
  location?: string;
  startDate: string;
  endDate?: string;
  isCurrent: boolean;
  bullets: string[];
}

export interface EducationEntry {
  degree: string;
  institution: string;
  location?: string;
  year: string;
  grade?: string;
}

export interface ProjectEntry {
  title: string;
  technologies?: string;
  url?: string;
  description: string;
}

export interface CertificationEntry {
  name: string;
  issuer: string;
  date: string;
  url?: string;
}

export interface SkillGroup {
  category: string;
  skills: string;
}

export interface ResumeFormData {
  fullName: string;
  email: string;
  phone: string;
  location: string;
  linkedin: string;
  github: string;
  portfolio: string;
  summary: string;
  education: EducationEntry[];
  experience: ExperienceEntry[];
  projects: ProjectEntry[];
  certifications: CertificationEntry[];
  skillGroups: SkillGroup[];
}

// ─── Stylesheet ───────────────────────────────────────────────────────────────

const S = StyleSheet.create({
  page: {
    fontFamily: "Times-Roman",
    fontSize: 10,
    color: "#111",
    backgroundColor: "#ffffff",
    paddingHorizontal: 48,
    paddingVertical: 42,
  },

  // Header
  name: {
    fontFamily: "Times-Bold",
    fontSize: 20,
    textAlign: "center",
    letterSpacing: 0.4,
    marginBottom: 4,
  },
  contactRow: {
    flexDirection: "row",
    justifyContent: "center",
    flexWrap: "wrap",
    marginBottom: 10,
  },
  contactText: { fontFamily: "Times-Roman", fontSize: 9, color: "#222" },
  contactLink: { fontFamily: "Times-Roman", fontSize: 9, color: "#111", textDecoration: "none" },
  contactSep: { fontFamily: "Times-Roman", fontSize: 9, color: "#888", marginHorizontal: 4 },

  // Section
  section: { marginTop: 9 },
  sectionTitle: {
    fontFamily: "Times-Bold",
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 2,
    color: "#000",
  },
  rule: {
    borderBottomWidth: 0.75,
    borderBottomColor: "#000",
    borderBottomStyle: "solid",
    marginBottom: 5,
  },

  // Education / Experience rows
  itemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginTop: 4,
    marginBottom: 0,
  },
  itemTitle: { fontFamily: "Times-Bold", fontSize: 10, flex: 1 },
  itemDate: { fontFamily: "Times-Roman", fontSize: 9, color: "#444", textAlign: "right", minWidth: 72 },
  itemSubRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 1,
    marginBottom: 2,
  },
  itemSub: { fontFamily: "Times-Italic", fontSize: 9.5, color: "#333", flex: 1 },
  itemGrade: { fontFamily: "Times-Roman", fontSize: 9, color: "#444", textAlign: "right" },

  // Bullets
  bulletRow: { flexDirection: "row", paddingLeft: 8, marginTop: 1.5 },
  bulletDot: { fontFamily: "Times-Roman", fontSize: 10, width: 9, color: "#111", marginTop: 0.5 },
  bulletText: { fontFamily: "Times-Roman", fontSize: 9.5, flex: 1, lineHeight: 1.4, color: "#111" },

  // Projects
  projHeaderRow: { flexDirection: "row", alignItems: "baseline", marginTop: 4, marginBottom: 1, flexWrap: "wrap" },
  projTitle: { fontFamily: "Times-Bold", fontSize: 10 },
  projSep: { fontFamily: "Times-Roman", fontSize: 9.5, color: "#666", marginHorizontal: 3 },
  projTech: { fontFamily: "Times-Italic", fontSize: 9.5, color: "#333", flex: 1 },
  projLink: { fontFamily: "Times-Roman", fontSize: 9, color: "#000", textDecoration: "none" },

  // Certifications
  certRow: { flexDirection: "row", marginTop: 4, alignItems: "baseline" },
  certTitle: { fontFamily: "Times-Bold", fontSize: 9.5, flex: 1.5 },
  certIssuer: { fontFamily: "Times-Italic", fontSize: 9, color: "#444", flex: 1.5, textAlign: "center" },
  certDate: { fontFamily: "Times-Roman", fontSize: 9, color: "#555", textAlign: "right", flex: 0.7 },

  // Skills
  skillRow: { flexDirection: "row", marginTop: 3, flexWrap: "wrap" },
  skillCat: { fontFamily: "Times-Bold", fontSize: 9.5, color: "#000", marginRight: 4 },
  skillVal: { fontFamily: "Times-Roman", fontSize: 9.5, color: "#111", flex: 1 },

  // Summary
  summaryText: {
    fontFamily: "Times-Roman",
    fontSize: 9.5,
    lineHeight: 1.5,
    color: "#111",
    marginTop: 4,
    textAlign: "justify",
  },
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function Rule() {
  return <View style={S.rule} />;
}

function SectionTitle({ title }: { title: string }) {
  return (
    <>
      <Text style={S.sectionTitle}>{title}</Text>
      <Rule />
    </>
  );
}

function Bullet({ text }: { text: string }) {
  const clean = text.replace(/^[-•]\s*/, "").trim();
  if (!clean) return null;
  return (
    <View style={S.bulletRow}>
      <Text style={S.bulletDot}>{"\u2022"}</Text>
      <Text style={S.bulletText}>{clean}</Text>
    </View>
  );
}

type ContactItem =
  | { type: "text"; value: string }
  | { type: "link"; label: string; href: string };

function ContactRow({ items }: { items: ContactItem[] }) {
  if (items.length === 0) return null;
  return (
    <View style={S.contactRow}>
      {items.map((item, i) => (
        <React.Fragment key={i}>
          {i > 0 && <Text style={S.contactSep}>{" | "}</Text>}
          {item.type === "text"
            ? <Text style={S.contactText}>{item.value}</Text>
            : <Link src={item.href} style={S.contactLink}>{item.label}</Link>
          }
        </React.Fragment>
      ))}
    </View>
  );
}

// ─── Main Document ────────────────────────────────────────────────────────────

export function ResumePDFDocument({ data }: { data: ResumeFormData }) {
  const contactItems: ContactItem[] = [
    ...(data.email ? [{ type: "text" as const, value: data.email }] : []),
    ...(data.phone ? [{ type: "text" as const, value: data.phone }] : []),
    ...(data.location ? [{ type: "text" as const, value: data.location }] : []),
    ...(data.linkedin ? [{ type: "link" as const, label: "LinkedIn", href: data.linkedin.startsWith("http") ? data.linkedin : `https://${data.linkedin}` }] : []),
    ...(data.github ? [{ type: "link" as const, label: "GitHub", href: data.github.startsWith("http") ? data.github : `https://${data.github}` }] : []),
    ...(data.portfolio ? [{ type: "link" as const, label: "Portfolio", href: data.portfolio.startsWith("http") ? data.portfolio : `https://${data.portfolio}` }] : []),
  ];

  const hasEducation = data.education.some(e => e.degree || e.institution);
  const hasExperience = data.experience.some(e => e.title || e.company);
  const hasProjects = data.projects.some(p => p.title);
  const hasCerts = data.certifications.some(c => c.name);
  const hasSkills = data.skillGroups.some(g => g.skills.trim());

  return (
    <Document title={data.fullName || "Resume"} author="PlaceTrix">
      <Page size="A4" style={S.page}>

        {/* ── NAME ── */}
        <Text style={S.name}>{data.fullName || "Your Name"}</Text>

        {/* ── CONTACT ── */}
        <ContactRow items={contactItems} />

        {/* ── SUMMARY ── */}
        {data.summary.trim() && (
          <View style={S.section}>
            <SectionTitle title="Summary" />
            <Text style={S.summaryText}>{data.summary}</Text>
          </View>
        )}

        {/* ── EDUCATION ── */}
        {hasEducation && (
          <View style={S.section}>
            <SectionTitle title="Education" />
            {data.education.filter(e => e.degree || e.institution).map((edu, i) => (
              <View key={i}>
                <View style={S.itemRow}>
                  <Text style={S.itemTitle}>{edu.degree}</Text>
                  <Text style={S.itemDate}>{edu.year}</Text>
                </View>
                <View style={S.itemSubRow}>
                  <Text style={S.itemSub}>
                    {edu.institution}{edu.location ? `, ${edu.location}` : ""}
                  </Text>
                  {edu.grade ? <Text style={S.itemGrade}>{edu.grade}</Text> : null}
                </View>
              </View>
            ))}
          </View>
        )}

        {/* ── EXPERIENCE ── */}
        {hasExperience && (
          <View style={S.section}>
            <SectionTitle title="Experience" />
            {data.experience.filter(e => e.title || e.company).map((exp, i) => (
              <View key={i}>
                <View style={S.itemRow}>
                  <Text style={S.itemTitle}>{exp.title}</Text>
                  <Text style={S.itemDate}>
                    {exp.startDate}
                    {exp.startDate && (exp.isCurrent || exp.endDate) ? " \u2013 " : ""}
                    {exp.isCurrent ? "Present" : (exp.endDate ?? "")}
                  </Text>
                </View>
                <Text style={[S.itemSub, { marginBottom: 2 }]}>
                  {exp.company}{exp.location ? `, ${exp.location}` : ""}
                </Text>
                {exp.bullets
                  .filter(b => b.trim())
                  .map((b, j) => <Bullet key={j} text={b} />)
                }
              </View>
            ))}
          </View>
        )}

        {/* ── PROJECTS ── */}
        {hasProjects && (
          <View style={S.section}>
            <SectionTitle title="Projects" />
            {data.projects.filter(p => p.title).map((proj, i) => (
              <View key={i}>
                <View style={S.projHeaderRow}>
                  <Text style={S.projTitle}>{proj.title}</Text>
                  {proj.technologies ? (
                    <>
                      <Text style={S.projSep}>{" | "}</Text>
                      <Text style={S.projTech}>{proj.technologies}</Text>
                    </>
                  ) : <View style={{ flex: 1 }} />}
                  {proj.url ? (
                    <Link
                      src={proj.url.startsWith("http") ? proj.url : `https://${proj.url}`}
                      style={S.projLink}
                    >
                      [link]
                    </Link>
                  ) : null}
                </View>
                {proj.description
                  .split("\n")
                  .filter(l => l.trim())
                  .map((line, j) => <Bullet key={j} text={line} />)
                }
              </View>
            ))}
          </View>
        )}

        {/* ── CERTIFICATIONS ── */}
        {hasCerts && (
          <View style={S.section}>
            <SectionTitle title="Certifications" />
            {data.certifications.filter(c => c.name).map((cert, i) => (
              <View key={i} style={S.certRow}>
                <Text style={S.certTitle}>{cert.name}</Text>
                <Text style={S.certIssuer}>{cert.issuer}</Text>
                <Text style={S.certDate}>{cert.date}</Text>
              </View>
            ))}
          </View>
        )}

        {/* ── SKILLS ── */}
        {hasSkills && (
          <View style={S.section}>
            <SectionTitle title="Technical Skills" />
            {data.skillGroups.filter(g => g.skills.trim()).map((group, i) => (
              <View key={i} style={S.skillRow}>
                <Text style={S.skillCat}>{group.category}:</Text>
                <Text style={S.skillVal}>{group.skills}</Text>
              </View>
            ))}
          </View>
        )}

      </Page>
    </Document>
  );
}
