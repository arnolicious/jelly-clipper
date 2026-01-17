import { Schema } from 'effect';

const _UserDto = Schema.Struct({
	Name: Schema.String,
	Id: Schema.String
});

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface UserDto extends Schema.Schema.Type<typeof _UserDto> {}

export const UserDtoSchema: Schema.Schema<UserDto> = _UserDto;
