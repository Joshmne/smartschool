// app/api/terms/route.ts
import { NextRequest } from 'next/server';
import { eq } from 'drizzle-orm';
import { getDb } from '@/lib/db/client';
import { terms } from '@/lib/db/schema';
import { requireSession } from '@/lib/auth';
import { ok, withErrorBoundary } from '@/lib/utils/api';

export const GET = withErrorBoundary(async (_req: NextRequest) => {
  const session = await requireSession();
  const db      = getDb();
  const rows    = await db
    .select()
    .from(terms)
    .where(eq(terms.schoolId, session.user.schoolId))
    .orderBy(terms.startDate);

  return ok(rows.map(t => ({
    id:        t.id,
    name:      t.name,
    session:   t.session,
    isActive:  t.isActive ?? false,
    startDate: t.startDate ?? undefined,
    endDate:   t.endDate   ?? undefined,
  })));
});
