"use client"

import { useState, useCallback, useEffect, useTransition, useRef } from "react"
import { toast } from "sonner"
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
import { MathText } from "@/components/ui/math-text"
import { cn } from "@/lib/utils"
import {
  Loader2, Save, Send, AlertCircle, AlertTriangle, BookOpen, CheckCircle2, Circle, Plus, Tag, X,
  PlusCircle, Sparkles, Upload, Trash2, Pencil, ChevronDown, ChevronUp, Info, FileJson, Image
} from "lucide-react"
import { CohortSelector } from "@/components/cohort-selector"
import type { CohortOption } from "@/app/(dashboard)/(licensed)/cohorts/types"
import { GenerateButton } from "@/components/ui/generate-button"

import type {
  SettingsForm,
  LocalQuestion,
  QuestionForm,
  OptionForm,
  AiGenerateForm,
  InitialTestData,
  GenerateQuestionsResult,
} from "./actions"

interface Props {
  testId?: string
  initialData?: InitialTestData
  availableTags: { id: string; name: string }[]
  generateQuestionsAction: (input: AiGenerateForm) => Promise<GenerateQuestionsResult>
  onSaveDraft: (id: string, settings: SettingsForm, questions: LocalQuestion[]) => Promise<void>
  onPublish: (id: string, settings: SettingsForm, questions: LocalQuestion[]) => Promise<void>
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

/**
 * Converts a UTC ISO string from Supabase (e.g. "2024-01-15T04:30:00+00:00")
 * to the "YYYY-MM-DDTHH:mm" format expected by <input type="datetime-local">,
 * expressed in the user's LOCAL timezone.
 */
export function toLocalDateTimeInput(isoString: string): string {
  if (!isoString) return ""
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(isoString)) return isoString
  const d = new Date(isoString)
  if (isNaN(d.getTime())) return ""
  const offsetMs = d.getTimezoneOffset() * 60 * 1000
  const localDate = new Date(d.getTime() - offsetMs)
  return localDate.toISOString().slice(0, 16)
}

/**
 * Converts the "YYYY-MM-DDTHH:mm" value from <input type="datetime-local">
 * back to a UTC ISO string for DB storage.
 */
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

