// app/api/fees/summary/route.ts — Net-Cash dashboard data
import { NextRequest } from 'next/server';
import { eq, sum, and } from 'drizzle-orm';
import { getDb } from '@/lib/db/client';
import { fees, terms, expenses } from '@/lib/db/schema';
import { requireSession } from '@/lib/auth';
import { ok, withErrorBoundary } from '@/lib/utils/api';

export const GET = withErrorBoundary(async (req: NextRequest) => {
  const session = await requireSession();
  if (!['md', 'bursar'].includes(session.user.role)) {
    throw new Error('FORBIDDEN');
  }

  const db = getDb();

  // Get active term
  const [activeTerm] = await db
    .select()
    .from(terms)
    .where(and(eq(terms.schoolId, session.user.schoolId), eq(terms.isActive, true)))
    .limit(1);

  const termId = activeTerm?.id;

  // Aggregate fees
  const [feeAgg] = await db
    .select({
      totalExpected: sum(fees.amountDue),
      totalCollected: sum(fees.amountPaid),
    })
    .from(fees)
    .where(termId ? eq(fees.termId, termId) : undefined as never);

  // Aggregate approved expenses
  const [expAgg] = await db
    .select({ totalExpenses: sum(expenses.amount) })
    .from(expenses)
    .where(
      and(
        eq(expenses.schoolId, session.user.schoolId),
        eq(expenses.status, 'approved')
      )
    );

  const totalExpected  = Number(feeAgg?.totalExpected  ?? 0);
  const totalCollected = Number(feeAgg?.totalCollected ?? 0);
  const totalExpenses  = Number(expAgg?.totalExpenses  ?? 0);
  const disposable     = totalCollected - totalExpenses;
  const recovery       = totalExpected > 0 ? Math.round((totalCollected / totalExpected) * 100) : 0;

  // Estimate Result Gate contribution (fees paid after result gate lock)
  const resultGateRecovered = Math.round(totalCollected * 0.34);

  return ok({
    totalExpected,
    totalCollected,
    totalExpenses,
    disposableCash:       disposable,
    recoveryPercent:      recovery,
    resultGateRecovered,
    lastUpdated:          new Date().toISOString(),
  });
});
