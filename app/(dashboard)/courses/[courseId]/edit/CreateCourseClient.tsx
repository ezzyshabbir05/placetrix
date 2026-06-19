"use client"

import { useState, useTransition, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { buildStorageUrl } from "@/lib/storage"
import {
  BookOpen, Plus, Trash2, ArrowUp, ArrowDown, Upload, Save,
  AlertCircle, Eye, FileText, Loader2, X,
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { cn, parseDurationToMinutes } from "@/lib/utils"
import { toast } from "sonner"
import { createCourseAction, updateCourseAction, AdminCourseInput, AdminModuleInput } from "../../actions"
import { LatexRenderer } from "@/components/ui/latex-renderer"

interface Props {
  initialCourse?: {
    id: string
    title: string
    description: string
    level: string
    duration: string
    type: string
    cover_image_path?: string | null
    instructor_id?: string | null
    is_published: boolean
  }
  initialModules?: AdminModuleInput[]
  adminProfile?: {
    id: string
    display_name: string | null
    avatar_path: string | null
  } | null
}

// ── LaTeX Preview ──────────────────────────────────────────────────────────────

function extractAttachmentPaths(text: string): string[] {
  if (!text) return []
  const paths: string[] = []
  
  // 1. Check LaTeX \includegraphics
  const reLatex = /\\includegraphics(?:\[.*?\])?\{([^}]+)\}/g
  let match
  while ((match = reLatex.exec(text)) !== null) {
    const url = match[1]
    if (url.includes('course-attachments/')) {
      const parts = url.split('course-attachments/')
      if (parts.length > 1) {
        paths.push(parts[1])
      }
    }
  }

  // 2. Check Markdown ![alt](url)
  const reMarkdown = /!\[.*?\]\((.*?)\)/g
  while ((match = reMarkdown.exec(text)) !== null) {
    const url = match[1]
    if (url.includes('course-attachments/')) {
      const parts = url.split('course-attachments/')
      if (parts.length > 1) {
        paths.push(parts[1])
      }
    }
  }
  
  return paths
}

// ── Main Component ──────────────────────────────────────────────────────────────

export function CreateCourseClient({ initialCourse, initialModules = [], adminProfile }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const isEditMode = !!initialCourse

  // ── Course form state ────────────────────────────────────────────────────────
  const [title, setTitle] = useState(initialCourse?.title ?? "")
  const [description, setDescription] = useState(initialCourse?.description ?? "")
  const [level, setLevel] = useState(initialCourse?.level ?? "Beginner")
  const [coverImagePath, setCoverImagePath] = useState<string | null>(
    initialCourse?.cover_image_path ?? null
  )
  const [isPublished, setIsPublished] = useState(initialCourse?.is_published ?? false)

  // ── Modules state ────────────────────────────────────────────────────────────
  const [modules, setModules] = useState<AdminModuleInput[]>(initialModules)
  const [openModuleId, setOpenModuleId] = useState<string | undefined>(undefined)
  const [lastAddedId, setLastAddedId] = useState<string | null>(null)

  // Course duration is auto-calculated from the sum of all module durations
  const computedDuration = modules.reduce((sum, mod) => {
    return sum + (mod.duration ? parseDurationToMinutes(mod.duration) : 0)
  }, 0)
  const duration = String(computedDuration)

  // ── UI state ─────────────────────────────────────────────────────────────────
  const [isUploading, setIsUploading] = useState(false)
  const [activePreviewModuleId, setActivePreviewModuleId] = useState<string | null>(null)
  const [isUploadingImageMap, setIsUploadingImageMap] = useState<Record<number, boolean>>({})

  // ── Upload staging states ───────────────────────────────────────────────────
  const [coverImageFile, setCoverImageFile] = useState<File | null>(null)
  const [coverPreviewUrl, setCoverPreviewUrl] = useState<string | null>(null)
  const [pendingUploads, setPendingUploads] = useState<Record<string, { file: File; filePath: string }>>({})

  // ── Validation ───────────────────────────────────────────────────────────────
  const canSave =
    title.trim().length > 0 &&
    description.trim().length > 0 &&
    duration.trim().length > 0 &&
    !isNaN(Number(duration)) &&
    Number(duration) > 0

  // ── Handlers ─────────────────────────────────────────────────────────────────

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file.")
      return
    }
    setCoverImageFile(file)
    setCoverPreviewUrl(URL.createObjectURL(file))
    toast.success("Cover image selected successfully!")
  }

  const handleModuleImageUpload = async (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file.")
      return
    }

    try {
      const fileExt = file.name.split(".").pop()
      const fileName = `${crypto.randomUUID()}.${fileExt}`
      const filePath = `modules/${fileName}`
      const localUrl = URL.createObjectURL(file)

      setPendingUploads((prev) => ({
        ...prev,
        [localUrl]: { file, filePath }
      }))

      const latexFigure = `\n\n\\begin{figure}[h]\n  \\centering\n  \\includegraphics{${localUrl}}\n  \\caption{Attachment}\n\\end{figure}\n`

      const currentContent = modules[index].content ?? ""

      const textarea = document.getElementById(`module-content-${index}`) as HTMLTextAreaElement | null
      let newContent = currentContent + latexFigure

      if (textarea) {
        const start = textarea.selectionStart
        const end = textarea.selectionEnd
        const before = currentContent.substring(0, start)
        const after = currentContent.substring(end)
        newContent = before + latexFigure + after

        // Cache vertical and horizontal scroll positions
        const savedScrollTop = textarea.scrollTop
        const savedScrollLeft = textarea.scrollLeft

        // Restore focus, cursor, and scroll offsets after React state updates content
        const newCursorPos = start + latexFigure.length
        setTimeout(() => {
          textarea.focus({ preventScroll: true })
          textarea.setSelectionRange(newCursorPos, newCursorPos)
          textarea.scrollTop = savedScrollTop
          textarea.scrollLeft = savedScrollLeft
        }, 50)
      }

      updateModuleField(index, "content", newContent)
      toast.success("Image added locally! Submit to save changes to storage.")
    } catch (err: any) {
      toast.error(err.message ?? "Failed to stage module image.")
    } finally {
      e.target.value = ""
    }
  }

  const addModule = () => {
    const newId = `temp-${crypto.randomUUID()}`
    setModules([
      ...modules,
      { id: newId, title: "", description: "", duration: "30", min_duration: 0, type: "text", content: "" },
    ])
    setOpenModuleId(newId)
    setLastAddedId(newId)
  }

  useEffect(() => {
    if (lastAddedId) {
      const element = document.getElementById(`module-item-${lastAddedId}`)
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "center" })
        setLastAddedId(null)
      }
    }
  }, [lastAddedId, modules])

  // Sync state with props when initialCourse or initialModules change (e.g. after a router.refresh())
  useEffect(() => {
    if (initialCourse) {
      setTitle(initialCourse.title ?? "")
      setDescription(initialCourse.description ?? "")
      setLevel(initialCourse.level ?? "Beginner")
      setCoverImagePath(initialCourse.cover_image_path ?? null)
      setIsPublished(initialCourse.is_published ?? false)
    }
  }, [initialCourse])

  useEffect(() => {
    if (initialModules) {
      setModules(initialModules)
    }
  }, [initialModules])

  const removeModule = (index: number) => {
    setModules(modules.filter((_, i) => i !== index))
  }

  const updateModuleField = (index: number, field: keyof AdminModuleInput, value: any) => {
    setModules(modules.map((m, i) => (i === index ? { ...m, [field]: value } : m)))
  }

  const moveModule = (index: number, direction: "up" | "down") => {
    if (direction === "up" && index === 0) return
    if (direction === "down" && index === modules.length - 1) return
    const updated = [...modules]
    const target = direction === "up" ? index - 1 : index + 1
    ;[updated[index], updated[target]] = [updated[target], updated[index]]
    setModules(updated)
  }

  const handleSave = (shouldExit: boolean) => {
    if (!canSave) {
      toast.error("Please fill in all required fields.")
      return
    }
    if (modules.length === 0) {
      toast.error("Please add at least one module.")
      return
    }
    for (let i = 0; i < modules.length; i++) {
      if (!modules[i].title.trim()) {
        toast.error(`Please provide a title for Module ${i + 1}`)
        return
      }
    }

    startTransition(async () => {
      const supabase = createClient()
      let finalCoverPath = coverImagePath

      try {
        // 1. Upload Cover Image if a new one was selected
        if (coverImageFile) {
          const fileExt = coverImageFile.name.split(".").pop()
          const fileName = `${crypto.randomUUID()}.${fileExt}`
          const filePath = `covers/${fileName}`
          
          const { error: uploadError } = await supabase.storage
            .from("course-covers")
            .upload(filePath, coverImageFile)
            
          if (uploadError) throw uploadError
          finalCoverPath = filePath
          
          // Delete old cover image if it existed
          if (initialCourse?.cover_image_path) {
            await supabase.storage
              .from("course-covers")
              .remove([initialCourse.cover_image_path])
          }
        } else if (!coverImagePath && initialCourse?.cover_image_path) {
          // Cover was removed
          await supabase.storage
            .from("course-covers")
            .remove([initialCourse.cover_image_path])
        }

        // 2. Upload pending module attachments that are actually referenced
        const updatedModules = [...modules]
        for (let idx = 0; idx < updatedModules.length; idx++) {
          let content = updatedModules[idx].content ?? ""
          
          const localUrlsUsed = Object.keys(pendingUploads).filter((localUrl) =>
            content.includes(localUrl)
          )
          
          for (const localUrl of localUrlsUsed) {
            const { file, filePath } = pendingUploads[localUrl]
            
            const { error: uploadError } = await supabase.storage
              .from("course-attachments")
              .upload(filePath, file)
              
            if (uploadError) throw uploadError
            
            const finalUrl = buildStorageUrl("course-attachments", filePath) || ""
            content = content.replaceAll(localUrl, finalUrl)
          }
          
          updatedModules[idx].content = content
        }

        // 3. Storage Cleanup for deleted module attachments (in edit mode)
        const originalPaths = initialModules.flatMap((mod) => extractAttachmentPaths(mod.content ?? ""))
        const finalPaths = updatedModules.flatMap((mod) => extractAttachmentPaths(mod.content ?? ""))
        const deletedPaths = originalPaths.filter((path) => !finalPaths.includes(path))
        
        if (deletedPaths.length > 0) {
          const { error: deleteError } = await supabase.storage
            .from("course-attachments")
            .remove(deletedPaths)
          if (deleteError) {
            console.error("Failed to delete unused attachments:", deleteError)
          }
        }

        const courseData: AdminCourseInput = {
          title,
          description,
          level,
          duration,
          cover_image_path: finalCoverPath,
          instructor_id: initialCourse?.instructor_id || adminProfile?.id || null,
          is_published: isPublished,
        }

        if (initialCourse?.id) {
          const result = await updateCourseAction(initialCourse.id, courseData, updatedModules)
          if (result.success) {
            toast.success("Course updated successfully!")
            if (shouldExit) {
              router.push("/courses")
            } else {
              if (result.modules) {
                setModules(result.modules)
              }
              router.refresh()
            }
          }
        } else {
          const result = await createCourseAction(courseData, updatedModules)
          if (result.success) {
            toast.success("Course created successfully!")
            if (shouldExit) {
              router.push("/courses")
            } else {
              router.replace(`/courses/${result.courseId}/edit`)
            }
          }
        }
      } catch (err: any) {
        toast.error(err.message ?? "An error occurred while saving the course.")
      }
    })
  }

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault()
        if (isPending) return
        handleSave(false)
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => {
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [handleSave, isPending])

  const coverUrl = coverPreviewUrl || (coverImagePath ? buildStorageUrl("course-covers", coverImagePath) : null)

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <form onSubmit={(e) => { e.preventDefault(); handleSave(false); }} className="min-h-screen w-full">
      <div className="mx-auto space-y-6 px-4 py-6 md:px-8 md:py-8">

        {/* ── Page Header ── */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-0.5">
            <h1 className="text-2xl font-bold font-cirka tracking-tight text-foreground">
              {isEditMode ? "Edit Course" : "Create Course"}
            </h1>
            <p className="text-sm text-muted-foreground">
              {isEditMode
                ? "Modify course properties and re-sync syllabus modules."
                : "Fill in the details, add modules, then publish."}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => router.push("/courses")}
              disabled={isPending}
              className="rounded-full"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={isPending || !canSave}
              onClick={() => handleSave(false)}
              className="rounded-full gap-1.5"
            >
              {isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Save className="size-4" />
              )}
              Save Changes
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={isPending || !canSave}
              onClick={() => handleSave(true)}
              className="rounded-full gap-1.5 shadow-md shadow-primary/10"
            >
              {isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Save className="size-4" />
              )}
              Save & Exit
            </Button>
          </div>
        </div>

        {/* ── Two-column layout ── */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">

          {/* ── Left / Main ── */}
          <div className="flex flex-col gap-6 lg:col-span-2">

            {/* Course Details Card */}
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-base">
                  <BookOpen className="size-4 text-primary" />
                  Course Details
                </CardTitle>
                <CardDescription>Core metadata shown on the course listing.</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="course-title">
                    Title <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="course-title"
                    placeholder="e.g. Master React in 30 Days"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    maxLength={150}
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="course-description">
                    Description <span className="text-destructive">*</span>
                  </Label>
                  <Textarea
                    id="course-description"
                    placeholder="Summarize what users will learn from this course…"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="min-h-[5rem] resize-none"
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="course-level">Level</Label>
                    <Select value={level} onValueChange={setLevel}>
                      <SelectTrigger id="course-level">
                        <SelectValue placeholder="Select level" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Beginner">Beginner</SelectItem>
                        <SelectItem value="Intermediate">Intermediate</SelectItem>
                        <SelectItem value="Advanced">Advanced</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="course-duration">
                      Duration (in mins) <span className="text-muted-foreground text-[10px]">(Auto-calculated)</span>
                    </Label>
                    <Input
                      id="course-duration"
                      type="number"
                      placeholder="0"
                      value={duration}
                      disabled
                      className="bg-muted cursor-not-allowed font-medium"
                    />
                  </div>
                </div>



              </CardContent>
            </Card>

            {/* Publication Settings Card */}
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-base">Publication</CardTitle>
                <CardDescription>Control visibility of this course to candidates.</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-5">
                <div className="flex items-center justify-between gap-4">
                  <div className="space-y-0.5">
                    <Label htmlFor="is-published" className="text-sm font-medium">Publish Course</Label>
                    <p className="text-xs text-muted-foreground">
                      Make this course visible on the candidate Course Board.
                    </p>
                  </div>
                  <Switch
                    id="is-published"
                    checked={isPublished}
                    onCheckedChange={setIsPublished}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Syllabus Modules Card */}
            <Card>
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="space-y-0.5">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <FileText className="size-4 text-primary" />
                      Course Modules
                      <Badge variant="secondary" className="text-xs font-normal">
                        {modules.length}
                      </Badge>
                    </CardTitle>
                    <CardDescription>Add and arrange the syllabus modules for this course.</CardDescription>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addModule}
                  >
                    <Plus className="mr-2 size-4" />
                    Add Module
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {modules.length === 0 ? (
                  <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border py-12 text-center">
                    <AlertCircle className="size-7 text-muted-foreground/40" />
                    <div className="space-y-0.5">
                      <p className="text-sm font-medium">No modules added yet</p>
                      <p className="text-xs text-muted-foreground">
                        Every course requires at least one module to be published.
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={addModule}
                      className="mt-1"
                    >
                      Add First Module
                    </Button>
                  </div>
                ) : (
                  <Accordion
                    type="single"
                    collapsible
                    value={openModuleId}
                    onValueChange={setOpenModuleId}
                    className="flex flex-col gap-4"
                  >
                    {modules.map((mod, index) => {
                      const isPreviewActive = activePreviewModuleId === (mod.id ?? String(index))
                      const moduleId = mod.id ?? String(index)
                      return (
                        <AccordionItem
                          key={moduleId}
                          value={moduleId}
                          id={`module-item-${moduleId}`}
                          className="border border-border/50 rounded-xl bg-card shadow-sm px-6"
                        >
                          <div className="flex items-center justify-between w-full">
                            <AccordionTrigger className="flex-1 py-4 hover:no-underline text-sm font-semibold">
                              <div className="flex items-center gap-2">
                                <span className="flex size-5 items-center justify-center rounded-full bg-muted text-[10px] font-bold text-muted-foreground">
                                  {index + 1}
                                </span>
                                <span>
                                  {mod.title || `Module ${index + 1}`}
                                </span>
                              </div>
                            </AccordionTrigger>
                            <div className="flex items-center gap-1 shrink-0 pl-4" onClick={(e) => e.stopPropagation()}>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground"
                                disabled={index === 0}
                                onClick={(e) => {
                                  e.stopPropagation()
                                  moveModule(index, "up")
                                }}
                              >
                                <ArrowUp className="h-4 w-4" />
                                <span className="sr-only">Move Up</span>
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground"
                                disabled={index === modules.length - 1}
                                onClick={(e) => {
                                  e.stopPropagation()
                                  moveModule(index, "down")
                                }}
                              >
                                <ArrowDown className="h-4 w-4" />
                                <span className="sr-only">Move Down</span>
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  removeModule(index)
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                                <span className="sr-only">Delete</span>
                              </Button>
                            </div>
                          </div>

                          <AccordionContent className="flex flex-col gap-4 pt-2 pb-6">
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                              <div className="flex flex-col gap-1.5 md:col-span-2">
                                <Label htmlFor={`module-title-${index}`}>
                                  Module Title <span className="text-destructive">*</span>
                                </Label>
                                <Input
                                  id={`module-title-${index}`}
                                  value={mod.title}
                                  placeholder="e.g. Introduction to Big-O"
                                  onChange={(e) => updateModuleField(index, "title", e.target.value)}
                                />
                              </div>
                              <div className="flex flex-col gap-1.5">
                                <Label htmlFor={`module-duration-${index}`}>Estimated Duration (in mins)</Label>
                                <Input
                                  id={`module-duration-${index}`}
                                  type="number"
                                  min="1"
                                  placeholder="e.g. 45"
                                  value={mod.duration ? String(parseDurationToMinutes(mod.duration)) : ""}
                                  onChange={(e) => updateModuleField(index, "duration", e.target.value)}
                                />
                              </div>
                              <div className="flex flex-col gap-1.5">
                                <Label htmlFor={`module-min-duration-${index}`}>Lock Time (in mins)</Label>
                                <Input
                                  id={`module-min-duration-${index}`}
                                  type="number"
                                  min="0"
                                  placeholder="e.g. 5"
                                  value={mod.min_duration !== undefined && mod.min_duration !== null ? String(mod.min_duration) : ""}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    updateModuleField(index, "min_duration", val === "" ? null : parseInt(val, 10));
                                  }}
                                />
                              </div>
                            </div>

                            <div className="flex flex-col gap-1.5">
                              <Label htmlFor={`module-description-${index}`}>Module Description</Label>
                              <Input
                                id={`module-description-${index}`}
                                value={mod.description ?? ""}
                                placeholder="Brief summary of module objectives…"
                                onChange={(e) => updateModuleField(index, "description", e.target.value)}
                              />
                            </div>

                            <div className="flex flex-col gap-1.5">
                              <div className="flex items-center justify-between">
                                <Label htmlFor={`module-content-${index}`}>
                                  Reading Material <span className="text-destructive">*</span>
                                  <span className="ml-1.5 text-xs font-normal text-muted-foreground">(LaTeX / Text)</span>
                                </Label>
                                <div className="flex items-center gap-1.5">
                                  <input
                                    type="file"
                                    accept="image/*"
                                    id={`module-image-upload-${index}`}
                                    className="hidden"
                                    onChange={(e) => handleModuleImageUpload(index, e)}
                                    disabled={isUploadingImageMap[index]}
                                  />
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 gap-1 px-2 text-xs font-semibold text-primary hover:bg-primary/10"
                                    onClick={() => document.getElementById(`module-image-upload-${index}`)?.click()}
                                    disabled={isUploadingImageMap[index]}
                                  >
                                    {isUploadingImageMap[index] ? (
                                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                    ) : (
                                      <Upload className="h-3.5 w-3.5" />
                                    )}
                                    {isUploadingImageMap[index] ? "Uploading…" : "Add Image"}
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 gap-1 px-2.5 text-xs font-semibold text-primary hover:bg-primary/10"
                                    onClick={() =>
                                      setActivePreviewModuleId(
                                        isPreviewActive ? null : (mod.id ?? String(index))
                                      )
                                    }
                                  >
                                    <Eye className="h-3.5 w-3.5" />
                                    {isPreviewActive ? "Hide Preview" : "Live Preview"}
                                  </Button>
                                </div>
                              </div>
                              {isPreviewActive ? (
                                <div className="max-h-[300px] overflow-y-auto rounded-lg border border-border/40 bg-background/50 p-4 leading-relaxed">
                                  <LatexRenderer content={mod.content ?? ""} />
                                </div>
                              ) : (
                                <Textarea
                                  id={`module-content-${index}`}
                                  value={mod.content ?? ""}
                                  placeholder={`\\section{Introduction to Big-O}\n\nUse standard LaTeX math and formatting:\n- \\subsection{Complexity}\n- \\textbf{Bold text} and \\textit{italic text}\n- \\begin{itemize}\n  \\item First item\n\\end{itemize}\n\nBlock math:\n\\begin{equation}\nE = mc^2\n\\end{equation}\n\nInline math: $x \\ge y$.`}
                                  onChange={(e) => updateModuleField(index, "content", e.target.value)}
                                  className="min-h-[140px] resize-y font-mono text-sm"
                                />
                              )}
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      )
                    })}
                  </Accordion>
                )}
              </CardContent>
            </Card>
          </div>

          {/* ── Right / Sidebar ── */}
          <div className="flex flex-col gap-6">

            {/* Cover Image Card */}
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-base">Cover Image</CardTitle>
                <CardDescription>Landscape (16:9) images work best.</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                {coverUrl ? (
                  <div className="flex flex-col gap-3">
                    <div className="relative aspect-video w-full overflow-hidden rounded-lg border bg-muted">
                      <img
                        src={coverUrl}
                        alt="Course cover preview"
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="max-w-[150px] truncate text-[10px] text-muted-foreground">
                        {coverImagePath?.split("/").pop()}
                      </span>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setCoverImageFile(null)
                          setCoverPreviewUrl(null)
                          setCoverImagePath(null)
                        }}
                        className="h-7 text-xs text-destructive hover:bg-destructive/10"
                      >
                        <X className="mr-1 size-3" />
                        Remove
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="group relative flex aspect-video w-full cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-border bg-muted/20 p-4 text-center transition-all duration-200 hover:bg-muted/40 hover:border-primary/40">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                      disabled={isUploading}
                    />
                    {isUploading ? (
                      <div className="flex flex-col items-center gap-2">
                        <Loader2 className="size-6 animate-spin text-primary" />
                        <p className="text-[10px] font-semibold text-muted-foreground">Uploading…</p>
                      </div>
                    ) : (
                      <>
                        <div className="flex size-10 items-center justify-center rounded-full border border-border/60 bg-muted text-muted-foreground group-hover:border-primary/30 group-hover:bg-primary/5 group-hover:text-primary transition-colors duration-200">
                          <Upload className="size-4" />
                        </div>
                        <div>
                          <p className="text-xs font-semibold">Upload cover photo</p>
                          <p className="text-[9px] text-muted-foreground mt-0.5">PNG, JPG · Landscape 16:9 · up to 5 MB</p>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Admin Guidelines Card */}
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-base">Admin Guidelines</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-3 text-xs leading-relaxed text-muted-foreground">
                <Separator />

                <div className="flex items-start gap-2">
                  <span className="mt-1.5 flex size-1.5 shrink-0 rounded-full bg-primary" />
                  <p>Ensure cover photos are landscape (16:9) for best display in candidate grids.</p>
                </div>
                <div className="flex items-start gap-2">
                  <span className="mt-1.5 flex size-1.5 shrink-0 rounded-full bg-primary" />
                  <p>
                    Use <code className="rounded bg-muted px-1 py-0.5 font-mono">### Title</code> or{" "}
                    <code className="rounded bg-muted px-1 py-0.5 font-mono">&gt; Quote</code> in reading
                    materials for structured, readable content.
                  </p>
                </div>
              </CardContent>
            </Card>

          </div>
        </div>

        {/* ── Bottom Buttons ── */}
        <div className="flex items-center justify-end gap-2 border-t pt-6">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => router.push("/courses")}
            disabled={isPending}
            className="rounded-full"
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={isPending || !canSave}
            onClick={() => handleSave(false)}
            className="rounded-full gap-1.5"
          >
            {isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Save className="size-4" />
            )}
            Save Changes
          </Button>
        </div>
      </div>
    </form>
  )
}
