import { validateSetup } from '$lib/server/db/setup';
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import type { SourceInfo } from '../../create-clip/[source]/types';
import { getItemInfo } from '$lib/server/jellyfin/jellyfin.svelte';

export const load: PageServerLoad = async ({ locals, params }) => {
	const validatedSetup = await validateSetup();
	const user = locals.user;
	if (!validatedSetup.setupIsFinished || !user) {
		return error(400, 'Jelly-Clipper is not setup yet');
	}
	const jellyfinAddress = validatedSetup.serverAddress;
	const decodedSource = decodeURIComponent(params.source);

	let sourceInfo: SourceInfo;

	if (decodedSource.includes('/')) {
		const url = new URL(decodedSource);
		const pathname = url.pathname;
		const params = url.searchParams;
		const sourceId = pathname.split('Items/')[1].split('/')[0];
		const apiKey = params.get('api_key');
		if (!apiKey) {
			return error(400, 'Source is not a URL');
		}
		sourceInfo = {
			sourceId,
			apiKey
		};
	} else {
		// Consider if this case should throw an error earlier or be handled differently
		return error(400, 'Invalid source format: Expected a URL path.');
	}

	// Fetch information about what audio and subtitle streams are available
	const mediaItemInfo = await getItemInfo(
		jellyfinAddress,
		user.jellyfinAccessToken,
		sourceInfo.sourceId
	);
	const mediaSource = mediaItemInfo?.MediaSources?.[0];
	if (!mediaItemInfo || !mediaSource) {
		return error(500, 'Failed to retrieve media information from Jellyfin');
	}

	return {
		info: mediaItemInfo,
		audioStreams: mediaSource.MediaStreams?.filter((stream) => stream.Type === 'Audio'),
		subTitleStreams: mediaSource.MediaStreams?.filter((stream) => stream.Type === 'Subtitle')
	};
};
