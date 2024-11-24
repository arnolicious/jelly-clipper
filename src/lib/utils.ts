import type { BaseItemDto } from '@jellyfin/sdk/lib/generated-client/models';
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

export function getDisplayTitleFromItem(item: BaseItemDto) {
	if (item.SeriesName) {
		return `${item.SeriesName} S${item.ParentIndexNumber}:E${item.IndexNumber} - ${item.Name}`;
	}

	return item.Name;
}

/**
 * From https://github.com/MattMorgis/async-stream-generator
 */
export async function* nodeStreamToIterator(stream) {
	for await (const chunk of stream) {
		yield chunk;
	}
}

/**
 * Taken from Next.js doc
 * https://nextjs.org/docs/app/building-your-application/routing/router-handlers#streaming
 * Itself taken from mozilla doc
 * https://developer.mozilla.org/en-US/docs/Web/API/ReadableStream#convert_async_iterator_to_stream
 * @param {*} iterator
 * @returns {ReadableStream}
 */
export function iteratorToStream(iterator) {
	return new ReadableStream({
		async pull(controller) {
			const { value, done } = await iterator.next();

			if (done) {
				controller.close();
			} else {
				controller.enqueue(new Uint8Array(value));
			}
		}
	});
}
