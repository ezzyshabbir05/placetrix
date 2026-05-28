import { UAParser } from "ua-parser-js";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ParsedUA {
  browser: string;
  os: string;
  device: "desktop" | "mobile" | "tablet";
}

// ─── Server / bot UA strings to filter out ────────────────────────────────────

const SERVER_TOKENS = [
  "next.js",
  "middleware",
  "vercel",
  "node-fetch",
  "undici",
  "go-http-client",
  "postgrest-js",
  "supabase-js",
  "python-httpx",
  "python-requests",
  "axios",
  "curl",
  "wget",
  "httpie",
  "okhttp",
  // Firebase App Hosting / Google Cloud Run infrastructure agents
  "googlehc",
  "firebase",
];

function isServerUA(ua: string): boolean {
  const lower = ua.toLowerCase();
  // Firebase App Hosting / Cloud Run sends exactly "Google" or "Google/<version>" as its UA
  if (lower === "google" || lower.startsWith("google/")) return true;
  return SERVER_TOKENS.some((t) => lower.includes(t));
}

// ─── parseUserAgent ───────────────────────────────────────────────────────────

/**
 * Parses a raw User-Agent string into a human-readable browser, OS and device
 * type using `ua-parser-js` — the industry-standard UA parsing library.
 *
 * Handles edge cases:
 * - Missing / null UA → "Unknown Device"
 * - Server/bot UA strings → "System (Server)"
 * - Unknown browser/OS components → graceful fallback labels
 */
export function parseUserAgent(ua: string | null | undefined): ParsedUA {
  if (!ua) {
    return { browser: "Unknown Browser", os: "Unknown OS", device: "desktop" };
  }

  if (isServerUA(ua)) {
    return { browser: "System", os: "Server", device: "desktop" };
  }

  const parser = new UAParser(ua);
  const result = parser.getResult();

  // ── Browser ───────────────────────────────────────────────────────────────
  const browserName = result.browser.name;
  const browser = browserName ?? "Unknown Browser";

  // ── OS ────────────────────────────────────────────────────────────────────
  const osName = result.os.name;
  const os = osName ?? "Unknown OS";

  // ── Device type ───────────────────────────────────────────────────────────
  const deviceType = result.device.type; // "mobile" | "tablet" | "console" | "smarttv" | "wearable" | "embedded" | undefined
  let device: "desktop" | "mobile" | "tablet" = "desktop";
  if (deviceType === "mobile") device = "mobile";
  else if (deviceType === "tablet") device = "tablet";

  return { browser, os, device };
}
