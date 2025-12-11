import type { BaseItemDto } from '@jellyfin/sdk/lib/generated-client/models';
import { Context, Effect, Layer, Schema } from 'effect';
import { Jellyfin } from '@jellyfin/sdk';
import { getUserLibraryApi } from '@jellyfin/sdk/lib/utils/api';
import {
	JellyClipperConfig,
	JellyClipperConfigWithDbLayer,
	JellyClipperNotConfiguredError,
	JellyfinNotConfiguredError
} from './ConfigService';
import type { DatabaseError } from './DatabaseService';
import { CurrentUser, NoCurrentUserError } from './CurrentUser';

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
	}
>() {
	static readonly layer = Layer.effect(
		JellyfinApi,
		Effect.gen(function* () {
			const baseApiService = yield* JellyfinBaseApi;

			const getItemInfo = Effect.fn('JellyfinApi.getItemInfo')(function* (sourceId: string) {
				const jellyfinApi = yield* baseApiService.getJellyfinApi();
				const response = yield* Effect.tryPromise({
					try: () =>
						getUserLibraryApi(jellyfinApi).getItem({
							itemId: sourceId
						}),
					catch: (error) => JellyfinApiError.make({ message: (error as Error).message })
				});
				return response.data;
			});

			return JellyfinApi.of({ getItemInfo });
		})
	);
}

export const JellyfinApiDependenciesLayer = Layer.provideMerge(JellyfinApi.layer, JellyfinBaseApiWithConfigLayer);

export class JellyfinApiError extends Schema.TaggedError<JellyfinApiError>()('JellyfinApiError', {
	message: Schema.String
}) {}
