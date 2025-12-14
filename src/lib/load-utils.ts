import { Cause } from 'effect';
import { error } from '@sveltejs/kit';

export const onFailure = <TError extends { message: string }>(cause: Cause.Cause<TError>): never => {
	if (cause._tag === 'Fail') {
		return error(500, cause.error.message);
	}
	return error(500, 'An unexpected error occurred: ' + cause.toString());
};
