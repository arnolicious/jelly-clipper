import { ASSETS_ORIGINALS_DIR, ASSETS_CLIPS_DIR } from '$lib/constants';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import ffmpeg from 'fluent-ffmpeg';
import { db } from '$lib/server/db';
import { clips } from '$lib/server/db/schema';
import { getUserFromSession } from '$lib/server/db/sessions';
import { createClipBodySchema } from './schema';
import fs from 'fs/promises';
import path from 'path';

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
	const { lastInsertRowid } = await db
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

	const subtitle = parsedBody.data.subtitleTrack;

	const duration = parsedBody.data.end - parsedBody.data.start;

	// Convert Bigint to Number
	const clipId = Number(lastInsertRowid);

	// Load media file from ASSETS_ORIGINALS_DIR/:sourceId.mp4
	const proc = ffmpeg({ source: `${ASSETS_ORIGINALS_DIR}/${sourceId}.mp4` });
	proc.setStartTime(parsedBody.data.start).setDuration(duration);

	let tempSrtFilePath: string | undefined;

	if (subtitle && subtitle.fileContent) {
		// 1. Adjust subtitle timestamps
		const adjustedSrtContent = adjustSrtTimestamps(subtitle.fileContent, parsedBody.data.start);

		// 2. Save the adjusted subtitle content to a temporary file
		tempSrtFilePath = path.join(ASSETS_CLIPS_DIR, `${clipId}.srt`);
		await fs.writeFile(tempSrtFilePath, adjustedSrtContent);

		// 3. Add the subtitles filter to ffmpeg
		// The `subtitles` filter expects a file path.
		// Ensure the path is correct and accessible by ffmpeg.
		proc.videoFilters(`subtitles='${tempSrtFilePath.replace(/\\/g, '\\\\')}'`); // Escape backslashes for ffmpeg path
	}

	await new Promise<void>((resolve, reject) => {
		proc
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

// Helper function to adjust SRT timestamps
function adjustSrtTimestamps(srtContent: string, offsetInSeconds: number): string {
	const lines = srtContent.split('\n');
	const newSrtContent: string[] = [];

	for (let i = 0; i < lines.length; i++) {
		const line = lines[i];
		// SRT time format: HH:MM:SS,ms --> HH:MM:SS,ms
		const timecodeRegex = /(\d{2}):(\d{2}):(\d{2}),(\d{3}) --> (\d{2}):(\d{2}):(\d{2}),(\d{3})/;

		if (timecodeRegex.test(line)) {
			const match = line.match(timecodeRegex);
			if (match) {
				const [_, startH, startM, startS, startMs, endH, endM, endS, endMs] = match.map(Number);

				const startTimeInMs = (startH * 3600 + startM * 60 + startS) * 1000 + startMs;
				const endTimeInMs = (endH * 3600 + endM * 60 + endS) * 1000 + endMs;

				const newStartTimeInMs = Math.max(0, startTimeInMs - offsetInSeconds * 1000);
				const newEndTimeInMs = Math.max(0, endTimeInMs - offsetInSeconds * 1000);

				const formatTime = (ms: number) => {
					const totalSeconds = Math.floor(ms / 1000);
					const hours = Math.floor(totalSeconds / 3600);
					const minutes = Math.floor((totalSeconds % 3600) / 60);
					const seconds = totalSeconds % 60;
					const milliseconds = ms % 1000;
					return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')},${String(milliseconds).padStart(3, '0')}`;
				};

				newSrtContent.push(`${formatTime(newStartTimeInMs)} --> ${formatTime(newEndTimeInMs)}`);
			}
		} else {
			newSrtContent.push(line);
		}
	}
	return newSrtContent.join('\n');
}
