import {
  pgTable,
  serial,
  integer,
  text,
  boolean,
  timestamp,
  date,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";

/**
 * Subscription tier for an API key. The actual limits/permissions for each
 * tier live in `src/lib/tiers.ts` (config in code, not in the DB).
 */
export type Tier = "free" | "pro";

// --- Access control -------------------------------------------------------

export const apiKeys = pgTable(
  "api_keys",
  {
    id: serial("id").primaryKey(),
    // We store only a hash of the key, never the raw key.
    keyHash: text("key_hash").notNull(),
    ownerEmail: text("owner_email").notNull(),
    tier: text("tier").$type<Tier>().notNull().default("free"),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    keyHashIdx: uniqueIndex("api_keys_key_hash_idx").on(t.keyHash),
  })
);

/** Per-key, per-day request counter used for rate limiting. */
export const usage = pgTable(
  "usage",
  {
    id: serial("id").primaryKey(),
    apiKeyId: integer("api_key_id")
      .notNull()
      .references(() => apiKeys.id, { onDelete: "cascade" }),
    day: date("day").notNull(),
    count: integer("count").notNull().default(0),
  },
  (t) => ({
    keyDayIdx: uniqueIndex("usage_key_day_idx").on(t.apiKeyId, t.day),
  })
);

// --- Football data (ingested from iSportsAPI) -----------------------------

export const leagues = pgTable(
  "leagues",
  {
    id: serial("id").primaryKey(),
    isportsLeagueId: text("isports_league_id").notNull(),
    name: text("name").notNull(),
    shortName: text("short_name"),
    country: text("country"),
    season: text("season"),
    logo: text("logo"),
    // iSportsAPI league type (1 = league, 2 = cup, ...).
    type: integer("type"),
    // Whether this league is available on the free tier.
    isFree: boolean("is_free").notNull().default(false),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    isportsIdx: uniqueIndex("leagues_isports_id_idx").on(t.isportsLeagueId),
  })
);

export const teams = pgTable(
  "teams",
  {
    id: serial("id").primaryKey(),
    isportsTeamId: text("isports_team_id").notNull(),
    // The league this team belongs to (its primary league from iSportsAPI).
    leagueId: integer("league_id").references(() => leagues.id, {
      onDelete: "set null",
    }),
    isportsLeagueId: text("isports_league_id"),
    name: text("name").notNull(),
    logo: text("logo"),
    country: text("country"),
    venue: text("venue"),
    coach: text("coach"),
    foundingDate: text("founding_date"),
    website: text("website"),
    capacity: integer("capacity"),
    isNational: boolean("is_national"),
  },
  (t) => ({
    isportsIdx: uniqueIndex("teams_isports_id_idx").on(t.isportsTeamId),
    leagueIdx: index("teams_league_idx").on(t.leagueId),
  })
);

export const fixtures = pgTable(
  "fixtures",
  {
    id: serial("id").primaryKey(),
    isportsMatchId: text("isports_match_id").notNull(),
    leagueId: integer("league_id")
      .notNull()
      .references(() => leagues.id, { onDelete: "cascade" }),
    homeTeamId: integer("home_team_id").references(() => teams.id),
    awayTeamId: integer("away_team_id").references(() => teams.id),
    // Denormalised names so a fixture is self-contained even if a team
    // isn't in our teams table.
    homeName: text("home_name"),
    awayName: text("away_name"),
    kickoff: timestamp("kickoff", { withTimezone: true }),
    // iSportsAPI status code (0 = not started, negatives = finished/cancelled).
    status: text("status"),
    scoreHome: integer("score_home"),
    scoreAway: integer("score_away"),
    round: text("round"),
    season: text("season"),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    isportsIdx: uniqueIndex("fixtures_isports_id_idx").on(t.isportsMatchId),
    leagueIdx: index("fixtures_league_idx").on(t.leagueId),
  })
);

export const players = pgTable(
  "players",
  {
    id: serial("id").primaryKey(),
    // recordId is unique per team-player entry in iSportsAPI.
    isportsRecordId: text("isports_record_id").notNull(),
    isportsPlayerId: text("isports_player_id"),
    teamId: integer("team_id").references(() => teams.id, {
      onDelete: "set null",
    }),
    isportsTeamId: text("isports_team_id"),
    name: text("name").notNull(),
    position: text("position"),
    number: integer("number"),
    birthday: text("birthday"),
    height: integer("height"),
    weight: integer("weight"),
    country: text("country"),
    feet: text("feet"),
    photo: text("photo"),
    marketValue: integer("market_value"),
    contractEndDate: text("contract_end_date"),
  },
  (t) => ({
    recordIdx: uniqueIndex("players_record_id_idx").on(t.isportsRecordId),
    teamIdx: index("players_team_idx").on(t.teamId),
  })
);

export const standings = pgTable(
  "standings",
  {
    id: serial("id").primaryKey(),
    leagueId: integer("league_id")
      .notNull()
      .references(() => leagues.id, { onDelete: "cascade" }),
    teamId: integer("team_id")
      .notNull()
      .references(() => teams.id, { onDelete: "cascade" }),
    rank: integer("rank"),
    played: integer("played"),
    win: integer("win"),
    draw: integer("draw"),
    loss: integer("loss"),
    goalsFor: integer("goals_for"),
    goalsAgainst: integer("goals_against"),
    goalDifference: integer("goal_difference"),
    points: integer("points"),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    leagueTeamIdx: uniqueIndex("standings_league_team_idx").on(
      t.leagueId,
      t.teamId
    ),
  })
);
