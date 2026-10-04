// ─────────────────────────────────────────────────────────────────────────────
// lib/essay-evaluator.ts
// Intelligent, Continuous, and Lenient Client for Essay Scoring
// ─────────────────────────────────────────────────────────────────────────────

export interface EssayEvaluationResult {
  band_score: number // Integer band 1 to 6
  scaled_marks: number // Scaled according to max_marks (continuous float, 2 decimals)
  expected_score: number // Continuous score based on softmax distribution
  confidence: number // Top band confidence percentage
  class_probabilities: number[] // Probabilities for bands 1 to 6
  band_descriptor: {
    name: string
    description: string
  }
  metrics: {
    word_count: number
    sentence_count: number
    avg_sentence_length: number
    lexical_diversity: number
    length_compliance: "optimal" | "under_length" | "over_length"
  }
  normalized_text: string
}

export interface ScoreEssayParams {
  essayText: string
  minWords?: number
  maxWords?: number
  maxMarks?: number
}

export const BAND_RUBRIC_DESCRIPTORS: Record<
  number,
  { name: string; description: string }
> = {
  1: {
    name: "Inadequate / Novice",
    description:
      "Lacks organization, frequent errors, severely underdeveloped ideas or incomplete response.",
  },
  2: {
    name: "Limited / Elementary",
    description:
      "Rudimentary sentence structure, limited vocabulary, and minimal topic development.",
  },
  3: {
    name: "Modest / Developing",
    description:
      "Developing coherence, basic vocabulary, and satisfactory expression of core ideas.",
  },
  4: {
    name: "Competent / Proficient",
    description:
      "Generally clear focus, satisfactory paragraphing, adequate vocabulary, and good grammatical control.",
  },
  5: {
    name: "Strong / Advanced",
    description:
      "Well-developed ideas, varied sentence structures, fluent expression, and precise phrasing.",
  },
  6: {
    name: "Exemplary / Master",
    description:
      "Sophisticated vocabulary, seamless organization, critical depth, and compelling execution.",
  },
}

/**
 * Sends candidate essay text to the self-hosted essay scoring service
 * and applies lenient, continuous, proportional mark calculation.
 */
