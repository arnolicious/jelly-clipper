import { Context, Effect, Layer, Schema } from 'effect';
import { DatabaseError, DB } from './DatabaseService';
import { SETTING_KEYS, settings } from '../db/schema';
import { eq } from 'drizzle-orm';

export class JellyfinConfig extends Context.Tag('JellyfinConfig')<
	JellyfinConfig,
	{
		readonly getJellyfinUrl: () => Effect.Effect<string, JellyfinNotConfiguredError | DatabaseError>;
	}
>() {
	static readonly layer = Layer.effect(
		JellyfinConfig,
		Effect.gen(function* () {
			const db = yield* DB;

			const getJellyfinUrl = Effect.fn('JellyfinConfig.getJellyfinUrl')(function* () {
				const jellyfinUrlSetting = yield* db.runQuery((db) =>
					db.query.settings
						.findFirst({
							where: eq(settings.key, SETTING_KEYS.jellyfinUrl)
						})
						.execute()
				);
				if (!jellyfinUrlSetting?.value) {
					return yield* JellyfinNotConfiguredError.make();
				}
				return jellyfinUrlSetting.value;
			});

			return JellyfinConfig.of({ getJellyfinUrl });
		})
	);
}

const JellyfinConfigWithDbLayer = Layer.provideMerge(JellyfinConfig.layer, DB.layer);

export class JellyfinNotConfiguredError extends Schema.TaggedError<JellyfinNotConfiguredError>()(
	'JellyfinNotConfiguredError',
	{}
) {
	constructor() {
		super();
		this.message =
			'JellyClipper is not configured to connect to a Jellyfin server. Please set the Jellyfin URL in the settings.';
	}
}

export class JellyClipperConfig extends Context.Tag('JellyClipperConfig')<
	JellyClipperConfig,
	{
		readonly getJellyfinUrl: () => Effect.Effect<
			string,
			JellyfinNotConfiguredError | JellyClipperNotConfiguredError | DatabaseError
		>;
	}
>() {
	static readonly layer = Layer.effect(
		JellyClipperConfig,
		Effect.gen(function* () {
			const db = yield* DB;
			const jellyfinConfig = yield* JellyfinConfig;

			const getJellyfinUrl = Effect.fn('JellyClipperConfig.getJellyfinUrl')(function* () {
				const maybeJellyfinUrl = yield* jellyfinConfig.getJellyfinUrl();

				const dbUsers = yield* db.runQuery((db) => db.query.users.findMany().execute());

				if (dbUsers.length === 0) {
					return yield* JellyClipperNotConfiguredError.make();
				}
				return maybeJellyfinUrl;
			});

			return JellyClipperConfig.of({ getJellyfinUrl });
		})
	);
}

export const JellyClipperConfigWithDbLayer = Layer.provideMerge(JellyClipperConfig.layer, JellyfinConfigWithDbLayer);

export class JellyClipperNotConfiguredError extends Schema.TaggedError<JellyClipperNotConfiguredError>()(
	'JellyClipperNotConfiguredError',
	{}
) {
	constructor() {
		super({});
		this.message = 'Jellyfin is not configured in JellyClipper. Please add at least one user to proceed.';
	}
}
