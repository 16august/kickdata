/**
 * Populates the `standings` table from iSportsAPI (free leagues only).
 *
 *   npm run seed:standings        # dev
 *   npm run seed:standings:prod   # prod
 *
 * Requires teams to be seeded first (standings rows link to internal team ids).
 */
import { syncStandings } from "@/lib/isports/sync";
import { SEED_ENV } from "@/lib/env";

async function main() {
  console.log(`Seeding standings into ${SEED_ENV} database...`);
  const res = await syncStandings();
  console.log(`✓ done — ${res.upserted} standings rows across ${res.leagues} free leagues`);
  if (res.skipped.length) {
    console.log(`  (skipped ${res.skipped.length} league(s) with no table: ${res.skipped.join(", ")})`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("✗ seed failed:", err);
    process.exit(1);
  });
