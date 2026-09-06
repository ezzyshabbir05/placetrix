"use server"

import { createClient as createServerClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getUserProfile } from "@/lib/supabase/profile"
import { getCachedGlobalProblemsList, getCachedPotd, getCachedProblemExecutionData } from "@/lib/supabase/cached-queries"
import { Problem } from "./_types"
import { validateSubmissionSecurity, getJudge0SandboxConfig } from "@/lib/sandbox/securityCheck"
import { getLanguagePrelude } from "@/lib/generator/templateGenerator"
import { getTrackById } from "./_constants/tracks"
import { COMPANY_CATALOG, isProblemAskedAtCompany } from "./_constants/companies"

export { getCachedGlobalProblemsList, getCachedPotd, getCachedProblemExecutionData }

export async function getIdeProblemList(userId: string) {
  const supabase = (await createServerClient()) as any
  const { data: problems, error } = await supabase.rpc('get_ide_problem_list', { p_user_id: userId })
  
  if (error || !problems) {
    console.error("Error fetching IDE problem list via RPC:", error)
    return []
  }
  return problems
}

// Fetch single problem details, testcases and past submissions for SPA transition
export async function getProblemDataSPA(
  problemId: string,
  userId: string,
  trackId?: string,
  companyId?: string
) {
  const supabase = (await createServerClient()) as any

  const { data: problem, error } = await supabase
    .from("logiclab_problems")
    .select("*")
    .eq("id", problemId)
    .maybeSingle()

  if (error || !problem) return null

  let parsedTestCases: any[] = problem.test_cases || []
  if (typeof parsedTestCases === "string") {
    try {
      parsedTestCases = JSON.parse(parsedTestCases)
    } catch {
      parsedTestCases = []
    }
  }

  const sampleTestCases = parsedTestCases
    .filter((tc: any) => tc.is_sample || tc.isSample)
    .map((tc: any, idx: number) => ({
      id: tc.id || String(idx),
      input: tc.input || "",
      expected_output: tc.expected_output || "",
      explanation: tc.explanation || "",
    }))

  const totalTestCases = parsedTestCases.length

  const { data: submissions } = await supabase
    .from("logiclab_problem_submissions")
    .select("id, status, language_id, runtime, memory, passed_count, total_count, created_at")
    .eq("problem_id", problemId)
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(20)

  const allProblems = await getCachedGlobalProblemsList()
  
  let prevProblemId: string | null = null
  let nextProblemId: string | null = null
  let trackContext: { id: string; title: string; currentStep: number; totalSteps: number } | null = null
  let companyContext: { id: string; name: string; currentStep: number; totalSteps: number } | null = null

  if (trackId) {
    const track = getTrackById(trackId)
    if (track) {
      const trackProblemList = track.problemNumbers
        .map((num) => allProblems.find((p: any) => p.number === num))
        .filter(Boolean) as any[]
      const trackIndex = trackProblemList.findIndex((p: any) => p.id === problemId)
      if (trackIndex > 0) {
        prevProblemId = trackProblemList[trackIndex - 1].id
      }
      if (trackIndex >= 0 && trackIndex < trackProblemList.length - 1) {
        nextProblemId = trackProblemList[trackIndex + 1].id
      }
      if (trackIndex >= 0) {
        trackContext = {
          id: track.id,
          title: track.title,
          currentStep: trackIndex + 1,
          totalSteps: trackProblemList.length,
        }
      }
    }
  } else if (companyId) {
    const company = COMPANY_CATALOG.find((c) => c.id === companyId || c.slug === companyId)
    if (company) {
      const companyProblemList = allProblems.filter((p: any) =>
        isProblemAskedAtCompany(p, company.id)
      )
      const companyIndex = companyProblemList.findIndex((p: any) => p.id === problemId)
      if (companyIndex > 0) {
        prevProblemId = companyProblemList[companyIndex - 1].id
      }
      if (companyIndex >= 0 && companyIndex < companyProblemList.length - 1) {
        nextProblemId = companyProblemList[companyIndex + 1].id
      }
      if (companyIndex >= 0) {
        companyContext = {
          id: company.id,
          name: company.name,
          currentStep: companyIndex + 1,
          totalSteps: companyProblemList.length,
        }
      }
    }
  }

  // Fallback to global allProblems if no track or company sequence was resolved
  if (!prevProblemId && !nextProblemId && !trackId && !companyId) {
    const currentIndex = allProblems.findIndex((p: any) => p.id === problemId)
    if (currentIndex > 0) {
      prevProblemId = (allProblems[currentIndex - 1] as any).id
    }
    if (currentIndex >= 0 && currentIndex < allProblems.length - 1) {
      nextProblemId = (allProblems[currentIndex + 1] as any).id
    }
  }

  return {
    problem,
    sampleTestCases,
    totalTestCases,
    submissions: submissions || [],
    prevProblemId,
    nextProblemId,
    trackContext,
    companyContext,
  }
}

// (Removed getCachedGlobalProblems as pagination is now natively handled by Postgres RPC)

