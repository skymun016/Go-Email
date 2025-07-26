import { defineConfig } from "drizzle-kit";

export default defineConfig({
	out: "./app/db/migrations",
	schema: "./app/db/schema.ts",
	dialect: "sqlite",
	driver: "better-sqlite",
	dbCredentials: {
		url: "./.wrangler/state/v3/d1/miniflare-D1DatabaseObject/6cddafa5-8b18-4ad5-9945-2de44162bf3e.sqlite",
	},
});
