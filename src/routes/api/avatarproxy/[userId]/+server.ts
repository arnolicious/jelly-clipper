import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { validateSetup } from '$lib/server/db/setup';

export const GET: RequestHandler = async ({ params }) => {
	const validatedSetup = await validateSetup();

	if (!validatedSetup.setupIsFinished) {
		return error(400, 'Jelly-Clipper is not setup yet');
	}

	const jellyfinAddress = validatedSetup.serverAddress;

	const jellyfinAvatarUrl = `${jellyfinAddress}UserImage?UserId=${params.userId}`;
	console.log('Fetching image from', jellyfinAvatarUrl);

	// Download the image
	const response = await fetch(jellyfinAvatarUrl);

	const image = await response.blob();

	return new Response(image, {
		headers: {
			'Content-Type': 'image/jpeg',
			'Cache-Control': 'public, max-age=31536000'
		}
	});
};
