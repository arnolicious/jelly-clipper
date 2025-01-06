import type { BaseItemDto } from '@jellyfin/sdk/lib/generated-client/models';
import { type ClassValue, clsx } from 'clsx';
import { formatDuration, intervalToDuration, type Locale } from 'date-fns';
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

export function getItemSize(item: BaseItemDto) {
	if (item.MediaSources?.length) {
		const size = item.MediaSources[0].Size;
		if (!size) return null;
		return `${(size / 1000000).toFixed(2)} MB`;
	}

	return null;
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

/**
 * @ref https://emby.media/community/index.php?/topic/63357-runtimeticks-microseconds-milliseconds-or-nanoseconds/
 * @param jellyfinTicks
 * @returns Seconds
 */
export function ticksToSeconds(jellyfinTicks: number) {
	return jellyfinTicks / 10000000;
}

export function formatSecondsAsDuration(seconds: number): string {
	const minutes = Math.floor(seconds / 60);
	const secs = (seconds % 60).toFixed(1);
	return minutes > 0 ? `${minutes}m ${secs}s` : `${secs}s`;
}

export function formatTimestamp(seconds: number): string {
	const minutes = Math.floor(seconds / 60);
	const secs = (seconds % 60).toFixed(1);
	return `${minutes}:${secs.padStart(4, '0')}`;
}

export const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
