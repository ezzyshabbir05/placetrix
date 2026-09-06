"use client";

import React, { useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useTheme } from "next-themes";
import {
  IconArrowLeft,
  IconFileDescription,
  IconCode,
  IconTerminal2,
  IconHistory,
  IconFileText,
  IconPlayerPlay,
  IconSend,
  IconBraces,
} from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectGroup,
} from "@/components/ui/select";
import { DescriptionTab } from "../LeftPanel/DescriptionTab";
import { SubmissionsTab } from "../LeftPanel/SubmissionsTab";
import { ConsolePanel } from "../Console/ConsolePanel";
import { ProblemNotes } from "../../ProblemNotes";
import { Problem, SampleTestCase, Submission, Language, IdeSettings } from "@/app/(dashboard)/(licensed)/logiclab/_types";
import { LANGUAGES } from "@/app/(dashboard)/(licensed)/logiclab/_constants";
import { cn } from "@/lib/utils";

const Editor = dynamic(() => import("@monaco-editor/react"), { ssr: false });

interface MobileWorkspaceProps {
  problem: Problem;
  sampleTestCases: SampleTestCase[];
  paramNames: string[];
  submissions: Submission[];
  selectedLang: Language;
  onLangChange: (val: string) => void;
  code: string;
  setCode: (code: string) => void;
  ideSettings: IdeSettings;
  running: boolean;
  submitting: boolean;
  onRunCode: () => void;
  onSubmitClick: () => void;
  onFormatCode: () => void;
  isDailyChallenge?: boolean;
  dailyChallengeId?: string;
  isTransitioning: boolean;
  customInputs: string[];
  setCustomInputs: React.Dispatch<React.SetStateAction<string[]>>;
  customExpectedOutputs: string[];
  setCustomExpectedOutputs: React.Dispatch<React.SetStateAction<string[]>>;
  activeTestcaseIndex: number;
  setActiveTestcaseIndex: (idx: number) => void;
  runResult: any;
  selectedCaseIndex: number;
  setSelectedCaseIndex: (idx: number) => void;
  onRestoreCode: (code: string, lang: Language) => void;
}

