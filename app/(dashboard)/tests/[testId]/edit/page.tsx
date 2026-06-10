import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { CreateTestClient } from "./CreateTestClient"
import {
  saveDraftAction,
  publishTestAction,
  generateQuestionsAction,
  loadTestAction,
} from "./actions"

interface Props {
  params: Promise<{ testId: string }>
}

export default async function TestEditorPage({ params }: Props) {
  const { testId } = await params
  const supabase = await createClient()

  // ── Auth guard ──────────────────────────────────────────────────────────────
  const { data } = await supabase.auth.getClaims()
  const user = data?.claims
  if (!user) redirect("/auth/login")

  // ── Account-type guard (must resolve before parallel fetches) ───────────────
  const { data: profile } = await (supabase as any)
    .from("profiles")
    .select("account_type")
    .eq("id", user.sub)
    .single()

  if (profile?.account_type !== "institute") redirect("/tests")

  // ── Parallel fetches: tags + test data are independent of each other ─────────
  const isNew = testId === "new"

  const [{ data: tags }, initialData] = await Promise.all([
    (supabase as any).from("tags").select("id, name").order("name"),
    isNew ? Promise.resolve(null) : loadTestAction(testId, user.sub as string),
  ])

  // Bounce if editing a test that doesn't exist or belongs to someone else
  if (!isNew && !initialData) redirect("/tests")

  return (
    <CreateTestClient
      testId={isNew ? undefined : testId}
      initialData={initialData ?? undefined}
      availableTags={tags ?? []}
      generateQuestionsAction={generateQuestionsAction}
      onSaveDraft={saveDraftAction}
      onPublish={publishTestAction}
    />
  )
}
