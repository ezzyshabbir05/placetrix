"use client"

import * as React from "react"
import { useMemo, useState } from "react"
import katex from "katex"
import "katex/dist/katex.min.css"
import { Copy, Check, Code, Terminal, Quote, BookOpen, Lightbulb, AlertTriangle, Info } from "lucide-react"
import { cn } from "@/lib/utils"
import Prism from "prismjs"
import "prismjs/components/prism-javascript"
import "prismjs/components/prism-typescript"
import "prismjs/components/prism-python"
import "prismjs/components/prism-sql"
import "prismjs/components/prism-c"
import "prismjs/components/prism-cpp"
import "prismjs/components/prism-csharp"
import "prismjs/components/prism-java"
import "prismjs/components/prism-bash"
import "./prism-adaptive.css"

interface KatexMathProps {
  latex: string
  display?: boolean
  className?: string
}

function KatexMath({ latex, display = false, className }: KatexMathProps) {
  const html = useMemo(() => {
    try {
      return katex.renderToString(latex, {
        displayMode: display,
        throwOnError: false,
        trust: false,
      })
    } catch (err) {
      console.error("KaTeX rendering error:", err)
      return `<span class="text-destructive font-mono text-[13px]">[LaTeX error: ${latex}]</span>`
    }
  }, [latex, display])

  if (display) {
    return (
      <span
        className={cn("my-2 block overflow-x-auto py-1 text-center", className)}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    )
  }

  return (
    <span
      className={cn("inline align-middle", className)}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}

// ─── Inline Parser ────────────────────────────────────────────────────────────

export function unescapeLatex(str: string): string {
  if (!str) return ""
  return str
    .replace(/\\([$%&_{}~^#])/g, "$1")
    .replace(/\\textbackslash\{\}/g, "\\")
    .replace(/\\textbackslash/g, "\\")
}

/**
 * Stack-based balanced brace parser for LaTeX inline formatting.
 * Supports: textbf, textit, texttt, textsf, emph, underline, sout, textcolor,
 *           href, url, footnote, inline math ($, $$, \(, \[), and backtick code spans.
 */
export function parseLatexInline(text: string): React.ReactNode[] {
  if (!text) return []
  const elements: React.ReactNode[] = []
  let i = 0

  const pushKey = (el: React.ReactNode) => {
    elements.push(el)
  }

  while (i < text.length) {
    // 0a. Forced line break (\\)
    if (text.startsWith("\\\\", i)) {
      pushKey(<br key={`br-${i}`} />)
      i += 2
      continue
    }

    // 0b. Escaped characters
    const ESCAPES: [string, string][] = [
      ["\\$", "$"], ["\\%", "%"], ["\\&", "&"],
      ["\\_", "_"], ["\\{", "{"], ["\\}", "}"],
      ["\\~", "~"], ["\\^", "^"], ["\\#", "#"],
      ["\\textbackslash{}", "\\"],
      ["\\textbackslash", "\\"],
    ]
    let didEscape = false
    for (const [pfx, char] of ESCAPES) {
      if (text.startsWith(pfx, i)) {
        pushKey(<span key={`esc-${i}`}>{char}</span>)
        i += pfx.length
        didEscape = true
        break
      }
    }
    if (didEscape) continue

    // 0c. Backtick inline code span
    if (text[i] === "`") {
      let tickCount = 0
      let j = i
      while (j < text.length && text[j] === "`") { tickCount++; j++ }
      const closing = "`".repeat(tickCount)
      const end = text.indexOf(closing, j)
      if (end !== -1) {
        const codeText = text.slice(j, end)
        pushKey(
          <code key={`btick-${i}`} className="bg-muted/70 border border-border/40 px-1.5 py-0.5 rounded-md text-[12.5px] font-mono text-foreground/95 font-medium">
            {codeText}
          </code>
        )
        i = end + tickCount
        continue
      }
    }

    // 1. Display math $$
    if (text.startsWith("$$", i)) {
      const j = text.indexOf("$$", i + 2)
      if (j !== -1) {
        const formula = text.slice(i + 2, j)
        pushKey(<KatexMath key={`dm-${i}`} latex={formula} display={true} />)
        i = j + 2
        continue
      }
    }

    // 2. Display math \[
    if (text.startsWith("\\[", i)) {
      const j = text.indexOf("\\]", i + 2)
      if (j !== -1) {
        const formula = text.slice(i + 2, j)
        pushKey(<KatexMath key={`dl-${i}`} latex={formula} display={true} />)
        i = j + 2
        continue
      }
    }

    // 3. Inline math $
    if (text[i] === "$" && !text.startsWith("$$", i)) {
      const j = text.indexOf("$", i + 1)
      if (j !== -1) {
        const formula = text.slice(i + 1, j)
        pushKey(<KatexMath key={`im-${i}`} latex={formula} display={false} />)
        i = j + 1
        continue
      }
    }

    // 4. Inline math \(
    if (text.startsWith("\\(", i)) {
      const j = text.indexOf("\\)", i + 2)
      if (j !== -1) {
        const formula = text.slice(i + 2, j)
        pushKey(<KatexMath key={`ip-${i}`} latex={formula} display={false} />)
        i = j + 2
        continue
      }
    }

    // 5. LaTeX macros
    type MacroName = "textbf" | "textit" | "texttt" | "textsf" | "emph" | "underline" | "sout" | "textcolor" | "url" | "href" | "footnote" | "cite" | "label" | "ref"
    const MACROS: { prefix: string; name: MacroName }[] = [
      { prefix: "\\textbf{",    name: "textbf"    },
      { prefix: "\\textit{",    name: "textit"    },
      { prefix: "\\texttt{",    name: "texttt"    },
      { prefix: "\\textsf{",    name: "textsf"    },
      { prefix: "\\emph{",      name: "emph"      },
      { prefix: "\\underline{", name: "underline" },
      { prefix: "\\sout{",      name: "sout"      },
      { prefix: "\\textcolor{", name: "textcolor" },
      { prefix: "\\url{",       name: "url"       },
      { prefix: "\\href{",      name: "href"      },
      { prefix: "\\footnote{",  name: "footnote"  },
      { prefix: "\\cite{",      name: "cite"      },
      { prefix: "\\label{",     name: "label"     },
      { prefix: "\\ref{",       name: "ref"       },
    ]

    let matchedMacro = false
    for (const macro of MACROS) {
      if (!text.startsWith(macro.prefix, i)) continue

      // Find matching closing brace
      const NON_NESTING = ["texttt", "textsf", "url", "cite", "label", "ref"]
      const isNonNesting = NON_NESTING.includes(macro.name)

      let braceCount = 1
      let j = i + macro.prefix.length
      while (j < text.length && braceCount > 0) {
        const isEscaped = j > 0 && text[j - 1] === "\\" && (j < 2 || text[j - 2] !== "\\")
        if (!isEscaped) {
          if (isNonNesting) {
            if (text[j] === "}") braceCount = 0
          } else {
            if (text[j] === "{") braceCount++
            else if (text[j] === "}") braceCount--
          }
        }
        j++
      }
      if (braceCount !== 0) continue

      matchedMacro = true
      const inner = text.slice(i + macro.prefix.length, j - 1)

      switch (macro.name) {
        case "textbf":
          pushKey(<strong key={`bf-${i}`} className="font-semibold text-foreground">{parseLatexInline(inner)}</strong>)
          break
        case "textit":
        case "emph":
          pushKey(<em key={`it-${i}`} className="italic text-foreground/90">{parseLatexInline(inner)}</em>)
          break
        case "texttt":
          pushKey(
            <code key={`tt-${i}`} className="bg-muted/70 border border-border/40 px-1.5 py-0.5 rounded-md text-[12.5px] font-mono text-foreground/95 font-medium">
              {unescapeLatex(inner)}
            </code>
          )
          break
        case "textsf":
          pushKey(<span key={`sf-${i}`} className="font-sans text-foreground">{parseLatexInline(unescapeLatex(inner))}</span>)
          break
        case "underline":
          pushKey(<u key={`ul-${i}`} className="underline decoration-foreground/30 underline-offset-2">{parseLatexInline(inner)}</u>)
          break
        case "sout":
          pushKey(<s key={`so-${i}`} className="line-through text-foreground/60">{parseLatexInline(inner)}</s>)
          break
        case "textcolor": {
          // \textcolor{color}{text} — inner is 'color', next brace is text
          const color = inner
          if (j < text.length && text[j] === "{") {
            let nc = 1; let k = j + 1
            while (k < text.length && nc > 0) {
              if (text[k] === "{") nc++
              else if (text[k] === "}") nc--
              k++
            }
            const colorText = text.slice(j + 1, k - 1)
            pushKey(<span key={`tc-${i}`} style={{ color }}>{parseLatexInline(colorText)}</span>)
            j = k
          } else {
            pushKey(<span key={`tc-${i}`} style={{ color }}>{color}</span>)
          }
          break
        }
        case "url": {
          const unescapedUrl = unescapeLatex(inner)
          pushKey(
            <a key={`url-${i}`} href={unescapedUrl} target="_blank" rel="noopener noreferrer"
               className="text-primary underline decoration-primary/30 underline-offset-4 hover:decoration-primary hover:text-primary/85 transition-all duration-200 font-medium text-[13px]">
              {unescapedUrl}
            </a>
          )
          break
        }
        case "href": {
          // \href{url}{label}
          let url = inner; let label: React.ReactNode = inner
          if (j < text.length && text[j] === "{") {
            let nc = 1; let k = j + 1
            while (k < text.length && nc > 0) {
              if (text[k] === "{") nc++
              else if (text[k] === "}") nc--
              k++
            }
            label = parseLatexInline(text.slice(j + 1, k - 1))
            j = k
          }
          pushKey(
            <a key={`href-${i}`} href={unescapeLatex(url)} target="_blank" rel="noopener noreferrer"
               className="text-primary underline decoration-primary/30 underline-offset-4 hover:decoration-primary hover:text-primary/85 transition-all duration-200 font-medium">
              {label}
            </a>
          )
          break
        }
        case "footnote":
          pushKey(
            <span key={`fn-${i}`} className="relative group/fn cursor-help">
              <sup className="text-primary text-[10px] font-semibold ml-0.5 select-none group-hover/fn:text-primary/70 transition-colors">[*]</sup>
              <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 hidden group-hover/fn:block w-max max-w-[260px] bg-popover border border-border shadow-lg rounded-lg px-3 py-2 text-[12px] text-popover-foreground leading-relaxed pointer-events-none whitespace-normal">
                {parseLatexInline(inner)}
              </span>
            </span>
          )
          break
        case "cite":
          pushKey(
            <cite key={`cite-${i}`} className="not-italic font-semibold text-primary/80 text-[13px]">
              [{inner}]
            </cite>
          )
          break
        case "label":
        case "ref":
          // Silent for label; show ref as a superscript chip
          if (macro.name === "ref") {
            pushKey(
              <span key={`ref-${i}`} className="inline-flex items-center text-[11px] font-mono bg-primary/10 text-primary px-1.5 py-0.5 rounded border border-primary/20 mx-0.5">
                §{inner}
              </span>
            )
          }
          break
      }
      i = j
      break
    }
    if (matchedMacro) continue

    // 6. Plain text chunk
    let nextSpecial = i + 1
    while (nextSpecial < text.length) {
      const ch = text[nextSpecial]
      if (ch === "$" || ch === "\\" || ch === "`") break
      nextSpecial++
    }
    pushKey(<span key={`t-${i}`}>{text.slice(i, nextSpecial)}</span>)
    i = nextSpecial
  }

  return elements
}

// Language → display label + accent colour (matches Atom One palette)
const LANG_META: Record<string, { label: string; accent: string }> = {
  javascript:  { label: "JavaScript",  accent: "#d19a66" },  /* Atom orange */
  typescript:  { label: "TypeScript",  accent: "#61afef" },  /* Atom blue */
  python:      { label: "Python",      accent: "#c678dd" },  /* Atom purple */
  sql:         { label: "SQL",         accent: "#56b6c2" },  /* Atom cyan */
  bash:        { label: "Bash",        accent: "#98c379" },  /* Atom green */
  c:           { label: "C",           accent: "#61afef" },  /* Atom blue */
  cpp:         { label: "C++",         accent: "#61afef" },  /* Atom blue */
  csharp:      { label: "C#",          accent: "#c678dd" },  /* Atom purple */
  java:        { label: "Java",        accent: "#e06c75" },  /* Atom red */
}

// ─── Code Block ───────────────────────────────────────────────────────────────

interface CodeBlockProps {
  code: string
  language?: string
  caption?: string
  showLineNumbers?: boolean
}

function CodeBlock({ code, language, caption, showLineNumbers = true }: CodeBlockProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault(); e.stopPropagation()
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    } catch (err) {
      console.error("Failed to copy:", err)
    }
  }

  const normalizedLang = useMemo(() => {
    if (!language) return "clike"
    const aliasMap: Record<string, string> = {
      js: "javascript", ts: "typescript", py: "python",
      cs: "csharp", sh: "bash", shell: "bash",
    }
    return aliasMap[language.toLowerCase()] ?? language.toLowerCase()
  }, [language])

  const html = useMemo(() => {
    const grammar = Prism.languages[normalizedLang] || Prism.languages.clike
    return Prism.highlight(code, grammar, normalizedLang)
  }, [code, normalizedLang])

  const lines = code.split("\n")
  const lineCount = lines.length
  const lineNumberWidth = String(lineCount).length
  const meta = LANG_META[normalizedLang]
  const accent = meta?.accent ?? "var(--prism-gutter-fg)"
  const langLabel = meta?.label ?? language?.toUpperCase() ?? ""

  return (
    <div
      className="rounded-xl border border-border/50 overflow-hidden my-6 font-mono text-[13px] transition-all duration-200 shadow-sm hover:shadow-md hover:border-border/70"
      style={{ background: "var(--prism-bg)" }}
    >
      {/* ── Header ── */}
      <div className="flex items-center justify-between border-b border-border/40 bg-muted/50 dark:bg-muted/30 px-4 py-2.5 font-sans select-none">
        {/* Left: dots + label */}
        <div className="flex items-center gap-3">
          <div className="flex gap-[5px] items-center">
            <span className="size-[11px] rounded-full bg-[#ff5f57] block ring-1 ring-inset ring-black/10" />
            <span className="size-[11px] rounded-full bg-[#febc2e] block ring-1 ring-inset ring-black/10" />
            <span className="size-[11px] rounded-full bg-[#28c840] block ring-1 ring-inset ring-black/10" />
          </div>
          <div className="flex items-center gap-2">
            {caption && (
              <span className="text-[12px] font-medium" style={{ color: "var(--prism-fg)", opacity: 0.7 }}>
                {caption}
              </span>
            )}
            {!caption && (
              <span className="text-[12px] font-medium" style={{ color: "var(--prism-gutter-fg)" }}>
                Code
              </span>
            )}
          </div>
        </div>

        {/* Right: language badge + copy */}
        <div className="flex items-center gap-2">
          {langLabel && (
            <span
              className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full"
              style={{
                color: accent,
                background: `color-mix(in oklch, ${accent} 12%, transparent)`,
                border: `1px solid color-mix(in oklch, ${accent} 30%, transparent)`,
              }}
            >
              <span
                className="size-1.5 rounded-full flex-shrink-0"
                style={{ background: accent }}
              />
              {langLabel}
            </span>
          )}
          <button
            type="button"
            onClick={handleCopy}
            className="group/copy flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all duration-200 active:scale-95 cursor-pointer focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring"
            style={{
              color: copied ? undefined : "var(--prism-gutter-fg)",
              background: copied
                ? "color-mix(in oklch, oklch(0.55 0.18 148) 12%, transparent)"
                : "color-mix(in oklch, var(--prism-gutter-bg) 80%, transparent)",
              border: `1px solid ${copied
                ? "color-mix(in oklch, oklch(0.55 0.18 148) 30%, transparent)"
                : "var(--prism-gutter-sep)"}`,
            }}
            title="Copy code"
          >
            {copied ? (
              <>
                <Check className="size-3 shrink-0" style={{ color: "oklch(0.55 0.18 148)" }} />
                <span style={{ color: "oklch(0.55 0.18 148)" }}>Copied!</span>
              </>
            ) : (
              <>
                <Copy className="size-3 shrink-0 transition-transform group-hover/copy:scale-110" />
                <span>Copy</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* ── Code body ── */}
      <div
        className="flex overflow-x-auto max-h-[540px] prism-scroll"
        data-lang={normalizedLang}
      >
        {/* Line numbers */}
        {showLineNumbers && lineCount > 1 && (
          <div
            className="select-none flex-shrink-0 flex flex-col py-4 pr-3 pl-3 text-right text-[12px] bg-muted/50 dark:bg-muted/30"
            style={{
              minWidth: `${lineNumberWidth + 2}ch`,
              color: "var(--prism-gutter-fg)",
              borderRight: "1px solid var(--prism-gutter-sep)",
              lineHeight: "1.75",
            }}
            aria-hidden="true"
          >
            {lines.map((_, idx) => (
              <span
                key={idx}
                className="block prism-line leading-[1.75] px-1 rounded-sm transition-colors duration-100"
              >
                {idx + 1}
              </span>
            ))}
          </div>
        )}

        {/* Highlighted code */}
        <pre
          className="p-4 flex-1 whitespace-pre min-w-0 m-0 prism-scroll"
          style={{
            color: "var(--prism-fg)",
            background: "var(--prism-bg)",
            lineHeight: "1.75",
          }}
        >
          <code
            className={`language-${normalizedLang} font-mono`}
            dangerouslySetInnerHTML={{ __html: html }}
          />
        </pre>
      </div>
    </div>
  )
}


// ─── Block Types ──────────────────────────────────────────────────────────────

interface Block {
  type:
    | "paragraph"
    | "heading"
    | "itemize"
    | "enumerate"
    | "item"
    | "verbatim"
    | "lstlisting"
    | "equation"
    | "align"
    | "figure"
    | "image"
    | "center"
    | "empty"
    | "blockquote"
    | "theorem"
    | "definition"
    | "lemma"
    | "corollary"
    | "proof"
    | "remark"
    | "example"
    | "warning"
    | "note"
    | "table"
    | "hrule"
  level?: number
  content?: string
  children?: Block[]
  options?: Record<string, string>
  caption?: string
  imageUrl?: string
  // theorem-like
  envName?: string
  envTitle?: string
  envNumber?: number
  // table
  rows?: string[][]
  hasHeader?: boolean
}

// ─── Document Parser ──────────────────────────────────────────────────────────

export function parseOptions(optionsStr: string): Record<string, string> {
  const options: Record<string, string> = {}
  let currentKey = ""
  let currentValue = ""
  let inBraces = 0
  let inQuotes = false
  let isParsingValue = false

  for (let j = 0; j < optionsStr.length; j++) {
    const char = optionsStr[j]
    if (char === "{" && !inQuotes) {
      inBraces++
      if (isParsingValue && inBraces > 1) currentValue += char
    } else if (char === "}" && !inQuotes) {
      if (inBraces > 0) inBraces--
      if (isParsingValue && inBraces > 0) currentValue += char
    } else if (char === '"') {
      inQuotes = !inQuotes
    } else if (char === "=" && inBraces === 0 && !inQuotes && !isParsingValue) {
      isParsingValue = true
    } else if (char === "," && inBraces === 0 && !inQuotes) {
      if (currentKey) {
        options[currentKey.trim().toLowerCase()] = currentValue.trim()
      }
      currentKey = ""
      currentValue = ""
      isParsingValue = false
    } else {
      if (isParsingValue) {
        currentValue += char
      } else {
        currentKey += char
      }
    }
  }
  if (currentKey) {
    options[currentKey.trim().toLowerCase()] = currentValue.trim()
  }
  return options
}

function parseLatexDocument(content: string): Block[] {
  const lines = content.split("\n")
  const rootBlocks: Block[] = []
  const stack: { block: Block; endTag?: string }[] = []

  let theoremCounters: Record<string, number> = {}
  const bumpCounter = (name: string) => {
    theoremCounters[name] = (theoremCounters[name] || 0) + 1
    return theoremCounters[name]
  }

  let i = 0
  while (i < lines.length) {
    const line = lines[i]
    const trimmed = line.trim()

    // ── Active container: verbatim/lstlisting/equation/align ──
    const top = stack[stack.length - 1]
    if (top) {
      const rawTypes: Block["type"][] = [
        "verbatim", "lstlisting", "equation", "align"
      ]
      if (rawTypes.includes(top.block.type)) {
        if (top.endTag && trimmed.startsWith(top.endTag)) {
          stack.pop()
          i++
          continue
        }
        top.block.content = (top.block.content || "") + line + "\n"
        i++
        continue
      }
    }

    // ── Empty line ──
    if (!trimmed) {
      if (stack.length === 0) {
        rootBlocks.push({ type: "empty" })
      } else {
        const active = stack[stack.length - 1]
        if (active.block.type !== "itemize" && active.block.type !== "enumerate") {
          addBlock({ type: "empty" })
        }
      }
      i++
      continue
    }

    // ── Horizontal rule ──
    if (/^\\(?:hrule|noindent\s*\\hrule|hline|midrule|rule\{[^}]+\}\{[^}]+\})/.test(trimmed) || trimmed === "---") {
      addBlock({ type: "hrule" })
      i++
      continue
    }

    // ── Environments ──
    if (trimmed.startsWith("\\begin{")) {
      const envMatch = trimmed.match(/^\\begin\{([^}]+)\}(.*)/)
      if (envMatch) {
        const env = envMatch[1].toLowerCase()
        const rest = envMatch[2].trim()

        // List environments
        if (env === "itemize") {
          const b: Block = { type: "itemize", children: [] }
          addBlock(b); stack.push({ block: b, endTag: "\\end{itemize}" })
          i++; continue
        }
        if (env === "enumerate") {
          const b: Block = { type: "enumerate", children: [] }
          addBlock(b); stack.push({ block: b, endTag: "\\end{enumerate}" })
          i++; continue
        }

        // Center
        if (env === "center") {
          const b: Block = { type: "center", children: [] }
          addBlock(b); stack.push({ block: b, endTag: "\\end{center}" })
          i++; continue
        }

        // Figure
        if (env === "figure") {
          const b: Block = { type: "figure", children: [] }
          addBlock(b); stack.push({ block: b, endTag: "\\end{figure}" })
          i++; continue
        }

        // Quote/blockquote
        if (env === "quote" || env === "quotation" || env === "blockquote") {
          const b: Block = { type: "blockquote", children: [] }
          addBlock(b); stack.push({ block: b, endTag: `\\end{${env}}` })
          i++; continue
        }

        // Verbatim
        if (env === "verbatim") {
          const b: Block = { type: "verbatim", content: "" }
          addBlock(b); stack.push({ block: b, endTag: "\\end{verbatim}" })
          i++; continue
        }

        // lstlisting
        if (env === "lstlisting") {
          let language = "", caption = ""
          const optMatch = trimmed.match(/\\begin\{lstlisting\}\s*\[([\s\S]*?)\]/)
          if (optMatch) {
            const opts = parseOptions(optMatch[1])
            language = opts.language || ""
            caption = opts.caption || ""
          }
          const b: Block = { type: "lstlisting", content: "", options: { language, caption } }
          addBlock(b); stack.push({ block: b, endTag: "\\end{lstlisting}" })
          i++; continue
        }

        // Equations
        if (env === "equation" || env === "equation*") {
          const b: Block = { type: "equation", content: "" }
          addBlock(b); stack.push({ block: b, endTag: `\\end{${env}}` })
          i++; continue
        }
        if (env === "align" || env === "align*" || env === "aligned") {
          const b: Block = { type: "align", content: "" }
          addBlock(b); stack.push({ block: b, endTag: `\\end{${env}}` })
          i++; continue
        }

        // Table
        if (env === "tabular" || env === "table") {
          // Collect all lines until \end{tabular} or \end{table}
          const tableLines: string[] = []
          let j = i + 1
          const endEnv = env === "table" ? "\\end{table}" : "\\end{tabular}"
          while (j < lines.length && !lines[j].trim().startsWith(endEnv)) {
            tableLines.push(lines[j])
            j++
          }
          const parsed = parseTabular(tableLines)
          addBlock(parsed)
          i = j + 1
          continue
        }

        // Theorem-like environments
        const THEOREM_LIKE: Record<string, { label: string; icon?: React.ReactNode }> = {
          theorem:    { label: "Theorem" },
          definition: { label: "Definition" },
          lemma:      { label: "Lemma" },
          corollary:  { label: "Corollary" },
          proof:      { label: "Proof" },
          remark:     { label: "Remark" },
          example:    { label: "Example" },
          warning:    { label: "Warning" },
          note:       { label: "Note" },
        }
        if (THEOREM_LIKE[env]) {
          const titleMatch = rest.match(/^\[(.*?)\]/)
          const envTitle = titleMatch ? titleMatch[1] : undefined
          const num = env !== "proof" ? bumpCounter(env) : undefined
          const b: Block = {
            type: env as Block["type"],
            content: "",
            envName: env,
            envTitle,
            envNumber: num,
          }
          addBlock(b); stack.push({ block: b, endTag: `\\end{${env}}` })
          i++; continue
        }
      }
    }

    // ── \end{...} fallback ──
    if (trimmed.startsWith("\\end{")) {
      const envNameMatch = trimmed.match(/\\end\{([^}]+)\}/)
      if (envNameMatch) {
        const envName = envNameMatch[1]
        while (stack.length > 0) {
          const popped = stack.pop()
          if (popped && (popped.block.type === envName || popped.block.envName === envName)) break
        }
      }
      i++; continue
    }

    // ── \item ──
    if (trimmed.startsWith("\\item")) {
      const curTop = stack[stack.length - 1]
      if (curTop && curTop.block.type === "item") stack.pop()
      const parentTop = stack[stack.length - 1]
      if (parentTop && (parentTop.block.type === "itemize" || parentTop.block.type === "enumerate")) {
        const itemBlock: Block = { type: "item", children: [] }
        parentTop.block.children!.push(itemBlock)
        stack.push({ block: itemBlock })
        const itemContent = trimmed.slice(5).trim()
        if (itemContent) itemBlock.children!.push({ type: "paragraph", content: itemContent })
      } else {
        const itemContent = trimmed.slice(5).trim()
        addBlock({ type: "paragraph", content: `• ${itemContent}` })
      }
      i++; continue
    }

    // ── Headings ──
    const HEADING_PATTERNS: [RegExp, number][] = [
      [/^\\section\*?\{([\s\S]+?)\}/, 1],
      [/^\\subsection\*?\{([\s\S]+?)\}/, 2],
      [/^\\subsubsection\*?\{([\s\S]+?)\}/, 3],
      [/^\\paragraph\*?\{([\s\S]+?)\}/, 4],
    ]
    let headingMatched = false
    for (const [re, level] of HEADING_PATTERNS) {
      const m = trimmed.match(re)
      if (m) {
        addBlock({ type: "heading", level, content: m[1] })
        headingMatched = true
        break
      }
    }
    if (headingMatched) { i++; continue }

    // ── Figure-specific commands ──
    const figTop = stack[stack.length - 1]
    if (figTop && figTop.block.type === "figure") {
      const captionMatch = trimmed.match(/\\caption\{([\s\S]+?)\}/)
      if (captionMatch) { figTop.block.caption = captionMatch[1]; i++; continue }
      const gfxMatch = trimmed.match(/\\includegraphics(?:\[.*?\])?\{([^}]+)\}/)
      if (gfxMatch) { figTop.block.children!.push({ type: "image", imageUrl: gfxMatch[1] }); i++; continue }
      if (trimmed.startsWith("\\centering") || trimmed.startsWith("\\label{")) { i++; continue }
    }

    // ── Loose \includegraphics ──
    const looseGfx = trimmed.match(/\\includegraphics(?:\[.*?\])?\{([^}]+)\}/)
    if (looseGfx) { addBlock({ type: "image", imageUrl: looseGfx[1] }); i++; continue }

    // ── Markdown-style image ──
    if (trimmed.startsWith("![") && trimmed.endsWith(")")) {
      const m = trimmed.match(/^!\[(.*?)\]\((.*?)\)$/)
      if (m) { addBlock({ type: "image", imageUrl: m[2], caption: m[1] }); i++; continue }
    }

    // ── Block math $$ ... $$ ──
    if (trimmed.startsWith("$$")) {
      let blockContent = trimmed
      if (!(trimmed.length > 2 && trimmed.endsWith("$$"))) {
        let j = i + 1
        while (j < lines.length) {
          const nt = lines[j].trim()
          blockContent += "\n" + lines[j]
          if (nt.endsWith("$$") || nt.includes("$$")) { break }
          j++
        }
        i = j
      }
      addBlock({ type: "equation", content: blockContent })
      i++; continue
    }

    // ── Skip common LaTeX preamble lines ──
    const SKIP_PATTERNS = [
      /^\\documentclass/, /^\\usepackage/, /^\\title\{/, /^\\author\{/, /^\\date\{/,
      /^\\maketitle/, /^\\tableofcontents/, /^\\begin\{document\}/, /^\\end\{document\}/,
      /^\\newcommand/, /^\\renewcommand/, /^\\setlength/, /^\\pagestyle/,
      /^\\centering$/, /^\\noindent$/,
    ]
    if (SKIP_PATTERNS.some(re => re.test(trimmed))) { i++; continue }

    // ── Default: paragraph ──
    appendParagraphLine(line)
    i++
  }

  // ── Helper: append to paragraph ──
  function appendParagraphLine(line: string) {
    const t = line.trim()
    if (!t) return
    if (stack.length > 0) {
      const active = stack[stack.length - 1]
      if (active.block.type === "itemize" || active.block.type === "enumerate") {
        let lastItem = active.block.children![active.block.children!.length - 1]
        if (!lastItem || lastItem.type !== "item") {
          lastItem = { type: "item", children: [] }
          active.block.children!.push(lastItem)
        }
        const lc = lastItem.children![lastItem.children!.length - 1]
        if (lc && lc.type === "paragraph") lc.content += " " + t
        else lastItem.children!.push({ type: "paragraph", content: t })
      } else {
        if (!active.block.children) active.block.children = []
        const lc = active.block.children[active.block.children.length - 1]
        if (lc && lc.type === "paragraph") lc.content += " " + t
        else active.block.children.push({ type: "paragraph", content: t })
      }
    } else {
      const lb = rootBlocks[rootBlocks.length - 1]
      if (lb && lb.type === "paragraph") lb.content += " " + t
      else rootBlocks.push({ type: "paragraph", content: t })
    }
  }

  function addBlock(block: Block) {
    if (stack.length > 0) {
      const active = stack[stack.length - 1]
      if ((active.block.type === "itemize" || active.block.type === "enumerate") && block.type !== "item") {
        let lastItem = active.block.children![active.block.children!.length - 1]
        if (!lastItem || lastItem.type !== "item") {
          lastItem = { type: "item", children: [] }
          active.block.children!.push(lastItem)
        }
        lastItem.children!.push(block)
      } else {
        if (!active.block.children) active.block.children = []
        active.block.children.push(block)
      }
    } else {
      rootBlocks.push(block)
    }
  }

  return rootBlocks
}

// ─── Table Parser ─────────────────────────────────────────────────────────────

function parseTabular(lines: string[]): Block {
  const rows: string[][] = []
  for (const line of lines) {
    const t = line.trim()
    if (!t || t.startsWith("\\hline") || t.startsWith("\\toprule") || t.startsWith("\\midrule") || t.startsWith("\\bottomrule")) continue
    if (t.startsWith("\\") && !t.includes("&")) continue // skip other LaTeX commands (not content rows)
    // Split by & (column separator), trim \\ or \ from end
    const cleaned = t.replace(/\\+$/, "").trim()
    const cells = cleaned.split("&").map(c => c.trim())
    if (cells.length > 0) rows.push(cells)
  }
  return { type: "table", rows, hasHeader: rows.length > 1 }
}

// ─── Block Renderer ───────────────────────────────────────────────────────────

const THEOREM_STYLES: Record<string, {
  label: string
  borderClass: string
  bgClass: string
  textClass: string
  icon: React.ComponentType<{ className?: string }>
  titleClass: string
}> = {
  theorem: {
    label: "Theorem",
    borderClass: "border-l-violet-500/50",
    bgClass: "bg-muted/15 dark:bg-muted/10",
    textClass: "text-violet-600 dark:text-violet-400",
    titleClass: "text-foreground font-medium",
    icon: BookOpen,
  },
  definition: {
    label: "Definition",
    borderClass: "border-l-blue-500/50",
    bgClass: "bg-muted/15 dark:bg-muted/10",
    textClass: "text-blue-600 dark:text-blue-400",
    titleClass: "text-foreground font-medium",
    icon: Info,
  },
  lemma: {
    label: "Lemma",
    borderClass: "border-l-cyan-500/50",
    bgClass: "bg-muted/15 dark:bg-muted/10",
    textClass: "text-cyan-600 dark:text-cyan-400",
    titleClass: "text-foreground font-medium",
    icon: BookOpen,
  },
  corollary: {
    label: "Corollary",
    borderClass: "border-l-indigo-500/50",
    bgClass: "bg-muted/15 dark:bg-muted/10",
    textClass: "text-indigo-600 dark:text-indigo-400",
    titleClass: "text-foreground font-medium",
    icon: BookOpen,
  },
  proof: {
    label: "Proof",
    borderClass: "border-l-zinc-400/50",
    bgClass: "bg-muted/15 dark:bg-muted/10",
    textClass: "text-zinc-600 dark:text-zinc-400",
    titleClass: "text-foreground font-medium",
    icon: BookOpen,
  },
  remark: {
    label: "Remark",
    borderClass: "border-l-sky-400/50",
    bgClass: "bg-muted/15 dark:bg-muted/10",
    textClass: "text-sky-600 dark:text-sky-400",
    titleClass: "text-foreground font-medium",
    icon: Info,
  },
  example: {
    label: "Example",
    borderClass: "border-l-emerald-500/50",
    bgClass: "bg-muted/15 dark:bg-muted/10",
    textClass: "text-emerald-600 dark:text-emerald-400",
    titleClass: "text-foreground font-medium",
    icon: Lightbulb,
  },
  warning: {
    label: "Warning",
    borderClass: "border-l-amber-500/50",
    bgClass: "bg-muted/15 dark:bg-muted/10",
    textClass: "text-amber-600 dark:text-amber-400",
    titleClass: "text-foreground font-medium",
    icon: AlertTriangle,
  },
  note: {
    label: "Note",
    borderClass: "border-l-teal-500/50",
    bgClass: "bg-muted/15 dark:bg-muted/10",
    textClass: "text-teal-600 dark:text-teal-400",
    titleClass: "text-foreground font-medium",
    icon: Info,
  },
}

function renderBlock(block: Block, index: number, figureNumber?: number): React.ReactNode {
  switch (block.type) {
    case "empty":
      return null

    case "hrule":
      return (
        <hr
          key={`hr-${index}`}
          className="my-8 border-0 h-px bg-gradient-to-r from-transparent via-border/60 to-transparent"
        />
      )

    case "paragraph": {
      if (!block.content?.trim()) return null
      return (
        <p
          key={`p-${index}`}
          className="text-foreground/80 leading-[1.85] text-[15px] my-4 font-normal"
        >
          {parseLatexInline(block.content)}
        </p>
      )
    }

    case "heading": {
      const headingContent = parseLatexInline(block.content || "")
      if (block.level === 1) {
        return (
          <h1
            key={`h1-${index}`}
            className={cn(
              "font-cirka text-2xl md:text-3xl font-bold tracking-tight text-foreground",
              index === 0 ? "mt-0" : "mt-10",
              "mb-4"
            )}
          >
            {headingContent}
            <div className="mt-2.5 h-px bg-gradient-to-r from-border/70 via-border/30 to-transparent" />
          </h1>
        )
      } else if (block.level === 2) {
        return (
          <h2
            key={`h2-${index}`}
            className={cn(
              "font-cirka text-xl font-semibold tracking-tight text-foreground",
              index === 0 ? "mt-0" : "mt-8",
              "mb-3"
            )}
          >
            {headingContent}
          </h2>
        )
      } else if (block.level === 3) {
        return (
          <h3
            key={`h3-${index}`}
            className={cn(
              "font-cirka text-lg font-semibold text-foreground/85",
              index === 0 ? "mt-0" : "mt-6",
              "mb-2"
            )}
          >
            {headingContent}
          </h3>
        )
      } else {
        return (
          <h4
            key={`h4-${index}`}
            className={cn(
              "font-cirka text-base font-semibold text-foreground/80 uppercase tracking-wider",
              index === 0 ? "mt-0" : "mt-5",
              "mb-1.5"
            )}
          >
            {headingContent}
          </h4>
        )

      }
    }

    case "itemize":
      return (
        <ul
          key={`ul-${index}`}
          className="list-none pl-0 space-y-1.5 my-5 text-foreground/80 text-[15px]"
        >
          {block.children?.map((child, idx) => renderBlock(child, idx, figureNumber))}
        </ul>
      )

    case "enumerate":
      return (
        <ol
          key={`ol-${index}`}
          className="list-decimal pl-6 space-y-1.5 my-5 text-foreground/80 text-[15px] marker:text-primary/70 marker:font-semibold"
        >
          {block.children?.map((child, idx) => renderBlock(child, idx, figureNumber))}
        </ol>
      )

    case "item": {
      if (!block.children || block.children.length === 0) return <li key={`li-${index}`} />
      const firstChild = block.children[0]
      const rest = block.children.slice(1)
      const itemContent =
        firstChild.type === "paragraph" ? (
          <>
            <span>{parseLatexInline(firstChild.content || "")}</span>
            {rest.map((c, idx) => renderBlock(c, idx, figureNumber))}
          </>
        ) : (
          block.children.map((c, idx) => renderBlock(c, idx, figureNumber))
        )

      // Custom bullet for itemize items
      const parentIsOl = false // Can't easily detect parent here; use neutral styling
      return (
        <li
          key={`li-${index}`}
          className="flex items-start gap-2.5 leading-relaxed text-foreground/85 pl-0"
        >
          <span className="mt-[0.35em] size-1.5 rounded-full bg-primary/50 flex-shrink-0 block" />
          <span className="flex-1">{itemContent}</span>
        </li>
      )
    }

    case "center":
      return (
        <div key={`center-${index}`} className="text-center my-6">
          {block.children?.map((child, idx) => renderBlock(child, idx, figureNumber))}
        </div>
      )

    case "figure": {
      return (
        <figure
          key={`fig-${index}`}
          className="my-8 w-full flex flex-col items-center bg-muted/20 dark:bg-muted/10 border border-border/50 rounded-2xl p-5 md:p-6 shadow-xs transition-all duration-300 hover:shadow-sm hover:border-border/70"
        >
          <div className="w-full flex flex-col items-center gap-4">
            {block.children?.map((child, idx) => renderBlock(child, idx, figureNumber))}
          </div>
          {block.caption && (
            <figcaption className="mt-4 text-center text-xs text-muted-foreground leading-relaxed select-none max-w-[90%] border-t border-border/30 pt-3.5 w-full">
              {figureNumber !== undefined && (
                <span className="font-semibold text-foreground/70">Figure {figureNumber}. </span>
              )}
              {parseLatexInline(block.caption)}
            </figcaption>
          )}
        </figure>
      )
    }

    case "image": {
      const url = block.imageUrl
      if (!url) return null
      return (
        <div key={`img-${index}`} className="my-6 w-full flex flex-col items-center justify-center">
          <img
            src={url}
            alt={block.caption || "Image"}
            className="max-h-[400px] w-auto max-w-full object-contain rounded-xl shadow-sm border border-border/50 select-none bg-background/50 p-2 hover:shadow-md transition-all duration-300"
          />
          {block.caption && (
            <p className="mt-2 text-center text-xs text-muted-foreground select-none italic">
              {block.caption}
            </p>
          )}
        </div>
      )
    }

    case "verbatim":
      return (
        <div
          key={`verbatim-${index}`}
          className="rounded-lg border border-border/60 overflow-hidden my-5 font-mono text-[13px] transition-colors duration-200"
          style={{ background: "var(--prism-bg)" }}
        >
          <div
            className="flex items-center gap-2 border-b border-border/50 px-4 py-2 select-none"
            style={{ background: "var(--prism-gutter-bg)" }}
          >
            <Terminal className="size-3.5" style={{ color: "var(--prism-comment)" }} />
            <span className="text-[11px] font-sans" style={{ color: "var(--prism-comment)" }}>Output</span>
          </div>
          <pre
            className="p-4 overflow-x-auto whitespace-pre max-h-[400px] leading-[1.7] m-0"
            style={{ color: "var(--prism-fg)", background: "var(--prism-bg)" }}
          >
            <code>{block.content?.trim()}</code>
          </pre>
        </div>
      )


    case "lstlisting": {
      const language = block.options?.language
      const caption = block.options?.caption
      return (
        <CodeBlock
          key={`lstlisting-${index}`}
          code={block.content?.trim() || ""}
          language={language}
          caption={caption}
          showLineNumbers={true}
        />
      )
    }

    case "equation":
    case "align": {
      const isAlign = block.type === "align"
      let content = block.content?.trim() || ""
      
      // Strip outer $$ if they exist
      if (content.startsWith("$$") && content.endsWith("$$")) {
        content = content.slice(2, -2).trim()
      }
      
      const latex = isAlign
        ? `\\begin{aligned} ${content} \\end{aligned}`
        : content

      return (
        <div
          key={`eq-${index}`}
          className="my-7 relative group/eq"
        >
          <div className="p-4 md:p-6 bg-muted/20 dark:bg-muted/10 border border-border/40 rounded-xl overflow-x-auto max-w-full flex justify-center items-center shadow-xs hover:border-border/60 transition-all duration-200">
            <KatexMath className="w-full text-center" latex={latex} display={true} />
          </div>
        </div>
      )
    }

    case "blockquote": {
      return (
        <blockquote
          key={`bq-${index}`}
          className="my-6 pl-5 pr-4 py-4 border-l-4 border-primary/40 bg-primary/5 rounded-r-xl relative"
        >
          <Quote className="absolute top-3 right-3 size-4 text-primary/20 select-none" />
          <div className="text-foreground/75 leading-relaxed italic text-[15px] space-y-2">
            {block.content?.trim()
              ? block.content.split("\n").filter(Boolean).map((line, li) => (
                  <p key={li}>{parseLatexInline(line.trim())}</p>
                ))
              : block.children?.map((c, ci) => renderBlock(c, ci, figureNumber))
            }
          </div>
        </blockquote>
      )
    }

    // Theorem-like environments
    case "theorem":
    case "definition":
    case "lemma":
    case "corollary":
    case "proof":
    case "remark":
    case "example":
    case "warning":
    case "note": {
      const envKey = block.type
      const style = THEOREM_STYLES[envKey] || THEOREM_STYLES.note
      const IconComp = style.icon
      const displayLabel = style.label
      const num = block.envNumber
      const title = block.envTitle

      const innerText = block.content?.trim() || ""
      const innerParagraphs = innerText.split(/\n{2,}/).filter(Boolean)

      return (
        <div
          key={`thm-${index}`}
          className={cn(
            "my-4 rounded-r-xl rounded-l-md py-3 px-4 border border-border/40 border-l-2",
            style.borderClass,
            style.bgClass
          )}
        >
          {title && (
            <div className={cn("mb-1", style.textClass)}>
              <span className="text-[13px] font-semibold tracking-wide">
                {title}
              </span>
            </div>
          )}
          <div className="text-[14.5px] leading-[1.7] text-foreground/80 space-y-1.5">
            {innerParagraphs.length > 0
              ? innerParagraphs.map((para, pi) => (
                  <p key={pi}>{parseLatexInline(para.trim())}</p>
                ))
              : block.children?.map((c, ci) => renderBlock(c, ci, figureNumber))
            }
            {envKey === "proof" && (
              <span className="block text-right font-serif text-base text-foreground/50 select-none mt-2" title="QED">□</span>
            )}
          </div>
        </div>
      )
    }

    case "table": {
      const rows = block.rows || []
      if (rows.length === 0) return null
      const [headerRow, ...bodyRows] = rows
      return (
        <div key={`tbl-${index}`} className="my-6 w-full overflow-x-auto rounded-xl border border-border/50 shadow-xs">
          <table className="w-full text-[13.5px] border-collapse">
            {block.hasHeader && (
              <thead>
                <tr className="bg-muted/40 border-b border-border/60">
                  {headerRow.map((cell, ci) => (
                    <th
                      key={ci}
                      className="px-4 py-3 text-left font-semibold text-foreground/90 whitespace-nowrap"
                    >
                      {parseLatexInline(cell)}
                    </th>
                  ))}
                </tr>
              </thead>
            )}
            <tbody>
              {(block.hasHeader ? bodyRows : rows).map((row, ri) => (
                <tr
                  key={ri}
                  className={cn(
                    "border-b border-border/30 last:border-0",
                    ri % 2 === 0 ? "bg-transparent" : "bg-muted/20"
                  )}
                >
                  {row.map((cell, ci) => (
                    <td key={ci} className="px-4 py-2.5 text-foreground/75">
                      {parseLatexInline(cell)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )
    }

    default:
      return null
  }
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface LatexRendererProps {
  content?: string
  className?: string
}

export function LatexRenderer({ content = "", className }: LatexRendererProps) {
  const elements = useMemo(() => {
    if (!content?.trim()) {
      return [
        <p key="empty" className="text-xs italic text-muted-foreground/60">
          No content provided.
        </p>,
      ]
    }

    const rawBlocks = parseLatexDocument(content)

    // Collapse & filter empty blocks
    const collapsed: Block[] = []
    for (const block of rawBlocks) {
      if (block.type === "empty") {
        if (collapsed.length > 0 && collapsed[collapsed.length - 1].type === "empty") continue
      }
      collapsed.push(block)
    }

    const blocks = collapsed.filter((block, idx) => {
      if (block.type !== "empty") return true
      if (idx === 0 || idx === collapsed.length - 1) return false
      const prev = collapsed[idx - 1]
      const next = collapsed[idx + 1]
      return prev?.type === "paragraph" && next?.type === "paragraph"
    })

    // Pre-calculate figure numbers
    let figureCounter = 0
    const figNums: Record<number, number> = {}
    blocks.forEach((block, idx) => {
      if (block.type === "figure") figNums[idx] = ++figureCounter
    })

    return blocks.map((block, idx) => renderBlock(block, idx, figNums[idx]))
  }, [content])

  return (
    <div className={cn("w-full text-foreground/80", className)}>
      {elements}
    </div>
  )
}
