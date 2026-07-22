"use server"

import { redirect } from "next/navigation"
import { getUserProfile } from "@/lib/supabase/profile"
import { GoogleGenAI } from "@google/genai"

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

export interface Recommendation {
  title: string
  severity: "High" | "Medium" | "Low"
  feedback: string
  suggestion: string
  rewrite?: {
    before: string
    after: string
  }
}

export interface Verdict {
  headline: string
  summary: string
  topPriority: string
}

export interface QuickWin {
  title: string
  impact: "High" | "Medium" | "Low"
  action: string
  estimatedTime: string // e.g. "5 min", "15 min"
}

export interface FormatCheck {
  label: string
  status: "Passed" | "Failed" | "Warning"
  feedback: string
}

export interface LocalAnalysis {
  wordCount: number
  characterCount: number
  hasEmail: boolean
  hasPhone: boolean
  hasLinkedIn: boolean
  hasGitHub: boolean
}

export interface AnalysisResult {
  overallScore: number
  atsScore: number
  detectedIndustry: string
  experienceLevel: "Entry" | "Mid" | "Senior"
  verdict: Verdict
  strengths: string[]
  recommendations: Recommendation[]
  quickWins: QuickWin[]
  formatChecks: FormatCheck[]
  suggestedKeywords: string[]
  detectedSkills: string[]
  localAnalysis: LocalAnalysis
  jdMatchScore?: number
  missingSkills?: string[]
  fileName: string
  analyzedAt: string
}

// ─────────────────────────────────────────────
// Text extraction helpers
// ─────────────────────────────────────────────

async function extractPdfText(buffer: Buffer): Promise<string> {
  // pdf-parse is CJS — dynamically require to avoid ESM issues
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pdfParse = require("pdf-parse")
  const data = await pdfParse(buffer)
  return data.text as string
}

async function extractDocxText(buffer: Buffer): Promise<string> {
  const mammoth = await import("mammoth")
  const result = await mammoth.extractRawText({ buffer })
  return result.value
}

// ─────────────────────────────────────────────
// Local analysis helpers (non-AI text scanning)
// ─────────────────────────────────────────────

function performLocalAnalysis(text: string): LocalAnalysis {
  const words = text.split(/\s+/).filter(Boolean)
  const wordCount = words.length
  const characterCount = text.length

  const hasEmail = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/.test(text)
  const hasPhone = /(?:\+?\d{1,3}[-.\s]?)?\(?\d{3,4}\)?[-.\s]?\d{3}[-.\s]?\d{4}/.test(text)
  const hasLinkedIn = /linkedin\.com\/in\/[a-zA-Z0-9_-]+/i.test(text)
  const hasGitHub = /github\.com\/[a-zA-Z0-9_-]+/i.test(text)

  return {
    wordCount,
    characterCount,
    hasEmail,
    hasPhone,
    hasLinkedIn,
    hasGitHub,
  }
}

// ─────────────────────────────────────────────
// Main server action
// ─────────────────────────────────────────────

