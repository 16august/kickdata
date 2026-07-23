import { sql, eq, and } from "drizzle-orm";
import { db } from "@/lib/db";
import { usage } from "@/lib/db/schema";
import { getTierConfig } from "@/lib/tiers";
import type { AuthedKey } from "./apiKey";

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  used: number;
  remaining: number;
}

function today(): string {
  // YYYY-MM-DD in UTC — matches the `date` column.
  return new Date().toISOString().slice(0, 10);
}

/**
 * Increments the per-day counter for this key and reports whether the request
 * is within the tier's daily quota. Uses an upsert so it is atomic per row.
 */
export async function checkRateLimit(key: AuthedKey): Promise<RateLimitResult> {
  const day = today();
  const limit = getTierConfig(key.tier).dailyQuota;

  const [row] = await db
    .insert(usage)
    .values({ apiKeyId: key.id, day, count: 1 })
    .onConflictDoUpdate({
      target: [usage.apiKeyId, usage.day],
      set: { count: sql`${usage.count} + 1` },
    })
    .returning({ count: usage.count });

  const used = row?.count ?? 1;
  return {
    allowed: used <= limit,
    limit,
    used,
    remaining: Math.max(0, limit - used),
  };
}

/** Read-only usage lookup (does not increment). */
export async function currentUsage(apiKeyId: number): Promise<number> {
  const [row] = await db
    .select({ count: usage.count })
    .from(usage)
    .where(and(eq(usage.apiKeyId, apiKeyId), eq(usage.day, today())))
    .limit(1);
  return row?.count ?? 0;
}
