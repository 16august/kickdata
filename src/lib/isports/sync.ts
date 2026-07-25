import { sql, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { leagues, teams } from "@/lib/db/schema";
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
