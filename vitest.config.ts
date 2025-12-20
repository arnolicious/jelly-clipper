import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
	test: {
		globals: true,
		environment: 'node',
		include: ['src/**/*.test.ts', 'src/**/*.spec.ts'],
		coverage: {
			provider: 'v8',
			reporter: ['text', 'json', 'html'],
			exclude: ['node_modules/', 'build/', '.svelte-kit/', 'src/**/*.test.ts', 'src/**/*.spec.ts']
		}
	},
	resolve: {
		alias: {
			$lib: resolve(__dirname, './src/lib'),
			$app: resolve(__dirname, './.svelte-kit/types/src/app')
		}
	}
});
