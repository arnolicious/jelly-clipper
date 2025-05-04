import { ASSETS_CLIPS_DIR } from '$lib/constants';
import fs from 'fs';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { clips } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

export const DELETE: RequestHandler = async ({ params }) => {
	const clipId = params.clipId;
	const videoPath = `${ASSETS_CLIPS_DIR}/${clipId}.mp4`;
	const audioPath = `${ASSETS_CLIPS_DIR}/${clipId}.mp3`;

	await db
		.delete(clips)
		.where(eq(clips.id, Number(clipId)))
		.execute();

	// Check if video exists
	if (!fs.existsSync(videoPath)) {
		// Delete the video file
		fs.unlinkSync(videoPath);
	}

	// Check if there is also an audio file to delete
	if (fs.existsSync(audioPath)) {
		// Delete the audio file
		fs.unlinkSync(audioPath);
	}

	return new Response('Deleted clip', { status: 200 });
};
