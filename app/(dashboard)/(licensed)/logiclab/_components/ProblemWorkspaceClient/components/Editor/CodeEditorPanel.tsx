"use client";

import React, { useState } from "react";
import dynamic from "next/dynamic";
import { useTheme } from "next-themes";
import {
  IconCode,
  IconBraces,
  IconRefresh,
  IconAdjustments,
  IconPlayerPlay,
  IconSend,
} from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import { Spinner } from "@/components/ui/spinner";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectGroup,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { IdeSettingsModal } from "../../IdeSettingsModal";
import { EditorStatusBar } from "./EditorStatusBar";
import { Language, IdeSettings } from "@/app/(dashboard)/(licensed)/logiclab/_types";
import { LANGUAGES } from "@/app/(dashboard)/(licensed)/logiclab/_constants";

const Editor = dynamic(() => import("@monaco-editor/react"), { ssr: false });

interface CodeEditorPanelProps {
  selectedLang: Language;
  onLangChange: (langValue: string) => void;
  code: string;
  setCode: (code: string) => void;
  editorRef: React.MutableRefObject<any>;
  monacoRef: React.MutableRefObject<any>;
  ideSettings: IdeSettings;
  setIdeSettings: React.Dispatch<React.SetStateAction<IdeSettings>>;
  onFormatCode: () => void;
  onRunCode: () => void;
  onSubmitCode: () => void;
  onSubmitConfirmModal: () => void;
  running: boolean;
  submitting: boolean;
  isDailyChallenge?: boolean;
  isTransitioning: boolean;
  saveStatus: "Saved" | "Saving..." | "Unsaved" | "";
  cursorPos: { line: number; col: number };
  setCursorPos: (pos: { line: number; col: number }) => void;
  parsedBoilerplates: Record<string, string>;
  onOpenShortcuts: () => void;
  modKey?: string;
}

