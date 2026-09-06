"use client";

import React from "react";
import {
  IconFileDescription,
  IconHistory,
  IconFileText,
  IconSparkles,
  IconAlertTriangle,
  IconRefresh,
  IconX,
} from "@tabler/icons-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DescriptionTab } from "./DescriptionTab";
import { SubmissionsTab } from "./SubmissionsTab";
import { SubmissionResultTab } from "./SubmissionResultTab";
import { ProblemNotes } from "../../ProblemNotes";
import { Problem, SampleTestCase, Submission, Language } from "@/app/(dashboard)/(licensed)/logiclab/_types";
import { cn } from "@/lib/utils";

interface LeftPanelProps {
  activeTab: "description" | "submissions" | "submission_result" | "notes";
  setActiveTab: (tab: "description" | "submissions" | "submission_result" | "notes") => void;
  problem: Problem;
  sampleTestCases: SampleTestCase[];
  paramNames: string[];
  submissions: Submission[];
  submitting: boolean;
  submitResult: any;
  setSubmitResult: (res: any) => void;
  code: string;
  selectedLang: Language;
  totalTestCases: number;
  userProfile?: any;
  isDailyChallenge?: boolean;
  dailyChallengeId?: string;
  isTransitioning: boolean;
  onRestoreCode: (code: string, lang: Language) => void;
}

