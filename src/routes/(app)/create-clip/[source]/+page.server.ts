import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { Effect, Exit, Layer } from 'effect';
import { DownloadMediaService } from '$lib/server/services/DownloadMediaService';
import { InvalidSourceFormatError, ItemInfoService } from '$lib/server/services/ItemInfoService';
import { AuthenticatedUserLayer } from '$lib/server/services/RuntimeLayers';
import { makeAuthenticatedRuntimeLayer } from '$lib/server/services/CurrentUser';
import { AssetService } from '$lib/server/services/AssetService';
export type Track = {
	index: number;
	language: string;
	title: string;
	subtitleFile: string;
};

const itemInfoEffect = Effect.fn('itemInfoEffect')(function* (source: string) {
	const decodedSource = decodeURIComponent(source);

	if (!decodedSource.includes('/')) {
		return yield* InvalidSourceFormatError.make({ source: decodedSource });
	}
	const url = new URL(decodedSource);
	const sourceId = url.pathname.split('Items/')[1].split('/')[0];
	const audioStreamIndexParam = url.searchParams.get('audioStreamIndex');
	const subtitleStreamIndexParam = url.searchParams.get('subtitleStreamIndex');

	const assetService = yield* AssetService;
	yield* assetService.ensureAssetDirectoriesExist();

	// const downloadService = yield* DownloadMediaService;
	const itemInfoService = yield* ItemInfoService;

	const itemInfo = yield* itemInfoService.getClipInfo(sourceId);

	return {
		itemInfo,
		audioStreamIndex: audioStreamIndexParam ? Number(audioStreamIndexParam) : null,
		subtitleStreamIndex:
			subtitleStreamIndexParam && subtitleStreamIndexParam !== 'none' ? Number(subtitleStreamIndexParam) : null
	};
});

const downloadEffect = Effect.fn('downloadEffect')(function* (
	source: string,
	audioStreamIndex: number | null,
	subtitleStreamIndex: number | null
) {
	const downloadService = yield* DownloadMediaService;

	const result = yield* downloadService.downloadMedia(
		source,
		audioStreamIndex !== null ? audioStreamIndex : undefined,
		subtitleStreamIndex !== null ? subtitleStreamIndex : undefined
	);

	return result;
});

export const load: PageServerLoad = async (event) => {
	const authedLayer = Layer.provideMerge(AuthenticatedUserLayer, makeAuthenticatedRuntimeLayer(event.locals));
	const itemInfoRunnable = Effect.provide(
		itemInfoEffect(event.params.source).pipe(Effect.withLogSpan('create-clip.itemInfoEffect')),
		authedLayer
	);

	const itemInfoResult = await Effect.runPromiseExit(itemInfoRunnable);

	const itemInfo = Exit.match(itemInfoResult, {
		onSuccess: (data) => data,
		onFailure: (cause) => {
			if (cause._tag === 'Fail') {
				if (cause.error._tag === 'InvalidSourceFormatError') {
					throw error(400, cause.error.message);
				}
				throw error(500, cause.error.message);
			}
			throw error(500, 'An unexpected error occurred: ' + cause.toString());
		}
	});

	const downloadProgram = downloadEffect(
		itemInfo.itemInfo.info.Id,
		itemInfo.audioStreamIndex,
		itemInfo.subtitleStreamIndex
	).pipe(Effect.withLogSpan('create-clip.downloadEffect'));

	const downloadRunnable = Effect.provide(downloadProgram, authedLayer);

	const downloadResult = Effect.runPromiseExit(downloadRunnable).then((exit) => {
		if (exit._tag === 'Success') {
			return exit.value;
		} else {
			if (exit.cause._tag === 'Fail') {
				return { errorMessage: `${exit.cause.error._tag}: ${exit.cause.error.message}` };
			}
			return { errorMessage: `An unexpected error occurred: ${exit.cause.toString()}` };
		}
	});

	return {
		itemInfo: itemInfo.itemInfo.info,
		download: downloadResult
	};
};
