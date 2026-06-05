"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { buildStorageUrl } from "@/lib/storage"
import {
  BookOpen, Plus, Trash2, ArrowUp, ArrowDown, Upload, Save, AlertCircle, Eye, FileText
} from "lucide-react"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { createCourseAction, updateCourseAction, AdminCourseInput, AdminModuleInput } from "./actions"

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

// Simple Parser for module content preview
function SimpleMarkdownPreview({ content }: { content: string }) {
  if (!content) return <p className="text-muted-foreground/60 italic text-xs">No content written yet.</p>

  const lines = content.split("\n")
  return (
    <div className="space-y-2 text-xs font-sans text-foreground/80 bg-background/50 border border-border/40 p-4 rounded-lg leading-relaxed max-h-[300px] overflow-y-auto">
      {lines.map((line, idx) => {
        const trimmed = line.trim()
        if (!trimmed) return <div key={idx} className="h-2" />

        if (trimmed.startsWith("### ")) {
          return <h4 key={idx} className="text-xs font-bold text-foreground uppercase tracking-wider mt-3 mb-1">{trimmed.slice(4)}</h4>
        }
        if (trimmed.startsWith("## ")) {
          return <h3 key={idx} className="text-sm font-semibold text-foreground uppercase tracking-wider mt-4 mb-1 border-b pb-0.5">{trimmed.slice(3)}</h3>
        }
        if (trimmed.startsWith("# ")) {
          return <h2 key={idx} className="text-base font-bold text-foreground uppercase tracking-wider mt-4 mb-2 border-b pb-0.5">{trimmed.slice(2)}</h2>
        }
        if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
          return (
            <ul key={idx} className="list-disc pl-4 space-y-0.5 text-muted-foreground">
              <li>{trimmed.slice(2)}</li>
            </ul>
          )
        }
        if (trimmed.startsWith("> ")) {
          return (
            <blockquote key={idx} className="border-l-2 border-primary bg-muted/40 px-2.5 py-1 text-muted-foreground italic my-1 rounded-r">
              {trimmed.slice(2)}
            </blockquote>
          )
        }
        return <p key={idx} className="text-foreground/80 leading-relaxed">{line}</p>
      })}
    </div>
  )
}

