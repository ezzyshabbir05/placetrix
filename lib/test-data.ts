import { createClient } from "@/lib/supabase/server"
import type { AttemptQuestion } from "@/app/(fullscreen)/tests/[testId]/attempt/_types"

/**
 * Fetches the questions for a test.
 */
export async function getTestQuestions(testId: string): Promise<AttemptQuestion[]> {
  const supabase = await createClient()

  // Fetch sections to obtain section order_index
  const { data: directSections } = await (supabase as any)
    .from("test_sections")
    .select("id, order_index")
    .eq("test_id", testId)
    .order("order_index")

  let sections = directSections
  if (!sections || sections.length === 0) {
    const { data: testData } = await (supabase as any)
      .from("tests")
      .select("test_sections (id, order_index)")
      .eq("id", testId)
      .maybeSingle()
    sections = testData?.test_sections
  }

  const sectionOrderMap = new Map<string, number>(
    (sections ?? []).map((s: any) => [s.id, s.order_index ?? 0])
  )

  const { data: rawQuestions, error: qError } = await (supabase as any)
    .from("test_questions")
    .select(
      `id, section_id, question_text, question_type, marks, order_index,
       min_words, max_words, rubric_guidelines,
       test_question_options (id, option_text, order_index),
       question_tags (
         test_question_tags (id, name)
       )`
    )
    .eq("test_id", testId)

  if (qError || !rawQuestions) {
    throw new Error("Failed to load questions: " + qError?.message)
  }

  const defaultSecId = (sections && sections.length > 0) ? sections[0].id : "default-section-a"

  // Group & sort by section order_index first, then question order_index
  const sortedRaw = [...rawQuestions].sort((a: any, b: any) => {
    const sA = a.section_id ? (sectionOrderMap.get(a.section_id) ?? 999) : 999
    const sB = b.section_id ? (sectionOrderMap.get(b.section_id) ?? 999) : 999
    if (sA !== sB) return sA - sB
    return (a.order_index ?? 0) - (b.order_index ?? 0)
  })

  // Shape the results for the client
  return sortedRaw.map((q: any) => ({
    id: q.id,
    section_id: q.section_id ?? defaultSecId,
    question_text: q.question_text,
    question_type: q.question_type as "single_correct" | "multiple_correct" | "essay",
    marks: q.marks,
    order_index: q.order_index,
    min_words: q.min_words ?? 250,
    max_words: q.max_words ?? 350,
    rubric_guidelines: q.rubric_guidelines,
    options: ((q.test_question_options as any[]) ?? [])
      .map((o: any) => ({
        id: o.id,
        option_text: o.option_text,
        order_index: o.order_index,
      }))
      .sort((a: any, b: any) => a.order_index - b.order_index),
    tags: (((q as any).question_tags as any[]) ?? [])
      .flatMap((qt: any) => qt.test_question_tags ? [qt.test_question_tags] : []),
  }))
}

export async function getTestSections(testId: string) {
  const supabase = await createClient()

  // 1. Direct query on test_sections
  const { data: sections } = await (supabase as any)
    .from("test_sections")
    .select("id, name, description, order_index")
    .eq("test_id", testId)
    .order("order_index")

  if (sections && sections.length > 0) {
    return sections as Array<{
      id: string
      name: string
      description: string | null
      order_index: number
    }>
  }

  // 2. Query sections via tests relationship fallback (in case direct query RLS is restricted)
  const { data: testData } = await (supabase as any)
    .from("tests")
    .select("test_sections (id, name, description, order_index)")
    .eq("id", testId)
    .maybeSingle()

  const nestedSections = testData?.test_sections
  if (Array.isArray(nestedSections) && nestedSections.length > 0) {
    return [...nestedSections].sort((a: any, b: any) => (a.order_index ?? 0) - (b.order_index ?? 0)) as Array<{
      id: string
      name: string
      description: string | null
      order_index: number
    }>
  }

  // 3. Fallback default Section A so every test has sections
  return [
    {
      id: "default-section-a",
      name: "Section A",
      description: null,
      order_index: 0,
    },
  ]
}
