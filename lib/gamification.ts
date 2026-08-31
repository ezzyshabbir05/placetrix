import { SupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@supabase/supabase-js'

// Create a service role client to bypass RLS for badge awarding
const getAdminSupabase = () => {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function awardGamificationRewards(
  supabase: SupabaseClient,
  userId: string,
  problemId: string,
  difficulty: string,
  isDailyChallenge: boolean
) {
  let unlockedBadges: any[] = []
  
  try {
    // 1. Check if this is the first time the user is solving this problem
    const { count: dailyCount, error: dailyErr } = await supabase
      .from('logiclab_daily_challenge_submissions')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('problem_id', problemId)
      .eq('status', 'Accepted')

    const { count: regularCount, error: regularErr } = await supabase
      .from('logiclab_problem_submissions')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('problem_id', problemId)
      .eq('status', 'Accepted')

    if (dailyErr || regularErr) {
      console.error("[Gamification] Error checking previous submissions:", dailyErr || regularErr)
      return unlockedBadges
    }

    const totalAccepted = (dailyCount || 0) + (regularCount || 0);
    
    // If the submission route just inserted the Accepted record, totalAccepted will be exactly 1 for a first-time solve.
    const isFirstTimeEver = totalAccepted === 1;
    // If it's a daily challenge, and this is the first time they solved it as a daily challenge.
    const isFirstTimePOTD = isDailyChallenge && (dailyCount === 1);

    // If they already got rewards for both regular and POTD for this problem, don't give duplicate points/streaks.
    if (!isFirstTimeEver && !isFirstTimePOTD) {
      return unlockedBadges
    }

    // 2. Calculate Points
    let pointsToAdd = 0
    let incrementSolvedCount = false

    if (isFirstTimeEver) {
      incrementSolvedCount = true
      const diff = difficulty.toLowerCase()
      if (diff === 'easy') pointsToAdd = 10
      else if (diff === 'medium') pointsToAdd = 20
      else if (diff === 'hard') pointsToAdd = 30
      else pointsToAdd = 10 // default
    }

    if (isFirstTimePOTD) {
      pointsToAdd += 10 // POTD bonus
    }

    // 3. Update User Points and Streaks
    const { data: profile, error: profErr } = await supabase
      .from('profiles')
      .select('logiclab_points, logiclab_solved_count, current_streak, longest_streak, last_solve_date, potd_streak, last_potd_date, flawless_streak')
      .eq('id', userId)
      .single()

    if (profErr || !profile) {
      console.error("[Gamification] Error fetching profile:", profErr)
      return unlockedBadges
    }

    const newPoints = (profile.logiclab_points || 0) + pointsToAdd
    
    // Calculate new streak values
    const today = new Date().toISOString().split("T")[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
    
    let newCurrentStreak = profile.current_streak || 0;
    let newLongestStreak = profile.longest_streak || 0;
    
    // Always maintain streak when solving problems on a new day
    if (profile.last_solve_date === yesterday) {
      newCurrentStreak += 1;
    } else if (profile.last_solve_date !== today) {
      newCurrentStreak = 1; // Start/reset streak on new active day
    }
    if (newCurrentStreak > newLongestStreak) newLongestStreak = newCurrentStreak;

    let newPotdStreak = profile.potd_streak || 0;
    if (isDailyChallenge) {
      if (profile.last_potd_date === yesterday) {
        newPotdStreak += 1;
      } else if (profile.last_potd_date !== today) {
        newPotdStreak = 1;
      }
    }
    
    const newFlawlessStreak = isFirstTimeEver ? (profile.flawless_streak || 0) + 1 : (profile.flawless_streak || 0);
    const newSolvedCount = incrementSolvedCount ? (profile.logiclab_solved_count || 0) + 1 : (profile.logiclab_solved_count || 0);

    // Record this solve in logiclab_user_solved_problems for candidate analytics
    try {
      const adminSupabase = getAdminSupabase();
      await adminSupabase
        .from('logiclab_user_solved_problems')
        .upsert({ user_id: userId, problem_id: problemId, solved_at: new Date().toISOString() }, { onConflict: 'user_id,problem_id' });
    } catch (e) {
      console.error("[Gamification] Error recording in logiclab_user_solved_problems:", e);
    }

    await supabase
      .from('profiles')
      .update({ 
        logiclab_points: newPoints,
        logiclab_solved_count: newSolvedCount,
        current_streak: newCurrentStreak,
        longest_streak: newLongestStreak,
        last_solve_date: today,
        potd_streak: newPotdStreak,
        last_potd_date: isDailyChallenge ? today : profile.last_potd_date,
        flawless_streak: newFlawlessStreak
      })
      .eq('id', userId)

    // 4. Check for Milestone Badges Unlock
    unlockedBadges = await checkAndAwardBadges(supabase, userId)

  } catch (err) {
    console.error("[Gamification] Error in awardGamificationRewards:", err)
  }
  
  return unlockedBadges
}

async function checkAndAwardBadges(supabase: SupabaseClient, userId: string) {
  const newlyUnlocked: any[] = []
  
  // Fetch user's stats from profiles
  const { data: profile } = await supabase
    .from('profiles')
    .select('logiclab_solved_count, current_streak, longest_streak, potd_streak, flawless_streak')
    .eq('id', userId)
    .single()

  if (!profile) return newlyUnlocked

  const totalSolved = profile.logiclab_solved_count || 0
  const longestStreak = profile.longest_streak || 0
  const potdStreak = profile.potd_streak || 0
  const flawlessStreak = profile.flawless_streak || 0

  // Let's fetch all badges
  const { data: badges } = await supabase.from('logiclab_badges').select('*')
  if (!badges) return newlyUnlocked

  const adminSupabase = getAdminSupabase();

  // Helper function to conditionally award badge
  const tryAwardBadge = async (badgeName: string, condition: boolean) => {
    if (!condition) return;
    const badge = badges.find(b => b.name === badgeName);
    if (!badge) return;
    const { data, error } = await adminSupabase.from('user_badges').insert({ user_id: userId, badge_id: badge.id }).select().maybeSingle()
    if (!error && data) newlyUnlocked.push(badge)
  }

  // 1. Total Solves Badges
  await tryAwardBadge('Novice Coder', totalSolved >= 10);
  await tryAwardBadge('Half Century', totalSolved >= 50);
  await tryAwardBadge('Centurion', totalSolved >= 100);

  // 2. Streak Badges
  await tryAwardBadge('Weekly Warrior', longestStreak >= 7);
  await tryAwardBadge('Monthly Master', longestStreak >= 30);
  await tryAwardBadge('50-Day Streak', longestStreak >= 50);
  await tryAwardBadge('100-Day Legend', longestStreak >= 100);
  await tryAwardBadge('365-Day Champion', longestStreak >= 365);
  
  // 3. POTD Badges
  await tryAwardBadge('POTD Champion', potdStreak >= 30);
  
  // 4. Flawless Badge
  await tryAwardBadge('Flawless Logic', flawlessStreak >= 10);

  // 5. Coder of the Month
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);
  const { count: monthCount } = await supabase
    .from('logiclab_problem_submissions')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('status', 'Accepted')
    .gte('created_at', startOfMonth.toISOString());
  await tryAwardBadge('Coder of the Month', monthCount !== null && monthCount >= 50);

  // 6. Hard Problems Badges
  const { data: hardSubmissions } = await supabase
    .from('logiclab_problem_submissions')
    .select('problem_id, logiclab_problems!inner(difficulty)')
    .eq('user_id', userId)
    .eq('status', 'Accepted')
    .eq('logiclab_problems.difficulty', 'Hard')
    
  if (hardSubmissions) {
    const uniqueHardSolves = new Set(hardSubmissions.map((s: any) => s.problem_id)).size;
    await tryAwardBadge('Master Sword', uniqueHardSolves >= 20); // Simplified: 20 hard solves
    await tryAwardBadge('Master of Hard', uniqueHardSolves >= 50);
    await tryAwardBadge('Brain Master', uniqueHardSolves >= 100);
  }

  return newlyUnlocked
}
