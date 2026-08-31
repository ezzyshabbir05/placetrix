"use server"

import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { getUserProfile } from "@/lib/supabase/profile"
import { getFriendlyErrorMessage } from "@/lib/errors"
import { GoogleGenAI } from "@google/genai"

// --- Shared types ---
export type SettingsForm = {
  title: string
  description: string
  instructions: string
  time_limit_minutes: string
  available_from: string
  available_until: string
  shuffle_questions: boolean
  shuffle_options: boolean
  strict_mode: boolean
  pass_percentage: string
  cohort_ids?: string[]
}

export type OptionForm = {
  _key: string
  option_text: string
  is_correct: boolean
}

export type LocalSection = {
  id: string
  name: string
  description: string
  order_index: number
}

export type SectionForm = {
  name: string
  description: string
}

export type LocalQuestion = {
  id: string
  question_text: string
  question_type: "single_correct" | "multiple_correct"
  marks: number
  order_index: number
  tag_names: string[]
  options: OptionForm[]
  explanation: string
  section_id: string | null
}

export type QuestionForm = {
  question_text: string
  question_type: "single_correct" | "multiple_correct"
  marks: number
  explanation: string
  options: OptionForm[]
  tag_names: string[]
}

export type AiGenerateForm = {
  topic: string
  count: string
  difficulty: "easy" | "medium" | "hard"
  question_type: "single_correct" | "multiple_correct" | "mixed"
}

export type InitialTestData = {
  settings: SettingsForm
  questions: LocalQuestion[]
  sections: LocalSection[]
  status: "draft" | "published"
}

export type GenerateQuestionsResult = {
  questions?: QuestionForm[]
  generatedWith?: string
  error?: string
}

// --- Database Helpers ---
async function saveTestToDb(
  testId: string,
  userId: string,
  settings: SettingsForm,
  questions: LocalQuestion[],
  sections: LocalSection[],
  status: "draft" | "published"
): Promise<void> {
  const supabase = await createClient()

  const { error } = await (supabase as any).rpc("test_save", {
    p_test_id: testId,
    p_settings: {
      title: settings.title.trim(),
      description: settings.description.trim() || null,
      instructions: settings.instructions.trim() || null,
      time_limit_seconds: settings.time_limit_minutes
        ? Math.round(parseFloat(settings.time_limit_minutes) * 60)
        : null,
      available_from: settings.available_from || null,
      available_until: settings.available_until || null,
      shuffle_questions: settings.shuffle_questions,
      shuffle_options: settings.shuffle_options,
      strict_mode: settings.strict_mode,
      pass_percentage: settings.pass_percentage ? parseFloat(settings.pass_percentage) : null,
    },
    p_questions: questions.map((q) => ({
      id: q.id,
      question_text: q.question_text,
      question_type: q.question_type,
      marks: q.marks,
      explanation: q.explanation?.trim() || null,
      tag_names: q.tag_names,
      section_id: q.section_id || null,
      options: q.options.map((opt) => ({
        id: opt._key,
        option_text: opt.option_text,
        is_correct: opt.is_correct,
      })),
    })),
    p_status: status,
    p_sections: sections.length > 0
      ? sections.map((s) => ({
          id: s.id,
          name: s.name.trim(),
          description: s.description?.trim() || null,
        }))
      : null,
  })

  if (error) {
    console.error("[TEST_SAVE] Supabase RPC error:", error)
    throw new Error(getFriendlyErrorMessage(error, "Failed to save the test. Please try again."))
  }
}

async function requireAuth(): Promise<string> {
  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()
  const user = data?.claims
  if (!user) throw new Error("Not authenticated")
  return user.sub as string
}

