/**
 * Issues a new API key.
 *
 *   npm run key:create -- <ownerEmail> [tier]        # dev
 *   npm run key:create:prod -- <ownerEmail> [tier]   # prod
 *
 * tier defaults to "free". The raw key is printed ONCE — only its hash is
 * stored, so copy it now (it cannot be recovered later).
 */
import { randomBytes } from "node:crypto";
import { db } from "@/lib/db";
import { apiKeys } from "@/lib/db/schema";
import { hashKey } from "@/lib/auth/apiKey";
import { SEED_ENV } from "@/lib/env";

async function main() {
  const [ownerEmail = "owner@kickdata.dev", tierArg = "free"] =
    process.argv.slice(2);
  const tier = tierArg === "pro" ? "pro" : "free";

  const rawKey = `kd_${randomBytes(24).toString("hex")}`;
  const keyHash = await hashKey(rawKey);

  await db.insert(apiKeys).values({ keyHash, ownerEmail, tier });

  console.log(`✓ API key created in ${SEED_ENV} database`);
  console.log(`  owner: ${ownerEmail}`);
  console.log(`  tier:  ${tier}`);
  console.log("");
  console.log("  API KEY (copy now — shown only once):");
  console.log(`  ${rawKey}`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("✗ failed to create key:", err);
    process.exit(1);
  });
