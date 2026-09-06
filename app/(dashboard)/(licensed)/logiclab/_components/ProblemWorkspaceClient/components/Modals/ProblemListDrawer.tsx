"use client";

import React from "react";
import { IconSearch, IconCheck } from "@tabler/icons-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectGroup,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { InputGroup, InputGroupAddon } from "@/components/ui/input-group";
import { Item, ItemGroup, ItemContent, ItemTitle, ItemActions } from "@/components/ui/item";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Empty, EmptyTitle } from "@/components/ui/empty";
import { cn } from "@/lib/utils";

interface ProblemListDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentProblemId: string;
  problemList: any[];
  totalCount: number;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  statusFilter: "all" | "solved" | "unsolved";
  onStatusFilterChange: (val: "all" | "solved" | "unsolved") => void;
  difficultyFilter: "all" | "easy" | "medium" | "hard";
  onDifficultyFilterChange: (val: "all" | "easy" | "medium" | "hard") => void;
  isLoading: boolean;
  isNextPageLoading: boolean;
  sentinelRef: React.RefObject<HTMLDivElement | null>;
  onSelectProblem: (id: string) => void;
}

export function ProblemListDrawer({
  open,
  onOpenChange,
  currentProblemId,
  problemList,
  totalCount,
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  difficultyFilter,
  onDifficultyFilterChange,
  isLoading,
  isNextPageLoading,
  sentinelRef,
  onSelectProblem,
}: ProblemListDrawerProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="left"
        showCloseButton={true}
        className={cn("w-[340px] sm:max-w-[340px] p-0 flex flex-col gap-0 border-r")}
      >
        <SheetHeader className="border-b px-4 py-3 shrink-0 flex flex-row items-center justify-between space-y-0 pr-8">
          <SheetTitle className="font-bold text-base">Problem List</SheetTitle>
          <Badge variant="secondary" className="text-xs font-semibold tracking-wide">
            {totalCount} Problems
          </Badge>
          <SheetDescription className="sr-only">Browse and search problems</SheetDescription>
        </SheetHeader>

        <div className="p-3 border-b shrink-0 bg-muted/20 flex flex-col gap-2">
          {/* Standardized Search bar with InputGroup */}
          <InputGroup className="h-8 bg-background shadow-none">
            <InputGroupAddon align="inline-start">
              <IconSearch className="size-4 text-muted-foreground" />
            </InputGroupAddon>
            <Input
              type="text"
              placeholder="Search by title or ID..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="text-xs border-0 bg-transparent shadow-none focus-visible:ring-0 h-full"
            />
          </InputGroup>

          {/* Filters */}
          <div className="flex items-center gap-2">
            <Select value={statusFilter} onValueChange={onStatusFilterChange}>
              <SelectTrigger size="sm" className="flex-1 text-xs font-medium">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent position="popper" sideOffset={4} className="z-10000">
                <SelectGroup>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="unsolved">Unsolved</SelectItem>
                  <SelectItem value="solved">Solved</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>

            <Select value={difficultyFilter} onValueChange={onDifficultyFilterChange}>
              <SelectTrigger size="sm" className="flex-1 text-xs font-medium">
                <SelectValue placeholder="Difficulty" />
              </SelectTrigger>
              <SelectContent position="popper" sideOffset={4} className="z-10000">
                <SelectGroup>
                  <SelectItem value="all">All Levels</SelectItem>
                  <SelectItem value="easy">Easy</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="hard">Hard</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
        </div>

        <ScrollArea id="problem-list-scroll-area" className="flex-1 w-full min-h-0">
          <div className="py-1">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3">
                <Spinner className="size-6 text-emerald-500" />
                <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">
                  Loading...
                </span>
              </div>
            ) : problemList.length > 0 ? (
              <>
                <ItemGroup className="gap-0.5 px-1.5 py-1">
                  {problemList.map((p) => {
                    const isActive = p.id === currentProblemId;
                    return (
                      <Item
                        key={p.id}
                        id={isActive ? "active-problem-link" : undefined}
                        variant={isActive ? "muted" : "default"}
                        size="sm"
                        onClick={() => {
                          onSelectProblem(p.id);
                          onOpenChange(false);
                        }}
                        className={cn(
                          "cursor-pointer rounded-lg px-2.5 py-2 select-none justify-between transition-colors",
                          isActive && "bg-muted font-semibold border-l-2 border-primary"
                        )}
                      >
                        <ItemContent className="flex items-center gap-2 min-w-0 pr-2">
                          {p.isSolved ? (
                            <IconCheck className="size-4 text-emerald-500 shrink-0" />
                          ) : (
                            <span className="size-4 shrink-0" />
                          )}
                          <ItemTitle className={cn("text-xs truncate", isActive ? "font-bold text-foreground" : "font-medium text-foreground/90")}>
                            {p.number ? `${p.number}. ` : ""}{p.title}
                          </ItemTitle>
                        </ItemContent>
                        <ItemActions>
                          <Badge
                            variant={
                              p.difficulty === "Easy"
                                ? "success"
                                : p.difficulty === "Medium"
                                ? "warning"
                                : "destructive"
                            }
                            className="text-[10px] font-semibold shrink-0 px-1.5 py-0 h-4"
                          >
                            {p.difficulty === "Medium" ? "Med." : p.difficulty}
                          </Badge>
                        </ItemActions>
                      </Item>
                    );
                  })}
                </ItemGroup>

                {/* Infinite Scroll Sentinel */}
                <div ref={sentinelRef} className="h-10 flex items-center justify-center">
                  {isNextPageLoading && <Spinner className="size-4 text-emerald-500" />}
                </div>
              </>
            ) : (
              <Empty className="py-20 text-muted-foreground">
                <EmptyTitle className="text-xs">No problems found.</EmptyTitle>
              </Empty>
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