// Infinite scroll pagination for daily challenges history
export async function fetchDailyChallengesInfinite({
  userId,
  offset = 0,
  limit = 20,
  search = "",
  tab = "all",
  difficulty = "All",
  tag = "All",
  sortBy = "date-desc",
  todayStr,
}: {
  userId: string
  offset?: number
  limit?: number
  search?: string
  tab?: string
  difficulty?: string
  tag?: string
  sortBy?: string
  todayStr: string
}): Promise<{ challenges: any[]; hasMore: boolean }> {
  const supabase = (await createServerClient()) as any

  const { data, error } = await supabase.rpc("get_paginated_daily_challenges", {
    p_user_id: userId || null,
    p_today_str: todayStr,
    p_limit: limit,
    p_offset: offset,
    p_search: search,
    p_tab: tab,
    p_difficulty: difficulty,
    p_tag: tag,
    p_sort_by: sortBy,
  })

  if (!error && data) {
    const totalCount = data.length > 0 ? Number(data[0].total_count) : 0
    const hasMore = offset + limit < totalCount
    return { challenges: data, hasMore }
  }

  console.warn("[fetchDailyChallengesInfinite] RPC failed or missing, using fallback query:", error?.message)

  // Fallback if RPC fails: fetch all POTDs (excluding today)
  const { data: historyData, error: fallErr } = await supabase
    .from("logiclab_daily_challenges")
    .select("id, date, problem_id, logiclab_problems ( id, number, title, difficulty, tags )")
    .neq("date", todayStr)
    .order("date", { ascending: false })

  if (fallErr || !historyData) return { challenges: [], hasMore: false }

  // Fetch user submissions
  const dailyChallengeIds = historyData.map((h: any) => h.id)
  const problemIds = historyData.map((h: any) => h.problem_id)
  const { data: submissions } = await supabase
    .from("logiclab_daily_challenge_submissions")
    .select("daily_challenge_id, status")
    .eq("user_id", userId)
    .in("daily_challenge_id", dailyChallengeIds)

  const solvedMap: Record<string, string> = {}
  for (const sub of submissions ?? []) {
    if (sub.daily_challenge_id) {
      if (!solvedMap[sub.daily_challenge_id] || sub.status === "Accepted") {
        solvedMap[sub.daily_challenge_id] = sub.status
      }
    }
  }

  // Fetch problem stats in bulk
  const { data: statsData } = await supabase
    .from("logiclab_problem_stats")
    .select("problem_id, total_submissions, accepted_submissions")
    .in("problem_id", problemIds)

  const statsMap: Record<string, { total: number; accepted: number }> = {}
  for (const s of statsData ?? []) {
    statsMap[s.problem_id] = {
      total: s.total_submissions || 0,
      accepted: s.accepted_submissions || 0,
    }
  }

  // Enrich
  let enriched = historyData.map((h: any) => {
    const s = statsMap[h.problem_id] || { total: 0, accepted: 0 }
    const acceptanceRate = s.total > 0 ? Math.round((s.accepted / s.total) * 100) : 0
    return {
      id: h.id,
      date: h.date,
      problem_id: h.problem_id,
      number: h.logiclab_problems?.number,
      title: h.logiclab_problems?.title || "Unknown Problem",
      difficulty: (h.logiclab_problems?.difficulty || "Medium") as "Easy" | "Medium" | "Hard",
      tags: (h.logiclab_problems?.tags || []) as string[],
      solved_status: solvedMap[h.id] || null,
      total_submissions: s.total,
      acceptance_rate: acceptanceRate,
    }
  })

  // Apply filters
  if (search) {
    const q = search.toLowerCase()
    enriched = enriched.filter(
      (p: any) =>
        p.title.toLowerCase().includes(q) ||
        p.tags?.some((t: string) => t.toLowerCase().includes(q))
    )
  }
  if (difficulty !== "All") {
    enriched = enriched.filter((p: any) => p.difficulty === difficulty)
  }
  if (tag !== "All") {
    enriched = enriched.filter((p: any) => (p.tags || []).includes(tag))
  }
  if (tab === "solved") enriched = enriched.filter((p: any) => p.solved_status === "Accepted")
  else if (tab === "attempted") enriched = enriched.filter((p: any) => p.solved_status && p.solved_status !== "Accepted")
  else if (tab === "unsolved") enriched = enriched.filter((p: any) => !p.solved_status)

  // Apply sorting
  if (sortBy === "date-desc") {
    enriched.sort((a: any, b: any) => b.date.localeCompare(a.date))
  } else if (sortBy === "date-asc") {
    enriched.sort((a: any, b: any) => a.date.localeCompare(b.date))
  } else if (sortBy === "difficulty-asc") {
    const rank: Record<string, number> = { Easy: 1, Medium: 2, Hard: 3 }
    enriched.sort((a: any, b: any) => (rank[a.difficulty] || 0) - (rank[b.difficulty] || 0) || b.date.localeCompare(a.date))
  } else if (sortBy === "difficulty-desc") {
    const rank: Record<string, number> = { Easy: 1, Medium: 2, Hard: 3 }
    enriched.sort((a: any, b: any) => (rank[b.difficulty] || 0) - (rank[a.difficulty] || 0) || b.date.localeCompare(a.date))
  } else if (sortBy === "title-asc") {
    enriched.sort((a: any, b: any) => a.title.localeCompare(b.title) || b.date.localeCompare(a.date))
  } else if (sortBy === "title-desc") {
    enriched.sort((a: any, b: any) => b.title.localeCompare(a.title) || b.date.localeCompare(a.date))
  }

  const page = enriched.slice(offset, offset + limit)
  const hasMore = offset + limit < enriched.length

  return { challenges: page, hasMore }
}

