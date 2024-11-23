import { getUserFromSession } from '$lib/server/db/sessions';
import type { Handle } from '@sveltejs/kit';

export const handle: Handle = async ({ event, resolve }) => {
	const sessionId = event.cookies.get('sessionid');
	if (!sessionId) return resolve(event);

	const user = await getUserFromSession(sessionId);

	if (!user) return resolve(event);

	event.locals.user = user;

	return resolve(event);
};
