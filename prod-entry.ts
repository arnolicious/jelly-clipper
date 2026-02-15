// https:github.com/sveltejs/kit/discussions/10162#discussioncomment-6188946
import { handler } from './build/handler.js';
import express from 'express';
import { NodeRuntime } from '@effect/platform-node';
import { Config, Cron, DateTime, Duration, Effect, Either, Schedule } from 'effect';
import { AssetService } from './src/lib/server/services/AssetService.ts';
import { LoggerLayer } from './src/lib/server/services/LoggerLayer.ts';

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
