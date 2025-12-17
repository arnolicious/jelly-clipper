import type { PageServerLoad } from './$types';
import { Effect, pipe } from 'effect';
import { DownloadMediaService } from '$lib/server/services/DownloadMediaService';
import { makeAuthenticatedRuntimeLayer } from '$lib/server/services/UserSession';
import { AssetService } from '$lib/server/services/AssetService';
import { runLoader } from '$lib/server/load-utils';
import { BadRequest, OkLoader, ServerError } from '$lib/server/responses';
import { FiberManager } from '$lib/server/services/FiberManagerService';
import { InvalidSourceFormatError, JellyfinApi } from '$lib/server/services/JellyfinService';
export type Track = {
	index: number;
	language: string;
	title: string;
	subtitleFile: string;
};

const downloadEffect = Effect.fn('downloadEffect')(function* (
	source: string,
	audioStreamIndex: number | null,
	subtitleStreamIndex: number | null
) {
	yield* Effect.logInfo(`Starting downloadEffect for item ${source}`);
	const downloadService = yield* DownloadMediaService;

	const result = yield* downloadService.downloadMedia(
		source,
		audioStreamIndex !== null ? audioStreamIndex : undefined,
		subtitleStreamIndex !== null ? subtitleStreamIndex : undefined
	);

	return result;
});

export const load: PageServerLoad = async (event) =>
	runLoader(
		Effect.gen(function* () {
			const fiberManager = yield* FiberManager;

			const decodedSource = decodeURIComponent(event.params.source);

			if (!decodedSource.includes('/')) {
				return yield* InvalidSourceFormatError.make({ source: decodedSource });
			}
			const url = new URL(decodedSource);
			const sourceId = url.pathname.split('Items/')[1].split('/')[0];
			const audioStreamIndex = Number(url.searchParams.get('audioStreamIndex'));
			const subtitleStreamIndex = Number(url.searchParams.get('subtitleStreamIndex'));

			const fiber = yield* fiberManager
				.getDownloadFiber(sourceId)
				.pipe(Effect.catchTag('FiberNotFound', () => Effect.succeed(null)));
			if (fiber) {
				// If a fiber is found, it means a download is already in progress
				yield* Effect.fail(new BadRequest({ message: 'A download is already in progress for this item.' }));
			}

			const assetService = yield* AssetService;
			yield* assetService.ensureAssetDirectoriesExist();

			const api = yield* JellyfinApi;

			const itemInfo = yield* api.getClipInfo(sourceId);

			// Don't yield* here, we want to run the download and pass the promise back to the client
			const downloadProgram = pipe(
				downloadEffect(itemInfo.info.Id, audioStreamIndex, subtitleStreamIndex),
				Effect.withLogSpan('create-clip.downloadEffect'),
				Effect.provide(makeAuthenticatedRuntimeLayer(event.locals))
			);

			const downloadFiber = yield* Effect.forkDaemon(downloadProgram);
			yield* fiberManager.registerDownloadFiber(itemInfo.info.Id, downloadFiber);

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
