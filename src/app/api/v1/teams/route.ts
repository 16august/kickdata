import { NextResponse } from "next/server";
import { eq, asc } from "drizzle-orm";
import { db } from "@/lib/db";
import { teams, leagues } from "@/lib/db/schema";
import { guard, errorResponse } from "@/lib/api/guard";
import { getTierConfig } from "@/lib/tiers";

export const runtime = "nodejs";

// GET /api/v1/teams?league=<leagueId>
// Returns all teams in a league. The `league` id is the internal id from
// GET /api/v1/leagues (not the upstream provider id).
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
    .from(teams)
    .where(eq(teams.leagueId, leagueId))
    .orderBy(asc(teams.name));

  const data = rows.map((t) => ({
    id: t.id,
    name: t.name,
    logo: t.logo,
    country: t.country,
    venue: t.venue,
    coach: t.coach,
    foundingDate: t.foundingDate,
    capacity: t.capacity,
    website: t.website,
    isNational: t.isNational,
  }));

  return NextResponse.json(
    { league: league.name, count: data.length, data },
    { headers: g.headers }
  );
}
