import { produce } from 'sveltekit-sse';
import type { RequestHandler } from './$types';
import {
	DOWNLOAD_EVENTS,
	downloadProgressEventEmitter,
	type DownloadProgressTypes
} from '../../(app)/create-clip/[source]/progress-event';

export const POST: RequestHandler = () => {
	return produce(async function start({ emit }) {
		downloadProgressEventEmitter.on(
			DOWNLOAD_EVENTS.START,
			(data: DownloadProgressTypes['START']) => {
				emit('data', JSON.stringify(data));
			}
		);

		downloadProgressEventEmitter.on(
			DOWNLOAD_EVENTS.PROGRESS_UPDATE,
			(data: DownloadProgressTypes['PROGRESS_UPDATE']) => {
				emit('data', JSON.stringify(data));
			}
		);

		downloadProgressEventEmitter.on(DOWNLOAD_EVENTS.END, () => {
			emit('end', '{}');
		});
	});
};
