import { z } from 'zod';

export const createClipBodySchema = z.object({
	start: z.number(),
	end: z.number(),
	title: z.string(),
	sourceInfo: z.object({
		sourceTitle: z.string(),
		sourceType: z.enum(['movie', 'show'])
	}),
	subtitleTrack: z
		.object({
			fileContent: z.string(),
			language: z.string(),
			title: z.string()
		})
		.optional()
});
