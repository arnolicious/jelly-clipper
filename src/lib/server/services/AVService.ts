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
					let commandLine = '';
					const ffmpegStderr: string[] = [];

					proc.setStartTime(params.start).setDuration(duration);

					if (subtitle && subtitle.fileContent) {
						yield* Effect.logDebug(`Adding subtitles to clip ${params.clipId} in language ${subtitle.language}`);
						const adjustedSrtContent = adjustSrtTimestamps(subtitle.fileContent, params.start, params.end);
						yield* Effect.logDebug(
							`Prepared subtitles for clip ${params.clipId}: ${countSrtCues(subtitle.fileContent)} cues before clipping, ${countSrtCues(adjustedSrtContent)} cues within ${params.start}s-${params.end}s`
						);

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
							.on('start', (startedCommandLine) => {
								commandLine = startedCommandLine;
							})
							.on('stderr', (line) => ffmpegStderr.push(line))
							.on('error', (err) => {
								reject(err);
							})
							.on('end', () => resolve());
					});

					yield* Effect.logDebug(`Starting ffmpeg processing for clip ${params.clipId}`);
					yield* Effect.tryPromise({
						try: () => ffmpegPromise,
						catch: (error) =>
							new AvError({
								cause: error,
								message: `Failed to clip video for clip ${params.clipId}. Command: ${commandLine || 'not started'}. FFmpeg stderr:\n${ffmpegStderr.join('\n')}`
							})
					}).pipe(Effect.tapError((error) => Effect.logError(error.message)));
					yield* Effect.logDebug(`FFmpeg command for clip ${params.clipId}: ${commandLine}`);
					if (ffmpegStderr.length > 0) {
						yield* Effect.logDebug(`FFmpeg stderr for clip ${params.clipId}:\n${ffmpegStderr.join('\n')}`);
					}
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

const srtTimecodeRegex = /^(\d{2}):(\d{2}):(\d{2}),(\d{3})\s+-->\s+(\d{2}):(\d{2}):(\d{2}),(\d{3})$/;

const parseSrtTimestamp = (hours: string, minutes: string, seconds: string, milliseconds: string) =>
	(Number(hours) * 3600 + Number(minutes) * 60 + Number(seconds)) * 1000 + Number(milliseconds);

const formatSrtTimestamp = (milliseconds: number) => {
	const totalSeconds = Math.floor(milliseconds / 1000);
	const hours = Math.floor(totalSeconds / 3600);
	const minutes = Math.floor((totalSeconds % 3600) / 60);
	const seconds = totalSeconds % 60;
	return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')},${String(milliseconds % 1000).padStart(3, '0')}`;
};

const countSrtCues = (srtContent: SrtStringContent) =>
	srtContent.split(/\r?\n/).filter((line) => srtTimecodeRegex.test(line.trim())).length;

export function adjustSrtTimestamps(
	srtContent: SrtStringContent,
	clipStartInSeconds: number,
	clipEndInSeconds: number
): SrtStringContent {
	const clipStartInMs = Math.round(clipStartInSeconds * 1000);
	const clipEndInMs = Math.round(clipEndInSeconds * 1000);

	return srtContent
		.split(/\r?\n\s*\r?\n/)
		.map((cue) => {
			const lines = cue.split(/\r?\n/);
			const timecodeLineIndex = lines.findIndex((line) => srtTimecodeRegex.test(line.trim()));
			if (timecodeLineIndex === -1) {
				return cue;
			}

			const match = lines[timecodeLineIndex].trim().match(srtTimecodeRegex)!;
			const cueStartInMs = parseSrtTimestamp(match[1], match[2], match[3], match[4]);
			const cueEndInMs = parseSrtTimestamp(match[5], match[6], match[7], match[8]);
			if (cueEndInMs <= clipStartInMs || cueStartInMs >= clipEndInMs) {
				return null;
			}

			const adjustedStartInMs = Math.max(0, cueStartInMs - clipStartInMs);
			const adjustedEndInMs = Math.min(clipEndInMs - clipStartInMs, cueEndInMs - clipStartInMs);
			if (adjustedEndInMs <= adjustedStartInMs) {
				return null;
			}

			lines[timecodeLineIndex] = `${formatSrtTimestamp(adjustedStartInMs)} --> ${formatSrtTimestamp(adjustedEndInMs)}`;
			return lines.join('\n');
		})
		.filter((cue): cue is string => cue !== null)
		.join('\n\n') as SrtStringContent;
}
