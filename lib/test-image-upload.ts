import { uploadTestImagesAction } from "@/app/(dashboard)/(licensed)/tests/[testId]/edit/actions"

export const TEST_IMAGES_BUCKET = "test-images"

export interface StagedImage {
  blobUrl: string
  file: File
  alt?: string
}

/**
 * Uploads staged image files via secure Server Action to Supabase Storage under `tests/{testId}/...`
 * and returns a mapping from the temporary `blobUrl` to the permanent `publicUrl`.
 */
export async function uploadStagedTestImages(
  testId: string,
  stagedFiles: Map<string, File>
): Promise<Map<string, string>> {
  const urlMap = new Map<string, string>()
  if (stagedFiles.size === 0) return urlMap

  const formData = new FormData()
  for (const [blobUrl, file] of stagedFiles.entries()) {
    formData.append(blobUrl, file)
  }

  const result = await uploadTestImagesAction(testId, formData)
  if (!result.success || !result.urlMap) {
    throw new Error(result.error || "Failed to upload test images.")
  }

  for (const [blobUrl, publicUrl] of Object.entries(result.urlMap)) {
    urlMap.set(blobUrl, publicUrl)
  }

  return urlMap
}

/**
 * Extracts the first Markdown image URL `![alt](url)` found in a string, if any.
 */
export function extractMarkdownImageUrl(text: string): { url: string; alt: string; fullMatch: string } | null {
  if (!text) return null
  const match = /!\[(.*?)\]\(((?:https?:\/\/|blob:)[^)]+)\)/.exec(text)
  if (!match) return null
  return {
    alt: match[1],
    url: match[2],
    fullMatch: match[0],
  }
}

/**
 * Removes the markdown image tag `![alt](url)` from a string without stripping user spaces.
 */
export function stripMarkdownImage(text: string): string {
  if (!text) return ""
  return text.replace(/\n*!\[.*?\]\(((?:https?:\/\/|blob:)[^)]+)\)/g, "")
}

/**
 * Embeds or updates a markdown image within a text string while preserving typed spacing.
 */
export function setMarkdownImage(text: string, imageUrl: string | null, alt = "Image"): string {
  if (!imageUrl) {
    return stripMarkdownImage(text)
  }
  const cleanText = stripMarkdownImage(text)
  if (!cleanText.trim()) return `![${alt}](${imageUrl})`
  return `${cleanText.replace(/\n+$/, "")}\n\n![${alt}](${imageUrl})`
}

/**
 * Replaces all temporary blob URLs across questions and options with permanent public URLs.
 */
export function replaceBlobUrlsInQuestions<
  T extends {
    question_text: string
    explanation?: string | null
    options: { option_text: string; [key: string]: any }[]
    [key: string]: any
  }
>(questions: T[], urlMap: Map<string, string>): T[] {
  if (urlMap.size === 0) return questions

  return questions.map((q) => {
    let questionText = q.question_text
    let explanation = q.explanation || ""

    for (const [blobUrl, publicUrl] of urlMap.entries()) {
      questionText = questionText.split(blobUrl).join(publicUrl)
      if (explanation) {
        explanation = explanation.split(blobUrl).join(publicUrl)
      }
    }

    const updatedOptions = q.options.map((opt) => {
      let optionText = opt.option_text
      for (const [blobUrl, publicUrl] of urlMap.entries()) {
        optionText = optionText.split(blobUrl).join(publicUrl)
      }
      return {
        ...opt,
        option_text: optionText,
      }
    })

    return {
      ...q,
      question_text: questionText,
      explanation: explanation || null,
      options: updatedOptions,
    }
  })
}

/**
 * Returns the image URL. Safe against environments where Supabase Image Transformation
 * (imgproxy) is not enabled, avoiding 404/400 broken image errors.
 */
export function getOptimizedImageUrl(
  url: string,
  _options: {
    width?: number
    height?: number
    quality?: number
    resize?: "cover" | "contain" | "fill"
    format?: "origin" | "avif" | "webp"
  } = {}
): string {
  if (!url) return ""
  return url
}

