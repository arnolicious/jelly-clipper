import { Context, Effect, Layer, Schema } from 'effect';
import type { Cookies } from '@sveltejs/kit';
import { DB } from './DatabaseService';
import { and, eq, gte } from 'drizzle-orm';
import { sessions, users } from '../db/schema';
import { SESSION_EXPIRY } from '../db/sessions';

export class CurrentUser extends Context.Tag('CurrentUser')<
	CurrentUser,
	{
		getCurrentUser: () => Effect.Effect<User, NoCurrentUserError>;
	}
>() {}

export const makeAuthenticatedRuntimeLayer = (
	locals: App.Locals
): Layer.Layer<CurrentUser, NoCurrentUserError, never> => {
	return Layer.sync(CurrentUser, () => {
		const getCurrentUser = Effect.fn('CurrentUser.getCurrentUser')(function* () {
			const user = locals.user;
			if (!user) {
				return yield* NoCurrentUserError.make();
			}
			yield* Effect.logDebug(`Retrieved current user ${user.jellyfinUserName} (${user.jellyfinUserId})`);
			return User.make({
				accessToken: user.jellyfinAccessToken,
				id: user.jellyfinUserId,
				name: user.jellyfinUserName
			});
		});

		return CurrentUser.of({ getCurrentUser });
	});
};

export const makeAuthenticatedRuntimeLayerFromCookies = (
	cookies: Cookies
): Layer.Layer<CurrentUser, NoCurrentUserError, DB> => {
	return Layer.effect(
		CurrentUser,
		Effect.gen(function* () {
			const db = yield* DB;

			const getCurrentUser = Effect.fn('CurrentUser.getCurrentUserFromCookies')(function* () {
				const sessionId = cookies.get('sessionid');
				yield* Effect.logDebug(`Looking up current user from session ID in cookies: ${sessionId}`);
				if (!sessionId) {
					yield* Effect.logDebug('No session ID found in cookies');
					return yield* NoCurrentUserError.make();
				}

				const session = yield* db
					.runQuery((db) =>
						db.query.sessions
							.findFirst({
								where: and(
									eq(sessions.sessionId, sessionId),
									gte(sessions.createdAt, new Date(Date.now() - SESSION_EXPIRY))
								)
							})
							.execute()
					)
					.pipe(Effect.catchTag('DatabaseError', (e) => Effect.fail(NoCurrentUserError.make({ cause: e }))));

				if (!session) {
					yield* Effect.logDebug('No valid session found for session ID from cookies');
					return yield* NoCurrentUserError.make();
				}

				const user = yield* db
					.runQuery((db) =>
						db.query.users.findFirst({
							where: eq(users.jellyfinUserId, session.userId)
						})
					)
					.pipe(Effect.catchTag('DatabaseError', (e) => Effect.fail(NoCurrentUserError.make({ cause: e }))));

				if (!user) {
					yield* Effect.logDebug('No user found for session user ID');
					return yield* NoCurrentUserError.make();
				}

				yield* Effect.logDebug(`Retrieved current user ${user.jellyfinUserName} (${user.jellyfinUserId}) from cookies`);

				return User.make({
					accessToken: user.jellyfinAccessToken,
					id: user.jellyfinUserId,
					name: user.jellyfinUserName
				});
			});

			return CurrentUser.of({ getCurrentUser });
		})
	);
};

export class User extends Schema.Class<User>('User')({
	accessToken: Schema.String,
	id: Schema.String,
	name: Schema.String
}) {}

export class NoCurrentUserError extends Schema.TaggedError<NoCurrentUserError>()('NoCurrentUserError', {
	cause: Schema.optional(Schema.Unknown)
}) {}