/** Convert local datetime-local values to UTC ISO strings for DB storage */
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

  // Stable ID: use prop when editing, generate once when creating
  const [testId] = useState<string>(() => propTestId ?? crypto.randomUUID())

  // Settings state lives here so both SettingsForm and the header buttons
  // always see the latest values. Dates are kept in local "YYYY-MM-DDTHH:mm"
  // format for the inputs; they are converted to UTC just before saving.
  const [settings, setSettings] = useState<SettingsForm>(() =>
    normalizeDefaults(initialData?.settings ?? EMPTY_SETTINGS)
  )
  const [questions, setQuestions] = useState<LocalQuestion[]>(
    initialData?.questions ?? []
  )

  const [isSaving, setIsSaving] = useState(false)
  const [isPublishing, setIsPublishing] = useState(false)

  // Validation helpers
  const titleValid = settings.title.trim().length > 0
  const dateRangeValid =
    !settings.available_from ||
    !settings.available_until ||
    settings.available_from < settings.available_until

  const canSave = titleValid && dateRangeValid

  // ── Draft save ──────────────────────────────────────────────────────────────
  const handleSaveDraft = useCallback(async () => {
    if (!canSave) {
      if (!titleValid) toast.error("Title is required to save.")
      return
    }
    setIsSaving(true)
    try {
      await onSaveDraft(testId, settingsForDb(settings), questions)
      toast.success("Draft saved.")
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to save draft.")
    } finally {
      setIsSaving(false)
    }
  }, [testId, settings, questions, onSaveDraft, canSave, titleValid])

  // ── Publish ─────────────────────────────────────────────────────────────────
  const handlePublish = useCallback(async () => {
    if (!canSave) {
      if (!titleValid) toast.error("Title is required to publish.")
      return
    }
    setIsPublishing(true)
    try {
      await onPublish(testId, settingsForDb(settings), questions)
    } catch (err: any) {
      if (err?.message === "NEXT_REDIRECT") throw err
      toast.error(err?.message ?? "Failed to publish.")
      setIsPublishing(false)
    }
  }, [testId, settings, questions, onPublish, canSave, titleValid])

  return (
    <div className="min-h-screen w-full">
      <div className="mx-auto space-y-6 px-4 py-6 md:px-6 md:py-8">

        {/* ── Page Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-0.5">
            <h1 className="text-xl font-semibold tracking-tight">
              {isEditMode ? "Edit Test" : "Create Test"}
            </h1>
            <p className="text-sm text-muted-foreground">
              {isEditMode
                ? "Update settings and questions, then republish."
                : "Fill in settings, add questions, then publish."}
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

        {/* ── Questions ── */}
        <QuestionsPanel
          questions={questions}
          setQuestions={setQuestions}
          availableTags={availableTags}
          generateQuestionsAction={generateQuestionsAction}
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
      <Card>
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
              className="min-h-[4rem] resize-none"
              value={values.description}
              onChange={set("description")}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="instructions">Instructions</Label>
            <Textarea
              id="instructions"
              placeholder="Rules or instructions candidates will read before starting"
              className="min-h-[5rem] resize-none"
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
                <Input
                  id="available_from"
                  type="datetime-local"
                  value={values.available_from}
                  onChange={set("available_from")}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="available_until">Available Until</Label>
                <Input
                  id="available_until"
                  type="datetime-local"
                  value={values.available_until}
                  onChange={set("available_until")}
                />
              </div>
            </div>
            {/* Date range validation warning */}
            {dateRangeInvalid && (
              <p className="flex items-center gap-1.5 text-xs text-destructive">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                &quot;Available Until&quot; must be after &quot;Available From&quot;.
              </p>
            )}
          </div>

          {/* Cohort Targeting */}
          <div className="space-y-2 border rounded-lg p-4 bg-muted/20">
            <div>
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Target Cohorts *
              </Label>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Select which cohorts can take this test. At least one cohort is required to publish.
              </p>
            </div>
            <CohortSelector
              selectedCohortIds={values.cohort_ids || []}
              onChange={(ids) => onChange({ ...values, cohort_ids: ids })}
              cohorts={cohortOptions}
            />
          </div>

        </CardContent>
      </Card>

      {/* ── Advanced Settings ── */}
      <Card>
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

// ─── Sub-Component: OptionsBuilder ─────────────────────────────────────────────

function OptionsBuilder({
  options,
  questionType,
  onChange,
}: {
  options: OptionForm[]
  questionType: "single_correct" | "multiple_correct"
  onChange: (v: OptionForm[]) => void
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
        <div key={opt._key} className="flex flex-col gap-2 rounded-lg border p-3 bg-muted/5">
          <div className="flex items-center gap-2">
            <span className="w-5 shrink-0 text-center text-xs font-bold text-muted-foreground">
              {String.fromCharCode(65 + idx)}
            </span>
            <Input
              placeholder={`Option ${String.fromCharCode(65 + idx)}`}
              value={opt.option_text}
              onChange={(e) => updateText(opt._key, e.target.value)}
              className={cn(
                "flex-1 text-sm",
                opt.is_correct && "border-emerald-500 focus-visible:ring-emerald-400"
              )}
            />
            <button
              type="button"
              onClick={() => toggleCorrect(opt._key)}
              title="Mark as correct"
              className={cn(
                "flex shrink-0 items-center gap-1 rounded-md border px-2 py-1.5 text-xs font-medium transition-colors",
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
              className="text-muted-foreground transition-colors hover:text-destructive disabled:opacity-25"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

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

// ─── Sub-Component: TagInput ──────────────────────────────────────────────────

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

  const suggestions = input.trim()
    ? available
      .filter(
        (t) =>
          t.name.toLowerCase().includes(input.toLowerCase()) && !selected.includes(t.name)
      )
      .slice(0, 6)
    : []

  const add = (name: string) => {
    const t = name.trim()
    if (t && !selected.includes(t)) onChange([...selected, t])
    setInput("")
  }

  return (
    <div className="space-y-2">
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selected.map((t) => (
            <Badge key={t} variant="secondary" className="gap-1 pr-1 text-xs">
              <Tag className="h-3 w-3" />
              {t}
              <button
                type="button"
                onClick={() => onChange(selected.filter((s) => s !== t))}
                className="ml-0.5 rounded-full hover:bg-background/60"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
      <div className="relative">
        <Input
          placeholder="Type a tag and press Enter…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") { e.preventDefault(); add(input) }
          }}
          className="text-sm"
        />
        {suggestions.length > 0 && (
          <div className="absolute left-0 right-0 top-full z-50 mt-1 rounded-md border bg-popover py-1 shadow-md">
            {suggestions.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => add(s.name)}
                className="flex w-full items-center gap-2 px-3 py-1.5 text-sm hover:bg-muted"
              >
                <Tag className="h-3 w-3 text-muted-foreground" />
                {s.name}
              </button>
            ))}
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
  availableTags: { id: string; name: string }[]
  onSave: (form: QuestionForm) => void
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
  availableTags,
  onSave,
  mode = "add",
}: QuestionSheetProps) {
  const [form, setForm] = useState<QuestionForm>(defaultValues ?? { ...EMPTY_FORM, options: makeOptions() })
  const [errors, setErrors] = useState<string[]>([])

  useEffect(() => {
    if (open) {
      setForm(defaultValues ?? { ...EMPTY_FORM, options: makeOptions() })
      setErrors([])
    }
  }, [open, defaultValues])

  const set = <K extends keyof QuestionForm>(k: K, v: QuestionForm[K]) =>
    setForm((f) => ({ ...f, [k]: v }))



  const validate = (): string[] => {
    const e: string[] = []
    if (!form.question_text.trim()) e.push("Question text is required.")
    if (form.options.some((o) => !o.option_text.trim())) e.push("All options must have text.")
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
    onSave(form)
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
              : "Enter the question, mark correct answer(s), then save."}
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
            <Textarea
              placeholder="Enter the question text…"
              value={form.question_text}
              onChange={(e) => set("question_text", e.target.value)}
              rows={3}
              className="resize-none text-sm"
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
              <AccordionContent className="px-3 pb-3">
                <Textarea
                  placeholder="Explain why the correct answer is correct…"
                  value={form.explanation}
                  onChange={(e) => set("explanation", e.target.value)}
                  rows={3}
                  className="resize-none text-sm"
                />
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>

        <SheetFooter className="shrink-0 flex-row justify-end gap-2 border-t px-6 py-4">
          <Button variant="outline" onClick={handleClose}>Cancel</Button>
          <Button onClick={handleSave}>
            {mode === "edit" ? "Save Changes" : "Save Question"}
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
  generateQuestionsAction?: (
    input: AiGenerateForm
  ) => Promise<GenerateQuestionsResult>
  onImport: (questions: QuestionForm[]) => void
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
  generateQuestionsAction,
  onImport,
}: AiGenerateSheetProps) {
  const [form, setForm] = useState<AiGenerateForm>(AI_EMPTY)
  const [generated, setGenerated] = useState<AiPreviewQuestion[]>([])
  const [generatedWith, setGeneratedWith] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const countFieldError =
    form.count !== "" && (Number(form.count) < 1 || Number(form.count) > 20)
      ? "Enter a number between 1 and 20."
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

    if (isNaN(count) || count < 1 || count > 20) {
      setError("Count must be between 1 and 20.")
      return
    }

    setError(null)
    setGenerated([])
    setGeneratedWith(null)

    startTransition(async () => {
      try {
        const result = await generateQuestionsAction(form)

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

    onImport(
      selected.map(({ _selected, _previewId, _warnings, _showExplanation, ...q }) => q)
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
          <SheetTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-purple-500" />
            Generate with AI
          </SheetTitle>
          <SheetDescription>
            Describe a topic, generate questions, then review and add selected ones.
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
          <div className="flex items-start gap-2 rounded-md border border-blue-200 bg-blue-50 p-3 text-xs text-blue-700 dark:border-blue-800/50 dark:bg-blue-950/30 dark:text-blue-400">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>
              AI-generated questions may occasionally be inaccurate or misleading.
              Always review the content carefully before adding questions to your test.
            </span>
          </div>

          {error && (
            <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              {error}
            </div>
          )}

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
                max={20}
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
            disabled={
              isPending ||
              !form.topic.trim() ||
              !generateQuestionsAction ||
              !!countFieldError
            }
            text="Generate"
            generatingText="Generating"
            hue={275}
            className="w-full"
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
                      {idx + 1}. <MathText>{q.question_text}</MathText>
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
                        {String.fromCharCode(65 + oi)}. <MathText>{opt.option_text}</MathText>
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
                          <MathText>{q.explanation}</MathText>
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
  onImport: (questions: QuestionForm[]) => void
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

function ImportSheet({ open, onOpenChange, onImport }: ImportSheetProps) {
  const [tab, setTab] = useState<"paste" | "file">("paste")
  const [jsonText, setJsonText] = useState("")
  const [parsed, setParsed] = useState<ImportPreviewQuestion[]>([])
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const parseJson = (text: string) => {
    setError(null)
    setParsed([])
    let data: any
    try {
      data = JSON.parse(text)
    } catch {
      setError("Invalid JSON syntax — check for missing brackets, quotes, or trailing commas.")
      return
    }
    if (!Array.isArray(data)) {
      setError("JSON must be an array [ ... ] of question objects at the top level.")
      return
    }
    if (data.length === 0) {
      setError("JSON array is empty — no questions to import.")
      return
    }
    const questions = data.map((item, i) => validateItem(item, i))
    setParsed(questions)
    const badCount = questions.filter((q) => q._errors.length > 0).length
    if (badCount === questions.length) {
      setError(`All ${questions.length} question${questions.length > 1 ? "s" : ""} failed validation.`)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const text = ev.target?.result as string
      setJsonText(text)
      parseJson(text)
    }
    reader.readAsText(file)
    e.target.value = ""
  }

  const handleImport = () => {
    const selected = parsed.filter((q) => q._selected && q._errors.length === 0)
    if (!selected.length) { setError("Select at least one valid question."); return }
    onImport(selected.map(({ _selected, _previewId, _errors, _warnings, ...q }) => q))
    handleClose()
  }

  const handleClose = () => {
    setTab("paste")
    setJsonText("")
    setParsed([])
    setError(null)
    onOpenChange(false)
  }

  const toggle = (id: string) =>
    setParsed((p) =>
      p.map((q) =>
        q._previewId === id && q._errors.length === 0 ? { ...q, _selected: !q._selected } : q
      )
    )

  const errorCount = parsed.filter((q) => q._errors.length > 0).length
  const selectableCount = parsed.filter((q) => q._selected && q._errors.length === 0).length

  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) handleClose() }}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-xl">

        <SheetHeader className="shrink-0 border-b px-6 py-4">
          <SheetTitle className="flex items-center gap-2">
            <FileJson className="h-4 w-4 text-blue-500" />
            Import Questions
          </SheetTitle>
          <SheetDescription>
            Paste JSON or upload a{" "}
            <code className="rounded bg-muted px-1 text-xs">.json</code> file.
            Invalid questions are skipped.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 space-y-4 overflow-y-auto px-6 py-5">

          {/* Tabs */}
          <div className="flex w-fit gap-1 rounded-md bg-muted p-1">
            {(["paste", "file"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => { setTab(t); setParsed([]); setError(null) }}
                className={cn(
                  "rounded-sm px-3 py-1 text-xs font-medium transition-colors",
                  tab === t
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {t === "paste" ? "Paste JSON" : "Upload File"}
              </button>
            ))}
          </div>

          {error && (
            <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              {error}
            </div>
          )}

          {tab === "paste" ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>JSON</Label>
                <button
                  type="button"
                  onClick={() => { setJsonText(IMPORT_SAMPLE); setParsed([]); setError(null) }}
                  className="text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
                >
                  Load sample
                </button>
              </div>
              <Textarea
                placeholder={`[\n  {\n    "question_text": "...",\n    ...\n  }\n]`}
                value={jsonText}
                onChange={(e) => { setJsonText(e.target.value); setParsed([]); setError(null) }}
                rows={12}
                className="resize-none font-mono text-xs"
              />
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="w-full"
                onClick={() => parseJson(jsonText)}
                disabled={!jsonText.trim()}
              >
                Parse &amp; Preview
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <Label>Upload .json file</Label>
              <div
                className="flex cursor-pointer flex-col items-center gap-3 rounded-md border-2 border-dashed p-10 transition-colors hover:bg-muted/40"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="h-8 w-8 text-muted-foreground/40" />
                <div className="text-center">
                  <p className="text-sm font-medium">Click to upload</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">JSON files only</p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json,application/json"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </div>
            </div>
          )}

          {parsed.length > 0 && (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium">
                    {parsed.length} question{parsed.length !== 1 ? "s" : ""} found
                  </p>
                  {errorCount > 0 && (
                    <Badge variant="destructive" className="text-xs">{errorCount} invalid</Badge>
                  )}
                </div>
                <div className="flex gap-2 text-xs text-muted-foreground">
                  <button
                    type="button"
                    className="hover:text-foreground"
                    onClick={() => setParsed((p) => p.map((q) => ({ ...q, _selected: q._errors.length === 0 })))}
                  >
                    Select all valid
                  </button>
                  <span>·</span>
                  <button
                    type="button"
                    className="hover:text-foreground"
                    onClick={() => setParsed((p) => p.map((q) => ({ ...q, _selected: false })))}
                  >
                    Deselect all
                  </button>
                </div>
              </div>

              {parsed.map((q, idx) => {
                const hasErrors = q._errors.length > 0
                const hasWarnings = q._warnings.length > 0

                return (
                  <div
                    key={q._previewId}
                    onClick={() => { if (!hasErrors) toggle(q._previewId) }}
                    className={cn(
                      "space-y-2 rounded-md border p-3 transition-colors",
                      hasErrors
                        ? "cursor-not-allowed border-destructive/40 bg-destructive/5"
                        : q._selected
                          ? "cursor-pointer border-primary/40 bg-primary/5"
                          : "cursor-pointer opacity-50 hover:opacity-80"
                    )}
                  >
                    <div className="flex items-start gap-2">
                      <Checkbox
                        checked={q._selected}
                        disabled={hasErrors}
                        onCheckedChange={() => { if (!hasErrors) toggle(q._previewId) }}
                        className="mt-0.5 shrink-0"
                        onClick={(e) => e.stopPropagation()}
                      />
                      <p className={cn("flex-1 text-sm font-medium leading-snug", hasErrors && "text-muted-foreground")}>
                        {idx + 1}. {q.question_text ? <MathText>{q.question_text}</MathText> : <span className="italic">(no question text)</span>}
                      </p>
                      {hasErrors && <Badge variant="destructive" className="shrink-0 text-xs">Invalid</Badge>}
                      {!hasErrors && hasWarnings && (
                        <Badge className="shrink-0 border-amber-300 bg-amber-100 text-xs text-amber-700 hover:bg-amber-100 dark:bg-amber-950/40 dark:text-amber-400">
                          Auto-fixed
                        </Badge>
                      )}
                    </div>

                    {hasErrors && (
                      <div className="space-y-1 pl-6">
                        {q._errors.map((e) => (
                          <p key={e} className="flex items-center gap-1.5 text-xs text-destructive">
                            <AlertCircle className="h-3 w-3 shrink-0" /> {e}
                          </p>
                        ))}
                      </div>
                    )}

                    {!hasErrors && hasWarnings && (
                      <div className="space-y-1 pl-6">
                        {q._warnings.map((w) => (
                          <p key={w} className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400">
                            <AlertTriangle className="h-3 w-3 shrink-0" /> {w}
                          </p>
                        ))}
                      </div>
                    )}

                    {!hasErrors && (
                      <>
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
                              {String.fromCharCode(65 + oi)}. <MathText>{opt.option_text}</MathText>
                            </div>
                          ))}
                        </div>
                        <div className="flex items-center gap-2 pl-6">
                          <Badge variant="outline" className="h-4 px-1.5 py-0 text-xs">
                            {q.question_type === "single_correct" ? "Single" : "Multiple"}
                          </Badge>
                          <span className="text-xs text-muted-foreground">{q.marks} pt</span>
                          {q.tag_names.length > 0 && (
                            <span className="text-xs text-muted-foreground">
                              · {q.tag_names.join(", ")}
                            </span>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <SheetFooter className="shrink-0 flex-row justify-end gap-2 border-t px-6 py-4">
          <Button variant="outline" onClick={handleClose}>Cancel</Button>
          {parsed.length > 0 && (
            <Button onClick={handleImport} disabled={selectableCount === 0}>
              Import {selectableCount} Question{selectableCount !== 1 ? "s" : ""}
            </Button>
          )}
        </SheetFooter>

      </SheetContent>
    </Sheet>
  )
}

// ─── Sub-Component: QuestionsPanel ────────────────────────────────────────────

interface QuestionsPanelProps {
  questions: LocalQuestion[]
  setQuestions: React.Dispatch<React.SetStateAction<LocalQuestion[]>>
  availableTags: { id: string; name: string }[]
  generateQuestionsAction: (input: AiGenerateForm) => Promise<GenerateQuestionsResult>
}

function QuestionsPanel({
  questions,
  setQuestions,
  availableTags,
  generateQuestionsAction,
}: QuestionsPanelProps) {
  const [questionSheetOpen, setQuestionSheetOpen] = useState(false)
  const [aiSheetOpen, setAiSheetOpen] = useState(false)
  const [importSheetOpen, setImportSheetOpen] = useState(false)
  const [editingQuestion, setEditingQuestion] = useState<LocalQuestion | null>(null)

  const totalMarks = questions.reduce((sum, q) => sum + q.marks, 0)

  function openAdd() {
    setEditingQuestion(null)
    setQuestionSheetOpen(true)
  }

  function openEdit(q: LocalQuestion) {
    setEditingQuestion(q)
    setQuestionSheetOpen(true)
  }

  function handleQuestionSave(form: QuestionForm) {
    const asLocal: LocalQuestion = {
      id: editingQuestion?.id ?? crypto.randomUUID(),
      question_text: form.question_text,
      question_type: form.question_type,
      marks: form.marks || 1,
      order_index: editingQuestion?.order_index ?? questions.length + 1,
      explanation: form.explanation,
      tag_names: form.tag_names,
      options: form.options,
    }

    setQuestions((prev) =>
      editingQuestion
        ? prev.map((q) => (q.id === editingQuestion.id ? asLocal : q))
        : [...prev, asLocal]
    )
    setQuestionSheetOpen(false)
  }

  function handleAiImport(forms: QuestionForm[]) {
    const newLocals: LocalQuestion[] = forms.map((form, i) => ({
      id: crypto.randomUUID(),
      question_text: form.question_text,
      question_type: form.question_type,
      marks: form.marks || 1,
      order_index: questions.length + i + 1,
      explanation: form.explanation,
      tag_names: form.tag_names,
      options: form.options,
    }))
    setQuestions((prev) => [...prev, ...newLocals])
    setAiSheetOpen(false)
  }

  function handleJsonImport(forms: QuestionForm[]) {
    const newLocals: LocalQuestion[] = forms.map((form, i) => ({
      id: crypto.randomUUID(),
      question_text: form.question_text,
      question_type: form.question_type,
      marks: form.marks || 1,
      order_index: questions.length + i + 1,
      explanation: form.explanation,
      tag_names: form.tag_names,
      options: form.options,
    }))
    setQuestions((prev) => [...prev, ...newLocals])
    setImportSheetOpen(false)
  }

  function handleDelete(id: string) {
    setQuestions((prev) =>
      prev
        .filter((q) => q.id !== id)
        .map((q, i) => ({ ...q, order_index: i + 1 }))
    )
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-0.5">
              <CardTitle className="text-base">
                Questions
                {questions.length > 0 && (
                  <Badge variant="secondary" className="ml-2 text-xs">
                    {questions.length} · {totalMarks} marks
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>Add, edit, or reorder questions.</CardDescription>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={() => setAiSheetOpen(true)}>
                <Sparkles className="mr-1.5 size-4" /> AI Generate
              </Button>
              <Button size="sm" variant="outline" onClick={() => setImportSheetOpen(true)}>
                <Upload className="mr-1.5 size-4" /> Import
              </Button>
              <Button size="sm" onClick={openAdd}>
                <PlusCircle className="mr-1.5 size-4" /> Add Question
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {questions.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-10 text-center">
              <PlusCircle className="size-9 text-muted-foreground/50" />
              <div className="space-y-1">
                <p className="text-sm font-medium">No questions yet</p>
                <p className="text-xs text-muted-foreground">
                  Add manually, generate with AI, or import a file.
                </p>
              </div>
            </div>
          ) : (
            <ol className="space-y-2">
              {questions.map((q, idx) => (
                <li
                  key={q.id}
                  className="flex items-start gap-3 rounded-lg border bg-card p-3"
                >
                  <span className="mt-0.5 w-5 shrink-0 text-center text-xs font-medium text-muted-foreground">
                    {idx + 1}.
                  </span>
                  <div className="min-w-0 flex-1 space-y-1">
                    <p className="truncate text-sm"><MathText>{q.question_text}</MathText></p>
                    <div className="flex flex-wrap gap-1">
                      <Badge variant="outline" className="text-xs">
                        {q.question_type === "single_correct" ? "Single" : "Multiple"}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {q.marks} {q.marks === 1 ? "mark" : "marks"}
                      </Badge>
                      {q.tag_names.map((t) => (
                        <Badge key={t} variant="secondary" className="text-xs">
                          {t}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="size-7"
                      onClick={() => openEdit(q)}
                    >
                      <Pencil className="size-3.5" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="size-7 text-destructive hover:text-destructive"
                      onClick={() => handleDelete(q.id)}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </li>
              ))}
            </ol>
          )}
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
        availableTags={availableTags}
        onSave={handleQuestionSave}
      />

      <AiGenerateSheet
        open={aiSheetOpen}
        onOpenChange={setAiSheetOpen}
        generateQuestionsAction={generateQuestionsAction}
        onImport={handleAiImport}
      />

      <ImportSheet
        open={importSheetOpen}
        onOpenChange={setImportSheetOpen}
        onImport={handleJsonImport}
      />
    </>
  )
}