export function AdminCourseForm({ initialCourse, initialModules = [] }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  // Course Form State
  const [title, setTitle] = useState(initialCourse?.title || "")
  const [description, setDescription] = useState(initialCourse?.description || "")
  const [category, setCategory] = useState(initialCourse?.category || "Core CS")
  const [level, setLevel] = useState(initialCourse?.level || "Beginner")
  const [duration, setDuration] = useState(initialCourse?.duration || "")
  const [courseType, setCourseType] = useState(initialCourse?.type || "Course")
  const [badge, setBadge] = useState(initialCourse?.badge || "")
  const [instructorName, setInstructorName] = useState(initialCourse?.instructor_name || "")
  const [coverImagePath, setCoverImagePath] = useState<string | null>(initialCourse?.cover_image_path || null)
  const [isPublished, setIsPublished] = useState(initialCourse?.is_published ?? false)

  // Modules List State
  const [modules, setModules] = useState<AdminModuleInput[]>(initialModules)

  // UI state for image uploading
  const [isUploading, setIsUploading] = useState(false)
  const [activePreviewModuleId, setActivePreviewModuleId] = useState<string | null>(null)

  // Handle Cover image file selection and upload to Supabase Storage
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Simple validation
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
      console.error("Upload error:", err)
      toast.error(err.message || "Failed to upload cover image.")
    } finally {
      setIsUploading(false)
    }
  }

  // Dynamic Module list functions
  const addModule = () => {
    const tempId = `temp-${crypto.randomUUID()}`
    setModules([
      ...modules,
      {
        id: tempId,
        title: "",
        description: "",
        duration: "30 min",
        type: "text",
        content: ""
      }
    ])
  }

  const removeModule = (index: number) => {
    const updated = [...modules]
    updated.splice(index, 1)
    setModules(updated)
  }

  const updateModuleField = (index: number, field: keyof AdminModuleInput, value: any) => {
    const updated = [...modules]
    updated[index] = { ...updated[index], [field]: value }
    setModules(updated)
  }

  const moveModule = (index: number, direction: "up" | "down") => {
    if (direction === "up" && index === 0) return
    if (direction === "down" && index === modules.length - 1) return

    const targetIndex = direction === "up" ? index - 1 : index + 1
    const updated = [...modules]
    const temp = updated[index]
    updated[index] = updated[targetIndex]
    updated[targetIndex] = temp
    setModules(updated)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!title.trim() || !description.trim() || !instructorName.trim() || !duration.trim()) {
      toast.error("Please fill in all required fields.")
      return
    }

    if (modules.length === 0) {
      toast.error("Please add at least one module.")
      return
    }

    // Check module titles
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
        is_published: isPublished
      }

      try {
        if (initialCourse?.id) {
          // Edit mode
          const result = await updateCourseAction(initialCourse.id, courseData, modules)
          if (result.success) {
            toast.success("Course updated successfully!")
            router.push("/~/courses")
          }
        } else {
          // Create mode
          const result = await createCourseAction(courseData, modules)
          if (result.success) {
            toast.success("Course created successfully!")
            router.push("/~/courses")
          }
        }
      } catch (err: any) {
        console.error("Submit error:", err)
        toast.error(err.message || "An error occurred while saving the course.")
      }
    })
  }

  const coverUrl = coverImagePath ? buildStorageUrl("course-covers", coverImagePath) : null

  return (
    <form onSubmit={handleSubmit} className="space-y-8 max-w-5xl mx-auto pb-12 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-cirka tracking-tight text-foreground">
            {initialCourse ? "Edit Course" : "Create New Course"}
          </h1>
          <p className="text-xs text-muted-foreground">
            {initialCourse ? "Modify course properties and re-sync syllabus modules." : "Add a database-driven learning track."}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => router.push("/~/courses")}
            className="rounded-full"
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            size="sm"
            className="rounded-full gap-1.5 shadow-md shadow-primary/10"
            disabled={isPending}
          >
            {isPending ? (
              <div className="h-3.5 w-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
            ) : (
              <Save className="h-3.5 w-3.5" />
            )}
            {initialCourse ? "Save Changes" : "Create Course"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Course Info Form (Left/Middle) */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="border border-border/50 dark:border-zinc-800/80 bg-card shadow-xs">
            <CardHeader className="pb-4 border-b border-border/40 bg-muted/15">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-primary" />
                Course Details
              </CardTitle>
              <CardDescription className="text-[11px]">Core metadata for your course listing</CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-muted-foreground uppercase">Course Title *</label>
                  <Input
                    placeholder="e.g. Master React in 30 Days"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                    maxLength={150}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-muted-foreground uppercase">Instructor Name *</label>
                  <Input
                    placeholder="e.g. John Doe"
                    value={instructorName}
                    onChange={(e) => setInstructorName(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-muted-foreground uppercase">Description *</label>
                <Textarea
                  placeholder="Summarize what users will learn from this course..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="min-h-[100px] resize-y"
                  required
                />
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-muted-foreground uppercase">Category *</label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger>
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

                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-muted-foreground uppercase">Level *</label>
                  <Select value={level} onValueChange={setLevel}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select level" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Beginner">Beginner</SelectItem>
                      <SelectItem value="Intermediate">Intermediate</SelectItem>
                      <SelectItem value="Advanced">Advanced</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-muted-foreground uppercase">Duration *</label>
                  <Input
                    placeholder="e.g. 14h 30m"
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-muted-foreground uppercase">Course Type *</label>
                  <Select value={courseType} onValueChange={setCourseType}>
                    <SelectTrigger>
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-muted-foreground uppercase">Promo Badge (Optional)</label>
                  <Input
                    placeholder="e.g. Bestseller, New, Popular"
                    value={badge}
                    onChange={(e) => setBadge(e.target.value)}
                  />
                </div>

                <div className="flex items-center justify-between border border-border/40 p-3 rounded-lg bg-muted/20">
                  <div className="space-y-0.5">
                    <label className="text-[11px] font-semibold text-muted-foreground uppercase block">Publish Course</label>
                    <span className="text-[10px] text-muted-foreground">Make visible on candidate Course Board</span>
                  </div>
                  <Switch
                    checked={isPublished}
                    onCheckedChange={setIsPublished}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Syllabus Modules */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b pb-2">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <FileText className="h-4 w-4" />
                Course Modules ({modules.length})
              </h3>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addModule}
                className="h-8 gap-1 rounded-full text-xs font-semibold"
              >
                <Plus className="h-3.5 w-3.5" />
                Add Module
              </Button>
            </div>

            {modules.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center gap-2 border border-dashed border-border rounded-xl bg-muted/15">
                <AlertCircle className="h-7 w-7 text-muted-foreground/50" />
                <div className="space-y-0.5">
                  <p className="text-xs font-medium">No syllabus modules added yet</p>
                  <p className="text-[10px] text-muted-foreground">Every course requires at least one topic module to be published.</p>
                </div>
                <Button type="button" size="sm" variant="secondary" onClick={addModule} className="h-7 text-xs rounded-full mt-2">
                  Add First Module
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {modules.map((mod, index) => {
                  const isPreviewActive = activePreviewModuleId === mod.id

                  return (
                    <Card key={mod.id || index} className="border border-border/50 relative overflow-hidden group">
                      <div className="flex items-center justify-between border-b border-border/40 px-4 py-2.5 bg-muted/20">
                        <div className="flex items-center gap-2">
                          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-muted text-[10px] font-bold text-muted-foreground">
                            {index + 1}
                          </span>
                          <span className="text-xs font-bold text-foreground">
                            {mod.title ? mod.title : `Module ${index + 1}`}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground"
                            disabled={index === 0}
                            onClick={() => moveModule(index, "up")}
                          >
                            <ArrowUp className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground"
                            disabled={index === modules.length - 1}
                            onClick={() => moveModule(index, "down")}
                          >
                            <ArrowDown className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive hover:bg-destructive/10"
                            onClick={() => removeModule(index)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>

                      <CardContent className="p-4 space-y-3">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          <div className="md:col-span-2 space-y-1">
                            <label className="text-[10px] font-semibold text-muted-foreground uppercase">Module Title *</label>
                            <Input
                              value={mod.title}
                              placeholder="e.g. Introduction to Big-O"
                              onChange={(e) => updateModuleField(index, "title", e.target.value)}
                              className="h-8 text-xs"
                              required
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-semibold text-muted-foreground uppercase">Estimated Duration</label>
                            <Input
                              value={mod.duration || ""}
                              placeholder="e.g. 45 min"
                              onChange={(e) => updateModuleField(index, "duration", e.target.value)}
                              className="h-8 text-xs"
                            />
                          </div>
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] font-semibold text-muted-foreground uppercase">Module Description</label>
                          <Input
                            value={mod.description || ""}
                            placeholder="Brief summary of module objectives..."
                            onChange={(e) => updateModuleField(index, "description", e.target.value)}
                            className="h-8 text-xs"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <label className="text-[10px] font-semibold text-muted-foreground uppercase">Reading Material Content (Markdown/Text) *</label>
                            <Button
                              type="button"
                              variant="ghost"
                              className="h-6 px-2 text-[10px] font-semibold text-primary hover:bg-primary/10 gap-1"
                              onClick={() => setActivePreviewModuleId(isPreviewActive ? null : mod.id || String(index))}
                            >
                              <Eye className="h-3 w-3" />
                              {isPreviewActive ? "Hide Preview" : "Live Preview"}
                            </Button>
                          </div>
                          {isPreviewActive ? (
                            <SimpleMarkdownPreview content={mod.content || ""} />
                          ) : (
                            <Textarea
                              value={mod.content || ""}
                              placeholder="# Introduction to Big-O&#10;&#10;Use standard markdown tags:&#10;- # Header 1&#10;- ## Header 2&#10;- - Bullet item&#10;- > Quote text"
                              onChange={(e) => updateModuleField(index, "content", e.target.value)}
                              className="min-h-[140px] text-xs font-mono resize-y"
                            />
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar Controls (Right) */}
        <div className="space-y-6">
          {/* Cover Image Uploader */}
          <Card className="border border-border/50 bg-card shadow-xs">
            <CardHeader className="pb-3 border-b border-border/40 bg-muted/15">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Course Cover Image</CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              {coverUrl ? (
                <div className="space-y-3">
                  <div className="aspect-video w-full rounded-lg overflow-hidden border bg-muted relative">
                    <img
                      src={coverUrl}
                      alt="Cover Preview"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-muted-foreground truncate max-w-[150px]">
                      {coverImagePath?.split("/").pop()}
                    </span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setCoverImagePath(null)}
                      className="h-7 text-xs text-destructive border-destructive/20 hover:bg-destructive/10 rounded-full"
                    >
                      Remove
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center aspect-video w-full border border-dashed border-border rounded-lg bg-muted/30 p-4 text-center cursor-pointer hover:bg-muted/50 transition-colors relative">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    disabled={isUploading}
                  />
                  {isUploading ? (
                    <div className="space-y-1">
                      <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
                      <p className="text-[10px] text-muted-foreground font-semibold">Uploading...</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center mx-auto text-muted-foreground border">
                        <Upload className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold">Upload cover photo</p>
                        <p className="text-[9px] text-muted-foreground">PNG, JPG up to 5MB</p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Tips */}
          <Card className="border border-border/50 bg-card shadow-xs">
            <CardHeader className="pb-3 border-b border-border/40 bg-muted/15">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Admin Guidelines</CardTitle>
            </CardHeader>
            <CardContent className="pt-4 text-xs text-muted-foreground space-y-3 leading-relaxed">
              <div className="flex items-start gap-2">
                <span className="flex h-1.5 w-1.5 rounded-full bg-primary shrink-0 mt-1.5" />
                <p>Course badges support highlights like <Badge variant="secondary" className="text-[9px] px-1.5 py-0">Bestseller</Badge> or <Badge variant="secondary" className="text-[9px] px-1.5 py-0">Popular</Badge>.</p>
              </div>
              <div className="flex items-start gap-2">
                <span className="flex h-1.5 w-1.5 rounded-full bg-primary shrink-0 mt-1.5" />
                <p>Ensure cover photos are landscape (16:9 ratio) for ideal representation in candidate grids.</p>
              </div>
              <div className="flex items-start gap-2">
                <span className="flex h-1.5 w-1.5 rounded-full bg-primary shrink-0 mt-1.5" />
                <p>Use structural headers like <code>### Title</code> or blockquotes <code>&gt; Quote</code> inside reading materials to create readable documents for candidates.</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </form>
  )
}
