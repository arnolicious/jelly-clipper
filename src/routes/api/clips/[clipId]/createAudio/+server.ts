import { error } from '@sveltejs/kit';
import fs from 'fs';
import ffmpeg from 'fluent-ffmpeg';
import type { RequestHandler } from './$types';
import { ASSETS_CLIPS_DIR } from '$lib/constants';

export const GET: RequestHandler = async ({ params }) => {
	const clipId = params.clipId;
	const videoPath = `${ASSETS_CLIPS_DIR}/${clipId}.mp4`;
	const audioPath = `${ASSETS_CLIPS_DIR}/${clipId}.mp3`;

	// Check if video exists
	if (!fs.existsSync(videoPath)) {
		throw error(404, 'Clip not found');
	}

	// Check if audio already exists
	if (!fs.existsSync(audioPath)) {
		// Extract audio from video
		await new Promise((resolve, reject) => {
			ffmpeg(videoPath)
				.toFormat('mp3')
				.saveToFile(audioPath)
				.on('end', resolve)
				.on('error', reject);
		});
	}

	const audioFile = fs.readFileSync(audioPath);

	if (!audioFile) {
		throw error(500, 'Failed to read audio file');
	}

	// Return a 200 to indicate that the audio file was successfully created
	return new Response('Created audio file');
};
