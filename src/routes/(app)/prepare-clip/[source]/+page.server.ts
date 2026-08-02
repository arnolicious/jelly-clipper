import type { PageServerLoad } from './$types';
import { Effect } from 'effect';
import { makeAuthenticatedRuntimeLayer } from '$lib/server/services/UserSession';
import { BadRequest, OkLoader, Redirect } from '$lib/server/responses';
import { runLoader } from '$lib/server/load-utils';
import { JellyfinApi } from '$lib/server/services/JellyfinService';
import { parseClipSource } from '$lib/server/services/ClipSource';

export const load: PageServerLoad = (event) =>
	runLoader(
		Effect.gen(function* () {
			const api = yield* JellyfinApi;

			const itemId = yield* parseClipSource(event.params.source);
			const decodedSource = decodeURIComponent(event.params.source);

			const clipInfo = yield* api.getClipInfo(itemId);

			if (clipInfo.audioStreams.length === 1) {
				return new Redirect({
					code: 307,
					to: `/create-clip/${encodeURIComponent(decodedSource)}?audioStreamIndex=0`,
					message: 'Only one audio stream, redirecting to create clip.'
				});
			}

			return new OkLoader({ data: clipInfo });
		}).pipe(
			Effect.provide(makeAuthenticatedRuntimeLayer(event.locals)),
			Effect.catchTag('InvalidClipSourceError', () => Effect.fail(new BadRequest({ message: 'Invalid clip source' })))
		),
		{ span: `/prepare-clip/[source]`, spanOptions: { attributes: { source: event.params.source } } }
	);
