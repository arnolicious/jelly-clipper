import type { PageServerLoad } from './$types';
import { Effect, Schema } from 'effect';
import { makeAuthenticatedRuntimeLayer } from '$lib/server/services/UserSession';
import { BadRequest, OkLoader, Redirect } from '$lib/server/responses';
import { runLoader } from '$lib/server/load-utils';
import { InvalidSourceFormatError, JellyfinApi } from '$lib/server/services/JellyfinService';
import { JellyfinItemIdSchema } from '$lib/shared/JellyfinId';

export const load: PageServerLoad = (event) =>
	runLoader(
		Effect.gen(function* () {
			const api = yield* JellyfinApi;

			let itemId: string;
			const decodedSource = decodeURIComponent(event.params.source);

			if (!decodedSource.includes('/')) {
				const itemIdParsed = yield* Schema.decodeUnknown(JellyfinItemIdSchema)(decodedSource).pipe(
					Effect.catchAll(() => Effect.fail(new InvalidSourceFormatError({ source: decodedSource })))
				);
				itemId = itemIdParsed;
			} else {
				const url = new URL(decodedSource);
				const pathname = url.pathname;
				itemId = pathname.split('Items/')[1].split('/')[0];
			}

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
			Effect.catchTag('InvalidSourceFormatError', (error) => Effect.fail(new BadRequest({ message: error.message })))
		),
		{ span: `/prepare-clip/[source]`, spanOptions: { attributes: { source: event.params.source } } }
	);
