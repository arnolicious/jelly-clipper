import { Context, Effect, FiberMap, Layer, PubSub, Schema, Stream } from 'effect';
import { type RuntimeFiber } from 'effect/Fiber';
import { type DownloadProgressEvent } from '$lib/shared/DownloadProgressEvent';

export class DownloadManager extends Context.Tag('DownloadManager')<
	DownloadManager,
	{
		startDownloadFiber: <A, E, C>(
			itemId: string,
			effect: Effect.Effect<A, E, C>
		) => Effect.Effect<RuntimeFiber<A, E>, DownloadCurrentlyInProgressError, C>;
		cancelDownloadFiber: (itemId: string) => Effect.Effect<void, FiberNotFound>;
		getDownloadFiber: (itemId: string) => Effect.Effect<RuntimeFiber<unknown, unknown>, FiberNotFound>;
		// Pub-Sub for download progress could be added here
		publishDownloadEvent: (event: DownloadProgressEvent) => Effect.Effect<void>;
		getDownloadEventStreamForItem: (itemId: string) => Stream.Stream<DownloadProgressEvent>;
	}
>() {
	static readonly Default = Layer.scoped(
		DownloadManager,
		Effect.gen(function* () {
			yield* Effect.logInfo('🧵 Initializing DownloadManager Service');
			const fiberMap = yield* FiberMap.make<string>();
			const downloadPubSub = yield* PubSub.unbounded<DownloadProgressEvent>();

			return DownloadManager.of({
				startDownloadFiber: Effect.fn('DownloadManager.addDownloadFiber')(function* (itemId, effect) {
					// Check for existing fiber
					const existingFiber = yield* FiberMap.get(fiberMap, itemId).pipe(
						Effect.catchTag('NoSuchElementException', () => Effect.succeed(null))
					);
					if (existingFiber) {
						yield* Effect.logWarning(`Fiber already exists for itemId ${itemId}`);
						return existingFiber as RuntimeFiber<
							Effect.Effect.Success<typeof effect>,
							Effect.Effect.Error<typeof effect>
						>;
					}

					const downloadFiber = yield* Effect.forkDaemon(effect);

					yield* Effect.logInfo(`Adding fiber for itemId ${itemId}`);
					yield* FiberMap.set(fiberMap, itemId, downloadFiber);

					return downloadFiber;
				}),
				cancelDownloadFiber: Effect.fn('DownloadManager.cancelDownloadFiber')(function* (itemId) {
					yield* Effect.logInfo(`Attempting to cancel fiber for itemId ${itemId}`);
					const fiber = yield* FiberMap.has(fiberMap, itemId);
					if (!fiber) {
						yield* Effect.logWarning(`No fiber found for itemId ${itemId}`);
						return yield* new FiberNotFound({ message: `No fiber found for itemId ${itemId}` });
					}
					yield* Effect.logInfo(`Cancelling fiber for itemId ${itemId}`);
					yield* FiberMap.remove(fiberMap, itemId);
				}),
				getDownloadFiber: Effect.fn('DownloadManager.getDownloadFiber')(function* (itemId) {
					const fiber = yield* FiberMap.get(fiberMap, itemId).pipe(
						Effect.catchTag('NoSuchElementException', () =>
							Effect.fail(new FiberNotFound({ message: `No fiber found for itemId ${itemId}` }))
						)
					);
					yield* Effect.logInfo(`Retrieved fiber for itemId ${itemId}`);
					return fiber;
				}),
				publishDownloadEvent: Effect.fn('DownloadManager.publishDownloadEvent')(function* (event) {
					yield* Effect.logDebug(`Publishing download event for itemId ${event.itemId}`);
					yield* downloadPubSub.publish(event);
				}),
				getDownloadEventStreamForItem: (itemId) => {
					const fullStream = Stream.fromPubSub(downloadPubSub).pipe(
						Stream.tap(() => Effect.logDebug(`DownloadManager: Emitting download event for item ${itemId}`))
					);
					const filteredStream = fullStream
						.pipe(Stream.filter((event) => event.itemId === itemId))
						.pipe(
							Stream.tap(() => Effect.logDebug(`DownloadManager: Emitting filtered download event for item ${itemId}`))
						);
					return filteredStream;
				}
			});
		})
	);
}

class FiberNotFound extends Schema.TaggedError<FiberNotFound>()('FiberNotFound', {
	message: Schema.String
}) {}

class DownloadCurrentlyInProgressError extends Schema.TaggedError<DownloadCurrentlyInProgressError>()(
	'DownloadCurrentlyInProgressError',
	{}
) {}
