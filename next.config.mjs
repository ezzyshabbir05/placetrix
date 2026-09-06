import { execSync } from "child_process";

/** @type {import('next').NextConfig} */
const nextConfig = {
  devIndicators: false,
  // ── Stable Build ID for Firebase App Hosting ─────────────────────────────
  // Next.js generates random server-action IDs per build. If a user is mid-test
  // when a new deploy goes out, their old IDs are invalid → "Server Action not
  // found" error. Pinning the build ID to the git commit hash means the same
  // commit produces the same action IDs, so zero-downtime redeploys of the
  // same code won't break in-flight sessions.
  generateBuildId: async () => {
    try {
      return execSync("git rev-parse HEAD").toString().trim();
    } catch {
      // Fallback for environments without git (CI, Docker, etc.)
      return `build-${Date.now()}`;
    }
  },
  experimental: {
    optimizePackageImports: [
      "lucide-react",
      "@tabler/icons-react",
      "date-fns",
      "recharts",
      "framer-motion",
      "@google/genai",
      "katex",
      "prismjs",
    ],
  },
  images: {
    minimumCacheTTL: 31536000,
    dangerouslyAllowLocalIP: true,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "db.placetrix.app",
        port: "",
        pathname: "/storage/v1/object/public/**",
      },
      {
        protocol: "https",
        hostname: "db.placetrix.app",
        port: "",
        pathname: "/storage/v1/render/image/public/**",
      },
    ],
  },
};

export default nextConfig;
