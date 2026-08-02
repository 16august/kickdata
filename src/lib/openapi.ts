/**
 * OpenAPI 3.1 spec for the public KickData API. Served at /api/openapi and
 * rendered by Scalar at /docs.
 *
 * Server is set to the canonical www host on purpose: the apex (kickdata.dev)
 * 308-redirects to www and the redirect drops the x-api-key header, which would
 * break the "Try it" client.
 */

const errorSchema = {
  type: "object",
  properties: { error: { type: "string" } },
  required: ["error"],
} as const;

const okList = (itemsRef: string, extra: Record<string, unknown> = {}) => ({
  type: "object",
  properties: {
    count: { type: "integer", example: 20 },
    data: { type: "array", items: { $ref: itemsRef } },
    ...extra,
  },
});

export const openapi = {
  openapi: "3.1.0",
  info: {
    title: "KickData API",
    version: "1.0.0",
    description:
      "Football data API — leagues, teams, players and fixtures.\n\n" +
      "Authenticate with your API key in the `x-api-key` header. " +
      "A demo key is pre-filled below so you can try requests right away.\n\n" +
      "Tip: ids used in query params (`league`, `team`) are KickData ids — " +
      "get them from `/api/v1/leagues` and `/api/v1/teams`.",
  },
  servers: [{ url: "https://www.kickdata.dev", description: "Production" }],
  security: [{ apiKeyHeader: [] }],
  tags: [
    { name: "Leagues" },
    { name: "Teams" },
    { name: "Players" },
    { name: "Fixtures" },
    { name: "Standings" },
  ],
  paths: {
    "/api/v1/leagues": {
      get: {
        tags: ["Leagues"],
        summary: "List leagues",
        description: "Returns the leagues available to your plan.",
        responses: {
          "200": {
            description: "OK",
            content: {
              "application/json": {
                schema: okList("#/components/schemas/League", {
                  tier: { type: "string", example: "free" },
                }),
              },
            },
          },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "429": { $ref: "#/components/responses/RateLimited" },
        },
      },
    },
    "/api/v1/teams": {
      get: {
        tags: ["Teams"],
        summary: "List teams in a league",
        parameters: [
          {
            name: "league",
            in: "query",
            required: true,
            description: "League id (from /api/v1/leagues). Example: 30 = English Premier League.",
            schema: { type: "integer", example: 30 },
          },
        ],
        responses: {
          "200": {
            description: "OK",
            content: {
              "application/json": {
                schema: okList("#/components/schemas/Team", {
                  league: { type: "string", example: "English Premier League" },
                }),
              },
            },
          },
          "400": { $ref: "#/components/responses/BadRequest" },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "403": { $ref: "#/components/responses/Forbidden" },
          "404": { $ref: "#/components/responses/NotFound" },
          "429": { $ref: "#/components/responses/RateLimited" },
        },
      },
    },
    "/api/v1/players": {
      get: {
        tags: ["Players"],
        summary: "List players in a team",
        parameters: [
          {
            name: "team",
            in: "query",
            required: true,
            description: "Team id (from /api/v1/teams).",
            schema: { type: "integer", example: 112 },
          },
        ],
        responses: {
          "200": {
            description: "OK",
            content: {
              "application/json": {
                schema: okList("#/components/schemas/Player", {
                  team: { type: "string", example: "Arsenal" },
                }),
              },
            },
          },
          "400": { $ref: "#/components/responses/BadRequest" },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "403": { $ref: "#/components/responses/Forbidden" },
          "404": { $ref: "#/components/responses/NotFound" },
          "429": { $ref: "#/components/responses/RateLimited" },
        },
      },
    },
    "/api/v1/fixtures": {
      get: {
        tags: ["Fixtures"],
        summary: "List fixtures by league or team",
        description:
          "Schedule & results for the current season, ordered by kickoff. " +
          "Provide at least one of `league` or `team`. `team` returns every " +
          "fixture that team plays (home or away); combine both to scope to one league.",
        parameters: [
          {
            name: "league",
            in: "query",
            required: false,
            description: "League id (from /api/v1/leagues). Optional if `team` is given.",
            schema: { type: "integer", example: 30 },
          },
          {
            name: "team",
            in: "query",
            required: false,
            description: "Team id (from /api/v1/teams). Returns that team's fixtures, home or away.",
            schema: { type: "integer", example: 112 },
          },
        ],
        responses: {
          "200": {
            description: "OK",
            content: {
              "application/json": {
                schema: okList("#/components/schemas/Fixture", {
                  league: { type: "string", example: "English Premier League" },
                }),
              },
            },
          },
          "400": { $ref: "#/components/responses/BadRequest" },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "403": { $ref: "#/components/responses/Forbidden" },
          "404": { $ref: "#/components/responses/NotFound" },
          "429": { $ref: "#/components/responses/RateLimited" },
        },
      },
    },
    "/api/v1/standings": {
      get: {
        tags: ["Standings"],
        summary: "League table",
        description: "Overall standings for a league, ordered by rank.",
        parameters: [
          {
            name: "league",
            in: "query",
            required: true,
            description: "League id (from /api/v1/leagues).",
            schema: { type: "integer", example: 30 },
          },
        ],
        responses: {
          "200": {
            description: "OK",
            content: {
              "application/json": {
                schema: okList("#/components/schemas/Standing", {
                  league: { type: "string", example: "English Premier League" },
                }),
              },
            },
          },
          "400": { $ref: "#/components/responses/BadRequest" },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "403": { $ref: "#/components/responses/Forbidden" },
          "404": { $ref: "#/components/responses/NotFound" },
          "429": { $ref: "#/components/responses/RateLimited" },
        },
      },
    },
  },
  components: {
    securitySchemes: {
      apiKeyHeader: {
        type: "apiKey",
        in: "header",
        name: "x-api-key",
        description: "Your KickData API key.",
      },
    },
    responses: {
      BadRequest: {
        description: "Missing or invalid query parameter",
        content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } },
      },
      Unauthorized: {
        description: "Missing or invalid API key",
        content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } },
      },
      Forbidden: {
        description: "This resource requires a higher plan",
        content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } },
      },
      NotFound: {
        description: "Resource not found",
        content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } },
      },
      RateLimited: {
        description: "Daily rate limit exceeded for your plan",
        content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } },
      },
    },
    schemas: {
      Error: errorSchema,
      League: {
        type: "object",
        properties: {
          id: { type: "integer", example: 30 },
          name: { type: "string", example: "English Premier League" },
          country: { type: "string", example: "England" },
          season: { type: "string", example: "2026-2027" },
          isFree: { type: "boolean", example: true },
        },
      },
      Team: {
        type: "object",
        properties: {
          id: { type: "integer", example: 112 },
          name: { type: "string", example: "Arsenal" },
          logo: { type: "string" },
          country: { type: "string", example: "England" },
          venue: { type: "string", example: "Emirates Stadium" },
          coach: { type: "string", example: "Mikel Arteta" },
          foundingDate: { type: "string", example: "1886" },
          capacity: { type: "integer", example: 60361 },
          website: { type: "string" },
          isNational: { type: "boolean", example: false },
        },
      },
      Player: {
        type: "object",
        properties: {
          id: { type: "integer" },
          name: { type: "string", example: "David Raya" },
          position: { type: "string", example: "Goalkeeper" },
          number: { type: "integer", example: 1 },
          birthday: { type: "string", example: "1995-09-15" },
          height: { type: "integer", example: 183 },
          weight: { type: "integer", example: 80 },
          country: { type: "string", example: "Spain" },
          feet: { type: "string", example: "Right" },
          photo: { type: "string" },
          marketValue: { type: "integer" },
          contractEndDate: { type: "string" },
        },
      },
      Fixture: {
        type: "object",
        properties: {
          id: { type: "integer" },
          round: { type: "string", example: "1" },
          season: { type: "string", example: "2026-2027" },
          kickoff: { type: "string", format: "date-time" },
          status: { type: "string", example: "0" },
          location: { type: "string", nullable: true, example: "Emirates Stadium" },
          home: {
            type: "object",
            properties: {
              teamId: { type: "integer", nullable: true },
              name: { type: "string", example: "Arsenal" },
            },
          },
          away: {
            type: "object",
            properties: {
              teamId: { type: "integer", nullable: true },
              name: { type: "string", example: "Coventry City" },
            },
          },
          score: {
            type: "object",
            properties: {
              home: { type: "integer", nullable: true },
              away: { type: "integer", nullable: true },
              halftime: {
                type: "object",
                properties: {
                  home: { type: "integer", nullable: true },
                  away: { type: "integer", nullable: true },
                },
              },
            },
          },
          cards: {
            type: "object",
            properties: {
              home: {
                type: "object",
                properties: {
                  yellow: { type: "integer", nullable: true },
                  red: { type: "integer", nullable: true },
                },
              },
              away: {
                type: "object",
                properties: {
                  yellow: { type: "integer", nullable: true },
                  red: { type: "integer", nullable: true },
                },
              },
            },
          },
          corners: {
            type: "object",
            properties: {
              home: { type: "integer", nullable: true },
              away: { type: "integer", nullable: true },
            },
          },
        },
      },
      Standing: {
        type: "object",
        properties: {
          rank: { type: "integer", example: 1 },
          team: {
            type: "object",
            properties: {
              id: { type: "integer", example: 112 },
              name: { type: "string", nullable: true, example: "Arsenal" },
            },
          },
          played: { type: "integer", example: 38 },
          win: { type: "integer", example: 28 },
          draw: { type: "integer", example: 6 },
          loss: { type: "integer", example: 4 },
          goalsFor: { type: "integer", example: 91 },
          goalsAgainst: { type: "integer", example: 29 },
          goalDifference: { type: "integer", example: 62 },
          points: { type: "integer", example: 90 },
        },
      },
    },
  },
} as const;
