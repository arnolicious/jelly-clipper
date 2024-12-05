// https:github.com/sveltejs/kit/discussions/10162#discussioncomment-6188946

import { handler } from './build/handler.js';
import express from 'express';
import cron from 'node-cron';
import { cleanUpOriginalsFolder } from './src/lib/server/db/cleanup.js';

// Get absolute path to assets folder, "./data/assets" might work fine and you can remove this line/dep
// const assetsPath = join(import.meta.url, './assets');
const assetsPath = './assets';

const app = express();

// Serve your "assets" folder
app.use(express.static(assetsPath));

// let SvelteKit handle everything else, including serving prerendered pages and static assets
app.use(handler);

// Run the cleanup function every day at 00:10
cron.schedule('26 0 * * *', cleanUpOriginalsFolder, { timezone: process.env.TZ });

app.listen(3000, () => {
	console.log('listening on port 3000');
});
