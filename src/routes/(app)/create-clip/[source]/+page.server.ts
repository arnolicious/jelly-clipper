import { validateSetup } from '$lib/server/db/setup';
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getDownloadStreamUrl, getItemInfo } from '$lib/server/jellyfin/jellyfin.svelte';
import type { SourceInfo } from './types'; // Assuming FileInfo is defined in types.ts or here
import { createWriteStream, Stats, statSync } from 'node:fs';
import { unlink } from 'node:fs/promises';
import { ASSETS_ORIGINALS_DIR } from '$lib/constants';
import { ensureStaticFoldersExist } from '$lib/server/server-utils';
import {
	DOWNLOAD_EVENTS,
	downloadProgressEventEmitter,
	type DownloadProgressTypes
} from './progress-event';
import path from 'node:path';
import type { BaseItemDto } from '@jellyfin/sdk/lib/generated-client/models';
import { Readable } from 'node:stream';
import type { ReadableStream } from 'node:stream/web';

// Throttled logging utility
function emitThrottledProgressEvents(intervalMs = 500) {
	let lastLogTime = 0;

	return (data: DownloadProgressTypes['PROGRESS_UPDATE']) => {
		const now = Date.now();
		if (now - lastLogTime >= intervalMs) {
			// console.log(data); // Logging progress data can be verbose
			// Emit event to trigger SSE update in /api/download-progress
			downloadProgressEventEmitter.emit(DOWNLOAD_EVENTS.PROGRESS_UPDATE, data);

			lastLogTime = now;
		}
	};
}

export type Track = {
	index: number;
	language?: string;
	title?: string;
};

type FileInfo = Stats & {
	name: string;
	extension: string;
	audioTracks?: Track[];
	subtitleTracks?: Track[];
};

