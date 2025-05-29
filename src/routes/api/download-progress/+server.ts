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
				const { error } = emit('data', JSON.stringify(data));
				if (error) {
					console.error('Start Event', error);
					return;
				}
			}
		);

		downloadProgressEventEmitter.on(
			DOWNLOAD_EVENTS.PROGRESS_UPDATE,
			(data: DownloadProgressTypes['PROGRESS_UPDATE']) => {
				const { error } = emit('data', JSON.stringify(data));
				if (error) {
					// console.error('Progress Event', error);
					return;
				}
			}
		);

		downloadProgressEventEmitter.on(DOWNLOAD_EVENTS.END, () => {
			const { error } = emit('end', '{}');
			if (error) {
				// console.error('End Event', error);
				return;
			}
		});

		downloadProgressEventEmitter.on(
			DOWNLOAD_EVENTS.ERROR,
			(data: DownloadProgressTypes['ERROR']) => {
				const { error } = emit('error', JSON.stringify(data));
				if (error) {
					// console.error('Error Event', error);
					return;
				}
			}
		);
	});
};
