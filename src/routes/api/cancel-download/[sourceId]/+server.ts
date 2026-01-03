import type { RequestHandler } from './$types';
import { Effect, Exit } from 'effect';
import { serverRuntime } from '$lib/server/services/RuntimeLayers';
import { DownloadManager } from '$lib/server/services/DownloadManagerService';

export const GET: RequestHandler = async (event) => {
	const sourceId = event.params.sourceId;

	const exit = await serverRuntime.runPromiseExit(
		Effect.gen(function* () {
			const fiberManager = yield* DownloadManager;

			yield* fiberManager.cancelDownloadFiber(sourceId);
		})
	);

	if (Exit.isFailure(exit)) {
		// console.error(`Failed to cancel download for sourceId ${sourceId}:`, exit.cause.toString());
		Effect.logError(`Failed to cancel download for sourceId ${sourceId}:`, exit.cause).pipe(serverRuntime.runSync);
		return new Response(null, { status: 500 });
	}

	return new Response(`Deleted fiber: ${exit.value}`, { status: 200 });
};
