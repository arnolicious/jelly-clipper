import type { BaseItemDto } from '@jellyfin/sdk/lib/generated-client/models';
import { Context, Effect, Layer, Schema } from 'effect';
import { Jellyfin } from '@jellyfin/sdk';
import { getMediaInfoApi, getSubtitleApi, getUserLibraryApi } from '@jellyfin/sdk/lib/utils/api';
import {
	JellyClipperConfig,
	JellyClipperConfigWithDbLayer,
	JellyClipperNotConfiguredError,
	JellyfinNotConfiguredError
} from './ConfigService';
import type { DatabaseError } from './DatabaseService';
import { CurrentUser, NoCurrentUserError } from './CurrentUser';
import { MediaSourceSchema, type MediaSource } from '../schemas/MediaSource';
import type { ParseError } from 'effect/ParseResult';

type JellyfinSdkApi = ReturnType<Jellyfin['createApi']>;

export class JellyfinBaseApi extends Context.Tag('JellyfinBaseApi')<
	JellyfinBaseApi,
	{
		getJellyfinApi: () => Effect.Effect<
			JellyfinSdkApi,
			JellyfinNotConfiguredError | JellyClipperNotConfiguredError | DatabaseError | NoCurrentUserError
		>;
	}
>() {
	static readonly layer = Layer.effect(
		JellyfinBaseApi,
		Effect.gen(function* () {
			const clipperConfig = yield* JellyClipperConfig;
			const currentUser = yield* CurrentUser;

			const getJellyfinApi = Effect.fn('JellyfinBaseApi.getJellyfinApi')(function* () {
				const jellyfinUrl = yield* clipperConfig.getJellyfinUrl();
				const user = yield* currentUser.getCurrentUser();

				const jellyfin = new Jellyfin({
					clientInfo: {
						name: 'Jelly-Clipper',
						version: process.env.npm_package_version ?? '0.0.0'
					},
					deviceInfo: {
						id: crypto.randomUUID(),
						name: 'Jelly-Clipper'
					}
				});

				const api = jellyfin.createApi(jellyfinUrl);
				api.accessToken = user.accessToken;
				return api;
			});

			return JellyfinBaseApi.of({ getJellyfinApi });
		})
	);
}

const JellyfinBaseApiWithConfigLayer = Layer.provideMerge(JellyfinBaseApi.layer, JellyClipperConfigWithDbLayer);

interface GetDownloadStreamParams {
	itemId: string;
	mediaSourceId: string;
	audioStreamIndex?: number;
	subtitleStreamIndex?: number;
}

interface CreatePlayBackParams {
	itemId: string;
	mediaSourceId: string;
	audioStreamIndex?: number;
	subtitleStreamIndex?: number;
}

/**
 * Service that interacts with the Jellyfin API
 */

export class JellyfinApi extends Context.Tag('JellyfinApi')<
	JellyfinApi,
	{
		getItemInfo: (
			sourceId: string
		) => Effect.Effect<
			BaseItemDto,
			| JellyfinNotConfiguredError
			| JellyClipperNotConfiguredError
			| DatabaseError
			| JellyfinApiError
			| NoCurrentUserError
		>;
		getSubtitleTracks: (
			itemId: string,
			mediaSource: MediaSource
		) => Effect.Effect<
			Track[],
			| DatabaseError
			| JellyClipperNotConfiguredError
			| JellyfinApiError
			| JellyfinNotConfiguredError
			| NoCurrentUserError
			| ParseError
		>;
		createPlaybackSession: (
			params: CreatePlayBackParams
		) => Effect.Effect<
			PlaybackSession,
			| DatabaseError
			| JellyClipperNotConfiguredError
			| JellyfinApiError
			| JellyfinNotConfiguredError
			| NoCurrentUserError
			| ParseError
		>;
		getDownloadStreamUrl: (
			params: GetDownloadStreamParams
		) => Effect.Effect<
			string,
			| DatabaseError
			| JellyClipperNotConfiguredError
			| JellyfinApiError
			| JellyfinNotConfiguredError
			| NoCurrentUserError
			| ParseError
		>;
	}
