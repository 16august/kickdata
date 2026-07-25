ALTER TABLE "teams" ADD COLUMN "league_id" integer;--> statement-breakpoint
ALTER TABLE "teams" ADD COLUMN "isports_league_id" text;--> statement-breakpoint
ALTER TABLE "teams" ADD COLUMN "venue" text;--> statement-breakpoint
ALTER TABLE "teams" ADD COLUMN "coach" text;--> statement-breakpoint
ALTER TABLE "teams" ADD COLUMN "founding_date" text;--> statement-breakpoint
ALTER TABLE "teams" ADD COLUMN "website" text;--> statement-breakpoint
ALTER TABLE "teams" ADD COLUMN "capacity" integer;--> statement-breakpoint
ALTER TABLE "teams" ADD COLUMN "is_national" boolean;--> statement-breakpoint
ALTER TABLE "teams" ADD CONSTRAINT "teams_league_id_leagues_id_fk" FOREIGN KEY ("league_id") REFERENCES "public"."leagues"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "teams_league_idx" ON "teams" USING btree ("league_id");