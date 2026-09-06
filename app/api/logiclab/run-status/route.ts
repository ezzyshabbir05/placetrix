import { NextResponse } from "next/server";
import { getUserProfile } from "@/lib/supabase/profile";

const decode = (str: string | null) => {
  if (!str) return "";
  try {
    return Buffer.from(str, "base64").toString("utf-8");
  } catch {
    return str;
  }
};

export async function POST(req: Request) {
  try {
    const profile = await getUserProfile();
    if (!profile) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { tokens, mode, line_offset = 0, sample_cases = [] } = body;

    if (!tokens || !Array.isArray(tokens) || tokens.length === 0) {
      return NextResponse.json({ success: false, error: "Missing submission tokens." }, { status: 400 });
    }

    const judge0Endpoint = process.env.NEXT_PUBLIC_JUDGE0_ENDPOINT || process.env.JUDGE0_ENDPOINT;
    if (!judge0Endpoint) {
      return NextResponse.json({ success: false, error: "Judge0 endpoint not configured." }, { status: 500 });
    }

    // ── Playground Mode ─────────────────────────────────────────────────────
    if (mode === "playground") {
      const token = tokens[0];
      const res = await fetch(`${judge0Endpoint}/submissions/${token}?base64_encoded=true`, {
        headers: { Accept: "application/json" },
      });

      if (!res.ok) {
        return NextResponse.json({ success: false, error: "Failed to query execution status." }, { status: 502 });
      }

      const result = await res.json();
      if (!result || result.status?.id <= 2) {
        return NextResponse.json({ completed: false });
      }

      return NextResponse.json({
        completed: true,
        success: result.status?.id === 3,
        status: result.status?.description || "Unknown",
        stdout: decode(result.stdout),
        stderr: decode(result.stderr),
        compile_output: decode(result.compile_output),
        time: result.time,
        memory: result.memory,
      });
    }

    // ── Problem Mode ────────────────────────────────────────────────────────
    const tokensStr = tokens.join(",");
    const batchGetUrl = `${judge0Endpoint}/submissions/batch?tokens=${tokensStr}&base64_encoded=true`;

    const statusRes = await fetch(batchGetUrl, {
      headers: { Accept: "application/json" },
    });

    if (!statusRes.ok) {
      return NextResponse.json({ success: false, error: "Failed to fetch status from Judge0." }, { status: 502 });
    }

    const statusData = await statusRes.json();
    const submissions = statusData?.submissions || [];

    const finished = submissions.filter((s: any) => s.status && s.status.id > 2);
    if (finished.length < tokens.length) {
      return NextResponse.json({
        completed: false,
        finished_count: finished.length,
        total_count: tokens.length,
      });
    }

    let passedCount = 0;
    let maxRuntime = 0;
    let maxMemory = 0;
    let overallStatus = "Accepted";
    let firstFailedResult: any = null;
    const testResults: any[] = [];

    for (let i = 0; i < sample_cases.length; i++) {
      const tc = sample_cases[i];
      const data = submissions[i] || {};
      let error = "";
      let consoleOutput = "";

      if (data.status?.id === 13) {
        error = "Internal Error in Judge0.";
      }

      if (!error && data.stdout) {
        const stdoutRaw = decode(data.stdout).trim();
        const errMatch = stdoutRaw.match(/@@@LOGICLAB_ERR_START@@@([\s\S]*?)@@@LOGICLAB_ERR_END@@@/);
        if (errMatch) {
          error = "Runtime Error: " + errMatch[1].trim();
          consoleOutput = stdoutRaw.replace(errMatch[0], "").trim();
        } else {
          const resMatch = stdoutRaw.match(/@@@LOGICLAB_RES_START@@@([\s\S]*?)@@@LOGICLAB_RES_END@@@/);
          if (resMatch) {
            data.stdout = Buffer.from(resMatch[1].trim()).toString("base64");
            consoleOutput = stdoutRaw.replace(resMatch[0], "").trim();
          } else {
            const lines = stdoutRaw.split("\n");
            if (lines.length > 0) {
              const lastLine = lines.pop() || "";
              data.stdout = Buffer.from(lastLine.trim()).toString("base64");
              consoleOutput = lines.join("\n").trim();
            }
          }
        }
      }

      if (data?.compile_output) {
        let compOut = decode(data.compile_output);
        if (line_offset > 0) {
          compOut = compOut.replace(/line (\d+)/g, (match: string, p1: string) => {
            const adjusted = Math.max(1, parseInt(p1, 10) - line_offset);
            return `line ${adjusted}`;
          });
          compOut = compOut.replace(/:(\d+):/g, (match: string, p1: string) => {
            const adjusted = Math.max(1, parseInt(p1, 10) - line_offset);
            return `:${adjusted}:`;
          });
        }
        data.compile_output = Buffer.from(compOut).toString("base64");
      }

      if (error) {
        if (overallStatus === "Accepted") overallStatus = "Runtime Error";
        const item = {
          index: i + 1,
          passed: false,
          input: tc.input,
          expected: tc.expected_output,
          actual: error,
          status: data.status || { id: 11, description: "Runtime Error" },
          time: "0.000",
          memory: "0",
          consoleOutput,
          stderr: decode(data.stderr),
          compile_output: decode(data.compile_output),
        };
        testResults.push(item);
        if (!firstFailedResult) firstFailedResult = item;
        continue;
      }

      const stdout = decode(data.stdout).trim();
      const expectedTrimmed = (tc.expected_output || "").trim();
      const statusId = data.status?.id || 0;
      const passed = statusId === 3 && (!expectedTrimmed || stdout === expectedTrimmed);

      const runtimeSec = parseFloat(data.time || "0");
      const runtimeMs = Math.round(runtimeSec * 1000);
      const memoryKb = parseInt(data.memory || "0", 10);

      if (runtimeMs > maxRuntime) maxRuntime = runtimeMs;
      if (memoryKb > maxMemory) maxMemory = memoryKb;

      if (passed) {
        passedCount++;
      } else if (overallStatus === "Accepted") {
        overallStatus = data.status?.description || "Wrong Answer";
      }

      const item = {
        index: i + 1,
        passed,
        input: tc.input,
        expected: expectedTrimmed,
        actual: stdout || decode(data.stderr) || decode(data.compile_output),
        status: data.status,
        time: runtimeSec.toFixed(3),
        memory: String(memoryKb),
        consoleOutput,
        stderr: decode(data.stderr),
        compile_output: decode(data.compile_output),
      };
      testResults.push(item);
      if (!passed && !firstFailedResult) firstFailedResult = item;
    }

    const isAllPassed = passedCount === sample_cases.length;

    return NextResponse.json({
      completed: true,
      success: isAllPassed,
      status: overallStatus,
      time: (maxRuntime / 1000).toFixed(3),
      memory: String(maxMemory),
      passed_count: passedCount,
      total_count: sample_cases.length,
      cases: testResults,
      results: testResults,
      first_failed: firstFailedResult,
    });
  } catch (err: any) {
    console.error("[api/logiclab/run-status] Error:", err);
    return NextResponse.json({ success: false, error: err.message || "Internal server error" }, { status: 500 });
  }
}
