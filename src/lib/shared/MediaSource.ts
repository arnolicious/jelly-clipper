import { Schema } from 'effect';
import { MediaStreamSchema } from './MediaStream';
import type { MediaSourceInfo as OriginalMediaSourceInfo } from '@jellyfin/sdk/lib/generated-client/models';
import { IntFileSize } from '$lib/shared/FileSizes';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
type Reference = OriginalMediaSourceInfo;

const _MediaSourceSchema = Schema.Struct({
	Size: IntFileSize,
	Name: Schema.String,
	Id: Schema.String,
	MediaStreams: Schema.Array(MediaStreamSchema),
	TranscodingUrl: Schema.optional(Schema.String.pipe(Schema.NullOr))
}).annotations({ identifier: 'MediaSource' });

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface MediaSource extends Schema.Schema.Type<typeof _MediaSourceSchema> {}

// @ts-expect-error - Error with the Size Brand
export const MediaSourceSchema: Schema.Schema<MediaSource> = _MediaSourceSchema;