export const load: PageServerLoad = async (event) => {
	const validatedSetup = await validateSetup();
	const user = event.locals.user;
	if (!validatedSetup.setupIsFinished || !user) {
		return error(400, 'Jelly-Clipper is not setup yet');
	}
	const jellyfinAddress = validatedSetup.serverAddress;
	const decodedSource = decodeURIComponent(event.params.source);
	ensureStaticFoldersExist(); // Ensure this is robust or wrapped if it can throw

	let sourceInfo: SourceInfo;

	// Extract track parameters from URLParams
	let videoStreamIndex: null | number = null;
	let audioStreamIndex: null | number = null;
	let subtitleStreamIndex: null | number = null;

	if (decodedSource.includes('/')) {
		const url = new URL(decodedSource);
		const pathname = url.pathname;
		const params = url.searchParams;
		const sourceId = pathname.split('Items/')[1].split('/')[0];
		const apiKey = params.get('api_key');

		const videoStreamIndexParam = params.get('videoStreamIndex');
		const audioStreamIndexParam = params.get('audioStreamIndex');
		const subtitleStreamIndexParam = params.get('subtitleStreamIndex');

		if (videoStreamIndexParam) {
			videoStreamIndex = Number(videoStreamIndexParam);
		}

		if (audioStreamIndexParam) {
			audioStreamIndex = Number(audioStreamIndexParam);
		}
		if (subtitleStreamIndexParam && subtitleStreamIndexParam !== 'none') {
			subtitleStreamIndex = Number(subtitleStreamIndexParam);
		}

		if (!apiKey) {
			return error(400, 'Source is not a URL');
		}
		sourceInfo = {
			sourceId,
			apiKey
		};
	} else {
		// Consider if this case should throw an error earlier or be handled differently
		return error(400, 'Invalid source format: Expected a URL path.');
	}

	const filePath = path.join(ASSETS_ORIGINALS_DIR, `${sourceInfo.sourceId}.mp4`);
	// const transcodedFilePath = path.join(
	// 	ASSETS_ORIGINALS_DIR,
	// 	`transcoded-${sourceInfo.sourceId}.mp4`
	// );
	let mediaItemInfo: BaseItemDto | null = null;

	try {
		mediaItemInfo = await getItemInfo(
			jellyfinAddress,
			user.jellyfinAccessToken,
			sourceInfo.sourceId
		);
	} catch (infoErr) {
		console.error(`Failed to get item info for ${sourceInfo.sourceId}:`, infoErr);
		// No download event emitter here as download hasn't started or is for a different system part
		throw error(
			500,
			`Failed to retrieve media information from Jellyfin: ${(infoErr as Error).message}`
		);
	}

	try {
		const existingFileStats = statSync(filePath);

		// Check if file size matches the expected size
		if (existingFileStats.size === mediaItemInfo.MediaSources?.[0].Size) {
			// Get track info
			return {
				user,
				serverAddress: jellyfinAddress,
				sourceInfo: mediaItemInfo, // Return the fetched info
				fileInfo: {
					name: sourceInfo.sourceId,
					extension: 'mp4',
					...existingFileStats
				}
			};
		} else {
			console.log(
				`File size mismatch for ${sourceInfo.sourceId}. Expected: ${mediaItemInfo.MediaSources?.[0].Size}, Found: ${existingFileStats.size}`
			);
			// Clean up the existing file if sizes don't match
			await unlink(filePath);
			console.log(`Removed mismatched file: ${filePath}`);
		}
	} catch (_e) {
		// File does not exist, proceed to download.
	}

	// Download logic starts here
	try {
		const totalSize = mediaItemInfo.MediaSources?.[0].Size ?? 0;
		downloadProgressEventEmitter.emit(DOWNLOAD_EVENTS.START, {
			totalSizeBytes: totalSize
		} satisfies DownloadProgressTypes['START']);
		console.log(
			`Starting download for ${sourceInfo.sourceId}. Total file size: ${(totalSize / 1000000).toFixed(2)} MB
			Video Stream Index: ${videoStreamIndex}
			Audio Stream Index: ${audioStreamIndex}
			Subtitle Stream Index: ${subtitleStreamIndex}`
		);
		const { mediaSource, sessionId, url } = await getDownloadStreamUrl({
			userId: user.jellyfinUserId,
			serverAddress: jellyfinAddress,
			accessToken: user.jellyfinAccessToken,
			itemId: sourceInfo.sourceId,
			mediaSourceId: mediaItemInfo.MediaSources?.[0].Id ?? undefined,
			audioStreamIndex,
			subtitleStreamIndex
		});

		console.log(`Download URL: ${url}`);

		// Download the url as a stream
		const response = await fetch(url);

		const responseStream = Readable.fromWeb(response.body as ReadableStream);
		const fileStream = createWriteStream(filePath);
		let downloadedSize = 0;
		const progressEmitter = emitThrottledProgressEvents(1000); // Emit progress more frequently if desired

		const downloadPromise = new Promise<FileInfo>((resolve, reject) => {
			responseStream.on('data', (chunk) => {
				downloadedSize += chunk.length;
				const progress = totalSize > 0 ? Math.round((downloadedSize / totalSize) * 100) : 0;

				progressEmitter({
					percentage: progress,
					totalSizeBytes: totalSize,
					downloadedBytes: downloadedSize
				});
			});

			responseStream.pipe(fileStream);

			fileStream.on('finish', async () => {
				try {
					const finalFileStats = statSync(filePath);
					console.log(`Download completed successfully for ${sourceInfo.sourceId}.`);

					// // Get Audio track and Subtitle track info from file with ffmpeg
					// const data = await ffprobe(filePath);
					// const audioTracks = data.streams
					// 	.filter((stream) => stream.codec_type === 'audio')
					// 	.map((stream) => ({
					// 		index: stream.index,
					// 		language: stream.tags?.language,
					// 		title: stream.tags?.title
					// 	}));
					// const subtitleTracks = data.streams
					// 	.filter((stream) => stream.codec_type === 'subtitle')
					// 	.map((stream) => ({
					// 		index: stream.index,
					// 		language: stream.tags?.language,
					// 		title: stream.tags?.title
					// 	}));

					// console.log('Audio tracks:', audioTracks);
					// console.log('Subtitle tracks:', subtitleTracks);

					// // Use ffmpeg to transcode the video to a widely compatible format
					// ffmpeg(filePath)
					// 	.outputOptions('-c:v', 'libx264') // Use H.264 codec for video
					// 	.outputOptions('-c:a', 'aac') // Use AAC codec for audio
					// 	.outputOptions('-movflags', 'faststart') // Optimize for web streaming
					// 	.save(transcodedFilePath)
					// 	.on('start', (commandLine) => {
					// 		console.log('[Transcode] Ffmpeg command: ' + commandLine);
					// 	})
					// 	.on('error', (err) => {
					// 		console.error('An error occurred during transcoding:', err.message);
					// 		downloadProgressEventEmitter.emit(DOWNLOAD_EVENTS.ERROR, {
					// 			message: err.message || 'Transcoding error'
					// 		});
					// 		reject(err);
					// 	})
					// 	.on('end', () => {
					// 		console.log('Transcoding finished successfully.');
					// 		// Delete the original file after transcoding
					// 		unlinkSync(filePath);
					// 		// Rename the transcoded file to the original file name
					// 		renameSync(transcodedFilePath, filePath);

					// 		downloadProgressEventEmitter.emit(DOWNLOAD_EVENTS.END);
					resolve({
						name: sourceInfo.sourceId,
						extension: 'mp4',
						...finalFileStats
					});
					// });
				} catch (statErr) {
					console.error(`Error stating file ${filePath} after download:`, statErr);
					downloadProgressEventEmitter.emit(DOWNLOAD_EVENTS.ERROR, {
						message: (statErr as Error).message || 'Error stating file post-download'
					});
					reject(statErr);
				}
			});

			fileStream.on('error', (err) => {
				console.error(`File stream error for ${filePath}:`, err);
				downloadProgressEventEmitter.emit(DOWNLOAD_EVENTS.ERROR, {
					message: err.message || 'File stream error'
				});
				reject(err);
			});

			responseStream.on('error', (err) => {
				console.error(`Response stream error during download for ${sourceInfo.sourceId}:`, err);
				downloadProgressEventEmitter.emit(DOWNLOAD_EVENTS.ERROR, {
					message: err.message || 'Response stream error'
				});
				reject(err);
			});
		});

		return {
			user,
			serverAddress: jellyfinAddress,
			sourceInfo: mediaItemInfo,
			fileInfo: downloadPromise // SvelteKit will await this promise
		};
	} catch (downloadErr) {
		console.error(`Error during download process for ${sourceInfo.sourceId}:`, downloadErr);
		downloadProgressEventEmitter.emit(DOWNLOAD_EVENTS.ERROR, {
			message: (downloadErr as Error).message || 'Download process failed'
		});

		// Attempt to clean up partially downloaded file
		try {
			await unlink(filePath);
			console.log(`Cleaned up partially downloaded file: ${filePath}`);
		} catch (cleanupErr) {
			// Log if cleanup fails but don't let it mask the original download error
			console.error(`Failed to clean up partial file ${filePath}:`, cleanupErr);
		}

		throw error(500, `Failed to download media: ${(downloadErr as Error).message}`);
	}
};
