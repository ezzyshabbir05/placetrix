"use server"

import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { getUserProfile } from "@/lib/supabase/profile"
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

export type LocalQuestion = {
  id: string
  question_text: string
  question_type: "single_correct" | "multiple_correct"
  marks: number
  order_index: number
  tag_names: string[]
  options: OptionForm[]
  explanation: string
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
      options: q.options.map((opt) => ({
        id: opt._key,
        option_text: opt.option_text,
        is_correct: opt.is_correct,
      })),
    })),
    p_status: status,
  })

  if (error) {
    throw new Error("Failed to save test: " + error.message)
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

  const [{ data: test }, { data: cohorts }] = await Promise.all([
    (supabase as any)
      .from("tests")
      .select(`
        title, description, instructions,
        time_limit_seconds, available_from, available_until, status,
        shuffle_questions, shuffle_options, strict_mode, pass_percentage,
        test_questions (
          id, question_text, question_type, marks, order_index, explanation,
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
    questions: (test.test_questions ?? [])
      .sort((a: any, b: any) => a.order_index - b.order_index)
      .map((q: any) => ({
        id: q.id,
        question_text: q.question_text,
        question_type: q.question_type,
        marks: q.marks,
        order_index: q.order_index,
        explanation: q.explanation ?? "",
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
  questions: LocalQuestion[]
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

  await saveTestToDb(testId, profile.id, settings, questions, "draft")
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
  questions: LocalQuestion[]
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

  await saveTestToDb(testId, profile.id, settings, questions, "published")

  // Replace test cohort mappings
  await (supabase as any).from("test_cohorts").delete().eq("test_id", testId)
  await (supabase as any).from("test_cohorts").insert(
    settings.cohort_ids.map((cohortId) => ({ test_id: testId, cohort_id: cohortId }))
  )

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
  "gemini-2.5-flash",
  "gemini-2.0-flash",
  "gemini-1.5-flash",
  "gemini-2.5-pro",
  "gemini-1.5-pro",
])

function isRetryableOnNextModel(err: unknown): boolean {
  if (err instanceof Error) {
    const msg = err.message.toLowerCase()
    return /429|rate.?limit|too many|quota|503|502|overloaded/.test(msg)
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
        option_text: String(o.option_text ?? "").trim(),
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
        question_text: String(q.question_text).trim(),
        question_type: qType,
        marks: Number(q.marks ?? marksDefault),
        explanation: String(q.explanation ?? "").trim(),
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
  await requireAuth()
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) return { error: "AI generation is not configured. Missing GEMINI_API_KEY in environment." }

  const count = Math.min(20, Math.max(1, parseInt(input.count, 10) || 5))
  const marksDefault = DIFFICULTY_MARKS[input.difficulty]

  const typeInstruction =
    input.question_type === "mixed"
      ? `Distribute types evenly: roughly half "single_correct" (exactly 1 correct option) and half "multiple_correct" (2–3 correct options).`
      : input.question_type === "multiple_correct"
        ? `All questions must be "multiple_correct" with exactly 2–3 correct options out of 4.`
        : `All questions must be "single_correct" with exactly 1 correct option out of 4.`

  const ai = new GoogleGenAI({ apiKey })

  const systemPrompt = `You are an expert exam question author for educational assessments.

STRICT RULES you must follow for every question:
1. Every question has EXACTLY 4 options — no more, no less.
2. "single_correct" → exactly 1 option with is_correct=true; the other 3 must be is_correct=false.
3. "multiple_correct" → exactly 2 or 3 options with is_correct=true; the rest must be is_correct=false.
4. All distractors (incorrect options) must be plausible but unambiguously wrong to a knowledgeable person.
5. The "explanation" field must (a) confirm why the correct answer(s) are right, and (b) briefly explain why the main distractor is wrong.
6. "tag_names": provide 1–3 short topic tags (e.g. "photosynthesis", "linear algebra", "Ohm's law").
7. Every question must have marks = 1, regardless of difficulty.
8. Vary cognitive levels across the batch: include recall, application, and analysis questions.
9. Never repeat similar or near-identical questions within the same batch.
10. Your response must be a raw JSON object — no markdown, no code fences, no extra text.
11. LATEX & MATH FORMATTING:
    - For ANY mathematical content, equations, standalone variables (like $x$, $y$, $\alpha$), chemical equations, scientific notations, fractions, matrices, or exponents, you MUST use standard LaTeX.
    - Use single dollar signs ($...$) for inline math (e.g. "If $x + y = 10$, find $x$.") and double dollar signs ($$...$$) for centered block math equations.
    - Do NOT use legacy LaTeX delimiters like \( \) or \[ \], nor plain text equations (e.g. do not write "x^2 + 5x" — instead write "$x^2 + 5x$").
    - Backslash Escaping in JSON: Because your response is JSON, you MUST double-escape all LaTeX backslashes so they parse correctly. For example, write "\\\\frac{a}{b}" instead of "\\frac{a}{b}", "\\\\theta" instead of "\\theta", and "\\\\sqrt{x}" instead of "\\sqrt{x}". If you output a single backslash, JSON parsing will fail with an escape error.

It must follow this exact shape:
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

  const nonce = crypto.randomUUID()
  const randomSeed = Math.floor(Math.random() * 1000000)

  const userPrompt = `[Request ID: ${nonce}]
[Random Seed: ${randomSeed}]
Generate exactly ${count} questions on the topic: "${input.topic}".
Difficulty: ${input.difficulty}. Each question carries 1 mark.
${typeInstruction}
Ensure all questions are entirely distinct, unique, use creative scenarios, and are not reused from any prior generation.`

  const attemptWithModel = async (
    model: string
  ): Promise<GenerateQuestionsResult> => {
    const response = await ai.models.generateContent({
      model,
      contents: userPrompt,
      config: {
        systemInstruction: systemPrompt,
        temperature: 0.25,
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

    const raw = response.text
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
      throw new Error("No valid questions returned by the AI. Please try again.")
    }

    return {
      questions,
      generatedWith: model,
    }
  }

  let lastError: unknown

  for (const model of MODEL_FALLBACK_CHAIN) {
    try {
      return await attemptWithModel(model)
    } catch (err) {
      lastError = err

      if (isRetryableOnNextModel(err)) {
        console.warn(`[generateQuestionsAction] ${model} rate-limited, trying fallback…`)
        continue
      }

      try {
        return await attemptWithModel(model)
      } catch (retryErr) {
        lastError = retryErr
        console.warn(`[generateQuestionsAction] ${model} retry failed, trying fallback…`)
      }
    }
  }

  console.error("[generateQuestionsAction] All models exhausted.", lastError)

  return {
    error: lastError instanceof Error
      ? `AI generation failed: ${lastError.message}`
      : "Failed to generate questions. Please try again."
  }
}
