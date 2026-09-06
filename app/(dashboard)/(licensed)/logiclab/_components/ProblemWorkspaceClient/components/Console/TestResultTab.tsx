"use client";

import React from "react";
import {
  IconTerminal2,
  IconAlertTriangle,
  IconCircleCheck,
  IconCircleX,
  IconCpu,
} from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Empty, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Language } from "@/app/(dashboard)/(licensed)/logiclab/_types";
import {
  formatMemory,
  truncateText,
  formatErrorDiagnostic,
  renderTestcaseValue,
} from "../Utils/testcaseUtils";
import { cn } from "@/lib/utils";

interface TestResultTabProps {
  running: boolean;
  runResult: any;
  selectedLang: Language;
  selectedCaseIndex: number;
  setSelectedCaseIndex: (idx: number) => void;
  paramNames: string[];
}

export function TestResultTab({
  running,
  runResult,
  selectedLang,
  selectedCaseIndex,
  setSelectedCaseIndex,
  paramNames,
}: TestResultTabProps) {
  if (running) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-3 select-none animate-pulse">
        <div className="relative">
          <Spinner className="size-10 text-emerald-500" />
          <div className="absolute inset-0 flex items-center justify-center">
            <IconTerminal2 className="h-4 w-4 text-emerald-500" />
          </div>
        </div>
        <div className="text-center space-y-1">
          <p className="text-xs font-bold text-foreground uppercase tracking-wider">
            Compiling & Running...
          </p>
          <p className="text-[11px] text-muted-foreground">
            Executing solution in LogicLab sandbox
          </p>
        </div>
      </div>
    );
  }

  if (!runResult) {
    return (
      <Empty className="py-12 select-none">
        <EmptyMedia>
          <IconTerminal2 className="size-8 text-muted-foreground/30" />
        </EmptyMedia>
        <EmptyTitle className="text-xs uppercase font-bold tracking-wider text-muted-foreground/60">
          Run your code to see results
        </EmptyTitle>
      </Empty>
    );
  }

  // Crash / Compile Error / Runtime Error
  const failedWithError = runResult.cases?.find(
    (c: any) => !c.passed && (c.compile_output || c.stderr)
  );
  const isCrash =
    runResult.status?.description === "Compilation Error" ||
    runResult.status?.description?.includes("Runtime Error") ||
    runResult.status?.id === 6 ||
    runResult.compile_output ||
    runResult.stderr ||
    failedWithError;

  if (isCrash) {
    const compileErrText =
      runResult.compile_output ||
      runResult.stderr ||
      failedWithError?.compile_output ||
      failedWithError?.stderr ||
      runResult.failed_test_case_info?.actual ||
      "Execution failed.";

    return (
      <div className="space-y-2 select-text">
        <p className="text-xs text-rose-600 dark:text-rose-400 uppercase tracking-wider font-bold flex items-center gap-1.5 mb-1">
          <IconAlertTriangle className="h-4 w-4" /> Error Diagnostics
        </p>
        <pre className="p-3.5 bg-black/40 border border-border/80 rounded-xl text-rose-400 text-xs font-mono whitespace-pre-wrap max-h-72 overflow-y-auto leading-relaxed shadow-inner">
          {formatErrorDiagnostic(compileErrText, runResult.lineOffset || 0, selectedLang.name)}
        </pre>
      </div>
    );
  }

  // Generic Sandbox / TLE / MLE without individual cases
  if (!runResult.cases || runResult.cases.length === 0) {
    const isTLE = runResult.status === "Time Limit Exceeded" || runResult.status?.id === 5;
    const isMLE =
      runResult.status === "Memory Limit Exceeded" ||
      runResult.status?.description?.toLowerCase().includes("memory limit");
    const errText =
      runResult.failed_test_case_info?.actual ||
      runResult.stderr ||
      runResult.status?.description ||
      "Runtime Exception";

    return (
      <div className="space-y-3">
        <div className="p-2.5 rounded-lg flex items-center justify-between border bg-rose-500/5 border-rose-500/20 text-rose-600 dark:text-rose-400">
          <div className="flex items-center gap-2">
            <IconCircleX className="h-4 w-4 text-rose-500" />
            <span className="font-bold uppercase tracking-wider text-xs">
              {isTLE ? "Time Limit Exceeded" : isMLE ? "Memory Limit Exceeded" : "Runtime Error"}
            </span>
          </div>
          {runResult.time && (
            <span className="text-xs font-mono text-muted-foreground">{runResult.time}s</span>
          )}
        </div>

        <div className="p-3 bg-rose-500/5 border border-rose-500/20 rounded-lg space-y-1.5 select-text">
          <p className="text-xs font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider">
            Diagnostics
          </p>
          <pre className="p-2.5 bg-black/40 border border-border/80 rounded-lg text-rose-400 text-xs font-mono whitespace-pre-wrap max-h-32 overflow-y-auto leading-relaxed">
            {errText}
          </pre>
        </div>
      </div>
    );
  }

  // Interactive Case Outcome Visualizer
  const activeCase = runResult.cases[selectedCaseIndex] || runResult.cases[0];
  if (!activeCase) return null;

  const runtimeDisplay = `${Math.round(parseFloat(runResult.time || "0") * 1000)} ms`;
  const memoryDisplay = formatMemory(runResult.memory, false);
  const isAllPassed = runResult.success || runResult.status === "Accepted";
  const passedCount = runResult.cases.filter((c: any) => c.passed).length;
  const totalCount = runResult.cases.length;

  const rawLines = (activeCase.input || "").split("\n").map((l: string) => l.trim());
  const iterator = paramNames.length > 0 ? paramNames : rawLines;

  return (
    <div className="space-y-3.5 animate-in fade-in duration-200">
      {/* Status Bar */}
      <div className="flex items-center justify-between border-b border-border/40 pb-2 select-none">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "font-black text-xs tracking-wider uppercase",
              isAllPassed ? "text-emerald-500" : "text-rose-500"
            )}
          >
            {isAllPassed ? "Accepted" : "Wrong Answer"}
          </span>
          <span className="text-muted-foreground text-xs font-semibold">
            {passedCount}/{totalCount} testcases passed
          </span>
          <span className="text-muted-foreground text-xs pl-2 border-l border-border/40 font-mono">
            Runtime: {runtimeDisplay}
          </span>
        </div>
        <div className="text-xs text-muted-foreground font-medium flex items-center gap-1.5 font-mono">
          <IconCpu className="h-3.5 w-3.5 text-emerald-500" />
          {memoryDisplay}
        </div>
      </div>

      {/* Case Selector Buttons */}
      <div className="flex flex-wrap items-center gap-1.5 select-none border-b border-border/50 pb-2.5">
        {runResult.cases.map((c: any, index: number) => {
          const isSelected = selectedCaseIndex === index;
          const isPassed = c.passed;
          return (
            <button
              key={index}
              type="button"
              onClick={() => setSelectedCaseIndex(index)}
              className={cn(
                "inline-flex items-center gap-1.5 h-7 px-3 text-xs rounded-lg transition-all select-none cursor-pointer",
                isSelected
                  ? isPassed
                    ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/40 shadow-xs font-semibold"
                    : "bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/40 shadow-xs font-semibold"
                  : isPassed
                  ? "text-emerald-600/75 dark:text-emerald-400/75 hover:text-emerald-600 dark:hover:text-emerald-300 hover:bg-emerald-500/10 border border-transparent font-medium"
                  : "text-rose-600/75 dark:text-rose-400/75 hover:text-rose-600 dark:hover:text-rose-300 hover:bg-rose-500/10 border border-transparent font-medium"
              )}
            >
              <span
                className={cn(
                  "size-1.5 rounded-full shrink-0",
                  isPassed
                    ? "bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.5)]"
                    : "bg-rose-500 shadow-[0_0_6px_rgba(244,63,94,0.5)]"
                )}
              />
              Case {index + 1}
            </button>
          );
        })}
      </div>

      {/* Case Details: Input, Output, Expected */}
      <div className="space-y-3 font-mono text-xs select-text">
        {/* Input */}
        <div className="space-y-1">
          <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block select-none">
            Input
          </span>
          <div className="space-y-1.5 bg-muted/20 border border-border/40 rounded-lg p-2.5">
            {iterator.map((paramOrLine: string, idx: number) => (
              <div key={idx} className="flex items-center gap-2">
                <span className="font-semibold text-muted-foreground">
                  {paramNames.length > 0 ? paramOrLine : `param${idx + 1}`} =
                </span>
                {renderTestcaseValue(rawLines[idx] || "")}
              </div>
            ))}
          </div>
        </div>

        {/* Output vs Expected Side-by-Side */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block select-none">
              Output
            </span>
            <div
              className={cn(
                "p-2.5 rounded-lg border text-xs max-h-32 overflow-y-auto leading-relaxed",
                activeCase.passed
                  ? "bg-emerald-500/5 border-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                  : "bg-rose-500/5 border-rose-500/20 text-rose-600 dark:text-rose-400 font-bold"
              )}
            >
              {renderTestcaseValue(truncateText(activeCase.actual || "(empty)"))}
            </div>
          </div>

          <div className="space-y-1">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block select-none">
              Expected
            </span>
            <div className="p-2.5 bg-emerald-500/5 border border-emerald-500/20 rounded-lg text-emerald-700 dark:text-emerald-400 text-xs max-h-32 overflow-y-auto leading-relaxed">
              {renderTestcaseValue(truncateText(activeCase.expected || "(none)"))}
            </div>
          </div>
        </div>

        {/* Case error diagnostics if present */}
        {(activeCase.compile_output || activeCase.stderr) && (
          <div className="mt-3 p-3 bg-rose-500/5 border border-rose-500/20 rounded-lg">
            <p className="text-xs font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider flex items-center gap-1.5 mb-1.5">
              <IconAlertTriangle className="h-3.5 w-3.5" /> Error Diagnostics
            </p>
            <pre className="p-2.5 bg-black/40 border border-border/80 rounded-lg text-rose-400 text-xs font-mono whitespace-pre-wrap max-h-48 overflow-y-auto leading-relaxed">
              {formatErrorDiagnostic(
                activeCase.compile_output || activeCase.stderr,
                runResult.lineOffset || 0,
                selectedLang.name
              )}
            </pre>
          </div>
        )}

        {/* Console Stdout logs */}
        {activeCase.console_output && activeCase.console_output.trim() !== "" && (
          <div className="mt-3 rounded-xl overflow-hidden border border-zinc-800 bg-[#0a0a0a] shadow-inner">
            <div className="flex items-center px-3 py-1.5 bg-[#18181b] border-b border-zinc-800 select-none">
              <IconTerminal2 className="h-3.5 w-3.5 text-zinc-400 mr-1.5" />
              <span className="text-[10px] text-zinc-400 uppercase tracking-widest font-bold">
                Console Output
              </span>
            </div>
            <div className="p-2.5 max-h-36 overflow-y-auto">
              <pre className="text-zinc-300 text-xs font-mono whitespace-pre-wrap leading-relaxed">
                {activeCase.console_output}
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
