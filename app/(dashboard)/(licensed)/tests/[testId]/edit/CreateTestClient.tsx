"use client"

import { useState, useCallback, useEffect, useTransition, useRef, useMemo } from "react"
import { toast } from "sonner"
import { getFriendlyErrorMessage } from "@/lib/errors"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle,
} from "@/components/ui/sheet"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion"
import { DateTimePicker } from "@/components/datetime-picker"
import { InlineRichText } from "@/components/others/rich-text"
import { cn } from "@/lib/utils"
import {
  Loader2, Save, Send, AlertCircle, AlertTriangle, BookOpen, CheckCircle2, Circle, Plus, Tag, X,
  PlusCircle, Sparkles, Upload, Trash2, Pencil, ChevronDown, ChevronUp, Info, FileJson, Image,
  GripVertical, Layers, Check, Eye, Code
} from "lucide-react"
import {
  Combobox,
  ComboboxChips,
  ComboboxChip,
  ComboboxChipsInput,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxList,
  ComboboxItem,
  useComboboxAnchor,
} from "@/components/ui/combobox"
import { UsersRound } from "lucide-react"
import type { CohortOption } from "@/app/(dashboard)/(licensed)/cohorts/types"
import { GenerateButton } from "@/components/others/generate-button"

// @dnd-kit imports for drag and drop
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  DragOverlay,
} from "@dnd-kit/core"
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"

import type {
  SettingsForm,
  LocalQuestion,
  LocalSection,
  SectionForm,
  QuestionForm,
  OptionForm,
  AiGenerateForm,
  InitialTestData,
  GenerateQuestionsResult,
} from "./actions"
import {
  uploadStagedTestImages,
  replaceBlobUrlsInQuestions,
} from "@/lib/test-image-upload"
import { RichText } from "@/components/others/rich-text"

interface Props {
  testId?: string
  initialData?: InitialTestData
  availableTags: { id: string; name: string }[]
  generateQuestionsAction: (input: AiGenerateForm) => Promise<GenerateQuestionsResult>
  onSaveDraft: (id: string, settings: SettingsForm, questions: LocalQuestion[], sections: LocalSection[]) => Promise<void>
  onPublish: (id: string, settings: SettingsForm, questions: LocalQuestion[], sections: LocalSection[]) => Promise<void>
  cohortOptions?: CohortOption[]
}

const EMPTY_SETTINGS: SettingsForm = {
  title: "",
  description: "",
  instructions: "",
  time_limit_minutes: "",
  available_from: "",
  available_until: "",
  shuffle_questions: true,
  shuffle_options: true,
  strict_mode: true,
  pass_percentage: "",
  cohort_ids: [],
}

// ── Timezone helpers ──────────────────────────────────────────────────────────

export function toLocalDateTimeInput(isoString: string): string {
  if (!isoString) return ""
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(isoString)) return isoString
  const d = new Date(isoString)
  if (isNaN(d.getTime())) return ""
  const offsetMs = d.getTimezoneOffset() * 60 * 1000
  const localDate = new Date(d.getTime() - offsetMs)
  return localDate.toISOString().slice(0, 16)
}

export function toUTCISOString(localDT: string): string {
  if (!localDT) return ""
  const d = new Date(localDT)
  if (isNaN(d.getTime())) return ""
  return d.toISOString()
}

export function normalizeDefaults(values: SettingsForm): SettingsForm {
  return {
    ...values,
    available_from: toLocalDateTimeInput(values.available_from),
    available_until: toLocalDateTimeInput(values.available_until),
  }
}

function settingsForDb(settings: SettingsForm): SettingsForm {
  return {
    ...settings,
    available_from: toUTCISOString(settings.available_from),
    available_until: toUTCISOString(settings.available_until),
  }
}

// ─── Main CreateTestClient Component ───────────────────────────────────────────

export function CreateTestClient({
  testId: propTestId,
  initialData,
  availableTags,
  generateQuestionsAction,
  onSaveDraft,
  onPublish,
  cohortOptions,
}: Props) {
  const isEditMode = propTestId !== undefined
  const [testId] = useState<string>(() => propTestId ?? crypto.randomUUID())

  const [settings, setSettings] = useState<SettingsForm>(() =>
    normalizeDefaults(initialData?.settings ?? EMPTY_SETTINGS)
  )

  // Ensure default Section A exists if test has no sections
  const [sections, setSections] = useState<LocalSection[]>(() => {
    if (initialData?.sections && initialData.sections.length > 0) {
      return initialData.sections
    }
    return [{ id: crypto.randomUUID(), name: "Section A", description: "", order_index: 1 }]
  })

  const [questions, setQuestions] = useState<LocalQuestion[]>(() => {
    const rawQuestions = initialData?.questions ?? []
    return rawQuestions
  })

  // Mandatory Section constraint guard: Ensure at least 1 section exists, and all questions belong to a valid section
  useEffect(() => {
    if (sections.length === 0) {
      const defaultSecId = crypto.randomUUID()
      const defaultSec: LocalSection = { id: defaultSecId, name: "Section A", description: "", order_index: 1 }
      setSections([defaultSec])
      setQuestions((prev) => prev.map((q) => ({ ...q, section_id: defaultSecId })))
    } else {
      const validSecIds = new Set(sections.map((s) => s.id))
      const fallbackSecId = sections[0].id
      let changed = false
      const fixedQuestions = questions.map((q) => {
        if (!q.section_id || !validSecIds.has(q.section_id)) {
          changed = true
          return { ...q, section_id: fallbackSecId }
        }
        return q
      })
      if (changed) setQuestions(fixedQuestions)
    }
  }, [sections, questions])

  const [isSaving, setIsSaving] = useState(false)
  const [isPublishing, setIsPublishing] = useState(false)
  const stagedFilesRef = useRef<Map<string, File>>(new Map())

  const stageImageFile = useCallback((file: File): string => {
    const blobUrl = URL.createObjectURL(file)
    stagedFilesRef.current.set(blobUrl, file)
    return blobUrl
  }, [])

  const titleValid = settings.title.trim().length > 0
  const dateRangeValid =
    !settings.available_from ||
    !settings.available_until ||
    settings.available_from < settings.available_until

  const canSave = titleValid && dateRangeValid

  const handleSaveDraft = useCallback(async () => {
    if (!canSave) {
      if (!titleValid) toast.error("Title is required to save.")
      return
    }
    setIsSaving(true)
    try {
      let finalQuestions = questions
      if (stagedFilesRef.current.size > 0) {
        const uploadToast = toast.loading("Uploading test images...")
        try {
          const urlMap = await uploadStagedTestImages(testId, stagedFilesRef.current)
          finalQuestions = replaceBlobUrlsInQuestions(questions, urlMap)
          setQuestions(finalQuestions)
          stagedFilesRef.current.clear()
          toast.dismiss(uploadToast)
        } catch (uploadErr: any) {
          toast.dismiss(uploadToast)
          throw uploadErr
        }
      }
      await onSaveDraft(testId, settingsForDb(settings), finalQuestions, sections)
      toast.success("Draft saved.")
    } catch (err: any) {
      toast.error(getFriendlyErrorMessage(err, "Failed to save draft. Please try again."))
    } finally {
      setIsSaving(false)
    }
  }, [testId, settings, questions, sections, onSaveDraft, canSave, titleValid])

  const handlePublish = useCallback(async () => {
    if (!canSave) {
      if (!titleValid) toast.error("Title is required to publish.")
      return
    }
    setIsPublishing(true)
    try {
      let finalQuestions = questions
      if (stagedFilesRef.current.size > 0) {
        const uploadToast = toast.loading("Uploading test images...")
        try {
          const urlMap = await uploadStagedTestImages(testId, stagedFilesRef.current)
          finalQuestions = replaceBlobUrlsInQuestions(questions, urlMap)
          setQuestions(finalQuestions)
          stagedFilesRef.current.clear()
          toast.dismiss(uploadToast)
        } catch (uploadErr: any) {
          toast.dismiss(uploadToast)
          throw uploadErr
        }
      }
      await onPublish(testId, settingsForDb(settings), finalQuestions, sections)
    } catch (err: any) {
      if (err?.message === "NEXT_REDIRECT") throw err
      toast.error(getFriendlyErrorMessage(err, "Failed to publish. Please try again."))
      setIsPublishing(false)
    }
  }, [testId, settings, questions, sections, onPublish, canSave, titleValid])

  return (
    <div className="min-h-screen w-full">
      <div className="mx-auto space-y-6 px-4 py-6 md:px-6 md:py-8">

        {/* ── Page Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-0.5">
            <h1 className="text-3xl font-bold font-cirka tracking-tight text-foreground">
              {isEditMode ? "Edit Test" : "Create Test"}
            </h1>
            <p className="text-sm text-muted-foreground">
              {isEditMode
                ? "Update settings, sections, and questions, then republish."
                : "Fill in settings, organize sections and questions, then publish."}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={isSaving || !canSave}
              onClick={handleSaveDraft}
            >
              {isSaving ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : (
                <Save className="mr-2 size-4" />
              )}
              Save Draft
            </Button>

            <Button
              size="sm"
              disabled={isPublishing || !canSave}
              onClick={handlePublish}
            >
              {isPublishing ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : (
                <Send className="mr-2 size-4" />
              )}
              Publish
            </Button>
          </div>
        </div>

        {/* ── Settings ── */}
        <SettingsFormComponent
          values={settings}
          onChange={setSettings}
          cohortOptions={cohortOptions}
        />

        {/* ── Unified Test Content Panel (Sections + Questions with Drag and Drop) ── */}
        <TestContentPanel
          sections={sections}
          setSections={setSections}
          questions={questions}
          setQuestions={setQuestions}
          availableTags={availableTags}
          generateQuestionsAction={generateQuestionsAction}
          onStageFile={stageImageFile}
        />

      </div>
    </div>
  )
}

// ─── Sub-Component: SettingsFormComponent ──────────────────────────────────────

interface SettingsFormProps {
  values: SettingsForm
  onChange: (values: SettingsForm) => void
  cohortOptions?: CohortOption[]
}

