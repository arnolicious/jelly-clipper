import { Context, Effect, Layer } from 'effect';
import { CurrentUser, NoCurrentUserError } from './CurrentUser.ts';
import { DatabaseError, DB } from './DatabaseService.ts';
import { eq } from 'drizzle-orm';
import { clips } from '../db/schema.js';
import type { Clip } from '$lib/types.ts';

export class ClipService extends Context.Tag('ClipService')<
	ClipService,
	{
		getAllUserClips: () => Effect.Effect<Clip[], DatabaseError | NoCurrentUserError>;
	}
>() {
	static readonly layer = Layer.effect(
		ClipService,
		Effect.gen(function* () {
			const currentUser = yield* CurrentUser;
			const db = yield* DB;

			const getAllUserClips = Effect.fn('ClipService.getAllUserClips')(function* () {
				const user = yield* currentUser.getCurrentUser();

				const userClips: Clip[] = yield* db.runQuery((db) =>
					db.query.clips
						.findMany({
							where: eq(clips.userId, user.id)
						})
						.execute()
				);
				yield* Effect.logDebug(`Fetched ${userClips.length} clips for user ${user.id}`);
				return userClips;
			});

			return ClipService.of({ getAllUserClips });
		})
	);
}
