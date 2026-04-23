// app/api/expenses/approve/route.ts
import { NextRequest } from 'next/server';
import { eq } from 'drizzle-orm';
import { getDb } from '@/lib/db/client';
import { expenses } from '@/lib/db/schema';
import { requireSession } from '@/lib/auth';
import { ok, err, withErrorBoundary } from '@/lib/utils/api';
import { z } from 'zod';

const ApproveSchema = z.object({
  id:     z.string(),
  action: z.enum(['approved', 'declined']),
});

export const PATCH = withErrorBoundary(async (req: NextRequest) => {
  const session = await requireSession();
  if (!['md', 'bursar'].includes(session.user.role)) throw new Error('FORBIDDEN');

  const body   = await req.json();
  const parsed = ApproveSchema.safeParse(body);
  if (!parsed.success) return err('Invalid payload', 422);

  const { id, action } = parsed.data;
  const db = getDb();

  const [expense] = await db.select().from(expenses).where(eq(expenses.id, id)).limit(1);
  if (!expense) return err('Expense not found', 404);
  if (expense.schoolId !== session.user.schoolId) throw new Error('FORBIDDEN');

  await db.update(expenses).set({
    status:       action,
    approvedById: session.user.id,
    approvedAt:   new Date().toISOString(),
  }).where(eq(expenses.id, id));

  return ok({ id, status: action });
});
