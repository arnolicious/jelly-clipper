// https://github.com/sveltejs/kit/discussions/10162#discussioncomment-6401160

import express from 'express';

const assets = express.static('./assets');

const configureServer = (server) => {
	server.middlewares.use(assets);
};

export const expressVitePlugin = () => ({
	name: 'express-vite-plugin',
	configureServer,
	configurePreviewServer: configureServer
});