>() {
	static readonly layer = Layer.effect(
		JellyfinApi,
		Effect.gen(function* () {
			const baseApiService = yield* JellyfinBaseApi;
			const currentUser = yield* CurrentUser;

			const getItemInfo = Effect.fn('JellyfinApi.getItemInfo')(function* (sourceId: string) {
				const jellyfinApi = yield* baseApiService.getJellyfinApi();
				const response = yield* Effect.tryPromise({
					try: (signal) =>
						getUserLibraryApi(jellyfinApi).getItem(
							{
								itemId: sourceId
							},
							{ signal }
						),
					catch: (error) => JellyfinApiError.make({ message: (error as Error).message })
				});
				return response.data;
			});

			const getSubtitleTracks = Effect.fn('JellyfinApi.getSubtitleTracks')(function* (
				itemId: string,
				mediaSource: MediaSource
			) {
				const jellyfinApi = yield* baseApiService.getJellyfinApi();
				const mediaSourceSubtitles = mediaSource.MediaStreams.filter((stream) => stream.Type === 'Subtitle') || [];

				if (mediaSourceSubtitles.length === 0) {
					return [];
				}

				const subtitleApi = getSubtitleApi(jellyfinApi);

				const subtitleEffects = yield* Effect.forEach(mediaSourceSubtitles, (subtitleStream) =>
					Effect.tryPromise({
						try: async (signal) => {
							const subtitle = await subtitleApi.getSubtitle(
								{
									itemId,
									mediaSourceId: mediaSource.Id,
									routeFormat: 'srt',
									routeItemId: itemId,
									routeMediaSourceId: mediaSource.Id,
									routeIndex: subtitleStream.Index,
									startPositionTicks: 0,
									format: 'srt',
									index: subtitleStream.Index
								},
								{ signal }
							);

							console.log('Fetched subtitle', subtitleStream);

							const track = Schema.decodeUnknown(TrackSchema)(
								{
									index: subtitleStream.Index,
									language: subtitleStream.Language,
									title: subtitleStream.DisplayTitle,
									subtitleFile: subtitle.data
								},
								{ errors: 'all' }
							);

							return track;
						},
						catch: (error) => JellyfinApiError.make({ message: (error as Error).message })
					})
				);

				const tracks = yield* Effect.all(subtitleEffects);
				return tracks;
			});

			const createPlaybackSession = Effect.fn('JellyfinApi.createPlaybackSession')(function* (
				params: CreatePlayBackParams
			) {
				const jellyfinApi = yield* baseApiService.getJellyfinApi();
				const user = yield* currentUser.getCurrentUser();

				const { data } = yield* Effect.tryPromise({
					try: (signal) =>
						getMediaInfoApi(jellyfinApi).getPlaybackInfo(
							{ itemId: params.itemId },
							{
								method: 'POST',
								signal,
								data: {
									userId: user.id,
									// deviceProfile,
									subtitleStreamIndex: params.subtitleStreamIndex,
									startTimeTicks: 0,
									isPlayback: true,
									autoOpenLiveStream: true,
									maxStreamingBitrate: undefined,
									audioStreamIndex: params.audioStreamIndex,
									mediaSourceId: params.mediaSourceId,
									alwaysBurnInSubtitleWhenTranscoding: true
								}
							}
						),
					catch: (error) => JellyfinApiError.make({ message: (error as Error).message })
				});

				const result = Schema.decodeUnknownSync(PlaybackSession)(
					{
						sessionId: data.PlaySessionId,
						mediaSource: data.MediaSources?.[0]
					},
					{ errors: 'all' }
				);
				return result;
			});

			const getDownloadStreamUrl = Effect.fn('JellyfinApi.getDownloadStreamUrl')(function* (
				params: GetDownloadStreamParams
			) {
				const { itemId, mediaSourceId, audioStreamIndex, subtitleStreamIndex } = params;
				const user = yield* currentUser.getCurrentUser();
				const jellyfinApi = yield* baseApiService.getJellyfinApi();
				const { mediaSource, sessionId } = yield* createPlaybackSession({
					itemId: itemId,
					mediaSourceId: mediaSourceId,
					audioStreamIndex: audioStreamIndex,
					subtitleStreamIndex: subtitleStreamIndex
				});

				if (mediaSource.TranscodingUrl) {
					return `${jellyfinApi.basePath}${mediaSource.TranscodingUrl}`;
				}

				const streamParams = new URLSearchParams({
					mediaSourceId: mediaSource?.Id || '',
					subtitleStreamIndex: subtitleStreamIndex?.toString() || '',
					audioStreamIndex: audioStreamIndex?.toString() || '',
					deviceId: jellyfinApi.deviceInfo.id,
					api_key: jellyfinApi.accessToken,
					startTimeTicks: '0',
					maxStreamingBitrate: '',
					userId: user.id,
					subtitleMethod: 'Embed',
					static: 'false',
					allowVideoStreamCopy: 'true',
					allowAudioStreamCopy: 'true',
					playSessionId: sessionId,
					container: 'mp4',
					audioCodec: 'aac',
					subtitleCodec: 'srt'
				});

				const directPlayUrl = `${jellyfinApi.basePath}/Videos/${itemId}/stream?${streamParams.toString()}`;

				return directPlayUrl;
			});

			return JellyfinApi.of({ getItemInfo, getSubtitleTracks, createPlaybackSession, getDownloadStreamUrl });
		})
	);
}

const SessionIdSchema = Schema.String.pipe(Schema.brand('SessionId'));

const PlaybackSession = Schema.Struct({
	sessionId: SessionIdSchema,
	mediaSource: MediaSourceSchema
});

type PlaybackSession = typeof PlaybackSession.Type;

export const TrackSchema = Schema.Struct({
	index: Schema.Number,
	language: Schema.String,
	title: Schema.String,
	subtitleFile: Schema.String
});

export type Track = typeof TrackSchema.Type;

export const JellyfinApiDependenciesLayer = Layer.provideMerge(JellyfinApi.layer, JellyfinBaseApiWithConfigLayer);

export class JellyfinApiError extends Schema.TaggedError<JellyfinApiError>()('JellyfinApiError', {
	message: Schema.String
}) {}