export async function scoreCandidateEssay(
  params: ScoreEssayParams
): Promise<EssayEvaluationResult> {
  const endpoint = process.env.ESSAY_SCORER_URL
  const apiKey = process.env.ESSAY_SCORER_API_KEY

  if (!endpoint || apiKey === undefined) {
    throw new Error(
      "Essay scoring service is unconfigured. Missing ESSAY_SCORER_URL or ESSAY_SCORER_API_KEY."
    )
  }

  const rawText = params.essayText?.trim() ?? ""
  const words = rawText.split(/\s+/).filter(Boolean)
  const wordCount = words.length
  const minWords = Math.max(1, params.minWords ?? 180)
  const maxWords = Math.max(minWords, params.maxWords ?? 220)
  const maxMarks = params.maxMarks ?? 10.0

  // ── Edge Case 1: Trivially short or empty submission (< 10 words) ───────────
  if (wordCount < 10) {
    return {
      band_score: 1,
      scaled_marks: 0.0,
      expected_score: 1.0,
      confidence: 100,
      class_probabilities: [1.0, 0.0, 0.0, 0.0, 0.0, 0.0],
      band_descriptor: {
        name: "Inadequate / Insufficient Length",
        description: `Essay is severely incomplete (${wordCount} words written; minimum target was ${minWords} words).`,
      },
      metrics: {
        word_count: wordCount,
        sentence_count: wordCount > 0 ? 1 : 0,
        avg_sentence_length: wordCount,
        lexical_diversity: wordCount > 0 ? 1.0 : 0.0,
        length_compliance: "under_length",
      },
      normalized_text: rawText,
    }
  }

  // ── Call VPS AI Microservice ────────────────────────────────────────────────
  const response = await fetch(`${endpoint}/score`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      essay: rawText,
      min_words: minWords,
      max_words: maxWords,
      max_marks: maxMarks,
    }),
    signal: AbortSignal.timeout(15000),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`AI Scorer returned HTTP ${response.status}: ${errorText}`)
  }

  const rawResult: EssayEvaluationResult = await response.json()

  // ── 1. Linguistic Quality Assessment ────────────────────────────────────────
  // Evaluates vocabulary variety and syntactic maturity to balance out
  // the neural model's dataset bias against shorter responses.
  const lingBand = evaluateLinguisticQuality(rawResult.metrics, wordCount)

  // ── 2. Synthesize Quality Band with Generous, Lenient Blending ───────────────
  // Strongly weights linguistic maturity & coherence over harsh neural classification.
  const neuralExpected = rawResult.expected_score || rawResult.band_score
  let synthesizedBand = Math.max(neuralExpected, lingBand)

  // If linguistic analysis or neural model detects reasonable quality, blend generously
  if (lingBand > neuralExpected) {
    const deficit = Math.min(1.0, Math.max(0, (220 - wordCount) / 100))
    const weight = 0.60 + 0.35 * deficit // 60% to 95% weight on linguistic quality
    synthesizedBand = neuralExpected * (1.0 - weight) + lingBand * weight
  } else {
    // Even when neural score is higher, give the candidate the benefit of the higher score
    synthesizedBand = Math.max(neuralExpected, lingBand)
  }

  // Baseline floor: Any non-empty, genuine paragraph (20+ words) starts at minimum Band 2.0
  if (wordCount >= 20 && synthesizedBand < 2.0) {
    synthesizedBand = 2.0
  }

  // ── 3. Ultra-Lenient Academic Quality Factor ─────────────────────────────────
  // Band 1.0 = 40% | Band 2.0 = 60% (Pass) | Band 3.0 = 75% | Band 4.0 = 88% | Band 5.0 = 95% | Band 6.0 = 100%
  const qualityFactor = mapBandToQualityFactor(synthesizedBand)

  // ── 4. Lenient Continuous Length Multiplier (With 70% Grace Zone) ───────────
  const { multiplier: lengthMultiplier, compliance: lengthCompliance } =
    computeContinuousLengthMultiplier(wordCount, minWords, maxWords)

  // ── 5. Continuous Scaled Marks ──────────────────────────────────────────────
  const rawMarks = qualityFactor * maxMarks * lengthMultiplier
  const calibratedMarks = Math.min(
    maxMarks,
    Math.max(0, Math.round(rawMarks * 100) / 100)
  )

  const integerBand = Math.min(6, Math.max(1, Math.round(synthesizedBand)))
  const defaultDescriptor =
    BAND_RUBRIC_DESCRIPTORS[integerBand] || BAND_RUBRIC_DESCRIPTORS[1]

  // ── 6. Candidate Feedback Descriptor ────────────────────────────────────────
  let descriptorName = defaultDescriptor.name
  let descriptorText = defaultDescriptor.description

  if (lengthCompliance === "under_length" && wordCount < minWords) {
    descriptorName = `${descriptorName} (Concise)`
    descriptorText = `${descriptorText} Note: Written response was ${wordCount} words (suggested target: ${minWords} words). Generous partial credit awarded for content.`
  } else if (lengthCompliance === "over_length") {
    descriptorName = `${descriptorName} (Comprehensive)`
    descriptorText = `${descriptorText} Note: Written response was thorough (${wordCount} words written). Full credit applied without penalty.`
  }

  return {
    ...rawResult,
    band_score: integerBand,
    scaled_marks: calibratedMarks,
    expected_score: Math.round(synthesizedBand * 100) / 100,
    band_descriptor: {
      name: descriptorName,
      description: descriptorText,
    },
    metrics: {
      ...rawResult.metrics,
      word_count: wordCount,
      length_compliance: lengthCompliance,
    },
  }
}

/**
 * Evaluates linguistic proficiency based on vocabulary diversity and syntactic maturity.
 * Returns an estimated quality band between 2.0 and 5.5.
 */
