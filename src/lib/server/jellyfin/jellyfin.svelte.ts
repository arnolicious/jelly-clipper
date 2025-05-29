import { type JellyfinParameters, Jellyfin } from '@jellyfin/sdk';
import { getLibraryApi } from '@jellyfin/sdk/lib/utils/api/library-api';
import { getVideosApi } from '@jellyfin/sdk/lib/utils/api/videos-api';
import { getSubtitleApi } from '@jellyfin/sdk/lib/utils/api/subtitle-api';
import { getItemsApi, getMediaInfoApi } from '@jellyfin/sdk/lib/utils/api';
import { getImageApi } from '@jellyfin/sdk/lib/utils/api/image-api';
import { getUserLibraryApi } from '@jellyfin/sdk/lib/utils/api/user-library-api';
import type { MediaSourceInfo } from '@jellyfin/sdk/lib/generated-client/models';
import type { Track } from '../../../routes/(app)/create-clip/[source]/+page.server';

const JELLYFIN_SERVER_INFO: JellyfinParameters = {
	clientInfo: {
		name: 'Jelly-Clipper',
		version: process.env.npm_package_version ?? '0.0.0'
	},
	deviceInfo: {
		id: crypto.randomUUID(),
		name: 'Jelly-Clipper'
	}
};

export const jellyfin = new Jellyfin(JELLYFIN_SERVER_INFO);

async function getJellyfinApi(address: string, accessToken: string) {
	const api = jellyfin.createApi(address);
	api.accessToken = accessToken;
	return api;
}

export async function getMediaFolders(serverAddress: string, accessToken: string) {
	const api = await getJellyfinApi(serverAddress, accessToken);
	const response = await getLibraryApi(api).getMediaFolders();
	return response.data;
}

export async function getItemInfo(serverAddress: string, accessToken: string, itemId: string) {
	const api = await getJellyfinApi(serverAddress, accessToken);
	const response = await getUserLibraryApi(api).getItem({
		itemId
	});
	return response.data;
}

export async function getPlaybackInfo({
	accessToken,
	itemId,
	serverAddress,
	mediaSourceId,
	videoStreamIndex,
	audioStreamIndex,
	subtitleStreamIndex
}: GetVideoStreamParams) {
	const api = await getJellyfinApi(serverAddress, accessToken);
	const res = await getMediaInfoApi(api).getPlaybackInfo(
		{
			itemId
		},
		{
			method: 'POST',
			data: {
				mediaSourceId,
				audioStreamIndex,
				subtitleStreamIndex
				// isPlayback: true,
				// autoOpenLiveStream: true
			}
		}
	);
	return res.data;
}

export async function getItemImage(serverAddress: string, accessToken: string, itemId: string) {
	const api = await getJellyfinApi(serverAddress, accessToken);
	return getImageApi(api).getItemImage({
		itemId,
		imageType: 'Primary'
	});
}

type GetVideoStreamParams = {
	serverAddress: string;
	accessToken: string;
	itemId: string;
	mediaSourceId?: string;
	videoStreamIndex?: number | null;
	audioStreamIndex?: number | null;
	subtitleStreamIndex?: number | null;
	playSessionId?: string;
};

export async function getVideoStream(params: GetVideoStreamParams) {
	const {
		accessToken,
		serverAddress,
		itemId,
		mediaSourceId,
		videoStreamIndex = 0,
		audioStreamIndex = 0,
		subtitleStreamIndex,
		playSessionId
	} = params;
	const api = await getJellyfinApi(serverAddress, accessToken);

	console.log('Getting video stream:', params);

	return getVideosApi(api).getVideoStream(
		{
			itemId,
			_static: false,
			allowAudioStreamCopy: true,
			allowVideoStreamCopy: true,
			container: 'mp4',
			mediaSourceId: mediaSourceId,
			subtitleMethod: 'Embed',
			playSessionId,
			audioCodec: 'aac',
			audioStreamIndex: audioStreamIndex ?? 0,
			...(subtitleStreamIndex !== undefined && subtitleStreamIndex !== null
				? { subtitleStreamIndex }
				: {})
		},
		{ responseType: 'stream' }
	);
}

