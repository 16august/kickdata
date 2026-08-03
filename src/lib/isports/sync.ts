import { sql, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { leagues, teams, fixtures, players, standings } from "@/lib/db/schema";
import { isports } from "@/lib/isports/client";
import { isFreeLeague } from "@/lib/tiers";

/**
 * Coerces a feed number into something an `integer` column will accept.
 *
 * The player feed is not consistent about scale: most teams report market value
 * as a whole number of thousands (12000) but some records come back as a
 * decimal (7.5), and Postgres rejects those outright — one such row used to
 * fail the entire players seed, which is why that table stayed empty.
 */
function int(v: unknown, opts: { positive?: boolean } = {}): number | null {
  if (typeof v !== "number" || !Number.isFinite(v)) return null;
  const n = Math.round(v);
  if (opts.positive && n <= 0) return null;
  return n;
}

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
  skipped: string[];
}

/**
 * Syncs fixtures (schedule & results) for the free leagues, one call per
 * league. Home/away teams are linked to internal ids where known. A league
 * whose call fails (e.g. transient rate-limit) is skipped and reported so one
 * bad league doesn't abort the whole sync.
 */
export async function syncFixtures(): Promise<SyncFixturesResult> {
  const freeLeagues = await db
    .select({ id: leagues.id, isportsLeagueId: leagues.isportsLeagueId, season: leagues.season })
    .from(leagues)
    .where(eq(leagues.isFree, true));

  const teamMap = await teamIdMap();

  let upserted = 0;
  const skipped: string[] = [];
  for (const league of freeLeagues) {
    let rows;
    try {
      rows = await isports.schedule(league.isportsLeagueId);
    } catch {
      skipped.push(league.isportsLeagueId);
      continue;
    }

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
        scoreHomeHalf: typeof m.homeHalfScore === "number" ? m.homeHalfScore : null,
        scoreAwayHalf: typeof m.awayHalfScore === "number" ? m.awayHalfScore : null,
        homeYellow: typeof m.homeYellow === "number" ? m.homeYellow : null,
        awayYellow: typeof m.awayYellow === "number" ? m.awayYellow : null,
        homeRed: typeof m.homeRed === "number" ? m.homeRed : null,
        awayRed: typeof m.awayRed === "number" ? m.awayRed : null,
        homeCorner: typeof m.homeCorner === "number" ? m.homeCorner : null,
        awayCorner: typeof m.awayCorner === "number" ? m.awayCorner : null,
        location: m.location || null,
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
            scoreHomeHalf: sql`excluded.score_home_half`,
            scoreAwayHalf: sql`excluded.score_away_half`,
            homeYellow: sql`excluded.home_yellow`,
            awayYellow: sql`excluded.away_yellow`,
            homeRed: sql`excluded.home_red`,
            awayRed: sql`excluded.away_red`,
            homeCorner: sql`excluded.home_corner`,
            awayCorner: sql`excluded.away_corner`,
            location: sql`excluded.location`,
            round: sql`excluded.round`,
            season: sql`excluded.season`,
            updatedAt: sql`now()`,
          },
        });
      upserted += chunk.length;
    }
  }

  return { leagues: freeLeagues.length, upserted, skipped };
}

export interface SyncPlayersResult {
  teams: number;
  upserted: number;
  skipped: string[];
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
  const skipped: string[] = [];
  for (const team of freeTeams) {
    // One call per team over ~138 teams is by far the most rate-limit-exposed
    // job here. Without this the first refusal aborts every remaining team and
    // the whole run is lost; skipping one team costs only that team, and the
    // upserts already committed stand. Re-running picks the stragglers back up.
    let rows;
    try {
      rows = await isports.players(team.isportsTeamId);
    } catch (err) {
      console.error(`  ! team ${team.isportsTeamId} failed:`, err instanceof Error ? err.message : err);
      skipped.push(team.isportsTeamId);
      continue;
    }

    const values = rows
      .filter((p) => p.recordId && p.name)
      .map((p) => ({
        isportsRecordId: p.recordId,
        isportsPlayerId: p.playerId || null,
        teamId: team.id,
        isportsTeamId: team.isportsTeamId,
        name: p.name,
        position: p.position || null,
        number: int(p.number, { positive: true }),
        birthday: p.birthday || null,
        height: int(p.height, { positive: true }),
        weight: int(p.weight, { positive: true }),
        country: p.country || null,
        feet: p.feet || null,
        photo: p.photo || null,
        marketValue: int(p.value),
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

  return { teams: freeTeams.length, upserted, skipped };
}

export interface SyncStandingsResult {
  leagues: number;
  upserted: number;
  skipped: string[];
}

/**
 * Syncs league tables (overall standings) for the free leagues, one call per
 * league. Rows are keyed on (leagueId, teamId); a row is skipped when its
 * iSportsAPI team id isn't in our teams table (standings.team_id is required).
 *
 * Some leagues have no conventional table (e.g. the current UEFA Champions
 * League format) and make iSportsAPI return an error — those are skipped so one
 * bad league doesn't abort the whole sync.
 */
export async function syncStandings(): Promise<SyncStandingsResult> {
  const freeLeagues = await db
    .select({ id: leagues.id, isportsLeagueId: leagues.isportsLeagueId })
    .from(leagues)
    .where(eq(leagues.isFree, true));

  const teamMap = await teamIdMap();

  let upserted = 0;
  const skipped: string[] = [];
  for (const league of freeLeagues) {
    let table;
    try {
      table = await isports.standings(league.isportsLeagueId);
    } catch {
      skipped.push(league.isportsLeagueId);
      continue;
    }
    const rows = table.totalStandings ?? [];

    const values = rows
      .map((r) => {
        const teamId = r.teamId ? teamMap.get(r.teamId) : undefined;
        if (teamId == null) return null;
        return {
          leagueId: league.id,
          teamId,
          rank: typeof r.rank === "number" ? r.rank : null,
          played: typeof r.totalCount === "number" ? r.totalCount : null,
          win: typeof r.winCount === "number" ? r.winCount : null,
          draw: typeof r.drawCount === "number" ? r.drawCount : null,
          loss: typeof r.loseCount === "number" ? r.loseCount : null,
          goalsFor: typeof r.getScore === "number" ? r.getScore : null,
          goalsAgainst: typeof r.loseScore === "number" ? r.loseScore : null,
          goalDifference: typeof r.goalDifference === "number" ? r.goalDifference : null,
          points: typeof r.integral === "number" ? r.integral : null,
        };
      })
      .filter((v): v is NonNullable<typeof v> => v !== null);

    if (values.length === 0) continue;

    await db
      .insert(standings)
      .values(values)
      .onConflictDoUpdate({
        target: [standings.leagueId, standings.teamId],
        set: {
          rank: sql`excluded.rank`,
          played: sql`excluded.played`,
          win: sql`excluded.win`,
          draw: sql`excluded.draw`,
          loss: sql`excluded.loss`,
          goalsFor: sql`excluded.goals_for`,
          goalsAgainst: sql`excluded.goals_against`,
          goalDifference: sql`excluded.goal_difference`,
          points: sql`excluded.points`,
          updatedAt: sql`now()`,
        },
      });
    upserted += values.length;
  }

  return { leagues: freeLeagues.length, upserted, skipped };
}
