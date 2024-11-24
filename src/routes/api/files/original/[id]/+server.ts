import { nodeStreamToIterator, iteratorToStream } from '$lib/utils';
import type { RequestHandler } from './$types';
import { createReadStream } from 'node:fs';

/**
 * Serve the original media file
 */
export const GET: RequestHandler = async ({ params }) => {
	// Load the media file as a stream and return the stream in the Response
	const id = params.id;
	const filePath = `files/original/${id}.mp4`;

	// Read file as a stream
	const mediaFile = createReadStream(filePath);

	// Convert the node stream to an iterator and then to a ReadableStream
	const stream = iteratorToStream(nodeStreamToIterator(mediaFile));

	return new Response(stream, {
		headers: {
			'Content-Type': 'video/mp4',
			'Cache-Control': 'public, max-age=31536000'
		}
	});
};