type DownloadItemParams = {
	serverAddress: string;
	accessToken: string;
	itemId: string;
};

export async function downloadItem({ serverAddress, accessToken, itemId }: DownloadItemParams) {
	const api = await getJellyfinApi(serverAddress, accessToken);
	return getLibraryApi(api).getDownload(
		{
			itemId
		},
		{
			responseType: 'stream'
		}
	);
}

type GetDownloadStreamUrlParams = {
	serverAddress: string;
	userId: string;
	accessToken: string;
	itemId: string;
	subtitleStreamIndex?: number | null;
	audioStreamIndex?: number | null;
	mediaSourceId?: string;
};

export async function getDownloadStreamUrl({
	userId,
	accessToken,
	itemId,
	serverAddress,
	audioStreamIndex = 0,
	mediaSourceId,
	subtitleStreamIndex = undefined
}: GetDownloadStreamUrlParams) {
	const api = await getJellyfinApi(serverAddress, accessToken);

	// Initiate a playback session
	const res = await getMediaInfoApi(api).getPlaybackInfo(
		{
			itemId
		},
		{
			method: 'POST',
			data: {
				userId,
				// deviceProfile,
				subtitleStreamIndex,
				startTimeTicks: 0,
				isPlayback: true,
				autoOpenLiveStream: true,
				maxStreamingBitrate: undefined,
				audioStreamIndex,
				mediaSourceId,
				alwaysBurnInSubtitleWhenTranscoding: true
			}
		}
	);
	const sessionId = res.data.PlaySessionId ?? null;
	const mediaSource = res.data.MediaSources?.[0];
	if (!mediaSource) {
		throw new Error('No media source found for the item');
	}

	if (mediaSource.TranscodingUrl) {
		return {
			url: `${api.basePath}${mediaSource.TranscodingUrl}`,
			sessionId,
			mediaSource
		};
	}

	const streamParams = new URLSearchParams({
		mediaSourceId: mediaSource?.Id || '',
		subtitleStreamIndex: subtitleStreamIndex?.toString() || '',
		audioStreamIndex: audioStreamIndex?.toString() || '',
		deviceId: api.deviceInfo.id,
		api_key: api.accessToken,
		startTimeTicks: '0',
		maxStreamingBitrate: '',
		userId: userId || '',
		subtitleMethod: 'Embed',
		static: 'false',
		allowVideoStreamCopy: 'true',
		allowAudioStreamCopy: 'true',
		playSessionId: sessionId || '',
		container: 'mp4',
		audioCodec: 'aac',
		subtitleCodec: 'srt'
	});

	const directPlayUrl = `${api.basePath}/Videos/${itemId}/stream?${streamParams.toString()}`;

	return {
		url: directPlayUrl,
		sessionId,
		mediaSource
	};
}

type GetSubtitleTracksParams = {
	serverAddress: string;
	accessToken: string;
	itemId: string;
	mediaSource: MediaSourceInfo;
};

export async function getSubtitleTracks({
	accessToken,
	itemId,
	serverAddress,
	mediaSource
}: GetSubtitleTracksParams): Promise<Track[]> {
	const api = await getJellyfinApi(serverAddress, accessToken);
	const mediaSourceSubtitles =
		mediaSource.MediaStreams?.filter((stream) => stream.Type === 'Subtitle') || [];

	const subtitleApi = getSubtitleApi(api);
	return Promise.all(
		mediaSourceSubtitles.map(async (subtitleStream): Promise<Track> => {
			const subtitle = await subtitleApi.getSubtitle({
				itemId,
				mediaSourceId: mediaSource.Id ?? undefined,
				routeFormat: 'srt',
				routeItemId: itemId,
				routeMediaSourceId: mediaSource.Id!,
				routeIndex: subtitleStream.Index!,
				startPositionTicks: 0,
				format: 'srt',
				index: subtitleStream.Index!
			});

			return {
				index: subtitleStream.Index!,
				language: subtitleStream.Language!,
				title: subtitleStream.Title || 'Unknown Subtitle',
				subtitleFile: subtitle.data as unknown as string
			};
		})
	);
}
