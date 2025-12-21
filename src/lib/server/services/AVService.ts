import { Context, Effect, Layer, Schema } from 'effect';
import ffmpeg from 'fluent-ffmpeg';
import type { SrtStringContent, SubtitleTrack } from './CreateClipService';
import { AssetService } from './AssetService';

interface ClipVideoParams {
	clipId: number;
	sourceUri: string;
	sourceInfo: {
		sourceId: string;
		sourceTitle: string;
		sourceType: string;
	};
	start: Seconds;
	end: Seconds;
	subtitleTrack?: SubtitleTrack;
}

export const SecondsSchema = Schema.Number.pipe(Schema.brand('seconds'));

export type Seconds = typeof SecondsSchema.Type;

/**
 * Abstraction above ffmpeg and AV related operations.
 */
export class AVService extends Context.Tag('AVService')<
	AVService,
	{
		clipVideo: (params: ClipVideoParams) => Effect.Effect<void, AvError>;
		createThumbnailForClip: (clipId: number, thumbnailPercent?: number) => Effect.Effect<string, AvError>;
		getVideoInfo: (uri: string) => Effect.Effect<{ codec: VideoCodec; container: VideoContainer }, AvError>;
	}
>() {
	static readonly FfmpegLayer = Layer.effect(
		AVService,
		Effect.gen(function* () {
			const assetService = yield* AssetService;

			return AVService.of({
				clipVideo: Effect.fn('AVService.clipVideo')(function* (params) {
					const proc = ffmpeg({ source: params.sourceUri });
					const duration = params.end - params.start;
					const subtitle = params.subtitleTrack;

					proc.setStartTime(params.start).setDuration(duration);

					if (subtitle && subtitle.fileContent) {
						yield* Effect.logDebug(`Adding subtitles to clip ${params.clipId} in language ${subtitle.language}`);
						// 1. Adjust subtitle timestamps
						const adjustedSrtContent = adjustSrtTimestamps(subtitle.fileContent, params.start);

						// 2. Save the adjusted subtitle content to a temporary file
						const tempSrtFilePath = yield* assetService
							.writeSubtitleForClip(params.clipId, adjustedSrtContent)
							.pipe(
								Effect.catchAll((e) =>
									Effect.fail(new AvError({ cause: e, message: `Failed to write subtitle for clip ${params.clipId}` }))
								)
							);

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
							.saveToFile(`${assetService.CLIPS_DIR}/${params.clipId}.mp4`)
							.on('start', (_commandLine) => {
								// console.info('Spawned Ffmpeg with command: ' + commandLine);
							})
							.on('error', (err) => {
								// console.error('An error occurred: ' + err.message);
								reject(err);
							})
							.on('end', (err) => {
								if (!err) {
									// console.info('Processing finished !');
									resolve();
								}
								reject(err);
							});
					});

					yield* Effect.logDebug(`Starting ffmpeg processing for clip ${params.clipId}`);
					yield* Effect.tryPromise({
						try: () => ffmpegPromise,
						catch: (error) => new AvError({ cause: error, message: `Failed to clip video for clipId ${params.clipId}` })
					});
				}),
				createThumbnailForClip: Effect.fn('AVService.createThumbnailForClip')(function* (
					clipId,
					thumbnailPercent = 10
				) {
					const proc = yield* Effect.try({
						try: () => ffmpeg({ source: `${assetService.CLIPS_DIR}/${clipId}.mp4` }),
						catch: (error) => new AvError({ cause: error, message: `Failed to initialize ffmpeg for clip ${clipId}` })
					});
					const targetPath = `${assetService.CLIPS_DIR}/${clipId}.jpg`;
					// Use ffmpeg to create a thumbnail
					const ffmpegPromise = new Promise<void>((resolve, reject) => {
						proc
							.on('start', (_commandLine) => {
								// console.info('Spawned Ffmpeg with command: ' + commandLine);
							})
							.on('error', (err) => {
								// console.error('An error occurred: ' + err.message);
								reject(err);
							})
							.on('end', (err) => {
								if (!err) {
									// console.info('Processing finished !');
									resolve();
								}
								reject(err);
							})
							.screenshots({
								count: 1,
								filename: targetPath,
								timemarks: [`${thumbnailPercent}%`]
							});
					});

					yield* Effect.logDebug(`Starting ffmpeg thumbnail generation for clip ${clipId}`);
					yield* Effect.tryPromise({
						try: () => ffmpegPromise,
						catch: (error) => new AvError({ cause: error, message: `Failed to create thumbnail for clip ${clipId}` })
					});
					yield* Effect.logDebug(`Thumbnail generated at ${targetPath} for clip ${clipId}`);
					return targetPath;
				}),
				getVideoInfo: Effect.fn('AVService.getVideoInfo')(function* (uri: string) {
					const proc = yield* Effect.try({
						try: () => ffmpeg({ source: uri }),
						catch: (error) => new AvError({ cause: error, message: `Failed to initialize ffmpeg for uri ${uri}` })
					});

					const ffprobePromise = new Promise<string>((resolve, reject) => {
						proc.ffprobe((err, data) => {
							if (err) {
								reject(err);
							} else {
								const videoStream = data.streams.find((stream) => stream.codec_type === 'video');
								if (videoStream && videoStream.codec_name) {
									resolve(videoStream.codec_name);
								} else {
									reject(new Error('No video stream found'));
								}
							}
						});
					});

					const codecResult = yield* Effect.tryPromise({
						try: () => ffprobePromise,
						catch: (error) => new AvError({ cause: error, message: `Failed to get codec for uri ${uri}` })
					});

					// Determine container from file extension
					const extension = uri.split('.').pop()?.toLowerCase();
					let container: VideoContainer;
					switch (extension) {
						case 'mp4':
							container = 'mp4';
							break;
						case 'mkv':
							container = 'mkv';
							break;
						case 'webm':
							container = 'webm';
							break;
						case 'mov':
							container = 'mov';
							break;
						default:
							return yield* Effect.fail(
								new AvError({ message: `Unsupported or unknown container format for uri ${uri}` })
							);
					}

					const codec = yield* Schema.encodeUnknown(VideoCodecSchema)(codecResult).pipe(
						Effect.catchAll(() =>
							Effect.fail(new AvError({ message: `Unsupported or unknown video codec ${codecResult} for uri ${uri}` }))
						)
					);

					return { codec, container };
				})
			});
		})
	);
}

export const VideoCodecSchema = Schema.Literal('h264', 'hevc', 'vp9', 'av1');

export type VideoCodec = typeof VideoCodecSchema.Type;

export const VideoContainerSchema = Schema.Literal('mp4', 'mkv', 'webm', 'mov');

export type VideoContainer = typeof VideoContainerSchema.Type;

export class AvError extends Schema.TaggedError<AvError>()('AvError', {
	cause: Schema.optional(Schema.Defect),
	message: Schema.String
}) {}

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
