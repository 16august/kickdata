import { NextRequest, NextResponse } from "next/server";
import { openapi } from "@/lib/openapi";

export const runtime = "nodejs";

// GET /api/openapi — the OpenAPI document consumed by the docs UI.
//
// In dev the server list is rewritten to the current origin (e.g.
// http://localhost:3002) so the docs "Try it" client stays same-origin.
// Otherwise it would fire at the canonical www host, and since the API sends
// no CORS headers the browser blocks it as "Failed to fetch".
export function GET(request: NextRequest) {
  const servers =
    process.env.NODE_ENV === "development"
      ? [{ url: new URL(request.url).origin, description: "Local dev" }]
      : openapi.servers;

  return NextResponse.json({ ...openapi, servers });
}
