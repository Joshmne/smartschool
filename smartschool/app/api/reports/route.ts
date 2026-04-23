// app/api/reports/route.ts — GET existing report cards
import { NextRequest } from 'next/server';
import { eq, and, inArray } from 'drizzle-orm';
import { getDb } from '@/lib/db/client';
import { scores, students, subjects, fees } from '@/lib/db/schema';
import { requireSession } from '@/lib/auth';
import { ok, err, withErrorBoundary, getGrade } from '@/lib/utils/api';

export const GET = withErrorBoundary(async (req: NextRequest) => {
  await requireSession();
  const classId = req.nextUrl.searchParams.get('classId');
  const termId  = req.nextUrl.searchParams.get('termId');
  if (!classId || !termId) return err('classId and termId required', 400);

  const db = getDb();

  const classStudents = await db
    .select()
    .from(students)
    .where(and(eq(students.classId, classId), eq(students.isActive, true)));

  if (classStudents.length === 0) return ok([]);

  const studentIds  = classStudents.map(s => s.id);
  const allScores   = await db.select().from(scores).where(and(eq(scores.termId, termId), inArray(scores.studentId, studentIds)));
  const allSubjects = await db.select().from(subjects).where(eq(subjects.classId, classId));
  const allFees     = await db.select().from(fees).where(and(inArray(fees.studentId, studentIds), eq(fees.termId, termId)));

  const cards = classStudents.map(student => {
    const stuScores   = allScores.filter(s => s.studentId === student.id);
    const feeRecord   = allFees.find(f => f.studentId === student.id);
    const balance     = feeRecord ? feeRecord.amountDue - (feeRecord.amountPaid ?? 0) : 0;
    const overallTotal = stuScores.reduce((s, sc) => s + (sc.total ?? 0), 0);
    const overallAvg  = allSubjects.length > 0 ? Math.round(overallTotal / allSubjects.length) : 0;

    return {
      studentId:       student.id,
      studentName:     student.name,
      className:       classId,
      termId,
      scores:          stuScores.map(sc => ({
        studentId: sc.studentId, subjectId: sc.subjectId, termId, position: 0,
        ca1: sc.ca1 ?? 0, ca2: sc.ca2 ?? 0, exam: sc.exam ?? 0,
        total: sc.total ?? 0, grade: getGrade(sc.total ?? 0),
      })),
      overallTotal,
      overallAverage:  overallAvg,
      position:        0,
      outOf:           classStudents.length,
      teacherRemark:   overallAvg >= 70 ? 'Excellent' : overallAvg >= 55 ? 'Good' : 'Needs improvement',
      principalRemark: 'Promoted',
      isLocked:        balance > 0,
      feesOwed:        balance,
    };
  });

  // Assign positions
  cards.sort((a, b) => b.overallTotal - a.overallTotal);
  cards.forEach((c, i) => { c.position = i + 1; });

  return ok(cards);
});
