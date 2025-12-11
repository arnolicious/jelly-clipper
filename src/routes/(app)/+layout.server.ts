import { validateSetup } from '$lib/server/db/setup';
import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';
import { serverRuntime } from '$lib/server/services/RuntimeLayers';
import { Effect } from 'effect';

export const load: LayoutServerLoad = async (event) => {
	const validatedSetup = await validateSetup();

	if (!validatedSetup.setupIsFinished) {
		redirect(302, '/setup');
	}

	// If user is not logged in, redirect to the login page
	if (!event.locals.user) {
		redirect(302, '/login');
	}

	await serverRuntime.runPromise(Effect.log('Layout load function executed'));

	return {
		user: event.locals.user,
		serverAddress: validatedSetup.serverAddress
	};
};
