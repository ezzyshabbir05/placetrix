"use client";

import React, { useState, useEffect, useRef } from "react";
import Editor from "@monaco-editor/react";
import { useTheme } from "next-themes";
import Link from "next/link";
import {
  IconArrowLeft,
  IconPlayerPlay,
  IconPlayerPause,
  IconRefresh,
  IconCopy,
  IconCircleCheck,
  IconCircleX,
  IconClock,
  IconCpu,
  IconTerminal2,
  IconCheck,
  IconAlertTriangle,
  IconInfoCircle,
  IconCode,
  IconMaximize,
  IconMinimize,
  IconDeviceLaptop,
  IconLayoutBoard,
} from "@tabler/icons-react";
import { toast } from "sonner";
import {
  ResizablePanelGroup as PanelGroup,
  ResizablePanel as Panel,
  ResizableHandle as PanelResizeHandle,
} from "@/components/ui/resizable"
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
  EmptyMedia,
} from "@/components/ui/empty";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { LANGUAGES, CODE_TEMPLATES } from "../_constants";

interface PlaygroundWorkspaceClientProps {
  userId?: string;
}

export default function PlaygroundWorkspaceClient({ userId }: PlaygroundWorkspaceClientProps) {
  const { resolvedTheme } = useTheme();
  const monacoTheme = resolvedTheme === "light" ? "vs" : "vs-dark";

  const [isMounted, setIsMounted] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [isResetOpen, setIsResetOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const [ideLayout, setIdeLayout] = useState<"standard" | "split" | "vertical">("standard");
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);

  useEffect(() => {
    const key = userId ? `logiclab_playground_layout_${userId}` : "logiclab_playground_layout";
    const saved = localStorage.getItem(key);
    if (saved === "standard" || saved === "split" || saved === "vertical") {
      setIdeLayout(saved);
    }
  }, [userId]);

  const handleLayoutChange = (layout: "standard" | "split" | "vertical") => {
    setIdeLayout(layout);
    const key = userId ? `logiclab_playground_layout_${userId}` : "logiclab_playground_layout";
    localStorage.setItem(key, layout);
  };

  useEffect(() => {
    let interval: any = null;
    if (timerRunning) {
      interval = setInterval(() => {
        setTimerSeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [timerRunning]);

  const formatTimer = (totalSeconds: number) => {
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    if (hrs > 0) {
      return `${hrs.toString().padStart(2, "0")}:${mins
        .toString()
        .padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    }
    return `${mins.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  };

  const [selectedLang, setSelectedLang] = useState(LANGUAGES[0]);
  const [code, setCode] = useState("");
  const [stdin, setStdin] = useState("Hello from LogicLab!");
  const [running, setRunning] = useState(false);
  const [copied, setCopied] = useState(false);
  const [results, setResults] = useState<{
    success: boolean;
    stdout?: string;
    stderr?: string;
    compile_output?: string;
    status?: { id: number; description: string };
    time?: string;
    memory?: string;
    error?: string;
  } | null>(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    const key = userId
      ? `logiclab_playground_code_${userId}_${selectedLang.value}`
      : `logiclab_playground_code_${selectedLang.value}`;
    const saved = localStorage.getItem(key);
    setCode(saved ?? CODE_TEMPLATES[selectedLang.value]);
  }, [selectedLang.value, userId]);

  useEffect(() => {
    if (code) {
      const key = userId
        ? `logiclab_playground_code_${userId}_${selectedLang.value}`
        : `logiclab_playground_code_${selectedLang.value}`;
      localStorage.setItem(key, code);
    }
  }, [code, selectedLang.value, userId]);

  // Fullscreen
  const toggleFullScreen = async () => {
    if (!document.fullscreenElement) {
      if (containerRef.current?.requestFullscreen) {
        await containerRef.current.requestFullscreen().catch((err) => {
          console.error(`Error attempting to enable fullscreen: ${err.message}`);
          setIsFullScreen((v) => !v); // Fallback to CSS fullscreen
        });
      } else {
        setIsFullScreen((v) => !v); // Fallback
      }
    } else {
      if (document.exitFullscreen) {
        await document.exitFullscreen().catch(err => console.error(err));
      }
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullScreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  // Global hotkeys
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "'") {
        e.preventDefault();
        if (!running) handleRunCode();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const handleLangChange = (val: string) => {
    const lang = LANGUAGES.find((l) => l.value === val);
    if (lang) setSelectedLang(lang);
  };

  const handleReset = () => {
    setCode(CODE_TEMPLATES[selectedLang.value]);
    toast.success("Editor reset to default template.");
    setIsResetOpen(false);
  };

  const handleCopyOutput = () => {
    const text = results?.stdout || results?.compile_output || results?.stderr || "";
    if (text) {
      navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success("Output copied!");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleRunCode = async () => {
    if (!code || !code.trim()) {
      toast.warning("Write some code before running.");
      return;
    }
    setRunning(true);
    setResults(null);
    try {
      let processedCode = code;

      // Fix for Java: Online compilers (Judge0) strictly execute 'java Main'.
      // If the user names their class something else (e.g., public class Pyramid), it compiles but fails to run.
      // We automatically find the first class declaration and forcefully rename it to 'class Main'.
      if (selectedLang.value === "java") {
        processedCode = processedCode.replace(/(?:public\s+)?class\s+[a-zA-Z0-9_]+\s*\{/, "class Main {");
      }

      const res = await fetch("/api/logiclab/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source_code: processedCode, language_id: selectedLang.id, stdin }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Sandbox error.");
      setResults(data);
      if (data.status?.id === 3) {
        toast.success("Executed successfully!");
      } else {
        toast.error(`${data.status?.description || "Error"}`);
      }
    } catch (err: any) {
      setResults({ success: false, error: err?.message || "Execution failed." });
      toast.error(err?.message || "Execution failed.");
    } finally {
      setRunning(false);
    }
  };

  const isAccepted = results?.status?.id === 3;
  const memoryMb = results?.memory
    ? (parseInt(results.memory) / 1024).toFixed(1)
    : null;

  // ─── Navbar ──────────────────────────────────────────────────────────────────

  const navbar = (
    <div className={cn("flex items-center justify-between px-4 py-2 bg-zinc-100 dark:bg-zinc-950 shrink-0 w-full select-none")}>
      {/* Left */}
      <div className={cn("flex items-center gap-3")}>
        <div className={cn("flex items-center gap-1")}>
          <Button variant="outline" size="icon" asChild className={cn("h-8", "w-8")} title="Back to LogicLab">
            <Link href="/logiclab">
              <IconArrowLeft className={cn("h-4", "w-4")} />
            </Link>
          </Button>
        </div>
        <div className={cn("flex items-center gap-2")}>

          <p className={cn("text-md", "font-bold", "tracking-tight", "text-foreground", "leading-tight", "font-cirka")}>
            Logic Lab Playground
          </p>

        </div>
      </div>

      {/* Center: Run */}
      <div className={cn("absolute", "left-1/2", "-translate-x-1/2")}>
        <ButtonGroup>
          <Button
            variant="outline"
            onClick={handleRunCode}
            disabled={running}
            title="Run Code (Ctrl + ')"
            className={cn("h-8", "px-3", "text-xs", "font-semibold", "bg-background", "hover:bg-accent", "flex", "items-center", "gap-1.5")}
          >
            {running ? (
              <div className={cn("h-3.5", "w-3.5", "border", "border-current", "border-t-transparent", "rounded-full", "animate-spin")} />
            ) : (
              <IconPlayerPlay className={cn("h-3.5", "w-3.5", "text-emerald-600", "dark:text-emerald-400", "fill-emerald-500/20")} />
            )}
            <span>{running ? "Running" : "Run"}</span>
          </Button>
        </ButtonGroup>
      </div>

      {/* Right */}
      <div className={cn("flex", "items-center", "gap-1")}>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              title="Coding Time"
              className={cn('h-7', 'px-2', 'text-zinc-600 dark:text-muted-foreground', 'hover:text-foreground', 'flex', 'items-center', 'gap-1.5', 'font-mono', 'text-[11px]', 'font-semibold', 'transition-colors', 'select-none', 'bg-background')}
              onMouseDown={(e) => e.preventDefault()}
              onClick={(e) => e.currentTarget.blur()}
            >
              <IconClock className={`h-3.5 w-3.5 ${timerRunning ? "animate-pulse text-emerald-500" : "text-zinc-650 dark:text-muted-foreground"}`} />
              {(timerSeconds > 0 || timerRunning) && (
                <span className={cn('tabular-nums', 'font-bold', 'tracking-wider')}>{formatTimer(timerSeconds)}</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent
            className={cn('w-56', 'p-4', 'z-[9999]')}
            align="end"
            onOpenAutoFocus={(e) => e.preventDefault()}
            onCloseAutoFocus={(e) => e.preventDefault()}
          >
            <div className={cn('flex', 'flex-col', 'gap-3.5', 'items-center', 'text-center')}>
              <span className={cn('text-[10px]', 'font-extrabold', 'uppercase', 'tracking-widest', 'text-zinc-500 dark:text-muted-foreground')}>Coding Time</span>
              <span className={cn('text-2xl', 'font-black', 'font-mono', 'tracking-wide', 'text-foreground', 'tabular-nums', 'select-all')}>
                {formatTimer(timerSeconds)}
              </span>
              <div className={cn('flex', 'gap-2', 'w-full', 'justify-center')}>
                <Button
                  variant={timerRunning ? "secondary" : "default"}
                  size="sm"
                  className={cn('h-8', 'flex-1', 'text-xs', 'font-bold')}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={(e) => {
                    setTimerRunning(!timerRunning);
                    e.currentTarget.blur();
                  }}
                >
                  {timerRunning ? (
                    <>
                      <IconPlayerPause className={cn('h-3.5', 'w-3.5', 'mr-1')} />
                      Pause
                    </>
                  ) : (
                    <>
                      <IconPlayerPlay className={cn('h-3.5', 'w-3.5', 'mr-1', 'text-emerald-500', 'fill-emerald-500')} />
                      Resume
                    </>
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn('h-8', 'border', 'border-border/60', 'hover:bg-muted', 'text-xs', 'font-bold')}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={(e) => {
                    setTimerSeconds(0);
                    e.currentTarget.blur();
                  }}
                  title="Reset"
                >
                  <IconRefresh className={cn('h-3.5', 'w-3.5')} />
                </Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>

        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              title="Change Layout"
              className={cn('h-7', 'w-7', 'text-zinc-650 dark:text-muted-foreground', 'hover:text-foreground', 'bg-background')}
              onMouseDown={(e) => e.preventDefault()}
              onClick={(e) => e.currentTarget.blur()}
            >
              <IconLayoutBoard className={cn('h-4', 'w-4')} />
            </Button>
          </PopoverTrigger>
          <PopoverContent
            className={cn('w-[320px]', 'p-4', 'z-[9999]')}
            align="end"
            onOpenAutoFocus={(e) => e.preventDefault()}
            onCloseAutoFocus={(e) => e.preventDefault()}
          >
            <div className="space-y-4">
              <div className={cn('flex', 'items-center', 'justify-between', 'text-zinc-600 dark:text-muted-foreground')}>
                <span className={cn('text-sm', 'font-bold', 'text-foreground')}>
                  Layouts
                </span>
              </div>
              <div className={cn('grid', 'grid-cols-2', 'gap-4')}>
                {/* Standard / Default */}
                <button
                  onClick={() => handleLayoutChange("standard")}
                  className={`flex flex-col gap-2.5 transition-all group`}
                >
                  <div
                    className={`flex w-full gap-2 h-[80px] p-2.5 rounded-xl border-[1.5px] shadow-sm transition-all ${ideLayout === "standard" ? "border-emerald-500 bg-emerald-500/5 shadow-emerald-500/10" : "border-border/60 bg-muted/30 hover:border-border hover:bg-muted/50"}`}
                  >
                    {/* Left Description Panel */}
                    <div
                      className={`w-[45%] h-full rounded-md shadow-sm transition-colors ${ideLayout === "standard" ? "bg-emerald-500/30" : "bg-foreground/15 group-hover:bg-foreground/20"}`}
                    />
                    {/* Right Split Panels */}
                    <div className={cn('w-[55%]', 'flex', 'flex-col', 'gap-1.5', 'h-full')}>
                      <div
                        className={`flex-1 rounded-md shadow-sm transition-colors ${ideLayout === "standard" ? "bg-emerald-500/30" : "bg-foreground/15 group-hover:bg-foreground/20"}`}
                      />
                      <div
                        className={`h-[35%] rounded-md shadow-sm transition-colors ${ideLayout === "standard" ? "bg-emerald-500/30" : "bg-foreground/15 group-hover:bg-foreground/20"}`}
                      />
                    </div>
                  </div>
                  <span
                    className={`text-[13px] font-bold text-center w-full transition-colors ${ideLayout === "standard" ? "text-emerald-600 dark:text-emerald-400" : "text-zinc-500 dark:text-muted-foreground group-hover:text-foreground"}`}
                  >
                    Standard
                  </span>
                </button>

                {/* Vertical / Top-Bottom */}
                <button
                  onClick={() => handleLayoutChange("vertical")}
                  className={`flex flex-col gap-2.5 transition-all group`}
                >
                  <div
                    className={`flex flex-col w-full gap-1.5 h-[80px] p-2.5 rounded-xl border-[1.5px] shadow-sm transition-all ${ideLayout === "vertical" ? "border-emerald-500 bg-emerald-500/5 shadow-emerald-500/10" : "border-border/60 bg-muted/30 hover:border-border hover:bg-muted/50"}`}
                  >
                    {/* Top Description Panel */}
                    <div
                      className={`w-full h-[45%] rounded-md shadow-sm transition-colors ${ideLayout === "vertical" ? "bg-emerald-500/30" : "bg-foreground/15 group-hover:bg-foreground/20"}`}
                    />
                    {/* Bottom Split Panels */}
                    <div className={cn('w-full', 'flex-1', 'flex', 'gap-1.5')}>
                      <div
                        className={`flex-1 rounded-md shadow-sm transition-colors ${ideLayout === "vertical" ? "bg-emerald-500/30" : "bg-foreground/15 group-hover:bg-foreground/20"}`}
                      />
                      <div
                        className={`flex-1 rounded-md shadow-sm transition-colors ${ideLayout === "vertical" ? "bg-emerald-500/30" : "bg-foreground/15 group-hover:bg-foreground/20"}`}
                      />
                    </div>
                  </div>
                  <span
                    className={`text-[13px] font-bold text-center w-full transition-colors ${ideLayout === "vertical" ? "text-emerald-600 dark:text-emerald-400" : "text-zinc-500 dark:text-muted-foreground group-hover:text-foreground"}`}
                  >
                    Stacked
                  </span>
                </button>

                {/* Split / Side-by-Side */}
                <button
                  onClick={() => handleLayoutChange("split")}
                  className={`flex flex-col gap-2.5 transition-all group col-span-2`}
                >
                  <div
                    className={`flex w-full gap-2 h-[80px] p-2.5 rounded-xl border-[1.5px] shadow-sm transition-all ${ideLayout === "split" ? "border-emerald-500 bg-emerald-500/5 shadow-emerald-500/10" : "border-border/60 bg-muted/30 hover:border-border hover:bg-muted/50"}`}
                  >
                    {/* Left Description Panel */}
                    <div
                      className={`w-[30%] h-full rounded-md shadow-sm transition-colors ${ideLayout === "split" ? "bg-emerald-500/30" : "bg-foreground/15 group-hover:bg-foreground/20"}`}
                    />
                    {/* Middle Editor Panel */}
                    <div
                      className={`flex-1 h-full rounded-md shadow-sm transition-colors ${ideLayout === "split" ? "bg-emerald-500/30" : "bg-foreground/15 group-hover:bg-foreground/20"}`}
                    />
                    {/* Right Output Panel */}
                    <div
                      className={`w-[30%] h-full rounded-md shadow-sm transition-colors ${ideLayout === "split" ? "bg-emerald-500/30" : "bg-foreground/15 group-hover:bg-foreground/20"}`}
                    />
                  </div>
                  <span
                    className={`text-[13px] font-bold text-center w-full transition-colors ${ideLayout === "split" ? "text-emerald-600 dark:text-emerald-400" : "text-zinc-500 dark:text-muted-foreground group-hover:text-foreground"}`}
                  >
                    Columns
                  </span>
                </button>
              </div>
            </div>
          </PopoverContent>
        </Popover>

        <Button
          variant="outline"
          size="icon"
          title={isFullScreen ? "Exit Full Screen" : "Full Screen"}
          className={cn("h-7", "w-7", "text-zinc-650 dark:text-muted-foreground", "hover:text-foreground", "bg-background")}
          onMouseDown={(e) => e.preventDefault()}
          onClick={(e) => { toggleFullScreen(); (e.currentTarget as HTMLButtonElement).blur(); }}
        >
          {isFullScreen ? (
            <IconMinimize className={cn("h-4", "w-4")} />
          ) : (
            <IconMaximize className={cn("h-4", "w-4")} />
          )}
        </Button>
      </div>
    </div>
  );

  // ─── Editor Panel ─────────────────────────────────────────────────────────────

  const editorPanel = (
    <div className={cn("flex", "flex-col", "h-full", "bg-card", "overflow-hidden", "relative")}>
      {/* Toolbar */}
      <div className={cn("flex", "items-center", "justify-between", "bg-card", "shrink-0", "select-none", "h-[40px]", "border-b", "border-border/50", "px-1")}>
        <div className={cn("flex", "items-center", "h-full", "gap-1.5", "px-2", "text-[11px]", "font-bold", "text-foreground")}>
          <IconCode className={cn("h-3.5", "w-3.5", "text-zinc-500 dark:text-muted-foreground/80")} />
          <span>Code</span>
          <span className={cn("text-muted-foreground/30", "mx-0.5")}>|</span>
          <Select value={selectedLang.value} onValueChange={handleLangChange}>
            <SelectTrigger className={cn("h-auto", "p-0", "m-0", "border-none", "shadow-none", "bg-transparent", "hover:bg-transparent", "dark:bg-transparent", "dark:hover:bg-transparent", "focus:ring-0", "focus-visible:ring-0", "focus-visible:outline-none", "text-foreground", "hover:text-foreground/70", "flex", "items-center", "gap-1", "w-auto", "text-[11px]", "font-semibold")}>
              <SelectValue placeholder="Language" />
            </SelectTrigger>
            <SelectContent position="popper" sideOffset={4} align="start" className={cn("z-[9999]", "min-w-[140px]")}>
              {LANGUAGES.map((l) => (
                <SelectItem key={l.id} value={l.value} className="font-medium">
                  {l.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {/* Reset Button */}
        <Popover open={isResetOpen} onOpenChange={setIsResetOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              disabled={running}
              title="Reset to template"
              className={cn("h-7", "px-2", "text-xs", "font-semibold", "text-zinc-600 dark:text-muted-foreground", "hover:text-foreground", "bg-background", "flex", "items-center", "gap-1.5", "shrink-0")}
              onMouseDown={(e) => e.preventDefault()}
              onClick={(e) => e.currentTarget.blur()}
            >
              <IconRefresh className={cn("h-3.5", "w-3.5")} />
              Reset
            </Button>
          </PopoverTrigger>
          <PopoverContent
            className={cn("w-64", "p-3", "z-[9999]")}
            side="bottom"
            align="end"
            onOpenAutoFocus={(e) => e.preventDefault()}
            onCloseAutoFocus={(e) => e.preventDefault()}
          >
            <div className={cn("flex", "flex-col", "gap-3")}>
              <span className={cn("text-sm", "font-medium")}>Reset code?</span>
              <span className={cn("text-xs", "text-zinc-600 dark:text-muted-foreground")}>
                This will replace your current code with the default template for {selectedLang.name}.
              </span>
              <div className={cn("flex", "gap-2", "justify-end", "mt-1")}>
                <Button variant="ghost" size="sm" className={cn("h-7", "text-xs")} onClick={() => setIsResetOpen(false)}>
                  Cancel
                </Button>
                <Button variant="destructive" size="sm" className={cn("h-7", "text-xs")} onClick={handleReset}>
                  Reset
                </Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Monaco Editor */}
      <div className={cn("flex-1", "min-h-0", "relative")}>
        {!isMounted ? (
          <div className={cn("absolute", "inset-0", "z-10", "flex", "flex-col", "w-full", "h-full", "p-4", "space-y-3", "bg-card", "font-mono")}>
            {Array.from({ length: 12 }).map((_, i) => {
              const widths = [40, 60, 30, 75, 50, 85, 45, 65, 35, 70, 55, 80];
              const indent = [0, 4, 4, 8, 8, 8, 4, 4, 0, 4, 4, 0];
              return (
                <div key={i} className={cn("flex", "items-center", "gap-4")}>
                  <div className={cn("w-6", "text-right", "text-[10px]", "text-muted-foreground/40", "select-none")}>{i + 1}</div>
                  <div style={{ paddingLeft: `${indent[i]}rem`, width: "100%" }}>
                    <Skeleton className="h-3.5" style={{ width: `${widths[i]}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <Editor
            height="100%"
            language={selectedLang.value}
            value={code}
            onChange={(v) => setCode(v || "")}
            theme={monacoTheme}
            options={{
              fontSize: 13,
              minimap: { enabled: false },
              scrollBeyondLastLine: false,
              wordWrap: "on",
              automaticLayout: true,
              padding: { top: 10, bottom: 10 },
              lineNumbersMinChars: 3,
            }}
            loading={
              <div className={cn("flex", "flex-col", "w-full", "h-full", "p-4", "space-y-3", "bg-card", "font-mono", "opacity-60")}>
                {Array.from({ length: 12 }).map((_, i) => {
                  const widths = [40, 60, 30, 75, 50, 85, 45, 65, 35, 70, 55, 80];
                  const indent = [0, 4, 4, 8, 8, 8, 4, 4, 0, 4, 4, 0];
                  return (
                    <div key={i} className={cn("flex", "items-center", "gap-4")}>
                      <div className={cn("w-6", "text-right", "text-[10px]", "text-muted-foreground/40", "select-none")}>{i + 1}</div>
                      <div style={{ paddingLeft: `${indent[i]}rem`, width: "100%" }}>
                        <Skeleton className="h-3.5" style={{ width: `${widths[i]}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            }
          />
        )}
      </div>
    </div>
  );

  // ─── Stdin Panel ──────────────────────────────────────────────────────────────

  const stdinPanel = (
    <div className={cn("flex", "flex-col", "h-full", "bg-card", "overflow-hidden")}>
      {/* Header */}
      <div className={cn("flex", "items-center", "justify-between", "bg-card", "shrink-0", "select-none", "h-[40px]", "border-b", "border-border/50", "px-3")}>
        <div className={cn("flex", "items-center", "gap-1.5", "text-[11px]", "font-bold", "text-foreground")}>
          <IconTerminal2 className={cn("h-3.5", "w-3.5", "text-zinc-500 dark:text-muted-foreground/80")} />
          <span>Standard Input (stdin)</span>
        </div>
        <button
          onClick={() => setStdin("")}
          className={cn("text-[10px]", "font-bold", "text-zinc-500 dark:text-muted-foreground/60", "hover:text-foreground", "transition-colors", "cursor-pointer")}
          title="Clear stdin"
        >
          Clear
        </button>
      </div>
      {/* Textarea */}
      <textarea
        value={stdin}
        onChange={(e) => setStdin(e.target.value)}
        placeholder="Provide input for your program here.\n\nE.g.\n3\n10 20 30"
        spellCheck={false}
        className={cn("flex-1", "bg-background", "text-foreground/90", "font-mono", "text-xs", "p-3", "resize-none", "focus:outline-none", "placeholder:text-muted-foreground/40")}
      />
    </div>
  );

  // ─── Output Panel ─────────────────────────────────────────────────────────────

  const outputPanel = (
    <div className={cn("flex", "flex-col", "h-full", "bg-card", "overflow-hidden")}>
      {/* Header */}
      <div className={cn("flex", "items-center", "justify-between", "bg-card", "shrink-0", "select-none", "h-[40px]", "border-b", "border-border/50", "pl-0", "pr-3")}>
        <div className={cn("flex", "items-center", "h-full", "px-4", "gap-1.5", "text-[11px]", "font-bold", "text-foreground")}>
          <IconTerminal2 className={cn("h-3.5", "w-3.5", "text-zinc-500 dark:text-muted-foreground/80")} />
          <span>Standard Output (stdout)</span>
        </div>
        <div className="flex items-center gap-1">
          {results && (
            <>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setResults(null)}
                title="Clear Output"
                className={cn("h-7", "w-7", "text-zinc-650 dark:text-muted-foreground/80", "hover:text-rose-500", "shrink-0")}
              >
                <IconCircleX className={cn("h-3.5", "w-3.5")} />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleCopyOutput}
                title="Copy Output"
                className={cn("h-7", "w-7", "text-zinc-650 dark:text-muted-foreground/80", "hover:text-foreground", "shrink-0")}
              >
                {copied ? (
                  <IconCheck className={cn("h-3.5", "w-3.5", "text-emerald-400")} />
                ) : (
                  <IconCopy className={cn("h-3.5", "w-3.5")} />
                )}
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Content */}
      <ScrollArea className={cn("flex-1", "w-full", "min-h-0")}>
        <div className={cn("p-3.5", "font-mono", "text-xs", "space-y-3")}>
          {running ? (
            <div className={cn("flex", "flex-col", "items-center", "justify-center", "py-6", "gap-3", "animate-pulse", "my-auto")}>
              <div className="relative">
                <div className={cn("h-10", "w-10", "border-2", "border-emerald-500/20", "border-t-emerald-400", "rounded-full", "animate-spin")} />
                <div className={cn("absolute", "inset-0", "flex", "items-center", "justify-center")}>
                  <IconTerminal2 className={cn("h-4", "w-4", "text-emerald-400")} />
                </div>
              </div>
              <div className={cn("text-center", "space-y-1")}>
                <p className={cn("text-xs", "font-bold", "text-foreground", "uppercase", "tracking-wider")}>
                  Compiling & Running...
                </p>
                <p className={cn("text-[10px]", "text-zinc-600 dark:text-muted-foreground/80")}>
                  Executing in the LogicLab sandbox
                </p>
              </div>
            </div>
          ) : results ? (
            <div className={cn("space-y-3", "animate-in", "fade-in", "duration-200")}>
              {/* Status bar */}
              <div className={cn("flex", "items-center", "justify-between", "p-2.5", "rounded-lg", "border", isAccepted ? "bg-emerald-500/5 border-emerald-500/20 text-emerald-600 dark:text-emerald-400" : "bg-rose-500/5 border-rose-500/20 text-rose-600 dark:text-rose-400")}>
                <div className={cn("flex", "items-center", "gap-2")}>
                  {isAccepted ? (
                    <IconCircleCheck className={cn("h-4", "w-4", "shrink-0")} />
                  ) : (
                    <IconCircleX className={cn("h-4", "w-4", "shrink-0")} />
                  )}
                  <span className={cn("font-bold", "uppercase", "tracking-wider", "text-[10px]")}>
                    {results.status?.description || "Error"}
                  </span>
                </div>
                {isAccepted && (results.time || memoryMb) && (
                  <div className={cn("flex", "items-center", "gap-3", "text-[10px]", "text-zinc-600 dark:text-muted-foreground")}>
                    {results.time && (
                      <span className={cn("flex", "items-center", "gap-0.5")}>
                        <IconClock className={cn("h-3", "w-3")} />
                        {results.time}s
                      </span>
                    )}
                    {memoryMb && (
                      <span className={cn("flex", "items-center", "gap-0.5")}>
                        <IconCpu className={cn("h-3", "w-3")} />
                        {memoryMb} MB
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Compile errors */}
              {results.compile_output && (
                <div className={cn("rounded-lg", "border", "border-rose-500/25", "overflow-hidden")}>
                  <div className={cn("px-3", "py-1.5", "bg-rose-500/5", "border-b", "border-rose-500/20", "flex", "items-center", "gap-1.5", "select-none")}>
                    <IconAlertTriangle className={cn("h-3", "w-3", "text-rose-500")} />
                    <span className={cn("text-[10px]", "font-extrabold", "uppercase", "tracking-widest", "text-rose-600 dark:text-rose-400")}>Compile Errors</span>
                  </div>
                  <pre className={cn("p-3", "bg-rose-500/5", "text-rose-600 dark:text-rose-400", "whitespace-pre-wrap", "overflow-x-auto", "leading-relaxed")}>
                    {results.compile_output}
                  </pre>
                </div>
              )}

              {/* Stderr */}
              {results.stderr && (
                <div className={cn("rounded-lg", "border", "border-rose-500/25", "overflow-hidden")}>
                  <div className={cn("px-3", "py-1.5", "bg-rose-500/5", "border-b", "border-rose-500/20", "flex", "items-center", "gap-1.5", "select-none")}>
                    <IconAlertTriangle className={cn("h-3", "w-3", "text-rose-500")} />
                    <span className={cn("text-[10px]", "font-extrabold", "uppercase", "tracking-widest", "text-rose-600 dark:text-rose-400")}>Runtime Errors</span>
                  </div>
                  <pre className={cn("p-3", "bg-rose-500/5", "text-rose-600 dark:text-rose-400", "whitespace-pre-wrap", "overflow-x-auto", "leading-relaxed")}>
                    {results.stderr}
                  </pre>
                </div>
              )}

              {/* Stdout */}
              <div className={cn("rounded-lg", "border", "border-border/50", "overflow-hidden")}>
                <div className={cn("px-3", "py-1.5", "bg-muted/40", "border-b", "border-border/40", "flex", "items-center", "gap-1.5", "select-none")}>
                  <IconInfoCircle className={cn("h-3", "w-3", "text-zinc-500 dark:text-muted-foreground/70")} />
                  <span className={cn("text-[10px]", "font-extrabold", "uppercase", "tracking-widest", "text-zinc-500 dark:text-muted-foreground/70")}>Program Output (stdout)</span>
                </div>
                <pre className={cn("p-3", "bg-muted/20 dark:bg-zinc-900/30", "text-foreground/90", "whitespace-pre-wrap", "overflow-x-auto", "leading-relaxed", "min-h-[60px]")}>
                  {results.stdout || (
                    <span className={cn("text-muted-foreground/40", "italic")}>No output produced.</span>
                  )}
                </pre>
              </div>
            </div>
          ) : (
            <div className={cn("flex", "flex-col", "items-center", "justify-center", "py-10", "gap-1.5", "select-none")}>
              <IconTerminal2 className={cn("h-6", "w-6", "text-muted-foreground/20")} />
              <p className={cn("text-[10px]", "text-zinc-550 dark:text-muted-foreground/40", "uppercase", "font-bold", "tracking-widest")}>
                Terminal Idle
              </p>
              <p className={cn("text-[10px]", "text-muted-foreground/30", "font-sans", "text-center", "max-w-[180px]")}>
                Press Run to compile and execute your program.
              </p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );

  // ─── Root ─────────────────────────────────────────────────────────────────────

  return (
    <div
      ref={containerRef}
      className={cn(
        "flex flex-col w-full min-h-0 bg-zinc-100 dark:bg-zinc-950 text-foreground overflow-hidden",
        isFullScreen
          ? "fixed inset-0 z-[9990] h-[100dvh]"
          : "h-[100dvh] relative",
      )}
    >
      {/* Mobile warning */}
      <div className="flex md:hidden flex-1 items-center justify-center p-6 bg-zinc-100 dark:bg-zinc-950">
        <Empty className="border-0 max-w-sm">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <IconDeviceLaptop />
            </EmptyMedia>
            <EmptyTitle>Desktop Only Feature</EmptyTitle>
            <EmptyDescription>
              The Playground is optimised for large screens. Mobile support is coming soon!
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      </div>

      {/* Desktop IDE */}
      <div className="hidden md:flex flex-col flex-1 min-h-0 overflow-hidden">
        {navbar}
        <div className={cn("flex-1", "pt-0", "px-2", "pb-2", "min-h-0", "overflow-hidden")}>
          {!isMounted ? (
            <Skeleton className="w-full h-full border border-border/40" />
          ) : (
            <>
              {ideLayout === "standard" && (
                <PanelGroup id="playground-layout-standard" orientation="horizontal">
                  {/* Editor */}
                  <Panel
                    id="editor-playground-standard"
                    defaultSize={58}
                    minSize={30}
                    className={cn("flex", "flex-col", "min-h-0", "rounded-md", "border", "border-border/50", "overflow-hidden", "shadow-sm")}
                  >
                    {editorPanel}
                  </Panel>

                  <PanelResizeHandle
                    id="resize-playground-standard-horizontal"
                    className={cn("w-1", "rounded-full", "transition-colors", "bg-transparent", "hover:bg-zinc-300 dark:hover:bg-zinc-700", "cursor-col-resize")}
                  />

                  {/* Right Stdin + Output */}
                  <Panel
                    id="right-playground-standard"
                    defaultSize={42}
                    minSize={25}
                    className={cn("flex", "flex-col", "min-h-0")}
                  >
                    <PanelGroup id="right-group-playground-standard" orientation="vertical">
                      <Panel
                        id="stdin-playground-standard"
                        defaultSize={30}
                        minSize={15}
                        className={cn("flex", "flex-col", "min-h-0", "rounded-md", "border", "border-border/50", "overflow-hidden", "shadow-sm")}
                      >
                        {stdinPanel}
                      </Panel>
                      <PanelResizeHandle
                        id="resize-right-playground-standard-vertical"
                        className={cn("h-1", "rounded-full", "transition-colors", "bg-transparent", "hover:bg-zinc-300 dark:hover:bg-zinc-700", "cursor-row-resize")}
                      />
                      <Panel
                        id="output-playground-standard"
                        defaultSize={70}
                        minSize={20}
                        className={cn("flex", "flex-col", "min-h-0", "rounded-md", "border", "border-border/50", "overflow-hidden", "shadow-sm")}
                      >
                        {outputPanel}
                      </Panel>
                    </PanelGroup>
                  </Panel>
                </PanelGroup>
              )}

              {ideLayout === "split" && (
                <PanelGroup id="playground-layout-split" orientation="horizontal">
                  {/* Editor */}
                  <Panel
                    id="editor-playground-split"
                    defaultSize={40}
                    minSize={20}
                    className={cn("flex", "flex-col", "min-h-0", "rounded-md", "border", "border-border/50", "overflow-hidden", "shadow-sm")}
                  >
                    {editorPanel}
                  </Panel>

                  <PanelResizeHandle
                    id="resize-playground-split-1"
                    className={cn("w-1", "rounded-full", "transition-colors", "bg-transparent", "hover:bg-zinc-300 dark:hover:bg-zinc-700", "cursor-col-resize")}
                  />

                  {/* Stdin */}
                  <Panel
                    id="stdin-playground-split"
                    defaultSize={30}
                    minSize={15}
                    className={cn("flex", "flex-col", "min-h-0", "rounded-md", "border", "border-border/50", "overflow-hidden", "shadow-sm")}
                  >
                    {stdinPanel}
                  </Panel>

                  <PanelResizeHandle
                    id="resize-playground-split-2"
                    className={cn("w-1", "rounded-full", "transition-colors", "bg-transparent", "hover:bg-zinc-300 dark:hover:bg-zinc-700", "cursor-col-resize")}
                  />

                  {/* Output */}
                  <Panel
                    id="output-playground-split"
                    defaultSize={30}
                    minSize={20}
                    className={cn("flex", "flex-col", "min-h-0", "rounded-md", "border", "border-border/50", "overflow-hidden", "shadow-sm")}
                  >
                    {outputPanel}
                  </Panel>
                </PanelGroup>
              )}

              {ideLayout === "vertical" && (
                <PanelGroup id="playground-layout-vertical" orientation="vertical">
                  {/* Editor */}
                  <Panel
                    id="editor-playground-vertical"
                    defaultSize={45}
                    minSize={20}
                    className={cn("flex", "flex-col", "min-h-0", "rounded-md", "border", "border-border/50", "overflow-hidden", "shadow-sm")}
                  >
                    {editorPanel}
                  </Panel>

                  <PanelResizeHandle
                    id="resize-playground-vertical-1"
                    className={cn("h-1", "rounded-full", "transition-colors", "bg-transparent", "hover:bg-zinc-300 dark:hover:bg-zinc-700", "cursor-row-resize")}
                  />

                  {/* Bottom: Stdin + Output side-by-side */}
                  <Panel
                    id="bottom-playground-vertical"
                    defaultSize={55}
                    minSize={30}
                    className={cn("flex", "flex-col", "min-h-0")}
                  >
                    <PanelGroup id="bottom-group-playground-vertical" orientation="horizontal">
                      <Panel
                        id="stdin-playground-vertical"
                        defaultSize={50}
                        minSize={20}
                        className={cn("flex", "flex-col", "min-h-0", "rounded-md", "border", "border-border/50", "overflow-hidden", "shadow-sm")}
                      >
                        {stdinPanel}
                      </Panel>
                      <PanelResizeHandle
                        id="resize-playground-vertical-2"
                        className={cn("w-1", "rounded-full", "transition-colors", "bg-transparent", "hover:bg-zinc-300 dark:hover:bg-zinc-700", "cursor-col-resize")}
                      />
                      <Panel
                        id="output-playground-vertical"
                        defaultSize={50}
                        minSize={20}
                        className={cn("flex", "flex-col", "min-h-0", "rounded-md", "border", "border-border/50", "overflow-hidden", "shadow-sm")}
                      >
                        {outputPanel}
                      </Panel>
                    </PanelGroup>
                  </Panel>
                </PanelGroup>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
