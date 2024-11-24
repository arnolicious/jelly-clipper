import { Jellyfin, type JellyfinParameters } from '@jellyfin/sdk';
import { getLibraryApi } from '@jellyfin/sdk/lib/utils/api/library-api';
import { getVideosApi } from '@jellyfin/sdk/lib/utils/api/videos-api';
import { getItemsApi } from '@jellyfin/sdk/lib/utils/api/items-api';
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

export async function getVideoStream(serverAddress: string, accessToken: string, itemId: string) {
	const api = await getJellyfinApi(serverAddress, accessToken);
	return getVideosApi(api).getVideoStream(
		{
			itemId,
			container: 'mp4'
		},
		{ responseType: 'stream' }
	);
}
