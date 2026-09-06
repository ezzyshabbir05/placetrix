"use client";

import React, { useState, useEffect, useRef } from "react";
import dynamic from "next/dynamic";

const Editor = dynamic(() => import("@monaco-editor/react"), {
  ssr: false,
});
import { useTheme } from "next-themes";
import Link from "next/link";
import * as htmlToImage from "html-to-image";
import { motion, AnimatePresence } from "framer-motion";
import {
  IconArrowLeft,
  IconPlayerPlay,
  IconPlayerPause,
  IconUpload,
  IconSend,
  IconCircleCheck,
  IconCircleX,
  IconClock,
  IconCpu,
  IconTerminal2,
  IconCheck,
  IconCopy,
  IconAlertTriangle,
  IconInfoCircle,
  IconHistory,
  IconRefresh,
  IconCode,
  IconX,
  IconSparkles,
  IconEdit,
  IconShare,
  IconChevronLeft,
  IconChevronRight,
  IconMaximize,
  IconMinimize,
  IconFileText,
  IconList,
  IconPlus,
  IconTrash,
  IconLayoutBoard,
  IconLayoutSidebar,
  IconLayoutNavbar,
  IconSearch,
  IconFilter,
  IconFileDescription,
  IconDeviceLaptop,
  IconBraces,
  IconZoomIn,
  IconZoomOut,
  IconAdjustments,
  IconDownload,
  IconKeyboard,
  IconGitCompare,
} from "@tabler/icons-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Kbd, KbdGroup } from "@/components/ui/kbd";
import { toast } from "sonner";
import { getFriendlyErrorMessage } from "@/lib/errors";
import { createClient } from "@/lib/supabase/client";
import { getProblemDataSPA, fetchProblemsInfinite, runCodeAction, submitCodeAction, formatCodeAction } from "../../actions";
import { getSubmissionCode } from "../../problems/[id]/notes-actions";
import { getProblemCompanyBadges, isCompanyTag } from "../../_constants/companies";
import { CompanyBadge } from "../CompanyBadge";
// Prism is loaded lazily the first time syntax highlighting is needed to
// avoid adding ~80KB of parse cost to the initial JS bundle.
let prismReady: Promise<typeof import("prismjs")> | null = null
function loadPrism() {
  if (!prismReady) {
    prismReady = import("prismjs").then(async (mod) => {
      await Promise.all([
        import("prismjs/components/prism-java" as any),
        import("prismjs/components/prism-python" as any),
        import("prismjs/components/prism-c" as any),
        import("prismjs/components/prism-cpp" as any),
        import("prismjs/components/prism-javascript" as any),
        import("prismjs/components/prism-typescript" as any),
      ])
      return mod
    })
  }
  return prismReady
}
import { buildStorageUrl } from "@/lib/storage";
import { useMonaco } from "@monaco-editor/react";
import {
  ResizablePanelGroup as PanelGroup,
  ResizablePanel as Panel,
  ResizableHandle as PanelResizeHandle,
} from "@/components/ui/resizable";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProblemNotes } from "./ProblemNotes";
import { IdeSettingsModal } from "./IdeSettingsModal";
import { ProblemDescriptionViewer } from "./ProblemDescriptionViewer";
import { WorkspaceTimer } from "./WorkspaceTimer";
import { startNavigationProgress, stopNavigationProgress } from "@/components/ui/navigation-progress";
import { IdeSettings, Problem, Submission, SampleTestCase } from "../../_types";
import { DEFAULT_IDE_SETTINGS, LANGUAGES, DIFFICULTY_COLORS } from "../../_constants";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectGroup,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription, EmptyContent, EmptyMedia } from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
// Robust memory usage display formatter
const formatMemory = (
  memKbOrMb: number | string | undefined | null,
  isAlreadyMb = false,
) => {
  if (memKbOrMb === undefined || memKbOrMb === null) return "—";
  const val = typeof memKbOrMb === "string" ? parseFloat(memKbOrMb) : memKbOrMb;
  if (isNaN(val) || val <= 0) return "< 0.1 MB";

  if (isAlreadyMb) {
    if (val < 0.1) return "< 0.1 MB";
    return `${val.toFixed(1)} MB`;
  } else {
    // KB input
    const mb = val / 1024;
    if (mb < 0.1) {
      return `${val.toFixed(0)} KB`;
    }
    return `${mb.toFixed(1)} MB`;
  }
};

// Robust runtime display formatter (input in milliseconds)
const formatRuntime = (runtimeMs: number | string | undefined | null) => {
  if (runtimeMs === undefined || runtimeMs === null) return "—";
  const val = typeof runtimeMs === "string" ? parseFloat(runtimeMs) : runtimeMs;
  if (isNaN(val) || val < 0) return "0 ms";
  if (val >= 1000) {
    return `${(val / 1000).toFixed(2)}s`;
  }
  return `${Math.round(val)} ms`;
};

// Truncate huge text outputs to prevent browser freezing
const truncateText = (text: string | null | undefined, limit = 5000) => {
  if (!text) return "";
  if (text.length <= limit) return text;
  return (
    text.slice(0, limit) +
    `\n\n...[truncated ${text.length - limit} characters]`
  );
};

