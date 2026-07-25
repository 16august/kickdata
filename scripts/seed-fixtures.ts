/**
 * Populates the `fixtures` table from iSportsAPI (free leagues only).
 *
 *   npm run seed:fixtures        # dev
 *   npm run seed:fixtures:prod   # prod
 */
import { syncFixtures } from "@/lib/isports/sync";
import { APP_ENV } from "@/lib/env";

async function main() {
  console.log(`Seeding fixtures into ${APP_ENV} database...`);
  const res = await syncFixtures();
  console.log(`✓ done — ${res.upserted} fixtures across ${res.leagues} free leagues`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("✗ seed failed:", err);
    process.exit(1);
  });
