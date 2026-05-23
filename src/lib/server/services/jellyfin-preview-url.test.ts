import { describe, it, expect } from 'vitest';
import { buildPreviewStreamUrl, DEFAULT_PREVIEW_VIDEO_BITRATE } from './jellyfin-preview-url';

const baseParams = {
	basePath: 'https://jellyfin.example.test',
	itemId: 'item-abc',
	mediaSourceId: 'src-xyz',
	playSessionId: 'sess-1',
	apiKey: 'secret-key',
	deviceId: 'device-7',
	userId: 'user-42'
};

describe('buildPreviewStreamUrl', () => {
	it('points at the master HLS playlist for the item', () => {
		const url = new URL(buildPreviewStreamUrl(baseParams));
		expect(`${url.origin}${url.pathname}`).toBe('https://jellyfin.example.test/Videos/item-abc/master.m3u8');
	});

	it('forces transcoding to h264/aac inside an mp4 container', () => {
		const url = new URL(buildPreviewStreamUrl(baseParams));
		expect(url.searchParams.get('videoCodec')).toBe('h264');
		expect(url.searchParams.get('audioCodec')).toBe('aac');
		expect(url.searchParams.get('container')).toBe('mp4');
		expect(url.searchParams.get('static')).toBe('false');
	});

	it('uses videoBitRate (encoder param), not maxStreamingBitrate (device-profile param)', () => {
		const url = new URL(buildPreviewStreamUrl(baseParams));
		expect(url.searchParams.get('videoBitRate')).toBe(String(DEFAULT_PREVIEW_VIDEO_BITRATE));
		expect(url.searchParams.has('maxStreamingBitrate')).toBe(false);
	});

	it('honours an overridden videoBitRate', () => {
		const url = new URL(buildPreviewStreamUrl({ ...baseParams, videoBitRate: 4_000_000 }));
		expect(url.searchParams.get('videoBitRate')).toBe('4000000');
	});

	it('threads identity and session params through', () => {
		const url = new URL(buildPreviewStreamUrl(baseParams));
		expect(url.searchParams.get('mediaSourceId')).toBe('src-xyz');
		expect(url.searchParams.get('playSessionId')).toBe('sess-1');
		expect(url.searchParams.get('api_key')).toBe('secret-key');
		expect(url.searchParams.get('deviceId')).toBe('device-7');
		expect(url.searchParams.get('userId')).toBe('user-42');
	});

	it('omits stream indices when not provided', () => {
		const url = new URL(buildPreviewStreamUrl(baseParams));
		expect(url.searchParams.get('audioStreamIndex')).toBe('');
		expect(url.searchParams.get('subtitleStreamIndex')).toBe('');
	});

	it('serialises stream indices when provided', () => {
		const url = new URL(buildPreviewStreamUrl({ ...baseParams, audioStreamIndex: 2, subtitleStreamIndex: 0 }));
		expect(url.searchParams.get('audioStreamIndex')).toBe('2');
		expect(url.searchParams.get('subtitleStreamIndex')).toBe('0');
	});
});
