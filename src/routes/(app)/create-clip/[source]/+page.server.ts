import { validateSetup } from '$lib/server/db/setup';
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getItemInfo, getVideoStream } from '$lib/server/jellyfin/jellyfin.svelte';
import type { SourceInfo } from './types';
import { createWriteStream, Stats, statSync } from 'node:fs';
import { ASSETS_ORIGINALS_DIR } from '$lib/constants';
import { ensureStaticFoldersExist } from '$lib/server/server-utils';
import {
	DOWNLOAD_EVENTS,
	downloadProgressEventEmitter,
	type DownloadProgressTypes
} from './progress-event';

// Throttled logging utility
function emitThrottledProgressEvents(intervalMs = 500) {
	let lastLogTime = 0;

	return (data: DownloadProgressTypes['PROGRESS_UPDATE']) => {
		const now = Date.now();
		if (now - lastLogTime >= intervalMs) {
			console.log(data);

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
	let sourceInfo: SourceInfo;
	const decoded = decodeURIComponent(event.params.source);
	ensureStaticFoldersExist();

	if (decoded.includes('/')) {
		const url = new URL(decoded);
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
		return error(400, 'Source is not a URL');
	}

	const sourceInfoPromise = getItemInfo(
		jellyfinAddress,
		user.jellyfinAccessToken,
		sourceInfo.sourceId
	);

	try {
		const fileInfo = statSync(`${ASSETS_ORIGINALS_DIR}/${sourceInfo.sourceId}.mp4`);
		return {
			user,
			serverAddress: jellyfinAddress,
			sourceInfo: sourceInfoPromise,
			fileInfo: {
				name: sourceInfo.sourceId,
				extension: 'mp4',
				...fileInfo
			}
		};
	} catch (_e) {
		// File does not exist
	}

	// Download the media file with throttled progress tracking
	const response = await getVideoStream(
		jellyfinAddress,
		user.jellyfinAccessToken,
		sourceInfo.sourceId
	);

	const awaitedInfo = await sourceInfoPromise;
	const totalSize = awaitedInfo.MediaSources?.[0].Size ?? 0;
	downloadProgressEventEmitter.emit(DOWNLOAD_EVENTS.START, {
		totalSizeBytes: totalSize
	} satisfies DownloadProgressTypes['START']);
	console.log(`Starting download. Total file size: ${(totalSize / 1000000).toFixed(2)} MB`);

	let downloadedSize = 0;
	const fileStream = createWriteStream(`${ASSETS_ORIGINALS_DIR}/${sourceInfo.sourceId}.mp4`);
	const responseStream = response.data as NodeJS.ReadableStream;

	// Create a throttled logger that logs every 5 seconds
	const progressEmitter = emitThrottledProgressEvents(5000);

	const fileInfoPromise = new Promise<FileInfo>((resolve, reject) => {
		responseStream.on('data', (chunk) => {
			downloadedSize += chunk.length;
			const progress = totalSize > 0 ? Math.round((downloadedSize / totalSize) * 100) : 0;

			// Use throttled logging instead of console.log
			// throttledLog(
			// 	`Download Progress: ${progress}% (${(downloadedSize / 1000000).toFixed(2)}/${(totalSize / 1000000).toFixed(2)} MB)`
			// );
			progressEmitter({
				percentage: progress,
				totalSizeBytes: totalSize,
				downloadedBytes: downloadedSize
			});
		});

		responseStream.pipe(fileStream);

		fileStream.on('finish', () => {
			try {
				const finalFileInfo: FileInfo = {
					name: sourceInfo.sourceId,
					extension: 'mp4',
					...statSync(`${ASSETS_ORIGINALS_DIR}/${sourceInfo.sourceId}.mp4`)
				};
				console.log('Download completed successfully.');
				downloadProgressEventEmitter.emit(DOWNLOAD_EVENTS.END);
				resolve(finalFileInfo);
			} catch (err) {
				reject(err);
			}
		});

		fileStream.on('error', reject);
		responseStream.on('error', reject);
	});

	return {
		user,
		serverAddress: jellyfinAddress,
		fileInfo: fileInfoPromise,
		sourceInfo: sourceInfoPromise
	};
};
