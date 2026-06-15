import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getUserProfile } from "@/lib/supabase/profile"
import { revalidatePath } from "next/cache"

export async function POST(req: NextRequest) {
  try {
    const profile = await getUserProfile()
    if (!profile) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const isAdmin = profile.account_type === "admin"
    if (!isAdmin) {
      return NextResponse.json({ error: "Forbidden: admin only" }, { status: 403 })
    }

    const body = await req.json()
    const { problemId, data } = body

    if (!problemId || !data) {
      return NextResponse.json({ error: "Missing problemId or data" }, { status: 400 })
    }

    const supabase = (await createClient()) as any

    const { data: updated, error } = await supabase
      .from("logiclab_problems")
      .update(data)
      .eq("id", problemId)
      .select()

    if (error) {
      console.error("[update-problem] Update error:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Revalidate caches so changes show immediately
    try {
      revalidatePath("/logiclab", "page")
      revalidatePath("/logiclab/admin", "page")
    } catch (e) {
      console.error("Failed to revalidate cache:", e)
    }

    return NextResponse.json({ data: updated[0] })
  } catch (err: any) {
    console.error("[update-problem] Error:", err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
