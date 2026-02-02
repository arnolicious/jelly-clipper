import type { PageServerLoad } from './$types';
import { Effect } from 'effect';
import { ClipService } from '$lib/server/services/ClipService';
import { makeAuthenticatedRuntimeLayer } from '$lib/server/services/UserSession';
import { runLoader } from '$lib/server/load-utils';
import { OkLoader } from '$lib/server/responses';

export const load: PageServerLoad = (event) =>
	runLoader(
		Effect.gen(function* () {
			const clipService = yield* ClipService;

			const clips = yield* clipService.getAllUserClips();

			return new OkLoader({ data: { clips } });
		}).pipe(Effect.provide(makeAuthenticatedRuntimeLayer(event.locals))),
		'/my-clips'
	);
