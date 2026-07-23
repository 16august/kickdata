import { NextResponse } from "next/server";
import { authenticate, type AuthedKey } from "@/lib/auth/apiKey";
import { checkRateLimit } from "@/lib/auth/rateLimit";

export function errorResponse(status: number, message: string) {
  return NextResponse.json({ error: message }, { status });
}

/**
 * Authenticates the request and enforces the tier's daily quota.
 *
 * On success returns `{ key }`. On failure returns `{ response }` — the caller
 * should return it immediately. Successful requests also get rate-limit headers
 * merged in via `withRateHeaders`.
 */
export async function guard(
  req: Request
): Promise<
  | { key: AuthedKey; headers: Record<string, string> }
  | { response: NextResponse }
> {
  const key = await authenticate(req);
  if (!key) {
    return { response: errorResponse(401, "Invalid or missing API key. Send it in the `x-api-key` header.") };
  }

  const rl = await checkRateLimit(key);
  const headers = {
    "X-RateLimit-Limit": String(rl.limit),
    "X-RateLimit-Remaining": String(rl.remaining),
  };

  if (!rl.allowed) {
    return {
      response: NextResponse.json(
        { error: "Daily rate limit exceeded for your plan." },
        { status: 429, headers }
      ),
    };
  }

  return { key, headers };
}