// Infinite scroll pagination for problems list
export async function fetchProblemsInfinite({
  userId,
  offset = 0,
  limit = 20,
  search = "",
  tab = "all",
  difficulty = "All",
  tag = "All",
  company = "All",
  trackNumbers,
  sortBy = "number-asc",
}: {
  userId: string
  offset?: number
  limit?: number
  search?: string
  tab?: string
  difficulty?: string
  tag?: string
  company?: string
  trackNumbers?: number[]
  sortBy?: string
}): Promise<{ problems: any[]; hasMore: boolean; totalCount: number }> {
  const supabase = (await createServerClient()) as any
  const effectiveTag = tag !== "All" ? tag : (company !== "All" ? company : "All")

  // If no trackNumbers and at most one of tag or company is specified, use high-speed RPC directly
  if ((!trackNumbers || trackNumbers.length === 0) && (tag === "All" || company === "All")) {
    const { data, error } = await supabase.rpc('get_paginated_problems', {
      p_user_id: userId || null,
      p_limit: limit,
      p_offset: offset,
      p_search: search,
      p_tab: tab,
      p_difficulty: difficulty,
      p_tag: effectiveTag,
      p_sort_by: sortBy
    })

    if (!error && data) {
      const totalCount = data.length > 0 ? Number(data[0].total_count) : 0
      const hasMore = offset + limit < totalCount
      return { problems: data, hasMore, totalCount }
    }
  }

  // Fallback query (or when filtering by track / multi-filtering)
  let query = supabase
    .from("logiclab_problems")
    .select("id, number, title, difficulty, tags, created_at")

  if (trackNumbers && trackNumbers.length > 0) {
    query = query.in("number", trackNumbers)
  }
  if (search) {
    query = query.ilike("title", `%${search}%`)
  }
  if (difficulty && difficulty !== "All") {
    query = query.eq("difficulty", difficulty)
  }
  if (tag && tag !== "All") {
    query = query.contains("tags", [tag])
  }
  if (company && company !== "All") {
    query = query.contains("tags", [company])
  }

  query = query.order("number", { ascending: sortBy !== "number-desc" })

  const { data: rawProblems, error: fallErr } = await query

  if (fallErr || !rawProblems) {
    console.error("[fetchProblemsInfinite] Fallback error:", fallErr)
    return { problems: [], hasMore: false, totalCount: 0 }
  }

  let filteredProblems = rawProblems;

  if (tab !== "all" && userId) {
    if (tab === "solved" || tab === "unsolved") {
      const { data: solved } = await supabase.from('logiclab_user_solved_problems').select('problem_id').eq('user_id', userId);
      const solvedIds = new Set(solved?.map((s: any) => s.problem_id) || []);
      
      if (tab === "solved") {
        filteredProblems = filteredProblems.filter((p: any) => solvedIds.has(p.id));
      } else {
        filteredProblems = filteredProblems.filter((p: any) => !solvedIds.has(p.id));
      }
    } else if (tab === "attempted") {
      const { data: submissions } = await supabase.from('logiclab_problem_submissions').select('problem_id').eq('user_id', userId);
      const { data: solved } = await supabase.from('logiclab_user_solved_problems').select('problem_id').eq('user_id', userId);
      
      const attemptedIds = new Set(submissions?.map((s: any) => s.problem_id) || []);
      const solvedIds = new Set(solved?.map((s: any) => s.problem_id) || []);
      
      filteredProblems = filteredProblems.filter((p: any) => attemptedIds.has(p.id) && !solvedIds.has(p.id));
    }
  }

  const paginatedProblems = filteredProblems.slice(offset, offset + limit);
  const finalTotalCount = filteredProblems.length;
  const finalHasMore = offset + limit < finalTotalCount;

  // Fetch user solved status and problem submission stats across all submission tables
  let solvedSet = new Set<string>()
  const statsMap: Record<string, { total: number; accepted: number }> = {}

  if (paginatedProblems.length > 0) {
    const pIds = paginatedProblems.map((p: any) => p.id)
    pIds.forEach((id: string) => {
      statsMap[id] = { total: 0, accepted: 0 }
    })

    const [uSolved, pSubUser, dSubUser, allPSubs, allDSubs] = await Promise.all([
      userId
        ? supabase
            .from("logiclab_user_solved_problems")
            .select("problem_id")
            .eq("user_id", userId)
            .in("problem_id", pIds)
        : Promise.resolve({ data: [] }),
      userId
        ? supabase
            .from("logiclab_problem_submissions")
            .select("problem_id")
            .eq("user_id", userId)
            .eq("status", "Accepted")
            .in("problem_id", pIds)
        : Promise.resolve({ data: [] }),
      userId
        ? supabase
            .from("logiclab_daily_challenge_submissions")
            .select("problem_id")
            .eq("user_id", userId)
            .eq("status", "Accepted")
            .in("problem_id", pIds)
        : Promise.resolve({ data: [] }),
      supabase
        .from("logiclab_problem_submissions")
        .select("problem_id, status")
        .in("problem_id", pIds),
      supabase
        .from("logiclab_daily_challenge_submissions")
        .select("problem_id, status")
        .in("problem_id", pIds)
    ])

    if (uSolved.data) uSolved.data.forEach((s: any) => solvedSet.add(s.problem_id))
    if (pSubUser.data) pSubUser.data.forEach((s: any) => solvedSet.add(s.problem_id))
    if (dSubUser.data) dSubUser.data.forEach((s: any) => solvedSet.add(s.problem_id))

    const addStat = (s: any) => {
      if (statsMap[s.problem_id]) {
        statsMap[s.problem_id].total += 1
        if (s.status === "Accepted") {
          statsMap[s.problem_id].accepted += 1
        }
      }
    }
    if (allPSubs.data) allPSubs.data.forEach(addStat)
    if (allDSubs.data) allDSubs.data.forEach(addStat)
  }

  const enriched = paginatedProblems.map((p: any) => {
    const st = statsMap[p.id] || { total: 0, accepted: 0 }
    const acceptanceRate = st.total > 0 ? Math.round((st.accepted / st.total) * 100) : null
    return {
      ...p,
      solved_status: solvedSet.has(p.id) ? "Accepted" : null,
      acceptance_rate: acceptanceRate,
      total_submissions: st.total,
      total_count: finalTotalCount
    }
  })

  return { problems: enriched, hasMore: finalHasMore, totalCount: finalTotalCount }
}

