// drizzle.config.ts
import type { Config } from 'drizzle-kit';

export default {
  schema:    './lib/db/schema.ts',
  out:       './drizzle/migrations',
  dialect:   'sqlite',
  driver:    'turso',
  dbCredentials: {
    url:       process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN,
  },
  verbose: true,
  strict:  true,
} satisfies Config;
