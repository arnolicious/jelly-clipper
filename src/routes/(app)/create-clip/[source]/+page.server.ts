import type { PageServerLoad } from './$types';
import { Effect, pipe } from 'effect';
import { DownloadMediaService } from '$lib/server/services/DownloadMediaService';
import { BigIntFileSize, type FileInfo } from '$lib/shared/FileSizes';
import { makeAuthenticatedRuntimeLayer } from '$lib/server/services/UserSession';
import { AssetService } from '$lib/server/services/AssetService';
import { runLoader } from '$lib/server/load-utils';
import { BadRequest, OkLoader, ServerError } from '$lib/server/responses';
import { DownloadManager } from '$lib/server/services/DownloadManagerService';
import { ClipMediaPreparationService, type DownloadRequest } from '$lib/server/services/ClipMediaPreparationService';
import { parseClipSource } from '$lib/server/services/ClipSource';

const downloadEffect = Effect.fn('downloadEffect')(function* (request: DownloadRequest) {
	yield* Effect.logDebug(`Starting downloadEffect for item ${request.itemId}`);
	const downloadService = yield* DownloadMediaService;
	const fileInfo = yield* downloadService.downloadMedia(request);
	return { fileInfo };
});

export const load: PageServerLoad = (event) =>
	runLoader(
		Effect.gen(function* () {
			const fiberManager = yield* DownloadManager;
			const assetService = yield* AssetService;
			const preparationService = yield* ClipMediaPreparationService;
			const itemId = yield* parseClipSource(event.params.source);
			const decodedSource = decodeURIComponent(event.params.source);
			const sourceUrl = decodedSource.includes('/') ? new URL(decodedSource) : event.url;
			const audioStreamIndexParam = sourceUrl.searchParams.get('audioStreamIndex');
			const audioStreamIndex = audioStreamIndexParam === null ? undefined : Number(audioStreamIndexParam);

			yield* assetService.ensureAssetDirectoriesExist();
			const preparedMedia = yield* preparationService.prepareMedia(itemId, audioStreamIndex);

			let downloadResult: Promise<{ fileInfo: FileInfo } | { errorMessage: string }>;
			if (preparedMedia.source === 'local') {
				downloadResult = Promise.resolve({
					fileInfo: { name: preparedMedia.itemInfo.Id, extension: 'mp4', size: BigIntFileSize.make(0n) }
				});
			} else {
				const downloadProgram = pipe(
					downloadEffect(preparedMedia.downloadRequest),
					Effect.withLogSpan('create-clip.downloadEffect'),
					Effect.provide(makeAuthenticatedRuntimeLayer(event.locals))
				);

				yield* Effect.logDebug(`Forking download fiber for item ${preparedMedia.itemInfo.Id}`);
				const downloadFiber = yield* fiberManager.startDownloadFiber(preparedMedia.itemInfo.Id, downloadProgram);
				yield* Effect.logDebug(`Returning download promise for item ${preparedMedia.itemInfo.Id}`, downloadFiber.id());
				downloadResult = Effect.runPromiseExit(downloadFiber).then((exit) => {
					if (exit._tag === 'Success') {
						return exit.value;
					}
					if (exit.cause._tag === 'Fail') {
						return { errorMessage: `${exit.cause.error._tag}: ${exit.cause.error.message}` };
					}
					return { errorMessage: `An unexpected error occurred: ${exit.cause.toString()}` };
				});
			}

			return new OkLoader({
				data: {
					itemInfo: preparedMedia.itemInfo,
					download: downloadResult,
					subtitleTracks: preparedMedia.subtitleTracks,
					subtitleWarning: preparedMedia.subtitleWarning,
					formatInfo: preparedMedia.formatInfo,
					previewUrl: preparedMedia.previewUrl
				}
			});
		}).pipe(
			Effect.provide(makeAuthenticatedRuntimeLayer(event.locals)),
			Effect.catchTags({
				BadArgument: (error) => Effect.fail(new BadRequest({ message: error.message })),
				InvalidClipSourceError: () => Effect.fail(new BadRequest({ message: 'Invalid clip source' })),
				ClipMediaPreparationError: (error) => Effect.fail(new ServerError({ message: error.message })),
				SystemError: (error) => Effect.fail(new ServerError({ message: error.message })),
				DownloadCurrentlyInProgressError: (error) => Effect.fail(new ServerError({ message: error.message }))
			})
		),
		{ span: `/create-clip/[source]`, spanOptions: { attributes: { source: event.params.source } } }
	);
