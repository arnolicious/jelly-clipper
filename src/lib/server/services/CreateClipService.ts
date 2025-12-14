import { Context, Effect, Layer, Schema } from 'effect';
import { DatabaseError, DB } from './DatabaseService';
import { CurrentUser, NoCurrentUserError } from './CurrentUser';
import { clips } from '../db/schema';
import { AssetService } from './AssetService';
import ffmpeg from 'fluent-ffmpeg';
import type { PlatformError } from '@effect/platform/Error';

export class CreateClipService extends Context.Tag('CreateClipService')<
	CreateClipService,
	{
		createClip: (
			params: CreateClipBody
		) => Effect.Effect<number, ClipNotCreated | DatabaseError | FfmpegError | NoCurrentUserError | PlatformError>;
	}
>() {
	static layer = Layer.effect(
		CreateClipService,
		Effect.gen(function* () {
			const db = yield* DB;
			const currentUser = yield* CurrentUser;
			const assetService = yield* AssetService;

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

					const duration = params.end - params.start;

					// Load media file from ASSETS_ORIGINALS_DIR/:sourceId.mp4
					const proc = ffmpeg({ source: `${assetService.ORIGINALS_DIR}/${params.sourceInfo.sourceId}.mp4` });
					proc.setStartTime(params.start).setDuration(duration);

					if (subtitle && subtitle.fileContent) {
						yield* Effect.logDebug(`Adding subtitles to clip ${clipId} in language ${subtitle.language}`);
						// 1. Adjust subtitle timestamps
						const adjustedSrtContent = adjustSrtTimestamps(params.subtitleTrack.fileContent, params.start);

						// 2. Save the adjusted subtitle content to a temporary file
						const tempSrtFilePath = yield* assetService.writeSubtitleForClip(clipId, adjustedSrtContent);

						// 3. Add the subtitles filter to ffmpeg
						// The `subtitles` filter expects a file path.
						// Ensure the path is correct and accessible by ffmpeg.
						proc.videoFilters(`subtitles='${tempSrtFilePath.replace(/\\/g, '\\\\')}'`); // Escape backslashes for ffmpeg path
					}

					const ffmpegPromise = new Promise<void>((resolve, reject) => {
						proc
							.videoCodec('libx264')
							.outputOptions([
								'-pix_fmt yuv420p', // Force 8-bit pixel format (yuv420p) for compatibility
								'-crf 23',
								'-preset medium'
							])
							.audioCodec('aac')
							.saveToFile(`${assetService.CLIPS_DIR}/${clipId}.mp4`)
							.on('start', (commandLine) => {
								console.info('Spawned Ffmpeg with command: ' + commandLine);
							})
							.on('error', (err) => {
								console.error('An error occurred: ' + err.message);
								reject(err);
							})
							.on('end', (err) => {
								if (!err) {
									console.info('Processing finished !');
									resolve();
								}
								reject(err);
							});
					});

					yield* Effect.logDebug(`Starting ffmpeg processing for clip ${clipId}`);
					yield* Effect.tryPromise({
						try: () => ffmpegPromise,
						catch: (error) => new FfmpegError({ message: String(error) })
					});
					yield* Effect.logDebug(`Ffmpeg processing completed for clip ${clipId}`);
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

export const SecondsSchema = Schema.Number.pipe(Schema.brand('seconds'));

const SrtStringContentSchema = Schema.String.pipe(Schema.brand('SrtStringContent'));

export type SrtStringContent = typeof SrtStringContentSchema.Type;

export const CreateClipBodySchema = Schema.Struct({
	start: SecondsSchema,
	end: SecondsSchema,
	title: Schema.String,
	sourceInfo: Schema.Struct({
		sourceId: Schema.String,
		sourceTitle: Schema.String,
		sourceType: Schema.Union(Schema.Literal('movie'), Schema.Literal('show'))
	}),
	subtitleTrack: Schema.optional(
		Schema.Struct({
			fileContent: SrtStringContentSchema,
			language: Schema.String,
			title: Schema.String
		})
	)
}).annotations({ identifier: 'CreateClipBody' });

export type CreateClipBody = typeof CreateClipBodySchema.Type;

// Helper function to adjust SRT timestamps
function adjustSrtTimestamps(srtContent: SrtStringContent, offsetInSeconds: number): SrtStringContent {
	const lines = srtContent.split('\n') as SrtStringContent[];
	const newSrtContent: SrtStringContent[] = [];

	for (let i = 0; i < lines.length; i++) {
		const line = lines[i];
		// SRT time format: HH:MM:SS,ms --> HH:MM:SS,ms
		const timecodeRegex = /(\d{2}):(\d{2}):(\d{2}),(\d{3}) --> (\d{2}):(\d{2}):(\d{2}),(\d{3})/;

		if (timecodeRegex.test(line)) {
			const match = line.match(timecodeRegex);
			if (match) {
				const [_, startH, startM, startS, startMs, endH, endM, endS, endMs] = match.map(Number);

				const startTimeInMs = (startH * 3600 + startM * 60 + startS) * 1000 + startMs;
				const endTimeInMs = (endH * 3600 + endM * 60 + endS) * 1000 + endMs;

				const newStartTimeInMs = Math.max(0, startTimeInMs - offsetInSeconds * 1000);
				const newEndTimeInMs = Math.max(0, endTimeInMs - offsetInSeconds * 1000);

				const formatTime = (ms: number) => {
					const totalSeconds = Math.floor(ms / 1000);
					const hours = Math.floor(totalSeconds / 3600);
					const minutes = Math.floor((totalSeconds % 3600) / 60);
					const seconds = totalSeconds % 60;
					const milliseconds = ms % 1000;
					return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')},${String(milliseconds).padStart(3, '0')}`;
				};

				newSrtContent.push(`${formatTime(newStartTimeInMs)} --> ${formatTime(newEndTimeInMs)}` as SrtStringContent);
			}
		} else {
			newSrtContent.push(line);
		}
	}
	return newSrtContent.join('\n') as SrtStringContent;
}
