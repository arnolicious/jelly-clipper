import { ASSETS_ORIGINALS_DIR, ASSETS_CLIPS_DIR } from '$lib/constants';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import ffmpeg from 'fluent-ffmpeg';
import { db } from '$lib/server/db';
import { clips } from '$lib/server/db/schema';
import { getUserFromSession } from '$lib/server/db/sessions';
import { createClipBodySchema } from './schema';

export const POST: RequestHandler = async ({ params, request, cookies }) => {
	const sourceId = params.sourceId;
	const sessionId = cookies.get('sessionid');
	const user = await getUserFromSession(sessionId ?? '');

	if (!user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const body = await request.json();

	const parsedBody = createClipBodySchema.safeParse(body);
	if (parsedBody.success === false) {
		return json({ error: `Invalid request body: ${parsedBody.error.errors}` }, { status: 400 });
	}

	// Create clip in db
	const { lastInsertRowid: clipId } = await db
		.insert(clips)
		.values({
			createdAt: new Date(),
			sourceId,
			sourceTitle: parsedBody.data.sourceInfo.sourceTitle,
			sourceType: parsedBody.data.sourceInfo.sourceType,
			title: parsedBody.data.title,
			userId: user.jellyfinUserId
		})
		.execute();

	const duration = body.end - body.start;

	// Load media file from ASSETS_ORIGINALS_DIR/:sourceId.mp4
	const proc = ffmpeg({ source: `${ASSETS_ORIGINALS_DIR}/${sourceId}.mp4` });

	await new Promise<void>((resolve, reject) => {
		proc
			.setStartTime(body.start)
			.setDuration(duration)
			.saveToFile(`${ASSETS_CLIPS_DIR}/${clipId}.mp4`)
			.on('start', (commandLine) => {
				console.log('Spawned Ffmpeg with command: ' + commandLine);
			})
			.on('error', (err) => {
				console.log('An error occurred: ' + err.message);
				reject(err);
			})
			.on('end', (err) => {
				if (!err) {
					console.log('Processing finished !');
					resolve();
				}
				reject(err);
			});
	});

	return json({ clipId }, { status: 201 });
};
