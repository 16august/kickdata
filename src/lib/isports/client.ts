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

async function get<T>(path: string, params: Record<string, string> = {}): Promise<T> {
  const url = new URL(`${env().ISPORTS_BASE_URL}${path}`);
  url.searchParams.set("api_key", env().ISPORTS_API_KEY);
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }

  const res = await fetch(url, {
    // We ingest into our own DB, so never cache at the fetch layer.
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`iSportsAPI HTTP ${res.status} for ${path}`);
  }

  const body = (await res.json()) as ISportsResponse<T>;
  if (body.code !== 0) {
    throw new Error(`iSportsAPI error ${body.code}: ${body.message ?? "unknown"}`);
  }
  return body.data;
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

export const isports = {
  /** Full league master list (~2,300 leagues). */
  leagues: () => get<ISportsLeague[]>("/league"),
  // The two below are loose placeholders until fixtures/standings ingestion
  // is wired up — the current API key does not have access to them yet.
  schedule: (leagueId?: string) =>
    get<unknown[]>("/schedule/basic", leagueId ? { leagueId } : {}),
  standings: (leagueId: string) =>
    get<unknown>("/table/live", { leagueId }),
};
