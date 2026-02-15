import type { PageServerLoad } from './$types';
import { runLoader } from '$lib/server/load-utils';
import { Effect } from 'effect';
import { JellyClipperConfig } from '$lib/server/services/ConfigService';
import { OkLoader } from '$lib/server/responses';
import { JellyfinApi } from '$lib/server/services/JellyfinService';
import { makeAuthenticatedRuntimeLayer } from '$lib/server/services/UserSession';

export const load: PageServerLoad = async (event) =>
	runLoader(
		Effect.gen(function* () {
			const config = yield* JellyClipperConfig;
			const jellyfinUrl = yield* config.getJellyfinUrl();
			const api = yield* JellyfinApi;

			const { latestItems } = yield* api.getLatestWatchedMedia();

			return new OkLoader({ data: { serverAddress: jellyfinUrl, latestItems } });
		}).pipe(Effect.provide(makeAuthenticatedRuntimeLayer(event.locals))),
		'/create-clip'
	);
