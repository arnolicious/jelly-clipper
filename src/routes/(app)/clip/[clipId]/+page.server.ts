import { db } from '$lib/server/db';
import { eq } from 'drizzle-orm';
import type { PageServerLoad } from './$types';
import { clips, users } from '$lib/server/db/schema';
import { fail } from '@sveltejs/kit';
import { validateSetup } from '$lib/server/db/setup';

export const load: PageServerLoad = async ({ locals, params }) => {
	const clipId = Number(params.clipId);

	const validatedSetup = await validateSetup();

	const user = locals.user;

	if (!validatedSetup.setupIsFinished || !user) {
		return fail(401);
	}

	if (isNaN(clipId)) {
		return fail(404);
	}

	const clip = await db.query.clips
		.findFirst({
			where: eq(clips.id, clipId)
		})
		.execute();

	if (!clip) {
		return fail(404);
	}

	const creator = await db.query.users.findFirst({
		where: eq(users.jellyfinUserId, clip.userId)
	});

	if (!clip || !creator) {
		return fail(404);
	}

	return {
		clip,
		creator,
		serverAddress: validatedSetup.serverAddress
	};
};
