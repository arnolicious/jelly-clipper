import { Schema } from 'effect';
import { BaseItemDtoSchema } from './BaseItemDto';

const MediaItemInfo = BaseItemDtoSchema.pipe(
	Schema.pick(
		'Name',
		'Id',
		'IsFolder',
		'Container',
		'ParentLogoItemId',
		'ParentBackdropItemId',
		'SeriesName',
		'SeriesId',
		'SeasonId',
		'SeasonName',
		'Type',
		'MediaType',
		'ChildCount',
		'ImageTags',
		'ImageBlurHashes',
		'UserData',
		'Status',
		'ChildCount'
	)
);

export const LatestMediaSchema = Schema.Struct({
	latestItems: Schema.Array(MediaItemInfo)
}).annotations({ identifier: 'LatestMedia' });

export type LatestMedia = typeof LatestMediaSchema.Type;

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
// export interface LatestMedia extends Schema.Struct.Type<typeof _LatestMediaSchema> {}

// export const LatestMediaSchema: Schema.Schema<LatestMedia> = _LatestMediaSchema;
