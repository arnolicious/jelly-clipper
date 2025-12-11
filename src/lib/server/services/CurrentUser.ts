import { Context, Effect, Layer, Schema } from 'effect';

export class CurrentUser extends Context.Tag('CurrentUser')<
	CurrentUser,
	{
		getCurrentUser: () => Effect.Effect<User, NoCurrentUserError>;
	}
>() {}

export const makeAuthenticatedRuntimeLayer = (
	locals: App.Locals
): Layer.Layer<CurrentUser, NoCurrentUserError, never> => {
	return Layer.sync(CurrentUser, () => {
		const getCurrentUser = Effect.fn('CurrentUser.getCurrentUser')(function* () {
			const user = locals.user;
			if (!user) {
				return yield* NoCurrentUserError.make();
			}
			return User.make({
				accessToken: user.jellyfinAccessToken,
				id: user.jellyfinUserId,
				name: user.jellyfinUserName
			});
		});

		return CurrentUser.of({ getCurrentUser });
	});
};

export class User extends Schema.Class<User>('User')({
	accessToken: Schema.String,
	id: Schema.String,
	name: Schema.String
}) {}

export class NoCurrentUserError extends Schema.TaggedError<NoCurrentUserError>()('NoCurrentUserError', {}) {}
