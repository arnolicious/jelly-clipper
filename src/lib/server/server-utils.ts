import { ASSETS_CLIPS_DIR, ASSETS_ORIGINALS_DIR, ASSETS_ROOT_DIR } from '$lib/constants';
import { existsSync, mkdirSync } from 'node:fs';

/**
 * Ensures that the static folders exist, where videos are stored
 * - static/videos
 * - static/videos/originals
 * - static/videos/clips
 */
export function ensureStaticFoldersExist() {
	// Ensure the folders exist
	if (!existsSync(ASSETS_ROOT_DIR)) {
		mkdirSync(ASSETS_ROOT_DIR);
	}

	if (!existsSync(ASSETS_ORIGINALS_DIR)) {
		mkdirSync(ASSETS_ORIGINALS_DIR);
	}

	if (!existsSync(ASSETS_CLIPS_DIR)) {
		mkdirSync(ASSETS_CLIPS_DIR);
	}
}
