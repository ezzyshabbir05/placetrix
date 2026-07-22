"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";
import { toast } from "sonner";

export function IncompleteProfileToast() {
  const searchParams = useSearchParams();
  const shown = useRef(false);
  
  useEffect(() => {
    if (searchParams.get("error") === "incomplete" && !shown.current) {
      shown.current = true;
      toast.error("Access Denied", {
        description: "You must complete your Username and Academic Details before accessing other features.",
        duration: 8000,
      });
      // Remove the query param cleanly without refreshing
      window.history.replaceState(null, "", "/myprofile");
    }
  }, [searchParams]);

  return null;
}
