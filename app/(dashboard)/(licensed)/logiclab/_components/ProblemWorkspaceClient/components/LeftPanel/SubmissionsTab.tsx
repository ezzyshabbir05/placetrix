"use client";

import React, { useState } from "react";
import dynamic from "next/dynamic";
import { toast } from "sonner";
import {
  IconCircleCheck,
  IconCircleX,
  IconClock,
  IconCpu,
  IconCopy,
  IconRefresh,
  IconCode,
} from "@tabler/icons-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Empty, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { getSubmissionCode } from "@/app/(dashboard)/(licensed)/logiclab/problems/[id]/notes-actions";
import { getFriendlyErrorMessage } from "@/lib/errors";
import { Submission, Language } from "@/app/(dashboard)/(licensed)/logiclab/_types";
import { LANGUAGES } from "@/app/(dashboard)/(licensed)/logiclab/_constants";
import { formatMemory, formatRuntime } from "../Utils/testcaseUtils";
import { cn } from "@/lib/utils";

const Editor = dynamic(() => import("@monaco-editor/react"), { ssr: false });

interface SubmissionsTabProps {
  submissions: Submission[];
  isTransitioning: boolean;
  problemId: string;
  isDailyChallenge?: boolean;
  dailyChallengeId?: string;
  onRestoreCode: (code: string, lang: Language) => void;
}

