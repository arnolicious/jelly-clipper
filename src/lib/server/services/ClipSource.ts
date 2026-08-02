import { Effect, Schema } from 'effect';
import { JellyfinItemIdSchema } from '$lib/shared/JellyfinId';

export const parseClipSource = Effect.fn('ClipSource.parse')(function* (source: string) {
	const decodedSource = decodeURIComponent(source);

	if (!decodedSource.includes('/')) {
		return yield* Schema.decodeUnknown(JellyfinItemIdSchema)(decodedSource).pipe(
			Effect.mapError(() => new InvalidClipSourceError({ source: decodedSource }))
		);
	}

	const url = yield* Effect.try({
		try: () => new URL(decodedSource),
		catch: () => new InvalidClipSourceError({ source: decodedSource })
	});
	const itemId = url.pathname.split('Items/')[1]?.split('/')[0];
	return yield* Schema.decodeUnknown(JellyfinItemIdSchema)(itemId).pipe(
		Effect.mapError(() => new InvalidClipSourceError({ source: decodedSource }))
	);
});

export class InvalidClipSourceError extends Schema.TaggedError<InvalidClipSourceError>()('InvalidClipSourceError', {
	source: Schema.String
}) {}
