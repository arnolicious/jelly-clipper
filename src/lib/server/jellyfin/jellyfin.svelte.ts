import { Jellyfin, type JellyfinParameters } from '@jellyfin/sdk';
import { getLibraryApi } from '@jellyfin/sdk/lib/utils/api/library-api';
import { getVideosApi } from '@jellyfin/sdk/lib/utils/api/videos-api';
import { getMediaInfoApi } from '@jellyfin/sdk/lib/utils/api';
import { getImageApi } from '@jellyfin/sdk/lib/utils/api/image-api';
import { getUserLibraryApi } from '@jellyfin/sdk/lib/utils/api/user-library-api';

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
