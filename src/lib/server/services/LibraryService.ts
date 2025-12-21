import { Context, Effect, Layer, Schema } from 'effect';
import { type BaseItemDto } from '../../shared/BaseItemDto';
import { FileSystem } from '@effect/platform';
import { AssetService } from './AssetService';

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

					// For now, we can only handle mp4 files
					if (!jellyfinItemPath.endsWith('.mp4')) {
						yield* Effect.logWarning(
							`Local media file at path: ${jellyfinItemPath} is not an mp4 file for item ${item.Id}`
						);
						return yield* new ItemFileNotFound({
							message: `Local media file is not an mp4 file at path: ${jellyfinItemPath}`
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
