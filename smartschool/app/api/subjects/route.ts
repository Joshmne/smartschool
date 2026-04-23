// app/api/subjects/route.ts
import { NextRequest } from 'next/server';
import { eq } from 'drizzle-orm';
import { getDb } from '@/lib/db/client';
import { subjects } from '@/lib/db/schema';
import { requireSession } from '@/lib/auth';
import { ok, err, withErrorBoundary } from '@/lib/utils/api';

export const GET = withErrorBoundary(async (req: NextRequest) => {
  await requireSession();
  const classId = req.nextUrl.searchParams.get('classId');
  if (!classId) return err('classId required', 400);

  const db   = getDb();
  const rows = await db
    .select()
    .from(subjects)
    .where(eq(subjects.classId, classId))
    .orderBy(subjects.orderIdx);

  return ok(rows.map(s => ({
    id:      s.id,
    name:    s.name,
    emoji:   s.emoji ?? '📚',
    classId: s.classId,
  })));
});
