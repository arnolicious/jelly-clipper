import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import { vite as vidstack } from 'vidstack/plugins';
import { expressVitePlugin } from './express-vite-plugin';

export default defineConfig({
	plugins: [vidstack(), sveltekit(), expressVitePlugin()],
	server: {
		fs: {
			allow: ['./assets']
		}
	}
});
