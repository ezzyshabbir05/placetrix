import { useState, useRef, useEffect } from "react";
import { toast } from "sonner";
import { getFriendlyErrorMessage } from "@/lib/errors";
import { Problem, Submission, Language } from "@/app/(dashboard)/(licensed)/logiclab/_types";

interface UseCodeExecutionProps {
  problem: Problem;
  selectedLang: Language;
  code: string;
  parsedBoilerplates: Record<string, string>;
  customInputs: string[];
  customExpectedOutputs: string[];
  totalTestCases: number;
  isDailyChallenge?: boolean;
  dailyChallengeId?: string;
  onSubmissionSuccess?: (newSubmission: Submission) => void;
  setActiveOutputTab: (tab: "testcases" | "result") => void;
  setActiveLeftTab: (tab: "description" | "submissions" | "submission_result" | "notes") => void;
}

export function useCodeExecution({
  problem,
  selectedLang,
  code,
  parsedBoilerplates,
  customInputs,
  customExpectedOutputs,
  totalTestCases,
  isDailyChallenge = false,
  dailyChallengeId,
  onSubmissionSuccess,
  setActiveOutputTab,
  setActiveLeftTab,
}: UseCodeExecutionProps) {
  const [running, setRunning] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [hasRun, setHasRun] = useState(false);
  const [runResult, setRunResult] = useState<any>(null);
  const [submitResult, setSubmitResult] = useState<any>(null);
  const [selectedCaseIndex, setSelectedCaseIndex] = useState(0);
  const [unlockedBadgeModal, setUnlockedBadgeModal] = useState<any | null>(null);

  const clickTimestamps = useRef<number[]>([]);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const checkRateLimit = (): boolean => {
    const now = Date.now();
    clickTimestamps.current = clickTimestamps.current.filter((t) => now - t < 3000);
    if (clickTimestamps.current.length >= 2) {
      toast.error("Please wait a moment before running or submitting again. Rate limit exceeded.");
      return false;
    }
    clickTimestamps.current.push(now);
    return true;
  };

  const handleRunCode = async () => {
    if (!checkRateLimit()) return;

    const currentBoilerplate =
      parsedBoilerplates[String(selectedLang.id)] ||
      `// Write your ${selectedLang.name} solution here\n`;

    if (!code || code.trim() === "" || code.trim() === currentBoilerplate.trim()) {
      toast.warning("Please write your solution before running.");
      return;
    }

    setHasRun(true);
    setRunning(true);
    setRunResult(null);
    setSelectedCaseIndex(0);
    setActiveOutputTab("result");

    try {
      let processedCode = code;
      // Strip 'public' for Java Solution classes
      if (selectedLang.value === "java") {
        processedCode = processedCode.replace(/public\s+class\s+/g, "class ");
      }

      const runRes = await fetch("/api/logiclab/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source_code: processedCode,
          language_id: selectedLang.id,
          problem_id: problem.id,
          mode: "problem",
          custom_cases: customInputs.map((ci) => ci.trim()),
          custom_expected: customExpectedOutputs,
        }),
      });

      const runInit = await runRes.json();
      if (!runRes.ok || !runInit.success) {
        throw new Error(runInit.error || "Execution submission failed.");
      }

      const { tokens: runTokens, line_offset, sample_cases } = runInit;
      let runAttempts = 0;
      let data: any = null;

      while (runAttempts < 30 && isMountedRef.current) {
        await new Promise((r) => setTimeout(r, Math.min(800 + runAttempts * 200, 2000)));
        if (!isMountedRef.current) return;

        const statusRes = await fetch("/api/logiclab/run-status", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tokens: runTokens,
            mode: "problem",
            line_offset,
            sample_cases,
          }),
        });

        if (statusRes.ok) {
          const statusJson = await statusRes.json();
          if (statusJson.completed) {
            data = statusJson;
            break;
          }
        }
        runAttempts++;
      }

      if (!isMountedRef.current) return;
      if (!data) throw new Error("Execution timed out. Please try again.");
      if (data.error) throw new Error(data.error);

      setRunResult(data);
    } catch (err: any) {
      if (!isMountedRef.current) return;
      setRunResult({
        success: false,
        error: err?.message || "Execution failed.",
      });
      toast.error(getFriendlyErrorMessage(err, "Code execution failed. Please check your code and try again."));
    } finally {
      if (isMountedRef.current) setRunning(false);
    }
  };

  const handleSubmitCode = async () => {
    if (!checkRateLimit()) return;

    const currentBoilerplate =
      parsedBoilerplates[String(selectedLang.id)] ||
      `// Write your ${selectedLang.name} solution here\n`;

    if (!code || code.trim() === "" || code.trim() === currentBoilerplate.trim()) {
      toast.warning("Please write your solution before submitting.");
      return;
    }

    setSubmitting(true);
    setSubmitResult(null);
    setSelectedCaseIndex(0);
    setActiveLeftTab("submission_result");

    try {
      let processedCode = code;
      if (selectedLang.value === "java") {
        processedCode = processedCode.replace(/public\s+class\s+/g, "class ");
      }

      const submitRes = await fetch("/api/logiclab/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          problem_id: problem.id,
          code: processedCode,
          language_id: selectedLang.id,
          daily_challenge_id: isDailyChallenge ? dailyChallengeId : undefined,
        }),
      });

      const submitInit = await submitRes.json();
      if (!submitRes.ok || !submitInit.success) {
        throw new Error(submitInit.error || "Submission initialization failed.");
      }

      const { tokens: submitTokens } = submitInit;
      let submitAttempts = 0;
      let data: any = null;

      while (submitAttempts < 35 && isMountedRef.current) {
        await new Promise((r) => setTimeout(r, Math.min(1000 + submitAttempts * 200, 2000)));
        if (!isMountedRef.current) return;

        const statusRes = await fetch("/api/logiclab/status", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tokens: submitTokens,
            problem_id: problem.id,
            code: processedCode,
            language_id: selectedLang.id,
            daily_challenge_id: isDailyChallenge ? dailyChallengeId : undefined,
          }),
        });

        if (statusRes.ok) {
          const statusJson = await statusRes.json();
          if (statusJson.completed) {
            data = statusJson;
            break;
          }
        }
        submitAttempts++;
      }

      if (!isMountedRef.current) return;
      if (!data) throw new Error("Submission timed out. Please try again.");
      if (data.error) throw new Error(data.error);

      // Store a static snapshot of the submitted code and language
      data.submitted_code = code;
      data.submitted_language = selectedLang;
      setSubmitResult(data);

      if (data.save_error) {
        toast.error("Your submission ran successfully but couldn't be saved. Please try submitting again.");
      }

      const newSub: Submission = {
        id: data.submission_id || String(Date.now()),
        status: data.status,
        language_id: selectedLang.id,
        runtime: data.runtime,
        memory: data.memory,
        passed_count: data.passed_count,
        total_count: data.total_count,
        created_at: new Date().toISOString(),
      };

      onSubmissionSuccess?.(newSub);

      if (data.newly_unlocked_badges && data.newly_unlocked_badges.length > 0) {
        setUnlockedBadgeModal(data.newly_unlocked_badges[0]);
      }
    } catch (err: any) {
      if (!isMountedRef.current) return;
      setSubmitResult({
        success: false,
        error: err?.message || "Submission failed.",
      });
      toast.error("Submission failed.");
    } finally {
      if (isMountedRef.current) setSubmitting(false);
    }
  };

  return {
    running,
    submitting,
    hasRun,
    runResult,
    setRunResult,
    submitResult,
    setSubmitResult,
    selectedCaseIndex,
    setSelectedCaseIndex,
    unlockedBadgeModal,
    setUnlockedBadgeModal,
    handleRunCode,
    handleSubmitCode,
  };
}
