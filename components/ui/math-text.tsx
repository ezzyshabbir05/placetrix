"use client"

/**
 * MathText
 * --------
 * Renders a string that may contain LaTeX math delimiters alongside plain text.
 *
 * Supported delimiters:
 *   Display math  : $$...$$
 *   Inline math   : $...$
 *
 * Example input:
 *   "If $x + \frac{1}{x} = 5$, what is $x^5 + \frac{1}{x^5}$?"
 */

import "katex/dist/katex.min.css"
import katex from "katex"
import { useMemo } from "react"

type Segment =
    | { type: "text"; value: string }
    | { type: "math"; value: string; display: boolean }

/** Split a raw string into alternating text / math segments. */
function parseSegments(raw: string): Segment[] {
    const segments: Segment[] = []
    // Match $$...$$ first (display), then $...$ (inline).
    // [^$]+ allows any character (including newlines) except a second $,
    // so multi-line or complex expressions don't silently fall through.
    const re = /\$\$([\s\S]+?)\$\$|\$([^$]+?)\$/g
    let lastIndex = 0
    let match: RegExpExecArray | null

    while ((match = re.exec(raw)) !== null) {
        // Preceding plain text
        if (match.index > lastIndex) {
            segments.push({ type: "text", value: raw.slice(lastIndex, match.index) })
        }

        if (match[1] !== undefined) {
            // Display math $$...$$
            segments.push({ type: "math", value: match[1], display: true })
        } else {
            // Inline math $...$
            segments.push({ type: "math", value: match[2], display: false })
        }

        lastIndex = re.lastIndex
    }

    // Trailing plain text
    if (lastIndex < raw.length) {
        segments.push({ type: "text", value: raw.slice(lastIndex) })
    }

    return segments
}

function MathSegment({ latex, display }: { latex: string; display: boolean }) {
    const html = useMemo(() => {
        try {
            return katex.renderToString(latex, {
                displayMode: display,
                throwOnError: false,
                // Allows common LaTeX macros without crashing
                trust: false,
            })
        } catch {
            return `<span style="color: red; font-size: 0.85em">[LaTeX error: ${latex}]</span>`
        }
    }, [latex, display])

    if (display) {
        return (
            <span
                className="my-2 block overflow-x-auto py-1 text-center"
                // react-doctor-disable-next-line
                dangerouslySetInnerHTML={{ __html: html }}
            />
        )
    }

    return (
        <span
            className="inline align-middle"
            // react-doctor-disable-next-line
            dangerouslySetInnerHTML={{ __html: html }}
        />
    )
}

interface MathTextProps {
    /** The raw string, possibly containing $...$ or $$...$$ delimiters. */
    children: string
    /** Extra class names applied to the wrapping element. */
    className?: string
}

/**
 * Drop-in replacement for a plain <p> / <span> wherever question or option
 * text may contain LaTeX math.
 */
export function MathText({ children, className }: MathTextProps) {
    const segments = useMemo(() => parseSegments(children), [children])

    return (
        <span className={className}>
            {segments.map((seg, i) => {
                const key = `${seg.type}-${i}`
                return seg.type === "text" ? (
                    <span key={key}>{seg.value}</span>
                ) : (
                    <MathSegment key={key} latex={seg.value} display={seg.display} />
                )
            })}
        </span>
    )
}