export async function loadTestAction(
  testId: string
): Promise<InitialTestData | null> {
  const profile = await getUserProfile()
  if (!profile || (profile.account_type !== "institute_primary" && profile.account_type !== "institute_staff" && profile.account_type !== "institute_placement_officer")) {
    throw new Error("Unauthorized")
  }
  const supabase = await createClient()

  const [{ data: test }, { data: cohorts }, { data: rawSections }] = await Promise.all([
    (supabase as any)
      .from("tests")
      .select(`
        title, description, instructions,
        time_limit_seconds, available_from, available_until, status,
        shuffle_questions, shuffle_options, strict_mode, pass_percentage,
        test_questions (
          id, question_text, question_type, marks, order_index, explanation, section_id,
          test_question_options ( id, option_text, is_correct, order_index ),
          question_tags ( test_question_tags ( id, name ) )
        )
      `)
      .eq("id", testId)
      .eq("institute_id", profile.institute_id)
      .maybeSingle(),
    (supabase as any)
      .from("test_cohorts")
      .select("cohort_id")
      .eq("test_id", testId),
    (supabase as any)
      .from("test_sections")
      .select("id, name, description, order_index")
      .eq("test_id", testId)
      .order("order_index"),
  ])

  if (!test) return null

  const cohortIds = (cohorts ?? []).map((c: any) => c.cohort_id)

  return {
    settings: {
      title: test.title ?? "",
      description: test.description ?? "",
      instructions: test.instructions ?? "",
      time_limit_minutes: test.time_limit_seconds
        ? String(test.time_limit_seconds / 60)
        : "",
      available_from: test.available_from ?? "",
      available_until: test.available_until ?? "",
      shuffle_questions: test.shuffle_questions ?? false,
      shuffle_options: test.shuffle_options ?? false,
      strict_mode: test.strict_mode ?? false,
      pass_percentage: test.pass_percentage != null ? String(test.pass_percentage) : "",
      cohort_ids: cohortIds,
    },
    status: test.status as "draft" | "published",
    sections: (rawSections ?? []).map((s: any) => ({
      id: s.id,
      name: s.name,
      description: s.description ?? "",
      order_index: s.order_index,
    })),
    questions: (test.test_questions ?? [])
      .sort((a: any, b: any) => a.order_index - b.order_index)
      .map((q: any) => ({
        id: q.id,
        question_text: q.question_text,
        question_type: q.question_type,
        marks: q.marks,
        order_index: q.order_index,
        explanation: q.explanation ?? "",
        section_id: q.section_id ?? null,
        tag_names: (q.question_tags ?? [])
          .map((qt: any) => qt.test_question_tags?.name)
          .filter(Boolean),
        options: (q.test_question_options ?? [])
          .sort((a: any, b: any) => a.order_index - b.order_index)
          .map((o: any) => ({
            _key: o.id,
            option_text: o.option_text,
            is_correct: o.is_correct,
          })),
      })),
  }
}

async function requireTestManager() {
  const profile = await getUserProfile()
  if (!profile) throw new Error("Unauthorized: Please log in.")
  if (
    !["institute_primary", "institute_staff", "institute_placement_officer"].includes(
      profile.account_type
    )
  ) {
    throw new Error("Unauthorized: Only institute staff can manage tests.")
  }
  if (!profile.institute_id) throw new Error("No institute associated with your profile.")
  return profile
}

export async function saveDraftAction(
  testId: string,
  settings: SettingsForm,
  questions: LocalQuestion[],
  sections: LocalSection[]
): Promise<void> {
  const profile = await requireTestManager()
  const supabase = await createClient()

  // Verify cohort IDs belong to caller's institute
  if (settings.cohort_ids && settings.cohort_ids.length > 0) {
    const { data: cohorts, error: cohortError } = await (supabase as any)
      .from("cohorts")
      .select("id")
      .in("id", settings.cohort_ids)
      .eq("institute_id", profile.institute_id)

    if (cohortError || !cohorts || cohorts.length !== settings.cohort_ids.length) {
      throw new Error("Invalid cohorts selected.")
    }
  }

  await saveTestToDb(testId, profile.id, settings, questions, sections, "draft")
  // Save cohort mappings for draft too (optional, replaces)
  await (supabase as any).from("test_cohorts").delete().eq("test_id", testId)
  if (settings.cohort_ids && settings.cohort_ids.length > 0) {
    await (supabase as any).from("test_cohorts").insert(
      settings.cohort_ids.map((cohortId) => ({ test_id: testId, cohort_id: cohortId }))
    )
  }
  revalidatePath("/tests")
}

