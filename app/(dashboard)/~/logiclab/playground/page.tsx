"use client"

import React, { useState, useEffect } from "react"
import Editor from "@monaco-editor/react"
import { useTheme } from "next-themes"
import {
  IconTerminal2,
  IconPlayerPlay,
  IconRefresh,
  IconCopy,
  IconCircleCheck,
  IconCircleX,
  IconClock,
  IconCpu,
  IconCheck,
  IconAlertTriangle,
  IconInfoCircle,
  IconArrowLeft,
} from "@tabler/icons-react"
import { toast } from "sonner"
import Link from "next/link"

const LANGUAGES = [
  { id: 71, name: "Python 3", value: "python", extension: "py" },
  { id: 63, name: "JavaScript (Node.js)", value: "javascript", extension: "js" },
  { id: 54, name: "C++ (GCC 9.2)", value: "cpp", extension: "cpp" },
  { id: 62, name: "Java (OpenJDK 13)", value: "java", extension: "java" },
]

const CODE_TEMPLATES: Record<string, string> = {
  python: `# LogicLab Python Sandbox
def main():
    print("Welcome to LogicLab!")
    try:
        user_input = input("Enter something: ")
        print(f"You entered: {user_input}")
    except EOFError:
        print("No stdin input provided.")

if __name__ == "__main__":
    main()
`,
  javascript: `// LogicLab JavaScript Sandbox
console.log("Welcome to LogicLab!");

const fs = require('fs');
try {
    const input = fs.readFileSync(0, 'utf-8').trim();
    if (input) console.log("Input received:\\n" + input);
} catch (e) { /* no input */ }
`,
  cpp: `// LogicLab C++ Sandbox
#include <iostream>
#include <string>
using namespace std;

int main() {
    cout << "Welcome to LogicLab!" << endl;
    string line;
    if (getline(cin, line)) {
        cout << "Input: " << line << endl;
    }
    return 0;
}
`,
  java: `// LogicLab Java Sandbox
import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        System.out.println("Welcome to LogicLab!");
        Scanner scanner = new Scanner(System.in);
        if (scanner.hasNextLine()) {
            System.out.println("Input: " + scanner.nextLine());
        }
        scanner.close();
    }
}
`,
}

