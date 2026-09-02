"use client"

/**
 * rich-text.tsx
 *
 * Unified rich-text renderer: Markdown (GFM) + LaTeX Math (KaTeX) + Prism syntax highlighting.
 *
 * Exports:
 *   <RichText>        – block-level renderer (replaces LatexRenderer)
 *   <InlineRichText>  – inline-only renderer  (replaces MathText)
 *   <CodeBlock>       – standalone syntax-highlighted code block
 */

import * as React from "react"
import { useMemo, useState } from "react"
import ReactMarkdown from "react-markdown"
import remarkMath from "remark-math"
import remarkGfm from "remark-gfm"
import rehypeKatex from "rehype-katex"
import Prism from "prismjs"
import "katex/dist/katex.min.css"
import { Copy, Check, ZoomIn, ExternalLink, AlertTriangle } from "lucide-react"
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { getOptimizedImageUrl } from "@/lib/test-image-upload"

// ── Prism language imports ────────────────────────────────────────────────────
import "prismjs/components/prism-javascript"
import "prismjs/components/prism-typescript"
import "prismjs/components/prism-python"
import "prismjs/components/prism-sql"
import "prismjs/components/prism-c"
import "prismjs/components/prism-cpp"
import "prismjs/components/prism-csharp"
import "prismjs/components/prism-java"
import "prismjs/components/prism-bash"
import "prismjs/components/prism-json"
import "prismjs/components/prism-css"
import "prismjs/components/prism-markup"

// ── Adaptive Prism CSS (Atom One Light / Dark) ────────────────────────────────
const PRISM_CSS = `
:root {
  --prism-bg: var(--background);
  --prism-fg: var(--foreground);
  --prism-selection: var(--muted);
  --prism-gutter-bg: var(--muted);
  --prism-gutter-fg: var(--muted-foreground);
  --prism-gutter-sep: var(--border);
  --prism-line-hover: color-mix(in oklch, var(--foreground) 5%, transparent);
  --prism-scrollbar: var(--border);
  --prism-scrollbar-hover: var(--muted-foreground);
  --prism-comment: #a0a1a7;
  --prism-keyword: #a626a4;
  --prism-string: #50a14f;
  --prism-number: #986801;
  --prism-function: #4078f2;
  --prism-operator: #0184bc;
  --prism-punctuation: #383a42;
  --prism-class: #c18401;
  --prism-regex: #0184bc;
  --prism-variable: #e45649;
  --prism-builtin: #0184bc;
  --prism-tag: #e45649;
  --prism-attr: #986801;
}
.dark {
  --prism-comment: #5c6370;
  --prism-keyword: #c678dd;
  --prism-string: #98c379;
  --prism-number: #d19a66;
  --prism-function: #61afef;
  --prism-operator: #56b6c2;
  --prism-punctuation: #abb2bf;
  --prism-class: #e5c07b;
  --prism-regex: #56b6c2;
  --prism-variable: #e06c75;
  --prism-builtin: #56b6c2;
  --prism-tag: #e06c75;
  --prism-attr: #d19a66;
}
code[class*="language-"], pre[class*="language-"] {
  color: var(--prism-fg);
  background: none;
  font-family: var(--font-mono, "JetBrains Mono", ui-monospace, monospace);
  font-size: 0.8125rem;
  line-height: 1.75;
  tab-size: 2;
  hyphens: none;
  white-space: pre;
  word-break: normal;
  word-spacing: normal;
  word-wrap: normal;
  text-shadow: none;
}
code[class*="language-"]::selection,
code[class*="language-"] *::selection,
pre[class*="language-"]::selection,
pre[class*="language-"] *::selection { background: var(--prism-selection); }
.token.comment, .token.prolog, .token.doctype, .token.cdata { color: var(--prism-comment); font-style: italic; }
.token.punctuation { color: var(--prism-punctuation); }
.token.namespace { opacity: 0.8; }
.token.tag, .token.deleted { color: var(--prism-tag); }
.token.attr-name { color: var(--prism-attr); }
.token.property, .token.boolean, .token.constant, .token.symbol { color: var(--prism-variable); }
.token.number { color: var(--prism-number); }
.token.selector, .token.string, .token.char, .token.inserted, .token.attr-value { color: var(--prism-string); }
.token.operator, .token.entity, .token.url, .language-css .token.string, .style .token.string { color: var(--prism-operator); }
.token.atrule, .token.keyword { color: var(--prism-keyword); }
.token.function { color: var(--prism-function); }
.token.class-name { color: var(--prism-class); }
.token.builtin { color: var(--prism-builtin); }
.token.regex { color: var(--prism-regex); }
.token.important, .token.variable { color: var(--prism-variable); }
.token.important, .token.bold { font-weight: 600; }
.token.italic { font-style: italic; }
.prism-scroll::-webkit-scrollbar { height: 5px; width: 5px; display: block; }
.prism-scroll::-webkit-scrollbar-track { background: transparent; }
.prism-scroll::-webkit-scrollbar-thumb { background: var(--prism-scrollbar); border-radius: 999px; }
.prism-scroll::-webkit-scrollbar-thumb:hover { background: var(--prism-scrollbar-hover); }
.prism-scroll { scrollbar-width: thin; scrollbar-color: var(--prism-scrollbar) transparent; }
.prism-line:hover { background: var(--prism-line-hover); }
`

