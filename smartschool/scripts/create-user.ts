// scripts/create-user.ts — Create or reset a user's PIN from the command line
// Usage: npx tsx scripts/create-user.ts --phone 08012345678 --pin 1234 --role teacher --school school_sunshine_001
// Run from project root with TURSO_DATABASE_URL in env

import { parseArgs } from 'util';
import { hash } from 'bcryptjs';
import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import { eq, and } from 'drizzle-orm';
import * as schema from '../lib/db/schema';
import { genId } from '../lib/utils/api';

const { values } = parseArgs({
  args:    process.argv.slice(2),
  options: {
    phone:    { type: 'string' },
    pin:      { type: 'string' },
    role:     { type: 'string', default: 'teacher' },
    name:     { type: 'string', default: 'New User' },
    school:   { type: 'string' },
    reset:    { type: 'boolean', default: false },
  },
});

async function run() {
  const { phone, pin, role, name, school, reset } = values;

  if (!phone || !pin) {
    console.error('Usage: npx tsx scripts/create-user.ts --phone 08012345678 --pin 1234 --role teacher --school <schoolId>');
    process.exit(1);
  }

  if (!['teacher', 'md', 'bursar'].includes(role as string)) {
    console.error('Role must be: teacher | md | bursar');
    process.exit(1);
  }

  const client = createClient({
    url:       process.env.TURSO_DATABASE_URL ?? 'file:./local.db',
    authToken: process.env.TURSO_AUTH_TOKEN,
  });
  const db = drizzle(client, { schema });

  const pinHash  = await hash(pin as string, 12);

  // Check if user exists
  const [existing] = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.phone, phone as string))
    .limit(1);

  if (existing) {
    if (!reset) {
      console.error(`User with phone ${phone} already exists. Use --reset to update PIN.`);
      process.exit(1);
    }
    await db
      .update(schema.users)
      .set({ pinHash, isActive: true })
      .where(eq(schema.users.phone, phone as string));
    console.log(`✅ PIN updated for ${existing.name} (${phone})`);
  } else {
    if (!school) {
      console.error('--school <schoolId> is required for new users');
      process.exit(1);
    }
    const userId = genId('user');
    await db.insert(schema.users).values({
      id:       userId,
      schoolId: school as string,
      name:     name as string,
      phone:    phone as string,
      pinHash,
      role:     role as 'teacher' | 'md' | 'bursar',
      isActive: true,
    });
    console.log(`✅ User created: ${name} (${phone}) · role: ${role}`);
    console.log(`   User ID: ${userId}`);
  }

  process.exit(0);
}

run().catch(e => { console.error('Error:', e); process.exit(1); });
