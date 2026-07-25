CREATE TABLE "players" (
	"id" serial PRIMARY KEY NOT NULL,
	"isports_record_id" text NOT NULL,
	"isports_player_id" text,
	"team_id" integer,
	"isports_team_id" text,
	"name" text NOT NULL,
	"position" text,
	"number" integer,
	"birthday" text,
	"height" integer,
	"weight" integer,
	"country" text,
	"feet" text,
	"photo" text,
	"market_value" integer,
	"contract_end_date" text
);
--> statement-breakpoint
ALTER TABLE "fixtures" ADD COLUMN "home_name" text;--> statement-breakpoint
ALTER TABLE "fixtures" ADD COLUMN "away_name" text;--> statement-breakpoint
ALTER TABLE "fixtures" ADD COLUMN "round" text;--> statement-breakpoint
ALTER TABLE "fixtures" ADD COLUMN "season" text;--> statement-breakpoint
ALTER TABLE "players" ADD CONSTRAINT "players_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "players_record_id_idx" ON "players" USING btree ("isports_record_id");--> statement-breakpoint
CREATE INDEX "players_team_idx" ON "players" USING btree ("team_id");