// ─── Format Code Action ────────────────────────────────────────────────────────

import { formatCppCode } from "@/lib/formatters/cppFormatter";

export async function formatCodeAction(code: string, language: string): Promise<{ code: string; warning?: string; error?: string }> {
  if (!code || !language) return { code, error: 'Missing code or language' };
  try {
    let formattedCode = code;
    if (language === 'javascript' || language === 'typescript') {
      const prettier = (await import('prettier')).default;
      const prettierPluginBabel = await import('prettier/plugins/babel');
      const prettierPluginEstree = await import('prettier/plugins/estree');
      formattedCode = await prettier.format(code, {
        parser: 'babel',
        plugins: [prettierPluginBabel, prettierPluginEstree],
        semi: true,
        singleQuote: true,
      });
    } else if (language === 'java') {
      const prettier = (await import('prettier')).default;
      const javaPlugin = (await import('prettier-plugin-java')).default;
      formattedCode = await prettier.format(code, {
        parser: 'java',
        plugins: [javaPlugin],
        tabWidth: 4,
      });
    } else if (language === 'cpp' || language === 'c') {
      formattedCode = formatCppCode(code);
    }
    return { code: formattedCode };
  } catch (err: any) {
    return { code, warning: 'Code contains syntax errors, could not format.' };
  }
}

// ─── Seed & Update Problem Actions ─────────────────────────────────────────────

export async function seedProblemsAction(problemsPayload: any[]) {
  const profile = await getUserProfile();
  if (!profile || profile.account_type !== "admin") {
    throw new Error("Forbidden: admin only");
  }
  const problems: any[] = Array.isArray(problemsPayload) ? problemsPayload : [];
  if (problems.length === 0) throw new Error("No problems provided");

  const supabase = (await createServerClient()) as any;
  const { data: existing } = await supabase.from("logiclab_problems").select("title");
  const existingTitles = new Set((existing || []).map((p: any) => p.title.trim().toLowerCase()));

  const toInsert = problems.filter((p: any) => p.title && !existingTitles.has(p.title.trim().toLowerCase()));
  if (toInsert.length === 0) {
    return { message: "All problems already exist in the database", inserted: 0, skipped: problems.length };
  }

  const { data: inserted, error } = await supabase
    .from("logiclab_problems")
    .insert(toInsert)
    .select("id, title");

  if (error) throw new Error(error.message);
  return { message: `Successfully seeded ${inserted.length} problems!`, inserted: inserted.length, skipped: problems.length - toInsert.length };
}

