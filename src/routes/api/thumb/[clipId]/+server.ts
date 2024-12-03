import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { validateSetup } from '$lib/server/db/setup';
import Ffmpeg from 'fluent-ffmpeg';
import { ASSETS_CLIPS_DIR } from '$lib/constants';
import { readFileSync } from 'fs';

/**
 * Turns out this was not needed, since Jellyfin does not block CORS requests
 */

export const GET: RequestHandler = async ({ params }) => {
	const validatedSetup = await validateSetup();

	if (!validatedSetup.setupIsFinished) {
		return error(400, 'Jelly-Clipper is not setup yet');
	}

	const clipId = params.clipId;

	const proc = Ffmpeg({ source: `${ASSETS_CLIPS_DIR}/${clipId}.mp4` });

	// Use ffmpeg to create a thumbnail
	await new Promise<void>((resolve, reject) => {
		proc
			.on('start', (commandLine) => {
				console.log('Spawned Ffmpeg with command: ' + commandLine);
			})
			.on('error', (err) => {
				console.log('An error occurred: ' + err.message);
				reject(err);
			})
			.on('end', (err) => {
				if (!err) {
					console.log('Processing finished !');
					resolve();
				}
				reject(err);
			})
			.screenshots({
				count: 1,
				filename: `${ASSETS_CLIPS_DIR}/${clipId}.jpg`,
				timemarks: ['0%']
			});
	});

	// Load the image from disk and return it
	const image = readFileSync(`${ASSETS_CLIPS_DIR}/${clipId}.jpg`);

	return new Response(image, {
		headers: {
			'Content-Type': 'image/jpeg',
			'Cache-Control': 'public, max-age=31536000'
		}
	});
};
