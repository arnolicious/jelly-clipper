import { Effect, Context, Layer, Schema, Stream } from 'effect';
import { FileSystem, Path } from '@effect/platform';
import { PlatformError } from '@effect/platform/Error';
import { NodeContext } from '@effect/platform-node';
import { BunContext } from '@effect/platform-bun';
import type { SrtStringContent } from './CreateClipService';

export const ASSET_ROOT_DIR = 'assets';

export const ASSETS_VIDEOS_ROOT_DIR = `${ASSET_ROOT_DIR}/videos`;

export const ASSETS_ORIGINALS_DIR = `${ASSETS_VIDEOS_ROOT_DIR}/originals`;

export const ASSETS_CLIPS_DIR = `${ASSETS_VIDEOS_ROOT_DIR}/clips`;

export class AssetService extends Context.Tag('AssetService')<
	AssetService,
	{
		readonly ROOT_DIR: string;
		readonly ORIGINALS_DIR: string;
		readonly CLIPS_DIR: string;
		ensureAssetDirectoriesExist: () => Effect.Effect<void, PlatformError>;
		getMediaItemPath: (itemId: string) => string;
		getFileInfoForItem: (itemId: string) => Effect.Effect<FileInfo, PlatformError | AssetNotOnDisk>;
		writeSubtitleForClip: (clipId: number, content: SrtStringContent) => Effect.Effect<string, PlatformError>;
		writeFileStreamForItem: (
			itemId: string,
			stream: Stream.Stream<Uint8Array<ArrayBufferLike>>
		) => Effect.Effect<FileInfo, WriteStreamFailed | PlatformError>;
	}
>() {}

const DefaultAssetService = Layer.effect(
	AssetService,
	Effect.gen(function* () {
		const fs = yield* FileSystem.FileSystem;
		const path = yield* Path.Path;

		const ensureAssetDirectoriesExist = Effect.fn('AssetService.ensureAssetDirectoriesExist')(function* () {
			const rootDirExists = yield* fs.exists(ASSET_ROOT_DIR);
			if (!rootDirExists) {
				yield* fs.makeDirectory(ASSET_ROOT_DIR);
			}
			const videoRootDirExists = yield* fs.exists(ASSETS_VIDEOS_ROOT_DIR);
			if (!videoRootDirExists) {
				yield* fs.makeDirectory(ASSETS_VIDEOS_ROOT_DIR);
			}
			const originalsDirExists = yield* fs.exists(ASSETS_ORIGINALS_DIR);
			if (!originalsDirExists) {
				yield* fs.makeDirectory(ASSETS_ORIGINALS_DIR);
			}
			const clipsDirExists = yield* fs.exists(ASSETS_CLIPS_DIR);
			if (!clipsDirExists) {
				yield* fs.makeDirectory(ASSETS_CLIPS_DIR);
			}
			yield* Effect.logDebug('Ensured asset directories exist');
		});

		const getMediaItemPath = (itemId: string) => {
			const itemPath = path.join(ASSETS_ORIGINALS_DIR, `${itemId}.mp4`);
			return itemPath;
		};

		const getFileInfoForItem = Effect.fn('AssetService.getFileInfoForItem')(function* (itemId: string) {
			const itemPath = getMediaItemPath(itemId);
			const fileExists = yield* fs.exists(itemPath);
			if (!fileExists) {
				return yield* AssetNotOnDisk.make();
			}
			const stat = yield* fs.stat(itemPath);
			const size = BigIntFileSize.make(stat.size);
			const pathInfo = path.extname(itemPath);
			const name = path.basename(itemPath, pathInfo);
			yield* Effect.logDebug(`Fetched file info for item ${itemId}`);
			return FileInfoSchema.make({
				name,
				extension: pathInfo,
				size: size
			});
		});

		return AssetService.of({
			ensureAssetDirectoriesExist,
			ROOT_DIR: ASSETS_VIDEOS_ROOT_DIR,
			ORIGINALS_DIR: ASSETS_ORIGINALS_DIR,
			CLIPS_DIR: ASSETS_CLIPS_DIR,
			getMediaItemPath,
			getFileInfoForItem,
			writeFileStreamForItem: Effect.fn('AssetService.writeFileStreamForItem')(function* (itemId, stream) {
				const itemPath = getMediaItemPath(itemId);
				const fileSink = fs.sink(itemPath);
				yield* stream.pipe(Stream.run(fileSink));
				yield* Effect.logDebug(`Wrote file stream for item ${itemId}`);
				return yield* getFileInfoForItem(itemId).pipe(
					Effect.catchTag('AssetNotOnDisk', () => Effect.fail(WriteStreamFailed.make()))
				);
			}),
			writeSubtitleForClip: Effect.fn('AssetService.writeSubtitleForClip')(function* (clipId, content) {
				const targetPath = path.join(ASSETS_CLIPS_DIR, `${clipId}.srt`);
				yield* fs.writeFileString(targetPath, content);
				return targetPath;
			})
		});
	})
);

export class AssetNotOnDisk extends Schema.TaggedError<AssetNotOnDisk>()('AssetNotOnDisk', {}) {}

export class WriteStreamFailed extends Schema.TaggedError<WriteStreamFailed>()('WriteStreamFailed', {}) {
	constructor() {
		super();
	}
}

export const BigIntFileSize = Schema.BigInt.pipe(Schema.brand('SizeInBytes'));

export const IntFileSize = Schema.Number.pipe(Schema.brand('SizeInBytes'));

export const FileInfoSchema = Schema.Struct({
	name: Schema.String,
	extension: Schema.String,
	size: BigIntFileSize
});

export type FileInfo = typeof FileInfoSchema.Type;

export const AssetNodeLayer = DefaultAssetService.pipe(Layer.provide(NodeContext.layer));

export const AssetBunLayer = DefaultAssetService.pipe(Layer.provide(BunContext.layer));