export async function publishTestAction(
  testId: string,
  settings: SettingsForm,
  questions: LocalQuestion[],
  sections: LocalSection[]
): Promise<void> {
  const profile = await requireTestManager()
  if (!settings.title.trim()) throw new Error("Title is required.")
  if (questions.length === 0) throw new Error("Add at least one question.")
  if (!settings.cohort_ids || settings.cohort_ids.length === 0) {
    throw new Error("Please select at least one cohort before publishing this test.")
  }

  const supabase = await createClient()

  // Verify cohort IDs belong to caller's institute
  const { data: cohorts, error: cohortError } = await (supabase as any)
    .from("cohorts")
    .select("id")
    .in("id", settings.cohort_ids)
    .eq("institute_id", profile.institute_id)

  if (cohortError || !cohorts || cohorts.length !== settings.cohort_ids.length) {
    throw new Error("Invalid cohorts selected.")
  }

  // Group G Correctness check: Ensure each question has at least one correct option
  for (let i = 0; i < questions.length; i++) {
    const q = questions[i]
    const hasCorrect = q.options.some((o) => o.is_correct)
    if (!hasCorrect) {
      throw new Error(`Question ${i + 1} ("${q.question_text.slice(0, 40)}...") has no correct options defined. Please mark at least one option as correct.`)
    }
  }

  await saveTestToDb(testId, profile.id, settings, questions, sections, "published")

  // Replace test cohort mappings
  await (supabase as any).from("test_cohorts").delete().eq("test_id", testId)
  if (settings.cohort_ids && settings.cohort_ids.length > 0) {
    const { error: cohortInsError } = await (supabase as any).from("test_cohorts").insert(
      settings.cohort_ids.map((cohortId) => ({ test_id: testId, cohort_id: cohortId }))
    )
    if (cohortInsError) {
      console.error("[TEST_SAVE] Cohort insert error:", cohortInsError)
    }
  }

  revalidatePath("/tests")
  redirect(`/tests/${testId}`)
}

// ─── AI Question Generation ───────────────────────────────────────────────────

const DIFFICULTY_MARKS: Record<AiGenerateForm["difficulty"], number> = Object.freeze({
  easy: 1,
  medium: 1,
  hard: 1,
})

const MODEL_FALLBACK_CHAIN: readonly string[] = Object.freeze([
  "gemini-3.5-flash",
  "gemini-3.1-flash-lite",
  "gemini-2.5-flash",
  "gemini-2.0-flash",
  "gemini-1.5-flash",
  "gemini-1.5-flash-8b",
  "gemini-1.5-pro",
])

function isRetryableOnNextModel(err: unknown): boolean {
  if (err instanceof Error) {
    const msg = err.message.toLowerCase()
    return /429|rate.?limit|too many|quota|503|502|504|overloaded|404|not found|no longer available|deprecated|400|invalid/.test(msg)
  }
  return true
}

async function withRetry<T>(fn: () => Promise<T>, retries = 2, baseDelayMs = 600): Promise<T> {
  let lastErr: unknown
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn()
    } catch (err) {
      lastErr = err
      if (attempt < retries) {
        const delay = baseDelayMs * Math.pow(2, attempt)
        await new Promise((r) => setTimeout(r, delay))
      }
    }
  }
  throw lastErr
}

function stripCodeFences(text: string): string {
  return text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "")
    .trim()
}

function cleanAiString(input: any): string {
  if (!input) return ""
  let str = String(input).trim()

  // Replace literal \n with actual newlines
  str = str.replace(/\\n/g, "\n")

  // Clean backslashes prepended to percentage & currency numbers
  str = str.replace(/\\%\$\\?/g, "%")
  str = str.replace(/\\%\$/g, "%")
  str = str.replace(/\\%\\(?=\s|$|[^\w])/g, "%")

  // Currency backslash artifacts: \$1,500,000 → $1,500,000
  str = str.replace(/\\+\$(\d{1,3}(?:,\d{3})*|\d+)/g, "$$$1")

  // Convert legacy LaTeX delimiters \( ... \) -> $ ... $ and \[ ... \] -> $$ ... $$
  str = str.replace(/\\\\/g, "_DOUBLE_BACKSLASH_") // protect \\\\ first
  str = str.replace(/\\\[([\s\S]*?)\\\]/g, "$$$$$1$$$$")
  str = str.replace(/\\\(([\s\S]*?)\\\)/g, "$$$1$")
  str = str.replace(/_DOUBLE_BACKSLASH_/g, "\\\\")

  // Markdown bold and italics are now natively supported by our unified RichText renderer

  // Strip \begin{enumerate} / \begin{itemize} environments -- replace \item with a dash
  str = str.replace(/\\begin\{(?:enumerate|itemize)\}/g, "")
  str = str.replace(/\\end\{(?:enumerate|itemize)\}/g, "")
  str = str.replace(/\\item\s*/g, "- ")

  // Convert bare \% outside math to plain %
  // Protect math blocks first so we don't touch \% inside $...$ or $$...$$
  str = str.replace(/(\$\$[\s\S]*?\$\$|\$[^$\n]+?\$)/g, (m) => m.replace(/\\/g, "\x00"))
  str = str.replace(/\\%/g, "%")
  str = str.replace(/\x00/g, "\\")
  // Convert bare \times, \cdot, \div outside math to unicode equivalents
  str = str.replace(/(\$\$[\s\S]*?\$\$|\$[^$\n]+?\$)/g, (m) => m.replace(/\\/g, "\x00"))
  str = str.replace(/\\times/g, "×")
  str = str.replace(/\\cdot/g, "·")
  str = str.replace(/\\div/g, "÷")
  str = str.replace(/\x00/g, "\\")

  return str
}

