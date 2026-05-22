"use client"

import React, { useState, useRef } from "react"
import Editor from "@monaco-editor/react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  IconArrowLeft,
  IconPlus,
  IconTrash,
  IconDeviceFloppy,
  IconCode,
  IconEye,
  IconEyeOff,
  IconAlertTriangle,
  IconUpload,
  IconFileDescription,
  IconCheck,
  IconX,
  IconCopy,
  IconInfoCircle,
  IconAlertCircle,
  IconCircleCheck,
} from "@tabler/icons-react"
import { toast } from "sonner"
import { createClient } from "@/lib/supabase/client"

const LANGUAGES = [
  { id: 71, name: "Python 3", value: "python" },
  { id: 63, name: "JavaScript (Node.js)", value: "javascript" },
  { id: 54, name: "C++ (GCC 9.2)", value: "cpp" },
  { id: 62, name: "Java (OpenJDK 13)", value: "java" },
]

const DEFAULT_BOILERPLATES: Record<string, string> = {
  "71": `from typing import List\n\nclass Solution:\n    def solve(self, nums: List[int]) -> int:\n        # Write your code here\n        pass\n`,
  "63": `class Solution {\n    solve(nums) {\n        // Write your code here\n    }\n}\nmodule.exports = Solution;\n`,
  "54": `#include <vector>\nusing namespace std;\n\nclass Solution {\npublic:\n    int solve(vector<int>& nums) {\n        // Write your code here\n        return 0;\n    }\n};\n`,
  "62": `class Solution {\n    public int solve(int[] nums) {\n        // Write your code here\n        return 0;\n    }\n}\n`,
}

const DEFAULT_DRIVERS: Record<string, string> = {
  "71": `# === Driver Code (hidden from student) ===\nimport sys, json\nif __name__ == "__main__":\n    input_data = sys.stdin.read().strip().splitlines()\n    nums = json.loads(input_data[0]) if input_data else []\n    sol = Solution()\n    result = sol.solve(nums)\n    print(json.dumps(result))\n`,
  "63": `// === Driver Code (hidden from student) ===\nconst fs = require('fs');\nconst input = fs.readFileSync(0, 'utf-8').trim().split('\\n');\nconst nums = JSON.parse(input[0] || '[]');\nconst sol = new Solution();\nconst result = sol.solve(nums);\nconsole.log(JSON.stringify(result));\n`,
  "54": `// === Driver Code (hidden from student) ===\n#include <iostream>\n#include <sstream>\nint main() {\n    string line;\n    getline(cin, line);\n    // Parse JSON array from stdin\n    vector<int> nums;\n    stringstream ss(line.substr(1, line.size()-2));\n    string token;\n    while(getline(ss, token, ',')) nums.push_back(stoi(token));\n    Solution sol;\n    cout << sol.solve(nums) << endl;\n    return 0;\n}\n`,
  "62": `// === Driver Code (hidden from student) ===\nimport java.util.*;\npublic class Main {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        String line = sc.nextLine().trim();\n        line = line.substring(1, line.length()-1);\n        String[] parts = line.isEmpty() ? new String[0] : line.split(",");\n        int[] nums = new int[parts.length];\n        for(int i=0;i<parts.length;i++) nums[i]=Integer.parseInt(parts[i].trim());\n        Solution sol = new Solution();\n        System.out.println(sol.solve(nums));\n    }\n}\n`,
}

interface TestCase {
  input: string
  expected_output: string
  is_sample: boolean
}

interface ParsedProblem {
  title: string
  description: string
  difficulty: "Easy" | "Medium" | "Hard"
  tags: string[]
  time_limit: number
  memory_limit: number
  boilerplates: Record<string, string>
  driver_codes: Record<string, string>
  test_cases: TestCase[]
  isValid: boolean
  errors: string[]
}

// ── CUSTOM RFC 4180 COMPLIANT CSV PARSER ──
function parseCSV(text: string): Record<string, string>[] {
  const lines: string[][] = []
  let row: string[] = []
  let inQuotes = false
  let currentVal = ""
  
  for (let i = 0; i < text.length; i++) {
    const char = text[i]
    const nextChar = text[i + 1]
    
    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentVal += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (char === ',' && !inQuotes) {
      row.push(currentVal)
      currentVal = ""
    } else if ((char === '\r' || char === '\n') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') {
        i++
      }
      row.push(currentVal)
      if (row.length > 0 && !(row.length === 1 && row[0] === "")) {
        lines.push(row)
      }
      row = []
      currentVal = ""
    } else {
      currentVal += char
    }
  }
  
  if (row.length > 0 || currentVal !== "") {
    row.push(currentVal)
    lines.push(row)
  }
  
  if (lines.length === 0) return []
  
  const headers = lines[0].map(h => h.trim().toLowerCase())
  const results: Record<string, string>[] = []
  
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i]
    const obj: Record<string, string> = {}
    for (let j = 0; j < headers.length; j++) {
      obj[headers[j]] = values[j] !== undefined ? values[j].trim() : ""
    }
    results.push(obj)
  }
  
  return results
}