// ── Language → display label + accent colour ──────────────────────────────────
const LANG_META: Record<string, { label: string; accent: string }> = {
  javascript:  { label: "JavaScript",  accent: "#d19a66" },
  typescript:  { label: "TypeScript",  accent: "#61afef" },
  python:      { label: "Python",      accent: "#c678dd" },
  sql:         { label: "SQL",         accent: "#56b6c2" },
  bash:        { label: "Bash",        accent: "#98c379" },
  sh:          { label: "Shell",       accent: "#98c379" },
  c:           { label: "C",           accent: "#61afef" },
  cpp:         { label: "C++",         accent: "#61afef" },
  csharp:      { label: "C#",          accent: "#c678dd" },
  java:        { label: "Java",        accent: "#e06c75" },
  json:        { label: "JSON",        accent: "#d19a66" },
  css:         { label: "CSS",         accent: "#56b6c2" },
  html:        { label: "HTML",        accent: "#e06c75" },
  xml:         { label: "XML",         accent: "#e06c75" },
}

const LANG_ALIASES: Record<string, string> = {
  js: "javascript", ts: "typescript", py: "python",
  cs: "csharp", shell: "bash", sh: "bash", "c++": "cpp",
}

// ── CodeBlock ─────────────────────────────────────────────────────────────────

interface CodeBlockProps {
  code: string
  language?: string
  caption?: string
  allowCopy?: boolean
}

export function CodeBlock({ code, language, caption, allowCopy = true }: CodeBlockProps) {
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
    const lower = language.toLowerCase()
    return LANG_ALIASES[lower] ?? lower
  }, [language])

  const html = useMemo(() => {
    const grammar = Prism.languages[normalizedLang] || Prism.languages.clike
    try {
      return Prism.highlight(code, grammar, normalizedLang)
    } catch {
      return code.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    }
  }, [code, normalizedLang])

  const lines = code.split("\n")
  const lineCount = lines.length
  const lineNumberWidth = String(lineCount).length
  const meta = LANG_META[normalizedLang]
  const accent = meta?.accent ?? "var(--prism-gutter-fg)"
  const langLabel = meta?.label ?? (language ? language.toUpperCase() : "")

  return (
    <div
      className="rounded-xl border border-border/50 overflow-hidden my-6 font-mono text-[13px] transition-all duration-200 shadow-sm hover:shadow-md hover:border-border/70"
      style={{ background: "var(--prism-bg)" }}
    >
      {/* ── Header ── */}
      <div className="flex items-center justify-between border-b border-border/40 bg-muted/50 dark:bg-muted/30 px-4 py-2.5 font-sans select-none">
        <div className="flex items-center gap-3">
          <div className="flex gap-[5px] items-center">
            <span className="size-[11px] rounded-full bg-[#ff5f57] block ring-1 ring-inset ring-black/10" />
            <span className="size-[11px] rounded-full bg-[#febc2e] block ring-1 ring-inset ring-black/10" />
            <span className="size-[11px] rounded-full bg-[#28c840] block ring-1 ring-inset ring-black/10" />
          </div>
          <span
            className="text-[12px] font-medium"
            style={{ color: caption ? "var(--prism-fg)" : "var(--prism-gutter-fg)", opacity: caption ? 0.7 : 1 }}
          >
            {caption ?? "Code"}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {langLabel && (
            <span
              className="inline-flex items-center text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full"
              style={{
                color: accent,
                background: `color-mix(in oklch, ${accent} 12%, transparent)`,
                border: `1px solid color-mix(in oklch, ${accent} 30%, transparent)`,
              }}
            >
              {langLabel}
            </span>
          )}
          {allowCopy && (
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
          )}
        </div>
      </div>

      {/* ── Code body ── */}
      <div
        className={cn("flex overflow-x-auto max-h-[540px] prism-scroll", !allowCopy && "select-none")}
        data-lang={normalizedLang}
      >
        {lineCount > 1 && (
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
              <span key={idx} className="block prism-line leading-[1.75] px-1 rounded-sm transition-colors duration-100">
                {idx + 1}
              </span>
            ))}
          </div>
        )}
        <pre
          className={cn("p-4 flex-1 whitespace-pre min-w-0 m-0 prism-scroll", !allowCopy && "select-none")}
          style={{ color: "var(--prism-fg)", background: "var(--prism-bg)", lineHeight: "1.75" }}
        >
          <code
            className={cn(`language-${normalizedLang} font-mono`, !allowCopy && "select-none")}
            dangerouslySetInnerHTML={{ __html: html }}
          />
        </pre>
      </div>
    </div>
  )
}

