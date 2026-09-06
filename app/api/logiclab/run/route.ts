import { NextResponse } from "next/server";
import { getUserProfile } from "@/lib/supabase/profile";
import { getCachedProblemExecutionData } from "@/lib/supabase/cached-queries";
import { rateLimit } from "@/lib/rate-limit";
import { validateSubmissionSecurity, getJudge0SandboxConfig } from "@/lib/sandbox/securityCheck";

const ALLOWED_LANGUAGE_IDS = new Set([54, 62, 63, 71]);

function getLanguagePrelude(langKey: string, source_code: string, driverCode: string): string {
  const combined = source_code + "\n" + driverCode;
  if (langKey === "62") {
    let prelude = "";
    if (!combined.includes("class ListNode")) {
      prelude += "class ListNode { int val; ListNode next; ListNode() {} ListNode(int val) { this.val = val; } ListNode(int val, ListNode next) { this.val = val; this.next = next; } }\n";
    }
    if (!combined.includes("class TreeNode")) {
      prelude += "class TreeNode { int val; TreeNode left; TreeNode right; TreeNode() {} TreeNode(int val) { this.val = val; } TreeNode(int val, TreeNode left, TreeNode right) { this.val = val; this.left = left; this.right = right; } }\n";
    }
    return prelude;
  }
  if (langKey === "71") {
    let prelude = "";
    if (!combined.includes("class ListNode")) {
      prelude += "class ListNode:\n    def __init__(self, val=0, next=None):\n        self.val = val\n        self.next = next\n";
    }
    if (!combined.includes("class TreeNode")) {
      prelude += "class TreeNode:\n    def __init__(self, val=0, left=None, right=None):\n        self.val = val\n        self.left = left\n        self.right = right\n";
    }
    return prelude;
  }
  if (langKey === "54") {
    let prelude = "";
    if (!combined.includes("struct ListNode") && !combined.includes("class ListNode")) {
      prelude += "struct ListNode { int val; ListNode *next; ListNode() : val(0), next(nullptr) {} ListNode(int x) : val(x), next(nullptr) {} ListNode(int x, ListNode *next) : val(x), next(next) {} };\n";
    }
    if (!combined.includes("struct TreeNode") && !combined.includes("class TreeNode")) {
      prelude += "struct TreeNode { int val; TreeNode *left; TreeNode *right; TreeNode() : val(0), left(nullptr), right(nullptr) {} TreeNode(int x) : val(x), left(nullptr), right(nullptr) {} TreeNode(int x, TreeNode *left, TreeNode *right) : val(x), left(left), right(right) {} };\n";
    }
    return prelude;
  }
  return "";
}

