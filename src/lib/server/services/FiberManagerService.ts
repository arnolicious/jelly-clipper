import { Context, Effect, FiberMap, Layer, Schema } from 'effect';
import { type RuntimeFiber } from 'effect/Fiber';

export class FiberManager extends Context.Tag('FiberManager')<
	FiberManager,
	{
		registerDownloadFiber: <A, E>(
			itemId: string,
			fiber: RuntimeFiber<A, E>
		) => Effect.Effect<void, DownloadCurrentlyInProgressError>;
		cancelDownloadFiber: (itemId: string) => Effect.Effect<void, FiberNotFound>;
		getDownloadFiber: (itemId: string) => Effect.Effect<RuntimeFiber<unknown, unknown>, FiberNotFound>;
	}
>() {
	static readonly Default = Layer.scoped(
		FiberManager,
		Effect.gen(function* () {
			yield* Effect.logInfo('🧵 Initializing FiberManager Service');
			const fiberMap = yield* FiberMap.make<string>();

			return FiberManager.of({
				registerDownloadFiber: Effect.fn('FiberManager.addDownloadFiber')(function* (itemId, fiber) {
					// Check for existing fiber
					const hasExistingFiber = yield* FiberMap.has(fiberMap, itemId);
					if (hasExistingFiber) {
						yield* Effect.logWarning(`Fiber already exists for itemId ${itemId}`);
						return yield* new DownloadCurrentlyInProgressError({
							message: `Download already in progress for itemId ${itemId}`
						});
					}

					yield* Effect.logInfo(`Adding fiber for itemId ${itemId}`);
					yield* FiberMap.set(fiberMap, itemId, fiber);
					const hasFiber = yield* FiberMap.has(fiberMap, itemId);
					yield* Effect.logInfo(`Has fiber? ${hasFiber}`);
				}),
				cancelDownloadFiber: Effect.fn('FiberManager.cancelDownloadFiber')(function* (itemId) {
					yield* Effect.logInfo(`Attempting to cancel fiber for itemId ${itemId}`);
					const fiber = yield* FiberMap.has(fiberMap, itemId);
					if (!fiber) {
						yield* Effect.logWarning(`No fiber found for itemId ${itemId}`);
						return yield* new FiberNotFound({ message: `No fiber found for itemId ${itemId}` });
					}
					yield* Effect.logInfo(`Cancelling fiber for itemId ${itemId}`);
					yield* FiberMap.remove(fiberMap, itemId);
				}),
				getDownloadFiber: Effect.fn('FiberManager.hasDownloadFiber')(function* (itemId) {
					const fiber = yield* FiberMap.get(fiberMap, itemId).pipe(
						Effect.catchTag('NoSuchElementException', () =>
							Effect.fail(new FiberNotFound({ message: `No fiber found for itemId ${itemId}` }))
						)
					);
					yield* Effect.logInfo(`Retrieved fiber for itemId ${itemId}`);
					return fiber;
				})
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
