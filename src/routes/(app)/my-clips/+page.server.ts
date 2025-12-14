import type { PageServerLoad } from './$types';
import { Effect, Exit, Layer } from 'effect';
import { ClipService } from '$lib/server/services/ClipService';
import { AuthenticatedUserLayer, serverRuntime } from '$lib/server/services/RuntimeLayers';
import { makeAuthenticatedRuntimeLayer } from '$lib/server/services/CurrentUser';
import { onFailure } from '$lib/load-utils';

const getClips = Effect.gen(function* () {
	const clipService = yield* ClipService;

	return yield* clipService.getAllUserClips();
});

export const load: PageServerLoad = async ({ locals }) => {
	const authedLayer = Layer.provideMerge(AuthenticatedUserLayer, makeAuthenticatedRuntimeLayer(locals));
	const authedRunnable = Effect.provide(getClips, authedLayer);
	const result = await serverRuntime.runPromiseExit(authedRunnable);

	return Exit.match(result, {
		onSuccess: (clips) => ({ clips }),
		onFailure: onFailure
	});
};
