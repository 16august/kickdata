import { ApiReference } from "@scalar/nextjs-api-reference";

// Interactive API reference (Scalar) served at /docs.
// Pulls the spec from /api/openapi and pre-fills the demo API key so visitors
// can send real requests immediately.
export const GET = ApiReference({
  url: "/api/openapi",
  theme: "purple",
  persistAuth: true,
  metaData: {
    title: "KickData API",
    description: "Football data API — leagues, teams, players and fixtures.",
  },
  authentication: {
    preferredSecurityScheme: "apiKeyHeader",
    securitySchemes: {
      apiKeyHeader: {
        // Public demo key (limited). Exposed on purpose so Try-it works.
        value: process.env.NEXT_PUBLIC_DEMO_API_KEY ?? "",
      },
    },
  },
});
