import type { BaseItemDto } from '@jellyfin/sdk/lib/generated-client/models';
import { Context, Effect, Layer, Schema } from 'effect';
import { Jellyfin, type RecommendedServerInfo } from '@jellyfin/sdk';
import { getMediaInfoApi, getSubtitleApi, getUserApi, getUserLibraryApi } from '@jellyfin/sdk/lib/utils/api';
import {
	JellyClipperConfig,
	JellyClipperConfigWithDbLayer,
	JellyClipperNotConfiguredError,
	JellyfinNotConfiguredError
} from './ConfigService';
import type { DatabaseError } from './DatabaseService';
import { CurrentUser, NoCurrentUserError } from './CurrentUser';
import { MediaSourceSchema, type MediaSource } from '../schemas/MediaSource';
import { type AuthenticationResult, AuthenticationResultSchema } from '../schemas/AuthenticationResult';
import type { ParseError } from 'effect/ParseResult';

type JellyfinSdkApi = ReturnType<Jellyfin['createApi']>;

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

export class AnonymousJellyfinApi extends Context.Tag('AnonymousJellyfinApi')<
	AnonymousJellyfinApi,
	{
		readonly jellyfinSdk: Jellyfin;

		findServerByAddress: (
			address: string
		) => Effect.Effect<RecommendedServerInfo, JellyfinServerNotFound | JellyfinApiError>;
		authenticateUserByName: (params: {
			username: string;
			password: string;
			serverAddress: string;
		}) => Effect.Effect<AuthenticationResult, JellyfinApiError | ParseError>;
	}
>() {
	static readonly layer = Layer.effect(
		AnonymousJellyfinApi,
		Effect.sync(() => {
			const jellyfinSdk = new Jellyfin({
				clientInfo: {
					name: 'Jelly-Clipper',
					version: process.env.npm_package_version ?? '0.0.0'
				},
				deviceInfo: {
					id: crypto.randomUUID(),
					name: 'Jelly-Clipper'
				}
			});

			return AnonymousJellyfinApi.of({
				findServerByAddress: Effect.fn('JellyfinApi.findServerByAddress')(function* (address: string) {
					yield* Effect.log(`Finding Jellyfin server at address: ${address}`);
					const servers = yield* Effect.tryPromise({
						try: () => jellyfinSdk.discovery.getRecommendedServerCandidates(address),
						catch: (error) => JellyfinApiError.make({ message: (error as Error).message })
					});
					yield* Effect.log(`Found ${servers.length} server candidates`);
					const bestServer = jellyfinSdk.discovery.findBestServer(servers);
					if (!bestServer) {
						yield* Effect.logWarning(`No Jellyfin server found at address: ${address}`);
						return yield* new JellyfinServerNotFound({ address });
					}
					return bestServer;
				}),
				authenticateUserByName: Effect.fn('JellyfinApi.authenticateUserByName')(function* ({
					username,
					password,
					serverAddress
				}) {
					const auth = yield* Effect.tryPromise({
						try: () => {
							const api = jellyfinSdk.createApi(serverAddress);
							return getUserApi(api).authenticateUserByName({
								authenticateUserByName: { Username: username, Pw: password }
							});
						},
						catch: (error) => JellyfinApiError.make({ message: (error as Error).message })
					});
					const parsed = yield* Schema.decodeUnknown(AuthenticationResultSchema)(auth.data, { errors: 'all' });
					return parsed;
				}),
				jellyfinSdk
			});
		})
	);
}

export const AnonymousJellyfinApiLayer = Layer.provideMerge(AnonymousJellyfinApi.layer, JellyClipperConfigWithDbLayer);

/**
 * Service that interacts with the Jellyfin API
 */
export class JellyfinApi extends Context.Tag('JellyfinApi')<
	JellyfinApi,
	{
		getJellyfinApi: () => Effect.Effect<
			{ api: JellyfinSdkApi },
			JellyfinNotConfiguredError | JellyClipperNotConfiguredError | DatabaseError | NoCurrentUserError
		>;
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
			// const baseApiService = yield* JellyfinBaseApi;
			const currentUser = yield* CurrentUser;
			const clipperConfig = yield* JellyClipperConfig;
			const anonymousApi = yield* AnonymousJellyfinApi;

			const getJellyfinApi = Effect.fn('JellyfinBaseApi.getJellyfinApi')(function* () {
				const jellyfinUrl = yield* clipperConfig.getJellyfinUrl();
				const user = yield* currentUser.getCurrentUser();

				const api = anonymousApi.jellyfinSdk.createApi(jellyfinUrl);
				api.accessToken = user.accessToken;
				return { api };
			});

			const getItemInfo = Effect.fn('JellyfinApi.getItemInfo')(function* (sourceId: string) {
				const { api } = yield* getJellyfinApi();
				const response = yield* Effect.tryPromise({
					try: (signal) =>
						getUserLibraryApi(api).getItem(
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
				const { api } = yield* getJellyfinApi();
				const mediaSourceSubtitles = mediaSource.MediaStreams.filter((stream) => stream.Type === 'Subtitle') || [];

				if (mediaSourceSubtitles.length === 0) {
					return [];
				}

				const subtitleApi = getSubtitleApi(api);

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
				const { api } = yield* getJellyfinApi();
				const user = yield* currentUser.getCurrentUser();

				const { data } = yield* Effect.tryPromise({
					try: (signal) =>
						getMediaInfoApi(api).getPlaybackInfo(
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
				const { api } = yield* getJellyfinApi();
				const { mediaSource, sessionId } = yield* createPlaybackSession({
					itemId: itemId,
					mediaSourceId: mediaSourceId,
					audioStreamIndex: audioStreamIndex,
					subtitleStreamIndex: subtitleStreamIndex
				});

				if (mediaSource.TranscodingUrl) {
					return `${api.basePath}${mediaSource.TranscodingUrl}`;
				}

				const streamParams = new URLSearchParams({
					mediaSourceId: mediaSource?.Id || '',
					subtitleStreamIndex: subtitleStreamIndex?.toString() || '',
					audioStreamIndex: audioStreamIndex?.toString() || '',
					deviceId: api.deviceInfo.id,
					api_key: api.accessToken,
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

				const directPlayUrl = `${api.basePath}/Videos/${itemId}/stream?${streamParams.toString()}`;

				return directPlayUrl;
			});

			return JellyfinApi.of({
				getJellyfinApi,
				getItemInfo,
				getSubtitleTracks,
				createPlaybackSession,
				getDownloadStreamUrl
			});
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

export const AuthedJellyfinApiLayer = Layer.provideMerge(JellyfinApi.layer, AnonymousJellyfinApiLayer);

export class JellyfinApiError extends Schema.TaggedError<JellyfinApiError>()('JellyfinApiError', {
	message: Schema.String
}) {}

export class JellyfinServerNotFound extends Schema.TaggedError<JellyfinServerNotFound>()('JellyfinServerNotFound', {
	address: Schema.String
}) {}
