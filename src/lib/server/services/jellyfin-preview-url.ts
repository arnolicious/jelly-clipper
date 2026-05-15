export const DEFAULT_PREVIEW_VIDEO_BITRATE = 10_000_000;

export interface BuildPreviewStreamUrlParams {
	basePath: string;
	itemId: string;
	mediaSourceId: string;
	playSessionId: string;
	apiKey: string;
	deviceId: string;
	userId: string;
	audioStreamIndex?: number;
	subtitleStreamIndex?: number;
	videoBitRate?: number;
}

/** Build a Jellyfin HLS URL that forces a transcode to h264/aac/mp4. */
export function buildPreviewStreamUrl(params: BuildPreviewStreamUrlParams): string {
	const streamParams = new URLSearchParams({
		mediaSourceId: params.mediaSourceId,
		subtitleStreamIndex: params.subtitleStreamIndex?.toString() ?? '',
		audioStreamIndex: params.audioStreamIndex?.toString() ?? '',
		deviceId: params.deviceId,
		api_key: params.apiKey,
		startTimeTicks: '0',
		videoBitRate: (params.videoBitRate ?? DEFAULT_PREVIEW_VIDEO_BITRATE).toString(),
		userId: params.userId,
		subtitleMethod: 'Embed',
		static: 'false',
		allowVideoStreamCopy: 'true',
		allowAudioStreamCopy: 'true',
		playSessionId: params.playSessionId,
		container: 'mp4',
		videoCodec: 'h264',
		audioCodec: 'aac',
		subtitleCodec: 'srt'
	});
	return `${params.basePath}/Videos/${params.itemId}/master.m3u8?${streamParams.toString()}`;
}
