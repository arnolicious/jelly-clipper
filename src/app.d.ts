// See https://svelte.dev/docs/kit/types#app.d.ts

import type { User } from '$lib/server/db/schema';

// for information about these interfaces
declare global {
	namespace App {
		// interface Error {}
		interface Locals {
			user?: User;
		}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
		namespace Superforms {
			type Message = { status: 'error' | 'success'; text: string; data?: string };
		}
	}
}

export {};
