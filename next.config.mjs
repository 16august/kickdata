/**
 * CORS for the public API.
 *
 * The data is public and read-only and auth is an explicit `x-api-key` header,
 * so there are no ambient credentials (cookies) for CORS to protect — hence the
 * open `*` origin and no `Allow-Credentials` (which `*` forbids anyway).
 *
 * Applied here rather than in a route or middleware so that error responses
 * (401/429) carry the headers too: without them a browser client that runs out
 * of quota sees an opaque "Failed to fetch" instead of the actual 429 body.
 *
 * Scoped to the public paths on purpose — `/api/cron/sync` is guarded by
 * CRON_SECRET and must not be reachable from a page.
 */
const CORS_HEADERS = [
  { key: "Access-Control-Allow-Origin", value: "*" },
  { key: "Access-Control-Allow-Methods", value: "GET, OPTIONS" },
  { key: "Access-Control-Allow-Headers", value: "x-api-key, content-type" },
  // Without this browser clients cannot read the quota headers guard() sets.
  { key: "Access-Control-Expose-Headers", value: "X-RateLimit-Limit, X-RateLimit-Remaining" },
  // Every real call already costs two DB round-trips; don't double it with a
  // preflight on each one.
  { key: "Access-Control-Max-Age", value: "86400" },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async headers() {
    return [
      { source: "/api/v1/:path*", headers: CORS_HEADERS },
      { source: "/api/openapi", headers: CORS_HEADERS },
    ];
  },
};

export default nextConfig;
