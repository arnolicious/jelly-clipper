// https://github.com/sveltejs/kit/discussions/10162#discussioncomment-6401160

import express from 'express';
import type { IncomingMessage, ServerResponse } from 'http';
import type { Plugin, ViteDevServer } from 'vite';

function getSessionIdFromCookieHeader(cookieHeader: string | undefined): string | undefined {
	if (!cookieHeader) return undefined;
	const match = cookieHeader.match(/(?:^|;\s*)sessionid=([^;]*)/);
	return match?.[1];
}

function createDevAuthMiddleware(viteServer: ViteDevServer) {
	return async (req: IncomingMessage, res: ServerResponse, next: () => void) => {
		const url = req.url ?? '';

		if (!url.startsWith('/videos/')) {
			return next();
		}

		const sessionId = getSessionIdFromCookieHeader(req.headers.cookie);

		if (!sessionId) {
			res.statusCode = 401;
			res.end('Unauthorized');
			return;
		}

		// Use ssrLoadModule to load through Vite's transform pipeline,
		// which resolves $env and other SvelteKit virtual modules
		const { getUserFromSession } = await viteServer.ssrLoadModule('/src/lib/server/db/sessions');
		const user = await getUserFromSession(sessionId);

		if (!user) {
			res.statusCode = 401;
			res.end('Unauthorized');
			return;
		}

		next();
	};
}

function createPreviewAuthMiddleware() {
	return async (req: IncomingMessage, res: ServerResponse, next: () => void) => {
		const url = req.url ?? '';

		if (!url.startsWith('/videos/')) {
			return next();
		}

		const sessionId = getSessionIdFromCookieHeader(req.headers.cookie);

		if (!sessionId) {
			res.statusCode = 401;
			res.end('Unauthorized');
			return;
		}

		// Use a variable to prevent Vite from statically analyzing this import at config load time
		const modulePath = ['./src/lib/server', 'db/sessions'].join('/');
		const { getUserFromSession } = await import(/* @vite-ignore */ modulePath);
		const user = await getUserFromSession(sessionId);

		if (!user) {
			res.statusCode = 401;
			res.end('Unauthorized');
			return;
		}

		next();
	};
}

const assets = express.static('./assets');

export const expressVitePlugin = (): Plugin<unknown> => ({
	name: 'express-vite-plugin',
	configureServer: (server) => {
		server.middlewares.use(createDevAuthMiddleware(server));
		server.middlewares.use((req, res, next) => {
			assets(req, res as express.Response, next);
		});
	},
	configurePreviewServer: (server) => {
		server.middlewares.use(createPreviewAuthMiddleware());
		server.middlewares.use((req, res, next) => {
			assets(req, res as express.Response, next);
		});
	}
});
