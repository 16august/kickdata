import { NextResponse } from "next/server";
import { openapi } from "@/lib/openapi";

export const runtime = "nodejs";

// GET /api/openapi — the OpenAPI document consumed by the docs UI.
export function GET() {
  return NextResponse.json(openapi);
}
