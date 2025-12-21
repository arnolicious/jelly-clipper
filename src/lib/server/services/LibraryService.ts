import { Context, Effect, Layer, Schema } from 'effect';
import { type BaseItemDto } from '../../shared/BaseItemDto';
import { FileSystem } from '@effect/platform';
import { AssetService } from './AssetService';
import { AVService } from './AVService';

export class LibraryService extends Context.Tag('LibraryService')<
	LibraryService,
	{
		checkForLocalMediaFile: (item: BaseItemDto) => Effect.Effect<{ success: true }, ItemFileNotFound>;
	}
>() {
	static readonly Default = Layer.effect(
		LibraryService,
		Effect.gen(function* () {
			const fs = yield* FileSystem.FileSystem;
			const assetService = yield* AssetService;
			const av = yield* AVService;

			return LibraryService.of({
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
					const videoInfo = yield* av.getVideoInfo(jellyfinItemPath);
					if (videoInfo.codec !== 'h264' || videoInfo.container !== 'mp4') {
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
