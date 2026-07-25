/**
 * Populates the `teams` table from iSportsAPI (free leagues only).
 *
 *   npm run seed:teams        # dev branch  (.env.development.local)
 *   npm run seed:teams:prod   # prod branch (.env.production.local)
 *
 * Requires leagues to be seeded first (syncTeams reads free leagues from DB).
 */
import { syncTeams } from "@/lib/isports/sync";
import { APP_ENV } from "@/lib/env";

async function main() {
  console.log(`Seeding teams into ${APP_ENV} database...`);
  const res = await syncTeams();
  console.log(`✓ done — ${res.upserted} teams across ${res.leagues} free leagues`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("✗ seed failed:", err);
    process.exit(1);
  });
