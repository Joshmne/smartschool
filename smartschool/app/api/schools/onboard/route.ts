// app/api/schools/onboard/route.ts — Register a new school (called once at setup)
// Protect with a one-time setup token in prod
import { NextRequest } from 'next/server';
import { hash } from 'bcryptjs';
import { getDb } from '@/lib/db/client';
import { schools, users } from '@/lib/db/schema';
import { ok, err, parseBody, withErrorBoundary, genId } from '@/lib/utils/api';
import { z } from 'zod';

const OnboardSchema = z.object({
  schoolName:    z.string().min(3).max(120),
  schoolAddress: z.string().min(5),
  schoolPhone:   z.string().min(10).max(14),
  mdName:        z.string().min(2),
  mdPhone:       z.string().min(10).max(14),
  mdPin:         z.string().min(4).max(8),
  setupToken:    z.string().min(1),  // one-time onboarding key
});

export const POST = withErrorBoundary(async (req: NextRequest) => {
  const parsed = await parseBody(req, OnboardSchema);
  if ('error' in parsed) return parsed.error;

  const { schoolName, schoolAddress, schoolPhone, mdName, mdPhone, mdPin, setupToken } = parsed.data;

  // Validate one-time setup token
  if (setupToken !== process.env.ONBOARDING_SECRET) {
    return err('Invalid setup token', 403, 'FORBIDDEN');
  }

  const db       = getDb();
  const schoolId = genId('school');
  const userId   = genId('user');
  const pinHash  = await hash(mdPin, 12);

  // Check if phone already exists
  const existing = await db.query.schools.findFirst({
    where: (s, { eq }) => eq(s.phone, schoolPhone),
  });
  if (existing) return err('A school with this phone already exists', 409, 'DUPLICATE');

  await db.insert(schools).values({
    id:      schoolId,
    name:    schoolName,
    address: schoolAddress,
    phone:   schoolPhone,
  });

  await db.insert(users).values({
    id:       userId,
    schoolId,
    name:     mdName,
    phone:    mdPhone,
    pinHash,
    role:     'md',
    isActive: true,
  });

  return ok({
    schoolId,
    userId,
    message: `School "${schoolName}" registered. MD login: ${mdPhone} / PIN: [as set]`,
  }, 201);
});
