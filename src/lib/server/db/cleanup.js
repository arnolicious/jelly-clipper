import { readdirSync, statSync, unlinkSync } from 'fs';

const ORIGINALS_PATH = './assets/videos/originals';

export function cleanUpOriginalsFolder() {
	console.log('Cleaning up originals folder');
	// Iterate over all files in the originals folder
	// If the file is older than 1 day, delete it
	const files = readdirSync(ORIGINALS_PATH);
	const now = Date.now();
	const maxAge = 1000 * 60 * 60 * 24 * 2; // 2 days
	let filesDeleted = 0;
	let filesSkipped = 0;
	files.forEach((file) => {
		const filePath = `${ORIGINALS_PATH}/${file}`;
		const stats = statSync(filePath);
		const fileAge = now - stats.mtimeMs;
		if (fileAge > maxAge) {
			console.log(`Deleting ${filePath}`);
			unlinkSync(filePath);
			filesDeleted++;
		} else {
			filesSkipped++;
		}
	});
	console.log(`Deleted ${filesDeleted} files, skipped ${filesSkipped} files`);
}
