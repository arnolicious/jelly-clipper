// https://github.com/sveltejs/kit/discussions/10162#discussioncomment-6401160

import express from 'express';
import type { Plugin } from 'vite';

const assets = express.static('./assets');

export const expressVitePlugin = (): Plugin<unknown> => ({
	name: 'express-vite-plugin',
	configureServer: (server) => {
		server.middlewares.use((req, res, next) => {
			assets(req, res as express.Response, next);
		});
	},
	configurePreviewServer: (server) => {
		server.middlewares.use((req, res, next) => {
			assets(req, res as express.Response, next);
		});
	}
});
