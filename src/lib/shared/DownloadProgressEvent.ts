import { Schema } from 'effect';
import { IntFileSize } from './FileSizes';

export const DownloadProgressEvent = Schema.Struct({
	progressPercentage: Schema.Number,
	totalSizeBytes: IntFileSize,
	downloadedBytes: IntFileSize,
	itemId: Schema.String
});

export const DownloadProgressEventJson = Schema.parseJson(DownloadProgressEvent);

export type DownloadProgressEvent = typeof DownloadProgressEvent.Type;
