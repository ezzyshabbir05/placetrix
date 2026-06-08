"use client"

import { useState, useTransition } from "react"
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
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { createCourseAction, updateCourseAction, AdminCourseInput, AdminModuleInput } from "../../actions"
import { LatexRenderer } from "@/components/ui/latex-renderer"

interface Props {
  initialCourse?: {
    id: string
    title: string
    description: string
    category: string
    level: string
    duration: string
    type: string
    badge?: string | null
    cover_image_path?: string | null
    instructor_name: string
    is_published: boolean
  }
  initialModules?: AdminModuleInput[]
}

// ── LaTeX Preview ──────────────────────────────────────────────────────────────

// ── Main Component ──────────────────────────────────────────────────────────────

export function CreateCourseClient({ initialCourse, initialModules = [] }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const isEditMode = !!initialCourse

  // ── Course form state ────────────────────────────────────────────────────────
  const [title, setTitle] = useState(initialCourse?.title ?? "")
  const [description, setDescription] = useState(initialCourse?.description ?? "")
  const [category, setCategory] = useState(initialCourse?.category ?? "Core CS")
  const [level, setLevel] = useState(initialCourse?.level ?? "Beginner")
  const [duration, setDuration] = useState(initialCourse?.duration ?? "")
  const [courseType, setCourseType] = useState(initialCourse?.type ?? "Course")
  const [badge, setBadge] = useState(initialCourse?.badge ?? "")
  const [instructorName, setInstructorName] = useState(initialCourse?.instructor_name ?? "")
  const [coverImagePath, setCoverImagePath] = useState<string | null>(
    initialCourse?.cover_image_path ?? null
  )
  const [isPublished, setIsPublished] = useState(initialCourse?.is_published ?? false)

  // ── Modules state ────────────────────────────────────────────────────────────
  const [modules, setModules] = useState<AdminModuleInput[]>(initialModules)

  // ── UI state ─────────────────────────────────────────────────────────────────
  const [isUploading, setIsUploading] = useState(false)
  const [activePreviewModuleId, setActivePreviewModuleId] = useState<string | null>(null)
  const [isUploadingImageMap, setIsUploadingImageMap] = useState<Record<number, boolean>>({})

  // ── Validation ───────────────────────────────────────────────────────────────
  const canSave =
    title.trim().length > 0 &&
    description.trim().length > 0 &&
    instructorName.trim().length > 0 &&
    duration.trim().length > 0

  // ── Handlers ─────────────────────────────────────────────────────────────────

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file.")
      return
    }
    setIsUploading(true)
    const supabase = createClient()
    try {
      const fileExt = file.name.split(".").pop()
      const fileName = `${crypto.randomUUID()}.${fileExt}`
      const filePath = `covers/${fileName}`
      const { error: uploadError } = await supabase.storage
        .from("course-covers")
        .upload(filePath, file)
      if (uploadError) throw uploadError
      setCoverImagePath(filePath)
      toast.success("Cover image uploaded successfully!")
    } catch (err: any) {
      toast.error(err.message ?? "Failed to upload cover image.")
    } finally {
      setIsUploading(false)
    }
  }

  const handleModuleImageUpload = async (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file.")
      return
    }

    setIsUploadingImageMap((prev) => ({ ...prev, [index]: true }))
    const supabase = createClient()
    try {
      const fileExt = file.name.split(".").pop()
      const fileName = `${crypto.randomUUID()}.${fileExt}`
      const filePath = `modules/${fileName}`
      const { error: uploadError } = await supabase.storage
        .from("course-attachments")
        .upload(filePath, file)
      if (uploadError) throw uploadError

      const imageUrl = buildStorageUrl("course-attachments", filePath)
      const markdownImage = `\n\n![Image](${imageUrl})\n`

      // Append the markdown image to the module's content
      const currentContent = modules[index].content ?? ""
      updateModuleField(index, "content", currentContent + markdownImage)
      toast.success("Image uploaded and added to markdown content successfully!")
    } catch (err: any) {
      toast.error(err.message ?? "Failed to upload module image.")
    } finally {
      setIsUploadingImageMap((prev) => ({ ...prev, [index]: false }))
      e.target.value = ""
    }
  }

  const addModule = () => {
    setModules([
      ...modules,
      { id: `temp-${crypto.randomUUID()}`, title: "", description: "", duration: "30 min", type: "text", content: "" },
    ])
  }

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

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
      const courseData: AdminCourseInput = {
        title,
        description,
        category,
        level,
        duration,
        type: courseType,
        badge: badge || undefined,
        cover_image_path: coverImagePath,
        instructor_name: instructorName,
        is_published: isPublished,
      }
      try {
        if (initialCourse?.id) {
          const result = await updateCourseAction(initialCourse.id, courseData, modules)
          if (result.success) {
            toast.success("Course updated successfully!")
            router.push("/~/courses")
          }
        } else {
          const result = await createCourseAction(courseData, modules)
          if (result.success) {
            toast.success("Course created successfully!")
            router.push("/~/courses")
          }
        }
      } catch (err: any) {
        toast.error(err.message ?? "An error occurred while saving the course.")
      }
    })
  }

  const coverUrl = coverImagePath ? buildStorageUrl("course-covers", coverImagePath) : null

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <form onSubmit={handleSubmit} className="min-h-screen w-full">
      <div className="mx-auto space-y-6 px-4 py-6 md:px-6 md:py-8">

        {/* ── Page Header ── */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-0.5">
            <h1 className="text-xl font-semibold tracking-tight">
              {isEditMode ? "Edit Course" : "Create Course"}
            </h1>
            <p className="text-sm text-muted-foreground">
              {isEditMode
                ? "Modify course properties and re-sync syllabus modules."
                : "Fill in the details, add modules, then publish."}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => router.push("/~/courses")}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isPending || !canSave}
            >
              {isPending ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : (
                <Save className="mr-2 size-4" />
              )}
              {isEditMode ? "Save Changes" : "Create Course"}
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

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
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
                    <Label htmlFor="instructor-name">
                      Instructor Name <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="instructor-name"
                      placeholder="e.g. John Doe"
                      value={instructorName}
                      onChange={(e) => setInstructorName(e.target.value)}
                    />
                  </div>
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

                <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="course-category">Category</Label>
                    <Select value={category} onValueChange={setCategory}>
                      <SelectTrigger id="course-category">
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Core CS">Core CS</SelectItem>
                        <SelectItem value="Web Development">Web Development</SelectItem>
                        <SelectItem value="Interview Prep">Interview Prep</SelectItem>
                        <SelectItem value="System Design">System Design</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

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
                      Duration <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="course-duration"
                      placeholder="e.g. 14h 30m"
                      value={duration}
                      onChange={(e) => setDuration(e.target.value)}
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="course-type">Type</Label>
                    <Select value={courseType} onValueChange={setCourseType}>
                      <SelectTrigger id="course-type">
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Course">Course</SelectItem>
                        <SelectItem value="Specialization">Specialization</SelectItem>
                        <SelectItem value="Professional Certificate">Professional Certificate</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="course-badge">Promo Badge <span className="text-xs font-normal text-muted-foreground">(optional)</span></Label>
                  <Input
                    id="course-badge"
                    placeholder="e.g. Bestseller, New, Popular"
                    value={badge}
                    onChange={(e) => setBadge(e.target.value)}
                    className="max-w-xs"
                  />
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
                  <div className="flex flex-col gap-4">
                    {modules.map((mod, index) => {
                      const isPreviewActive = activePreviewModuleId === (mod.id ?? String(index))
                      return (
                        <Card key={mod.id ?? index} className="border-border/50">
                          {/* Module header */}
                          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                            <div className="flex items-center gap-2">
                              <span className="flex size-5 items-center justify-center rounded-full bg-muted text-[10px] font-bold text-muted-foreground">
                                {index + 1}
                              </span>
                              <CardTitle className="text-sm font-semibold">
                                {mod.title || `Module ${index + 1}`}
                              </CardTitle>
                            </div>
                            <div className="flex items-center gap-1">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground"
                                disabled={index === 0}
                                onClick={() => moveModule(index, "up")}
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
                                onClick={() => moveModule(index, "down")}
                              >
                                <ArrowDown className="h-4 w-4" />
                                <span className="sr-only">Move Down</span>
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                                onClick={() => removeModule(index)}
                              >
                                <Trash2 className="h-4 w-4" />
                                <span className="sr-only">Delete</span>
                              </Button>
                            </div>
                          </CardHeader>

                          {/* Module fields */}
                          <CardContent className="space-y-4">
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
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
                                <Label htmlFor={`module-duration-${index}`}>Estimated Duration</Label>
                                <Input
                                  id={`module-duration-${index}`}
                                  value={mod.duration ?? ""}
                                  placeholder="e.g. 45 min"
                                  onChange={(e) => updateModuleField(index, "duration", e.target.value)}
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
                          </CardContent>
                        </Card>
                      )
                    })}
                  </div>
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
                        onClick={() => setCoverImagePath(null)}
                        className="h-7 text-xs text-destructive hover:bg-destructive/10"
                      >
                        <X className="mr-1 size-3" />
                        Remove
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="relative flex aspect-video w-full cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border bg-muted/30 p-4 text-center transition-colors hover:bg-muted/50">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                      disabled={isUploading}
                    />
                    {isUploading ? (
                      <div className="flex flex-col items-center gap-1">
                        <Loader2 className="size-6 animate-spin text-primary" />
                        <p className="text-[10px] font-semibold text-muted-foreground">Uploading…</p>
                      </div>
                    ) : (
                      <>
                        <div className="flex size-8 items-center justify-center rounded-full border bg-muted text-muted-foreground">
                          <Upload className="size-4" />
                        </div>
                        <div>
                          <p className="text-xs font-semibold">Upload cover photo</p>
                          <p className="text-[9px] text-muted-foreground">PNG, JPG up to 5 MB</p>
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
                <div className="flex items-start gap-2 pt-1">
                  <span className="mt-1.5 flex size-1.5 shrink-0 rounded-full bg-primary" />
                  <p>
                    Course badges support highlights like{" "}
                    <Badge variant="secondary" className="px-1.5 py-0 text-[9px]">Bestseller</Badge>{" "}
                    or{" "}
                    <Badge variant="secondary" className="px-1.5 py-0 text-[9px]">Popular</Badge>.
                  </p>
                </div>
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
      </div>
    </form>
  )
}
