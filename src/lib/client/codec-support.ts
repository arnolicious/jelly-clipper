/**
 * Client-side utility to detect browser support for video codecs and containers.
 * This helps determine if we can stream a local file directly or need to download a transcoded version.
 */

export type VideoCodec = 'h264' | 'hevc' | 'vp9' | 'av1';
export type VideoContainer = 'mp4' | 'mkv' | 'webm' | 'mov';
export type AudioCodec = 'aac' | 'mp3' | 'opus' | 'vorbis' | 'flac';

interface CodecSupport {
	codec: VideoCodec;
	container: VideoContainer;
	audioCodec?: AudioCodec;
	supported: boolean;
}

/**
 * Checks if the browser supports a specific video codec in a container.
 * Uses the MediaSource API or HTMLVideoElement.canPlayType() for detection.
 */
export function canPlayCodec(codec: VideoCodec, container: VideoContainer, audioCodec?: AudioCodec): boolean {
	// Map codec and container to MIME type
	const mimeType = getMimeType(codec, container, audioCodec);

	if (!mimeType) {
		return false;
	}

	// Try MediaSource API first (more accurate for modern browsers)
	if (typeof MediaSource !== 'undefined' && MediaSource.isTypeSupported) {
		return MediaSource.isTypeSupported(mimeType);
	}

	// Fallback to HTMLVideoElement.canPlayType()
	const video = document.createElement('video');
	const canPlay = video.canPlayType(mimeType);

	// canPlayType returns 'probably', 'maybe', or '' (empty string)
	return canPlay === 'probably' || canPlay === 'maybe';
}

/**
 * Generates a MIME type string from codec, container, and optional audio codec.
 */
function getMimeType(codec: VideoCodec, container: VideoContainer, audioCodec?: AudioCodec): string | null {
	const containerMime = getContainerMimeType(container);
	if (!containerMime) return null;

	const videoCodecString = getVideoCodecString(codec);
	if (!videoCodecString) return null;

	const audioCodecString = audioCodec ? getAudioCodecString(audioCodec) : null;

	if (audioCodecString) {
		return `${containerMime}; codecs="${videoCodecString}, ${audioCodecString}"`;
	}

	return `${containerMime}; codecs="${videoCodecString}"`;
}

/**
 * Maps container format to MIME type.
 */
function getContainerMimeType(container: VideoContainer): string | null {
	switch (container) {
		case 'mp4':
			return 'video/mp4';
		case 'webm':
			return 'video/webm';
		case 'mkv':
			return 'video/x-matroska';
		case 'mov':
			return 'video/quicktime';
		default:
			return null;
	}
}

/**
 * Maps video codec to codec string for MIME type.
 */
function getVideoCodecString(codec: VideoCodec): string | null {
	switch (codec) {
		case 'h264':
			// avc1.42E01E is H.264 Baseline Profile Level 3.0
			// avc1.4D401E is H.264 Main Profile Level 3.0
			// avc1.640028 is H.264 High Profile Level 4.0
			return 'avc1.42E01E';
		case 'hevc':
			// hev1 or hvc1 for HEVC/H.265
			return 'hvc1.1.6.L93.B0';
		case 'vp9':
			return 'vp9';
		case 'av1':
			return 'av01.0.05M.08';
		default:
			return null;
	}
}

/**
 * Maps audio codec to codec string for MIME type.
 */
function getAudioCodecString(audioCodec: AudioCodec): string | null {
	switch (audioCodec) {
		case 'aac':
			return 'mp4a.40.2';
		case 'mp3':
			return 'mp3';
		case 'opus':
			return 'opus';
		case 'vorbis':
			return 'vorbis';
		case 'flac':
			return 'flac';
		default:
			return null;
	}
}

/**
 * Checks support for multiple codec/container combinations.
 * Returns an array of support results.
 */
export function checkCodecSupport(
	combinations: Array<{ codec: VideoCodec; container: VideoContainer; audioCodec?: AudioCodec }>
): CodecSupport[] {
	return combinations.map((combo) => ({
		...combo,
		supported: canPlayCodec(combo.codec, combo.container, combo.audioCodec)
	}));
}

/**
 * Determines if a given codec and container combination is compatible with the browser.
 * This is the main function to use for making streaming vs. download decisions.
 */
export function isFormatCompatible(codec: VideoCodec, container: VideoContainer, audioCodec?: AudioCodec): boolean {
	return canPlayCodec(codec, container, audioCodec);
}

/**
 * Gets a list of commonly supported formats for fallback logic.
 */
export function getCommonlySupportedFormats(): Array<{
	codec: VideoCodec;
	container: VideoContainer;
	audioCodec: AudioCodec;
}> {
	return [
		{ codec: 'h264', container: 'mp4', audioCodec: 'aac' },
		{ codec: 'vp9', container: 'webm', audioCodec: 'opus' },
		{ codec: 'av1', container: 'mp4', audioCodec: 'aac' }
	];
}

/**
 * Runs a comprehensive browser capability check.
 * Useful for debugging or showing capabilities to the user.
 */
export function getBrowserCodecCapabilities() {
	const codecs: VideoCodec[] = ['h264', 'hevc', 'vp9', 'av1'];
	const containers: VideoContainer[] = ['mp4', 'mkv', 'webm', 'mov'];
	const audioCodecs: AudioCodec[] = ['aac', 'mp3', 'opus', 'vorbis', 'flac'];

	const results: Record<string, boolean> = {};

	for (const codec of codecs) {
		for (const container of containers) {
			for (const audioCodec of audioCodecs) {
				const key = `${codec}/${container}/${audioCodec}`;
				results[key] = canPlayCodec(codec, container, audioCodec);
			}
		}
	}

	return results;
}
