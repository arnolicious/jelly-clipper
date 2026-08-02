import { Config, Context, Effect, Layer, Option, Schema } from 'effect';
import { type BaseItemDto } from '../../shared/BaseItemDto';
import { FileSystem } from '@effect/platform';
import { AssetService } from './AssetService';
import { AVService, type VideoCodec, type VideoContainer } from './AVService';
import type { MediaFormatInfo } from '../../shared/MediaFormatInfo';
import type { AudioCodec } from '$lib/client/codec-support';

const jellyfinPathMappingSchema = Schema.parseJson(
	Schema.Array(
		Schema.Struct({
			from: Schema.String,
			to: Schema.String
		})
	)
);

const normalizeAbsolutePath = (path: string) => (path === '/' ? '/' : path.replace(/\/+$/, ''));

const isWithinPath = (path: string, root: string) =>
	root === '/' ? path.startsWith('/') : path === root || path.startsWith(`${root}/`);

const translatePath = (path: string, mapping: { from: string; to: string }) => {
	const from = normalizeAbsolutePath(mapping.from);
	const to = normalizeAbsolutePath(mapping.to);

	if (!isWithinPath(path, from)) {
		return null;
	}

	// Retain the leading slash when the source mapping is root.
	const suffix = path === from ? '' : path.slice(from === '/' ? 0 : from.length);
	return `${to}${suffix}`;
};

export const translateJellyfinPath = Effect.fn('LibraryService.translateJellyfinPath')(function* (
	jellyfinPath: string
) {
	const mappingStr = yield* Config.string('JELLYFIN_PATH_MAPPINGS').pipe(
		Config.withDefault('[]'),
		Effect.orElseSucceed(() => '[]')
	);
	const mappingOption = yield* Schema.decode(jellyfinPathMappingSchema)(mappingStr).pipe(
		Effect.map(Option.some),
		Effect.catchTag('ParseError', (e) =>
			Effect.logWarning(`Failed to decode JELLYFIN_PATH_MAPPINGS: ${e.message}`).pipe(Effect.as(Option.none()))
		)
	);

	if (Option.isNone(mappingOption)) {
		return jellyfinPath;
	}

	const mappings = mappingOption.value.map(({ from, to }) => ({
		from: normalizeAbsolutePath(from),
		to: normalizeAbsolutePath(to)
	}));

	if (mappings.some(({ from, to }) => !from.startsWith('/') || !to.startsWith('/'))) {
		yield* Effect.logWarning('JELLYFIN_PATH_MAPPINGS entries must use non-empty absolute paths');
		return jellyfinPath;
	}

	// Find the most specific mapping while matching complete path segments only.
	const matchingMapping = mappings
		.filter((mapping) => isWithinPath(jellyfinPath, mapping.from))
		.sort((a, b) => b.from.length - a.from.length)[0];

	if (matchingMapping) {
		const translatedPath = translatePath(jellyfinPath, matchingMapping);
		if (!translatedPath) {
			return jellyfinPath;
		}
		yield* Effect.logDebug(`Translated Jellyfin path: ${jellyfinPath} -> ${translatedPath}`);
		return translatedPath;
	}

	return jellyfinPath;
});

export class LibraryService extends Context.Tag('LibraryService')<
	LibraryService,
	{
		readonly SUPPORTED_CODECS: VideoCodec[];
		readonly SUPPORTED_CONTAINERS: VideoContainer[];
		/**
		 * Probes and symlinks a local source file. Browser playback for incompatible
		 * codecs is handled separately via a Jellyfin live-transcoded HLS URL.
		 */
		prepareLocalMedia: (item: BaseItemDto) => Effect.Effect<MediaFormatInfo, ItemFileNotFound>;
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
			const SUPPORTED_CODECS: Array<VideoCodec> = ['h264'] as const satisfies Array<VideoCodec>; // https://jellyfin.org/docs/general/clients/codec-support/#video-compatibility
			const SUPPORTED_CONTAINERS: Array<VideoContainer> = ['mp4']; // https://jellyfin.org/docs/general/clients/codec-support/#container-compatibility

			return LibraryService.of({
				SUPPORTED_CODECS,
				SUPPORTED_CONTAINERS,
				prepareLocalMedia: Effect.fn('LibraryService.prepareLocalMedia')(function* (item: BaseItemDto) {
					const originalJellyfinItemPath = item.Path;

					const jellyfinItemPath = yield* translateJellyfinPath(originalJellyfinItemPath ?? '');

					yield* Effect.logDebug(`Checking for local media file at path: ${jellyfinItemPath}`);

					if (!jellyfinItemPath) {
						yield* Effect.logWarning(`No local path available for item ${item.Id}`);
						return yield* new ItemFileNotFound({ message: 'Item does not have a path property' });
					}

					const fileExists = yield* fs
						.exists(jellyfinItemPath)
						.pipe(
							Effect.mapError(
								() => new ItemFileNotFound({ message: `Error accessing file at path: ${jellyfinItemPath}` })
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

					// Extract audio codec from MediaStreams if available
					const audioStream = item.MediaStreams?.find((stream) => stream.Type === 'Audio');
					const audioCodec = audioStream?.Codec?.toLowerCase() as AudioCodec | undefined;

					const formatInfo: MediaFormatInfo = {
						codec: videoInfo.codec,
						container: videoInfo.container,
						audioCodec,
						isLocalFileAvailable: true,
						requiresDownload:
							!SUPPORTED_CODECS.includes(videoInfo.codec) || !SUPPORTED_CONTAINERS.includes(videoInfo.container)
					};

					// Symlink unconditionally; cut uses server-side ffmpeg which handles any codec.
					yield* fs.symlink(jellyfinItemPath, `${assetService.ORIGINALS_DIR}/${item.Id}.mp4`).pipe(
						Effect.mapError(
							(error) =>
								new ItemFileNotFound({
									message: `Failed to create symlink for local media file at path: ${jellyfinItemPath} - ${String(
										error
									)}`
								})
						)
					);

					return formatInfo;
				})
			});
		})
	);
}

export class ItemFileNotFound extends Schema.TaggedError<ItemFileNotFound>()('ItemFileNotFound', {}) {}
