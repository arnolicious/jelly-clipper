import { Context, Effect, Layer, Schema } from 'effect';
import { DatabaseError, DatabaseService } from './DatabaseService';
import { SETTING_KEYS, settings } from '../db/schema';
import { eq } from 'drizzle-orm';

export class JellyClipperConfig extends Context.Tag('JellyClipperConfig')<
	JellyClipperConfig,
	{
		readonly getJellyfinUrl: () => Effect.Effect<string, JellyClipperNotConfiguredError | DatabaseError>;
	}
>() {
	static readonly Default = Layer.effect(
		JellyClipperConfig,
		Effect.gen(function* () {
			const db = yield* DatabaseService;

			const getJellyfinUrl = Effect.fn('JellyClipperConfig.getJellyfinUrl')(function* () {
				const maybeJellyfinUrl = yield* db.runQuery((db) =>
					db.query.settings
						.findFirst({
							where: eq(settings.key, SETTING_KEYS.jellyfinUrl)
						})
						.execute()
				);
				if (!maybeJellyfinUrl?.value) {
					return yield* JellyClipperNotConfiguredError.make();
				}

				const dbUsers = yield* db.runQuery((db) => db.query.users.findMany().execute());

				if (dbUsers.length === 0) {
					return yield* JellyClipperNotConfiguredError.make();
				}
				return maybeJellyfinUrl.value;
			});

			return JellyClipperConfig.of({ getJellyfinUrl });
		})
	);
}

// export const JellyClipperConfigWithDbLayer = Layer.provideMerge(JellyClipperConfig.Default, JellyfinConfigWithDbLayer);

export class JellyClipperNotConfiguredError extends Schema.TaggedError<JellyClipperNotConfiguredError>()(
	'JellyClipperNotConfiguredError',
	{}
) {}
