import { eq, and, gte } from 'drizzle-orm';
import { db } from '.';
import { sessions, users } from './schema';

export const SESSION_EXPIRY = 1000 * 60 * 60 * 24 * 7 * 4; // 4 weeks

export async function createUserSession(userId: string, accessToken: string) {
	const sessionId = crypto.randomUUID();

	await db.insert(sessions).values({
		accessToken,
		createdAt: new Date(),
		sessionId,
		userId
	});

	return sessionId;
}

export async function getUserFromSession(sessionId: string) {
	// Finc session by ID and check if it's still valid
	const session = await db.query.sessions
		.findFirst({
			where: and(eq(sessions.sessionId, sessionId), gte(sessions.createdAt, new Date(Date.now() - SESSION_EXPIRY)))
		})
		.execute();

	if (!session) {
		return null;
	}

	const user = await db.query.users.findFirst({
		where: eq(users.jellyfinUserId, session.userId)
	});

	return user;
}
