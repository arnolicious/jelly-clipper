import { Context, Effect, Layer, Schema } from 'effect';
import { DatabaseError, DatabaseService } from './DatabaseService';
import { UserSession, NoCurrentUserError } from './UserSession';
import { clips } from '../db/schema';
import { AssetService } from './AssetService';
import { AvError, AVService, SecondsSchema } from './AVService';

export class CreateClipService extends Context.Tag('CreateClipService')<
	CreateClipService,
	{
		createClip: (
			params: CreateClipBody
		) => Effect.Effect<number, ClipNotCreated | DatabaseError | FfmpegError | NoCurrentUserError | AvError>;
	}
>() {
	static readonly Default = Layer.effect(
		CreateClipService,
		Effect.gen(function* () {
			const db = yield* DatabaseService;
			const currentUser = yield* UserSession;
			const assetService = yield* AssetService;
			const av = yield* AVService;

			return CreateClipService.of({
				createClip: Effect.fn('CreateClipService.createClip')(function* (params: CreateClipBody) {
					const user = yield* currentUser.getCurrentUser();
					yield* Effect.logDebug(
						`Creating clip for user ${user.name} (${user.id}) from source ${params.sourceInfo.sourceId}`
					);
					const { lastInsertRowid } = yield* db.runQuery((db) =>
						db
							.insert(clips)
							.values({
								createdAt: new Date(),
								sourceId: params.sourceInfo.sourceId,
								sourceTitle: params.sourceInfo.sourceTitle,
								sourceType: params.sourceInfo.sourceType,
								title: params.title,
								userId: user.id
							})
							.execute()
					);
					const clipId = Number(lastInsertRowid);

					if (!clipId) {
						yield* Effect.logError('Failed to create clip in database');
						return yield* new ClipNotCreated();
					}

					const subtitle = params.subtitleTrack;

					// Load media file from ASSETS_ORIGINALS_DIR/:sourceId.mp4
					const sourceUri = `${assetService.ORIGINALS_DIR}/${params.sourceInfo.sourceId}.mp4`;

					yield* Effect.logDebug(`Starting AV processing for clip ${clipId}`);
					yield* av.clipVideo({
						clipId: clipId,
						sourceUri: sourceUri,
						sourceInfo: params.sourceInfo,
						start: params.start,
						end: params.end,
						subtitleTrack: subtitle
					});

					yield* Effect.logDebug(`AV processing completed for clip ${clipId}`);
					return clipId;
				})
			});
		})
	);
}

export class ClipNotCreated extends Schema.TaggedError<ClipNotCreated>()('ClipNotCreated', {}) {}

export class FfmpegError extends Schema.TaggedError<FfmpegError>()('FfmpegError', {
	message: Schema.String
}) {}

const SrtStringContentSchema = Schema.String.pipe(Schema.brand('SrtStringContent'));

export type SrtStringContent = typeof SrtStringContentSchema.Type;

export const SubtitleTrackSchema = Schema.Struct({
	fileContent: SrtStringContentSchema,
	language: Schema.String,
	title: Schema.String
});

export type SubtitleTrack = typeof SubtitleTrackSchema.Type;

export const CreateClipBodySchema = Schema.Struct({
	start: SecondsSchema,
	end: SecondsSchema,
	title: Schema.String,
	sourceInfo: Schema.Struct({
		sourceId: Schema.String,
		sourceTitle: Schema.String,
		sourceType: Schema.Union(Schema.Literal('movie'), Schema.Literal('show'))
	}),
	subtitleTrack: Schema.optional(SubtitleTrackSchema)
}).annotations({ identifier: 'CreateClipBody' });

export type CreateClipBody = typeof CreateClipBodySchema.Type;
