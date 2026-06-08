"use client"

import * as React from "react"
import { useMemo } from "react"
import { MathText } from "./math-text"

/**
 * Stack-based balanced brace parser for LaTeX inline formatting.
 * Recursively parses formatting tags (textbf, textit, texttt, href, url)
 * and Katex inline/block math delimiters ($ and $$).
 */
export function parseLatexInline(text: string): React.ReactNode[] {
  if (!text) return []
  const elements: React.ReactNode[] = []
  let i = 0

  while (i < text.length) {
    // Check for display math $$
    if (text.startsWith("$$", i)) {
      const j = text.indexOf("$$", i + 2)
      if (j !== -1) {
        const mathContent = text.slice(i, j + 2)
        elements.push(<MathText key={i}>{mathContent}</MathText>)
        i = j + 2
        continue
      }
    }

    // Check for inline math $
    if (text.startsWith("$", i)) {
      const j = text.indexOf("$", i + 1)
      if (j !== -1) {
        const mathContent = text.slice(i, j + 1)
        elements.push(<MathText key={i}>{mathContent}</MathText>)
        i = j + 1
        continue
      }
    }

    // Check for LaTeX macros
    let matchedMacro = false
    const macros = [
      { prefix: "\\textbf{", name: "textbf" },
      { prefix: "\\textit{", name: "textit" },
      { prefix: "\\texttt{", name: "texttt" },
      { prefix: "\\url{", name: "url" },
      { prefix: "\\href{", name: "href" },
    ]

    for (const macro of macros) {
      if (text.startsWith(macro.prefix, i)) {
        // Find matching closing brace
        let braceCount = 1
        let j = i + macro.prefix.length
        while (j < text.length && braceCount > 0) {
          if (text[j] === "{") braceCount++
          else if (text[j] === "}") braceCount--
          j++
        }

        if (braceCount === 0) {
          matchedMacro = true
          const contentWithBrace = text.slice(i + macro.prefix.length, j - 1)
          
          if (macro.name === "textbf") {
            elements.push(
              <strong key={i} className="font-bold text-foreground">
                {parseLatexInline(contentWithBrace)}
              </strong>
            )
          } else if (macro.name === "textit") {
            elements.push(
              <em key={i} className="italic text-foreground/95">
                {parseLatexInline(contentWithBrace)}
              </em>
            )
          } else if (macro.name === "texttt") {
            elements.push(
              <code key={i} className="bg-muted border px-1.5 py-0.5 rounded text-[12px] font-mono text-emerald-600 dark:text-emerald-400">
                {contentWithBrace}
              </code>
            )
          } else if (macro.name === "url") {
            elements.push(
              <a key={i} href={contentWithBrace} target="_blank" rel="noopener noreferrer" className="text-primary underline hover:text-primary/80 transition-colors">
                {contentWithBrace}
              </a>
            )
          } else if (macro.name === "href") {
            // Check if followed by the label block {label}
            if (j < text.length && text[j] === "{") {
              let nextBraceCount = 1
              let k = j + 1
              while (k < text.length && nextBraceCount > 0) {
                if (text[k] === "{") nextBraceCount++
                else if (text[k] === "}") nextBraceCount--
                k++
              }
              if (nextBraceCount === 0) {
                const label = text.slice(j + 1, k - 1)
                elements.push(
                  <a key={i} href={contentWithBrace} target="_blank" rel="noopener noreferrer" className="text-primary underline hover:text-primary/80 transition-colors">
                    {parseLatexInline(label)}
                  </a>
                )
                j = k
              } else {
                elements.push(
                  <a key={i} href={contentWithBrace} target="_blank" rel="noopener noreferrer" className="text-primary underline hover:text-primary/80 transition-colors">
                    {contentWithBrace}
                  </a>
                )
              }
            } else {
              elements.push(
                <a key={i} href={contentWithBrace} target="_blank" rel="noopener noreferrer" className="text-primary underline hover:text-primary/80 transition-colors">
                  {contentWithBrace}
                </a>
              )
            }
          }
          i = j
          break
        }
      }
    }

    if (matchedMacro) continue

    // Read plain text until next display math, inline math, or macro
    let nextSpecial = i + 1
    while (nextSpecial < text.length) {
      const char = text[nextSpecial]
      if (char === "$" || char === "\\" || text.startsWith("$$", nextSpecial)) {
        break
      }
      nextSpecial++
    }

    let plainText = text.slice(i, nextSpecial)
    // Replace escaped characters like \&, \%, \_, \{, \} with actual characters
    plainText = plainText.replace(/\\([&%_{}])/g, "$1")
    
    elements.push(<span key={i}>{plainText}</span>)
    i = nextSpecial
  }

  return elements
}