// ── SCHEMATIC FIELD VALIDATOR FOR BULK PROBLEMS ──
const validateProblems = (rawProblems: any[]): ParsedProblem[] => {
  return rawProblems.map((p, index) => {
    const errors: string[] = []
    const title = (p.title || "").trim()
    const description = (p.description || "").trim()
    
    let difficulty: "Easy" | "Medium" | "Hard" = "Easy"
    if (p.difficulty) {
      const diffUpper = p.difficulty.trim().toUpperCase()
      if (diffUpper === "EASY" || diffUpper === "MEDIUM" || diffUpper === "HARD") {
        difficulty = (p.difficulty.trim().charAt(0).toUpperCase() + p.difficulty.trim().slice(1).toLowerCase()) as any
      } else {
        errors.push(`Difficulty must be Easy, Medium, or Hard (got: ${p.difficulty})`)
      }
    }

    let tags: string[] = []
    if (Array.isArray(p.tags)) {
      tags = p.tags.map((t: any) => String(t).trim()).filter(Boolean)
    } else if (typeof p.tags === "string") {
      tags = p.tags.split(/[;,]/).map((t: string) => t.trim()).filter(Boolean)
    }

    const time_limit = parseFloat(p.time_limit) || 2.0
    if (isNaN(time_limit) || time_limit <= 0) {
      errors.push("Time limit must be greater than 0 seconds")
    }

    const memory_limit = parseInt(p.memory_limit) || 256
    if (isNaN(memory_limit) || memory_limit <= 0) {
      errors.push("Memory limit must be greater than 0 MB")
    }

    // Boilerplates
    let boilerplates: Record<string, string> = { ...DEFAULT_BOILERPLATES }
    if (p.boilerplates) {
      try {
        const parsedBoiler = typeof p.boilerplates === "string" ? JSON.parse(p.boilerplates) : p.boilerplates
        boilerplates = { ...DEFAULT_BOILERPLATES, ...parsedBoiler }
      } catch (e) {
        errors.push("Invalid boilerplates JSON structure")
      }
    }

    // Driver Codes
    let driver_codes: Record<string, string> = { ...DEFAULT_DRIVERS }
    if (p.driver_codes) {
      try {
        const parsedDriver = typeof p.driver_codes === "string" ? JSON.parse(p.driver_codes) : p.driver_codes
        driver_codes = { ...DEFAULT_DRIVERS, ...parsedDriver }
      } catch (e) {
        errors.push("Invalid driver_codes JSON structure")
      }
    }

    // Test cases
    let test_cases: TestCase[] = []
    
    // Check for test_cases JSON array column first
    if (p.test_cases) {
      try {
        const parsedTCs = typeof p.test_cases === "string" ? JSON.parse(p.test_cases) : p.test_cases
        if (Array.isArray(parsedTCs)) {
          if (parsedTCs.length === 0) {
            errors.push("Must provide at least one test case in test_cases array")
          }
          test_cases = parsedTCs.map((tc: any, tcIdx: number) => {
            const input = String(tc.input || tc.sample_input || "").trim()
            const expected_output = String(tc.expected_output || tc.sample_output || "").trim()
            if (!input) {
              errors.push(`Test case #${tcIdx + 1} has empty input`)
            }
            if (!expected_output) {
              errors.push(`Test case #${tcIdx + 1} has empty expected output`)
            }
            return {
              input,
              expected_output,
              is_sample: tc.is_sample ?? true,
            }
          })
        } else {
          errors.push("test_cases column must be an array of objects")
        }
      } catch (e) {
        errors.push("Invalid test_cases JSON column structure")
      }
    } else {
      // Fallback: check for sample_input / sample_output columns
      const sample_input = String(p.sample_input || p.input || "").trim()
      const sample_output = String(p.sample_output || p.expected_output || "").trim()
      if (sample_input || sample_output) {
        if (!sample_input) errors.push("Fallback sample test case has empty input")
        if (!sample_output) errors.push("Fallback sample test case has empty expected output")
        test_cases = [{ input: sample_input, expected_output: sample_output, is_sample: true }]
      } else {
        errors.push("Must provide test_cases JSON or fallback sample_input/sample_output columns")
      }
    }

    if (!title) {
      errors.push("Title is required")
    }
    if (!description) {
      errors.push("Description is required")
    }

    return {
      title,
      description,
      difficulty,
      tags,
      time_limit,
      memory_limit,
      boilerplates,
      driver_codes,
      test_cases,
      isValid: errors.length === 0,
      errors,
    }
  })
}

