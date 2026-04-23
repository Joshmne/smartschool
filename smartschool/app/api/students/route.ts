// app/api/students/route.ts
import { NextRequest } from 'next/server';
import { eq, and } from 'drizzle-orm';
import { getDb } from '@/lib/db/client';
import { students, fees, terms } from '@/lib/db/schema';
import { requireSession } from '@/lib/auth';
import { ok, err, withErrorBoundary } from '@/lib/utils/api';

export const GET = withErrorBoundary(async (req: NextRequest) => {
  const session = await requireSession();
  const { searchParams } = req.nextUrl;
  const classId = searchParams.get('classId');
  if (!classId) return err('classId required', 400);

  const db = getDb();

  // Get active term for fee status
  const [activeTerm] = await db
    .select()
    .from(terms)
    .where(and(eq(terms.schoolId, session.user.schoolId), eq(terms.isActive, true)))
    .limit(1);

  const rows = await db
    .select()
    .from(students)
    .where(and(eq(students.classId, classId), eq(students.isActive, true)))
    .orderBy(students.name);

  // Attach fee status if term is active
  if (activeTerm) {
    const feeRecords = await db
      .select()
      .from(fees)
      .where(eq(fees.termId, activeTerm.id));

    const feeMap = new Map(feeRecords.map(f => [f.studentId, f]));

    return ok(rows.map(s => {
      const fee    = feeMap.get(s.id);
      const owed   = fee ? fee.amountDue - (fee.amountPaid ?? 0) : 0;
      return {
        ...s,
        feesPaid: owed <= 0,
        feesOwed: Math.max(0, owed),
        className: '', // populated by join in real implementation
      };
    }));
  }

  return ok(rows.map(s => ({ ...s, feesPaid: true, feesOwed: 0, className: '' })));
});
