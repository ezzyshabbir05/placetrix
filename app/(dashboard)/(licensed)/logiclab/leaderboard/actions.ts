"use server"

import { createClient as createServerClient } from "@/lib/supabase/server"

export interface LeaderboardEntry {
  id: string
  first_name: string
  last_name: string
  username: string
  avatar_path: string | null
  logiclab_score: number
  logiclab_solved_count: number
  rank?: number
}

const PAGE_SIZE = 50

export async function getLeaderboardAction(instituteId: string, page: number = 1): Promise<{ data: LeaderboardEntry[], totalCount: number }> {
  const supabase = (await createServerClient()) as any
  
  // Calculate offset
  const from = (page - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  const { data, count, error } = await supabase
    .from("profiles")
    .select("id, first_name, last_name, username, avatar_path, logiclab_score, logiclab_solved_count", { count: "exact" })
    .eq("institute_id", instituteId)
    .gt("logiclab_score", 0) // Only users with a score
    .order("logiclab_score", { ascending: false })
    .order("logiclab_solved_count", { ascending: false })
    .range(from, to)

  if (error) {
    console.error("Error fetching leaderboard:", error)
    return { data: [], totalCount: 0 }
  }

  // Calculate rank and parse avatar URL based on page offset
  const rankedData = (data || []).map((user: any, index: number) => {
    let finalAvatar = user.avatar_path
    if (finalAvatar && !finalAvatar.startsWith('http')) {
      finalAvatar = supabase.storage.from('avatars').getPublicUrl(finalAvatar).data.publicUrl
    }
    
    return {
      ...user,
      avatar_path: finalAvatar,
      rank: from + index + 1
    }
  })

  return { data: rankedData, totalCount: count || 0 }
}

export async function getCurrentUserRankAction(instituteId: string, userId: string, userScore: number): Promise<number | null> {
  const supabase = (await createServerClient()) as any
  
  // A simple way to find rank is counting how many users in the same institute have a strictly higher score,
  // or same score but higher solved count.
  const { count, error } = await supabase
    .from("profiles")
    .select("*", { count: "exact", head: true })
    .eq("institute_id", instituteId)
    .gt("logiclab_score", userScore)

  if (error) {
    console.error("Error fetching user rank:", error)
    return null
  }
  
  return (count || 0) + 1
}
