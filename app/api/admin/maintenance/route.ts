// app/api/admin/maintenance/route.ts
//
// Secured endpoint to toggle maintenance mode in the Supabase app_config table.
//
// Usage:
//   # Enable maintenance mode
//   curl -X POST https://placetrix.app/api/admin/maintenance \
//     -H "Content-Type: application/json" \
//     -H "X-Admin-Secret: <your ADMIN_SECRET>" \
//     -d '{"enabled": true}'
//
//   # Disable maintenance mode
//   curl -X POST https://placetrix.app/api/admin/maintenance \
//     -H "Content-Type: application/json" \
//     -H "X-Admin-Secret: <your ADMIN_SECRET>" \
//     -d '{"enabled": false}'
//
// Environment variables required:
//   ADMIN_SECRET              — a long random string you choose; keeps this route private
//   SUPABASE_SERVICE_ROLE_KEY — service role key (server-only, never NEXT_PUBLIC_)

import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  // ── 1. Authenticate the caller ────────────────────────────────────────────
  const secret = request.headers.get("x-admin-secret");
  const expectedSecret = process.env.ADMIN_SECRET;

  if (!expectedSecret) {
    return NextResponse.json(
      { error: "ADMIN_SECRET is not configured on this server." },
      { status: 500 }
    );
  }

  if (!secret || secret !== expectedSecret) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  // ── 2. Parse body ─────────────────────────────────────────────────────────
  let body: { enabled?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (typeof body.enabled !== "boolean") {
    return NextResponse.json(
      { error: '`enabled` must be a boolean (true or false).' },
      { status: 400 }
    );
  }

  const enabled = body.enabled;

  // ── 3. Update app_config via Supabase REST (service role) ─────────────────
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!serviceRoleKey) {
    return NextResponse.json(
      { error: "SUPABASE_SERVICE_ROLE_KEY is not configured on this server." },
      { status: 500 }
    );
  }

  const res = await fetch(
    `${supabaseUrl}/rest/v1/app_config?key=eq.maintenance_mode`,
    {
      method: "PATCH",
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify({
        value: enabled,
        updated_at: new Date().toISOString(),
      }),
    }
  );

  if (!res.ok) {
    const errorBody = await res.text();
    console.error("[maintenance toggle] Supabase error:", res.status, errorBody);
    return NextResponse.json(
      { error: "Failed to update maintenance mode in database." },
      { status: 502 }
    );
  }

  const updated = await res.json();

  return NextResponse.json({
    success: true,
    maintenance_mode: enabled,
    updated_at: updated[0]?.updated_at ?? new Date().toISOString(),
    note: "Change will propagate across all instances within ~30 seconds.",
  });
}

// Disable GET so no one can probe whether it's on or off without the secret
export async function GET() {
  return NextResponse.json({ error: "Method not allowed." }, { status: 405 });
}
