import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { leagues } from "@/lib/db/schema";
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
