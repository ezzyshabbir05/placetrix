import React, { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { formatCodeAction } from "@/app/(dashboard)/(licensed)/logiclab/actions";
import { Language, IdeSettings } from "@/app/(dashboard)/(licensed)/logiclab/_types";
import { LANGUAGES } from "@/app/(dashboard)/(licensed)/logiclab/_constants";

interface UseCodeEditorProps {
  problemId: string;
  parsedBoilerplates: Record<string, string>;
  isDailyChallenge?: boolean;
  dailyChallengeId?: string;
  runResult: any;
  submitResult: any;
  ideSettings: IdeSettings;
}

export function useCodeEditor({
  problemId,
  parsedBoilerplates,
  isDailyChallenge = false,
  dailyChallengeId,
  runResult,
  submitResult,
  ideSettings,
}: UseCodeEditorProps) {
  const [selectedLang, setSelectedLang] = useState<Language>(LANGUAGES[0]);
  const selectedLangRef = useRef<Language>(LANGUAGES[0]);
  const [code, setCode] = useState<string>("");
  const [cursorPos, setCursorPos] = useState({ line: 1, col: 1 });
  const [saveStatus, setSaveStatus] = useState<"Saved" | "Saving..." | "Unsaved" | "">("Saved");

  const editorRef = useRef<any>(null);
  const monacoRef = useRef<any>(null);
  const errorDecorationsRef = useRef<any>(null);

  // Load preferred language from localStorage on mount
  useEffect(() => {
    try {
      const savedLang = localStorage.getItem("logiclab_preferred_language");
      if (savedLang) {
        const lang = LANGUAGES.find((l: any) => l.value === savedLang);
        if (lang) {
          setSelectedLang(lang);
        }
      }
    } catch {
      // Ignore localStorage errors
    }
  }, []);

  useEffect(() => {
    selectedLangRef.current = selectedLang;
  }, [selectedLang]);

  // Load code from local storage (with 7-day expiration) or fallback to boilerplate
  useEffect(() => {
    const key = isDailyChallenge
      ? `logiclab_daily_challenge_${dailyChallengeId}_code_${selectedLang.value}`
      : `logiclab_problem_${problemId}_code_${selectedLang.value}`;

    const savedData = localStorage.getItem(key);
    let loadedCode = null;
    if (savedData) {
      try {
        const parsed = JSON.parse(savedData);
        if (
          parsed.code &&
          parsed.timestamp &&
          Date.now() - parsed.timestamp < 7 * 24 * 60 * 60 * 1000
        ) {
          loadedCode = parsed.code;
        }
      } catch {
        // Ignore legacy plain-text format
      }
    }

    if (loadedCode) {
      setCode(loadedCode);
    } else {
      setCode(
        parsedBoilerplates[String(selectedLang.id)] ||
          `// Write your ${selectedLang.name} solution here\n`
      );
    }
  }, [
    problemId,
    dailyChallengeId,
    isDailyChallenge,
    selectedLang.id,
    selectedLang.name,
    selectedLang.value,
    parsedBoilerplates,
  ]);

  // Debounced auto-save code to local storage
  useEffect(() => {
    if (!code) return;

    const timeoutId = setTimeout(() => {
      setSaveStatus("Saving...");

      setTimeout(() => {
        const key = isDailyChallenge
          ? `logiclab_daily_challenge_${dailyChallengeId}_code_${selectedLang.value}`
          : `logiclab_problem_${problemId}_code_${selectedLang.value}`;
        try {
          localStorage.setItem(
            key,
            JSON.stringify({
              code,
              timestamp: Date.now(),
            })
          );
          setSaveStatus("Saved");
        } catch {
          setSaveStatus("Unsaved");
        }
      }, 350);
    }, 2000);

    return () => clearTimeout(timeoutId);
  }, [code, problemId, dailyChallengeId, isDailyChallenge, selectedLang.value]);

  // Sync editor options
  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.updateOptions({
        fontSize: ideSettings.fontSize,
        wordWrap: ideSettings.wordWrap,
      });
    }
  }, [ideSettings.fontSize, ideSettings.wordWrap]);

  const handleLangChange = (langVal: string) => {
    // Immediately persist current code before switching
    if (code) {
      try {
        const currentKey = isDailyChallenge
          ? `logiclab_daily_challenge_${dailyChallengeId}_code_${selectedLang.value}`
          : `logiclab_problem_${problemId}_code_${selectedLang.value}`;
        localStorage.setItem(
          currentKey,
          JSON.stringify({
            code,
            timestamp: Date.now(),
          })
        );
      } catch {}
    }

    const lang = LANGUAGES.find((l: any) => l.value === langVal);
    if (lang) {
      setSelectedLang(lang);
      try {
        localStorage.setItem("logiclab_preferred_language", langVal);
      } catch {}
    }
  };

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
          const provider = monaco.languages.registerDocumentFormattingEditProvider(currentLang, {
            provideDocumentFormattingEdits() {
              return [
                {
                  range: model.getFullModelRange(),
                  text: data.code,
                },
              ];
            },
          });
          await editor.getAction("editor.action.formatDocument").run();
          provider.dispose();
          toast.success("Code formatted");
        } else {
          setCode(data.code);
          toast.success("Code formatted");
        }
      }
    } catch (err) {
      console.error("Format error", err);
      toast.error("Failed to format code.");
    }
  };

  const jumpToEditorLine = (lineNum: number) => {
    if (!editorRef.current || !lineNum || lineNum <= 0) return;
    try {
      editorRef.current.revealLineInCenter(lineNum);
      editorRef.current.setPosition({ lineNumber: lineNum, column: 1 });
      editorRef.current.focus();
    } catch {}
  };

  // Editor error line highlighting
  useEffect(() => {
    if (!editorRef.current || !monacoRef.current) return;
    const editor = editorRef.current;
    const monaco = monacoRef.current;

    let errorLine: number | null = null;
    let errorText = "";

    const extractErrorLine = (text: string, langName: string) => {
      if (!text) return null;
      const lower = langName.toLowerCase();
      if (lower.includes("python")) {
        const match = text.match(/line (\d+)/i);
        if (match) return parseInt(match[1], 10);
      } else if (lower.includes("c++") || lower.includes("c (gcc)")) {
        const match = text.match(/script\.cpp:(\d+):/i) || text.match(/script\.c:(\d+):/i);
        if (match) return parseInt(match[1], 10);
      } else if (lower.includes("java")) {
        const match = text.match(/Main\.java:(\d+):/i) || text.match(/Solution\.java:(\d+):/i);
        if (match) return parseInt(match[1], 10);
      } else if (lower.includes("javascript") || lower.includes("typescript")) {
        const match = text.match(/script\.[jt]s:(\d+)/i) || text.match(/:\s*(\d+):\d+/i);
        if (match) return parseInt(match[1], 10);
      }
      return null;
    };

    let targetText = "";
    let lineOffset = 0;
    if (
      submitResult?.status === "Compile Error" ||
      submitResult?.status?.includes("Runtime Error")
    ) {
      targetText =
        submitResult.compile_output ||
        submitResult.failed_test_case_info?.actual ||
        submitResult.stderr ||
        "";
      lineOffset = submitResult.lineOffset || 0;
    } else if (runResult && !runResult.success) {
      lineOffset = runResult.lineOffset || 0;
      if (runResult.compile_output || runResult.stderr) {
        targetText = runResult.compile_output || runResult.stderr || "";
      } else if (runResult.cases && runResult.cases.length > 0) {
        const failedCase = runResult.cases.find(
          (c: any) => !c.passed && (c.compile_output || c.stderr)
        );
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
            className: "monaco-error-line-bg",
            marginClassName: "monaco-error-line-number",
          },
        },
        {
          range: new monaco.Range(errorLine, 1, errorLine, 100),
          options: {
            inlineClassName:
              "decoration-rose-500 decoration-wavy underline decoration-[1.5px] underline-offset-2",
            hoverMessage: { value: "```text\n" + errorText + "\n```" },
          },
        },
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
          errorDecorationsRef.current = editor.deltaDecorations(
            errorDecorationsRef.current,
            newDecorations
          );
        }
      }
    } else {
      clearDecorations();
    }
  }, [submitResult, runResult, selectedLang]);

  // Clear decorations when code changes
  useEffect(() => {
    if (errorDecorationsRef.current && editorRef.current) {
      if (editorRef.current.createDecorationsCollection) {
        errorDecorationsRef.current.clear();
      } else {
        editorRef.current.deltaDecorations(errorDecorationsRef.current, []);
      }
      errorDecorationsRef.current = null;
    }
  }, [code]);

  return {
    selectedLang,
    setSelectedLang,
    code,
    setCode,
    cursorPos,
    setCursorPos,
    saveStatus,
    editorRef,
    monacoRef,
    handleLangChange,
    handleFormatCode,
    jumpToEditorLine,
  };
}
