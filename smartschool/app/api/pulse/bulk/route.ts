// app/api/pulse/bulk/route.ts — Offline sync for pulse ratings
import { NextRequest } from 'next/server';
import { getDb } from '@/lib/db/client';
import { pulseRatings } from '@/lib/db/schema';
import { requireSession } from '@/lib/auth';
import { ok, err, withErrorBoundary } from '@/lib/utils/api';
import { z } from 'zod';

const BulkPulseSchema = z.object({
  pulses: z.array(z.object({
    id:          z.string(),
    studentId:   z.string(),
    weekOf:      z.string(),
    neatness:    z.number().min(1).max(5),
    conduct:     z.number().min(1).max(5),
    punctuality: z.number().min(1).max(5),
  })).max(500),
});

export const POST = withErrorBoundary(async (req: NextRequest) => {
  const session = await requireSession();

  let body: unknown;
  try { body = await req.json(); } catch { return err('Invalid JSON', 400); }

  const parsed = BulkPulseSchema.safeParse(body);
  if (!parsed.success) return err('Invalid payload', 422);

  const db   = getDb();
  let synced = 0;

  for (const p of parsed.data.pulses) {
    await db.insert(pulseRatings).values({
      id:          p.id,
      studentId:   p.studentId,
      teacherId:   session.user.id,
      weekOf:      p.weekOf,
      neatness:    p.neatness,
      conduct:     p.conduct,
      punctuality: p.punctuality,
    }).onConflictDoUpdate({
      target: pulseRatings.id,
      set:    { neatness: p.neatness, conduct: p.conduct, punctuality: p.punctuality },
    });
    synced++;
  }

  return ok({ synced });
});
