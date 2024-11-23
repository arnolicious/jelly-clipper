import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const SETTING_KEYS = {
	jellyfinUrl: 'jellyfin_url'
} as const;

type SettingValues = (typeof SETTING_KEYS)[keyof typeof SETTING_KEYS];
const SETTING_KEYS_VALUES = Object.values(SETTING_KEYS) as [SettingValues, ...Array<SettingValues>];

export const settings = sqliteTable('settings', {
	key: text('key', { enum: SETTING_KEYS_VALUES }).primaryKey(),
	value: text('value')
});

export const users = sqliteTable('users', {
	jellyfinUserId: text('jellyfin_user_id').primaryKey(),
	jellyfinUserName: text('jellyfin_user_name').notNull(),
	jellyfinAccessToken: text('jellyfin_access_token').notNull(),
	jellyfinAvatarUrl: text('jellyfin_avatar_url').notNull(),
	isAdmin: integer('is_admin', { mode: 'boolean' }).notNull()
});

export type User = typeof users.$inferSelect;

export const sessions = sqliteTable('sessions', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	userId: text('user_id').notNull(),
	sessionId: text('session_id').notNull(),
	accessToken: text('access_token').notNull(),
	createdAt: integer('created_at', { mode: 'timestamp' }).notNull()
});

export const clips = sqliteTable('clips', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	userId: text('user_id').notNull(),
	title: text('title').notNull(),
	sourceId: text('source_id').notNull(),
	sourceType: text('source_type', { enum: ['movie', 'show'] }).notNull(),
	sourceTitle: text('source_title').notNull(),
	createdAt: integer('created_at', { mode: 'timestamp' }).notNull()
});