export async function analyzeResumeAction(formData: FormData): Promise<AnalysisResult> {
  const profile = await getUserProfile()
  if (!profile) redirect("/auth/login")

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) throw new Error("AI analysis is not configured. GEMINI_API_KEY is missing.")

  const file = formData.get("file") as File | null
  const jobDescription = (formData.get("jobDescription") as string) || ""

  if (!file) throw new Error("No file provided.")

  const allowedTypes = [
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ]
  if (!allowedTypes.includes(file.type)) {
    throw new Error("Only PDF and DOCX files are supported.")
  }
  if (file.size > 5 * 1024 * 1024) {
    throw new Error("File size must be under 5 MB.")
  }

  // Extract text
  const arrayBuffer = await file.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)

  let resumeText: string
  if (file.type === "application/pdf") {
    resumeText = await extractPdfText(buffer)
  } else {
    resumeText = await extractDocxText(buffer)
  }

  if (!resumeText.trim())
    throw new Error("Could not extract text from the file. Please try a different file.")

  // Non-AI Clean: Spacing normalization, strip multiple blank lines and spaces to save tokens
  const cleanedText = resumeText
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/\n{3,}/g, "\n\n") // Max 2 consecutive newlines
    .replace(/[ \t]+/g, " ")     // Max 1 space
    .trim()

  const localAnalysis = performLocalAnalysis(cleanedText)
  const hasJD = jobDescription.trim().length > 20

  const ai = new GoogleGenAI({ apiKey })

  const systemPrompt = `You are a world-class resume strategist with 15+ years at FAANG companies. You combine ATS parsing mechanics with hiring manager psychology.

VALIDATION:
- A valid resume must contain at least TWO of: contact info, work experience, education, skills, or projects.
- If the text is NOT a professional resume or CV, return overallScore: 0, atsScore: 0, and verdict.headline: "INVALID_RESUME".

SCORING STANDARDS (strictly FAANG hiring-manager caliber):
- 0-30=Critical (missing standard sections or unreadable format).
- 31-50=Below average (very weak verb choices, zero quantified metrics, poor structure).
- 51-65=Average (solid content, but duties-focused rather than results-focused, standard layout).
- 66-80=Good (clean format, some action verbs, metrics included but could be stronger).
- 81-90=Very strong (quantified impact throughout, clear hierarchy, optimized tech alignment).
- 91-100=Exceptional (flawless alignment, strong STAR storytelling, clear business value metrics).
- A decent but generic resume scores around 55. A score above 85 requires exceptional metrics and impact storytelling.

ATS COMPATIBILITY SCORE (atsScore) RULES:
- The atsScore must reflect layout parse-ability and standard conventions.
- If ANY Format Check is flagged as "Failed", the atsScore MUST be capped under 50.
- If ANY Format Check is flagged as "Warning", or if the resume text is missing standard contact details (LinkedIn link, GitHub link, Email, or Phone), the atsScore MUST be capped under 70.
- Only resumes with single-column layouts, standard headers, and complete, clickable links can score above 85 in atsScore.

CONTENT CRITIQUE & PSYCHOLOGY GUIDELINES:
- Weak Verbs: Scan for weak phrasing (e.g., "helped", "assisted", "responsible for", "worked on", "handled"). Recommend replacements with strong action verbs (e.g., "engineered", "orchestrated", "spearheaded", "accelerated").
- Quantification: Flag any work experience bullets or projects that describe tasks without metrics (%, $, time saved, users reached).
- Specificity Rule: All recommendations must target specific lines, roles, or sections in this resume. Do not write generic or boilerplate advice.

FORMAT AUDIT GUIDELINES (Greenhouse/Workday standard parser check):
- Column Layout: Scan if text interleaving suggests multi-column format (which standard parser reads out of order).
- Contact Info: Verify contact details (email, phone, LinkedIn/GitHub links). Note: contact info placed in header/footer containers is often skipped by parsers.
- File Structure: Ensure standard section headers (Experience, Education, Skills, Projects) are present. Non-standard titles (e.g., "Things I Do", "My Story") break section indexing.
- Font & Styles: Check for decorative icons, tables, custom emojis, or non-unicode characters that break parser tokenization.

RULES:
- Recommendations: Focus on the 3 to 5 most critical items. Include title, severity, feedback, suggestion, and concrete before/after rewrite examples.
- Strengths: Highlight 2-3 genuine strengths (e.g., "Good balance of action verbs in current role", "Clear technical skills grouping").
- Quick Wins: Provide 2-3 concrete fixes taking under 10 minutes (e.g., "Move LinkedIn link out of the header block", "Replace passive verbs in Project 1").
- Format Checks: Evaluate Column Layout, Contact Headers, File Structure, and Symbol/Font scan.
- Keywords: Detect technical skills and suggest high-value missing industry keywords.

Output ONLY a single raw JSON object matching the JSON schema. No markdown code blocks, no trailing comments, no extra text.`

  const userPrompt = `Analyze this resume and return a JSON object with this exact structure:

{
  "overallScore": 0,
  "atsScore": 0,
  "detectedIndustry": "e.g. Software Engineering",
  "experienceLevel": "Entry or Mid or Senior",
  "verdict": {
    "headline": "One-line summary of biggest strength vs biggest gap",
    "summary": "2-3 sentences about the overall resume quality and trajectory",
    "topPriority": "The single most critical action item to take right now"
  },
  "strengths": [
    "Cite strength 1",
    "Cite strength 2"
  ],
  "recommendations": [
    {
      "title": "Clear action title",
      "severity": "High",
      "feedback": "Pinpoint what is wrong or missing",
      "suggestion": "Specific instructions on how to fix it",
      "rewrite": {
        "before": "Original text/bullet from the resume",
        "after": "Optimized, impact-driven FAANG-standard version"
      }
    }
  ],
  "quickWins": [
    {
      "title": "Add Profile Links",
      "impact": "High",
      "action": "Include hyperlinked LinkedIn or GitHub URLs in header.",
      "estimatedTime": "5 min"
    }
  ],
  "formatChecks": [
    {
      "label": "Layout Scan",
      "status": "Passed",
      "feedback": "Single-column format parsing is clear and standard."
    }
  ],
  "suggestedKeywords": ["missing industry term 1", "missing industry term 2"],
  "detectedSkills": ["skill 1", "skill 2"]${
    hasJD
      ? `,
  "jdMatchScore": 0,
  "missingSkills": ["missing skill 1", "missing skill 2"]`
      : ""
  }
}

RESUME TEXT:
${cleanedText}${
  hasJD
    ? `

