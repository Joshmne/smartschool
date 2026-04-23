// app/api/scores/route.ts
import { NextRequest } from 'next/server';
import { eq, and } from 'drizzle-orm';
import { getDb } from '@/lib/db/client';
import { scores, students } from '@/lib/db/schema';
import { requireSession } from '@/lib/auth';
import { ok, err, parseBody, withErrorBoundary, genId, getGrade } from '@/lib/utils/api';
import { z } from 'zod';

const BulkScoreSchema = z.object({
  scores: z.array(z.object({
    studentId: z.string(),
    subjectId: z.string(),
    termId:    z.string(),
    ca1:       z.number().min(0).max(20),
    ca2:       z.number().min(0).max(20),
    exam:      z.number().min(0).max(60),
  })),
  termId: z.string(),
});

export const GET = withErrorBoundary(async (req: NextRequest) => {
  await requireSession();

  const { searchParams } = req.nextUrl;
  const classId   = searchParams.get('classId');
  const subjectId = searchParams.get('subjectId');
  const termId    = searchParams.get('termId');

  if (!classId || !subjectId || !termId) return err('classId, subjectId, termId required', 400);

  const db   = getDb();
  const rows = await db
    .select({
      id:        scores.id,
      studentId: scores.studentId,
      subjectId: scores.subjectId,
      termId:    scores.termId,
      ca1:       scores.ca1,
      ca2:       scores.ca2,
      exam:      scores.exam,
      total:     scores.total,
    })
    .from(scores)
    .innerJoin(students, eq(students.id, scores.studentId))
    .where(
      and(
        eq(students.classId, classId),
        eq(scores.subjectId, subjectId),
        eq(scores.termId, termId)
      )
    );

  // Compute grade & position server-side
  const sorted = [...rows].sort((a, b) => (b.total ?? 0) - (a.total ?? 0));
  const withMeta = sorted.map((r, i) => ({
    ...r,
    grade:    getGrade(r.total ?? 0),
    position: i + 1,
  }));

  return ok(withMeta);
});

export const POST = withErrorBoundary(async (req: NextRequest) => {
  const session = await requireSession();
  const parsed  = await parseBody(req, BulkScoreSchema);
  if ('error' in parsed) return parsed.error;

  const db = getDb();
  let saved = 0;

  for (const s of parsed.data.scores) {
    const total = s.ca1 + s.ca2 + s.exam;
    const id    = `${s.studentId}_${s.subjectId}_${s.termId}`;

    // Upsert pattern
    await db.insert(scores).values({
      id,
      studentId: s.studentId,
      subjectId: s.subjectId,
      termId:    s.termId,
      teacherId: session.user.id,
      ca1:       s.ca1,
      ca2:       s.ca2,
      exam:      s.exam,
    }).onConflictDoUpdate({
      target:  scores.id,
      set:     { ca1: s.ca1, ca2: s.ca2, exam: s.exam, updatedAt: new Date().toISOString() },
    });
    saved++;
  }

  return ok({ saved });
});