function SettingsFormComponent({ values, onChange, cohortOptions }: SettingsFormProps) {
  const cohortsAnchor = useComboboxAnchor()
  const set = useCallback(
    (key: keyof SettingsForm) =>
      (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
        onChange({ ...values, [key]: e.target.value }),
    [values, onChange]
  )

  const dateRangeInvalid =
    !!values.available_from &&
    !!values.available_until &&
    values.available_from >= values.available_until

  return (
    <>
      <Card className="py-4">
        <CardHeader className="pb-4">
          <CardTitle className="text-base">Test Settings</CardTitle>
          <CardDescription>Basic information about this test.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">

          <div className="space-y-1.5">
            <Label htmlFor="title">Title <span className="text-destructive">*</span></Label>
            <Input
              id="title"
              placeholder="e.g. JavaScript Fundamentals"
              value={values.title}
              onChange={set("title")}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Optional short description shown to candidates"
              className="min-h-16 resize-none"
              value={values.description}
              onChange={set("description")}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="instructions">Instructions</Label>
            <Textarea
              id="instructions"
              placeholder="Rules or instructions candidates will read before starting"
              className="min-h-20 resize-none"
              value={values.instructions}
              onChange={set("instructions")}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="time_limit">Time Limit (minutes)</Label>
            <Input
              id="time_limit"
              type="number"
              min={1}
              className="w-40"
              placeholder="e.g. 60"
              value={values.time_limit_minutes}
              onChange={set("time_limit_minutes")}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="pass_percentage">Pass Percentage (%)</Label>
            <Input
              id="pass_percentage"
              type="number"
              min={0}
              max={100}
              className="w-40"
              placeholder="e.g. 50"
              value={values.pass_percentage}
              onChange={set("pass_percentage")}
            />
            <p className="text-[10px] text-muted-foreground">Optional. Leave empty for no pass threshold.</p>
          </div>

          <div className="space-y-1.5">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="available_from">Available From</Label>
                <DateTimePicker
                  id="available_from"
                  value={values.available_from}
                  onChange={(val) => onChange({ ...values, available_from: val ? (val instanceof Date ? val.toISOString() : String(val)) : "" })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="available_until">Available Until</Label>
                <DateTimePicker
                  id="available_until"
                  value={values.available_until}
                  onChange={(val) => onChange({ ...values, available_until: val ? (val instanceof Date ? val.toISOString() : String(val)) : "" })}
                />
              </div>
            </div>
            {dateRangeInvalid && (
              <p className="flex items-center gap-1.5 text-xs text-destructive">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                &quot;Available Until&quot; must be after &quot;Available From&quot;.
              </p>
            )}
          </div>

          {/* Cohort Targeting */}
          <div className="space-y-1.5">
            <Label htmlFor="target_cohorts">Target Cohorts <span className="text-destructive">*</span></Label>
            <p className="text-xs text-muted-foreground">
              Select which cohorts can take this test. At least one cohort is required to publish.
            </p>
            {(() => {
              const options = cohortOptions ?? []
              const selectedIds = values.cohort_ids || []
              if (options.length === 0) {
                return (
                  <p className="text-xs text-muted-foreground italic py-1">
                    No cohorts found. Create cohorts first from the Cohorts page.
                  </p>
                )
              }
              return (
                <Combobox
                  items={options.map((c) => c.id)}
                  value={selectedIds}
                  onValueChange={(v) => onChange({ ...values, cohort_ids: v as string[] })}
                  multiple
                  itemToStringLabel={(id) => options.find((c) => c.id === id)?.name ?? id}
                >
                  <ComboboxChips ref={cohortsAnchor} className="w-full">
                    {selectedIds.map((id) => {
                      const cohort = options.find((c) => c.id === id)
                      return (
                        <ComboboxChip key={id} showRemove>
                          <UsersRound className="mr-1 h-3 w-3 text-muted-foreground" />
                          {cohort?.name ?? id}
                          {cohort && (
                            <span className="ml-1 text-[10px] text-muted-foreground">
                              ({cohort.student_count})
                            </span>
                          )}
                        </ComboboxChip>
                      )
                    })}
                    <ComboboxChipsInput
                      placeholder={selectedIds.length ? "Add more cohorts..." : "Select target cohorts..."}
                    />
                  </ComboboxChips>
                  <ComboboxContent anchor={cohortsAnchor}>
                    <ComboboxEmpty>No cohorts found.</ComboboxEmpty>
                    <ComboboxList>
                      {(id: string) => {
                        const cohort = options.find((c) => c.id === id)
                        return (
                          <ComboboxItem key={id} value={id}>
                            <UsersRound className="mr-2 h-4 w-4 text-muted-foreground" />
                            <span className="text-sm font-medium">{cohort?.name ?? id}</span>
                            <span className="ml-auto text-xs text-muted-foreground">
                              {cohort?.student_count ?? 0} student{(cohort?.student_count ?? 0) !== 1 ? "s" : ""}
                            </span>
                          </ComboboxItem>
                        )
                      }}
                    </ComboboxList>
                  </ComboboxContent>
                </Combobox>
              )
            })()}
          </div>

        </CardContent>
      </Card>

      {/* ── Advanced Settings ── */}
      <Card className="py-4">
        <CardHeader className="pb-4">
          <CardTitle className="text-base">Advanced Settings</CardTitle>
          <CardDescription>Anti-cheat and question randomisation options.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">

          <div className="flex items-center justify-between gap-4">
            <div className="space-y-0.5">
              <Label htmlFor="shuffle_questions" className="text-sm font-medium">Shuffle Questions</Label>
              <p className="text-xs text-muted-foreground">
                Randomise question order for each candidate.
              </p>
            </div>
            <Switch
              id="shuffle_questions"
              checked={values.shuffle_questions}
              onCheckedChange={(checked) => onChange({ ...values, shuffle_questions: checked })}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between gap-4">
            <div className="space-y-0.5">
              <Label htmlFor="shuffle_options" className="text-sm font-medium">Shuffle Options</Label>
              <p className="text-xs text-muted-foreground">
                Randomise option order within each question.
              </p>
            </div>
            <Switch
              id="shuffle_options"
              checked={values.shuffle_options}
              onCheckedChange={(checked) => onChange({ ...values, shuffle_options: checked })}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between gap-4">
            <div className="space-y-0.5">
              <Label htmlFor="strict_mode" className="text-sm font-medium">Strict Mode</Label>
              <p className="text-xs text-muted-foreground">
                Auto-submit the test after 6 tab-switch violations.
              </p>
            </div>
            <Switch
              id="strict_mode"
              checked={values.strict_mode}
              onCheckedChange={(checked) => onChange({ ...values, strict_mode: checked })}
            />
          </div>

        </CardContent>
      </Card>
    </>
  )
}

// ─── Sub-Component: TestContentPanel (Unified Sections & Questions with Drag and Drop) ───

interface TestContentPanelProps {
  sections: LocalSection[]
  setSections: React.Dispatch<React.SetStateAction<LocalSection[]>>
  questions: LocalQuestion[]
  setQuestions: React.Dispatch<React.SetStateAction<LocalQuestion[]>>
  availableTags: { id: string; name: string }[]
  generateQuestionsAction: (input: AiGenerateForm) => Promise<GenerateQuestionsResult>
  onStageFile: (file: File) => string
}

function TestContentPanel({
  sections,
  setSections,
  questions,
  setQuestions,
  availableTags,
  generateQuestionsAction,
  onStageFile,
}: TestContentPanelProps) {
  const [questionSheetOpen, setQuestionSheetOpen] = useState(false)
  const [editingQuestion, setEditingQuestion] = useState<LocalQuestion | null>(null)
  const [targetSectionId, setTargetSectionId] = useState<string | null>(null)

  const [aiSheetOpen, setAiSheetOpen] = useState(false)
  const [importSheetOpen, setImportSheetOpen] = useState(false)
  const [activeId, setActiveId] = useState<string | null>(null)

  const totalMarks = questions.reduce((sum, q) => sum + q.marks, 0)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  function openAddQuestion(secId?: string) {
    setEditingQuestion(null)
    setTargetSectionId(secId ?? sections[0]?.id ?? null)
    setQuestionSheetOpen(true)
  }

  function openEditQuestion(q: LocalQuestion) {
    setEditingQuestion(q)
    setTargetSectionId(q.section_id)
    setQuestionSheetOpen(true)
  }

  function openAiGenerate(secId?: string) {
    setTargetSectionId(secId ?? sections[0]?.id ?? null)
    setAiSheetOpen(true)
  }

  function openImportJson(secId?: string) {
    setTargetSectionId(secId ?? sections[0]?.id ?? null)
    setImportSheetOpen(true)
  }

  function handleQuestionSave(form: QuestionForm, sectionId: string) {
    const finalSecId = sectionId || sections[0]?.id || crypto.randomUUID()

    const asLocal: LocalQuestion = {
      id: editingQuestion?.id ?? crypto.randomUUID(),
      question_text: form.question_text,
      question_type: form.question_type,
      marks: form.marks || 1,
      order_index: editingQuestion?.order_index ?? questions.length + 1,
      explanation: form.explanation,
      tag_names: form.tag_names.map((t) => normalizeTag(t, availableTags)),
      options: form.options,
      section_id: finalSecId,
    }

    setQuestions((prev) =>
      editingQuestion
        ? prev.map((q) => (q.id === editingQuestion.id ? asLocal : q))
        : [...prev, asLocal]
    )
    setQuestionSheetOpen(false)
  }

  function handleAiImport(forms: QuestionForm[], sectionId: string) {
    const finalSecId = sectionId || sections[0]?.id || crypto.randomUUID()

    const newLocals: LocalQuestion[] = forms.map((form, i) => ({
      id: crypto.randomUUID(),
      question_text: form.question_text,
      question_type: form.question_type,
      marks: form.marks || 1,
      order_index: questions.length + i + 1,
      explanation: form.explanation,
      tag_names: form.tag_names.map((t) => normalizeTag(t, availableTags)),
      options: form.options,
      section_id: finalSecId,
    }))
    setQuestions((prev) => [...prev, ...newLocals])
    setAiSheetOpen(false)
  }

  function handleJsonImport(forms: QuestionForm[], sectionId: string) {
    const finalSecId = sectionId || sections[0]?.id || crypto.randomUUID()

    const newLocals: LocalQuestion[] = forms.map((form, i) => ({
      id: crypto.randomUUID(),
      question_text: form.question_text,
      question_type: form.question_type,
      marks: form.marks || 1,
      order_index: questions.length + i + 1,
      explanation: form.explanation,
      tag_names: form.tag_names.map((t) => normalizeTag(t, availableTags)),
      options: form.options,
      section_id: finalSecId,
    }))
    setQuestions((prev) => [...prev, ...newLocals])
    setImportSheetOpen(false)
  }

  function handleDeleteQuestion(id: string) {
    setQuestions((prev) =>
      prev
        .filter((q) => q.id !== id)
        .map((q, i) => ({ ...q, order_index: i + 1 }))
    )
  }

  function handleAddSection() {
    const nextChar = String.fromCharCode(65 + sections.length)
    const newName = `Section ${nextChar}`
    const newSec: LocalSection = {
      id: crypto.randomUUID(),
      name: newName,
      description: "",
      order_index: sections.length + 1,
    }
    setSections((prev) => [...prev, newSec])
    toast.success(`Created "${newName}"`)
  }

  function handleRenameSection(sectionId: string, newName: string) {
    const trimmed = newName.trim()
    if (!trimmed) return
    setSections((prev) =>
      prev.map((s) => (s.id === sectionId ? { ...s, name: trimmed } : s))
    )
  }

  function handleUpdateSectionDescription(sectionId: string, description: string) {
    setSections((prev) =>
      prev.map((s) => (s.id === sectionId ? { ...s, description } : s))
    )
  }

  function handleDeleteSection(sectionId: string) {
    if (sections.length <= 1) {
      toast.error("A test must have at least one section.")
      return
    }
    const remainingSections = sections.filter((s) => s.id !== sectionId)
    const fallbackSecId = remainingSections[0].id
    setSections(remainingSections)
    setQuestions((prev) =>
      prev.map((q) => (q.section_id === sectionId ? { ...q, section_id: fallbackSecId } : q))
    )
    toast.success("Section removed. Questions moved to " + remainingSections[0].name)
  }

  function handleDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id))
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    setActiveId(null)
    if (!over) return

    const activeStr = String(active.id)
    const overStr = String(over.id)

    if (activeStr === overStr) return

    if (activeStr.startsWith("sec-")) {
      const activeSecId = activeStr.replace("sec-", "")
      const overSecId = overStr.startsWith("sec-") ? overStr.replace("sec-", "") : null
      if (overSecId && activeSecId !== overSecId) {
        const oldIndex = sections.findIndex((s) => s.id === activeSecId)
        const newIndex = sections.findIndex((s) => s.id === overSecId)
        if (oldIndex !== -1 && newIndex !== -1) {
          const newSections = arrayMove(sections, oldIndex, newIndex).map((s, idx) => ({
            ...s,
            order_index: idx + 1,
          }))
          setSections(newSections)
        }
      }
      return
    }

    const activeQId = activeStr.replace("q-", "")
    const activeQIndex = questions.findIndex((q) => q.id === activeQId)
    if (activeQIndex === -1) return

    const activeQ = questions[activeQIndex]

    if (overStr.startsWith("q-")) {
      const overQId = overStr.replace("q-", "")
      const overQIndex = questions.findIndex((q) => q.id === overQId)
      if (overQIndex !== -1 && overQIndex !== activeQIndex) {
        const overQ = questions[overQIndex]
        let newQuestions = [...questions]
        if (activeQ.section_id !== overQ.section_id) {
          newQuestions[activeQIndex] = { ...activeQ, section_id: overQ.section_id }
        }
        newQuestions = arrayMove(newQuestions, activeQIndex, overQIndex).map((q, idx) => ({
          ...q,
          order_index: idx + 1,
        }))
        setQuestions(newQuestions)
      }
      return
    }

    if (overStr.startsWith("sec-")) {
      const targetSecId = overStr.replace("sec-", "")
      if (activeQ.section_id !== targetSecId) {
        const updatedQuestions = questions.map((q) =>
          q.id === activeQId ? { ...q, section_id: targetSecId } : q
        )
        setQuestions(updatedQuestions)
      }
    }
  }

  const activeQuestion = activeId && activeId.startsWith("q-")
    ? questions.find((q) => q.id === activeId.replace("q-", ""))
    : null

  const activeSection = activeId && activeId.startsWith("sec-")
    ? sections.find((s) => s.id === activeId.replace("sec-", ""))
    : null

  return (
    <>
      <Card className="py-4">
        <CardHeader className="pb-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-0.5">
              <CardTitle className="text-base flex items-center gap-2">
                Test Content & Sections
                <Badge variant="secondary" className="text-xs font-normal">
                  {sections.length} section{sections.length !== 1 ? "s" : ""} · {questions.length} Qs · {totalMarks} marks
                </Badge>
              </CardTitle>
              <CardDescription>
                Organize your test into sections. Drag and drop sections or questions to reorder.
              </CardDescription>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={() => openAiGenerate()}>
                <Sparkles className="mr-1.5 size-4 text-violet-500" /> Trixy AI Generate
              </Button>
              <Button size="sm" variant="outline" onClick={() => openImportJson()}>
                <Upload className="mr-1.5 size-4" /> Import JSON
              </Button>
              <Button size="sm" onClick={handleAddSection}>
                <Plus className="mr-1.5 size-4" /> Add Section
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={sections.map((s) => "sec-" + s.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-6">
                {sections.map((sec, idx) => {
                  const secQuestions = questions.filter((q) => q.section_id === sec.id)
                  return (
                    <SortableSectionCard
                      key={sec.id}
                      section={sec}
                      sectionIndex={idx + 1}
                      questions={secQuestions}
                      canDelete={sections.length > 1}
                      availableTags={availableTags}
                      onRename={(newName) => handleRenameSection(sec.id, newName)}
                      onUpdateDescription={(newDesc) => handleUpdateSectionDescription(sec.id, newDesc)}
                      onDelete={() => handleDeleteSection(sec.id)}
                      onAddQuestion={() => openAddQuestion(sec.id)}
                      onAiGenerate={() => openAiGenerate(sec.id)}
                      onEditQuestion={openEditQuestion}
                      onDeleteQuestion={handleDeleteQuestion}
                    />
                  )
                })}
              </div>
            </SortableContext>

            <DragOverlay>
              {activeSection ? (
                <div className="rounded-lg border border-primary bg-background p-4 shadow-xl opacity-95">
                  <div className="flex items-center gap-2 font-bold text-sm">
                    <GripVertical className="size-4 text-muted-foreground" />
                    {activeSection.name}
                  </div>
                </div>
              ) : activeQuestion ? (
                <div className="rounded-lg border border-primary bg-background p-3 shadow-xl opacity-95 text-xs font-medium max-w-md">
                  <InlineRichText>{activeQuestion.question_text}</InlineRichText>
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>

          <div className="pt-2">
            <Button
              type="button"
              variant="outline"
              className="w-full border-dashed py-5 text-xs font-medium text-muted-foreground hover:text-foreground"
              onClick={handleAddSection}
            >
              <Plus className="mr-1.5 size-4" /> Add Another Section
            </Button>
          </div>
        </CardContent>
      </Card>

      <QuestionSheet
        open={questionSheetOpen}
        onOpenChange={setQuestionSheetOpen}
        mode={editingQuestion ? "edit" : "add"}
        defaultValues={
          editingQuestion
            ? {
              question_text: editingQuestion.question_text,
              question_type: editingQuestion.question_type,
              marks: editingQuestion.marks,
              explanation: editingQuestion.explanation,
              options: editingQuestion.options,
              tag_names: editingQuestion.tag_names,
            }
            : undefined
        }
        defaultSectionId={editingQuestion ? editingQuestion.section_id : targetSectionId}
        availableTags={availableTags}
        sections={sections}
        onSave={handleQuestionSave}
        onStageFile={onStageFile}
      />

      <AiGenerateSheet
        open={aiSheetOpen}
        onOpenChange={setAiSheetOpen}
        sections={sections}
        defaultSectionId={targetSectionId}
        generateQuestionsAction={generateQuestionsAction}
        onImport={handleAiImport}
      />

      <ImportSheet
        open={importSheetOpen}
        onOpenChange={setImportSheetOpen}
        sections={sections}
        defaultSectionId={targetSectionId}
        onImport={handleJsonImport}
      />
    </>
  )
}

// ─── Sub-Component: SortableSectionCard ───────────────────────────────────────

interface SortableSectionCardProps {
  section: LocalSection
  sectionIndex: number
  questions: LocalQuestion[]
  canDelete: boolean
  availableTags: { id: string; name: string }[]
  onRename: (newName: string) => void
  onUpdateDescription: (newDesc: string) => void
  onDelete: () => void
  onAddQuestion: () => void
  onAiGenerate: () => void
  onEditQuestion: (q: LocalQuestion) => void
  onDeleteQuestion: (id: string) => void
}

function SortableSectionCard({
  section,
  sectionIndex,
  questions,
  canDelete,
  availableTags,
  onRename,
  onUpdateDescription,
  onDelete,
  onAddQuestion,
  onAiGenerate,
  onEditQuestion,
  onDeleteQuestion,
}: SortableSectionCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: "sec-" + section.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const [isEditingName, setIsEditingName] = useState(false)
  const [nameInput, setNameInput] = useState(section.name)
  const [isEditingDesc, setIsEditingDesc] = useState(false)
  const [descInput, setDescInput] = useState(section.description ?? "")

  const sectionMarks = questions.reduce((sum, q) => sum + q.marks, 0)

  function handleNameCommit() {
    setIsEditingName(false)
    if (nameInput.trim() && nameInput.trim() !== section.name) {
      onRename(nameInput.trim())
    } else {
      setNameInput(section.name)
    }
  }

  function handleDescCommit() {
    setIsEditingDesc(false)
    onUpdateDescription(descInput.trim())
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "rounded-xl border bg-card/60 shadow-xs transition-shadow",
        isDragging && "opacity-40 border-primary shadow-lg"
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b bg-muted/30 px-4 py-3 rounded-t-xl">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <button
            type="button"
            className="cursor-grab text-muted-foreground/60 hover:text-foreground touch-none p-1 rounded hover:bg-background/80"
            {...attributes}
            {...listeners}
            title="Drag to reorder section"
          >
            <GripVertical className="size-4" />
          </button>

          <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-bold text-primary">
            {sectionIndex}
          </span>

          <div className="flex flex-col min-w-0">
            {isEditingName ? (
              <div className="flex items-center gap-1">
                <Input
                  autoFocus
                  className="h-7 w-44 sm:w-56 text-xs font-semibold"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  onBlur={handleNameCommit}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleNameCommit()
                    if (e.key === "Escape") {
                      setNameInput(section.name)
                      setIsEditingName(false)
                    }
                  }}
                />
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="size-7 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                  onClick={handleNameCommit}
                  title="Save section name"
                >
                  <Check className="size-3.5" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 min-w-0">
                <h3
                  className="text-sm font-semibold tracking-tight text-foreground truncate cursor-pointer hover:underline"
                  onClick={() => setIsEditingName(true)}
                  title="Click to rename section"
                >
                  {section.name}
                </h3>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-6 text-muted-foreground hover:text-foreground shrink-0"
                  onClick={() => setIsEditingName(true)}
                  title="Rename Section"
                >
                  <Pencil className="size-3" />
                </Button>
              </div>
            )}

            {isEditingDesc ? (
              <div className="flex items-center gap-1 mt-1">
                <Input
                  autoFocus
                  placeholder="Optional section description..."
                  className="h-6 text-xs text-muted-foreground w-64"
                  value={descInput}
                  onChange={(e) => setDescInput(e.target.value)}
                  onBlur={handleDescCommit}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleDescCommit()
                    if (e.key === "Escape") {
                      setDescInput(section.description ?? "")
                      setIsEditingDesc(false)
                    }
                  }}
                />
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="size-6 text-emerald-600 shrink-0"
                  onClick={handleDescCommit}
                >
                  <Check className="size-3" />
                </Button>
              </div>
            ) : (
              <div
                className="flex items-center gap-1 text-[11px] text-muted-foreground cursor-pointer hover:text-foreground"
                onClick={() => setIsEditingDesc(true)}
                title="Click to edit section description"
              >
                <span className="truncate max-w-xs">
                  {section.description ? section.description : "+ Add description"}
                </span>
                <Pencil className="size-2.5 opacity-60 shrink-0" />
              </div>
            )}
          </div>

          <Badge variant="secondary" className="ml-2 text-[11px] font-normal shrink-0">
            {questions.length} Q{questions.length !== 1 ? "s" : ""} · {sectionMarks} M
          </Badge>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <Button
            size="sm"
            variant="ghost"
            className="h-7 text-xs px-2"
            onClick={onAiGenerate}
            title="Generate AI questions for this section"
          >
            <Sparkles className="mr-1 size-3.5" />
            AI Gen
          </Button>

          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs px-2.5"
            onClick={onAddQuestion}
          >
            <Plus className="mr-1 size-3.5" />
            Add Question
          </Button>

          {canDelete && (
            <Button
              size="icon"
              variant="ghost"
              className="size-7 text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={onDelete}
              title="Delete section"
            >
              <Trash2 className="size-3.5" />
            </Button>
          )}
        </div>
      </div>

      <div className="p-3 sm:p-4 space-y-2">
        <SortableContext
          items={questions.map((q) => "q-" + q.id)}
          strategy={verticalListSortingStrategy}
        >
          {questions.length === 0 ? (
            <div
              onClick={onAddQuestion}
              className="flex flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed py-8 text-center cursor-pointer transition-colors hover:border-primary/50 hover:bg-primary/5"
            >
              <PlusCircle className="size-6 text-muted-foreground/40" />
              <p className="text-xs font-medium text-muted-foreground">
                No questions in {section.name} yet.
              </p>
              <span className="text-[11px] font-semibold text-primary">
                + Add Question to {section.name}
              </span>
            </div>
          ) : (
            <ol className="space-y-2">
              {questions.map((q, qIdx) => (
                <SortableQuestionRow
                  key={q.id}
                  question={q}
                  displayIndex={qIdx + 1}
                  availableTags={availableTags}
                  onEdit={() => onEditQuestion(q)}
                  onDelete={() => onDeleteQuestion(q.id)}
                />
              ))}
            </ol>
          )}
        </SortableContext>
      </div>
    </div>
  )
}

