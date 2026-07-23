import { eq, and } from "drizzle-orm";
import { db } from "@/lib/db";
import { apiKeys } from "@/lib/db/schema";
import type { Tier } from "@/lib/db/schema";

export interface AuthedKey {
  id: number;
  ownerEmail: string;
  tier: Tier;
}

/** SHA-256 hash of a raw API key, hex-encoded. Matches how keys are stored. */
export async function hashKey(raw: string): Promise<string> {
  const data = new TextEncoder().encode(raw);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Reads the API key from the request header (`x-api-key`). */
export function extractKey(req: Request): string | null {
  return req.headers.get("x-api-key");
}

/**
 * Resolves a raw API key to its owner + tier, or null if it is missing,
 * unknown, or deactivated.
 */
export async function authenticate(req: Request): Promise<AuthedKey | null> {
  const raw = extractKey(req);
  if (!raw) return null;

  const keyHash = await hashKey(raw);
  const [row] = await db
    .select()
    .from(apiKeys)
    .where(and(eq(apiKeys.keyHash, keyHash), eq(apiKeys.active, true)))
    .limit(1);

  if (!row) return null;

  return { id: row.id, ownerEmail: row.ownerEmail, tier: row.tier };
}
