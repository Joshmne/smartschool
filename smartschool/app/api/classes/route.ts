// app/api/classes/route.ts
import { NextRequest } from 'next/server';
import { eq } from 'drizzle-orm';
import { getDb } from '@/lib/db/client';
import { classes } from '@/lib/db/schema';
import { requireSession } from '@/lib/auth';
import { ok, withErrorBoundary } from '@/lib/utils/api';

export const GET = withErrorBoundary(async (_req: NextRequest) => {
  const session = await requireSession();
  const db      = getDb();
  const rows    = await db
    .select()
    .from(classes)
    .where(eq(classes.schoolId, session.user.schoolId));

  return ok(rows.map(c => ({
    id:           c.id,
    name:         c.name,
    teacherId:    c.teacherId ?? '',
    studentCount: c.studentCount ?? 0,
    arm:          c.arm ?? undefined,
  })));
});
