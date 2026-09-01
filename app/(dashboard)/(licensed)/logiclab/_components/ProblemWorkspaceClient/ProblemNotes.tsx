"use client"

import React, { useState, useEffect, useRef, useCallback } from "react"
import { getPersonalNote, savePersonalNote, getCommunityNotes, toggleUpvote } from "../../problems/[id]/notes-actions"
import { toast } from "sonner"
import { getFriendlyErrorMessage } from "@/lib/errors"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Loader2, Lock, ThumbsUp, Code, FileText, Globe, ArrowLeft,
  List, ListOrdered, Link as LinkIcon, Eye, EyeOff,
  CheckCircle2, PenLine,
} from "lucide-react"
import { ProblemDescriptionViewer } from "./ProblemDescriptionViewer"
import { cn } from "@/lib/utils"

import dynamic from "next/dynamic"

const Editor = dynamic(() => import("@monaco-editor/react"), {
  ssr: false,
})
import { useTheme } from "next-themes"
import { createClient } from "@/lib/supabase/client"
import { LANGUAGES } from "../../_constants"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

interface ProblemNotesProps {
  problemId: string
  currentCode: string
  currentLanguage: string
  submissions?: any[]
  isDailyChallenge?: boolean
}

// ── Skeletons ─────────────────────────────────────────────────────────────────
function NotesSkeleton() {
  return (
    <div className="flex flex-col gap-3 p-5 flex-1">
      <Skeleton className="h-5 w-2/5 bg-muted/60" />
      <Skeleton className="h-3.5 w-full bg-muted/40" />
      <Skeleton className="h-3.5 w-5/6 bg-muted/40" />
      <Skeleton className="h-3.5 w-4/5 bg-muted/40" />
      <Skeleton className="h-3.5 w-full bg-muted/40" />
      <Skeleton className="h-3.5 w-3/4 bg-muted/40" />
      <div className="mt-4">
        <Skeleton className="h-3.5 w-1/3 bg-muted/60 mb-2" />
        <Skeleton className="h-20 w-full rounded-lg bg-muted/40" />
      </div>
      <div className="mt-2">
        <Skeleton className="h-3.5 w-1/4 bg-muted/60 mb-2" />
        <Skeleton className="h-3.5 w-full bg-muted/40" />
        <Skeleton className="h-3.5 w-5/6 bg-muted/40 mt-1" />
      </div>
    </div>
  )
}

