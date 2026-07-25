import { NextResponse } from "next/server";
import { env, APP_ENV } from "@/lib/env";
import { syncLeagues, syncTeams, syncFixtures } from "@/lib/isports/sync";

export const runtime = "nodejs";
// Give the sync job room to run on Vercel.
export const maxDuration = 60;

/**
 * Cron ingestion endpoint. Triggered by Vercel Cron (see vercel.json).
 *
 * Vercel sends `Authorization: Bearer <CRON_SECRET>`. We reject anything else
 * so the endpoint can't be hit publicly.
 *
 * Syncs leagues, teams and fixtures. Players are NOT synced here — that makes
 * one call per team (~138) and would exceed the function time limit; run
 * `npm run seed:players[:prod]` for those. Each step is isolated so a rate-limit
 * failure in one doesn't abort the others.
 */
export async function GET(req: Request) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${env().CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result: Record<string, unknown> = { env: APP_ENV };
  async function step(name: string, fn: () => Promise<unknown>) {
    try {
      result[name] = await fn();
    } catch (err) {
      result[name] = { error: err instanceof Error ? err.message : "failed" };
    }
  }

  await step("leagues", syncLeagues);
  await step("teams", syncTeams);
  await step("fixtures", syncFixtures);

  return NextResponse.json({ ok: true, ...result });
}