// ── <ZoomableImage> ──────────────────────────────────────────────────────────

function ZoomableImage({
  src,
  alt,
  inline = false,
}: {
  src?: string
  alt?: string
  inline?: boolean
}) {
  const [open, setOpen] = useState(false)
  const [isZoomed, setIsZoomed] = useState(false)
  const [hasError, setHasError] = useState(false)

  if (!src) return null

  if (hasError) {
    return (
      <span className={cn(
        "inline-flex items-center gap-1.5 rounded-lg border border-destructive/30 bg-destructive/5 px-2.5 py-1.5 text-xs text-destructive",
        inline ? "my-1 align-middle" : "my-2"
      )}>
        <AlertTriangle className="size-3.5 shrink-0" />
        <span>Failed to load image{alt ? `: ${alt}` : ""}</span>
      </span>
    )
  }

  return (
    <>
      <span
        role="button"
        tabIndex={0}
        onClick={(e) => {
          e.stopPropagation()
          setOpen(true)
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.stopPropagation()
            setOpen(true)
          }
        }}
        className={cn(
          "group relative cursor-zoom-in rounded-xl transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-primary",
          inline ? "my-1 inline-block align-middle max-w-full" : "my-3 block w-fit max-w-full"
        )}
      >
        <span className={cn(
          "relative flex items-center justify-center overflow-hidden rounded-xl border border-border/70 bg-muted/20 p-1.5 shadow-xs transition-all duration-300 group-hover:border-primary/60 group-hover:shadow-md",
          inline
            ? "max-w-[260px] max-h-[180px] w-auto h-auto"
            : "max-w-xl max-h-[420px] w-auto h-auto min-h-[80px]"
        )}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={getOptimizedImageUrl(src)}
            alt={alt ?? "Image"}
            onError={() => setHasError(true)}
            className={cn(
              "object-contain select-none rounded-lg transition-transform duration-300 group-hover:scale-[1.01]",
              inline ? "max-w-[250px] max-h-[170px] w-auto h-auto" : "max-w-full max-h-[400px] w-auto h-auto"
            )}
          />

          <span className="absolute bottom-2 right-2 flex items-center gap-1 rounded-md bg-background/90 px-1.5 py-0.5 text-[10px] sm:text-[11px] font-medium text-foreground backdrop-blur-md opacity-0 shadow-sm transition-opacity duration-200 group-hover:opacity-100 border border-border/50 select-none pointer-events-none">
            <ZoomIn className="size-3 text-primary" />
            <span>Click to zoom</span>
          </span>
        </span>

        {alt && !inline && (
          <span className="mt-1.5 block text-left text-xs text-muted-foreground select-none italic max-w-md truncate">
            {alt}
          </span>
        )}
      </span>

      {/* Lightbox Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className="z-[100] max-w-[94vw] lg:max-w-6xl w-full p-2 sm:p-4 bg-background/95 backdrop-blur-xl border border-border/80 shadow-2xl rounded-2xl overflow-hidden flex flex-col max-h-[92vh]"
          showCloseButton={true}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="sr-only">
            <DialogTitle>{alt ?? "Enlarged Image Preview"}</DialogTitle>
            <DialogDescription>Full view of the image</DialogDescription>
          </div>

          <div className="relative flex-1 overflow-auto flex items-center justify-center min-h-[300px] max-h-[78vh] p-2 bg-muted/10 rounded-xl">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={getOptimizedImageUrl(src)}
              alt={alt ?? "Enlarged view"}
              onClick={() => setIsZoomed((z) => !z)}
              className={cn(
                "h-auto max-w-full object-contain rounded-lg transition-all duration-300 select-none",
                isZoomed ? "scale-125 cursor-zoom-out" : "max-h-[75vh] cursor-zoom-in"
              )}
            />
          </div>

          <div className="mt-2 flex items-center justify-between px-2 text-xs text-muted-foreground">
            <span className="truncate font-medium text-foreground/80 max-w-[60%]">
              {alt || "Image preview"}
            </span>
            <div className="flex items-center gap-2 shrink-0">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs gap-1 px-2"
                onClick={() => setIsZoomed((z) => !z)}
              >
                <ZoomIn className="size-3.5" />
                {isZoomed ? "Reset Zoom" : "2x Zoom"}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs gap-1 px-2"
                asChild
              >
                <a href={src} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="size-3.5" />
                  Open Full
                </a>
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

// ── Shared Markdown component map ─────────────────────────────────────────────

type Components = React.ComponentProps<typeof ReactMarkdown>["components"]

function buildComponents(inline = false, allowCopy = true): Components {
  return {
    h1: ({ node, ...props }) => (
      <h1 className="font-bold text-2xl md:text-3xl tracking-tight text-foreground mt-10 mb-4 first:mt-0" {...props}>
        {props.children}
        <div className="mt-2.5 h-px bg-gradient-to-r from-border/70 via-border/30 to-transparent" />
      </h1>
    ),
    h2: ({ node, ...props }) => (
      <h2 className="font-semibold text-xl tracking-tight text-foreground mt-8 mb-3 first:mt-0" {...props} />
    ),
    h3: ({ node, ...props }) => (
      <h3 className="font-semibold text-lg text-foreground/85 mt-6 mb-2 first:mt-0" {...props} />
    ),
    h4: ({ node, ...props }) => (
      <h4 className="font-semibold text-base text-foreground/80 uppercase tracking-wider mt-5 mb-1.5 first:mt-0" {...props} />
    ),

    p: ({ node, ...props }) =>
      inline ? (
        <span className="inline" {...props} />
      ) : (
        <p className="text-foreground/80 leading-[1.85] text-[15px] my-4 font-normal first:mt-0" {...props} />
      ),

    ul: ({ node, ...props }) => (
      <ul className="list-none pl-0 space-y-1.5 my-5 text-foreground/80 text-[15px]" {...props} />
    ),
    ol: ({ node, ...props }) => (
      <ol className="list-decimal pl-6 space-y-1.5 my-5 text-foreground/80 text-[15px] marker:text-primary/70 marker:font-semibold" {...props} />
    ),
    li: ({ node, ordered, ...props }: any) => (
      <li className={cn(
        "leading-relaxed text-foreground/85",
        ordered ? "list-item" : "flex items-start gap-2.5 pl-0 list-none"
      )}>
        {!ordered && <span className="mt-[0.42em] size-1.5 rounded-full bg-primary/50 flex-shrink-0 block" />}
        <span className="flex-1" {...props} />
      </li>
    ),

    blockquote: ({ node, ...props }) => (
      <blockquote
        className="my-6 pl-5 pr-4 py-4 border-l-4 border-primary/40 bg-primary/5 rounded-r-xl relative italic text-foreground/75 leading-relaxed text-[15px]"
        {...props}
      />
    ),

    hr: ({ node, ...props }) => (
      <hr className="my-8 border-0 h-px bg-gradient-to-r from-transparent via-border/60 to-transparent" {...props} />
    ),

    a: ({ node, href, ...props }) => (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="text-primary underline decoration-primary/30 underline-offset-4 hover:decoration-primary hover:text-primary/85 transition-all duration-200 font-medium"
        {...props}
      />
    ),

    img: ({ node, src, alt }: any) => (
      <ZoomableImage src={src} alt={alt} inline={inline} />
    ),

    table: ({ node, ...props }) => (
      <div className="my-4 w-full overflow-x-auto rounded-xl border border-border/50 bg-card/40 shadow-xs">
        <table className="w-full text-[13.5px] border-collapse min-w-max sm:min-w-0" {...props} />
      </div>
    ),
    thead: ({ node, ...props }) => <thead className="bg-muted/60 border-b border-border/70" {...props} />,
    th: ({ node, ...props }) => (
      <th className="px-4 py-2.5 font-semibold text-foreground/90 text-left select-none" {...props} />
    ),
    tbody: ({ node, ...props }) => <tbody className="divide-y divide-border/30" {...props} />,
    tr: ({ node, ...props }) => (
      <tr className="hover:bg-muted/30 transition-colors odd:bg-transparent even:bg-muted/15" {...props} />
    ),
    td: ({ node, ...props }) => (
      <td className="px-4 py-2.5 text-foreground/80 leading-relaxed align-middle" {...props} />
    ),

    // Strip the outer <pre> — CodeBlock renders its own wrapper
    pre: ({ node, ...props }) => <>{props.children}</>,

    code: ({ node, className, children, ...props }: any) => {
      const match = /language-(\w+)/.exec(className || "")
      const isBlock = !!match || String(children ?? "").includes("\n")

      if (isBlock) {
        const lang = match?.[1] ?? ""
        const codeStr = String(children ?? "").replace(/\n$/, "")
        return <CodeBlock code={codeStr} language={lang} allowCopy={allowCopy} />
      }

      return (
        <code
          className={cn(
            "bg-muted/70 border border-border/40 px-1.5 py-0.5 rounded-md text-[12.5px] font-mono text-foreground/95 font-medium",
            !allowCopy && "select-none"
          )}
          {...props}
        >
          {children}
        </code>
      )
    },
  }
}

// ── Content normalizer ────────────────────────────────────────────────────────

/**
 * Compatibility shim: normalizes common LaTeX text macros and AI output
 * artifacts to standard Markdown so the unified pipeline handles them cleanly.
 */
function normalizeContent(raw: string): string {
  if (!raw) return ""
  return raw
    .replace(/\\n/g, "\n")
    .replace(/\\textbf\{([^}]+)\}/g, "**$1**")
    .replace(/\\textit\{([^}]+)\}/g, "*$1*")
    .replace(/\\emph\{([^}]+)\}/g, "*$1*")
    .replace(/\\texttt\{([^}]+)\}/g, "`$1`")
    .replace(/\\underline\{([^}]+)\}/g, "$1")
    .replace(/\${3,}([^$]+?)\${3,}/g, "$$$$$$1$$$$$$")
}

