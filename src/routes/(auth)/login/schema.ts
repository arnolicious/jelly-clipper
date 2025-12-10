import { z } from 'zod/v4';

export const loginFormSchema = z.object({
	username: z.string().min(1, 'Username cannot be empty'),
	password: z.string().min(1, 'Password cannot be empty')
});

export type LoginFormSchema = typeof loginFormSchema;
