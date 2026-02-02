import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import { Config, Context, Effect, Layer, Schema } from 'effect';
import * as schema from '../db/schema';
import { migrate } from 'drizzle-orm/libsql/migrator';

const getDb = Effect.gen(function* () {
	const dbUrl = yield* Config.string('DATABASE_URL');
	const client = createClient({ url: `file:${dbUrl}` });
	const db = drizzle(client, { schema });
	return db;
});

export class DatabaseError extends Schema.TaggedError<DatabaseError>()('DatabaseError', {
	message: Schema.String,
	cause: Schema.Defect
}) {}

export class DatabaseService extends Context.Tag('DB')<
	DatabaseService,
	{
		readonly db: Effect.Effect.Success<typeof getDb>;
		readonly schema: typeof schema;
		readonly runQuery: <T>(
			fn: (client: Effect.Effect.Success<typeof getDb>) => Promise<T>
		) => Effect.Effect<T, DatabaseError>;
	}
>() {
	static readonly Default = Layer.effect(
		DatabaseService,
		Effect.gen(function* () {
			yield* Effect.logDebug('Connecting to database...');
			const db = yield* getDb;

			yield* Effect.logDebug('Running database migrations...');
			yield* Effect.tryPromise({
				try: () => migrate(db, { migrationsFolder: 'src/lib/server/db/.drizzle/' }),
				catch: (cause) => new DatabaseError({ message: 'Failed to run database migrations', cause })
			});
			yield* Effect.log('Database is ready.');

			const runQuery = <T>(fn: (client: typeof db) => Promise<T>) =>
				Effect.tryPromise({
					try: () => fn(db),
					catch: (cause) => new DatabaseError({ message: 'Database query failed', cause })
				});

			return {
				db,
				schema,
				runQuery
			};
		})
	);
}
