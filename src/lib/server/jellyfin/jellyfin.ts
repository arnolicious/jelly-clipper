import { Jellyfin, type JellyfinParameters } from '@jellyfin/sdk';

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
