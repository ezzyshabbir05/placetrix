import { createClient as createServerClient } from "@/lib/supabase/server"
import { getUserProfile } from "@/lib/supabase/profile"
import { redirect } from "next/navigation"
import { LogicLabDashboardClient } from "./_components/LogicLabDashboardClient"
import { getCachedPotd, fetchProblemsInfinite } from "./actions"

export const metadata = {
  title: "LogicLab",
  description: "Solve coding challenges, practice algorithms, and sharpen your programming skills.",
}

interface SearchParams {
  page?: string
  size?: string
  search?: string
  tab?: string
  difficulty?: string
  tag?: string
}

// Helper to format Date/String to UTC YYYY-MM-DD
function toUtcYYYYMMDD(dateInput: Date | string) {
  const date = typeof dateInput === "string" ? new Date(dateInput) : dateInput
  return date.toISOString().split("T")[0]
}


export default async function LogicLabPage() {
  const profile = await getUserProfile()
  if (!profile) redirect("/auth/login")

  if (profile.account_type !== "institute_candidate" && profile.account_type !== "admin") {
    redirect("/home")
  }

  const isAdmin = profile.account_type === "admin"
  if (isAdmin) redirect("/logiclab/admin")

  // 1. Fetch live problems list (using robust RPC + direct fallback)
  const supabase = (await createServerClient()) as any
  const { problems: initialProblems, hasMore: initialHasMore, totalCount: initialTotalCount } = await fetchProblemsInfinite({
    userId: profile.id,
    limit: 20,
    offset: 0,
    search: "",
    tab: "all",
    difficulty: "All",
    tag: "All",
    sortBy: "number-asc"
  })

  const enrichedProblems = initialProblems || []
  // Use UTC calendar dates (matching DB TIMESTAMPTZ & POTD date column)
  const today = new Date()
  const todayStr = today.toISOString().split("T")[0]

  const yesterdayDate = new Date(today.getTime() - (24 * 60 * 60 * 1000))
  const yesterdayStr = yesterdayDate.toISOString().split("T")[0]

  // Heatmap cut-off date (last 20 weeks = 140 days)
  const cutOffDate20Weeks = new Date(today.getTime() - (140 * 24 * 60 * 60 * 1000))
  const cutOffStr20Weeks = cutOffDate20Weeks.toISOString().split("T")[0]

  // 1. Fetch recent submissions for the 20-week heatmap
  const [{ data: regSubs }, { data: dailySubs }] = await Promise.all([
    (supabase as any).from('logiclab_problem_submissions')
      .select('created_at, status, logiclab_problems!inner(difficulty)')
      .eq('user_id', profile.id)
      .gte('created_at', cutOffStr20Weeks),
    (supabase as any).from('logiclab_daily_challenge_submissions')
      .select('created_at, status, logiclab_problems!inner(difficulty)')
      .eq('user_id', profile.id)
      .gte('created_at', cutOffStr20Weeks)
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

  // 2. Derive active dates for streak calculation from actual submission timestamps
  const allActiveDates = new Map<string, boolean>();
  for (const [dateStr, state] of uniqueDatesWithStatus.entries()) {
    if (state.solved || Number(state.count) > 0) {
      allActiveDates.set(dateStr, true);
    }
  }

  const sortedDates = Array.from(allActiveDates.keys()).sort((a, b) => b.localeCompare(a));
  let currentStreak = 0;
  let maxStreak = 0;

  if (sortedDates.length > 0) {
    const ascDates = [...sortedDates].reverse();
    let prevDate: Date | null = null;
    let tempStreak = 0;

    for (const dStr of ascDates) {
      const currentDate = new Date(dStr);
      if (!prevDate) {
        tempStreak = 1;
      } else {
        const diffTime = Math.abs(currentDate.getTime() - prevDate.getTime());
        const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
        if (diffDays <= 1) {
          tempStreak++;
        } else {
          if (tempStreak > maxStreak) maxStreak = tempStreak;
          tempStreak = 1;
        }
      }
      prevDate = currentDate;
    }
    if (tempStreak > maxStreak) maxStreak = tempStreak;

    const hasActiveStreak = allActiveDates.has(todayStr) || allActiveDates.has(yesterdayStr);
    if (hasActiveStreak) {
      const checkDate = allActiveDates.has(todayStr) ? new Date(today) : new Date(yesterdayDate);
      let checkStr = checkDate.toISOString().split("T")[0];
      while (allActiveDates.has(checkStr)) {
        currentStreak++;
        checkDate.setDate(checkDate.getDate() - 1);
        checkStr = checkDate.toISOString().split("T")[0];
      }
    }
  }

  const streakStats = { 
    currentStreak, 
    maxStreak 
  };

  const activityCalendar: any[] = []
  const daysToGenerate = 140 // 20 weeks * 7 days
  for (let i = daysToGenerate - 1; i >= 0; i--) {
    const d = new Date(today.getTime() - (i * 24 * 60 * 60 * 1000))
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
  // Fetch global tags count via RPC
  const { data: tagsData } = await supabase.rpc('get_global_tags_count')
  const tagCounts: Record<string, number> = tagsData || {}
  const allTags = Object.keys(tagCounts).sort((a, b) => a.localeCompare(b))

  // Fetch global user stats via RPC
  const { data: statsData } = await supabase.rpc('get_user_global_stats', { p_user_id: profile.id })
  const globalStats = statsData || {
    total: 0, solved: 0,
    easy: { total: 0, solved: 0 },
    medium: { total: 0, solved: 0 },
    hard: { total: 0, solved: 0 }
  }

  const initialProblemsList = enrichedProblems
  const totalCountForInit = initialTotalCount || (enrichedProblems.length > 0 ? Number(enrichedProblems[0].total_count) : 0)
  const hasMoreForInit = initialHasMore ?? (totalCountForInit > 20)

  // Fetch initial POTD directly from aggressively cached function
  let initialPotd = await getCachedPotd(todayStr);
  let fullPotdProblem = null;

  if (initialPotd) {
    const foundInEnriched = enrichedProblems.find((p: any) => p.id === (initialPotd as any).problem_id);
    if (foundInEnriched) {
      fullPotdProblem = { ...foundInEnriched };
    } else {
      // Fetch the problem details directly from the DB as it is not in the first 20 problems
      const { data: dbProblem } = await supabase
        .from("logiclab_problems")
        .select("id, number, title, difficulty, tags")
        .eq("id", initialPotd.problem_id)
        .maybeSingle();

      if (dbProblem) {
        const { data: statsRow } = await supabase
          .from("logiclab_problem_stats")
          .select("accepted_submissions, total_submissions")
          .eq("problem_id", initialPotd.problem_id)
          .maybeSingle();

        const totalSubmissions = statsRow?.total_submissions || 0;
        const acceptedSubmissions = statsRow?.accepted_submissions || 0;
        const acceptanceRate = totalSubmissions > 0 ? Math.round((acceptedSubmissions / totalSubmissions) * 100) : null;

        fullPotdProblem = {
          ...dbProblem,
          acceptance_rate: acceptanceRate,
          total_submissions: totalSubmissions,
        };
      }
    }
  }

  if (fullPotdProblem && initialPotd) {
    const { data: potdSub } = await supabase
      .from("logiclab_daily_challenge_submissions")
      .select("status")
      .eq("user_id", profile.id)
      .eq("problem_id", initialPotd.problem_id)
      .eq("status", "Accepted")
      .limit(1)

    fullPotdProblem = {
      ...fullPotdProblem,
      solved_status: (potdSub && potdSub.length > 0) ? "Accepted" : null
    }
  }

  return (
    <LogicLabDashboardClient
      initialProblems={initialProblemsList}
      initialHasMore={hasMoreForInit}
      isAdmin={isAdmin}
      streakStats={streakStats}
      activityCalendar={activityCalendar}
      allTags={allTags}
      tagCounts={tagCounts}
      globalStats={globalStats}
      initialPotd={initialPotd}
      fullPotdProblem={fullPotdProblem}
      userId={profile.id}
    />
  )
}
