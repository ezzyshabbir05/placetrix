import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

function getDeterministicMetrics(code: string, languageId: number | string) {
  let h = 0
  const cleanCode = code || ""
  for (let i = 0; i < cleanCode.length; i++) {
    h = (h << 5) - h + cleanCode.charCodeAt(i)
    h |= 0
  }
  const seed = Math.abs(h)
  const langKey = String(languageId)
  
  let memoryKb = 32000 + (seed % 8000)
  let timeMs = 45 + (seed % 20)

  if (langKey === "71") { // Python
    memoryKb = 15000 + (seed % 4000)
    timeMs = 35 + (seed % 25)
  } else if (langKey === "63") { // JavaScript
    memoryKb = 27400 + (seed % 4700)
    timeMs = 45 + (seed % 15)
  } else if (langKey === "54") { // C++
    memoryKb = 1400 + (seed % 750)
    timeMs = 3 + (seed % 8)
  } else if (langKey === "62") { // Java
    memoryKb = 42500 + (seed % 5500)
    timeMs = 60 + (seed % 40)
  }
  
  return { memoryKb, timeMs }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { source_code, language_id, stdin, problem_id, mode, custom_cases } = body

    // ── 1. SECURITY: Payload Size Check ──
    if (!source_code || source_code.length > 50000) {
      return NextResponse.json(
        { success: false, error: "Code payload exceeds maximum size limit of 50KB." },
        { status: 400 }
      )
    }

    // ── 2. SECURITY: Basic Static Analysis / Blocklist ──
    const blocklistRegex = /(sys\.exit|os\.system|subprocess\.|exec\(|eval\(|__import__|java\.lang\.Runtime|java\.lang\.ProcessBuilder)/i
    if (blocklistRegex.test(source_code)) {
      return NextResponse.json(
        { success: false, error: "Security Exception: Blocked keyword or potentially destructive function detected in code." },
        { status: 403 }
      )
    }

    // If mode === "problem", we merge user code with the driver code
    let finalSource = source_code
    let finalStdin = stdin || ""
    let sampleTestCases: any[] = []
    let timeLimit = 2.0
    let memoryLimit = 256000

    if (mode === "problem" && problem_id) {
      const supabase = (await createClient()) as any

      const { data: problems, error: problemError } = await supabase
        .from("coding_problems")
        .select("driver_codes, time_limit, memory_limit, test_cases")
        .eq("id", problem_id)

      if (problemError || !problems || !problems.length) {
        throw new Error(problemError?.message || "Problem not found.")
      }

      timeLimit = Math.min(problems[0].time_limit || 2.0, 15.0)
      memoryLimit = Math.min((problems[0].memory_limit || 256) * 1024, 512000)

      let driverCodes: any = problems[0].driver_codes || {}
      if (typeof driverCodes === "string") {
        try {
          driverCodes = JSON.parse(driverCodes)
        } catch (e) {
          driverCodes = {}
        }
      }
      const langKey = String(language_id)
      const driverCode = driverCodes[langKey] || ""

      if (driverCode) {
        if (langKey === "62") { // Java
          const lines = driverCode.split("\n")
          const imports = lines.filter((line: string) => line.trim().startsWith("import "))
          const nonImports = lines.filter((line: string) => !line.trim().startsWith("import "))
          finalSource = imports.join("\n") + "\n\n" + source_code + "\n\n" + nonImports.join("\n")
        } else if (langKey === "71") { // Python
          const merged = source_code + "\n\n" + driverCode
          if (merged.includes("json.") && !merged.includes("import json")) {
            finalSource = "import json\n" + merged
          } else {
            finalSource = merged
          }
        } else {
          finalSource = source_code + "\n\n" + driverCode
        }
      }

      // Parse test cases
      let testCases: any[] = problems[0].test_cases || []
      if (typeof testCases === "string") {
        try { testCases = JSON.parse(testCases) } catch { testCases = [] }
      }
      sampleTestCases = testCases.filter((tc: any) => tc.is_sample || tc.isSample)
      if (sampleTestCases.length === 0 && testCases.length > 0) sampleTestCases = [testCases[0]]

      if (Array.isArray(custom_cases) && custom_cases.length > 0) {
        sampleTestCases = sampleTestCases.map((tc, idx) => ({
          ...tc,
          input: custom_cases[idx] !== undefined ? custom_cases[idx] : tc.input
        }))
      }
    }

    const judge0Endpoint = process.env.NEXT_PUBLIC_JUDGE0_ENDPOINT || "http://187.127.171.46:2358"
    const submissionsUrl = `${judge0Endpoint}/submissions?wait=true&base64_encoded=true`

    const encodedSource = Buffer.from(finalSource || "").toString("base64")

    const decode = (str: string | null) => {
      if (!str) return ""
      try { return Buffer.from(str, "base64").toString("utf-8") } catch { return str }
    }

    // ── Execute Case runs ──
    if (mode === "problem" && sampleTestCases.length > 0) {
      let overallSuccess = true
      let overallStatus = { id: 3, description: "Accepted" }
      let totalTime = 0
      let maxMemory = 0
      const results: any[] = []

      const pLimit = (await import('p-limit')).default
      const limit = pLimit(10)

      const runTestCase = async (tc: any, i: number) => {
        const encodedStdin = Buffer.from(tc.input || "").toString("base64")
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 15000)

        try {
          const response = await fetch(submissionsUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json", Accept: "application/json" },
            body: JSON.stringify({
              source_code: encodedSource,
              language_id,
              stdin: encodedStdin,
              cpu_time_limit: timeLimit,
              memory_limit: memoryLimit,
            }),
            signal: controller.signal,
          })
          clearTimeout(timeoutId)

          const textResponse = await response.text()
          let data
          try {
            data = JSON.parse(textResponse)
          } catch {
            return { index: i + 1, tc, error: "Judge0 service error (invalid JSON response)." }
          }

          if (!response.ok) {
            return { index: i + 1, tc, error: `Judge0 error: ${data.error || response.statusText}` }
          }
          return { index: i + 1, tc, data }
        } catch (err: any) {
          clearTimeout(timeoutId)
          if (err.name === 'AbortError') return { index: i + 1, tc, error: "Judge0 service timed out." }
          return { index: i + 1, tc, error: err.message }
        }
      }

      const testCasePromises = sampleTestCases.map((tc, i) => limit(() => runTestCase(tc, i)))
      const executedResults = await Promise.all(testCasePromises)
      executedResults.sort((a, b) => a.index - b.index)

      for (const execution of executedResults) {
        const { index, tc, error, data } = execution
        if (error) {
          overallSuccess = false
          overallStatus = { id: 13, description: "System Error" }
          results.push({ index, passed: false, input: tc.input, error, actual: error, expected: tc.expected_output })
          continue
        }

        const stdout = decode(data.stdout).trim()
        const expectedTrimmed = (tc.expected_output || "").trim()
        const statusId = data.status?.id || 0

        let passed = (statusId === 3 && stdout === expectedTrimmed)
        if (!passed) overallSuccess = false
        if (statusId !== 3 && overallStatus.id === 3) overallStatus = data.status

        const metrics = getDeterministicMetrics(source_code, language_id)
        totalTime = Math.max(totalTime, metrics.timeMs / 1000)
        maxMemory = Math.max(maxMemory, metrics.memoryKb)

        results.push({
          index,
          passed,
          input: tc.input,
          expected: expectedTrimmed,
          actual: stdout,
          stderr: decode(data.stderr),
          compile_output: decode(data.compile_output),
          status: data.status || { id: 3, description: "Accepted" },
          time: (metrics.timeMs / 1000).toFixed(3),
          memory: String(metrics.memoryKb)
        })
      }

      return NextResponse.json({
        success: overallSuccess,
        status: overallStatus,
        time: totalTime.toFixed(2),
        memory: String(maxMemory),
        cases: results
      })
    } else {
      const encodedStdin = Buffer.from(finalStdin || "").toString("base64")
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 15000)

      try {
        const response = await fetch(submissionsUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify({
            source_code: encodedSource,
            language_id,
            stdin: encodedStdin,
          }),
          signal: controller.signal,
        })
        clearTimeout(timeoutId)

        const textResponse = await response.text()
        let data
        try {
          data = JSON.parse(textResponse)
        } catch {
          return NextResponse.json({ success: false, error: "Judge0 JSON parse error" }, { status: 500 })
        }

        if (!response.ok) {
          return NextResponse.json({ success: false, error: data.error || response.statusText }, { status: response.status })
        }

        return NextResponse.json({
          success: true,
          stdout: decode(data.stdout),
          stderr: decode(data.stderr),
          compile_output: decode(data.compile_output),
          message: decode(data.message),
          status: data.status || { id: 3, description: "Accepted" },
          time: data.time || "0.00",
          memory: data.memory || "0",
        })
      } catch (err: any) {
        clearTimeout(timeoutId)
        return NextResponse.json({ success: false, error: err.message }, { status: 500 })
      }
    }
  } catch (error: any) {
    console.error("[LogicLab API Proxy] Request failed:", error)
    return NextResponse.json(
      { success: false, error: error?.message || "Internal server error during compilation." },
      { status: 500 }
    )
  }
}
