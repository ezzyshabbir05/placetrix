"use client";

import React, { useState } from "react";
import { toast } from "sonner";
import {
  IconCircleCheck,
  IconTerminal2,
  IconCopy,
  IconCheck,
} from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TestcasesTab } from "./TestcasesTab";
import { TestResultTab } from "./TestResultTab";
import { SampleTestCase, Language } from "@/app/(dashboard)/(licensed)/logiclab/_types";
import { cn } from "@/lib/utils";

interface ConsolePanelProps {
  activeOutputTab: "testcases" | "result";
  setActiveOutputTab: (tab: "testcases" | "result") => void;
  sampleTestCases: SampleTestCase[];
  customInputs: string[];
  setCustomInputs: React.Dispatch<React.SetStateAction<string[]>>;
  customExpectedOutputs: string[];
  setCustomExpectedOutputs: React.Dispatch<React.SetStateAction<string[]>>;
  activeTestcaseIndex: number;
  setActiveTestcaseIndex: (idx: number) => void;
  paramNames: string[];
  isTransitioning: boolean;
  running: boolean;
  runResult: any;
  selectedLang: Language;
  selectedCaseIndex: number;
  setSelectedCaseIndex: (idx: number) => void;
}

export function ConsolePanel({
  activeOutputTab,
  setActiveOutputTab,
  sampleTestCases,
  customInputs,
  setCustomInputs,
  customExpectedOutputs,
  setCustomExpectedOutputs,
  activeTestcaseIndex,
  setActiveTestcaseIndex,
  paramNames,
  isTransitioning,
  running,
  runResult,
  selectedLang,
  selectedCaseIndex,
  setSelectedCaseIndex,
}: ConsolePanelProps) {
  const [copied, setCopied] = useState(false);

  const handleCopyOutput = () => {
    const text =
      runResult?.stdout ||
      runResult?.compile_output ||
      runResult?.stderr ||
      runResult?.cases?.[selectedCaseIndex]?.actual ||
      "";
    if (text) {
      navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success("Output copied!");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="flex flex-col h-full bg-card overflow-hidden">
      <Tabs
        value={activeOutputTab}
        onValueChange={(val: any) => setActiveOutputTab(val)}
        className="flex flex-col h-full w-full"
      >
        {/* Console Header Bar */}
        <div className="flex items-center justify-between bg-card px-2 shrink-0 select-none h-10 border-b border-border/50 overflow-x-auto scrollbar-hide">
          <TabsList className="flex bg-transparent h-full p-0 rounded-none justify-start min-w-0 border-none">
            <TabsTrigger
              value="testcases"
              className={cn(
                "relative flex items-center gap-1.5 px-3.5 h-full text-xs font-semibold tracking-wide transition-all cursor-pointer select-none outline-none",
                "text-muted-foreground hover:text-foreground hover:bg-muted/30 rounded-none border-0 shadow-none!",
                "data-[state=active]:text-foreground data-[state=active]:bg-transparent! dark:data-[state=active]:bg-transparent!",
                "data-[state=active]:shadow-none! dark:data-[state=active]:border-transparent!",
                "after:absolute after:bottom-0 after:left-1 after:right-1 after:h-[2px] after:bg-primary after:rounded-full after:opacity-0 data-[state=active]:after:opacity-100 after:transition-opacity"
              )}
            >
              <IconCircleCheck className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
              Testcase
            </TabsTrigger>

            <TabsTrigger
              value="result"
              className={cn(
                "relative flex items-center gap-1.5 px-3.5 h-full text-xs font-semibold tracking-wide transition-all cursor-pointer select-none outline-none",
                "text-muted-foreground hover:text-foreground hover:bg-muted/30 rounded-none border-0 shadow-none!",
                "data-[state=active]:text-foreground data-[state=active]:bg-transparent! dark:data-[state=active]:bg-transparent!",
                "data-[state=active]:shadow-none! dark:data-[state=active]:border-transparent!",
                "after:absolute after:bottom-0 after:left-1 after:right-1 after:h-[2px] after:bg-primary after:rounded-full after:opacity-0 data-[state=active]:after:opacity-100 after:transition-opacity"
              )}
            >
              <IconTerminal2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              Test Result
            </TabsTrigger>
          </TabsList>

          {runResult && (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleCopyOutput}
              className="h-7 w-7 text-muted-foreground hover:text-foreground shrink-0 ml-2"
              title="Copy output"
            >
              {copied ? (
                <IconCheck className="h-3.5 w-3.5 text-emerald-400" />
              ) : (
                <IconCopy className="h-3.5 w-3.5" />
              )}
            </Button>
          )}
        </div>

        {/* Console Content */}
        <ScrollArea className="flex-1 w-full min-h-0">
          <div className="p-3.5">
            <TabsContent value="testcases" className="mt-0 outline-none">
              <TestcasesTab
                sampleTestCases={sampleTestCases}
                customInputs={customInputs}
                setCustomInputs={setCustomInputs}
                customExpectedOutputs={customExpectedOutputs}
                setCustomExpectedOutputs={setCustomExpectedOutputs}
                activeTestcaseIndex={activeTestcaseIndex}
                setActiveTestcaseIndex={setActiveTestcaseIndex}
                paramNames={paramNames}
                isTransitioning={isTransitioning}
              />
            </TabsContent>

            <TabsContent value="result" className="mt-0 outline-none">
              <TestResultTab
                running={running}
                runResult={runResult}
                selectedLang={selectedLang}
                selectedCaseIndex={selectedCaseIndex}
                setSelectedCaseIndex={setSelectedCaseIndex}
                paramNames={paramNames}
              />
            </TabsContent>
          </div>
        </ScrollArea>
      </Tabs>
    </div>
  );
}
