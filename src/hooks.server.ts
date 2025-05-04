import { getUserFromSession } from '$lib/server/db/sessions';
import { type Handle, type HandleServerError } from '@sveltejs/kit';

export const handle: Handle = async ({ event, resolve }) => {
	const sessionId = event.cookies.get('sessionid');

	const pathName = event.url.pathname;
	if ((pathName.startsWith('/videos/') || pathName.startsWith('/api/')) && !sessionId) {
		return new Response('Unauthorized', { status: 401 });
	}

	if (!sessionId) return resolve(event);

	const user = await getUserFromSession(sessionId);

	if (!user) return resolve(event);

	event.locals.user = user;

	return resolve(event);
};

export const handleError: HandleServerError = async ({ error, message }) => {
	console.error(`Server error`, error, message);

	return {
		message: 'Whoops!'
	};
};
