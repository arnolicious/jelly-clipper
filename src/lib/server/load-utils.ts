import { Cause, Context, Effect, Exit, Layer, pipe } from 'effect';
import { error, redirect, type RequestEvent, fail } from '@sveltejs/kit';
import {
	type ActionResponse,
	type ActionResponseError,
	type LoaderResponse,
	type LoaderResponseError,
	matchActionResponse,
	matchActionResponseError,
	matchLoaderResponse,
	matchLoaderResponseError
} from './responses';
import { setError } from 'sveltekit-superforms';
import { serverRuntime, UserAgnosticLayer } from './services/RuntimeLayers';
import type { SpanOptions } from 'effect/Tracer';

export const onFailure = <TError extends { message: string }>(
	cause: Cause.Cause<TError>
): never => {
	if (cause._tag === 'Fail') {
		return error(500, cause.error.message);
	}
	return error(500, 'An unexpected error occurred: ' + cause.toString());
};

type ServerRuntimeSuccess = Layer.Layer.Success<typeof UserAgnosticLayer>;

// From https://github.com/mateoroldos/sveltekit-effect-template/blob/main/src/lib/server/run-loader.ts
export const runLoader = <T>(
	self: Effect.Effect<LoaderResponse<T>, LoaderResponseError, ServerRuntimeSuccess>,
	span?: { span: string; spanOptions: SpanOptions } | string
) => {
	const runnable = pipe(
		self,
		Effect.tap(() => Effect.log('🚀 Running loader')),
		(_) =>
			span === undefined
				? _
				: typeof span === 'string'
					? Effect.withSpan(`load:${span}`)(_).pipe(Effect.withLogSpan(`load:${span}`))
					: Effect.withSpan(
							`load:${span.span}`,
							span.spanOptions
						)(_).pipe(Effect.withLogSpan(`load:${span.span}`))
	);

	return serverRuntime.runPromiseExit(runnable).then(
		Exit.match({
			onFailure: async (cause) => {
				await Effect.logError('🚨 Error in loader', cause).pipe(serverRuntime.runPromise);
				if (cause._tag === 'Fail') {
					return pipe(
						cause.error,
						matchLoaderResponseError()({
							Redirect: ({ to }) => {
								return redirect(307, to);
							},
							BadRequest: ({ message }) => {
								return error(400, message);
							},
							ServerError: ({ message }) => {
								return error(500, message);
							},
							Forbidden: ({ message }) => {
								return error(401, message);
							},
							NoCurrentUserError: ({ message }) => {
								return error(401, message);
							},
							ConfigError: ({ message }) => {
								return error(500, `Configuration error: ${message}`);
							},
							DatabaseError: ({ message }) => {
								return error(500, `Database error: ${message}`);
							},
							JellyClipperNotConfiguredError: () => {
								return redirect(302, '/setup');
							},
							JellyfinApiError: ({ message }) => {
								return error(500, `Jellyfin API error: ${message}`);
							},
							MultipleMediaSourcesError: ({ message }) => {
								return error(500, `Multiple media sources found: ${message}`);
							},
							NoMediaSourceError: ({ message }) => {
								return error(500, `No media source found: ${message}`);
							},
							NoAudioStreamsError: ({ message }) => {
								return error(500, `No audio streams found: ${message}`);
							},
							ParseError: ({ message }) => {
								return error(500, `Schema parse error: ${message}`);
							}
						})
					);
				}

				return error(500);
			},
			onSuccess: matchLoaderResponse<T>()({
				OkLoader: ({ data }) => {
					return { ...data };
				},
				Redirect: ({ to, code }) => {
					return redirect(code, to);
				}
			})
		})
	);
};

export const ActionArgs = Context.GenericTag<RequestEvent>('ActionArgs');

type ActionEffect = Effect.Effect<ActionResponse, ActionResponseError, RequestEvent>;

export const runAction = (self: ActionEffect) => (event: RequestEvent) => {
	const runnable = pipe(
		self,
		Effect.tap(() => Effect.log('🚀 Running action')),
		Effect.provideService(ActionArgs, event)
	);

	return Effect.runPromiseExit(runnable).then(
		Exit.match({
			onFailure: (cause) => {
				Effect.logError('🚨 Error in action', cause).pipe(serverRuntime.runPromise);
				if (cause._tag === 'Fail') {
					return pipe(
						cause.error,
						matchActionResponseError()({
							Redirect: ({ to, code }) => {
								return redirect(code, to);
							},
							BadRequest: () => {
								return fail(400);
							},
							ServerError: () => {
								return fail(500);
							},
							Forbidden: () => {
								return fail(401);
							},
							FormValidationError: ({ form }) => {
								return fail(400, form);
							},
							CustomInputError: ({ form, field, message }) => {
								return setError(form, field, message);
							}
						})
					);
				}

				return error(500);
			},
			onSuccess: matchActionResponse()({
				OkAction: ({ form }) => {
					return { form };
				},
				Redirect: ({ to, code, message }) => {
					if (message) {
						return redirect(code, to);
					} else {
						return redirect(code, to);
					}
				}
			})
		})
	);
};
