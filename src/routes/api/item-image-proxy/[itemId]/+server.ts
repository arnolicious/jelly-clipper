import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { validateSetup } from '$lib/server/db/setup';

/**
 * Turns out this was not needed, since Jellyfin does not block CORS requests
 */

export const GET: RequestHandler = async ({ params }) => {
	const validatedSetup = await validateSetup();

	if (!validatedSetup.setupIsFinished) {
		return error(400, 'Jelly-Clipper is not setup yet');
	}

	const jellyfinAddress = validatedSetup.serverAddress;

	const jellyfinImageUrl = `${jellyfinAddress}Items/${params.itemId}/Images/Primary`;

	// Download the image
	const response = await fetch(jellyfinImageUrl);

	const image = await response.blob();

	return new Response(image, {
		headers: {
			'Content-Type': 'image/jpeg',
			'Cache-Control': 'public, max-age=31536000'
		}
	});
};