// ─── Sub-Component: SortableQuestionRow ───────────────────────────────────────

interface SortableQuestionRowProps {
  question: LocalQuestion
  displayIndex: number
  availableTags: { id: string; name: string }[]
  onEdit: () => void
  onDelete: () => void
}

function SortableQuestionRow({
  question,
  displayIndex,
  availableTags,
  onEdit,
  onDelete,
}: SortableQuestionRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: "q-" + question.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-start gap-3 rounded-lg border bg-background p-3 transition-colors hover:border-primary/30",
        isDragging && "opacity-40 border-primary shadow-md"
      )}
    >
      <button
        type="button"
        className="mt-0.5 cursor-grab text-muted-foreground/50 hover:text-foreground touch-none p-0.5 rounded"
        {...attributes}
        {...listeners}
        title="Drag to move question"
      >
        <GripVertical className="size-4" />
      </button>

      <span className="mt-0.5 w-5 shrink-0 text-center text-xs font-semibold text-muted-foreground">
        {displayIndex}.
      </span>

      <div className="min-w-0 flex-1 space-y-1.5">
        <p className="truncate text-sm font-medium leading-snug">
          <InlineRichText>{question.question_text}</InlineRichText>
        </p>

        <div className="flex flex-wrap gap-1">
          <Badge variant="outline" className="text-[11px] h-4 px-1.5 py-0">
            {question.question_type === "single_correct" ? "Single" : "Multiple"}
          </Badge>

          <Badge variant="outline" className="text-[11px] h-4 px-1.5 py-0">
            {question.marks} {question.marks === 1 ? "mark" : "marks"}
          </Badge>

          {question.tag_names.map((t) => (
            <Badge key={t} variant="secondary" className="text-[11px] h-4 px-1.5 py-0 font-normal">
              {normalizeTag(t, availableTags)}
            </Badge>
          ))}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1">
        <Button
          size="icon"
          variant="ghost"
          className="size-7"
          onClick={onEdit}
        >
          <Pencil className="size-3.5" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          className="size-7 text-destructive hover:text-destructive"
          onClick={onDelete}
        >
          <Trash2 className="size-3.5" />
        </Button>
      </div>
    </li>
  )
}

