import { Context, DateTime, Effect, Layer, Schema, Stream } from 'effect';
import { JellyfinApi, JellyfinApiError } from './JellyfinService';
import { AssetService, WriteStreamFailed } from './AssetService';
import { BadArgument, SystemError } from '@effect/platform/Error';
import { HttpClient } from '@effect/platform';
import type { DatabaseError } from './DatabaseService';
import type { NoCurrentUserError } from './UserSession';
import type { JellyClipperNotConfiguredError } from './ConfigService';
import type { ParseError } from 'effect/ParseResult';
import type { RequestError, ResponseError } from '@effect/platform/HttpClientError';
import { DownloadManager } from './DownloadManagerService';
import { DownloadProgressEvent } from '$lib/shared/DownloadProgressEvent';
import { IntFileSize, type FileInfo } from '$lib/shared/FileSizes';
import type { DownloadRequest } from './ClipMediaPreparationService';

const DOWNLOAD_EVENT_EMISSION_RATE_MS = 500;

export class DownloadMediaService extends Context.Tag('DownloadMediaService')<
	DownloadMediaService,
	{
		downloadMedia: (
			request: DownloadRequest
		) => Effect.Effect<
			FileInfo,
			| JellyfinApiError
			| JellyClipperNotConfiguredError
			| DatabaseError
			| NoCurrentUserError
			| BadArgument
			| ParseError
			| RequestError
			| ResponseError
			| SystemError
			| WriteStreamFailed
		>;
	}
>() {
	static readonly Default = Layer.effect(
		DownloadMediaService,
		Effect.gen(function* () {
			const jellyfinApi = yield* JellyfinApi;
			const assetService = yield* AssetService;
			const http = yield* HttpClient.HttpClient;
			const downloadManager = yield* DownloadManager;

			const downloadMedia = Effect.fn('DownloadMediaService.downloadMedia')(function* (request: DownloadRequest) {
				const { itemId, mediaSourceId, expectedSize, audioStreamIndex } = request;
				yield* Effect.logDebug(`Starting download for item ${itemId}`);
				const existingFile = yield* assetService
					.getFileInfoForItem(itemId)
					.pipe(Effect.catchTag('AssetNotOnDisk', () => Effect.succeed(null)));

				if (existingFile) {
					yield* Effect.logDebug(`Found existing file for item ${itemId}, verifying integrity`);
					let checksPassed = true;
					const sizeDifference = BigInt(expectedSize) - existingFile.size;

					// TODO: This doesn't work for files that have been transcoded on-the-fly
					// as their size will differ from the original media source size.
					// A better approach would be to store and compare checksums, if available ?
					// Allow the size to differ by up to 100KB
					if (sizeDifference > 102400n) {
						yield* Effect.logWarning(
							`File size mismatch for item ${itemId}: expected ${expectedSize}, got ${existingFile.size}. Size difference: ${sizeDifference}`
						);
						checksPassed = false;
					}

					if (checksPassed) {
						yield* Effect.logDebug(`Existing file for item ${itemId} passed integrity checks, skipping download`);
						return existingFile;
					} // else proceed to re-download
				}

				yield* Effect.logDebug(`Downloading media for item ${itemId}`);
				// Download file
				const downloadUrl = yield* jellyfinApi.getDownloadStreamUrl({
					itemId,
					mediaSourceId,
					audioStreamIndex
				});

				yield* downloadManager.publishDownloadEvent(
					DownloadProgressEvent.make({
						itemId,
						downloadedBytes: IntFileSize.make(0),
						totalSizeBytes: IntFileSize.make(expectedSize),
						progressPercentage: 0
					})
				);

				yield* Effect.logDebug(`Obtained download URL for item ${itemId}`);

				const downloadStream = yield* http
					.get(downloadUrl)
					.pipe(Effect.map((res) => res.stream.pipe(Stream.catchAll(() => Stream.fail(new DownloadFailedError())))));

				let downloadedSize = 0;

				let lastEmissionTime = yield* DateTime.now;

				const downloadListener = (chunk: Uint8Array) =>
					Effect.gen(function* () {
						downloadedSize += chunk.byteLength;

						const now = yield* DateTime.now;
						// Emit progress update events at most every DOWNLOAD_EVENT_EMISSION_RATE milliseconds
						if (DateTime.distance(lastEmissionTime, now) >= DOWNLOAD_EVENT_EMISSION_RATE_MS) {
							yield* Effect.logDebug(`Downloaded chunk of size ${chunk.byteLength} for item ${itemId}`);
							yield* downloadManager.publishDownloadEvent(
								DownloadProgressEvent.make({
									itemId,
									downloadedBytes: IntFileSize.make(downloadedSize),
									totalSizeBytes: IntFileSize.make(expectedSize),
									progressPercentage: Math.round(100 * (downloadedSize / expectedSize) * 100) / 100
								})
							);
							lastEmissionTime = now;
						}
					});

				const handledStream = downloadStream.pipe(
					// Stream.retry(retryDownloadPolicy),
					Stream.tap(downloadListener),
					Stream.catchAll(() => Effect.die('Failed to download media after multiple attempts'))
				);

				const fileInfo = yield* assetService.writeFileStreamForItem(itemId, handledStream);

				yield* downloadManager.publishDownloadEvent(
					DownloadProgressEvent.make({
						itemId,
						downloadedBytes: IntFileSize.make(expectedSize),
						totalSizeBytes: IntFileSize.make(expectedSize),
						progressPercentage: 100
					})
				);

				yield* Effect.logDebug(`Completed download for item ${itemId}`);
				return fileInfo;
			});

			return DownloadMediaService.of({ downloadMedia });
		})
	);
}

class DownloadFailedError extends Schema.TaggedError<DownloadFailedError>()('DownloadFailedError', {}) {}
