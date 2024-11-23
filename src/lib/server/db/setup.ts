import { eq } from 'drizzle-orm';
import { db } from '.';
import { SETTING_KEYS, settings } from './schema';

/**
 * Validates that a jellyfin server URL is set and that there is at least one user in the database.
 * @returns If the setup is not completed: false, otherwise the jellyfin URL.
 */
export async function validateSetup(): Promise<
	{ setupIsFinished: true; serverAddress: string } | { setupIsFinished: false }
> {
	const jellyfinUrl = await db.query.settings
		.findFirst({
			where: eq(settings.key, SETTING_KEYS.jellyfinUrl)
		})
		.execute();

	const dbUsers = await db.query.users.findMany().execute();

	// If the jellyfin URL is not set, redirect to the setup page
	if (!jellyfinUrl || !jellyfinUrl.value || dbUsers.length === 0) {
		return { setupIsFinished: false };
	}

	return { setupIsFinished: true, serverAddress: jellyfinUrl.value };
}
