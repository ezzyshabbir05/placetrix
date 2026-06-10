"use client";

import React, { useState, useMemo, useCallback, useEffect, useTransition, useRef } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import {
  Search,
  X,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Loader2,
  Inbox,
  Clock,
  ArrowRight,
  CheckCircle2,
  Activity,
  HelpCircle,
  Hash,
  Plus,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { UserProfile } from "@/lib/supabase/profile";

type TabType = "all" | "open" | "in_progress" | "resolved" | "closed";

interface GetHelpClientProps {
  userProfile: UserProfile;
  tickets: any[];
  initialPage: number;
  initialPageSize: number;
  initialSearch: string;
  initialTab: string;
  totalCount: number;
  tabCounts: { all: number; open: number; in_progress: number; resolved: number; closed: number };
}

export function formatDateTime(dt?: string): string {
  if (!dt) return "—";
  return new Date(dt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
}

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case "open":
      return (
        <Badge className="gap-1 border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-50 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-300 text-[11px] px-2 py-0.5">
          Open
        </Badge>
      );
    case "in_progress":
      return (
        <Badge className="gap-1 border border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-50 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300 text-[11px] px-2 py-0.5">
          In Progress
        </Badge>
      );
    case "resolved":
      return (
        <Badge className="gap-1 border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300 text-[11px] px-2 py-0.5">
          Resolved
        </Badge>
      );
    case "closed":
      return (
        <Badge className="gap-1 border border-zinc-200 bg-zinc-50 text-zinc-700 hover:bg-zinc-50 dark:border-zinc-500/20 dark:bg-zinc-500/10 dark:text-zinc-300 text-[11px] px-2 py-0.5">
          Closed
        </Badge>
      );
    default:
      return (
        <Badge className="gap-1 border border-zinc-200 bg-zinc-50 text-zinc-700 hover:bg-zinc-50 dark:border-zinc-500/20 dark:bg-zinc-500/10 dark:text-zinc-300 text-[11px] px-2 py-0.5">
          {status}
        </Badge>
      );
  }
}

function StatChip({
  icon,
  children,
  tone = "neutral",
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
  tone?: "neutral" | "sky" | "emerald" | "amber" | "violet" | "rose";
}) {
  const tones = {
    neutral: "border-border/60 bg-muted/50 text-muted-foreground",
    sky: "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-500/20 dark:bg-sky-500/10 dark:text-sky-300",
    emerald:
      "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300",
    amber:
      "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300",
    violet:
      "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-500/20 dark:bg-violet-500/10 dark:text-violet-300",
    rose:
      "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-300",
  } as const;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium",
        tones[tone]
      )}
    >
      {icon}
      <span className="truncate">{children}</span>
    </span>
  );
}

function EmptyState({ isFiltered }: { isFiltered: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center gap-3 border border-dashed rounded-3xl bg-white/50 dark:bg-zinc-950/20">
      <div className="h-12 w-12 rounded-xl bg-muted flex items-center justify-center border text-muted-foreground">
        <Inbox className="h-5 w-5" />
      </div>
      <div className="space-y-0.5">
        <p className="text-sm font-medium">
          {isFiltered ? "No tickets match your filter" : "No tickets found"}
        </p>
        <p className="text-xs text-muted-foreground max-w-xs mx-auto mt-1">
          {isFiltered
            ? "Try adjusting your search terms or status filters"
            : "You don't have any support inquiries. Click 'Create Ticket' to submit one."}
        </p>
      </div>
    </div>
  );
}

function TicketCard({ ticket }: { ticket: any }) {
  return (
    <Card className="overflow-hidden border-border/70 bg-card p-0">
      <div className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:gap-4 md:p-5">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Link href={`/gethelp/${ticket.id}`} className="hover:underline underline-offset-2 block">
              <h3 className="min-w-0 text-sm md:text-base font-semibold leading-tight text-foreground font-sans">
                {ticket.title}
              </h3>
            </Link>
            <StatusBadge status={ticket.status} />
          </div>

          {ticket.description && (
            <p className="mt-1 line-clamp-1 text-xs leading-5 text-muted-foreground">
              {ticket.description}
            </p>
          )}

          <div className="mt-3 flex flex-wrap gap-2">
            <StatChip icon={<Hash className="h-3.5 w-3.5" />} tone="neutral">
              <span className="font-mono">{ticket.ticket_number}</span>
            </StatChip>
            <StatChip icon={<Clock className="h-3.5 w-3.5" />} tone="neutral">
              Opened: {formatDateTime(ticket.created_at)}
            </StatChip>
          </div>
        </div>

        <div className="flex flex-col gap-3 border-t border-border/60 pt-3 md:min-w-[120px] md:items-end md:pt-0 md:border-t-0 md:text-right">
          <Button
            asChild
            variant="outline"
            size="sm"
            className="w-full md:w-auto h-8 text-xs font-semibold gap-1 rounded-lg shadow-sm"
          >
            <Link href={`/gethelp/${ticket.id}`} className="group inline-flex items-center justify-center">
              View Ticket
            </Link>
          </Button>
        </div>
      </div>
    </Card>
  );
}

