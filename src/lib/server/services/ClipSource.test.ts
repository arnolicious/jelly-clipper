import { Effect, Exit } from 'effect';
import { describe, expect, it } from 'vitest';
import { parseClipSource } from './ClipSource';

const itemId = '8b5eb2e7597a0e8693931af169c42883';

describe('parseClipSource', () => {
	it('accepts a Jellyfin item ID', () => {
		expect(Effect.runSync(parseClipSource(itemId))).toBe(itemId);
	});

	it('extracts an item ID from a copied Jellyfin URL', () => {
		const source = encodeURIComponent(`https://jellyfin.example.test/Items/${itemId}/Download?api_key=secret`);

		expect(Effect.runSync(parseClipSource(source))).toBe(itemId);
	});

	it('rejects a URL without a valid item ID', () => {
		const result = Effect.runSyncExit(parseClipSource('https://jellyfin.example.test/Items/not-an-item'));

		expect(Exit.isFailure(result)).toBe(true);
	});
});
