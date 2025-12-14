import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { Effect, Exit, Layer } from 'effect';
import { InvalidSourceFormatError, ItemInfoService } from '$lib/server/services/ItemInfoService';
import { AuthenticatedUserLayer, serverRuntime } from '$lib/server/services/RuntimeLayers';
import { makeAuthenticatedRuntimeLayer } from '$lib/server/services/CurrentUser';

const prepareClip = Effect.fn('prepareClip')(function* (source: string) {
	const prepareClip = yield* ItemInfoService;

	const decodedSource = decodeURIComponent(source);

	if (!decodedSource.includes('/')) {
		return yield* InvalidSourceFormatError.make({ source: decodedSource });
	}
	const url = new URL(decodedSource);
	const pathname = url.pathname;
	const sourceId = pathname.split('Items/')[1].split('/')[0];

	const clipInfo = yield* prepareClip.getClipInfo(sourceId);
	return clipInfo;
});

export const load: PageServerLoad = async ({ locals, params }) => {
	const authedLayer = Layer.provideMerge(AuthenticatedUserLayer, makeAuthenticatedRuntimeLayer(locals));
	const authedRunnable = Effect.provide(prepareClip(params.source), authedLayer);
	const result = await serverRuntime.runPromiseExit(authedRunnable);

	return Exit.match(result, {
		onSuccess: (clipInfo) => clipInfo,
		onFailure: (cause) => {
			if (cause._tag === 'Fail') {
				if (cause.error._tag === 'InvalidSourceFormatError') {
					return error(400, `Invalid source format: ${cause.error.source}`);
				}
				return error(500, cause.error.message);
			}
			return error(500, 'An unexpected error occurred: ' + cause.toString());
		}
	});
};
