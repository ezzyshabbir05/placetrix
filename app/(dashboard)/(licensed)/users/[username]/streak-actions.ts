"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

interface RestoreStreakParams {
  userId: string;
  username?: string;
  dates: string[]; // e.g. ["2026-09-04", "2026-09-05"]
  reason?: string;
}

export async function restoreCandidateStreakAction({
  userId,
  username,
  dates,
  reason,
}: RestoreStreakParams) {
  try {
    if (!userId || !dates || dates.length === 0) {
      return { success: false, error: "Candidate ID and at least one date are required." };
    }

    const supabase = await createClient();

    const { data, error } = await (supabase as any).rpc("admin_restore_user_streak", {
      p_user_id: userId,
      p_dates: dates,
      p_reason: reason || "Restored by Staff",
    });

    if (error) {
      console.error("[restoreCandidateStreakAction] RPC Error:", error);
      return { success: false, error: error.message || "Failed to restore streak" };
    }

    // Revalidate relevant pages so updated streaks appear immediately
    revalidatePath("/home");
    revalidatePath("/logiclab");
    revalidatePath("/logiclab/leaderboard");
    if (username) {
      revalidatePath(`/users/${username}`);
    }
    revalidatePath(`/users/${userId}`);

    return {
      success: true,
      currentStreak: data?.current_streak ?? 0,
      longestStreak: data?.longest_streak ?? 0,
    };
  } catch (err: any) {
    console.error("[restoreCandidateStreakAction] Unexpected error:", err);
    return { success: false, error: err?.message || "An unexpected error occurred." };
  }
}
