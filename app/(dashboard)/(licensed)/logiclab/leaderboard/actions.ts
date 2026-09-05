"use server"

import { createClient as createServerClient } from "@/lib/supabase/server"
import { unstable_cache } from "next/cache"

export interface LeaderboardEntry {
  id: string
  first_name: string
  last_name: string
  username: string
  avatar_path: string | null
  logiclab_points: number
  logiclab_solved_count: number
  current_streak?: number
  rank?: number
  difficulty_breakdown?: { easy: number, medium: number, hard: number }
  course_name?: string
  passout_year?: number
  latest_badge?: {
    id: string
    name: string
    icon_name: string
  } | null
}

const PAGE_SIZE = 50

// Inner cached function — keyed by instituteId + page, revalidates every 60s.
// Leaderboard rankings don't need sub-second freshness. This eliminates
// 4 Supabase queries per load for all users viewing the same institute page.
function _fetchLeaderboard(instituteId: string, page: number) {
  return unstable_cache(
    async () => _leaderboardQuery(instituteId, page),
    [`leaderboard-${instituteId}-p${page}`],
    { revalidate: 60, tags: [`leaderboard-${instituteId}`] }
  )()
}

export async function getLeaderboardAction(instituteId: string, page: number = 1): Promise<{ data: LeaderboardEntry[], totalCount: number }> {
  return _fetchLeaderboard(instituteId, page)
}

async function _leaderboardQuery(instituteId: string, page: number): Promise<{ data: LeaderboardEntry[], totalCount: number }> {
  const supabase = (await createServerClient()) as any
  
  // Calculate offset
  const from = (page - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  let { data: statsData, count, error } = await supabase
    .from("logiclab_user_stats")
    .select(`
      user_id,
      total_points,
      solved_count,
      easy_solved,
      medium_solved,
      hard_solved,
      current_streak,
      profiles!inner(
        id,
        first_name,
        last_name,
        username,
        avatar_path,
        institute_id,
        account_type,
        created_at
      )
    `, { count: "exact" })
    .eq("profiles.institute_id", instituteId)
    .eq("profiles.account_type", "institute_candidate")
    .gt("total_points", 0) // Only users with a score
    .order("total_points", { ascending: false })
    .order("solved_count", { ascending: false })
    .range(from, to)

  if (error) {
    console.error("Error fetching leaderboard:", error)
    return { data: [], totalCount: 0 }
  }

  let rankedData: LeaderboardEntry[] = []

  // If no students have > 0 points yet, fallback to fetching all candidates in the institute
  if (!statsData || statsData.length === 0) {
    const { data: fallbackData, count: fallbackCount, error: fallErr } = await supabase
      .from("profiles")
      .select("id, first_name, last_name, username, avatar_path, created_at", { count: "exact" })
      .eq("institute_id", instituteId)
      .eq("account_type", "institute_candidate")
      .order("created_at", { ascending: true })
      .range(from, to)

    if (!fallErr && fallbackData) {
      count = fallbackCount
      rankedData = fallbackData.map((user: any, index: number) => {
        let finalAvatar = user.avatar_path
        if (finalAvatar && !finalAvatar.startsWith('http')) {
          finalAvatar = supabase.storage.from('avatars').getPublicUrl(finalAvatar).data.publicUrl
        }
        return {
          id: user.id,
          first_name: user.first_name,
          last_name: user.last_name,
          username: user.username,
          avatar_path: finalAvatar,
          logiclab_points: 0,
          logiclab_solved_count: 0,
          current_streak: 0,
          rank: from + index + 1,
          difficulty_breakdown: { easy: 0, medium: 0, hard: 0 }
        }
      })
    }
  } else {
    rankedData = statsData.map((row: any, index: number) => {
      const user = row.profiles || {}
      let finalAvatar = user.avatar_path
      if (finalAvatar && !finalAvatar.startsWith('http')) {
        finalAvatar = supabase.storage.from('avatars').getPublicUrl(finalAvatar).data.publicUrl
      }
      return {
        id: row.user_id,
        first_name: user.first_name,
        last_name: user.last_name,
        username: user.username,
        avatar_path: finalAvatar,
        logiclab_points: row.total_points,
        logiclab_solved_count: row.solved_count,
        current_streak: row.current_streak,
        rank: from + index + 1,
        difficulty_breakdown: {
          easy: row.easy_solved || 0,
          medium: row.medium_solved || 0,
          hard: row.hard_solved || 0
        }
      }
    })
  }

  // 2. Fetch academic details (course and year) and latest badges for ranked users
  const userIds = rankedData.map((u: any) => u.id)
  if (userIds.length > 0) {
    // Academic details
    const { data: academicData } = await supabase
      .from('candidate_academic_details')
      .select('profile_id, passout_year, course:institute_courses(course_name)')
      .in('profile_id', userIds)
      
    if (academicData) {
      const academicMap: Record<string, { course_name?: string, passout_year?: number }> = {}
      for (const row of academicData) {
        academicMap[row.profile_id] = {
          course_name: row.course?.course_name,
          passout_year: row.passout_year
        }
      }
      
      for (const user of rankedData) {
        if (academicMap[user.id]) {
          user.course_name = academicMap[user.id].course_name
          user.passout_year = academicMap[user.id].passout_year
        }
      }
    }

    // Latest earned badge
    const { data: userBadgesData } = await supabase
      .from('user_badges')
      .select('user_id, earned_at, logiclab_badges(id, name, icon_name)')
      .in('user_id', userIds)
      .order('earned_at', { ascending: false })

    if (userBadgesData) {
      const latestBadgeMap: Record<string, { id: string; name: string; icon_name: string }> = {}
      for (const row of userBadgesData) {
        if (!latestBadgeMap[row.user_id] && row.logiclab_badges) {
          const badgeObj = Array.isArray(row.logiclab_badges) ? row.logiclab_badges[0] : row.logiclab_badges
          if (badgeObj && badgeObj.name) {
            latestBadgeMap[row.user_id] = {
              id: badgeObj.id,
              name: badgeObj.name,
              icon_name: badgeObj.icon_name,
            }
          }
        }
      }

      for (const user of rankedData) {
        user.latest_badge = latestBadgeMap[user.id] || null
      }
    }
  }

  return { data: rankedData, totalCount: count || 0 }
}

export async function getCurrentUserRankAction(instituteId: string, userId: string, userPoints: number): Promise<number | null> {
  const supabase = (await createServerClient()) as any
  
  // Count how many candidates in the same institute have a strictly higher score
  const { count, error } = await supabase
    .from("logiclab_user_stats")
    .select("user_id, profiles!inner(institute_id, account_type)", { count: "exact", head: true })
    .eq("profiles.institute_id", instituteId)
    .eq("profiles.account_type", "institute_candidate")
    .gt("total_points", userPoints)

  if (error) {
    console.error("Error fetching user rank:", error)
    return null
  }
  
  return (count || 0) + 1
}
