"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { toast } from "sonner";
import {
  ResizablePanelGroup as PanelGroup,
  ResizablePanel as Panel,
  ResizableHandle as PanelResizeHandle,
} from "@/components/ui/resizable";
import { Skeleton } from "@/components/ui/skeleton";

// Subcomponents
import { WorkspaceNavbar } from "./components/Navbar/WorkspaceNavbar";
import { LeftPanel } from "./components/LeftPanel/LeftPanel";
import { CodeEditorPanel } from "./components/Editor/CodeEditorPanel";
import { ConsolePanel } from "./components/Console/ConsolePanel";
import { MobileWorkspace } from "./components/Mobile/MobileWorkspace";
import { BadgeUnlockModal } from "./components/Modals/BadgeUnlockModal";
import { ShortcutsDialog } from "./components/Modals/ShortcutsDialog";
import { ProblemListDrawer } from "./components/Modals/ProblemListDrawer";
import { SubmitConfirmDialog } from "./components/Modals/SubmitConfirmDialog";
import { extractParamNames } from "./components/Utils/testcaseUtils";

// Custom Hooks
import { useProblemNavigation } from "./hooks/useProblemNavigation";
import { useCodeEditor } from "./hooks/useCodeEditor";
import { useCodeExecution } from "./hooks/useCodeExecution";
import { useProblemList } from "./hooks/useProblemList";
import { useWorkspaceShortcuts } from "./hooks/useWorkspaceShortcuts";

// Types and Constants
import { Problem, SampleTestCase, Submission, IdeSettings, Language } from "../../_types";
import { DEFAULT_IDE_SETTINGS } from "../../_constants";
import { cn } from "@/lib/utils";

interface ProblemWorkspaceClientProps {
  problem: Problem;
  sampleTestCases: SampleTestCase[];
  totalTestCases: number;
  submissions: Submission[];
  userId: string;
  userProfile?: any;
  prevProblemId: string | null;
  nextProblemId: string | null;
  trackContext?: { id: string; title: string; currentStep: number; totalSteps: number } | null;
  companyContext?: { id: string; name: string; currentStep: number; totalSteps: number } | null;
  isDailyChallenge?: boolean;
  dailyChallengeId?: string;
}

