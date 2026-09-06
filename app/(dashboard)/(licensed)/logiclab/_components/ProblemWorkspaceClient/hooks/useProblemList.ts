import { useState, useEffect, useRef, useCallback } from "react";
import { toast } from "sonner";
import { fetchProblemsInfinite } from "@/app/(dashboard)/(licensed)/logiclab/actions";

interface UseProblemListProps {
  userId: string;
}

export function useProblemList({ userId }: UseProblemListProps) {
  const [isProblemListOpen, setIsProblemListOpen] = useState(false);
  const [problemList, setProblemList] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "solved" | "unsolved">("all");
  const [difficultyFilter, setDifficultyFilter] = useState<"all" | "easy" | "medium" | "hard">("all");
  const [isLoadingProblems, setIsLoadingProblems] = useState(false);
  const [hasMoreProblems, setHasMoreProblems] = useState(true);
  const [isNextPageLoading, setIsNextPageLoading] = useState(false);
  const [totalProblemsCount, setTotalProblemsCount] = useState(0);

  const sentinelRef = useRef<HTMLDivElement>(null);

  // Load initial page or reset list when filters/search change
  useEffect(() => {
    if (!isProblemListOpen) return;

    const timer = setTimeout(() => {
      const fetchInitialProblems = async () => {
        setIsLoadingProblems(true);
        try {
          const { problems: fresh, hasMore: more, totalCount: count } = await fetchProblemsInfinite({
            userId,
            offset: 0,
            limit: 20,
            search: searchQuery,
            tab: statusFilter,
            difficulty:
              difficultyFilter === "all"
                ? "All"
                : difficultyFilter.charAt(0).toUpperCase() + difficultyFilter.slice(1),
          });
          const mapped = fresh.map((p: any) => ({
            ...p,
            isSolved: p.solved_status === "Accepted",
          }));
          setProblemList(mapped);
          setHasMoreProblems(more);
          setTotalProblemsCount(count);
        } catch (error) {
          console.error("Failed to load initial problems:", error);
          toast.error("Failed to load problems");
        } finally {
          setIsLoadingProblems(false);
        }
      };
      fetchInitialProblems();
    }, 300);

    return () => clearTimeout(timer);
  }, [isProblemListOpen, searchQuery, statusFilter, difficultyFilter, userId]);

  const loadMoreProblems = useCallback(async () => {
    if (isNextPageLoading || !hasMoreProblems) return;
    setIsNextPageLoading(true);
    try {
      const nextOffset = problemList.length;
      const { problems: next, hasMore: more } = await fetchProblemsInfinite({
        userId,
        offset: nextOffset,
        limit: 20,
        search: searchQuery,
        tab: statusFilter,
        difficulty:
          difficultyFilter === "all"
            ? "All"
            : difficultyFilter.charAt(0).toUpperCase() + difficultyFilter.slice(1),
      });
      const mappedNext = next.map((p: any) => ({
        ...p,
        isSolved: p.solved_status === "Accepted",
      }));
      setProblemList((prev) => [...prev, ...mappedNext]);
      setHasMoreProblems(more);
    } catch (error) {
      console.error("Failed to load more problems:", error);
    } finally {
      setIsNextPageLoading(false);
    }
  }, [
    isNextPageLoading,
    hasMoreProblems,
    problemList.length,
    userId,
    searchQuery,
    statusFilter,
    difficultyFilter,
  ]);

  // Infinite scroll intersection observer
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !isProblemListOpen) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadMoreProblems();
        }
      },
      { rootMargin: "120px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [isProblemListOpen, loadMoreProblems]);

  // Smooth scroll to active problem when opened
  useEffect(() => {
    if (isProblemListOpen && problemList.length > 0) {
      setTimeout(() => {
        const activeLink = document.getElementById("active-problem-link");
        const scrollArea = document.getElementById("problem-list-scroll-area");
        const viewport = scrollArea?.querySelector("[data-slot='scroll-area-viewport']");

        if (activeLink && viewport) {
          const offsetTop = (activeLink as HTMLElement).offsetTop;
          const viewportHeight = (viewport as HTMLElement).clientHeight;
          viewport.scrollTo({
            top: offsetTop - viewportHeight / 2 + 20,
            behavior: "smooth",
          });
        }
      }, 150);
    }
  }, [isProblemListOpen, problemList.length]);

  return {
    isProblemListOpen,
    setIsProblemListOpen,
    problemList,
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    difficultyFilter,
    setDifficultyFilter,
    isLoadingProblems,
    hasMoreProblems,
    isNextPageLoading,
    totalProblemsCount,
    sentinelRef,
    loadMoreProblems,
  };
}
