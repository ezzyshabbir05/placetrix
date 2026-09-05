import { createClient as createServerClient } from "@/lib/supabase/server"
import { getUserProfile } from "@/lib/supabase/profile"
import { redirect } from "next/navigation"
import { DailyChallengesHistoryClient } from "../_components/DailyChallengesHistoryClient"
import { getCachedPotd, fetchDailyChallengesInfinite } from "../actions"

export const metadata = {
  title: "Daily Challenges — LogicLab",
  description: "Track your daily challenge progress and revisit past coding challenges.",
}

export default async function DailyChallengesPage() {
  const profile = await getUserProfile()
  if (!profile) redirect("/auth/login")

  if (profile.account_type !== "institute_candidate" && profile.account_type !== "admin") {
    redirect("/home")
  }

  const supabase = (await createServerClient()) as any

  // UTC calendar dates — consistent with POTD date column (global UTC key)
  const utcNow = new Date()
  const todayStr = utcNow.toISOString().split("T")[0]
  const yesterdayDate = new Date(utcNow.getTime() - 24 * 60 * 60 * 1000)
  const yesterdayStr = yesterdayDate.toISOString().split("T")[0]

  // Heatmap cut-off date (last 20 weeks = 140 days)
  const cutOffDate20Weeks = new Date(utcNow.getTime() - 140 * 24 * 60 * 60 * 1000)
  const cutOffStr20Weeks = cutOffDate20Weeks.toISOString().split("T")[0]

  // ── Fetch today's POTD ──
  const { data: potdRow } = await supabase
    .from("logiclab_daily_challenges")
    .select("id, date, problem_id, logiclab_problems ( id, number, title, difficulty, tags )")
    .eq("date", todayStr)
    .single()

  let currentPotd = null
  if (potdRow) {
    const pId = potdRow.problem_id
    const { data: potdSub } = await supabase
      .from("logiclab_daily_challenge_submissions")
      .select("problem_id, status")
      .eq("user_id", profile.id)
      .eq("problem_id", pId)

    const potdStatus = potdSub?.find((s: any) => s.status === "Accepted")?.status
      || potdSub?.[0]?.status
      || null

    let statsRow = null
    const { data: statsData } = await supabase
      .from("logiclab_problem_stats")
      .select("total_submissions, accepted_submissions")
      .eq("problem_id", pId)
      .maybeSingle()
    if (statsData) statsRow = statsData

    const totalSubmissions = statsRow?.total_submissions || 0
    const acceptedSubmissions = statsRow?.accepted_submissions || 0
    const acceptanceRate = totalSubmissions > 0 ? Math.round((acceptedSubmissions / totalSubmissions) * 100) : null

    currentPotd = {
      id: potdRow.id,
      date: potdRow.date,
      problem_id: pId,
      number: potdRow.logiclab_problems?.number,
      title: potdRow.logiclab_problems?.title || "Unknown Problem",
      difficulty: (potdRow.logiclab_problems?.difficulty || "Medium") as "Easy" | "Medium" | "Hard",
      tags: (potdRow.logiclab_problems?.tags || []) as string[],
      solved_status: potdStatus,
      total_submissions: totalSubmissions,
      acceptance_rate: acceptanceRate || 0,
    }
  }

  // ── Fetch first page of past challenges ──
  const LIMIT = 20
  const { challenges: initialChallenges, hasMore: initialHasMore } = await fetchDailyChallengesInfinite({
    userId: profile.id,
    offset: 0,
    limit: LIMIT,
    search: "",
    tab: "all",
    difficulty: "All",
    tag: "All",
    sortBy: "date-desc",
    todayStr,
  })

  // ── Activity heatmap data (20 weeks) & User Streak Stats ──
  const [{ data: regSubs }, { data: dailySubs }, { data: userStats }] = await Promise.all([
    (supabase as any).from('logiclab_problem_submissions')
      .select('created_at, status, logiclab_problems!inner(difficulty)')
      .eq('user_id', profile.id)
      .gte('created_at', cutOffStr20Weeks),
    (supabase as any).from('logiclab_daily_challenge_submissions')
      .select('created_at, status, logiclab_problems!inner(difficulty)')
      .eq('user_id', profile.id)
      .gte('created_at', cutOffStr20Weeks),
    (supabase as any).from('logiclab_user_stats')
      .select('potd_streak, longest_streak')
      .eq('user_id', profile.id)
      .maybeSingle()
  ]);

  const allSubs = [...(regSubs || []), ...(dailySubs || [])];
  
  const uniqueDatesWithStatus = new Map<string, any>();

  for (const sub of allSubs) {
    if (!sub.created_at) continue;
    const dateStr = sub.created_at.split("T")[0]; // UTC date
    const diff = sub.logiclab_problems?.difficulty;
    const isSolved = sub.status === "Accepted";

    if (!uniqueDatesWithStatus.has(dateStr)) {
      uniqueDatesWithStatus.set(dateStr, {
        solved: false, attempted: true, count: 0,
        easy_solved: 0, medium_solved: 0, hard_solved: 0,
        easy_attempted: 0, medium_attempted: 0, hard_attempted: 0
      });
    }

    const state = uniqueDatesWithStatus.get(dateStr);
    state.count += 1;
    if (isSolved) state.solved = true;

    if (diff === "Easy") {
      state.easy_attempted += 1;
      if (isSolved) state.easy_solved += 1;
    } else if (diff === "Medium") {
      state.medium_attempted += 1;
      if (isSolved) state.medium_solved += 1;
    } else if (diff === "Hard") {
      state.hard_attempted += 1;
      if (isSolved) state.hard_solved += 1;
    }
  }

  // ── Streak calculation ──
  // Streaks are natively tracked and updated by the database triggers in logiclab_user_stats
  const streakStats = { 
    currentStreak: userStats?.potd_streak || 0,
    maxStreak: userStats?.longest_streak || 0 
  }

  // ── Build 140-day activity calendar ──
  const activityCalendar: any[] = []
  const daysToGenerate = 140
  for (let i = daysToGenerate - 1; i >= 0; i--) {
    const d = new Date(utcNow.getTime() - i * 24 * 60 * 60 * 1000)
    const dateStr = d.toISOString().split("T")[0]
    const activity = uniqueDatesWithStatus.get(dateStr)
    activityCalendar.push({
      date: dateStr,
      count: activity?.count || 0,
      status: activity?.solved ? "solved" : activity?.attempted ? "attempted" : "none",
      dayOfWeek: d.getUTCDay(),
      easySolved: activity?.easy_solved || 0,
      mediumSolved: activity?.medium_solved || 0,
      hardSolved: activity?.hard_solved || 0,
      easyAttempted: activity?.easy_attempted || 0,
      mediumAttempted: activity?.medium_attempted || 0,
      hardAttempted: activity?.hard_attempted || 0,
    })
  }

  // ── Derive unique tags from ALL history (not just current page) ──
  const { data: allHistoryData } = await supabase
    .from("logiclab_daily_challenges")
    .select("problem_id, logiclab_problems ( tags )")
    .neq("date", todayStr)

  const tagCounts: Record<string, number> = {}
  const allTagsSet = new Set<string>()
  for (const h of allHistoryData ?? []) {
    for (const t of h.logiclab_problems?.tags || []) {
      const trimmed = t.trim()
      allTagsSet.add(trimmed)
      tagCounts[trimmed] = (tagCounts[trimmed] || 0) + 1
    }
  }
  const allTags = Array.from(allTagsSet).sort((a, b) => a.localeCompare(b))

  // Fetch today's POTD via cached function
  const initialPotd = await getCachedPotd(todayStr)

  return (
    <DailyChallengesHistoryClient
      initialChallenges={initialChallenges}
      initialHasMore={initialHasMore}
      currentPotd={currentPotd}
      initialPotd={initialPotd}
      streakStats={streakStats}
      activityCalendar={activityCalendar}
      allTags={allTags}
      tagCounts={tagCounts}
      userId={profile.id}
      todayStr={todayStr}
      pageLimit={LIMIT}
    />
  )
}
