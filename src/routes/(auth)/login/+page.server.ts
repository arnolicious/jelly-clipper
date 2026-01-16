import { fail, redirect, type Actions } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { superValidate } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import { loginFormSchema } from './schema';
import { db } from '$lib/server/db';
import { eq } from 'drizzle-orm';
import { SETTING_KEYS, settings, users } from '$lib/server/db/schema';
import { createUserSession, SESSION_EXPIRY } from '$lib/server/db/sessions';
import { Effect, Exit } from 'effect';
import { AnonymousJellyfinApi } from '$lib/server/services/JellyfinService';
import { serverRuntime } from '$lib/server/services/RuntimeLayers';

export const load: PageServerLoad = async (event) => {
	// If user is logged in, redirect to the home page
	if (event.locals.user) {
		redirect(302, '/');
	}

	return {
		loginForm: await superValidate(zod4(loginFormSchema))
	};
};

const authenticateUser = Effect.fn('login.authenticateUser')(function* (params: {
	username: string;
	password: string;
	serverUrl: string;
}) {
	const api = yield* AnonymousJellyfinApi;

	const auth = yield* api.authenticateUserByName({
		password: params.password,
		username: params.username,
		serverAddress: params.serverUrl
	});

	return auth;
});

export const actions: Actions = {
	login: async ({ request, cookies }) => {
		const formData = await request.formData();
		const form = await superValidate(formData, zod4(loginFormSchema));
		const serverUrl = (
			await db.query.settings
				.findFirst({
					where: eq(settings.key, SETTING_KEYS.jellyfinUrl)
				})
				.execute()
		)?.value;

		// console.info('Logging in to Jellyfin server at', serverUrl);
		await Effect.logInfo('Logging in to Jellyfin server at', serverUrl).pipe(
			serverRuntime.runPromise
		);

		if (!form.valid || !serverUrl) {
			return fail(400, {
				form
			});
		}

		const authExit = await serverRuntime.runPromiseExit(
			authenticateUser({
				username: form.data.username,
				password: form.data.password,
				serverUrl: serverUrl
			}).pipe(Effect.withLogSpan('login.authenticateUser'))
		);

		if (Exit.isFailure(authExit)) {
			const cause = authExit.cause;
			if (cause._tag === 'Fail' && cause.error._tag === 'JellyfinApiError') {
				const code = cause.error._tag === 'JellyfinApiError' ? 401 : 500;
				return fail(code, {
					form
				});
			}
			return fail(500, 'An unexpected error occurred: ' + cause.toString());
		}

		const auth = authExit.value;
		const accessToken = auth.AccessToken;
		const user = auth.User;

		// console.info('Logged in to Jellyfin server at', serverUrl, 'as', user?.Name);
		await Effect.logInfo('Logged in to Jellyfin server at', serverUrl, 'as', user?.Name).pipe(
			serverRuntime.runPromise
		);

		if (!accessToken || !user) {
			return fail(401, {
				form: {
					...form,
					errors: {
						password: 'Invalid username or password'
					}
				}
			});
		}

		// Check if the user is already in the database
		const existingUser = await db.query.users
			.findFirst({
				where: eq(users.jellyfinUserId, user.Id as string)
			})
			.execute();

		if (existingUser) {
			// Update the access token and user name
			await db
				.update(users)
				.set({
					jellyfinAccessToken: accessToken,
					jellyfinUserName: user.Name
				})
				.where(eq(users.jellyfinUserId, user.Id))
				.execute();
		} else {
			// Add the user
			await db
				.insert(users)
				.values({
					isAdmin: true,
					jellyfinAccessToken: accessToken,
					jellyfinUserId: user.Id,
					jellyfinAvatarUrl: `/api/avatarproxy/${user.Id}`,
					jellyfinUserName: user.Name
				})
				.execute();
		}

		// Create a session
		const sessionId = await createUserSession(user.Id, accessToken);

		// Set the session cookie
		cookies.set('sessionid', sessionId, {
			path: '/',
			maxAge: SESSION_EXPIRY,
			secure: false
		});

		return {
			form,
			user: auth.User
		};
	}
};
