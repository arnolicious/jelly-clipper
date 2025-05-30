import { validateSetup } from '$lib/server/db/setup';
import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';
import maxListenersExceededWarning from 'max-listeners-exceeded-warning';

export const load: LayoutServerLoad = async (event) => {
	const validatedSetup = await validateSetup();

	maxListenersExceededWarning();

	if (!validatedSetup.setupIsFinished) {
		redirect(302, '/setup');
	}

	// If user is not logged in, redirect to the login page
	if (!event.locals.user) {
		redirect(302, '/login');
	}

	// Fetch jellyfin info stuff
	// const mediaFolders = await getMediaFolders(
	// 	validatedSetup.serverAddress,
	// 	event.locals.user.jellyfinAccessToken
	// );

	return {
		user: event.locals.user,
		serverAddress: validatedSetup.serverAddress
		// mediaFolders: mediaFolders.Items ?? []
	};
};