export async function updateProblemAction(problemId: string, data: any) {
  const profile = await getUserProfile();
  if (!profile || profile.account_type !== "admin") {
    throw new Error("Forbidden: admin only");
  }
  if (!problemId || !data) throw new Error("Missing problemId or data");

  const supabase = (await createServerClient()) as any;
  const { data: updated, error } = await supabase
    .from("logiclab_problems")
    .update(data)
    .eq("id", problemId)
    .select();

  if (error) throw new Error(error.message);

  const { revalidatePath, revalidateTag } = await import("next/cache");
  try {
    revalidatePath("/logiclab", "page");
    revalidatePath("/logiclab/admin", "page");
    // @ts-ignore
    revalidateTag(`problem-exec-${problemId}`);
  } catch {}

  return { data: updated[0] };
}

// ─── Run Code Action ───────────────────────────────────────────────────────────

const ALLOWED_LANGUAGE_IDS = new Set([54, 62, 63, 71]);

export async function runCodeAction(body: {
  source_code: string;
  language_id: number;
  stdin?: string;
  problem_id?: string;
  mode?: string;
  custom_cases?: string[];
  custom_expected?: string[];
}) {
  let { source_code, language_id, stdin, problem_id, mode, custom_cases, custom_expected } = body;
  if (source_code) {
    source_code = source_code.replace(/[\u00A0\u200B]/g, ' ');
  }

  const profile = await getUserProfile();
  if (!profile) return { success: false, error: "Unauthorized" };

  if (!ALLOWED_LANGUAGE_IDS.has(Number(language_id))) {
    return { success: false, error: `Unsupported language_id: ${language_id}.` };
  }

  const { rateLimit } = await import("@/lib/rate-limit");
  const rl = rateLimit("run", profile.id, 30, 60_000);
  if (!rl.success) {
    return { success: false, error: `Rate limit exceeded. Please wait ${Math.ceil(rl.resetInMs / 1000)}s before running again.` };
  }

  if (!source_code || source_code.length > 50000) {
    return { success: false, error: "Code payload exceeds maximum size limit of 50KB." };
  }

  const secCheck = validateSubmissionSecurity(source_code, language_id);
  if (!secCheck.valid) {
    return { success: false, error: `Security Exception: ${secCheck.reason}` };
  }

  let finalSource = source_code;
  let finalStdin = stdin || "";
  let sampleTestCases: any[] = [];
  let timeLimit = 2.0;
  let memoryLimit = 256000;
  let lineOffset = 0;

  if (mode === "problem" && problem_id) {
    const problemData = (await getCachedProblemExecutionData(problem_id)) as any;
    if (!problemData) throw new Error("Problem not found or could not be loaded from cache.");

    timeLimit = Math.min(problemData.time_limit || 2.0, 15.0);
    memoryLimit = Math.min((problemData.memory_limit || 256) * 1024, 512000);

    let driverCodes: any = problemData.driver_codes || {};
    if (typeof driverCodes === "string") {
      try { driverCodes = JSON.parse(driverCodes); } catch { driverCodes = {}; }
    }
    const langKey = String(language_id);
    const driverCode = driverCodes[langKey] || "";
    if (!driverCode) {
      return { success: false, error: `Execution engine error: Driver code missing for language ${langKey}.` };
    }

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
    sampleTestCases = testCases.filter((tc: any) => tc.is_sample || tc.isSample);
    if (sampleTestCases.length === 0 && testCases.length > 0) sampleTestCases = [testCases[0]];

    if (Array.isArray(custom_cases) && custom_cases.length > 0) {
      sampleTestCases = custom_cases.map((customInput, idx) => {
        const originalTc = sampleTestCases[idx] || {};
        const expected = (Array.isArray(custom_expected) && idx < custom_expected.length) ? custom_expected[idx] : undefined;
        return {
          ...originalTc,
          input: customInput,
          expected_output: (expected !== undefined && expected !== "") ? expected : originalTc.expected_output,
          is_custom: idx >= sampleTestCases.length
        };
      });
    }
  }

  const judge0Endpoint = process.env.NEXT_PUBLIC_JUDGE0_ENDPOINT || process.env.JUDGE0_ENDPOINT;
  if (!judge0Endpoint) return { success: false, error: "Judge0 endpoint is not configured in environment variables." };

  const encodedSource = Buffer.from(finalSource || "").toString("base64");
  const decode = (str: string | null) => {
    if (!str) return "";
    try { return Buffer.from(str, "base64").toString("utf-8"); } catch { return str; }
  };

  if (mode === "problem" && sampleTestCases.length > 0) {
    let overallSuccess = true;
    let overallStatus = { id: 3, description: "Accepted" };
    let totalTime = 0;
    let maxMemory = 0;
    const results: any[] = [];

    const sandboxConfig = getJudge0SandboxConfig(timeLimit, memoryLimit);
    const batchPayload = {
      submissions: sampleTestCases.map((tc: any) => ({
        source_code: encodedSource,
        language_id,
        stdin: Buffer.from(tc.input || "").toString("base64"),
        ...sandboxConfig,
      }))
    };

    let executedResults: any[] = [];
    try {
      const batchResponse = await fetch(`${judge0Endpoint}/submissions/batch?base64_encoded=true`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(batchPayload),
      });

      if (!batchResponse.ok) throw new Error("Failed to submit batch to Judge0");

      const batchTokens = await batchResponse.json();
      if (!Array.isArray(batchTokens) || batchTokens.length !== sampleTestCases.length) {
        throw new Error("Invalid token count returned from Judge0");
      }

      const tokensStr = batchTokens.map((t: any) => t.token).join(",");
      const batchGetUrl = `${judge0Endpoint}/submissions/batch?tokens=${tokensStr}&base64_encoded=true`;

      let allDone = false;
      let attempts = 0;
      let finalBatchResults: any[] = [];
      const pollStart = Date.now();

      while (!allDone && Date.now() - pollStart < 30_000) {
        const delay = Math.min(300 * Math.pow(1.5, attempts), 2_000);
        await new Promise(resolve => setTimeout(resolve, delay));
        try {
          const statusRes = await fetch(batchGetUrl);
          if (statusRes.ok) {
            const statusData = await statusRes.json();
            if (statusData && Array.isArray(statusData.submissions)) {
              finalBatchResults = statusData.submissions;
              allDone = finalBatchResults.every((sub: any) => sub.status && sub.status.id > 2);
            }
          }
        } catch {}
        attempts++;
      }

      executedResults = sampleTestCases.map((tc: any, i: number) => {
        const data = finalBatchResults[i];
        if (!data) return { index: i + 1, tc, error: "Judge0 service timed out or dropped token." };
        if (data.status?.id <= 2) return { index: i + 1, tc, error: "Judge0 Timeout: Execution stuck in queue or processing too long." };
        if (data.status?.id === 13) return { index: i + 1, tc, error: "Internal Error in Judge0." };
        return { index: i + 1, tc, data };
      });
    } catch (err: any) {
      executedResults = sampleTestCases.map((tc: any, i: number) => ({ index: i + 1, tc, error: `Batch execution failed: ${err.message}` }));
    }
    executedResults.sort((a, b) => a.index - b.index);

    for (const execution of executedResults) {
      let { index, tc, error, data } = execution;
      let consoleOutput = "";

      if (!error && data?.stdout) {
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
            const lines = stdoutRaw.split('\n');
            if (lines.length > 0) {
              const lastLine = lines.pop() || "";
              data.stdout = Buffer.from(lastLine.trim()).toString("base64");
              consoleOutput = lines.join('\n').trim();
            } else {
              data.stdout = Buffer.from("").toString("base64");
              consoleOutput = stdoutRaw;
            }
          }
        }
      }

      if (error) {
        overallSuccess = false;
        overallStatus = { id: 13, description: "System Error" };
        results.push({ index, passed: false, input: tc.input, error, actual: error, expected: tc.expected_output, consoleOutput });
        continue;
      }

      const stdout = decode(data.stdout).trim();
      const expectedTrimmed = (tc.expected_output || "").trim();
      const statusId = data.status?.id || 0;

      let passed = false;
      if (tc.is_custom && !expectedTrimmed) {
        passed = (statusId === 3);
      } else {
        passed = (statusId === 3 && stdout === expectedTrimmed);
      }

      if (!passed) overallSuccess = false;
      if (statusId !== 3 && overallStatus.id === 3) overallStatus = data.status;

      const timeVal = parseFloat(data.time || "0");
      const memoryVal = parseInt(data.memory || "0", 10);
      totalTime = Math.max(totalTime, timeVal);
      maxMemory = Math.max(maxMemory, memoryVal);

      results.push({
        index,
        passed,
        input: tc.input,
        expected: expectedTrimmed,
        actual: stdout,
        stderr: decode(data.stderr),
        compile_output: decode(data.compile_output),
        message: decode(data.message),
        console_output: consoleOutput,
        status: data.status || { id: 3, description: "Accepted" },
        time: timeVal.toFixed(3),
        memory: String(memoryVal)
      });
    }

    return {
      success: overallSuccess,
      status: overallStatus,
      time: totalTime.toFixed(2),
      memory: String(maxMemory),
      cases: results,
      lineOffset
    };
  } else {
    const encodedStdin = Buffer.from(finalStdin || "").toString("base64");
    const submissionsUrl = `${judge0Endpoint}/submissions?wait=true&base64_encoded=true`;
    let retries = 3;
    let delay = 500;

    while (retries > 0) {
      try {
        const response = await fetch(submissionsUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify({
            source_code: encodedSource,
            language_id,
            stdin: encodedStdin,
            ...getJudge0SandboxConfig(timeLimit, memoryLimit),
          }),
        });
        const textResponse = await response.text();
        let data;
        try { data = JSON.parse(textResponse); } catch { return { success: false, error: "Judge0 JSON parse error" }; }

        if (!response.ok) {
          if (response.status === 429 || response.status >= 500) {
            retries--;
            if (retries > 0) { await new Promise((resolve) => setTimeout(resolve, delay)); delay *= 2; continue; }
          }
          return { success: false, error: data.error || response.statusText };
        }

        return {
          success: true,
          stdout: decode(data.stdout),
          stderr: decode(data.stderr),
          compile_output: decode(data.compile_output),
          message: decode(data.message),
          status: data.status || { id: 3, description: "Accepted" },
          time: data.time || "0.00",
          memory: data.memory || "0",
        };
      } catch (err: any) {
        retries--;
        if (retries > 0) { await new Promise((resolve) => setTimeout(resolve, delay)); delay *= 2; continue; }
        return { success: false, error: err.message };
      }
    }
  }
}

