/**
 * iSportsAPI capability audit.
 *
 * Probes every documented football endpoint with our key and classifies each as
 * purchased (code 0) / bad-request (code 1) / not-purchased (code 2), capturing
 * the top-level response shape for the ones we can access. Read-only: every call
 * is an HTTP GET against iSportsAPI; nothing in our system is written.
 *
 *   npm run audit:isports        # uses .env.development.local key
 *
 * iSportsAPI rate-limits hard and the cap does not recover for a while, so calls
 * are spaced ~4s apart with long backoff on "access frequency" messages. The
 * known-working, id-harvesting endpoints run first so later probes have a real
 * teamId / matchId to use.
 */
import { SEED_ENV } from "@/lib/env";

const BASE = process.env.ISPORTS_BASE_URL ?? "http://api.isportsapi.com/sport/football";
const KEY = process.env.ISPORTS_API_KEY!;
const LEAGUE_ID = "1639"; // English Premier League (known free/working)

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const SPACING_MS = 4000;
let lastCallAt = 0;
async function throttle() {
  const wait = lastCallAt + SPACING_MS - Date.now();
  if (wait > 0) await sleep(wait);
  lastCallAt = Date.now();
}

interface ProbeResult {
  code: number | string;
  purchased: "yes" | "no" | "bad-param" | "rate-limited" | "error";
  message: string;
  shape: string;
  sample?: unknown;
}

function describe(data: unknown): string {
  if (data == null) return "null";
  if (Array.isArray(data)) {
    const first = data[0];
    const keys = first && typeof first === "object" ? Object.keys(first).slice(0, 24).join(", ") : "";
    return `array[${data.length}]${keys ? ` — row keys: ${keys}` : ""}`;
  }
  if (typeof data === "object") {
    return `object — keys: ${Object.keys(data as object).slice(0, 24).join(", ")}`;
  }
  return `${typeof data}: ${String(data).slice(0, 40)}`;
}

async function probe(path: string, params: Record<string, string> = {}): Promise<ProbeResult> {
  const url = new URL(`${BASE}${path}`);
  url.searchParams.set("api_key", KEY);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);

  const RATE_BACKOFF = [15000, 30000, 60000];
  for (let attempt = 0; ; attempt++) {
    await throttle();
    let body: { code: number; message?: string; data?: unknown };
    try {
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) return { code: `HTTP ${res.status}`, purchased: "error", message: res.statusText, shape: "" };
      body = (await res.json()) as typeof body;
    } catch (err) {
      return { code: "fetch-error", purchased: "error", message: err instanceof Error ? err.message : "?", shape: "" };
    }

    const msg = body.message ?? "";
    const rateLimited = /frequency|slow down/i.test(msg);
    if (rateLimited && attempt < RATE_BACKOFF.length) {
      console.error(`  … rate-limited on ${path}, backing off ${RATE_BACKOFF[attempt] / 1000}s`);
      await sleep(RATE_BACKOFF[attempt]);
      continue;
    }

    if (body.code === 0) {
      return { code: 0, purchased: "yes", message: msg, shape: describe(body.data), sample: body.data };
    }
    if (body.code === 2 && rateLimited) {
      return { code: 2, purchased: "rate-limited", message: msg, shape: "" };
    }
    if (body.code === 2) return { code: 2, purchased: "no", message: msg, shape: "" };
    if (body.code === 1) return { code: 1, purchased: "bad-param", message: msg, shape: "" };
    return { code: body.code, purchased: "error", message: msg, shape: "" };
  }
}

/** First-level harvest of a real teamId + matchId from known-working endpoints. */
async function harvestIds(): Promise<{ teamId?: string; matchId?: string }> {
  const out: { teamId?: string; matchId?: string } = {};

  const teams = await probe("/team", { leagueId: LEAGUE_ID });
  if (teams.purchased === "yes" && Array.isArray(teams.sample) && teams.sample[0]) {
    out.teamId = (teams.sample[0] as { teamId?: string }).teamId;
  }
  console.log(`harvest /team -> ${teams.purchased} (teamId=${out.teamId ?? "?"})`);

  const sched = await probe("/schedule", { leagueId: LEAGUE_ID });
  if (sched.purchased === "yes" && Array.isArray(sched.sample) && sched.sample[0]) {
    out.matchId = (sched.sample[0] as { matchId?: string }).matchId;
  }
  console.log(`harvest /schedule -> ${sched.purchased} (matchId=${out.matchId ?? "?"})`);

  return out;
}

