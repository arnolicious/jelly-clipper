import { Context, Effect, Either, Layer, Schema } from 'effect';
import { JellyfinApi } from './JellyfinService';
import { LibraryService } from './LibraryService';
import type { MediaFormatInfo } from '$lib/shared/MediaFormatInfo';
import type { Track } from './JellyfinService';
import type { BaseItemDto } from '$lib/shared/BaseItemDto';

export interface DownloadRequest {
	itemId: string;
	mediaSourceId: string;
	expectedSize: number;
	audioStreamIndex?: number;
}

export interface PreparedClipMedia {
	itemInfo: BaseItemDto;
	subtitleTracks: Track[];
	subtitleWarning?: string;
	formatInfo: MediaFormatInfo | null;
	previewUrl?: string;
	source: 'local' | 'download';
	downloadRequest: DownloadRequest;
}

export class ClipMediaPreparationService extends Context.Tag('ClipMediaPreparationService')<
	ClipMediaPreparationService,
	{
		prepareMedia: (
			itemId: string,
			audioStreamIndex?: number
		) => Effect.Effect<PreparedClipMedia, ClipMediaPreparationError>;
	}
>() {
	static readonly Default = Layer.effect(
		ClipMediaPreparationService,
		Effect.gen(function* () {
			const api = yield* JellyfinApi;
			const libraryService = yield* LibraryService;

			const prepareMediaEffect = Effect.fn('ClipMediaPreparationService.prepareMedia')(function* (
				itemId: string,
				audioStreamIndex?: number
			) {
				const clipInfo = yield* api.getClipInfo(itemId);
				const mediaSource = clipInfo.info.MediaSources[0];
				const subtitleResult = yield* api.getSubtitleTracks(itemId, mediaSource).pipe(Effect.either);
				const subtitleTracks = Either.isRight(subtitleResult) ? subtitleResult.right : [];
				const subtitleWarning = Either.isLeft(subtitleResult)
					? 'Subtitles could not be fetched. You can still create a clip without subtitles.'
					: undefined;

				if (Either.isLeft(subtitleResult)) {
					yield* Effect.logWarning(`Failed to fetch subtitles for item ${itemId}: ${String(subtitleResult.left)}`);
				}

				const localMedia = yield* libraryService.prepareLocalMedia(clipInfo.info).pipe(Effect.either);
				const formatInfo = localMedia._tag === 'Right' ? localMedia.right : null;
				let previewUrl: string | undefined;

				if (formatInfo?.requiresDownload) {
					previewUrl = yield* api.getStreamPreviewUrl({
						itemId,
						mediaSourceId: mediaSource.Id,
						audioStreamIndex
					});
				}

				const source: PreparedClipMedia['source'] = localMedia._tag === 'Right' ? 'local' : 'download';

				return {
					itemInfo: clipInfo.info,
					subtitleTracks,
					subtitleWarning,
					formatInfo,
					previewUrl,
					source,
					downloadRequest: {
						itemId,
						mediaSourceId: mediaSource.Id,
						expectedSize: mediaSource.Size,
						audioStreamIndex
					}
				};
			});

			const prepareMedia = (itemId: string, audioStreamIndex?: number) =>
				prepareMediaEffect(itemId, audioStreamIndex).pipe(
					Effect.mapError(
						(error) => new ClipMediaPreparationError({ message: `Failed to prepare media: ${String(error)}` })
					)
				);

			return ClipMediaPreparationService.of({ prepareMedia });
		})
	);
}

export class ClipMediaPreparationError extends Schema.TaggedError<ClipMediaPreparationError>()(
	'ClipMediaPreparationError',
	{ message: Schema.String }
) {}
