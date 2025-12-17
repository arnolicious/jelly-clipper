// https:github.com/sveltejs/kit/discussions/10162#discussioncomment-6188946
import { handler } from './build/handler.js';
import express from 'express';
import cron from 'node-cron';
import { cleanUpOriginalsFolder } from './src/lib/server/db/cleanup.ts';
import { Effect } from 'effect';
import { serverRuntime } from './src/lib/server/services/RuntimeLayers.ts';

// Get absolute path to assets folder, "./data/assets" might work fine and you can remove this line/dep
// const assetsPath = join(import.meta.url, './assets');
const assetsPath = './assets';

const main = Effect.gen(function* () {
	yield* Effect.log('Starting Express server...');
	const app = express();

	// Serve your "assets" folder
	app.use(express.static(assetsPath));

	// let SvelteKit handle everything else, including serving prerendered pages and static assets
	app.use(handler);

	// Run the cleanup function every day at 2:30 AM
	cron.schedule('30 2 * * *', cleanUpOriginalsFolder, { timezone: process.env.TZ });

	app.listen(3000, () => {
		console.info('Express: listening on port 3000');
	});
});

serverRuntime.runPromise(main);