export default function GetHelpClient({
  userProfile,
  tickets,
  initialPage,
  initialPageSize,
  initialSearch,
  initialTab,
  totalCount,
  tabCounts,
}: GetHelpClientProps) {
  const router = useRouter();
  const pathname = usePathname();

  const [isPending, startTransition] = useTransition();

  // Local state for search input text
  const [searchInput, setSearchInput] = useState(initialSearch);

  // Tracks whether the last URL change was triggered by our own debounce
  const isOwnUpdateRef = useRef(false);

  useEffect(() => {
    if (isOwnUpdateRef.current) {
      isOwnUpdateRef.current = false;
      return;
    }
    setSearchInput(initialSearch);
  }, [initialSearch]);

  // Helper to push updated search parameters to the URL
  const updateParams = useCallback(
    (newParams: Partial<Record<string, string | number>>) => {
      const params = new URLSearchParams(window.location.search);
      Object.entries(newParams).forEach(([key, val]) => {
        if (val === undefined || val === "" || val === null) {
          params.delete(key);
        } else {
          params.set(key, String(val));
        }
      });
      startTransition(() => {
        router.push(`${pathname}?${params.toString()}`);
      });
    },
    [pathname, router]
  );

  // Debounce search input
  useEffect(() => {
    if (searchInput === initialSearch) return;

    const timer = setTimeout(() => {
      isOwnUpdateRef.current = true;
      updateParams({ search: searchInput, page: 1 });
    }, 400);
    return () => clearTimeout(timer);
  }, [searchInput, initialSearch, updateParams]);

  const activeTab = (initialTab || "all") as TabType;

  const tabConfig = [
    { value: "all" as TabType, label: "All", icon: <Inbox className="h-3.5 w-3.5" />, count: tabCounts.all },
    { value: "open" as TabType, label: "Open", icon: <HelpCircle className="h-3.5 w-3.5" />, count: tabCounts.open },
    { value: "in_progress" as TabType, label: "In Progress", icon: <Activity className="h-3.5 w-3.5" />, count: tabCounts.in_progress },
    { value: "resolved" as TabType, label: "Resolved", icon: <CheckCircle2 className="h-3.5 w-3.5" />, count: tabCounts.resolved },
    { value: "closed" as TabType, label: "Closed", icon: <X className="h-3.5 w-3.5" />, count: tabCounts.closed },
  ];

  const totalPages = Math.ceil(totalCount / initialPageSize);
  const activePage = Math.min(initialPage, Math.max(1, totalPages));

  return (
    <div className="flex flex-col gap-6 px-4 py-8 md:px-8 mx-auto w-full">
      {/* Page Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <h1 className="text-3xl font-bold font-cirka tracking-tight text-foreground">Get Help</h1>
          <p className="text-sm text-muted-foreground">
            {tabCounts.all} ticket{tabCounts.all !== 1 ? "s" : ""} total
            {tabCounts.open > 0 && (
              <span className="ml-2 inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 font-medium">
                <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" />
                {tabCounts.open} open
              </span>
            )}
          </p>
        </div>
        <Button
          size="sm"
          onClick={() => router.push("/gethelp/new")}
          className="gap-1.5 shrink-0"
        >
          <Plus className="h-3.5 w-3.5" />
          Create Ticket
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => updateParams({ tab: v, page: 1 })}>
        <div className="space-y-4">
          {/* Search (left) + Tabs (right) */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="relative w-full sm:max-w-xs">
              {isPending ? (
                <Loader2 className="absolute left-2.5 top-2.5 h-4 w-4 text-primary animate-spin" />
              ) : (
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              )}
              <Input
                placeholder="Search tickets..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="pl-9 pr-9 h-9 text-xs rounded-lg"
              />
              {searchInput && (
                <button
                  onClick={() => {
                    isOwnUpdateRef.current = true;
                    setSearchInput("");
                    updateParams({ search: "", page: 1 });
                  }}
                  className="absolute right-2.5 top-2.5 h-4 w-4 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            <div className="overflow-x-auto shrink-0 max-w-full sm:max-w-none">
              <TabsList className="inline-flex h-9 gap-0.5 rounded-lg bg-muted p-1">
                {tabConfig.map(({ value, label, count }) => (
                  <TabsTrigger
                    key={value}
                    value={value}
                    className="gap-1.5 rounded-md px-3 text-xs font-medium data-[state=active]:bg-background data-[state=active]:shadow-sm"
                  >
                    {label}
                    {count > 0 && (
                      <span className={cn(
                        "inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-semibold tabular-nums",
                        activeTab === value
                          ? "bg-foreground text-background"
                          : "bg-muted-foreground/20 text-muted-foreground"
                      )}>
                        {count}
                      </span>
                    )}
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>
          </div>

          <div className="relative">
            {isPending && (
              <div className="absolute inset-0 z-50 bg-background/40 backdrop-blur-[1px] rounded-lg">
                <div className="sticky top-[40vh] mx-auto flex w-fit flex-col items-center gap-2 rounded-lg border bg-popover px-4 py-3 shadow-md">
                  <Loader2 className="h-6 w-6 text-primary animate-spin" />
                  <span className="text-xs font-medium text-muted-foreground animate-pulse">Loading...</span>
                </div>
              </div>
            )}

            <div className={cn("space-y-4 transition-opacity duration-200", isPending && "opacity-50 pointer-events-none")}>
              {tabConfig.map(({ value }) => {
                if (value !== activeTab) {
                  return <TabsContent key={value} value={value} className="mt-0 outline-none" />;
                }

                return (
                  <TabsContent key={value} value={value} className="mt-0 outline-none space-y-4">
                    {totalCount === 0 ? (
                      <EmptyState isFiltered={value !== "all" || searchInput.trim() !== ""} />
                    ) : (
                      <>
                        <div className="flex flex-col gap-3 w-full">
                          {tickets.map((ticket) => (
                            <TicketCard
                              key={ticket.id}
                              ticket={ticket}
                            />
                          ))}
                        </div>

                        {/* Pagination Footer */}
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-1 px-1">
                          <div className="text-xs text-muted-foreground">
                            Showing{" "}
                            <span className="font-medium">
                              {totalCount === 0 ? 0 : Math.min(totalCount, (activePage - 1) * initialPageSize + 1)}
                            </span>
                            {" "}to{" "}
                            <span className="font-medium">{Math.min(totalCount, activePage * initialPageSize)}</span>
                            {" "}of{" "}
                            <span className="font-medium">{totalCount}</span> tickets
                          </div>

                          <div className="flex flex-wrap items-center gap-4 sm:gap-6">
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-muted-foreground whitespace-nowrap">Rows per page</span>
                              <Select
                                value={initialPageSize.toString()}
                                onValueChange={(val) => updateParams({ size: val, page: 1 })}
                              >
                                <SelectTrigger className="h-8 w-[70px] text-xs">
                                  <SelectValue placeholder={initialPageSize.toString()} />
                                </SelectTrigger>
                                <SelectContent>
                                  {[5, 10, 20, 50].map((s) => (
                                    <SelectItem key={s} value={s.toString()} className="text-xs">{s}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>

                            <div className="flex items-center gap-1">
                              <Button variant="outline" size="icon" className="h-8 w-8"
                                onClick={() => updateParams({ page: 1 })} disabled={activePage === 1}>
                                <ChevronsLeft className="h-4 w-4" />
                                <span className="sr-only">First page</span>
                              </Button>
                              <Button variant="outline" size="icon" className="h-8 w-8"
                                onClick={() => updateParams({ page: Math.max(1, activePage - 1) })} disabled={activePage === 1}>
                                <ChevronLeft className="h-4 w-4" />
                                <span className="sr-only">Previous page</span>
                              </Button>
                              <div className="flex items-center justify-center text-xs font-medium min-w-[80px]">
                                Page {activePage} of {totalPages}
                              </div>
                              <Button variant="outline" size="icon" className="h-8 w-8"
                                onClick={() => updateParams({ page: Math.min(totalPages, activePage + 1) })}
                                disabled={activePage === totalPages || totalPages === 0}>
                                <ChevronRight className="h-4 w-4" />
                                <span className="sr-only">Next page</span>
                              </Button>
                              <Button variant="outline" size="icon" className="h-8 w-8"
                                onClick={() => updateParams({ page: totalPages })}
                                disabled={activePage === totalPages || totalPages === 0}>
                                <ChevronsRight className="h-4 w-4" />
                                <span className="sr-only">Last page</span>
                              </Button>
                            </div>
                          </div>
                        </div>
                      </>
                    )}
                  </TabsContent>
                );
              })}
            </div>
          </div>
        </div>
      </Tabs>
    </div>
  );
}
