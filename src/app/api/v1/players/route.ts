import { NextResponse } from "next/server";
import { eq, asc } from "drizzle-orm";
import { db } from "@/lib/db";
import { players, teams, leagues } from "@/lib/db/schema";
import { guard, errorResponse } from "@/lib/api/guard";
import { getTierConfig } from "@/lib/tiers";

export const runtime = "nodejs";

// GET /api/v1/players?team=<teamId>
// Lists players (and coach) for a team. `team` is the internal id from
// GET /api/v1/teams.
export async function GET(req: Request) {
  const g = await guard(req);
  if ("response" in g) return g.response;

  const { searchParams } = new URL(req.url);
  const teamParam = searchParams.get("team");
  if (!teamParam) {
    return errorResponse(400, "Query param `team` (team id) is required.");
  }
  const teamId = Number(teamParam);
  if (!Number.isInteger(teamId)) {
    return errorResponse(400, "`team` must be a numeric team id.");
  }

  const [team] = await db
    .select()
    .from(teams)
    .where(eq(teams.id, teamId))
    .limit(1);

  if (!team) return errorResponse(404, "Team not found.");

  // Tier gate via the team's league.
  const tier = getTierConfig(g.key.tier);
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

  const rows = await db
    .select()
    .from(players)
    .where(eq(players.teamId, teamId))
    .orderBy(asc(players.number));

  const data = rows.map((p) => ({
    id: p.id,
    name: p.name,
    position: p.position,
    number: p.number,
    birthday: p.birthday,
    height: p.height,
    weight: p.weight,
    country: p.country,
    feet: p.feet,
    photo: p.photo,
    marketValue: p.marketValue,
    contractEndDate: p.contractEndDate,
  }));

  return NextResponse.json(
    { team: team.name, count: data.length, data },
    { headers: g.headers }
  );
}
