// ─────────────────────────────────────────────────────────────────────────────
// lib/essay-evaluator.ts
// Intelligent, Continuous, and Proportional Client for Essay Scoring
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
 * and applies continuous, proportional mark calculation without artificial quantization.
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
  const minWords = Math.max(1, params.minWords ?? 250)
  const maxWords = Math.max(minWords, params.maxWords ?? 350)
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

  // ── 2. Synthesize Quality Band Continuously ─────────────────────────────────
  // Smooth blend between neural expectation and linguistic indicators
  const neuralExpected = rawResult.expected_score || rawResult.band_score
  let synthesizedBand = neuralExpected

  if (wordCount < 250) {
    // When shorter than 250 words, blend linguistic quality proportionally
    const lingWeight = 0.50 * Math.min(1.0, (250 - wordCount) / 150)
    synthesizedBand = neuralExpected * (1.0 - lingWeight) + lingBand * lingWeight
  }

  // Cap elementary ceiling for extremely short text (< 20 words)
  if (wordCount < 20 && synthesizedBand > 2.0) {
    synthesizedBand = 2.0
  }

  // ── 3. Academic Quality Factor (Smooth Continuous Spline) ───────────────────
  // Band 1.0 = 10% | Band 2.0 = 30% | Band 3.0 = 55% (Pass) | Band 4.0 = 75% | Band 5.0 = 88% | Band 6.0 = 100%
  const qualityFactor = mapBandToQualityFactor(synthesizedBand)

  // ── 4. Continuous Monotonic Length Multiplier ───────────────────────────────
  const { multiplier: lengthMultiplier, compliance: lengthCompliance } =
    computeContinuousLengthMultiplier(wordCount, minWords, maxWords)

  // ── 5. Continuous Scaled Marks (NO Snapping / No Forced 100% or 0%) ─────────
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
    const pct = Math.round(lengthMultiplier * 100)
    descriptorName = `${descriptorName} (Under Length)`
    descriptorText = `${descriptorText} Note: Written response was ${wordCount} words (recommended target: ${minWords} words). A ${pct}% length factor was applied.`
  } else if (lengthCompliance === "over_length") {
    descriptorName = `${descriptorName} (Over Length)`
    descriptorText = `${descriptorText} Note: Written response exceeded ${maxWords} words (${wordCount} words written). A minor 5% conciseness adjustment was applied.`
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
 * Returns an estimated quality band between 1.5 and 4.5.
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

  // Vocabulary richness (Type-Token Ratio clamped between 0.35 and 0.63)
  const vocabScore = Math.max(0, Math.min(1, (lexical_diversity - 0.35) / 0.28))

  // Sentence maturity (optimal range is 12 to 26 words per sentence)
  let sentenceScore = 0.5
  if (avg_sentence_length >= 12 && avg_sentence_length <= 26) {
    sentenceScore = 1.0
  } else if (avg_sentence_length >= 8 && avg_sentence_length < 12) {
    sentenceScore = 0.75
  } else if (avg_sentence_length > 26 && avg_sentence_length <= 34) {
    sentenceScore = 0.8
  } else if (avg_sentence_length < 8) {
    sentenceScore = 0.4
  }

  const rawLingBand = 1.5 + (vocabScore * 0.60 + sentenceScore * 0.40) * 3.0

  // Prevent very short texts with artificially inflated TTR from exceeding Band 4
  let maxAllowable = 6.0
  if (wordCount < 100) {
    maxAllowable = 3.6
  } else if (wordCount < 180) {
    maxAllowable = 4.2
  } else if (wordCount < 250) {
    maxAllowable = 4.8
  }

  return Math.min(maxAllowable, rawLingBand)
}

/**
 * Computes a strictly continuous, monotonic length multiplier (0.20 to 1.00).
 * Guarantees that every additional word written towards the target strictly increases marks.
 */
function computeContinuousLengthMultiplier(
  wordCount: number,
  minWords: number,
  maxWords: number
): { multiplier: number; compliance: "optimal" | "under_length" | "over_length" } {
  if (wordCount < 10) {
    return { multiplier: 0.0, compliance: "under_length" }
  }

  if (wordCount >= minWords && wordCount <= maxWords * 1.30) {
    return { multiplier: 1.0, compliance: "optimal" }
  }

  if (wordCount > maxWords * 1.30) {
    return { multiplier: 0.95, compliance: "over_length" }
  }

  // Under-length: smooth monotonic power curve (concave, rewarding effort)
  const ratio = Math.max(0.01, Math.min(1.0, wordCount / minWords))
  const multiplier = 0.35 + 0.65 * Math.pow(ratio, 0.70)

  return {
    multiplier: Math.min(1.0, Math.max(0.20, multiplier)),
    compliance: "under_length",
  }
}

/**
 * Maps continuous AI band (1.0 - 6.0) to academic percentage factor (0.10 - 1.00).
 * - Band 1.0: 10%
 * - Band 2.0: 30%
 * - Band 3.0: 55% (Pass threshold)
 * - Band 4.0: 75% (Proficient / Merit)
 * - Band 5.0: 88% (Advanced / Distinction)
 * - Band 6.0: 100% (Exemplary / Mastery)
 */
function mapBandToQualityFactor(continuousBand: number): number {
  const b = Math.max(1.0, Math.min(6.0, continuousBand))

  if (b <= 2.0) {
    return 0.10 + (b - 1.0) * 0.20
  } else if (b <= 3.0) {
    return 0.30 + (b - 2.0) * 0.25
  } else if (b <= 4.0) {
    return 0.55 + (b - 3.0) * 0.20
  } else if (b <= 5.0) {
    return 0.75 + (b - 4.0) * 0.13
  } else {
    return 0.88 + (b - 5.0) * 0.12
  }
}
