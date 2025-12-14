import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { validateSetup } from '$lib/server/db/setup';
import { readFileSync } from 'fs';
import { Effect, Exit } from 'effect';
import { AVService } from '$lib/server/services/AVService';
import { serverRuntime } from '$lib/server/services/RuntimeLayers';

const generateThumbnail = Effect.fn('generateThumbnail')(function* (clipId: number) {
	const av = yield* AVService;

	const thumbnailPath = yield* av.createThumbnailForClip(clipId);

	return thumbnailPath;
});

export const GET: RequestHandler = async ({ params }) => {
	const validatedSetup = await validateSetup();

	if (!validatedSetup.setupIsFinished) {
		return error(400, 'Jelly-Clipper is not setup yet');
	}
	const clipId = Number(params.clipId);

	const exit = await serverRuntime.runPromiseExit(generateThumbnail(clipId));

	if (Exit.isFailure(exit)) {
		const cause = exit.cause;
		if (cause._tag === 'Fail') {
			return error(500, cause.error.message);
		} else {
			return error(500, 'An unexpected error occurred: ' + cause.toString());
		}
	}
	const thumbnailPath = exit.value;

	// Load the image from disk and return it
	const image = readFileSync(thumbnailPath);

	return new Response(image, {
		headers: {
			'Content-Type': 'image/jpeg',
			'Cache-Control': 'public, max-age=31536000'
		}
	});
};
