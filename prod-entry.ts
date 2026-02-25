// https:github.com/sveltejs/kit/discussions/10162#discussioncomment-6188946
import { handler } from './build/handler.js';
import express from 'express';
import { NodeRuntime } from '@effect/platform-node';
import { Config, Cron, DateTime, Duration, Effect, Either, Schedule } from 'effect';
import { AssetService } from './src/lib/server/services/AssetService.ts';
import { LoggerLayer } from './src/lib/server/services/LoggerLayer.ts';
import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import { eq, and, gte } from 'drizzle-orm';
import * as schema from './src/lib/server/db/schema.ts';

// Self-contained DB client for auth middleware, using process.env directly
// to avoid importing $env/dynamic/private which only works inside SvelteKit
const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) throw new Error('DATABASE_URL is not set');

const authDbClient = createClient({ url: `file:${DATABASE_URL}` });
const authDb = drizzle(authDbClient, { schema });

const SESSION_EXPIRY = 1000 * 60 * 60 * 24 * 7 * 4; // 4 weeks

function getSessionIdFromCookieHeader(cookieHeader: string | undefined): string | undefined {
	if (!cookieHeader) return undefined;
	const match = cookieHeader.match(/(?:^|;\s*)sessionid=([^;]*)/);
	return match?.[1];
}

const authMiddleware: express.RequestHandler = async (req, res, next) => {
	// Only protect /videos/ routes
	if (!req.path.startsWith('/videos/')) {
		return next();
	}

	const sessionId = getSessionIdFromCookieHeader(req.headers.cookie);

	if (!sessionId) {
		res.status(401).send('Unauthorized');
		return;
	}

	const session = await authDb.query.sessions
		.findFirst({
			where: and(
				eq(schema.sessions.sessionId, sessionId),
				gte(schema.sessions.createdAt, new Date(Date.now() - SESSION_EXPIRY))
			)
		})
		.execute();

	if (!session) {
		res.status(401).send('Unauthorized');
		return;
	}

	const user = await authDb.query.users.findFirst({
		where: eq(schema.users.jellyfinUserId, session.userId)
	});

	if (!user) {
		res.status(401).send('Unauthorized');
		return;
	}

	next();
};

const assetsPath = './assets';

const main = Effect.gen(function* () {
	const cleanupCron = Cron.parse(yield* Config.string('CLEANUP_CRON').pipe(Config.withDefault('30 2 * * *'))); // Default to 2:30 AM every day
	if (Either.isLeft(cleanupCron)) {
		yield* Effect.logError(`Invalid cron expression: ${cleanupCron.left.message} - Input: ${cleanupCron.left.input}`);
	}
	const tzName = yield* Config.string('TZ').pipe(Config.withDefault('Europe/Berlin'));
	const resolvedCron = Either.match(cleanupCron, {
		onLeft: () => {
			return Cron.make({
				minutes: [30],
				hours: [2],
				days: [],
				months: [],
				weekdays: [],
				tz: DateTime.zoneUnsafeMakeNamed(tzName)
			});
		},
		onRight: (cron) => cron
	});
	const cleanupSchedule = Schedule.cron(resolvedCron);

	const maxAgeDays = yield* Config.number('CLEANUP_MAX_AGE_DAYS').pipe(Config.withDefault(7));

	const assetService = yield* AssetService;
	Effect.runFork(
		Effect.repeat(assetService.cleanupOriginalsDirectory(Duration.days(maxAgeDays)), cleanupSchedule).pipe(
			Effect.provide(LoggerLayer)
		)
	);

	const app = express();

	// Protect static asset routes with session auth
	app.use(authMiddleware);

	// Serve your "assets" folder
	app.use(express.static(assetsPath));

	// let SvelteKit handle everything else, including serving prerendered pages and static assets
	app.use(handler);

	app.listen(3000, () => {
		Effect.runPromise(Effect.logInfo('✅ Jelly-Clipper listening on port 3000').pipe(Effect.provide(LoggerLayer)));
	});

	yield* Effect.logInfo('Express server started');
	yield* Effect.never;
}).pipe(Effect.provide(AssetService.NodeLayer), Effect.provide(LoggerLayer));

NodeRuntime.runMain(main);
