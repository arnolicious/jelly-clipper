import type { IncomingMessage, ServerResponse } from 'http';
import { getUserFromSession } from './db/sessions';

function getSessionIdFromCookieHeader(cookieHeader: string | undefined): string | undefined {
	if (!cookieHeader) return undefined;
	const match = cookieHeader.match(/(?:^|;\s*)sessionid=([^;]*)/);
	return match?.[1];
}

export const authMiddleware = async (req: IncomingMessage, res: ServerResponse, next: () => void) => {
	const url = req.url ?? '';

	// Only protect /videos/ routes
	if (!url.startsWith('/videos/')) {
		return next();
	}

	const sessionId = getSessionIdFromCookieHeader(req.headers.cookie);

	if (!sessionId) {
		res.statusCode = 401;
		res.end('Unauthorized');
		return;
	}

	const user = await getUserFromSession(sessionId);

	if (!user) {
		res.statusCode = 401;
		res.end('Unauthorized');
		return;
	}

	next();
};
