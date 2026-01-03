import { describe, it, expect } from 'vitest';
import { Effect, Stream, Exit, Fiber } from 'effect';
import { DownloadManager } from './DownloadManagerService';
import { DownloadProgressEvent } from '$lib/shared/DownloadProgressEvent';
import { IntFileSize } from '$lib/shared/FileSizes';

describe('DownloadManagerService', () => {
	describe('Fiber Management', () => {
		it('should successfully start a download fiber for an item', async () => {
			const testEffect = Effect.gen(function* () {
				const manager = yield* DownloadManager;
				const mockDownload = Effect.succeed('download-completed');

				const fiber = yield* manager.startDownloadFiber('item-123', mockDownload);
				const result = yield* fiber.await;

				expect(Exit.isSuccess(result)).toBe(true);
				if (Exit.isSuccess(result)) {
					expect(result.value).toBe('download-completed');
				}
			});

			const result = await Effect.runPromise(testEffect.pipe(Effect.provide(DownloadManager.Default)));
			expect(result).toBeUndefined();
		});

		it('should return existing fiber when attempting parallel download of same item', async () => {
			const testEffect = Effect.gen(function* () {
				const manager = yield* DownloadManager;

				// Create a long-running download
				const longRunningDownload = Effect.sleep('100 millis').pipe(Effect.map(() => 'completed'));

				// Start first download
				const fiber1 = yield* manager.startDownloadFiber('item-123', longRunningDownload);

				// Attempt to start second download of same item
				const fiber2 = yield* manager.startDownloadFiber('item-123', longRunningDownload);

				// Both should be the same fiber
				expect(fiber1.id()).toBe(fiber2.id());

				// Clean up
				yield* manager.cancelDownloadFiber('item-123');
			});

			await Effect.runPromise(testEffect.pipe(Effect.provide(DownloadManager.Default)));
		});

		it('should allow parallel downloads of different items', async () => {
			const testEffect = Effect.gen(function* () {
				const manager = yield* DownloadManager;

				const download1 = Effect.sleep('50 millis').pipe(Effect.map(() => 'item1-done'));
				const download2 = Effect.sleep('50 millis').pipe(Effect.map(() => 'item2-done'));
				const download3 = Effect.sleep('50 millis').pipe(Effect.map(() => 'item3-done'));

				// Start multiple downloads in parallel
				const fiber1 = yield* manager.startDownloadFiber('item-1', download1);
				const fiber2 = yield* manager.startDownloadFiber('item-2', download2);
				const fiber3 = yield* manager.startDownloadFiber('item-3', download3);

				// All fibers should have different IDs
				expect(fiber1.id()).not.toBe(fiber2.id());
				expect(fiber2.id()).not.toBe(fiber3.id());
				expect(fiber1.id()).not.toBe(fiber3.id());

				// Wait for all to complete
				const results = yield* Effect.all([fiber1.await, fiber2.await, fiber3.await]);

				expect(results.every(Exit.isSuccess)).toBe(true);
			});

			await Effect.runPromise(testEffect.pipe(Effect.provide(DownloadManager.Default)));
		});

		it('should retrieve an existing fiber by itemId', async () => {
			const testEffect = Effect.gen(function* () {
				const manager = yield* DownloadManager;

				const mockDownload = Effect.sleep('100 millis').pipe(Effect.map(() => 'done'));
				const originalFiber = yield* manager.startDownloadFiber('item-456', mockDownload);

				// Retrieve the fiber
				const retrievedFiber = yield* manager.getDownloadFiber('item-456');

				expect(originalFiber.id()).toBe(retrievedFiber.id());

				// Clean up
				yield* manager.cancelDownloadFiber('item-456');
			});

			await Effect.runPromise(testEffect.pipe(Effect.provide(DownloadManager.Default)));
		});

		it('should fail when retrieving non-existent fiber', async () => {
			const testEffect = Effect.gen(function* () {
				const manager = yield* DownloadManager;

				const result = yield* manager.getDownloadFiber('non-existent-item').pipe(Effect.flip);

				expect(result._tag).toBe('FiberNotFound');
			});

			await Effect.runPromise(testEffect.pipe(Effect.provide(DownloadManager.Default)));
		});
	});

	describe('Fiber Cancellation', () => {
		it('should successfully cancel a download fiber', async () => {
			const testEffect = Effect.gen(function* () {
				const manager = yield* DownloadManager;

				// Start a long-running download
				const longDownload = Effect.sleep('5 seconds').pipe(Effect.map(() => 'completed'));
				yield* manager.startDownloadFiber('item-789', longDownload);

				// Cancel it
				yield* manager.cancelDownloadFiber('item-789');

				// Try to retrieve it - should fail
				const result = yield* manager.getDownloadFiber('item-789').pipe(Effect.flip);

				expect(result._tag).toBe('FiberNotFound');
			});

			await Effect.runPromise(testEffect.pipe(Effect.provide(DownloadManager.Default)));
		});

		it('should handle cancellation of non-existent fiber gracefully', async () => {
			const testEffect = Effect.gen(function* () {
				const manager = yield* DownloadManager;

				// This should not throw, just return the error
				const result = yield* manager.cancelDownloadFiber('non-existent').pipe(Effect.flip);

				expect(result._tag).toBe('FiberNotFound');
			});

			await Effect.runPromise(testEffect.pipe(Effect.provide(DownloadManager.Default)));
		});

		it('should allow starting new fiber after cancellation', async () => {
			const testEffect = Effect.gen(function* () {
				const manager = yield* DownloadManager;

				// Start and cancel first download
				const download1 = Effect.sleep('100 millis').pipe(Effect.map(() => 'first'));
				const fiber1 = yield* manager.startDownloadFiber('item-reuse', download1);
				yield* manager.cancelDownloadFiber('item-reuse');

				// Start new download with same itemId
				const download2 = Effect.sleep('100 millis').pipe(Effect.map(() => 'second'));
				const fiber2 = yield* manager.startDownloadFiber('item-reuse', download2);

				// Should be different fibers
				expect(fiber1.id()).not.toBe(fiber2.id());

				const result = yield* fiber2.await;
				expect(Exit.isSuccess(result)).toBe(true);
				if (Exit.isSuccess(result)) {
					expect(result.value).toBe('second');
				}
			});

			await Effect.runPromise(testEffect.pipe(Effect.provide(DownloadManager.Default)));
		});
	});

	describe('PubSub Event Publishing', () => {
		it('should successfully publish download progress events', async () => {
			const testEffect = Effect.gen(function* () {
				const manager = yield* DownloadManager;

				const testEvent = DownloadProgressEvent.make({
					itemId: 'item-pub-1',
					downloadedBytes: IntFileSize.make(5000000),
					totalSizeBytes: IntFileSize.make(10000000),
					progressPercentage: 50
				});

				// Publishing should succeed
				yield* manager.publishDownloadEvent(testEvent);
			});

			await Effect.runPromise(testEffect.pipe(Effect.provide(DownloadManager.Default)));
		});

		it('should publish multiple events without error', async () => {
			const testEffect = Effect.gen(function* () {
				const manager = yield* DownloadManager;

				// Publish multiple events in sequence
				for (let i = 0; i <= 100; i += 10) {
					const event = DownloadProgressEvent.make({
						itemId: 'item-pub-2',
						downloadedBytes: IntFileSize.make(i * 100000),
						totalSizeBytes: IntFileSize.make(10000000),
						progressPercentage: i
					});
					yield* manager.publishDownloadEvent(event);
				}
			});

			await Effect.runPromise(testEffect.pipe(Effect.provide(DownloadManager.Default)));
		});
	});

	describe('Event Stream Filtering', () => {
		it('should only return events for the specific item', async () => {
			const testEffect = Effect.gen(function* () {
				const manager = yield* DownloadManager;

				const stream = manager.getDownloadEventStreamForItem('item-filter-1');

				// Start collecting events in background
				const collectedEvents: DownloadProgressEvent[] = [];
				const collectFiber = yield* Stream.runForEach(stream, (event) =>
					Effect.sync(() => collectedEvents.push(event))
				).pipe(Effect.fork);

				// Give stream time to set up
				yield* Effect.sleep('10 millis');

				// Publish events for different items
				yield* manager.publishDownloadEvent(
					DownloadProgressEvent.make({
						itemId: 'item-filter-1',
						downloadedBytes: IntFileSize.make(1000),
						totalSizeBytes: IntFileSize.make(10000),
						progressPercentage: 10
					})
				);

				yield* manager.publishDownloadEvent(
					DownloadProgressEvent.make({
						itemId: 'item-filter-2',
						downloadedBytes: IntFileSize.make(2000),
						totalSizeBytes: IntFileSize.make(10000),
						progressPercentage: 20
					})
				);

				yield* manager.publishDownloadEvent(
					DownloadProgressEvent.make({
						itemId: 'item-filter-1',
						downloadedBytes: IntFileSize.make(5000),
						totalSizeBytes: IntFileSize.make(10000),
						progressPercentage: 50
					})
				);

				yield* manager.publishDownloadEvent(
					DownloadProgressEvent.make({
						itemId: 'item-filter-3',
						downloadedBytes: IntFileSize.make(3000),
						totalSizeBytes: IntFileSize.make(10000),
						progressPercentage: 30
					})
				);

				// Wait a bit for events to propagate
				yield* Effect.sleep('50 millis');

				// Stop collecting
				yield* Fiber.interrupt(collectFiber);
				// Should only have events for item-filter-1
				expect(collectedEvents.length).toBe(2);
				expect(collectedEvents.every((e) => e.itemId === 'item-filter-1')).toBe(true);
				expect(collectedEvents[0].progressPercentage).toBe(10);
				expect(collectedEvents[1].progressPercentage).toBe(50);
			});

			await Effect.runPromise(testEffect.pipe(Effect.provide(DownloadManager.Default)));
		});

		it('should handle multiple concurrent subscribers', async () => {
			const testEffect = Effect.gen(function* () {
				const manager = yield* DownloadManager;

				const stream1 = manager.getDownloadEventStreamForItem('item-multi');
				const stream2 = manager.getDownloadEventStreamForItem('item-multi');

				const events1: DownloadProgressEvent[] = [];
				const events2: DownloadProgressEvent[] = [];

				// Start both subscribers
				const fiber1 = yield* Stream.runForEach(stream1, (event) => Effect.sync(() => events1.push(event))).pipe(
					Effect.fork
				);

				const fiber2 = yield* Stream.runForEach(stream2, (event) => Effect.sync(() => events2.push(event))).pipe(
					Effect.fork
				);

				yield* Effect.sleep('10 millis');

				// Publish events
				const event1 = DownloadProgressEvent.make({
					itemId: 'item-multi',
					downloadedBytes: IntFileSize.make(2500),
					totalSizeBytes: IntFileSize.make(10000),
					progressPercentage: 25
				});

				const event2 = DownloadProgressEvent.make({
					itemId: 'item-multi',
					downloadedBytes: IntFileSize.make(7500),
					totalSizeBytes: IntFileSize.make(10000),
					progressPercentage: 75
				});

				yield* manager.publishDownloadEvent(event1);
				yield* manager.publishDownloadEvent(event2);

				yield* Effect.sleep('50 millis');

				yield* Fiber.interrupt(fiber1);
				yield* Fiber.interrupt(fiber2);

				// Both subscribers should have received both events
				expect(events1.length).toBe(2);
				expect(events2.length).toBe(2);
				expect(events1[0].progressPercentage).toBe(25);
				expect(events1[1].progressPercentage).toBe(75);
				expect(events2[0].progressPercentage).toBe(25);
				expect(events2[1].progressPercentage).toBe(75);
			});

			await Effect.runPromise(testEffect.pipe(Effect.provide(DownloadManager.Default)));
		});

		it('should not receive events after stream interruption', async () => {
			const testEffect = Effect.gen(function* () {
				const manager = yield* DownloadManager;

				const stream = manager.getDownloadEventStreamForItem('item-interrupt');
				const events: DownloadProgressEvent[] = [];

				const fiber = yield* Stream.runForEach(stream, (event) => Effect.sync(() => events.push(event))).pipe(
					Effect.fork
				);

				yield* Effect.sleep('10 millis');

				// Publish first event
				yield* manager.publishDownloadEvent(
					DownloadProgressEvent.make({
						itemId: 'item-interrupt',
						downloadedBytes: IntFileSize.make(3000),
						totalSizeBytes: IntFileSize.make(10000),
						progressPercentage: 30
					})
				);

				yield* Effect.sleep('20 millis');

				// Interrupt the stream
				yield* Fiber.interrupt(fiber);
				yield* Effect.sleep('20 millis');

				// Publish second event - should not be received
				yield* manager.publishDownloadEvent(
					DownloadProgressEvent.make({
						itemId: 'item-interrupt',
						downloadedBytes: IntFileSize.make(9000),
						totalSizeBytes: IntFileSize.make(10000),
						progressPercentage: 90
					})
				);

				yield* Effect.sleep('20 millis');

				// Should only have received the first event
				expect(events.length).toBe(1);
				expect(events[0].progressPercentage).toBe(30);
			});

			await Effect.runPromise(testEffect.pipe(Effect.provide(DownloadManager.Default)));
		});
	});

	describe('Integration Scenarios', () => {
		it('should handle complete download lifecycle with events', async () => {
			const testEffect = Effect.gen(function* () {
				const manager = yield* DownloadManager;

				const itemId = 'item-lifecycle';
				const events: DownloadProgressEvent[] = [];

				// Subscribe to events
				const stream = manager.getDownloadEventStreamForItem(itemId);
				const streamFiber = yield* Stream.runForEach(stream, (event) => Effect.sync(() => events.push(event))).pipe(
					Effect.fork
				);

				yield* Effect.sleep('10 millis');

				// Simulate a download that publishes progress
				const downloadEffect = Effect.gen(function* () {
					for (let progress = 0; progress <= 100; progress += 25) {
						yield* manager.publishDownloadEvent(
							DownloadProgressEvent.make({
								itemId,
								downloadedBytes: IntFileSize.make(progress * 10000),
								totalSizeBytes: IntFileSize.make(1000000),
								progressPercentage: progress
							})
						);
						yield* Effect.sleep('10 millis');
					}
					return 'download-complete';
				});

				// Start the download
				const downloadFiber = yield* manager.startDownloadFiber(itemId, downloadEffect);

				// Wait for completion
				const result = yield* downloadFiber.await;

				yield* Effect.sleep('20 millis');

				// Clean up
				yield* Fiber.interrupt(streamFiber);
				expect(Exit.isSuccess(result)).toBe(true);
				expect(events.length).toBe(5);
				expect(events[0].progressPercentage).toBe(0);
				expect(events[4].progressPercentage).toBe(100);
			});

			await Effect.runPromise(testEffect.pipe(Effect.provide(DownloadManager.Default)));
		});

		it('should isolate errors from one download to another', async () => {
			const testEffect = Effect.gen(function* () {
				const manager = yield* DownloadManager;

				const successDownload = Effect.sleep('50 millis').pipe(Effect.map(() => 'success'));
				const failingDownload = Effect.sleep('30 millis').pipe(Effect.flatMap(() => Effect.fail('download-error')));

				// Start both downloads
				const successFiber = yield* manager.startDownloadFiber('item-success', successDownload);
				const failFiber = yield* manager.startDownloadFiber('item-fail', failingDownload);

				// Wait for both
				const [successResult, failResult] = yield* Effect.all([successFiber.await, failFiber.await]);

				// Success should succeed
				expect(Exit.isSuccess(successResult)).toBe(true);
				if (Exit.isSuccess(successResult)) {
					expect(successResult.value).toBe('success');
				}

				// Fail should fail
				expect(Exit.isFailure(failResult)).toBe(true);
				if (Exit.isFailure(failResult)) {
					expect(failResult.cause._tag).toBe('Fail');
				}
			});

			await Effect.runPromise(testEffect.pipe(Effect.provide(DownloadManager.Default)));
		});
	});
});
