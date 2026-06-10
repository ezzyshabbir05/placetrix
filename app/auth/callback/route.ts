import { createClient } from "@/lib/supabase/server";
import { NextResponse, type NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  // 1. Remove 'origin' from here. We will define it explicitly below.
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/home";

  // Validate redirect target — only allow relative paths to prevent open redirects.
  const safeNext = next.startsWith("/") ? next : "/home";

  // 2. Explicitly define your base URL using an environment variable or request url.
  // This bypasses the Docker 0.0.0.0 internal binding issue entirely.
  const getBaseUrl = () => {
    const requestUrl = new URL(request.url);
    // If the request came to localhost, keep it on localhost
    if (requestUrl.hostname === "localhost" || requestUrl.hostname === "127.0.0.1") {
      return `${requestUrl.protocol}//${requestUrl.host}`;
    }

    let url =
      process.env.NEXT_PUBLIC_SITE_URL ?? // Set this to https://placetrix.app in prod
      process.env.NEXT_PUBLIC_VERCEL_URL ?? // Automatically set by Vercel (if you ever use it)
      "http://localhost:3000"; // Fallback for local dev
    
    // Ensure it includes `https://`
    url = url.startsWith("http") ? url : `https://${url}`;
    // Remove trailing slash if present
    return url.charAt(url.length - 1) === "/" ? url.slice(0, -1) : url;
  };

  const baseUrl = getBaseUrl();

  if (!code) {
    return NextResponse.redirect(
      // 3. Use baseUrl instead of origin
      `${baseUrl}/auth/error?error=${encodeURIComponent(
        "No authorisation code returned from provider."
      )}`
    );
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    console.error("[auth/callback] exchangeCodeForSession error:", error.message);
    return NextResponse.redirect(
      // 4. Use baseUrl instead of origin
      `${baseUrl}/auth/error?error=${encodeURIComponent(error.message)}`
    );
  }

  // 5. Use baseUrl instead of origin for the final successful redirect
  return NextResponse.redirect(`${baseUrl}${safeNext}`);
}