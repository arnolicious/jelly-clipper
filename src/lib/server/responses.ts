import { Data, Effect, Layer, Match } from 'effect';
import { type SuperValidated } from 'sveltekit-superforms';
import type { UserAgnosticLayer } from './services/RuntimeLayers';
import type { NoCurrentUserError } from './services/UserSession';
import type { JellyClipperConfig } from './services/ConfigService';
import type { Tag } from 'effect/Context';
import type { JellyfinApi } from './services/JellyfinService';

export type ActionResponse = Redirect | OkAction<SuperValidated<Record<string, unknown>>>;
export type ActionResponseError =
	| BadRequest
	| Redirect
	| Forbidden
	| ServerError
	| FormValidationError
	| CustomInputError<Record<string, unknown>>;

export type LoaderResponse<T> = Redirect | OkLoader<T>;
export type LoaderResponseError =
	| BadRequest
	| Redirect
	| ServerError
	| Forbidden
	| Layer.Layer.Error<typeof UserAgnosticLayer>
	// Add common errors from services here
	| Effect.Effect.Error<ReturnType<Tag.Service<JellyClipperConfig>['getJellyfinUrl']>>
	| Effect.Effect.Error<ReturnType<Tag.Service<JellyfinApi>['getItemInfo']>>
	| Effect.Effect.Error<ReturnType<Tag.Service<JellyfinApi>['getClipInfo']>>
	| NoCurrentUserError;

export const matchActionResponse = () => Match.typeTags<ActionResponse>();
export const matchActionResponseError = () => Match.typeTags<ActionResponseError>();

export const matchLoaderResponse = <T>() => Match.typeTags<LoaderResponse<T>>();
export const matchLoaderResponseError = () => Match.typeTags<LoaderResponseError>();

export class OkLoader<T> extends Data.TaggedClass('OkLoader')<{
	readonly data: T;
}> {}

export class OkAction<T> extends Data.TaggedClass('OkAction')<{
	readonly form: T;
	readonly message?: string;
}> {}

export class Redirect extends Data.TaggedClass('Redirect')<{
	readonly to: string;
	readonly code: number;
	readonly message?: string;
}> {}

export class Forbidden extends Data.TaggedClass('Forbidden')<{
	readonly message: string;
}> {}

export class BadRequest extends Data.TaggedClass('BadRequest')<{
	readonly message: string;
}> {}

export class ServerError extends Data.TaggedClass('ServerError')<{
	readonly message: string;
}> {}

export class FormValidationError extends Data.TaggedClass('FormValidationError')<{
	readonly form: SuperValidated<Record<string, unknown>>;
}> {}

export class CustomInputError<T extends Record<string, unknown>> extends Data.TaggedClass('CustomInputError')<{
	readonly form: SuperValidated<T>;
	readonly field: keyof T;
	readonly message: string;
}> {}
