// app/api/fees/route.ts — GET fee records for a class
import { NextRequest } from 'next/server';
import { eq, and, inArray } from 'drizzle-orm';
import { getDb } from '@/lib/db/client';
import { fees, students } from '@/lib/db/schema';
import { requireSession } from '@/lib/auth';
import { ok, err, withErrorBoundary } from '@/lib/utils/api';

export const GET = withErrorBoundary(async (req: NextRequest) => {
  await requireSession();
  const classId = req.nextUrl.searchParams.get('classId');
  const termId  = req.nextUrl.searchParams.get('termId');
  if (!classId || !termId) return err('classId and termId required', 400);

  const db = getDb();

  const classStudents = await db
    .select({ id: students.id, name: students.name })
    .from(students)
    .where(and(eq(students.classId, classId), eq(students.isActive, true)));

  if (classStudents.length === 0) return ok([]);

  const studentIds = classStudents.map(s => s.id);
  const feeRows    = await db
    .select()
    .from(fees)
    .where(and(inArray(fees.studentId, studentIds), eq(fees.termId, termId)));

  return ok(feeRows.map(f => {
    const student = classStudents.find(s => s.id === f.studentId);
    return {
      studentId:       f.studentId,
      studentName:     student?.name ?? 'Unknown',
      className:       classId,
      termId,
      amountDue:       f.amountDue,
      amountPaid:      f.amountPaid ?? 0,
      balance:         f.amountDue - (f.amountPaid ?? 0),
      lastPaymentDate: f.lastPaymentDate ?? undefined,
      paymentRef:      f.paymentRef ?? undefined,
    };
  }));
});
