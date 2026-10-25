ALTER TABLE `player_profiles` ADD `display_name` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `player_profiles` ADD `player_tag` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `player_profiles` ADD `primary_goal` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `player_profiles` ADD `game_state` text DEFAULT '{}' NOT NULL;--> statement-breakpoint
ALTER TABLE `player_profiles` ADD `workout_state` text DEFAULT '{}' NOT NULL;