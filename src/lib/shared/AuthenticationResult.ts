import { Schema } from 'effect';
import { UserDtoSchema } from './UserDto';

const _AuthenticationResult = Schema.Struct({
	User: UserDtoSchema,
	AccessToken: Schema.String
});

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface AuthenticationResult extends Schema.Schema.Type<typeof _AuthenticationResult> {}

export const AuthenticationResultSchema: Schema.Schema<AuthenticationResult> = _AuthenticationResult;
