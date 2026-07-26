/**
 * Populates the `players` table from iSportsAPI (all teams in free leagues).
 * Makes one call per team, so it is the slowest seed — the client retries on
 * rate-limit responses.
 *
 *   npm run seed:players        # dev
 *   npm run seed:players:prod   # prod
 */
import { syncPlayers } from "@/lib/isports/sync";
import { SEED_ENV } from "@/lib/env";

async function main() {
  console.log(`Seeding players into ${SEED_ENV} database...`);
  const res = await syncPlayers();
  console.log(`✓ done — ${res.upserted} players across ${res.teams} teams`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("✗ seed failed:", err);
    process.exit(1);
  });
