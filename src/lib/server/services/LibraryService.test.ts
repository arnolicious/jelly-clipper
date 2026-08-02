import { ConfigProvider, Effect, Exit, Logger, LogLevel } from 'effect';
import { describe, expect, it } from 'vitest';
import { translateJellyfinPath } from './LibraryService';

describe('LibraryService', () => {
	it.each([
		'[{ "from": "/media", "to": "/mnt/jellyfin-media" }]',
		'[{ "from": "/media/", "to": "/mnt/jellyfin-media" }]',
		'[{ "from": "/media", "to": "/mnt/jellyfin-media/" }]'
	])('should correctly map Jellyfin paths to local paths', (configStr) => {
		const testEffect = Effect.gen(function* () {
			const result = yield* translateJellyfinPath('/media/movies/movie.mp4');

			return result;
		}).pipe(
			Effect.provide(Logger.minimumLogLevel(LogLevel.Debug)),
			Effect.withConfigProvider(
				ConfigProvider.fromJson({
					JELLYFIN_PATH_MAPPINGS: configStr
				})
			)
		);

		const result = Effect.runSyncExit(testEffect);

		expect(Exit.isSuccess(result)).toBe(true);

		if (Exit.isSuccess(result)) {
			expect(result.value).toBe('/mnt/jellyfin-media/movies/movie.mp4');
		}
	});

	it.each([
		'[{ "from": "/media", "to": "/mnt/jellyfin-media" }]',
		'[{ "from": "/media/", "to": "/mnt/jellyfin-media" }]',
		'[{ "from": "/media", "to": "/mnt/jellyfin-media/" }]'
	])('should only match exact path segments', (configStr) => {
		const testEffect = Effect.gen(function* () {
			const result = yield* translateJellyfinPath('/media2/movies/movie.mp4');

			return result;
		}).pipe(
			Effect.provide(Logger.minimumLogLevel(LogLevel.Debug)),
			Effect.withConfigProvider(
				ConfigProvider.fromJson({
					JELLYFIN_PATH_MAPPINGS: configStr
				})
			)
		);

		const result = Effect.runSyncExit(testEffect);

		expect(Exit.isSuccess(result)).toBe(true);

		if (Exit.isSuccess(result)) {
			expect(result.value).toBe('/media2/movies/movie.mp4');
		}
	});

	it('maps the source path itself and selects the most specific matching mapping', () => {
		const testEffect = Effect.gen(function* () {
			const exactPath = yield* translateJellyfinPath('/media');
			const nestedPath = yield* translateJellyfinPath('/media/movies/movie.mp4');

			return { exactPath, nestedPath };
		}).pipe(
			Effect.withConfigProvider(
				ConfigProvider.fromJson({
					JELLYFIN_PATH_MAPPINGS: JSON.stringify([
						{ from: '/media', to: '/mnt/jellyfin-media' },
						{ from: '/media/movies', to: '/mnt/jellyfin-movies' }
					])
				})
			)
		);

		expect(Effect.runSync(testEffect)).toEqual({
			exactPath: '/mnt/jellyfin-media',
			nestedPath: '/mnt/jellyfin-movies/movie.mp4'
		});
	});

	it('maps paths below a root source mapping', () => {
		const testEffect = translateJellyfinPath('/media/movies/movie.mp4').pipe(
			Effect.withConfigProvider(
				ConfigProvider.fromJson({
					JELLYFIN_PATH_MAPPINGS: '[{ "from": "/", "to": "/mnt/jellyfin-root" }]'
				})
			)
		);

		expect(Effect.runSync(testEffect)).toBe('/mnt/jellyfin-root/media/movies/movie.mp4');
	});

	it.each([
		'[{ "from": "", "to": "/mnt/jellyfin-media" }]',
		'[{ "from": "media", "to": "/mnt/jellyfin-media" }]',
		'[{ "from": "/media", "to": "mnt/jellyfin-media" }]'
	])('ignores mappings with non-absolute paths', (configStr) => {
		const testEffect = translateJellyfinPath('/media/movies/movie.mp4').pipe(
			Effect.withConfigProvider(ConfigProvider.fromJson({ JELLYFIN_PATH_MAPPINGS: configStr }))
		);

		expect(Effect.runSync(testEffect)).toBe('/media/movies/movie.mp4');
	});
});