interface LatexRendererProps {
  content?: string
  className?: string
}

export function LatexRenderer({ content = "", className }: LatexRendererProps) {
  const elements = useMemo(() => {
    if (!content) return [<p key="empty" className="text-xs italic text-muted-foreground/60">No content provided.</p>]

    const lines = content.split("\n")
    const list: React.ReactNode[] = []
    
    let inItemize = false
    let inEnumerate = false
    let itemizeItems: string[] = []
    let enumerateItems: string[] = []

    const flushLists = (keyPrefix: string) => {
      if (inItemize && itemizeItems.length > 0) {
        list.push(
          <ul key={`ul-${keyPrefix}`} className="list-disc pl-6 space-y-1.5 my-3 text-muted-foreground text-sm">
            {itemizeItems.map((item, idx) => (
              <li key={`li-${idx}`}>
                {parseLatexInline(item)}
              </li>
            ))}
          </ul>
        )
        itemizeItems = []
        inItemize = false
      }
      if (inEnumerate && enumerateItems.length > 0) {
        list.push(
          <ol key={`ol-${keyPrefix}`} className="list-decimal pl-6 space-y-1.5 my-3 text-muted-foreground text-sm">
            {enumerateItems.map((item, idx) => (
              <li key={`li-${idx}`}>
                {parseLatexInline(item)}
              </li>
            ))}
          </ol>
        )
        enumerateItems = []
        inEnumerate = false
      }
    }

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      const trimmed = line.trim()

      if (!trimmed) {
        if (!inItemize && !inEnumerate) {
          list.push(<div key={`empty-${i}`} className="h-3" />)
        }
        continue
      }

      // Handle environment tags
      if (trimmed.startsWith("\\begin{itemize}")) {
        flushLists(String(i))
        inItemize = true
        continue
      }
      if (trimmed.startsWith("\\end{itemize}")) {
        flushLists(String(i))
        continue
      }
      if (trimmed.startsWith("\\begin{enumerate}")) {
        flushLists(String(i))
        inEnumerate = true
        continue
      }
      if (trimmed.startsWith("\\end{enumerate}")) {
        flushLists(String(i))
        continue
      }

      // Handle verbatim code environment
      if (trimmed.startsWith("\\begin{verbatim}")) {
        flushLists(String(i))
        
        let codeContent = ""
        let j = i + 1
        while (j < lines.length && !lines[j].trim().startsWith("\\end{verbatim}")) {
          codeContent += lines[j] + "\n"
          j++
        }
        
        list.push(
          <div key={`verbatim-${i}`} className="bg-muted/50 border border-border/50 rounded-lg overflow-hidden my-3 font-mono text-xs">
            <pre className="p-3 overflow-x-auto text-foreground/80 whitespace-pre scrollbar-thin">
              {codeContent.trim()}
            </pre>
          </div>
        )
        
        i = j // Advance outer loop index
        continue
      }

      // Handle equations (equation and align blocks)
      if (trimmed.startsWith("\\begin{equation}") || trimmed.startsWith("\\begin{align}")) {
        flushLists(String(i))
        const isAlign = trimmed.includes("align")
        const envName = isAlign ? "align" : "equation"
        
        let equationContent = ""
        let j = i + 1
        while (j < lines.length && !lines[j].trim().startsWith(`\\end{${envName}}`)) {
          equationContent += lines[j] + "\n"
          j++
        }
        
        const rawFormula = isAlign 
          ? `$$ \\begin{aligned} ${equationContent.trim()} \\end{aligned} $$`
          : `$$ ${equationContent.trim()} $$`

        list.push(
          <div key={`eq-${i}`} className="my-4 block text-center">
            <MathText>{rawFormula}</MathText>
          </div>
        )
        
        i = j // Advance outer loop index
        continue
      }

      // Handle block math $$ ... $$ that spans multiple lines
      if (trimmed.startsWith("$$")) {
        flushLists(String(i))
        
        let blockContent = trimmed
        const hasClosingDoubleDollar = trimmed.length > 2 && trimmed.endsWith("$$")
        
        if (!hasClosingDoubleDollar) {
          let j = i + 1
          while (j < lines.length) {
            const nextTrimmed = lines[j].trim()
            blockContent += "\n" + lines[j]
            if (nextTrimmed.endsWith("$$") || nextTrimmed.includes("$$")) {
              break
            }
            j++
          }
          i = j // Advance outer loop index
        }
        
        list.push(
          <div key={`blockmath-${i}`} className="my-4 block text-center">
            <MathText>{blockContent.trim()}</MathText>
          </div>
        )
        continue
      }

      // Handle Markdown-style image tags
      if (trimmed.startsWith("![") && trimmed.endsWith(")")) {
        const match = trimmed.match(/^!\[(.*?)\]\((.*?)\)$/)
        if (match) {
          const alt = match[1]
          const url = match[2]
          flushLists(String(i))
          list.push(
            <div key={`img-${i}`} className="my-4 max-w-full overflow-hidden rounded-lg border bg-muted/20 p-1.5">
              <img src={url} alt={alt} className="max-h-[350px] w-auto max-w-full object-contain mx-auto rounded-lg shadow-xs" />
            </div>
          )
          continue
        }
      }

      // Handle items
      if (trimmed.startsWith("\\item")) {
        const itemContent = trimmed.slice(5).trim()
        if (inItemize) {
          itemizeItems.push(itemContent)
        } else if (inEnumerate) {
          enumerateItems.push(itemContent)
        } else {
          list.push(
            <ul key={`ul-fallback-${i}`} className="list-disc pl-6 my-2 text-muted-foreground text-sm">
              <li>{parseLatexInline(itemContent)}</li>
            </ul>
          )
        }
        continue
      }

      if (inItemize) {
        if (itemizeItems.length > 0) {
          itemizeItems[itemizeItems.length - 1] += "\n" + trimmed
        } else {
          itemizeItems.push(trimmed)
        }
        continue
      }
      if (inEnumerate) {
        if (enumerateItems.length > 0) {
          enumerateItems[enumerateItems.length - 1] += "\n" + trimmed
        } else {
          enumerateItems.push(trimmed)
        }
        continue
      }

      // Handle Headings
      const sectionMatch = trimmed.match(/^\\section\{([\s\S]+?)\}/)
      if (sectionMatch) {
        flushLists(String(i))
        list.push(
          <h1 key={`sec-${i}`} className="text-base font-bold text-foreground mt-6 mb-3 border-b pb-1">
            {parseLatexInline(sectionMatch[1])}
          </h1>
        )
        continue
      }

      const subsectionMatch = trimmed.match(/^\\subsection\{([\s\S]+?)\}/)
      if (subsectionMatch) {
        flushLists(String(i))
        list.push(
          <h2 key={`subsec-${i}`} className="text-sm font-semibold text-foreground mt-5 mb-2">
            {parseLatexInline(subsectionMatch[1])}
          </h2>
        )
        continue
      }

      const subsubsectionMatch = trimmed.match(/^\\subsubsection\{([\s\S]+?)\}/)
      if (subsubsectionMatch) {
        flushLists(String(i))
        list.push(
          <h3 key={`subsubsec-${i}`} className="text-xs font-medium text-foreground mt-4 mb-1.5">
            {parseLatexInline(subsubsectionMatch[1])}
          </h3>
        )
        continue
      }

      // Paragraph / standard text line
      list.push(
        <p key={`p-${i}`} className="text-foreground/85 leading-relaxed text-sm my-2">
          {parseLatexInline(line)}
        </p>
      )
    }

    flushLists("end")
    return list
  }, [content])

  return <div className={className}>{elements}</div>
}
