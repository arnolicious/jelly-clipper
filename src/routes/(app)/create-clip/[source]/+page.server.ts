import type { PageServerLoad } from './$types';
import { Effect, pipe, Schema } from 'effect';
import { DownloadMediaService } from '$lib/server/services/DownloadMediaService';
import { makeAuthenticatedRuntimeLayer } from '$lib/server/services/UserSession';
import { AssetService } from '$lib/server/services/AssetService';
import { runLoader } from '$lib/server/load-utils';
import { BadRequest, OkLoader, ServerError } from '$lib/server/responses';
import { DownloadManager } from '$lib/server/services/DownloadManagerService';
import { InvalidSourceFormatError, JellyfinApi } from '$lib/server/services/JellyfinService';
import { JellyfinItemIdSchema } from '$lib/shared/JellyfinId';
import { LibraryService } from '$lib/server/services/LibraryService';

export type Track = {
	index: number;
	language: string;
	title: string;
	subtitleFile: string;
};

const downloadEffect = Effect.fn('downloadEffect')(function* (source: string, audioStreamIndex: number | null) {
	yield* Effect.logDebug(`Starting downloadEffect for item ${source}`);
	const downloadService = yield* DownloadMediaService;

	const result = yield* downloadService.downloadMedia(source, audioStreamIndex !== null ? audioStreamIndex : undefined);

	return result;
});

export const load: PageServerLoad = async (event) =>
	runLoader(
		Effect.gen(function* () {
			const fiberManager = yield* DownloadManager;
			const api = yield* JellyfinApi;
			const assetService = yield* AssetService;
			const libraryService = yield* LibraryService;

			const decodedSource = decodeURIComponent(event.params.source);

			let itemId: string;
			let audioStreamIndex: number | null = null;

			if (!decodedSource.includes('/')) {
				const itemIdParsed = yield* Schema.decodeUnknown(JellyfinItemIdSchema)(decodedSource).pipe(
					Effect.catchTag('ParseError', () => Effect.fail(new InvalidSourceFormatError({ source: decodedSource })))
				);
				itemId = itemIdParsed;
				audioStreamIndex = Number(event.url.searchParams.get('audioStreamIndex'));
			} else {
				const url = new URL(decodedSource);
				const pathname = url.pathname;
				itemId = pathname.split('Items/')[1].split('/')[0];
				audioStreamIndex = Number(url.searchParams.get('audioStreamIndex'));
			}

			// Ensure asset directories exist
			yield* assetService.ensureAssetDirectoriesExist();

			const itemInfo = yield* api.getClipInfo(itemId);

			/**
			 * Refactor:
			 * 1. Check for local media file
			 * 2. Then check file video codec/container
			 * 3. If both pass, no download needed
			 * 4. If the video is incompatible, we need to transcode it
			 * 5. If no local file, we need to download it
			 *
			 * The progress SSE notifications need to be expanded and generalized to handle transcoding as well
			 */

			// Check if we can find the original file on disk
			yield* libraryService.checkForLocalMediaFile(itemInfo.info).pipe(Effect.catchAll(() => Effect.succeed(null)));

			// Don't yield* here, we want to run the download and pass the promise back to the client
			const downloadProgram = pipe(
				downloadEffect(itemInfo.info.Id, audioStreamIndex),
				Effect.withLogSpan('create-clip.downloadEffect'),
				Effect.provide(makeAuthenticatedRuntimeLayer(event.locals))
			);

			yield* Effect.logDebug(`Forking download fiber for item ${itemInfo.info.Id}`);
			const downloadFiber = yield* fiberManager.startDownloadFiber(itemInfo.info.Id, downloadProgram);
			yield* Effect.logDebug(`Returning download promise for item ${itemInfo.info.Id}`, downloadFiber.id());
			const downloadResult = Effect.runPromiseExit(downloadFiber).then((exit) => {
				if (exit._tag === 'Success') {
					return exit.value;
				} else {
					if (exit.cause._tag === 'Fail') {
						return { errorMessage: `${exit.cause.error._tag}: ${exit.cause.error.message}` };
					}
					return { errorMessage: `An unexpected error occurred: ${exit.cause.toString()}` };
				}
			});

			return new OkLoader({ data: { itemInfo: itemInfo.info, download: downloadResult } });
		}).pipe(
			Effect.provide(makeAuthenticatedRuntimeLayer(event.locals)),
			Effect.catchTag('BadArgument', (error) => Effect.fail(new BadRequest({ message: error.message }))),
			Effect.catchTag('InvalidSourceFormatError', (error) => Effect.fail(new BadRequest({ message: error.message }))),
			Effect.catchTag('SystemError', (error) => Effect.fail(new ServerError({ message: error.message }))),
			Effect.catchTag('DownloadCurrentlyInProgressError', (error) =>
				Effect.fail(new ServerError({ message: error.message }))
			)
		),
		{ span: `/create-clip/[source]`, spanOptions: { attributes: { source: event.params.source } } }
	);
