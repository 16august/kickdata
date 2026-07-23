import { NextResponse } from "next/server";
import { env, APP_ENV } from "@/lib/env";
import { syncLeagues } from "@/lib/isports/sync";

export const runtime = "nodejs";
// Give the sync job room to run on Vercel.
export const maxDuration = 60;

/**
 * Cron ingestion endpoint. Triggered by Vercel Cron (see vercel.json).
 *
 * Vercel sends `Authorization: Bearer <CRON_SECRET>`. We reject anything else
 * so the endpoint can't be hit publicly.
 *
 * Currently syncs the league master list. Fixtures/standings ingestion is the
 * next step (those iSportsAPI endpoints aren't enabled on the current key yet).
 */
export async function GET(req: Request) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${env().CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const leagues = await syncLeagues();
    return NextResponse.json({ ok: true, env: APP_ENV, leagues });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "sync failed" },
      { status: 500 }
    );
  }
}
