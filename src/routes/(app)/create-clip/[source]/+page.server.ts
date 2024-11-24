import { validateSetup } from '$lib/server/db/setup';
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getItemInfo, getVideoStream } from '$lib/server/jellyfin/jellyfin.svelte';
import type { SourceInfo } from './types';
import { createWriteStream, statSync } from 'node:fs';
import { finished } from 'stream/promises';

// export const ssr = false;
// export const prerender = false;

export const load: PageServerLoad = async (event) => {
	const validatedSetup = await validateSetup();
	const user = event.locals.user;

	if (!validatedSetup.setupIsFinished || !user) {
		return error(400, 'Jelly-Clipper is not setup yet');
	}

	const jellyfinAddress = validatedSetup.serverAddress;

	let sourceInfo: SourceInfo;

	const decoded = decodeURIComponent(event.params.source);

	if (decoded.includes('/')) {
		// Should be of format: https://jellyfin.domain.test/Items/:id/Download?api_key=:key
		const url = new URL(decoded);
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
		return error(400, 'Source is not a URL');
	}

	// Get Item Info from Jellyfin
	const sourceInfoPromise = getItemInfo(
		jellyfinAddress,
		user.jellyfinAccessToken,
		sourceInfo.sourceId
	).then((response) => {
		console.log('sourceInfoPromise', response.Name);
		return response;
	});

	// Check if file already exists
	try {
		const fileInfo = statSync(`files/original/${sourceInfo.sourceId}.mp4`);
		return {
			user,
			serverAddress: jellyfinAddress,
			sourceInfo: sourceInfoPromise,
			fileInfo: {
				name: sourceInfo.sourceId,
				extension: 'mp4',
				...fileInfo
			}
		};
	} catch (e) {
		// File does not exist
	}

	console.log('Downloading video stream...', sourceInfo);
	// Download the media file
	const response = await getVideoStream(
		jellyfinAddress,
		user.jellyfinAccessToken,
		sourceInfo.sourceId
	);

	console.log('Writing video stream to file...');
	const fileStream = createWriteStream(`files/original/${sourceInfo.sourceId}.mp4`);
	// await finished(response.data.pipe(fileStream));

	const fileInfoPromise = finished(response.data.pipe(fileStream)).then(() => {
		return {
			name: sourceInfo.sourceId,
			extension: 'mp4',
			...statSync(`files/original/${sourceInfo.sourceId}.mp4`)
		};
	});
	// console.log('Finished writing video stream to file.');

	// const fileInfo = statSync(`files/original/${sourceInfo.sourceId}.mp4`);

	return {
		user,
		serverAddress: jellyfinAddress,
		fileInfo: fileInfoPromise,
		sourceInfo: sourceInfoPromise
	};
};
