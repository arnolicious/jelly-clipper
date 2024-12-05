CREATE TABLE `clips` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text NOT NULL,
	`title` text NOT NULL,
	`source_id` text NOT NULL,
	`source_type` text NOT NULL,
	`source_title` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text NOT NULL,
	`session_id` text NOT NULL,
	`access_token` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text
);
--> statement-breakpoint
CREATE TABLE `users` (
	`jellyfin_user_id` text PRIMARY KEY NOT NULL,
	`jellyfin_user_name` text NOT NULL,
	`jellyfin_access_token` text NOT NULL,
	`jellyfin_avatar_url` text NOT NULL,
	`is_admin` integer NOT NULL
);