function sanitizeQuestions(raw: any[], marksDefault: number): QuestionForm[] {
  return raw
    .filter(
      (q) =>
        q?.question_text?.trim() &&
        Array.isArray(q?.options) &&
        q.options.length >= 2
    )
    .map((q): QuestionForm => {
      const qType: "single_correct" | "multiple_correct" =
        q.question_type === "multiple_correct"
          ? "multiple_correct"
          : "single_correct"

      let options: OptionForm[] = (q.options as any[]).map((o) => ({
        _key: crypto.randomUUID(),
        option_text: cleanAiString(o.option_text),
        is_correct: !!o.is_correct,
      }))

      if (qType === "single_correct") {
        let pinned = false
        options = options.map((o, i) => {
          if (o.is_correct && !pinned) {
            pinned = true
            return o
          }
          if (i === options.length - 1 && !pinned) {
            return { ...o, is_correct: true }
          }
          return { ...o, is_correct: false }
        })
      } else {
        const correctCount = options.filter((o) => o.is_correct).length
        if (correctCount < 2) {
          let forced = 0
          options = options.map((o) => {
            if (forced < 2 && !o.is_correct) {
              forced++
              return { ...o, is_correct: true }
            }
            return o
          })
        }
      }

      return {
        question_text: cleanAiString(q.question_text),
        question_type: qType,
        marks: Number(q.marks ?? marksDefault),
        explanation: cleanAiString(q.explanation),
        tag_names: Array.isArray(q.tag_names)
          ? q.tag_names.map((t: any) => String(t).trim()).filter(Boolean)
          : [],
        options,
      }
    })
}

