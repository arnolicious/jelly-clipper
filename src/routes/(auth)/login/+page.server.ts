import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	// If user is logged in, redirect to the home page
	if (event.locals.user) {
		redirect(302, '/');
	}
};
