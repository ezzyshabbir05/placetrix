"use client"

import React, { useState } from "react"
import Editor from "@monaco-editor/react"
import Link from "next/link"
import {
  IconArrowLeft,
  IconPlayerPlay,
  IconUpload,
  IconCircleCheck,
  IconCircleX,
  IconClock,
  IconCpu,
  IconTerminal2,
  IconCheck,
  IconCopy,
  IconAlertTriangle,
  IconInfoCircle,
  IconHistory,
  IconRefresh,
  IconCode,
  IconX,
} from "@tabler/icons-react"
import { toast } from "sonner"
import { createClient } from "@/lib/supabase/client"

// Robust memory usage display formatter
const formatMemory = (memKbOrMb: number | string | undefined | null, isAlreadyMb = false) => {
  if (memKbOrMb === undefined || memKbOrMb === null) return "—"
  const val = typeof memKbOrMb === "string" ? parseFloat(memKbOrMb) : memKbOrMb
  if (isNaN(val) || val <= 0) return "< 0.1 MB"
  
  if (isAlreadyMb) {
    if (val < 0.1) return "< 0.1 MB"
    return `${val.toFixed(1)} MB`
  } else {
    // KB input
    const mb = val / 1024
    if (mb < 0.1) {
      return `${val.toFixed(0)} KB`
    }
    return `${mb.toFixed(1)} MB`
  }
}

// Inline Markdown Parser
function parseInline(text: string) {
  const parts = text.split(/(\*\*.*?\*\*|`.*?`)/g)
  return parts.map((part, idx) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={idx} className="font-bold text-white">{part.slice(2, -2)}</strong>
    }
    if (part.startsWith("`") && part.endsWith("`")) {
      return <code key={idx} className="bg-zinc-900 border border-zinc-800 px-1 py-0.5 rounded text-xs font-mono text-emerald-400">{part.slice(1, -1)}</code>
    }
    return part
  })
}

// Robust Custom Markdown Renderer with Operator Replacements
function MarkdownDescription({ content }: { content: string }) {
  if (!content) return null

  let formatted = content
    .replace(/<=/g, " ≤ ")
    .replace(/>=/g, " ≥ ")
    .replace(/!=/g, " ≠ ")
    .replace(/->/g, " → ")
    .replace(/==/g, " ＝ ")

  const blocks = formatted.split(/(```[\s\S]*?```)/g)

  return (
    <div className="text-zinc-300 leading-relaxed text-sm space-y-4 font-sans">
      {blocks.map((block, idx) => {
        if (block.startsWith("```")) {
          const match = block.match(/```(\w*)\n([\s\S]*?)```/)
          const lang = match ? match[1] : ""
          const codeText = match ? match[2] : block.slice(3, -3)
          return (
            <div key={idx} className="bg-zinc-950 border border-zinc-800 rounded-lg overflow-hidden my-3 font-mono text-xs">
              {lang && (
                <div className="bg-zinc-900/60 px-3 py-1 border-b border-zinc-800 text-[10px] text-zinc-500 uppercase tracking-widest font-bold">
                  {lang}
                </div>
              )}
              <pre className="p-3 overflow-x-auto text-zinc-300 whitespace-pre scrollbar-thin">{codeText.trim()}</pre>
            </div>
          )
        }

        const lines = block.split("\n")
        return (
          <div key={idx} className="space-y-2">
            {lines.map((line, lIdx) => {
              const trimmed = line.trim()
              if (!trimmed) return <div key={lIdx} className="h-1.5" />

              if (trimmed.startsWith("### ")) {
                return <h3 key={lIdx} className="text-sm font-bold text-white uppercase tracking-wider mt-4 mb-2">{parseInline(trimmed.slice(4))}</h3>
              }
              if (trimmed.startsWith("## ")) {
                return <h2 key={lIdx} className="text-base font-bold text-white uppercase tracking-wider mt-5 mb-2 border-b border-zinc-800/80 pb-1">{parseInline(trimmed.slice(3))}</h2>
              }
              if (trimmed.startsWith("# ")) {
                return <h1 key={lIdx} className="text-lg font-bold text-white uppercase tracking-wider mt-6 mb-3 border-b border-zinc-800/80 pb-1">{parseInline(trimmed.slice(2))}</h1>
              }

              if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
                return (
                  <ul key={lIdx} className="list-disc pl-5 space-y-1 text-zinc-400">
                    <li>{parseInline(trimmed.slice(2))}</li>
                  </ul>
                )
              }

              const numMatch = trimmed.match(/^(\d+)\.\s(.*)/)
              if (numMatch) {
                return (
                  <ol key={lIdx} className="list-decimal pl-5 space-y-1 text-zinc-400">
                    <li value={parseInt(numMatch[1])}>{parseInline(numMatch[2])}</li>
                  </ol>
                )
              }

              if (trimmed.startsWith("> ")) {
                return (
                  <blockquote key={lIdx} className="border-l-2 border-emerald-500 bg-zinc-900/40 px-3 py-2 rounded-r text-zinc-400 text-xs italic my-2">
                    {parseInline(trimmed.slice(2))}
                  </blockquote>
                )
              }

              if (trimmed === "---" || trimmed === "***") {
                return <hr key={lIdx} className="border-zinc-800 my-4" />
              }

              return <p key={lIdx} className="text-zinc-300 leading-relaxed">{parseInline(line)}</p>
            })}
          </div>
        )
      })}
    </div>
  )
}