// ─── MarkdownEditor ─────────────────────────────────────────────────────────
// Replaces the old single-image ImageAttachmentField.
// Supports: Write / Preview tabs, multi-image MD insertion at cursor,
// drag-and-drop image upload, compact inline mode for options.

interface MarkdownEditorProps {
  value: string
  onChange: (value: string) => void
  onStageFile?: (file: File) => string
  placeholder?: string
  rows?: number
  compact?: boolean
  label?: string
  disabled?: boolean
  className?: string
}

function MarkdownEditor({
  value,
  onChange,
  onStageFile,
  placeholder = "Write markdown here… LaTeX: $x^2$, code: `fn()`, images: ![alt](url)",
  rows = 4,
  compact = false,
  label,
  disabled = false,
  className,
}: MarkdownEditorProps) {
  const [activeTab, setActiveTab] = useState<"write" | "preview">("write")
  const [isDraggingOver, setIsDraggingOver] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Extract all markdown images from text
  const attachedImages = useMemo<{ alt: string; url: string; fullMatch: string }[]>(() => {
    const regex = /!\[(.*?)\]\(((?:https?:\/\/|blob:)[^)]+)\)/g
    const matches: { alt: string; url: string; fullMatch: string }[] = []
    let match: RegExpExecArray | null
    while ((match = regex.exec(value)) !== null) {
      matches.push({ alt: match[1], url: match[2], fullMatch: match[0] })
    }
    return matches
  }, [value])

  const removeImage = useCallback((fullMatch: string) => {
    const updated = value.replace(fullMatch, "").replace(/\n{3,}/g, "\n\n").trim()
    onChange(updated)
  }, [value, onChange])

  // Insert text at cursor position in the textarea
  const insertAtCursor = useCallback((insertion: string) => {
    const el = textareaRef.current
    if (!el) {
      onChange(value + insertion)
      return
    }
    const start = el.selectionStart ?? value.length
    const end = el.selectionEnd ?? value.length
    const newValue = value.slice(0, start) + insertion + value.slice(end)
    onChange(newValue)
    // Restore cursor after React re-render
    requestAnimationFrame(() => {
      if (el) {
        const cursorPos = start + insertion.length
        el.focus()
        el.setSelectionRange(cursorPos, cursorPos)
      }
    })
  }, [value, onChange])

  const stageAndInsertImage = useCallback((file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Please select a valid image file (PNG, JPEG, WEBP, GIF, SVG).")
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Image file size exceeds 10MB limit.")
      return
    }
    if (!onStageFile) return
    const blobUrl = onStageFile(file)
    const altText = file.name.replace(/\.[^.]+$/, "").replace(/[-_]/g, " ") || "Image"
    const el = textareaRef.current
    const start = el?.selectionStart ?? value.length
    const prevChar = value[start - 1]
    const prefix = value.length > 0 && prevChar && prevChar !== "\n" ? "\n\n" : ""
    insertAtCursor(`${prefix}![${altText}](${blobUrl})\n`)
  }, [onStageFile, insertAtCursor, value])

  const handleDrop = useCallback((e: React.DragEvent<HTMLTextAreaElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDraggingOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) stageAndInsertImage(file)
  }, [stageAndInsertImage])

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    files.forEach((f) => stageAndInsertImage(f))
    e.target.value = ""
  }, [stageAndInsertImage])

  const hasContent = value.trim().length > 0

  if (compact) {
    // Compact mode: input area with image attach button + attached thumbnails + preview toggle
    return (
      <div className={cn("space-y-1.5", className)}>
        <div className={cn(
          "relative rounded-lg border transition-colors overflow-hidden",
          isDraggingOver ? "border-primary bg-primary/5" : "border-border/80 bg-background",
        )}>
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            rows={rows}
            disabled={disabled}
            className={cn(
              "w-full resize-none bg-transparent px-2.5 py-2 text-sm font-normal placeholder:text-muted-foreground/50 focus:outline-none",
              onStageFile && "pr-8"
            )}
            onDragOver={(e) => { e.preventDefault(); setIsDraggingOver(true) }}
            onDragLeave={() => setIsDraggingOver(false)}
            onDrop={handleDrop}
          />
          {onStageFile && (
            <>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute right-1.5 bottom-1.5 text-muted-foreground/60 hover:text-primary transition-colors p-1 rounded hover:bg-muted/50"
                title="Attach image to option"
              >
                <Image className="size-3.5" />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handleFileInput}
              />
            </>
          )}

          {/* Attached image preview chips in compact mode */}
          {attachedImages.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 border-t border-border/40 bg-muted/20 px-2.5 py-1.5">
              {attachedImages.map((img, i) => (
                <div key={i} className="flex items-center gap-1 rounded border border-border/70 bg-background px-1.5 py-0.5 text-[11px] shadow-2xs">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={img.url} alt={img.alt || "preview"} className="size-4 rounded object-contain" />
                  <span className="max-w-22.5 truncate text-[10px] font-medium">{img.alt || "Image"}</span>
                  <button
                    type="button"
                    onClick={() => removeImage(img.fullMatch)}
                    className="text-muted-foreground hover:text-destructive"
                    title="Remove image"
                  >
                    <X className="size-2.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Inline preview strip */}
        {activeTab === "preview" && hasContent && (
          <div className="rounded-lg border border-border/60 bg-muted/15 p-2.5 text-sm">
            <RichText content={value} allowCopy={false} />
          </div>
        )}

        <div className="flex items-center justify-between px-0.5">
          {onStageFile && (
            <span className="text-[10px] text-muted-foreground/50">MD + $LaTeX$ + images supported</span>
          )}
          {hasContent && (
            <button
              type="button"
              onClick={() => setActiveTab((t) => (t === "preview" ? "write" : "preview"))}
              className="ml-auto flex items-center gap-1 text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              {activeTab === "preview" ? <Code className="size-3" /> : <Eye className="size-3" />}
              {activeTab === "preview" ? "Hide Preview" : "Preview"}
            </button>
          )}
        </div>
      </div>
    )
  }

  // Full editor mode: Write / Preview tabs + attached image bar
  return (
    <div className={cn("space-y-0 rounded-lg border border-border/80 overflow-hidden focus-within:ring-1 focus-within:ring-ring", className)}>
      {/* Tab bar */}
      <div className="flex items-center justify-between border-b border-border/60 bg-muted/20 px-2 py-1">
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            onClick={() => setActiveTab("write")}
            className={cn(
              "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
              activeTab === "write"
                ? "bg-background text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <span className="flex items-center gap-1.5">
              <Code className="size-3" />
              Write
            </span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("preview")}
            className={cn(
              "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
              activeTab === "preview"
                ? "bg-background text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <span className="flex items-center gap-1.5">
              <Eye className="size-3" />
              Preview
            </span>
          </button>
        </div>

        <div className="flex items-center gap-1">
          {onStageFile && (
            <>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium text-muted-foreground hover:text-foreground hover:bg-background/60 transition-colors"
                title="Insert image(s) at cursor"
              >
                <Image className="size-3 text-primary/70" />
                Add Image
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handleFileInput}
              />
            </>
          )}
        </div>
      </div>

      {/* Write pane */}
      {activeTab === "write" && (
        <div className="space-y-0">
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            rows={rows}
            disabled={disabled}
            className={cn(
              "w-full resize-none bg-transparent px-3 py-2.5 text-sm placeholder:text-muted-foreground/50 focus:outline-none font-normal",
              isDraggingOver && "bg-primary/5"
            )}
            onDragOver={(e) => { e.preventDefault(); setIsDraggingOver(true) }}
            onDragLeave={() => setIsDraggingOver(false)}
            onDrop={handleDrop}
          />

          {/* Attached image preview bar inside Write tab */}
          {attachedImages.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 border-t border-border/40 bg-muted/15 px-3 py-2">
              <span className="text-[11px] font-medium text-muted-foreground flex items-center gap-1">
                <Image className="size-3 text-primary" />
                {attachedImages.length} Attached Image{attachedImages.length > 1 ? "s" : ""}:
              </span>
              {attachedImages.map((img, i) => (
                <div key={i} className="flex items-center gap-1.5 rounded-md border border-border/70 bg-background px-2 py-1 shadow-2xs text-xs">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={img.url}
                    alt={img.alt || "preview"}
                    className="size-6 rounded object-contain border bg-muted/20"
                  />
                  <span className="text-[11px] font-medium max-w-30 truncate text-foreground">
                    {img.alt || `Image ${i + 1}`}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeImage(img.fullMatch)}
                    className="text-muted-foreground hover:text-destructive p-0.5 rounded transition-colors"
                    title="Remove image from markdown"
                  >
                    <X className="size-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Preview pane */}
      {activeTab === "preview" && (
        <div
          className="min-h-24 p-3 overflow-y-auto bg-background/50"
          style={{ minHeight: `${rows * 1.5 + 1.25}rem` }}
        >
          {hasContent ? (
            <RichText content={value} allowCopy={false} />
          ) : (
            <p className="text-sm italic text-muted-foreground/50">Nothing to preview yet.</p>
          )}
        </div>
      )}

      {/* Footer hint */}
      <div className="flex items-center gap-2 border-t border-border/40 bg-muted/10 px-3 py-1">
        <span className="text-[10px] text-muted-foreground/50">
          Markdown · $LaTeX$ · `code` · ![img](url)
          {onStageFile && " · Drop images to embed"}
        </span>
      </div>
    </div>
  )
}

// ─── OptionsBuilder ────────────────────────────────────────────────────────────

function OptionsBuilder({
  options,
  questionType,
  onChange,
  onStageFile,
}: {
  options: OptionForm[]
  questionType: "single_correct" | "multiple_correct"
  onChange: (v: OptionForm[]) => void
  onStageFile: (file: File) => string
}) {
  const updateText = (key: string, text: string) =>
    onChange(options.map((o) => (o._key === key ? { ...o, option_text: text } : o)))

  const toggleCorrect = (key: string) => {
    if (questionType === "single_correct") {
      onChange(options.map((o) => ({ ...o, is_correct: o._key === key })))
    } else {
      onChange(options.map((o) => (o._key === key ? { ...o, is_correct: !o.is_correct } : o)))
    }
  }

  const remove = (key: string) => {
    if (options.length <= 2) return
    onChange(options.filter((o) => o._key !== key))
  }

  return (
    <div className="space-y-3">
      {options.map((opt, idx) => (
        <div key={opt._key} className={cn(
          "rounded-lg border p-3 space-y-2 transition-colors",
          opt.is_correct
            ? "border-emerald-500/30 bg-emerald-500/5 dark:bg-emerald-950/10"
            : "border-border bg-muted/5"
        )}>
          <div className="flex items-center gap-2">
            <span className={cn(
              "flex size-5 shrink-0 items-center justify-center rounded-md border text-[10px] font-bold",
              opt.is_correct
                ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30 dark:text-emerald-400"
                : "bg-muted text-muted-foreground border-border"
            )}>
              {String.fromCharCode(65 + idx)}
            </span>
            <div className="flex items-center gap-1 ml-auto shrink-0">
              <button
                type="button"
                onClick={() => toggleCorrect(opt._key)}
                title="Mark as correct"
                className={cn(
                  "flex shrink-0 items-center gap-1 rounded-md border px-2 py-1 text-xs font-medium transition-colors",
                  opt.is_correct
                    ? "border-emerald-400 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
                    : "border-border text-muted-foreground hover:border-emerald-400 hover:text-emerald-600"
                )}
              >
                {opt.is_correct ? (
                  <CheckCircle2 className="h-3.5 w-3.5" />
                ) : (
                  <Circle className="h-3.5 w-3.5" />
                )}
                <span className="hidden sm:inline">Correct</span>
              </button>
              <button
                type="button"
                onClick={() => remove(opt._key)}
                disabled={options.length <= 2}
                className="text-muted-foreground transition-colors hover:text-destructive disabled:opacity-25 p-1"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
          <MarkdownEditor
            value={opt.option_text}
            onChange={(text) => updateText(opt._key, text)}
            onStageFile={onStageFile}
            placeholder={`Option ${String.fromCharCode(65 + idx)} — text, $LaTeX$, code, images…`}
            rows={2}
            compact={true}
          />
        </div>
      ))}
      {options.length < 6 && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() =>
            onChange([...options, { _key: crypto.randomUUID(), option_text: "", is_correct: false }])
          }
          className="h-8 text-xs text-muted-foreground"
        >
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          Add Option
        </Button>
      )}
    </div>
  )
}

export function toTitleCase(str: string): string {
  return str
    .trim()
    .replace(/\s+/g, " ")
    .replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.slice(1).toLowerCase())
}

export function normalizeTag(rawTag: string, availableTags: { name: string }[] = []): string {
  const clean = rawTag.trim().replace(/\s+/g, " ")
  if (!clean) return ""
  const existing = availableTags.find((t) => t.name.toLowerCase() === clean.toLowerCase())
  if (existing) {
    return existing.name
  }
  return toTitleCase(clean)
}

function TagInput({
  selected,
  available,
  onChange,
}: {
  selected: string[]
  available: { id: string; name: string }[]
  onChange: (v: string[]) => void
}) {
  const [input, setInput] = useState("")
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const cleanInput = input.trim().toLowerCase()

  const matchingSuggestions = available.filter(
    (t) =>
      (!cleanInput || t.name.toLowerCase().includes(cleanInput)) &&
      !selected.some((s) => s.toLowerCase() === t.name.toLowerCase())
  ).slice(0, 8)

  const exactMatchExists = available.some(
    (t) => t.name.toLowerCase() === cleanInput
  ) || selected.some((s) => s.toLowerCase() === cleanInput)

  const handleAdd = (rawName: string) => {
    const normalized = normalizeTag(rawName, available)
    if (normalized && !selected.some((s) => s.toLowerCase() === normalized.toLowerCase())) {
      onChange([...selected, normalized])
    }
    setInput("")
    setIsOpen(false)
  }

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  return (
    <div className="space-y-2" ref={containerRef}>
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selected.map((t) => (
            <Badge key={t} variant="secondary" className="gap-1 pr-1 text-xs font-medium">
              <Tag className="h-3 w-3 text-muted-foreground" />
              {t}
              <button
                type="button"
                onClick={() => onChange(selected.filter((s) => s !== t))}
                className="ml-0.5 rounded-full p-0.5 hover:bg-background/60"
              >
                <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
              </button>
            </Badge>
          ))}
        </div>
      )}
      <div className="relative">
        <Input
          placeholder="Search existing tags or type a new tag…"
          value={input}
          onFocus={() => setIsOpen(true)}
          onChange={(e) => {
            setInput(e.target.value)
            setIsOpen(true)
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault()
              if (input.trim()) handleAdd(input)
            }
          }}
          className="text-sm"
        />
        {isOpen && (matchingSuggestions.length > 0 || (cleanInput && !exactMatchExists)) && (
          <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-56 overflow-y-auto rounded-md border bg-popover py-1 shadow-lg ring-1 ring-black/5">
            {matchingSuggestions.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => handleAdd(s.name)}
                className="flex w-full items-center justify-between px-3 py-1.5 text-xs text-left transition-colors hover:bg-accent hover:text-accent-foreground"
              >
                <span className="flex items-center gap-2 font-medium">
                  <Tag className="h-3 w-3 text-muted-foreground" />
                  {s.name}
                </span>
                <span className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Existing Tag</span>
              </button>
            ))}
            {cleanInput && !exactMatchExists && (
              <button
                type="button"
                onClick={() => handleAdd(input)}
                className="flex w-full items-center gap-2 border-t border-border/50 px-3 py-2 text-xs font-semibold text-primary text-left transition-colors hover:bg-primary/5"
              >
                <Plus className="h-3.5 w-3.5" />
                Create tag: &quot;{normalizeTag(input, available)}&quot;
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Sub-Component: QuestionSheet ──────────────────────────────────────────────

interface QuestionSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  defaultValues?: QuestionForm
  defaultSectionId?: string | null
  availableTags: { id: string; name: string }[]
  sections: LocalSection[]
  onSave: (form: QuestionForm, sectionId: string) => void
  onStageFile: (file: File) => string
  mode?: "add" | "edit"
}

const makeOptions = (): OptionForm[] =>
  Array.from({ length: 4 }, () => ({
    _key: crypto.randomUUID(),
    option_text: "",
    is_correct: false,
  }))

const EMPTY_FORM: QuestionForm = {
  question_text: "",
  question_type: "single_correct",
  marks: 1,
  explanation: "",
  options: makeOptions(),
  tag_names: [],
}

function QuestionSheet({
  open,
  onOpenChange,
  defaultValues,
  defaultSectionId,
  availableTags,
  sections,
  onSave,
  onStageFile,
  mode = "add",
}: QuestionSheetProps) {
  const [form, setForm] = useState<QuestionForm>(defaultValues ?? { ...EMPTY_FORM, options: makeOptions() })
  const [selectedSectionId, setSelectedSectionId] = useState<string>(
    defaultSectionId || sections[0]?.id || ""
  )
  const [errors, setErrors] = useState<string[]>([])

  useEffect(() => {
    if (open) {
      setForm(defaultValues ?? { ...EMPTY_FORM, options: makeOptions() })
      setSelectedSectionId(defaultSectionId || sections[0]?.id || "")
      setErrors([])
    }
  }, [open, defaultValues, defaultSectionId, sections])

  const set = <K extends keyof QuestionForm>(k: K, v: QuestionForm[K]) =>
    setForm((f) => ({ ...f, [k]: v }))

  const validate = (): string[] => {
    const e: string[] = []
    if (!form.question_text.trim()) e.push("Question text is required.")
    if (!selectedSectionId) e.push("Select a section for this question.")
    if (form.options.some((o) => !o.option_text.trim())) e.push("All options must have text or an image.")
    if (!form.options.some((o) => o.is_correct)) e.push("Mark at least one correct answer.")
    if (form.question_type === "single_correct" && form.options.filter((o) => o.is_correct).length > 1)
      e.push("Single-answer type can only have one correct option.")
    const m = Number(form.marks)
    if (isNaN(m) || m <= 0) e.push("Marks must be a positive number.")
    return e
  }

  const handleSave = () => {
    const e = validate()
    if (e.length) { setErrors(e); return }
    onSave(form, selectedSectionId || sections[0]?.id || "")
    setErrors([])
  }

  const handleClose = () => { setErrors([]); onOpenChange(false) }

  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) handleClose() }}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-xl">

        <SheetHeader className="shrink-0 border-b px-6 py-4">
          <SheetTitle>{mode === "edit" ? "Edit Question" : "Add Question"}</SheetTitle>
          <SheetDescription>
            {mode === "edit"
              ? "Make changes, then save."
              : "Enter the question, pick section, mark correct answer(s), then save."}
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
          {errors.length > 0 && (
            <div className="space-y-1 rounded-md border border-destructive/30 bg-destructive/10 p-3">
              {errors.map((e) => (
                <p key={e} className="flex items-center gap-1.5 text-xs text-destructive">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  {e}
                </p>
              ))}
            </div>
          )}

          <div className="space-y-1.5">
            <Label>
              Question <span className="text-destructive">*</span>
            </Label>
            <MarkdownEditor
              value={form.question_text}
              onChange={(v) => set("question_text", v)}
              onStageFile={onStageFile}
              placeholder="Enter question text… supports $LaTeX$, **bold**, `code`, ![img](url)…"
              rows={4}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Answer Type</Label>
              <Select
                value={form.question_type}
                onValueChange={(v: "single_correct" | "multiple_correct") =>
                  setForm((f) => ({
                    ...f,
                    question_type: v,
                    options: f.options.map((o) => ({ ...o, is_correct: false })),
                  }))
                }
              >
                <SelectTrigger className="w-full text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="single_correct">Single correct</SelectItem>
                  <SelectItem value="multiple_correct">Multiple correct</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Marks</Label>
              <Input
                type="number"
                min="0.5"
                step="0.5"
                value={form.marks}
                onChange={(e) => set("marks", parseFloat(e.target.value) || 0)}
                className="text-sm"
              />
            </div>
          </div>

          {/* Section dropdown */}
          <div className="space-y-1.5">
            <Label>Section <span className="text-destructive">*</span></Label>
            <Select
              value={selectedSectionId}
              onValueChange={setSelectedSectionId}
            >
              <SelectTrigger className="w-full text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                {sections.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>
              Options <span className="text-destructive">*</span>
              <span className="ml-2 text-xs font-normal text-muted-foreground">
                {form.question_type === "single_correct" ? "Pick one correct" : "Pick all correct"}
              </span>
            </Label>
            <OptionsBuilder
              options={form.options}
              questionType={form.question_type}
              onChange={(v) => set("options", v)}
              onStageFile={onStageFile}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Topic Tags</Label>
            <TagInput
              selected={form.tag_names}
              available={availableTags}
              onChange={(v) => set("tag_names", v)}
            />
          </div>

          <Accordion type="single" collapsible>
            <AccordionItem value="exp" className="rounded-md border px-1">
              <AccordionTrigger className="px-3 py-3 text-sm hover:no-underline">
                <span className="flex items-center gap-2 text-muted-foreground">
                  <BookOpen className="h-3.5 w-3.5" />
                  Explanation
                  <span className="text-xs font-normal">(optional)</span>
                </span>
              </AccordionTrigger>
              <AccordionContent className="px-3 pb-3 space-y-2">
                <MarkdownEditor
                  value={form.explanation}
                  onChange={(v) => set("explanation", v)}
                  onStageFile={onStageFile}
                  placeholder="Explain why the correct answer is correct… supports $LaTeX$, code blocks, and images"
                  rows={4}
                />
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>

        <SheetFooter className="shrink-0 flex-row justify-end gap-2 border-t px-6 py-4">
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            {mode === "edit" ? "Save Changes" : "Add Question"}
          </Button>
        </SheetFooter>

      </SheetContent>
    </Sheet>
  )
}

