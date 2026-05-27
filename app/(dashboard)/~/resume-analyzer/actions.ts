"use server"

import OpenAI from "openai"
import { getUserProfile as getUser } from "@/lib/supabase/profile"
import { after } from "next/server"

// ─── Types ────────────────────────────────────────────────────────────────────

export type ResumeAnalysisResult = {
  atsScore: number
  matchSummary: string
  keywordAnalysis: { matched: string[]; missing: string[] }
  skillGap: { technical: string[]; tools: string[]; soft: string[] }
  sectionFeedback: {
    structure: string
    projects: string
    experience: string
    skills: string
  }
  improvements: string[]
  improvedBullets: string[]
  finalVerdict: { shortlist: boolean; reason: string }
}

// ─── Model fallback chain (Groq) ──────────────────────────────────────────────

const MODEL_FALLBACK_CHAIN: readonly string[] = Object.freeze([
  "llama-3.3-70b-versatile",
  "moonshotai/kimi-k2-instruct-0905",
  "qwen/qwen3-32b",
  "openai/gpt-oss-120b",
  "meta-llama/llama-4-scout-17b-16e-instruct",
  "openai/gpt-oss-20b",
  "llama-3.1-8b-instant",
])

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isRetryableOnNextModel(err: unknown): boolean {
  if (err instanceof Error) {
    const msg = err.message.toLowerCase()
    return /429|rate.?limit|too many|quota|503|502|overloaded|timeout/.test(msg)
  }
  return false
}

function stripCodeFences(text: string): string {
  return text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "")
    .trim()
}

// ─── PDF text extraction ──────────────────────────────────────────────────────

async function extractPdfText(buffer: Buffer): Promise<string> {
  // pdf-parse v1 — simple CJS default-function, no worker, works in Next.js server actions.
  const pdfParse = (await import("pdf-parse")).default
  const data = await pdfParse(buffer)
  return data.text
}

// ─── Main action ──────────────────────────────────────────────────────────────

