import { getUserProfile } from "@/lib/supabase/profile"
// Force TS re-evaluate
import { redirect } from "next/navigation"
import LeaderboardClient from "./leaderboard-client"
import { getLeaderboardAction, getCurrentUserRankAction } from "./actions"

export const metadata = {
  title: "LogicLab Leaderboard - Placetrix",
  description: "See how you stack up against your peers.",
}

export default async function LeaderboardPage() {
  const profile = await getUserProfile()
  if (!profile) redirect("/auth/login")

  // Ensure they have an institute
  if (!profile.institute_id) {
    return <div className="p-8 text-center text-muted-foreground">You must belong to an institute to view the leaderboard.</div>
  }

  // Fetch initial top 50
  const { data: initialData, totalCount } = await getLeaderboardAction(profile.institute_id, 1)

  // Fetch current user rank (if they have a score)
  let currentUserRank = null
  if (profile.logiclab_score && profile.logiclab_score > 0) {
    // If they are in the initial data, we already know their rank
    const found = initialData.find(u => u.id === profile.id)
    if (found) {
      currentUserRank = found.rank
    } else {
      currentUserRank = await getCurrentUserRankAction(profile.institute_id, profile.id, profile.logiclab_score)
    }
  }

  return (
    <div className="flex flex-col gap-6 p-4 md:p-8 w-full">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Leaderboard</h1>
        <p className="text-muted-foreground">See how you stack up against your peers in LogicLab.</p>
      </div>

      <LeaderboardClient 
        initialData={initialData} 
        totalCount={totalCount} 
        instituteId={profile.institute_id}
        currentUserId={profile.id}
        currentUserRank={currentUserRank ?? null}
        currentUserScore={profile.logiclab_score || 0}
      />
    </div>
  )
}
