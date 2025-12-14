import type { BaseItemDto as OriginalBaseItemDto } from '@jellyfin/sdk/lib/generated-client/models';
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { BaseItemDto } from './server/schemas/BaseItemDto';

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

export function getDisplayTitleFromItem(item: BaseItemDto | OriginalBaseItemDto) {
	if (item.SeriesName) {
		return `${item.SeriesName} S${item.ParentIndexNumber}:E${item.IndexNumber} - ${item.Name}`;
	}

	return item.Name;
}

export function getItemSize(item: BaseItemDto | OriginalBaseItemDto) {
	if (item.MediaSources?.length) {
		const size = item.MediaSources[0].Size;
		if (!size) return null;
		return `${(size / 1000000).toFixed(2)} MB`;
	}

	return null;
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

type Callback<TArgs> = (args: TArgs) => void;

export const promisify =
	<TArgs, TCallbackArgs>(
		fn: (args: TArgs, cb: Callback<TCallbackArgs>) => void
	): ((args: TArgs) => Promise<TCallbackArgs>) =>
	(args: TArgs) =>
		new Promise((resolve) => {
			fn(args, (callbackArgs) => {
				resolve(callbackArgs);
			});
		});
