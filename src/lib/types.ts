import type { clips, users } from './server/db/schema';

export type Clip = typeof clips.$inferSelect;

export type User = typeof users.$inferSelect;
