import { NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { db } from "@/lib/db";
import { fixtures, leagues } from "@/lib/db/schema";
import { guard, errorResponse } from "@/lib/api/guard";
import { getTierConfig } from "@/lib/tiers";

export const runtime = "nodejs";

// GET /api/v1/fixtures?league=<leagueId>
export async function GET(req: Request) {
  const g = await guard(req);
  if ("response" in g) return g.response;

  const { searchParams } = new URL(req.url);
  const leagueParam = searchParams.get("league");
  if (!leagueParam) {
    return errorResponse(400, "Query param `league` (league id) is required.");
  }
  const leagueId = Number(leagueParam);
  if (!Number.isInteger(leagueId)) {
    return errorResponse(400, "`league` must be a numeric league id.");
  }

  // Verify the league exists and is allowed for this tier.
  const [league] = await db
    .select()
    .from(leagues)
    .where(eq(leagues.id, leagueId))
    .limit(1);

  if (!league) return errorResponse(404, "League not found.");

  const tier = getTierConfig(g.key.tier);
  if (!league.isFree && !tier.allPaidLeagues) {
    return errorResponse(403, "This league requires a Pro subscription.");
  }

  const rows = await db
    .select()
    .from(fixtures)
    .where(and(eq(fixtures.leagueId, leagueId)));

  const data = rows.map((f) => ({
    id: f.id,
    kickoff: f.kickoff,
    status: f.status,
    homeTeamId: f.homeTeamId,
    awayTeamId: f.awayTeamId,
    score: { home: f.scoreHome, away: f.scoreAway },
  }));

  return NextResponse.json({ league: league.name, count: data.length, data }, { headers: g.headers });
}
