"use client";

import React, { useState } from "react";
import { toast } from "sonner";
import {
  IconPlus,
  IconX,
  IconCopy,
  IconCheck,
  IconRefresh,
  IconTarget,
  IconAlertCircle,
  IconTerminal2,
} from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { SampleTestCase } from "@/app/(dashboard)/(licensed)/logiclab/_types";
import { cn } from "@/lib/utils";

interface TestcasesTabProps {
  sampleTestCases: SampleTestCase[];
  customInputs: string[];
  setCustomInputs: React.Dispatch<React.SetStateAction<string[]>>;
  customExpectedOutputs: string[];
  setCustomExpectedOutputs: React.Dispatch<React.SetStateAction<string[]>>;
  activeTestcaseIndex: number;
  setActiveTestcaseIndex: (idx: number) => void;
  paramNames: string[];
  isTransitioning: boolean;
}

// Lightweight bracket & quote balancer check for instant developer feedback
function getBracketWarning(val: string): string | null {
  const trimmed = val.trim();
  if (!trimmed) return null;
  const stack: string[] = [];
  const map: Record<string, string> = { ")": "(", "]": "[", "}": "{" };
  let inString = false;
  let quoteChar = "";
  let escape = false;

  for (let i = 0; i < trimmed.length; i++) {
    const char = trimmed[i];
    if (escape) {
      escape = false;
      continue;
    }
    if (char === "\\") {
      escape = true;
      continue;
    }
    if (char === '"' || char === "'") {
      if (!inString) {
        inString = true;
        quoteChar = char;
      } else if (char === quoteChar) {
        inString = false;
        quoteChar = "";
      }
      continue;
    }
    if (inString) continue;

    if (char === "(" || char === "[" || char === "{") {
      stack.push(char);
    } else if (char === ")" || char === "]" || char === "}") {
      if (stack.length === 0 || stack[stack.length - 1] !== map[char]) {
        return `Unexpected '${char}'`;
      }
      stack.pop();
    }
  }
  if (inString) return "Unclosed string literal";
  if (stack.length > 0) {
    const last = stack[stack.length - 1];
    const expected = last === "(" ? ")" : last === "[" ? "]" : "}";
    return `Unclosed '${last}' (missing '${expected}')`;
  }
  return null;
}

