import type { BaseItemDto as OriginalBaseItemDto } from '@jellyfin/sdk/lib/generated-client/models';
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { BaseItemDto } from './shared/BaseItemDto';

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

export function getDisplayTitleFromItem(item: BaseItemDto | OriginalBaseItemDto) {
	if (item.SeriesName) {
		return `${item.SeriesName} S${item.ParentIndexNumber}:E${item.IndexNumber} - ${item.Name}`;
	}

	return item.Name;
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

	if (minutes >= 60) {
		const hours = Math.floor(minutes / 60);
		const remainingMinutes = minutes % 60;
		return `${hours}:${remainingMinutes.toString().padStart(2, '0')}:${secs.padStart(4, '0')}`;
	}

	return `${minutes}:${secs.padStart(4, '0')}`;
}

export const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
