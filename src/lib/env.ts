import { z } from "zod";

/**
 * Runtime environment: "prod" on Vercel Production, "dev" everywhere else
 * (local, Vercel Preview/Development). Derived, never set by hand.
 */
export const APP_ENV: "dev" | "prod" =
  process.env.VERCEL_ENV === "production" ||
  (!process.env.VERCEL_ENV && process.env.NODE_ENV === "production")
    ? "prod"
    : "dev";

export const isProd = APP_ENV === "prod";
export const isDev = APP_ENV === "dev";

const envSchema = z.object({
  DATABASE_URL: z.string().url("DATABASE_URL must be a valid connection URL"),
  ISPORTS_API_KEY: z.string().min(1, "ISPORTS_API_KEY is required"),
  ISPORTS_BASE_URL: z
    .string()
    .url()
    .default("http://api.isportsapi.com/sport/football"),
  CRON_SECRET: z.string().min(16, "CRON_SECRET must be at least 16 characters"),
});

type Env = z.infer<typeof envSchema>;

let cached: Env | null = null;

/**
 * Validated environment variables. Lazy + cached so `next build` doesn't fail
 * when secrets aren't present — validation runs on first real request instead.
 * Throws a single, readable error listing every missing/invalid var.
 */
export function env(): Env {
  if (cached) return cached;

  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    throw new Error(
      `Invalid environment configuration (${APP_ENV}):\n${issues}\n` +
        `Check your .env.${APP_ENV === "prod" ? "production" : "development"}.local file or Vercel env vars.`
    );
  }

  cached = parsed.data;
  return cached;
}
