import { produce, type Connection } from 'sveltekit-sse';
import type { RequestHandler } from './$types';
import { Effect, Schema, Stream } from 'effect';
import { serverRuntime } from '$lib/server/services/RuntimeLayers';
import { DownloadManager } from '$lib/server/services/DownloadManagerService';
import { DownloadProgressEventJson } from '$lib/shared/DownloadProgressEvent';

const consumeStream = Effect.fn('consumeStream')(function* (itemId: string, connection: Connection) {
	const downloadManager = yield* DownloadManager;

	const stream = downloadManager.getDownloadEventStreamForItem(itemId);
	yield* Effect.logDebug(`Client connected for download progress of itemId ${itemId}`);

	yield* stream.pipe(
		Stream.runForEachWhile((event) =>
			Effect.try({
				try: () => {
					const { error } = connection.emit('data', Schema.encodeSync(DownloadProgressEventJson)(event));
					if (error) {
						throw error;
					}
					if (event.progressPercentage === 100) {
						connection.lock.set(false); // Allow the stream to close
						return false; // Stop the stream consumption
					}
					return true;
				},
				catch: (error) => error
			}).pipe(
				Effect.catchAll((e) =>
					Effect.gen(function* () {
						yield* Effect.logWarning(`Error emitting download progress for itemId ${itemId}: ${e}`);
						return true; // Continue the stream on error
					})
				)
			)
		)
	);
});

export const POST: RequestHandler = (event) => {
	const itemId = event.params.itemId;
	return produce(async function start(connection) {
		await serverRuntime.runPromise(
			Effect.gen(function* () {
				yield* Effect.logDebug(`Download progress SSE stream started for itemId ${itemId}`);
				yield* serverRuntime.runFork(consumeStream(itemId, connection));
				yield* Effect.logDebug(`Download progress SSE stream ended for itemId ${itemId}`);
			})
		);
	});
};