// ─── Sub-Component: AiGenerateSheet ───────────────────────────────────────────

interface AiGenerateSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  sections: LocalSection[]
  defaultSectionId?: string | null
  generateQuestionsAction?: (
    input: AiGenerateForm
  ) => Promise<GenerateQuestionsResult>
  onImport: (questions: QuestionForm[], sectionId: string) => void
}

type AiPreviewQuestion = QuestionForm & {
  _selected: boolean
  _previewId: string
  _warnings: string[]
  _showExplanation: boolean
}

const AI_EMPTY: AiGenerateForm = {
  topic: "",
  count: "5",
  difficulty: "medium",
  question_type: "single_correct",
}

const AI_DEFAULT_COUNT = "5"

function AiGenerateSheet({
  open,
  onOpenChange,
  sections,
  defaultSectionId,
  generateQuestionsAction,
  onImport,
}: AiGenerateSheetProps) {
  const [form, setForm] = useState<AiGenerateForm>(AI_EMPTY)
  const [targetSectionId, setTargetSectionId] = useState<string>(
    defaultSectionId || sections[0]?.id || ""
  )
  const [generated, setGenerated] = useState<AiPreviewQuestion[]>([])
  const [generatedWith, setGeneratedWith] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    if (open) {
      setTargetSectionId(defaultSectionId || sections[0]?.id || "")
    }
  }, [open, defaultSectionId, sections])

  const countFieldError =
    form.count !== "" && (Number(form.count) < 1 || Number(form.count) > 60)
      ? "Enter a number between 1 and 60."
      : null

  const setField = <K extends keyof AiGenerateForm>(k: K, v: AiGenerateForm[K]) =>
    setForm((f) => ({ ...f, [k]: v }))

  const handleGenerate = () => {
    const count = Number(form.count)

    if (!form.topic.trim()) {
      setError("Please enter a topic.")
      return
    }

    if (!generateQuestionsAction) {
      setError("AI generation is not configured.")
      return
    }

    if (isNaN(count) || count < 1 || count > 60) {
      setError("Count must be between 1 and 60.")
      return
    }

    setError(null)
    setGenerated([])
    setGeneratedWith(null)

    const currentSection = sections.find((s) => s.id === targetSectionId)
    const topicWithSectionContext = currentSection && currentSection.name
      ? `${form.topic.trim()} (Section context: ${currentSection.name})`
      : form.topic.trim()

    startTransition(async () => {
      try {
        const result = await generateQuestionsAction({
          ...form,
          topic: topicWithSectionContext,
        })

        if (result.error) {
          setGeneratedWith(null)
          setError(result.error)
          return
        }

        setGeneratedWith(result.generatedWith || null)
        setGenerated(
          (result.questions || []).map((q) => ({
            ...q,
            _selected: true,
            _previewId: crypto.randomUUID(),
            _warnings: [],
            _showExplanation: false,
          }))
        )
      } catch (err: any) {
        setGeneratedWith(null)
        setError(err?.message ?? "Failed to generate questions. Please try again.")
      }
    })
  }

  const handleImport = () => {
    const selected = generated.filter((q) => q._selected)

    if (!selected.length) {
      setError("Select at least one question.")
      return
    }

    const finalSecId = targetSectionId || sections[0]?.id || ""

    onImport(
      selected.map(({ _selected, _previewId, _warnings, _showExplanation, ...q }) => q),
      finalSecId
    )

    handleClose()
  }

  const handleClose = () => {
    setForm(AI_EMPTY)
    setGenerated([])
    setGeneratedWith(null)
    setError(null)
    onOpenChange(false)
  }

  const toggleSelected = (previewId: string) =>
    setGenerated((p) =>
      p.map((x) =>
        x._previewId === previewId ? { ...x, _selected: !x._selected } : x
      )
    )

  const toggleExplanation = (previewId: string) =>
    setGenerated((p) =>
      p.map((x) =>
        x._previewId === previewId ? { ...x, _showExplanation: !x._showExplanation } : x
      )
    )

  const selectedCount = generated.filter((q) => q._selected).length

  return (
    <Sheet
      open={open}
      onOpenChange={(v) => {
        if (!v) handleClose()
      }}
    >
      <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-xl">
        <SheetHeader className="shrink-0 border-b px-6 py-4">
          <SheetTitle>
            Generate with Trixy AI
          </SheetTitle>
          <SheetDescription>
            Describe a topic, generate questions with Trixy AI, then review and add to chosen section.
          </SheetDescription>

          {generatedWith && (
            <div className="pt-2">
              <Badge variant="secondary" className="font-normal">
                Generated with: {generatedWith}
              </Badge>
            </div>
          )}
        </SheetHeader>

        <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">

          {error && (
            <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              {error}
            </div>
          )}

          {/* Section dropdown */}
          <div className="space-y-1.5">
            <Label>Target Section</Label>
            <Select
              value={targetSectionId}
              onValueChange={setTargetSectionId}
              disabled={isPending}
            >
              <SelectTrigger className="w-full text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                {sections.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>
              Topic / Prompt <span className="text-destructive">*</span>
            </Label>
            <Textarea
              placeholder="e.g. Python list comprehensions, Newton's laws of motion…"
              value={form.topic}
              onChange={(e) => setField("topic", e.target.value)}
              rows={3}
              className="resize-none text-sm"
              disabled={isPending}
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label>Count</Label>
              <Input
                type="number"
                min={1}
                max={60}
                value={form.count}
                onChange={(e) => setField("count", e.target.value)}
                onBlur={() => {
                  if (!form.count.trim()) setField("count", AI_DEFAULT_COUNT)
                }}
                className={cn(
                  "text-sm",
                  countFieldError && "border-destructive focus-visible:ring-destructive"
                )}
                disabled={isPending}
              />
              {countFieldError && (
                <p className="flex items-center gap-1 text-xs text-destructive">
                  <AlertCircle className="h-3 w-3 shrink-0" />
                  {countFieldError}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label>Difficulty</Label>
              <Select
                value={form.difficulty}
                onValueChange={(v: AiGenerateForm["difficulty"]) =>
                  setField("difficulty", v)
                }
                disabled={isPending}
              >
                <SelectTrigger className="w-full text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="easy">Easy</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="hard">Hard</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select
                value={form.question_type}
                onValueChange={(v: AiGenerateForm["question_type"]) =>
                  setField("question_type", v)
                }
                disabled={isPending}
              >
                <SelectTrigger className="w-full text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="single_correct">Single</SelectItem>
                  <SelectItem value="multiple_correct">Multiple</SelectItem>
                  <SelectItem value="mixed">Mixed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <GenerateButton
            onClick={handleGenerate}
            isGenerating={isPending}
            disabled={isPending || !form.topic.trim() || !!countFieldError}
            text="Generate"
            generatingText="Generating..."
            hue={275}
          />

          {isPending && (
            <div className="space-y-3">
              {Array.from({ length: Number(form.count) || 3 }).map((_, i) => (
                <Skeleton key={i} className="h-24 border border-border/40" />
              ))}
            </div>
          )}

          {!isPending && generated.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-medium">
                    {generated.length} question{generated.length !== 1 ? "s" : ""} generated
                  </p>
                  {generatedWith && (
                    <p className="text-xs text-muted-foreground">
                      Generated with <span className="font-medium">{generatedWith}</span>
                    </p>
                  )}
                </div>

                <div className="flex gap-2 text-xs text-muted-foreground">
                  <button
                    type="button"
                    className="hover:text-foreground"
                    onClick={() =>
                      setGenerated((p) => p.map((q) => ({ ...q, _selected: true })))
                    }
                  >
                    Select all
                  </button>
                  <span>·</span>
                  <button
                    type="button"
                    className="hover:text-foreground"
                    onClick={() =>
                      setGenerated((p) => p.map((q) => ({ ...q, _selected: false })))
                    }
                  >
                    Deselect all
                  </button>
                </div>
              </div>

              {generated.map((q, idx) => (
                <button
                  key={q._previewId}
                  type="button"
                  onClick={() => toggleSelected(q._previewId)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault()
                      toggleSelected(q._previewId)
                    }
                  }}
                  className={cn(
                    "w-full text-left space-y-2 rounded-md border p-3 cursor-pointer transition-colors outline-none",
                    "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
                    q._selected
                      ? "border-primary/40 bg-primary/5"
                      : "opacity-50 hover:opacity-80"
                  )}
                >
                  <div className="flex items-start gap-2">
                    <Checkbox
                      checked={q._selected}
                      onCheckedChange={() => toggleSelected(q._previewId)}
                      className="mt-0.5 shrink-0"
                      onClick={(e) => e.stopPropagation()}
                    />
                    <p className="flex-1 text-sm font-medium leading-snug">
                      {idx + 1}. <InlineRichText>{q.question_text}</InlineRichText>
                    </p>
                    {q._warnings.length > 0 && (
                      <Badge className="shrink-0 border-amber-300 bg-amber-100 text-xs text-amber-700 hover:bg-amber-100 dark:bg-amber-950/40 dark:text-amber-400">
                        Auto-fixed
                      </Badge>
                    )}
                  </div>

                  <div className="space-y-1 pl-6">
                    {q.options.map((opt, oi) => (
                      <div
                        key={opt._key}
                        className={cn(
                          "flex items-center gap-1.5 text-xs",
                          opt.is_correct
                            ? "font-medium text-emerald-600 dark:text-emerald-400"
                            : "text-muted-foreground"
                        )}
                      >
                        {opt.is_correct ? (
                          <CheckCircle2 className="h-3 w-3 shrink-0" />
                        ) : (
                          <Circle className="h-3 w-3 shrink-0" />
                        )}
                        {String.fromCharCode(65 + oi)}. <InlineRichText>{opt.option_text}</InlineRichText>
                      </div>
                    ))}
                  </div>

                  {q._warnings.length > 0 && (
                    <div className="space-y-1 pl-6">
                      {q._warnings.map((w) => (
                        <p
                          key={w}
                          className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400"
                        >
                          <AlertTriangle className="h-3 w-3 shrink-0" />
                          {w}
                        </p>
                      ))}
                    </div>
                  )}

                  <div className="flex flex-wrap items-center gap-2 pl-6">
                    <Badge variant="outline" className="h-4 px-1.5 py-0 text-xs">
                      {q.question_type === "single_correct" ? "Single" : "Multiple"}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {q.marks} mark{q.marks !== 1 ? "s" : ""}
                    </span>
                    {q.tag_names.map((tag) => (
                      <Badge
                        key={tag}
                        variant="secondary"
                        className="h-4 px-1.5 py-0 text-xs font-normal"
                      >
                        {tag}
                      </Badge>
                    ))}
                  </div>

                  {q.explanation && (
                    <div className="pl-6">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          toggleExplanation(q._previewId)
                        }}
                        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                      >
                        {q._showExplanation ? (
                          <ChevronUp className="h-3 w-3" />
                        ) : (
                          <ChevronDown className="h-3 w-3" />
                        )}
                        {q._showExplanation ? "Hide" : "Show"} explanation
                      </button>

                      {q._showExplanation && (
                        <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                          <InlineRichText>{q.explanation}</InlineRichText>
                        </p>
                      )}
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        <SheetFooter className="shrink-0 flex-row justify-end gap-2 border-t px-6 py-4">
          <Button variant="outline" onClick={handleClose} disabled={isPending}>
            Cancel
          </Button>
          {generated.length > 0 && (
            <Button onClick={handleImport} disabled={selectedCount === 0 || isPending}>
              Add {selectedCount} Question{selectedCount !== 1 ? "s" : ""}
            </Button>
          )}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}

// ─── Sub-Component: ImportSheet ───────────────────────────────────────────────

interface ImportSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  sections: LocalSection[]
  defaultSectionId?: string | null
  onImport: (questions: QuestionForm[], sectionId: string) => void
}

type ImportPreviewQuestion = QuestionForm & {
  _selected: boolean
  _previewId: string
  _errors: string[]
  _warnings: string[]
}

const IMPORT_SAMPLE = JSON.stringify(
  [
    {
      question_text: "What is the output of print(type([]))?",
      question_type: "single_correct",
      marks: 1,
      explanation: "list is the type of an empty list literal.",
      tag_names: ["Python", "Data Types"],
      options: [
        { option_text: "<class 'list'>", is_correct: true },
        { option_text: "<class 'tuple'>", is_correct: false },
        { option_text: "<class 'dict'>", is_correct: false },
        { option_text: "<class 'array'>", is_correct: false },
      ],
    },
  ],
  null,
  2
)

function validateItem(item: any, idx: number): ImportPreviewQuestion {
  const errors: string[] = []
  const warnings: string[] = []

  if (!item?.question_text || typeof item.question_text !== "string" || !item.question_text.trim())
    errors.push("question_text is required and must be a non-empty string")

  const rawOptions = item?.options
  if (!Array.isArray(rawOptions)) {
    errors.push("options must be an array")
  } else if (rawOptions.length < 2) {
    errors.push(`options needs at least 2 items (found ${rawOptions.length})`)
  } else {
    const emptyCount = rawOptions.filter((o: any) => !String(o?.option_text ?? "").trim()).length
    if (emptyCount > 0)
      errors.push(`${emptyCount} option${emptyCount > 1 ? "s have" : " has"} empty option_text`)
    const correctCount = rawOptions.filter((o: any) => o?.is_correct === true).length
    if (correctCount === 0) errors.push("at least one option must have is_correct: true")
  }

  if (errors.length > 0) {
    return {
      question_text: String(item?.question_text || `Question ${idx + 1}`),
      question_type: "single_correct",
      marks: 1, explanation: "", options: [], tag_names: [],
      _selected: false, _previewId: crypto.randomUUID(), _errors: errors, _warnings: [],
    }
  }

  const rawType = item?.question_type
  const qType: "single_correct" | "multiple_correct" =
    rawType === "multiple_correct" ? "multiple_correct" : "single_correct"
  if (rawType !== undefined && rawType !== "single_correct" && rawType !== "multiple_correct")
    warnings.push(`unknown question_type "${rawType}" — defaulted to single_correct`)

  const rawMarks = parseFloat(item?.marks)
  const finalMarks = !isNaN(rawMarks) && rawMarks > 0 ? rawMarks : 1
  if (item?.marks !== undefined && (isNaN(rawMarks) || rawMarks <= 0))
    warnings.push(`invalid marks value "${item.marks}" — defaulted to 1`)

  let options: OptionForm[] = (rawOptions as any[]).map((o: any) => ({
    _key: crypto.randomUUID(),
    option_text: String(o.option_text ?? "").trim(),
    is_correct: Boolean(o.is_correct),
  }))

  if (qType === "single_correct") {
    const correctCount = options.filter((o) => o.is_correct).length
    if (correctCount > 1) {
      let kept = false
      options = options.map((o) => {
        if (!o.is_correct) return o
        if (!kept) { kept = true; return o }
        return { ...o, is_correct: false }
      })
      warnings.push(`${correctCount} correct options found — kept only the first`)
    }
  }

  return {
    question_text: String(item.question_text).trim(),
    question_type: qType,
    marks: finalMarks,
    explanation: String(item?.explanation ?? ""),
    tag_names: Array.isArray(item?.tag_names) ? item.tag_names.map(String) : [],
    options,
    _selected: true, _previewId: crypto.randomUUID(), _errors: [], _warnings: warnings,
  }
}

function ImportSheet({
  open,
  onOpenChange,
  sections,
  defaultSectionId,
  onImport,
}: ImportSheetProps) {
  const [jsonText, setJsonText] = useState("")
  const [targetSectionId, setTargetSectionId] = useState<string>(
    defaultSectionId || sections[0]?.id || ""
  )
  const [preview, setPreview] = useState<ImportPreviewQuestion[]>([])
  const [jsonError, setJsonError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      setTargetSectionId(defaultSectionId || sections[0]?.id || "")
    }
  }, [open, defaultSectionId, sections])

  const parseAndValidate = (rawText: string) => {
    setJsonText(rawText)
    setJsonError(null)
    setPreview([])

    if (!rawText.trim()) return

    let parsed: any
    try {
      parsed = JSON.parse(rawText)
    } catch {
      setJsonError("Invalid JSON syntax. Check for missing quotes or trailing commas.")
      return
    }

    if (!Array.isArray(parsed)) {
      setJsonError("JSON root must be an array of question objects.")
      return
    }

    if (parsed.length === 0) {
      setJsonError("The array is empty.")
      return
    }

    setPreview(parsed.map((item, idx) => validateItem(item, idx)))
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      parseAndValidate(ev.target?.result as string)
    }
    reader.readAsText(file)
    e.target.value = ""
  }

  const handleImportClick = () => {
    const validSelected = preview.filter((q) => q._selected && q._errors.length === 0)
    if (validSelected.length === 0) return
    const finalSecId = targetSectionId || sections[0]?.id || ""
    onImport(
      validSelected.map(({ _selected, _previewId, _errors, _warnings, ...q }) => q),
      finalSecId
    )
    handleClose()
  }

  const handleClose = () => {
    setJsonText("")
    setPreview([])
    setJsonError(null)
    onOpenChange(false)
  }

  const validSelectedCount = preview.filter((q) => q._selected && q._errors.length === 0).length
  const totalValid = preview.filter((q) => q._errors.length === 0).length

  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) handleClose() }}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-xl">

        <SheetHeader className="shrink-0 border-b px-6 py-4">
          <SheetTitle>
            Import Questions from JSON
          </SheetTitle>
          <SheetDescription>
            Upload a JSON file or paste formatted JSON to add questions directly to your section.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
          {/* Target Section Selection */}
          <div className="space-y-1.5">
            <Label>Target Section</Label>
            <Select
              value={targetSectionId}
              onValueChange={setTargetSectionId}
            >
              <SelectTrigger className="w-full text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                {sections.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              className="hidden"
              onChange={handleFileUpload}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              className="gap-1.5"
            >
              <FileJson className="h-4 w-4" />
              Upload .json file
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => parseAndValidate(IMPORT_SAMPLE)}
              className="gap-1.5 text-xs text-muted-foreground"
            >
              Load Sample JSON
            </Button>
          </div>

          <div className="space-y-1.5">
            <Label>JSON Data</Label>
            <Textarea
              placeholder="Paste JSON array here…"
              value={jsonText}
              onChange={(e) => parseAndValidate(e.target.value)}
              rows={6}
              className="font-mono text-xs leading-relaxed"
            />
          </div>

          {jsonError && (
            <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              {jsonError}
            </div>
          )}

          {preview.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">
                  Preview ({totalValid} valid question{totalValid !== 1 ? "s" : ""})
                </p>
                <div className="flex gap-2 text-xs text-muted-foreground">
                  <button
                    type="button"
                    className="hover:text-foreground"
                    onClick={() =>
                      setPreview((p) =>
                        p.map((q) => (q._errors.length === 0 ? { ...q, _selected: true } : q))
                      )
                    }
                  >
                    Select all valid
                  </button>
                  <span>·</span>
                  <button
                    type="button"
                    className="hover:text-foreground"
                    onClick={() => setPreview((p) => p.map((q) => ({ ...q, _selected: false })))}
                  >
                    Deselect all
                  </button>
                </div>
              </div>

              {preview.map((q, idx) => {
                const hasError = q._errors.length > 0
                return (
                  <div
                    key={q._previewId}
                    className={cn(
                      "space-y-2 rounded-md border p-3 text-xs transition-colors",
                      hasError
                        ? "border-destructive/40 bg-destructive/5 opacity-75"
                        : q._selected
                          ? "border-primary/40 bg-primary/5"
                          : "opacity-50"
                    )}
                  >
                    <div className="flex items-start gap-2">
                      {!hasError && (
                        <Checkbox
                          checked={q._selected}
                          onCheckedChange={() =>
                            setPreview((p) =>
                              p.map((x) =>
                                x._previewId === q._previewId ? { ...x, _selected: !x._selected } : x
                              )
                            )
                          }
                          className="mt-0.5 shrink-0"
                        />
                      )}
                      <p className="flex-1 font-medium leading-snug">
                        {idx + 1}. <InlineRichText>{q.question_text}</InlineRichText>
                      </p>
                    </div>

                    {hasError && (
                      <div className="space-y-1 pl-5 text-destructive">
                        {q._errors.map((err) => (
                          <p key={err} className="flex items-center gap-1.5">
                            <AlertCircle className="h-3 w-3 shrink-0" />
                            {err}
                          </p>
                        ))}
                      </div>
                    )}

                    {!hasError && q.options.length > 0 && (
                      <div className="space-y-0.5 pl-5">
                        {q.options.map((opt, oi) => (
                          <p
                            key={opt._key}
                            className={cn(
                              "flex items-center gap-1.5",
                              opt.is_correct
                                ? "font-medium text-emerald-600 dark:text-emerald-400"
                                : "text-muted-foreground"
                            )}
                          >
                            {opt.is_correct ? (
                              <CheckCircle2 className="h-3 w-3 shrink-0" />
                            ) : (
                              <Circle className="h-3 w-3 shrink-0" />
                            )}
                            {String.fromCharCode(65 + oi)}. <InlineRichText>{opt.option_text}</InlineRichText>
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <SheetFooter className="shrink-0 flex-row justify-end gap-2 border-t px-6 py-4">
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            onClick={handleImportClick}
            disabled={validSelectedCount === 0}
          >
            Import {validSelectedCount} Question{validSelectedCount !== 1 ? "s" : ""}
          </Button>
        </SheetFooter>

      </SheetContent>
    </Sheet>
  )
}
