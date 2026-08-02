import { describe, expect, it } from 'vitest';
import { adjustSrtTimestamps, buildClipVideoFilters } from './AVService';
import type { SrtStringContent } from './CreateClipService';

const srt = (content: string) => content as SrtStringContent;

describe('adjustSrtTimestamps', () => {
	it('removes cues entirely outside the clip range', () => {
		const result = adjustSrtTimestamps(
			srt('1\n00:00:01,000 --> 00:00:02,000\nBefore\n\n2\n00:00:08,000 --> 00:00:09,000\nAfter'),
			3,
			7
		);

		expect(result).toBe('');
	});

	it('clips cues overlapping either clip boundary', () => {
		const result = adjustSrtTimestamps(
			srt('1\n00:00:02,000 --> 00:00:04,000\nStart\n\n2\n00:00:06,000 --> 00:00:08,000\nEnd'),
			3,
			7
		);

		expect(result).toBe('1\n00:00:00,000 --> 00:00:01,000\nStart\n\n2\n00:00:03,000 --> 00:00:04,000\nEnd');
	});

	it('shifts cues within the clip range and accepts CRLF input', () => {
		const result = adjustSrtTimestamps(srt('1\r\n00:00:04,250 --> 00:00:05,750\r\nInside'), 3.5, 7);

		expect(result).toBe('1\n00:00:00,750 --> 00:00:02,250\nInside');
	});
});

describe('buildClipVideoFilters', () => {
	it('normalizes timestamps before rendering subtitles', () => {
		expect(buildClipVideoFilters('assets/videos/clips/30.srt')).toEqual([
			'setpts=PTS-STARTPTS',
			"subtitles='assets/videos/clips/30.srt'"
		]);
	});

	it('normalizes timestamps for clips without subtitles', () => {
		expect(buildClipVideoFilters()).toEqual(['setpts=PTS-STARTPTS']);
	});
});