// ── <RichText> ────────────────────────────────────────────────────────────────

export interface RichTextProps {
  /** Raw Markdown + LaTeX content */
  content?: string
  className?: string
  /** Whether to show copy button on code blocks. Defaults to true. */
  allowCopy?: boolean
}

/**
 * Full block-level rich-text renderer.
 * Supports: GFM Markdown, LaTeX math ($, $$, \(...\), \[...\]),
 * fenced code blocks with syntax highlighting, tables, images, and more.
 *
 * Drop-in replacement for <LatexRenderer>.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const KATEX_BLOCK_OPTIONS: any = {
  throwOnError: false,
  strict: false,
  output: "html",
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const KATEX_INLINE_OPTIONS: any = {
  throwOnError: false,
  strict: false,
  output: "html",
  displayMode: false,
}

export function RichText({ content = "", className, allowCopy = true }: RichTextProps) {
  const normalized = useMemo(() => normalizeContent(content), [content])

  if (!normalized.trim()) {
    return <p className="text-xs italic text-muted-foreground/60">No content provided.</p>
  }

  return (
    <div className={cn("w-full text-foreground/80", className)}>
      <style dangerouslySetInnerHTML={{ __html: PRISM_CSS }} />
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[[rehypeKatex, KATEX_BLOCK_OPTIONS]]}
        components={buildComponents(false, allowCopy)}
      >
        {normalized}
      </ReactMarkdown>
    </div>
  )
}

// ── <InlineRichText> ──────────────────────────────────────────────────────────

export interface InlineRichTextProps {
  /** Raw text with optional $...$ / $$...$$ math, **bold**, *italic*, `code`. */
  children: string
  className?: string
  /** Whether to allow code copying. Defaults to false in tests/questions. */
  allowCopy?: boolean
}

/**
 * Lightweight inline rich-text renderer — no block-level headings.
 * Ideal for question text, option text, and short explanations in tests.
 * Code copy is disabled by default for test integrity.
 *
 * Drop-in replacement for <MathText>.
 */
export function InlineRichText({ children, className, allowCopy = false }: InlineRichTextProps) {
  const normalized = useMemo(() => normalizeContent(children ?? ""), [children])

  return (
    <span className={cn("inline", className)}>
      <style dangerouslySetInnerHTML={{ __html: PRISM_CSS }} />
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[[rehypeKatex, KATEX_INLINE_OPTIONS]]}
        components={buildComponents(true, allowCopy)}
      >
        {normalized}
      </ReactMarkdown>
    </span>
  )
}

