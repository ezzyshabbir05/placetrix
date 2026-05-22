import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getUserProfile } from "@/lib/supabase/profile"

// POST /api/logiclab/seed-problems
// Seeds the coding_problems table from a JSON array in the request body.
// Requires admin/institute account. 
export async function POST(req: NextRequest) {
  try {
    const profile = await getUserProfile()
    if (!profile) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const isAdmin =
      profile.account_type === "admin" || profile.account_type === "institute"
    if (!isAdmin) {
      return NextResponse.json({ error: "Forbidden: admin only" }, { status: 403 })
    }

    const body = await req.json()
    const problems: any[] = Array.isArray(body) ? body : body.problems || []

    if (problems.length === 0) {
      return NextResponse.json({ error: "No problems provided" }, { status: 400 })
    }

    const supabase = (await createClient()) as any

    // Check existing to avoid duplicates
    const { data: existing } = await supabase
      .from("coding_problems")
      .select("title")

    const existingTitles = new Set(
      (existing || []).map((p: any) => p.title.trim().toLowerCase())
    )

    const toInsert = problems.filter(
      (p: any) => p.title && !existingTitles.has(p.title.trim().toLowerCase())
    )

    if (toInsert.length === 0) {
      return NextResponse.json({
        message: "All problems already exist in the database",
        inserted: 0,
        skipped: problems.length,
      })
    }

    const { data: inserted, error } = await supabase
      .from("coding_problems")
      .insert(toInsert)
      .select("id, title")

    if (error) {
      console.error("[seed-problems] Insert error:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      message: `Successfully seeded ${inserted.length} problems`,
      inserted: inserted.length,
      skipped: problems.length - toInsert.length,
      problems: inserted.map((p: any) => ({ id: p.id, title: p.title })),
    })
  } catch (err: any) {
    console.error("[seed-problems] Error:", err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
