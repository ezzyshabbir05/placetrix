import { NextResponse } from "next/server";
import { getUserProfile } from "@/lib/supabase/profile";
import { getCachedProblemExecutionData } from "@/lib/supabase/cached-queries";
import { rateLimit } from "@/lib/rate-limit";

const ALLOWED_LANGUAGE_IDS = new Set([54, 62, 63, 71]);

export async function POST(req: Request) {
  try {
    const profile = await getUserProfile();
    if (!profile) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { problem_id, code, language_id, daily_challenge_id } = body;

    if (!problem_id || !code || !language_id) {
      return NextResponse.json(
        { success: false, error: "Missing required fields: problem_id, code, language_id" },
        { status: 400 }
      );
    }

    if (!ALLOWED_LANGUAGE_IDS.has(Number(language_id))) {
      return NextResponse.json(
        { success: false, error: `Unsupported language_id: ${language_id}` },
        { status: 400 }
      );
    }

    const rl = rateLimit("submit", profile.id, 10, 60_000);
    if (!rl.success) {
      return NextResponse.json(
        { success: false, error: `Rate limit exceeded. Please wait ${Math.ceil(rl.resetInMs / 1000)}s before submitting again.` },
        { status: 429 }
      );
    }

    if (code.length > 50000) {
      return NextResponse.json(
        { success: false, error: "Code payload exceeds maximum size limit of 50KB." },
        { status: 400 }
      );
    }

    const blocklistRegex = /(sys\.exit|os\.system|subprocess\.|exec\(|eval\(|__import__|java\.lang\.Runtime|java\.lang\.ProcessBuilder)/i;
    if (blocklistRegex.test(code)) {
      return NextResponse.json(
        { success: false, error: "Security Exception: Blocked keyword or potentially destructive function detected." },
        { status: 400 }
      );
    }

    const problemData = (await getCachedProblemExecutionData(problem_id)) as any;
    if (!problemData) {
      return NextResponse.json(
        { success: false, error: "Problem execution data could not be loaded." },
        { status: 404 }
      );
    }

    const timeLimit = Math.min(problemData.time_limit || 2.0, 15.0);
    const memoryLimit = Math.min((problemData.memory_limit || 256) * 1024, 512000);

    let driverCodes: any = problemData.driver_codes || {};
    if (typeof driverCodes === "string") {
      try { driverCodes = JSON.parse(driverCodes); } catch { driverCodes = {}; }
    }
    const langKey = String(language_id);
    const driverCode = driverCodes[langKey] || "";
    if (!driverCode) {
      return NextResponse.json(
        { success: false, error: `Execution engine error: Driver code missing for language ${langKey}.` },
        { status: 400 }
      );
    }

    let finalSource = code;
    if (langKey === "62") {
      const lines = driverCode.split("\n");
      const imports = lines.filter((line: string) => line.trim().startsWith("import "));
      const nonImports = lines.filter((line: string) => !line.trim().startsWith("import "));
      finalSource = "import java.util.*;\nimport java.io.*;\n" + imports.join("\n") + "\n\n" + code + "\n\n" + nonImports.join("\n");
    } else if (langKey === "71") {
      finalSource = "from __future__ import annotations\nimport sys\nimport json\nimport math\nimport collections\nfrom typing import *\n" + code + "\n\n" + driverCode;
    } else if (langKey === "54") {
      const lines = driverCode.split("\n");
      const includes = lines.filter((line: string) => line.trim().startsWith("#include") || line.trim().startsWith("using "));
      const nonIncludes = lines.filter((line: string) => !line.trim().startsWith("#include") && !line.trim().startsWith("using "));
      finalSource = "#include <iostream>\n#include <vector>\n#include <string>\n#include <algorithm>\n#include <map>\n#include <set>\n#include <unordered_map>\n#include <unordered_set>\n#include <queue>\n#include <stack>\n#include <cmath>\n#include <climits>\n#include <limits>\n#include <numeric>\n#include <utility>\nusing namespace std;\n" + includes.join("\n") + "\n\n" + code + "\n\n" + nonIncludes.join("\n");
    } else {
      finalSource = code + "\n\n" + driverCode;
    }

    let testCases: any[] = problemData.test_cases || [];
    if (typeof testCases === "string") {
      try { testCases = JSON.parse(testCases); } catch { testCases = []; }
    }
    if (!testCases || testCases.length === 0) {
      return NextResponse.json(
        { success: false, error: "Submission failed: Problem has no test cases configured." },
        { status: 400 }
      );
    }

    const judge0Endpoint = process.env.NEXT_PUBLIC_JUDGE0_ENDPOINT || process.env.JUDGE0_ENDPOINT;
    if (!judge0Endpoint) {
      return NextResponse.json(
        { success: false, error: "Judge0 endpoint is not configured in environment variables." },
        { status: 500 }
      );
    }

    const encodedSource = Buffer.from(finalSource).toString("base64");
    const batchPayload = {
      submissions: testCases.map((tc: any) => ({
        source_code: encodedSource,
        language_id,
        stdin: Buffer.from(tc.input || "").toString("base64"),
        cpu_time_limit: timeLimit,
        memory_limit: memoryLimit,
      })),
    };

    const batchResponse = await fetch(`${judge0Endpoint}/submissions/batch?base64_encoded=true`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(batchPayload),
    });

    if (!batchResponse.ok) {
      const errText = await batchResponse.text();
      return NextResponse.json(
        { success: false, error: `Failed to submit batch to Judge0: ${errText}` },
        { status: 502 }
      );
    }

    const batchTokens = await batchResponse.json();
    if (!Array.isArray(batchTokens) || batchTokens.length !== testCases.length) {
      return NextResponse.json(
        { success: false, error: "Invalid token count returned from Judge0" },
        { status: 502 }
      );
    }

    const tokens = batchTokens.map((t: any) => t.token);

    return NextResponse.json({
      success: true,
      tokens,
      total_count: testCases.length,
      problem_id,
      language_id,
      daily_challenge_id: daily_challenge_id || null,
    });
  } catch (err: any) {
    console.error("[api/logiclab/submit] Error:", err);
    return NextResponse.json({ success: false, error: err.message || "Internal server error" }, { status: 500 });
  }
}
