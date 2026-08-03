import { and, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { fixtures, leagues } from "@/lib/db/schema";
import TeamMonogram from "@/components/TeamMonogram";

const TZ = "Asia/Bangkok";
const MATCH_LIMIT = 8;

// fixtures.status is the raw iSports code and the repo has no map for it. "0"
// is documented as not-started and negatives as finished-or-cancelled; "-1" is
// the only negative the feed has actually produced, and every "-1" row carries
// a full score. Matching it exactly means an unknown future code is skipped
// rather than rendered as a 0-0 result.
const FINISHED = "-1";

const dateLabel = new Intl.DateTimeFormat("th-TH", {
  timeZone: TZ,
  day: "numeric",
  month: "short",
});

function Side({
  name,
  goals,
  won,
}: {
  name: string | null;
  goals: number | null;
  won: boolean;
}) {
  return (
    <div className={`flex items-center gap-2.5 ${won ? "text-neutral-100" : "text-neutral-400"}`}>
      <TeamMonogram name={name} />
      <span className="truncate">{name ?? "—"}</span>
      <span className={`ml-auto pl-3 tabular-nums ${won ? "font-bold" : "font-medium"}`}>
        {goals ?? "–"}
      </span>
    </div>
  );
}

// One "4–2" pair. Rendered only when the feed actually gave us the numbers, so
// a match missing corner data drops the stat instead of showing 0–0. The card
// swatches are CSS rather than 🟨/🟥 so they survive a font fallback that has
// no colour emoji.
function Stat({
  label,
  swatch,
  home,
  away,
}: {
  label?: string;
  swatch?: string;
  home: number | null;
  away: number | null;
}) {
  if (home == null && away == null) return null;
  return (
    <span className="inline-flex items-center gap-1 whitespace-nowrap">
      {swatch && <span className={`h-3 w-2 rounded-[1px] ${swatch}`} />}
      {label}
      <span className="tabular-nums">
        {home ?? 0}–{away ?? 0}
      </span>
    </span>
  );
}

export default async function Results() {
  const rows = await db
    .select({
      id: fixtures.id,
      kickoff: fixtures.kickoff,
      homeName: fixtures.homeName,
      awayName: fixtures.awayName,
      scoreHome: fixtures.scoreHome,
      scoreAway: fixtures.scoreAway,
      halfHome: fixtures.scoreHomeHalf,
      halfAway: fixtures.scoreAwayHalf,
      homeYellow: fixtures.homeYellow,
      awayYellow: fixtures.awayYellow,
      homeRed: fixtures.homeRed,
      awayRed: fixtures.awayRed,
      homeCorner: fixtures.homeCorner,
      awayCorner: fixtures.awayCorner,
      league: leagues.name,
    })
    .from(fixtures)
    .innerJoin(leagues, eq(fixtures.leagueId, leagues.id))
    // Latest results across every free league rather than one league at a time:
    // the leagues with results and the leagues with upcoming matches are
    // currently disjoint sets, so a shared league picker would strand a section.
    .where(and(eq(leagues.isFree, true), eq(fixtures.status, FINISHED)))
    .orderBy(desc(fixtures.kickoff))
    .limit(MATCH_LIMIT);

  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-white/10 px-6 py-16 text-center text-sm text-neutral-500">
        ยังไม่มีแมตช์ที่แข่งจบในระบบ
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-white/10">
      {rows.map((m, i) => {
        const homeWon = (m.scoreHome ?? 0) > (m.scoreAway ?? 0);
        const awayWon = (m.scoreAway ?? 0) > (m.scoreHome ?? 0);
        return (
          <div
            key={m.id}
            className={`grid grid-cols-[3.5rem_minmax(0,1fr)] gap-4 px-4 py-4 transition hover:bg-white/[0.03] sm:grid-cols-[5rem_minmax(0,1fr)] ${
              i > 0 ? "border-t border-white/5" : ""
            }`}
          >
            <div className="text-xs text-neutral-500">
              {m.kickoff && <div className="tabular-nums">{dateLabel.format(m.kickoff)}</div>}
              <div className="mt-1 truncate text-[10px] uppercase tracking-wide text-neutral-600">
                จบแล้ว
              </div>
            </div>

            <div className="min-w-0">
              <div className="space-y-1.5 text-sm">
                <Side name={m.homeName} goals={m.scoreHome} won={homeWon} />
                <Side name={m.awayName} goals={m.scoreAway} won={awayWon} />
              </div>

              <div className="mt-2.5 flex flex-wrap gap-x-3 gap-y-1 text-xs text-neutral-500">
                <Stat label="ครึ่งแรก" home={m.halfHome} away={m.halfAway} />
                <Stat swatch="bg-yellow-400" home={m.homeYellow} away={m.awayYellow} />
                {/* `> 0` not a bare `||`: two zeroes would render a literal "0" */}
                {(m.homeRed ?? 0) + (m.awayRed ?? 0) > 0 && (
                  <Stat swatch="bg-red-500" home={m.homeRed} away={m.awayRed} />
                )}
                <Stat label="มุม" home={m.homeCorner} away={m.awayCorner} />
                {m.league && <span className="truncate text-neutral-600">{m.league}</span>}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