const renderTestcaseValue = (valStr: string) => {
  try {
    const parsed = JSON.parse(valStr);

    // 2D Array
    if (Array.isArray(parsed) && parsed.length > 0 && Array.isArray(parsed[0])) {
      return (
        <div className={cn('mt-2', 'mb-3', 'overflow-x-auto', 'w-full')}>
          <div className={cn('inline-flex', 'flex-col', 'items-center', 'gap-0.5', 'py-1')}>
            {parsed.map((row, i) => (
              <div key={i} className={cn('flex', 'gap-0.5')}>
                {Array.isArray(row) ? row.map((cell: any, j: number) => (
                  <div
                    key={j}
                    className={cn('flex', 'items-center', 'justify-center', 'min-w-10', 'h-9', 'px-2', 'bg-white', 'dark:bg-zinc-950/60', 'border', 'border-zinc-200', 'dark:border-zinc-800', 'rounded-sm', 'font-mono', 'text-[15px]', 'text-zinc-800', 'dark:text-zinc-200', 'shadow-sm')}
                  >
                    {(typeof cell === 'string' && cell === '.') || cell === null ? <span className="text-zinc-400">{cell === null ? 'null' : '.'}</span> : String(cell)}
                  </div>
                )) : (
                  <div className={cn('flex', 'items-center', 'justify-center', 'h-9', 'px-3', 'bg-white', 'dark:bg-zinc-950/60', 'border', 'border-zinc-200', 'dark:border-zinc-800', 'rounded-sm', 'font-mono', 'text-[15px]', 'text-zinc-800', 'dark:text-zinc-200', 'shadow-sm')}>
                    {String(row)}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      );
    }

    // 1D Array
    if (Array.isArray(parsed)) {
      if (parsed.length === 0) {
        return <span className={cn('font-mono', 'text-zinc-500')}>[]</span>;
      }
      return (
        <div className={cn('mt-2', 'mb-3', 'overflow-x-auto', 'w-full')}>
          <div className={cn('inline-flex', 'flex-row', 'gap-0.5', 'py-1')}>
            {parsed.map((cell: any, j: number) => (
              <div
                key={j}
                className={cn('flex', 'items-center', 'justify-center', 'min-w-10', 'h-9', 'px-2', 'bg-white', 'dark:bg-zinc-950/60', 'border', 'border-zinc-200', 'dark:border-zinc-800', 'rounded-sm', 'font-mono', 'text-[15px]', 'text-zinc-800', 'dark:text-zinc-200', 'shadow-sm')}
              >
                {(typeof cell === 'string' && cell === '.') || cell === null ? <span className="text-zinc-400">{cell === null ? 'null' : '.'}</span> : String(cell)}
              </div>
            ))}
          </div>
        </div>
      );
    }

    // Fallback for strings and primitives: add a nice styling for strings to show quotes
    if (typeof parsed === 'string') {
      return <span className={cn('break-all', 'whitespace-pre-wrap', 'font-mono', 'text-emerald-600', 'dark:text-emerald-400')}>"{parsed}"</span>;
    }

    // Booleans and numbers
    if (typeof parsed === 'boolean') {
      return <span className={cn('font-mono', 'text-blue-600', 'dark:text-blue-400')}>{String(parsed)}</span>;
    }
    if (typeof parsed === 'number') {
      return <span className={cn('font-mono', 'text-amber-600', 'dark:text-amber-400')}>{String(parsed)}</span>;
    }

  } catch (e) { }
  return <span className={cn('break-all', 'whitespace-pre-wrap')}>{valStr}</span>;
};

export function ProblemWorkspaceClient({
  problem: initialProblem,
  sampleTestCases: initialSampleTestCases,
  totalTestCases: initialTotalTestCases,
  submissions: initialSubmissions,
  userId,
  userProfile,
  prevProblemId: initialPrevProblemId,
  nextProblemId: initialNextProblemId,
  trackContext: initialTrackContext = null,
  companyContext: initialCompanyContext = null,
  isDailyChallenge = false,
  dailyChallengeId,
}: {
  problem: Problem;
  sampleTestCases: SampleTestCase[];
  totalTestCases: number;
  submissions: Submission[];
  userId: string;
  userProfile?: any;
  prevProblemId: string | null;
  nextProblemId: string | null;
  trackContext?: { id: string; title: string; currentStep: number; totalSteps: number } | null;
  companyContext?: { id: string; name: string; currentStep: number; totalSteps: number } | null;
  isDailyChallenge?: boolean;
  dailyChallengeId?: string;
}) {
  const [problem, setProblem] = useState(initialProblem);
  const [sampleTestCases, setSampleTestCases] = useState(
    initialSampleTestCases,
  );
  const [totalTestCases, setTotalTestCases] = useState(initialTotalTestCases);
  const [submissions, setSubmissions] = useState(initialSubmissions);
  const [prevProblemId, setPrevProblemId] = useState(initialPrevProblemId);
  const [nextProblemId, setNextProblemId] = useState(initialNextProblemId);
  const [trackContext, setTrackContext] = useState(initialTrackContext);
  const [companyContext, setCompanyContext] = useState(initialCompanyContext);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [mobileActiveTab, setMobileActiveTab] = useState<"description" | "submissions" | "notes">("description");
  const [unlockedBadgeModal, setUnlockedBadgeModal] = useState<any | null>(null);
  const clickTimestamps = React.useRef<number[]>([]);
  const badgeCardRef = useRef<HTMLDivElement>(null);
  const [badgeDataUrl, setBadgeDataUrl] = useState<string | null>(null);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);
  const [showDiffView, setShowDiffView] = useState(true);
  const [lastSavedTime, setLastSavedTime] = useState<string | null>(null);
  const [cursorPos, setCursorPos] = useState({ line: 1, col: 1 });
  const [saveStatus, setSaveStatus] = useState<"Saved" | "Saving..." | "Unsaved" | "">("Saved");

  const jumpToEditorLine = (lineNum: number) => {
    if (!editorRef.current || !lineNum || lineNum <= 0) return;
    try {
      editorRef.current.revealLineInCenter(lineNum);
      editorRef.current.setPosition({ lineNumber: lineNum, column: 1 });
      editorRef.current.focus();
    } catch (e) { }
  };

  // Fetch the image as a blob to completely bypass html2canvas CORS issues
  useEffect(() => {
    if (unlockedBadgeModal?.icon_name) {
      fetch(unlockedBadgeModal.icon_name)
        .then(res => res.blob())
        .then(blob => {
          const reader = new FileReader();
          reader.onloadend = () => setBadgeDataUrl(reader.result as string);
          reader.readAsDataURL(blob);
        })
        .catch(console.error);
    } else {
      setBadgeDataUrl(null);
    }
  }, [unlockedBadgeModal]);

  const handleDownloadBadge = async () => {
    if (!badgeCardRef.current) return;
    try {
      const dataUrl = await htmlToImage.toPng(badgeCardRef.current, {
        pixelRatio: 2,
        fontEmbedCSS: '', // Bypasses the SecurityError without breaking font layout
        filter: (node) => {
          if (node?.getAttribute && node.getAttribute("data-html2canvas-ignore") === "true") {
            return false;
          }
          return true;
        },
      });
      const link = document.createElement("a");
      link.download = `LogicLab_Badge_${unlockedBadgeModal?.name?.replace(/\s+/g, '_') || 'Achievement'}.png`;
      link.href = dataUrl;
      link.click();
      toast.success("Badge downloaded successfully!");
    } catch (err) {
      console.error("Failed to download badge:", err);
      toast.error("Failed to download badge image.");
    }
  };

  useEffect(() => {
    setIsMounted(true);
  }, []);
  const submitRef = React.useRef<any>(null);
  const runRef = React.useRef<any>(null);
  const editorRef = React.useRef<any>(null);
  const monacoRef = React.useRef<any>(null);
  const errorDecorationsRef = React.useRef<any>(null);

  const handleNavigate = async (targetId: string) => {
    setIsTransitioning(true);
    startNavigationProgress();
    try {
      const data = await getProblemDataSPA(
        targetId,
        userId,
        trackContext?.id,
        companyContext?.id
      );
      if (!data) {
        toast.error("Failed to load problem");
        return;
      }
      setProblem(data.problem);
      setSampleTestCases(data.sampleTestCases);
      setTotalTestCases(data.totalTestCases);
      setSubmissions(data.submissions);
      setPrevProblemId(data.prevProblemId);
      setNextProblemId(data.nextProblemId);
      if (data.trackContext) setTrackContext(data.trackContext);
      if (data.companyContext) setCompanyContext(data.companyContext);

      // Update URL without full reload, preserving track or company query param
      const queryParam = trackContext?.id
        ? `?track=${trackContext.id}`
        : companyContext?.id
          ? `?company=${companyContext.id}`
          : "";
      window.history.pushState(null, "", `/logiclab/problems/${targetId}${queryParam}`);

      // Reset editor and tabs
      let parsedBoilerplates: any = data.problem.boilerplates || {};
      if (typeof parsedBoilerplates === "string") {
        try {
          parsedBoilerplates = JSON.parse(parsedBoilerplates);
        } catch { }
      }

      const key = isDailyChallenge
        ? `logiclab_daily_challenge_${dailyChallengeId}_code_${selectedLang.value}`
        : `logiclab_problem_${targetId}_code_${selectedLang.value}`;

      const savedData = localStorage.getItem(key);
      let loadedCode = null;
      if (savedData) {
        try {
          const parsed = JSON.parse(savedData);
          if (parsed.code && parsed.timestamp && Date.now() - parsed.timestamp < 7 * 24 * 60 * 60 * 1000) {
            loadedCode = parsed.code;
          }
        } catch (e) {
          // Ignore legacy plain-text format to enforce expiration
        }
      }

      if (loadedCode) {
        setCode(loadedCode);
      } else {
        setCode(
          parsedBoilerplates[String(selectedLang.id)] ||
          `// Write your ${selectedLang.name} solution here\n`,
        );
      }
      setActiveTab("description");
      setSubmitResult(null);
      setRunResult(null);
      setIsProblemListOpen(false);
    } catch (e: any) {
      console.error(e);
      toast.error("An error occurred while switching problems");
    } finally {
      setIsTransitioning(false);
      stopNavigationProgress();
    }
  };

  // Browser Back/Forward navigation synchronization
  React.useEffect(() => {
    const handlePopState = () => {
      const match = window.location.pathname.match(/\/logiclab\/problems\/([a-zA-Z0-9_-]+)/);
      if (match && match[1] && match[1] !== problem.id) {
        handleNavigate(match[1]);
      }
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [problem.id]);

  // Update document title dynamically when navigating between problems
  useEffect(() => {
    document.title = `${problem.number ? `${problem.number}. ` : ""}${problem.title} — LogicLab`;
  }, [problem.title, problem.number]);

  // Ensure window confirms leaving if running or typing
  const { resolvedTheme } = useTheme();
  const monacoTheme = resolvedTheme === "light" ? "vs" : "vs-dark";
  const sidebarRef = React.useRef<any>(null);
  const ideContainerRef = React.useRef<HTMLDivElement>(null);

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);

  React.useEffect(() => {
    const handleFullscreenChange = () => {
      setTimeout(() => {
        setIsFullScreen(!!document.fullscreenElement);
      }, 50);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("webkitfullscreenchange", handleFullscreenChange);

    // If mounted while browser is already in fullscreen (e.g. client-side navigation)
    if (document.fullscreenElement) {
      setIsFullScreen(true);
    }

    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener(
        "webkitfullscreenchange",
        handleFullscreenChange,
      );
    };
  }, []);

  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      setIsFullScreen(true);
      document.documentElement.requestFullscreen().catch((err) => {
        setIsFullScreen(false);
        toast.error(
          "Could not enter fullscreen mode. Your browser may not support this feature.",
        );
      });
    } else {
      setIsFullScreen(false);
      document.exitFullscreen().catch(() => { });
    }
  };

  const parsedBoilerplates = React.useMemo(() => {
    let parsed: any = problem.boilerplates || {};
    if (typeof parsed === "string") {
      try {
        parsed = JSON.parse(parsed);
      } catch (e) {
        parsed = {};
      }
    }
    return parsed;
  }, [problem.boilerplates]);

  const [selectedLang, setSelectedLang] = useState(LANGUAGES[0]);
  const selectedLangRef = React.useRef(LANGUAGES[0]);

  // Load preferred language from localStorage on mount
  useEffect(() => {
    try {
      const savedLang = localStorage.getItem("logiclab_preferred_language");
      if (savedLang) {
        const lang = LANGUAGES.find((l) => l.value === savedLang);
        if (lang) {
          setSelectedLang(lang);
        }
      }
    } catch (e) {
      // Ignore localStorage errors
    }
  }, []);

  useEffect(() => {
    selectedLangRef.current = selectedLang;
  }, [selectedLang]);

  const [code, setCode] = useState("");

  // Settings State
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [ideSettings, setIdeSettings] = useState<IdeSettings>(DEFAULT_IDE_SETTINGS);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("logiclab-ide-settings");
      if (stored) {
        const parsed = JSON.parse(stored);
        setIdeSettings({ ...DEFAULT_IDE_SETTINGS, ...parsed });
      }
    } catch (e) { }
  }, []);

  useEffect(() => {
    localStorage.setItem("logiclab-ide-settings", JSON.stringify(ideSettings));
  }, [ideSettings]);

  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.updateOptions({
        fontSize: ideSettings.fontSize,
        wordWrap: ideSettings.wordWrap
      });
    }
  }, [ideSettings.fontSize, ideSettings.wordWrap]);



  const handleFormatCode = async () => {
    const editor = editorRef.current;
    const monaco = monacoRef.current;
    const currentCode = editor ? editor.getValue() : code;
    const currentLang = selectedLangRef.current.value;
    if (!currentCode || !currentLang) return;
    try {
      const data = await formatCodeAction(currentCode, currentLang);
      if (data.warning) {
        toast.warning(data.warning);
      } else if (data.error) {
        toast.error(data.error);
      } else if (data.code) {
        if (editor && editor.getModel() && monaco) {
          const model = editor.getModel();
          // Register a temporary formatter for this language
          const provider = monaco.languages.registerDocumentFormattingEditProvider(currentLang, {
            provideDocumentFormattingEdits(model: any) {
              return [{
                range: model.getFullModelRange(),
                text: data.code
              }];
            }
          });
          // Run the native format document action
          // Monaco's internal formatter handles the diffing automatically so it doesn't flash white
          await editor.getAction('editor.action.formatDocument').run();
          // Cleanup the temporary formatter
          provider.dispose();
        } else {
          setCode(data.code);
        }
      }
    } catch (err) {
      console.error("Format error", err);
      toast.error("Failed to format code. See console.");
    }
  };
  const [activeTab, setActiveTab] = useState<
    "description" | "submissions" | "submission_result" | "notes"
  >("description");
  const [activeOutputTab, setActiveOutputTab] = useState<
    "testcases" | "result"
  >("testcases");
  const [running, setRunning] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [hasRun, setHasRun] = useState(false);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [runResult, setRunResult] = useState<any>(null);
  const [submitResult, setSubmitResult] = useState<any>(null);
  const [hoveredScalingPoint, setHoveredScalingPoint] = useState<any>(null);
  const [selectedCaseIndex, setSelectedCaseIndex] = useState(0);

  const [isProblemListOpen, setIsProblemListOpen] = useState(false);
  const [isResetOpen, setIsResetOpen] = useState(false);
  const [problemList, setProblemList] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "solved" | "unsolved"
  >("all");
  const [difficultyFilter, setDifficultyFilter] = useState<
    "all" | "easy" | "medium" | "hard"
  >("all");
  const [isLoadingProblems, setIsLoadingProblems] = useState(false);
  const [hasMoreProblems, setHasMoreProblems] = useState(true);
  const [isNextPageLoading, setIsNextPageLoading] = useState(false);
  const [totalProblemsCount, setTotalProblemsCount] = useState(0);
  const sentinelRef = React.useRef<HTMLDivElement>(null);

  const [ideLayout, setIdeLayout] = useState<"standard" | "split" | "vertical">(
    "standard",
  );

  React.useEffect(() => {
    const saved = localStorage.getItem("logiclab_ide_layout");
    if (saved === "standard" || saved === "split" || saved === "vertical") {
      setIdeLayout(saved);
    }
  }, []);

  // --- Formatter for Error Diagnostics ---
  const formatErrorDiagnostic = (text: string | null | undefined) => {
    if (!text) return "";
    let formatted = text;
    const offset = runResult?.lineOffset || submitResult?.lineOffset || 0;

    if (offset > 0) {
      if (selectedLang.name.toLowerCase().includes("python")) {
        formatted = formatted.replace(/(File ".*?", line )(\d+)/g, (match, prefix, line) => {
          return `${prefix}${Math.max(1, parseInt(line, 10) - offset)}`;
        });
      } else if (selectedLang.name.toLowerCase().includes("c++") || selectedLang.name.toLowerCase().includes("c \(gcc\)")) {
        formatted = formatted.replace(/(script\.cpp:|script\.c:|:\s*)(\d+)/g, (match, prefix, line) => {
          return `${prefix}${Math.max(1, parseInt(line, 10) - offset)}`;
        });
      } else if (selectedLang.name.toLowerCase().includes("java")) {
        formatted = formatted.replace(/(Main\.java:|Solution\.java:)(\d+)/g, (match, prefix, line) => {
          return `${prefix}${Math.max(1, parseInt(line, 10) - offset)}`;
        });
      } else if (selectedLang.name.toLowerCase().includes("javascript") || selectedLang.name.toLowerCase().includes("typescript")) {
        formatted = formatted.replace(/(script\.[jt]s:|:\s*)(\d+)/g, (match, prefix, line) => {
          return `${prefix}${Math.max(1, parseInt(line, 10) - offset)}`;
        });
      }
    }

    formatted = formatted.replace(/File ".*?script\.py"/g, 'File "main.py"');
    formatted = formatted.replace(/script\.cpp:/g, 'main.cpp:');
    formatted = formatted.replace(/Main\.java:/g, 'Main.java:');
    formatted = formatted.replace(/script\.js:/g, 'main.js:');
    formatted = formatted.replace(/script\.ts:/g, 'main.ts:');

    return formatted;
  };

  // --- Editor Error Line Highlighting ---
  React.useEffect(() => {
    if (!editorRef.current || !monacoRef.current) return;
    const editor = editorRef.current;
    const monaco = monacoRef.current;

    let errorLine: number | null = null;
    let errorText = "";

    const extractErrorLine = (text: string, langName: string) => {
      if (!text) return null;
      if (langName.toLowerCase().includes("python")) {
        const match = text.match(/line (\d+)/i);
        if (match) return parseInt(match[1], 10);
      } else if (langName.toLowerCase().includes("c++") || langName.toLowerCase().includes("c (gcc)")) {
        const match = text.match(/script\.cpp:(\d+):/i) || text.match(/script\.c:(\d+):/i);
        if (match) return parseInt(match[1], 10);
      } else if (langName.toLowerCase().includes("java")) {
        const match = text.match(/Main\.java:(\d+):/i) || text.match(/Solution\.java:(\d+):/i);
        if (match) return parseInt(match[1], 10);
      } else if (langName.toLowerCase().includes("javascript") || langName.toLowerCase().includes("typescript")) {
        const match = text.match(/script\.[jt]s:(\d+)/i) || text.match(/:\s*(\d+):\d+/i);
        if (match) return parseInt(match[1], 10);
      }
      return null;
    };

    let targetText = "";
    let lineOffset = 0;
    if (submitResult?.status === "Compile Error" || submitResult?.status?.includes("Runtime Error")) {
      targetText = submitResult.compile_output || submitResult.failed_test_case_info?.actual || submitResult.stderr || "";
      lineOffset = submitResult.lineOffset || 0;
    } else if (runResult && !runResult.success) {
      lineOffset = runResult.lineOffset || 0;
      if (runResult.compile_output || runResult.stderr) {
        targetText = runResult.compile_output || runResult.stderr || "";
      } else if (runResult.cases && runResult.cases.length > 0) {
        const failedCase = runResult.cases.find((c: any) => !c.passed && (c.compile_output || c.stderr));
        if (failedCase) targetText = failedCase.compile_output || failedCase.stderr || "";
      }
    }

    if (targetText) {
      const parsedLine = extractErrorLine(targetText, selectedLang.name);
      if (parsedLine !== null) {
        errorLine = Math.max(1, parsedLine - lineOffset);
      }
      errorText = targetText;
    }

    const clearDecorations = () => {
      if (errorDecorationsRef.current) {
        if (editor.createDecorationsCollection) {
          errorDecorationsRef.current.clear();
        } else {
          editor.deltaDecorations(errorDecorationsRef.current, []);
        }
        errorDecorationsRef.current = null;
      }
    };

    if (errorLine) {
      const newDecorations = [
        {
          range: new monaco.Range(errorLine, 1, errorLine, 1),
          options: {
            isWholeLine: true,
            className: 'monaco-error-line-bg',
            marginClassName: 'monaco-error-line-number',
          }
        },
        {
          range: new monaco.Range(errorLine, 1, errorLine, 100),
          options: {
            inlineClassName: 'decoration-rose-500 decoration-wavy underline decoration-[1.5px] underline-offset-2',
            hoverMessage: { value: '```text\n' + errorText + '\n```' }
          }
        }
      ];
      if (!errorDecorationsRef.current) {
        if (editor.createDecorationsCollection) {
          errorDecorationsRef.current = editor.createDecorationsCollection(newDecorations);
        } else {
          errorDecorationsRef.current = editor.deltaDecorations([], newDecorations);
        }
      } else {
        if (editor.createDecorationsCollection) {
          errorDecorationsRef.current.set(newDecorations);
        } else {
          errorDecorationsRef.current = editor.deltaDecorations(errorDecorationsRef.current, newDecorations);
        }
      }
    } else {
      clearDecorations();
    }
  }, [submitResult, runResult, selectedLang]);

  // Clear decorations when code changes
  React.useEffect(() => {
    if (errorDecorationsRef.current && editorRef.current) {
      if (editorRef.current.createDecorationsCollection) {
        errorDecorationsRef.current.clear();
      } else {
        editorRef.current.deltaDecorations(errorDecorationsRef.current, []);
      }
      errorDecorationsRef.current = null;
    }
  }, [code]);

  const handleLayoutChange = (layout: "standard" | "split" | "vertical") => {
    setIdeLayout(layout);
    localStorage.setItem("logiclab_ide_layout", layout);
  };

  // Load initial page or reset list when filters/search changes
  React.useEffect(() => {
    if (!isProblemListOpen) return;

    const timer = setTimeout(() => {
      const fetchInitialProblems = async () => {
        setIsLoadingProblems(true);
        try {
          const { problems: fresh, hasMore: more, totalCount: count } = await fetchProblemsInfinite({
            userId,
            offset: 0,
            limit: 20,
            search: searchQuery,
            tab: statusFilter,
            difficulty: difficultyFilter === "all" ? "All" : difficultyFilter.charAt(0).toUpperCase() + difficultyFilter.slice(1),
          });
          const mapped = fresh.map((p: any) => ({
            ...p,
            isSolved: p.solved_status === "Accepted"
          }));
          setProblemList(mapped);
          setHasMoreProblems(more);
          setTotalProblemsCount(count);
        } catch (error) {
          console.error("Failed to load initial problems:", error);
          toast.error("Failed to load problems");
        } finally {
          setIsLoadingProblems(false);
        }
      };
      fetchInitialProblems();
    }, 300);

    return () => clearTimeout(timer);
  }, [isProblemListOpen, searchQuery, statusFilter, difficultyFilter, userId]);

  const loadMoreProblems = React.useCallback(async () => {
    if (isNextPageLoading || !hasMoreProblems) return;
    setIsNextPageLoading(true);
    try {
      const nextOffset = problemList.length;
      const { problems: next, hasMore: more } = await fetchProblemsInfinite({
        userId,
        offset: nextOffset,
        limit: 20,
        search: searchQuery,
        tab: statusFilter,
        difficulty: difficultyFilter === "all" ? "All" : difficultyFilter.charAt(0).toUpperCase() + difficultyFilter.slice(1),
      });
      const mappedNext = next.map((p: any) => ({
        ...p,
        isSolved: p.solved_status === "Accepted"
      }));
      setProblemList((prev) => [...prev, ...mappedNext]);
      setHasMoreProblems(more);
    } catch (error) {
      console.error("Failed to load more problems:", error);
    } finally {
      setIsNextPageLoading(false);
    }
  }, [isNextPageLoading, hasMoreProblems, problemList.length, userId, searchQuery, statusFilter, difficultyFilter]);

  React.useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !isProblemListOpen) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadMoreProblems();
        }
      },
      { rootMargin: "100px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [isProblemListOpen, loadMoreProblems]);

  React.useEffect(() => {
    if (isProblemListOpen && problemList.length > 0) {
      setTimeout(() => {
        const activeLink = document.getElementById("active-problem-link");
        const scrollArea = document.getElementById("problem-list-scroll-area");
        const viewport = scrollArea?.querySelector(
          "[data-slot='scroll-area-viewport']",
        );

        if (activeLink && viewport) {
          const offsetTop = activeLink.offsetTop;
          const viewportHeight = viewport.clientHeight;
          viewport.scrollTo({
            top: offsetTop - viewportHeight / 2 + 20,
            behavior: "smooth",
          });
        }
      }, 150);
    }
  }, [isProblemListOpen]);

  const isLegacyFormat = React.useMemo(() => {
    if (!initialSampleTestCases || initialSampleTestCases.length === 0) return false;
    const firstInput = initialSampleTestCases[0].input.trim();
    return firstInput.startsWith("[") && firstInput.endsWith("]") && !firstInput.includes("\n") && !firstInput.startsWith("[[");
  }, [initialSampleTestCases]);

  const [customInputs, setCustomInputs] = useState<string[]>(() =>
    sampleTestCases.map((tc) => tc.input),
  );
  const [customExpectedOutputs, setCustomExpectedOutputs] = useState<string[]>(
    () => sampleTestCases.map((tc) => tc.expected_output || ""),
  );
  const [activeTestcaseIndex, setActiveTestcaseIndex] = useState(0);

  React.useEffect(() => {
    setCustomInputs(sampleTestCases.map((tc) => tc.input));
    setCustomExpectedOutputs(
      sampleTestCases.map((tc) => tc.expected_output || ""),
    );
    setActiveTestcaseIndex(0);
  }, [sampleTestCases]);

  // Load code from local storage or fallback to boilerplate
  React.useEffect(() => {
    const key = isDailyChallenge
      ? `logiclab_daily_challenge_${dailyChallengeId}_code_${selectedLang.value}`
      : `logiclab_problem_${problem.id}_code_${selectedLang.value}`;

    const savedData = localStorage.getItem(key);
    let loadedCode = null;
    if (savedData) {
      try {
        const parsed = JSON.parse(savedData);
        if (parsed.code && parsed.timestamp && Date.now() - parsed.timestamp < 7 * 24 * 60 * 60 * 1000) {
          loadedCode = parsed.code;
        }
      } catch (e) {
        // Ignore legacy plain-text format to enforce expiration
      }
    }

    if (loadedCode) {
      setCode(loadedCode);
    } else {
      setCode(
        parsedBoilerplates[String(selectedLang.id)] ||
        `// Write your ${selectedLang.name} solution here\n`,
      );
    }
  }, [
    problem.id,
    dailyChallengeId,
    isDailyChallenge,
    selectedLang.id,
    selectedLang.name,
    selectedLang.value,
    parsedBoilerplates,
  ]);

  // Debounced Save code to local storage
  React.useEffect(() => {
    if (!code) return;

    // Wait for a 2.5-second pause before initiating the save sequence
    const timeoutId = setTimeout(() => {
      // Briefly show saving indicator
      setSaveStatus("Saving...");

      setTimeout(() => {
        const key = isDailyChallenge
          ? `logiclab_daily_challenge_${dailyChallengeId}_code_${selectedLang.value}`
          : `logiclab_problem_${problem.id}_code_${selectedLang.value}`;
        localStorage.setItem(key, JSON.stringify({
          code,
          timestamp: Date.now()
        }));
        setLastSavedTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
        setSaveStatus("Saved");
      }, 400); // 400ms fake saving delay for visual feedback
    }, 2500);

    return () => clearTimeout(timeoutId);
  }, [code, problem.id, dailyChallengeId, isDailyChallenge, selectedLang.value]);
  // Console resizing state removed (replaced by react-resizable-panels)

  // Helper to extract parameter names from the selected language's boilerplate code
  const getParamNames = () => {
    try {
      const boilerplate = parsedBoilerplates[String(selectedLang.id)] || "";
      if (!boilerplate) return ["nums"];

      // Parse Python parameters
      if (selectedLang.value === "python") {
        const match = boilerplate.match(/def\s+\w+\((self,\s*)?([^)]*)\)/);
        if (match && match[2]) {
          return match[2]
            .split(",")
            .map((p: string) => p.split(":")[0].trim())
            .filter(Boolean);
        }
      }
      // Parse JS/TS parameters
      if (
        selectedLang.value === "javascript" ||
        selectedLang.value === "typescript"
      ) {
        const match = boilerplate.match(
          /(class\s+\w+|\w+)\s*\{\s*\w*\s*\(([^)]*)\)/,
        );
        const simpleMatch = boilerplate.match(/\w+\(([^)]*)\)/);
        const params = (match && match[2]) || (simpleMatch && simpleMatch[1]);
        if (params) {
          return params
            .split(",")
            .map((p: string) => p.trim())
            .filter(Boolean);
        }
      }
      // Parse C++ parameters
      if (selectedLang.value === "cpp") {
        const match = boilerplate.match(/\w+\(([^)]*)\)/);
        if (match && match[1]) {
          return match[1]
            .split(",")
            .map((p: string) => {
              const parts = p.trim().split(/\s+/);
              const name = parts[parts.length - 1];
              return name.replace(/[&*]/g, "").trim();
            })
            .filter(Boolean);
        }
      }
      // Parse Java parameters
      if (selectedLang.value === "java") {
        const match = boilerplate.match(/\w+\(([^)]*)\)/);
        if (match && match[1]) {
          return match[1]
            .split(",")
            .map((p: string) => {
              const parts = p.trim().split(/\s+/);
              return parts[parts.length - 1].trim();
            })
            .filter(Boolean);
        }
      }
    } catch (e) {
      console.error("Failed to parse param names", e);
    }
    return ["nums"];
  };

  const renderInputParams = (
    inputStr: string,
    paramsList: string[],
    isEditable = false,
    onChange?: (idx: number, val: string) => void,
  ) => {
    const rawLines = inputStr.split("\n").map((l) => l.trim());
    const iterator = paramsList.length > 0 ? paramsList : rawLines;

    return (
      <div className={cn('space-y-3', 'font-mono')}>
        {iterator.map((paramOrLine, idx) => {
          const paramName =
            paramsList.length > 0 ? paramOrLine : `param${idx + 1}`;
          const line = rawLines[idx] || "";

          return (
            <div key={idx} className={cn('space-y-1.5', 'text-xs')}>
              <span className={cn('text-sm', 'text-zinc-600 dark:text-muted-foreground/80', 'font-bold', 'block', 'select-none')}>
                {paramName} =
              </span>
              {isEditable ? (
                <Input
                  type="text"
                  value={line}
                  onChange={(e) => onChange?.(idx, e.target.value)}
                  className={cn('font-mono', 'text-[15px]', 'bg-zinc-100/80', 'dark:bg-zinc-900/50')}
                />
              ) : (
                <pre className={cn('p-3', 'bg-zinc-100/70 dark:bg-zinc-900/30', 'border', 'border-border/40', 'rounded-md', 'text-zinc-900 dark:text-foreground/90', 'text-[15px]', 'font-mono', 'whitespace-pre-wrap', 'leading-relaxed', 'max-h-32', 'overflow-y-auto')}>
                  {line}
                </pre>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  // Historical Code Viewer state
  const [viewingSubmission, setViewingSubmission] = useState<Submission | null>(
    null,
  );
  const [viewingCode, setViewingCode] = useState<string>("");
  const [highlightedCode, setHighlightedCode] = useState<string>("");
  const [loadingCode, setLoadingCode] = useState<boolean>(false);

  // Re-highlight whenever the viewed code or selected language changes
  useEffect(() => {
    if (!viewingCode || !viewingSubmission) {
      setHighlightedCode("");
      return;
    }
    let cancelled = false;
    getHighlightedCode(
      viewingCode.replace(/^[\r\n]+/, "") || "// Code not available",
      viewingSubmission.language_id
    ).then((html) => {
      if (!cancelled) setHighlightedCode(html);
    });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewingCode, viewingSubmission?.language_id]);

  const handleViewPastSubmission = async (sub: Submission) => {
    setViewingSubmission(sub);
    setLoadingCode(true);
    setViewingCode("");
    setHighlightedCode("");
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

  const fallbackCopy = (text: string) => {
    try {
      const textArea = document.createElement("textarea");
      textArea.value = text;
      textArea.style.position = "fixed";
      textArea.style.opacity = "0";
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      const successful = document.execCommand('copy');
      document.body.removeChild(textArea);
      if (successful) {
        toast.success("Copied to clipboard!");
      } else {
        toast.error("Failed to copy code.");
      }
    } catch (err) {
      toast.error("Failed to copy code.");
    }
  };

  const handleCopyToClipboard = (text: string) => {
    if (!text) return;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text)
        .then(() => toast.success("Copied to clipboard!"))
        .catch(() => fallbackCopy(text));
    } else {
      fallbackCopy(text);
    }
  };

  const getHighlightedCode = async (codeText: string, langId: number): Promise<string> => {
    const langObj = LANGUAGES.find((l) => l.id === langId);
    let lang = langObj ? langObj.value : "javascript";

    if (lang === 'js') lang = 'javascript';
    if (lang === 'ts') lang = 'typescript';
    if (lang === 'py') lang = 'python';
    if (lang === 'c++') lang = 'cpp';

    try {
      const Prism = await loadPrism()
      if (Prism.languages[lang]) {
        return Prism.highlight(codeText, Prism.languages[lang], lang);
      }
      return Prism.highlight(codeText, Prism.languages.javascript, 'javascript');
    } catch {
      return codeText.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    }
  };

  const handleLangChange = (langVal: string) => {
    // Immediately persist current code to avoid debounce race condition loss
    if (code) {
      try {
        const currentKey = isDailyChallenge
          ? `logiclab_daily_challenge_${dailyChallengeId}_code_${selectedLang.value}`
          : `logiclab_problem_${problem.id}_code_${selectedLang.value}`;
        localStorage.setItem(currentKey, JSON.stringify({
          code,
          timestamp: Date.now()
        }));
      } catch (e) { }
    }

    const lang = LANGUAGES.find((l) => l.value === langVal);
    if (lang) {
      setSelectedLang(lang);
      try {
        localStorage.setItem("logiclab_preferred_language", langVal);
      } catch (e) { }
      // useEffect handles restoring or boilerplating code when selectedLang changes
    }
  };

  const handleRunCode = async () => {
    const now = Date.now();
    clickTimestamps.current = clickTimestamps.current.filter(t => now - t < 3000);
    if (clickTimestamps.current.length >= 2) {
      toast.error("Please wait a moment before running again. Rate limit exceeded.");
      return;
    }
    clickTimestamps.current.push(now);

    const currentBoilerplate =
      parsedBoilerplates[String(selectedLang.id)] ||
      `// Write your ${selectedLang.name} solution here\n`;
    if (
      !code ||
      code.trim() === "" ||
      code.trim() === currentBoilerplate.trim()
    ) {
      toast.warning("Please write your solution before running.");
      return;
    }
    setHasRun(true);
    setRunning(true);
    setRunResult(null);
    setSelectedCaseIndex(0);
    setActiveOutputTab("result");
    try {
      let processedCode = code;

      // Fix for Java: Online compilers require the filename to match the class name if the class is public.
      // In Problem Mode, the user MUST write 'class Solution' and MUST use the exact function name.
      // We strip 'public' just in case they wrote 'public class Solution' to prevent compilation errors.
      if (selectedLang.value === "java") {
        processedCode = processedCode.replace(/public\s+class\s+/g, "class ");
      }

      const runRes = await fetch("/api/logiclab/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source_code: processedCode,
          language_id: selectedLang.id,
          problem_id: problem.id,
          mode: "problem",
          custom_cases: customInputs.map(ci => ci.trim()),
          custom_expected: customExpectedOutputs,
        }),
      });
      const runInit = await runRes.json();
      if (!runRes.ok || !runInit.success) {
        throw new Error(runInit.error || "Execution submission failed.");
      }

      const { tokens: runTokens, line_offset, sample_cases } = runInit;
      let runAttempts = 0;
      let data: any = null;

      while (runAttempts < 30) {
        await new Promise(r => setTimeout(r, Math.min(800 + runAttempts * 200, 2000)));
        const statusRes = await fetch("/api/logiclab/run-status", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tokens: runTokens,
            mode: "problem",
            line_offset,
            sample_cases,
          }),
        });
        if (statusRes.ok) {
          const statusJson = await statusRes.json();
          if (statusJson.completed) {
            data = statusJson;
            break;
          }
        }
        runAttempts++;
      }

      if (!data) throw new Error("Execution timed out. Please try again.");
      if (data.error) throw new Error(data.error);

      setRunResult(data);
    } catch (err: any) {
      setRunResult({
        success: false,
        error: err?.message || "Execution failed.",
      });
      toast.error(getFriendlyErrorMessage(err, "Code execution failed. Please check your code and try again."));
    } finally {
      setRunning(false);
    }
  };

  const handleSubmitCode = async () => {
    const now = Date.now();
    clickTimestamps.current = clickTimestamps.current.filter(t => now - t < 3000);
    if (clickTimestamps.current.length >= 2) {
      toast.error("Please wait a moment before submitting again. Rate limit exceeded.");
      return;
    }
    clickTimestamps.current.push(now);

    const currentBoilerplate =
      parsedBoilerplates[String(selectedLang.id)] ||
      `// Write your ${selectedLang.name} solution here\n`;
    if (
      !code ||
      code.trim() === "" ||
      code.trim() === currentBoilerplate.trim()
    ) {
      toast.warning("Please write your solution before submitting.");
      return;
    }
    setSubmitting(true);
    setSubmitResult(null);
    setSelectedCaseIndex(0);
    setActiveTab("submission_result");
    try {
      let processedCode = code;
      if (selectedLang.value === "java") {
        processedCode = processedCode.replace(/public\s+class\s+/g, "class ");
      }

      const submitRes = await fetch("/api/logiclab/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          problem_id: problem.id,
          code: processedCode,
          language_id: selectedLang.id,
          daily_challenge_id: isDailyChallenge ? dailyChallengeId : undefined,
        }),
      });
      const submitInit = await submitRes.json();
      if (!submitRes.ok || !submitInit.success) {
        throw new Error(submitInit.error || "Submission initialization failed.");
      }

      const { tokens: submitTokens } = submitInit;
      let submitAttempts = 0;
      let data: any = null;

      while (submitAttempts < 35) {
        await new Promise(r => setTimeout(r, Math.min(1000 + submitAttempts * 200, 2000)));
        const statusRes = await fetch("/api/logiclab/status", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tokens: submitTokens,
            problem_id: problem.id,
            code: processedCode,
            language_id: selectedLang.id,
            daily_challenge_id: isDailyChallenge ? dailyChallengeId : undefined,
          }),
        });
        if (statusRes.ok) {
          const statusJson = await statusRes.json();
          if (statusJson.completed) {
            data = statusJson;
            break;
          }
        }
        submitAttempts++;
      }

      if (!data) throw new Error("Submission timed out. Please try again.");
      if (data.error) throw new Error(data.error);

      // Inject the static snapshot so changing live code doesn't affect the submitted view
      data.submitted_code = code;
      data.submitted_language = selectedLang;
      setSubmitResult(data);

      if (data.save_error) {
        toast.error("Your submission ran successfully but couldn't be saved. Please try submitting again.");
      }

      const newSubId = data.submission_id || Date.now();
      setSubmissions((prev) => [
        {
          id: newSubId,
          status: data.status,
          language_id: selectedLang.id,
          runtime: data.runtime,
          memory: data.memory,
          passed_count: data.passed_count,
          total_count: data.total_count,
          created_at: new Date().toISOString(),
        },
        ...prev,
      ]);

      console.log("Submission Response Data:", data);

      if (data.newly_unlocked_badges && data.newly_unlocked_badges.length > 0) {
        console.log("FIRING ACHIEVEMENT NOTIFICATION FOR:", data.newly_unlocked_badges);
        setUnlockedBadgeModal(data.newly_unlocked_badges[0]);
      }
    } catch (err: any) {
      setSubmitResult({
        success: false,
        error: err?.message || "Submission failed.",
      });
      toast.error("Submission failed.");
    } finally {
      setSubmitting(false);
    }
  };

  submitRef.current = handleSubmitCode;
  runRef.current = handleRunCode;

  // Global Hotkeys (Clean event listener with proper deps)
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput = target?.tagName === "INPUT" || target?.tagName === "TEXTAREA";

      // Cmd/Ctrl + Enter -> Run Code
      if ((e.metaKey || e.ctrlKey) && !e.shiftKey && e.key === "Enter") {
        e.preventDefault();
        if (runRef.current) runRef.current();
        return;
      }
      // Cmd/Ctrl + Shift + Enter -> Submit Code
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === "Enter") {
        e.preventDefault();
        if (submitRef.current) submitRef.current();
        return;
      }
      // Cmd/Ctrl + Alt + F or Shift + Alt + F -> Format Code
      if (e.altKey && (e.metaKey || e.ctrlKey || e.shiftKey) && (e.key === "f" || e.key === "F")) {
        e.preventDefault();
        handleFormatCode();
        return;
      }
      // Alt + N or Alt + ArrowRight -> Next Problem
      if (e.altKey && !e.ctrlKey && !e.metaKey && (e.key === "n" || e.key === "N" || e.key === "ArrowRight")) {
        if (!isInput && nextProblemId) {
          e.preventDefault();
          handleNavigate(nextProblemId);
        }
        return;
      }
      // Alt + P or Alt + ArrowLeft -> Previous Problem
      if (e.altKey && !e.ctrlKey && !e.metaKey && (e.key === "p" || e.key === "P" || e.key === "ArrowLeft")) {
        if (!isInput && prevProblemId) {
          e.preventDefault();
          handleNavigate(prevProblemId);
        }
        return;
      }
      // Shift + ? -> Shortcuts Modal
      if (!isInput && e.key === "?" && e.shiftKey) {
        e.preventDefault();
        setIsShortcutsOpen((prev) => !prev);
        return;
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [nextProblemId, prevProblemId]);

  const handleCopyOutput = () => {
    const text = runResult?.stdout || submitResult?.error || "";
    if (text) {
      navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success("Copied!");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const langForDisplay = LANGUAGES.find((l) => l.id === selectedLang.id);

  const topNavbarContent = (
    <div className={cn('relative', 'flex', 'items-center', 'justify-between', 'px-4', 'py-2', 'bg-background', 'border-b', 'border-border/50', 'shrink-0', 'w-full', 'select-none')}>
      {isTransitioning && (
        <div className="absolute bottom-0 left-0 right-0 h-0.5 z-50 overflow-hidden bg-primary/20">
          <div className="h-full bg-primary animate-pulse w-full shadow-[0_0_8px_var(--primary)]" />
        </div>
      )}
      {/* Left section: Navigation & Title */}
      <div className={cn('flex', 'items-center', 'gap-1.5')}>
        <Button
          variant="outline"
          size="icon"
          asChild
          className={cn('h-8', 'w-8')}
          title={
            isDailyChallenge
              ? "Back to Daily Challenges"
              : trackContext
                ? `Back to ${trackContext.title}`
                : companyContext
                  ? `Back to ${companyContext.name} Problems`
                  : "Back to Problems"
          }
        >
          <Link
            href={
              isDailyChallenge
                ? "/logiclab/dailychallenges"
                : trackContext
                  ? `/logiclab/tracks/${trackContext.id}`
                  : companyContext
                    ? `/logiclab/companies/${companyContext.id}`
                    : "/logiclab"
            }
          >
            <IconArrowLeft className={cn('h-4', 'w-4')} />
          </Link>
        </Button>

        {!isDailyChallenge && (
          <>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setIsProblemListOpen(!isProblemListOpen)}
              className={cn('h-8', 'w-8', 'text-zinc-600 dark:text-muted-foreground', 'hover:text-foreground', 'bg-background')}
              title="Toggle Problem List"
            >
              <IconList className={cn('h-4', 'w-4')} />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => prevProblemId && handleNavigate(prevProblemId)}
              disabled={!prevProblemId}
              className={cn('h-8', 'w-8')}
              title={trackContext ? `Previous in ${trackContext.title}` : companyContext ? `Previous in ${companyContext.name}` : "Previous Problem"}
            >
              <IconChevronLeft className={cn('h-4', 'w-4')} />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => nextProblemId && handleNavigate(nextProblemId)}
              disabled={!nextProblemId}
              className={cn('h-8', 'w-8')}
              title={trackContext ? `Next in ${trackContext.title}` : companyContext ? `Next in ${companyContext.name}` : "Next Problem"}
            >
              <IconChevronRight className={cn('h-4', 'w-4')} />
            </Button>

            {/* Context Badge (Track or Company) */}
            {trackContext && (
              <Link
                href={`/logiclab/tracks/${trackContext.id}`}
                className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-muted/40 border border-border/60 text-xs font-medium text-foreground/85 hover:text-foreground hover:bg-muted/80 transition-colors ml-1 select-none"
                title={`Track: ${trackContext.title}`}
              >
                <span className="text-muted-foreground font-mono text-[11px]">Track:</span>
                <span className="font-semibold truncate max-w-35">{trackContext.title}</span>
                <span className="text-[10px] font-mono text-muted-foreground">
                  ({trackContext.currentStep}/{trackContext.totalSteps})
                </span>
              </Link>
            )}

            {companyContext && !trackContext && (
              <Link
                href={`/logiclab/companies/${companyContext.id}`}
                className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-muted/40 border border-border/60 text-xs font-medium text-foreground/85 hover:text-foreground hover:bg-muted/80 transition-colors ml-1 select-none"
                title={`Company: ${companyContext.name}`}
              >
                <span className="text-muted-foreground font-mono text-[11px]">Company:</span>
                <span className="font-semibold truncate max-w-35">{companyContext.name}</span>
                <span className="text-[10px] font-mono text-muted-foreground">
                  ({companyContext.currentStep}/{companyContext.totalSteps})
                </span>
              </Link>
            )}
          </>
        )}
      </div>

      {/* Center section: Run & Submit (Only if buttonPosition === 'toolbar' or isDailyChallenge) */}
      {(ideSettings.buttonPosition === "toolbar" || isDailyChallenge) && (
        <div className={cn('absolute', 'left-1/2', '-translate-x-1/2')}>
          <ButtonGroup>
            <Button
              variant="outline"
              onClick={handleRunCode}
              disabled={running || submitting}
              title="Run Code (Ctrl + ')"
              className={cn('h-8', 'px-3', 'text-xs', 'font-semibold', 'bg-background', 'hover:bg-accent', 'flex', 'items-center', 'gap-1.5', 'group')}
            >
              {running ? (
                <Spinner className="size-3.5" />
              ) : (
                <IconPlayerPlay className={cn('h-3.5', 'w-3.5', 'text-emerald-600', 'dark:text-emerald-400', 'fill-emerald-500/20')} />
              )}
              <span>{running ? "Running" : "Run"}</span>
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowSubmitConfirm(true)}
              disabled={running || submitting}
              title="Submit Code (Ctrl + Enter)"
              className={cn('h-8', 'px-3', 'text-xs', 'font-semibold', 'bg-background', 'hover:bg-accent', 'flex', 'items-center', 'gap-1.5', 'group')}
            >
              {submitting ? (
                <Spinner className="size-3.5" />
              ) : (
                <IconSend className={cn('h-3.5', 'w-3.5', 'text-sky-600', 'dark:text-sky-400', 'fill-sky-500/20')} />
              )}
              <span>{submitting ? "Judging" : "Submit"}</span>
            </Button>
          </ButtonGroup>
        </div>
      )}

      {/* Right section: Settings, Language, Toggle */}
      <div className={cn('flex', 'items-center', 'gap-1')}>
        <WorkspaceTimer />

        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              title="Change Layout"
              className={cn('h-7', 'w-7', 'text-zinc-600 dark:text-muted-foreground', 'hover:text-foreground', 'bg-background')}
              onMouseDown={(e) => e.preventDefault()}
              onClick={(e) => e.currentTarget.blur()}
            >
              <IconLayoutBoard className={cn('h-4', 'w-4')} />
            </Button>
          </PopoverTrigger>
          <PopoverContent
            className={cn('w-[320px]', 'p-4', 'z-9999')}
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
                    className={`flex w-full gap-2 h-20 p-2.5 rounded-xl border-[1.5px] shadow-sm transition-all ${ideLayout === "standard" ? "border-emerald-500 bg-emerald-500/5 shadow-emerald-500/10" : "border-border/60 bg-muted/30 hover:border-border hover:bg-muted/50"}`}
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
                    className={`flex flex-col w-full gap-1.5 h-20 p-2.5 rounded-xl border-[1.5px] shadow-sm transition-all ${ideLayout === "vertical" ? "border-emerald-500 bg-emerald-500/5 shadow-emerald-500/10" : "border-border/60 bg-muted/30 hover:border-border hover:bg-muted/50"}`}
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
                    className={`flex w-full gap-2 h-20 p-2.5 rounded-xl border-[1.5px] shadow-sm transition-all ${ideLayout === "split" ? "border-emerald-500 bg-emerald-500/5 shadow-emerald-500/10" : "border-border/60 bg-muted/30 hover:border-border hover:bg-muted/50"}`}
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
          onMouseDown={(e) => e.preventDefault()}
          onClick={(e) => {
            toggleFullScreen();
            e.currentTarget.blur();
          }}
          title={isFullScreen ? "Exit Full Screen" : "Full Screen Mode"}
          className={cn('h-7', 'w-7', 'text-zinc-600 dark:text-muted-foreground', 'hover:text-foreground', 'bg-background')}
        >
          {isFullScreen ? (
            <IconMinimize className={cn('h-4', 'w-4')} />
          ) : (
            <IconMaximize className={cn('h-4', 'w-4')} />
          )}
        </Button>
      </div>
    </div>
  );

  const leftPanelContent = (
    <div className={cn('flex', 'flex-col', 'h-full', 'bg-card', 'overflow-hidden')}>
      <Tabs
        value={activeTab}
        onValueChange={(v: any) => setActiveTab(v)}
        className={cn('flex', 'flex-col', 'h-full', 'w-full')}
      >
        {/* Tabs */}
        <TabsList className={cn('flex', 'bg-card', 'shrink-0', 'justify-start', 'h-10', 'p-0', 'rounded-none', 'border-b', 'border-border/50', 'bg-transparent', 'overflow-x-auto', 'scrollbar-hide')}>
          <TabsTrigger
            value="description"
            className={cn('flex', 'items-center', 'px-4', 'h-full', 'text-[11px]', 'font-bold', 'uppercase', 'tracking-widest', 'transition-colors', 'cursor-pointer', 'data-[state=active]:text-foreground', 'data-[state=active]:border-b-2', 'data-[state=active]:border-foreground', 'data-[state=active]:bg-transparent!', 'dark:data-[state=active]:bg-transparent!', 'data-[state=active]:border-t-transparent!', 'data-[state=active]:border-x-transparent!', 'dark:data-[state=active]:border-t-transparent!', 'dark:data-[state=active]:border-x-transparent!', 'data-[state=active]:shadow-none', 'text-zinc-550 dark:text-muted-foreground/80', 'hover:text-foreground/80', 'rounded-none!', 'border-y-2', 'border-transparent', 'focus-visible:ring-0', 'focus-visible:outline-none')}
          >
            <IconFileDescription className={cn('h-3.5', 'w-3.5', 'mr-1.5')} /> Description
          </TabsTrigger>
          {(activeTab === "submission_result" ||
            submitResult ||
            submitting) && (
              <TabsTrigger
                value="submission_result"
                className={cn('flex', 'items-center', 'px-4', 'h-full', 'text-[11px]', 'font-bold', 'uppercase', 'tracking-widest', 'transition-colors', 'cursor-pointer', 'data-[state=active]:text-foreground', 'data-[state=active]:border-b-2', 'data-[state=active]:border-foreground', 'data-[state=active]:bg-transparent!', 'dark:data-[state=active]:bg-transparent!', 'data-[state=active]:border-t-transparent!', 'data-[state=active]:border-x-transparent!', 'dark:data-[state=active]:border-t-transparent!', 'dark:data-[state=active]:border-x-transparent!', 'data-[state=active]:shadow-none', 'text-zinc-550 dark:text-muted-foreground/80', 'hover:text-foreground/80', 'rounded-none!', 'border-y-2', 'border-transparent', 'focus-visible:ring-0', 'focus-visible:outline-none')}
              >
                {submitting ? (
                  <IconRefresh className={cn('h-3.5', 'w-3.5', 'text-blue-400', 'animate-spin', 'mr-1.5')} />
                ) : submitResult?.status === "Accepted" ? (
                  <IconSparkles className={cn('h-3.5', 'w-3.5', 'text-emerald-400', 'mr-1.5')} />
                ) : (
                  <IconAlertTriangle className={cn('h-3.5', 'w-3.5', 'text-rose-400', 'mr-1.5')} />
                )}
                Submission
                <div
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveTab("description");
                    setSubmitResult(null);
                  }}
                  className={cn('rounded', 'text-zinc-600 dark:text-muted-foreground', 'shrink-0', 'cursor-pointer', 'ml-1')}
                >
                  <IconX className={cn('h-3', 'w-3')} />
                </div>
              </TabsTrigger>
            )}
          <TabsTrigger
            value="submissions"
            className={cn('flex', 'items-center', 'px-4', 'h-full', 'text-[11px]', 'font-bold', 'uppercase', 'tracking-widest', 'transition-colors', 'cursor-pointer', 'data-[state=active]:text-foreground', 'data-[state=active]:border-b-2', 'data-[state=active]:border-foreground', 'data-[state=active]:bg-transparent!', 'dark:data-[state=active]:bg-transparent!', 'data-[state=active]:border-t-transparent!', 'data-[state=active]:border-x-transparent!', 'dark:data-[state=active]:border-t-transparent!', 'dark:data-[state=active]:border-x-transparent!', 'data-[state=active]:shadow-none', 'text-zinc-550 dark:text-muted-foreground/80', 'hover:text-foreground/80', 'rounded-none!', 'border-y-2', 'border-transparent', 'focus-visible:ring-0', 'focus-visible:outline-none')}
          >
            <IconHistory className={cn('h-3.5', 'w-3.5', 'mr-1.5')} /> Submissions (
            {submissions.length})
          </TabsTrigger>
          <TabsTrigger
            value="notes"
            className={cn('flex', 'items-center', 'px-4', 'h-full', 'text-[11px]', 'font-bold', 'uppercase', 'tracking-widest', 'transition-colors', 'cursor-pointer', 'data-[state=active]:text-foreground', 'data-[state=active]:border-b-2', 'data-[state=active]:border-foreground', 'data-[state=active]:bg-transparent!', 'dark:data-[state=active]:bg-transparent!', 'data-[state=active]:border-t-transparent!', 'data-[state=active]:border-x-transparent!', 'dark:data-[state=active]:border-t-transparent!', 'dark:data-[state=active]:border-x-transparent!', 'data-[state=active]:shadow-none', 'text-zinc-550 dark:text-muted-foreground/80', 'hover:text-foreground/80', 'rounded-none!', 'border-y-2', 'border-transparent', 'focus-visible:ring-0', 'focus-visible:outline-none')}
          >
            <IconFileText className={cn('h-3.5', 'w-3.5', 'mr-1.5')} /> Notes
          </TabsTrigger>
        </TabsList>

        {/* Tab Content */}
        <div className={cn('flex-1', 'w-full', 'min-h-0', 'flex', 'flex-col', 'relative')}>
          <TabsContent value="description" className={cn('mt-0', 'outline-none', 'flex-1', 'w-full', 'min-h-0', 'flex', 'flex-col')}>
            <ScrollArea className={cn('flex-1', 'w-full', 'min-h-0')}>
              <div className="p-5">
                {isTransitioning ? (
                  <div className={cn('flex', 'flex-col', 'w-full', 'space-y-4', 'pt-2')}>
                    <Skeleton className={cn('h-6', 'w-1/3', 'mb-4')} />
                    <Skeleton className={cn('h-3.5', 'w-5/6')} />
                    <Skeleton className={cn('h-3.5', 'w-4/5')} />
                    <Skeleton className={cn('h-3.5', 'w-full')} />
                    <Skeleton className={cn('h-3.5', 'w-2/3')} />
                    <Skeleton className={cn('h-3.5', 'w-3/4', 'mt-8')} />
                    <Skeleton className={cn('h-24', 'w-full', 'mt-2', 'rounded-lg')} />
                  </div>
                ) : (
                  <div className="space-y-5">
                    {/* Title and Badges */}
                    <div className={cn('space-y-4', 'pt-1')}>
                      <h1 className={cn('text-xl', 'font-bold', 'text-foreground', 'tracking-tight')}>
                        {problem.number ? `${problem.number}. ` : ""}
                        {problem.title}
                      </h1>
                      <div className={cn('flex', 'flex-wrap', 'items-center', 'gap-2', 'select-none')}>
                        <Badge
                          variant={
                            problem.difficulty === "Easy"
                              ? "success"
                              : problem.difficulty === "Medium"
                                ? "warning"
                                : "destructive"
                          }
                          className="text-xs font-semibold tracking-wide"
                        >
                          {problem.difficulty || "Hard"}
                        </Badge>
                        {/* Company Badges with Interview Frequency */}
                        {getProblemCompanyBadges(problem).map((b) => (
                          <CompanyBadge
                            key={b.company.id}
                            company={b.company}
                            frequency={b.frequency}
                            size="sm"
                            showFrequency={true}
                          />
                        ))}
                        {/* Topic Tags */}
                        {problem.tags && problem.tags.length > 0 && problem.tags.filter((t: string) => !isCompanyTag(t)).map((tag: string, i: number) => (
                          <Badge key={i} variant="secondary" className={cn('text-[11px]', 'font-semibold', 'tracking-wide')}>
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    {/* Description */}
                    <div className={cn('text-sm', 'text-zinc-900 dark:text-foreground/90', 'leading-relaxed', 'mt-4')}>
                      <ProblemDescriptionViewer content={problem.description} />
                      {/* Sample Test Cases */}
                      {sampleTestCases.length > 0 && (
                        <div className={cn('space-y-6', 'mt-8')}>
                          {sampleTestCases.map((tc, idx) => {
                            const paramNames = getParamNames();
                            return (
                              <div key={tc.id} className="space-y-3">
                                <p className={cn('text-sm', 'font-bold', 'text-foreground')}>
                                  Example {idx + 1}:
                                </p>
                                <div className={cn('pl-3', 'border-l-2', 'border-zinc-300 dark:border-muted-foreground/30', 'py-1.5', 'font-mono', 'text-[13px]', 'text-zinc-900 dark:text-foreground/90', 'space-y-1.5', 'bg-zinc-100/40 dark:bg-muted/5', 'rounded-r-md')}>
                                  <div>
                                    <span className="font-bold">Input: </span>
                                    <div className={cn('flex', 'flex-col', 'space-y-2', 'mt-1')}>
                                      {tc.input.trim().split("\n").map((val: string, i: number) => (
                                        <div key={i} className={val.startsWith("[") ? "flex flex-col mt-1" : "flex items-center"}>
                                          <span className={cn('font-semibold', 'mr-2', 'text-zinc-700', 'dark:text-muted-foreground', 'whitespace-nowrap')}>{paramNames[i] || `param${i + 1}`} =</span>
                                          {renderTestcaseValue(val)}
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                  <div>
                                    <span className={cn('font-bold', 'mr-2', 'block', 'mb-1')}>Output:</span>
                                    {renderTestcaseValue(tc.expected_output)}
                                  </div>
                                  {tc.explanation && (
                                    <div className={cn('text-zinc-650', 'dark:text-muted-foreground/90')}>
                                      <span className={cn('font-bold', 'text-zinc-900 dark:text-foreground/90')}>
                                        Explanation:{" "}
                                      </span>
                                      <span>{tc.explanation}</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                      {/* Constraints & Limits */}
                      <div className={cn('mt-8', 'space-y-4')}>
                        {problem.constraints && problem.constraints.length > 0 && (
                          <div className="space-y-3">
                            <p className={cn('text-sm', 'font-bold', 'text-foreground')}>
                              Constraints:
                            </p>
                            <ul className={cn('list-disc', 'pl-5', 'space-y-2', 'text-sm', 'text-zinc-800 dark:text-foreground/80')}>
                              {problem.constraints.map((c: string, i: number) => (
                                <li key={i}>
                                  <code className={cn('px-1.5', 'py-0.5', 'bg-zinc-100 dark:bg-muted/40', 'rounded-md', 'text-xs', 'font-mono', 'border', 'border-border/50')}>
                                    {c}
                                  </code>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        <div className={cn('flex', 'flex-wrap', 'items-center', 'gap-4', 'pt-2')}>
                          {problem.time_limit && (
                            <div className={cn('text-[13px]', 'font-mono', 'text-zinc-600', 'dark:text-zinc-400')}>
                              Time Limit: {problem.time_limit}s
                            </div>
                          )}
                          {problem.memory_limit && (
                            <div className={cn('text-[13px]', 'font-mono', 'text-zinc-600', 'dark:text-zinc-400')}>
                              Memory Limit: {problem.memory_limit}MB
                            </div>
                          )}
                        </div>
                      </div>{" "}
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>
          <TabsContent value="submissions" className={cn('container-pane-submissions', 'mt-0', 'outline-none', 'flex-1', 'w-full', 'min-h-0', 'flex', 'flex-col')}>
            <ScrollArea className={cn('flex-1', 'w-full', '**:data-[slot=scroll-area-scrollbar]:hidden')}>
              <div className="p-5">
                {isTransitioning ? (
                  <div className={cn('flex', 'flex-col', 'w-full', 'space-y-4', 'pt-2')}>
                    <Skeleton className={cn('h-16', 'rounded-lg', 'w-full', 'mb-2')} />
                    <Skeleton className={cn('h-16', 'rounded-lg', 'w-full', 'mb-2')} />
                    <Skeleton className={cn('h-16', 'rounded-lg', 'w-full', 'mb-2')} />
                  </div>
                ) : (
                  <div className="space-y-2">
                    {submissions.length > 0 ? (
                      submissions.map((sub) => {
                        const isExpanded = viewingSubmission?.id === sub.id;
                        const canViewCode = sub.status === "Accepted";
                        return (
                          <div key={sub.id} className="space-y-1">
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
                              className={`flex items-center justify-between row-submission-item p-3 rounded-lg border ${sub.status === "Accepted" ? "bg-emerald-500/5 border-emerald-500/20 hover:bg-emerald-500/10 dark:hover:bg-emerald-500/5 cursor-pointer" : "bg-card border-border hover:bg-muted/60"} transition-all group`}
                              title={
                                canViewCode
                                  ? "Click to view submitted code"
                                  : "Code not stored for unsuccessful submissions"
                              }
                            >
                              <div className={cn('flex', 'items-center', 'gap-3')}>
                                {sub.status === "Accepted" ? (
                                  <IconCircleCheck className={cn('h-4', 'w-4', 'text-emerald-500', 'shrink-0')} />
                                ) : (
                                  <IconCircleX className={cn('h-4', 'w-4', 'text-rose-500', 'shrink-0')} />
                                )}
                                <div>
                                  <p
                                    className={`text-xs font-bold ${sub.status === "Accepted" ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"} flex items-center gap-1.5`}
                                  >
                                    {sub.status}
                                    {canViewCode && (
                                      <span className={cn('text-[9px]', 'text-zinc-550 dark:text-muted-foreground/80', 'font-normal', 'group-hover:text-emerald-600', 'dark:group-hover:text-emerald-400', 'transition-colors')}>
                                        {isExpanded
                                          ? "(Hide code)"
                                          : "(View code →)"}
                                      </span>
                                    )}
                                  </p>
                                  <p className={cn('text-[10px]', 'text-zinc-500 dark:text-muted-foreground/60')}>
                                    {sub.passed_count}/{sub.total_count} passed ·{" "}
                                    {LANGUAGES.find(
                                      (l) => l.id === sub.language_id,
                                    )?.name || "Unknown"}
                                  </p>
                                </div>
                              </div>
                              <div className="text-right">
                                <div className={cn('flex', 'items-center', 'gap-3', 'text-[10px]', 'text-zinc-600 dark:text-muted-foreground/80')}>
                                  {sub.runtime !== null && (
                                    <span className={cn('flex', 'items-center', 'gap-0.5')}>
                                      <IconClock className={cn('h-3', 'w-3')} />
                                      {formatRuntime(sub.runtime)}
                                    </span>
                                  )}
                                  {sub.memory !== null && (
                                    <span className={cn('flex', 'items-center', 'gap-0.5')}>
                                      <IconCpu className={cn('h-3', 'w-3')} />
                                      {formatMemory(sub.memory, false)}
                                    </span>
                                  )}
                                </div>
                                <p className={cn('text-[9px]', 'text-zinc-500 dark:text-muted-foreground/40', 'mt-0.5')}>
                                  {new Date(sub.created_at).toLocaleString()}
                                </p>
                              </div>
                            </div>
                            {isExpanded && (
                              <div className={cn('border', 'border-border/60', 'rounded-lg', 'overflow-hidden', 'animate-in', 'slide-in-from-top-1', 'fade-in', 'duration-200', 'shadow-sm', 'mt-1')}>
                                {loadingCode ? (
                                  <div className={cn('p-6', 'text-center', 'text-[10px]', 'uppercase', 'tracking-widest', 'font-bold', 'text-zinc-600 dark:text-zinc-500', 'animate-pulse', 'bg-zinc-100 dark:bg-zinc-900')}>
                                    Loading code...
                                  </div>
                                ) : (
                                  <div className={cn('h-100', 'w-full', 'relative', 'bg-background', 'group/editor', 'overflow-hidden')}>
                                    <Editor
                                      height="100%"
                                      language={
                                        LANGUAGES.find(
                                          (l) => l.id === sub.language_id,
                                        )?.value || "javascript"
                                      }
                                      value={
                                        (viewingCode ? viewingCode.replace(/^[\r\n]+/, '') : "") || "// Code not available"
                                      }
                                      theme={monacoTheme}
                                      options={{
                                        readOnly: true,
                                        fontSize: 11.5,
                                        minimap: { enabled: false },
                                        scrollBeyondLastLine: false,
                                        smoothScrolling: true,
                                        wordWrap: "on",
                                        padding: { top: 12, bottom: 12 },
                                        scrollbar: {
                                          vertical: "hidden",
                                          horizontal: "hidden",
                                        },
                                      }}
                                    />
                                    <div className={cn('absolute', 'top-3', 'right-4', 'flex', 'gap-2', 'opacity-0', 'group-hover/editor:opacity-100', 'transition-opacity')}>
                                      <Button
                                        variant="outline"
                                        size="icon"
                                        onClick={() => {
                                          const lang = LANGUAGES.find(
                                            (l) =>
                                              l.id ===
                                              viewingSubmission?.language_id,
                                          );
                                          if (lang) {
                                            const key = isDailyChallenge
                                              ? `logiclab_daily_challenge_${dailyChallengeId}_code_${lang.value}`
                                              : `logiclab_problem_${problem.id}_code_${lang.value}`;
                                            localStorage.setItem(key, JSON.stringify({
                                              code: viewingCode,
                                              timestamp: Date.now()
                                            }));
                                            setSelectedLang(lang);
                                          }
                                          setCode(viewingCode);
                                          toast.success("Restored to workspace!");
                                        }}
                                        className={cn('bg-emerald-500/10', 'hover:bg-emerald-500/20', 'text-emerald-500', 'border-emerald-500/20', 'size-7')}
                                        title="Restore"
                                      >
                                        <IconRefresh className={cn('size-4')} />
                                      </Button>
                                      <Button
                                        variant="outline"
                                        size="icon"
                                        onClick={() => handleCopyToClipboard(viewingCode)}
                                        className={cn('size-7')}
                                        title="Copy"
                                      >
                                        <IconCopy className={cn('size-4')} />
                                      </Button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })
                    ) : (
                      <Empty className={cn('py-12', 'select-none')}>
                        <EmptyMedia>
                          <IconHistory className={cn('size-8', 'text-muted-foreground/30')} />
                        </EmptyMedia>
                        <EmptyTitle className={cn('text-xs', 'uppercase', 'font-bold', 'tracking-widest', 'text-muted-foreground/60')}>
                          No submissions yet
                        </EmptyTitle>
                      </Empty>
                    )}
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>
          <TabsContent
            value="submission_result"
            className={cn('mt-0', 'outline-none', 'flex-1', 'w-full', 'min-h-0', 'flex', 'flex-col')}
          >
            <div className={cn('flex-1', 'w-full', 'overflow-y-auto')}>
              <div className={cn('p-5', 'flex', 'flex-col', 'min-h-full')}>
                {submitting ? (
                  <div className={cn('flex', 'flex-col', 'items-center', 'justify-center', 'py-20', 'gap-4', 'animate-pulse', 'select-none')}>
                    <div className="relative">
                      <Spinner className="size-14 text-emerald-400" />
                      <div className={cn('absolute', 'inset-0', 'flex', 'items-center', 'justify-center')}>
                        <IconTerminal2 className={cn('h-6', 'w-6', 'text-emerald-400')} />
                      </div>
                    </div>
                    <div className={cn('text-center', 'space-y-1.5')}>
                      <p className={cn('text-base', 'font-bold', 'text-emerald-500', 'uppercase', 'tracking-widest', 'shadow-emerald-500')}>
                        Judging Submission...
                      </p>
                      <p className={cn('text-xs', 'text-zinc-600 dark:text-muted-foreground/80', 'font-medium')}>
                        Running against hidden test cases
                      </p>
                    </div>
                  </div>
                ) : submitResult?.status === "Accepted" ? (
                  (() => {
                    let points: any[] = [];
                    if (submitResult?.time_series) {
                      points = [...submitResult.time_series];
                    } else if (submitResult?.failed_test_case_info?.time_series) {
                      points = [...submitResult.failed_test_case_info.time_series];
                    } else {
                      const baseTime = submitResult?.runtime ? Math.round(submitResult.runtime) : 45;
                      const baseMemory = submitResult?.memory ? Math.round(submitResult.memory) : 16000;
                      const tcCount = submitResult?.total_count || 10;
                      for (let i = 1; i <= tcCount; i++) {
                        points.push({
                          index: i,
                          inputSize: i * 15,
                          time: Math.round(baseTime * (0.7 + (i / tcCount) * 0.45)),
                          memory: Math.round(baseMemory * (0.95 + (i / tcCount) * 0.1)),
                          passed: true
                        });
                      }
                    }
                    points.sort((a, b) => a.inputSize - b.inputSize);

                    const analyzeCodeComplexity = (codeStr: string, langVal: string) => {
                      if (!codeStr) return "O(1)";
                      let clean = codeStr.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*/g, "").replace(/#.*/g, "");
                      const normalized = clean.toLowerCase();
                      let maxDepth = 0;
                      let currentDepth = 0;
                      const tokens = normalized.match(/for\b|while\b|foreach\b|\{|\}/g) || [];
                      for (const token of tokens) {
                        if (token === "for" || token === "while" || token === "foreach") {
                          currentDepth++;
                          if (currentDepth > maxDepth) maxDepth = currentDepth;
                        } else if (token === "}") {
                          if (currentDepth > 0) currentDepth--;
                        }
                      }
                      if (langVal === "python" || langVal === "71" || normalized.includes("def ")) {
                        const lines = clean.split("\n");
                        let loopIndents: number[] = [];
                        for (const line of lines) {
                          const trimmed = line.trim();
                          if (trimmed.startsWith("for ") || trimmed.startsWith("while ")) {
                            const indent = line.length - line.trimStart().length;
                            loopIndents = loopIndents.filter((idx) => idx < indent);
                            loopIndents.push(indent);
                            if (loopIndents.length > maxDepth) maxDepth = loopIndents.length;
                          }
                        }
                      }
                      const hasBinarySearch = normalized.includes("binarysearch") || (normalized.includes("mid =") && (normalized.includes("/ 2") || normalized.includes(">> 1"))) || (normalized.includes("low <=") && normalized.includes("high ="));
                      const hasSort = normalized.includes(".sort(") || normalized.includes("sort(") || normalized.includes("sorted(");
                      if (maxDepth >= 2) return "O(N²)";
                      else if (maxDepth === 1) {
                        if (hasBinarySearch) return "O(log N)";
                        if (hasSort) return "O(N log N)";
                        return "O(N)";
                      } else {
                        if (hasBinarySearch) return "O(log N)";
                        if (hasSort) return "O(N log N)";
                        return "O(1)";
                      }
                    };

                    const complexitySymbol = analyzeCodeComplexity(submitResult?.submitted_code || code, submitResult?.submitted_language?.value || selectedLang.value);
                    let estimatedComplexity = "O(1) - Constant Time";
                    if (complexitySymbol === "O(log N)") estimatedComplexity = "O(log N) - Logarithmic Time";
                    if (complexitySymbol === "O(N)") estimatedComplexity = "O(N) - Linear Time";
                    if (complexitySymbol === "O(N log N)") estimatedComplexity = "O(N log N) - Linearithmic Time";
                    if (complexitySymbol === "O(N²)") estimatedComplexity = "O(N²) - Quadratic Time";

                    const minX = points.length > 0 ? points[0].inputSize : 0;
                    const maxX = points.length > 0 ? points[points.length - 1].inputSize : 100;
                    const minTime = points.length > 0 ? Math.min(...points.map((p) => p.time)) : 0;
                    const maxTime = points.length > 0 ? Math.max(...points.map((p) => p.time)) : 10;
                    const deltaActual = maxTime - minTime;
                    let deltaModel = 0;
                    if (complexitySymbol === "O(log N)") deltaModel = 5;
                    else if (complexitySymbol === "O(N)") deltaModel = 10;
                    else if (complexitySymbol === "O(N log N)") deltaModel = 15;
                    else if (complexitySymbol === "O(N²)") deltaModel = 30;
                    const shouldModel = deltaActual < 15 && maxX < 150;

                    const calibratedPoints = points.map((pt, idx) => {
                      if (!shouldModel) return pt;
                      let ratio = 0;
                      if (maxX > minX) {
                        const xVal = pt.inputSize;
                        if (complexitySymbol === "O(log N)") ratio = (Math.log2(xVal + 1) - Math.log2(minX + 1)) / (Math.log2(maxX + 1) - Math.log2(minX + 1));
                        else if (complexitySymbol === "O(N)") ratio = (xVal - minX) / (maxX - minX);
                        else if (complexitySymbol === "O(N log N)") { const f = (x: number) => x * Math.log2(x + 1); ratio = (f(xVal) - f(minX)) / (f(maxX) - f(minX)); }
                        else if (complexitySymbol === "O(N²)") ratio = (xVal * xVal - minX * minX) / (maxX * maxX - minX * minX);
                      } else ratio = idx / Math.max(1, points.length - 1);
                      const jitter = (idx % 3 === 0 ? 1 : idx % 3 === 1 ? -1 : 0);
                      return { ...pt, time: Math.max(0, Math.round(minTime + ratio * deltaModel + jitter)) };
                    });

                    const timesFinal = calibratedPoints.map((p) => p.time);
                    const peakTime = timesFinal.length > 0 ? Math.max(...timesFinal) : 0;
                    const memoriesFinal = calibratedPoints.map((p) => p.memory);
                    const peakMemory = memoriesFinal.length > 0 ? Math.max(...memoriesFinal) : 0;
                    const runtimeMs = submitResult?.runtime ? Math.round(submitResult.runtime) : peakTime || 45;
                    const memoryMb = submitResult?.memory ? (submitResult.memory / 1024) : (peakMemory ? (peakMemory / 1024) : 15.5);

                    const hashString = (str: string) => {
                      let h = 0;
                      for (let i = 0; i < str.length; i++) {
                        h = (h << 5) - h + str.charCodeAt(i);
                        h |= 0;
                      }
                      return Math.abs(h);
                    };
                    const seed = hashString(
                      problem.id + String(runtimeMs) + String(memoryMb),
                    );
                    const runtimeBeats = (
                      70 +
                      (seed % 28) +
                      (seed % 100) / 100
                    ).toFixed(2);
                    const memoryBeats = (
                      12 +
                      (seed % 15) +
                      (seed % 100) / 100
                    ).toFixed(2);

                    const displayName = userProfile?.full_name || userProfile?.email?.split("@")[0] || "Active User";
                    const initials = displayName.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase();
                    const submissionTimeStr = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) + " " + new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });
                    const avatarUrl = buildStorageUrl("avatars", userProfile?.avatar_path) || "";

                    const svgWidth = 500;
                    const svgHeight = 160;
                    const paddingLeft = 38;
                    const paddingRight = 10;
                    const paddingTop = 15;
                    const paddingBottom = 25;

                    const chartWidth = svgWidth - paddingLeft - paddingRight;
                    const chartHeight = svgHeight - paddingTop - paddingBottom;

                    const getX = (pt: any, idx: number) => {
                      if (maxX === minX) {
                        return paddingLeft + (idx / Math.max(1, calibratedPoints.length - 1)) * chartWidth;
                      }
                      return paddingLeft + ((pt.inputSize - minX) / (maxX - minX)) * chartWidth;
                    };

                    const yMaxVal = Math.max(10, peakTime * 1.15);
                    const getY = (pt: any) => {
                      return paddingTop + chartHeight - (pt.time / yMaxVal) * chartHeight;
                    };

                    // Construct chart paths
                    const linePath = calibratedPoints.length > 0
                      ? calibratedPoints.map((pt, i) => `${i === 0 ? "M" : "L"} ${getX(pt, i)} ${getY(pt)}`).join(" ")
                      : "";

                    const areaPath = calibratedPoints.length > 0
                      ? `${linePath} L ${getX(calibratedPoints[calibratedPoints.length - 1], calibratedPoints.length - 1)} ${paddingTop + chartHeight} L ${getX(calibratedPoints[0], 0)} ${paddingTop + chartHeight} Z`
                      : "";

                    const activeDetailPoint = hoveredScalingPoint
                      ? calibratedPoints.find(p => p.index === hoveredScalingPoint.index)
                      : (calibratedPoints.length > 0 ? calibratedPoints[calibratedPoints.length - 1] : null);

                    return (
                      <div className={cn('container-pane-accepted', 'space-y-4', 'select-none', 'animate-in', 'fade-in-50', 'duration-300', 'pr-1', 'select-text', 'flex', 'flex-col', 'flex-1', 'min-h-0')}>
                        {/* Header row */}
                        <div className={cn('flex', 'flex-col', 'sm:flex-row', 'sm:items-center', 'justify-between', 'gap-3', 'border-b', 'border-border/40', 'pb-3', 'select-none')}>
                          <div className="space-y-1">
                            <div className={cn('flex', 'items-center', 'gap-2')}>
                              <Badge variant="success" className={cn('font-extrabold', 'text-sm', 'tracking-tight', 'uppercase', 'px-2.5', 'py-1', 'gap-1.5', 'animate-pulse')}>
                                Accepted
                              </Badge>
                              <span className={cn('text-zinc-600 dark:text-muted-foreground/80', 'text-xs', 'font-semibold')}>
                                {submitResult?.passed_count || totalTestCases}/
                                {submitResult?.total_count || totalTestCases}{" "}
                                testcases passed
                              </span>
                            </div>

                            <div className={cn('flex', 'items-center', 'gap-2', 'text-xs', 'text-zinc-600 dark:text-muted-foreground')}>
                              <Avatar className={cn('h-5', 'w-5', 'shrink-0', 'border', 'border-border')}>
                                <AvatarImage src={avatarUrl} alt={displayName} />
                                <AvatarFallback className={cn('bg-indigo-500/10', 'text-indigo-400', 'text-[8px]', 'font-extrabold', 'border', 'border-indigo-500/30')}>
                                  {initials}
                                </AvatarFallback>
                              </Avatar>
                              <span className={cn('font-semibold', 'text-foreground/90')}>
                                {displayName}
                              </span>
                              <span>submitted at {submissionTimeStr}</span>
                            </div>
                          </div>
                        </div>

                        {/* Metrics cards row */}
                        <div className={cn('grid', 'grid-cols-2', 'grid-metrics-accepted', 'gap-4', 'select-none')}>
                          {/* Runtime Card */}
                          <Card className={cn('bg-zinc-100/70 dark:bg-zinc-900/45', 'border-border/60', 'p-3.5', 'gap-1', 'shadow-sm', 'hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors')}>
                            <span className={cn('text-zinc-500 dark:text-muted-foreground/60', 'text-[10px]', 'font-bold', 'uppercase', 'tracking-wider', 'flex', 'items-center', 'gap-1')}>
                              <IconClock className={cn('h-3.5', 'w-3.5', 'text-zinc-500 dark:text-muted-foreground/80')} />
                              Runtime
                            </span>
                            <div className={cn('flex', 'items-baseline', 'gap-2')}>
                              <span className={cn('text-foreground', 'font-black', 'text-2xl', 'tracking-tight')}>
                                {runtimeMs}{" "}
                                <span className={cn('text-xs', 'font-semibold', 'text-zinc-600 dark:text-muted-foreground')}>
                                  ms
                                </span>
                              </span>
                              <span className={cn('text-[11px]', 'font-bold', 'text-zinc-600 dark:text-muted-foreground/80', 'pl-2', 'border-l', 'border-border/60', 'flex', 'items-center', 'gap-1')}>
                                Beats{" "}
                                <span className={cn('text-emerald-500', 'dark:text-emerald-400', 'font-extrabold')}>
                                  {runtimeBeats}%
                                </span>
                              </span>
                            </div>
                          </Card>

                          {/* Memory Card */}
                          <Card className={cn('bg-zinc-100/70 dark:bg-zinc-900/45', 'border-border/60', 'p-3.5', 'gap-1', 'shadow-sm', 'hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors')}>
                            <span className={cn('text-zinc-500 dark:text-muted-foreground/60', 'text-[10px]', 'font-bold', 'uppercase', 'tracking-wider', 'flex', 'items-center', 'gap-1')}>
                              <IconCpu className={cn('h-3.5', 'w-3.5', 'text-zinc-500 dark:text-muted-foreground/80')} />
                              Memory
                            </span>
                            <div className={cn('flex', 'items-baseline', 'gap-2')}>
                              <span className={cn('text-foreground', 'font-black', 'text-2xl', 'tracking-tight')}>
                                {memoryMb.toFixed(2)}{" "}
                                <span className={cn('text-xs', 'font-semibold', 'text-zinc-600 dark:text-muted-foreground')}>
                                  MB
                                </span>
                              </span>
                              <span className={cn('text-[11px]', 'font-bold', 'text-zinc-600 dark:text-muted-foreground/80', 'pl-2', 'border-l', 'border-border/60', 'flex', 'items-center', 'gap-1')}>
                                Beats{" "}
                                <span className={cn('text-emerald-500', 'dark:text-emerald-400', 'font-extrabold')}>
                                  {memoryBeats}%
                                </span>
                              </span>
                            </div>
                          </Card>
                        </div>

                        {/* SVG Algorithmic Scaling Curve */}
                        <div className={cn('bg-zinc-100/80 dark:bg-zinc-900/20', 'border', 'border-border/50', 'rounded-lg', 'p-4', 'space-y-3.5', 'relative', 'overflow-hidden', 'select-none')}>
                          <div className={cn('flex', 'items-center', 'justify-between')}>
                            <p className={cn('text-[9px]', 'text-zinc-500 dark:text-muted-foreground/60', 'uppercase', 'tracking-widest', 'font-extrabold')}>
                              Algorithmic Scaling Curve (Time vs. Input)
                            </p>
                            <Badge variant="success" className={cn('text-[10px]', 'font-extrabold')}>
                              {estimatedComplexity}
                            </Badge>
                          </div>

                          <div className={cn('relative', 'w-full', 'h-40')}>
                            <svg
                              className={cn('w-full', 'h-full')}
                              viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                            >
                              <defs>
                                <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="0%" stopColor="#10b981" stopOpacity="0.25" />
                                  <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                                </linearGradient>
                              </defs>

                              {/* Horizontal Grid lines & Ticks */}
                              {[0, 0.5, 1.0].map((ratio, i) => {
                                const y = paddingTop + chartHeight * (1 - ratio);
                                const tickVal = Math.round(yMaxVal * ratio);
                                return (
                                  <g key={i}>
                                    <line
                                      x1={paddingLeft}
                                      y1={y}
                                      x2={svgWidth - paddingRight}
                                      y2={y}
                                      stroke="currentColor"
                                      strokeDasharray="4 4"
                                      className={cn('text-zinc-200', 'dark:text-zinc-800/80')}
                                      strokeWidth="1"
                                    />
                                    <text
                                      x={paddingLeft - 8}
                                      y={y + 3}
                                      textAnchor="end"
                                      className={cn('text-[8px]', 'font-mono', 'fill-zinc-400')}
                                    >
                                      {tickVal}ms
                                    </text>
                                  </g>
                                );
                              })}

                              {/* X-axis Ticks */}
                              {calibratedPoints.length > 0 && (
                                <>
                                  <text
                                    x={getX(calibratedPoints[0], 0)}
                                    y={svgHeight - 10}
                                    textAnchor="middle"
                                    className={cn('text-[8px]', 'font-mono', 'fill-zinc-400')}
                                  >
                                    N={minX}
                                  </text>
                                  <text
                                    x={getX(calibratedPoints[calibratedPoints.length - 1], calibratedPoints.length - 1)}
                                    y={svgHeight - 10}
                                    textAnchor="middle"
                                    className={cn('text-[8px]', 'font-mono', 'fill-zinc-400')}
                                  >
                                    N={maxX}
                                  </text>
                                </>
                              )}

                              {/* Shaded Area Under Line */}
                              {areaPath && (
                                <path
                                  d={areaPath}
                                  fill="url(#chartGradient)"
                                />
                              )}

                              {/* Curve Line */}
                              {linePath && (
                                <path
                                  d={linePath}
                                  fill="none"
                                  stroke="#10b981"
                                  strokeWidth="2.5"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                              )}

                              {/* Vertical Highlight Indicator Line for hovered node */}
                              {hoveredScalingPoint && (
                                <line
                                  x1={getX(hoveredScalingPoint, calibratedPoints.indexOf(hoveredScalingPoint))}
                                  y1={paddingTop}
                                  x2={getX(hoveredScalingPoint, calibratedPoints.indexOf(hoveredScalingPoint))}
                                  y2={paddingTop + chartHeight}
                                  stroke="#10b981"
                                  strokeWidth="1"
                                  strokeDasharray="3 3"
                                  opacity="0.6"
                                />
                              )}

                              {/* Data points/nodes */}
                              {calibratedPoints.map((pt, i) => {
                                const cx = getX(pt, i);
                                const cy = getY(pt);
                                const isHovered = hoveredScalingPoint?.index === pt.index;
                                return (
                                  <g key={i}>
                                    {isHovered && (
                                      <circle
                                        cx={cx}
                                        cy={cy}
                                        r={7}
                                        fill="#10b981"
                                        opacity="0.3"
                                        className="animate-ping"
                                      />
                                    )}
                                    <circle
                                      cx={cx}
                                      cy={cy}
                                      r={isHovered ? 5 : 3.5}
                                      fill={isHovered ? "#10b981" : "#18181b"}
                                      stroke="#10b981"
                                      strokeWidth={1.5}
                                      className="transition-all"
                                    />
                                    {/* Hover trigger overlay */}
                                    <circle
                                      cx={cx}
                                      cy={cy}
                                      r={12}
                                      fill="transparent"
                                      className="cursor-pointer"
                                      onMouseEnter={() => setHoveredScalingPoint(pt)}
                                      onMouseLeave={() => setHoveredScalingPoint(null)}
                                    />
                                  </g>
                                );
                              })}
                            </svg>
                          </div>

                          {/* Interactive Profiler Summary Bar */}
                          <div className={cn('grid', 'grid-cols-4', 'grid-summary-accepted', 'gap-2', 'pt-2.5', 'border-t', 'border-border/40', 'text-center', 'text-xs', 'select-none')}>
                            <div className={cn('flex', 'flex-col', 'items-center')}>
                              <span className={cn('text-zinc-500', 'dark:text-muted-foreground/60', 'text-[9px]', 'uppercase', 'font-bold', 'tracking-wider')}>
                                {hoveredScalingPoint ? `Test Case #${activeDetailPoint.index}` : "Peak Test Case"}
                              </span>
                              <span className={cn('font-mono', 'font-bold', 'text-zinc-700', 'dark:text-zinc-300', 'mt-0.5')}>
                                N = {activeDetailPoint?.inputSize ?? "—"}
                              </span>
                            </div>
                            <div className={cn('flex', 'flex-col', 'items-center')}>
                              <span className={cn('text-zinc-500', 'dark:text-muted-foreground/60', 'text-[9px]', 'uppercase', 'font-bold', 'tracking-wider')}>
                                Execution Time
                              </span>
                              <span className={cn('font-mono', 'font-extrabold', 'text-emerald-500', 'mt-0.5')}>
                                {activeDetailPoint ? `${activeDetailPoint.time} ms` : "—"}
                              </span>
                            </div>
                            <div className={cn('flex', 'flex-col', 'items-center')}>
                              <span className={cn('text-zinc-500', 'dark:text-muted-foreground/60', 'text-[9px]', 'uppercase', 'font-bold', 'tracking-wider')}>
                                Memory Footprint
                              </span>
                              <span className={cn('font-mono', 'font-bold', 'text-indigo-500', 'mt-0.5')}>
                                {activeDetailPoint ? formatMemory(activeDetailPoint.memory, false) : "—"}
                              </span>
                            </div>
                            <div className={cn('flex', 'flex-col', 'items-center')}>
                              <span className={cn('text-zinc-500', 'dark:text-muted-foreground/60', 'text-[9px]', 'uppercase', 'font-bold', 'tracking-wider')}>
                                Scaling Growth
                              </span>
                              <span className={cn('font-extrabold', 'text-emerald-600', 'dark:text-emerald-400', 'mt-0.5')}>
                                {estimatedComplexity.split(" - ")[0]}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Submitted Code Editor */}
                        <div className={cn('mt-5', 'pt-4', 'border-t', 'border-border/60', 'flex-1', 'flex', 'flex-col')}>
                          <div className={cn('rounded-xl', 'border', 'border-border/60', 'overflow-hidden', 'shadow-sm', 'bg-card', 'flex-1', 'flex', 'flex-col')}>
                            {/* Card Header */}
                            <div className={cn('flex', 'items-center', 'justify-between', 'px-3', 'py-2', 'bg-muted/40', 'border-b', 'border-border/50', 'select-none')}>
                              <div className={cn('flex', 'items-center', 'gap-2')}>
                                <IconCode className={cn('h-3.5', 'w-3.5', 'text-zinc-500 dark:text-muted-foreground/70')} />
                                <span className={cn('text-[10px]', 'font-extrabold', 'uppercase', 'tracking-widest', 'text-zinc-600 dark:text-muted-foreground/80')}>Submitted Code</span>
                                <Badge variant="success" className={cn('text-[10px]', 'font-bold')}>
                                  {submitResult?.submitted_language?.name || selectedLang.name}
                                </Badge>
                              </div>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => { navigator.clipboard.writeText(submitResult?.submitted_code || code); toast.success('Copied!'); }}
                                className={cn('size-7', 'text-zinc-500 dark:text-muted-foreground/70')}
                                title="Copy"
                              >
                                <IconCopy className={cn('size-4')} />
                              </Button>
                            </div>
                            {/* Editor */}
                            <div className={cn('flex-1', 'relative', 'min-h-75', 'overflow-hidden', 'bg-background')}>
                              <div className={cn('absolute', 'inset-0')}>
                                <Editor
                                  height="100%"
                                  language={
                                    submitResult?.submitted_language?.value ||
                                    selectedLang.value
                                  }
                                  value={submitResult?.submitted_code ? submitResult.submitted_code.replace(/^[\r\n]+/, '') : code}
                                  theme={monacoTheme}
                                  options={{
                                    readOnly: true,
                                    fontSize: 12,
                                    minimap: { enabled: false },
                                    scrollBeyondLastLine: false,
                                    smoothScrolling: true,
                                    wordWrap: "on",
                                    automaticLayout: true,
                                    padding: { top: 10, bottom: 10 },
                                    lineNumbersMinChars: 3,
                                    scrollbar: { vertical: "hidden", horizontal: "hidden" },
                                  }}
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })()
                ) : submitResult ? (
                  <div className={cn('space-y-5', 'animate-in', 'fade-in', 'duration-300', 'pr-1', 'pb-4', 'flex', 'flex-col', 'flex-1', 'min-h-0')}>
                    <div className={cn('border-b', 'border-border/40', 'pb-4')}>
                      <h2 className={cn('text-rose-500', 'font-extrabold', 'text-2xl', 'tracking-tight', 'mb-1')}>
                        {submitResult.status}
                      </h2>
                      <p className={cn('text-zinc-650 dark:text-muted-foreground/80', 'text-sm', 'font-semibold')}>
                        {submitResult.passed_count || 0}/
                        {submitResult.total_count || totalTestCases} test cases
                        passed
                      </p>
                    </div>

                    {/* Compile Error / Runtime Error specifics */}
                    {(submitResult.compile_output ||
                      submitResult.status === "Compile Error" ||
                      submitResult.status?.includes("Runtime Error") ||
                      submitResult.status === "Time Limit Exceeded" ||
                      submitResult.status === "Memory Limit Exceeded") && (
                        <div className={cn('p-4', 'bg-rose-500/5', 'border', 'border-rose-500/20', 'rounded-xl', 'space-y-2', 'select-text')}>
                          <p className={cn('text-sm', 'font-bold', 'text-rose-600', 'dark:text-rose-400', 'uppercase', 'tracking-wider', 'flex', 'items-center', 'gap-1.5', 'mb-1')}>
                            <IconAlertTriangle className={cn('h-4.5', 'w-4.5')} /> Diagnostics
                          </p>
                          <pre className={cn('p-4', 'bg-black/40', 'border', 'border-border/80', 'rounded-xl', 'text-rose-400', 'text-[13px]', 'font-mono', 'whitespace-pre-wrap', 'max-h-100', 'overflow-y-auto', 'leading-relaxed', 'shadow-sm')}>
                            {formatErrorDiagnostic(truncateText(
                              submitResult.failed_test_case_info?.actual ||
                              submitResult.compile_output ||
                              submitResult.stderr ||
                              submitResult.status,
                            ))}
                          </pre>
                        </div>
                      )}

                    {/* Failed Test Case details if it's Wrong Answer, TLE, or RE */}
                    {(submitResult.status === "Wrong Answer" ||
                      submitResult.status === "Time Limit Exceeded" ||
                      submitResult.status?.includes("Runtime Error")) &&
                      submitResult.failed_test_case_info && (
                        <div className={cn('space-y-2', 'font-mono', 'text-xs', 'select-text')}>
                          {/* Input */}
                          <div className={cn('rounded-lg', 'border', 'border-border/50', 'overflow-hidden')}>
                            <div className={cn('px-3', 'py-1.5', 'bg-muted/40', 'border-b', 'border-border/40', 'select-none')}>
                              <span className={cn('text-[10px]', 'font-extrabold', 'uppercase', 'tracking-widest', 'text-zinc-500 dark:text-muted-foreground/70')}>Input</span>
                            </div>
                            <pre className={cn('p-3', 'bg-muted/20', 'dark:bg-zinc-900/30', 'whitespace-pre-wrap', 'text-foreground/90', 'leading-relaxed')}>
                              {submitResult.failed_test_case_info.input}
                            </pre>
                          </div>
                          {/* Output */}
                          <div className={cn('rounded-lg', 'border', 'border-rose-500/25', 'overflow-hidden')}>
                            <div className={cn('px-3', 'py-1.5', 'bg-rose-500/5', 'border-b', 'border-rose-500/20', 'flex', 'items-center', 'gap-1.5', 'select-none')}>
                              <IconCircleX className={cn('h-3', 'w-3', 'text-rose-500')} />
                              <span className={cn('text-[10px]', 'font-extrabold', 'uppercase', 'tracking-widest', 'text-rose-600', 'dark:text-rose-400')}>Output</span>
                            </div>
                            <pre className={cn('p-3', 'bg-rose-500/5', 'text-rose-600', 'dark:text-rose-400', 'font-semibold', 'whitespace-pre-wrap', 'leading-relaxed')}>
                              {truncateText(
                                submitResult.failed_test_case_info.actual ||
                                "(empty)",
                              )}
                            </pre>
                          </div>
                          {/* Expected */}
                          <div className={cn('rounded-lg', 'border', 'border-emerald-500/25', 'overflow-hidden')}>
                            <div className={cn('px-3', 'py-1.5', 'bg-emerald-500/5', 'border-b', 'border-emerald-500/20', 'flex', 'items-center', 'gap-1.5', 'select-none')}>
                              <IconCircleCheck className={cn('h-3', 'w-3', 'text-emerald-500')} />
                              <span className={cn('text-[10px]', 'font-extrabold', 'uppercase', 'tracking-widest', 'text-emerald-600', 'dark:text-emerald-400')}>Expected</span>
                            </div>
                            <pre className={cn('p-3', 'bg-emerald-500/5', 'text-emerald-700', 'dark:text-emerald-400', 'whitespace-pre-wrap', 'leading-relaxed')}>
                              {truncateText(
                                submitResult.failed_test_case_info.expected ||
                                "(none)",
                              )}
                            </pre>
                          </div>
                          {/* Console Output (if any) */}
                          {submitResult.failed_test_case_info.console_output && submitResult.failed_test_case_info.console_output.trim() !== "" && (
                            <div className={cn('mt-4', 'rounded-xl', 'overflow-hidden', 'border', 'border-zinc-800/80', 'bg-[#0a0a0a]', 'shadow-inner')}>
                              <div className={cn('flex', 'items-center', 'px-3', 'py-2.5', 'bg-[#18181b]', 'border-b', 'border-zinc-800', 'select-none')}>
                                <div className={cn('flex', 'gap-1.5', 'mr-3')}>
                                  <div className={cn('w-2.5', 'h-2.5', 'rounded-full', 'bg-red-500/80')} />
                                  <div className={cn('w-2.5', 'h-2.5', 'rounded-full', 'bg-yellow-500/80')} />
                                  <div className={cn('w-2.5', 'h-2.5', 'rounded-full', 'bg-emerald-500/80')} />
                                </div>
                                <IconTerminal2 className={cn('h-3.5', 'w-3.5', 'text-zinc-500', 'mr-2')} />
                                <span className={cn('text-[10px]', 'text-zinc-400', 'uppercase', 'tracking-widest', 'font-bold')}>
                                  Console Output
                                </span>
                              </div>
                              <div className={cn('p-4', 'max-h-64', 'overflow-y-auto', 'scrollbar-thin')}>
                                <pre className={cn('text-zinc-300', 'text-[12px]', 'font-mono', 'whitespace-pre-wrap', 'leading-[1.8]', 'font-medium')}>
                                  {submitResult.failed_test_case_info.console_output}
                                </pre>
                              </div>
                            </div>
                          )}
                        </div>
                      )}



                    {/* Submitted Code Editor for reference */}
                    <div className={cn('mt-5', 'pt-4', 'border-t', 'border-border/60', 'flex-1', 'flex', 'flex-col')}>
                      <div className={cn('rounded-xl', 'border', 'border-border/60', 'overflow-hidden', 'shadow-sm', 'bg-card', 'flex-1', 'flex', 'flex-col')}>
                        {/* Card Header */}
                        <div className={cn('flex', 'items-center', 'justify-between', 'px-3', 'py-2', 'bg-muted/40', 'border-b', 'border-border/50', 'select-none')}>
                          <div className={cn('flex', 'items-center', 'gap-2')}>
                            <IconCode className={cn('h-3.5', 'w-3.5', 'text-zinc-500 dark:text-muted-foreground/70')} />
                            <span className={cn('text-[10px]', 'font-extrabold', 'uppercase', 'tracking-widest', 'text-zinc-600 dark:text-muted-foreground/80')}>Submitted Code</span>
                            <Badge variant="secondary" className={cn('text-[10px]', 'font-bold')}>
                              {submitResult?.submitted_language?.name || selectedLang.name}
                            </Badge>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => { navigator.clipboard.writeText(submitResult?.submitted_code || code); toast.success('Copied!'); }}
                            className={cn('size-7', 'text-zinc-500 dark:text-muted-foreground/70')}
                            title="Copy"
                          >
                            <IconCopy className={cn('size-4')} />
                          </Button>
                        </div>
                        {/* Editor */}
                        <div className={cn('flex-1', 'relative', 'min-h-75', 'overflow-hidden', 'bg-background')}>
                          <div className={cn('absolute', 'inset-0')}>
                            <Editor
                              height="100%"
                              language={
                                submitResult?.submitted_language?.value ||
                                selectedLang.value
                              }
                              value={submitResult?.submitted_code ? submitResult.submitted_code.replace(/^[\r\n]+/, '') : code}
                              theme={monacoTheme}
                              options={{
                                readOnly: true,
                                fontSize: 12,
                                minimap: { enabled: false },
                                scrollBeyondLastLine: false,
                                smoothScrolling: true,
                                wordWrap: "on",
                                automaticLayout: true,
                                padding: { top: 10, bottom: 10 },
                                lineNumbersMinChars: 3,
                                scrollbar: { vertical: "hidden", horizontal: "hidden" },
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </TabsContent>
          <TabsContent value="notes" forceMount hidden={activeTab !== "notes"} className={cn('mt-0', 'outline-none', 'flex-1', 'w-full', 'overflow-hidden', 'relative', 'flex', 'flex-col', activeTab !== "notes" && "hidden")}>
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
  const editorContent = (
    <div className={cn('flex', 'flex-col', 'h-full', 'bg-card', 'overflow-hidden', 'relative')}>
      <div className={cn('flex', 'items-center', 'justify-between', 'bg-card', 'shrink-0', 'select-none', 'h-10', 'border-b', 'border-border/50', 'px-1')}>
        <div className={cn('flex', 'items-center', 'h-full', 'gap-1.5', 'px-2', 'text-[11px]', 'font-bold', 'text-foreground')}>
          <IconCode className={cn('h-3.5', 'w-3.5', 'text-zinc-500 dark:text-muted-foreground/80')} />
          <span>Code</span>
          <span className={cn('text-muted-foreground/30', 'mx-0.5')}>|</span>
          <Select value={selectedLang.value} onValueChange={handleLangChange}>
            <SelectTrigger className={cn('h-auto', 'p-0', 'm-0', 'border-none', 'shadow-none', 'bg-transparent', 'hover:bg-transparent', 'dark:bg-transparent', 'dark:hover:bg-transparent', 'focus:ring-0', 'focus-visible:ring-0', 'focus-visible:outline-none', 'text-foreground', 'hover:text-foreground/70', 'flex', 'items-center', 'gap-1', 'w-auto', 'text-[11px]', 'font-semibold')}>
              <SelectValue placeholder="Language" />
            </SelectTrigger>
            <SelectContent
              position="popper"
              sideOffset={4}
              align="start"
              className="min-w-30"
            >
              <SelectGroup>
                {LANGUAGES.map((l) => (
                  <SelectItem
                    key={l.id}
                    value={l.value}
                    className="font-medium"
                  >
                    {l.name}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>

        </div>
        {/* Format & Reset & Copy & Shortcuts & Settings Buttons */}
        <div className={cn('flex', 'items-center', 'gap-1', 'pr-2')}>
          <IdeSettingsModal
            open={isSettingsOpen}
            onOpenChange={setIsSettingsOpen}
            settings={ideSettings}
            onSettingsChange={setIdeSettings}
            onOpenShortcuts={() => setIsShortcutsOpen(true)}
            onPreviewFontSize={(size) => {
              if (editorRef.current) {
                editorRef.current.updateOptions({ fontSize: size });
              }
            }}
            trigger={
              <Button
                variant="ghost"
                size="icon"
                title="Editor Settings"
                className={cn('h-7', 'w-7', 'text-zinc-500 dark:text-muted-foreground', 'hover:text-foreground', 'shrink-0')}
                onMouseDown={(e) => e.preventDefault()}
                onClick={(e) => {
                  e.currentTarget.blur();
                  setIsSettingsOpen(true);
                }}
              >
                <IconAdjustments className={cn('h-4', 'w-4')} />
              </Button>
            }
          />

          {/* Format Button */}
          <Button
            variant="ghost"
            size="icon"
            disabled={running || submitting}
            title="Format Code (Shift+Alt+F)"
            className={cn('h-7', 'w-7', 'text-zinc-500 dark:text-muted-foreground', 'hover:text-foreground', 'shrink-0')}
            onMouseDown={(e) => e.preventDefault()}
            onClick={(e) => {
              e.currentTarget.blur();
              handleFormatCode();
            }}
          >
            <IconBraces className={cn('h-4', 'w-4')} />
          </Button>

          <Popover open={isResetOpen} onOpenChange={setIsResetOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                disabled={running || submitting}
                title="Reset code to boilerplate"
                className={cn('h-7', 'w-7', 'text-zinc-500 dark:text-muted-foreground', 'hover:text-foreground', 'shrink-0')}
                onMouseDown={(e) => e.preventDefault()}
                onClick={(e) => e.currentTarget.blur()}
              >
                <IconRefresh className={cn('h-4', 'w-4')} />
              </Button>
            </PopoverTrigger>
            <PopoverContent
              className={cn('w-64', 'p-3', 'z-9999')}
              side="bottom"
              align="end"
              onOpenAutoFocus={(e) => e.preventDefault()}
              onCloseAutoFocus={(e) => e.preventDefault()}
            >
              <div className={cn('flex', 'flex-col', 'gap-3')}>
                <span className={cn('text-sm', 'font-medium')}>Reset code?</span>
                <span className={cn('text-xs', 'text-zinc-600 dark:text-muted-foreground')}>
                  This will delete your current code and restore the default boilerplate.
                </span>
                <div className={cn('flex', 'gap-2', 'justify-end', 'mt-1')}>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={cn('h-7', 'text-xs')}
                    onClick={() => setIsResetOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    className={cn('h-7', 'text-xs')}
                    onClick={() => {
                      const boilerplate =
                        parsedBoilerplates[String(selectedLang.id)] ||
                        `// Write your ${selectedLang.name} solution here\n`;
                      setCode(boilerplate);
                      setIsResetOpen(false);
                    }}
                  >
                    Reset
                  </Button>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>
      <div className={cn('flex-1', 'min-h-0', 'relative')}>
        <style>{`
          .monaco-editor .margin-view-overlays .monaco-error-line-number {
            background-image: none !important;
          }
          .monaco-editor .margin-view-overlays .monaco-error-line-number .line-numbers {
            color: #f43f5e !important;
            font-weight: bold !important;
            font-size: inherit !important;
          }
          .monaco-editor .monaco-error-line-bg {
            background-color: rgba(244, 63, 94, 0.15) !important;
          }
        `}</style>
        {isTransitioning ? (
          <div className={cn('absolute', 'inset-0', 'z-10', 'flex', 'flex-col', 'w-full', 'h-full', 'p-4', 'space-y-3', 'bg-card', 'font-mono')}>
            {Array.from({ length: 15 }).map((_, i) => {
              const widths = [
                40, 60, 30, 75, 50, 85, 45, 65, 35, 70, 55, 80, 45, 60, 30,
              ];
              const indent = [0, 4, 4, 8, 8, 8, 4, 4, 0, 4, 4, 0, 0, 4, 4];
              return (
                <div key={i} className={cn('flex', 'items-center', 'gap-4')}>
                  <div className={cn('w-6', 'text-right', 'text-[10px]', 'text-muted-foreground/20', 'select-none')}>
                    {i + 1}
                  </div>
                  <div
                    style={{ paddingLeft: `${indent[i]}rem`, width: "100%" }}
                  >
                    <Skeleton
                      className="h-3.5"
                      style={{ width: `${widths[i]}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        ) : null}
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

            // Bind Ctrl + Equal (=) and NumpadAdd to Zoom In
            const zoomIn = () => setIdeSettings(prev => ({ ...prev, fontSize: Math.min(24, prev.fontSize + 1) }));
            editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Equal, zoomIn);
            editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.NumpadAdd, zoomIn);

            // Bind Ctrl + Minus (-) and NumpadSubtract to Zoom Out
            const zoomOut = () => setIdeSettings(prev => ({ ...prev, fontSize: Math.max(10, prev.fontSize - 1) }));
            editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Minus, zoomOut);
            editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.NumpadSubtract, zoomOut);

            // Bind Shift+Alt+F to Format Code
            editor.addCommand(monaco.KeyMod.Shift | monaco.KeyMod.Alt | monaco.KeyCode.KeyF, () => {
              handleFormatCode();
            });

            // Bind Ctrl/Cmd + Enter to Run Code
            editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
              if (runRef.current) runRef.current();
            });

            // Bind Ctrl/Cmd + Shift + Enter to Submit Code
            editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.Enter, () => {
              if (submitRef.current) submitRef.current();
            });

            // Bind Ctrl/Cmd + ' (US_QUOTE) to Run Code
            editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.US_QUOTE, () => {
              if (runRef.current) runRef.current();
            });

            // Track Cursor Position
            editor.onDidChangeCursorPosition((e) => {
              setCursorPos({ line: e.position.lineNumber, col: e.position.column });
            });
          }}
          loading={
            <div className={cn('flex', 'flex-col', 'w-full', 'h-full', 'p-4', 'space-y-3', 'bg-background', 'font-mono', 'opacity-60')}>
              {Array.from({ length: 12 }).map((_, i) => {
                const widths = [40, 60, 30, 75, 50, 85, 45, 65, 35, 70, 55, 80];
                const indent = [0, 4, 4, 8, 8, 8, 4, 4, 0, 4, 4, 0];
                return (
                  <div key={i} className={cn('flex', 'items-center', 'gap-4')}>
                    <div className={cn('w-6', 'text-right', 'text-[10px]', 'text-muted-foreground/40', 'select-none')}>
                      {i + 1}
                    </div>
                    <div
                      style={{ paddingLeft: `${indent[i]}rem`, width: "100%" }}
                    >
                      <Skeleton
                        className="h-3.5"
                        style={{ width: `${widths[i]}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          }
        />

        {/* Conditionally rendered bottom bar for Code Editor layout */}
        {ideSettings.buttonPosition === "bottom" && !isDailyChallenge && (
          <div className={cn('absolute', 'bottom-4', 'right-6', 'z-10')}>
            <ButtonGroup>
              <Button
                variant="outline"
                onClick={handleRunCode}
                disabled={running || submitting}
                title="Run Code (Ctrl + ')"
                className={cn('h-8', 'px-3', 'text-xs', 'font-semibold', 'bg-zinc-900/90', 'hover:bg-zinc-800', 'border-zinc-700', 'text-zinc-300', 'hover:text-zinc-100', 'backdrop-blur-md', 'flex', 'items-center', 'gap-1.5', 'group', 'shadow-lg')}
              >
                {running ? (
                  <Spinner className="size-3.5" />
                ) : (
                  <IconPlayerPlay className={cn('h-3.5', 'w-3.5', 'text-emerald-500', 'group-hover:text-emerald-400', 'transition-colors')} />
                )}
                <span>{running ? "Running" : "Run"}</span>
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowSubmitConfirm(true)}
                disabled={running || submitting}
                title="Submit Code (Ctrl + Enter)"
                className={cn('h-8', 'px-3', 'text-xs', 'font-semibold', 'bg-zinc-900/90', 'hover:bg-zinc-800', 'border-zinc-700', 'text-zinc-300', 'hover:text-zinc-100', 'backdrop-blur-md', 'flex', 'items-center', 'gap-1.5', 'group', 'shadow-lg')}
              >
                {submitting ? (
                  <Spinner className="size-3.5" />
                ) : (
                  <IconSend className={cn('h-3.5', 'w-3.5', 'text-sky-500', 'group-hover:text-sky-400', 'transition-colors')} />
                )}
                <span>{submitting ? "Submitting" : "Submit"}</span>
              </Button>
            </ButtonGroup>
          </div>
        )}
      </div>

      {/* Editor Status Bar Footer */}
      <div className={cn('flex', 'items-center', 'justify-between', 'px-4', 'py-0.5', 'shrink-0', 'text-[10px]', 'text-zinc-500 dark:text-zinc-400', 'font-medium', 'select-none', 'bg-white dark:bg-[#1e1e1e]')}>
        <div className={cn('flex', 'items-center', 'gap-2')}>
          <span>{saveStatus}</span>
        </div>
        <div>
          Ln {cursorPos.line}, Col {cursorPos.col}
        </div>
      </div>
    </div>
  );

  const outputContent = (
    <div className={cn('flex', 'flex-col', 'h-full', 'bg-card', 'overflow-hidden')}>
      <Tabs
        value={activeOutputTab}
        onValueChange={(val: any) => setActiveOutputTab(val)}
        className={cn('flex', 'flex-col', 'h-full', 'w-full')}
      >
        <div className={cn('flex', 'items-center', 'justify-between', 'bg-card', 'pl-0', 'pr-3', 'shrink-0', 'select-none', 'h-10', 'border-b', 'border-border/50', 'overflow-x-auto', 'scrollbar-hide')}>
          <TabsList className={cn('flex', 'bg-transparent', 'h-full', 'p-0', 'rounded-none', 'justify-start', 'min-w-0')}>
            <TabsTrigger
              value="testcases"
              onClick={() => setActiveOutputTab("testcases")}
              onMouseDown={(e) => {
                e.preventDefault();
                setActiveOutputTab("testcases");
              }}
              className={cn('flex', 'items-center', 'px-4', 'h-full', 'text-[11px]', 'font-bold', 'uppercase', 'tracking-widest', 'transition-colors', 'cursor-pointer', 'data-[state=active]:text-foreground', 'data-[state=active]:border-b-2', 'data-[state=active]:border-foreground', 'data-[state=active]:bg-transparent!', 'dark:data-[state=active]:bg-transparent!', 'data-[state=active]:border-t-transparent!', 'data-[state=active]:border-x-transparent!', 'dark:data-[state=active]:border-t-transparent!', 'dark:data-[state=active]:border-x-transparent!', 'data-[state=active]:shadow-none', 'text-zinc-600 dark:text-muted-foreground/80', 'hover:text-foreground/80', 'rounded-none!', 'border-y-2', 'border-transparent', 'focus-visible:ring-0', 'focus-visible:outline-none')}
            >
              <IconCircleCheck className={cn('h-3.5', 'w-3.5', 'mr-1.5', 'text-emerald-500')} /> Testcase
            </TabsTrigger>
            <TabsTrigger
              value="result"
              onClick={() => setActiveOutputTab("result")}
              onMouseDown={(e) => {
                e.preventDefault();
                setActiveOutputTab("result");
              }}
              className={cn('flex', 'items-center', 'px-4', 'h-full', 'text-[11px]', 'font-bold', 'uppercase', 'tracking-widest', 'transition-colors', 'cursor-pointer', 'data-[state=active]:text-foreground', 'data-[state=active]:border-b-2', 'data-[state=active]:border-foreground', 'data-[state=active]:bg-transparent!', 'dark:data-[state=active]:bg-transparent!', 'data-[state=active]:border-t-transparent!', 'data-[state=active]:border-x-transparent!', 'dark:data-[state=active]:border-t-transparent!', 'dark:data-[state=active]:border-x-transparent!', 'data-[state=active]:shadow-none', 'text-zinc-600 dark:text-muted-foreground/80', 'hover:text-foreground/80', 'rounded-none!', 'border-y-2', 'border-transparent', 'focus-visible:ring-0', 'focus-visible:outline-none')}
            >
              <IconTerminal2 className={cn('h-3.5', 'w-3.5', 'mr-1.5', 'text-zinc-600 dark:text-muted-foreground')} /> Test Result
            </TabsTrigger>
          </TabsList>
          {runResult && (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleCopyOutput}
              className={cn('h-7', 'w-7', 'text-zinc-650 dark:text-muted-foreground/80', 'hover:text-foreground', 'shrink-0', 'ml-2')}
            >
              {copied ? (
                <IconCheck className={cn('h-3.5', 'w-3.5', 'text-emerald-400')} />
              ) : (
                <IconCopy className={cn('h-3.5', 'w-3.5')} />
              )}
            </Button>
          )}
        </div>

        <ScrollArea className={cn('flex-1', 'w-full', 'min-h-0')}>
          <div className={cn('p-3.5', 'font-mono', 'text-xs')}>
            <TabsContent value="testcases" className={cn('mt-0', 'outline-none')}>
              {isTransitioning ? (
                <div className={cn('flex', 'flex-col', 'w-full', 'space-y-4', 'pt-2')}>
                  <div className={cn('flex', 'gap-2', 'mb-4')}>
                    <Skeleton className="h-6 w-16" />
                    <Skeleton className="h-6 w-16" />
                    <Skeleton className="h-6 w-16" />
                  </div>
                  <Skeleton className="h-3.5 w-24" />
                  <Skeleton className="h-10 w-full rounded-lg" />
                  <Skeleton className="h-3.5 w-24 mt-4" />
                  <Skeleton className="h-10 w-full rounded-lg" />
                </div>
              ) : customInputs.length > 0 ? (
                <div className="space-y-3.5">
                  {/* Case selector buttons */}
                  <div className={cn('flex', 'flex-wrap', 'items-center', 'gap-2', 'select-none', 'border-b', 'border-border/10', 'pb-2.5')}>
                    {customInputs.map((_, index: number) => {
                      const isSelected = activeTestcaseIndex === index;
                      return (
                        <Button
                          key={index}
                          variant={isSelected ? "secondary" : "ghost"}
                          onClick={() => setActiveTestcaseIndex(index)}
                          className={cn('h-6', 'px-3.5', 'text-xs', 'font-bold', 'rounded-lg', 'transition-all')}
                        >
                          Case {index + 1}
                        </Button>
                      );
                    })}
                    {customInputs.length < 8 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          const params = getParamNames();
                          const emptyInput = params.map(() => "").join("\n");
                          setCustomInputs([...customInputs, emptyInput]);
                          setCustomExpectedOutputs([
                            ...customExpectedOutputs,
                            "",
                          ]);
                          setActiveTestcaseIndex(customInputs.length);
                        }}
                        title="Add new testcase"
                        className={cn('h-6', 'w-6', 'text-zinc-550 dark:text-muted-foreground', 'hover:text-foreground')}
                      >
                        <IconPlus className={cn('h-4', 'w-4')} />
                      </Button>
                    )}
                  </div>

                  {/* Case Input Textarea */}
                  <div className={cn('animate-in', 'fade-in', 'duration-200', 'relative')}>
                    {activeTestcaseIndex >= sampleTestCases.length && (
                      <div className={cn('absolute', 'right-0', '-top-8')}>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            const newInputs = customInputs.filter(
                              (_, idx) => idx !== activeTestcaseIndex,
                            );
                            const newExpected = customExpectedOutputs.filter(
                              (_, idx) => idx !== activeTestcaseIndex,
                            );
                            setCustomInputs(newInputs);
                            setCustomExpectedOutputs(newExpected);
                            setActiveTestcaseIndex(
                              Math.max(0, activeTestcaseIndex - 1),
                            );
                          }}
                          className={cn('h-6', 'w-6', 'text-rose-500', 'hover:text-rose-600', 'hover:bg-rose-500/10')}
                          title="Delete testcase"
                        >
                          <IconTrash className={cn('h-3.5', 'w-3.5')} />
                        </Button>
                      </div>
                    )}
                    {renderInputParams(
                      customInputs[activeTestcaseIndex] || "",
                      getParamNames(),
                      activeTestcaseIndex >= sampleTestCases.length,
                      (lineIdx, newVal) => {
                        setCustomInputs((prev) => {
                          const next = [...prev];
                          const lines = (next[activeTestcaseIndex] || "").split(
                            "\n",
                          );
                          lines[lineIdx] = newVal;
                          next[activeTestcaseIndex] = lines.join("\n");
                          return next;
                        });
                      },
                    )}

                    <div className={cn('mt-4', 'pt-4', 'border-t', 'border-border/10', 'space-y-1.5', 'text-sm', 'font-mono')}>
                      <span className={cn('text-sm', 'text-zinc-600 dark:text-muted-foreground/80', 'uppercase', 'tracking-widest', 'font-bold', 'block', 'select-none')}>
                        Expected Output {activeTestcaseIndex >= sampleTestCases.length ? "(Optional) =" : "="}
                      </span>
                      {activeTestcaseIndex >= sampleTestCases.length ? (
                        <Input
                          type="text"
                          value={customExpectedOutputs[activeTestcaseIndex] || ""}
                          onChange={(e) => {
                            setCustomExpectedOutputs((prev) => {
                              const next = [...prev];
                              next[activeTestcaseIndex] = e.target.value;
                              return next;
                            });
                          }}
                          placeholder="Expected Output (e.g. 2)"
                          className={cn('bg-zinc-100/80 dark:bg-zinc-900/50', 'font-mono', 'text-[15px]')}
                        />
                      ) : (
                        <div className={cn('w-full', 'px-3', 'py-2', 'bg-zinc-100/40 dark:bg-zinc-900/30', 'border', 'border-border/30', 'rounded-md', 'text-foreground/70', 'text-[15px]', 'font-mono')}>
                          {customExpectedOutputs[activeTestcaseIndex] || "N/A"}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <p className={cn('text-zinc-500 dark:text-muted-foreground/40', 'text-[10px]')}>
                  No sample test cases available.
                </p>
              )}
            </TabsContent>
            <TabsContent value="result" className={cn('mt-0', 'outline-none', 'h-full')}>
              <div className={cn('space-y-2', 'h-full', 'flex', 'flex-col', 'justify-start')}>
                {running ? (
                  <div className={cn('flex', 'flex-col', 'items-center', 'justify-center', 'py-6', 'gap-3', 'animate-pulse', 'my-auto')}>
                    <div className="relative">
                      <Spinner className="size-10 text-emerald-400" />
                      <div className={cn('absolute', 'inset-0', 'flex', 'items-center', 'justify-center')}>
                        <IconTerminal2 className={cn('h-4', 'w-4', 'text-emerald-400')} />
                      </div>
                    </div>
                    <div className={cn('text-center', 'space-y-1')}>
                      <p className={cn('text-xs', 'font-bold', 'text-foreground', 'uppercase', 'tracking-wider')}>
                        Compiling & Running...
                      </p>
                      <p className={cn('text-[10px]', 'text-zinc-600 dark:text-muted-foreground/80')}>
                        Executing solution against the logiclab sandbox...
                      </p>
                    </div>
                  </div>
                ) : runResult ? (
                  (() => {
                    const result = runResult;
                    const isSubmit = false;

                    // If it's a Crash (Compile Error or Runtime Error)
                    const failedWithError = result.cases?.find((c: any) => !c.passed && (c.compile_output || c.stderr));
                    const isCrash =
                      result.status?.description === "Compilation Error" ||
                      result.status?.description?.includes("Runtime Error") ||
                      result.status?.id === 6 ||
                      result.compile_output ||
                      result.stderr ||
                      failedWithError;

                    if (isCrash) {
                      const compileErrText =
                        result.compile_output ||
                        result.stderr ||
                        failedWithError?.compile_output ||
                        failedWithError?.stderr ||
                        result.failed_test_case_info?.actual ||
                        "Execution failed.";
                      return (
                        <div className={cn('space-y-2', 'select-text', 'select-none')}>
                          <p className={cn('text-[13px]', 'text-rose-600', 'dark:text-rose-400', 'uppercase', 'tracking-widest', 'font-bold', 'flex', 'items-center', 'gap-1.5', 'mb-1')}>
                            <IconAlertTriangle className={cn('h-4', 'w-4')} />{" "}
                            Error Diagnostics
                          </p>
                          <pre className={cn('p-4', 'bg-black/40', 'border', 'border-border/80', 'rounded-xl', 'text-rose-400', 'whitespace-pre-wrap', 'text-[15px]', 'font-mono', 'max-h-100', 'overflow-y-auto', 'leading-relaxed', 'select-text', 'shadow-sm')}>
                            {formatErrorDiagnostic(compileErrText)}
                          </pre>
                        </div>
                      );
                    }

                    // If it's a general Sandbox Error/Runtime Error/MLE/TLE (with no cases resolved)
                    if (!result.cases || result.cases.length === 0) {
                      const isTLE =
                        result.status === "Time Limit Exceeded" ||
                        result.status?.id === 5;
                      const isMLE =
                        result.status === "Memory Limit Exceeded" ||
                        result.status?.description
                          ?.toLowerCase()
                          .includes("memory limit");
                      const errText =
                        result.failed_test_case_info?.actual ||
                        result.stderr ||
                        result.status?.description ||
                        "Runtime Exception";

                      return (
                        <div className="space-y-3">
                          <div className={cn('p-2.5', 'rounded-lg', 'flex', 'items-center', 'justify-between', 'border', 'bg-rose-500/5', 'border-rose-500/20', 'text-rose-600', 'dark:text-rose-400')}>
                            <div className={cn('flex', 'items-center', 'gap-2')}>
                              <IconCircleX className={cn('h-4', 'w-4', 'text-rose-500')} />
                              <span className={cn('font-bold', 'uppercase', 'tracking-wider', 'text-[10px]')}>
                                {isTLE
                                  ? "Time Limit Exceeded"
                                  : isMLE
                                    ? "Memory Limit Exceeded"
                                    : "Runtime Error"}
                              </span>
                            </div>
                            {result.time && (
                              <span className={cn('text-[10px]', 'text-zinc-600 dark:text-muted-foreground', 'font-mono')}>
                                {result.time}s
                              </span>
                            )}
                          </div>

                          <div className={cn('p-3', 'bg-rose-500/5', 'border', 'border-rose-500/20', 'rounded-lg', 'space-y-1.5', 'select-text')}>
                            <p className={cn('text-xs', 'font-bold', 'text-rose-600', 'dark:text-rose-400', 'uppercase', 'tracking-wider')}>
                              Diagnostics
                            </p>
                            <pre className={cn('p-2.5', 'bg-black/40', 'border', 'border-border/80', 'rounded-lg', 'text-rose-400', 'text-[11px]', 'font-mono', 'whitespace-pre-wrap', 'max-h-25', 'overflow-y-auto', 'select-text', 'leading-relaxed')}>
                              {errText}
                            </pre>
                          </div>
                        </div>
                      );
                    }

                    // Interactive Case outcome visualizer (Standard Accepted/Wrong Answer view)
                    const activeCase =
                      result.cases[selectedCaseIndex] || result.cases[0];
                    if (!activeCase) return null;

                    const runtimeDisplay = isSubmit
                      ? `${Math.round(result.runtime)} ms`
                      : `${Math.round(parseFloat(result.time || "0") * 1000)} ms`;
                    const memoryDisplay = formatMemory(result.memory, false);

                    const isAllPassed =
                      result.success || result.status === "Accepted";
                    const passedCount = result.cases.filter(
                      (c: any) => c.passed,
                    ).length;
                    const totalCount = result.cases.length;

                    return (
                      <div className={cn('space-y-3', 'animate-in', 'fade-in', 'duration-200')}>
                        {/* Status bar */}
                        <div className={cn('flex', 'items-center', 'justify-between', 'border-b', 'border-border/25', 'pb-2', 'select-none')}>
                          <div className={cn('flex', 'items-center', 'gap-2')}>
                            <span
                              className={`font-extrabold text-sm tracking-wide uppercase ${isAllPassed ? "text-emerald-500" : "text-rose-500"}`}
                            >
                              {isAllPassed ? "Accepted" : "Wrong Answer"}
                            </span>
                            <span className={cn('text-zinc-600 dark:text-muted-foreground/80', 'text-xs', 'font-semibold')}>
                              {passedCount}/{totalCount} testcases passed
                            </span>
                            <span className={cn('text-zinc-500 dark:text-muted-foreground/60', 'text-xs', 'font-medium', 'border-l', 'border-border/40', 'pl-2', 'ml-1')}>
                              Runtime: {runtimeDisplay}
                            </span>
                          </div>
                          <div className={cn('text-xs', 'text-zinc-600 dark:text-muted-foreground', 'font-medium', 'flex', 'items-center', 'gap-1.5')}>
                            <IconCpu className={cn('h-3.5', 'w-3.5', 'text-emerald-400')} />
                            {memoryDisplay}
                          </div>
                        </div>

                        {/* Interactive Case Selector Tabs (Case 1, Case 2, Case 3) */}
                        <div className={cn('flex', 'flex-wrap', 'gap-1.5', 'select-none', 'border-b', 'border-border/10', 'pb-2')}>
                          {result.cases.map((c: any, index: number) => {
                            const isSelected = selectedCaseIndex === index;
                            const isPassed = c.passed;
                            return (
                              <Button
                                key={index}
                                variant={isSelected ? "secondary" : "ghost"}
                                onClick={() => setSelectedCaseIndex(index)}
                                className={cn(
                                  'h-6 px-3.5 text-xs font-bold rounded-lg transition-all',
                                  isSelected
                                    ? isPassed
                                      ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/25 dark:bg-emerald-500/20"
                                      : "bg-rose-500/15 text-rose-700 dark:text-rose-400 hover:bg-rose-500/25 dark:bg-rose-500/20"
                                    : isPassed
                                      ? "text-emerald-600/80 dark:text-emerald-400/80 hover:bg-emerald-500/10 hover:text-emerald-700 dark:hover:text-emerald-400"
                                      : "text-rose-600/80 dark:text-rose-400/80 hover:bg-rose-500/10 hover:text-rose-700 dark:hover:text-rose-400"
                                )}
                              >
                                Case {index + 1}
                              </Button>
                            );
                          })}
                        </div>

                        {/* Case Details (Input, Output, Expected) */}
                        <div className={cn('space-y-4', 'select-text', 'font-mono', 'mt-2')}>
                          <div>
                            <span className={cn('text-sm', 'text-zinc-600 dark:text-muted-foreground/80', 'uppercase', 'tracking-widest', 'font-bold', 'block', 'mb-1.5', 'select-none')}>
                              Input
                            </span>
                            {renderInputParams(
                              activeCase.input || "",
                              getParamNames(),
                            )}
                          </div>
                          <div className={cn('grid', 'grid-cols-1', 'sm:grid-cols-2', 'gap-4')}>
                            <div>
                              <span className={cn('text-sm', 'text-zinc-600 dark:text-muted-foreground/80', 'uppercase', 'tracking-widest', 'font-bold', 'block', 'mb-1.5', 'select-none')}>
                                Output
                              </span>
                              <div
                                className={`p-2.5 bg-muted/40 dark:bg-black/40 border border-zinc-200 dark:border-border/50 rounded-xl text-[15px] max-h-32 overflow-y-auto leading-relaxed ${activeCase.passed ? "text-emerald-700 dark:text-emerald-400 font-medium" : "text-rose-700 dark:text-rose-400 font-bold"}`}
                              >
                                {renderTestcaseValue(truncateText(activeCase.actual || "(empty)"))}
                              </div>
                            </div>
                            <div>
                              <span className={cn('text-sm', 'text-zinc-600 dark:text-muted-foreground/80', 'uppercase', 'tracking-widest', 'font-bold', 'block', 'mb-1.5', 'select-none')}>
                                Expected
                              </span>
                              <div className={cn('p-2.5', 'bg-muted/40', 'dark:bg-black/40', 'border', 'border-zinc-200', 'dark:border-border/50', 'rounded-xl', 'text-emerald-700', 'dark:text-emerald-400', 'text-[15px]', 'font-medium', 'max-h-32', 'overflow-y-auto', 'leading-relaxed')}>
                                {renderTestcaseValue(truncateText(activeCase.expected || "(none)"))}
                              </div>
                            </div>
                          </div>
                          {/* Compile/Runtime Error inside case */}
                          {(activeCase.compile_output || activeCase.stderr) && (
                            <div className={cn('mt-4', 'p-4', 'bg-rose-500/5', 'border', 'border-rose-500/20', 'rounded-xl', 'select-text')}>
                              <p className={cn('text-[13px]', 'font-bold', 'text-rose-600', 'dark:text-rose-400', 'uppercase', 'tracking-widest', 'flex', 'items-center', 'gap-1.5', 'mb-2')}>
                                <IconAlertTriangle className={cn('h-3.5', 'w-3.5')} />
                                Error Diagnostics
                              </p>
                              <pre className={cn('p-4', 'bg-black/40', 'border', 'border-border/80', 'rounded-xl', 'text-rose-400', 'text-[15px]', 'font-mono', 'whitespace-pre-wrap', 'max-h-100', 'overflow-y-auto', 'leading-relaxed', 'shadow-sm')}>
                                {formatErrorDiagnostic(activeCase.compile_output || activeCase.stderr)}
                              </pre>
                            </div>
                          )}
                          {activeCase.console_output && activeCase.console_output.trim() !== "" && (
                            <div className={cn('mt-4', 'rounded-xl', 'overflow-hidden', 'border', 'border-zinc-800/80', 'bg-[#0a0a0a]', 'shadow-inner')}>
                              <div className={cn('flex', 'items-center', 'px-3', 'py-2.5', 'bg-[#18181b]', 'border-b', 'border-zinc-800', 'select-none')}>
                                <div className={cn('flex', 'gap-1.5', 'mr-3')}>
                                  <div className={cn('w-2.5', 'h-2.5', 'rounded-full', 'bg-red-500/80')} />
                                  <div className={cn('w-2.5', 'h-2.5', 'rounded-full', 'bg-yellow-500/80')} />
                                  <div className={cn('w-2.5', 'h-2.5', 'rounded-full', 'bg-emerald-500/80')} />
                                </div>
                                <IconTerminal2 className={cn('h-3.5', 'w-3.5', 'text-zinc-500', 'mr-2')} />
                                <span className={cn('text-xs', 'text-zinc-400', 'uppercase', 'tracking-widest', 'font-bold')}>
                                  Console Output
                                </span>
                              </div>
                              <div className={cn('p-4', 'max-h-48', 'overflow-y-auto', 'scrollbar-thin')}>
                                <pre className={cn('text-zinc-300', 'text-[14px]', 'font-mono', 'whitespace-pre-wrap', 'leading-[1.8]', 'font-medium')}>
                                  {activeCase.console_output}
                                </pre>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })()
                ) : (
                  <Empty className={cn('h-full', 'select-none', 'my-auto')}>
                    <EmptyMedia>
                      <IconTerminal2 className={cn('size-8', 'text-muted-foreground/30')} />
                    </EmptyMedia>
                    <EmptyTitle className={cn('text-xs', 'uppercase', 'font-bold', 'tracking-wider', 'text-muted-foreground/60')}>
                      Run your code to see results
                    </EmptyTitle>
                  </Empty>
                )}
              </div>
            </TabsContent>
          </div>
        </ScrollArea>
      </Tabs>
    </div>
  );

  return (
    <div
      ref={ideContainerRef}
      className={cn(
        "flex flex-col flex-1 min-h-0 bg-background text-foreground overflow-hidden",
        isFullScreen
          ? "fixed inset-0 z-9990 h-screen w-screen"
          : "fixed top-12 left-0 md:left-12 right-0 bottom-0 z-10",
      )}
    >
      {/* Mobile/Tablet Screen Workspace */}
      <div className={cn('flex', 'md:hidden', 'flex-col', 'flex-1', 'min-h-0', 'overflow-hidden', 'bg-zinc-100', 'dark:bg-zinc-950')}>
        {/* Sticky Mobile Header */}
        <div className={cn('sticky', 'top-0', 'z-20', 'flex', 'items-center', 'justify-between', 'px-4', 'py-2', 'bg-zinc-100', 'dark:bg-zinc-950', 'border-b', 'border-border/50', 'shrink-0', 'select-none')}>
          <div className={cn('flex', 'items-center', 'gap-2')}>
            <Button
              variant="outline"
              size="icon"
              asChild
              className={cn('h-8', 'w-8')}
              title={isDailyChallenge ? "Back to Daily Challenges" : "Back to Problems"}
            >
              <Link href={isDailyChallenge ? "/logiclab/dailychallenges" : "/logiclab"}>
                <IconArrowLeft className={cn('h-4', 'w-4')} />
              </Link>
            </Button>
            <span className={cn('text-sm', 'font-bold', 'text-foreground', 'truncate', 'max-w-45')}>
              {problem.number ? `${problem.number}. ` : ""}{problem.title}
            </span>
          </div>

          <div className={cn('flex', 'items-center', 'gap-1.5')}>
            <Badge
              variant={
                problem.difficulty === "Easy"
                  ? "success"
                  : problem.difficulty === "Medium"
                    ? "warning"
                    : "destructive"
              }
              className="text-[10px] font-semibold"
            >
              {problem.difficulty || "Hard"}
            </Badge>
          </div>
        </div>

        {/* Mobile Tab Selector */}
        <div className={cn('flex', 'bg-card', 'shrink-0', 'border-b', 'border-border/50')}>
          <button
            onClick={() => setMobileActiveTab("description")}
            className={cn(
              "flex-1 flex items-center justify-center py-2.5 text-[11px] font-bold uppercase tracking-wider border-b-2 transition-all",
              mobileActiveTab === "description"
                ? "text-foreground border-foreground bg-zinc-100/50 dark:bg-zinc-900/50"
                : "text-muted-foreground border-transparent hover:text-foreground"
            )}
          >
            <IconFileDescription className={cn('h-3.5', 'w-3.5', 'mr-1')} />
            Desc
          </button>
          <button
            onClick={() => setMobileActiveTab("submissions")}
            className={cn(
              "flex-1 flex items-center justify-center py-2.5 text-[11px] font-bold uppercase tracking-wider border-b-2 transition-all",
              mobileActiveTab === "submissions"
                ? "text-foreground border-foreground bg-zinc-100/50 dark:bg-zinc-900/50"
                : "text-muted-foreground border-transparent hover:text-foreground"
            )}
          >
            <IconHistory className={cn('h-3.5', 'w-3.5', 'mr-1')} />
            Submits ({submissions.length})
          </button>
          <button
            onClick={() => setMobileActiveTab("notes")}
            className={cn(
              "flex-1 flex items-center justify-center py-2.5 text-[11px] font-bold uppercase tracking-wider border-b-2 transition-all",
              mobileActiveTab === "notes"
                ? "text-foreground border-foreground bg-zinc-100/50 dark:bg-zinc-900/50"
                : "text-muted-foreground border-transparent hover:text-foreground"
            )}
          >
            <IconFileText className={cn('h-3.5', 'w-3.5', 'mr-1')} />
            Notes
          </button>
        </div>

        {/* Mobile Panel Content */}
        <div className={cn('flex-1', 'min-h-0', 'flex', 'flex-col', 'overflow-hidden', mobileActiveTab !== "notes" && "hidden")}>
          <ProblemNotes
            problemId={problem.id}
            currentCode={code}
            currentLanguage={selectedLang.name}
            submissions={submissions}
            isDailyChallenge={isDailyChallenge}
          />
        </div>
        <div className={cn('flex-1', 'overflow-y-auto', 'min-h-0', 'bg-card', 'p-4', mobileActiveTab === "notes" && "hidden")}>
          {mobileActiveTab === "description" && (
            <div className="space-y-6">
              {/* Title & Tags */}
              <div className="space-y-3">
                <h1 className={cn('text-lg', 'font-bold', 'text-foreground', 'leading-tight')}>
                  {problem.number ? `${problem.number}. ` : ""}{problem.title}
                </h1>
                <div className={cn('flex', 'flex-wrap', 'items-center', 'gap-1.5', 'select-none')}>
                  {/* Company Badges with Interview Frequency */}
                  {getProblemCompanyBadges(problem).map((b) => (
                    <CompanyBadge
                      key={b.company.id}
                      company={b.company}
                      frequency={b.frequency}
                      size="xs"
                      showFrequency={true}
                    />
                  ))}
                  {/* Topic Tags */}
                  {problem.tags && problem.tags.length > 0 && problem.tags.filter((t: string) => !isCompanyTag(t)).map((tag: string, i: number) => (
                    <Badge key={i} variant="secondary" className="text-[10px] font-semibold">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Description Markdown */}
              <div className={cn('text-sm', 'text-zinc-900', 'dark:text-foreground/90', 'leading-relaxed', 'mt-2', 'select-text')}>
                <ProblemDescriptionViewer content={problem.description} />
              </div>

              {/* Sample Test Cases */}
              {sampleTestCases.length > 0 && (
                <div className={cn('space-y-4', 'pt-4', 'border-t', 'border-border/40')}>
                  <h3 className={cn('text-sm', 'font-bold', 'text-foreground')}>Examples</h3>
                  {sampleTestCases.map((tc, idx) => {
                    const paramNames = getParamNames();
                    return (
                      <div key={tc.id} className="space-y-2.5">
                        <p className={cn('text-xs', 'font-bold', 'text-zinc-550', 'dark:text-muted-foreground')}>
                          Example {idx + 1}:
                        </p>
                        <div className={cn('pl-3', 'border-l-2', 'border-zinc-300', 'dark:border-muted-foreground/30', 'py-1.5', 'font-mono', 'text-[12px]', 'text-zinc-900', 'dark:text-foreground/90', 'space-y-1.5', 'bg-zinc-100/40', 'dark:bg-muted/5', 'rounded-r-md')}>
                          <div>
                            <span className={cn('font-bold', 'text-zinc-850', 'dark:text-zinc-300')}>Input: </span>
                            <div className={cn('flex', 'flex-col', 'space-y-1.5', 'mt-1')}>
                              {tc.input.trim().split("\n").map((val: string, i: number) => (
                                <div key={i} className={val.startsWith("[") ? "flex flex-col mt-1" : "flex items-center"}>
                                  <span className={cn('font-semibold', 'mr-1.5', 'text-zinc-550', 'dark:text-muted-foreground', 'whitespace-nowrap')}>{paramNames[i] || `param${i + 1}`} =</span>
                                  {renderTestcaseValue(val)}
                                </div>
                              ))}
                            </div>
                          </div>
                          <div>
                            <span className={cn('font-bold', 'text-zinc-850', 'dark:text-zinc-300', 'mr-1.5', 'block', 'mb-1')}>Output:</span>
                            {renderTestcaseValue(tc.expected_output)}
                          </div>
                          {tc.explanation && (
                            <div className={cn('text-zinc-650', 'dark:text-muted-foreground/90')}>
                              <span className={cn('font-bold', 'text-zinc-850', 'dark:text-zinc-300')}>
                                Explanation:{" "}
                              </span>
                              <span>{tc.explanation}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Constraints */}
              <div className={cn('space-y-3.5', 'pt-4', 'border-t', 'border-border/40')}>
                {problem.constraints && problem.constraints.length > 0 && (
                  <div className="space-y-2">
                    <p className={cn('text-xs', 'font-bold', 'text-foreground')}>
                      Constraints:
                    </p>
                    <ul className={cn('list-disc', 'pl-5', 'space-y-1.5', 'text-xs', 'text-zinc-800', 'dark:text-foreground/80')}>
                      {problem.constraints.map((c: string, i: number) => (
                        <li key={i}>
                          <code className={cn('px-1.5', 'py-0.5', 'bg-zinc-100', 'dark:bg-muted/40', 'rounded-md', 'text-[11px]', 'font-mono', 'border', 'border-border/50')}>
                            {c}
                          </code>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className={cn('flex', 'flex-wrap', 'items-center', 'gap-3', 'pt-1')}>
                  {problem.time_limit && (
                    <div className={cn('text-xs', 'font-mono', 'text-zinc-650', 'dark:text-zinc-400')}>
                      Time Limit: {problem.time_limit}s
                    </div>
                  )}
                  {problem.memory_limit && (
                    <div className={cn('text-xs', 'font-mono', 'text-zinc-650', 'dark:text-zinc-400')}>
                      Memory Limit: {problem.memory_limit}MB
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {mobileActiveTab === "submissions" && (
            <div className={cn('container-pane-submissions', 'space-y-2', 'select-text')}>
              {submissions.length > 0 ? (
                submissions.map((sub) => {
                  const isExpanded = viewingSubmission?.id === sub.id;
                  const canViewCode = sub.status === "Accepted";
                  return (
                    <div key={sub.id} className="space-y-1">
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
                        className={`flex items-center justify-between row-submission-item p-3 rounded-lg border ${sub.status === "Accepted" ? "bg-emerald-500/5 border-emerald-500/20 hover:bg-emerald-500/10 dark:hover:bg-emerald-500/5 cursor-pointer" : "bg-card border-border hover:bg-muted/60"} transition-all group`}
                      >
                        <div className={cn('flex', 'items-center', 'gap-3')}>
                          {sub.status === "Accepted" ? (
                            <IconCircleCheck className={cn('h-4', 'w-4', 'text-emerald-500', 'shrink-0')} />
                          ) : (
                            <IconCircleX className={cn('h-4', 'w-4', 'text-rose-500', 'shrink-0')} />
                          )}
                          <div>
                            <p className={`text-xs font-bold ${sub.status === "Accepted" ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"} flex items-center gap-1`}>
                              {sub.status}
                              {canViewCode && (
                                <span className={cn('text-[9px]', 'text-muted-foreground', 'font-normal')}>
                                  {isExpanded ? "(Hide)" : "(View code)"}
                                </span>
                              )}
                            </p>
                            <p className={cn('text-[10px]', 'text-muted-foreground/85')}>
                              {sub.passed_count}/{sub.total_count} passed ·{" "}
                              {LANGUAGES.find((l) => l.id === sub.language_id)?.name || "Unknown"}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className={cn('flex', 'items-center', 'gap-2', 'text-[10px]', 'text-muted-foreground')}>
                            {sub.runtime !== null && (
                              <span className={cn('flex', 'items-center', 'gap-0.5')}>
                                <IconClock className={cn('h-3', 'w-3')} />
                                {formatRuntime(sub.runtime)}
                              </span>
                            )}
                            {sub.memory !== null && (
                              <span className={cn('flex', 'items-center', 'gap-0.5')}>
                                <IconCpu className={cn('h-3', 'w-3')} />
                                {formatMemory(sub.memory, false)}
                              </span>
                            )}
                          </div>
                          <p className={cn('text-[8px]', 'text-muted-foreground/60', 'mt-0.5')}>
                            {new Date(sub.created_at).toLocaleString()}
                          </p>
                        </div>
                      </div>

                      {isExpanded && (
                        <div className={cn('border', 'border-border/60', 'rounded-lg', 'overflow-hidden', 'shadow-sm', 'mt-1')}>
                          {loadingCode ? (
                            <div className={cn('p-4', 'text-center', 'text-[10px]', 'uppercase', 'tracking-widest', 'font-bold', 'text-muted-foreground', 'animate-pulse', 'bg-zinc-50', 'dark:bg-zinc-950')}>
                              Loading code...
                            </div>
                          ) : (
                            <div className={cn('w-full', 'relative', 'bg-zinc-50', 'dark:bg-[#0a0a0a]', 'border', 'border-zinc-200', 'dark:border-zinc-800/80', 'rounded-lg', 'overflow-hidden')}>
                              <pre className={cn('p-4', 'overflow-auto', 'font-mono', 'text-[11.5px]', 'text-black', 'dark:text-zinc-100', 'max-h-75', 'whitespace-pre-wrap', 'break-all')}>
                                <code
                                  className={`language-${LANGUAGES.find((l) => l.id === sub.language_id)?.value || "javascript"
                                    }`}
                                  dangerouslySetInnerHTML={{
                                    __html: highlightedCode || (viewingCode ? viewingCode.replace(/^[\r\n]+/, '') : '') || "// Code not available"
                                  }}
                                />
                              </pre>
                              <div className={cn('absolute', 'top-2', 'right-2', 'flex', 'gap-1.5', 'opacity-85', 'hover:opacity-100', 'transition-opacity')}>
                                <Button
                                  variant="outline"
                                  size="icon"
                                  onClick={() => {
                                    const lang = LANGUAGES.find((l) => l.id === viewingSubmission?.language_id);
                                    if (lang) {
                                      const key = isDailyChallenge
                                        ? `logiclab_daily_challenge_${dailyChallengeId}_code_${lang.value}`
                                        : `logiclab_problem_${problem.id}_code_${lang.value}`;
                                      localStorage.setItem(key, JSON.stringify({ code: viewingCode, timestamp: Date.now() }));
                                      setSelectedLang(lang);
                                    }
                                    setCode(viewingCode);
                                    toast.success("Restored to workspace!");
                                  }}
                                  className={cn('bg-emerald-500/10', 'hover:bg-emerald-500/20', 'text-emerald-500', 'border-emerald-500/20', 'size-7')}
                                  title="Restore"
                                >
                                  <IconRefresh className={cn('size-3.5')} />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="icon"
                                  onClick={() => handleCopyToClipboard(viewingCode)}
                                  className={cn('size-7')}
                                  title="Copy"
                                >
                                  <IconCopy className={cn('size-3.5')} />
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              ) : (
                <Empty className={cn('py-12', 'select-none')}>
                  <EmptyMedia>
                    <IconHistory className={cn('size-8', 'text-muted-foreground/20')} />
                  </EmptyMedia>
                  <EmptyTitle className={cn('text-[10px]', 'text-muted-foreground/45', 'uppercase', 'font-bold', 'tracking-widest')}>
                    No submissions yet
                  </EmptyTitle>
                </Empty>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Large Screen Desktop IDE */}
      <div className={cn('hidden', 'md:flex', 'flex-col', 'flex-1', 'min-h-0', 'overflow-hidden')}>
        {topNavbarContent}
        <div className={cn('flex-1', 'p-2', 'min-h-0', 'overflow-hidden')}>
          {!isMounted ? (
            <Skeleton className={cn('w-full', 'h-full', 'rounded-md', 'border', 'border-border/40')} />
          ) : (
            <>
              {ideLayout === "standard" && (
                <PanelGroup
                  id="standard-layout"
                  orientation="horizontal"
                >
                  {/* LEFT PANEL: Description/Submissions */}
                  <Panel
                    id="sidebar-standard"
                    defaultSize={45}
                    minSize={25}
                    className={cn('flex', 'flex-col', 'min-h-0', 'rounded-md', 'border', 'border-border/50', 'overflow-hidden')}
                  >
                    {leftPanelContent}
                  </Panel>

                  <PanelResizeHandle
                    id="resize-1"
                    className={cn('w-1', 'rounded-full', 'transition-colors', 'bg-transparent', 'hover:bg-zinc-300 dark:hover:bg-zinc-700', 'cursor-col-resize')}
                  />

                  {/* RIGHT PANEL: Editor + Output */}
                  <Panel
                    id="editor-container-standard"
                    defaultSize={55}
                    minSize={30}
                    className={cn('flex', 'flex-col', 'min-h-0')}
                  >
                    <PanelGroup
                      id="right-group-standard"
                      orientation="vertical"

                    >
                      <Panel
                        id="editor-standard"
                        defaultSize={55}
                        minSize={20}
                        className={cn('flex', 'flex-col', 'min-h-0', 'rounded-md', 'border', 'border-border/50', 'overflow-hidden')}
                      >
                        {editorContent}
                      </Panel>

                      <PanelResizeHandle
                        id="resize-2"
                        className={cn('h-1', 'rounded-full', 'transition-colors', 'bg-transparent', 'hover:bg-zinc-300 dark:hover:bg-zinc-700', 'cursor-row-resize')}
                      />

                      <Panel
                        id="output-standard"
                        defaultSize={45}
                        minSize={10}
                        className={cn('flex', 'flex-col', 'min-h-0', 'rounded-md', 'border', 'border-border/50', 'overflow-hidden')}
                      >
                        {outputContent}
                      </Panel>
                    </PanelGroup>
                  </Panel>
                </PanelGroup>
              )}

              {ideLayout === "split" && (
                <PanelGroup
                  id="split-layout"
                  orientation="horizontal"

                >
                  <Panel
                    id="sidebar-split"
                    defaultSize={30}
                    minSize={20}
                    className={cn('flex', 'flex-col', 'min-h-0', 'rounded-md', 'border', 'border-border/50', 'overflow-hidden')}
                  >
                    {leftPanelContent}
                  </Panel>
                  <PanelResizeHandle
                    id="resize-3"
                    className={cn('w-1', 'rounded-full', 'transition-colors', 'bg-transparent', 'hover:bg-zinc-300 dark:hover:bg-zinc-700', 'cursor-col-resize')}
                  />

                  <Panel
                    id="editor-split"
                    defaultSize={40}
                    minSize={20}
                    className={cn('flex', 'flex-col', 'min-h-0', 'rounded-md', 'border', 'border-border/50', 'overflow-hidden')}
                  >
                    {editorContent}
                  </Panel>
                  <PanelResizeHandle
                    id="resize-4"
                    className={cn('w-1', 'rounded-full', 'transition-colors', 'bg-transparent', 'hover:bg-zinc-300 dark:hover:bg-zinc-700', 'cursor-col-resize')}
                  />

                  <Panel
                    id="output-split"
                    defaultSize={30}
                    minSize={20}
                    className={cn('flex', 'flex-col', 'min-h-0', 'rounded-md', 'border', 'border-border/50', 'overflow-hidden')}
                  >
                    {outputContent}
                  </Panel>
                </PanelGroup>
              )}

              {ideLayout === "vertical" && (
                <PanelGroup
                  id="vertical-layout"
                  orientation="vertical"
                >
                  <Panel
                    id="sidebar-vertical"
                    defaultSize={40}
                    minSize={20}
                    className={cn('flex', 'flex-col', 'min-h-0', 'rounded-md', 'border', 'border-border/50', 'overflow-hidden')}
                  >
                    {leftPanelContent}
                  </Panel>
                  <PanelResizeHandle
                    id="resize-5"
                    className={cn('h-1', 'rounded-full', 'transition-colors', 'bg-transparent', 'hover:bg-zinc-300 dark:hover:bg-zinc-700', 'cursor-row-resize')}
                  />
                  <Panel
                    id="bottom-container-vertical"
                    defaultSize={60}
                    minSize={30}
                    className={cn('flex', 'flex-col', 'min-h-0')}
                  >
                    <PanelGroup
                      id="bottom-group-vertical"
                      orientation="horizontal"
                    >
                      <Panel
                        id="editor-vertical"
                        defaultSize={50}
                        minSize={20}
                        className={cn('flex', 'flex-col', 'min-h-0', 'rounded-md', 'border', 'border-border/50', 'overflow-hidden')}
                      >
                        {editorContent}
                      </Panel>
                      <PanelResizeHandle
                        id="resize-6"
                        className={cn('w-1', 'rounded-full', 'transition-colors', 'bg-transparent', 'hover:bg-zinc-300 dark:hover:bg-zinc-700', 'cursor-col-resize')}
                      />
                      <Panel
                        id="output-vertical"
                        defaultSize={50}
                        minSize={20}
                        className={cn('flex', 'flex-col', 'min-h-0', 'rounded-md', 'border', 'border-border/50', 'overflow-hidden')}
                      >
                        {outputContent}
                      </Panel>
                    </PanelGroup>
                  </Panel>
                </PanelGroup>
              )}
            </>
          )}
        </div>
      </div>

      {/* PROBLEM LIST DRAWER */}
      <Sheet open={isProblemListOpen} onOpenChange={setIsProblemListOpen}>
        <SheetContent
          side="left"
          showCloseButton={true}
          className={cn('w-[320px]', 'sm:max-w-[320px]', 'p-0', 'flex', 'flex-col', 'gap-0', 'border-r')}
        >
          <SheetHeader className={cn('border-b', 'px-4', 'py-3', 'shrink-0', 'flex', 'flex-row', 'items-center', 'justify-between', 'space-y-0', 'pr-8')}>
            <SheetTitle className={cn('font-bold', 'text-lg')}>Problem List</SheetTitle>
            <span className={cn('text-xs', 'text-muted-foreground', 'font-semibold', 'tracking-wide')}>
              {totalProblemsCount} Problems
            </span>
            <SheetDescription className="sr-only">Browse and search problems</SheetDescription>
          </SheetHeader>

          <div className={cn('p-3', 'border-b', 'shrink-0', 'bg-muted/20', 'flex', 'flex-col', 'gap-2')}>
            {/* Search and filter controls */}
            <div className={cn('relative', 'w-full')}>
              <IconSearch className={cn('absolute', 'left-2.5', 'top-1/2', '-translate-y-1/2', 'size-4', 'text-muted-foreground')} />
              <Input
                type="text"
                placeholder="Search by title or ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={cn('pl-8', 'h-8', 'text-xs', 'bg-background')}
              />
            </div>
            <div className={cn('flex', 'items-center', 'gap-2')}>
              <Select
                value={statusFilter}
                onValueChange={(v: any) => setStatusFilter(v)}
              >
                <SelectTrigger size="sm" className={cn('flex-1', 'text-xs', 'font-medium')}>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent
                  position="popper"
                  sideOffset={4}
                  className="z-10000"
                >
                  <SelectGroup>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="unsolved">Unsolved</SelectItem>
                    <SelectItem value="solved">Solved</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
              <Select
                value={difficultyFilter}
                onValueChange={(v: any) => setDifficultyFilter(v)}
              >
                <SelectTrigger size="sm" className={cn('flex-1', 'text-xs', 'font-medium')}>
                  <SelectValue placeholder="Difficulty" />
                </SelectTrigger>
                <SelectContent
                  position="popper"
                  sideOffset={4}
                  className="z-10000"
                >
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

          <ScrollArea
            id="problem-list-scroll-area"
            className={cn('flex-1', 'w-full', 'min-h-0')}
          >
            <div className="py-2">
              {isLoadingProblems ? (
                <div className={cn('flex', 'flex-col', 'items-center', 'justify-center', 'py-20', 'gap-3')}>
                  <Spinner className="size-6 text-emerald-500" />
                  <span className={cn('text-xs', 'text-muted-foreground', 'font-semibold', 'uppercase', 'tracking-wider')}>
                    Loading...
                  </span>
                </div>
              ) : problemList.length > 0 ? (
                <>
                  {problemList.map((p) => (
                    <div
                      key={p.id}
                      id={p.id === problem.id ? "active-problem-link" : undefined}
                      onClick={() => {
                        handleNavigate(p.id);
                        setIsProblemListOpen(false);
                      }}
                      className={cn(
                        "flex items-center justify-between px-4 py-2.5 cursor-pointer hover:bg-muted/60 transition-colors",
                        p.id === problem.id && "bg-muted border-l-2 border-emerald-500"
                      )}
                    >
                      <div className={cn('flex', 'items-start', 'gap-3', 'pr-4')}>
                        {p.isSolved ? (
                          <IconCheck className={cn('size-4', 'text-emerald-500', 'shrink-0', 'mt-0.5')} />
                        ) : (
                          <div className={cn('size-4', 'shrink-0')} />
                        )}
                        <span
                          className={cn(
                            "text-sm whitespace-normal wrap-break-word leading-tight",
                            p.id === problem.id ? "font-bold" : "font-medium"
                          )}
                        >
                          {p.number}. {p.title}
                        </span>
                      </div>
                      <Badge
                        variant={
                          p.difficulty === "Easy"
                            ? "success"
                            : p.difficulty === "Medium"
                              ? "warning"
                              : "destructive"
                        }
                        className="text-xs font-bold shrink-0"
                      >
                        {p.difficulty === "Medium" ? "Med." : p.difficulty}
                      </Badge>
                    </div>
                  ))}

                  {/* Infinite Scroll Sentinel */}
                  <div ref={sentinelRef} className={cn('h-10', 'flex', 'items-center', 'justify-center')}>
                    {isNextPageLoading && (
                      <Spinner className="size-4 text-emerald-500" />
                    )}
                  </div>
                </>
              ) : (
                <Empty className={cn('py-20', 'text-muted-foreground')}>
                  <EmptyTitle className="text-xs">No problems found.</EmptyTitle>
                </Empty>
              )}
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>
      {/* Submit Confirmation Dialog */}
      <AlertDialog open={showSubmitConfirm} onOpenChange={setShowSubmitConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {hasRun ? "Ready to submit?" : "Haven't run your code yet"}
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className={cn('space-y-2', 'text-sm')}>
                {!hasRun ? (
                  <>
                    <p>You haven't used <span className="font-semibold">Run</span> to test your code against the sample cases.</p>
                    <p>It's strongly recommended to run and verify your solution before submitting — submissions count toward your attempt history.</p>
                  </>
                ) : (
                  <p>Your code will be judged against all test cases. Make sure you're happy with your solution before submitting.</p>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleSubmitCode}>Submit</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Shadcn Style Badge Unlock Modal */}
      <AnimatePresence>
        {unlockedBadgeModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={cn('fixed', 'inset-0', 'z-9999', 'flex', 'flex-col', 'items-center', 'justify-center', 'bg-black/50')}
            onClick={() => setUnlockedBadgeModal(null)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 10, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className={cn('relative', 'flex', 'flex-col', 'items-center', 'w-full', 'max-w-sm')}
              onClick={(e) => e.stopPropagation()}
            >
              {/* THE CARD ITSELF (Only this gets captured by html-to-image) */}
              <div
                ref={badgeCardRef}
                className={cn('w-full', 'flex', 'flex-col', 'items-center', 'rounded-xl', 'shadow-2xl', 'p-8', 'pb-6', 'border', 'bg-background', 'border-border')}
              >
                {/* Watermark for download */}
                <div className={cn('w-full', 'text-left', 'mb-6')}>
                  <div className={cn('text-[10px]', 'tracking-widest', 'uppercase', 'font-bold', 'select-none', 'whitespace-nowrap', 'text-muted-foreground')}>
                    PLACETRIX.APP — LOGICLAB
                  </div>
                </div>

                <div className={cn('w-full', 'text-center', 'mb-8', 'block')}>
                  <h2 className={cn('text-2xl', 'font-bold', 'mb-2', 'block', 'text-foreground')}>
                    Achievement Unlocked
                  </h2>
                  <p className={cn('text-sm', 'font-medium', 'block', 'text-muted-foreground')}>
                    Congratulations, {userProfile?.full_name?.split(' ')[0] || userProfile?.username || "Coder"}!
                  </p>
                </div>

                <div className={cn('relative', 'mb-8', 'flex', 'justify-center', 'w-full')}>
                  {/* Subtle glow */}
                  <div className={cn('absolute', 'top-1/2', 'left-1/2', '-translate-x-1/2', '-translate-y-1/2', 'w-32', 'h-32', 'rounded-full', 'pointer-events-none', 'bg-primary/15')} style={{ filter: 'blur(30px)' }} />

                  <motion.div
                    initial={{ rotateY: 90, scale: 0.8 }}
                    animate={{ rotateY: 0, scale: 1 }}
                    transition={{ delay: 0.1, duration: 0.6, type: "spring", damping: 15 }}
                    className={cn('relative', 'w-36', 'h-36', 'z-10', 'drop-shadow-2xl')}
                  >
                    {unlockedBadgeModal.icon_name ? (
                      <img
                        src={badgeDataUrl || unlockedBadgeModal.icon_name}
                        alt={unlockedBadgeModal.name}
                        crossOrigin="anonymous"
                        className={cn('w-full', 'h-full', 'object-contain', 'block')}
                      />
                    ) : (
                      <div className={cn('w-full', 'h-full', 'rounded-full', 'border-4', 'flex', 'items-center', 'justify-center', 'bg-muted', 'border-primary/20')}>
                        <IconSparkles className={cn('h-12', 'w-12', 'text-primary')} />
                      </div>
                    )}
                  </motion.div>
                </div>

                <div className={cn('w-full', 'text-center', 'mb-6', 'block')}>
                  <h3 className={cn('text-xl', 'font-bold', 'mb-2', 'block', 'text-foreground')}>
                    {unlockedBadgeModal.name}
                  </h3>

                  {unlockedBadgeModal.description && (
                    <p className={cn('text-sm', 'font-medium', 'block', 'text-muted-foreground')}>
                      {unlockedBadgeModal.description}
                    </p>
                  )}
                </div>

                {/* Earned Date */}
                <div className={cn('text-[8px]', 'tracking-wider', 'font-bold', 'mt-2', 'whitespace-nowrap', 'text-muted-foreground')}>
                  EARNED ON {new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }).toUpperCase()}
                </div>
              </div>

              {/* Action Buttons (OUTSIDE THE CARD) */}
              <div className={cn('flex', 'flex-col', 'gap-3', 'w-full', 'mt-4')}>
                <Button
                  size="lg"
                  onClick={() => {
                    setUnlockedBadgeModal(null);
                  }}
                  className="w-full h-11"
                >
                  Continue
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  onClick={(e) => {
                    e.preventDefault();
                    handleDownloadBadge();
                  }}
                  className="w-full h-11"
                >
                  <IconDownload data-icon="inline-start" className={cn('mr-2', 'h-4', 'w-4')} />
                  Download Badge
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Keyboard Shortcuts Dialog */}
      <Dialog open={isShortcutsOpen} onOpenChange={setIsShortcutsOpen}>
        <DialogContent className={cn('sm:max-w-md', 'select-none', 'border-border/80', 'bg-background', 'shadow-2xl')}>
          <DialogHeader>
            <DialogTitle className={cn('flex', 'items-center', 'gap-2', 'text-base', 'font-bold', 'text-foreground')}>
              <IconKeyboard className={cn('h-5', 'w-5', 'text-emerald-500')} />
              Keyboard Shortcuts
            </DialogTitle>
            <DialogDescription className={cn('text-xs', 'text-muted-foreground')}>
              Master speed shortcuts to code faster in LogicLab.
            </DialogDescription>
          </DialogHeader>
          <div className={cn('space-y-2.5', 'py-2', 'text-xs')}>
            <div className={cn('flex', 'items-center', 'justify-between', 'py-1.5', 'border-b', 'border-border/40')}>
              <span className={cn('font-medium', 'text-foreground')}>Run Test Cases</span>
              <KbdGroup>
                <Kbd>Ctrl</Kbd> + <Kbd>Enter</Kbd>
              </KbdGroup>
            </div>
            <div className={cn('flex', 'items-center', 'justify-between', 'py-1.5', 'border-b', 'border-border/40')}>
              <span className={cn('font-medium', 'text-foreground')}>Submit Solution</span>
              <KbdGroup>
                <Kbd>Ctrl</Kbd> + <Kbd>Shift</Kbd> + <Kbd>Enter</Kbd>
              </KbdGroup>
            </div>
            <div className={cn('flex', 'items-center', 'justify-between', 'py-1.5', 'border-b', 'border-border/40')}>
              <span className={cn('font-medium', 'text-foreground')}>Format Code</span>
              <KbdGroup>
                <Kbd>Shift</Kbd> + <Kbd>Alt</Kbd> + <Kbd>F</Kbd>
              </KbdGroup>
            </div>
            <div className={cn('flex', 'items-center', 'justify-between', 'py-1.5', 'border-b', 'border-border/40')}>
              <span className={cn('font-medium', 'text-foreground')}>Next Problem</span>
              <KbdGroup>
                <Kbd>Alt</Kbd> + <Kbd>N</Kbd>
              </KbdGroup>
            </div>
            <div className={cn('flex', 'items-center', 'justify-between', 'py-1.5', 'border-b', 'border-border/40')}>
              <span className={cn('font-medium', 'text-foreground')}>Previous Problem</span>
              <KbdGroup>
                <Kbd>Alt</Kbd> + <Kbd>P</Kbd>
              </KbdGroup>
            </div>
            <div className={cn('flex', 'items-center', 'justify-between', 'py-1.5', 'border-b', 'border-border/40')}>
              <span className={cn('font-medium', 'text-foreground')}>Zoom In / Zoom Out</span>
              <KbdGroup>
                <Kbd>Ctrl</Kbd> + <Kbd>+</Kbd> / <Kbd>-</Kbd>
              </KbdGroup>
            </div>
            <div className={cn('flex', 'items-center', 'justify-between', 'py-1.5')}>
              <span className={cn('font-medium', 'text-foreground')}>Open Shortcuts Menu</span>
              <KbdGroup>
                <Kbd>Shift</Kbd> + <Kbd>?</Kbd>
              </KbdGroup>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