export default function PlaygroundPage() {
  const { resolvedTheme } = useTheme()
  const monacoTheme = resolvedTheme === "light" ? "vs" : "vs-dark"

  const [selectedLang, setSelectedLang] = useState(LANGUAGES[0])
  const [code, setCode] = useState("") // Will initialize in useEffect or fallback to template
  const [stdin, setStdin] = useState("Hello from PlaceTrix!")
  const [running, setRunning] = useState(false)
  const [copied, setCopied] = useState(false)
  const [results, setResults] = useState<{
    success: boolean
    stdout?: string
    stderr?: string
    compile_output?: string
    message?: string
    status?: { id: number; description: string }
    time?: string
    memory?: string
    error?: string
  } | null>(null)
  
  // Load initially or when lang changes
  useEffect(() => {
    const savedCode = localStorage.getItem(`logiclab_playground_code_${selectedLang.value}`)
    if (savedCode) {
      setCode(savedCode)
    } else {
      setCode(CODE_TEMPLATES[selectedLang.value])
    }
  }, [selectedLang.value])

  // Save to local storage on code change
  useEffect(() => {
    if (code) {
      localStorage.setItem(`logiclab_playground_code_${selectedLang.value}`, code)
    }
  }, [code, selectedLang.value])

  const handleLangChange = (langVal: string) => {
    const lang = LANGUAGES.find((l) => l.value === langVal)
    if (lang) {
      setSelectedLang(lang)
    }
  }

  const handleCopyOutput = () => {
    const text = results?.stdout || results?.compile_output || results?.stderr || ""
    if (text) {
      navigator.clipboard.writeText(text)
      setCopied(true)
      toast.success("Output copied!")
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleReset = () => {
    setCode(CODE_TEMPLATES[selectedLang.value])
    toast.success("Editor reset to default template.")
  }

  const handleRunCode = async () => {
    setRunning(true)
    setResults(null)
    try {
      const res = await fetch("/api/logiclab/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source_code: code, language_id: selectedLang.id, stdin }),
      })
      if (!res.ok) throw new Error("Sandbox service is unavailable.")
      const data = await res.json()
      setResults(data)
      if (data.status?.id === 3) {
        toast.success("Executed successfully!")
      } else {
        toast.error(`Status: ${data.status?.description || "Error"}`)
      }
    } catch (err: any) {
      setResults({ success: false, error: err?.message || "Compilation failed." })
      toast.error("Compilation failed.")
    } finally {
      setRunning(false)
    }
  }

  const isAccepted = results?.status?.id === 3

  return (
    <div className="flex flex-col gap-3 p-3 md:p-5 h-[calc(100svh-56px)] bg-background text-foreground overflow-hidden">
      {/* ── Toolbar ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-card/60 border border-border rounded-xl px-4 py-3 backdrop-blur shrink-0">
        <div className="flex items-center gap-3">
          <Link
            href="/~/logiclab"
            className="h-9 w-9 rounded-lg bg-muted border border-border flex items-center justify-center hover:bg-accent hover:text-accent-foreground transition-colors"
          >
            <IconArrowLeft className="h-4 w-4 text-muted-foreground" />
          </Link>
          <div className="h-9 w-9 rounded-lg bg-muted border border-border flex items-center justify-center">
            <IconTerminal2 className="h-5 w-5 text-emerald-400" />
          </div>
          <div>
            <p className="text-sm font-bold tracking-tight text-foreground">LogicLab Playground</p>
            <p className="text-[10px] text-muted-foreground/80 uppercase tracking-widest">Free Sandbox — No Grading</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={selectedLang.value}
            onChange={(e) => handleLangChange(e.target.value)}
            className="bg-muted border border-border rounded-lg px-3 py-1.5 text-xs font-semibold text-foreground/90 focus:outline-none cursor-pointer"
          >
            {LANGUAGES.map((l) => (
              <option key={l.id} value={l.value}>{l.name}</option>
            ))}
          </select>

          <button
            onClick={handleReset}
            disabled={running}
            className="flex items-center gap-1.5 bg-muted hover:bg-accent hover:text-accent-foreground disabled:opacity-40 text-muted-foreground hover:text-foreground px-3 py-1.5 rounded-lg text-xs font-semibold border border-border transition-all cursor-pointer"
          >
            <IconRefresh className="h-3.5 w-3.5" /> Reset
          </button>

          <button
            onClick={handleRunCode}
            disabled={running}
            className="flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-400 disabled:bg-muted disabled:text-muted-foreground/60 text-black px-4 py-1.5 rounded-lg text-xs font-bold shadow-[0_0_16px_rgba(16,185,129,0.3)] hover:shadow-[0_0_22px_rgba(16,185,129,0.45)] disabled:shadow-none transition-all cursor-pointer"
          >
            {running ? (
              <><div className="h-3.5 w-3.5 border border-current border-t-transparent rounded-full animate-spin" /> Compiling...</>
            ) : (
              <><IconPlayerPlay className="h-3.5 w-3.5 fill-current" /> Run Code</>
            )}
          </button>
        </div>
      </div>

      {/* ── Workspace ── */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-3 min-h-0">
        {/* Monaco Editor */}
        <div className="lg:col-span-7 flex flex-col bg-card border border-zinc-200 dark:border-border rounded-xl overflow-hidden min-h-[300px]">
          <div className="flex items-center justify-between bg-muted/40 dark:bg-card px-4 py-2.5 border-b border-zinc-200 dark:border-border shrink-0">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                Editor — {selectedLang.name} (.{selectedLang.extension})
              </span>
            </div>
            <button 
              onClick={() => { navigator.clipboard.writeText(code); toast.success("Code copied!"); }} 
              className="p-1 hover:bg-muted rounded transition-all cursor-pointer text-muted-foreground/80 hover:text-foreground"
              title="Copy Code"
            >
              <IconCopy className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="flex-1 min-h-0 pt-2">
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
                <div className="flex flex-col w-full h-full p-4 space-y-3 bg-card font-mono opacity-60">
                  {Array.from({ length: 12 }).map((_, i) => {
                    const widths = [40, 60, 30, 75, 50, 85, 45, 65, 35, 70, 55, 80]
                    const indent = [0, 4, 4, 8, 8, 8, 4, 4, 0, 4, 4, 0]
                    return (
                      <div key={i} className="flex items-center gap-4">
                        <div className="w-6 text-right text-[10px] text-muted-foreground/40 select-none">{i + 1}</div>
                        <div style={{ paddingLeft: `${indent[i]}rem`, width: '100%' }}>
                          <div className="h-3.5 bg-muted/60 rounded-md animate-pulse" style={{ width: `${widths[i]}%` }} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              }
            />
          </div>
        </div>

        {/* Right column */}
        <div className="lg:col-span-5 flex flex-col gap-3 min-h-0">
          {/* Stdin */}
          <div className="flex flex-col bg-card border border-zinc-200 dark:border-border rounded-xl overflow-hidden shrink-0" style={{ height: "160px" }}>
            <div className="bg-muted/40 dark:bg-card px-4 py-2.5 border-b border-zinc-200 dark:border-border shrink-0">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Custom Stdin Input</span>
            </div>
            <textarea
              value={stdin}
              onChange={(e) => setStdin(e.target.value)}
              placeholder="Type stdin inputs here..."
              className="flex-1 bg-muted/10 dark:bg-muted/5 text-foreground/90 font-mono text-xs p-3 resize-none focus:outline-none placeholder:text-muted-foreground/40"
            />
          </div>

          {/* Output */}
          <div className="flex-1 flex flex-col bg-card border border-zinc-200 dark:border-border rounded-xl overflow-hidden min-h-0">
            <div className="flex items-center justify-between bg-muted/40 dark:bg-card px-4 py-2.5 border-b border-zinc-200 dark:border-border shrink-0">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                <IconTerminal2 className="h-3.5 w-3.5" /> Console Output
              </span>
              {results && (
                <button onClick={handleCopyOutput} className="p-1 hover:bg-muted rounded transition-all cursor-pointer text-muted-foreground/80 hover:text-foreground">
                  {copied ? <IconCheck className="h-3.5 w-3.5 text-emerald-400" /> : <IconCopy className="h-3.5 w-3.5" />}
                </button>
              )}
            </div>

            <div className="flex-1 overflow-y-auto p-3 font-mono text-xs flex flex-col gap-2.5 min-h-0">
              {results ? (
                <>
                  {/* Status bar */}
                  <div className={`p-2.5 rounded-lg flex items-center justify-between border ${isAccepted ? "bg-emerald-500/5 border-emerald-500/30 dark:border-emerald-500/20 text-emerald-400" : "bg-rose-500/5 border-rose-500/30 dark:border-rose-500/20 text-rose-400"}`}>
                    <div className="flex items-center gap-2">
                      {isAccepted ? <IconCircleCheck className="h-4 w-4 shrink-0" /> : <IconCircleX className="h-4 w-4 shrink-0" />}
                      <span className="font-bold uppercase tracking-wider text-[10px]">{results.status?.description || "Error"}</span>
                    </div>
                    {isAccepted && (
                      <div className="flex items-center gap-3 text-muted-foreground text-[10px]">
                        <span className="flex items-center gap-1"><IconClock className="h-3 w-3" />{results.time}s</span>
                        <span className="flex items-center gap-1"><IconCpu className="h-3 w-3" />{(parseInt(results.memory || "0") / 1024).toFixed(1)}MB</span>
                      </div>
                    )}
                  </div>

                  {results.compile_output && (
                    <div>
                      <p className="text-[9px] text-rose-400 uppercase tracking-widest mb-1 flex items-center gap-1"><IconAlertTriangle className="h-3 w-3" /> Compile Errors</p>
                      <pre className="p-2.5 bg-muted/40 border border-zinc-200 dark:border-border rounded text-rose-400/90 whitespace-pre-wrap overflow-x-auto text-[11px]">{results.compile_output}</pre>
                    </div>
                  )}

                  {results.stderr && (
                    <div>
                      <p className="text-[9px] text-rose-400 uppercase tracking-widest mb-1 flex items-center gap-1"><IconAlertTriangle className="h-3 w-3" /> Runtime Errors</p>
                      <pre className="p-2.5 bg-muted/40 border border-zinc-200 dark:border-border rounded text-rose-400/90 whitespace-pre-wrap overflow-x-auto text-[11px]">{results.stderr}</pre>
                    </div>
                  )}

                  <div className="flex-1 flex flex-col">
                    <p className="text-[9px] text-muted-foreground/80 uppercase tracking-widest mb-1 flex items-center gap-1"><IconInfoCircle className="h-3 w-3" /> Program Output (stdout)</p>
                    <pre className="flex-1 p-2.5 bg-muted/40 border border-zinc-200 dark:border-border rounded text-foreground/90 whitespace-pre-wrap overflow-x-auto text-[11px] min-h-[60px]">
                      {results.stdout || <span className="text-muted-foreground/40 italic">No output produced.</span>}
                    </pre>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center gap-2 select-none">
                  <IconTerminal2 className="h-8 w-8 text-muted-foreground/20 stroke-[1.5]" />
                  <p className="text-[10px] text-muted-foreground/40 uppercase font-bold tracking-widest">Terminal Idle</p>
                  <p className="text-[10px] text-muted-foreground/20 max-w-[200px] font-sans">Press Run Code to compile and execute your program.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
