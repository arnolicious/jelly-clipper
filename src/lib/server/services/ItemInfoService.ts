import { Context, Effect, Layer, Schema } from 'effect';
import { JellyfinApi, JellyfinApiError } from './JellyfinService';
import type { JellyfinNotConfiguredError, JellyClipperNotConfiguredError } from './ConfigService';
import type { DatabaseError } from './DatabaseService';
import type { NoCurrentUserError } from './CurrentUser';
import { BaseItemDtoSchema } from '../schemas/BaseItemDto';
import { MediaStreamSchema } from '../schemas/MediaStream';
import type { ParseError } from 'effect/ParseResult';

/**
 * Service that uses the Jellyfin Service to fetch the media information for a given media item.
 */

export class ItemInfoService extends Context.Tag('ItemInfoService')<
	ItemInfoService,
	{
		/**
		 * Fetch information about what audio and subtitle streams are available for a given media item.
		 */
		getClipInfo: (
			sourceId: string
		) => Effect.Effect<
			ClipInfo,
			| NoMediaSourceError
			| MultipleMediaSourcesError
			| JellyfinApiError
			| JellyfinNotConfiguredError
			| JellyClipperNotConfiguredError
			| DatabaseError
			| NoCurrentUserError
			| NoAudioStreamsError
			| ParseError
		>;
	}
>() {
	static readonly layer = Layer.effect(
		ItemInfoService,
		Effect.gen(function* () {
			const jellyfinApi = yield* JellyfinApi;

			const getMediaInfo = Effect.fn('MediaInfoService.getMediaInfo')(function* (sourceId: string) {
				const info = yield* jellyfinApi.getItemInfo(sourceId);
				const mediaSource = info?.MediaSources?.[0];

				if (!mediaSource) {
					return yield* NoMediaSourceError.make({ sourceId, mediaInfo: info });
				}

				if (info.MediaSources!.length > 1) {
					return yield* MultipleMediaSourcesError.make({ sourceId, mediaInfo: info });
				}

				const audioStreams = mediaSource.MediaStreams?.filter((stream) => stream.Type === 'Audio');

				if (!audioStreams || audioStreams.length === 0) {
					return yield* NoAudioStreamsError.make({ sourceId, mediaInfo: info });
				}
				const parsedResult = Schema.decodeUnknownSync(ClipInfoSchema)({ info, audioStreams }, { errors: 'all' });

				return parsedResult;
			});

			return ItemInfoService.of({ getClipInfo: getMediaInfo });
		})
	);
}

const ClipInfoSchema = Schema.Struct({
	info: BaseItemDtoSchema,
	audioStreams: Schema.Array(MediaStreamSchema).pipe(Schema.minItems(1))
});

type ClipInfo = typeof ClipInfoSchema.Type;

export class NoMediaSourceError extends Schema.TaggedError<NoMediaSourceError>()('NoMediaSourceError', {
	sourceId: Schema.String,
	mediaInfo: Schema.Object
}) {
	constructor(args: { sourceId: string; mediaInfo: object }) {
		super(args);
		this.message = `No media source found for item with ID ${args.sourceId}`;
	}
}

export class MultipleMediaSourcesError extends Schema.TaggedError<MultipleMediaSourcesError>()(
	'MultipleMediaSourcesError',
	{
		sourceId: Schema.String,
		mediaInfo: Schema.Object
	}
) {
	constructor(args: { sourceId: string; mediaInfo: object }) {
		super(args);
		this.message = `Multiple media sources found for item with ID ${args.sourceId}, expected only one.`;
	}
}

export class NoAudioStreamsError extends Schema.TaggedError<NoAudioStreamsError>()('NoAudioStreamsError', {
	sourceId: Schema.String,
	mediaInfo: Schema.Object
}) {
	constructor(args: { sourceId: string; mediaInfo: object }) {
		super(args);
		this.message = `No audio streams found for item with ID ${args.sourceId}.`;
	}
}

export class InvalidSourceFormatError extends Schema.TaggedError<InvalidSourceFormatError>()(
	'InvalidSourceFormatError',
	{
		source: Schema.String
	}
) {}
