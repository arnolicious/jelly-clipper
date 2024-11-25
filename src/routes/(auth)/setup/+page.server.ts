import type { Actions, PageServerLoad } from './$types.js';
import { message, superValidate } from 'sveltekit-superforms';
import { setupFormSchema } from './schema';
import { zod } from 'sveltekit-superforms/adapters';
import { fail, redirect } from '@sveltejs/kit';
import { db } from '$lib/server/db/index.js';
import { SETTING_KEYS, settings, users } from '$lib/server/db/schema.js';
import { validateSetup } from '$lib/server/db/setup.js';
import { createUserSession, SESSION_EXPIRY } from '$lib/server/db/sessions.js';
import { jellyfin } from '$lib/server/jellyfin/jellyfin.svelte.js';
import { loginFormSchema } from '../login/schema.js';

export const load: PageServerLoad = async () => {
	const validatedSetup = await validateSetup();

	if (validatedSetup.setupIsFinished) {
		redirect(302, '/');
	}

	return {
		setupForm: await superValidate(zod(setupFormSchema)),
		setupLoginForm: await superValidate(zod(loginFormSchema))
	};
};

export const actions: Actions = {
	setup: async (event) => {
		const form = await superValidate(event, zod(setupFormSchema));
		if (!form.valid) {
			return fail(400, {
				form
			});
		}

		console.log('Checking Jellyfin server at', form.data.jellyfinServerUrl);

		const servers = await jellyfin.discovery.getRecommendedServerCandidates(
			form.data.jellyfinServerUrl
		);
		const bestServer = jellyfin.discovery.findBestServer(servers);

		if (!bestServer) {
			console.log('No Jellyfin server found at', form.data.jellyfinServerUrl);
			return fail(400, {
				form: {
					...form,
					errors: {
						jellyfinServerUrl: 'No Jellyfin server found at this URL'
					}
				}
			});
		}

		const address = bestServer.address.endsWith('/')
			? bestServer.address
			: bestServer.address + '/';
		console.log('Found Jellyfin server at', address);

		return message(form, {
			status: 'success',
			text: 'Jellyfin server found',
			data: address
		});
	},
	login: async ({ request, cookies }) => {
		const formData = await request.formData();
		const form = await superValidate(formData, zod(loginFormSchema));
		const serverUrl = formData.get('serverUrl')?.toString();

		console.log('Logging in to Jellyfin server at', serverUrl);

		if (!form.valid || !serverUrl) {
			return fail(400, {
				form
			});
		}

		const api = jellyfin.createApi(serverUrl);
		const auth = await api.authenticateUserByName(form.data.username, form.data.password);
		const accessToken = auth.data.AccessToken;
		const user = auth.data.User;

		console.log('Logged in to Jellyfin server at', serverUrl, 'as', user?.Name);

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
			user: auth.data.User
		};
	}
};
