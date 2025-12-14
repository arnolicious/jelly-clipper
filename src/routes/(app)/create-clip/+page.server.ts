import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { validateSetup } from '$lib/server/db/setup';

export const load: PageServerLoad = async (event) => {
	const validatedSetup = await validateSetup();

	if (!validatedSetup.setupIsFinished) {
		redirect(302, '/setup');
	}

	// If user is not logged in, redirect to the login page
	if (!event.locals.user) {
		redirect(302, '/login');
	}

	return {
		serverAddress: validatedSetup.serverAddress
	};
};
