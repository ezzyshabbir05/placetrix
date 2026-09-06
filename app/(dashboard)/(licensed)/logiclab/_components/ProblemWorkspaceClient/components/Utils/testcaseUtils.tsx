import React from "react";
import { cn } from "@/lib/utils";
import { LANGUAGES } from "@/app/(dashboard)/(licensed)/logiclab/_constants";

// Robust memory usage display formatter
export const formatMemory = (
  memKbOrMb: number | string | undefined | null,
  isAlreadyMb = false,
): string => {
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
export const formatRuntime = (runtimeMs: number | string | undefined | null): string => {
  if (runtimeMs === undefined || runtimeMs === null) return "—";
  const val = typeof runtimeMs === "string" ? parseFloat(runtimeMs) : runtimeMs;
  if (isNaN(val) || val < 0) return "0 ms";
  if (val >= 1000) {
    return `${(val / 1000).toFixed(2)}s`;
  }
  return `${Math.round(val)} ms`;
};

// Truncate huge text outputs to prevent browser freezing
export const truncateText = (text: string | null | undefined, limit = 5000): string => {
  if (!text) return "";
  if (text.length <= limit) return text;
  return (
    text.slice(0, limit) +
    `\n\n...[truncated ${text.length - limit} characters]`
  );
};

// Formatter for error diagnostics with line offset mapping
export const formatErrorDiagnostic = (
  text: string | null | undefined,
  lineOffset = 0,
  langName = ""
): string => {
  if (!text) return "";
  let formatted = text;
  const lowerLang = langName.toLowerCase();

  if (lineOffset > 0) {
    if (lowerLang.includes("python")) {
      formatted = formatted.replace(/(File ".*?", line )(\d+)/g, (match, prefix, line) => {
        return `${prefix}${Math.max(1, parseInt(line, 10) - lineOffset)}`;
      });
    } else if (lowerLang.includes("c++") || lowerLang.includes("c (gcc)")) {
      formatted = formatted.replace(/(script\.cpp:|script\.c:|:\s*)(\d+)/g, (match, prefix, line) => {
        return `${prefix}${Math.max(1, parseInt(line, 10) - lineOffset)}`;
      });
    } else if (lowerLang.includes("java")) {
      formatted = formatted.replace(/(Main\.java:|Solution\.java:)(\d+)/g, (match, prefix, line) => {
        return `${prefix}${Math.max(1, parseInt(line, 10) - lineOffset)}`;
      });
    } else if (lowerLang.includes("javascript") || lowerLang.includes("typescript")) {
      formatted = formatted.replace(/(script\.[jt]s:|:\s*)(\d+)/g, (match, prefix, line) => {
        return `${prefix}${Math.max(1, parseInt(line, 10) - lineOffset)}`;
      });
    }
  }

  formatted = formatted.replace(/File ".*?script\.py"/g, 'File "main.py"');
  formatted = formatted.replace(/script\.cpp:/g, "main.cpp:");
  formatted = formatted.replace(/Main\.java:/g, "Main.java:");
  formatted = formatted.replace(/script\.js:/g, "main.js:");
  formatted = formatted.replace(/script\.ts:/g, "main.ts:");

  return formatted;
};

// Render structured test case values (1D, 2D arrays, primitives, strings)
export const renderTestcaseValue = (valStr: string): React.ReactNode => {
  try {
    const parsed = JSON.parse(valStr);

    // 2D Array
    if (Array.isArray(parsed) && parsed.length > 0 && Array.isArray(parsed[0])) {
      return (
        <div className={cn("mt-2 mb-3 overflow-x-auto w-full")}>
          <div className={cn("inline-flex flex-col items-center gap-0.5 py-1")}>
            {parsed.map((row, i) => (
              <div key={i} className={cn("flex gap-0.5")}>
                {Array.isArray(row) ? (
                  row.map((cell: any, j: number) => (
                    <div
                      key={j}
                      className={cn(
                        "flex items-center justify-center min-w-10 h-9 px-2 bg-card border border-border/70 rounded-md font-mono text-[14px] text-foreground shadow-xs"
                      )}
                    >
                      {(typeof cell === "string" && cell === ".") || cell === null ? (
                        <span className="text-muted-foreground/60">{cell === null ? "null" : "."}</span>
                      ) : (
                        String(cell)
                      )}
                    </div>
                  ))
                ) : (
                  <div
                    className={cn(
                      "flex items-center justify-center h-9 px-3 bg-card border border-border/70 rounded-md font-mono text-[14px] text-foreground shadow-xs"
                    )}
                  >
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
        return <span className="font-mono text-muted-foreground">[]</span>;
      }
      return (
        <div className={cn("mt-2 mb-3 overflow-x-auto w-full")}>
          <div className={cn("inline-flex flex-row gap-0.5 py-1")}>
            {parsed.map((cell: any, j: number) => (
              <div
                key={j}
                className={cn(
                  "flex items-center justify-center min-w-10 h-9 px-2 bg-card border border-border/70 rounded-md font-mono text-[14px] text-foreground shadow-xs"
                )}
              >
                {(typeof cell === "string" && cell === ".") || cell === null ? (
                  <span className="text-muted-foreground/60">{cell === null ? "null" : "."}</span>
                ) : (
                  String(cell)
                )}
              </div>
            ))}
          </div>
        </div>
      );
    }

    // Fallback for strings and primitives
    if (typeof parsed === "string") {
      return (
        <span className="break-all whitespace-pre-wrap font-mono text-emerald-600 dark:text-emerald-400 font-medium">
          "{parsed}"
        </span>
      );
    }

    if (typeof parsed === "boolean") {
      return <span className="font-mono text-blue-600 dark:text-blue-400 font-medium">{String(parsed)}</span>;
    }
    if (typeof parsed === "number") {
      return <span className="font-mono text-amber-600 dark:text-amber-400 font-medium">{String(parsed)}</span>;
    }
  } catch {
    // If parsing fails, render raw string
  }
  return <span className="break-all whitespace-pre-wrap">{valStr}</span>;
};

// Helper to extract parameter names from boilerplate code
export const extractParamNames = (boilerplate: string, langValue: string): string[] => {
  try {
    if (!boilerplate) return ["nums"];

    // Parse Python parameters
    if (langValue === "python") {
      const match = boilerplate.match(/def\s+\w+\((self,\s*)?([^)]*)\)/);
      if (match && match[2]) {
        return match[2]
          .split(",")
          .map((p: string) => p.split(":")[0].trim())
          .filter(Boolean);
      }
    }
    // Parse JS/TS parameters
    if (langValue === "javascript" || langValue === "typescript") {
      const match = boilerplate.match(/(class\s+\w+|\w+)\s*\{\s*\w*\s*\(([^)]*)\)/);
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
    if (langValue === "cpp") {
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
    if (langValue === "java") {
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

// Algorithmic complexity heuristic analyzer
export const analyzeCodeComplexity = (codeStr: string, langVal: string): string => {
  if (!codeStr) return "O(1)";
  const clean = codeStr.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*/g, "").replace(/#.*/g, "");
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
  const hasBinarySearch =
    normalized.includes("binarysearch") ||
    (normalized.includes("mid =") && (normalized.includes("/ 2") || normalized.includes(">> 1"))) ||
    (normalized.includes("low <=") && normalized.includes("high ="));
  const hasSort =
    normalized.includes(".sort(") || normalized.includes("sort(") || normalized.includes("sorted(");

  if (maxDepth >= 2) return "O(N²)";
  if (maxDepth === 1) {
    if (hasBinarySearch) return "O(log N)";
    if (hasSort) return "O(N log N)";
    return "O(N)";
  }
  if (hasBinarySearch) return "O(log N)";
  if (hasSort) return "O(N log N)";
  return "O(1)";
};

// Prism lazy loader for historical syntax highlighting
let prismReady: Promise<typeof import("prismjs")> | null = null;
export function loadPrism() {
  if (!prismReady) {
    prismReady = import("prismjs").then(async (mod) => {
      await Promise.all([
        import("prismjs/components/prism-java" as any),
        import("prismjs/components/prism-python" as any),
        import("prismjs/components/prism-c" as any),
        import("prismjs/components/prism-cpp" as any),
        import("prismjs/components/prism-javascript" as any),
        import("prismjs/components/prism-typescript" as any),
      ]);
      return mod;
    });
  }
  return prismReady;
}

export const getHighlightedCode = async (codeText: string, langId: number): Promise<string> => {
  const langObj = LANGUAGES.find((l: any) => l.id === langId);
  let lang = langObj ? langObj.value : "javascript";

  if (lang === "js") lang = "javascript";
  if (lang === "ts") lang = "typescript";
  if (lang === "py") lang = "python";
  if (lang === "c++") lang = "cpp";

  try {
    const Prism = await loadPrism();
    if (Prism.languages[lang]) {
      return Prism.highlight(codeText, Prism.languages[lang], lang);
    }
    return Prism.highlight(codeText, Prism.languages.javascript, "javascript");
  } catch {
    return codeText.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }
};
