import type { Actions, PageServerLoad } from './$types.js';
import { message, superValidate } from 'sveltekit-superforms';
import { setupFormSchema } from './schema';
import { zod4 } from 'sveltekit-superforms/adapters';
import { fail, redirect } from '@sveltejs/kit';
import { db } from '$lib/server/db/index.js';
import { SETTING_KEYS, settings, users } from '$lib/server/db/schema.js';
import { validateSetup } from '$lib/server/db/setup.js';
import { createUserSession, SESSION_EXPIRY } from '$lib/server/db/sessions.js';
import { loginFormSchema } from '../login/schema.js';
import { AnonymousJellyfinApi } from '$lib/server/services/JellyfinService.js';
import { Effect, Exit } from 'effect';
import { serverRuntime } from '$lib/server/services/RuntimeLayers.js';

export const load: PageServerLoad = async () => {
	const validatedSetup = await validateSetup();

	if (validatedSetup.setupIsFinished) {
		redirect(302, '/');
	}

	return {
		setupForm: await superValidate(zod4(setupFormSchema)),
		setupLoginForm: await superValidate(zod4(loginFormSchema))
	};
};

const findJellyfinServer = Effect.fn('setup.findJellyfinServer')(function* (jellyfinServerUrl: string) {
	const anonymousApi = yield* AnonymousJellyfinApi;
	const server = yield* anonymousApi.findServerByAddress(jellyfinServerUrl);
	return server;
});

const authenticateUser = Effect.fn('setup.authenticateUser')(function* (params: {
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
	setup: async (event) => {
		const form = await superValidate(event, zod4(setupFormSchema));
		if (!form.valid) {
			return fail(400, {
				form
			});
		}

		const bestServerExit = await serverRuntime.runPromiseExit(
			findJellyfinServer(form.data.jellyfinServerUrl).pipe(Effect.withLogSpan('setup.findJellyfinServer'))
		);

		if (Exit.isFailure(bestServerExit)) {
			const cause = bestServerExit.cause;
			if (cause._tag === 'Fail') {
				const code = cause.error._tag === 'JellyfinServerNotFound' ? 404 : 500;
				return fail(code, cause.error.message);
			}
			return fail(500, 'An unexpected error occurred: ' + cause.toString());
		}

		const bestServer = bestServerExit.value;

		if (!bestServer) {
			console.error('No Jellyfin server found at', form.data.jellyfinServerUrl);
			return fail(400, {
				form: {
					...form,
					errors: {
						jellyfinServerUrl: 'No Jellyfin server found at this URL'
					}
				}
			});
		}

		const address = bestServer.address.endsWith('/') ? bestServer.address : bestServer.address + '/';
		console.info('Found Jellyfin server at', address);

		return message(form, {
			status: 'success',
			text: 'Jellyfin server found',
			data: address
		});
	},
	login: async ({ request, cookies }) => {
		const formData = await request.formData();
		const form = await superValidate(formData, zod4(loginFormSchema));
		const serverUrl = formData.get('serverUrl')?.toString();

		console.info('Logging in to Jellyfin server at', serverUrl);

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
			}).pipe(Effect.withLogSpan('setup.authenticateUser'))
		);

		if (Exit.isFailure(authExit)) {
			const cause = authExit.cause;
			if (cause._tag === 'Fail' && cause.error._tag === 'JellyfinApiError') {
				const code = cause.error._tag === 'JellyfinApiError' ? 401 : 500;
				return fail(code, cause.error.message);
			}
			return fail(500, 'An unexpected error occurred: ' + cause.toString());
		}
		const auth = authExit.value;
		const accessToken = auth.AccessToken;
		const user = auth.User;

		console.info('Logged in to Jellyfin server at', serverUrl, 'as', user?.Name);

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

		// If authentication is successful, save the server URL to the database
		await db.insert(settings).values({ key: SETTING_KEYS.jellyfinUrl, value: serverUrl }).execute();

		// And add the user
		await db
			.insert(users)
			.values({
				isAdmin: true,
				jellyfinAccessToken: accessToken,
				jellyfinUserId: user.Id as string,
				jellyfinAvatarUrl: `/api/avatarproxy/${user.Id}`,
				jellyfinUserName: user.Name as string
			})
			.execute();

		// Create a session
		const sessionId = await createUserSession(user.Id as string, accessToken);

		// Set the session cookie
		cookies.set('sessionid', sessionId, {
			path: '/',
			maxAge: SESSION_EXPIRY
		});

		return {
			form,
			user: auth.User
		};
	}
};
