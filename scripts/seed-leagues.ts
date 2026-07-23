/**
 * Populates the `leagues` master table from iSportsAPI.
 *
 * Run against a specific environment's DB:
 *   npm run seed:leagues        # dev branch  (.env.development.local)
 *   npm run seed:leagues:prod   # prod branch (.env.production.local)
 */
import { syncLeagues } from "@/lib/isports/sync";
import { APP_ENV } from "@/lib/env";

async function main() {
  console.log(`Seeding leagues into ${APP_ENV} database...`);
  const res = await syncLeagues();
  console.log(
    `✓ done — ${res.upserted} leagues upserted (${res.free} free) out of ${res.total} fetched`
  );
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("✗ seed failed:", err);
    process.exit(1);
  });
