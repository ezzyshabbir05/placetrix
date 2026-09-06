import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { startNavigationProgress, stopNavigationProgress } from "@/components/ui/navigation-progress";
import { getProblemDataSPA } from "@/app/(dashboard)/(licensed)/logiclab/actions";
import { Problem, SampleTestCase, Submission } from "@/app/(dashboard)/(licensed)/logiclab/_types";

interface UseProblemNavigationProps {
  initialProblem: Problem;
  initialSampleTestCases: SampleTestCase[];
  initialTotalTestCases: number;
  initialSubmissions: Submission[];
  initialPrevProblemId: string | null;
  initialNextProblemId: string | null;
  initialTrackContext?: { id: string; title: string; currentStep: number; totalSteps: number } | null;
  initialCompanyContext?: { id: string; name: string; currentStep: number; totalSteps: number } | null;
  userId: string;
  onProblemChange?: (newProblem: Problem, newSampleTestCases: SampleTestCase[]) => void;
}

export function useProblemNavigation({
  initialProblem,
  initialSampleTestCases,
  initialTotalTestCases,
  initialSubmissions,
  initialPrevProblemId,
  initialNextProblemId,
  initialTrackContext = null,
  initialCompanyContext = null,
  userId,
  onProblemChange,
}: UseProblemNavigationProps) {
  const [problem, setProblem] = useState<Problem>(initialProblem);
  const [sampleTestCases, setSampleTestCases] = useState<SampleTestCase[]>(initialSampleTestCases);
  const [totalTestCases, setTotalTestCases] = useState<number>(initialTotalTestCases);
  const [submissions, setSubmissions] = useState<Submission[]>(initialSubmissions);
  const [prevProblemId, setPrevProblemId] = useState<string | null>(initialPrevProblemId);
  const [nextProblemId, setNextProblemId] = useState<string | null>(initialNextProblemId);
  const [trackContext, setTrackContext] = useState(initialTrackContext);
  const [companyContext, setCompanyContext] = useState(initialCompanyContext);
  const [isTransitioning, setIsTransitioning] = useState<boolean>(false);

  const handleNavigate = useCallback(
    async (targetId: string) => {
      setIsTransitioning(true);
      startNavigationProgress();
      try {
        const data = await getProblemDataSPA(
          targetId,
          userId,
          trackContext?.id,
          companyContext?.id
        );
        if (!data) {
          toast.error("Failed to load problem");
          return;
        }

        setProblem(data.problem);
        setSampleTestCases(data.sampleTestCases);
        setTotalTestCases(data.totalTestCases);
        setSubmissions(data.submissions);
        setPrevProblemId(data.prevProblemId);
        setNextProblemId(data.nextProblemId);
        if (data.trackContext) setTrackContext(data.trackContext);
        if (data.companyContext) setCompanyContext(data.companyContext);

        // Update URL without full reload, preserving track or company query param
        const queryParam = trackContext?.id
          ? `?track=${trackContext.id}`
          : companyContext?.id
          ? `?company=${companyContext.id}`
          : "";
        window.history.pushState(null, "", `/logiclab/problems/${targetId}${queryParam}`);

        onProblemChange?.(data.problem, data.sampleTestCases);
      } catch (e: any) {
        console.error(e);
        toast.error("An error occurred while switching problems");
      } finally {
        setIsTransitioning(false);
        stopNavigationProgress();
      }
    },
    [userId, trackContext?.id, companyContext?.id, onProblemChange]
  );

  // Browser Back/Forward navigation synchronization
  useEffect(() => {
    const handlePopState = () => {
      const match = window.location.pathname.match(/\/logiclab\/problems\/([a-zA-Z0-9_-]+)/);
      if (match && match[1] && match[1] !== problem.id) {
        handleNavigate(match[1]);
      }
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [problem.id, handleNavigate]);

  // Update document title dynamically
  useEffect(() => {
    document.title = `${problem.number ? `${problem.number}. ` : ""}${problem.title} — LogicLab`;
  }, [problem.title, problem.number]);

  return {
    problem,
    setProblem,
    sampleTestCases,
    setSampleTestCases,
    totalTestCases,
    setTotalTestCases,
    submissions,
    setSubmissions,
    prevProblemId,
    nextProblemId,
    trackContext,
    companyContext,
    isTransitioning,
    handleNavigate,
  };
}