function CommunityNotesSkeleton() {
  return (
    <div className="flex flex-col gap-4 p-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="rounded-xl border border-border/50 overflow-hidden">
          <div className="flex items-center gap-2 p-3 border-b border-border/30 bg-muted/20">
            <Skeleton className="h-6 w-6 rounded-full bg-muted/60" />
            <Skeleton className="h-3.5 w-24 bg-muted/50" />
            <Skeleton className="h-3.5 w-16 bg-muted/30 ml-2" />
          </div>
          <div className="p-4 flex flex-col gap-2">
            <Skeleton className="h-3.5 w-full bg-muted/40" />
            <Skeleton className="h-3.5 w-5/6 bg-muted/40" />
            <Skeleton className="h-3.5 w-4/5 bg-muted/40" />
            <Skeleton className="h-3.5 w-2/3 bg-muted/40" />
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Empty state shown when note has no content yet ────────────────────────────
function EmptyNoteState({ onStart }: { onStart: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center flex-1 select-none gap-4 px-8 text-center">
      <div className="w-12 h-12 rounded-2xl bg-muted/40 border border-border/40 flex items-center justify-center">
        <PenLine className="w-5 h-5 text-muted-foreground/50" />
      </div>
      <div className="space-y-1">
        <p className="text-sm font-semibold text-foreground/70">No notes yet</p>
        <p className="text-xs text-muted-foreground/60 leading-relaxed max-w-[200px]">
          Write your approach, key insights, or paste your solution to save for later.
        </p>
      </div>
      <Button
        variant="outline"
        size="sm"
        className="h-8 text-xs rounded-lg px-4 border-dashed"
        onClick={onStart}
      >
        Start writing
      </Button>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
export function ProblemNotes({ problemId, currentCode, currentLanguage, submissions, isDailyChallenge }: ProblemNotesProps) {
  const { resolvedTheme } = useTheme()
  const monacoTheme = resolvedTheme === "light" ? "vs" : "vs-dark"
  const [showCommunityNotes, setShowCommunityNotes] = useState(false)

  // ── Note state ────────────────────────────────────────────────────────────
  const [personalContent, setPersonalContent] = useState("")
  const [savedContent, setSavedContent] = useState("")       // mirrors last DB save
  const [isPublic, setIsPublic] = useState(false)
  const [savedIsPublic, setSavedIsPublic] = useState(false)  // mirrors last DB save
  const [isPublicDialogOpen, setIsPublicDialogOpen] = useState(false)
  const [attachedCode, setAttachedCode] = useState<string | null>(null)
  const [attachedLanguage, setAttachedLanguage] = useState<string | null>(null)
  const [previewMode, setPreviewMode] = useState(false)

  // ── Save state ────────────────────────────────────────────────────────────
  const [isSaving, setIsSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState<"idle" | "saved" | "dirty">("idle")
  const [isLoadingPersonal, setIsLoadingPersonal] = useState(true)
  const [hasSolved, setHasSolved] = useState(false)
  const [isFetchingCode, setIsFetchingCode] = useState(false)

  // ── Community state ───────────────────────────────────────────────────────
  const [communityNotes, setCommunityNotes] = useState<any[]>([])
  const [upvotedIds, setUpvotedIds] = useState<Set<string>>(new Set())
  const [isLoadingCommunity, setIsLoadingCommunity] = useState(false)
  const [hasLoadedCommunity, setHasLoadedCommunity] = useState(false)

  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const monacoEditorRef = useRef<any>(null)

  // ── Dirty tracking ─────────────────────────────────────────────────────────
  const isDirty = personalContent !== savedContent || isPublic !== savedIsPublic

  useEffect(() => {
    if (saveStatus === "saved" && isDirty) setSaveStatus("dirty")
  }, [personalContent, isPublic])

  // ── Reset on problem change ───────────────────────────────────────────────
  useEffect(() => {
    setCommunityNotes([])
    setHasLoadedCommunity(false)
    setPersonalContent("")
    setSavedContent("")
    setIsPublic(false)
    setSavedIsPublic(false)
    setAttachedCode(null)
    setAttachedLanguage(null)
    setSaveStatus("idle")
    setPreviewMode(false)
  }, [problemId])

  // ── Load personal note ────────────────────────────────────────────────────
  useEffect(() => {
    async function load() {
      setIsLoadingPersonal(true)
      try {
        const res = await getPersonalNote(problemId, isDailyChallenge)
        if (res.note) {
          let loadedContent = res.note.content || ""
          if (res.note.attached_code) {
            const codeBlock = `\n\n\`\`\`${res.note.attached_language || "javascript"}\n${res.note.attached_code}\n\`\`\``
            if (!loadedContent) loadedContent = codeBlock.trim()
            else if (!loadedContent.includes(res.note.attached_code)) loadedContent += codeBlock
          }
          setPersonalContent(loadedContent)
          setSavedContent(loadedContent)
          const pub = res.note.is_public ?? false
          setIsPublic(pub)
          setSavedIsPublic(pub)
          setAttachedCode(res.note.attached_code || null)
          setAttachedLanguage(res.note.attached_language || null)
          if (loadedContent) {
            setSaveStatus("saved")
          }
        }
        setHasSolved(res.hasSolved ?? false)
      } catch (err) {
        console.error("Failed to load personal note:", err)
      } finally {
        setIsLoadingPersonal(false)
      }
    }
    load()
  }, [problemId, isDailyChallenge])

  // ── Load community notes ──────────────────────────────────────────────────
  useEffect(() => {
    if (showCommunityNotes && !hasLoadedCommunity) {
      async function load() {
        setIsLoadingCommunity(true)
        const res = await getCommunityNotes(problemId, isDailyChallenge)
        if (!res.error) {
          setCommunityNotes(res.notes)
          setUpvotedIds(new Set(res.upvotedNoteIds as string[]))
          setHasLoadedCommunity(true)
        }
        setIsLoadingCommunity(false)
      }
      load()
    }
  }, [showCommunityNotes, problemId, hasLoadedCommunity, isDailyChallenge])

  // ── Save (explicit only — no auto-save) ──────────────────────────────────
  const handleSave = useCallback(async (override?: { isPublic?: boolean }) => {
    if (isSaving) return
    setIsSaving(true)

    let currentAttachedCode = attachedCode
    let currentAttachedLanguage = attachedLanguage
    if (currentAttachedCode && !personalContent.includes(currentAttachedCode)) {
      currentAttachedCode = null
      currentAttachedLanguage = null
      setAttachedCode(null)
      setAttachedLanguage(null)
    }

    const currentIsPublic = override?.isPublic !== undefined ? override.isPublic : isPublic

    const res = await savePersonalNote({
      problemId,
      content: personalContent,
      isPublic: currentIsPublic,
      attachedCode: currentAttachedCode,
      attachedLanguage: currentAttachedLanguage,
    })

    if (res.success) {
      setSavedContent(personalContent)
      setSavedIsPublic(currentIsPublic)
      setSaveStatus("saved")
      toast.success(currentIsPublic ? "Note saved & published!" : "Note saved!")
      // Only invalidate community cache when visibility changes
      if (currentIsPublic !== savedIsPublic) setHasLoadedCommunity(false)
    } else {
      toast.error(res.error || "Failed to save")
    }
    setIsSaving(false)
  }, [isSaving, attachedCode, attachedLanguage, personalContent, isPublic, problemId, savedIsPublic])

  // ── Content change → mark dirty ───────────────────────────────────────────
  const handleContentChange = (value: string) => {
    setPersonalContent(value)
    if (saveStatus === "saved") setSaveStatus("dirty")
    else if (saveStatus === "idle" && value) setSaveStatus("dirty")
  }

  // ── Code attachment ───────────────────────────────────────────────────────
  const handleInsertAtEnd = (codeToInsert: string, lang: string) => {
    const targetLang = (lang || "javascript").toLowerCase()
    const newBlock = `\n\n\`\`\`${targetLang}\n${codeToInsert}\n\`\`\`\n`

    if (monacoEditorRef.current) {
      const editor = monacoEditorRef.current
      const model = editor.getModel()
      const currentContent = model.getValue()
      const escapedLang = targetLang.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
      if (new RegExp(`(^|\\n)\\s*\`\`\`${escapedLang}\\b`, "i").test(currentContent)) {
        toast.error(`Already attached a ${targetLang} solution!`); return
      }
      const lineCount = model.getLineCount()
      const lastCol = model.getLineMaxColumn(lineCount)
      editor.executeEdits("my-source", [{
        range: { startLineNumber: lineCount, startColumn: lastCol, endLineNumber: lineCount, endColumn: lastCol },
        text: newBlock, forceMoveMarkers: true,
      }])
      editor.revealLine(lineCount + 5)
      editor.focus()
    } else if (textareaRef.current) {
      handleContentChange(personalContent + newBlock)
    } else {
      toast.error("No editor found."); return
    }
    setAttachedCode(codeToInsert)
    setAttachedLanguage(lang)
    if (saveStatus === "saved") setSaveStatus("dirty")
    toast.success("Code inserted!")
  }

  const handleInsertCurrentCode = () => {
    if (!hasSolved) { toast.error("Solve the problem first."); return }
    handleInsertAtEnd(currentCode, currentLanguage)
  }

  const handleInsertPastSubmission = async (sub: any) => {
    if (!hasSolved) { toast.error("Solve the problem first."); return }
    setIsFetchingCode(true)
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from(isDailyChallenge ? "logiclab_daily_challenge_submissions" : "logiclab_problem_submissions")
        .select("code, language_id").eq("id", sub.id).maybeSingle()
      if (error || !data) throw new Error("Submission not found")
      const langObj = LANGUAGES.find((l: any) => l.id === data.language_id)
      handleInsertAtEnd(data.code, langObj ? langObj.value : "javascript")
    } catch (e: any) {
      toast.error(getFriendlyErrorMessage(e, "Failed to load submission code."))
    } finally {
      setIsFetchingCode(false)
    }
  }

  // ── Upvote ─────────────────────────────────────────────────────────────────
  const handleUpvote = async (noteId: string) => {
    const isUpvoted = upvotedIds.has(noteId)
    setUpvotedIds((prev) => { const n = new Set(prev); isUpvoted ? n.delete(noteId) : n.add(noteId); return n })
    setCommunityNotes((notes) => notes.map((n) => n.id === noteId ? { ...n, upvotes_count: n.upvotes_count + (isUpvoted ? -1 : 1) } : n))
    const res = await toggleUpvote(noteId)
    if (!res.success) {
      toast.error("Failed to upvote")
      setUpvotedIds((prev) => { const n = new Set(prev); isUpvoted ? n.add(noteId) : n.delete(noteId); return n })
      setCommunityNotes((notes) => notes.map((n) => n.id === noteId ? { ...n, upvotes_count: n.upvotes_count + (isUpvoted ? 1 : -1) } : n))
    }
  }

  // ── Format insertion ───────────────────────────────────────────────────────
  const insertFormat = (prefix: string, suffix = "") => {
    if (monacoEditorRef.current) {
      const editor = monacoEditorRef.current
      const selection = editor.getSelection()
      const text = editor.getModel().getValueInRange(selection)
      editor.executeEdits("my-source", [{ range: selection, text: prefix + text + suffix, forceMoveMarkers: true }])
      editor.focus()
      if (!text) { const pos = editor.getPosition(); editor.setPosition({ lineNumber: pos.lineNumber, column: pos.column - suffix.length }) }
      if (saveStatus === "saved") setSaveStatus("dirty")
      return
    }
    const ta = textareaRef.current
    if (!ta) return
    const s = ta.selectionStart, e = ta.selectionEnd
    const selected = personalContent.substring(s, e)
    handleContentChange(personalContent.substring(0, s) + prefix + selected + suffix + personalContent.substring(e))
    setTimeout(() => { ta.focus(); ta.setSelectionRange(s + prefix.length, e + prefix.length) }, 0)
  }

  // ── Save button label + style ──────────────────────────────────────────────
  const saveLabel = isSaving ? "Saving…" : isDirty ? "Save" : saveStatus === "saved" ? "Saved ✓" : "Save"
  const saveVariant: "default" | "outline" | "secondary" = isDirty ? "default" : "outline"

  // ── Shared: Attach Code dropdown ───────────────────────────────────────────
  const attachCodeDropdown = (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" disabled={!hasSolved || isFetchingCode}
          className="h-7 text-[12px] px-3 rounded-md font-medium shrink-0"
          title={!hasSolved ? "Solve the problem first" : "Attach Code"}>
          {isFetchingCode ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Attach Code"}
        </Button>
      </DropdownMenuTrigger>
      {hasSolved && (
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Attach Code</DropdownMenuLabel>
          <DropdownMenuItem onClick={handleInsertCurrentCode} className="cursor-pointer text-sm">
            <Code className="w-3.5 h-3.5 mr-2 opacity-60" /> Current Editor Code
          </DropdownMenuItem>
          {submissions && submissions.filter((s: any) => s.status === "Accepted").length > 0 && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuLabel className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Past Submissions</DropdownMenuLabel>
              {submissions.filter((s: any) => s.status === "Accepted").map((sub: any) => (
                <DropdownMenuItem key={sub.id} onClick={() => handleInsertPastSubmission(sub)} className="cursor-pointer text-sm">
                  <FileText className="w-3.5 h-3.5 mr-2 opacity-60" />
                  Accepted ({new Date(sub.created_at).toLocaleDateString()})
                </DropdownMenuItem>
              ))}
            </>
          )}
        </DropdownMenuContent>
      )}
    </DropdownMenu>
  )

  // ── Shared: Make Public dialog ─────────────────────────────────────────────
  const makePublicDialog = (
    <AlertDialog open={isPublicDialogOpen} onOpenChange={setIsPublicDialogOpen}>
      <AlertDialogTrigger asChild>
        <Button
          variant={isPublic ? "default" : "outline"} size="sm"
          disabled={!hasSolved}
          className={cn("h-7 text-[12px] px-3 rounded-md font-medium shrink-0",
            isPublic && "bg-emerald-500 hover:bg-emerald-600 text-white border-emerald-500")}
          title={!hasSolved ? "Solve the problem to share your notes" : "Toggle visibility"}>
          {isPublic ? "Public" : "Make Public"}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent className="bg-card border-border text-foreground">
        <AlertDialogHeader>
          <AlertDialogTitle>{isPublic ? "Make Note Private?" : "Make Note Public?"}</AlertDialogTitle>
          <AlertDialogDescription className="text-muted-foreground">
            {isPublic
              ? "Your note will be removed from Community Notes and only visible to you."
              : "Your note will be visible to everyone who has solved this problem. This will also save any unsaved changes."}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={async () => {
              const newState = !isPublic
              setIsPublic(newState)
              // Explicit user action — save immediately with new visibility
              await handleSave({ isPublic: newState })
            }}
            className={isPublic ? "bg-red-500 hover:bg-red-600 text-white" : "bg-emerald-500 hover:bg-emerald-600 text-white"}>
            {isPublic ? "Make Private" : "Make Public & Save"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )

  // ── Formatting toolbar ─────────────────────────────────────────────────────
  const formattingToolbar = (
    <div className="flex items-center gap-0.5 shrink-0">
      <Button variant="ghost" size="icon" className="h-7 w-7 rounded font-serif font-bold text-[13px] text-muted-foreground hover:text-foreground" onClick={() => insertFormat("### ")} title="Heading">H</Button>
      <Button variant="ghost" size="icon" className="h-7 w-7 rounded font-serif font-bold text-[13px] text-muted-foreground hover:text-foreground" onClick={() => insertFormat("**", "**")} title="Bold">B</Button>
      <Button variant="ghost" size="icon" className="h-7 w-7 rounded font-serif italic text-[13px] text-muted-foreground hover:text-foreground" onClick={() => insertFormat("*", "*")} title="Italic">I</Button>
      <div className="w-px h-4 bg-border mx-0.5" />
      <Button variant="ghost" size="icon" className="h-7 w-7 rounded text-muted-foreground hover:text-foreground" onClick={() => insertFormat("- ")} title="Bullet List"><List className="w-3.5 h-3.5" /></Button>
      <Button variant="ghost" size="icon" className="h-7 w-7 rounded text-muted-foreground hover:text-foreground" onClick={() => insertFormat("1. ")} title="Numbered List"><ListOrdered className="w-3.5 h-3.5" /></Button>
      <div className="w-px h-4 bg-border mx-0.5" />
      <Button variant="ghost" size="icon" className="h-7 w-7 rounded font-mono text-[11px] text-muted-foreground hover:text-foreground" onClick={() => insertFormat("```\n", "\n```")} title="Code Block">{"{}"}</Button>
      <Button variant="ghost" size="icon" className="h-7 w-7 rounded text-muted-foreground hover:text-foreground" onClick={() => insertFormat("[", "](url)")} title="Link"><LinkIcon className="w-3.5 h-3.5" /></Button>
    </div>
  )

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="flex-1 h-full w-full flex flex-col bg-card overflow-hidden min-h-0 text-foreground">
      {!showCommunityNotes ? (
        <div className="flex flex-col flex-1 min-h-0 h-full overflow-hidden">

          {/* ── Desktop toolbar ── */}
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 shrink-0 border-b border-border/20">
            {formattingToolbar}
            <div className="w-px h-4 bg-border mx-1" />
            <Button variant="ghost" size="icon"
              className={cn("h-7 w-7 rounded", previewMode ? "text-emerald-500 bg-emerald-500/10" : "text-muted-foreground hover:text-foreground")}
              onClick={() => setPreviewMode(!previewMode)} title={previewMode ? "Exit Preview" : "Preview"}>
              {previewMode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </Button>
            <div className="ml-auto flex items-center gap-2">
              {/* Dirty indicator */}
              {isDirty && !isSaving && (
                <span className="text-[10px] text-amber-500 flex items-center gap-1 font-medium select-none">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block" />
                  Unsaved changes
                </span>
              )}
              {isPublic && !isDirty && (
                <span className="text-[10px] text-emerald-500 font-semibold border border-emerald-500/30 bg-emerald-500/10 rounded px-1.5 py-0.5 flex items-center gap-1">
                  <Globe className="w-3 h-3" /> Public
                </span>
              )}
              <Button variant="link" size="sm" onClick={() => setShowCommunityNotes(true)} className="h-auto p-0 text-muted-foreground hover:text-foreground text-[11px]">
                Community
              </Button>
            </div>
          </div>

          {/* ── Mobile toolbar ── */}
          <div className="flex md:hidden items-center gap-1 px-2 py-1.5 shrink-0 border-b border-border/20 overflow-x-auto">
            {formattingToolbar}
            <div className="w-px h-4 bg-border mx-0.5 shrink-0" />
            <Button variant="ghost" size="icon"
              className={cn("h-7 w-7 rounded shrink-0", previewMode ? "text-emerald-500 bg-emerald-500/10" : "text-muted-foreground hover:text-foreground")}
              onClick={() => setPreviewMode(!previewMode)}>
              {previewMode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </Button>
          </div>

          {/* ── Editor / Preview area ── */}
          <div className="flex-1 min-h-0 flex flex-col overflow-hidden bg-white dark:bg-[#1e1e1e] relative">
            {isLoadingPersonal ? (
              <NotesSkeleton />
            ) : previewMode ? (
              <div className="flex-1 min-h-0 overflow-y-auto px-5 pt-3 pb-4">
                {personalContent
                  ? <ProblemDescriptionViewer content={personalContent} />
                  : <span className="italic text-muted-foreground text-[13px]">Nothing to preview</span>}
              </div>
            ) : (
              <>
                {/* Mobile textarea */}
                <textarea
                  ref={textareaRef}
                  value={personalContent}
                  onChange={(e) => handleContentChange(e.target.value)}
                  placeholder="Write your notes here… (Markdown supported)"
                  className="flex md:hidden flex-1 w-full font-mono text-[13px] bg-zinc-50 dark:bg-zinc-950 text-zinc-800 dark:text-zinc-100 p-4 resize-none outline-none border-0 min-h-0"
                  style={{ height: "100%" }}
                />
                {/* Desktop Monaco */}
                <div className="hidden md:flex flex-1 min-h-0 flex-col relative">
                  {!personalContent && (
                    <div className="absolute top-1 left-5 text-zinc-500/40 text-[13px] font-mono pointer-events-none z-10">
                      Write your notes here… (Markdown supported)
                    </div>
                  )}
                  <Editor
                    value={personalContent}
                    onChange={(v) => handleContentChange(v || "")}
                    language="markdown"
                    theme={monacoTheme}
                    onMount={(editor) => { monacoEditorRef.current = editor; }}
                    options={{
                      minimap: { enabled: false },
                      automaticLayout: true,
                      wordWrap: "on",
                      lineNumbers: "off",
                      folding: false,
                      glyphMargin: false,
                      lineDecorationsWidth: 20,
                      lineNumbersMinChars: 0,
                      renderLineHighlight: "none",
                      scrollbar: { vertical: "auto", horizontal: "auto" },
                      padding: { top: 4, bottom: 80 },
                      fontSize: 13,
                      fontFamily: "var(--font-mono), monospace",
                      scrollBeyondLastLine: false,
                      overviewRulerBorder: false,
                      hideCursorInOverviewRuler: true,
                    }}
                    className="h-full w-full"
                  />
                </div>
              </>
            )}

            {/* Desktop floating footer */}
            {!isLoadingPersonal && (
              <div className="hidden md:flex absolute bottom-0 left-0 right-0 items-center justify-end px-5 py-3 pointer-events-none bg-gradient-to-t from-white dark:from-[#1e1e1e] to-transparent pt-8">
                <div className="pointer-events-auto flex items-center gap-2">
                  <Button
                    variant={saveVariant}
                    size="sm"
                    disabled={isSaving || (!isDirty && saveStatus === "saved")}
                    onClick={() => handleSave()}
                    className={cn(
                      "h-7 text-[12px] px-4 rounded-md font-medium transition-all",
                      isDirty && "shadow-sm"
                    )}>
                    {isSaving ? <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />Saving…</> : saveLabel}
                  </Button>
                  {attachCodeDropdown}
                  {makePublicDialog}
                </div>
              </div>
            )}
          </div>

          {/* ── Mobile sticky footer ── */}
          {!isLoadingPersonal && (
            <div className="flex md:hidden shrink-0 items-center border-t border-border/30 bg-card px-2 py-2 gap-2">
              {/* Save — left */}
              <Button
                variant={saveVariant}
                size="sm"
                disabled={isSaving || (!isDirty && saveStatus === "saved")}
                onClick={() => handleSave()}
                className={cn("h-8 text-[12px] px-3 rounded-md font-medium shrink-0 transition-all", isDirty && "shadow-sm")}>
                {isSaving
                  ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  : isDirty
                    ? "Save"
                    : <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />}
              </Button>

              {/* Attach Code — center */}
              <div className="flex-1 flex justify-center">
                {attachCodeDropdown}
              </div>

              {/* Make Public + Community — right */}
              <div className="flex items-center gap-1.5 shrink-0">
                {makePublicDialog}
                <Button
                  variant="ghost" size="sm"
                  onClick={() => setShowCommunityNotes(true)}
                  className="h-8 w-8 p-0 rounded-md text-muted-foreground hover:text-foreground border border-border/50 shrink-0">
                  <Globe className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          )}
        </div>
      ) : (
        // ── COMMUNITY NOTES VIEW ──────────────────────────────────────────────
        <div className="flex flex-col flex-1 min-h-0 h-full overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2.5 shrink-0 bg-card/95 backdrop-blur border-b border-border/50">
            <Button variant="ghost" size="sm" onClick={() => setShowCommunityNotes(false)} className="h-8 -ml-2 text-muted-foreground gap-1 text-xs">
              <ArrowLeft className="w-4 h-4" /> Editor
            </Button>
            <h2 className="text-sm font-semibold text-muted-foreground">Community Notes</h2>
            <div className="w-16" />
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto">
            {isLoadingCommunity ? (
              <CommunityNotesSkeleton />
            ) : communityNotes.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-8 text-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-muted/40 border border-border/40 flex items-center justify-center">
                  <Globe className="w-5 h-5 opacity-40" />
                </div>
                <div className="space-y-1">
                  <p className="font-semibold text-sm">No community notes yet</p>
                  <p className="text-xs opacity-60">Be the first to make your note public.</p>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-4 p-4">
                {!hasSolved && (
                  <div className="bg-blue-500/10 text-blue-600 dark:text-blue-400 p-3 rounded-lg border border-blue-500/20 text-sm flex items-start gap-3">
                    <Lock className="w-5 h-5 shrink-0 mt-0.5" />
                    <p>Solve this problem to see attached code in community notes.</p>
                  </div>
                )}
                {communityNotes.map((note) => (
                  <div key={note.id} className="bg-card border border-border/50 rounded-xl overflow-hidden shadow-sm">
                    <div className="flex items-center justify-between p-3 border-b border-border/30 bg-muted/20">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                          {((note.profiles as any)?.full_name || (note.profiles as any)?.[0]?.full_name)?.charAt(0)?.toUpperCase() || "U"}
                        </div>
                        <div>
                          <span className="text-sm font-medium block leading-tight">
                            {((note.profiles as any)?.full_name || (note.profiles as any)?.[0]?.full_name) || "Unknown User"}
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            {new Date(note.updated_at || note.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      <Button
                        variant="ghost" size="sm"
                        className={cn("h-8 gap-1.5 px-2 rounded-lg", upvotedIds.has(note.id) && "text-blue-500 bg-blue-500/10 hover:bg-blue-500/20 hover:text-blue-600")}
                        onClick={() => handleUpvote(note.id)}>
                        <ThumbsUp className="w-3.5 h-3.5" />
                        <span className="text-xs font-semibold">{note.upvotes_count}</span>
                      </Button>
                    </div>
                    <div className="p-4">
                      {note.content
                        ? <ProblemDescriptionViewer content={note.content} isSpoilerMode={!hasSolved} />
                        : <p className="italic text-muted-foreground text-sm">No content provided.</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
