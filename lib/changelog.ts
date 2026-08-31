import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

export type ChangelogCategoryType = "added" | "improved" | "fixed" | "security"

export interface ChangelogCategory {
  type: ChangelogCategoryType
  items: string[]
}

export interface ChangelogItem {
  id?: string
  version: string
  date: string // ISO date format YYYY-MM-DD
  title: string
  categories: ChangelogCategory[]
  is_published?: boolean
  created_at?: string
}

/**
 * Fetches all published changelogs from the database in chronological order (latest first).
 */
export async function getChangelogs(): Promise<ChangelogItem[]> {
  try {
    const supabase = createAdminClient()
    const { data, error } = await (supabase as any)
      .from("changelogs")
      .select("*")
      .eq("is_published", true)
      .order("date", { ascending: false })
      .order("created_at", { ascending: false })

    if (error) {
      console.error("[CHANGELOG] Error fetching changelogs:", error)
      return []
    }

    return (data || []).map((item: any) => ({
      id: item.id,
      version: item.version,
      date: typeof item.date === "string" ? item.date.split("T")[0] : item.date,
      title: item.title,
      categories: Array.isArray(item.categories) ? item.categories : [],
      is_published: item.is_published,
      created_at: item.created_at,
    }))
  } catch (err) {
    console.error("[CHANGELOG] Exception in getChangelogs:", err)
    return []
  }
}

/**
 * Fetches the latest published changelog version.
 */
export async function getLatestChangelog(): Promise<ChangelogItem | null> {
  try {
    const supabase = await createClient()
    const { data, error } = await (supabase as any)
      .from("changelogs")
      .select("*")
      .eq("is_published", true)
      .order("date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error || !data) return null

    return {
      id: data.id,
      version: data.version,
      date: typeof data.date === "string" ? data.date.split("T")[0] : data.date,
      title: data.title,
      categories: Array.isArray(data.categories) ? data.categories : [],
      is_published: data.is_published,
      created_at: data.created_at,
    }
  } catch (err) {
    console.error("[CHANGELOG] Exception in getLatestChangelog:", err)
    return null
  }
}

/**
 * Inserts a new changelog release into database.
 */
export async function publishChangelog(input: {
  version: string
  title: string
  date?: string
  categories: ChangelogCategory[]
}): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const supabase = createAdminClient()

    const { data: changelog, error } = await (supabase as any)
      .from("changelogs")
      .insert({
        version: input.version,
        title: input.title,
        date: input.date || new Date().toISOString().split("T")[0],
        categories: input.categories,
        is_published: true,
      })
      .select()
      .single()

    if (error) {
      console.error("[CHANGELOG] Failed to publish changelog:", error)
      return { success: false, error: error.message }
    }

    return { success: true, data: changelog }
  } catch (err: any) {
    console.error("[CHANGELOG] Exception in publishChangelog:", err)
    return { success: false, error: err.message || "Failed to publish changelog" }
  }
}
