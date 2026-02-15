import type { VideoCodec, VideoContainer, AudioCodec } from '$lib/client/codec-support';

export interface MediaFormatInfo {
	codec: VideoCodec;
	container: VideoContainer;
	audioCodec?: AudioCodec;
	isLocalFileAvailable: boolean;
	requiresDownload: boolean;
}