async function main() {
  console.log(`iSportsAPI capability audit — ${SEED_ENV} key, base ${BASE}\n`);

  const { teamId, matchId } = await harvestIds();
  const L = { leagueId: LEAGUE_ID };
  const T = teamId ? { teamId } : null;
  const M = matchId ? { matchId } : null;

  // group | label | path | params (null = skip because a required id is missing)
  const catalog: Array<[string, string, string, Record<string, string> | null]> = [
    ["basic", "League list", "/league", {}],
    ["basic", "League/Cup profile (basic)", "/league/basic", L],
    ["basic", "Teams in league", "/team", L],
    ["basic", "Players in team", "/player", T],
    ["schedule", "Schedule & results", "/schedule", L],
    ["schedule", "Schedule & results (basic)", "/schedule/basic", L],
    ["schedule", "Schedule modify record", "/schedule/modify", {}],
    ["match", "Match detail", "/match/detail", M],
    ["match", "Player stats (match)", "/playerstats/match", M],
    ["match", "Player stats match list", "/playerstats/match/list", {}],
    ["stats", "Standing (league)", "/standing/league", L],
    ["stats", "Standing subleague list", "/standing/league/getsub", L],
    ["stats", "Standing (cup)", "/standing/cup", L],
    ["stats", "Top scorer", "/topscorer", L],
    ["stats", "Player stats (league)", "/playerstats/league", L],
    ["stats", "Player stats league list", "/playerstats/league/list", {}],
    ["stats", "Matches analysis", "/analysis", M],
    ["stats", "FIFA ranking", "/fifaranking", {}],
    ["odds", "European odds (all)", "/odds/european/all", { day: "1" }],
    ["odds", "Historical odds (main)", "/odds/main/history", { date: "2026-07-26" }],
    ["odds", "Betfair", "/betfair", { day: "1" }],
    ["live", "Live scores", "/live", {}],
  ];

  const rows: Array<{ group: string; label: string; path: string; r: ProbeResult | { purchased: string; code: string; message: string; shape: string } }> = [];

  for (const [group, label, path, params] of catalog) {
    if (params === null) {
      console.log(`SKIP ${path} (no id harvested)`);
      rows.push({ group, label, path, r: { purchased: "skipped", code: "-", message: "required id not harvested", shape: "" } });
      continue;
    }
    const r = await probe(path, params);
    console.log(`${r.purchased.toUpperCase().padEnd(13)} code=${String(r.code).padEnd(4)} ${path}  ${r.shape || r.message}`);
    rows.push({ group, label, path, r });
  }

  // Emit a markdown table for pasting into docs/isports-capabilities.md
  console.log("\n\n===== MARKDOWN =====\n");
  console.log("| Group | Endpoint | Path | Purchased | code | Response shape |");
  console.log("|---|---|---|---|---|---|");
  for (const { group, label, path, r } of rows) {
    const shape = (r.shape || r.message || "").replace(/\|/g, "\\|").slice(0, 160);
    console.log(`| ${group} | ${label} | \`${path}\` | ${r.purchased} | ${r.code} | ${shape} |`);
  }

  // Full JSON (shapes + first sample row) for the ones we can access
  console.log("\n\n===== JSON =====\n");
  console.log(
    JSON.stringify(
      rows.map(({ group, label, path, r }) => ({
        group,
        label,
        path,
        purchased: r.purchased,
        code: r.code,
        shape: r.shape,
        sampleRow:
          "sample" in r && Array.isArray((r as ProbeResult).sample)
            ? ((r as ProbeResult).sample as unknown[])[0]
            : "sample" in r
              ? (r as ProbeResult).sample
              : undefined,
      })),
      null,
      1
    )
  );
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("✗ audit failed:", err);
    process.exit(1);
  });
