import type { PageServerLoad } from './$types';
import { Effect } from 'effect';
import { makeAuthenticatedRuntimeLayer } from '$lib/server/services/UserSession';
import { BadRequest, OkLoader } from '$lib/server/responses';
import { runLoader } from '$lib/server/load-utils';
import { InvalidSourceFormatError, JellyfinApi } from '$lib/server/services/JellyfinService';

export const load: PageServerLoad = (event) =>
	runLoader(
		Effect.gen(function* () {
			const api = yield* JellyfinApi;

			const decodedSource = decodeURIComponent(event.params.source);

			if (!decodedSource.includes('/')) {
				return yield* InvalidSourceFormatError.make({ source: decodedSource });
			}
			const url = new URL(decodedSource);
			const pathname = url.pathname;
			const sourceId = pathname.split('Items/')[1].split('/')[0];

			const clipInfo = yield* api.getClipInfo(sourceId);

			// if (clipInfo.audioStreams.length === 1) {
			// 	return new Redirect({
			// 		code: 307,
			// 		to: `/create-clip/${encodeURIComponent(decodedSource)}?audioStreamIndex=0`,
			// 		message: 'Only one audio stream, redirecting to create clip.'
			// 	});
			// }

			return new OkLoader({ data: clipInfo });
		}).pipe(
			Effect.provide(makeAuthenticatedRuntimeLayer(event.locals)),
			Effect.catchTag('InvalidSourceFormatError', (error) => Effect.fail(new BadRequest({ message: error.message })))
		),
		{ span: `/prepare-clip/[source]`, spanOptions: { attributes: { source: event.params.source } } }
	);
