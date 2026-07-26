import { NextResponse } from "next/server";
import { eq, asc } from "drizzle-orm";
import { db } from "@/lib/db";
import { standings, leagues, teams } from "@/lib/db/schema";
import { guard, errorResponse } from "@/lib/api/guard";
import { getTierConfig } from "@/lib/tiers";

export const runtime = "nodejs";

// GET /api/v1/standings?league=<leagueId>
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
    .select({
      rank: standings.rank,
      teamId: standings.teamId,
      teamName: teams.name,
      played: standings.played,
      win: standings.win,
      draw: standings.draw,
      loss: standings.loss,
      goalsFor: standings.goalsFor,
      goalsAgainst: standings.goalsAgainst,
      goalDifference: standings.goalDifference,
      points: standings.points,
    })
    .from(standings)
    .leftJoin(teams, eq(standings.teamId, teams.id))
    .where(eq(standings.leagueId, leagueId))
    .orderBy(asc(standings.rank));

  const data = rows.map((s) => ({
    rank: s.rank,
    team: { id: s.teamId, name: s.teamName },
    played: s.played,
    win: s.win,
    draw: s.draw,
    loss: s.loss,
    goalsFor: s.goalsFor,
    goalsAgainst: s.goalsAgainst,
    goalDifference: s.goalDifference,
    points: s.points,
  }));

  return NextResponse.json({ league: league.name, count: data.length, data }, { headers: g.headers });
}
