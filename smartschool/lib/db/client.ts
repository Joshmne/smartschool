// lib/db/client.ts — Singleton Turso/LibSQL client
import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import * as schema from './schema';

// Validate env at startup — fail fast, not silently
const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

if (!url) throw new Error('TURSO_DATABASE_URL is not set');

const libsqlClient = createClient({
  url,
  authToken,
  // Embedded replica for ultra-low latency reads
  syncUrl: process.env.TURSO_SYNC_URL,
});

export const db = drizzle(libsqlClient, { schema });

// Type-safe helper to get db in server components / API routes
export function getDb() {
  return db;
}
