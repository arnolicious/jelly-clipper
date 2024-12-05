import { EventEmitter } from 'events';

export const downloadProgressEventEmitter = new EventEmitter();

export const DOWNLOAD_EVENTS = {
	START: 'start',
	PROGRESS_UPDATE: 'progress-update',
	END: 'end'
};

export type DownloadProgressTypes = {
	START: {
		totalSizeBytes: number;
	};
	PROGRESS_UPDATE: {
		percentage: number;
		totalSizeBytes: number;
		downloadedBytes: number;
	};
	// eslint-disable-next-line @typescript-eslint/no-empty-object-type
	END: {};
};

export type DownloadProgressDataType = DownloadProgressTypes[keyof DownloadProgressTypes];