function evaluateLinguisticQuality(
  metrics: {
    avg_sentence_length: number
    lexical_diversity: number
    sentence_count: number
  },
  wordCount: number
): number {
  const { avg_sentence_length, lexical_diversity } = metrics

  // Vocabulary richness (Type-Token Ratio clamped between 0.30 and 0.60)
  const vocabScore = Math.max(0, Math.min(1, (lexical_diversity - 0.30) / 0.30))

  // Sentence maturity (generous range: 10 to 30 words per sentence)
  let sentenceScore = 0.75
  if (avg_sentence_length >= 10 && avg_sentence_length <= 28) {
    sentenceScore = 1.0
  } else if (avg_sentence_length >= 6 && avg_sentence_length < 10) {
    sentenceScore = 0.85
  } else if (avg_sentence_length > 28 && avg_sentence_length <= 36) {
    sentenceScore = 0.90
  } else if (avg_sentence_length < 6) {
    sentenceScore = 0.65
  }

  const rawLingBand = 2.0 + (vocabScore * 0.55 + sentenceScore * 0.45) * 3.2

  // Adaptive ceiling to prevent tiny fragments from getting Band 5 or 6
  let maxAllowable = 6.0
  if (wordCount < 40) {
    maxAllowable = 3.5
  } else if (wordCount < 80) {
    maxAllowable = 4.2
  } else if (wordCount < 130) {
    maxAllowable = 5.0
  }

  return Math.min(maxAllowable, rawLingBand)
}

/**
 * Computes a lenient length multiplier (0.65 to 1.00) with a 70% grace zone.
 * If candidate writes >= 70% of minWords, full 1.0 credit is granted.
 * Over-length writing is never penalized.
 */
function computeContinuousLengthMultiplier(
  wordCount: number,
  minWords: number,
  maxWords: number
): { multiplier: number; compliance: "optimal" | "under_length" | "over_length" } {
  if (wordCount < 10) {
    return { multiplier: 0.0, compliance: "under_length" }
  }

  // Grace zone: If candidate writes >= 70% of minWords, 100% optimal length credit
  const graceThreshold = Math.round(minWords * 0.70)
  if (wordCount >= graceThreshold) {
    return {
      multiplier: 1.0,
      compliance: wordCount > maxWords * 1.5 ? "over_length" : "optimal",
    }
  }

  // Under-length: extremely encouraging curve (0.65 floor + 0.35 * sqrt(ratio))
  const ratio = Math.max(0.01, Math.min(1.0, wordCount / graceThreshold))
  const multiplier = 0.65 + 0.35 * Math.sqrt(ratio)

  return {
    multiplier: Math.min(1.0, Math.max(0.50, Math.round(multiplier * 100) / 100)),
    compliance: "under_length",
  }
}

/**
 * Maps continuous AI band (1.0 - 6.0) to an encouraging, lenient academic percentage factor (0.40 - 1.00).
 * - Band 1.0: 40% (Basic attempt / partial understanding)
 * - Band 2.0: 60% (Elementary / Developing - passes cutoff)
 * - Band 3.0: 75% (Good competence / solid core)
 * - Band 4.0: 88% (Proficient / High merit)
 * - Band 5.0: 95% (Advanced / Near distinction)
 * - Band 6.0: 100% (Exemplary / Full marks)
 */
function mapBandToQualityFactor(continuousBand: number): number {
  const b = Math.max(1.0, Math.min(6.0, continuousBand))

  if (b <= 2.0) {
    return 0.40 + (b - 1.0) * 0.20 // 40% to 60%
  } else if (b <= 3.0) {
    return 0.60 + (b - 2.0) * 0.15 // 60% to 75%
  } else if (b <= 4.0) {
    return 0.75 + (b - 3.0) * 0.13 // 75% to 88%
  } else if (b <= 5.0) {
    return 0.88 + (b - 4.0) * 0.07 // 88% to 95%
  } else {
    return 0.95 + (b - 5.0) * 0.05 // 95% to 100%
  }
}
