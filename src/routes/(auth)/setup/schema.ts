import { z } from 'zod';

// Big fancy URL regex

export const setupFormSchema = z.object({
	jellyfinServerUrl: z
		.string()
		.min(1, 'URL cannot be empty')
		.includes('.', { message: 'Invalid URL' })
});

export type SetupFormSchema = typeof setupFormSchema;

export const setupLoginFormSchema = z.object({
	username: z.string().min(1, 'Username cannot be empty'),
	password: z.string().min(1, 'Password cannot be empty')
	// serverUrl: z.string().min(1, 'Server URL cannot be empty')
});

export type SetupLoginFormSchema = typeof setupLoginFormSchema;
