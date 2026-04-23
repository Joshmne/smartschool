// app/api/reports/generate/route.ts
import { NextRequest } from 'next/server';
import { eq, and } from 'drizzle-orm';
import { getDb } from '@/lib/db/client';
import { students, scores, subjects, fees } from '@/lib/db/schema';
import { requireSession } from '@/lib/auth';
import { ok, err, withErrorBoundary, getGrade, getRemark } from '@/lib/utils/api';
import { z } from 'zod';

const GenerateSchema = z.object({
  classId: z.string(),
  termId:  z.string(),
});

export const POST = withErrorBoundary(async (req: NextRequest) => {
  await requireSession();
  const body   = await req.json();
  const parsed = GenerateSchema.safeParse(body);
  if (!parsed.success) return err(parsed.error.errors[0].message, 422);

  const { classId, termId } = parsed.data;
  const db = getDb();

  const classStudents = await db
    .select()
    .from(students)
    .where(and(eq(students.classId, classId), eq(students.isActive, true)));

  const classSubjects = await db
    .select()
    .from(subjects)
    .where(eq(subjects.classId, classId));

  const feeRecords = await db
    .select()
    .from(fees)
    .where(eq(fees.termId, termId));

  const feeMap = new Map(feeRecords.map(f => [f.studentId, f]));

  // Build report cards in memory (in prod: generate PDFs via Puppeteer / Gotenberg)
  const reportCards = [];

  for (const student of classStudents) {
    const studentScores = await db
      .select()
      .from(scores)
      .where(and(eq(scores.studentId, student.id), eq(scores.termId, termId)));

    const scoreMap = new Map(studentScores.map(s => [s.subjectId, s]));
    const total    = studentScores.reduce((sum, s) => sum + (s.total ?? 0), 0);
    const avg      = classSubjects.length > 0 ? Math.round(total / classSubjects.length) : 0;
    const fee      = feeMap.get(student.id);
    const feesOwed = fee ? Math.max(0, fee.amountDue - (fee.amountPaid ?? 0)) : 0;

    reportCards.push({
      studentId:   student.id,
      studentName: student.name,
      className:   classId,
      termId,
      scores: classSubjects.map(sub => {
        const s = scoreMap.get(sub.id);
        return {
          subjectId: sub.id,
          subject:   sub.name,
          ca1:       s?.ca1 ?? 0,
          ca2:       s?.ca2 ?? 0,
          exam:      s?.exam ?? 0,
          total:     s?.total ?? 0,
          grade:     getGrade(s?.total ?? 0),
          remark:    getRemark(getGrade(s?.total ?? 0)),
        };
      }),
      overallTotal:   total,
      overallAverage: avg,
      position:       0, // computed after sorting all students
      outOf:          classStudents.length,
      teacherRemark:  avg >= 70 ? 'Excellent performance. Keep it up!' : avg >= 50 ? 'Good effort. Aim higher!' : 'More effort needed. We believe in you.',
      principalRemark: 'Promoted to next class', // simplified
      isLocked:       feesOwed > 0,
      feesOwed,
    });
  }

  // Assign positions
  reportCards.sort((a, b) => b.overallTotal - a.overallTotal);
  reportCards.forEach((rc, i) => { rc.position = i + 1; });

  return ok({ generated: reportCards.length, reportCards });
});
