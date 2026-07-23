CREATE TABLE "api_keys" (
	"id" serial PRIMARY KEY NOT NULL,
	"key_hash" text NOT NULL,
	"owner_email" text NOT NULL,
	"tier" text DEFAULT 'free' NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fixtures" (
	"id" serial PRIMARY KEY NOT NULL,
	"isports_match_id" text NOT NULL,
	"league_id" integer NOT NULL,
	"home_team_id" integer,
	"away_team_id" integer,
	"kickoff" timestamp with time zone,
	"status" text,
	"score_home" integer,
	"score_away" integer,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "leagues" (
	"id" serial PRIMARY KEY NOT NULL,
	"isports_league_id" text NOT NULL,
	"name" text NOT NULL,
	"short_name" text,
	"country" text,
	"season" text,
	"logo" text,
	"type" integer,
	"is_free" boolean DEFAULT false NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "standings" (
	"id" serial PRIMARY KEY NOT NULL,
	"league_id" integer NOT NULL,
	"team_id" integer NOT NULL,
	"rank" integer,
	"played" integer,
	"win" integer,
	"draw" integer,
	"loss" integer,
	"points" integer,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "teams" (
	"id" serial PRIMARY KEY NOT NULL,
	"isports_team_id" text NOT NULL,
	"name" text NOT NULL,
	"logo" text,
	"country" text
);
--> statement-breakpoint
CREATE TABLE "usage" (
	"id" serial PRIMARY KEY NOT NULL,
	"api_key_id" integer NOT NULL,
	"day" date NOT NULL,
	"count" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
ALTER TABLE "fixtures" ADD CONSTRAINT "fixtures_league_id_leagues_id_fk" FOREIGN KEY ("league_id") REFERENCES "public"."leagues"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fixtures" ADD CONSTRAINT "fixtures_home_team_id_teams_id_fk" FOREIGN KEY ("home_team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fixtures" ADD CONSTRAINT "fixtures_away_team_id_teams_id_fk" FOREIGN KEY ("away_team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "standings" ADD CONSTRAINT "standings_league_id_leagues_id_fk" FOREIGN KEY ("league_id") REFERENCES "public"."leagues"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "standings" ADD CONSTRAINT "standings_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usage" ADD CONSTRAINT "usage_api_key_id_api_keys_id_fk" FOREIGN KEY ("api_key_id") REFERENCES "public"."api_keys"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "api_keys_key_hash_idx" ON "api_keys" USING btree ("key_hash");--> statement-breakpoint
CREATE UNIQUE INDEX "fixtures_isports_id_idx" ON "fixtures" USING btree ("isports_match_id");--> statement-breakpoint
CREATE INDEX "fixtures_league_idx" ON "fixtures" USING btree ("league_id");--> statement-breakpoint
CREATE UNIQUE INDEX "leagues_isports_id_idx" ON "leagues" USING btree ("isports_league_id");--> statement-breakpoint
CREATE UNIQUE INDEX "standings_league_team_idx" ON "standings" USING btree ("league_id","team_id");--> statement-breakpoint
CREATE UNIQUE INDEX "teams_isports_id_idx" ON "teams" USING btree ("isports_team_id");--> statement-breakpoint
CREATE UNIQUE INDEX "usage_key_day_idx" ON "usage" USING btree ("api_key_id","day");