// ─── Submit Code Action ────────────────────────────────────────────────────────

function estimateInputSize(input: string): number {
  if (!input) return 0;
  const trimmed = input.trim();
  const tokens = trimmed.split(/[\s,\[\]{}]+/);
  const validTokens = tokens.filter(t => t.length > 0);
  if (validTokens.length > 3) return validTokens.length;
  return trimmed.length;
}

export async function submitCodeAction(body: {
  problem_id: string;
  code: string;
  language_id: number;
  daily_challenge_id?: string;
}) {
  const { problem_id, code, language_id, daily_challenge_id } = body;
  const profile = await getUserProfile();
  if (!profile) return { success: false, error: "Unauthorized" };
  const user_id = profile.id;

  if (!problem_id || !code || !language_id) {
    return { success: false, error: "Missing required fields: problem_id, code, language_id" };
  }
  if (!ALLOWED_LANGUAGE_IDS.has(Number(language_id))) {
    return { success: false, error: `Unsupported language_id: ${language_id}.` };
  }

  const { rateLimit } = await import("@/lib/rate-limit");
  const rl = rateLimit("submit", user_id, 10, 60_000);
  if (!rl.success) {
    return { success: false, error: `Rate limit exceeded. Please wait ${Math.ceil(rl.resetInMs / 1000)}s before submitting again.` };
  }

  if (code.length > 50000) {
    return { success: false, error: "Code payload exceeds maximum size limit of 50KB." };
  }

  const secCheck = validateSubmissionSecurity(code, language_id);
  if (!secCheck.valid) {
    return { success: false, error: `Security Exception: ${secCheck.reason}` };
  }

  const supabase = (await createServerClient()) as any;
  const problemData = (await getCachedProblemExecutionData(problem_id)) as any;
  if (!problemData) throw new Error("Problem not found or could not be loaded.");

  const timeLimit = Math.min(problemData.time_limit || 2.0, 15.0);
  const memoryLimit = Math.min((problemData.memory_limit || 256) * 1024, 512000);

  let driverCodes: any = problemData.driver_codes || {};
  if (typeof driverCodes === "string") {
    try { driverCodes = JSON.parse(driverCodes); } catch { driverCodes = {}; }
  }
  const langKey = String(language_id);
  const driverCode = driverCodes[langKey] || "";
  if (!driverCode) {
    return { success: false, error: `Submission failed: Driver code missing for language ${langKey}.` };
  }

  const prelude = getLanguagePrelude(langKey, code, driverCode);
  let finalSource = code;
  if (langKey === "62") {
    const lines = driverCode.split("\n");
    const imports = lines.filter((line: string) => line.trim().startsWith("import "));
    const nonImports = lines.filter((line: string) => !line.trim().startsWith("import "));
    finalSource = "import java.util.*;\nimport java.io.*;\n" + imports.join("\n") + "\n\n" + prelude + "\n" + code + "\n\n" + nonImports.join("\n");
  } else if (langKey === "71") {
    const merged = prelude + "\n" + code + "\n\n" + driverCode;
    finalSource = "from __future__ import annotations\nimport sys\nimport json\nimport math\nimport collections\nfrom typing import *\n" + merged;
  } else if (langKey === "54") {
    const lines = driverCode.split("\n");
    const includes = lines.filter((line: string) => line.trim().startsWith("#include") || line.trim().startsWith("using "));
    const nonIncludes = lines.filter((line: string) => !line.trim().startsWith("#include") && !line.trim().startsWith("using "));
    finalSource = "#include <iostream>\n#include <vector>\n#include <string>\n#include <algorithm>\n#include <map>\n#include <set>\n#include <unordered_map>\n#include <unordered_set>\n#include <queue>\n#include <stack>\n#include <cmath>\n#include <climits>\n#include <limits>\n#include <numeric>\n#include <utility>\nusing namespace std;\n" + includes.join("\n") + "\n\n" + prelude + "\n" + code + "\n\n" + nonIncludes.join("\n");
  } else {
    finalSource = prelude + "\n" + code + "\n\n" + driverCode;
  }

  let testCases: any[] = problemData.test_cases || [];
  if (typeof testCases === "string") {
    try { testCases = JSON.parse(testCases); } catch { testCases = []; }
  }
  if (!testCases || testCases.length === 0) {
    return { success: false, error: "Submission failed: Problem has no test cases configured." };
  }

  const judge0Endpoint = process.env.NEXT_PUBLIC_JUDGE0_ENDPOINT || process.env.JUDGE0_ENDPOINT;
  if (!judge0Endpoint) return { success: false, error: "Judge0 endpoint is not configured in environment variables." };

  const encodedSource = Buffer.from(finalSource).toString("base64");
  const decode = (str: string | null) => {
    if (!str) return "";
    try { return Buffer.from(str, "base64").toString("utf-8"); } catch { return str; }
  };

  const sandboxConfig = getJudge0SandboxConfig(timeLimit, memoryLimit);
  const batchPayload = {
    submissions: testCases.map((tc: any) => ({
      source_code: encodedSource,
      language_id,
      stdin: Buffer.from(tc.input || "").toString("base64"),
      ...sandboxConfig,
    }))
  };

  let executedResults: any[] = [];
  try {
    const batchResponse = await fetch(`${judge0Endpoint}/submissions/batch?base64_encoded=true`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(batchPayload),
    });

    if (!batchResponse.ok) throw new Error("Failed to submit batch to Judge0");

    const batchTokens = await batchResponse.json();
    if (!Array.isArray(batchTokens) || batchTokens.length !== testCases.length) {
      throw new Error("Invalid token count returned from Judge0");
    }

    const tokensStr = batchTokens.map((t: any) => t.token).join(",");
    const batchGetUrl = `${judge0Endpoint}/submissions/batch?tokens=${tokensStr}&base64_encoded=true`;

    let allDone = false;
    let attempts = 0;
    let finalBatchResults: any[] = [];
    const pollStart = Date.now();

    while (!allDone && Date.now() - pollStart < 30_000) {
      const delay = Math.min(300 * Math.pow(1.5, attempts), 2_000);
      await new Promise(resolve => setTimeout(resolve, delay));
      try {
        const statusRes = await fetch(batchGetUrl);
        if (statusRes.ok) {
          const statusData = await statusRes.json();
          if (statusData && Array.isArray(statusData.submissions)) {
            finalBatchResults = statusData.submissions;
            allDone = finalBatchResults.every((sub: any) => sub.status && sub.status.id > 2);
          }
        }
      } catch {}
      attempts++;
    }

    executedResults = testCases.map((tc: any, i: number) => {
      const data = finalBatchResults[i];
      if (!data) return { index: i + 1, tc, error: "Judge0 service timed out or dropped token." };
      if (data.status?.id <= 2) return { index: i + 1, tc, error: "Judge0 Timeout: Execution stuck in queue or processing too long." };
      if (data.status?.id === 13) return { index: i + 1, tc, error: "Internal Error in Judge0." };
      return { index: i + 1, tc, data };
    });
  } catch (err: any) {
    executedResults = testCases.map((tc: any, i: number) => ({ index: i + 1, tc, error: `Batch execution failed: ${err.message}` }));
  }
  executedResults.sort((a, b) => a.index - b.index);

  let passedCount = 0;
  let maxRuntime = 0;
  let maxMemory = 0;
  let overallStatus = "Accepted";
  let firstFailedResult: any = null;
  const testResults: any[] = [];

  for (const execution of executedResults) {
    let { index, tc, error, data } = execution;
    let consoleOutput = "";

    if (!error && data?.stdout) {
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
          const lines = stdoutRaw.split('\n');
          if (lines.length > 0) {
            const lastLine = lines.pop() || "";
            data.stdout = Buffer.from(lastLine.trim()).toString("base64");
            consoleOutput = lines.join('\n').trim();
          } else {
            data.stdout = Buffer.from("").toString("base64");
            consoleOutput = stdoutRaw;
          }
        }
      }
    }

    if (error) {
      if (overallStatus === "Accepted") overallStatus = "System Error";
      const item = { index, passed: false, input: tc.input, expected: tc.expected_output, actual: error, status: { id: 13, description: "System Error" }, time: "0.000", memory: "0", consoleOutput };
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
      overallStatus = data.status?.description || "Wrong Answer";
    }

    const item = {
      index,
      passed,
      input: tc.input,
      expected: expectedTrimmed,
      actual: stdout,
      status: data.status,
      time: runtimeSec.toFixed(3),
      memory: String(memoryKb),
      consoleOutput
    };
    testResults.push(item);
    if (!passed && !firstFailedResult) firstFailedResult = item;
  }

  const isAccepted = passedCount === testCases.length;

  if (daily_challenge_id) {
    await supabase.from("logiclab_daily_challenge_submissions").insert({
      daily_challenge_id,
      user_id,
      problem_id,
      code,
      language_id,
      status: overallStatus,
      passed_count: passedCount,
      total_count: testCases.length,
      runtime: maxRuntime,
      memory: maxMemory,
    });
  }

  const { data: insertedSub } = await supabase.from("logiclab_problem_submissions").insert({
    user_id,
    problem_id,
    code,
    language_id,
    status: overallStatus,
    passed_count: passedCount,
    total_count: testCases.length,
    runtime: maxRuntime,
    memory: maxMemory,
  }).select("id, created_at").single();

  const { revalidatePath: revPath } = await import("next/cache");
  try {
    revPath(`/logiclab/problems/${problem_id}`);
    revPath("/logiclab");
  } catch {}

  return {
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
  };
}


