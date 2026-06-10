"use server"

import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import OpenAI from "openai"

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
  questions: QuestionForm[]
  generatedWith: string
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

  const { error } = await (supabase as any).rpc("save_test_v2", {
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
  testId: string,
  userId: string
): Promise<InitialTestData | null> {
  const authUserId = await requireAuth()
  if (authUserId !== userId) throw new Error("Unauthorized")
  const supabase = await createClient()

  const { data: test } = await (supabase as any)
    .from("tests")
    .select(`
      title, description, instructions,
      time_limit_seconds, available_from, available_until, status,
      shuffle_questions, shuffle_options, strict_mode,
      questions (
        id, question_text, question_type, marks, order_index, explanation,
        options ( id, option_text, is_correct, order_index ),
        question_tags ( tags ( id, name ) )
      )
    `)
    .eq("id", testId)
    .eq("institute_id", userId)
    .single()

  if (!test) return null

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
    },
    status: test.status as "draft" | "published",
    questions: (test.questions ?? [])
      .sort((a: any, b: any) => a.order_index - b.order_index)
      .map((q: any) => ({
        id: q.id,
        question_text: q.question_text,
        question_type: q.question_type,
        marks: q.marks,
        order_index: q.order_index,
        explanation: q.explanation ?? "",
        tag_names: (q.question_tags ?? [])
          .map((qt: any) => qt.tags?.name)
          .filter(Boolean),
        options: (q.options ?? [])
          .sort((a: any, b: any) => a.order_index - b.order_index)
          .map((o: any) => ({
            _key: o.id,
            option_text: o.option_text,
            is_correct: o.is_correct,
          })),
      })),
  }
}

export async function saveDraftAction(
  testId: string,
  settings: SettingsForm,
  questions: LocalQuestion[]
): Promise<void> {
  const userSub = await requireAuth()
  await saveTestToDb(testId, userSub, settings, questions, "draft")
  revalidatePath("/tests")
}

export async function publishTestAction(
  testId: string,
  settings: SettingsForm,
  questions: LocalQuestion[]
): Promise<void> {
  const userSub = await requireAuth()
  if (!settings.title.trim()) throw new Error("Title is required.")
  if (questions.length === 0) throw new Error("Add at least one question.")

  await saveTestToDb(testId, userSub, settings, questions, "published")
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
  "llama-3.3-70b-versatile",
  "moonshotai/kimi-k2-instruct-0905",
  "qwen/qwen3-32b",
  "openai/gpt-oss-120b",
  "meta-llama/llama-4-scout-17b-16e-instruct",
  "openai/gpt-oss-20b",
  "llama-3.1-8b-instant",
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
  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) throw new Error("AI generation is not configured.")

  const count = Math.min(20, Math.max(1, parseInt(input.count, 10) || 5))
  const marksDefault = DIFFICULTY_MARKS[input.difficulty]

  const typeInstruction =
    input.question_type === "mixed"
      ? `Distribute types evenly: roughly half "single_correct" (exactly 1 correct option) and half "multiple_correct" (2–3 correct options).`
      : input.question_type === "multiple_correct"
        ? `All questions must be "multiple_correct" with exactly 2–3 correct options out of 4.`
        : `All questions must be "single_correct" with exactly 1 correct option out of 4.`

  const groq = new OpenAI({
    baseURL: "https://api.groq.com/openai/v1",
    apiKey,
  })

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

  const userPrompt = `[Request ID: ${nonce}]
Generate exactly ${count} questions on the topic: "${input.topic}".
Difficulty: ${input.difficulty}. Each question carries 1 mark.
${typeInstruction}
Ensure all questions are entirely distinct and not reused from any prior generation.`

  const attemptWithModel = async (
    model: string
  ): Promise<GenerateQuestionsResult> => {
    const response = await groq.chat.completions.create({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: { type: "json_object" },
      temperature: 0.8,
      top_p: 0.95,
      frequency_penalty: 0.4,
    })

    const raw = response.choices[0]?.message?.content
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

  throw new Error(
    lastError instanceof Error
      ? `AI generation failed: ${lastError.message}`
      : "Failed to generate questions. Please try again."
  )
}
