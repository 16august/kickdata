import { sql, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { leagues, teams, fixtures, players } from "@/lib/db/schema";
import { isports } from "@/lib/isports/client";
import { isFreeLeague } from "@/lib/tiers";

export interface SyncLeaguesResult {
  total: number;
  upserted: number;
  free: number;
}

/**
 * Fetches the full league master list from iSportsAPI and upserts it into the
 * `leagues` table (keyed on `isports_league_id`). Safe to run repeatedly —
 * existing rows are updated, new ones inserted.
 */
export async function syncLeagues(): Promise<SyncLeaguesResult> {
  const rows = await isports.leagues();

  let free = 0;
  const values = rows
    .filter((l) => l.leagueId && l.name)
    .map((l) => {
      const isFree = isFreeLeague(l.leagueId);
      if (isFree) free++;
      return {
        isportsLeagueId: l.leagueId,
        name: l.name,
        shortName: l.shortName || null,
        country: l.country || null,
        season: l.currentSeason != null ? String(l.currentSeason) : null,
        logo: l.logo || null,
        type: typeof l.type === "number" ? l.type : null,
        isFree,
      };
    });

  // Upsert in chunks to keep each SQL statement a reasonable size.
  const CHUNK = 300;
  let upserted = 0;
  for (let i = 0; i < values.length; i += CHUNK) {
    const chunk = values.slice(i, i + CHUNK);
    await db
      .insert(leagues)
      .values(chunk)
      .onConflictDoUpdate({
        target: leagues.isportsLeagueId,
        set: {
          name: sql`excluded.name`,
          shortName: sql`excluded.short_name`,
          country: sql`excluded.country`,
          season: sql`excluded.season`,
          logo: sql`excluded.logo`,
          type: sql`excluded.type`,
          isFree: sql`excluded.is_free`,
          updatedAt: sql`now()`,
        },
      });
    upserted += chunk.length;
  }

  return { total: rows.length, upserted, free };
}

export interface SyncTeamsResult {
  leagues: number;
  upserted: number;
}

/**
 * Syncs teams for the free leagues (one iSportsAPI call per league — the
 * "all teams" endpoint returns ~16MB and times out). Teams are linked back to
 * their internal league id and enriched with the league's country.
 */
export async function syncTeams(): Promise<SyncTeamsResult> {
  // Only the free leagues have team data worth syncing on the current key.
  const freeLeagues = await db
    .select({
      id: leagues.id,
      isportsLeagueId: leagues.isportsLeagueId,
      country: leagues.country,
    })
    .from(leagues)
    .where(eq(leagues.isFree, true));

  let upserted = 0;
  for (const league of freeLeagues) {
    const rows = await isports.teams(league.isportsLeagueId);

    const values = rows
      .filter((t) => t.teamId && t.name)
      .map((t) => ({
        isportsTeamId: t.teamId,
        leagueId: league.id,
        isportsLeagueId: league.isportsLeagueId,
        name: t.name,
        logo: t.logo || null,
        country: league.country || null,
        venue: t.venue || null,
        coach: t.coach || null,
        foundingDate: t.foundingDate || null,
        website: t.website || null,
        capacity: typeof t.capacity === "number" ? t.capacity : null,
        isNational: typeof t.isNational === "boolean" ? t.isNational : null,
      }));

    if (values.length === 0) continue;

    await db
      .insert(teams)
      .values(values)
      .onConflictDoUpdate({
        target: teams.isportsTeamId,
        set: {
          leagueId: sql`excluded.league_id`,
          isportsLeagueId: sql`excluded.isports_league_id`,
          name: sql`excluded.name`,
          logo: sql`excluded.logo`,
          country: sql`excluded.country`,
          venue: sql`excluded.venue`,
          coach: sql`excluded.coach`,
          foundingDate: sql`excluded.founding_date`,
          website: sql`excluded.website`,
          capacity: sql`excluded.capacity`,
          isNational: sql`excluded.is_national`,
        },
      });
    upserted += values.length;
  }

  return { leagues: freeLeagues.length, upserted };
}

/** Builds a lookup of iSportsAPI team id -> internal team id. */
async function teamIdMap(): Promise<Map<string, number>> {
  const rows = await db
    .select({ id: teams.id, isportsTeamId: teams.isportsTeamId })
    .from(teams);
  return new Map(rows.map((r) => [r.isportsTeamId, r.id]));
}

export interface SyncFixturesResult {
  leagues: number;
  upserted: number;
}

/**
 * Syncs fixtures (schedule & results) for the free leagues, one call per
 * league. Home/away teams are linked to internal ids where known.
 */
export async function syncFixtures(): Promise<SyncFixturesResult> {
  const freeLeagues = await db
    .select({ id: leagues.id, isportsLeagueId: leagues.isportsLeagueId, season: leagues.season })
    .from(leagues)
    .where(eq(leagues.isFree, true));

  const teamMap = await teamIdMap();

  let upserted = 0;
  for (const league of freeLeagues) {
    const rows = await isports.schedule(league.isportsLeagueId);

    const values = rows
      .filter((m) => m.matchId)
      .map((m) => ({
        isportsMatchId: m.matchId,
        leagueId: league.id,
        homeTeamId: m.homeId ? teamMap.get(m.homeId) ?? null : null,
        awayTeamId: m.awayId ? teamMap.get(m.awayId) ?? null : null,
        homeName: m.homeName || null,
        awayName: m.awayName || null,
        kickoff: m.matchTime ? new Date(m.matchTime * 1000) : null,
        status: m.status != null ? String(m.status) : null,
        scoreHome: typeof m.homeScore === "number" ? m.homeScore : null,
        scoreAway: typeof m.awayScore === "number" ? m.awayScore : null,
        round: m.round || null,
        season: m.season || league.season || null,
      }));

    const CHUNK = 300;
    for (let i = 0; i < values.length; i += CHUNK) {
      const chunk = values.slice(i, i + CHUNK);
      if (chunk.length === 0) continue;
      await db
        .insert(fixtures)
        .values(chunk)
        .onConflictDoUpdate({
          target: fixtures.isportsMatchId,
          set: {
            homeTeamId: sql`excluded.home_team_id`,
            awayTeamId: sql`excluded.away_team_id`,
            homeName: sql`excluded.home_name`,
            awayName: sql`excluded.away_name`,
            kickoff: sql`excluded.kickoff`,
            status: sql`excluded.status`,
            scoreHome: sql`excluded.score_home`,
            scoreAway: sql`excluded.score_away`,
            round: sql`excluded.round`,
            season: sql`excluded.season`,
            updatedAt: sql`now()`,
          },
        });
      upserted += chunk.length;
    }
  }

  return { leagues: freeLeagues.length, upserted };
}

export interface SyncPlayersResult {
  teams: number;
  upserted: number;
}

/**
 * Syncs players for every team in the free leagues (one call per team).
 * Spaced out to respect iSportsAPI's call-frequency limit (the client also
 * retries on rate-limit responses).
 */
export async function syncPlayers(): Promise<SyncPlayersResult> {
  const freeTeams = await db
    .select({ id: teams.id, isportsTeamId: teams.isportsTeamId })
    .from(teams)
    .innerJoin(leagues, eq(teams.leagueId, leagues.id))
    .where(eq(leagues.isFree, true));

  let upserted = 0;
  for (const team of freeTeams) {
    const rows = await isports.players(team.isportsTeamId);

    const values = rows
      .filter((p) => p.recordId && p.name)
      .map((p) => ({
        isportsRecordId: p.recordId,
        isportsPlayerId: p.playerId || null,
        teamId: team.id,
        isportsTeamId: team.isportsTeamId,
        name: p.name,
        position: p.position || null,
        number: typeof p.number === "number" && p.number > 0 ? p.number : null,
        birthday: p.birthday || null,
        height: typeof p.height === "number" && p.height > 0 ? p.height : null,
        weight: typeof p.weight === "number" && p.weight > 0 ? p.weight : null,
        country: p.country || null,
        feet: p.feet || null,
        photo: p.photo || null,
        marketValue: typeof p.value === "number" ? p.value : null,
        contractEndDate: p.contractEndDate || null,
      }));

    if (values.length === 0) continue;

    await db
      .insert(players)
      .values(values)
      .onConflictDoUpdate({
        target: players.isportsRecordId,
        set: {
          teamId: sql`excluded.team_id`,
          name: sql`excluded.name`,
          position: sql`excluded.position`,
          number: sql`excluded.number`,
          birthday: sql`excluded.birthday`,
          height: sql`excluded.height`,
          weight: sql`excluded.weight`,
          country: sql`excluded.country`,
          feet: sql`excluded.feet`,
          photo: sql`excluded.photo`,
          marketValue: sql`excluded.market_value`,
          contractEndDate: sql`excluded.contract_end_date`,
        },
      });
    upserted += values.length;
  }

  return { teams: freeTeams.length, upserted };
}
