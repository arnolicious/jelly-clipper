import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { validateSetup } from '$lib/server/db/setup';
import { getMediaFolders } from '$lib/server/jellyfin/jellyfin.svelte';

export const load: PageServerLoad = async (event) => {
	const validatedSetup = await validateSetup();

	if (!validatedSetup.setupIsFinished) {
		redirect(302, '/setup');
	}

	// If user is not logged in, redirect to the login page
	if (!event.locals.user) {
		redirect(302, '/login');
	}

	// Fetch jellyfin info stuff
	const mediaFolders = await getMediaFolders(
		validatedSetup.serverAddress,
		event.locals.user.jellyfinAccessToken
	);

	return {
		user: event.locals.user,
		serverAddress: validatedSetup.serverAddress,
		mediaFolders: mediaFolders.Items ?? []
	};
};