const LANGUAGES = [
  { id: 71, name: "Python 3", value: "python", extension: "py" },
  { id: 63, name: "JavaScript (Node.js)", value: "javascript", extension: "js" },
  { id: 54, name: "C++ (GCC 9.2)", value: "cpp", extension: "cpp" },
  { id: 62, name: "Java (OpenJDK 13)", value: "java", extension: "java" },
]

const DIFFICULTY_COLORS: Record<string, string> = {
  Easy: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  Medium: "text-amber-400 bg-amber-500/10 border-amber-500/20",
  Hard: "text-rose-400 bg-rose-500/10 border-rose-500/20",
}

interface SampleTestCase {
  id: string
  input: string
  expected_output: string
}

interface Submission {
  id: string
  status: string
  language_id: number
  runtime: number | null
  memory: number | null
  passed_count: number
  total_count: number
  created_at: string
}

interface Problem {
  id: string
  title: string
  description: string
  difficulty: string
  tags: string[]
  time_limit: number
  memory_limit: number
  boilerplates: Record<string, string>
  driver_codes: Record<string, string>
}

export function ProblemIDEClient({
  problem,
  sampleTestCases,
  totalTestCases,
  submissions: initialSubmissions,
  userId,
}: {
  problem: Problem
  sampleTestCases: SampleTestCase[]
  totalTestCases: number
  submissions: Submission[]
  userId: string
}) {
  // Safely parse boilerplates if it is returned as a double-serialized string
  let parsedBoilerplates: any = problem.boilerplates || {}
  if (typeof parsedBoilerplates === "string") {
    try {
      parsedBoilerplates = JSON.parse(parsedBoilerplates)
    } catch (e) {
      console.error("Failed to parse problem.boilerplates:", e)
      parsedBoilerplates = {}
    }
  }

  const [selectedLang, setSelectedLang] = useState(LANGUAGES[0])
  const [code, setCode] = useState(
    parsedBoilerplates[String(LANGUAGES[0].id)] || "# Write your solution here\n"
  )
  const [activeTab, setActiveTab] = useState<"description" | "submissions">("description")
  const [activeOutputTab, setActiveOutputTab] = useState<"testcases" | "result">("testcases")
  const [running, setRunning] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [copied, setCopied] = useState(false)
  const [submissions, setSubmissions] = useState(initialSubmissions)
  const [runResult, setRunResult] = useState<any>(null)
  const [submitResult, setSubmitResult] = useState<any>(null)

  // Historical Code Viewer state
  const [viewingSubmission, setViewingSubmission] = useState<Submission | null>(null)
  const [viewingCode, setViewingCode] = useState<string>("")
  const [loadingCode, setLoadingCode] = useState<boolean>(false)

  const handleViewPastSubmission = async (sub: Submission) => {
    setViewingSubmission(sub)
    setLoadingCode(true)
    setViewingCode("")
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from("coding_submissions" as any)
        .select("code, language_id")
        .eq("id", sub.id)
        .single() as any
      if (error || !data) {
        throw new Error(error?.message || "Submission code not found.")
      }
      setViewingCode(data.code)
    } catch (err: any) {
      toast.error(err?.message || "Failed to load submission code.")
      setViewingSubmission(null)
    } finally {
      setLoadingCode(false)
    }
  }

  const handleLangChange = (langVal: string) => {
    const lang = LANGUAGES.find((l) => l.value === langVal)
    if (lang) {
      setSelectedLang(lang)
      setCode(parsedBoilerplates[String(lang.id)] || `// Write your ${lang.name} solution here\n`)
    }
  }

  const handleRunCode = async () => {
    setRunning(true)
    setRunResult(null)
    setActiveOutputTab("result")
    try {
      const res = await fetch("/api/logiclab/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source_code: code,
          language_id: selectedLang.id,
          stdin: sampleTestCases[0]?.input || "",
          problem_id: problem.id,
          mode: "problem",
        }),
      })
      if (!res.ok) throw new Error("Execution failed.")
      const data = await res.json()
      setRunResult({
        ...data,
        expected: sampleTestCases[0]?.expected_output?.trim() || "",
        matched: data.stdout?.trim() === sampleTestCases[0]?.expected_output?.trim(),
      })
      if (data.status?.id === 3) {
        if (data.stdout?.trim() === sampleTestCases[0]?.expected_output?.trim()) {
          toast.success("Sample test passed!")
        } else {
          toast.error("Output mismatch with expected.")
        }
      } else {
        toast.error(`${data.status?.description || "Error"}`)
      }
    } catch (err: any) {
      setRunResult({ success: false, error: err?.message || "Execution failed." })
      toast.error("Execution failed.")
    } finally {
      setRunning(false)
    }
  }

  const handleSubmitCode = async () => {
    setSubmitting(true)
    setSubmitResult(null)
    setActiveOutputTab("result")
    try {
      const res = await fetch("/api/logiclab/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          problem_id: problem.id,
          code,
          language_id: selectedLang.id,
          user_id: userId,
        }),
      })
      if (!res.ok) throw new Error("Submission failed.")
      const data = await res.json()
      setSubmitResult(data)

      if (data.status === "Accepted") {
        toast.success(`Accepted! ${data.passed_count}/${data.total_count} test cases passed.`)
      } else {
        toast.error(`${data.status}: ${data.passed_count}/${data.total_count} passed.`)
      }

      // Add or update local submissions list to match database upsert behavior
      if (data.submission_id) {
        setSubmissions((prev) => {
          const filtered = prev.filter((sub) => sub.language_id !== selectedLang.id)
          return [
            {
              id: data.submission_id,
              status: data.status,
              language_id: selectedLang.id,
              runtime: data.runtime,
              memory: data.memory,
              passed_count: data.passed_count,
              total_count: data.total_count,
              created_at: new Date().toISOString(),
            },
            ...filtered,
          ]
        })
      }
    } catch (err: any) {
      setSubmitResult({ success: false, error: err?.message || "Submission failed." })
      toast.error("Submission failed.")
    } finally {
      setSubmitting(false)
    }
  }

  const handleCopyOutput = () => {
    const text = runResult?.stdout || submitResult?.error || ""
    if (text) {
      navigator.clipboard.writeText(text)
      setCopied(true)
      toast.success("Copied!")
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const langForDisplay = LANGUAGES.find((l) => l.id === selectedLang.id)

  return (
    <div className="flex flex-col h-[calc(100svh-56px)] bg-zinc-950 text-zinc-100 overflow-hidden">
      {/* ── Top Bar ── */}
      <div className="flex items-center justify-between gap-3 bg-zinc-900/60 border-b border-zinc-800 px-4 py-2 shrink-0">
        <div className="flex items-center gap-3">
          <Link
            href="/~/logiclab"
            className="h-8 w-8 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center hover:bg-zinc-700 transition-colors"
          >
            <IconArrowLeft className="h-4 w-4 text-zinc-400" />
          </Link>
          <div>
            <p className="text-sm font-bold tracking-tight text-white truncate max-w-[300px]">
              {problem.title}
            </p>
            <div className="flex items-center gap-2 mt-0.5">
              <span className={`inline-block px-1.5 py-0 rounded text-[9px] font-bold uppercase tracking-wider border ${DIFFICULTY_COLORS[problem.difficulty]}`}>
                {problem.difficulty}
              </span>
              <span className="text-[10px] text-zinc-600">
                {totalTestCases} test cases · {problem.time_limit}s · {problem.memory_limit}MB
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={selectedLang.value}
            onChange={(e) => handleLangChange(e.target.value)}
            className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5 text-xs font-semibold text-zinc-200 focus:outline-none cursor-pointer"
          >
            {LANGUAGES.map((l) => (
              <option key={l.id} value={l.value}>{l.name}</option>
            ))}
          </select>

          <button
            onClick={() => {
              const boilerplate = parsedBoilerplates[String(selectedLang.id)] || `// Write your ${selectedLang.name} solution here\n`
              setCode(boilerplate)
              toast.success("Code reset to boilerplate")
            }}
            disabled={running || submitting}
            title="Reset code to boilerplate"
            className="flex items-center justify-center bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 text-zinc-400 hover:text-rose-400 h-8 w-8 rounded-lg border border-zinc-700 transition-all cursor-pointer"
          >
            <IconRefresh className="h-4 w-4" />
          </button>

          <button
            onClick={handleRunCode}
            disabled={running || submitting}
            className="flex items-center gap-1.5 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 text-zinc-300 hover:text-white px-3 py-1.5 rounded-lg text-xs font-semibold border border-zinc-700 transition-all cursor-pointer"
          >
            {running ? (
              <><div className="h-3 w-3 border border-current border-t-transparent rounded-full animate-spin" /> Running...</>
            ) : (
              <><IconPlayerPlay className="h-3.5 w-3.5" /> Run</>
            )}
          </button>

          <button
            onClick={handleSubmitCode}
            disabled={running || submitting}
            className="flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-400 disabled:bg-zinc-800 disabled:text-zinc-600 text-black px-4 py-1.5 rounded-lg text-xs font-bold shadow-[0_0_12px_rgba(16,185,129,0.25)] hover:shadow-[0_0_18px_rgba(16,185,129,0.4)] disabled:shadow-none transition-all cursor-pointer"
          >
            {submitting ? (
              <><div className="h-3 w-3 border border-current border-t-transparent rounded-full animate-spin" /> Judging...</>
            ) : (
              <><IconUpload className="h-3.5 w-3.5" /> Submit</>
            )}
          </button>
        </div>
      </div>

      {/* ── Main Content ── */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 min-h-0">
        {/* LEFT PANEL: Description / Submissions */}
        <div className="flex flex-col border-r border-zinc-800 min-h-0 overflow-hidden">
          {/* Tabs */}
          <div className="flex bg-zinc-900 border-b border-zinc-800 shrink-0">
            <button
              onClick={() => setActiveTab("description")}
              className={`px-4 py-2.5 text-xs font-bold uppercase tracking-widest transition-colors cursor-pointer ${activeTab === "description" ? "text-white border-b-2 border-emerald-400" : "text-zinc-500 hover:text-zinc-300"}`}
            >
              Description
            </button>
            <button
              onClick={() => setActiveTab("submissions")}
              className={`px-4 py-2.5 text-xs font-bold uppercase tracking-widest transition-colors cursor-pointer flex items-center gap-1.5 ${activeTab === "submissions" ? "text-white border-b-2 border-emerald-400" : "text-zinc-500 hover:text-zinc-300"}`}
            >
              <IconHistory className="h-3 w-3" /> Submissions ({submissions.length})
            </button>
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-y-auto p-5 min-h-0">
            {activeTab === "description" ? (
              <div className="space-y-5">
                {/* Description */}
                <MarkdownDescription content={problem.description} />

                {/* Tags */}
                {problem.tags?.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {problem.tags.map((tag) => (
                      <span
                        key={tag}
                        className="px-2 py-0.5 bg-zinc-800 border border-zinc-700 rounded text-[10px] text-zinc-400 font-medium"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                {/* Sample Test Cases */}
                {sampleTestCases.length > 0 && (
                  <div className="space-y-3">
                    <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Sample Test Cases</p>
                    {sampleTestCases.map((tc, idx) => (
                      <div key={tc.id} className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden">
                        <div className="bg-zinc-950 px-3 py-1.5 border-b border-zinc-800">
                          <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">
                            Example {idx + 1}
                          </span>
                        </div>
                        <div className="p-3 space-y-2">
                          <div>
                            <span className="text-[9px] text-zinc-600 uppercase tracking-widest font-bold">Input</span>
                            <pre className="mt-1 p-2 bg-zinc-950 rounded text-xs text-zinc-300 font-mono whitespace-pre-wrap">{tc.input}</pre>
                          </div>
                          <div>
                            <span className="text-[9px] text-zinc-600 uppercase tracking-widest font-bold">Expected Output</span>
                            <pre className="mt-1 p-2 bg-zinc-950 rounded text-xs text-zinc-300 font-mono whitespace-pre-wrap">{tc.expected_output}</pre>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Constraints */}
                <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-3">
                  <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold mb-2">Constraints</p>
                  <div className="space-y-1 text-xs text-zinc-400">
                    <p>• Time Limit: {problem.time_limit}s</p>
                    <p>• Memory Limit: {problem.memory_limit}MB</p>
                  </div>
                </div>
              </div>
            ) : (
              /* Submissions History */
              <div className="space-y-2">
                {submissions.length > 0 ? (
                  submissions.map((sub) => (
                    <div
                      key={sub.id}
                      onClick={() => handleViewPastSubmission(sub)}
                      className={`flex items-center justify-between p-3 rounded-lg border ${sub.status === "Accepted" ? "bg-emerald-500/5 border-emerald-500/20 hover:bg-emerald-500/10" : "bg-zinc-900 border-zinc-800 hover:bg-zinc-800/60"} transition-all cursor-pointer group`}
                      title="Click to view submitted code"
                    >
                      <div className="flex items-center gap-3">
                        {sub.status === "Accepted" ? (
                          <IconCircleCheck className="h-4 w-4 text-emerald-400 shrink-0" />
                        ) : (
                          <IconCircleX className="h-4 w-4 text-rose-400 shrink-0" />
                        )}
                        <div>
                          <p className={`text-xs font-bold ${sub.status === "Accepted" ? "text-emerald-400" : "text-rose-400"} flex items-center gap-1.5`}>
                            {sub.status}
                            <span className="text-[9px] text-zinc-500 font-normal group-hover:text-emerald-400 transition-colors">(View code →)</span>
                          </p>
                          <p className="text-[10px] text-zinc-600">
                            {sub.passed_count}/{sub.total_count} passed · {LANGUAGES.find((l) => l.id === sub.language_id)?.name || "Unknown"}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-3 text-[10px] text-zinc-500">
                          {sub.runtime !== null && (
                            <span className="flex items-center gap-0.5"><IconClock className="h-3 w-3" />{sub.runtime}s</span>
                          )}
                          {sub.memory !== null && (
                            <span className="flex items-center gap-0.5"><IconCpu className="h-3 w-3" />{formatMemory(sub.memory, true)}</span>
                          )}
                        </div>
                        <p className="text-[9px] text-zinc-700 mt-0.5">
                          {new Date(sub.created_at).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 gap-2 select-none">
                    <IconHistory className="h-8 w-8 text-zinc-800" />
                    <p className="text-[10px] text-zinc-700 uppercase font-bold tracking-widest">No submissions yet</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT PANEL: Editor + Output */}
        <div className="flex flex-col min-h-0 overflow-hidden">
          {/* Code Editor */}
          <div className="flex-1 flex flex-col min-h-0">
            <div className="flex items-center gap-2 bg-zinc-900 px-4 py-2 border-b border-zinc-800 shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                {langForDisplay?.name} (.{langForDisplay?.extension})
              </span>
            </div>
            <div className="flex-1 min-h-0">
              <Editor
                height="100%"
                language={selectedLang.value}
                value={code}
                onChange={(v) => setCode(v || "")}
                theme="vs-dark"
                options={{
                  fontSize: 13,
                  minimap: { enabled: false },
                  scrollBeyondLastLine: false,
                  wordWrap: "on",
                  automaticLayout: true,
                  padding: { top: 10, bottom: 10 },
                  lineNumbersMinChars: 3,
                }}
                loading={
                  <div className="flex flex-col items-center justify-center h-full gap-2 bg-zinc-950">
                    <div className="h-6 w-6 border-2 border-zinc-700 border-t-zinc-400 rounded-full animate-spin" />
                    <span className="text-[10px] text-zinc-600 uppercase tracking-widest">Loading...</span>
                  </div>
                }
              />
            </div>
          </div>

          {/* Output Panel */}
          <div className="h-[220px] flex flex-col border-t border-zinc-800 shrink-0 overflow-hidden">
            {/* Output tabs */}
            <div className="flex items-center justify-between bg-zinc-900 border-b border-zinc-800 px-3 shrink-0">
              <div className="flex">
                <button
                  onClick={() => setActiveOutputTab("testcases")}
                  className={`px-3 py-2 text-[10px] font-bold uppercase tracking-widest transition-colors cursor-pointer ${activeOutputTab === "testcases" ? "text-white border-b-2 border-emerald-400" : "text-zinc-500 hover:text-zinc-300"}`}
                >
                  Test Cases
                </button>
                <button
                  onClick={() => setActiveOutputTab("result")}
                  className={`px-3 py-2 text-[10px] font-bold uppercase tracking-widest transition-colors cursor-pointer ${activeOutputTab === "result" ? "text-white border-b-2 border-emerald-400" : "text-zinc-500 hover:text-zinc-300"}`}
                >
                  Result
                </button>
              </div>
              {(runResult || submitResult) && (
                <button onClick={handleCopyOutput} className="p-1 hover:bg-zinc-800 rounded transition-all cursor-pointer text-zinc-500 hover:text-white">
                  {copied ? <IconCheck className="h-3 w-3 text-emerald-400" /> : <IconCopy className="h-3 w-3" />}
                </button>
              )}
            </div>

            <div className="flex-1 overflow-y-auto p-3 font-mono text-xs">
              {activeOutputTab === "testcases" ? (
                sampleTestCases.length > 0 ? (
                  <div className="space-y-2">
                    {sampleTestCases.map((tc, idx) => (
                      <div key={tc.id} className="flex gap-4">
                        <div className="flex-1">
                          <p className="text-[9px] text-zinc-600 uppercase tracking-widest mb-0.5">Input {idx + 1}</p>
                          <pre className="p-1.5 bg-zinc-900 rounded text-zinc-400 text-[11px]">{tc.input}</pre>
                        </div>
                        <div className="flex-1">
                          <p className="text-[9px] text-zinc-600 uppercase tracking-widest mb-0.5">Expected</p>
                          <pre className="p-1.5 bg-zinc-900 rounded text-zinc-400 text-[11px]">{tc.expected_output}</pre>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-zinc-700 text-[10px]">No sample test cases available.</p>
                )
              ) : (
                /* Result tab */
                <div className="space-y-2 h-full flex flex-col justify-start">
                  {running || submitting ? (
                    <div className="flex flex-col items-center justify-center py-6 gap-3 animate-pulse my-auto">
                      <div className="relative">
                        <div className="h-10 w-10 border-2 border-emerald-500/20 border-t-emerald-400 rounded-full animate-spin" />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <IconTerminal2 className="h-4 w-4 text-emerald-400" />
                        </div>
                      </div>
                      <div className="text-center space-y-1">
                        <p className="text-xs font-bold text-white uppercase tracking-wider">
                          {submitting ? "Judging Submission..." : "Compiling & Running..."}
                        </p>
                        <p className="text-[10px] text-zinc-500">
                          Executing solution against the logiclab sandbox...
                        </p>
                      </div>
                    </div>
                  ) : submitResult ? (
                    <>
                      <div className={`p-2.5 rounded-lg flex items-center justify-between border ${submitResult.status === "Accepted" ? "bg-emerald-500/5 border-emerald-500/20 text-emerald-400" : "bg-rose-500/5 border-rose-500/20 text-rose-400"}`}>
                        <div className="flex items-center gap-2">
                          {submitResult.status === "Accepted" ? <IconCircleCheck className="h-4 w-4" /> : <IconCircleX className="h-4 w-4" />}
                          <span className="font-bold uppercase tracking-wider text-[10px]">{submitResult.status}</span>
                          <span className="text-zinc-500 text-[10px]">{submitResult.passed_count}/{submitResult.total_count} passed</span>
                        </div>
                        <div className="flex items-center gap-3 text-zinc-400 text-[10px]">
                          <span className="flex items-center gap-1"><IconClock className="h-3 w-3" />{submitResult.runtime ?? "0.0"}s</span>
                          <span className="flex items-center gap-1"><IconCpu className="h-3 w-3" />{formatMemory(submitResult.memory, true)}</span>
                        </div>
                      </div>

                      {submitResult.status === "Accepted" && (
                        <div className="p-2.5 bg-zinc-900/40 border border-zinc-800/80 rounded-lg space-y-2 max-h-[120px] overflow-y-auto">
                          <p className="text-[9px] text-zinc-500 uppercase tracking-widest font-bold">Grading Checklist</p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                            {sampleTestCases.map((tc, idx) => (
                              <div key={tc.id} className="flex items-center gap-1.5 bg-zinc-900/60 border border-zinc-800/50 rounded px-2 py-1">
                                <IconCheck className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                                <span className="text-[11px] font-medium text-zinc-300">Example {idx + 1} Passed</span>
                              </div>
                            ))}
                            {submitResult.total_count > sampleTestCases.length && (
                              <div className="flex items-center gap-1.5 bg-zinc-900/60 border border-zinc-800/50 rounded px-2 py-1 sm:col-span-2">
                                <IconCheck className="h-3.5 w-3.5 text-emerald-400 shrink-0 animate-pulse" />
                                <span className="text-[11px] font-medium text-zinc-300">
                                  All {submitResult.total_count - sampleTestCases.length} hidden validator test cases passed!
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {submitResult.failed_test_case_info && (
                        <div className="p-2.5 bg-zinc-900 border border-zinc-800 rounded-lg space-y-1.5">
                          <p className="text-[9px] text-rose-400 uppercase tracking-widest font-bold flex items-center gap-1"><IconAlertTriangle className="h-3 w-3" /> Failed at Test Case #{submitResult.failed_test_case_info.index}</p>
                          <div className="grid grid-cols-3 gap-2 text-[10px]">
                            <div>
                              <p className="text-zinc-600">Input</p>
                              <pre className="text-zinc-400 mt-0.5 whitespace-pre-wrap">{submitResult.failed_test_case_info.input}</pre>
                            </div>
                            <div>
                              <p className="text-zinc-600">Expected</p>
                              <pre className="text-zinc-400 mt-0.5 whitespace-pre-wrap">{submitResult.failed_test_case_info.expected}</pre>
                            </div>
                            <div>
                              <p className="text-zinc-600">Your Output</p>
                              <pre className="text-rose-400 mt-0.5 whitespace-pre-wrap">{submitResult.failed_test_case_info.actual}</pre>
                            </div>
                          </div>
                        </div>
                      )}
                    </>
                  ) : runResult ? (
                    <>
                      <div className={`p-2.5 rounded-lg flex items-center justify-between border ${runResult.status?.id === 3 && runResult.matched ? "bg-emerald-500/5 border-emerald-500/20 text-emerald-400" : "bg-rose-500/5 border-rose-500/20 text-rose-400"}`}>
                        <div className="flex items-center gap-2">
                          {runResult.status?.id === 3 && runResult.matched ? <IconCircleCheck className="h-4 w-4" /> : <IconCircleX className="h-4 w-4" />}
                          <span className="font-bold uppercase tracking-wider text-[10px]">
                            {runResult.status?.id === 3 ? (runResult.matched ? "Sample Passed" : "Wrong Answer") : (runResult.status?.description || "Error")}
                          </span>
                        </div>
                        {runResult.status?.id === 3 && (
                          <div className="flex items-center gap-3 text-zinc-400 text-[10px]">
                            <span className="flex items-center gap-1"><IconClock className="h-3 w-3" />{runResult.time}s</span>
                            <span className="flex items-center gap-1"><IconCpu className="h-3 w-3" />{formatMemory(runResult.memory, false)}</span>
                          </div>
                        )}
                      </div>

                      {runResult.compile_output && (
                        <div>
                          <p className="text-[9px] text-rose-400 uppercase tracking-widest mb-1"><IconAlertTriangle className="h-3 w-3 inline" /> Compile Error</p>
                          <pre className="p-2 bg-zinc-900 border border-zinc-800 rounded text-rose-400/90 whitespace-pre-wrap text-[11px] font-mono">{runResult.compile_output}</pre>
                        </div>
                      )}

                      {runResult.stderr && (
                        <div>
                          <p className="text-[9px] text-rose-400 uppercase tracking-widest mb-1"><IconAlertTriangle className="h-3 w-3 inline" /> Runtime Error</p>
                          <pre className="p-2 bg-zinc-900 border border-zinc-800 rounded text-rose-400/90 whitespace-pre-wrap text-[11px] font-mono">{runResult.stderr}</pre>
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <p className="text-[9px] text-zinc-600 uppercase tracking-widest mb-0.5">Your Output</p>
                          <pre className="p-1.5 bg-zinc-900 border border-zinc-800 rounded text-zinc-300 text-[11px] whitespace-pre-wrap font-mono">{runResult.stdout || "(empty)"}</pre>
                        </div>
                        <div>
                          <p className="text-[9px] text-zinc-600 uppercase tracking-widest mb-0.5">Expected</p>
                          <pre className="p-1.5 bg-zinc-900 border border-zinc-800 rounded text-zinc-300 text-[11px] whitespace-pre-wrap font-mono">{runResult.expected || "(none)"}</pre>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full gap-1.5 select-none my-auto">
                      <IconTerminal2 className="h-6 w-6 text-zinc-800" />
                      <p className="text-[10px] text-zinc-700 uppercase font-bold tracking-widest">Run or Submit to see results</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Historical Code Viewer Modal ── */}
      {viewingSubmission && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-zinc-950 border border-zinc-800 rounded-xl shadow-2xl overflow-hidden w-full max-w-2xl flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-zinc-900/80 border-b border-zinc-800 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className={`h-2 w-2 rounded-full ${viewingSubmission.status === "Accepted" ? "bg-emerald-500" : "bg-rose-500"}`} />
                <div>
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    Submission Code Preview
                    <span className={`text-[10px] px-1.5 py-0.5 rounded border font-semibold ${viewingSubmission.status === "Accepted" ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" : "text-rose-400 bg-rose-500/10 border-rose-500/20"}`}>
                      {viewingSubmission.status}
                    </span>
                  </h3>
                  <p className="text-[10px] text-zinc-500 mt-0.5">
                    Submitted on {new Date(viewingSubmission.created_at).toLocaleString()} · {LANGUAGES.find(l => l.id === viewingSubmission.language_id)?.name}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setViewingSubmission(null)}
                className="p-1 hover:bg-zinc-800 rounded text-zinc-400 hover:text-white transition-colors cursor-pointer"
              >
                <IconX className="h-4.5 w-4.5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 min-h-[300px] bg-zinc-950 flex flex-col relative overflow-hidden">
              {loadingCode ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2.5 bg-zinc-950 z-10">
                  <div className="h-7 w-7 border-2 border-zinc-700 border-t-emerald-400 rounded-full animate-spin" />
                  <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Fetching solution from database...</span>
                </div>
              ) : (
                <div className="flex-1 h-full min-h-[350px]">
                  <Editor
                    height="100%"
                    language={LANGUAGES.find((l) => l.id === viewingSubmission.language_id)?.value || "javascript"}
                    value={viewingCode}
                    theme="vs-dark"
                    options={{
                      readOnly: true,
                      fontSize: 12.5,
                      minimap: { enabled: false },
                      scrollBeyondLastLine: false,
                      wordWrap: "on",
                      automaticLayout: true,
                      padding: { top: 12, bottom: 12 },
                      lineNumbersMinChars: 3,
                    }}
                  />
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between px-4 py-3 bg-zinc-900/50 border-t border-zinc-800 shrink-0">
              <div className="text-[10px] text-zinc-500 font-medium">
                Passed {viewingSubmission.passed_count}/{viewingSubmission.total_count} test cases
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setViewingSubmission(null)}
                  className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-zinc-400 hover:text-white bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 hover:border-zinc-700 transition-colors cursor-pointer"
                >
                  Close
                </button>
                <button
                  disabled={loadingCode || !viewingCode}
                  onClick={() => {
                    if (viewingCode) {
                      const matchedLang = LANGUAGES.find(l => l.id === viewingSubmission.language_id)
                      if (matchedLang) {
                        setSelectedLang(matchedLang)
                      }
                      setCode(viewingCode)
                      setViewingSubmission(null)
                      toast.success("Submission code successfully restored to workspace!")
                    }
                  }}
                  className="flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-black px-4 py-1.5 rounded-lg text-xs font-bold shadow-[0_0_12px_rgba(16,185,129,0.2)] transition-all cursor-pointer"
                >
                  <IconCode className="h-3.5 w-3.5" /> Restore to Workspace
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
