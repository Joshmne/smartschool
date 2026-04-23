// app/api/scores/bulk/route.ts — Offline sync bulk endpoint
import { NextRequest } from 'next/server';
import { getDb } from '@/lib/db/client';
import { scores } from '@/lib/db/schema';
import { requireSession } from '@/lib/auth';
import { ok, err, withErrorBoundary } from '@/lib/utils/api';
import { z } from 'zod';

const BulkSchema = z.object({
  scores: z.array(z.object({
    id:        z.string(),
    studentId: z.string(),
    subjectId: z.string(),
    termId:    z.string(),
    ca1:       z.number().min(0).max(20),
    ca2:       z.number().min(0).max(20),
    exam:      z.number().min(0).max(60),
  })).max(500), // prevent abuse
});

export const POST = withErrorBoundary(async (req: NextRequest) => {
  const session = await requireSession();

  let body: unknown;
  try { body = await req.json(); } catch { return err('Invalid JSON', 400); }

  const parsed = BulkSchema.safeParse(body);
  if (!parsed.success) return err('Invalid payload', 422);

  const db   = getDb();
  let synced = 0;

  for (const s of parsed.data.scores) {
    await db.insert(scores).values({
      id:        s.id,
      studentId: s.studentId,
      subjectId: s.subjectId,
      termId:    s.termId,
      teacherId: session.user.id,
      ca1:       s.ca1,
      ca2:       s.ca2,
      exam:      s.exam,
      updatedAt: new Date().toISOString(),
    }).onConflictDoUpdate({
      target: scores.id,
      set:    { ca1: s.ca1, ca2: s.ca2, exam: s.exam, updatedAt: new Date().toISOString() },
    });
    synced++;
  }

  return ok({ synced });
});
