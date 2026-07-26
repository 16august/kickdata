# iSportsAPI — Capability Audit (our key)

_What our current iSportsAPI key can and cannot access, and the resulting roadmap for KickData endpoints._

Audited **2026-07-26** against base `http://api.isportsapi.com/sport/football` using the dev key.
Reproduce with `npm run audit:isports` (script: [`scripts/audit-isports.ts`](../scripts/audit-isports.ts)).
Response envelope: `{ code, message, data }` — `0`=ok, `1`=bad/param or out-of-window, `2`=**not purchased** (or rate-limited; the message disambiguates).

> Note: audited late July (2026-2027 pre-season), so several purchased endpoints return `array[0]` — they are **accessible**, just empty until matches are played. That is a data-timing artifact, not a permission block.

## Verdict: we have the "Basic + Stats" package. No live, no odds, no match-detail.

## Capability matrix

| Group | Endpoint | Path | Access | Notes |
|---|---|---|---|---|
| basic | League list | `/league` | ✅ purchased | 2,281 leagues, full metadata |
| basic | Teams in league | `/team?leagueId=` | ✅ purchased | +address, area (we drop these) |
| basic | Players in team | `/player?teamId=` | ✅ purchased | +PAC/SHO/PAS/DRI/DEF/PHY, introduce (we drop these) |
| basic | League/Cup profile (basic) | `/league/basic` | ❌ not purchased | |
| schedule | Schedule & results | `/schedule?leagueId=` | ✅ purchased | **much richer than we store** (see below) |
| schedule | Schedule modify record | `/schedule/modify` | ✅ purchased | delta feed of deletions/time changes (12h) |
| schedule | Schedule & results (basic) | `/schedule/basic` | ❌ not purchased | |
| stats | Standing (league) | `/standing/league?leagueId=` | ✅ purchased | already shipped |
| stats | Top scorer | `/topscorer?leagueId=` | ✅ purchased | empty in pre-season |
| stats | Player stats (league/season) | `/playerstats/league?leagueId=` | ✅ purchased | empty in pre-season |
| stats | Player stats league list | `/playerstats/league/list` | ✅ purchased | index of leagues w/ stats |
| stats | Player stats (match) | `/playerstats/match?matchId=` | ✅ purchased | empty until match played |
| stats | Player stats match list | `/playerstats/match/list` | ✅ purchased | 24h match index |
| stats | Matches analysis (H2H/form) | `/analysis?matchId=` | ✅ purchased* | *code 1 "limited to 7 days" — accessible, no match within 7d during pre-season |
| stats | Standing subleague list | `/standing/league/getsub` | ❌ not purchased | |
| stats | Standing (cup) | `/standing/cup` | ❌ not purchased | |
| stats | FIFA ranking | `/fifaranking` | ❌ not purchased | |
| match | Match detail (events/lineup) | `/match/detail?matchId=` | ❌ not purchased | |
| odds | European / Asian / O-U odds | `/odds/*`, `/betfair` | ❌ not purchased | whole odds product blocked |
| live | Live / real-time (all) | `/live`, `/livescore`, … | ❌ not purchased | confirmed in earlier probe |

## Rich data we already fetch but currently drop

These come **free** in responses we already call each sync — pure enrichment, no new iSports quota.

**`/schedule` returns (we only store `status, scoreHome, scoreAway, kickoff, round, season, homeName, awayName`):**
`homeHalfScore, awayHalfScore` (half-time), `homeYellow, awayYellow, homeRed, awayRed` (cards), `homeCorner, awayCorner` (corners), `homeRank, awayRank`, `location` (venue), `weather, temperature`, `injuryTime`, `var`, `hasLineup`, `neutral`, `group`, `halfStartTime`.

**`/player` returns (we store name..value, contract):** `PAC, SHO, PAS, DRI, DEF, PHY` (FIFA-style attribute ratings), `introduce` (bio text).

**`/team` returns (we drop):** `address`, `area`.

## Roadmap — buildable now (only from ✅ data)

Ranked by value × effort. Every item reuses the existing route/sync/openapi pattern (see [`src/app/api/v1/standings/route.ts`](../src/app/api/v1/standings/route.ts) as the template).

1. **Enrich fixtures** — add cards, corners, half-time score, location/weather, injuryTime, VAR to the `fixtures` table + `/api/v1/fixtures` response. **Zero new API cost** (already in the `/schedule` payload we sync). Highest ROI; needs a schema migration + mapping in `syncFixtures`.
2. **Top scorers** — new `/api/v1/topscorers?league=`, backed by `/topscorer`. Mirrors standings almost exactly (one call per free league, upsert, tier-gate). Classic, expected feature.
3. **Enrich players** — add attribute ratings (PAC/SHO/…) + bio to the `players` table + `/api/v1/players`. Zero new API cost (already in `/player`).
4. **Player season stats** — new `/api/v1/player-stats?league=`, backed by `/playerstats/league`. Richer stat lines (goals, assists, cards, minutes) once the season starts.
5. **Match analysis / H2H** — `/api/v1/matches/{matchId}/analysis`, backed by `/analysis`. Pre-match H2H, recent form, goals distribution. More complex: matchId-scoped, 7-day window, fetch-through rather than bulk sync.

**Infra win (not a public endpoint):** use `/schedule/modify` to drive incremental fixture updates (only re-sync changed matches) — relevant once we want fresher scores without a full sweep.

## Blocked — require buying more iSports packages

- **Live / real-time** (in-play scores, minute, events) — needed for a true `/api/v1/live`. When purchased, serve via **fetch-through + 30–60s cache** (Vercel Hobby cron can't poll frequently).
- **Match detail** (`/match/detail`): lineups, goal/card/sub events, in-match stats.
- **Odds** (pre-match Asian/European/O-U, Betfair, historical) — the entire betting product line.
- **Cup standings**, **FIFA ranking**, subleague tables.

## Known constraints

- **Rate limit is aggressive**: bursts trip a cap that doesn't recover for a while (the audit's `/schedule` harvest needed 3 backoffs). All sync/probe code must space calls (client enforces 1.3s; the audit uses 4s + long backoff).
- **Only 8 free leagues are ingested** (`FREE_LEAGUE_IDS` in [`src/lib/tiers.ts`](../src/lib/tiers.ts)); every new bulk endpoint inherits that boundary.
- **UEFA Champions League (13014)** has no conventional league table (`/standing/league` → code 1); the standings sync already skips it.
