/**
 * Thin wrapper around the iSportsAPI football endpoints.
 * Docs: https://www.isportsapi.com/docs
 *
 * iSportsAPI expects the API key as an `api_key` query parameter and returns
 * `{ code, data, ... }` where `code === 0` means success.
 */

import { env } from "@/lib/env";

interface ISportsResponse<T> {
  code: number;
  message?: string;
  data: T;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Minimum spacing between consecutive iSportsAPI calls (their limit is strict).
const MIN_INTERVAL_MS = 1300;
let lastCallAt = 0;

async function throttle() {
  const wait = lastCallAt + MIN_INTERVAL_MS - Date.now();
  if (wait > 0) await sleep(wait);
  lastCallAt = Date.now();
}

async function get<T>(path: string, params: Record<string, string> = {}): Promise<T> {
  const url = new URL(`${env().ISPORTS_BASE_URL}${path}`);
  url.searchParams.set("api_key", env().ISPORTS_API_KEY);
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }

  // Proactive spacing + retry-with-backoff when the API asks us to slow down
  // (code 2 + "frequency"/"slow down" message).
  const MAX_RETRIES = 6;
  for (let attempt = 0; ; attempt++) {
    await throttle();
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) {
      throw new Error(`iSportsAPI HTTP ${res.status} for ${path}`);
    }

    const body = (await res.json()) as ISportsResponse<T>;
    if (body.code === 0) return body.data;

    const msg = body.message ?? "";
    const rateLimited = /frequency|slow down/i.test(msg);
    if (rateLimited && attempt < MAX_RETRIES) {
      await sleep(3000 * (attempt + 1)); // 3s, 6s, 9s ... backoff
      continue;
    }
    throw new Error(`iSportsAPI error ${body.code}: ${msg || "unknown"} (${path})`);
  }
}

/** A league record as returned by iSportsAPI `GET /league`. */
export interface ISportsLeague {
  leagueId: string;
  name: string;
  shortName?: string;
  subLeagueName?: string;
  type?: number;
  color?: string;
  logo?: string;
  country?: string;
  countryId?: string;
  countryLogo?: string;
  currentSeason?: string | number;
  currentRound?: number;
  totalRound?: number;
  areaId?: number;
}

/** A team record as returned by iSportsAPI `GET /team?leagueId=`. */
export interface ISportsTeam {
  teamId: string;
  leagueId: string;
  name: string;
  logo?: string;
  foundingDate?: string;
  address?: string;
  area?: string;
  venue?: string;
  capacity?: number;
  coach?: string;
  website?: string;
  isNational?: boolean;
}

/** A match record as returned by iSportsAPI `GET /schedule`. */
export interface ISportsMatch {
  matchId: string;
  leagueId: string;
  matchTime?: number; // unix seconds
  status?: number;
  homeId?: string;
  homeName?: string;
  awayId?: string;
  awayName?: string;
  homeScore?: number;
  awayScore?: number;
  homeHalfScore?: number;
  awayHalfScore?: number;
  homeYellow?: number;
  awayYellow?: number;
  homeRed?: number;
  awayRed?: number;
  homeCorner?: number;
  awayCorner?: number;
  location?: string;
  round?: string;
  season?: string;
}

/** A player record as returned by iSportsAPI `GET /player?teamId=`. */
export interface ISportsPlayer {
  recordId: string;
  playerId: string;
  teamId: string;
  name: string;
  position?: string;
  number?: number;
  birthday?: string;
  height?: number;
  weight?: number;
  country?: string;
  feet?: string;
  photo?: string;
  value?: number;
  contractEndDate?: string;
}

/** A single standings row as returned by iSportsAPI `GET /standing/league`. */
export interface ISportsStandingRow {
  teamId: string;
  rank?: number;
  totalCount?: number; // matches played
  winCount?: number;
  drawCount?: number;
  loseCount?: number;
  getScore?: number; // goals for
  loseScore?: number; // goals against
  goalDifference?: number;
  integral?: number; // total points
}

/**
 * The `GET /standing/league` response. iSportsAPI returns several breakdowns;
 * we only ingest `totalStandings` (the overall table).
 */
export interface ISportsStanding {
  leagueId?: string;
  totalStandings?: ISportsStandingRow[];
  homeStandings?: ISportsStandingRow[];
  awayStandings?: ISportsStandingRow[];
}

export const isports = {
  /** Full league master list (~2,300 leagues). */
  leagues: () => get<ISportsLeague[]>("/league"),
  /** Teams for a single league (by iSportsAPI league id). */
  teams: (leagueId: string) => get<ISportsTeam[]>("/team", { leagueId }),
  /** Schedule & results for a league (fixtures for the current season). */
  schedule: (leagueId: string) => get<ISportsMatch[]>("/schedule", { leagueId }),
  /** Players (squad + coach) for a single team. */
  players: (teamId: string) => get<ISportsPlayer[]>("/player", { teamId }),
  /** League table (overall standings) for a single league. */
  standings: (leagueId: string) => get<ISportsStanding>("/standing/league", { leagueId }),
};
