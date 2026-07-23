import type { Tier } from "./db/schema";

export interface TierConfig {
  /** Human-readable label shown on the pricing page. */
  label: string;
  /** Max requests allowed per calendar day. */
  dailyQuota: number;
  /** If true, this tier can access leagues where `is_free = false`. */
  allPaidLeagues: boolean;
  /**
   * If true, responses include "advanced" fields (e.g. detailed stats).
   * Free tier gets the trimmed shape.
   */
  advancedData: boolean;
}

export const TIERS: Record<Tier, TierConfig> = {
  free: {
    label: "Free",
    dailyQuota: 1_000,
    allPaidLeagues: false,
    advancedData: false,
  },
  pro: {
    label: "Pro",
    dailyQuota: 100_000,
    allPaidLeagues: true,
    advancedData: true,
  },
};

export function getTierConfig(tier: Tier): TierConfig {
  return TIERS[tier] ?? TIERS.free;
}

/**
 * iSportsAPI league ids that are available on the free tier.
 * Everything else requires a Pro subscription.
 */
export const FREE_LEAGUE_IDS = new Set<string>([
  "1639", // English Premier League
  "1730", // England Championship
  "1134", // Spanish La Liga
  "188", // German Bundesliga
  "1437", // Italy Serie A
  "1112", // France Ligue 1
  "1617", // Holland Eredivisie
  "13014", // UEFA Champions League
]);

export function isFreeLeague(isportsLeagueId: string): boolean {
  return FREE_LEAGUE_IDS.has(isportsLeagueId);
}
