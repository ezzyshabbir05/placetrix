/**
 * Execution Code Sanitizer & Sandboxing Security Module
 *
 * Replaces blunt regex filtering with token-sanitized code validation:
 * 1. Strips string literals and comments prior to inspecting high-risk system access.
 * 2. Prevents false positives on variables like `eval_score`, `evaluate()`, or comments mentioning `subprocess`.
 * 3. Exports hardened Judge0 execution configurations (disabling network, enforcing wall-time & process limits).
 */

export interface SecurityCheckResult {
  valid: boolean;
  reason?: string;
}

/**
 * Strips strings, chars, and comments from source code so keyword checks only
 * inspect actual executable code tokens.
 */
function stripCommentsAndStrings(code: string, langId: number): string {
  let result = "";
  let i = 0;
  let inString = false;
  let stringChar = "";
  let inLineComment = false;
  let inBlockComment = false;

  const isPython = langId === 71;

  while (i < code.length) {
    const char = code[i];
    const nextChar = i + 1 < code.length ? code[i + 1] : "";
    const prevChar = i > 0 ? code[i - 1] : "";

    // 1. In Python line comment (#)
    if (isPython && !inString && char === "#" && !inBlockComment && !inLineComment) {
      inLineComment = true;
      i++;
      continue;
    }

    // 2. In C-style line comment (//)
    if (!isPython && !inString && char === "/" && nextChar === "/" && !inBlockComment && !inLineComment) {
      inLineComment = true;
      i += 2;
      continue;
    }

    // End of line comment
    if (inLineComment) {
      if (char === "\n") {
        inLineComment = false;
        result += "\n";
      }
      i++;
      continue;
    }

    // 3. In C-style block comment (/* ... */)
    if (!inString && char === "/" && nextChar === "*" && !inBlockComment) {
      inBlockComment = true;
      i += 2;
      continue;
    }

    if (inBlockComment) {
      if (prevChar === "*" && char === "/") {
        inBlockComment = false;
      }
      i++;
      continue;
    }

    // 4. In Python triple-quoted string
    if (isPython && !inString && (code.slice(i, i + 3) === '"""' || code.slice(i, i + 3) === "'''")) {
      const quoteType = code.slice(i, i + 3);
      i += 3;
      while (i < code.length && code.slice(i, i + 3) !== quoteType) {
        if (code[i] === "\n") result += "\n";
        i++;
      }
      i += 3;
      continue;
    }

    // 5. String / Char Literals ("...", '...', `...`)
    if (!inString && (char === '"' || char === "'" || char === "`")) {
      inString = true;
      stringChar = char;
      i++;
      continue;
    }

    if (inString) {
      if (char === stringChar && (prevChar !== "\\" || isEscapedBackslash(code, i - 1))) {
        inString = false;
      } else if (char === "\n") {
        result += "\n";
      }
      i++;
      continue;
    }

    result += char;
    i++;
  }

  return result;
}

function isEscapedBackslash(code: string, index: number): boolean {
  let count = 0;
  while (index >= 0 && code[index] === "\\") {
    count++;
    index--;
  }
  return count % 2 === 0;
}

/**
 * Validates whether the source code contains dangerous system invocation attempts.
 * Operates purely on stripped tokens to eliminate false positives on comments or strings.
 */
export function validateSubmissionSecurity(
  code: string,
  languageId: number
): SecurityCheckResult {
  if (!code || !code.trim()) {
    return { valid: true };
  }

  const stripped = stripCommentsAndStrings(code, languageId);

  // Explicit word-boundary patterns targeting OS-level invocation
  const dangerousPatterns = [
    { pattern: /\bos\.system\s*\(/i, name: "os.system" },
    { pattern: /\bos\.popen\s*\(/i, name: "os.popen" },
    { pattern: /\bsubprocess\s*\.\s*(call|run|Popen|check_output)/i, name: "subprocess" },
    { pattern: /\bjava\s*\.\s*lang\s*\.\s*(Runtime|ProcessBuilder)\b/i, name: "Java Runtime/ProcessBuilder" },
    { pattern: /\b__import__\s*\(\s*['"](os|subprocess|sys)['"]\s*\)/i, name: "__import__ with system modules" },
    { pattern: /\b(Runtime\.getRuntime\s*\(\s*\)\s*\.\s*exec)/i, name: "Runtime.exec" },
    { pattern: /\bProcessBuilder\s*\(/i, name: "ProcessBuilder" },
  ];

  for (const { pattern, name } of dangerousPatterns) {
    if (pattern.test(stripped)) {
      return {
        valid: false,
        reason: `Restricted system execution call detected: ${name} is disabled in competitive workspace.`,
      };
    }
  }

  return { valid: true };
}

/**
 * Returns hardened Judge0 sandbox configuration options
 */
export function getJudge0SandboxConfig(timeLimitSec = 2.0, memoryLimitKb = 256000) {
  const safeTimeLimit = Math.min(Math.max(timeLimitSec || 2.0, 0.5), 15.0);
  const safeMemoryLimit = Math.min(Math.max(memoryLimitKb || 256000, 32000), 512000);

  return {
    cpu_time_limit: safeTimeLimit,
    cpu_extra_time: 1.0,
    wall_time_limit: Math.min(safeTimeLimit * 2.5, 25.0),
    memory_limit: safeMemoryLimit,
    max_processes_and_or_threads: 60,
    enable_network: false, // Prevents all outgoing network connections from student code
  };
}
