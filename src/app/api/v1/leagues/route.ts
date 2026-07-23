import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { leagues } from "@/lib/db/schema";
import { guard } from "@/lib/api/guard";
import { getTierConfig } from "@/lib/tiers";

export const runtime = "nodejs";

// GET /api/v1/leagues
// Free tier sees only free leagues; Pro sees everything.
export async function GET(req: Request) {
  const g = await guard(req);
  if ("response" in g) return g.response;

  const tier = getTierConfig(g.key.tier);

  const rows = tier.allPaidLeagues
    ? await db.select().from(leagues)
    : await db.select().from(leagues).where(eq(leagues.isFree, true));

  const data = rows.map((l) => ({
    id: l.id,
    name: l.name,
    country: l.country,
    season: l.season,
    isFree: l.isFree,
  }));

  return NextResponse.json({ tier: g.key.tier, count: data.length, data }, { headers: g.headers });
}
