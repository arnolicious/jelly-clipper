import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';

import { env } from '$env/dynamic/private';
import * as schema from './schema';
import { migrate } from 'drizzle-orm/libsql/migrator';

if (!env.DATABASE_URL) throw new Error('DATABASE_URL is not set');

const client = createClient({ url: `file:${env.DATABASE_URL}` });
export const db = drizzle(client, { schema });
await migrate(db, { migrationsFolder: 'src/lib/server/db/.drizzle/' });
