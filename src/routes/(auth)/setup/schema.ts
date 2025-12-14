import { z } from 'zod/v4';

// Big fancy URL regex

export const setupFormSchema = z.object({
	jellyfinServerUrl: z.string().min(1, 'URL cannot be empty').includes('.', { message: 'Invalid URL' })
});

export type SetupFormSchema = typeof setupFormSchema;