export function ProblemWorkspaceClient({
  problem: initialProblem,
  sampleTestCases: initialSampleTestCases,
  totalTestCases: initialTotalTestCases,
  submissions: initialSubmissions,
  userId,
  userProfile,
  prevProblemId: initialPrevProblemId,
  nextProblemId: initialNextProblemId,
  trackContext: initialTrackContext = null,
  companyContext: initialCompanyContext = null,
  isDailyChallenge = false,
  dailyChallengeId,
}: ProblemWorkspaceClientProps) {
  const [isMounted, setIsMounted] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const ideContainerRef = useRef<HTMLDivElement>(null);

  // Tabs state
  const [activeLeftTab, setActiveLeftTab] = useState<
    "description" | "submissions" | "submission_result" | "notes"
  >("description");
  const [activeOutputTab, setActiveOutputTab] = useState<"testcases" | "result">("testcases");

  // Submit confirmation modal
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);

  // IDE Settings
  const [ideSettings, setIdeSettings] = useState<IdeSettings>(DEFAULT_IDE_SETTINGS);
  useEffect(() => {
    try {
      const stored = localStorage.getItem("logiclab-ide-settings");
      if (stored) {
        setIdeSettings({ ...DEFAULT_IDE_SETTINGS, ...JSON.parse(stored) });
      }
    } catch {}
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem("logiclab-ide-settings", JSON.stringify(ideSettings));
    } catch {}
  }, [ideSettings]);

  // IDE Layout ("standard" | "split" | "vertical")
  const [ideLayout, setIdeLayout] = useState<"standard" | "split" | "vertical">("standard");
  useEffect(() => {
    const saved = localStorage.getItem("logiclab_ide_layout");
    if (saved === "standard" || saved === "split" || saved === "vertical") {
      setIdeLayout(saved);
    }
  }, []);

  const handleLayoutChange = (layout: "standard" | "split" | "vertical") => {
    setIdeLayout(layout);
    localStorage.setItem("logiclab_ide_layout", layout);
  };

  // Fullscreen management
  useEffect(() => {
    setIsMounted(true);
    const handleFullscreenChange = () => {
      setTimeout(() => {
        setIsFullScreen(!!document.fullscreenElement);
      }, 50);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("webkitfullscreenchange", handleFullscreenChange);

    if (document.fullscreenElement) {
      setIsFullScreen(true);
    }

    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener("webkitfullscreenchange", handleFullscreenChange);
    };
  }, []);

  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      setIsFullScreen(true);
      document.documentElement.requestFullscreen().catch(() => {
        setIsFullScreen(false);
        toast.error("Could not enter fullscreen mode.");
      });
    } else {
      setIsFullScreen(false);
      document.exitFullscreen().catch(() => {});
    }
  };

  // Navigation Hook
  const {
    problem,
    sampleTestCases,
    totalTestCases,
    submissions,
    setSubmissions,
    prevProblemId,
    nextProblemId,
    trackContext,
    companyContext,
    isTransitioning,
    handleNavigate,
  } = useProblemNavigation({
    initialProblem,
    initialSampleTestCases,
    initialTotalTestCases,
    initialSubmissions,
    initialPrevProblemId,
    initialNextProblemId,
    initialTrackContext,
    initialCompanyContext,
    userId,
    onProblemChange: () => {
      setActiveLeftTab("description");
      execution.setSubmitResult(null);
      execution.setRunResult(null);
      problemListHook.setIsProblemListOpen(false);
    },
  });

  // Parse boilerplates
  const parsedBoilerplates = useMemo(() => {
    let parsed: any = problem.boilerplates || {};
    if (typeof parsed === "string") {
      try {
        parsed = JSON.parse(parsed);
      } catch {
        parsed = {};
      }
    }
    return parsed;
  }, [problem.boilerplates]);

  // Custom inputs & expected outputs for test cases
  const [customInputs, setCustomInputs] = useState<string[]>(() =>
    sampleTestCases.map((tc) => tc.input)
  );
  const [customExpectedOutputs, setCustomExpectedOutputs] = useState<string[]>(() =>
    sampleTestCases.map((tc) => tc.expected_output || "")
  );
  const [activeTestcaseIndex, setActiveTestcaseIndex] = useState(0);

  useEffect(() => {
    setCustomInputs(sampleTestCases.map((tc) => tc.input));
    setCustomExpectedOutputs(sampleTestCases.map((tc) => tc.expected_output || ""));
    setActiveTestcaseIndex(0);
  }, [sampleTestCases]);

  // Execution Hook (declare placeholders first to wire to editor)
  const [runResult, setRunResult] = useState<any>(null);
  const [submitResult, setSubmitResult] = useState<any>(null);

  // Editor Hook
  const editor = useCodeEditor({
    problemId: problem.id,
    parsedBoilerplates,
    isDailyChallenge,
    dailyChallengeId,
    runResult,
    submitResult,
    ideSettings,
  });

  // Parameter names extracted from boilerplate
  const paramNames = useMemo(() => {
    return extractParamNames(
      parsedBoilerplates[String(editor.selectedLang.id)] || "",
      editor.selectedLang.value
    );
  }, [parsedBoilerplates, editor.selectedLang.id, editor.selectedLang.value]);

  // Code Execution Hook
  const execution = useCodeExecution({
    problem,
    selectedLang: editor.selectedLang,
    code: editor.code,
    parsedBoilerplates,
    customInputs,
    customExpectedOutputs,
    totalTestCases,
    isDailyChallenge,
    dailyChallengeId,
    onSubmissionSuccess: (newSub) => {
      setSubmissions((prev) => [newSub, ...prev]);
    },
    setActiveOutputTab,
    setActiveLeftTab,
  });

  // Sync execution results back to editor for diagnostics
  useEffect(() => {
    setRunResult(execution.runResult);
  }, [execution.runResult]);

  useEffect(() => {
    setSubmitResult(execution.submitResult);
  }, [execution.submitResult]);

  // Problem List Drawer Hook
  const problemListHook = useProblemList({ userId });

  // Keyboard Shortcuts Hook
  const shortcuts = useWorkspaceShortcuts({
    onRun: () => execution.handleRunCode(),
    onSubmit: () => setShowSubmitConfirm(true),
    onFormat: () => editor.handleFormatCode(),
    onNextProblem: () => nextProblemId && handleNavigate(nextProblemId),
    onPrevProblem: () => prevProblemId && handleNavigate(prevProblemId),
  });

  // Restore Code Handler
  const handleRestoreCode = (viewingCode: string, lang: Language) => {
    const key = isDailyChallenge
      ? `logiclab_daily_challenge_${dailyChallengeId}_code_${lang.value}`
      : `logiclab_problem_${problem.id}_code_${lang.value}`;
    try {
      localStorage.setItem(
        key,
        JSON.stringify({ code: viewingCode, timestamp: Date.now() })
      );
    } catch {}
    editor.setSelectedLang(lang);
    editor.setCode(viewingCode);
    toast.success("Restored code to workspace!");
  };

  return (
    <div
      ref={ideContainerRef}
      className={cn(
        "flex flex-col flex-1 min-h-0 bg-background text-foreground overflow-hidden",
        isFullScreen
          ? "fixed inset-0 z-9990 h-screen w-screen"
          : "fixed top-12 left-0 md:left-12 right-0 bottom-0 z-10"
      )}
    >
      {/* Responsive Mobile/Tablet Workspace */}
      <MobileWorkspace
        problem={problem}
        sampleTestCases={sampleTestCases}
        paramNames={paramNames}
        submissions={submissions}
        selectedLang={editor.selectedLang}
        onLangChange={editor.handleLangChange}
        code={editor.code}
        setCode={editor.setCode}
        ideSettings={ideSettings}
        running={execution.running}
        submitting={execution.submitting}
        onRunCode={execution.handleRunCode}
        onSubmitClick={() => setShowSubmitConfirm(true)}
        onFormatCode={editor.handleFormatCode}
        isDailyChallenge={isDailyChallenge}
        dailyChallengeId={dailyChallengeId}
        isTransitioning={isTransitioning}
        customInputs={customInputs}
        setCustomInputs={setCustomInputs}
        customExpectedOutputs={customExpectedOutputs}
        setCustomExpectedOutputs={setCustomExpectedOutputs}
        activeTestcaseIndex={activeTestcaseIndex}
        setActiveTestcaseIndex={setActiveTestcaseIndex}
        runResult={execution.runResult}
        selectedCaseIndex={execution.selectedCaseIndex}
        setSelectedCaseIndex={execution.setSelectedCaseIndex}
        onRestoreCode={handleRestoreCode}
      />

      {/* Desktop IDE View */}
      <div className="hidden md:flex flex-col flex-1 min-h-0 overflow-hidden">
        <WorkspaceNavbar
          problem={problem}
          prevProblemId={prevProblemId}
          nextProblemId={nextProblemId}
          onNavigate={handleNavigate}
          trackContext={trackContext}
          companyContext={companyContext}
          isDailyChallenge={isDailyChallenge}
          isProblemListOpen={problemListHook.isProblemListOpen}
          onToggleProblemList={() =>
            problemListHook.setIsProblemListOpen(!problemListHook.isProblemListOpen)
          }
          running={execution.running}
          submitting={execution.submitting}
          onRun={execution.handleRunCode}
          onSubmitClick={() => setShowSubmitConfirm(true)}
          ideSettings={ideSettings}
          ideLayout={ideLayout}
          onLayoutChange={handleLayoutChange}
          isFullScreen={isFullScreen}
          onToggleFullScreen={toggleFullScreen}
          isTransitioning={isTransitioning}
          modKey={shortcuts.modKey}
        />

        <div className="flex-1 p-2 min-h-0 overflow-hidden">
          {!isMounted ? (
            <Skeleton className="w-full h-full rounded-lg border border-border/40" />
          ) : (
            <>
              {/* STANDARD LAYOUT: Left (Description) | Right (Editor / Output) */}
              {ideLayout === "standard" && (
                <PanelGroup id="standard-layout" orientation="horizontal">
                  <Panel
                    id="sidebar-standard"
                    defaultSize={45}
                    minSize={25}
                    className="flex flex-col min-h-0 rounded-lg border border-border/50 overflow-hidden shadow-2xs"
                  >
                    <LeftPanel
                      activeTab={activeLeftTab}
                      setActiveTab={setActiveLeftTab}
                      problem={problem}
                      sampleTestCases={sampleTestCases}
                      paramNames={paramNames}
                      submissions={submissions}
                      submitting={execution.submitting}
                      submitResult={execution.submitResult}
                      setSubmitResult={execution.setSubmitResult}
                      code={editor.code}
                      selectedLang={editor.selectedLang}
                      totalTestCases={totalTestCases}
                      userProfile={userProfile}
                      isDailyChallenge={isDailyChallenge}
                      dailyChallengeId={dailyChallengeId}
                      isTransitioning={isTransitioning}
                      onRestoreCode={handleRestoreCode}
                    />
                  </Panel>

                  <PanelResizeHandle
                    id="resize-std-1"
                    className="w-1.5 rounded-full transition-colors bg-transparent hover:bg-zinc-300 dark:hover:bg-zinc-700 cursor-col-resize mx-0.5"
                  />

                  <Panel
                    id="editor-container-standard"
                    defaultSize={55}
                    minSize={30}
                    className="flex flex-col min-h-0"
                  >
                    <PanelGroup id="right-group-standard" orientation="vertical">
                      <Panel
                        id="editor-standard"
                        defaultSize={55}
                        minSize={20}
                        className="flex flex-col min-h-0 rounded-lg border border-border/50 overflow-hidden shadow-2xs"
                      >
                        <CodeEditorPanel
                          selectedLang={editor.selectedLang}
                          onLangChange={editor.handleLangChange}
                          code={editor.code}
                          setCode={editor.setCode}
                          editorRef={editor.editorRef}
                          monacoRef={editor.monacoRef}
                          ideSettings={ideSettings}
                          setIdeSettings={setIdeSettings}
                          onFormatCode={editor.handleFormatCode}
                          onRunCode={execution.handleRunCode}
                          onSubmitCode={execution.handleSubmitCode}
                          onSubmitConfirmModal={() => setShowSubmitConfirm(true)}
                          running={execution.running}
                          submitting={execution.submitting}
                          isDailyChallenge={isDailyChallenge}
                          isTransitioning={isTransitioning}
                          saveStatus={editor.saveStatus}
                          cursorPos={editor.cursorPos}
                          setCursorPos={editor.setCursorPos}
                          parsedBoilerplates={parsedBoilerplates}
                          onOpenShortcuts={() => shortcuts.setIsShortcutsOpen(true)}
                          modKey={shortcuts.modKey}
                        />
                      </Panel>

                      <PanelResizeHandle
                        id="resize-std-2"
                        className="h-1.5 rounded-full transition-colors bg-transparent hover:bg-zinc-300 dark:hover:bg-zinc-700 cursor-row-resize my-0.5"
                      />

                      <Panel
                        id="output-standard"
                        defaultSize={45}
                        minSize={10}
                        className="flex flex-col min-h-0 rounded-lg border border-border/50 overflow-hidden shadow-2xs"
                      >
                        <ConsolePanel
                          activeOutputTab={activeOutputTab}
                          setActiveOutputTab={setActiveOutputTab}
                          sampleTestCases={sampleTestCases}
                          customInputs={customInputs}
                          setCustomInputs={setCustomInputs}
                          customExpectedOutputs={customExpectedOutputs}
                          setCustomExpectedOutputs={setCustomExpectedOutputs}
                          activeTestcaseIndex={activeTestcaseIndex}
                          setActiveTestcaseIndex={setActiveTestcaseIndex}
                          paramNames={paramNames}
                          isTransitioning={isTransitioning}
                          running={execution.running}
                          runResult={execution.runResult}
                          selectedLang={editor.selectedLang}
                          selectedCaseIndex={execution.selectedCaseIndex}
                          setSelectedCaseIndex={execution.setSelectedCaseIndex}
                        />
                      </Panel>
                    </PanelGroup>
                  </Panel>
                </PanelGroup>
              )}

              {/* SPLIT LAYOUT: 3 Columns (Left | Editor | Output) */}
              {ideLayout === "split" && (
                <PanelGroup id="split-layout" orientation="horizontal">
                  <Panel
                    id="sidebar-split"
                    defaultSize={30}
                    minSize={20}
                    className="flex flex-col min-h-0 rounded-lg border border-border/50 overflow-hidden shadow-2xs"
                  >
                    <LeftPanel
                      activeTab={activeLeftTab}
                      setActiveTab={setActiveLeftTab}
                      problem={problem}
                      sampleTestCases={sampleTestCases}
                      paramNames={paramNames}
                      submissions={submissions}
                      submitting={execution.submitting}
                      submitResult={execution.submitResult}
                      setSubmitResult={execution.setSubmitResult}
                      code={editor.code}
                      selectedLang={editor.selectedLang}
                      totalTestCases={totalTestCases}
                      userProfile={userProfile}
                      isDailyChallenge={isDailyChallenge}
                      dailyChallengeId={dailyChallengeId}
                      isTransitioning={isTransitioning}
                      onRestoreCode={handleRestoreCode}
                    />
                  </Panel>

                  <PanelResizeHandle
                    id="resize-split-1"
                    className="w-1.5 rounded-full transition-colors bg-transparent hover:bg-zinc-300 dark:hover:bg-zinc-700 cursor-col-resize mx-0.5"
                  />

                  <Panel
                    id="editor-split"
                    defaultSize={40}
                    minSize={20}
                    className="flex flex-col min-h-0 rounded-lg border border-border/50 overflow-hidden shadow-2xs"
                  >
                    <CodeEditorPanel
                      selectedLang={editor.selectedLang}
                      onLangChange={editor.handleLangChange}
                      code={editor.code}
                      setCode={editor.setCode}
                      editorRef={editor.editorRef}
                      monacoRef={editor.monacoRef}
                      ideSettings={ideSettings}
                      setIdeSettings={setIdeSettings}
                      onFormatCode={editor.handleFormatCode}
                      onRunCode={execution.handleRunCode}
                      onSubmitCode={execution.handleSubmitCode}
                      onSubmitConfirmModal={() => setShowSubmitConfirm(true)}
                      running={execution.running}
                      submitting={execution.submitting}
                      isDailyChallenge={isDailyChallenge}
                      isTransitioning={isTransitioning}
                      saveStatus={editor.saveStatus}
                      cursorPos={editor.cursorPos}
                      setCursorPos={editor.setCursorPos}
                      parsedBoilerplates={parsedBoilerplates}
                      onOpenShortcuts={() => shortcuts.setIsShortcutsOpen(true)}
                      modKey={shortcuts.modKey}
                    />
                  </Panel>

                  <PanelResizeHandle
                    id="resize-split-2"
                    className="w-1.5 rounded-full transition-colors bg-transparent hover:bg-zinc-300 dark:hover:bg-zinc-700 cursor-col-resize mx-0.5"
                  />

                  <Panel
                    id="output-split"
                    defaultSize={30}
                    minSize={20}
                    className="flex flex-col min-h-0 rounded-lg border border-border/50 overflow-hidden shadow-2xs"
                  >
                    <ConsolePanel
                      activeOutputTab={activeOutputTab}
                      setActiveOutputTab={setActiveOutputTab}
                      sampleTestCases={sampleTestCases}
                      customInputs={customInputs}
                      setCustomInputs={setCustomInputs}
                      customExpectedOutputs={customExpectedOutputs}
                      setCustomExpectedOutputs={setCustomExpectedOutputs}
                      activeTestcaseIndex={activeTestcaseIndex}
                      setActiveTestcaseIndex={setActiveTestcaseIndex}
                      paramNames={paramNames}
                      isTransitioning={isTransitioning}
                      running={execution.running}
                      runResult={execution.runResult}
                      selectedLang={editor.selectedLang}
                      selectedCaseIndex={execution.selectedCaseIndex}
                      setSelectedCaseIndex={execution.setSelectedCaseIndex}
                    />
                  </Panel>
                </PanelGroup>
              )}

              {/* VERTICAL / STACKED LAYOUT: Top (Description) / Bottom (Editor | Output) */}
              {ideLayout === "vertical" && (
                <PanelGroup id="vertical-layout" orientation="vertical">
                  <Panel
                    id="sidebar-vertical"
                    defaultSize={40}
                    minSize={20}
                    className="flex flex-col min-h-0 rounded-lg border border-border/50 overflow-hidden shadow-2xs"
                  >
                    <LeftPanel
                      activeTab={activeLeftTab}
                      setActiveTab={setActiveLeftTab}
                      problem={problem}
                      sampleTestCases={sampleTestCases}
                      paramNames={paramNames}
                      submissions={submissions}
                      submitting={execution.submitting}
                      submitResult={execution.submitResult}
                      setSubmitResult={execution.setSubmitResult}
                      code={editor.code}
                      selectedLang={editor.selectedLang}
                      totalTestCases={totalTestCases}
                      userProfile={userProfile}
                      isDailyChallenge={isDailyChallenge}
                      dailyChallengeId={dailyChallengeId}
                      isTransitioning={isTransitioning}
                      onRestoreCode={handleRestoreCode}
                    />
                  </Panel>

                  <PanelResizeHandle
                    id="resize-vert-1"
                    className="h-1.5 rounded-full transition-colors bg-transparent hover:bg-zinc-300 dark:hover:bg-zinc-700 cursor-row-resize my-0.5"
                  />

                  <Panel
                    id="bottom-container-vertical"
                    defaultSize={60}
                    minSize={30}
                    className="flex flex-col min-h-0"
                  >
                    <PanelGroup id="bottom-group-vertical" orientation="horizontal">
                      <Panel
                        id="editor-vertical"
                        defaultSize={50}
                        minSize={20}
                        className="flex flex-col min-h-0 rounded-lg border border-border/50 overflow-hidden shadow-2xs"
                      >
                        <CodeEditorPanel
                          selectedLang={editor.selectedLang}
                          onLangChange={editor.handleLangChange}
                          code={editor.code}
                          setCode={editor.setCode}
                          editorRef={editor.editorRef}
                          monacoRef={editor.monacoRef}
                          ideSettings={ideSettings}
                          setIdeSettings={setIdeSettings}
                          onFormatCode={editor.handleFormatCode}
                          onRunCode={execution.handleRunCode}
                          onSubmitCode={execution.handleSubmitCode}
                          onSubmitConfirmModal={() => setShowSubmitConfirm(true)}
                          running={execution.running}
                          submitting={execution.submitting}
                          isDailyChallenge={isDailyChallenge}
                          isTransitioning={isTransitioning}
                          saveStatus={editor.saveStatus}
                          cursorPos={editor.cursorPos}
                          setCursorPos={editor.setCursorPos}
                          parsedBoilerplates={parsedBoilerplates}
                          onOpenShortcuts={() => shortcuts.setIsShortcutsOpen(true)}
                          modKey={shortcuts.modKey}
                        />
                      </Panel>

                      <PanelResizeHandle
                        id="resize-vert-2"
                        className="w-1.5 rounded-full transition-colors bg-transparent hover:bg-zinc-300 dark:hover:bg-zinc-700 cursor-col-resize mx-0.5"
                      />

                      <Panel
                        id="output-vertical"
                        defaultSize={50}
                        minSize={20}
                        className="flex flex-col min-h-0 rounded-lg border border-border/50 overflow-hidden shadow-2xs"
                      >
                        <ConsolePanel
                          activeOutputTab={activeOutputTab}
                          setActiveOutputTab={setActiveOutputTab}
                          sampleTestCases={sampleTestCases}
                          customInputs={customInputs}
                          setCustomInputs={setCustomInputs}
                          customExpectedOutputs={customExpectedOutputs}
                          setCustomExpectedOutputs={setCustomExpectedOutputs}
                          activeTestcaseIndex={activeTestcaseIndex}
                          setActiveTestcaseIndex={setActiveTestcaseIndex}
                          paramNames={paramNames}
                          isTransitioning={isTransitioning}
                          running={execution.running}
                          runResult={execution.runResult}
                          selectedLang={editor.selectedLang}
                          selectedCaseIndex={execution.selectedCaseIndex}
                          setSelectedCaseIndex={execution.setSelectedCaseIndex}
                        />
                      </Panel>
                    </PanelGroup>
                  </Panel>
                </PanelGroup>
              )}
            </>
          )}
        </div>
      </div>

      {/* Problem List Drawer */}
      <ProblemListDrawer
        open={problemListHook.isProblemListOpen}
        onOpenChange={problemListHook.setIsProblemListOpen}
        currentProblemId={problem.id}
        problemList={problemListHook.problemList}
        totalCount={problemListHook.totalProblemsCount}
        searchQuery={problemListHook.searchQuery}
        onSearchChange={problemListHook.setSearchQuery}
        statusFilter={problemListHook.statusFilter}
        onStatusFilterChange={problemListHook.setStatusFilter}
        difficultyFilter={problemListHook.difficultyFilter}
        onDifficultyFilterChange={problemListHook.setDifficultyFilter}
        isLoading={problemListHook.isLoadingProblems}
        isNextPageLoading={problemListHook.isNextPageLoading}
        sentinelRef={problemListHook.sentinelRef}
        onSelectProblem={(id) => handleNavigate(id)}
      />

      {/* Submit Confirmation Dialog */}
      <SubmitConfirmDialog
        open={showSubmitConfirm}
        onOpenChange={setShowSubmitConfirm}
        hasRun={execution.hasRun}
        onConfirm={execution.handleSubmitCode}
      />

      {/* Achievement Badge Unlock Modal */}
      <BadgeUnlockModal
        badge={execution.unlockedBadgeModal}
        userProfile={userProfile}
        onClose={() => execution.setUnlockedBadgeModal(null)}
      />

      {/* Keyboard Shortcuts Dialog */}
      <ShortcutsDialog
        open={shortcuts.isShortcutsOpen}
        onOpenChange={shortcuts.setIsShortcutsOpen}
        isMac={shortcuts.isMac}
      />
    </div>
  );
}
