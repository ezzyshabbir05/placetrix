import { NextResponse } from "next/server";
import { getUserProfile } from "@/lib/supabase/profile";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { getCachedProblemExecutionData } from "@/lib/supabase/cached-queries";

export async function POST(req: Request) {
  try {
    const profile = await getUserProfile();
    if (!profile) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    const user_id = profile.id;

    const body = await req.json();
    const { tokens, problem_id, code, language_id, daily_challenge_id } = body;

    if (!tokens || !Array.isArray(tokens) || tokens.length === 0 || !problem_id) {
      return NextResponse.json({ success: false, error: "Missing required parameters" }, { status: 400 });
    }

    const judge0Endpoint = process.env.NEXT_PUBLIC_JUDGE0_ENDPOINT || process.env.JUDGE0_ENDPOINT;
    if (!judge0Endpoint) {
      return NextResponse.json({ success: false, error: "Judge0 endpoint not configured" }, { status: 500 });
    }

    const tokensStr = tokens.join(",");
    const batchGetUrl = `${judge0Endpoint}/submissions/batch?tokens=${tokensStr}&base64_encoded=true`;

    const statusRes = await fetch(batchGetUrl, {
      headers: { Accept: "application/json" },
    });

    if (!statusRes.ok) {
      return NextResponse.json({ success: false, error: "Failed to fetch status from Judge0" }, { status: 502 });
    }

    const statusData = await statusRes.json();
    let submissions = statusData?.submissions || [];

    const problemData = (await getCachedProblemExecutionData(problem_id)) as any;
    let testCases: any[] = problemData?.test_cases || [];
    if (typeof testCases === "string") {
      try { testCases = JSON.parse(testCases); } catch { testCases = []; }
    }

    const decode = (str: string | null) => {
      if (!str) return "";
      try { return Buffer.from(str, "base64").toString("utf-8"); } catch { return str; }
    };

    let driverCodes: any = problemData?.driver_codes || {};
    if (typeof driverCodes === "string") {
      try { driverCodes = JSON.parse(driverCodes); } catch { driverCodes = {}; }
    }
    const langKey = String(language_id);
    const driverCode = driverCodes[langKey] || "";
    const isV2 = driverCode.includes("@@@LOGICLAB_BATCH_V2@@@");

    if (isV2 && submissions.length === 1) {
      const sub = submissions[0];
      if (sub.status?.id <= 2) {
        return NextResponse.json({
          completed: false,
          finished_count: 0,
          total_count: testCases.length,
        });
      }

      const fullStdout = decode(sub.stdout);
      const outputs = fullStdout.split("@@@LOGICLAB_TC_SEP@@@").map(s => s.trim());
      
      submissions = testCases.map((tc: any, i: number) => {
        let outputBlock = outputs[i] || "";
        let tcData = { ...sub };
        tcData.stdout = Buffer.from(outputBlock).toString("base64");
        
        if (sub.status?.id !== 3 && outputBlock.includes("@@@LOGICLAB_ERR_START@@@")) {
          tcData.status = sub.status;
        } else if (sub.status?.id !== 3) {
          tcData.status = sub.status; 
        }
        
        return tcData;
      });
    } else {
      const finishedSubmissions = submissions.filter((s: any) => s.status && s.status.id > 2);
      if (finishedSubmissions.length < tokens.length) {
        return NextResponse.json({
          completed: false,
          finished_count: finishedSubmissions.length,
          total_count: tokens.length,
        });
      }
    }

    let passedCount = 0;
    let maxRuntime = 0;
    let maxMemory = 0;
    let overallStatus = "Accepted";
    let firstFailedResult: any = null;
    const testResults: any[] = [];

    for (let i = 0; i < testCases.length; i++) {
      const tc = testCases[i];
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
            error = "Runtime Error: Program terminated without producing an expected return value.";
            consoleOutput = stdoutRaw;
          }
        }
      }

      if (error) {
        let errDesc = "System Error"; let errId = 13;
        if (error.startsWith("Runtime Error")) { errDesc = "Runtime Error"; errId = 11; }
        else if (error.includes("Time Limit")) { errDesc = "Time Limit Exceeded"; errId = 5; }
        else if (error.startsWith("Compilation Error")) { errDesc = "Compilation Error"; errId = 6; }
        if (overallStatus === "Accepted") overallStatus = errDesc;
        const item = { index: i + 1, passed: false, input: tc.input, expected: tc.expected_output, actual: error, status: { id: errId, description: errDesc }, time: "0.000", memory: "0", consoleOutput };
        testResults.push(item);
        if (!firstFailedResult) firstFailedResult = item;
        continue;
      }

      const stdout = decode(data.stdout).trim();
      const expectedTrimmed = (tc.expected_output || "").trim();
      const statusId = data.status?.id || 0;
      const passed = (statusId === 3 && stdout === expectedTrimmed);

      const runtimeSec = parseFloat(data.time || "0");
      const runtimeMs = Math.round(runtimeSec * 1000);
      const memoryKb = parseInt(data.memory || "0", 10);

      if (runtimeMs > maxRuntime) maxRuntime = runtimeMs;
      if (memoryKb > maxMemory) maxMemory = memoryKb;

      if (passed) {
        passedCount++;
      } else if (overallStatus === "Accepted") {
        overallStatus = (data.status?.description === "Accepted") ? "Wrong Answer" : (data.status?.description || "Wrong Answer");
      }

      const item = {
        index: i + 1,
        passed,
        input: tc.input,
        expected: expectedTrimmed,
        actual: stdout,
        status: data.status,
        time: runtimeSec.toFixed(3),
        memory: String(memoryKb),
        consoleOutput,
      };
      testResults.push(item);
      if (!passed && !firstFailedResult) firstFailedResult = item;
    }

    const isAccepted = passedCount === testCases.length;
    const supabase = (await createServerClient()) as any;

    if (daily_challenge_id) {
      const { data: potdData } = await supabase
        .from("logiclab_daily_challenges")
        .select("date")
        .eq("id", daily_challenge_id)
        .single();

      if (potdData?.date) {
        await supabase.from("logiclab_daily_challenge_submissions").insert({
          daily_challenge_id,
          user_id,
          problem_id,
          date: potdData.date,
          code,
          language_id: Number(language_id),
          status: overallStatus,
          passed_count: passedCount,
          total_count: testCases.length,
          runtime: maxRuntime,
          memory: maxMemory,
        });
      }
    }

    // Insert regular submission (PostgreSQL trigger trg_logiclab_problem_solve fires automatically)
    const { data: insertedSub } = await supabase.from("logiclab_problem_submissions").insert({
      user_id,
      problem_id,
      code,
      language_id: Number(language_id),
      status: overallStatus,
      passed_count: passedCount,
      total_count: testCases.length,
      runtime: maxRuntime,
      memory: maxMemory,
    }).select("id, created_at").single();

    // Query newly unlocked badges in the last 10 seconds
    let newlyUnlockedBadges: any[] = [];
    if (isAccepted) {
      try {
        const tenSecAgo = new Date(Date.now() - 10000).toISOString();
        const { data: recentBadges } = await supabase
          .from("user_badges")
          .select("badge_id, earned_at, logiclab_badges ( id, name, description, icon_name, badge_category )")
          .eq("user_id", user_id)
          .gte("earned_at", tenSecAgo);

        if (recentBadges && recentBadges.length > 0) {
          newlyUnlockedBadges = recentBadges
            .map((b: any) => b.logiclab_badges)
            .filter(Boolean);
        }
      } catch (e) {
        console.error("Error fetching newly unlocked badges:", e);
      }
    }

    return NextResponse.json({
      completed: true,
      success: true,
      submission_id: insertedSub?.id,
      created_at: insertedSub?.created_at,
      is_accepted: isAccepted,
      status: overallStatus,
      passed_count: passedCount,
      total_count: testCases.length,
      runtime: maxRuntime,
      memory: maxMemory,
      first_failed: firstFailedResult,
      cases: testResults,
      newly_unlocked_badges: newlyUnlockedBadges,
    });
  } catch (err: any) {
    console.error("[api/logiclab/status] Error:", err);
    return NextResponse.json({ success: false, error: err.message || "Internal server error" }, { status: 500 });
  }
}
