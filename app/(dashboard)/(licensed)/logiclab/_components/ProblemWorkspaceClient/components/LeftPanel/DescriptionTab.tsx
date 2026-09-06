"use client";

import React from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ProblemDescriptionViewer } from "../../ProblemDescriptionViewer";
import { CompanyBadge } from "@/app/(dashboard)/(licensed)/logiclab/_components/CompanyBadge";
import { getProblemCompanyBadges, isCompanyTag } from "@/app/(dashboard)/(licensed)/logiclab/_constants/companies";
import { Problem, SampleTestCase } from "@/app/(dashboard)/(licensed)/logiclab/_types";
import { renderTestcaseValue } from "../Utils/testcaseUtils";

interface DescriptionTabProps {
  problem: Problem;
  sampleTestCases: SampleTestCase[];
  paramNames: string[];
  isTransitioning: boolean;
}

export function DescriptionTab({
  problem,
  sampleTestCases,
  paramNames,
  isTransitioning,
}: DescriptionTabProps) {
  if (isTransitioning) {
    return (
      <div className="flex flex-col w-full space-y-4 p-5 pt-4">
        <Skeleton className="h-7 w-1/2 mb-2" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-4 w-4/5" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-4 w-3/4 mt-8" />
        <Skeleton className="h-28 w-full mt-2 rounded-xl" />
      </div>
    );
  }

  const companyBadges = getProblemCompanyBadges(problem);
  const topicTags = (problem.tags || []).filter((tag: string) => !isCompanyTag(tag));

  return (
    <ScrollArea className="h-full w-full">
      <div className="p-5 space-y-6 select-text">
        {/* Title, Difficulty & Metadata Header */}
        <div className="space-y-3">
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-bold text-foreground tracking-tight">
              {problem.number ? `${problem.number}. ` : ""}
              {problem.title}
            </h1>
            <Badge
              variant={
                problem.difficulty === "Easy"
                  ? "success"
                  : problem.difficulty === "Medium"
                  ? "warning"
                  : "destructive"
              }
              className="text-xs font-semibold px-2 py-0.5"
            >
              {problem.difficulty || "Hard"}
            </Badge>
          </div>

          {/* Company Badges & Topic Badges */}
          <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
            {companyBadges.map((badge) => (
              <CompanyBadge key={badge.company.id} company={badge.company} />
            ))}

            {topicTags.map((tag: string, i: number) => (
              <Badge key={i} variant="secondary" className="text-[11px] font-medium tracking-wide">
                {tag}
              </Badge>
            ))}
          </div>
        </div>

        {/* Markdown Description */}
        <div className="text-sm text-foreground/90 leading-relaxed">
          <ProblemDescriptionViewer content={problem.description} />
        </div>

        {/* Sample Test Cases using standardized shadcn Cards */}
        {sampleTestCases.length > 0 && (
          <div className="space-y-4 pt-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Examples
            </h3>
            {sampleTestCases.map((tc, idx) => (
              <Card
                key={tc.id}
                className="gap-0 border-border/60 bg-muted/15 shadow-none overflow-hidden"
              >
                <CardHeader className="py-2 px-3.5 bg-muted/30 border-b border-border/40 gap-0">
                  <CardTitle className="text-xs font-semibold text-foreground">
                    Example {idx + 1}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-3.5 space-y-2.5 font-mono text-xs">
                  <div>
                    <span className="font-bold text-muted-foreground block text-[11px] mb-1 uppercase tracking-wider select-none font-sans">
                      Input:
                    </span>
                    <div className="flex flex-col space-y-1">
                      {tc.input
                        .trim()
                        .split("\n")
                        .map((val: string, i: number) => (
                          <div
                            key={i}
                            className={val.startsWith("[") ? "flex flex-col" : "flex items-center"}
                          >
                            <span className="font-semibold mr-2 text-muted-foreground whitespace-nowrap">
                              {paramNames[i] || `param${i + 1}`} =
                            </span>
                            {renderTestcaseValue(val)}
                          </div>
                        ))}
                    </div>
                  </div>

                  <div>
                    <span className="font-bold text-muted-foreground block text-[11px] mb-1 uppercase tracking-wider select-none font-sans">
                      Output:
                    </span>
                    {renderTestcaseValue(tc.expected_output)}
                  </div>

                  {tc.explanation && (
                    <div className="text-muted-foreground text-xs pt-2 border-t border-border/40 font-sans leading-relaxed">
                      <span className="font-bold text-foreground">Explanation: </span>
                      <span>{tc.explanation}</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Constraints & Limits */}
        <div className="space-y-4 pt-4 border-t border-border/50">
          {problem.constraints && problem.constraints.length > 0 && (
            <Card className="gap-0 border-border/60 bg-muted/15 shadow-none overflow-hidden">
              <CardHeader className="py-2 px-3.5 bg-muted/30 border-b border-border/40 gap-0">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Constraints
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3.5 space-y-1.5">
                <ul className="list-disc pl-4 space-y-1.5 text-xs text-foreground/90">
                  {problem.constraints.map((c: string, i: number) => (
                    <li key={i}>
                      <code className="px-1.5 py-0.5 bg-muted/60 rounded-md font-mono text-xs border border-border/50">
                        {c}
                      </code>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Limits Badges */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            {problem.time_limit && (
              <Badge variant="outline" className="font-mono text-xs font-normal">
                Time Limit: <span className="text-foreground font-semibold ml-1">{problem.time_limit}s</span>
              </Badge>
            )}
            {problem.memory_limit && (
              <Badge variant="outline" className="font-mono text-xs font-normal">
                Memory Limit: <span className="text-foreground font-semibold ml-1">{problem.memory_limit}MB</span>
              </Badge>
            )}
          </div>
        </div>
      </div>
    </ScrollArea>
  );
}
