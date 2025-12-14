import { Context, Effect, Layer, Schema, Stream } from 'effect';
import { JellyfinApi, JellyfinApiError, TrackSchema } from './JellyfinService';
import { AssetNodeLayer, AssetService, BigIntFileSize, FileInfoSchema, WriteStreamFailed } from './AssetService';
import { BadArgument, SystemError } from '@effect/platform/Error';
import { ItemInfoService, MultipleMediaSourcesError, NoAudioStreamsError, NoMediaSourceError } from './ItemInfoService';
import { FetchHttpClient, HttpClient } from '@effect/platform';
import type { DatabaseError } from './DatabaseService';
import type { NoCurrentUserError } from './CurrentUser';
import type { JellyClipperNotConfiguredError, JellyfinNotConfiguredError } from './ConfigService';
import type { ParseError } from 'effect/ParseResult';
import type { RequestError, ResponseError } from '@effect/platform/HttpClientError';
import { DOWNLOAD_EVENTS, downloadProgressEventEmitter, type DownloadProgressTypes } from '$lib/progress-event';

// const retryDownloadPolicy = Schedule.addDelay(Schedule.recurs(3), () => "2 seconds");

export class DownloadMediaService extends Context.Tag('DownloadMediaService')<
	DownloadMediaService,
	{
		downloadMedia: (
			itemId: string,
			audioStreamIndex?: number,
			subtitleStreamIndex?: number
		) => Effect.Effect<
			DownloadResult,
			| JellyfinApiError
			| JellyfinNotConfiguredError
			| JellyClipperNotConfiguredError
			| DatabaseError
			| NoCurrentUserError
			| BadArgument
			| MultipleMediaSourcesError
			| NoAudioStreamsError
			| NoMediaSourceError
			| ParseError
			| RequestError
			| ResponseError
			| SystemError
			| WriteStreamFailed
		>;
	}
>() {
	static layer = Layer.effect(
		DownloadMediaService,
		Effect.gen(function* () {
			const jellyfinApi = yield* JellyfinApi;
			const assetService = yield* AssetService;
			const itemInfoService = yield* ItemInfoService;
			const http = yield* HttpClient.HttpClient;

			const downloadMedia = Effect.fn('DownloadMediaService.downloadMedia')(function* (
				itemId: string,
				audioStreamIndex?: number,
				subtitleStreamIndex?: number
			) {
				yield* Effect.logDebug(`Starting download for item ${itemId}`);
				const existingFile = yield* assetService
					.getFileInfoForItem(itemId)
					.pipe(Effect.catchTag('AssetNotOnDisk', () => Effect.succeed(null)));

				const clipInfo = yield* itemInfoService.getClipInfo(itemId);
				const mediaSource = clipInfo.info.MediaSources[0];
				const subtitleTracks = yield* jellyfinApi.getSubtitleTracks(itemId, mediaSource);

				if (existingFile) {
					yield* Effect.logDebug(`Found existing file for item ${itemId}, verifying integrity`);
					let checksPassed = true;
					const sizeDifference = BigInt(mediaSource.Size) - existingFile.size;
					// Allow the size to differ by up to 100KB
					if (sizeDifference > 102400n || sizeDifference < -102400n) {
						yield* Effect.logWarning(
							`File size mismatch for item ${itemId}: expected ${mediaSource.Size}, got ${existingFile.size}. Size difference: ${sizeDifference}`
						);
						checksPassed = false;
					}

					if (checksPassed) {
						yield* Effect.logDebug(`Existing file for item ${itemId} passed integrity checks, skipping download`);
						return { fileInfo: existingFile, subtitleTracks };
					} // else proceed to re-download
				}

				yield* Effect.logDebug(`Downloading media for item ${itemId}`);
				// Download file
				const downloadUrl = yield* jellyfinApi.getDownloadStreamUrl({
					itemId,
					mediaSourceId: mediaSource.Id,
					audioStreamIndex,
					subtitleStreamIndex
				});

				downloadProgressEventEmitter.emit(DOWNLOAD_EVENTS.START, {
					totalSizeBytes: mediaSource.Size
				} satisfies DownloadProgressTypes['START']);

				yield* Effect.logDebug(`Obtained download URL for item ${itemId}`);

				const downloadStream = yield* http
					.get(downloadUrl)
					.pipe(Effect.map((res) => res.stream.pipe(Stream.catchAll(() => Stream.fail(new DownloadFailedError())))));

				let downloadedSize = 0;

				const downloadListener = (chunk: Uint8Array) =>
					Effect.gen(function* () {
						yield* Effect.logDebug(`Downloaded chunk of size ${chunk.byteLength} for item ${itemId}`);
						downloadedSize += chunk.byteLength;

						if (
							Math.floor(((downloadedSize - chunk.byteLength) / mediaSource.Size) * 10) <
							Math.floor((downloadedSize / mediaSource.Size) * 10)
						) {
							downloadProgressEventEmitter.emit(DOWNLOAD_EVENTS.PROGRESS_UPDATE, {
								percentage: Math.round(100 * (downloadedSize / mediaSource.Size) * 100) / 100,
								totalSizeBytes: mediaSource.Size,
								downloadedBytes: downloadedSize
							} satisfies DownloadProgressTypes['PROGRESS_UPDATE']);
						}
					});

				const handledStream = downloadStream.pipe(
					// Stream.retry(retryDownloadPolicy),
					Stream.tap(downloadListener),
					Stream.catchAll(() => Effect.die('Failed to download media after multiple attempts'))
				);

				const fileInfo = yield* assetService.writeFileStreamForItem(itemId, handledStream);

				downloadProgressEventEmitter.emit(DOWNLOAD_EVENTS.END, {} satisfies DownloadProgressTypes['END']);

				// Eventually return downloaded file info & subtitles
				yield* Effect.logDebug(`Completed download for item ${itemId}`);
				return {
					fileInfo,
					subtitleTracks
				};
			});

			return DownloadMediaService.of({ downloadMedia });
		})
	);
}

export const DownloadMediaServiceLive = DownloadMediaService.layer.pipe(
	Layer.provide(FetchHttpClient.layer),
	Layer.provide(AssetNodeLayer)
);

const DownloadResult = Schema.Struct({
	fileInfo: FileInfoSchema,
	subtitleTracks: Schema.Array(TrackSchema)
});

type DownloadResult = typeof DownloadResult.Type;

class DownloadFailedError extends Schema.TaggedError<DownloadFailedError>()('DownloadFailedError', {}) {
	constructor() {
		super();
		this.message = 'Failed to download media from Jellyfin.';
	}
}
