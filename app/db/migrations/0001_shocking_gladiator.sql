CREATE TABLE `admins` (
	`id` text PRIMARY KEY NOT NULL,
	`username` text NOT NULL,
	`password_hash` text NOT NULL,
	`created_at` integer NOT NULL,
	`last_login_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `admins_username_unique` ON `admins` (`username`);--> statement-breakpoint
CREATE INDEX `idx_admins_username` ON `admins` (`username`);--> statement-breakpoint
CREATE TABLE `api_tokens` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`token` text NOT NULL,
	`usage_limit` integer DEFAULT 0 NOT NULL,
	`usage_count` integer DEFAULT 0 NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` integer NOT NULL,
	`last_used_at` integer,
	`expires_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `api_tokens_token_unique` ON `api_tokens` (`token`);--> statement-breakpoint
CREATE INDEX `idx_api_tokens_token` ON `api_tokens` (`token`);--> statement-breakpoint
CREATE INDEX `idx_api_tokens_is_active` ON `api_tokens` (`is_active`);--> statement-breakpoint
CREATE TABLE `token_usage_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`token_id` text NOT NULL,
	`email` text NOT NULL,
	`ip_address` text,
	`user_agent` text,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_token_usage_logs_token_id` ON `token_usage_logs` (`token_id`);--> statement-breakpoint
CREATE INDEX `idx_token_usage_logs_created_at` ON `token_usage_logs` (`created_at`);