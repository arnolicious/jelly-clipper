import { validateSetup } from '$lib/server/db/setup';
import { fail } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { eq } from 'drizzle-orm';
import { clips } from '$lib/server/db/schema';

export const load: PageServerLoad = async ({ locals }) => {
	const validatedSetup = await validateSetup();

	const user = locals.user;

	if (!validatedSetup.setupIsFinished || !user) {
		return fail(401);
	}

	const userClips = await db.query.clips
		.findMany({
			where: eq(clips.userId, user.jellyfinUserId)
		})
		.execute();

	return {
		clips: userClips
	};
};
