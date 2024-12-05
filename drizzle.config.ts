import { defineConfig } from 'drizzle-kit';

if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not set');

export default defineConfig({
	schema: './src/lib/server/db/schema.ts',
	out: './src/lib/server/db/.drizzle/',
	dbCredentials: {
		url: process.env.DATABASE_URL
	},

	verbose: true,
	strict: true,
	dialect: 'sqlite'
});
