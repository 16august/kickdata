import { and, asc, eq, gt } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "@/lib/db";
import { fixtures, leagues, teams } from "@/lib/db/schema";
import TeamMonogram from "@/components/TeamMonogram";

const TZ = "Asia/Bangkok";
const MATCH_LIMIT = 12;

// Group header key — the Thai-local calendar day, not the UTC one. A 19:00 UTC
// kickoff is already the next day in Bangkok, so grouping on UTC would file
// matches under the wrong date.
const dayKey = new Intl.DateTimeFormat("en-CA", {
  timeZone: TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});
const dayLabel = new Intl.DateTimeFormat("th-TH", {
  timeZone: TZ,
  weekday: "long",
  day: "numeric",
  month: "long",
});
const timeLabel = new Intl.DateTimeFormat("th-TH", {
  timeZone: TZ,
  hour: "2-digit",
  minute: "2-digit",
});

function TeamRow({ name }: { name: string | null }) {
  return (
    <div className="flex items-center gap-2.5">
      <TeamMonogram name={name} />
      <span className="truncate">{name ?? "—"}</span>
    </div>
  );
}

export default async function Schedule({ leagueId }: { leagueId: number }) {
  const home = alias(teams, "home_team");

  const [league] = await db
    .select({ name: leagues.name, season: leagues.season })
    .from(leagues)
    .where(eq(leagues.id, leagueId))
    .limit(1);

  const rows = await db
    .select({
      id: fixtures.id,
      kickoff: fixtures.kickoff,
      round: fixtures.round,
      homeName: fixtures.homeName,
      awayName: fixtures.awayName,
      // fixtures.location is empty across the whole feed, so the home side's
      // stadium is the only venue we can show.
      venue: home.venue,
    })
    .from(fixtures)
    .leftJoin(home, eq(fixtures.homeTeamId, home.id))
    .where(and(eq(fixtures.leagueId, leagueId), gt(fixtures.kickoff, new Date())))
    .orderBy(asc(fixtures.kickoff))
    .limit(MATCH_LIMIT);

  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-white/10 px-6 py-16 text-center text-sm text-neutral-500">
        ยังไม่มีโปรแกรมการแข่งขันของ {league?.name ?? "ลีกนี้"} ในระบบ
      </div>
    );
  }

  // rows are already sorted by kickoff, so pushing in order keeps each day's
  // matches in order too.
  const days = new Map<string, typeof rows>();
  for (const r of rows) {
    if (!r.kickoff) continue;
    const key = dayKey.format(r.kickoff);
    const bucket = days.get(key);
    if (bucket) bucket.push(r);
    else days.set(key, [r]);
  }

  return (
    <div className="space-y-8">
      {[...days.entries()].map(([key, matches]) => (
        <div key={key}>
          <h3 className="text-sm font-semibold text-neutral-400">
            {dayLabel.format(matches[0].kickoff!)}
          </h3>
          <div className="mt-3 overflow-hidden rounded-xl border border-white/10">
            {matches.map((m, i) => (
              <div
                key={m.id}
                // minmax(0,…) not 1fr: a bare 1fr track floors at min-content,
                // so a long club or stadium name pushes the whole page wider
                // than the viewport instead of truncating.
                className={`grid grid-cols-[4rem_minmax(0,1fr)] gap-4 px-4 py-4 transition hover:bg-white/[0.03] sm:grid-cols-[5rem_minmax(0,1fr)_auto] sm:items-center ${
                  i > 0 ? "border-t border-white/5" : ""
                }`}
              >
                <div className="text-sm font-semibold tabular-nums text-turf">
                  {timeLabel.format(m.kickoff!)}
                </div>

                <div className="min-w-0 space-y-2 text-sm sm:space-y-1.5">
                  <TeamRow name={m.homeName} />
                  <TeamRow name={m.awayName} />
                </div>

                <div className="col-span-2 min-w-0 text-xs text-neutral-500 sm:col-span-1 sm:text-right">
                  {m.venue && <div className="truncate">{m.venue}</div>}
                  {m.round && <div className="mt-0.5">นัดที่ {m.round}</div>}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      <p className="text-xs text-neutral-500">
        แสดง {rows.length} แมตช์ถัดไปของ {league?.name}
        {league?.season && ` ฤดูกาล ${league.season}`} · เวลาไทย
      </p>
    </div>
  );
}