export async function analyzeResumeAction(
  formData: FormData
): Promise<ResumeAnalysisResult> {
  const user = await getUser()
  if (!user) throw new Error("Unauthorized")

  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) throw new Error("AI analysis is not configured. GROQ_API_KEY is missing.")

  // 1. Extract inputs
  const file = formData.get("resume") as File | null
  const jobDescription = (formData.get("jobDescription") as string)?.trim()

  if (!file || file.size === 0) throw new Error("Please upload a resume PDF.")
  if (!jobDescription) throw new Error("Please provide a job description.")

  if (file.size > 5 * 1024 * 1024) {
    throw new Error("File too large. Please upload a PDF under 5 MB.")
  }

  // 2. Extract text from PDF
  const arrayBuffer = await file.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)
  let resumeText: string

  try {
    resumeText = await extractPdfText(buffer)
  } catch (pdfErr) {
    console.error("[extractPdfText] PDF parsing failed:", pdfErr)
    throw new Error(
      "Failed to read the PDF. Please ensure it's a valid, text-based PDF (not a scanned image)."
    )
  }

  if (resumeText.trim().length < 50) {
    throw new Error(
      "Could not extract enough text from the PDF. It may be scanned or image-based."
    )
  }

  // Truncate extremely long resumes to avoid token limits
  const MAX_CHARS = 12000
  const trimmedResume =
    resumeText.length > MAX_CHARS
      ? resumeText.slice(0, MAX_CHARS) + "\n[… truncated]"
      : resumeText

  // 3. Build prompts
  const groq = new OpenAI({
    baseURL: "https://api.groq.com/openai/v1",
    apiKey,
  })

  const systemPrompt = `You are an expert ATS (Applicant Tracking System) evaluator and career advisor with deep knowledge of modern hiring practices, resume optimization, and ATS algorithms.

Analyze the provided resume against the given job description and return a precise, structured JSON evaluation.

STRICT RULES:
1. atsScore must be an integer 0–100 reflecting genuine ATS compatibility (keyword density, format, relevance).
2. matchSummary should be 2–3 concise sentences summarizing resume-JD fit.
3. keywordAnalysis.matched: keywords/phrases from the JD that ARE present in the resume.
4. keywordAnalysis.missing: important keywords/phrases from the JD that are ABSENT.
5. skillGap: categorize missing skills into "technical" (programming, frameworks, methodologies), "tools" (software, platforms, services), and "soft" (communication, leadership, etc.).
6. sectionFeedback: evaluate each resume section's quality in 1–2 sentences — be specific, not generic.
7. improvements: provide 5–8 specific, actionable suggestions (not generic advice like "use keywords").
8. improvedBullets: rewrite 2–3 weak bullet points from the resume into strong, quantified achievement statements.
9. finalVerdict.shortlist: true if atsScore >= 65 AND no critical skill gaps; false otherwise.
10. finalVerdict.reason: 1–2 sentences explaining the verdict.

Your response MUST be a raw JSON object — no markdown, no code fences, no extra text.
It must follow this exact shape:
{
  "atsScore": number,
  "matchSummary": "string",
  "keywordAnalysis": { "matched": ["string"], "missing": ["string"] },
  "skillGap": { "technical": ["string"], "tools": ["string"], "soft": ["string"] },
  "sectionFeedback": { "structure": "string", "projects": "string", "experience": "string", "skills": "string" },
  "improvements": ["string"],
  "improvedBullets": ["string"],
  "finalVerdict": { "shortlist": true|false, "reason": "string" }
}`

  const userPrompt = `=== RESUME ===
${trimmedResume}

=== JOB DESCRIPTION ===
${jobDescription}

Analyze this resume against the job description. Return the structured JSON evaluation.`

  // 4. Call AI with fallback chain
  const attemptWithModel = async (
    model: string
  ): Promise<ResumeAnalysisResult> => {
    const response = await groq.chat.completions.create({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: { type: "json_object" },
      temperature: 0.3,
      top_p: 0.9,
    })

    const raw = response.choices[0]?.message?.content
    if (!raw) throw new Error("Empty response from AI.")

    const text = stripCodeFences(raw)
    const parsed = JSON.parse(text)

    // Validate essential fields
    if (
      typeof parsed.atsScore !== "number" ||
      !parsed.matchSummary ||
      !parsed.keywordAnalysis ||
      !parsed.finalVerdict
    ) {
      throw new Error("AI returned an incomplete analysis. Please try again.")
    }

    return {
      atsScore: Math.max(0, Math.min(100, Math.round(parsed.atsScore))),
      matchSummary: String(parsed.matchSummary),
      keywordAnalysis: {
        matched: Array.isArray(parsed.keywordAnalysis?.matched)
          ? parsed.keywordAnalysis.matched.map(String)
          : [],
        missing: Array.isArray(parsed.keywordAnalysis?.missing)
          ? parsed.keywordAnalysis.missing.map(String)
          : [],
      },
      skillGap: {
        technical: Array.isArray(parsed.skillGap?.technical)
          ? parsed.skillGap.technical.map(String)
          : [],
        tools: Array.isArray(parsed.skillGap?.tools)
          ? parsed.skillGap.tools.map(String)
          : [],
        soft: Array.isArray(parsed.skillGap?.soft)
          ? parsed.skillGap.soft.map(String)
          : [],
      },
      sectionFeedback: {
        structure: String(parsed.sectionFeedback?.structure ?? "No feedback available."),
        projects: String(parsed.sectionFeedback?.projects ?? "No feedback available."),
        experience: String(parsed.sectionFeedback?.experience ?? "No feedback available."),
        skills: String(parsed.sectionFeedback?.skills ?? "No feedback available."),
      },
      improvements: Array.isArray(parsed.improvements)
        ? parsed.improvements.map(String)
        : [],
      improvedBullets: Array.isArray(parsed.improvedBullets)
        ? parsed.improvedBullets.map(String)
        : [],
      finalVerdict: {
        shortlist: !!parsed.finalVerdict?.shortlist,
        reason: String(parsed.finalVerdict?.reason ?? ""),
      },
    }
  }

  let lastError: unknown

  async function tryModelIndex(index: number): Promise<ResumeAnalysisResult> {
    if (index >= MODEL_FALLBACK_CHAIN.length) {
      console.error("[analyzeResumeAction] All models exhausted.", lastError)
      throw new Error(
        lastError instanceof Error
          ? `Analysis failed: ${lastError.message}`
          : "Failed to analyze resume. Please try again."
      )
    }

    const model = MODEL_FALLBACK_CHAIN[index]
    try {
      return await attemptWithModel(model)
    } catch (err) {
      lastError = err

      if (isRetryableOnNextModel(err)) {
        after(() => {
          console.warn(
            `[analyzeResumeAction] ${model} rate-limited/unavailable, trying fallback…`
          )
        })
        return tryModelIndex(index + 1)
      }

      // Non-rate-limit error: retry once on same model
      try {
        return await attemptWithModel(model)
      } catch (retryErr) {
        lastError = retryErr
        after(() => {
          console.warn(
            `[analyzeResumeAction] ${model} retry failed, trying fallback…`
          )
        })
        return tryModelIndex(index + 1)
      }
    }
  }

  return tryModelIndex(0)
}
