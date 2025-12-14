import { fail, redirect, type Actions } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { superValidate } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import { loginFormSchema } from './schema';
import { db } from '$lib/server/db';
import { eq } from 'drizzle-orm';
import { SETTING_KEYS, settings, users } from '$lib/server/db/schema';
import { jellyfin } from '$lib/server/jellyfin/jellyfin';
import { createUserSession, SESSION_EXPIRY } from '$lib/server/db/sessions';
import { getUserApi } from '@jellyfin/sdk/lib/utils/api';

export const load: PageServerLoad = async (event) => {
	// If user is logged in, redirect to the home page
	if (event.locals.user) {
		redirect(302, '/');
	}

	return {
		loginForm: await superValidate(zod4(loginFormSchema))
	};
};

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

		console.log('Logging in to Jellyfin server at', serverUrl);

		if (!form.valid || !serverUrl) {
			return fail(400, {
				form
			});
		}

		const api = jellyfin.createApi(serverUrl);
		const userApi = getUserApi(api);
		const auth = await userApi.authenticateUserByName({
			authenticateUserByName: { Username: form.data.username, Pw: form.data.password }
		});
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
					jellyfinUserName: user.Name as string
				})
				.where(eq(users.jellyfinUserId, user.Id as string))
				.execute();
		} else {
			// Add the user
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
		}

		// Create a session
		const sessionId = await createUserSession(user.Id as string, accessToken);

		// Set the session cookie
		cookies.set('sessionid', sessionId, {
			path: '/',
			maxAge: SESSION_EXPIRY,
			secure: false
		});

		return {
			form,
			user: auth.data.User
		};
	}
};
