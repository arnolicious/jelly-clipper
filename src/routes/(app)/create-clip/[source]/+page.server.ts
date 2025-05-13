import { validateSetup } from '$lib/server/db/setup';
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getItemInfo, getVideoStream } from '$lib/server/jellyfin/jellyfin.svelte';
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

// If FileInfo is not in types.ts, you might need to define it, e.g.:
// type FileInfo = Stats & { name: string; extension: string };

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
type FileInfo = Stats & { name: string; extension: string };

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

	if (decodedSource.includes('/')) {
		const url = new URL(decodedSource);
		const pathname = url.pathname;
		const params = url.searchParams;
		const sourceId = pathname.split('Items/')[1].split('/')[0];
		const apiKey = params.get('api_key');
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
	let mediaItemInfo;

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
			`Starting download for ${sourceInfo.sourceId}. Total file size: ${(totalSize / 1000000).toFixed(2)} MB`
		);

		const response = await getVideoStream(
			jellyfinAddress,
			user.jellyfinAccessToken,
			sourceInfo.sourceId
		);

		// Assuming getVideoStream throws on HTTP errors or response.data is correctly a stream
		const responseStream = response.data as unknown as NodeJS.ReadableStream;
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

			fileStream.on('finish', () => {
				try {
					const finalFileStats = statSync(filePath);
					console.log(`Download completed successfully for ${sourceInfo.sourceId}.`);
					downloadProgressEventEmitter.emit(DOWNLOAD_EVENTS.END);
					resolve({ name: sourceInfo.sourceId, extension: 'mp4', ...finalFileStats });
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
