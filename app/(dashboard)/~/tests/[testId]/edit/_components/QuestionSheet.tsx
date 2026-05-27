"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import {
  Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle,
} from "@/components/ui/sheet"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion"
import { AlertCircle, BookOpen, CheckCircle2, Circle, Plus, Tag, X } from "lucide-react"
import { cn } from "@/lib/utils"
import type { QuestionForm, OptionForm } from "../actions"

interface Props {
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

// ── Options Builder ────────────────────────────────────────────────────────────

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
    <div className="space-y-2">
      {options.map((opt, idx) => (
        <div key={opt._key} className="flex items-center gap-2">
          <span className="w-5 shrink-0 text-center text-xs text-muted-foreground">
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

// ── Tag Input ──────────────────────────────────────────────────────────────────

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

// ── QuestionSheet ──────────────────────────────────────────────────────────────

export function QuestionSheet({
  open,
  onOpenChange,
  defaultValues,
  availableTags,
  onSave,
  mode = "add",
}: Props) {
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
                {/* ✅ w-full added — fixes uneven column widths in grid-cols-2 */}
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
