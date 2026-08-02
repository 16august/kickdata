import { NextResponse } from "next/server";
import { eq, and, or, asc, type SQL } from "drizzle-orm";
import { db } from "@/lib/db";
import { fixtures, leagues, teams } from "@/lib/db/schema";
import { guard, errorResponse } from "@/lib/api/guard";
import { getTierConfig } from "@/lib/tiers";

export const runtime = "nodejs";

// GET /api/v1/fixtures?league=<leagueId>&team=<teamId>
// At least one of `league` or `team` is required. `team` returns every fixture
// the team plays (home or away); combine with `league` to scope to one league.
export async function GET(req: Request) {
  const g = await guard(req);
  if ("response" in g) return g.response;

  const { searchParams } = new URL(req.url);
  const leagueParam = searchParams.get("league");
  const teamParam = searchParams.get("team");

  if (!leagueParam && !teamParam) {
    return errorResponse(400, "Provide at least one of `league` or `team` (id).");
  }

  const tier = getTierConfig(g.key.tier);
  const conditions: SQL[] = [];
  const meta: { league?: string; team?: string } = {};

  // --- team filter ---------------------------------------------------------
  if (teamParam) {
    const teamId = Number(teamParam);
    if (!Number.isInteger(teamId)) {
      return errorResponse(400, "`team` must be a numeric team id.");
    }
    const [team] = await db.select().from(teams).where(eq(teams.id, teamId)).limit(1);
    if (!team) return errorResponse(404, "Team not found.");

    // Tier-gate via the team's league.
    if (team.leagueId) {
      const [league] = await db
        .select({ isFree: leagues.isFree })
        .from(leagues)
        .where(eq(leagues.id, team.leagueId))
        .limit(1);
      if (league && !league.isFree && !tier.allPaidLeagues) {
        return errorResponse(403, "This team's league requires a Pro subscription.");
      }
    }

    conditions.push(or(eq(fixtures.homeTeamId, teamId), eq(fixtures.awayTeamId, teamId))!);
    meta.team = team.name;
  }

  // --- league filter -------------------------------------------------------
  if (leagueParam) {
    const leagueId = Number(leagueParam);
    if (!Number.isInteger(leagueId)) {
      return errorResponse(400, "`league` must be a numeric league id.");
    }
    const [league] = await db.select().from(leagues).where(eq(leagues.id, leagueId)).limit(1);
    if (!league) return errorResponse(404, "League not found.");

    if (!league.isFree && !tier.allPaidLeagues) {
      return errorResponse(403, "This league requires a Pro subscription.");
    }

    conditions.push(eq(fixtures.leagueId, leagueId));
    meta.league = league.name;
  }

  const rows = await db
    .select()
    .from(fixtures)
    .where(and(...conditions))
    .orderBy(asc(fixtures.kickoff));

  const data = rows.map((f) => ({
    id: f.id,
    round: f.round,
    season: f.season,
    kickoff: f.kickoff,
    status: f.status,
    location: f.location,
    home: { teamId: f.homeTeamId, name: f.homeName },
    away: { teamId: f.awayTeamId, name: f.awayName },
    score: {
      home: f.scoreHome,
      away: f.scoreAway,
      halftime: { home: f.scoreHomeHalf, away: f.scoreAwayHalf },
    },
    cards: {
      home: { yellow: f.homeYellow, red: f.homeRed },
      away: { yellow: f.awayYellow, red: f.awayRed },
    },
    corners: { home: f.homeCorner, away: f.awayCorner },
  }));

  return NextResponse.json({ ...meta, count: data.length, data }, { headers: g.headers });
}