export function MobileWorkspace({
  problem,
  sampleTestCases,
  paramNames,
  submissions,
  selectedLang,
  onLangChange,
  code,
  setCode,
  ideSettings,
  running,
  submitting,
  onRunCode,
  onSubmitClick,
  onFormatCode,
  isDailyChallenge = false,
  dailyChallengeId,
  isTransitioning,
  customInputs,
  setCustomInputs,
  customExpectedOutputs,
  setCustomExpectedOutputs,
  activeTestcaseIndex,
  setActiveTestcaseIndex,
  runResult,
  selectedCaseIndex,
  setSelectedCaseIndex,
  onRestoreCode,
}: MobileWorkspaceProps) {
  const { resolvedTheme } = useTheme();
  const monacoTheme = resolvedTheme === "light" ? "vs" : "vs-dark";

  const [mobileTab, setMobileTab] = useState<"description" | "code" | "console" | "submissions" | "notes">("description");
  const [activeOutputTab, setActiveOutputTab] = useState<"testcases" | "result">("testcases");

  return (
    <div className="flex md:hidden flex-col flex-1 min-h-0 overflow-hidden bg-background">
      {/* Sticky Mobile Header */}
      <div className="sticky top-0 z-20 flex items-center justify-between px-3 py-2 bg-background border-b border-border/50 shrink-0 select-none">
        <div className="flex items-center gap-2 min-w-0">
          <Button
            variant="outline"
            size="icon"
            asChild
            className="h-8 w-8 rounded-lg shadow-2xs shrink-0"
            title={isDailyChallenge ? "Back to Daily Challenges" : "Back to Problems"}
          >
            <Link href={isDailyChallenge ? "/logiclab/dailychallenges" : "/logiclab"}>
              <IconArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <span className="text-sm font-bold text-foreground truncate">
            {problem.number ? `${problem.number}. ` : ""}
            {problem.title}
          </span>
        </div>

        <Badge
          variant={
            problem.difficulty === "Easy"
              ? "success"
              : problem.difficulty === "Medium"
              ? "warning"
              : "destructive"
          }
          className="text-[10px] font-bold shrink-0"
        >
          {problem.difficulty || "Hard"}
        </Badge>
      </div>

      {/* Mobile Tab Selector */}
      <div className="flex bg-card shrink-0 border-b border-border/50 overflow-x-auto scrollbar-hide px-1">
        <button
          type="button"
          onClick={() => setMobileTab("description")}
          className={cn(
            "relative flex-1 flex items-center justify-center py-2.5 px-3 text-xs font-semibold tracking-wide transition-colors cursor-pointer whitespace-nowrap",
            mobileTab === "description"
              ? "text-foreground after:absolute after:bottom-0 after:left-1 after:right-1 after:h-[2px] after:bg-primary after:rounded-full"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <IconFileDescription className="h-3.5 w-3.5 mr-1 shrink-0" />
          Desc
        </button>

        <button
          type="button"
          onClick={() => setMobileTab("code")}
          className={cn(
            "relative flex-1 flex items-center justify-center py-2.5 px-3 text-xs font-semibold tracking-wide transition-colors cursor-pointer whitespace-nowrap",
            mobileTab === "code"
              ? "text-foreground after:absolute after:bottom-0 after:left-1 after:right-1 after:h-[2px] after:bg-primary after:rounded-full"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <IconCode className="h-3.5 w-3.5 mr-1 shrink-0" />
          Code
        </button>

        <button
          type="button"
          onClick={() => setMobileTab("console")}
          className={cn(
            "relative flex-1 flex items-center justify-center py-2.5 px-3 text-xs font-semibold tracking-wide transition-colors cursor-pointer whitespace-nowrap",
            mobileTab === "console"
              ? "text-foreground after:absolute after:bottom-0 after:left-1 after:right-1 after:h-[2px] after:bg-primary after:rounded-full"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <IconTerminal2 className="h-3.5 w-3.5 mr-1 shrink-0" />
          Console
        </button>

        <button
          type="button"
          onClick={() => setMobileTab("submissions")}
          className={cn(
            "relative flex-1 flex items-center justify-center py-2.5 px-3 text-xs font-semibold tracking-wide transition-colors cursor-pointer whitespace-nowrap",
            mobileTab === "submissions"
              ? "text-foreground after:absolute after:bottom-0 after:left-1 after:right-1 after:h-[2px] after:bg-primary after:rounded-full"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <IconHistory className="h-3.5 w-3.5 mr-1 shrink-0" />
          Submits ({submissions.length})
        </button>

        <button
          type="button"
          onClick={() => setMobileTab("notes")}
          className={cn(
            "relative flex-1 flex items-center justify-center py-2.5 px-3 text-xs font-semibold tracking-wide transition-colors cursor-pointer whitespace-nowrap",
            mobileTab === "notes"
              ? "text-foreground after:absolute after:bottom-0 after:left-1 after:right-1 after:h-[2px] after:bg-primary after:rounded-full"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <IconFileText className="h-3.5 w-3.5 mr-1 shrink-0" />
          Notes
        </button>
      </div>

      {/* Tab Panels */}
      <div className="flex-1 min-h-0 flex flex-col overflow-hidden relative">
        {/* Description */}
        <div className={cn("flex-1 min-h-0 flex flex-col", mobileTab !== "description" && "hidden")}>
          <DescriptionTab
            problem={problem}
            sampleTestCases={sampleTestCases}
            paramNames={paramNames}
            isTransitioning={isTransitioning}
          />
        </div>

        {/* Code Editor */}
        <div className={cn("flex-1 min-h-0 flex flex-col relative", mobileTab !== "code" && "hidden")}>
          <div className="flex items-center justify-between px-3 py-1.5 border-b border-border/50 bg-muted/20">
            <Select value={selectedLang.value} onValueChange={onLangChange}>
              <SelectTrigger size="sm" className="h-7 text-xs font-semibold bg-background w-auto gap-1">
                <SelectValue placeholder="Language" />
              </SelectTrigger>
              <SelectContent position="popper" sideOffset={4} className="z-9999">
                <SelectGroup>
                  {LANGUAGES.map((l: any) => (
                    <SelectItem key={l.id} value={l.value} className="text-xs">
                      {l.name}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>

            <Button
              variant="ghost"
              size="sm"
              onClick={onFormatCode}
              className="h-7 text-xs flex items-center gap-1"
            >
              <IconBraces className="h-3.5 w-3.5" />
              Format
            </Button>
          </div>

          <div className="flex-1 min-h-0 relative">
            <Editor
              height="100%"
              language={selectedLang.value}
              value={code}
              onChange={(v) => setCode(v || "")}
              theme={monacoTheme}
              options={{
                fontSize: ideSettings.fontSize,
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                wordWrap: "on",
                automaticLayout: true,
                padding: { top: 8, bottom: 8 },
                lineNumbersMinChars: 3,
              }}
            />
          </div>

          {/* Bottom Action Bar for Mobile */}
          <div className="flex items-center gap-2 p-2 border-t border-border/50 bg-background/95 backdrop-blur-xs">
            <Button
              variant="outline"
              onClick={() => {
                onRunCode();
                setMobileTab("console");
                setActiveOutputTab("result");
              }}
              disabled={running || submitting}
              className="flex-1 h-9 text-xs font-bold gap-1.5"
            >
              {running ? (
                <Spinner className="size-3.5" />
              ) : (
                <IconPlayerPlay className="h-3.5 w-3.5 text-emerald-500 fill-emerald-500/20" />
              )}
              <span>Run</span>
            </Button>

            <Button
              onClick={onSubmitClick}
              disabled={running || submitting}
              className="flex-1 h-9 text-xs font-bold gap-1.5"
            >
              {submitting ? (
                <Spinner className="size-3.5" />
              ) : (
                <IconSend className="h-3.5 w-3.5 text-sky-400 fill-sky-500/20" />
              )}
              <span>Submit</span>
            </Button>
          </div>
        </div>

        {/* Console */}
        <div className={cn("flex-1 min-h-0 flex flex-col", mobileTab !== "console" && "hidden")}>
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
            running={running}
            runResult={runResult}
            selectedLang={selectedLang}
            selectedCaseIndex={selectedCaseIndex}
            setSelectedCaseIndex={setSelectedCaseIndex}
          />
        </div>

        {/* Submissions */}
        <div className={cn("flex-1 min-h-0 flex flex-col", mobileTab !== "submissions" && "hidden")}>
          <SubmissionsTab
            submissions={submissions}
            isTransitioning={isTransitioning}
            problemId={problem.id}
            isDailyChallenge={isDailyChallenge}
            dailyChallengeId={dailyChallengeId}
            onRestoreCode={onRestoreCode}
          />
        </div>

        {/* Notes */}
        <div className={cn("flex-1 min-h-0 flex flex-col", mobileTab !== "notes" && "hidden")}>
          <ProblemNotes
            problemId={problem.id}
            currentCode={code}
            currentLanguage={selectedLang.name}
            submissions={submissions}
            isDailyChallenge={isDailyChallenge}
          />
        </div>
      </div>
    </div>
  );
}
