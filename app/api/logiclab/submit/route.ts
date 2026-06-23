import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

interface TestCaseResult {
  index: number
  passed: boolean
  input: string
  expected: string
  actual: string
  status: { id: number; description: string }
  time: string
  memory: string
  consoleOutput?: string
}

function estimateInputSize(input: string): number {
  if (!input) return 0;
  const trimmed = input.trim();
  
  // Clean brackets and commas commonly used in array serializations
  const tokens = trimmed.split(/[\s,\[\]{}]+/);
  const validTokens = tokens.filter(t => t.length > 0);
  
  // If we have multiple elements (like an array/list), return the token count
  if (validTokens.length > 3) {
    return validTokens.length;
  }
  
  // For strings and single/double inputs, return the character length
  return trimmed.length;
}

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
    const { problem_id, code, language_id, daily_challenge_id } = await req.json()
    const supabase = (await createClient()) as any

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }
    const user_id = user.id

    if (!problem_id || !code || !language_id) {
      return NextResponse.json(
        { success: false, error: "Missing required fields: problem_id, code, language_id" },
        { status: 400 }
      )
    }

    let dailyChallengeDate: string | null = null
    if (daily_challenge_id) {
      const { data: dc } = await supabase
        .from("logiclab_daily_challenges")
        .select("date")
        .eq("id", daily_challenge_id)
        .single()
      if (dc) {
        dailyChallengeDate = dc.date
      }
    }

    // ── 1. SECURITY: Payload Size Check ──
    if (code.length > 50000) {
      return NextResponse.json(
        { success: false, error: "Code payload exceeds maximum size limit of 50KB." },
        { status: 400 }
      )
    }

    // ── 2. SECURITY: Basic Static Analysis / Blocklist ──
    const blocklistRegex = /(sys\.exit|os\.system|subprocess\.|exec\(|eval\(|__import__|java\.lang\.Runtime|java\.lang\.ProcessBuilder)/i
    if (blocklistRegex.test(code)) {
      return NextResponse.json(
        { success: false, error: "Security Exception: Blocked keyword or potentially destructive function detected in code." },
        { status: 403 }
      )
    }

    const judge0Endpoint = process.env.NEXT_PUBLIC_JUDGE0_ENDPOINT || process.env.JUDGE0_ENDPOINT || "http://187.127.171.46:2358"

    // 1. Fetch problem data (driver code + time/memory limits + test cases)
    const { getCachedProblemExecutionData } = await import("@/app/(dashboard)/logiclab/actions")
    const problemData = await getCachedProblemExecutionData(problem_id)

    if (!problemData) {
      throw new Error("Problem not found or could not be loaded from cache.")
    }

    const problem = problemData as any
    let driverCodes: any = problem.driver_codes || {}
    if (typeof driverCodes === "string") {
      try {
        driverCodes = JSON.parse(driverCodes)
      } catch (e) {
        console.error("Failed to parse driver_codes as JSON:", e)
        driverCodes = {}
      }
    }
    const langKey = String(language_id)
    const driverCode = driverCodes[langKey] || ""
    const timeLimit = Math.min(problem.time_limit || 2.0, 15.0)
    const memoryLimit = Math.min((problem.memory_limit || 256) * 1024, 512000) // Convert MB to KB for Judge0, cap at 512000
    console.log(`[Submit Route] Calculated limits: time=${timeLimit}, memory=${memoryLimit} for problem_id=${problem_id}`);

    // 2. Load test cases from embedded JSONB array
    let testCases: any[] = problem.test_cases || []
    if (typeof testCases === "string") {
      try {
        testCases = JSON.parse(testCases)
      } catch (e) {
        testCases = []
      }
    }

    if (!testCases.length) {
      return NextResponse.json(
        { success: false, error: "No test cases found for this problem." },
        { status: 400 }
      )
    }

    // 3. Merge user code with driver code
    let finalSource = code
    let lineOffset = 0
    if (driverCode) {
      if (langKey === "62") { // Java
        const lines = driverCode.split("\n")
        const imports = lines.filter((line: string) => line.trim().startsWith("import "))
        const nonImports = lines.filter((line: string) => !line.trim().startsWith("import "))
        lineOffset = 2 + imports.length + 2
        finalSource = "import java.util.*;\nimport java.io.*;\n" + imports.join("\n") + "\n\n" + code + "\n\n" + nonImports.join("\n")
      } else if (langKey === "71") { // Python
        const merged = code + "\n\n" + driverCode
        lineOffset = 6
        finalSource = "from __future__ import annotations\nimport sys\nimport json\nimport math\nimport collections\nfrom typing import *\n" + merged
      } else if (langKey === "54") { // C++
        const lines = driverCode.split("\n")
        const includes = lines.filter((line: string) => line.trim().startsWith("#include") || line.trim().startsWith("using "))
        const nonIncludes = lines.filter((line: string) => !line.trim().startsWith("#include") && !line.trim().startsWith("using "))
        lineOffset = 16 + includes.length + 2
        finalSource = "#include <iostream>\n#include <vector>\n#include <string>\n#include <algorithm>\n#include <map>\n#include <set>\n#include <unordered_map>\n#include <unordered_set>\n#include <queue>\n#include <stack>\n#include <cmath>\n#include <climits>\n#include <limits>\n#include <numeric>\n#include <utility>\nusing namespace std;\n" + includes.join("\n") + "\n\n" + code + "\n\n" + nonIncludes.join("\n")
      } else {
        finalSource = code + "\n\n" + driverCode
      }
    }
    const encodedSource = Buffer.from(finalSource).toString("base64")

    // 4. Execute against each test case
    const results: TestCaseResult[] = []
    let overallStatus = "Accepted"
    let totalTime = 0
    let maxMemory = 0
    let passedCount = 0
    let failedInfo: any = null

    const decode = (str: string | null) => {
      if (!str) return ""
      try {
        return Buffer.from(str, "base64").toString("utf-8")
      } catch {
        return str
      }
    }

    const pLimit = (await import('p-limit')).default
    const limit = pLimit(2) // 2 concurrent requests to prevent dropping connections

    const runTestCase = async (tc: any, i: number) => {
      const encodedStdin = Buffer.from(tc.input || "").toString("base64")
      let retries = 3
      let delay = 500

      while (retries > 0) {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 15000)

        try {
          const response = await fetch(
            `${judge0Endpoint}/submissions?wait=true&base64_encoded=true`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Accept: "application/json",
              },
              body: JSON.stringify({
                source_code: encodedSource,
                language_id,
                stdin: encodedStdin,
                cpu_time_limit: timeLimit,
                memory_limit: memoryLimit,
              }),
              signal: controller.signal,
            }
          )
          clearTimeout(timeoutId)

          const textResponse = await response.text()
          let data
          try {
            data = JSON.parse(textResponse)
          } catch {
            return { index: i + 1, tc, error: "Judge0 service error (invalid JSON response)." }
          }

          if (!response.ok) {
            if (response.status === 429 || response.status >= 500) {
              retries--
              if (retries > 0) {
                await new Promise((resolve) => setTimeout(resolve, delay))
                delay *= 2
                continue
              }
            }
            return { index: i + 1, tc, error: `Judge0 error: ${data.error || response.statusText}` }
          }

          return { index: i + 1, tc, data }
        } catch (err: any) {
          clearTimeout(timeoutId)
          retries--
          if (retries > 0) {
            await new Promise((resolve) => setTimeout(resolve, delay))
            delay *= 2
            continue
          }
          if (err.name === 'AbortError') {
            return { index: i + 1, tc, error: "Judge0 service timed out." }
          }
          return { index: i + 1, tc, error: err.message }
        }
      }
      return { index: i + 1, tc, error: "Unknown execution error" }
    }

    const testCasePromises = testCases.map((tc, i) => limit(() => runTestCase(tc, i)))
    const executedResults = await Promise.all(testCasePromises)

    executedResults.sort((a, b) => a.index - b.index)

    for (const execution of executedResults) {
      let { index, tc, error, data } = execution
      let consoleOutput = ""

      if (!error && data?.stdout) {
        const stdoutRaw = decode(data.stdout).trim()
        
        const errMatch = stdoutRaw.match(/@@@LOGICLAB_ERR_START@@@([\s\S]*?)@@@LOGICLAB_ERR_END@@@/)
        if (errMatch) {
          error = "Runtime Error: " + errMatch[1].trim()
          consoleOutput = stdoutRaw.replace(errMatch[0], "").trim()
        } else {
          const resMatch = stdoutRaw.match(/@@@LOGICLAB_RES_START@@@([\s\S]*?)@@@LOGICLAB_RES_END@@@/)
          if (resMatch) {
            data.stdout = Buffer.from(resMatch[1].trim()).toString("base64")
            consoleOutput = stdoutRaw.replace(resMatch[0], "").trim()
          } else {
            // Fallback
            const lines = stdoutRaw.split('\n');
              if (lines.length > 0) {
                const lastLine = lines.pop() || "";
                data.stdout = Buffer.from(lastLine.trim()).toString("base64")
                consoleOutput = lines.join('\n').trim();
              } else {
                data.stdout = Buffer.from("").toString("base64");
                consoleOutput = stdoutRaw;
              } 
          }
        }
      }

      if (error) {
        overallStatus = "Runtime Error"
        failedInfo = { index, input: tc.input, expected: tc.expected_output, actual: error, console_output: consoleOutput }
        break
      }

      const stdout = decode(data.stdout).trim()
      const expectedTrimmed = (tc.expected_output || "").trim()
      const statusId = data.status?.id || 0
      const statusDesc = data.status?.description || "Unknown"

      const metrics = getDeterministicMetrics(code, language_id)
      const tcMemory = (data && data.memory !== null && data.memory !== undefined)
        ? Math.round(parseFloat(data.memory))
        : metrics.memoryKb
      const tcTime = (data && data.time !== null && data.time !== undefined)
        ? parseFloat(data.time)
        : (metrics.timeMs / 1000)

      const tcResult: TestCaseResult = {
        index,
        passed: false,
        input: tc.input,
        expected: expectedTrimmed,
        actual: stdout,
        status: { id: statusId, description: statusDesc },
        time: tcTime.toFixed(3),
        memory: String(tcMemory),
        consoleOutput
      }

      if (statusId === 3) {
        if (stdout === expectedTrimmed) {
          tcResult.passed = true
          passedCount++
        } else {
          tcResult.passed = false
          overallStatus = "Wrong Answer"
          if (!failedInfo) {
            failedInfo = {
              index,
              input: tc.input,
              expected: expectedTrimmed,
              actual: stdout,
              console_output: consoleOutput
            }
          }
        }
      } else if (statusId === 5 || statusDesc.toLowerCase().includes("time limit")) {
        overallStatus = "Time Limit Exceeded"
        if (!failedInfo) failedInfo = { index, input: tc.input, expected: expectedTrimmed, actual: `TLE (${statusDesc})`, console_output: consoleOutput }
      } else if (statusId === 6) {
        overallStatus = "Compile Error"
        if (!failedInfo) failedInfo = { index, input: tc.input, expected: expectedTrimmed, actual: decode(data.compile_output) }
        break 
      } else if (statusDesc.toLowerCase().includes("memory limit") || statusId === 12 && statusDesc.includes("Memory")) {
        overallStatus = "Memory Limit Exceeded"
        if (!failedInfo) failedInfo = { index, input: tc.input, expected: expectedTrimmed, actual: `MLE (${statusDesc})`, console_output: consoleOutput }
      } else {
        overallStatus = "Runtime Error"
        if (!failedInfo) failedInfo = { index, input: tc.input, expected: expectedTrimmed, actual: decode(data.stderr) || statusDesc, console_output: consoleOutput }
      }

      totalTime = Math.max(totalTime, parseFloat(tcResult.time))
      maxMemory = Math.max(maxMemory, tcMemory)

      results.push(tcResult)
      if (statusId === 6) break
    }

    // If all passed
    if (passedCount === testCases.length) {
      overallStatus = "Accepted"
    }

    // Estimate and format time series
    const timeSeriesData = results.map((r, idx) => ({
      index: r.index,
      inputSize: estimateInputSize(testCases[idx]?.input || r.input),
      time: Math.round(parseFloat(r.time) * 1000), // convert seconds to milliseconds
      memory: Math.round(parseFloat(r.memory)), // in KB
      passed: r.passed
    }))

    // 5. Save submission to database
    const submission: any = {
      problem_id,
      user_id,
      code: overallStatus === "Accepted" ? code : "",
      language_id,
      status: overallStatus,
      runtime: parseFloat(totalTime.toFixed(3)),
      memory: parseFloat((maxMemory / 1024).toFixed(1)),
      passed_count: passedCount,
      total_count: testCases.length,
      failed_test_case_info: overallStatus === "Accepted" ? { time_series: timeSeriesData } : failedInfo,
    }

    let savedSubmission = null
    let saveError = null

    if (daily_challenge_id) {
      submission.daily_challenge_id = daily_challenge_id
      const fallbackIst = new Date(new Date().getTime() + 5.5 * 60 * 60 * 1000)
      submission.date = dailyChallengeDate || fallbackIst.toISOString().split("T")[0]

      const { data: saved, error: sErr } = await (supabase as any)
        .from("logiclab_daily_challenge_submissions")
        .insert(submission)
        .select("id")
        .single()
      
      savedSubmission = saved || null
      saveError = sErr
    } else {
      const { data: saved, error: sErr } = await (supabase as any)
        .from("logiclab_problem_submissions")
        .insert(submission)
        .select("id")
        .single()
      
      savedSubmission = saved || null
      saveError = sErr
    }

    if (saveError) {
      console.error("[LogicLab Submit] Failed to save submission:", saveError.message)
    }

    const sampleCases = results.filter((r, idx) => testCases[idx]?.is_sample || testCases[idx]?.isSample)

    // Revalidate paths to update the streak and completion status instantly
    if (overallStatus === "Accepted") {
      revalidatePath("/logiclab")
      revalidatePath(`/logiclab/problems/${problem_id}`)
      if (daily_challenge_id) {
        revalidatePath(`/logiclab/dailychallenges/${daily_challenge_id}`)
        revalidatePath("/logiclab/dailychallenges")
      }
    }

    return NextResponse.json({
      success: overallStatus === "Accepted",
      status: overallStatus,
      passed_count: passedCount,
      total_count: testCases.length,
      runtime: parseFloat(totalTime.toFixed(3)),
      memory: parseFloat((maxMemory / 1024).toFixed(1)),
      failed_test_case_info: overallStatus === "Accepted" ? { time_series: timeSeriesData } : failedInfo,
      submission_id: savedSubmission?.id || null,
      save_error: saveError?.message || null,
      lineOffset,
      time_series: timeSeriesData,
      cases: sampleCases.map((sc) => ({
        index: sc.index,
        passed: sc.passed,
        input: sc.input,
        expected: sc.expected,
        actual: sc.actual,
        status: sc.status,
        time: sc.time,
        memory: sc.memory,
        console_output: sc.consoleOutput
      }))
    })
  } catch (error: any) {
    console.error("[LogicLab Submit] Request failed:", error)
    return NextResponse.json(
      { success: false, error: error?.message || "Internal server error during submission." },
      { status: 500 }
    )
  }
}

// Force rebuild