export function SubmissionsTab({
  submissions,
  isTransitioning,
  problemId,
  isDailyChallenge = false,
  dailyChallengeId,
  onRestoreCode,
}: SubmissionsTabProps) {
  const { resolvedTheme } = useTheme();
  const monacoTheme = resolvedTheme === "light" ? "vs" : "vs-dark";

  const [viewingSubmission, setViewingSubmission] = useState<Submission | null>(null);
  const [viewingCode, setViewingCode] = useState<string>("");
  const [loadingCode, setLoadingCode] = useState<boolean>(false);

  const handleViewPastSubmission = async (sub: Submission) => {
    setViewingSubmission(sub);
    setLoadingCode(true);
    setViewingCode("");
    try {
      const res = await getSubmissionCode(sub.id, !!isDailyChallenge);
      if (res.error || !res.code) {
        throw new Error(res.error || "Submission code not found.");
      }
      setViewingCode(res.code);
    } catch (err: any) {
      toast.error(getFriendlyErrorMessage(err, "Failed to load submission code."));
      setViewingSubmission(null);
    } finally {
      setLoadingCode(false);
    }
  };

  const handleCopy = (text: string) => {
    if (!text) return;
    navigator.clipboard
      .writeText(text)
      .then(() => toast.success("Copied to clipboard!"))
      .catch(() => toast.error("Failed to copy code."));
  };

  if (isTransitioning) {
    return (
      <div className="flex flex-col w-full space-y-3 p-5 pt-4">
        <Skeleton className="h-16 rounded-xl w-full" />
        <Skeleton className="h-16 rounded-xl w-full" />
        <Skeleton className="h-16 rounded-xl w-full" />
      </div>
    );
  }

  return (
    <ScrollArea className="h-full w-full">
      <div className="p-4 space-y-2.5">
        {submissions.length > 0 ? (
          submissions.map((sub) => {
            const isExpanded = viewingSubmission?.id === sub.id;
            const canViewCode = sub.status === "Accepted";
            const subLang = LANGUAGES.find((l: any) => l.id === sub.language_id);

            return (
              <Card
                key={sub.id}
                className={cn(
                  "gap-0 border shadow-none transition-all select-none p-0 overflow-hidden",
                  sub.status === "Accepted"
                    ? "border-emerald-500/30 bg-emerald-500/5 hover:bg-emerald-500/10 cursor-pointer"
                    : "border-border/60 bg-card hover:bg-muted/40"
                )}
              >
                <div
                  onClick={() => {
                    if (canViewCode) {
                      if (isExpanded) {
                        setViewingSubmission(null);
                      } else {
                        handleViewPastSubmission(sub);
                      }
                    }
                  }}
                  className="flex items-center justify-between p-3"
                  title={
                    canViewCode
                      ? "Click to view submitted code"
                      : "Code only saved for accepted solutions"
                  }
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Badge
                          variant={sub.status === "Accepted" ? "success" : "destructive"}
                          className="text-xs font-semibold px-2 py-0.5 h-5 gap-1"
                        >
                          {sub.status === "Accepted" ? (
                            <IconCircleCheck className="h-3 w-3 shrink-0" />
                          ) : (
                            <IconCircleX className="h-3 w-3 shrink-0" />
                          )}
                          <span>{sub.status}</span>
                        </Badge>

                        {canViewCode && (
                          <span className="text-[11px] text-muted-foreground hover:text-foreground font-medium transition-colors">
                            {isExpanded ? "Hide code" : "View code →"}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Badge variant="outline" className="text-[10px] font-mono py-0 h-4">
                          {sub.passed_count}/{sub.total_count} passed
                        </Badge>
                        <Badge variant="secondary" className="text-[10px] py-0 h-4">
                          {subLang?.name || "Unknown"}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="flex items-center gap-2.5 text-xs text-muted-foreground justify-end">
                      {sub.runtime !== null && (
                        <span className="flex items-center gap-1 font-mono">
                          <IconClock className="h-3 w-3" />
                          {formatRuntime(sub.runtime)}
                        </span>
                      )}
                      {sub.memory !== null && (
                        <span className="flex items-center gap-1 font-mono">
                          <IconCpu className="h-3 w-3" />
                          {formatMemory(sub.memory, false)}
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-muted-foreground/70 mt-1">
                      {new Date(sub.created_at).toLocaleString([], {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>

                {/* Expandable Editor Viewer */}
                {isExpanded && (
                  <div className="border-t border-border/60 overflow-hidden shadow-xs animate-in slide-in-from-top-1 fade-in duration-200">
                    {loadingCode ? (
                      <div className="p-8 text-center text-xs uppercase tracking-wider font-bold text-muted-foreground animate-pulse bg-muted/20">
                        Loading code...
                      </div>
                    ) : (
                      <div className="h-80 w-full relative bg-background group/editor">
                        <Editor
                          height="100%"
                          language={subLang?.value || "javascript"}
                          value={viewingCode ? viewingCode.replace(/^[\r\n]+/, "") : "// Code not available"}
                          theme={monacoTheme}
                          options={{
                            readOnly: true,
                            fontSize: 12,
                            minimap: { enabled: false },
                            scrollBeyondLastLine: false,
                            smoothScrolling: true,
                            wordWrap: "on",
                            padding: { top: 12, bottom: 12 },
                            scrollbar: { vertical: "hidden", horizontal: "hidden" },
                          }}
                        />

                        {/* Floating Action Buttons */}
                        <div className="absolute top-2 right-2 flex items-center gap-1.5 opacity-0 group-hover/editor:opacity-100 transition-opacity z-10">
                          <Button
                            variant="secondary"
                            size="xs"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCopy(viewingCode);
                            }}
                            className="h-7 text-xs font-medium shadow-sm gap-1 bg-background/90 hover:bg-background border border-border/80"
                          >
                            <IconCopy className="h-3.5 w-3.5" />
                            Copy
                          </Button>

                          {subLang && (
                            <Button
                              variant="secondary"
                              size="xs"
                              onClick={(e) => {
                                e.stopPropagation();
                                onRestoreCode(viewingCode, subLang);
                                toast.success(`Restored submission in ${subLang.name}!`);
                              }}
                              className="h-7 text-xs font-semibold shadow-sm gap-1 bg-background/90 hover:bg-background border border-border/80"
                            >
                              <IconRefresh className="h-3.5 w-3.5 text-emerald-500" />
                              Restore
                            </Button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </Card>
            );
          })
        ) : (
          <Empty className="py-24 text-center">
            <EmptyMedia>
              <IconCode className="size-8 text-muted-foreground/30" />
            </EmptyMedia>
            <EmptyTitle className="text-xs uppercase font-bold tracking-wider text-muted-foreground/70">
              No Submissions Yet
            </EmptyTitle>
          </Empty>
        )}
      </div>
    </ScrollArea>
  );
}