JOB DESCRIPTION:
${jobDescription.trim()}

Focus suggestions on bridging the gap between this resume and the target Job Description requirements.`
    : ""
}`

  const config = {
    systemInstruction: systemPrompt,
    temperature: 0.1,
    maxOutputTokens: 8192,
    responseMimeType: "application/json",
    responseSchema: {
      type: "object",
      properties: {
        overallScore: { type: "integer" },
        atsScore: { type: "integer" },
        detectedIndustry: { type: "string" },
        experienceLevel: { type: "string", enum: ["Entry", "Mid", "Senior"] },
        verdict: {
          type: "object",
          properties: {
            headline: { type: "string" },
            summary: { type: "string" },
            topPriority: { type: "string" }
          },
          required: ["headline", "summary", "topPriority"]
        },
        strengths: {
          type: "array",
          items: { type: "string" }
        },
        recommendations: {
          type: "array",
          items: {
            type: "object",
            properties: {
              title: { type: "string" },
              severity: { type: "string", enum: ["High", "Medium", "Low"] },
              feedback: { type: "string" },
              suggestion: { type: "string" },
              rewrite: {
                type: "object",
                properties: {
                  before: { type: "string" },
                  after: { type: "string" }
                },
                required: ["before", "after"]
              }
            },
            required: ["title", "severity", "feedback", "suggestion"]
          }
        },
        quickWins: {
          type: "array",
          items: {
            type: "object",
            properties: {
              title: { type: "string" },
              impact: { type: "string", enum: ["High", "Medium", "Low"] },
              action: { type: "string" },
              estimatedTime: { type: "string" }
            },
            required: ["title", "impact", "action", "estimatedTime"]
          }
        },
        formatChecks: {
          type: "array",
          items: {
            type: "object",
            properties: {
              label: { type: "string" },
              status: { type: "string", enum: ["Passed", "Failed", "Warning"] },
              feedback: { type: "string" }
            },
            required: ["label", "status", "feedback"]
          }
        },
        suggestedKeywords: {
          type: "array",
          items: { type: "string" }
        },
        detectedSkills: {
          type: "array",
          items: { type: "string" }
        },
        jdMatchScore: { type: "integer" },
        missingSkills: {
          type: "array",
          items: { type: "string" }
        }
      },
      required: [
        "overallScore",
        "atsScore",
        "detectedIndustry",
        "experienceLevel",
        "verdict",
        "strengths",
        "recommendations",
        "quickWins",
        "formatChecks",
        "suggestedKeywords",
        "detectedSkills"
      ]
    }
  }

  const MODEL_FALLBACK_CHAIN = [
    "gemini-2.5-flash",
    "gemini-2.0-flash",
    "gemini-1.5-flash",
    "gemini-2.5-pro",
    "gemini-1.5-pro",
  ]
  let content = ""
  let lastError: unknown

  for (const model of MODEL_FALLBACK_CHAIN) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: userPrompt,
        config: config as any,
      })
      content = response.text ?? ""
      if (content) break
    } catch (err) {
      lastError = err
      console.warn(`[analyzeResumeAction] ${model} failed, trying fallback:`, err)
    }
  }

  if (!content) {
    throw lastError || new Error("Failed to analyze resume with any AI model.")
  }

  let parsed: Omit<AnalysisResult, "fileName" | "analyzedAt">
  try {
    let cleanContent = content.trim()
    if (cleanContent.startsWith("```")) {
      cleanContent = cleanContent.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "").trim()
    }
    const jsonMatch = cleanContent.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error("No JSON found in AI response")
    parsed = JSON.parse(jsonMatch[0])
  } catch (parseErr) {
    console.error("[analyzeResumeAction] Failed to parse AI response JSON:", parseErr, "Raw content preview:", content.slice(0, 500))
    throw new Error("AI returned an invalid response. Please try again.")
  }

  // Handle invalid resume detection
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rawVerdict = parsed.verdict as any
  const verdictHeadline = typeof rawVerdict === "object" ? rawVerdict?.headline : rawVerdict
  if (verdictHeadline === "INVALID_RESUME" || (parsed.overallScore === 0 && parsed.atsScore === 0)) {
    throw new Error("The uploaded file does not appear to be a professional resume or CV. Please upload a valid resume containing typical sections like education, experience, or skills.")
  }

  // Normalize verdict if model returned a string
  if (typeof rawVerdict === "string") {
    parsed.verdict = {
      headline: rawVerdict.split(".")[0] || rawVerdict,
      summary: rawVerdict,
      topPriority: "Review the key suggestions below for specific improvement areas.",
    }
  }

  // Programmatic scoring adjustments to prevent unnecessarily inflated scores
  let finalAtsScore = parsed.atsScore
  const hasFailedChecks = parsed.formatChecks.some((c) => c.status === "Failed")
  const hasWarningChecks = parsed.formatChecks.some((c) => c.status === "Warning")

  const missingLinksCount = [
    localAnalysis.hasEmail,
    localAnalysis.hasPhone,
    localAnalysis.hasLinkedIn,
    localAnalysis.hasGitHub,
  ].filter((present) => !present).length

  if (hasFailedChecks) {
    finalAtsScore = Math.min(finalAtsScore, 48)
  } else if (hasWarningChecks || missingLinksCount >= 2) {
    finalAtsScore = Math.min(finalAtsScore, 68)
  } else if (missingLinksCount === 1) {
    finalAtsScore = Math.min(finalAtsScore, 78)
  }

  // Ensure overallScore is adjusted if ATS score dragged it down
  let finalOverallScore = parsed.overallScore
  if (finalAtsScore < 50) {
    finalOverallScore = Math.min(finalOverallScore, 55)
  } else if (finalAtsScore < 70) {
    finalOverallScore = Math.min(finalOverallScore, 70)
  }

  parsed.atsScore = finalAtsScore
  parsed.overallScore = finalOverallScore

  return {
    ...parsed,
    localAnalysis,
    fileName: file.name,
    analyzedAt: new Date().toISOString(),
  }
}
