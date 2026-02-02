import { Context, Effect, Layer, Schema } from 'effect';
import { type BaseItemDto } from '../../shared/BaseItemDto';
import { FileSystem } from '@effect/platform';
import { AssetService } from './AssetService';
import { AVService, type VideoCodec, type VideoContainer } from './AVService';

export class LibraryService extends Context.Tag('LibraryService')<
	LibraryService,
	{
		readonly SUPPORTED_CODECS: VideoCodec[];
		readonly SUPPORTED_CONTAINERS: VideoContainer[];
		/**
		 * Checks if the original media file for the given item is available locally and in a widely compatible format.
		 * If so, it symlinks the file to the originals directory for use in clipping.
		 */
		checkForLocalMediaFile: (item: BaseItemDto) => Effect.Effect<{ success: true }, ItemFileNotFound>;
	}
>() {
	static readonly Default = Layer.effect(
		LibraryService,
		Effect.gen(function* () {
			const fs = yield* FileSystem.FileSystem;
			const assetService = yield* AssetService;
			const av = yield* AVService;

			// To Create the clip, we need the browser to load the full media file.
			// So that original media file needs to be in a widely compatible format (h264 8bit in mp4 container).
			// We check if the original file is available locally and if it is in a compatible format.
			// If both checks pass, we can symlink the original file to our originals directory and use that.
			// If not, we need to download the media in a compatible format.
			const SUPPORTED_CODECS: Array<VideoCodec> = ['h264']; // https://jellyfin.org/docs/general/clients/codec-support/#video-compatibility
			const SUPPORTED_CONTAINERS: Array<VideoContainer> = ['mp4']; // https://jellyfin.org/docs/general/clients/codec-support/#container-compatibility

			return LibraryService.of({
				SUPPORTED_CODECS,
				SUPPORTED_CONTAINERS,
				checkForLocalMediaFile: Effect.fn('LibraryService.checkForLocalMediaFile')(function* (item: BaseItemDto) {
					const jellyfinItemPath = item.Path;

					yield* Effect.logDebug(`Checking for local media file at path: ${jellyfinItemPath}`);

					if (!jellyfinItemPath) {
						yield* Effect.logWarning(`No local path available for item ${item.Id}`);
						return yield* new ItemFileNotFound({ message: 'Item does not have a path property' });
					}

					const fileExists = yield* fs
						.exists(jellyfinItemPath)
						.pipe(
							Effect.catchAll(() =>
								Effect.fail(new ItemFileNotFound({ message: `Error accessing file at path: ${jellyfinItemPath}` }))
							)
						);

					if (!fileExists) {
						yield* Effect.logWarning(`Local media file not found at path: ${jellyfinItemPath} for item ${item.Id}`);
						return yield* new ItemFileNotFound({ message: `Local media file not found at path: ${jellyfinItemPath}` });
					}

					// Check for widely compatible codec
					// For media that is not h264 8bit in an mp4 container, we need to transcode or remux
					const videoInfo = yield* av
						.getVideoInfo(jellyfinItemPath)
						.pipe(
							Effect.catchTag('AvError', () =>
								Effect.fail(
									new ItemFileNotFound({ message: `Failed to get video info for file at path: ${jellyfinItemPath}` })
								)
							)
						);
					if (!SUPPORTED_CODECS.includes(videoInfo.codec) || !SUPPORTED_CONTAINERS.includes(videoInfo.container)) {
						yield* Effect.logWarning(
							`Media file at path: ${jellyfinItemPath} has incompatible codec/container: ${videoInfo.codec}/${videoInfo.container}`
						);
						return yield* new ItemFileNotFound({
							message: `Media file has incompatible codec/container: ${videoInfo.codec}/${videoInfo.container}`
						});
					}

					// If the file exists, we symlink it to our originals directory
					yield* fs.symlink(jellyfinItemPath, `${assetService.ORIGINALS_DIR}/${item.Id}.mp4`).pipe(
						Effect.catchAll((error) =>
							Effect.fail(
								new ItemFileNotFound({
									message: `Failed to create symlink for local media file at path: ${jellyfinItemPath} - ${String(
										error
									)}`
								})
							)
						)
					);

					return { success: true };
				})
			});
		})
	);
}

export class ItemFileNotFound extends Schema.TaggedError<ItemFileNotFound>()('ItemFileNotFound', {}) {}