export function CodeEditorPanel({
  selectedLang,
  onLangChange,
  code,
  setCode,
  editorRef,
  monacoRef,
  ideSettings,
  setIdeSettings,
  onFormatCode,
  onRunCode,
  onSubmitCode,
  onSubmitConfirmModal,
  running,
  submitting,
  isDailyChallenge = false,
  isTransitioning,
  saveStatus,
  cursorPos,
  setCursorPos,
  parsedBoilerplates,
  onOpenShortcuts,
  modKey = "Ctrl",
}: CodeEditorPanelProps) {
  const { resolvedTheme } = useTheme();
  const monacoTheme = resolvedTheme === "light" ? "vs" : "vs-dark";

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isResetOpen, setIsResetOpen] = useState(false);

  return (
    <div className="flex flex-col h-full bg-card overflow-hidden relative">
      {/* Editor Header Toolbar */}
      <div className="flex items-center justify-between bg-card shrink-0 select-none h-10 border-b border-border/50 px-2.5">
        <div className="flex items-center h-full gap-2">
          <IconCode className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs font-bold text-foreground">Code</span>
          <span className="text-muted-foreground/30">|</span>

          {/* Styled Language Selector */}
          <Select value={selectedLang.value} onValueChange={onLangChange}>
            <SelectTrigger
              size="sm"
              className="h-7 px-2.5 text-xs font-semibold bg-muted/30 border-border/60 hover:bg-muted/50 transition-colors w-auto gap-1.5 shadow-2xs"
            >
              <SelectValue placeholder="Select Language" />
            </SelectTrigger>
            <SelectContent position="popper" sideOffset={4} align="start" className="min-w-36 z-9999">
              <SelectGroup>
                {LANGUAGES.map((l: any) => (
                  <SelectItem key={l.id} value={l.value} className="text-xs font-medium">
                    {l.name}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>

        {/* Right Tools: Settings, Format, Reset */}
        <div className="flex items-center gap-1">
          {/* Format Code */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                disabled={running || submitting}
                onClick={onFormatCode}
                className="h-7 w-7 text-muted-foreground hover:text-foreground"
              >
                <IconBraces className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              Format Code <span className="text-[10px] text-muted-foreground">({modKey === "⌘" ? "⇧⌥F" : "Shift+Alt+F"})</span>
            </TooltipContent>
          </Tooltip>

          {/* Reset Code to Default Boilerplate */}
          <Popover open={isResetOpen} onOpenChange={setIsResetOpen}>
            <Tooltip>
              <TooltipTrigger asChild>
                <PopoverTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    disabled={running || submitting}
                    className="h-7 w-7 text-muted-foreground hover:text-foreground"
                  >
                    <IconRefresh className="h-4 w-4" />
                  </Button>
                </PopoverTrigger>
              </TooltipTrigger>
              <TooltipContent side="bottom">Reset Code</TooltipContent>
            </Tooltip>

            <PopoverContent
              className="w-72 p-3.5 z-9999 shadow-xl border-border/80"
              side="bottom"
              align="end"
            >
              <div className="flex flex-col gap-2.5">
                <span className="text-sm font-bold text-foreground">Reset to default?</span>
                <span className="text-xs text-muted-foreground leading-relaxed">
                  This will discard your current code and restore the starter boilerplate for{" "}
                  <strong className="text-foreground">{selectedLang.name}</strong>.
                </span>
                <div className="flex gap-2 justify-end mt-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => setIsResetOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    className="h-7 text-xs font-semibold"
                    onClick={() => {
                      const boilerplate =
                        parsedBoilerplates[String(selectedLang.id)] ||
                        `// Write your ${selectedLang.name} solution here\n`;
                      setCode(boilerplate);
                      setIsResetOpen(false);
                    }}
                  >
                    Reset Code
                  </Button>
                </div>
              </div>
            </PopoverContent>
          </Popover>

          {/* Editor Settings Modal Trigger */}
          <IdeSettingsModal
            open={isSettingsOpen}
            onOpenChange={setIsSettingsOpen}
            settings={ideSettings}
            onSettingsChange={setIdeSettings}
            onOpenShortcuts={onOpenShortcuts}
            onPreviewFontSize={(size: number) => {
              if (editorRef.current) {
                editorRef.current.updateOptions({ fontSize: size });
              }
            }}
            trigger={
              <Button
                variant="ghost"
                size="icon"
                title="Editor Settings"
                className="h-7 w-7 text-muted-foreground hover:text-foreground"
                onClick={() => setIsSettingsOpen(true)}
              >
                <IconAdjustments className="h-4 w-4" />
              </Button>
            }
          />
        </div>
      </div>

      {/* Editor Body */}
      <div className="flex-1 min-h-0 relative">
        <style>{`
          .monaco-editor .margin-view-overlays .monaco-error-line-number {
            background-image: none !important;
          }
          .monaco-editor .margin-view-overlays .monaco-error-line-number .line-numbers {
            color: #f43f5e !important;
            font-weight: bold !important;
          }
          .monaco-editor .monaco-error-line-bg {
            background-color: rgba(244, 63, 94, 0.12) !important;
          }
        `}</style>

        {isTransitioning && (
          <div className="absolute inset-0 z-10 flex flex-col w-full h-full p-4 space-y-3 bg-card font-mono">
            {Array.from({ length: 15 }).map((_, i) => {
              const widths = [40, 60, 30, 75, 50, 85, 45, 65, 35, 70, 55, 80, 45, 60, 30];
              const indent = [0, 4, 4, 8, 8, 8, 4, 4, 0, 4, 4, 0, 0, 4, 4];
              return (
                <div key={i} className="flex items-center gap-4">
                  <div className="w-6 text-right text-[10px] text-muted-foreground/30 select-none">
                    {i + 1}
                  </div>
                  <div style={{ paddingLeft: `${indent[i]}rem`, width: "100%" }}>
                    <Skeleton className="h-3.5" style={{ width: `${widths[i]}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}

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
            smoothScrolling: true,
            cursorSmoothCaretAnimation: "on",
            wordWrap: ideSettings.wordWrap,
            automaticLayout: true,
            padding: { top: 10, bottom: 10 },
            lineNumbersMinChars: 3,
            scrollbar: { vertical: "hidden", horizontal: "hidden" },
          }}
          onMount={(editor, monaco) => {
            editorRef.current = editor;
            monacoRef.current = monaco;

            // Zoom In / Out
            const zoomIn = () =>
              setIdeSettings((prev: any) => ({
                ...prev,
                fontSize: Math.min(24, prev.fontSize + 1),
              }));
            editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Equal, zoomIn);
            editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.NumpadAdd, zoomIn);

            const zoomOut = () =>
              setIdeSettings((prev: any) => ({
                ...prev,
                fontSize: Math.max(10, prev.fontSize - 1),
              }));
            editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Minus, zoomOut);
            editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.NumpadSubtract, zoomOut);

            // Format Code (Shift+Alt+F)
            editor.addCommand(
              monaco.KeyMod.Shift | monaco.KeyMod.Alt | monaco.KeyCode.KeyF,
              () => {
                onFormatCode();
              }
            );

            // Run Code (Cmd/Ctrl + Enter)
            editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
              onRunCode();
            });

            // Submit Code (Cmd/Ctrl + Shift + Enter)
            editor.addCommand(
              monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.Enter,
              () => {
                onSubmitCode();
              }
            );

            // Run Code (Cmd/Ctrl + ')
            editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.US_QUOTE, () => {
              onRunCode();
            });

            // Track Cursor Position
            editor.onDidChangeCursorPosition((e) => {
              setCursorPos({ line: e.position.lineNumber, col: e.position.column });
            });
          }}
          loading={
            <div className="flex flex-col w-full h-full p-4 space-y-3 bg-background font-mono opacity-60">
              {Array.from({ length: 12 }).map((_, i) => {
                const widths = [40, 60, 30, 75, 50, 85, 45, 65, 35, 70, 55, 80];
                return (
                  <div key={i} className="flex items-center gap-4">
                    <div className="w-6 text-right text-[10px] text-muted-foreground/40 select-none">
                      {i + 1}
                    </div>
                    <Skeleton className="h-3.5" style={{ width: `${widths[i]}%` }} />
                  </div>
                );
              })}
            </div>
          }
        />

        {/* Floating bottom action buttons when buttonPosition === 'bottom' */}
        {ideSettings.buttonPosition === "bottom" && !isDailyChallenge && (
          <div className="absolute bottom-4 right-6 z-10">
            <ButtonGroup className="shadow-lg border border-border/80 rounded-lg p-0.5 bg-background/90 backdrop-blur-md">
              <Button
                variant="ghost"
                onClick={onRunCode}
                disabled={running || submitting}
                className="h-8 px-3.5 text-xs font-semibold flex items-center gap-1.5 rounded-md hover:bg-muted/80"
              >
                {running ? (
                  <Spinner className="size-3.5" />
                ) : (
                  <IconPlayerPlay className="h-3.5 w-3.5 text-emerald-500 fill-emerald-500/20" />
                )}
                <span>{running ? "Running" : "Run"}</span>
              </Button>
              <div className="w-[1px] h-4 bg-border/60 my-auto" />
              <Button
                variant="ghost"
                onClick={onSubmitConfirmModal}
                disabled={running || submitting}
                className="h-8 px-3.5 text-xs font-semibold flex items-center gap-1.5 rounded-md hover:bg-muted/80"
              >
                {submitting ? (
                  <Spinner className="size-3.5" />
                ) : (
                  <IconSend className="h-3.5 w-3.5 text-sky-500 fill-sky-500/20" />
                )}
                <span>{submitting ? "Judging" : "Submit"}</span>
              </Button>
            </ButtonGroup>
          </div>
        )}
      </div>

      {/* Editor Status Bar */}
      <EditorStatusBar
        saveStatus={saveStatus}
        cursorPos={cursorPos}
        languageName={selectedLang.name}
      />
    </div>
  );
}
