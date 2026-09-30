"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { getUserProfile } from "@/lib/supabase/profile"

export async function getPersonalNote(problemId: string, isDailyChallenge?: boolean) {
  const supabase = (await createClient()) as any
  
  const profile = await getUserProfile()
  if (!profile) return { note: null, error: "Unauthorized" }

  // Check if user has solved (always use logiclab_problem_submissions to include historical POTDs)
  const submissionTable = "logiclab_problem_submissions"
  const { data: solvedData } = await supabase
    .from(submissionTable)
    .select("status")
    .eq("user_id", profile.id)
    .eq("problem_id", problemId)
    .eq("status", "Accepted")
    .limit(1)

  const hasSolved = !!(solvedData && solvedData.length > 0)

  const { data, error } = await supabase
    .from("logiclab_problem_notes")
    .select("*")
    .eq("user_id", profile.id)
    .eq("problem_id", problemId)
    .maybeSingle()

  if (error && error.code !== 'PGRST116') {
    return { note: null, hasSolved, error: error.message }
  }

  return { note: data, hasSolved, error: null }
}

export async function savePersonalNote(params: {
  problemId: string
  content: string
  isPublic: boolean
  attachedCode: string | null
  attachedLanguage: string | null
}) {
  const supabase = (await createClient()) as any
  
  const profile = await getUserProfile()
  if (!profile) return { success: false, error: "Unauthorized" }

  const { error } = await supabase
    .from("logiclab_problem_notes")
    .upsert({
      user_id: profile.id,
      problem_id: params.problemId,
      content: params.content,
      is_public: params.isPublic,
      attached_code: params.attachedCode,
      attached_language: params.attachedLanguage,
      updated_at: new Date().toISOString()
    }, { onConflict: 'user_id,problem_id' })

  if (error) return { success: false, error: error.message }

  revalidatePath(`/logiclab/problems/${params.problemId}`)
  return { success: true }
}

export async function getCommunityNotes(problemId: string, isDailyChallenge?: boolean) {
  const supabase = (await createClient()) as any
  
  const profile = await getUserProfile()
  if (!profile) return { notes: [], error: "Unauthorized" }

  // 1. Check if the user has solved this problem (always use logiclab_problem_submissions)
  const submissionTable = "logiclab_problem_submissions"
  const { data: solvedData } = await supabase
    .from(submissionTable)
    .select("status")
    .eq("user_id", profile.id)
    .eq("problem_id", problemId)
    .eq("status", "Accepted")
    .limit(1)

  const hasSolved = !!(solvedData && solvedData.length > 0)

  // 2. Fetch public notes
  const { data: publicNotes, error } = await supabase
    .from("logiclab_problem_notes")
    .select(`
      id,
      content,
      is_public,
      attached_code,
      attached_language,
      upvotes_count,
      created_at,
      user_id
    `)
    .eq("problem_id", problemId)
    .eq("is_public", true)
    .order("upvotes_count", { ascending: false })
    .order("created_at", { ascending: false })

  if (error) return { notes: [], error: error.message }

  // 2b. Fetch user profiles separately since there is no direct foreign key
  const userIds = Array.from(new Set((publicNotes || []).map((n: any) => n.user_id)))
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, full_name, avatar_path")
    .in("id", userIds)

  const notesWithProfiles = (publicNotes || []).map((note: any) => ({
    ...note,
    profiles: profiles?.find((p: any) => p.id === note.user_id) || null
  }))

  // 3. Process notes and auto-migrate legacy attached_code
  const processedNotes = notesWithProfiles.map((note: any) => {
    if (note.attached_code) {
      const codeBlock = `\n\n\`\`\`${note.attached_language || 'javascript'}\n${note.attached_code}\n\`\`\``;
      if (!note.content) {
        note.content = codeBlock.trim();
      } else if (!note.content.includes(note.attached_code)) {
        note.content += codeBlock;
      }
    }
    return note
  })

  // 4. Also fetch user's upvotes
  const { data: upvotesData } = await supabase
    .from("logiclab_problem_notes_upvotes")
    .select("note_id")
    .eq("user_id", profile.id)

  const upvotedNoteIds = new Set(upvotesData?.map((u: any) => u.note_id) || [])

  return { notes: processedNotes, upvotedNoteIds: Array.from(upvotedNoteIds), hasSolved, error: null }
}

export async function toggleUpvote(noteId: string) {
  const supabase = (await createClient()) as any
  
  const profile = await getUserProfile()
  if (!profile) return { success: false, error: "Unauthorized" }

  const { data, error } = await supabase.rpc('toggle_note_upvote', {
    p_note_id: noteId,
    p_user_id: profile.id
  })

  if (error) return { success: false, error: error.message }
  return { success: true, isUpvoted: data }
}

export async function getSubmissionCode(submissionId: string, isDailyChallenge: boolean) {
  const supabase = (await createClient()) as any
  const profile = await getUserProfile()
  if (!profile) return { code: null, error: "Unauthorized" }

  const table = "logiclab_problem_submissions"
  const { data, error } = await supabase
    .from(table)
    .select("code, language_id")
    .eq("id", submissionId)
    .eq("user_id", profile.id)
    .maybeSingle()

  if (error || !data) {
    return { code: null, error: error?.message || "Submission code not found." }
  }

  return { code: data.code, languageId: data.language_id, error: null }
}
