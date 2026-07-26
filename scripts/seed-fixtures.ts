/**
 * Populates the `fixtures` table from iSportsAPI (free leagues only).
 *
 *   npm run seed:fixtures        # dev
 *   npm run seed:fixtures:prod   # prod
 */
import { syncFixtures } from "@/lib/isports/sync";
import { SEED_ENV } from "@/lib/env";

async function main() {
  console.log(`Seeding fixtures into ${SEED_ENV} database...`);
  const res = await syncFixtures();
  console.log(`✓ done — ${res.upserted} fixtures across ${res.leagues} free leagues`);
  if (res.skipped.length) {
    console.log(`  (skipped ${res.skipped.length} league(s), e.g. rate-limited: ${res.skipped.join(", ")})`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("✗ seed failed:", err);
    process.exit(1);
  });
