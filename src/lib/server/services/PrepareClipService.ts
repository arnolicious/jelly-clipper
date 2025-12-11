import { Context, Effect, Layer, Schema } from 'effect';
import { JellyfinApi, JellyfinApiError } from './JellyfinService';
import type { JellyfinNotConfiguredError, JellyClipperNotConfiguredError } from './ConfigService';
import type { DatabaseError } from './DatabaseService';
import type { NoCurrentUserError } from './CurrentUser';

/**
 * Service that uses the Jellyfin Service to fetch the media information for a given media item.
 */

export class PrepareClipService extends Context.Tag('PrepareClipService')<
	PrepareClipService,
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
		>;
	}
>() {
	static readonly layer = Layer.effect(
		PrepareClipService,
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

				return ClipInfoSchema.make({ info, audioStreams });
			});

			return PrepareClipService.of({ getClipInfo: getMediaInfo });
		})
	);
}

const ClipInfoSchema = Schema.Struct({
	info: Schema.Object, // BaseItemDto
	audioStreams: Schema.Array(Schema.Object) // BaseItemDto
});

type ClipInfo = typeof ClipInfoSchema.Type;

class NoMediaSourceError extends Schema.TaggedError<NoMediaSourceError>()('NoMediaSourceError', {
	sourceId: Schema.String,
	mediaInfo: Schema.Object
}) {}

class MultipleMediaSourcesError extends Schema.TaggedError<MultipleMediaSourcesError>()('MultipleMediaSourcesError', {
	sourceId: Schema.String,
	mediaInfo: Schema.Object
}) {}

class NoAudioStreamsError extends Schema.TaggedError<NoAudioStreamsError>()('NoAudioStreamsError', {
	sourceId: Schema.String,
	mediaInfo: Schema.Object
}) {}
