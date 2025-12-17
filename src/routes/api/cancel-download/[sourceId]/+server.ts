import type { RequestHandler } from './$types';
import { Effect, Exit } from 'effect';
import { serverRuntime } from '$lib/server/services/RuntimeLayers';
import { FiberManager } from '$lib/server/services/FiberManagerService';

export const GET: RequestHandler = async (event) => {
	const sourceId = event.params.sourceId;

	console.log(`Received request to cancel download for sourceId: ${sourceId}`);
	const exit = await serverRuntime.runPromiseExit(
		Effect.gen(function* () {
			const fiberManager = yield* FiberManager;

			yield* fiberManager.cancelDownloadFiber(sourceId);
			// .pipe(Effect.catchTag('FiberNotFound', (e) => Effect.logWarning(e.message)));

			// yield* Effect.log(`Successfully cancelled download fiber for sourceId: ${sourceId}`);
		})
	);

	if (Exit.isFailure(exit)) {
		console.error(`Failed to cancel download for sourceId ${sourceId}:`, exit.cause.toString());
		return new Response(null, { status: 500 });
	}

	return new Response(`Deleted fiber: ${exit.value}`, { status: 200 });
};