export function LeftPanel({
  activeTab,
  setActiveTab,
  problem,
  sampleTestCases,
  paramNames,
  submissions,
  submitting,
  submitResult,
  setSubmitResult,
  code,
  selectedLang,
  totalTestCases,
  userProfile,
  isDailyChallenge = false,
  dailyChallengeId,
  isTransitioning,
  onRestoreCode,
}: LeftPanelProps) {
  const showSubmissionTab = activeTab === "submission_result" || submitResult || submitting;

  return (
    <div className="flex flex-col h-full bg-card overflow-hidden">
      <Tabs
        value={activeTab}
        onValueChange={(v: any) => setActiveTab(v)}
        className="flex flex-col h-full w-full min-h-0 gap-0"
      >
        {/* Tabs Bar */}
        <TabsList className="flex bg-card shrink-0 justify-start h-10 px-2 rounded-none border-b border-border/50 bg-transparent overflow-x-auto scrollbar-hide">
          <TabsTrigger
            value="description"
            className={cn(
              "relative flex items-center gap-1.5 px-3.5 h-full text-xs font-semibold tracking-wide transition-all cursor-pointer select-none outline-none",
              "text-muted-foreground hover:text-foreground hover:bg-muted/30 rounded-none border-0 shadow-none!",
              "data-[state=active]:text-foreground data-[state=active]:bg-transparent! dark:data-[state=active]:bg-transparent!",
              "data-[state=active]:shadow-none! dark:data-[state=active]:border-transparent!",
              "after:absolute after:bottom-0 after:left-1 after:right-1 after:h-[2px] after:bg-primary after:rounded-full after:opacity-0 data-[state=active]:after:opacity-100 after:transition-opacity"
            )}
          >
            <IconFileDescription className="h-3.5 w-3.5 shrink-0" />
            Description
          </TabsTrigger>

          {showSubmissionTab && (
            <TabsTrigger
              value="submission_result"
              className={cn(
                "relative flex items-center gap-1.5 px-3.5 h-full text-xs font-semibold tracking-wide transition-all cursor-pointer select-none outline-none",
                "text-muted-foreground hover:text-foreground hover:bg-muted/30 rounded-none border-0 shadow-none!",
                "data-[state=active]:text-foreground data-[state=active]:bg-transparent! dark:data-[state=active]:bg-transparent!",
                "data-[state=active]:shadow-none! dark:data-[state=active]:border-transparent!",
                "after:absolute after:bottom-0 after:left-1 after:right-1 after:h-[2px] after:bg-primary after:rounded-full after:opacity-0 data-[state=active]:after:opacity-100 after:transition-opacity"
              )}
            >
              {submitting ? (
                <IconRefresh className="h-3.5 w-3.5 text-blue-500 animate-spin shrink-0" />
              ) : submitResult?.status === "Accepted" ? (
                <IconSparkles className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
              ) : (
                <IconAlertTriangle className="h-3.5 w-3.5 text-rose-500 shrink-0" />
              )}
              Submission
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveTab("description");
                  setSubmitResult(null);
                }}
                className="rounded text-muted-foreground hover:text-foreground shrink-0 cursor-pointer ml-1 p-0.5"
              >
                <IconX className="h-3 w-3" />
              </button>
            </TabsTrigger>
          )}

          <TabsTrigger
            value="submissions"
            className={cn(
              "relative flex items-center gap-1.5 px-3.5 h-full text-xs font-semibold tracking-wide transition-all cursor-pointer select-none outline-none",
              "text-muted-foreground hover:text-foreground hover:bg-muted/30 rounded-none border-0 shadow-none!",
              "data-[state=active]:text-foreground data-[state=active]:bg-transparent! dark:data-[state=active]:bg-transparent!",
              "data-[state=active]:shadow-none! dark:data-[state=active]:border-transparent!",
              "after:absolute after:bottom-0 after:left-1 after:right-1 after:h-[2px] after:bg-primary after:rounded-full after:opacity-0 data-[state=active]:after:opacity-100 after:transition-opacity"
            )}
          >
            <IconHistory className="h-3.5 w-3.5 shrink-0" />
            Submissions ({submissions.length})
          </TabsTrigger>

          <TabsTrigger
            value="notes"
            className={cn(
              "relative flex items-center gap-1.5 px-3.5 h-full text-xs font-semibold tracking-wide transition-all cursor-pointer select-none outline-none",
              "text-muted-foreground hover:text-foreground hover:bg-muted/30 rounded-none border-0 shadow-none!",
              "data-[state=active]:text-foreground data-[state=active]:bg-transparent! dark:data-[state=active]:bg-transparent!",
              "data-[state=active]:shadow-none! dark:data-[state=active]:border-transparent!",
              "after:absolute after:bottom-0 after:left-1 after:right-1 after:h-[2px] after:bg-primary after:rounded-full after:opacity-0 data-[state=active]:after:opacity-100 after:transition-opacity"
            )}
          >
            <IconFileText className="h-3.5 w-3.5 shrink-0" />
            Notes
          </TabsTrigger>
        </TabsList>

        {/* Tab Contents */}
        <div className="flex-1 w-full min-h-0 flex flex-col relative overflow-hidden">
          <TabsContent
            value="description"
            className="mt-0 outline-none flex-1 w-full h-full min-h-0 overflow-hidden flex flex-col data-[state=inactive]:hidden"
          >
            <DescriptionTab
              problem={problem}
              sampleTestCases={sampleTestCases}
              paramNames={paramNames}
              isTransitioning={isTransitioning}
            />
          </TabsContent>

          <TabsContent
            value="submissions"
            className="mt-0 outline-none flex-1 w-full h-full min-h-0 overflow-hidden flex flex-col data-[state=inactive]:hidden"
          >
            <SubmissionsTab
              submissions={submissions}
              isTransitioning={isTransitioning}
              problemId={problem.id}
              isDailyChallenge={isDailyChallenge}
              dailyChallengeId={dailyChallengeId}
              onRestoreCode={onRestoreCode}
            />
          </TabsContent>

          <TabsContent
            value="submission_result"
            className="mt-0 outline-none flex-1 w-full h-full min-h-0 overflow-hidden flex flex-col data-[state=inactive]:hidden"
          >
            <SubmissionResultTab
              submitting={submitting}
              submitResult={submitResult}
              problem={problem}
              selectedLang={selectedLang}
              code={code}
              totalTestCases={totalTestCases}
              userProfile={userProfile}
            />
          </TabsContent>

          <TabsContent
            value="notes"
            forceMount
            hidden={activeTab !== "notes"}
            className={cn(
              "mt-0 outline-none flex-1 w-full h-full min-h-0 overflow-hidden relative flex flex-col",
              activeTab !== "notes" && "hidden"
            )}
          >
            <ProblemNotes
              problemId={problem.id}
              currentCode={code}
              currentLanguage={selectedLang.name}
              submissions={submissions}
              isDailyChallenge={isDailyChallenge}
            />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
