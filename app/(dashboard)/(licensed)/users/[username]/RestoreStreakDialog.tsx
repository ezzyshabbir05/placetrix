"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Flame, ShieldCheck, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { restoreCandidateStreakAction } from "./streak-actions";

interface RestoreStreakDialogProps {
  candidateId: string;
  candidateName: string;
  candidateUsername?: string | null;
  currentStreak?: number;
}

export function RestoreStreakDialog({
  candidateId,
  candidateName,
  candidateUsername,
  currentStreak = 0,
}: RestoreStreakDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // Default date to yesterday in local date format (YYYY-MM-DD)
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const defaultDateStr = yesterday.toISOString().split("T")[0];
  const todayStr = new Date().toISOString().split("T")[0];

  const [date, setDate] = useState(defaultDateStr);
  const [reason, setReason] = useState("");

  const handleRestore = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!date) {
      toast.error("Please select a date to restore.");
      return;
    }

    try {
      setLoading(true);
      const res = await restoreCandidateStreakAction({
        userId: candidateId,
        username: candidateUsername ?? undefined,
        dates: [date],
        reason: reason.trim() || "Staff Approved Exemption / Maintenance",
      });

      if (!res.success) {
        toast.error("Failed to restore streak", {
          description: res.error,
        });
        return;
      }

      toast.success("Streak successfully restored!", {
        description: `New active streak: ${res.currentStreak} days (Max: ${res.longestStreak} days)`,
      });

      setOpen(false);
      setReason("");
      router.refresh();
    } catch (err: any) {
      toast.error("An unexpected error occurred", {
        description: err?.message,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-8 gap-1.5 text-xs font-semibold border-amber-500/30 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 transition-colors print:hidden"
        >
          <Flame className="size-3.5 fill-amber-500 text-amber-500" />
          <span>Restore Streak</span>
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-106.25">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <ShieldCheck className="size-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold">Restore Candidate Streak</DialogTitle>
              <DialogDescription className="text-xs">
                Grant activity credit for {candidateName}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleRestore} className="flex flex-col gap-4 py-2">
          <div className="rounded-lg bg-muted/40 border p-3 text-xs flex justify-between items-center">
            <span className="text-muted-foreground">Current Recorded Streak:</span>
            <span className="font-bold text-foreground text-sm tabular-nums">
              {currentStreak} {currentStreak === 1 ? "day" : "days"}
            </span>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="restore-date" className="text-xs font-medium">
              Missed Date to Credit
            </Label>
            <div className="relative">
              <Input
                id="restore-date"
                type="date"
                value={date}
                max={todayStr}
                onChange={(e) => setDate(e.target.value)}
                required
                className="text-sm font-medium"
              />
            </div>
            <p className="text-[11px] text-muted-foreground">
              This date will be marked as solved, bridging any gap in their consecutive days.
            </p>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="restore-reason" className="text-xs font-medium">
              Reason / Note
            </Label>
            <Input
              id="restore-reason"
              type="text"
              placeholder="e.g. Approved medical leave, Contests downtime"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="text-sm"
            />
            <p className="text-[11px] text-muted-foreground">
              Saved for institutional audit and tracking.
            </p>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={loading || !date}
              className="gap-1.5 bg-amber-600 hover:bg-amber-700 text-white dark:bg-amber-500 dark:hover:bg-amber-600 font-semibold"
            >
              {loading ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  <span>Restoring...</span>
                </>
              ) : (
                <>
                  <Flame className="size-3.5 fill-current" />
                  <span>Confirm Restore</span>
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