// ── PRESET COPYABLE TEMPLATES ──
const JSON_TEMPLATE = `[
  {
    "title": "Two Sum",
    "description": "Given an array of integers \`nums\` and an integer \`target\`, return indices of the two numbers such that they add up to \`target\`.",
    "difficulty": "Easy",
    "tags": ["Array", "Hash Table"],
    "time_limit": 2.0,
    "memory_limit": 256,
    "test_cases": [
      { "input": "[2,7,11,15]\\n9", "expected_output": "[0,1]", "is_sample": true }
    ]
  }
]`

const CSV_ROBUST_TEMPLATE = `title,description,difficulty,tags,time_limit,memory_limit,test_cases
"Two Sum","Given an array of integers...","Easy","Array;Hash Table",2.0,256,"[{""input"": ""[2,7,11,15]\\n9"", ""expected_output"": ""[0,1]"", ""is_sample"": true}]"`

const CSV_SIMPLE_TEMPLATE = `title,description,difficulty,tags,time_limit,memory_limit,sample_input,sample_output
"Two Sum","Given an array of integers...","Easy","Array;Hash Table",2.0,256,"[2,7,11,15]\\n9","[0,1]"`

export function AdminProblemCreatorClient({
  initialProblem,
  isEdit = false,
}: {
  initialProblem?: any
  isEdit?: boolean
} = {}) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState<"single" | "bulk">("single")

  // Parse initial values safely
  let parsedBoilerplates = initialProblem?.boilerplates || {}
  if (typeof parsedBoilerplates === "string") {
    try { parsedBoilerplates = JSON.parse(parsedBoilerplates) } catch (e) { console.error(e) }
  }
  let parsedDrivers = initialProblem?.driver_codes || {}
  if (typeof parsedDrivers === "string") {
    try { parsedDrivers = JSON.parse(parsedDrivers) } catch (e) { console.error(e) }
  }
  let parsedTestCases = initialProblem?.test_cases || []
  if (typeof parsedTestCases === "string") {
    try { parsedTestCases = JSON.parse(parsedTestCases) } catch (e) { console.error(e) }
  }

  // Problem metadata
  const [title, setTitle] = useState(initialProblem?.title || "")
  const [description, setDescription] = useState(initialProblem?.description || "")
  const [difficulty, setDifficulty] = useState<"Easy" | "Medium" | "Hard">(initialProblem?.difficulty || "Easy")
  const [tags, setTags] = useState(Array.isArray(initialProblem?.tags) ? initialProblem.tags.join(", ") : "")
  const [timeLimit, setTimeLimit] = useState(initialProblem?.time_limit || 2.0)
  const [memoryLimit, setMemoryLimit] = useState(initialProblem?.memory_limit || 256)

  // Code templates
  const [activeLang, setActiveLang] = useState("71")
  const [boilerplates, setBoilerplates] = useState<Record<string, string>>({
    ...DEFAULT_BOILERPLATES,
    ...parsedBoilerplates,
  })
  const [driverCodes, setDriverCodes] = useState<Record<string, string>>({
    ...DEFAULT_DRIVERS,
    ...parsedDrivers,
  })

  // Test cases
  const [testCases, setTestCases] = useState<TestCase[]>(
    parsedTestCases.length > 0
      ? parsedTestCases
      : [{ input: "", expected_output: "", is_sample: true }]
  )

  // Bulk import states
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [dragActive, setDragActive] = useState(false)
  const [importedFileName, setImportedFileName] = useState("")
  const [parsedProblems, setParsedProblems] = useState<ParsedProblem[]>([])
  const [activeTemplateTab, setActiveTemplateTab] = useState<"json" | "csv_robust" | "csv_simple">("json")

  const addTestCase = () => {
    setTestCases([...testCases, { input: "", expected_output: "", is_sample: false }])
  }

  const removeTestCase = (idx: number) => {
    setTestCases(testCases.filter((_, i) => i !== idx))
  }

  const updateTestCase = (idx: number, field: keyof TestCase, value: any) => {
    setTestCases(testCases.map((tc, i) => (i === idx ? { ...tc, [field]: value } : tc)))
  }

  const handleCopyTemplate = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success("Template copied to clipboard!")
  }

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0])
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0])
    }
  }

  const processFile = (file: File) => {
    const isJSON = file.name.endsWith(".json")
    const isCSV = file.name.endsWith(".csv")
    if (!isJSON && !isCSV) {
      toast.error("Please upload a valid .json or .csv file.")
      return
    }

    setImportedFileName(file.name)
    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target?.result as string
      if (!text) {
        toast.error("Failed to read file content.")
        return
      }

      try {
        let rawProblems: any[] = []
        if (isJSON) {
          const parsed = JSON.parse(text)
          rawProblems = Array.isArray(parsed) ? parsed : [parsed]
        } else {
          rawProblems = parseCSV(text)
        }

        const validated = validateProblems(rawProblems)
        setParsedProblems(validated)
        
        const validCount = validated.filter((p) => p.isValid).length
        if (validCount === validated.length) {
          toast.success(`Parsed ${validated.length} problems successfully!`)
        } else if (validCount > 0) {
          toast.warning(`Parsed ${validated.length} problems. ${validated.length - validCount} have validation errors.`)
        } else {
          toast.error("All parsed problems have validation errors. Please check the file.")
        }
      } catch (err: any) {
        console.error("Parsing error:", err)
        toast.error(`Failed to parse file: ${err.message || "Invalid syntax"}`)
      }
    }
    reader.readAsText(file)
  }

  const handleSave = async () => {
    if (!title.trim()) { toast.error("Title is required."); return }
    if (!description.trim()) { toast.error("Description is required."); return }
    if (testCases.length === 0) { toast.error("Add at least one test case."); return }
    if (testCases.some((tc) => !tc.input.trim() || !tc.expected_output.trim())) {
      toast.error("All test cases must have input and expected output.")
      return
    }

    setSaving(true)
    try {
      const supabase = createClient() as any
      const payload = {
        title: title.trim(),
        description: description.trim(),
        difficulty,
        tags: tags.split(",").map((t: string) => t.trim()).filter(Boolean),
        time_limit: timeLimit,
        memory_limit: memoryLimit,
        boilerplates,
        driver_codes: driverCodes,
        test_cases: testCases,
      }

      let result;
      if (isEdit) {
        const { data, error } = await supabase
          .from("coding_problems")
          .update(payload)
          .eq("id", initialProblem.id)
          .select("id")
          .single()
        result = { data, error }
      } else {
        const { data, error } = await supabase
          .from("coding_problems")
          .insert(payload)
          .select("id")
          .single()
        result = { data, error }
      }

      if (result.error || !result.data) {
        throw new Error(result.error?.message || `Failed to ${isEdit ? "update" : "create"} problem.`)
      }

      toast.success(`Problem ${isEdit ? "updated" : "created"} successfully!`)
      router.push("/~/logiclab/admin")
    } catch (err: any) {
      console.error("Save error:", err)
      toast.error(err?.message || "Failed to save problem.")
    } finally {
      setSaving(false)
    }
  }

  const handleBulkImport = async () => {
    const validProblems = parsedProblems.filter((p) => p.isValid)
    if (validProblems.length === 0) {
      toast.error("No valid problems to import.")
      return
    }

    setSaving(true)
    try {
      const supabase = createClient() as any
      
      // 1. Bulk insert problems with their test cases embedded
      const problemInserts = validProblems.map((p) => ({
        title: p.title,
        description: p.description,
        difficulty: p.difficulty,
        tags: p.tags,
        time_limit: p.time_limit,
        memory_limit: p.memory_limit,
        boilerplates: p.boilerplates,
        driver_codes: p.driver_codes,
        test_cases: p.test_cases,
      }))

      const { data: insertedProblems, error: problemsError } = await supabase
        .from("coding_problems")
        .insert(problemInserts)
        .select("id, title")

      if (problemsError || !insertedProblems) {
        throw new Error(problemsError?.message || "Failed to batch insert problems.")
      }

      toast.success(`Successfully imported ${insertedProblems.length} problems!`)
      router.push("/~/logiclab/admin")
    } catch (err: any) {
      console.error("Bulk Import Error:", err)
      toast.error(err?.message || "Failed during bulk import.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-5 p-4 md:p-6 min-h-[calc(100svh-56px)] bg-zinc-950 text-zinc-100">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-3">
          <Link
            href="/~/logiclab/admin"
            className="h-9 w-9 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center hover:bg-zinc-700 transition-colors"
          >
            <IconArrowLeft className="h-4 w-4 text-zinc-400" />
          </Link>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-white">
              {isEdit ? "Edit Problem" : (activeTab === "single" ? "Create Problem" : "Bulk Import Problems")}
            </h1>
            <p className="text-[10px] text-zinc-500 uppercase tracking-widest">LogicLab Admin Panel</p>
          </div>
        </div>

        {activeTab === "single" ? (
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-400 disabled:bg-zinc-800 disabled:text-zinc-600 text-black px-5 py-2 rounded-lg text-xs font-bold shadow-[0_0_16px_rgba(16,185,129,0.25)] hover:shadow-[0_0_22px_rgba(16,185,129,0.4)] disabled:shadow-none transition-all cursor-pointer"
          >
            {saving ? (
              <><div className="h-3.5 w-3.5 border border-current border-t-transparent rounded-full animate-spin" /> {isEdit ? "Updating..." : "Saving..."}</>
            ) : (
              <><IconDeviceFloppy className="h-4 w-4" /> {isEdit ? "Update Problem" : "Save Problem"}</>
            )}
          </button>
        ) : (
          <button
            onClick={handleBulkImport}
            disabled={saving || parsedProblems.filter((p) => p.isValid).length === 0}
            className="flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-400 disabled:bg-zinc-800 disabled:text-zinc-600 text-black px-5 py-2 rounded-lg text-xs font-bold shadow-[0_0_16px_rgba(16,185,129,0.25)] hover:shadow-[0_0_22px_rgba(16,185,129,0.4)] disabled:shadow-none transition-all cursor-pointer"
          >
            {saving ? (
              <><div className="h-3.5 w-3.5 border border-current border-t-transparent rounded-full animate-spin" /> Importing...</>
            ) : (
              <><IconCircleCheck className="h-4 w-4" /> Import {parsedProblems.filter((p) => p.isValid).length} Problems</>
            )}
          </button>
        )}
      </div>

      {/* Tabs bar */}
      {!isEdit && (
        <div className="flex border-b border-zinc-900 shrink-0">
          <button
            onClick={() => setActiveTab("single")}
            className={`px-5 py-2.5 text-xs font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
              activeTab === "single"
                ? "border-emerald-500 text-emerald-400 font-bold"
                : "border-transparent text-zinc-500 hover:text-zinc-300"
            }`}
          >
            Single Problem Creator
          </button>
          <button
            onClick={() => setActiveTab("bulk")}
            className={`px-5 py-2.5 text-xs font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
              activeTab === "bulk"
                ? "border-emerald-500 text-emerald-400 font-bold"
                : "border-transparent text-zinc-500 hover:text-zinc-300"
            }`}
          >
            Bulk Import Problems (JSON/CSV)
          </button>
        </div>
      )}

      {/* Workspace */}
      {activeTab === "single" ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 flex-1">
          {/* LEFT: Metadata */}
          <div className="space-y-4">
            {/* Title */}
            <div>
              <label className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold mb-1.5 block">Problem Title *</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Two Sum"
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2.5 text-sm text-zinc-200 placeholder:text-zinc-700 focus:outline-none focus:border-zinc-600"
              />
            </div>

            {/* Description */}
            <div>
              <label className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold mb-1.5 block">
                Description * (Markdown supported)
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target..."
                rows={8}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3 text-sm text-zinc-200 placeholder:text-zinc-700 focus:outline-none focus:border-zinc-600 resize-none font-mono"
              />
            </div>

            {/* Difficulty + Tags */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold mb-1.5 block">Difficulty *</label>
                <select
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value as any)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2.5 text-sm text-zinc-200 focus:outline-none cursor-pointer"
                >
                  <option value="Easy">Easy</option>
                  <option value="Medium">Medium</option>
                  <option value="Hard">Hard</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold mb-1.5 block">Tags (comma separated)</label>
                <input
                  type="text"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  placeholder="Array, Hash Table"
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2.5 text-sm text-zinc-200 placeholder:text-zinc-700 focus:outline-none focus:border-zinc-600"
                />
              </div>
            </div>

            {/* Limits */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold mb-1.5 block">Time Limit (seconds)</label>
                <input
                  type="number"
                  step="0.5"
                  min="0.5"
                  max="10"
                  value={timeLimit}
                  onChange={(e) => setTimeLimit(parseFloat(e.target.value))}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2.5 text-sm text-zinc-200 focus:outline-none focus:border-zinc-600"
                />
              </div>
              <div>
                <label className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold mb-1.5 block">Memory Limit (MB)</label>
                <input
                  type="number"
                  min="32"
                  max="1024"
                  value={memoryLimit}
                  onChange={(e) => setMemoryLimit(parseInt(e.target.value))}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2.5 text-sm text-zinc-200 focus:outline-none focus:border-zinc-600"
                />
              </div>
            </div>

            {/* Test Cases */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">
                  Test Cases ({testCases.length})
                </label>
                <button
                  onClick={addTestCase}
                  className="flex items-center gap-1 text-[10px] text-emerald-400 hover:text-emerald-300 font-bold uppercase tracking-widest transition-colors cursor-pointer"
                >
                  <IconPlus className="h-3 w-3" /> Add
                </button>
              </div>

              <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
                {testCases.map((tc, idx) => (
                  <div key={idx} className="bg-zinc-900 border border-zinc-800 rounded-lg p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">
                        Test Case #{idx + 1}
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => updateTestCase(idx, "is_sample", !tc.is_sample)}
                          className={`flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest transition-colors cursor-pointer ${tc.is_sample ? "text-emerald-400" : "text-zinc-600 hover:text-zinc-400"}`}
                        >
                          {tc.is_sample ? <IconEye className="h-3 w-3" /> : <IconEyeOff className="h-3 w-3" />}
                          {tc.is_sample ? "Sample" : "Hidden"}
                        </button>
                        {testCases.length > 1 && (
                          <button
                            onClick={() => removeTestCase(idx)}
                            className="text-zinc-600 hover:text-rose-400 transition-colors cursor-pointer"
                          >
                            <IconTrash className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[9px] text-zinc-600 uppercase tracking-widest">Input (stdin)</label>
                        <textarea
                          value={tc.input}
                          onChange={(e) => updateTestCase(idx, "input", e.target.value)}
                          rows={3}
                          placeholder="[2,7,11,15]\n9"
                          className="w-full bg-zinc-950 border border-zinc-800 rounded px-2 py-1.5 text-xs text-zinc-300 font-mono placeholder:text-zinc-700 focus:outline-none resize-none"
                        />
                      </div>
                      <div>
                        <label className="text-[9px] text-zinc-600 uppercase tracking-widest">Expected Output</label>
                        <textarea
                          value={tc.expected_output}
                          onChange={(e) => updateTestCase(idx, "expected_output", e.target.value)}
                          rows={3}
                          placeholder="[0,1]"
                          className="w-full bg-zinc-950 border border-zinc-800 rounded px-2 py-1.5 text-xs text-zinc-300 font-mono placeholder:text-zinc-700 focus:outline-none resize-none"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* RIGHT: Code Templates */}
          <div className="flex flex-col gap-4">
            {/* Language selector */}
            <div className="flex items-center gap-2">
              {LANGUAGES.map((lang) => (
                <button
                  key={lang.id}
                  onClick={() => setActiveLang(String(lang.id))}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${String(lang.id) === activeLang ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" : "bg-zinc-900 border-zinc-800 text-zinc-500 hover:text-zinc-300 hover:border-zinc-700"}`}
                >
                  {lang.name}
                </button>
              ))}
            </div>

            {/* Boilerplate Editor */}
            <div className="flex-1 flex flex-col bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden min-h-[250px]">
              <div className="flex items-center gap-2 bg-zinc-950 px-4 py-2 border-b border-zinc-800 shrink-0">
                <IconCode className="h-3.5 w-3.5 text-emerald-400" />
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                  User Boilerplate (visible to students)
                </span>
              </div>
              <div className="flex-1 min-h-0">
                <Editor
                  height="100%"
                  language={LANGUAGES.find((l) => String(l.id) === activeLang)?.value || "python"}
                  value={boilerplates[activeLang] || ""}
                  onChange={(v) => setBoilerplates({ ...boilerplates, [activeLang]: v || "" })}
                  theme="vs-dark"
                  options={{
                    fontSize: 12,
                    minimap: { enabled: false },
                    scrollBeyondLastLine: false,
                    wordWrap: "on",
                    automaticLayout: true,
                    padding: { top: 8, bottom: 8 },
                    lineNumbersMinChars: 3,
                  }}
                />
              </div>
            </div>

            {/* Driver Code Editor */}
            <div className="flex-1 flex flex-col bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden min-h-[250px]">
              <div className="flex items-center gap-2 bg-zinc-950 px-4 py-2 border-b border-zinc-800 shrink-0">
                <IconAlertTriangle className="h-3.5 w-3.5 text-amber-400" />
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                  Driver Code (hidden — appended to user code before execution)
                </span>
              </div>
              <div className="flex-1 min-h-0">
                <Editor
                  height="100%"
                  language={LANGUAGES.find((l) => String(l.id) === activeLang)?.value || "python"}
                  value={driverCodes[activeLang] || ""}
                  onChange={(v) => setDriverCodes({ ...driverCodes, [activeLang]: v || "" })}
                  theme="vs-dark"
                  options={{
                    fontSize: 12,
                    minimap: { enabled: false },
                    scrollBeyondLastLine: false,
                    wordWrap: "on",
                    automaticLayout: true,
                    padding: { top: 8, bottom: 8 },
                    lineNumbersMinChars: 3,
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* BULK IMPORT DASHBOARD */
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 flex-1 items-start">
          {/* Left Column: Dropzone & Validation summary */}
          <div className="xl:col-span-2 space-y-6">
            {/* Drop Zone */}
            <div
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center gap-3 transition-all cursor-pointer min-h-[180px] bg-zinc-900/40 backdrop-blur-md ${
                dragActive
                  ? "border-emerald-400 bg-emerald-500/5 shadow-[0_0_20px_rgba(16,185,129,0.1)]"
                  : "border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900/60"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.json"
                onChange={handleFileChange}
                className="hidden"
              />
              <div className="h-12 w-12 rounded-xl bg-zinc-900/80 border border-zinc-800 flex items-center justify-center text-zinc-400">
                <IconUpload className="h-6 w-6 text-emerald-400" />
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold text-zinc-200">
                  {importedFileName ? `Selected: ${importedFileName}` : "Drag and drop your file here"}
                </p>
                <p className="text-xs text-zinc-500 mt-1">
                  Supports JSON and CSV formats (max 5MB)
                </p>
              </div>
            </div>

            {/* Preview & Validation Table */}
            {parsedProblems.length > 0 && (
              <div className="bg-zinc-900/30 border border-zinc-800/80 rounded-2xl overflow-hidden flex flex-col">
                <div className="bg-zinc-900/80 border-b border-zinc-800 px-5 py-3.5 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <IconFileDescription className="h-4 w-4 text-emerald-400" />
                    <span className="text-xs font-bold text-zinc-300 uppercase tracking-widest">
                      Parsed Problems Summary ({parsedProblems.length})
                    </span>
                  </div>
                  <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 border border-emerald-500/20 rounded-full font-bold uppercase tracking-wider">
                    {parsedProblems.filter((p) => p.isValid).length} / {parsedProblems.length} Valid
                  </span>
                </div>

                <div className="divide-y divide-zinc-800/50 max-h-[480px] overflow-y-auto">
                  {parsedProblems.map((prob, idx) => (
                    <div key={idx} className="p-4 hover:bg-zinc-900/20 transition-colors space-y-3">
                      <div className="flex items-start justify-between gap-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs text-zinc-500 font-mono">#{idx + 1}</span>
                            <h4 className="text-sm font-semibold text-white">{prob.title || <span className="text-rose-500 italic">No Title</span>}</h4>
                            <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 border rounded ${
                              prob.difficulty === "Easy" ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" :
                              prob.difficulty === "Medium" ? "text-amber-400 bg-amber-500/10 border-amber-500/20" :
                              "text-rose-400 bg-rose-500/10 border-rose-500/20"
                            }`}>
                              {prob.difficulty}
                            </span>
                          </div>
                          <p className="text-xs text-zinc-500 line-clamp-2 pr-4">{prob.description || <span className="text-rose-500 italic">No Description provided.</span>}</p>
                        </div>
                        <div className="shrink-0 flex items-center gap-2">
                          <span className="text-[10px] text-zinc-400 bg-zinc-800 px-2 py-0.5 border border-zinc-700 rounded-md font-semibold">
                            {prob.test_cases.length} TCs
                          </span>
                          {prob.isValid ? (
                            <span className="flex items-center gap-1 text-[10px] text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 border border-emerald-500/20 rounded-md font-bold uppercase tracking-wider">
                              <IconCheck className="h-3 w-3" /> Valid
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-[10px] text-rose-400 bg-rose-500/10 px-2.5 py-0.5 border border-rose-500/20 rounded-md font-bold uppercase tracking-wider">
                              <IconX className="h-3 w-3" /> Invalid
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Display validation errors */}
                      {!prob.isValid && (
                        <div className="bg-rose-500/5 border border-rose-500/10 rounded-lg p-3 space-y-1.5">
                          <div className="flex items-center gap-1 text-[10px] font-bold text-rose-400 uppercase tracking-widest">
                            <IconAlertCircle className="h-3.5 w-3.5" /> Validation Errors:
                          </div>
                          <ul className="list-disc pl-4 text-xs text-zinc-400 space-y-0.5">
                            {prob.errors.map((err, errIdx) => (
                              <li key={errIdx}>{err}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Display metadata details */}
                      {prob.isValid && (
                        <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-[10px] text-zinc-500 font-medium">
                          {prob.tags.length > 0 && (
                            <div>
                              Tags: <span className="text-zinc-300">{prob.tags.join(", ")}</span>
                            </div>
                          )}
                          <div>
                            Time Limit: <span className="text-zinc-300">{prob.time_limit}s</span>
                          </div>
                          <div>
                            Memory Limit: <span className="text-zinc-300">{prob.memory_limit}MB</span>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Copy template guides */}
          <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-2xl p-5 space-y-4">
            <div>
              <h3 className="text-sm font-bold text-zinc-200 uppercase tracking-widest">Format Guide</h3>
              <p className="text-xs text-zinc-500 mt-1">
                Use these mock templates to format your files perfectly before uploading.
              </p>
            </div>

            {/* Template Selector tabs */}
            <div className="grid grid-cols-3 gap-1 bg-zinc-950 p-1 rounded-lg border border-zinc-900">
              <button
                onClick={() => setActiveTemplateTab("json")}
                className={`py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-md transition-all cursor-pointer ${
                  activeTemplateTab === "json" ? "bg-zinc-800 text-emerald-400 shadow-sm" : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                JSON
              </button>
              <button
                onClick={() => setActiveTemplateTab("csv_robust")}
                className={`py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-md transition-all cursor-pointer ${
                  activeTemplateTab === "csv_robust" ? "bg-zinc-800 text-emerald-400 shadow-sm" : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                CSV Robust
              </button>
              <button
                onClick={() => setActiveTemplateTab("csv_simple")}
                className={`py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-md transition-all cursor-pointer ${
                  activeTemplateTab === "csv_simple" ? "bg-zinc-800 text-emerald-400 shadow-sm" : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                CSV Simple
              </button>
            </div>

            {/* Template preview */}
            <div className="relative bg-zinc-950 border border-zinc-900 rounded-xl p-3.5 font-mono text-[10px] overflow-x-auto text-zinc-400 max-h-[300px] whitespace-pre select-all">
              <button
                onClick={() =>
                  handleCopyTemplate(
                    activeTemplateTab === "json"
                      ? JSON_TEMPLATE
                      : activeTemplateTab === "csv_robust"
                      ? CSV_ROBUST_TEMPLATE
                      : CSV_SIMPLE_TEMPLATE
                  )
                }
                className="absolute right-2 top-2 h-7 w-7 rounded bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
                title="Copy Template"
              >
                <IconCopy className="h-3.5 w-3.5" />
              </button>
              {activeTemplateTab === "json"
                ? JSON_TEMPLATE
                : activeTemplateTab === "csv_robust"
                ? CSV_ROBUST_TEMPLATE
                : CSV_SIMPLE_TEMPLATE}
            </div>

            {/* Format Instructions */}
            <div className="space-y-3.5 text-xs text-zinc-400 border-t border-zinc-800/80 pt-4">
              <div className="flex gap-2.5">
                <IconInfoCircle className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-zinc-300">Format Rules</h4>
                  <ul className="list-disc pl-4 mt-1 space-y-1.5 text-zinc-500 text-[11px]">
                    <li><strong className="text-zinc-400">title</strong> and <strong className="text-zinc-400">description</strong> are mandatory fields.</li>
                    <li><strong className="text-zinc-400">difficulty</strong> defaults to Easy if omitted. Valid values: Easy, Medium, Hard.</li>
                    <li><strong className="text-zinc-400">tags</strong> can be separated by commas or semicolons.</li>
                    <li>In JSON, <strong className="text-zinc-400">test_cases</strong> is an array of objects.</li>
                    <li>In CSV Robust, <strong className="text-zinc-400">test_cases</strong> is a JSON-string array. Escape double quotes like <code className="text-zinc-300">""</code> inside quoted cells.</li>
                    <li>In CSV Simple, use columns <strong className="text-zinc-400">sample_input</strong> and <strong className="text-zinc-400">sample_output</strong> to quickly add a single sample test case.</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
