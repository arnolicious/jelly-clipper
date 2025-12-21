import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { CreateClipBodySchema, CreateClipService } from '$lib/server/services/CreateClipService';
import { Effect, Exit, Layer, Logger, LogLevel, Schema } from 'effect';
import { AuthenticatedUserLayer, serverRuntime } from '$lib/server/services/RuntimeLayers';
import { makeAuthenticatedRuntimeLayerFromCookies } from '$lib/server/services/UserSession';

const createClipEffect = Effect.fn('createClipEffect')(function* (body: unknown) {
	const createClipService = yield* CreateClipService;

	const parsedBody = yield* Schema.decodeUnknown(CreateClipBodySchema)(body);

	return yield* createClipService.createClip(parsedBody);
});

export const POST: RequestHandler = async ({ params, request, cookies }) => {
	const body = await request.json();
	// Add sourceId
	body.sourceInfo.sourceId = params.sourceId;

	const authedLayer = Layer.provideMerge(AuthenticatedUserLayer, makeAuthenticatedRuntimeLayerFromCookies(cookies));
	const authedRunnable = Effect.provide(
		createClipEffect(body).pipe(Effect.withLogSpan('create-clip.POST'), Logger.withMinimumLogLevel(LogLevel.Debug)),
		authedLayer
	);

	const resultExit = await serverRuntime.runPromiseExit(authedRunnable);

	if (
		Exit.isFailure(resultExit) &&
		resultExit.cause._tag === 'Fail' &&
		resultExit.cause.error._tag === 'NoCurrentUserError'
	) {
		return error(401, `Unauthorized: ${resultExit.cause.error.message}`);
	}

	if (Exit.isFailure(resultExit)) {
		if (resultExit.cause._tag === 'Fail') {
			const errorObj = resultExit.cause.error;
			return error(500, `Failed to create clip: ${errorObj._tag} ${errorObj.message}`);
		}
		return error(500, `An unexpected error occurred: ${resultExit.cause.toString()}`);
	}

	return json({ clipId: resultExit.value }, { status: 201 });
};