export async function POST(req: Request) {
  try {
    const profile = await getUserProfile();
    if (!profile) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    let { source_code, language_id, stdin, problem_id, mode, custom_cases, custom_expected } = body;

    if (source_code) {
      source_code = source_code.replace(/[\u00A0\u200B]/g, " ");
    }

    if (!ALLOWED_LANGUAGE_IDS.has(Number(language_id))) {
      return NextResponse.json(
        { success: false, error: `Unsupported language_id: ${language_id}.` },
        { status: 400 }
      );
    }

    const rl = rateLimit("run", profile.id, 30, 60_000);
    if (!rl.success) {
      return NextResponse.json(
        { success: false, error: `Rate limit exceeded. Please wait ${Math.ceil(rl.resetInMs / 1000)}s before running again.` },
        { status: 429 }
      );
    }

    if (!source_code || source_code.length > 50000) {
      return NextResponse.json(
        { success: false, error: "Code payload exceeds maximum size limit of 50KB." },
        { status: 400 }
      );
    }

    const secCheck = validateSubmissionSecurity(source_code, language_id);
    if (!secCheck.valid) {
      return NextResponse.json(
        { success: false, error: `Security Exception: ${secCheck.reason}` },
        { status: 400 }
      );
    }

    const judge0Endpoint = process.env.NEXT_PUBLIC_JUDGE0_ENDPOINT || process.env.JUDGE0_ENDPOINT;
    if (!judge0Endpoint) {
      return NextResponse.json(
        { success: false, error: "Judge0 endpoint not configured in environment variables." },
        { status: 500 }
      );
    }

    // ── Single Execution Mode (Playground) ──────────────────────────────────
    if (mode !== "problem" || !problem_id) {
      const sandboxConfig = getJudge0SandboxConfig(5.0, 256000);
      const submissionPayload = {
        source_code: Buffer.from(source_code).toString("base64"),
        language_id,
        stdin: Buffer.from(stdin || "").toString("base64"),
        ...sandboxConfig,
      };

      const response = await fetch(`${judge0Endpoint}/submissions?base64_encoded=true`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(submissionPayload),
      });

      if (!response.ok) {
        return NextResponse.json({ success: false, error: "Failed to submit execution to Judge0." }, { status: 502 });
      }

      const resData = await response.json();
      return NextResponse.json({
        success: true,
        mode: "playground",
        tokens: [resData.token],
        total_count: 1,
      });
    }

    // ── Problem Mode (Batch Submission) ─────────────────────────────────────
    const problemData = (await getCachedProblemExecutionData(problem_id)) as any;
    if (!problemData) {
      return NextResponse.json({ success: false, error: "Problem not found or could not be loaded." }, { status: 404 });
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
      return NextResponse.json({ success: false, error: `Driver code missing for language ${langKey}.` }, { status: 400 });
    }

    let lineOffset = 0;
    let finalSource = source_code;
    const prelude = getLanguagePrelude(langKey, source_code, driverCode);

    if (langKey === "62") {
      const lines = driverCode.split("\n");
      const imports = lines.filter((line: string) => line.trim().startsWith("import "));
      const nonImports = lines.filter((line: string) => !line.trim().startsWith("import "));
      lineOffset = 2 + imports.length + 2;
      finalSource = "import java.util.*;\nimport java.io.*;\n" + imports.join("\n") + "\n\n" + prelude + "\n" + source_code + "\n\n" + nonImports.join("\n");
    } else if (langKey === "71") {
      const merged = prelude + "\n" + source_code + "\n\n" + driverCode;
      lineOffset = 6;
      finalSource = "from __future__ import annotations\nimport sys\nimport json\nimport math\nimport collections\nfrom typing import *\n" + merged;
    } else if (langKey === "54") {
      const lines = driverCode.split("\n");
      const includes = lines.filter((line: string) => line.trim().startsWith("#include") || line.trim().startsWith("using "));
      const nonIncludes = lines.filter((line: string) => !line.trim().startsWith("#include") && !line.trim().startsWith("using "));
      lineOffset = 16 + includes.length + 2;
      finalSource = "#include <iostream>\n#include <vector>\n#include <string>\n#include <algorithm>\n#include <map>\n#include <set>\n#include <unordered_map>\n#include <unordered_set>\n#include <queue>\n#include <stack>\n#include <cmath>\n#include <climits>\n#include <limits>\n#include <numeric>\n#include <utility>\nusing namespace std;\n" + includes.join("\n") + "\n\n" + prelude + "\n" + source_code + "\n\n" + nonIncludes.join("\n");
    } else {
      finalSource = prelude + "\n" + source_code + "\n\n" + driverCode;
    }

    let testCases: any[] = problemData.test_cases || [];
    if (typeof testCases === "string") {
      try { testCases = JSON.parse(testCases); } catch { testCases = []; }
    }
    let sampleTestCases = testCases.filter((tc: any) => tc.is_sample || tc.isSample);
    if (sampleTestCases.length === 0 && testCases.length > 0) sampleTestCases = [testCases[0]];

    if (Array.isArray(custom_cases) && custom_cases.length > 0) {
      sampleTestCases = custom_cases.map((customInput, idx) => {
        const originalTc = sampleTestCases[idx] || {};
        const expected = (Array.isArray(custom_expected) && idx < custom_expected.length) ? custom_expected[idx] : undefined;
        return {
          ...originalTc,
          input: customInput,
          expected_output: expected !== undefined ? expected : originalTc.expected_output,
          is_sample: true,
        };
      });
    }

    const sandboxConfig = getJudge0SandboxConfig(timeLimit, memoryLimit);
    const encodedSource = Buffer.from(finalSource).toString("base64");
    const batchPayload = {
      submissions: sampleTestCases.map((tc: any) => ({
        source_code: encodedSource,
        language_id,
        stdin: Buffer.from(tc.input || "").toString("base64"),
        ...sandboxConfig,
      })),
    };

    const batchResponse = await fetch(`${judge0Endpoint}/submissions/batch?base64_encoded=true`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(batchPayload),
    });

    if (!batchResponse.ok) {
      return NextResponse.json({ success: false, error: "Failed to submit batch to Judge0." }, { status: 502 });
    }

    const batchTokens = await batchResponse.json();
    if (!Array.isArray(batchTokens) || batchTokens.length !== sampleTestCases.length) {
      return NextResponse.json({ success: false, error: "Invalid token count returned from Judge0." }, { status: 502 });
    }

    const tokens = batchTokens.map((t: any) => t.token);

    return NextResponse.json({
      success: true,
      mode: "problem",
      tokens,
      problem_id,
      language_id,
      line_offset: lineOffset,
      sample_cases: sampleTestCases,
    });
  } catch (err: any) {
    console.error("[api/logiclab/run] Error:", err);
    return NextResponse.json({ success: false, error: err.message || "Internal server error" }, { status: 500 });
  }
}
