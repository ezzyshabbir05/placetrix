/**
 * Token-aware C++ Formatter
 *
 * Provides clean, robust C++ formatting without naive destructive string replacements:
 * - Accurately tracks string literals ("..."), char literals ('...'), and escape sequences (\", \')
 * - Preserves single-line (//) and multi-line (/* ... *\/) comments verbatim
 * - Protects loop headers `for (...)` and expressions from statement splitting
 * - Keeps `};` together cleanly on class/struct definitions
 * - Formats access specifiers (public:, private:, protected:) and labels
 * - Applies consistent 4-space indentation with clean statement grouping
 */

export function formatCppCode(rawCode: string, indentSize = 4): string {
  if (!rawCode || !rawCode.trim()) return rawCode;

  try {
    const formatted = formatCppTokens(rawCode, indentSize);
    return formatted.trimEnd() + "\n";
  } catch (err) {
    console.warn("[cppFormatter] Fallback to original code due to error:", err);
    return rawCode;
  }
}

function formatCppTokens(code: string, indentSize: number): string {
  const indentStr = " ".repeat(indentSize);

  // Phase 1: Lexical stream processing
  let output = "";
  let inString = false;
  let inChar = false;
  let inLineComment = false;
  let inBlockComment = false;
  let parenDepth = 0;
  let i = 0;

  // Helper to consume horizontal whitespace
  const skipHorizontalWhitespace = (idx: number): number => {
    while (idx < code.length && (code[idx] === " " || code[idx] === "\t")) {
      idx++;
    }
    return idx;
  };

  while (i < code.length) {
    const char = code[i];
    const nextChar = i + 1 < code.length ? code[i + 1] : "";
    const prevChar = i > 0 ? code[i - 1] : "";

    // 1. Line Comment (//)
    if (inLineComment) {
      output += char;
      if (char === "\n") {
        inLineComment = false;
      }
      i++;
      continue;
    }

    // 2. Block Comment (/* ... */)
    if (inBlockComment) {
      output += char;
      if (prevChar === "*" && char === "/") {
        inBlockComment = false;
      }
      i++;
      continue;
    }

    // 3. String Literal ("...")
    if (inString) {
      output += char;
      if (char === '"' && (prevChar !== "\\" || isEscapedBackslash(code, i - 1))) {
        inString = false;
      }
      i++;
      continue;
    }

    // 4. Char Literal ('...')
    if (inChar) {
      output += char;
      if (char === "'" && (prevChar !== "\\" || isEscapedBackslash(code, i - 1))) {
        inChar = false;
      }
      i++;
      continue;
    }

    // Check entry into comments or strings
    if (char === "/" && nextChar === "/") {
      inLineComment = true;
      output += "//";
      i += 2;
      continue;
    }

    if (char === "/" && nextChar === "*") {
      inBlockComment = true;
      output += "/*";
      i += 2;
      continue;
    }

    if (char === '"') {
      inString = true;
      output += '"';
      i++;
      continue;
    }

    if (char === "'") {
      inChar = true;
      output += "'";
      i++;
      continue;
    }

    // Track parenthesis depth: inside for-loops or expressions, do not split statements
    if (char === "(") {
      parenDepth++;
      output += "(";
      i++;
      continue;
    }

    if (char === ")") {
      if (parenDepth > 0) parenDepth--;
      output += ")";
      i++;
      continue;
    }

    // Outside strings, comments, and parentheses:
    if (char === "{" && parenDepth === 0) {
      const trimmedEnd = output.trimEnd();
      output = trimmedEnd + " {\n";
      i++;
      // Consume any immediately following newline to prevent double newline
      i = skipHorizontalWhitespace(i);
      if (i < code.length && code[i] === "\r") i++;
      if (i < code.length && code[i] === "\n") i++;
      continue;
    }

    if (char === "}" && parenDepth === 0) {
      // Check if followed by ';' (class / struct closing)
      let lookahead = skipHorizontalWhitespace(i + 1);
      if (lookahead < code.length && code[lookahead] === ";") {
        output += "\n};\n";
        i = lookahead + 1;
        // Consume following newline
        i = skipHorizontalWhitespace(i);
        if (i < code.length && code[i] === "\r") i++;
        if (i < code.length && code[i] === "\n") i++;
        continue;
      } else {
        output += "\n}\n";
        i++;
        // Consume following newline
        i = skipHorizontalWhitespace(i);
        if (i < code.length && code[i] === "\r") i++;
        if (i < code.length && code[i] === "\n") i++;
        continue;
      }
    }

    if (char === ";" && parenDepth === 0) {
      output += ";\n";
      i++;
      // Consume trailing spaces and the immediate newline to avoid double-newline
      i = skipHorizontalWhitespace(i);
      if (i < code.length && code[i] === "\r") i++;
      if (i < code.length && code[i] === "\n") i++;
      continue;
    }

    output += char;
    i++;
  }

  // Phase 2: Line-by-line indentation & structural cleanup
  const rawLines = output.split("\n");
  const cleanedLines: string[] = [];
  let indentLevel = 0;

  for (let lineIndex = 0; lineIndex < rawLines.length; lineIndex++) {
    let line = rawLines[lineIndex].trim();

    if (!line) {
      // Only keep an empty line if previous line wasn't empty and wasn't an opening brace
      if (
        cleanedLines.length > 0 &&
        cleanedLines[cleanedLines.length - 1] !== "" &&
        !cleanedLines[cleanedLines.length - 1].endsWith("{")
      ) {
        cleanedLines.push("");
      }
      continue;
    }

    // Preprocessor directives stay at indent 0
    if (line.startsWith("#")) {
      cleanedLines.push(line);
      continue;
    }

    // Closing braces adjust indent before printing
    const startsWithClosingBrace = line.startsWith("}") || line.startsWith("};");
    if (startsWithClosingBrace) {
      // Remove any blank line immediately preceding a closing brace
      if (cleanedLines.length > 0 && cleanedLines[cleanedLines.length - 1] === "") {
        cleanedLines.pop();
      }
      indentLevel = Math.max(0, indentLevel - 1);
    }

    // Access specifiers (public:, private:, protected:)
    const isAccessSpecifier =
      line === "public:" || line === "private:" || line === "protected:";

    // Case / Default labels
    const isCaseLabel =
      (line.startsWith("case ") && line.endsWith(":")) || line === "default:";

    let currentIndent = indentLevel;
    if (isAccessSpecifier || isCaseLabel) {
      currentIndent = Math.max(0, indentLevel - 1);
    }

    cleanedLines.push(indentStr.repeat(currentIndent) + line);

    // If line ended with opening brace, increase indent
    if (line.endsWith("{") && !startsWithClosingBrace) {
      indentLevel++;
    }

    // Net brace balancing for inline blocks like `} else {`
    const openCount = (line.match(/{/g) || []).length;
    const closeCount = (line.match(/}/g) || []).length;
    if (openCount > 0 && closeCount > 0) {
      if (startsWithClosingBrace && line.endsWith("{")) {
        indentLevel++;
      }
    }
  }

  // Trim trailing empty lines
  while (cleanedLines.length > 0 && cleanedLines[cleanedLines.length - 1] === "") {
    cleanedLines.pop();
  }

  return cleanedLines.join("\n");
}

function isEscapedBackslash(code: string, index: number): boolean {
  let count = 0;
  while (index >= 0 && code[index] === "\\") {
    count++;
    index--;
  }
  return count % 2 === 0;
}
