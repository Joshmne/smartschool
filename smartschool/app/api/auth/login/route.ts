// app/api/auth/login/route.ts
import { NextRequest } from 'next/server';
import { compare } from 'bcryptjs';
import { eq, and } from 'drizzle-orm';
import { getDb } from '@/lib/db/client';
import { users, schools } from '@/lib/db/schema';
import { signToken } from '@/lib/auth';
import { ok, err, parseBody, withErrorBoundary, rateLimit, genId } from '@/lib/utils/api';
import { LoginSchema } from '@/lib/types';

export const POST = withErrorBoundary(async (req: NextRequest) => {
  // Rate limit: 10 attempts/min per IP
  const ip = req.headers.get('x-forwarded-for') ?? 'unknown';
  if (!rateLimit(`login:${ip}`, 10, 60_000)) {
    return err('Too many login attempts. Please wait a minute.', 429, 'RATE_LIMIT');
  }

  const parsed = await parseBody(req, LoginSchema);
  if ('error' in parsed) return parsed.error;
  const { phone, pin, role } = parsed.data;

  const db = getDb();
  const [user] = await db
    .select()
    .from(users)
    .where(and(eq(users.phone, phone), eq(users.role, role), eq(users.isActive, true)))
    .limit(1);

  if (!user) return err('Invalid phone or role', 401, 'INVALID_CREDENTIALS');

  const isValid = await compare(pin, user.pinHash);
  if (!isValid) return err('Incorrect PIN', 401, 'INVALID_PIN');

  const [school] = await db.select().from(schools).where(eq(schools.id, user.schoolId)).limit(1);

  const userPayload = {
    id:              user.id,
    name:            user.name,
    role:            user.role,
    schoolId:        user.schoolId,
    schoolName:      school?.name ?? 'School',
    phone:           user.phone,
    avatarInitials:  user.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2),
  };

  const token = await signToken(userPayload);

  const response = ok({ user: userPayload, token });
  const headers  = new Headers(response.headers);
  headers.append(
    'Set-Cookie',
    `ss_session=${token}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${60 * 60 * 24 * 7}`
  );

  return new Response(JSON.stringify({ success: true, data: { user: userPayload, token } }), {
    status: 200,
    headers,
  });
});
