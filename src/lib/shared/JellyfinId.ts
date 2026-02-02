import { Schema } from 'effect';

export const JellyfinItemIdSchema = Schema.String.pipe(
	// 32 character hexadecimal string
	Schema.length(32)
);

export type JellyfinItemId = typeof JellyfinItemIdSchema.Type;
