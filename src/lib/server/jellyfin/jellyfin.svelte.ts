import { Jellyfin, type JellyfinParameters } from '@jellyfin/sdk';
import { getLibraryApi } from '@jellyfin/sdk/lib/utils/api/library-api';

const JELLYFIN_SERVER_INFO: JellyfinParameters = {
	clientInfo: {
		name: 'Jelly-Clipper (Server)',
		version: process.env.npm_package_version ?? '0.0.0'
	},
	deviceInfo: {
		id: crypto.randomUUID(),
		name: 'Jelly-Clipper Server'
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