export async function generateQuestionsAction(
  input: AiGenerateForm
): Promise<GenerateQuestionsResult> {
  const profile = await getUserProfile()
  if (!profile) return { error: "Authentication required." }

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) return { error: "AI generation is not configured. Missing GEMINI_API_KEY in environment." }

  const count = Math.min(60, Math.max(1, parseInt(input.count, 10) || 5))
  const marksDefault = DIFFICULTY_MARKS[input.difficulty]

  const typeInstruction =
    input.question_type === "mixed"
      ? `Distribute types evenly: roughly half "single_correct" (exactly 1 correct option) and half "multiple_correct" (2–3 correct options).`
      : input.question_type === "multiple_correct"
        ? `All questions must be "multiple_correct" with exactly 2–3 correct options out of 4.`
        : `All questions must be "single_correct" with exactly 1 correct option out of 4.`

  const ai = new GoogleGenAI({ apiKey })

  const systemPrompt = `You are Trixy AI — an elite exam author and assessment designer for university-level, competitive, and technical examinations.

Generate rigorous, unambiguous, and pedagogy-grade multiple-choice questions following these strict specifications:

==================================================
1. QUESTION STRUCTURE & OPTIONS (STRICT)
==================================================
- Every question MUST have EXACTLY 4 options — no more, no less.
- "single_correct": Exactly 1 option must have is_correct=true; the other 3 must be is_correct=false.
- "multiple_correct": Exactly 2 or 3 options must have is_correct=true; the remaining must be is_correct=false.
- Every distractor (wrong option) must be scientifically plausible, reflecting common cognitive misconceptions or calculation pitfalls, but unequivocally incorrect to an expert.
- Marks = 1 for all questions.

==================================================
2. EXPLANATION & PEDAGOGY
==================================================
- "explanation": Must provide a clear, step-by-step derivation or proof explaining:
  (a) Why the correct option(s) are true, and
  (b) Why the key distractors are flawed.
- "tag_names": 1–3 precise subject/concept tags. Prioritize the exact tags provided in the prompt's 'EXISTING TAGS' list.

==================================================
3. LATEX MATHEMATICAL FORMATTING (KaTeX)
==================================================
Our platform renders math using KaTeX:
- INLINE MATH: Wrap ALL variables, algebraic expressions, formulas, matrices, units, exponents, square roots, fractions, and Greek letters in SINGLE DOLLAR DELIMITERS ($...$).
  * Good: "If $f(x) = x^2 + 2x$, find $f'(3)$."
  * Good: "Calculate the energy in $\\\\text{Joules}$ given $E = mc^2$."
  * Bad: "If f(x) = x^2 + 2x" (Never write plain text math)
- DISPLAY / MULTI-LINE EQUATIONS: Wrap standalone equations in DOUBLE DOLLAR DELIMITERS ($$...$$):
  * Good: "$$\\\\int_{0}^{\\\\infty} e^{-x^2} dx = \\\\frac{\\\\sqrt{\\\\pi}}{2}$$"
- GREEK LETTERS & OPERATORS: Always in math mode: "$\\\\alpha$", "$\\\\beta$", "$\\\\theta$", "$\\\\lambda$", "$\\\\mu$", "$\\\\sigma$", "$\\\\Omega$", "$\\\\Delta$", "$\\\\nabla$".
- PERCENTAGES: Write "$20\\\\%$" inside math or "20%" in regular text.
- CURRENCY SAFETY: To avoid accidentally opening an unclosed math block with '$', ALWAYS write currencies as either:
  * "USD 5,000" or "$5{,}000$ dollars" (never leave a lone '$' without a closing '$').
- DELIMITER MATCHING: Every '$' MUST close on the same expression. Never span a '$' across plain sentences.
- JSON BACKSLASH ESCAPING: Because your output is valid JSON, EVERY backslash in LaTeX MUST be double-escaped:
  * Write "\\\\frac", "\\\\sqrt", "\\\\sum", "\\\\times", "\\\\cdot", "\\\\le", "\\\\ge", "\\\\neq", "\\\\infty".

==================================================
4. CODE BLOCKS & INLINE CODE (Prism.js)
==================================================
Our platform renders code blocks with Prism.js syntax highlighting:
- INLINE CODE: Wrap keywords, types, function names, variables, and short statements in single backticks: \`x\`, \`ArrayList<String>\`, \`SELECT * FROM users\`, \`malloc()\`.
- CODE BLOCKS: When a question or explanation involves code, ALWAYS use triple backticks with the exact language identifier:
  * Example:
    \`\`\`python\\ndef solve(arr):\\n    return [x * 2 for x in arr]\\n\`\`\`
  * Supported languages: python, javascript, typescript, java, cpp, c, csharp, sql, bash, json, html, css.
  * In the JSON string, format newlines inside code blocks explicitly as \\n.

==================================================
5. TABLES & TABULAR DATA (GFM Markdown)
==================================================
- Format all datasets, truth tables, comparison charts, and matrix tables as standard GitHub-Flavored Markdown tables.
- Separate table rows with explicit \\n characters in the JSON string.
- You may use LaTeX math inside table cells (e.g. "| $x$ | $f(x) = x^2$ |\\n|---|---|\\n| $1$ | $1$ |\\n| $2$ | $4$ |").

==================================================
6. RICH TEXT FORMATTING
==================================================
- Use Markdown **bold** to highlight key constraints (e.g. "**NOT**", "**EXCEPT**", "**ALWAYS**", "**FALSE**").
- Use Markdown *italic* for technical terminology or foreign phrases.

==================================================
7. OUTPUT SCHEMA (JSON ONLY)
==================================================
Output must be a single, strictly valid JSON object matching this schema:
{
  "questions": [
    {
      "question_text": "string",
      "question_type": "single_correct" | "multiple_correct",
      "marks": 1,
      "explanation": "string",
      "tag_names": ["string"],
      "options": [
        { "option_text": "string", "is_correct": true | false }
      ]
    }
  ]
}`

  const supabase = await createClient()
  const { data: tagData } = await (supabase as any)
    .from("test_question_tags")
    .select("name")
    .order("name")
    
  const existingTagsStr = tagData && tagData.length > 0 
    ? tagData.map((t: any) => t.name).join(", ")
    : "No existing tags yet."

  const executeSingleBatch = async (
    model: string,
    batchCount: number
  ): Promise<QuestionForm[]> => {
    const batchPrompt = `[Request ID: ${crypto.randomUUID()}]
[Random Seed: ${Math.floor(Math.random() * 1000000)}]
Generate exactly ${batchCount} questions on the topic: "${input.topic}".
Difficulty: ${input.difficulty}. Each question carries 1 mark.
${typeInstruction}
Ensure all questions are entirely distinct, unique, use creative scenarios, and are not reused from any prior generation.

EXISTING TAGS (Use these exactly if they fit):
${existingTagsStr}`

    const streamRes = await ai.models.generateContentStream({
      model,
      contents: batchPrompt,
      config: {
        systemInstruction: systemPrompt,
        temperature: 0.25 + Math.random() * 0.15,
        maxOutputTokens: 14000,
        responseMimeType: "application/json",
        responseSchema: {
          type: "object",
          properties: {
            questions: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  question_text: { type: "string" },
                  question_type: { type: "string", enum: ["single_correct", "multiple_correct"] },
                  marks: { type: "integer" },
                  explanation: { type: "string" },
                  tag_names: {
                    type: "array",
                    items: { type: "string" }
                  },
                  options: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        option_text: { type: "string" },
                        is_correct: { type: "boolean" }
                      },
                      required: ["option_text", "is_correct"]
                    }
                  }
                },
                required: ["question_text", "question_type", "marks", "explanation", "tag_names", "options"]
              }
            }
          },
          required: ["questions"]
        }
      }
    })

    let raw = ""
    for await (const chunk of streamRes) {
      raw += chunk.text ?? ""
    }

    if (!raw) throw new Error("Empty response from AI.")

    const text = stripCodeFences(raw)
    let parsed: any
    try {
      parsed = JSON.parse(text)
    } catch (parseErr) {
      console.error("[generateQuestionsAction] Failed to parse AI JSON:", text)
      throw new Error("The AI returned an invalid format. Retrying with another model...")
    }

    const rawList: any[] = Array.isArray(parsed)
      ? parsed
      : Array.isArray(parsed?.questions)
        ? parsed.questions
        : []

    const questions = sanitizeQuestions(rawList, marksDefault)
    if (questions.length === 0) {
      throw new Error("No valid questions returned by the AI.")
    }
    return questions
  }

  const attemptWithModel = async (
    model: string
  ): Promise<GenerateQuestionsResult> => {
    const BATCH_SIZE = 15
    const MAX_CONCURRENCY = 4
    const STAGGER_MS = 300

    if (count <= BATCH_SIZE) {
      const questions = await withRetry(() => executeSingleBatch(model, count))
      return { questions, generatedWith: model }
    }

    const chunks: number[] = []
    let remaining = count
    while (remaining > 0) {
      const chunkSize = Math.min(BATCH_SIZE, remaining)
      chunks.push(chunkSize)
      remaining -= chunkSize
    }

    const allResults: QuestionForm[][] = []
    for (let i = 0; i < chunks.length; i += MAX_CONCURRENCY) {
      const wave = chunks.slice(i, i + MAX_CONCURRENCY)
      const wavePromises = wave.map((chunkSize, waveIdx) =>
        new Promise<QuestionForm[]>((resolve, reject) => {
          setTimeout(() => {
            withRetry(() => executeSingleBatch(model, chunkSize)).then(resolve).catch(reject)
          }, waveIdx * STAGGER_MS)
        })
      )
      const waveResults = await Promise.all(wavePromises)
      allResults.push(...waveResults)
    }

    const seen = new Set<string>()
    const combined = allResults.flat().filter((q) => {
      const key = q.question_text.trim().toLowerCase().slice(0, 120)
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })

    return { questions: combined, generatedWith: model }
  }

  let lastError: unknown

  for (const model of MODEL_FALLBACK_CHAIN) {
    try {
      return await attemptWithModel(model)
    } catch (err) {
      lastError = err
      if (!isRetryableOnNextModel(err)) {
        console.error(`[generateQuestionsAction] Non-retryable error on model ${model}, aborting fallback chain:`, err)
        break
      }
      console.warn(`[generateQuestionsAction] Model ${model} quota/rate-limited, trying next model…`)
      await new Promise((r) => setTimeout(r, 500))
    }
  }

  console.error("[generateQuestionsAction] All models exhausted.", lastError)

  return {
    error: lastError instanceof Error
      ? `AI generation failed: ${lastError.message}`
      : "Failed to generate questions. Please try again."
  }
}