export function TestcasesTab({
  sampleTestCases,
  customInputs,
  setCustomInputs,
  customExpectedOutputs,
  setCustomExpectedOutputs,
  activeTestcaseIndex,
  setActiveTestcaseIndex,
  paramNames,
  isTransitioning,
}: TestcasesTabProps) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleCopyValue = (text: string, label: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedKey(label);
    toast.success(`Copied ${label}`);
    setTimeout(() => setCopiedKey(null), 1500);
  };

  if (isTransitioning) {
    return (
      <div className="flex flex-col w-full space-y-4 p-1 animate-pulse">
        <div className="flex items-center gap-2 pb-2.5 border-b border-border/40">
          <Skeleton className="h-7 w-20 rounded-lg" />
          <Skeleton className="h-7 w-20 rounded-lg" />
          <Skeleton className="h-7 w-7 rounded-lg" />
          <Skeleton className="h-7 w-16 rounded-lg ml-auto" />
        </div>
        <div className="space-y-3">
          <Card className="gap-0 p-0 border-border/40 bg-muted/10">
            <CardHeader className="py-2 px-3 border-b border-border/30">
              <Skeleton className="h-4 w-28 rounded" />
            </CardHeader>
            <CardContent className="p-3">
              <Skeleton className="h-10 w-full rounded-lg" />
            </CardContent>
          </Card>
          <Card className="gap-0 p-0 border-border/40 bg-muted/10">
            <CardHeader className="py-2 px-3 border-b border-border/30">
              <Skeleton className="h-4 w-36 rounded" />
            </CardHeader>
            <CardContent className="p-3">
              <Skeleton className="h-10 w-full rounded-lg" />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (customInputs.length === 0) {
    return (
      <Card className="flex flex-col items-center justify-center py-8 px-4 text-center border-dashed border-border/70 bg-muted/10 space-y-3 my-2 select-none">
        <div className="p-3 rounded-full bg-muted/40 text-muted-foreground">
          <IconTerminal2 className="size-6" />
        </div>
        <div className="space-y-1">
          <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
            No Test Cases Configured
          </h4>
          <p className="text-xs text-muted-foreground max-w-xs">
            Add a custom test case to evaluate your solution against custom inputs.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            const emptyInput = paramNames.map(() => "").join("\n");
            setCustomInputs([emptyInput]);
            setCustomExpectedOutputs([""]);
            setActiveTestcaseIndex(0);
          }}
          className="h-8 text-xs font-semibold gap-1.5 cursor-pointer"
        >
          <IconPlus className="size-3.5" />
          Add Test Case
        </Button>
      </Card>
    );
  }

  const currentInput = customInputs[activeTestcaseIndex] || "";
  const currentExpected = customExpectedOutputs[activeTestcaseIndex] || "";
  const isCustomCase = activeTestcaseIndex >= sampleTestCases.length;

  const handleInputChange = (lineIdx: number, newVal: string) => {
    setCustomInputs((prev) => {
      const next = [...prev];
      const lines = (next[activeTestcaseIndex] || "").split("\n");
      lines[lineIdx] = newVal;
      next[activeTestcaseIndex] = lines.join("\n");
      return next;
    });
  };

  const handleExpectedChange = (newVal: string) => {
    setCustomExpectedOutputs((prev) => {
      const next = [...prev];
      next[activeTestcaseIndex] = newVal;
      return next;
    });
  };

  const handleAddCase = () => {
    if (customInputs.length >= 8) {
      toast.error("Maximum of 8 test cases allowed");
      return;
    }
    const emptyInput = paramNames.map(() => "").join("\n");
    setCustomInputs([...customInputs, emptyInput]);
    setCustomExpectedOutputs([...customExpectedOutputs, ""]);
    setActiveTestcaseIndex(customInputs.length);
  };

  const handleDeleteCase = (idxToDelete: number) => {
    const newInputs = customInputs.filter((_, idx) => idx !== idxToDelete);
    const newExpected = customExpectedOutputs.filter((_, idx) => idx !== idxToDelete);
    setCustomInputs(newInputs);
    setCustomExpectedOutputs(newExpected);
    if (activeTestcaseIndex >= newInputs.length) {
      setActiveTestcaseIndex(Math.max(0, newInputs.length - 1));
    } else if (activeTestcaseIndex === idxToDelete) {
      setActiveTestcaseIndex(Math.max(0, idxToDelete - 1));
    }
    toast.success("Test case removed");
  };

  const handleResetDefaults = () => {
    const defaultInputs = sampleTestCases.map((tc) => tc.input);
    const defaultOutputs = sampleTestCases.map((tc) => tc.expected_output || "");
    setCustomInputs(defaultInputs);
    setCustomExpectedOutputs(defaultOutputs);
    setActiveTestcaseIndex(0);
    toast.info("Reset test cases to problem defaults");
  };

  const rawLines = currentInput.split("\n").map((l) => l.trim());
  const iterator = paramNames.length > 0 ? paramNames : rawLines;

  return (
    <div className="space-y-4">
      {/* Testcase Navigation Bar */}
      <div className="flex items-center justify-between gap-2 select-none border-b border-border/50 pb-2.5">
        <div className="flex flex-wrap items-center gap-1.5 min-w-0">
          {customInputs.map((_, index) => {
            const isSelected = activeTestcaseIndex === index;
            const isCustom = index >= sampleTestCases.length;

            return (
              <Button
                key={index}
                variant={isSelected ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setActiveTestcaseIndex(index)}
                className={cn(
                  "h-7 px-2.5 text-xs font-semibold rounded-lg transition-all gap-1.5",
                  isSelected
                    ? "bg-secondary text-secondary-foreground border border-border/80 shadow-xs"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50 border border-transparent font-medium"
                )}
              >
                <span>Case {index + 1}</span>
                {isCustom && (
                  <span
                    role="button"
                    tabIndex={0}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteCase(index);
                    }}
                    title="Delete this custom test case"
                    className="rounded-md p-0.5 text-muted-foreground/70 hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
                  >
                    <IconX className="size-3" />
                  </span>
                )}
              </Button>
            );
          })}

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                onClick={handleAddCase}
                disabled={customInputs.length >= 8}
                className="h-7 w-7 border-dashed border-border/70 hover:border-border"
              >
                <IconPlus className="size-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              {customInputs.length >= 8 ? "Maximum 8 test cases allowed" : "Add custom test case"}
            </TooltipContent>
          </Tooltip>
        </div>

        {/* Reset to Problem Defaults */}
        {sampleTestCases.length > 0 && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleResetDefaults}
                className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground gap-1 shrink-0 ml-auto"
              >
                <IconRefresh className="size-3.5" />
                <span className="hidden sm:inline">Reset Defaults</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Reset test cases to problem defaults</TooltipContent>
          </Tooltip>
        )}
      </div>

      {/* Structured Parameter Cards */}
      <div className="space-y-3">
        {iterator.map((paramOrLine, idx) => {
          const paramName = paramNames.length > 0 ? paramOrLine : `param${idx + 1}`;
          const line = rawLines[idx] || "";
          const bracketWarning = getBracketWarning(line);
          const isCopied = copiedKey === paramName;

          return (
            <Card
              key={idx}
              className="gap-0 border-border/60 bg-muted/15 shadow-none overflow-hidden transition-colors focus-within:border-border"
            >
              {/* Parameter Card Header */}
              <CardHeader className="flex flex-row items-center justify-between px-3 py-1.5 bg-muted/30 border-b border-border/40 text-xs select-none space-y-0">
                <div className="flex items-center gap-1.5 font-mono">
                  <span className="text-primary font-bold">$</span>
                  <span className="font-semibold text-foreground">{paramName}</span>
                  <Badge variant="outline" className="text-[10px] font-sans uppercase tracking-wider ml-1 py-0 h-4">
                    Param
                  </Badge>
                </div>
                <Button
                  variant="ghost"
                  size="xs"
                  onClick={() => handleCopyValue(line, paramName)}
                  title={`Copy ${paramName}`}
                  className="h-5 px-1.5 text-[11px] font-medium text-muted-foreground hover:text-foreground gap-1"
                >
                  {isCopied ? (
                    <IconCheck className="size-3 text-emerald-500" />
                  ) : (
                    <IconCopy className="size-3" />
                  )}
                  <span>{isCopied ? "Copied" : "Copy"}</span>
                </Button>
              </CardHeader>

              {/* Parameter Code Cell Input */}
              <CardContent className="p-2.5 space-y-1.5">
                <Textarea
                  rows={
                    line.includes("\n") || line.length > 80
                      ? Math.min(6, (line.split("\n").length || 1) + 1)
                      : 1
                  }
                  value={line}
                  onChange={(e) => handleInputChange(idx, e.target.value)}
                  className="w-full resize-y min-h-[34px] font-mono text-xs px-3 py-2 bg-background/80 dark:bg-input/20 border-border/70 rounded-lg text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:border-ring transition-colors leading-relaxed placeholder:text-muted-foreground/50 shadow-none"
                  placeholder={`Enter value for ${paramName}...`}
                />

                {/* Real-time Syntax / Bracket Warning */}
                {bracketWarning && (
                  <div className="flex items-center gap-1 text-[11px] text-amber-500 font-mono pl-1">
                    <IconAlertCircle className="size-3.5 shrink-0" />
                    <span>{bracketWarning}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}

        {/* Expected Output Target Card */}
        <Card className="gap-0 border-border/60 bg-muted/15 shadow-none overflow-hidden transition-colors focus-within:border-border">
          <CardHeader className="flex flex-row items-center justify-between px-3 py-1.5 bg-muted/30 border-b border-border/40 text-xs select-none space-y-0">
            <div className="flex items-center gap-1.5 font-mono">
              <IconTarget className="size-3.5 text-emerald-500 shrink-0" />
              <span className="font-semibold text-foreground">Expected Output</span>
              <Badge variant="outline" className="text-[10px] font-sans uppercase tracking-wider ml-1 py-0 h-4">
                {isCustomCase ? "Optional Target" : "Target"}
              </Badge>
            </div>
            {currentExpected && (
              <Button
                variant="ghost"
                size="xs"
                onClick={() => handleCopyValue(currentExpected, "Expected Output")}
                title="Copy expected output"
                className="h-5 px-1.5 text-[11px] font-medium text-muted-foreground hover:text-foreground gap-1"
              >
                {copiedKey === "Expected Output" ? (
                  <IconCheck className="size-3 text-emerald-500" />
                ) : (
                  <IconCopy className="size-3" />
                )}
                <span>{copiedKey === "Expected Output" ? "Copied" : "Copy"}</span>
              </Button>
            )}
          </CardHeader>

          <CardContent className="p-2.5">
            <Input
              type="text"
              value={currentExpected}
              onChange={(e) => handleExpectedChange(e.target.value)}
              placeholder={
                isCustomCase
                  ? "Optional return value to compare against (e.g. 5, [0, 1])"
                  : "Expected return value"
              }
              className="w-full font-mono text-xs px-3 py-2 bg-background/80 dark:bg-input/20 border-border/70 rounded-lg text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:border-ring transition-colors leading-relaxed placeholder:text-muted-foreground/50 shadow-none h-8.5"
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
